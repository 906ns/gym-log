import { test } from 'node:test';
import assert from 'node:assert/strict';
import { personalRecords, recordAchievements } from '../js/lib/records.js';
import { estimatedMax } from '../js/lib/calc.js';
const row = (id, weight, reps, changes = {}) => ({ id, weight, reps, deleted_at: null, is_warmup: false, created_at: Number(id), recorded_at: Number(id), ...changes });
test('初回には印を付けず連続更新をそれぞれ検出する', () => {
  const records = recordAchievements([row('1', 40, 10), row('2', 45, 10), row('3', 50, 10), row('4', 50, 10)]);
  assert.deepEqual(records.get('1'), []); assert.equal(records.get('2').length, 3); assert.equal(records.get('3').length, 3); assert.deepEqual(records.get('4'), []);
});
test('削除・ウォームアップを除外し単発1RMの例外を維持する', () => {
  const data = [row('1', 50, 1), row('2', 45, 10), row('3', 100, 10, { deleted_at: 4 }), row('4', 110, 10, { is_warmup: true })];
  const pr = personalRecords(data);
  assert.equal(pr.weightSet.weight, 50); assert.equal(pr.estimated, 60); assert.equal(pr.volume, 450);
  assert.deepEqual(recordAchievements(data).get('2'), ['推定1RM', '最大ボリューム']);
});
test('保存精度の差を表示丸め前に比較する', () => {
  const sets = [row('1', 45.3592, 10), row('2', 45.3593, 10)];
  assert.equal(estimatedMax(sets[0].weight, 10), 60.5);
  assert.equal(estimatedMax(sets[1].weight, 10), 60.5);
  assert.ok(recordAchievements(sets).get('2').includes('最大重量'));
  assert.ok(recordAchievements(sets).get('2').includes('推定1RM'));
  assert.ok(personalRecords(sets).estimated < 60.5);
});
