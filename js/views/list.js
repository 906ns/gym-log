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
