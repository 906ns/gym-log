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
    const row = button('', () => showSessionHistory(session, () => navigate('history')), 'history');
    row.append(element('span', formatDate(session.date)), element('span', `${session.exerciseCount}種目 / ${formatTotal(session.volume, unit)}`));
    if (session.condition_note) row.append(element('span', session.condition_note.split('\n')[0], 'muted'));
    root.append(row);
  }
  return () => {};
}
