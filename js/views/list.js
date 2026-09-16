import { element, button } from './ui.js';
import { icon } from './graphics.js';
export function listRow({ title, subtitle, value, symbol = 'settings', action, control }) {
  const row = action ? button('', action, 'list-row') : element('div', undefined, 'list-row');
  const frame = element('span', undefined, 'list-icon'); frame.append(icon(symbol));
  const content = element('span', undefined, 'list-copy'); content.append(element('span', title, 'list-title'));
  if (subtitle) { content.append(element('span', subtitle, 'list-subtitle')); row.classList.add('two-lines'); }
  row.append(frame, content);
  if (value !== undefined) row.append(element('span', value, 'list-value'));
  if (control) row.append(control);
  if (action) { const arrow = icon('forward'); arrow.classList.add('list-chevron'); row.append(arrow); }
  return row;
}
export function sectionHeading(title, count) {
  const heading = element('h2', undefined, 'section-heading');
  heading.append(element('span', title));
  if (count !== undefined) heading.append(element('span', String(count), 'section-count'));
  return heading;
}
// 並び順を変えず、連続するまとまりごとに見出しを置く。
export function groupedList(rows, keyOf, titleOf, render) {
  const list = element('div', undefined, 'section-list');
  for (let index = 0; index < rows.length;) {
    const key = keyOf(rows[index]);
    const group = [];
    while (index < rows.length && keyOf(rows[index]) === key) group.push(rows[index++]);
    const section = element('section', undefined, 'list-section');
    section.append(sectionHeading(titleOf(group[0]), group.length), ...group.map(render)); list.append(section);
  }
  return list;
}
export function emptyState(symbol, message) {
  const state = element('div', undefined, 'empty-state');
  state.append(icon(symbol), element('p', message));
  return state;
}
