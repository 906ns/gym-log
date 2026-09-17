/* =====================================================================
   liquid-glass-ui / liquid-glass.js
   Chromium 系ブラウザでのみ、SVG 変位マップによる屈折を .lg 要素に上乗せする。
   それ以外のブラウザでは何もしない（glass.css のすりガラスがそのまま出る）。

   使い方:
     import { createLiquidGlass, applyLiquidGlassAll } from './liquid-glass.js';
     const glass = createLiquidGlass(document.querySelector('.my-header'));
     glass.destroy();                 // 要素を消すとき
     applyLiquidGlassAll('[data-lg]'); // まとめて適用

   仕組み:
     - 要素の角丸矩形に合わせて、縁の帯（bezel）だけ内側へずらす変位マップを canvas で作る
     - ずらす向きは常に「内側」なので、要素の外を参照して透明になる問題が起きない
     - backdrop-filter: url(#filter) で背景に適用する（Chromium 専用機能）
   ===================================================================== */

const SVG_NS = 'http://www.w3.org/2000/svg';
let defsRoot = null;
let uid = 0;

/** Chromium 系か（backdrop-filter: url() が効くのは Chromium のみ）。
 *  navigator.userAgentData は Chromium 系だけが実装している。
 *  iOS 上の Chrome は WebKit なので userAgentData が無く、false になる。 */
export function supportsRefraction() {
  const brands = navigator.userAgentData?.brands;
  if (Array.isArray(brands)) return brands.some((b) => b.brand === 'Chromium');
  // userAgentData は HTTPS/localhost でしか使えないため、LAN の http:// 等では UA 文字列で判定
  // （iOS の Chrome/Edge/Firefox は CriOS/EdgiOS/FxiOS で、中身は WebKit なので除外）
  const ua = navigator.userAgent;
  return /\b(Chrome|Chromium)\/\d+/.test(ua) && !/\b(CriOS|EdgiOS|FxiOS)\b/.test(ua);
}

/** 屈折を止めるべき状態か（OS 設定またはアプリ内切替） */
export function glassDisabled() {
  if (document.documentElement.dataset.glass === 'off') return true;
  return (
    matchMedia('(prefers-reduced-transparency: reduce)').matches ||
    matchMedia('(prefers-contrast: more)').matches
  );
}

function ensureDefs() {
  if (defsRoot?.isConnected) return defsRoot;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  defsRoot = document.createElementNS(SVG_NS, 'defs');
  svg.appendChild(defsRoot);
  document.body.appendChild(svg);
  return defsRoot;
}

/** 角丸矩形の符号付き距離と外向き法線（中心原点、半サイズ hw/hh、角丸 r） */
function roundedRectField(px, py, hw, hh, r) {
  const ax = Math.abs(px);
  const ay = Math.abs(py);
  const qx = ax - hw + r;
  const qy = ay - hh + r;
  let dist;
  let nx;
  let ny;
  if (qx > 0 && qy > 0) {
    // 角の円弧部分
    const len = Math.hypot(qx, qy);
    dist = len - r;
    nx = qx / len;
    ny = qy / len;
  } else if (qx > qy) {
    dist = qx - r; // 左右の辺
    nx = 1;
    ny = 0;
  } else {
    dist = qy - r; // 上下の辺
    nx = 0;
    ny = 1;
  }
  return { dist, nx: nx * Math.sign(px || 1), ny: ny * Math.sign(py || 1) };
}

/** 変位マップ（PNG の data URL）を作る。R=横ずれ, G=縦ずれ, 128 が「ずらさない」 */
function buildMap(w, h, radius, bezel) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  const data = img.data;
  const hw = w / 2;
  const hh = h / 2;
  const r = Math.min(radius, hw, hh);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const { dist, nx, ny } = roundedRectField(x + 0.5 - hw, y + 0.5 - hh, hw, hh, r);
      const depth = -dist; // 縁からの内側距離
      let dx = 0;
      let dy = 0;
      if (depth >= 0 && depth < bezel) {
        // 凸レンズ状: 縁ほど強く内側を参照する（円弧プロファイル）
        const t = 1 - depth / bezel;
        const k = 1 - Math.sqrt(1 - t * t);
        dx = -nx * k;
        dy = -ny * k;
      }
      data[i] = Math.round(127.5 + dx * 127.5);
      data[i + 1] = Math.round(127.5 + dy * 127.5);
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * @param {HTMLElement} el  .lg クラスを持つ要素
 * @param {object} [opts]
 * @param {number} [opts.strength=40]  屈折の強さ(px)。縁で最大 strength/2 px 内側を参照
 * @param {number} [opts.bezel]        屈折させる縁の幅(px)。省略時は短辺の 30%（最大 28px）
 * @param {number} [opts.maxArea=400000] これより大きい要素は重いので屈折しない
 */
