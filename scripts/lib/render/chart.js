import { svg, panel, text, label, width, n } from './common.js';
import { changeColor } from './theme.js';
import { plain } from '../money.js';
import { fmtDate, monthName } from '../time.js';

const W = 880;
const H = 318;
const X0 = 24;
const X1 = W - 74;
const Y0 = 62;
const Y1 = 236;
const VY0 = 250;
const VY1 = 286;

/** Picks a round grid step (1, 2 or 5 × 10ⁿ) that gives about `target` lines. */
function niceStep(range, target = 4) {
  const raw = range / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const f = raw / mag;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
}

/** Daily candles with the fair-value line, the backtested pre-listing stretch, and volume. */
export function chart(v, theme) {
  const { cfg } = v;
  const candles = [...v.candles.slice(-(cfg.chartSessions - (v.live ? 1 : 0))), ...(v.live ? [v.live] : [])];
  const count = candles.length;
  const slot = (X1 - X0) / Math.max(count, 24);
  const bodyW = Math.max(2, Math.min(12, slot * 0.62));
  const cx = (i) => X0 + slot * (i + 0.5);

  const values = candles.flatMap((k) => [k.h, k.l, k.fv ?? k.l]).concat(v.price);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = Math.max((hi - lo) * 0.08, cfg.tickPaise * 10);
  const yMin = lo - pad;
  const yMax = hi + pad;
  const y = (p) => Y1 - ((p - yMin) / (yMax - yMin)) * (Y1 - Y0);

  const parts = [panel(W, H, theme)];
  parts.push(text(24, 34, `$${cfg.symbol}`, { size: 14, weight: 700, fill: theme.accent }));
  parts.push(label(24 + width(`$${cfg.symbol}`, 14) + 10, 33, `DAILY · LAST ${count} SESSIONS`, theme, { weight: 400 }));

  // Legend, right-aligned
  const legend = [
    ['FAIR VALUE (FROM COMMITS)', `<line x1="0" y1="-3.5" x2="18" y2="-3.5" stroke="${theme.accent}" stroke-width="2" stroke-dasharray="4 3"/>`],
    ['BACKTEST', `<rect x="4" y="-9" width="10" height="11" rx="2" fill="${theme.faint}" opacity=".5"/>`],
  ];
  let lx = W - 24;
  for (const [name, swatch] of legend) {
    lx -= width(name, 10, 1);
    parts.push(label(lx, 33, name, theme, { weight: 400 }));
    lx -= 24;
    parts.push(`<g transform="translate(${n(lx)} 33)">${swatch}</g>`);
    lx -= 18;
  }

  // Grid and right-hand price axis
  const step = niceStep(yMax - yMin);
  for (let p = Math.ceil(yMin / step) * step; p <= yMax; p += step) {
    parts.push(`<line x1="${X0}" y1="${n(y(p))}" x2="${X1}" y2="${n(y(p))}" stroke="${theme.grid}"/>`);
    parts.push(text(X1 + 10, y(p) + 3.5, plain(p), { size: 10, fill: theme.muted }));
  }

  // Backtested stretch before the listing
  const lastPre = candles.findLastIndex((k) => k.pre);
  if (lastPre >= 0) {
    const edge = cx(lastPre) + slot / 2;
    parts.push(`<rect x="${X0}" y="${Y0 - 8}" width="${n(edge - X0)}" height="${Y1 - Y0 + 8}" fill="${theme.faint}" opacity=".07"/>`);
    parts.push(label(X0 + 8, Y0 + 6, 'BACKTESTED FROM COMMITS', theme, { weight: 400, fill: theme.faint }));
    if (lastPre < count - 1) {
      parts.push(`<line x1="${n(edge)}" y1="${Y0 - 8}" x2="${n(edge)}" y2="${Y1}" stroke="${theme.accent}" stroke-dasharray="3 3" opacity=".7"/>`);
      const listed = `LISTED ${fmtDate(v.state.listedOn).toUpperCase()}`;
      const anchorEnd = edge + width(listed, 10, 1) + 8 > X1;
      parts.push(label(anchorEnd ? edge - 6 : edge + 6, Y0 + 6, listed, theme, { weight: 400, fill: theme.accent, anchor: anchorEnd ? 'end' : 'start' }));
    }
  }

  // Fair value line
  const fvPoints = candles.map((k, i) => (k.fv ? `${n(cx(i))},${n(y(k.fv))}` : null)).filter(Boolean);
  if (fvPoints.length > 1) {
    parts.push(`<polyline points="${fvPoints.join(' ')}" fill="none" stroke="${theme.accent}" stroke-width="1.6" stroke-dasharray="4 3" opacity=".9"/>`);
  }

  // Candles
  candles.forEach((k, i) => {
    const color = changeColor(k.c - k.o, theme);
    const top = y(Math.max(k.o, k.c));
    const h = Math.max(1.5, Math.abs(y(k.o) - y(k.c)));
    const attrs = k.live ? ' class="pulse"' : k.pre ? ' opacity=".55"' : '';
    parts.push(`<g${attrs}><line x1="${n(cx(i))}" y1="${n(y(k.h))}" x2="${n(cx(i))}" y2="${n(y(k.l))}" stroke="${color}" stroke-width="1.2"/>`
      + `<rect x="${n(cx(i) - bodyW / 2)}" y="${n(top)}" width="${n(bodyW)}" height="${n(h)}" rx="1" fill="${color}"/></g>`);
  });

  // Last price marker on the axis
  const lastColor = changeColor(v.change, theme);
  const tag = plain(v.price);
  const tagW = width(tag, 10) + 12;
  parts.push(`<line x1="${X0}" y1="${n(y(v.price))}" x2="${X1}" y2="${n(y(v.price))}" stroke="${lastColor}" stroke-dasharray="2 3" opacity=".8"/>`);
  parts.push(`<rect x="${X1 + 4}" y="${n(y(v.price) - 9)}" width="${n(tagW)}" height="18" rx="4" fill="${lastColor}"/>`);
  parts.push(text(X1 + 10, y(v.price) + 3.5, tag, { size: 10, weight: 700, fill: theme.onAccent }));

  // Volume
  const maxVol = Math.max(0, ...candles.map((k) => k.v));
  parts.push(label(X0, VY0 - 2, 'VOLUME', theme, { weight: 400, fill: theme.faint }));
  if (maxVol > 0) {
    candles.forEach((k, i) => {
      if (!k.v) return;
      const h = Math.max(2, (k.v / maxVol) * (VY1 - VY0 - 8));
      parts.push(`<rect x="${n(cx(i) - bodyW / 2)}" y="${n(VY1 - h)}" width="${n(bodyW)}" height="${n(h)}" rx="1" fill="${changeColor(k.c - k.o, theme)}" opacity=".5"/>`);
    });
  } else {
    parts.push(text((X0 + X1) / 2, (VY0 + VY1) / 2 + 6, 'No trades yet. Be the first: hit BUY below.', { size: 11, fill: theme.faint, anchor: 'middle' }));
  }
  parts.push(`<line x1="${X0}" y1="${VY1}" x2="${X1}" y2="${VY1}" stroke="${theme.grid}"/>`);

  // Month labels
  candles.forEach((k, i) => {
    if (i > 0 && k.d.slice(0, 7) === candles[i - 1].d.slice(0, 7)) return;
    if (i === 0 && count > 1 && candles[1].d.slice(0, 7) !== k.d.slice(0, 7)) return;
    parts.push(text(cx(i), H - 14, monthName(k.d).toUpperCase(), { size: 10, fill: theme.muted, ls: 1 }));
  });

  // A soft light sweeps across the plot now and then. Nothing is ever hidden: renderers that
  // rasterise the first frame (or skip animation) still get the complete chart.
  // It starts just outside the clipped plot, so its first frame is invisible too.
  const sweepW = 90;
  parts.push(`<g clip-path="url(#plot)"><rect class="sweep" x="${X0 - sweepW}" y="${Y0 - 8}" width="${sweepW}" height="${VY1 - Y0 + 8}" fill="url(#sweep)"/></g>`);
  const defs = `<clipPath id="plot"><rect x="${X0}" y="${Y0 - 8}" width="${X1 - X0}" height="${VY1 - Y0 + 8}"/></clipPath>`
    + `<linearGradient id="sweep"><stop offset="0" stop-color="${theme.accent}" stop-opacity="0"/>`
    + `<stop offset=".85" stop-color="${theme.accent}" stop-opacity=".10"/><stop offset="1" stop-color="${theme.accent}" stop-opacity="0"/></linearGradient>`;
  const travel = X1 - X0 + sweepW;
  const css = `.sweep{opacity:0;animation:sweep 7s cubic-bezier(.45,0,.25,1) .4s infinite}`
    + `@keyframes sweep{0%{opacity:1;transform:translateX(0)}30%{opacity:1;transform:translateX(${travel}px)}30.01%,100%{opacity:0;transform:translateX(${travel}px)}}`;

  const first = candles[0];
  const title = `Daily candlestick chart of $${cfg.symbol} over ${count} sessions from ${first ? fmtDate(first.d) : ''}, with the fair value implied by commit activity. Last price ${plain(v.price)}.`;
  return svg({ w: W, h: H, theme, css, defs, body: parts.join(''), title });
}
