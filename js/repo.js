import { migrateExercise } from './lib/migration.js';
import * as db from './db.js';
import { newId } from './lib/id.js';
import { dateKey, validDate } from './lib/datetime.js';
import { setValues, numberInput, round, sessionVolume } from './lib/calc.js';
import { STORES, serialize, parse } from './lib/transfer.js';
const active = row => row.deleted_at === null;
const stamp = (fields, existing) => ({ ...fields, id: existing?.id || newId(), created_at: existing?.created_at ?? Date.now(), updated_at: Date.now(), deleted_at: fields.deleted_at ?? null });
let onWrite = () => {};
export function setWriteListener(listener) { onWrite = listener; }
async function put(store, fields, existing, notify = true) {
  const row = stamp(fields, existing);
  await db.transaction([store], 'readwrite', tx => tx.objectStore(store).put(row));
  if (notify) onWrite();
  return row;
}
export async function setting(key, fallback) {
  const row = await db.get('meta', key, 'by_key');
  return row && active(row) ? row.value : fallback;
}
export async function saveSetting(key, value, notify = true) {
  return put('meta', { key, value }, await db.get('meta', key, 'by_key'), notify);
}
export async function initialize() {
  await db.open();
  if (await setting('seeded', false)) return;
  const response = await fetch(new URL('../data/exercises.seed.json', import.meta.url));
  if (!response.ok) throw new Error('初期種目を読み込めません。再読み込みしてください');
  const seed = await response.json();
  const defaults = { schema_version: 2, weight_unit: 'kg', seeded: true, default_rest_seconds: 90, show_body_fat: true, persist_granted: false };
  await db.transaction(['exercises', 'meta'], 'readwrite', tx => {
    // 複数タブの初回起動でも二重投入しないよう同じトランザクションで判定する。
    tx.objectStore('meta').index('by_key').get('seeded').onsuccess = event => {
      if (event.target.result?.value) return;
      for (const exercise of seed.exercises) tx.objectStore('exercises').put(stamp(exercise, exercise));
      for (const [key, value] of Object.entries(defaults)) tx.objectStore('meta').put(stamp({ key, value }));
    };
  });
}
export const exercises = () => db.scan('exercises', { index: 'by_sort_order', accept: active });
export const sessionSets = id => db.scan('sets', { index: 'by_session', range: IDBKeyRange.only(id), accept: active }).then(rows => rows.sort((a, b) => a.recorded_at - b.recorded_at));
export async function previousSets(exerciseId, sessionId) {
  let target;
  const rows = await db.scan('sets', {
    index: 'by_exercise_recorded', range: IDBKeyRange.bound([exerciseId, -Infinity], [exerciseId, Infinity]), direction: 'prev',
    accept: row => {
      if (!active(row) || row.session_id === sessionId) return false;
      target ??= row.session_id;
      return row.session_id === target;
    },
    stop: row => active(row) && row.session_id !== sessionId && target !== undefined && row.session_id !== target
  });
  if (!target) return null;
  const session = await db.get('sessions', target);
  if (!session || !active(session)) return null;
  return { session_id: target, date: session.date, sets: rows.reverse() };
}
export async function pickerExercises() {
  const rows = (await exercises()).filter(row => !row.is_archived);
  const recent = await Promise.all(rows.map(async row => {
    const last = await db.scan('sets', { index: 'by_exercise_recorded', range: IDBKeyRange.bound([row.id, -Infinity], [row.id, Infinity]), direction: 'prev', accept: active, limit: 1 });
    return { ...row, last: last[0]?.recorded_at || 0 };
  }));
  return recent.sort((a, b) => b.last - a.last || a.sort_order - b.sort_order);
}
export async function currentSession() {
  const rows = await db.scan('sessions', { index: 'by_started_at', direction: 'prev', accept: row => active(row) && row.ended_at === null });
  for (const row of rows.slice(1)) {
    const sets = await sessionSets(row.id);
    await put('sessions', { ...row, ended_at: sets.at(-1)?.recorded_at ?? row.started_at }, row, false);
  }
  return rows[0] || null;
}
export async function startSession() {
  if (await currentSession()) return currentSession();
  // 同時タブからの開始も書き込みトランザクション内で一つにまとめる。
  let result;
  await db.transaction(['sessions'], 'readwrite', tx => {
    const store = tx.objectStore('sessions');
    store.index('by_started_at').openCursor(null, 'prev').onsuccess = event => {
      const cursor = event.target.result;
      if (cursor && active(cursor.value) && cursor.value.ended_at === null) { result = cursor.value; return; }
      if (cursor) { cursor.continue(); return; }
      result = stamp({ date: dateKey(new Date()), started_at: Date.now(), ended_at: null, condition_note: '' });
      store.put(result);
    };
  });
  onWrite();
  return result;
}
export async function saveSession(row, changes) { return put('sessions', { ...row, ...changes }, row); }
export async function finishSession(row) {
  const sets = await sessionSets(row.id);
  return saveSession(row, { ended_at: Date.now(), deleted_at: sets.length ? null : Date.now() });
}
export async function deleteSession(row) {
  const now = Date.now();
  const sets = await sessionSets(row.id);
  await db.transaction(['sessions', 'sets'], 'readwrite', tx => {
    tx.objectStore('sessions').put(stamp({ ...row, deleted_at: now }, row));
    for (const set of sets) tx.objectStore('sets').put(stamp({ ...set, deleted_at: now }, set));
  });
  onWrite();
}
export async function saveSet(sessionId, exerciseId, weight, reps, existing) {
  const values = setValues(weight, reps);
  let result;
  await db.transaction(['sets', 'sessions', 'exercises'], 'readwrite', tx => {
    const store = tx.objectStore('sets');
    tx.objectStore('sessions').get(sessionId).onsuccess = event => {
      const session = event.target.result;
      if (!session || !active(session) || session.ended_at !== null) { tx.abort(); return; }
      tx.objectStore('exercises').get(exerciseId).onsuccess = exerciseEvent => {
        if (!exerciseEvent.target.result || !active(exerciseEvent.target.result)) { tx.abort(); return; }
        store.index('by_session').getAll(sessionId).onsuccess = setsEvent => {
          const order = Math.max(0, ...setsEvent.target.result.filter(row => row.exercise_id === exerciseId).map(row => row.order)) + 1;
          result = stamp(existing ? { ...existing, ...values } : { session_id: sessionId, exercise_id: exerciseId, order, ...values, note: '', recorded_at: Date.now(), is_warmup: false }, existing);
          store.put(result);
        };
      };
    };
  });
  onWrite();
  return result;
}
export const saveSetNote = (row, note) => put('sets', { ...row, note }, row);
export const deleteSet = row => put('sets', { ...row, deleted_at: Date.now() }, row);
export async function saveExercise(fields, existing) {
  if (!fields.name?.trim()) throw new Error('種目名を入力してください');
  if (!['chest', 'back', 'shoulders', 'legs'].includes(fields.body_part)) throw new Error('部位を選んでください');
  fields = migrateExercise(fields);
  const increment = numberInput(fields.increment_kg, .25, 500);
  const incrementLb = numberInput(fields.increment_lb, .25, 500);
  if (!['inherit', 'kg', 'lb'].includes(fields.display_unit)) throw new Error('重量単位を選んでください');
  if (!Number.isInteger(increment * 4)) throw new Error('重量刻みは0.25 kg刻みで入力してください');
  return put('exercises', {
    name_en: '', load_type: 'selectorized', setup_note: '', sort_order: Date.now(), is_archived: false,
    ...fields, name: fields.name.trim(), increment_kg: increment, increment_lb: incrementLb, display_unit: fields.display_unit ?? 'inherit',
    default_rest_seconds: numberInput(fields.default_rest_seconds ?? await setting('default_rest_seconds', 90), 1, 3600, true)
  }, existing);
}
export async function reorderExercises(rows) {
  await db.transaction(['exercises'], 'readwrite', tx => rows.forEach((row, index) => tx.objectStore('exercises').put(stamp({ ...row, sort_order: index }, row))));
  onWrite();
}
export const latestWeights = () => db.scan('body_weights', { index: 'by_date', direction: 'prev', accept: active, limit: 2 });
export async function saveWeight(date, weight, bodyFat) {
  if (!validDate(date)) throw new Error('正しい日付を入力してください');
  const fields = { date, weight: round(numberInput(weight, .0001, 500), 4), body_fat: bodyFat === '' || bodyFat === null ? null : round(numberInput(bodyFat, 0, 100), 1), recorded_at: Date.now() };
  let row;
  await db.transaction(['body_weights'], 'readwrite', tx => {
    const store = tx.objectStore('body_weights');
    store.index('by_date').get(date).onsuccess = event => { row = stamp(fields, event.target.result); store.put(row); };
  });
  onWrite();
  return row;
}
export async function recentSessions() {
  const rows = await db.scan('sessions', { index: 'by_started_at', direction: 'prev', accept: row => active(row) && row.ended_at !== null, limit: 5 });
  return Promise.all(rows.map(async row => { const sets = await sessionSets(row.id); return { ...row, sets, exerciseCount: new Set(sets.map(set => set.exercise_id)).size, volume: sessionVolume(sets) }; }));
}
export async function counts() {
  return Promise.all(['sessions', 'sets', 'body_weights'].map(async store => (await db.scan(store, { accept: active })).length));
}
export async function exportBackup() {
  // バックアップは削除の事実を保持するため通常の読み取りフィルタを適用しない。
  const data = {};
  await db.transaction(STORES, 'readonly', tx => {
    for (const store of STORES) tx.objectStore(store).getAll().onsuccess = event => { data[store] = event.target.result; };
  });
  return serialize(data, Date.now());
}
export const validateBackup = text => parse(text);
export async function importBackup(text) {
  const { data } = parse(text);
  const device = { seeded: true, persist_granted: await setting('persist_granted', false) };
  await db.transaction(STORES, 'readwrite', tx => {
    for (const store of STORES) {
      const objectStore = tx.objectStore(store);
      objectStore.clear();
      for (const row of data[store]) {
        if (store === 'meta' && Object.hasOwn(device, row.key)) continue;
        objectStore.put(store === 'meta' && !row.id ? stamp(row) : row);
      }
    }
    for (const [key, value] of Object.entries(device)) tx.objectStore('meta').put(stamp({ key, value }));
  });
  onWrite();
}
export const exerciseSets = exerciseId => db.scan('sets', {
  index: 'by_exercise_recorded', range: IDBKeyRange.bound([exerciseId, -Infinity], [exerciseId, Infinity]), accept: active
});
export async function exerciseHistory(exerciseId) {
  const sets = await exerciseSets(exerciseId);
  const sessions = await Promise.all([...new Set(sets.map(row => row.session_id))].map(id => db.get('sessions', id)));
  return { sets, sessions: sessions.filter(row => row && active(row)) };
}
