import { applyLiquidGlassAll } from './liquid-glass.js';
import * as repo from '../repo.js';
export async function initializeGlass() {
  await syncGlassAppearance();
  // 記録画面には処理を加えず、常設ナビゲーションだけを一度初期化する。
  applyLiquidGlassAll('[data-lg]');
}
function setGlassAppearance(enabled) {
  if (enabled) document.documentElement.removeAttribute('data-glass');
  else document.documentElement.dataset.glass = 'off';
}
export async function saveGlassAppearance(enabled) {
  await repo.saveSetting('glass_enabled', enabled);
  setGlassAppearance(enabled);
}
export async function syncGlassAppearance() {
  setGlassAppearance(await repo.setting('glass_enabled', true));
}
