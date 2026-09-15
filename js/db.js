import { migrateExercise } from './lib/migration.js';
export const SCHEMA_VERSION = 3;
let connection;
export function open() {
  if (connection) return connection;
  connection = new Promise((resolve, reject) => {
    const request = indexedDB.open('gym-log', SCHEMA_VERSION);
    request.onupgradeneeded = event => {
      const db = request.result;
      if (event.oldVersion < 1) {
        const definitions = {
          exercises: [['by_body_part', 'body_part'], ['by_sort_order', 'sort_order'], ['by_updated_at', 'updated_at']],
          sessions: [['by_date', 'date'], ['by_started_at', 'started_at'], ['by_updated_at', 'updated_at']],
          sets: [['by_session', 'session_id'], ['by_exercise_recorded', ['exercise_id', 'recorded_at']], ['by_updated_at', 'updated_at']],
          body_weights: [['by_date', 'date', true], ['by_updated_at', 'updated_at']],
          meta: [['by_key', 'key', true]]
        };
        for (const [name, indexes] of Object.entries(definitions)) {
          const store = db.createObjectStore(name, { keyPath: 'id' });
          for (const [index, path, unique = false] of indexes) store.createIndex(index, path, { unique });
        }
      }
      if (event.oldVersion < 2) {
        // 既存のUUID主キーの設定も値を保持してkey主キーへ移す。
        const tx = request.transaction;
        tx.objectStore('meta').getAll().onsuccess = rowsEvent => {
          const rows = rowsEvent.target.result;
          db.deleteObjectStore('meta');
          const store = db.createObjectStore('meta', { keyPath: 'key' });
          store.createIndex('by_key', 'key', { unique: true });
          for (const row of rows) store.put(row);
        };
      }
      if (event.oldVersion < 3) {
        const tx = request.transaction;
        // 旧metaの再作成が完了した後に設定を補完するため種目カーソルに連鎖する。
        tx.objectStore('exercises').openCursor().onsuccess = cursorEvent => {
          const cursor = cursorEvent.target.result;
          if (cursor) { cursor.update(migrateExercise(cursor.value)); cursor.continue(); return; }
          const meta = tx.objectStore('meta');
          if (!meta.indexNames.contains('by_key')) meta.createIndex('by_key', 'key', { unique: true });
          meta.openCursor().onsuccess = metaEvent => {
            const entry = metaEvent.target.result;
            if (entry) {
              const row = entry.value;
              const now = row.updated_at ?? Date.now();
              entry.update({ ...row, id: row.id || crypto.randomUUID(), created_at: row.created_at ?? now,
                updated_at: now, deleted_at: row.deleted_at ?? null, value: row.key === 'schema_version' ? 2 : row.value });
              entry.continue();
              return;
            }
            for (const [key, value] of [['weight_unit', 'kg'], ['schema_version', 2]]) {
              meta.index('by_key').get(key).onsuccess = settingEvent => {
                if (settingEvent.target.result) return;
                const now = Date.now();
                meta.put({ key, value, id: crypto.randomUUID(), created_at: now, updated_at: now, deleted_at: null });
              };
            }
          };
        };
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); connection = null; };
      resolve(db);
    };
    request.onerror = () => { connection = null; reject(request.error); };
    request.onblocked = () => { console.error('別のタブを閉じてから開き直してください'); reject(new Error('更新のため、他のタブとホーム画面アプリを閉じて開き直してください')); connection = null; };
  });
  return connection;
}
export async function transaction(names, mode, work) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(names, mode);
    let result;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('保存を中断しました'));
    try { result = work(tx); } catch (error) { tx.abort(); reject(error); }
  });
}
export async function get(store, key, index) {
  let result;
  await transaction([store], 'readonly', tx => {
    const source = index ? tx.objectStore(store).index(index) : tx.objectStore(store);
    source.get(key).onsuccess = event => { result = event.target.result; };
  });
  return result;
}
export async function scan(store, { index, range, direction = 'next', accept = () => true, stop = () => false, limit = Infinity } = {}) {
  const rows = [];
  await transaction([store], 'readonly', tx => {
    const source = index ? tx.objectStore(store).index(index) : tx.objectStore(store);
    source.openCursor(range, direction).onsuccess = event => {
      const cursor = event.target.result;
      if (!cursor || stop(cursor.value)) return;
      if (accept(cursor.value)) rows.push(cursor.value);
      if (rows.length < limit) cursor.continue();
    };
  });
  return rows;
}
