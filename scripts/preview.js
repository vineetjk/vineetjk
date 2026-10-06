#!/usr/bin/env node
// Dress rehearsal: replays a few weeks of made-up trading through the real engine, then renders
// the README and every SVG into ./preview (git-ignored) so you can eyeball it before pushing.
//
//   node scripts/preview.js          simulate and write preview/{dark,light}.html
//   node scripts/preview.js --shots  also screenshot both pages with headless Chrome
//
// VJK_NOW sets the moment the rehearsal ends (default: 13:05 IST today, mid-session).

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { loadConfig } from './lib/config.js';
import { createState, advance, placeOrder, markProcessed, shareholders } from './lib/engine.js';
import { fetchStats, stationsFromRepos } from './lib/stats.js';
import { fetchDataUri, rest } from './lib/github.js';
import { parseOrder } from './lib/orders.js';
import { toReceipt } from './lib/receipts.js';
import { addDays, isTradingDay, marketClock } from './lib/time.js';
import { marketView } from './lib/render/view.js';
import { renderAll } from './lib/render/index.js';
import { renderReadme, assetPath } from './lib/readme.js';

const OUT = fileURLToPath(new URL('../preview/', import.meta.url));
const TRADERS = [
  'chai-coder', 'dosa-driven-dev', 'filter-kaapi', 'merge-masala', 'rebase-rani', 'yaml-yogi',
  'null-pointer-nandi', 'semicolon-shastri', 'git-gopal', 'tabs-not-spaces', 'biryani-bytes', 'jugaad-js',
];

const cfg = loadConfig();
const statsFile = fileURLToPath(new URL('../data/stats.json', import.meta.url));
const realStats = existsSync(statsFile) ? JSON.parse(readFileSync(statsFile, 'utf8')) : await fetchStats(cfg.login);
// Snapshots from before the metro have no stations; borrow them from the public repo list.
realStats.stations ??= stationsFromRepos(await rest(`/users/${cfg.login}/repos?per_page=100&type=owner`), cfg.login, realStats.calendar.at(-1).d);

// Seeded, so every rehearsal tells the same story.
let seed = 20261006;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (list) => list[Math.floor(rand() * list.length)];
const atIST = (date, hhmm) => new Date(`${date}T${hhmm}:00+05:30`);
const hhmm = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const end = process.env.VJK_NOW ? new Date(process.env.VJK_NOW) : atIST(marketClock(new Date(), cfg.market).date, '13:05');
const endDate = marketClock(end, cfg.market).date;
let start = endDate;
for (let n = 0; n < 12; ) {
  start = addDays(start, -1);
  if (isTradingDay(start, cfg.market)) n++;
}

const stats = { ...realStats };
const state = createState(cfg, stats, atIST(start, '08:00'));
const outcomes = [];
let issueNo = 1;

function tick(when) {
  outcomes.push(...advance(state, stats, cfg, when));
}
function order(when, login, side, qty) {
  tick(when);
  const issue = { number: issueNo++, title: `${side.toUpperCase()} ${qty} $${cfg.symbol}`, user: { login, id: issueNo, type: 'User' } };
  outcomes.push(placeOrder(state, cfg, parseOrder(issue, cfg), when));
  markProcessed(state, issue.number);
}
function randomOrder(when) {
  const login = pick(TRADERS);
  const held = state.holders[login]?.shares ?? 0;
  const side = held > 0 && rand() < 0.35 ? 'sell' : 'buy';
  const qty = side === 'sell' ? Math.max(1, Math.ceil(rand() * held)) : pick([1, 2, 3, 5, 5, 5, 10, 10, 25]);
  order(when, login, side, Math.min(qty, cfg.maxQty));
}

for (let d = start; d <= endDate; d = addDays(d, 1)) {
  if (d === addDays(start, 6)) stats.mergedPRs += 2; // a couple of PRs land mid-rehearsal: dividend day
  if (isTradingDay(d, cfg.market)) {
    tick(atIST(d, '09:17'));
    const times = Array.from({ length: 3 + Math.floor(rand() * 6) }, () => 560 + Math.floor(rand() * 355)).sort((a, b) => a - b);
    for (const m of times) {
      const when = atIST(d, hhmm(m));
      if (when <= end) randomOrder(when);
    }
    if (atIST(d, '15:33') <= end) tick(atIST(d, '15:33'));
  }
  const evening = atIST(d, '21:30');
  if (evening <= end && rand() < 0.5) randomOrder(evening); // after-hours: queued as an AMO
}
order(end, cfg.login, 'buy', 5); // the owner trying to buy their own stock: insider, rejected
tick(end);
state.updatedAt = end.toISOString();

// Render exactly what the real tick would, into ./preview
rmSync(OUT, { recursive: true, force: true });
const owner = realStats.avatarUrl ? await fetchDataUri(`${realStats.avatarUrl}&s=112`) : null;
const files = renderAll(marketView(state, stats, cfg), { owner, users: {} });
for (const f of files) {
  mkdirSync(dirname(join(OUT, f.path)), { recursive: true });
  writeFileSync(join(OUT, f.path), f.content); // plain name, handy for screenshots
  writeFileSync(join(OUT, assetPath(f)), f.content); // hashed name, what the README links
}

const page = (theme) => {
  const dark = theme === 'dark';
  return `<!doctype html><meta charset="utf-8"><title>${cfg.symbol} preview (${theme})</title>
<style>
body{margin:0;padding:24px 16px;background:${dark ? '#0d1117' : '#ffffff'};color:${dark ? '#e6edf3' : '#1f2328'};font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif}
.readme{max-width:832px;margin:0 auto;border:1px solid ${dark ? '#3d444d' : '#d1d9e0'};border-radius:6px;padding:32px}
h1{font-size:2em;border-bottom:1px solid ${dark ? '#3d444db3' : '#d1d9e0b3'};padding-bottom:.3em;margin:0 0 16px}
p{margin:0 0 16px} img{max-width:100%} a{color:${dark ? '#4493f8' : '#0969da'}}
details{margin-bottom:16px} ul{padding-left:2em} li{margin:.25em 0} sub{font-size:75%}
</style>
<div class="readme">
${renderReadme(cfg, files, { theme })}
</div>`;
};
writeFileSync(join(OUT, 'dark.html'), page('dark'));
writeFileSync(join(OUT, 'light.html'), page('light'));

// One receipt of each kind, to read the bot's comments before anyone else does
const samples = new Map();
for (const o of outcomes) if (!samples.has(o.status)) samples.set(o.status, toReceipt(o, cfg));
writeFileSync(join(OUT, 'receipts.md'), [...samples].map(([status, r]) => `<!-- ${status} -->\n${r.body}`).join('\n\n---\n\n'));

const counts = outcomes.reduce((acc, o) => ({ ...acc, [o.status]: (acc[o.status] ?? 0) + 1 }), {});
console.log(`Rehearsed ${start} → ${endDate}: ${JSON.stringify(counts)}`);
console.log(`Top holder: ${shareholders(state)[0]?.login ?? 'none'} · price ₹${(state.price / 100).toFixed(2)} · session ${state.session?.status ?? 'none'}`);

if (process.argv.includes('--shots')) {
  const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  for (const theme of ['dark', 'light']) {
    execFileSync(chrome, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
      '--window-size=900,2700', '--virtual-time-budget=8000',
      `--screenshot=${join(OUT, `${theme}.png`)}`, `file://${join(OUT, `${theme}.html`)}`,
    ], { stdio: 'ignore' });
  }
  console.log(`Screenshots: ${join(OUT, 'dark.png')}, ${join(OUT, 'light.png')}`);
}
