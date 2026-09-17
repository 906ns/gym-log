// リストのスクロールを妨げないよう、上部の取っ手だけでドラッグを開始する。
export function bindSheetDrag(sheet, handle) {
  let pointer = null;
  let start = 0;
  let distance = 0;
  const reset = () => {
    pointer = null;
    sheet.classList.remove('sheet-dragging');
    sheet.style.removeProperty('transform');
  };
  handle.addEventListener('click', event => {
    if (distance > 4) { event.preventDefault(); event.stopImmediatePropagation(); }
    distance = 0;
  }, true);
  handle.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || pointer !== null) return;
    pointer = event.pointerId;
    start = event.clientY;
    distance = 0;
    handle.setPointerCapture(pointer);
    sheet.classList.add('sheet-dragging');
  });
  handle.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer) return;
    distance = Math.max(0, event.clientY - start);
    sheet.style.transform = `translateY(${distance}px)`;
  });
  handle.addEventListener('pointerup', event => {
    if (event.pointerId !== pointer) return;
    distance = Math.max(0, event.clientY - start);
    const dismiss = distance >= Math.min(120, sheet.offsetHeight * 0.25);
    const id = pointer;
    // 閉じる際も現在の位置からCSSの退場トランジションへつなぐ。
    if (dismiss) sheet.close();
    reset();
    if (handle.hasPointerCapture(id)) handle.releasePointerCapture(id);
  });
  handle.addEventListener('pointercancel', reset);
  handle.addEventListener('lostpointercapture', reset);
  sheet.addEventListener('close', reset, { once: true });
}
