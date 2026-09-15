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
  const value = JSON.parse(serialize(data(), 10)); value.schema_version = 2;
  assert.throws(() => parse(JSON.stringify(value)), /schema_version/);
  value.schema_version = 1; delete value.data.sets;
  assert.throws(() => parse(JSON.stringify(value)), /sets/);
});
test('型の不一致、重複日付、参照先の欠落を拒否する', () => {
  const source = data(); source.body_weights.push({ ...source.body_weights[0], id: '71412c6c-60b7-4e7f-8e63-377102ba3cd3' });
  assert.throws(() => serialize(source, 10), /重複/);
  const bad = data(); bad.body_weights[0].weight = '68'; assert.throws(() => serialize(bad, 10));
  const missing = data(); missing.sets.push({ ...common, session_id: common.id, exercise_id: common.id }); assert.throws(() => serialize(missing, 10), /参照先/);
});
