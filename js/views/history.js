import { listRow } from './list.js';
import * as repo from '../repo.js';
import { formatDate } from '../lib/datetime.js';
import { formatTotal } from '../lib/units.js';
import { element, button } from './ui.js';
import { showSessionHistory } from './session-history.js';
export async function renderHistory(root, navigate) {
  const rows = await repo.recentSessions(Infinity);
  const unit = await repo.setting('weight_unit', 'kg');
  root.replaceChildren();
  rows.sort((a, b) => b.date.localeCompare(a.date) || b.started_at - a.started_at);
  for (const session of rows) {
    const row = listRow({ title: formatDate(session.date), subtitle: session.condition_note.split('\n')[0] || `${session.exerciseCount}種目`, value: formatTotal(session.volume, unit), symbol: 'history', action: () => showSessionHistory(session, () => navigate('history')) });
    root.append(row);
  }
  return () => {};
}
