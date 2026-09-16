import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekStart, daysBetween, sparkline, summary } from '../js/lib/insights.js';
test('週は月曜開始で経過日数は日付差', () => {
  assert.equal(weekStart('2026-09-20'), '2026-09-14');
  assert.equal(daysBetween('2026-09-14', '2026-09-16'), 2);
});
test('空・一点・同値スパークラインは有限の座標になる', () => {
  assert.equal(sparkline([]).path, '');
  for (const values of [[1], [1, 1], [0, 10, 5]]) {
    const result = sparkline(values);
    assert.ok(result.points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
    assert.ok(!/NaN|Infinity/.test(result.path));
  }
});
test('終了サマリーは削除を除外し更新セットの件数を数える', () => {
  const session = { started_at: 1000, ended_at: 61000, date: '1970-01-01', created_at: 1000 };
  const rows = [1,2,3].map(n => ({ id: String(n), exercise_id: 'a', weight: n * 10, reps: 10, created_at: n, recorded_at: n, deleted_at: n === 3 ? 4 : null, is_warmup: false }));
  assert.deepEqual(summary(session, rows, [rows]), { duration: 60, exercises: 1, sets: 2, volume: 300, records: 1 });
});
