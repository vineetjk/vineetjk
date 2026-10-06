// Turns engine outcomes into the comment the bot leaves on each order issue.

import { rupees, signed, pct, arrow } from './money.js';
import { fmtDay } from './time.js';

const FOOTER = '<sub>Play money only. Not a real security, not investment advice.</sub>';

export function toReceipt(o, cfg) {
  const sym = `$${cfg.symbol}`;
  const order = `${o.side?.toUpperCase()} ${o.qty} ${sym}`;
  const market = `https://github.com/${cfg.login}`;

  if (o.status === 'queued') {
    return {
      issue: o.issue,
      close: false,
      body: [
        `### 🕘 Queued · ${order}`,
        '',
        `The market is closed, so this is an after-market order. It fills at the opening bell on **${fmtDay(o.opensOn)}, ${cfg.market.open} IST** at whatever the price is then.`,
        '',
        'Changed your mind? Close this issue to cancel.',
        '',
        FOOTER,
      ].join('\n'),
    };
  }
  if (o.status === 'cancelled') {
    return { issue: o.issue, close: false, body: `### 🚫 Cancelled · ${order}\n\nYou closed the issue, so the order was pulled before the opening bell.\n\n${FOOTER}` };
  }
  if (o.status === 'rejected') {
    return {
      issue: o.issue,
      close: true,
      reason: 'not_planned',
      body: `### ❌ Rejected${o.side ? ` · ${order}` : ''}\n\n${o.reason}\n\n[Back to the market →](${market})\n\n${FOOTER}`,
    };
  }

  const p = o.position;
  const partial = o.status === 'partial';
  const avg = p.shares ? rupees(Math.round(p.cost / p.shares)) : '–';
  const pnl = pct(cfg.startingPaise, p.worth);
  return {
    issue: o.issue,
    close: true,
    reason: 'completed',
    body: [
      `### ${partial ? '⚠️ Partially filled' : '✅ Filled'} · ${o.side.toUpperCase()} ${o.filled} ${sym} @ ${rupees(o.px)}`,
      '',
      partial ? `Only ${o.filled} of ${o.qty} shares went through: ${o.side === 'buy' ? 'that was all your cash could cover' : 'that was all you held'}.\n` : '',
      o.amo ? `Filled at the opening bell as an after-market order.\n` : '',
      '| | |',
      '|:--|--:|',
      `| Fill price (after your own impact) | ${rupees(o.px)} |`,
      `| Order value | ${rupees(o.value)} |`,
      `| Your trade moved the price | ${arrow(o.move)} ${signed(o.move)}% |`,
      `| **Your position** | **${p.shares} shares, avg ${avg}** |`,
      `| Cash | ${rupees(p.cash)} |`,
      `| Portfolio value | ${rupees(p.worth)} (${signed(pnl)}%) |`,
      '',
      `You're **#${p.rank}** of ${p.investors} investor${p.investors === 1 ? '' : 's'} by portfolio value. [Back to the market →](${market})`,
      '',
      FOOTER,
    ].filter((line, i, all) => line !== '' || all[i - 1] !== '').join('\n'),
  };
}
