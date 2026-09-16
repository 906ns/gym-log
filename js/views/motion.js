export function animatePanel(node, opening, axis = 'Y') {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
  const outside = { transform: `translate${axis}(100%)` };
  const inside = { transform: `translate${axis}(0)` };
  const animation = node.animate(opening ? [outside, inside] : [inside, outside], { duration: 200, easing: 'ease-out' });
  return animation.finished.catch(error => { console.error(error); });
}
