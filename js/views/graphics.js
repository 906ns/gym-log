import { sparkline } from '../lib/insights.js';
const NS = 'http://www.w3.org/2000/svg';
function svgElement(name, attributes) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}
export function icon(name) {
  const paths = {
    home: 'M3 11L12 3L21 11M5 10V21H10V15H14V21H19V10',
    note: 'M4 20L5 15L16 4L20 8L9 19Z M14 6L18 10',
    check: 'M5 12L10 17L20 6',
    close: 'M6 6L18 18M18 6L6 18',
    settings: 'M4 6H20M4 12H20M4 18H20M8 3V9M16 9V15M10 15V21',
    chevron: 'M6 9L12 15L18 9'
  };
  const svg = svgElement('svg', { viewBox: '0 0 24 24', width: 24, height: 24, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false', class: 'icon' });
  svg.append(svgElement('path', { d: paths[name] || paths.check }));
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
