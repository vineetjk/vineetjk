import { readFileSync } from 'node:fs';
import { toPaise } from './money.js';

const DEFAULT_PATH = new URL('../../vjk.config.json', import.meta.url);

/** Reads vjk.config.json and adds the paise versions of every rupee amount. */
export function loadConfig(path = DEFAULT_PATH) {
  return withDerived(JSON.parse(readFileSync(path, 'utf8')));
}

export function withDerived(cfg) {
  return {
    ...cfg,
    tickPaise: toPaise(cfg.tick),
    listingPaise: toPaise(cfg.listingPrice),
    startingPaise: toPaise(cfg.startingCash),
    dividendPaise: toPaise(cfg.dividendPerMergedPR),
    cooldownMs: cfg.cooldownMinutes * 60_000,
  };
}
