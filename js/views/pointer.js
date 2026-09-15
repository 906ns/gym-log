import { repeatDelay } from '../lib/input.js';
const active = new Set();
export function stopRepeating() { for (const stop of [...active]) stop(); }
window.addEventListener('blur', stopRepeating);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopRepeating(); });
export function bindRepeat(node, action) {
  let pointerId = null;
  let timer;
  let started;
  const stop = () => {
    clearTimeout(timer);
    const id = pointerId; pointerId = null;
    active.delete(stop);
    if (id !== null && node.hasPointerCapture(id)) node.releasePointerCapture(id);
  };
  const step = () => {
    if (!node.isConnected || node.disabled) { stop(); return false; }
    try { if (!action()) { stop(); return false; } }
    catch (error) { console.error(error); stop(); return false; }
    return true;
  };
  const repeat = () => {
    if (pointerId === null || !step()) return;
    timer = setTimeout(repeat, repeatDelay(performance.now() - started));
  };
  node.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || pointerId !== null) return;
    event.preventDefault(); stopRepeating();
    pointerId = event.pointerId; started = performance.now(); active.add(stop);
    node.setPointerCapture(pointerId);
    if (step()) timer = setTimeout(repeat, 400);
  });
  for (const name of ['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture']) {
    node.addEventListener(name, event => { if (event.pointerId === pointerId) stop(); });
  }
  node.addEventListener('pointermove', event => {
    if (event.pointerId !== pointerId) return;
    // capture中はpointerleaveが来ないため指の座標も確認する。
    const rect = node.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) stop();
  });
  node.addEventListener('click', event => { if (event.detail === 0) step(); });
  node.addEventListener('contextmenu', event => event.preventDefault());
  return stop;
}
