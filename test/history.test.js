import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupHistory, filterExercises } from '../js/lib/history.js';
test('種目履歴は削除を除いて新しい10セッションに限定する', () => {
  const sessions = Array.from({ length: 12 }, (_, i) => ({ id: String(i), started_at: i, created_at: i, deleted_at: null }));
  const sets = sessions.map(row => ({ session_id: row.id, recorded_at: 100 - row.started_at, order: 1, deleted_at: null }));
  assert.deepEqual(groupHistory(sets, sessions).map(row => row.id), ['11','10','9','8','7','6','5','4','3','2']);
  sessions[11].deleted_at = 20;
  assert.equal(groupHistory(sets, sessions)[0].id, '10');
});
test('名前検索と部位を併用し元の順序を保つ', () => {
  const rows = [{ name: 'チェストプレス', name_en: 'Chest Press', body_part: 'chest', is_archived: false }, { name: 'ショルダープレス', name_en: 'Shoulder Press', body_part: 'shoulders', is_archived: false }];
  assert.deepEqual(filterExercises(rows, 'chest', ' PRESS '), [rows[0]]);
  assert.equal(filterExercises(rows, '', 'プレス').length, 2);
});
