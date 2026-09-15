import { increment } from '../lib/calc.js';
export function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
export function showError(error) {
  console.error(error);
  const node = document.querySelector('#error');
  node.textContent = error.message || String(error);
  node.hidden = false;
  node.scrollIntoView({ block: 'nearest' });
}
export function button(text, action, className) {
  const node = element('button', text, className);
  node.type = 'button';
  node.addEventListener('click', async () => {
    if (node.disabled) return;
    node.disabled = true;
    try { await action(); } catch (error) { showError(error); }
    finally { node.disabled = false; }
  });
  return node;
}
export function input(label, value = '', mode) {
  const field = element('input');
  field.type = 'text'; field.value = value; field.setAttribute('aria-label', label);
  if (mode) field.inputMode = mode;
  return field;
}
export function label(text, field) {
  const node = element('label', text);
  node.append(field);
  return node;
}
export function numberControl(title, value, step, min, max, mode = 'decimal') {
  const field = input(title, value, mode);
  const group = element('div', undefined, 'number-control');
  const minus = button('−', () => { field.value = increment(field.value, -step, min, max); });
  const plus = button('+', () => { field.value = increment(field.value, step, min, max); });
  minus.setAttribute('aria-label', `${title}を減らす`); plus.setAttribute('aria-label', `${title}を増やす`);
  group.append(minus, field, element('span', title, 'unit'), plus);
  return { group, field };
}
export function template(id) { return document.getElementById(id).content.firstElementChild.cloneNode(true); }
export function dialog(id, title) {
  const node = document.getElementById(id);
  node.replaceChildren(element('h2', title));
  return node;
}
export function confirmAction(message) {
  const node = dialog('dlg-confirm', message);
  return new Promise(resolve => {
    const finish = answer => { node.close(); resolve(answer); };
    node.append(button('やめる', () => finish(false)), button('実行する', () => finish(true), 'danger'));
    node.addEventListener('cancel', () => resolve(false), { once: true });
    node.showModal();
  });
}
export function editText(title, value, save) {
  const node = dialog('dlg-editor', title);
  const field = element('textarea'); field.value = value; field.setAttribute('aria-label', title);
  node.append(field, button('保存する', async () => { await save(field.value); node.close(); }, 'primary'), button('やめる', () => node.close()));
  node.showModal();
}
export const parts = { chest: '胸', back: '背中', shoulders: '肩', legs: '脚' };
export function select(labelText, choices, selected) {
  const node = element('select'); node.setAttribute('aria-label', labelText);
  for (const [value, text] of Object.entries(choices)) {
    const option = element('option', text); option.value = value; node.append(option);
  }
  node.value = selected;
  return node;
}
