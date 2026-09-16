import { createMinibar } from './views/minibar.js';
import { renderHistory } from './views/history.js';
import { createShell } from './views/shell.js';
import { stopRepeating } from './views/pointer.js';
import { createWakeLock } from './lib/wakelock.js';
import * as repo from './repo.js';
import { renderSettings } from './views/settings.js';
import { renderHome } from './views/home.js';
import { renderSession } from './views/session.js';
import { showError } from './views/ui.js';
async function boot() {
  let cleanup = () => {};
  let selectedTab = 'home';
  let persistenceRequested = false;
  const wake = createWakeLock();
  const shell = createShell(navigate);
  const updateMinibar = createMinibar(navigate);
  repo.setWriteListener(() => {
    if (persistenceRequested) return;
    persistenceRequested = true;
    // 初回のユーザー操作による保存成功直後に要求する。拒否されても記録は残る。
    const request = navigator.storage?.persist?.();
    Promise.resolve(request || false).then(granted => repo.saveSetting('persist_granted', granted, false)).catch(console.error);
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') wake.acquire(); });
  async function navigate(name, session) {
    if (name === 'close-session') name = selectedTab;
    if (name !== 'session') selectedTab = name;
    cleanup(); stopRepeating();
    await wake.setActive(name === 'session');
    document.querySelector('#error').hidden = true;
    document.querySelector('#session-error').hidden = true;
    document.querySelector('#session-overlay').hidden = name !== 'session';
    document.querySelector('#app-shell').inert = name === 'session';
    for (const view of document.querySelectorAll('[id^="view-"]')) view.hidden = view.id !== `view-${name}`;
    if (name !== 'session') shell.select(name);
    const root = document.querySelector(`#view-${name}`);
    if (name === 'session') cleanup = await renderSession(root, session || await repo.currentSession(), navigate);
    else if (name === 'home') cleanup = await renderHome(root, navigate);
    else if (name === 'settings') cleanup = await renderSettings(root, navigate);
    else cleanup = await renderHistory(root, navigate);
    await updateMinibar(name);
  }
  try {
    await repo.initialize();
    const session = await repo.currentSession();
    await navigate(session ? 'session' : 'home', session);
  } catch (error) {
    showError(new Error(`データを保存できません。プライベートブラウズを使っている場合は通常モードで開いてください。${error.message}`));
  }
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.error);
boot();
