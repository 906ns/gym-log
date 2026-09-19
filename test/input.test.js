import { test } from 'node:test';
import assert from 'node:assert/strict';
import { repeatDelay, stepValue, setInputErrors } from '../js/lib/input.js';
test('長押しは1.5秒から加速し上下限で継続を止める', () => {
  assert.equal(repeatDelay(400), 120); assert.equal(repeatDelay(1499), 120); assert.equal(repeatDelay(1500), 60);
  assert.deepEqual(stepValue(499, 5, 0, 500), { value: 500, continue: false });
  assert.deepEqual(stepValue(2, -5, 1, 100), { value: 1, continue: false });
  assert.deepEqual(stepValue(40, 2.5, 0, 500), { value: 42.5, continue: true });
});

test('空欄のレップは1から、重量は刻み幅から増やす', () => {
  assert.deepEqual(stepValue(null, 1, 1, 100), { value: 1, continue: true });
  assert.equal(stepValue(null, -1, 1, 100).value, 1);
  assert.equal(stepValue(null, 5, 0, 500).value, 5);
  assert.equal(stepValue(1, 1, 1, 100).value, 2);
});

test('記録入力の未入力と範囲外を区別し両方の不備を返す', () => {
  assert.deepEqual(Object.keys(setInputErrors('', '')), ['weight', 'reps']);
  assert.match(setInputErrors('', '').weight, /入力してください/);
  assert.match(setInputErrors('501', '101').weight, /範囲/);
  assert.match(setInputErrors('501', '101').reps, /整数/);
  assert.deepEqual(setInputErrors('６２．５', '１０'), {});
  assert.deepEqual(setInputErrors('1000', '10', 'lb'), {});
  assert.ok(setInputErrors('-5', 'abc').weight);
});
