import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthGrid, shiftMonth, pastStart, isPastEntry } from '../js/lib/calendar.js';
test('閏年と年跨ぎの月グリッド', () => {
  const grid = monthGrid('2024-02-01');
  assert.equal(grid.last, '2024-02-29'); assert.equal(grid.cells.filter(Boolean).length, 29); assert.equal(grid.cells.length % 7, 0);
  assert.equal(shiftMonth('2026-01-31', -1), '2025-12-01');
});
test('過去入力は当日より前の正午で作成し通常セッションと区別する', () => {
  const time = pastStart('2026-09-14', '2026-09-16'); assert.equal(new Date(time).getHours(), 12);
  assert.throws(() => pastStart('2026-09-16', '2026-09-16'));
  assert.throws(() => pastStart('2026-02-30', '2026-09-16'));
  assert.equal(isPastEntry({ date: '2026-09-14', created_at: new Date('2026-09-16T09:00:00').getTime() }), true);
});
