import { migrateData } from './migration.js';
import { validDate } from './datetime.js';
export const STORES = ['exercises', 'sessions', 'sets', 'body_weights', 'meta'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const numeric = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const fail = message => { throw new Error(message); };
export function validateExport(value) {
  if (!value || value.format !== 'gym-log-export') fail('format が gym-log-export ではありません');
  if (![1, 2].includes(value.schema_version)) fail(`schema_version が ${value.schema_version} です。このアプリは 1 と 2 を読み込みます`);
  const legacy = value.schema_version === 1;
  if (!numeric(value.exported_at) || typeof value.app_version !== 'string') fail('書き出し情報が不正です');
  for (const store of STORES) {
    const records = value.data?.[store] ?? (legacy && store === 'meta' ? [] : undefined);
    if (!Array.isArray(records)) fail(`${store} は必須の配列です`);
    const ids = new Set();
    for (const row of records) {
      if (legacy && store === 'meta') {
        if (!row || typeof row.key !== 'string' || !('value' in row) || (row.updated_at !== undefined && !numeric(row.updated_at))) fail('設定のフィールドが不正です');
        continue;
      }
      if (!row || typeof row.id !== 'string' || !uuid.test(row.id) || !numeric(row.created_at) || !numeric(row.updated_at) || !(row.deleted_at === null || numeric(row.deleted_at))) fail(`${store} の共通フィールドが不正です`);
      if (ids.has(row.id)) fail(`${store} のIDが重複しています`);
      ids.add(row.id);
    }
  }
  const data = value.data;
  for (const row of data.exercises) {
    if (typeof row.name !== 'string' || !row.name.trim() || typeof row.name_en !== 'string' || typeof row.setup_note !== 'string' || !['chest', 'back', 'shoulders', 'legs'].includes(row.body_part) || !['selectorized', 'plate', 'bodyweight'].includes(row.load_type) || !(legacy ? numeric(row.weight_increment) && row.weight_increment > 0 : numeric(row.increment_kg) && row.increment_kg > 0 && numeric(row.increment_lb) && row.increment_lb > 0 && ['inherit', 'kg', 'lb'].includes(row.display_unit)) || !numeric(row.default_rest_seconds) || !Number.isInteger(row.sort_order) || typeof row.is_archived !== 'boolean') fail('種目のフィールドが不正です');
  }
  for (const row of data.sessions) {
    if (!validDate(row.date) || !numeric(row.started_at) || !(row.ended_at === null || numeric(row.ended_at)) || typeof row.condition_note !== 'string') fail('セッションのフィールドが不正です');
  }
  const sessions = new Set(data.sessions.map(row => row.id));
  const exercises = new Set(data.exercises.map(row => row.id));
  for (const row of data.sets) {
    if (!sessions.has(row.session_id) || !exercises.has(row.exercise_id)) fail('セットの参照先がありません');
    if (!numeric(row.weight) || row.weight > 500 || (legacy && !Number.isInteger(row.weight * 4)) || !Number.isInteger(row.reps) || row.reps < 1 || row.reps > 100 || !Number.isInteger(row.order) || row.order < 1 || !numeric(row.recorded_at) || typeof row.note !== 'string' || typeof row.is_warmup !== 'boolean') fail('セットの重量・レップ・フィールドが不正です');
  }
  const dates = new Set();
  for (const row of data.body_weights) {
    if (!validDate(row.date) || dates.has(row.date)) fail('体重の日付が不正または重複しています');
    dates.add(row.date);
    if (!numeric(row.weight) || row.weight <= 0 || !(row.body_fat === null || numeric(row.body_fat) && row.body_fat <= 100) || !numeric(row.recorded_at)) fail('体重のフィールドが不正です');
  }
  const keys = new Set();
  for (const row of data.meta || []) {
    if (typeof row.key !== 'string' || !('value' in row) || keys.has(row.key)) fail('設定のキーが不正です');
    keys.add(row.key);
    if (['seeded', 'persist_granted', 'show_body_fat'].includes(row.key) && typeof row.value !== 'boolean') fail('設定の値が不正です');
    if (row.key === 'default_rest_seconds' && (!Number.isInteger(row.value) || row.value < 0)) fail('休憩秒数が不正です');
    if (row.key === 'weight_unit' && !['kg', 'lb'].includes(row.value)) fail('重量単位が不正です');
    if (row.key === 'schema_version' && ![1, 2].includes(row.value)) fail('設定のバージョンが不正です');
  }
  return value;
}
export function serialize(data, now) {
  return JSON.stringify(validateExport({ format: 'gym-log-export', schema_version: 2, exported_at: now, app_version: '1.1.0', data }), null, 2);
}
export function parse(text) {
  let value;
  try { value = JSON.parse(text); } catch { fail('JSONが壊れています。バックアップファイルを選んでください'); }
  validateExport(value);
  return value.schema_version === 1 ? { ...value, schema_version: 2, data: migrateData(value.data) } : value;
}
