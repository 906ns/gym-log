import { test } from 'node:test';
import assert from 'node:assert/strict';
import { repeatDelay, stepValue } from '../js/lib/input.js';
test('長押しは1.5秒から加速し上下限で継続を止める', () => {
  assert.equal(repeatDelay(400), 120); assert.equal(repeatDelay(1499), 120); assert.equal(repeatDelay(1500), 60);
  assert.deepEqual(stepValue(499, 5, 0, 500), { value: 500, continue: false });
  assert.deepEqual(stepValue(2, -5, 1, 100), { value: 1, continue: false });
  assert.deepEqual(stepValue(40, 2.5, 0, 500), { value: 42.5, continue: true });
});
