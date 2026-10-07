// Builds README.md from scripts/readme.template.md, and the views/ pages that show Commit City at
// each time of day. Edit the template, not the README: every tick regenerates it so image hashes
// and alt text stay in sync.

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { orderUrl } from './orders.js';
import { BUTTONS } from './render/buttons.js';
import { LIGHTS } from './render/lights.js';
import { cityRules } from './city/growth.js';
import { fmtDate } from './time.js';

const TEMPLATE = new URL('../readme.template.md', import.meta.url);

export const contentHash = (content) => createHash('sha1').update(content).digest('hex').slice(0, 10);

/**
 * Where an image is written and linked from: the content hash goes in the file name. A `?v=` query
 * doesn't work, because GitHub's /raw/ redirect drops it and browsers keep the old copy for minutes.
 */
export const assetPath = ({ path, content }) => path.replace(/\.svg$/, `.${contentHash(content)}.svg`);

const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Alt text comes straight from each SVG's <title>, so there's one description per image. */
const altOf = (svg) => {
  const m = /<title>([\s\S]*?)<\/title>/.exec(svg);
  return m ? m[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : '';
};

/** An <img> (or a light/dark <picture> pair) for the asset called `name`, linked by its hashed path. */
function images(files, { theme = 'auto', base = '' } = {}) {
  const byPath = new Map(files.map((f) => [f.path, f.content]));
  const src = (t, name) => {
    const path = `assets/${t}/${name}.svg`;
    if (!byPath.has(path)) throw new Error(`README references missing asset ${path}`);
    return base + assetPath({ path, content: byPath.get(path) });
  };
  return (name, attrs) => {
    const alt = attr(altOf(byPath.get(`assets/light/${name}.svg`) ?? ''));
    if (theme !== 'auto') return `<img src="${src(theme, name)}" ${attrs} alt="${alt}">`;
    return `<picture><source media="(prefers-color-scheme: dark)" srcset="${src('dark', name)}"><img src="${src('light', name)}" ${attrs} alt="${alt}"></picture>`;
  };
}

/** The page that shows Commit City at one time of day: views/<phase>.md. */
export const viewUrl = (cfg, phase) => `https://github.com/${cfg.repo}/blob/HEAD/views/${phase}.md`;

/** Buttons that open the city at each time of day; `href` says where each one goes. */
const lightButtons = (image, href) => LIGHTS.map((phase) => `<a href="${attr(href(phase))}">${image(`light-${phase}`, 'height="34"')}</a>`).join(' ');

/**
 * @param files  [{ path, content }] from renderAll()
 * @param theme  'auto' emits <picture> pairs; 'dark' / 'light' pins one theme (used by the local preview)
 */
export function renderReadme(cfg, files, { theme = 'auto', base = '' } = {}) {
  const image = images(files, { theme, base });

  const city = cityRules(cfg);
  const vars = {
    symbol: cfg.symbol,
    startingCash: `₹${cfg.startingCash.toLocaleString('en-IN')}`,
    maxQty: cfg.maxQty,
    cooldown: cfg.cooldownMinutes > 0 ? ` One order every ${cfg.cooldownMinutes} minutes.` : '',
    open: cfg.market.open,
    close: cfg.market.close,
    circuit: Math.round(cfg.circuit * 100),
    impact: (cfg.impactPerShare * 100).toFixed(2),
    pull: Math.round(cfg.pullToFairValue * 100),
    dividend: `₹${cfg.dividendPerMergedPR}`,
    baseline: cfg.baseline30,
    listing: `₹${cfg.listingPrice}`,
    cityFirst: city.buildingBase,
    cityStep: city.buildingStep,
    treeEvery: city.treeEvery,
    soudhaStart: city.soudha.start.toLocaleString('en-IN'),
    soudhaDone: city.soudha.done.toLocaleString('en-IN'),
  };

  return readFileSync(TEMPLATE, 'utf8').replace(/\{\{(\w+)(?::([\w-]+))?\}\}/g, (match, key, arg) => {
    if (key === 'panel') return image(arg, 'width="100%"');
    if (key === 'lights') {
      return `<p align="center"><sub>The sky follows the time in Bengaluru. Pick a time of day to see the city then.</sub><br>\n${lightButtons(image, (phase) => viewUrl(cfg, phase))}</p>`;
    }
    if (key === 'flights') {
      // GitHub can't link parts of an image, so each DEV post flying over the city gets a banner here
      const flights = files.filter((f) => /^assets\/light\/flight-\d+\.svg$/.test(f.path));
      if (!flights.length) return '';
      const banners = flights.map((f) => `<a href="${attr(f.href)}">${image(/flight-\d+/.exec(f.path)[0], 'height="40"')}</a>`);
      return `<p align="center"><sub>My DEV posts fly over the city. Click a banner to read one.</sub><br>\n${banners.join('<br>\n')}</p>`;
    }
    if (key === 'buttons') {
      return BUTTONS.map((b) => `<a href="${attr(orderUrl(cfg, b.side, b.qty))}">${image(b.id, 'width="180"')}</a>`).join('\n');
    }
    if (key === 'coffee') {
      if (!cfg.buyMeACoffee) return '';
      return `<p align="center"><a href="https://buymeacoffee.com/${encodeURIComponent(cfg.buyMeACoffee)}">${image('coffee', 'height="44"')}</a></p>`;
    }
    if (key === 'views') {
      // Counted by komarev.com on every image load; GitHub's image proxy keeps visitors anonymous.
      if (!cfg.viewCounter) return '';
      const counter = `https://komarev.com/ghpvc/?username=${encodeURIComponent(cfg.login)}&label=Profile%20views&color=ff9933&style=flat-square`;
      return `<p align="center"><img src="${attr(counter)}" alt="Profile views"></p>`;
    }
    if (!(key in vars)) throw new Error(`Unknown README placeholder ${match}`);
    return String(vars[key]);
  });
}

/**
 * views/<phase>.md: Commit City at one time of day, buttons for the other times and a way back to
 * the profile. `view` is the city image ({ path, content }, unhashed path) and `date` when it was drawn.
 */
export function renderViewPage(cfg, files, { phase, view, date }) {
  const image = images(files, { base: '../' });
  return [
    `<p align="center"><a href="https://github.com/${cfg.login}">← Back to the live city</a></p>`,
    `<p align="center"><img src="../${assetPath(view)}" width="100%" alt="${attr(altOf(view.content))}"></p>`,
    `<p align="center">${lightButtons(image, (p) => `${p}.md`)}</p>`,
    `<p align="center"><sub>Commit City at ${phase}, drawn on ${fmtDate(date)}. On my profile the city follows the time in Bengaluru.</sub></p>`,
    '',
  ].join('\n\n');
}
