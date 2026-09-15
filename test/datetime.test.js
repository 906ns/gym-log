import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateKey, elapsedSeconds, formatElapsed, validDate } from '../js/lib/datetime.js';
test('ローカル日付と日付跨ぎを扱う', () => {
  assert.equal(dateKey(new Date(2026, 0, 2, 0, 1)), '2026-01-02');
  assert.equal(elapsedSeconds(new Date(2026, 0, 1, 23, 59, 59).getTime(), new Date(2026, 0, 2, 0, 0, 1).getTime()), 2);
  assert.equal(formatElapsed(125), '2:05');
  assert.equal(elapsedSeconds(100, 0), 0);
  assert.equal(validDate('2026-02-30'), false);
});
