import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serialize, parse, STORES } from '../js/lib/transfer.js';
const common = { id: '6f79e181-16a3-48d2-a5e1-d62ff1d6bf25', created_at: 1, updated_at: 2, deleted_at: null };
const data = () => ({ ...Object.fromEntries(STORES.map(key => [key, []])), body_weights: [{ ...common, date: '2026-09-15', weight: 68.4, body_fat: null, recorded_at: 1 }] });
test('書き出しと読み込みで削除状態も含め往復する', () => {
  const source = data(); source.body_weights[0].deleted_at = 3;
  assert.deepEqual(parse(serialize(source, 10)).data, source);
});
test('壊れたJSON、バージョン違い、必須キー欠落を拒否する', () => {
  assert.throws(() => parse('{'), /JSON/);
  const value = JSON.parse(serialize(data(), 10)); value.schema_version = 99;
  assert.throws(() => parse(JSON.stringify(value)), /schema_version/);
  value.schema_version = 2; delete value.data.sets;
  assert.throws(() => parse(JSON.stringify(value)), /sets/);
});
test('型の不一致、重複日付、参照先の欠落を拒否する', () => {
  const source = data(); source.body_weights.push({ ...source.body_weights[0], id: '71412c6c-60b7-4e7f-8e63-377102ba3cd3' });
  assert.throws(() => serialize(source, 10), /重複/);
  const bad = data(); bad.body_weights[0].weight = '68'; assert.throws(() => serialize(bad, 10));
  const missing = data(); missing.sets.push({ ...common, session_id: common.id, exercise_id: common.id }); assert.throws(() => serialize(missing, 10), /参照先/);
});
test('全ストアの往復と重量・レップの境界を検証する', () => {
  const source = data();
  source.exercises.push({ ...common, name: 'チェストプレス', name_en: 'Chest Press', body_part: 'chest', load_type: 'selectorized', increment_kg: 5, increment_lb: 5, display_unit: 'inherit', default_rest_seconds: 90, setup_note: '', sort_order: 0, is_archived: false });
  source.sessions.push({ ...common, date: '2026-09-15', started_at: 1, ended_at: 2, condition_note: '' });
  source.sets.push({ ...common, session_id: common.id, exercise_id: common.id, order: 1, weight: 45.25, reps: 10, note: '最後きつい', recorded_at: 1, is_warmup: false });
  source.meta.push({ ...common, key: 'show_body_fat', value: true });
  assert.deepEqual(parse(serialize(source, 10)).data, source);
  for (const weight of [-1, 501, '45']) {
    const changed = structuredClone(source); changed.sets[0].weight = weight;
    assert.throws(() => serialize(changed, 10), /セット/);
  }
  for (const reps of [0, 101, 1.5, '10']) {
    const changed = structuredClone(source); changed.sets[0].reps = reps;
    assert.throws(() => serialize(changed, 10), /セット/);
  }
});

test('製品版が旧1.1.0のバックアップも読み込んで往復できる', () => {
  const source = data();
  const value = JSON.parse(serialize(source, 10));
  assert.equal(value.app_version, '1.2.0');
  value.app_version = '1.1.0';
  const restored = parse(JSON.stringify(value));
  assert.deepEqual(restored.data, source);
  assert.deepEqual(parse(serialize(restored.data, 20)).data, source);
});
