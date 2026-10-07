// SVG building blocks. GitHub shows README images in a sandbox: no scripts, no external
// fonts or images. So fonts are embedded as tiny subsets and avatars as data: URIs.

import { readFileSync } from 'node:fs';

const FONT_DIR = new URL('../../fonts/', import.meta.url);
let fontData;

function fontCss(weights) {
  fontData ??= Object.fromEntries(
    ['mono-400', 'mono-700', 'rupee'].map((name) => [name, readFileSync(new URL(`${name}.woff2`, FONT_DIR)).toString('base64')]),
  );
  // JetBrains Mono has no ₹ glyph, so family R supplies it from Noto Sans Mono (same 600-unit advance).
  return [
    ...weights.map((w) => `@font-face{font-family:M;font-weight:${w};src:url(data:font/woff2;base64,${fontData[`mono-${w}`]}) format("woff2")}`),
    `@font-face{font-family:R;src:url(data:font/woff2;base64,${fontData.rupee}) format("woff2")}`,
  ].join('');
}

/** Rounds coordinates so the SVG source stays small and diff-friendly. */
export const n = (v) => Math.round(v * 100) / 100;

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Small seeded PRNG, so anything "random" is the same on every run (no diff, no commit). */
export function seeded(seedText) {
  let seed = [...seedText].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7);
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Polygon points from [x, y] pairs. */
export const pts = (...xy) => xy.map(([x, y]) => `${n(x)},${n(y)}`).join(' ');

/** Rendered width of monospace text: every glyph advances 0.6em. */
export const width = (s, size, letterSpacing = 0) => {
  const len = [...String(s)].length;
  return len * size * 0.6 + Math.max(0, len - 1) * letterSpacing;
};

export function truncate(s, max) {
  const chars = [...String(s)];
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : String(s);
}

export function svg({ w, h, title, theme, css = '', defs = '', body, weights = [400, 700] }) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">`,
    `<title>${esc(title)}</title>`,
    `<style>${fontCss(weights)}`,
    'text{font-family:M,R,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}',
    '.pulse{animation:pulse 1.6s ease-in-out infinite}@keyframes pulse{50%{opacity:.3}}',
    `@media (prefers-reduced-motion:reduce){*{animation:none!important}}${css}</style>`,
    defs && `<defs>${defs}</defs>`,
    `<g fill="${theme.text}">${body}</g>`,
    '</svg>',
  ].join('');
}

export function panel(w, h, theme) {
  return `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="12" fill="${theme.panel}" stroke="${theme.border}"/>`;
}

export function text(x, y, content, o = {}) {
  const attrs = [`x="${n(x)}"`, `y="${n(y)}"`];
  if (o.size) attrs.push(`font-size="${o.size}"`);
  if (o.weight) attrs.push(`font-weight="${o.weight}"`);
  if (o.fill) attrs.push(`fill="${o.fill}"`);
  if (o.anchor) attrs.push(`text-anchor="${o.anchor}"`);
  if (o.ls) attrs.push(`letter-spacing="${o.ls}"`);
  if (o.opacity != null) attrs.push(`opacity="${o.opacity}"`);
  if (o.cls) attrs.push(`class="${o.cls}"`);
  return `<text ${attrs.join(' ')}>${esc(content)}</text>`;
}

/** Small uppercase caption used for every label. */
export const label = (x, y, content, theme, o = {}) =>
  text(x, y, content, { size: 10, weight: 700, fill: theme.muted, ls: 1, ...o });

export const ROUND_CLIP = '<clipPath id="round" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath>';

/** A circular avatar, or a coloured initial when the image couldn't be fetched. Needs ROUND_CLIP in defs. */
export function avatar(x, y, size, uri, login, theme) {
  const r = size / 2;
  if (uri) {
    return `<image href="${uri}" x="${n(x)}" y="${n(y)}" width="${size}" height="${size}" clip-path="url(#round)" preserveAspectRatio="xMidYMid slice"/>`
      + `<circle cx="${n(x + r)}" cy="${n(y + r)}" r="${n(r - 0.5)}" fill="none" stroke="${theme.border}"/>`;
  }
  let hash = 0;
  for (const ch of login) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `<circle cx="${n(x + r)}" cy="${n(y + r)}" r="${n(r)}" fill="hsl(${hash % 360} 45% 46%)"/>`
    + text(x + r, y + r + size * 0.18, login[0].toUpperCase(), { size: n(size * 0.5), weight: 700, fill: '#ffffff', anchor: 'middle' });
}
