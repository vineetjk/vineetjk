import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createState, advance, placeOrder, cancelClosedAmos, fairValue, circuitBand, netWorth,
} from '../scripts/lib/engine.js';
import { parseOrder } from '../scripts/lib/orders.js';
import { withDerived } from '../scripts/lib/config.js';
import { cfg, steadyStats, ist, issue, MON, TUE } from './helpers.js';

const stats = steadyStats();

function openMarket(date = MON) {
  const state = createState(cfg, stats, ist(date, '08:00'));
  advance(state, stats, cfg, ist(date, '09:16'));
  return state;
}
const order = (state, login, title, when, conf = cfg) => placeOrder(state, conf, parseOrder(issue(login, title), conf), when);

test('fair value equals the listing price at the baseline and halves for a dead month', () => {
  assert.equal(fairValue(cfg.baseline30, cfg), cfg.listingPaise);
  assert.equal(fairValue(0, cfg), cfg.listingPaise / 2);
});

test('circuit band stays inside ±10% and on the ₹0.05 tick', () => {
  for (const prev of [10000, 6665, 12345, 5]) {
    const { lower, upper } = circuitBand(prev, cfg);
    assert.ok(lower >= prev * 0.9 - 1e-9 && upper <= prev * 1.1 + 1e-9, `band for ${prev}`);
    assert.equal(lower % cfg.tickPaise, 0);
    assert.equal(upper % cfg.tickPaise, 0);
  }
});

test('listing backtests the configured number of weekday sessions', () => {
  const state = createState(cfg, stats, ist(TUE, '08:00'));
  assert.equal(state.candles.length, cfg.backfillSessions);
  assert.ok(state.candles.every((k) => k.pre && ![0, 6].includes(new Date(`${k.d}T00:00:00Z`).getUTCDay())));
  assert.equal(state.candles.at(-1).d, MON);
  // Steady activity sits exactly at fair value, so the backtest is flat at the listing price.
  assert.equal(state.price, cfg.listingPaise);
});

test('orders outside market hours queue as AMOs and fill at the opening bell', () => {
  const state = createState(cfg, stats, ist(MON, '07:00'));
  advance(state, stats, cfg, ist(MON, '08:00'));
  const queued = order(state, 'alice', 'BUY 5 $VJK', ist(MON, '08:00'));
  assert.equal(queued.status, 'queued');
  assert.equal(queued.opensOn, MON);
  assert.equal(state.amo.length, 1);

  const fills = advance(state, stats, cfg, ist(MON, '09:17'));
  assert.equal(fills.length, 1);
  assert.equal(fills[0].status, 'filled');
  assert.equal(fills[0].amo, true);
  assert.equal(state.holders.alice.shares, 5);
  assert.equal(state.amo.length, 0);
});

test('closing an AMO issue cancels the order', () => {
  const state = createState(cfg, stats, ist(MON, '07:00'));
  advance(state, stats, cfg, ist(MON, '08:00'));
  const queued = order(state, 'alice', 'BUY 5 $VJK', ist(MON, '08:00'));
  const cancelled = cancelClosedAmos(state, cfg, new Set(), ist(MON, '08:30'));
  assert.deepEqual(cancelled.map((o) => [o.issue, o.status]), [[queued.issue, 'cancelled']]);
  assert.equal(state.amo.length, 0);
});

test('you pay the price after your own impact, so a round trip always loses money', () => {
  const state = openMarket();
  const buy = order(state, 'bob', 'BUY 25 $VJK', ist(MON, '10:00'));
  assert.equal(buy.status, 'filled');
  assert.ok(buy.px > cfg.listingPaise, 'buying pushes the price up');
  const sell = order(state, 'bob', 'SELL 25 $VJK', ist(MON, '10:11'));
  assert.equal(sell.status, 'filled');
  assert.ok(netWorth(state.holders.bob, state.price) < cfg.startingPaise);
  assert.equal(state.holders.bob.shares, 0);
  assert.equal(state.holders.bob.cost, 0);
});

test('the upper circuit locks out buyers for the rest of the day', () => {
  const state = openMarket();
  const { upper } = circuitBand(state.prevClose, cfg);
  let i = 0;
  while (state.price < upper && i < 50) order(state, `whale${i++}`, 'BUY 25 $VJK', ist(MON, '10:00'));
  assert.equal(state.price, upper);
  assert.ok(state.news.some((n) => n.text.includes('upper circuit')));
  const locked = order(state, 'late', 'BUY 1 $VJK', ist(MON, '11:00'));
  assert.equal(locked.status, 'rejected');
  assert.match(locked.reason, /upper circuit/);
  assert.equal(order(state, 'whale0', 'SELL 5 $VJK', ist(MON, '11:00')).status, 'filled', 'sellers can still trade');
});

