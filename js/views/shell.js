import { button, element } from './ui.js';
import { icon } from './graphics.js';
export function createShell(navigate) {
  const header = document.querySelector('#app-header');
  const tabs = document.querySelector('#tab-bar');
  const titles = { home: 'ホーム', history: '履歴', settings: '設定', session: '記録' };
  for (const name of ['home', 'history', 'settings']) {
    const tab = button('', () => navigate(name), 'tab-button');
    tab.dataset.tab = name; tab.append(icon(name), element('span', titles[name]));
    tabs.append(tab);
  }
  return {
    select(name) {
      header.replaceChildren(element('h1', titles[name]));
      for (const tab of tabs.children) {
        tab.classList.toggle('lg-inner-fill', tab.dataset.tab === name);
        if (tab.dataset.tab === name) tab.setAttribute('aria-current', 'page');
        else tab.removeAttribute('aria-current');
      }
    }
  };
}
