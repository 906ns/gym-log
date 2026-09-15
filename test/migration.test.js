import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateExercise, migrateData } from '../js/lib/migration.js';
import { parse } from '../js/lib/transfer.js';
import { readFileSync } from 'node:fs';
const oldSeed = JSON.parse(readFileSync(new URL('./fixtures/exercises-v1.json', import.meta.url)));
const common = { created_at: 10, updated_at: 20, deleted_at: null };
const exercise = { ...oldSeed.exercises[0], ...common, weight_increment: 2.5 };
const id = '71412c6c-60b7-4e7f-8e63-377102ba3cd3';
const data = { exercises: [exercise], sessions: [{ id, ...common, date: '2026-09-15', started_at: 10, ended_at: 20, condition_note: 'そのまま' }],
  sets: [{ id, ...common, session_id: id, exercise_id: exercise.id, order: 7, weight: 45.25, reps: 8, note: '残す', recorded_at: 15, is_warmup: false }],
  body_weights: [{ id, ...common, date: '2026-09-15', weight: 68.4, body_fat: null, recorded_at: 15 }],
  meta: [{ key: 'seeded', value: true, updated_at: 10 }, { key: 'schema_version', value: 1, updated_at: 10 }] };
test('提供シードはv1と同じ9つの固定IDを保持する', () => {
  const next = JSON.parse(readFileSync(new URL('../data/exercises.seed.json', import.meta.url)));
  assert.deepEqual(next.exercises.map(x => x.id), oldSeed.exercises.map(x => x.id));
});
test('種目移行は刻みとID・時刻・削除状態を保持し冪等', () => {
  const row = { ...exercise, deleted_at: 30 };
  const migrated = migrateExercise(row);
  assert.equal(migrated.increment_kg, 2.5);
  assert.equal(migrated.increment_lb, 5);
  assert.equal(migrated.display_unit, 'inherit');
  assert.equal(migrated.deleted_at, 30); assert.equal(migrated.id, row.id);
  assert.equal(migrated.updated_at, 20); assert.ok(!('weight_increment' in migrated));
  assert.deepEqual(migrateExercise(migrated), migrated);
});
test('v1 JSONは従来meta形式でも読み込め、記録全フィールドを保持する', () => {
  const snapshot = structuredClone(data);
  const result = parse(JSON.stringify({ format: 'gym-log-export', schema_version: 1, app_version: '1.0.0', exported_at: 30, data }));
  assert.equal(result.schema_version, 2);
  for (const key of ['sessions', 'sets', 'body_weights']) assert.deepEqual(result.data[key], data[key]);
  assert.equal(result.data.exercises[0].increment_kg, 2.5);
  assert.equal(result.data.meta.find(x => x.key === 'weight_unit').value, 'kg');
  assert.deepEqual(data, snapshot);
  assert.deepEqual(migrateData(result.data), result.data);
});
