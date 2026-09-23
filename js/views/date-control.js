import { dateCandidates } from '../lib/calendar.js';
import { dateKey, formatDate } from '../lib/datetime.js';
import { element, button } from './ui.js';
import { listRow } from './list.js';

export function dateControl(title, { value = '', includeToday = false } = {}) {
  let selected = value;
  let offset = 0;
  const today = dateKey(new Date());
  const group = element('div');
  const choices = element('div');
  choices.hidden = true;
  const display = key => `${key.slice(0, 4)}年${formatDate(key)}`;
  const toggle = button('', () => {
    choices.hidden = !choices.hidden;
    toggle.setAttribute('aria-expanded', String(!choices.hidden));
    if (!choices.hidden) paint();
  }, 'wide');
  toggle.setAttribute('aria-expanded', 'false');
  const update = () => { toggle.textContent = `${title}: ${selected ? display(selected) : '日付を選ぶ'}`; };
  function paint() {
    choices.replaceChildren();
    for (const key of dateCandidates(today, { includeToday, offset })) {
      const row = listRow({ title: display(key), symbol: 'history', action: () => {
        selected = key; update(); choices.hidden = true;
        toggle.setAttribute('aria-expanded', 'false'); toggle.focus();
      } });
      row.setAttribute('aria-pressed', String(key === selected));
      choices.append(row);
    }
    const changePage = delta => {
      offset += delta; paint();
      // ページ末尾から切り替えた後も、新しい候補の先頭から選べるようにする。
      choices.querySelector('button').focus();
    };
    const newer = button('新しい14日', () => changePage(-14));
    newer.disabled = offset === 0;
    const older = button('前の14日', () => changePage(14));
    const paging = element('div', undefined, 'calendar-heading');
    paging.append(newer, older); choices.append(paging);
  }
  update(); group.append(toggle, choices);
  return { group, get value() { return selected; } };
}
