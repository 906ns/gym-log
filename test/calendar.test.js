import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthGrid, shiftMonth, pastStart, isPastEntry, dateCandidates } from '../js/lib/calendar.js';
test('閏年と年跨ぎの月グリッド', () => {
  const grid = monthGrid('2024-02-01');
  assert.equal(grid.last, '2024-02-29'); assert.equal(grid.cells.filter(Boolean).length, 29); assert.equal(grid.cells.length % 7, 0);
  assert.equal(shiftMonth('2026-01-31', -1), '2025-12-01');
});
test('過去入力は当日より前の正午で作成し通常セッションと区別する', () => {
  const time = pastStart('2026-09-14', '2026-09-16'); assert.equal(new Date(time).getHours(), 12);
  assert.throws(() => pastStart('2026-09-16', '2026-09-16'));
  assert.throws(() => pastStart('2026-09-17', '2026-09-16'));
  assert.throws(() => pastStart('', '2026-09-16'));
  assert.throws(() => pastStart('2026-02-30', '2026-09-16'));
  assert.equal(isPastEntry({ date: '2026-09-14', created_at: new Date('2026-09-16T09:00:00').getTime() }), true);
});

test('過去記録の日付候補は昨日から14日分で今日と未来を含まない', () => {
  const dates = dateCandidates('2026-09-21');
  assert.equal(dates.length, 14);
  assert.equal(dates[0], '2026-09-20');
  assert.equal(dates.at(-1), '2026-09-07');
  assert.equal(new Set(dates).size, 14);
  for (const date of dates) assert.doesNotThrow(() => pastStart(date, '2026-09-21'));
});

test('体重の日付候補は今日を含みページ送りで隙間なく古い日付を選べる', () => {
  const first = dateCandidates('2026-01-05', { includeToday: true });
  const older = dateCandidates('2026-01-05', { includeToday: true, offset: 14 });
  assert.equal(first[0], '2026-01-05');
  assert.equal(first.at(-1), '2025-12-23');
  assert.equal(older[0], '2025-12-22');
  assert.equal(older.at(-1), '2025-12-09');
  assert.equal(new Set([...first, ...older]).size, 28);
});

test('日付候補は月末と年末とうるう年を暦日として扱う', () => {
  assert.deepEqual(dateCandidates('2026-05-02').slice(0, 3), ['2026-05-01', '2026-04-30', '2026-04-29']);
  assert.deepEqual(dateCandidates('2026-01-02').slice(0, 3), ['2026-01-01', '2025-12-31', '2025-12-30']);
  assert.deepEqual(dateCandidates('2024-03-01').slice(0, 2), ['2024-02-29', '2024-02-28']);
  assert.equal(dateCandidates('2000-03-01')[0], '2000-02-29');
  assert.equal(dateCandidates('2100-03-01')[0], '2100-02-28');
  assert.deepEqual(dateCandidates('2026-03-10').slice(0, 3), ['2026-03-09', '2026-03-08', '2026-03-07']);
  assert.deepEqual(dateCandidates('2026-11-03').slice(0, 3), ['2026-11-02', '2026-11-01', '2026-10-31']);
});

test('日付候補は不正な日付や候補位置を拒否する', () => {
  for (const date of ['', '2026-02-30']) assert.throws(() => dateCandidates(date));
  for (const offset of [-1, 0.5, NaN, Infinity]) assert.throws(() => dateCandidates('2026-09-21', { offset }));
});

test('カレンダーは週次集計と同じ月曜始まり', () => {
  assert.equal(monthGrid('2026-06-01').cells[0], '2026-06-01');
  assert.equal(monthGrid('2026-02-01').cells[6], '2026-02-01');
  assert.equal(monthGrid('2024-02-01').cells[3], '2024-02-01');
});