test('one order per user per cooldown window', () => {
  const state = openMarket();
  assert.equal(order(state, 'carol', 'BUY 1 $VJK', ist(MON, '10:00')).status, 'filled');
  const again = order(state, 'carol', 'BUY 1 $VJK', ist(MON, '10:05'));
  assert.equal(again.status, 'rejected');
  assert.match(again.reason, /Try again in 5 min/);
  assert.equal(order(state, 'carol', 'BUY 1 $VJK', ist(MON, '10:10')).status, 'filled');
});

test('the owner cannot trade their own stock unless allowed', () => {
  const state = openMarket();
  const insider = order(state, cfg.login.toUpperCase(), 'BUY 1 $VJK', ist(MON, '10:00'));
  assert.equal(insider.status, 'rejected');
  assert.match(insider.reason, /Insider/);
  assert.equal(state.holders[cfg.login.toUpperCase()], undefined);
  const lenient = withDerived({ ...cfg, allowOwnerTrading: true });
  assert.equal(order(state, cfg.login, 'BUY 1 $VJK', ist(MON, '10:00'), lenient).status, 'filled');
});

test('bots and short sellers are rejected without opening an account', () => {
  const state = openMarket();
  const bot = placeOrder(state, cfg, parseOrder(issue('dependabot[bot]', 'BUY 1 $VJK', { user: { login: 'dependabot[bot]', type: 'Bot' } }), cfg), ist(MON, '10:00'));
  assert.equal(bot.status, 'rejected');
  const short = order(state, 'dave', 'SELL 3 $VJK', ist(MON, '10:00'));
  assert.equal(short.status, 'rejected');
  assert.deepEqual(Object.keys(state.holders), []);
});

test('buys shrink to what the cash covers', () => {
  const state = openMarket();
  order(state, 'erin', 'BUY 1 $VJK', ist(MON, '10:00'));
  state.holders.erin.cash = 3 * state.price;
  const partial = order(state, 'erin', 'BUY 10 $VJK', ist(MON, '10:30'));
  assert.equal(partial.status, 'partial');
  assert.ok(partial.filled > 0 && partial.filled < 10);
  assert.ok(state.holders.erin.cash >= 0);
});

test('merged PRs pay a dividend per share at the close', () => {
  const state = openMarket();
  order(state, 'frank', 'BUY 10 $VJK', ist(MON, '10:00'));
  const cashBefore = state.holders.frank.cash;
  advance(state, { ...stats, mergedPRs: stats.mergedPRs + 2 }, cfg, ist(MON, '15:31'));
  assert.equal(state.holders.frank.cash - cashBefore, 10 * 2 * cfg.dividendPaise);
  assert.ok(state.news.some((n) => n.text.startsWith('Dividend')));
});

test('a switch in stats source re-baselines dividends instead of paying out', () => {
  const state = openMarket();
  order(state, 'gina', 'BUY 10 $VJK', ist(MON, '10:00'));
  const cashBefore = state.holders.gina.cash;
  advance(state, { ...stats, source: 'graphql', mergedPRs: 999 }, cfg, ist(MON, '15:31'));
  assert.equal(state.holders.gina.cash, cashBefore);
  assert.equal(state.dividends.mergedPRs, 999);
});

test('a missed closing bell is rung before the next session opens', () => {
  const state = openMarket(MON);
  const before = state.candles.length;
  advance(state, stats, cfg, ist(TUE, '10:00'));
  assert.equal(state.candles.length, before + 1);
  assert.equal(state.candles.at(-1).d, MON);
  assert.equal(state.session.date, TUE);
  assert.equal(state.session.status, 'open');
});

test('the close pulls toward fair value but respects the circuit', () => {
  const quiet = steadyStats(undefined, 0); // dead month: fair value is half the listing price
  const state = createState(cfg, stats, ist(MON, '08:00'));
  advance(state, quiet, cfg, ist(MON, '09:16'));
  advance(state, quiet, cfg, ist(MON, '15:31'));
  const { lower } = circuitBand(cfg.listingPaise, cfg);
  assert.equal(state.price, lower, '20% of the way to ₹50 would be ₹90, exactly the lower circuit');
  assert.equal(state.nextOpen, TUE);
});
