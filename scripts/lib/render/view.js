// Everything the panels display, computed once from the market state and GitHub stats.
// Pure function of its inputs: no clock reads, so unchanged data renders byte-identical SVGs.

import { circuitBand, fairValue, shareholders } from '../engine.js';
import { derive } from '../stats.js';
import { pct } from '../money.js';
import { addDays, dayPhase } from '../time.js';

/**
 * `now` sets the light in Commit City (night when it's left out) and `city` is data/city.json,
 * whose peak keeps the city from shrinking when a count comes back lower.
 */
export function marketView(state, stats, cfg, { now = null, city = null } = {}) {
  const s = state.session;
  const open = s?.status === 'open';
  const last = state.candles.at(-1);
  const derived = derive(stats);
  const live = open ? { d: s.date, o: s.o, h: s.h, l: s.l, c: state.price, v: s.v, live: true } : null;
  const ref = s?.date ?? last?.d ?? state.listedOn;
  const year = [...state.candles.filter((k) => k.d > addDays(ref, -365)), ...(live ? [live] : [])];

  return {
    cfg,
    state,
    stats,
    derived,
    open,
    price: state.price,
    prevClose: state.prevClose,
    change: state.price - state.prevClose,
    changePct: pct(state.prevClose, state.price),
    ohlc: s ?? last ?? null,
    sessionDate: s?.date ?? null,
    band: circuitBand(state.prevClose, cfg),
    fv: fairValue(derived.last30, cfg),
    live,
    candles: state.candles,
    hi52: Math.max(state.price, ...year.map((k) => k.h)),
    lo52: Math.min(state.price, ...year.map((k) => k.l)),
    holders: shareholders(state),
    investors: Object.keys(state.holders).length,
    tape: state.tape,
    news: state.news,
    amo: state.amo,
    nextOpen: state.nextOpen,
    phase: now ? dayPhase(now, cfg.market) : 'night',
    lifetime: Math.max(city?.peak ?? 0, stats.lifetime?.total ?? 0, derived.total),
  };
}
