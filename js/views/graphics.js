import { sparkline } from '../lib/insights.js';
const NS = 'http://www.w3.org/2000/svg';
function svgElement(name, attributes) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}
export function icon(name) {
  const svg = svgElement('svg', { viewBox: '0 0 24 24', width: 24, height: 24, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false', class: 'icon' });
  svg.append(svgElement('use', { href: `#icon-${name}` }));
  return svg;
}
export function chart(values, label) {
  const data = sparkline(values);
  const svg = svgElement('svg', { viewBox: '0 0 280 56', role: 'img', 'aria-label': label, class: 'sparkline' });
  const title = svgElement('title', {}); title.textContent = label; svg.append(title);
  if (data.path) {
    svg.append(svgElement('path', { d: data.path, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }));
    const last = data.points.at(-1); svg.append(svgElement('circle', { cx: last.x, cy: last.y, r: 2.5, fill: 'currentColor' }));
  }
  return svg;
}
