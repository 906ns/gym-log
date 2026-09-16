import * as repo from '../repo.js';
import { elapsedSeconds, formatElapsed } from '../lib/datetime.js';
import { element, button } from './ui.js';
export function createMinibar(navigate) {
  const host = document.querySelector('#mini-bar');
  let session;
  let timer;
  const control = button('', () => navigate('session', session), 'mini-control');
  const dot = element('span', '', 'mini-dot');
  const time = element('span');
  const counts = element('span', '', 'mini-counts');
  control.append(dot, element('span', '記録中'), time, counts); host.append(control);
  return async name => {
    clearInterval(timer); host.hidden = true;
    if (name === 'session') return;
    session = await repo.currentSession();
    if (!session) return;
    const sets = await repo.sessionSets(session.id);
    counts.textContent = `${new Set(sets.map(row => row.exercise_id)).size}種目 ${sets.length}セット`;
    const tick = () => { time.textContent = formatElapsed(elapsedSeconds(session.started_at, Date.now())); };
    tick(); timer = setInterval(tick, 1000); host.hidden = false;
    control.setAttribute('aria-label', '進行中のトレーニングに戻る');
  };
}
