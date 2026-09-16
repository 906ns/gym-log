import { icon } from './graphics.js';
import { stepValue } from '../lib/input.js';
import { bindRepeat } from './pointer.js';
export function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
export function showError(error) {
  console.error(error);
  const openDialog = [...document.querySelectorAll('dialog[open]')].at(-1);
  let node = openDialog?.querySelector('[role="alert"]');
  if (openDialog && !node) { node = element('p'); node.setAttribute('role', 'alert'); openDialog.prepend(node); }
  node ||= document.querySelector(document.querySelector('#session-overlay').hidden ? '#error' : '#session-error');
  node.textContent = error.message || String(error);
  node.hidden = false;
  node.scrollIntoView({ block: 'nearest' });
}
export function button(text, action, className) {
  const node = element('button', text, className);
  node.type = 'button';
  const symbol = { 'ホーム': 'home', '閉じる': 'close' }[text];
  if (symbol) { node.prepend(icon(symbol)); node.classList.add('with-icon'); }
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
  let delta = step;
  const group = element('div', undefined, 'number-control');
  const change = direction => {
    const current = field.value === '' ? min : Number(field.value);
    if (!Number.isFinite(current)) { showError(new Error('数値を入力してください')); return false; }
    const next = stepValue(current, direction * delta, min, max);
    field.value = next.value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    return next.continue;
  };
  const minus = element('button', '−'); const plus = element('button', '+');
  minus.type = plus.type = 'button';
  minus.className = plus.className = 'repeat-button';
  bindRepeat(minus, () => change(-1)); bindRepeat(plus, () => change(1));
  minus.setAttribute('aria-label', `${title}を減らす`); plus.setAttribute('aria-label', `${title}を増やす`);
  field.addEventListener('focus', () => requestAnimationFrame(() => field.select()));
  const box = element('div', undefined, 'number-field');
  box.append(field, element('span', title, 'unit'));
  group.append(minus, box, plus);
  return { group, field, setStep: value => { delta = value; } };
}
export function increments(control, current, save) {
  const group = element('div', undefined, 'increments');
  group.setAttribute('aria-label', '重量の増減幅');
  for (const step of [1, 2.5, 5, 10]) {
    const node = button(String(step), async () => {
      await save(step); control.setStep(step);
      for (const sibling of group.children) sibling.setAttribute('aria-pressed', String(sibling === node));
    });
    node.setAttribute('aria-pressed', String(current === step)); group.append(node);
  }
  return group;
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
