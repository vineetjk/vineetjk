import { svg, text, width, n } from './common.js';

export const BUTTONS = [
  { id: 'buy-5', side: 'buy', qty: 5 },
  { id: 'buy-25', side: 'buy', qty: 25 },
  { id: 'sell-5', side: 'sell', qty: 5 },
  { id: 'sell-25', side: 'sell', qty: 25 },
];

const W = 200;
const H = 48;

/** One clickable order button (each is its own image, since only whole images can be links). */
export function button({ side, qty }, theme, cfg) {
  const buy = side === 'buy';
  const color = buy ? theme.up : theme.down;
  const caption = `${buy ? '▲ BUY' : '▼ SELL'} ${qty}`;
  const body = [
    `<clipPath id="pill"><rect width="${W}" height="${H}" rx="${H / 2}"/></clipPath>`,
    `<g clip-path="url(#pill)">`,
    `<rect width="${W}" height="${H}" fill="${color}"/>`,
    `<rect class="shine" x="-60" width="40" height="${H}" fill="#ffffff" opacity=".22" transform="skewX(-20)"/>`,
    `</g>`,
    text(W / 2, H / 2 + 6, caption, { size: 17, weight: 700, fill: '#ffffff', anchor: 'middle', ls: 1 }),
  ].join('');
  // Each button sweeps at a slightly different moment so the row doesn't flash in unison.
  const delay = n(BUTTONS.findIndex((b) => b.side === side && b.qty === qty) * 0.35);
  const css = `.shine{animation:shine 3.2s ease-in-out ${delay}s infinite}@keyframes shine{0%,55%{transform:skewX(-20deg) translateX(0)}100%{transform:skewX(-20deg) translateX(${W + 140}px)}}`;
  return svg({ w: W, h: H, theme, css, body, weights: [700], title: `${buy ? 'Buy' : 'Sell'} ${qty} shares of $${cfg.symbol}` });
}

/** Buy Me a Coffee link in its brand yellow, with a hand-drawn cup (no emoji glyphs in the font). */
export function coffeeButton(theme) {
  const caption = 'BUY ME A COFFEE';
  const h = 44;
  const textX = 52;
  const w = Math.ceil(textX + width(caption, 14, 0.5) + 24);
  const ink = '#0d0d0d';
  const cup = [
    `<g transform="translate(20 11)" fill="none" stroke="${ink}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">`,
    `<path class="steam" d="M6 5c-1.2-1.2 1.2-2.2 0-3.6M10 5c-1.2-1.2 1.2-2.2 0-3.6"/>`,
    `<path d="M2 8h12v5.5a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5z" fill="${ink}"/>`,
    `<path d="M14 10h1.6a2.4 2.4 0 0 1 0 4.8H14"/>`,
    `</g>`,
  ].join('');
  const body = `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="${h / 2}" fill="#ffdd00" stroke="${theme.border}"/>`
    + cup
    + text(textX, h / 2 + 5, caption, { size: 14, weight: 700, fill: ink, ls: 0.5 });
  const css = '.steam{animation:steam 2.4s ease-in-out infinite}@keyframes steam{50%{opacity:.25;transform:translateY(-1.5px)}}';
  return svg({ w, h, theme, css, body, weights: [700], title: 'Buy me a coffee' });
}