export function createLiquidGlass(el, opts = {}) {
  const noop = { destroy() {}, refresh() {}, active: false };
  if (!el || !supportsRefraction()) return noop;

  const strength = opts.strength ?? 40;
  const maxArea = opts.maxArea ?? 400000;
  const id = `lg-filter-${++uid}`;
  const defs = ensureDefs();

  const filter = document.createElementNS(SVG_NS, 'filter');
  filter.setAttribute('id', id);
  filter.setAttribute('filterUnits', 'userSpaceOnUse');
  filter.setAttribute('primitiveUnits', 'userSpaceOnUse');
  filter.setAttribute('color-interpolation-filters', 'sRGB');
  filter.setAttribute('x', '0');
  filter.setAttribute('y', '0');

  const feImage = document.createElementNS(SVG_NS, 'feImage');
  feImage.setAttribute('x', '0');
  feImage.setAttribute('y', '0');
  feImage.setAttribute('preserveAspectRatio', 'none');
  feImage.setAttribute('result', 'map');

  const feDisp = document.createElementNS(SVG_NS, 'feDisplacementMap');
  feDisp.setAttribute('in', 'SourceGraphic');
  feDisp.setAttribute('in2', 'map');
  feDisp.setAttribute('scale', String(strength));
  feDisp.setAttribute('xChannelSelector', 'R');
  feDisp.setAttribute('yChannelSelector', 'G');

  filter.append(feImage, feDisp);
  defs.appendChild(filter);

  let lastKey = '';
  let raf = 0;

  function disable() {
    el.classList.remove('lg--refract');
    el.style.removeProperty('--lg-refract-filter');
    lastKey = '';
  }

  function refresh() {
    raf = 0;
    if (glassDisabled()) return disable();
    const w = Math.round(el.offsetWidth);
    const h = Math.round(el.offsetHeight);
    if (w < 8 || h < 8 || w * h > maxArea) return disable();

    const cs = getComputedStyle(el);
    const radius = parseFloat(cs.borderTopLeftRadius) || 0;
    const bezel = opts.bezel ?? Math.min(28, Math.min(w, h) * 0.3);
    const key = `${w}x${h}r${radius}b${bezel}`;
    if (key === lastKey) return;
    lastKey = key;

    filter.setAttribute('width', String(w));
    filter.setAttribute('height', String(h));
    feImage.setAttribute('width', String(w));
    feImage.setAttribute('height', String(h));
    feImage.setAttribute('href', buildMap(w, h, radius, bezel));

    el.style.setProperty(
      '--lg-refract-filter',
      `blur(0.5px) url(#${id}) blur(var(--lg-blur-refract, 3px)) saturate(var(--lg-saturate, 1.7))`
    );
    el.classList.add('lg--refract');
  }

  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(refresh);
  };

  const ro = new ResizeObserver(schedule);
  ro.observe(el);

  const queries = [
    matchMedia('(prefers-reduced-transparency: reduce)'),
    matchMedia('(prefers-contrast: more)'),
  ];
  const onPref = () => {
    lastKey = '';
    schedule();
  };
  queries.forEach((q) => q.addEventListener('change', onPref));

  const mo = new MutationObserver(onPref); // data-glass の切替を監視
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-glass'] });

  refresh();

  return {
    get active() {
      return el.classList.contains('lg--refract');
    },
    refresh: onPref,
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      queries.forEach((q) => q.removeEventListener('change', onPref));
      disable();
      filter.remove();
    },
  };
}

/** セレクタに一致する要素すべてに適用し、まとめて破棄できる関数を返す */
export function applyLiquidGlassAll(selector, opts) {
  const list = [...document.querySelectorAll(selector)].map((el) => createLiquidGlass(el, opts));
  return () => list.forEach((g) => g.destroy());
}
