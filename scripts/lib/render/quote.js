import { svg, panel, text, label, width, avatar, n, ROUND_CLIP } from './common.js';
import { changeColor } from './theme.js';
import { rupees, signed, arrow } from '../money.js';
import { fmtDay, fmtDate } from '../time.js';

const W = 880;
const H = 210;

/** Big price, day change, the circuit band, and the stats grid. */
export function quote(v, theme, avatars) {
  const { cfg } = v;
  const sym = `$${cfg.symbol}`;
  const color = changeColor(v.change, theme);
  const parts = [panel(W, H, theme)];

  // Identity
  parts.push(avatar(24, 22, 56, avatars.owner, cfg.login, theme));
  parts.push(text(96, 50, sym, { size: 26, weight: 700, fill: theme.accent }));
  parts.push(label(96 + width(sym, 26) + 10, 49, 'EQ', theme));
  parts.push(label(96, 72, `${cfg.displayName} · ${cfg.exchangeName}`.toUpperCase(), theme, { weight: 400 }));

  // Market status pill
  const status = v.open ? 'MARKET OPEN' : `CLOSED · OPENS ${fmtDay(v.nextOpen ?? v.state.listedOn).toUpperCase()}, ${cfg.market.open} IST`;
  const pillW = width(status, 11, 0.8) + 44;
  const pillX = W - 24 - pillW;
  const pillColor = v.open ? theme.up : theme.muted;
  parts.push(`<rect x="${n(pillX)}" y="24" width="${n(pillW)}" height="26" rx="13" fill="${pillColor}" fill-opacity=".12" stroke="${pillColor}" stroke-opacity=".45"/>`);
  parts.push(`<circle cx="${n(pillX + 17)}" cy="37" r="4" fill="${pillColor}"${v.open ? ' class="pulse"' : ''}/>`);
  parts.push(text(pillX + 29, 41, status, { size: 11, weight: 700, fill: pillColor, ls: 0.8 }));

  // Price and change
  const price = rupees(v.price);
  parts.push(text(22, 142, price, { size: 46, weight: 700 }));
  const cx = 24 + width(price, 46) + 18;
  parts.push(text(cx, 120, `${arrow(v.change)} ${signed(v.change / 100)} (${signed(v.changePct)}%)`, { size: 16, weight: 700, fill: color }));
  const when = v.open ? 'TODAY' : v.sessionDate ? `AT CLOSE · ${fmtDate(v.sessionDate).toUpperCase()}` : `LISTED ${fmtDate(v.state.listedOn).toUpperCase()}`;
  parts.push(label(cx, 140, when, theme, { weight: 400 }));

  // Circuit band: where the price sits between today's lower and upper limits
  const { lower, upper } = v.band;
  const bx0 = 24;
  const bx1 = 448;
  const by = 174;
  const pos = (p) => bx0 + ((p - lower) / Math.max(1, upper - lower)) * (bx1 - bx0);
  parts.push(`<rect x="${bx0}" y="${by - 2}" width="${bx1 - bx0}" height="4" rx="2" fill="url(#band)"/>`);
  parts.push(`<line x1="${n(pos(v.prevClose))}" y1="${by - 7}" x2="${n(pos(v.prevClose))}" y2="${by + 7}" stroke="${theme.faint}" stroke-width="1.5"/>`);
  parts.push(`<circle cx="${n(pos(v.price))}" cy="${by}" r="11" fill="${color}" opacity=".18"${v.open ? ' class="pulse"' : ''}/>`);
  parts.push(`<circle cx="${n(pos(v.price))}" cy="${by}" r="5.5" fill="${color}" stroke="${theme.panel}" stroke-width="2"/>`);
  parts.push(label(bx0, by + 24, `LOWER ${rupees(lower)}`, theme, { weight: 400 }));
  parts.push(label(bx1, by + 24, `UPPER ${rupees(upper)}`, theme, { weight: 400, anchor: 'end' }));
  parts.push(label((bx0 + bx1) / 2, by + 24, `±${Math.round(cfg.circuit * 100)}% CIRCUIT`, theme, { weight: 400, anchor: 'middle', fill: theme.faint }));

  // Stats grid
  const o = v.ohlc;
  const cells = [
    ['OPEN', o ? rupees(o.o) : '–'],
    ['HIGH', o ? rupees(o.h) : '–'],
    ['LOW', o ? rupees(o.l) : '–'],
    ['PREV CLOSE', rupees(v.prevClose)],
    ['VOLUME', String(o?.v ?? 0)],
    ['FAIR VALUE', rupees(v.fv), theme.accent],
    ['52W HIGH', rupees(v.hi52)],
    ['52W LOW', rupees(v.lo52)],
    ['HOLDERS', `${v.holders.length}`],
  ];
  const gx = 500;
  const colW = (W - 24 - gx) / 3;
  parts.push(`<line x1="476" y1="96" x2="476" y2="190" stroke="${theme.border}"/>`);
  cells.forEach(([name, value, fill], i) => {
    const x = gx + (i % 3) * colW;
    const y = 104 + Math.floor(i / 3) * 37;
    parts.push(label(x, y, name, theme, { weight: 400 }));
    parts.push(text(x, y + 18, value, { size: 14, weight: 700, fill }));
  });

  const defs = ROUND_CLIP
    + `<linearGradient id="band"><stop offset="0" stop-color="${theme.down}" stop-opacity=".85"/>`
    + `<stop offset=".5" stop-color="${theme.faint}" stop-opacity=".5"/><stop offset="1" stop-color="${theme.up}" stop-opacity=".85"/></linearGradient>`;
  const title = `${sym} at ${price}, ${signed(v.changePct)}% ${v.open ? 'today, market open' : 'at last close, market closed'}. Fair value from commits: ${rupees(v.fv)}. Circuit band ${rupees(lower)} to ${rupees(upper)}.`;
  return svg({ w: W, h: H, theme, defs, body: parts.join(''), title });
}
