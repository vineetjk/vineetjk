import { svg, text, width, n } from './common.js';
import { changeColor } from './theme.js';
import { rupees, signed, arrow } from '../money.js';

const W = 880;
const H = 40;
const SIZE = 13;
const BADGE = 140;
const SPEED = 42; // px per second

/** The scrolling tape across the top: quote, fundamentals, then the latest headlines. */
export function ticker(v, theme) {
  const sym = `$${v.cfg.symbol}`;
  const items = [
    [[sym, theme.accent, 700], [` ${rupees(v.price)} `, theme.text, 700], [`${arrow(v.changePct)} ${signed(v.changePct)}%`, changeColor(v.change, theme), 700]],
    [['FAIR VALUE ', theme.muted], [rupees(v.fv), theme.accent, 700]],
    [['VOL ', theme.muted], [String(v.ohlc?.v ?? 0), theme.text]],
    [['HOLDERS ', theme.muted], [String(v.holders.length), theme.text]],
    [['30D COMMITS ', theme.muted], [String(v.derived.last30), theme.text]],
    [['STREAK ', theme.muted], [`${v.derived.streak}D`, theme.text]],
    [['MERGED PRs ', theme.muted], [String(v.stats.mergedPRs), theme.text]],
    ...v.news.slice(0, 5).map((item) => [[item.text, theme.text]]),
  ];

  // Lay the items out once, repeating until they're wider than the panel so the loop never shows
  // a gap. SVG collapses edge whitespace, so spaces become x offsets instead of characters.
  const segments = [];
  let x = 0;
  const place = (s, fill, weight) => {
    const lead = s.length - s.trimStart().length;
    if (s.trim()) segments.push({ x: x + width(' '.repeat(lead), SIZE), s: s.trim(), fill, weight });
    x += width(s, SIZE);
  };
  while (x < W) {
    for (const item of items) {
      for (const [s, fill, weight] of item) place(s, fill, weight);
      place('   ·   ', theme.faint);
    }
  }
  const period = x;
  const row = (dx) => segments
    .map((seg) => text(BADGE + 16 + seg.x + dx, 25.5, seg.s, { size: SIZE, fill: seg.fill, weight: seg.weight }))
    .join('');

  const status = v.open ? 'MARKET OPEN' : 'MARKET CLOSED';
  const css = `.tape{animation:scroll ${n(period / SPEED)}s linear infinite}@keyframes scroll{to{transform:translateX(-${n(period)}px)}}`;
  const defs = [
    `<clipPath id="panel"><rect width="${W}" height="${H}" rx="10"/></clipPath>`,
    `<clipPath id="lane"><rect x="${BADGE}" width="${W - BADGE}" height="${H}"/></clipPath>`,
    `<linearGradient id="fadeL"><stop offset="0" stop-color="${theme.panel}"/><stop offset="1" stop-color="${theme.panel}" stop-opacity="0"/></linearGradient>`,
    `<linearGradient id="fadeR"><stop offset="0" stop-color="${theme.panel}" stop-opacity="0"/><stop offset="1" stop-color="${theme.panel}"/></linearGradient>`,
  ].join('');
  const body = [
    `<g clip-path="url(#panel)">`,
    `<rect width="${W}" height="${H}" fill="${theme.panel}"/>`,
    `<g clip-path="url(#lane)"><g class="tape">${row(0)}${row(period)}</g></g>`,
    `<rect x="${BADGE}" width="28" height="${H}" fill="url(#fadeL)"/>`,
    `<rect x="${W - 48}" width="48" height="${H}" fill="url(#fadeR)"/>`,
    `<rect width="${BADGE}" height="${H}" fill="${v.open ? theme.up : theme.panel2}"/>`,
    `<circle cx="18" cy="20" r="4" fill="${v.open ? theme.onAccent : theme.faint}"${v.open ? ' class="pulse"' : ''}/>`,
    text(30, 24.5, status, { size: 11, weight: 700, ls: 0.8, fill: v.open ? theme.onAccent : theme.muted }),
    `</g>`,
    `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="10" fill="none" stroke="${theme.border}"/>`,
  ].join('');

  const headline = `${sym} ${rupees(v.price)} ${signed(v.changePct)}%`;
  return svg({ w: W, h: H, theme, css, defs, body, title: `${headline}. ${status.toLowerCase()}. ${v.news[0]?.text ?? ''}` });
}
