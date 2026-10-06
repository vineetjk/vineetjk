// The whole market as a pure state machine: (state, stats, config, now) in, mutated state and
// order outcomes out. No network, no clock reads, so every rule here is unit-testable.

import { marketClock, isMarketOpen, isTradingDay, addDays, nextOpenDate } from './time.js';
import { snap, rupees, pct, signed, arrow } from './money.js';

export const STATE_VERSION = 1;
const MAX_TAPE = 40;
const MAX_NEWS = 12;
const MAX_PROCESSED = 2000;

/** Sum of contributions in the `days`-day window ending on `date` (inclusive). */
export function windowSum(calendar, date, days = 30) {
  const from = addDays(date, -(days - 1));
  let sum = 0;
  for (const { d, c } of calendar) if (d >= from && d <= date) sum += c;
  return sum;
}

/**
 * Fair value in paise. At the 30-day baseline it equals the listing price; it grows with the
 * square root of activity so one huge day can't dwarf a steady month, and a dead month halves it.
 */
export function fairValue(contrib30, cfg) {
  const value = cfg.listingPrice * Math.sqrt((contrib30 + 10) / (cfg.baseline30 + 10));
  return snap(Math.round(value * 100), cfg.tickPaise);
}

/** Price band for the day: ±circuit around the previous close, snapped inward to the tick. */
export function circuitBand(prevClose, cfg) {
  const t = cfg.tickPaise;
  return {
    lower: Math.max(t, Math.ceil((prevClose * (1 - cfg.circuit)) / t - 1e-9) * t),
    upper: Math.floor((prevClose * (1 + cfg.circuit)) / t + 1e-9) * t,
  };
}

const clamp = (value, { lower, upper }) => Math.min(upper, Math.max(lower, value));

/** At the closing bell the price moves part of the way toward fair value, within the circuit. */
function closingPrice(price, fv, prevClose, cfg) {
  const target = snap(Math.round(price + cfg.pullToFairValue * (fv - price)), cfg.tickPaise);
  return clamp(target, circuitBand(prevClose, cfg));
}

function addNews(state, now, text) {
  state.news.unshift({ t: now.toISOString(), text });
  state.news.length = Math.min(state.news.length, MAX_NEWS);
}

/** True the first time a one-off headline fires in a session. */
function once(session, flag) {
  if (session.flags.includes(flag)) return false;
  session.flags.push(flag);
  return true;
}

export const netWorth = (h, price) => h.cash + h.shares * price;

/** Holders with shares, biggest position first. */
export function shareholders(state) {
  return Object.entries(state.holders)
    .filter(([, h]) => h.shares > 0)
    .sort(([, a], [, b]) => b.shares - a.shares || netWorth(b, state.price) - netWorth(a, state.price))
    .map(([login, h]) => ({ login, ...h }));
}

/**
 * Lists the stock. The chart shouldn't start empty, so the previous sessions are backtested:
 * starting at the listing price, each one closes the way it would have given my real commits.
 */
export function createState(cfg, stats, now) {
  const today = marketClock(now, cfg.market).date;
  const sessions = [];
  for (let d = addDays(today, -1), i = 0; sessions.length < cfg.backfillSessions && i < 400; d = addDays(d, -1), i++) {
    if (isTradingDay(d, cfg.market)) sessions.unshift(d);
  }
  let price = cfg.listingPaise;
  const candles = sessions.map((d) => {
    const fv = fairValue(windowSum(stats.calendar, d), cfg);
    const o = price;
    const c = closingPrice(o, fv, o, cfg);
    price = c;
    return { d, o, h: Math.max(o, c), l: Math.min(o, c), c, v: 0, fv, pre: true };
  });
  const state = {
    version: STATE_VERSION,
    listedOn: today,
    price,
    prevClose: price,
    ath: Math.max(price, ...candles.map((k) => k.h)),
    session: null,
    nextOpen: null,
    candles,
    holders: {},
    amo: [],
    tape: [],
    news: [],
    processed: [],
    dividends: { mergedPRs: stats.mergedPRs, source: stats.source, perShare: 0 },
    updatedAt: now.toISOString(),
  };
  addNews(state, now, `$${cfg.symbol} lists on ${cfg.exchangeName} at ${rupees(price)}, priced off ${candles.length} backtested sessions of commits`);
  return state;
}

/** Rings whichever bells are due: closes a stale session, then opens today's if the market is open. */
export function advance(state, stats, cfg, now) {
  const outcomes = [];
  const { date } = marketClock(now, cfg.market);
  const open = isMarketOpen(now, cfg.market);
  if (state.session?.status === 'open' && (state.session.date !== date || !open)) {
    closeSession(state, stats, cfg, now);
  }
  if (open && state.session?.date !== date) outcomes.push(...openSession(state, cfg, now));
  state.nextOpen = open ? null : nextOpenDate(now, cfg.market);
  return outcomes;
}

