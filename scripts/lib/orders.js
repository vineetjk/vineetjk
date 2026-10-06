// Orders arrive as GitHub issues titled like "BUY 5 $VJK". The title is untrusted input:
// it is only ever matched against these regexes and never echoed into Markdown or a shell.

const ORDER = /\b(buy|sell)\s+(\d{1,6})\b/i;

export const isOrderTitle = (title, cfg) => new RegExp(`\\$?${cfg.symbol}\\b`, 'i').test(title ?? '');

export function parseOrder(issue, cfg) {
  const order = {
    issue: issue.number,
    login: issue.user.login,
    userId: issue.user.id,
    avatar: issue.user.avatar_url ?? null,
    isBot: issue.user.type === 'Bot',
  };
  const match = ORDER.exec(issue.title ?? '');
  if (!match) {
    return { ...order, error: `I couldn't read that order. Use a title like \`BUY 5 $${cfg.symbol}\` or \`SELL 10 $${cfg.symbol}\`.` };
  }
  const side = match[1].toLowerCase();
  const qty = Number(match[2]);
  if (qty < 1 || qty > cfg.maxQty) {
    return { ...order, side, qty, error: `Orders must be between 1 and ${cfg.maxQty} shares.` };
  }
  return { ...order, side, qty };
}

/** Pre-filled "new issue" link behind each BUY/SELL button. */
export function orderUrl(cfg, side, qty) {
  const title = `${side.toUpperCase()} ${qty} $${cfg.symbol}`;
  const body = [
    `Hit **Create** and the ${cfg.exchangeName} bot fills this order in about a minute.`,
    '',
    `- Change the number in the title to trade anywhere from 1 to ${cfg.maxQty} shares.`,
    `- Outside market hours (${cfg.market.open}–${cfg.market.close} IST, Mon–Fri) the order waits for the next opening bell. Close this issue to cancel it.`,
    `- You start with ₹${cfg.startingCash.toLocaleString('en-IN')} of play money. Nothing here is real.`,
  ].join('\n');
  return `https://github.com/${cfg.repo}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}
