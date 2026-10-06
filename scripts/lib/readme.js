// Builds README.md from scripts/readme.template.md. Edit the template, not the README:
// every tick regenerates the README so image hashes and alt text stay in sync.

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { orderUrl } from './orders.js';
import { BUTTONS } from './render/buttons.js';

const TEMPLATE = new URL('../readme.template.md', import.meta.url);

export const contentHash = (content) => createHash('sha1').update(content).digest('hex').slice(0, 10);

const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Alt text comes straight from each SVG's <title>, so there's one description per image. */
const altOf = (svg) => {
  const m = /<title>([\s\S]*?)<\/title>/.exec(svg);
  return m ? m[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : '';
};

/**
 * @param files  [{ path, content }] from renderAll()
 * @param theme  'auto' emits <picture> pairs; 'dark' / 'light' pins one theme (used by the local preview)
 */
export function renderReadme(cfg, files, { theme = 'auto', base = '' } = {}) {
  const byPath = new Map(files.map((f) => [f.path, f.content]));
  const src = (t, name) => {
    const path = `assets/${t}/${name}.svg`;
    if (!byPath.has(path)) throw new Error(`README references missing asset ${path}`);
    return `${base}${path}?v=${contentHash(byPath.get(path))}`;
  };
  const image = (name, attrs) => {
    const alt = attr(altOf(byPath.get(`assets/light/${name}.svg`) ?? ''));
    if (theme !== 'auto') return `<img src="${src(theme, name)}" ${attrs} alt="${alt}">`;
    return `<picture><source media="(prefers-color-scheme: dark)" srcset="${src('dark', name)}"><img src="${src('light', name)}" ${attrs} alt="${alt}"></picture>`;
  };

  const vars = {
    symbol: cfg.symbol,
    startingCash: `₹${cfg.startingCash.toLocaleString('en-IN')}`,
    maxQty: cfg.maxQty,
    cooldownMinutes: cfg.cooldownMinutes,
    open: cfg.market.open,
    close: cfg.market.close,
    circuit: Math.round(cfg.circuit * 100),
    impact: (cfg.impactPerShare * 100).toFixed(2),
    pull: Math.round(cfg.pullToFairValue * 100),
    dividend: `₹${cfg.dividendPerMergedPR}`,
    baseline: cfg.baseline30,
    listing: `₹${cfg.listingPrice}`,
  };

  return readFileSync(TEMPLATE, 'utf8').replace(/\{\{(\w+)(?::([\w-]+))?\}\}/g, (match, key, arg) => {
    if (key === 'panel') return image(arg, 'width="100%"');
    if (key === 'buttons') {
      return BUTTONS.map((b) => `<a href="${attr(orderUrl(cfg, b.side, b.qty))}">${image(b.id, 'width="180"')}</a>`).join('\n');
    }
    if (key === 'coffee') {
      if (!cfg.buyMeACoffee) return '';
      return `<p align="center"><a href="https://buymeacoffee.com/${encodeURIComponent(cfg.buyMeACoffee)}">${image('coffee', 'height="44"')}</a></p>`;
    }
    if (!(key in vars)) throw new Error(`Unknown README placeholder ${match}`);
    return String(vars[key]);
  });
}