function openSession(state, cfg, now) {
  const { date } = marketClock(now, cfg.market);
  state.prevClose = state.price;
  state.session = { date, status: 'open', o: state.price, h: state.price, l: state.price, v: 0, trades: 0, flags: [] };
  const queued = state.amo;
  state.amo = [];
  const outcomes = queued.map((order) => execute(state, cfg, order, now, true));
  if (queued.length) {
    addNews(state, now, `Opening bell: ${queued.length} after-market order${queued.length > 1 ? 's' : ''} executed`);
  }
  return outcomes;
}

function closeSession(state, stats, cfg, now) {
  const s = state.session;
  const fv = fairValue(windowSum(stats.calendar, s.date), cfg);
  const close = closingPrice(state.price, fv, state.prevClose, cfg);
  const candle = { d: s.date, o: s.o, h: Math.max(s.h, close), l: Math.min(s.l, close), c: close, v: s.v, fv };
  state.candles.push(candle);
  if (state.candles.length > cfg.keepCandles) state.candles.splice(0, state.candles.length - cfg.keepCandles);
  Object.assign(s, { status: 'closed', h: candle.h, l: candle.l, c: close, fv });
  state.price = close;

  const change = pct(state.prevClose, close);
  addNews(state, now, `Closing bell: $${cfg.symbol} ${rupees(close)} ${arrow(change)} ${signed(change)}%, fair value ${rupees(fv)}`);
  if (close > state.ath) {
    state.ath = close;
    addNews(state, now, `$${cfg.symbol} closes at an all-time high`);
  }
  payDividends(state, stats, cfg, now);
}

/** Every PR of mine merged since the last close pays a dividend to everyone holding shares. */
function payDividends(state, stats, cfg, now) {
  const d = state.dividends;
  // A different data source (public pages vs GraphQL) counts PRs differently: re-baseline, don't pay.
  if (stats.source !== d.source || !(stats.mergedPRs >= d.mergedPRs)) {
    d.source = stats.source;
    d.mergedPRs = stats.mergedPRs;
    return;
  }
  const merged = stats.mergedPRs - d.mergedPRs;
  if (merged <= 0) return;
  const perShare = merged * cfg.dividendPaise;
  for (const h of Object.values(state.holders)) {
    if (h.shares > 0) {
      h.cash += h.shares * perShare;
      h.dividends += h.shares * perShare;
    }
  }
  d.mergedPRs = stats.mergedPRs;
  d.perShare += perShare;
  addNews(state, now, `Dividend: ${rupees(perShare)} per share paid out (${merged} PR${merged > 1 ? 's' : ''} merged)`);
}

function newHolder(cfg, order, now) {
  return {
    id: order.userId ?? null,
    avatar: order.avatar ?? null,
    cash: cfg.startingPaise,
    shares: 0,
    cost: 0,
    realized: 0,
    dividends: 0,
    orders: 0,
    joinedAt: now.toISOString(),
    lastOrderAt: null,
  };
}

/** Accepts an order from a parsed issue: fills it now, queues it for the open, or rejects it. */
export function placeOrder(state, cfg, order, now) {
  const reject = (reason) => outcome(state, cfg, order, { status: 'rejected', reason });
  const sym = `$${cfg.symbol}`;
  if (order.error) return reject(order.error);
  if (order.isBot) return reject(`Bots can't trade on ${cfg.exchangeName}. Humans only.`);
  if (!cfg.allowOwnerTrading && order.login.toLowerCase() === cfg.login.toLowerCase()) {
    return reject('Insider trading is not allowed. SEBI is watching. 👀');
  }
  let h = state.holders[order.login];
  if (order.side === 'sell' && !(h?.shares > 0)) return reject(`You don't own any ${sym} yet. Buy some first.`);
  const wait = h?.lastOrderAt ? Date.parse(h.lastOrderAt) + cfg.cooldownMs - now.getTime() : 0;
  if (wait > 0) {
    return reject(`One order every ${cfg.cooldownMinutes} minutes, please. Try again in ${Math.ceil(wait / 60_000)} min.`);
  }
  const marketOpen = state.session?.status === 'open';
  const pending = state.amo.find((a) => a.login === order.login);
  if (!marketOpen && pending) {
    return reject(`You already have an order waiting for the opening bell (#${pending.issue}). Close that issue to cancel it, then place a new one.`);
  }

  h ??= state.holders[order.login] = newHolder(cfg, order, now);
  if (order.avatar) h.avatar = order.avatar;
  h.lastOrderAt = now.toISOString();
  if (marketOpen) return execute(state, cfg, order, now, false);

  state.amo.push({ issue: order.issue, login: order.login, side: order.side, qty: order.qty, placedAt: now.toISOString() });
  return outcome(state, cfg, order, { status: 'queued', opensOn: state.nextOpen });
}

