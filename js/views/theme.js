import * as repo from '../repo.js';
const appearance = matchMedia('(prefers-color-scheme: dark)');
let mode = 'system';
function apply() {
  const root = document.documentElement;
  root.classList.add('theme-changing');
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
  // キャッシュへのアクセスはheadの同期スクリプト一箇所に限定する。
  document.dispatchEvent(new CustomEvent('theme-cache', { detail: mode }));
  document.querySelector('#theme-color').content = getComputedStyle(root).getPropertyValue('--bg').trim();
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-changing')));
}
function selectMode(value) {
  mode = ['system', 'dark', 'light'].includes(value) ? value : 'system';
  appearance.removeEventListener('change', apply);
  if (mode === 'system') appearance.addEventListener('change', apply);
  apply();
}
export async function syncTheme() { selectMode(await repo.setting('theme', 'system')); }
export const themeMode = () => mode;
export async function setTheme(value) {
  await repo.saveSetting('theme', value);
  selectMode(value);
}
