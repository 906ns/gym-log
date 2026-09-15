export function createWakeLock() {
  let lock;
  let wanted = false;
  let requesting = false;
  async function acquire() {
    if (!wanted || lock || requesting || !('wakeLock' in navigator)) return;
    requesting = true;
    try {
      const acquired = await navigator.wakeLock.request('screen');
      if (!wanted) { await acquired.release(); return; }
      lock = acquired;
      acquired.addEventListener('release', () => { if (lock === acquired) lock = null; });
    } catch (error) {
      // 省電力などの拒否で記録を止めない。画面には出さず診断用に残す。
      console.error(error);
    } finally { requesting = false; }
  }
  async function setActive(active) {
    wanted = active;
    if (active) await acquire();
    else if (lock) {
      const previous = lock; lock = null;
      try { await previous.release(); } catch (error) { console.error(error); }
    }
  }
  return { setActive, acquire };
}