/**
 * Fills an order at the price *after* its own impact, so a buy-then-sell round trip always
 * loses a little. That one rule is what makes pump-and-dump pointless.
 */
function execute(state, cfg, order, now, isAmo) {
  const h = state.holders[order.login];
  const s = state.session;
  const sym = `$${cfg.symbol}`;
  const band = circuitBand(state.prevClose, cfg);
  const dir = order.side === 'buy' ? 1 : -1;
  const fail = (reason) => outcome(state, cfg, order, { status: 'rejected', reason, amo: isAmo });

  if (dir > 0 && state.price >= band.upper) {
    return fail(`${sym} is locked in the upper circuit at ${rupees(band.upper)}, so there are no sellers left today. Try again after the next opening bell.`);
  }
  if (dir < 0 && state.price <= band.lower) {
    return fail(`${sym} is locked in the lower circuit at ${rupees(band.lower)}, so there are no buyers left today. Try again after the next opening bell.`);
  }

  const priceFor = (q) => clamp(snap(Math.round(state.price * (1 + dir * cfg.impactPerShare * q)), cfg.tickPaise), band);
  let qty = dir > 0 ? order.qty : Math.min(order.qty, h?.shares ?? 0);
  if (dir > 0) while (qty > 0 && priceFor(qty) * qty > h.cash) qty--;
  if (qty === 0) {
    return fail(dir > 0
      ? `Not enough cash: you have ${rupees(h.cash)} and one share costs ${rupees(priceFor(1))}.`
      : `You don't hold any ${sym} to sell.`);
  }

  const before = state.price;
  const leaderBefore = shareholders(state)[0]?.login;
  const px = priceFor(qty);
  const value = px * qty;
  if (dir > 0) {
    h.cash -= value;
    h.shares += qty;
    h.cost += value;
  } else {
    const basis = Math.round((h.cost * qty) / h.shares);
    h.cost -= basis;
    h.shares -= qty;
    h.cash += value;
    h.realized += value - basis;
  }
  h.orders += 1;

  state.price = px;
  s.h = Math.max(s.h, px);
  s.l = Math.min(s.l, px);
  s.v += qty;
  s.trades += 1;
  state.tape.unshift({ t: now.toISOString(), login: order.login, side: order.side, qty, px, issue: order.issue, ...(isAmo && { amo: true }) });
  state.tape.length = Math.min(state.tape.length, MAX_TAPE);

  if (px >= band.upper && once(s, 'upper')) addNews(state, now, `${sym} hits the upper circuit at ${rupees(px)}. Buyers locked out for the day`);
  if (px <= band.lower && once(s, 'lower')) addNews(state, now, `${sym} hits the lower circuit at ${rupees(px)}`);
  if (px > state.ath) {
    state.ath = px;
    if (once(s, 'ath')) addNews(state, now, `New all-time high: ${rupees(px)}`);
  }
  if (qty >= cfg.whaleQty) addNews(state, now, `Whale alert: @${order.login} ${dir > 0 ? 'buys' : 'sells'} ${qty} ${sym} at ${rupees(px)}`);
  const leader = shareholders(state)[0]?.login;
  if (leader && leader !== leaderBefore) addNews(state, now, `@${leader} is now the largest shareholder`);

  return outcome(state, cfg, order, {
    status: qty < order.qty ? 'partial' : 'filled',
    filled: qty,
    px,
    value,
    move: pct(before, px),
    amo: isAmo,
  });
}

/** Drops queued orders whose issue was closed by the trader (that's how you cancel an AMO). */
export function cancelClosedAmos(state, cfg, openIssues, now) {
  const cancelled = state.amo.filter((a) => !openIssues.has(a.issue));
  state.amo = state.amo.filter((a) => openIssues.has(a.issue));
  return cancelled.map((a) => outcome(state, cfg, { ...a }, { status: 'cancelled' }));
}

/** Records that an issue was handled so a retried tick never fills it twice. */
export function markProcessed(state, issue) {
  state.processed.push(issue);
  if (state.processed.length > MAX_PROCESSED) state.processed.splice(0, state.processed.length - MAX_PROCESSED);
}

/** Snapshot of an order's result plus the trader's position at that moment, for the receipt. */
function outcome(state, cfg, order, result) {
  const h = state.holders[order.login];
  const ranked = Object.entries(state.holders).sort(([, a], [, b]) => netWorth(b, state.price) - netWorth(a, state.price));
  return {
    issue: order.issue,
    login: order.login,
    side: order.side,
    qty: order.qty,
    ...result,
    price: state.price,
    position: h && {
      cash: h.cash,
      shares: h.shares,
      cost: h.cost,
      worth: netWorth(h, state.price),
      rank: ranked.findIndex(([login]) => login === order.login) + 1,
      investors: ranked.length,
    },
  };
}
