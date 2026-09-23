import { listRow, groupedList, emptyState } from './list.js';
import * as repo from '../repo.js';
import { formatDate } from '../lib/datetime.js';
import { formatTotal } from '../lib/units.js';
import { element, button } from './ui.js';
import { showSessionHistory } from './session-history.js';
export async function renderHistory(root, navigate) {
  const rows = await repo.recentSessions(Infinity);
  const unit = await repo.setting('weight_unit', 'kg');
  root.replaceChildren();
  if (!rows.length) {
    const current = await repo.currentSession();
    root.append(emptyState('history', current ? '終了したトレーニングがここに並びます' : '最初のトレーニングを記録する'),
      button(current ? 'トレーニングを続ける' : '開始する', async () => navigate('session', current || await repo.startSession()), 'primary'));
  }
  rows.sort((a, b) => b.date.localeCompare(a.date) || b.started_at - a.started_at);
  root.append(groupedList(rows, row => row.date.slice(0, 7), row => `${row.date.slice(0, 4)}年${Number(row.date.slice(5, 7))}月`, session => listRow({ title: formatDate(session.date), subtitle: session.condition_note.split('\n')[0] || `${session.exerciseCount}種目`, value: formatTotal(session.volume, unit), symbol: 'history', action: () => showSessionHistory(session, () => navigate('history')) })));
  return () => {};
}
