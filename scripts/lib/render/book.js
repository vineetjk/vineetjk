import { svg, panel, text, label, avatar, truncate, ROUND_CLIP } from './common.js';
import { changeColor } from './theme.js';
import { rupees, signed, pct } from '../money.js';
import { fmtClock, fmtDate, fmtDay, marketClock } from '../time.js';
import { netWorth } from '../engine.js';

const W = 880;
const ROWS = 8;
const ROW_H = 27;
const TOP = 64;
const H = TOP + ROWS * ROW_H + 40;

/** Left: the top shareholders. Right: the most recent fills. */
export function book(v, theme, avatars) {
  const { cfg } = v;
  const parts = [panel(W, H, theme)];
  const L = 24;
  const R = 456;
  const mid = 440;

  parts.push(label(L, 34, 'TOP SHAREHOLDERS', theme));
  parts.push(label(mid - 24, 34, `${v.investors} INVESTOR${v.investors === 1 ? '' : 'S'}`, theme, { weight: 400, anchor: 'end', fill: theme.faint }));
  parts.push(label(R, 34, 'TRADE TAPE', theme));
  parts.push(label(W - 24, 34, 'TIMES IN IST', theme, { weight: 400, anchor: 'end', fill: theme.faint }));
  parts.push(`<line x1="${mid}" y1="20" x2="${mid}" y2="${H - 20}" stroke="${theme.border}"/>`);

  // Shareholders
  const top = v.holders.slice(0, ROWS);
  if (!top.length) {
    parts.push(text(L, TOP + 20, 'No shareholders yet.', { size: 12, fill: theme.muted }));
    parts.push(text(L, TOP + 40, 'The first buyer gets the #1 spot.', { size: 12, fill: theme.faint }));
  }
  top.forEach((h, i) => {
    const y = TOP + i * ROW_H;
    const pnl = pct(cfg.startingPaise, netWorth(h, v.price));
    parts.push(text(L, y + 13, `#${i + 1}`, { size: 11, weight: 700, fill: i === 0 ? theme.accent : theme.faint }));
    parts.push(avatar(L + 30, y, 18, avatars.users[h.login], h.login, theme));
    parts.push(text(L + 56, y + 13, `@${truncate(h.login, 17)}`, { size: 12, weight: i === 0 ? 700 : 400 }));
    parts.push(text(mid - 96, y + 13, `${h.shares} sh`, { size: 12, anchor: 'end' }));
    parts.push(text(mid - 24, y + 13, `${signed(pnl, 1)}%`, { size: 12, weight: 700, anchor: 'end', fill: changeColor(pnl, theme) }));
  });

  // Trade tape
  const today = v.sessionDate;
  const fills = v.tape.slice(0, ROWS);
  if (!fills.length) parts.push(text(R, TOP + 20, 'No trades yet.', { size: 12, fill: theme.muted }));
  fills.forEach((t, i) => {
    const y = TOP + i * ROW_H;
    const day = marketClock(new Date(t.t), cfg.market).date;
    const buy = t.side === 'buy';
    parts.push(text(R, y + 13, day === today ? fmtClock(t.t, cfg.market) : fmtDate(day), { size: 11, fill: theme.muted }));
    parts.push(text(R + 54, y + 13, buy ? 'BUY' : 'SELL', { size: 11, weight: 700, fill: buy ? theme.up : theme.down }));
    parts.push(text(R + 94, y + 13, `${t.qty} @ ${rupees(t.px)}`, { size: 12 }));
    if (t.amo) parts.push(label(R + 212, y + 12, 'AMO', theme, { weight: 400, fill: theme.faint }));
    parts.push(text(W - 24, y + 13, `@${truncate(t.login, 15)}`, { size: 12, anchor: 'end', fill: theme.muted }));
  });

  // Footer line: what happens to an order placed right now
  const note = v.open
    ? `Market open: orders fill within a minute. Max ${cfg.maxQty} shares per order.`
    : v.amo.length
      ? `${v.amo.length} order${v.amo.length > 1 ? 's' : ''} queued for the opening bell, ${fmtDay(v.nextOpen)} ${cfg.market.open} IST.`
      : `Market closed: new orders queue for the opening bell, ${fmtDay(v.nextOpen ?? v.state.listedOn)} ${cfg.market.open} IST.`;
  parts.push(`<line x1="24" y1="${H - 34}" x2="${W - 24}" y2="${H - 34}" stroke="${theme.border}"/>`);
  parts.push(text(24, H - 14, note, { size: 11, fill: theme.muted }));

  const leader = top[0] ? `Largest shareholder: @${top[0].login} with ${top[0].shares} shares.` : 'No shareholders yet.';
  const lastFill = fills[0] ? ` Last trade: ${fills[0].side} ${fills[0].qty} at ${rupees(fills[0].px)}.` : '';
  return svg({ w: W, h: H, theme, defs: ROUND_CLIP, body: parts.join(''), title: `${leader}${lastFill} ${note}` });
}
