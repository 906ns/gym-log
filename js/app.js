import * as repo from './repo.js';
import { renderSettings } from './views/settings.js';
import { renderHome } from './views/home.js';
import { renderSession } from './views/session.js';
import { showError } from './views/ui.js';
async function boot() {
  let cleanup = () => {};
  async function navigate(name, session) {
    cleanup();
    document.querySelector('#error').hidden = true;
    for (const view of document.querySelectorAll('main > section')) view.hidden = view.id !== `view-${name}`;
    const root = document.querySelector(`#view-${name}`);
    if (name === 'session') cleanup = await renderSession(root, session || await repo.currentSession(), navigate);
    else if (name === 'home') cleanup = await renderHome(root, navigate);
    else cleanup = await renderSettings(root, navigate);
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
