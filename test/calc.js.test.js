import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimatedMax, setVolume, sessionVolume, previousDifference, setValues, increment, numberInput, signedDifference } from '../js/lib/calc.js';
const set = (weight, reps, deleted_at = null) => ({ weight, reps, deleted_at });
test('推定1RMはEpley式で1回は重量そのもの', () => {
  assert.equal(estimatedMax(45, 10), 60);
  assert.equal(estimatedMax(45, 1), 45);
  for (const reps of [0, -1, 1.5, 101, NaN]) assert.equal(estimatedMax(45, reps), 0);
  assert.equal(estimatedMax(Infinity, 10), 0);
});
test('ボリュームと前回比は削除を除いて計算する', () => {
  assert.equal(setVolume(set(45, 10)), 450);
  assert.equal(sessionVolume([set(45, 10), set(40, 10), set(50, 10, 1)]), 850);
  assert.equal(previousDifference([set(45, 10)], [set(40, 10)]), 6.7);
});
test('入力境界、丸め、刻みを検証する', () => {
  assert.deepEqual(setValues('0', '100'), { weight: 0, reps: 100 });
  assert.deepEqual(setValues('45.249', '1'), { weight: 45.249, reps: 1 });
  for (const args of [['', 1], [501, 1], [45, 0], [45, 1.2]]) assert.throws(() => setValues(...args));
  assert.equal(increment('68.4', .1, 0, 500), 68.5);
});

test('全角数字も半角と同じ値として受け付け、不正な入力は拒否する', () => {
  assert.deepEqual(setValues('６０', '１０'), setValues('60', '10'));
  assert.deepEqual(setValues('６２．５', '１０'), setValues('62.5', '10'));
  for (const text of ['abc', '-5', '', '1.2.3']) assert.throws(() => numberInput(text, 0, 500));
  assert.throws(() => numberInput('１．５', 1, 100, true));
  assert.throws(() => numberInput('５０１', 0, 500));
});

test('前回差は増減の符号を丸め後も保持する', () => {
  assert.equal(signedDifference(69.96, 70), '-0.0');
  assert.equal(signedDifference(70.04, 70), '+0.0');
  assert.equal(signedDifference(80, 70), '+10.0');
  assert.equal(signedDifference(70, 70), '0.0');
});
