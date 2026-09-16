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
  let persistenceRequested = false;
  const wake = createWakeLock();
  const shell = createShell(navigate);
  repo.setWriteListener(() => {
    if (persistenceRequested) return;
    persistenceRequested = true;
    // 初回のユーザー操作による保存成功直後に要求する。拒否されても記録は残る。
    const request = navigator.storage?.persist?.();
    Promise.resolve(request || false).then(granted => repo.saveSetting('persist_granted', granted, false)).catch(console.error);
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') wake.acquire(); });
  async function navigate(name, session) {
    cleanup(); stopRepeating();
    await wake.setActive(name === 'session');
    document.querySelector('#error').hidden = true;
    for (const view of document.querySelectorAll('main > section')) view.hidden = view.id !== `view-${name}`;
    shell.select(name);
    const root = document.querySelector(`#view-${name}`);
    if (name === 'session') cleanup = await renderSession(root, session || await repo.currentSession(), navigate);
    else if (name === 'home') cleanup = await renderHome(root, navigate);
    else if (name === 'settings') cleanup = await renderSettings(root, navigate);
    else { root.replaceChildren(); cleanup = () => {}; }
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
