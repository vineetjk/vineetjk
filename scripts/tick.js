#!/usr/bin/env node
// One market tick. The workflow runs this for the opening bell, the closing bell and every new
// order issue, and it always does the whole job (stats, bells, every open order). So a run that
// GitHub cancels, delays or skips is simply caught up by the next one.
//
// Local knobs: VJK_NOW (pretend time), VJK_ROOT (output dir), VJK_STATS_FILE / VJK_ORDERS_FILE
// (fixtures instead of the API), VJK_OFFLINE=1 (no network for orders or avatars).

import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './lib/config.js';
import { createState, advance, placeOrder, cancelClosedAmos, markProcessed, shareholders, STATE_VERSION } from './lib/engine.js';
import { fetchStats } from './lib/stats.js';
import { listOrderIssues, fetchDataUri } from './lib/github.js';
import { parseOrder, isOrderTitle } from './lib/orders.js';
import { toReceipt } from './lib/receipts.js';
import { marketView } from './lib/render/view.js';
import { renderAll } from './lib/render/index.js';
import { renderReadme, assetPath } from './lib/readme.js';
import { rupees, signed, arrow, pct } from './lib/money.js';

// Each order costs two API writes (comment + close); GitHub throttles bots at ~80 a minute.
// Anything beyond this waits for the follow-up tick that settle.js dispatches.
const MAX_ORDERS_PER_TICK = 20;

const root = resolve(process.env.VJK_ROOT ?? fileURLToPath(new URL('..', import.meta.url)));
const at = (p) => join(root, p);
const readJson = (p) => (existsSync(at(p)) ? JSON.parse(readFileSync(at(p), 'utf8')) : null);
function write(p, content) {
  mkdirSync(dirname(at(p)), { recursive: true });
  writeFileSync(at(p), content);
}
const writeJson = (p, data) => write(p, `${JSON.stringify(data, null, 2)}\n`);

const cfg = loadConfig();
const now = process.env.VJK_NOW ? new Date(process.env.VJK_NOW) : new Date();
const repo = process.env.GITHUB_REPOSITORY || cfg.repo;
const token = process.env.GITHUB_TOKEN || undefined;
const offline = Boolean(process.env.VJK_OFFLINE);

async function loadStats() {
  if (process.env.VJK_STATS_FILE) return JSON.parse(readFileSync(process.env.VJK_STATS_FILE, 'utf8'));
  const previous = readJson('data/stats.json');
  try {
    const fresh = await fetchStats(cfg.login, process.env.PROFILE_TOKEN || token);
    // Only bump fetchedAt when the numbers moved, so a quiet tick produces no commit.
    const { fetchedAt, ...unchanged } = previous ?? {};
    if (previous && JSON.stringify(unchanged) === JSON.stringify(fresh)) return previous;
    return { ...fresh, fetchedAt: now.toISOString() };
  } catch (err) {
    if (!previous) throw err;
    console.warn(`Stats fetch failed, keeping the previous snapshot: ${err.message}`);
    return previous;
  }
}

async function loadOrders() {
  if (process.env.VJK_ORDERS_FILE) {
    const issues = JSON.parse(readFileSync(process.env.VJK_ORDERS_FILE, 'utf8'));
    return { issues: issues.filter((i) => isOrderTitle(i.title, cfg)), complete: true };
  }
  if (offline) return null;
  try {
    return await listOrderIssues(cfg, repo, token);
  } catch (err) {
    console.warn(`Couldn't list order issues, skipping orders this tick: ${err.message}`);
    return null;
  }
}

const sized = (url, size) => `${url}${url.includes('?') ? '&' : '?'}s=${size}`;

async function loadAvatars(state, stats) {
  const users = {};
  if (offline) return { owner: null, users };
  const top = shareholders(state).slice(0, 8).filter((h) => h.avatar);
  const [owner] = await Promise.all([
    stats.avatarUrl ? fetchDataUri(sized(stats.avatarUrl, 112)) : null,
    ...top.map(async (h) => {
      users[h.login] = await fetchDataUri(sized(h.avatar, 40));
    }),
  ]);
  return { owner, users };
}

function commitMessage(state, outcomes, bell) {
  const change = pct(state.prevClose, state.price);
  const fills = outcomes.filter((o) => o.status === 'filled' || o.status === 'partial').length;
  const queued = outcomes.filter((o) => o.status === 'queued').length;
  const notes = [bell, fills && `${fills} fill${fills > 1 ? 's' : ''}`, queued && `${queued} queued`].filter(Boolean);
  return `${arrow(change)} $${cfg.symbol} ${rupees(state.price)} (${signed(change)}%) · ${notes.join(', ') || 'tick'}\n`;
}

const stats = await loadStats();
let state = readJson('data/market.json');
if (state && state.version !== STATE_VERSION) throw new Error(`data/market.json is version ${state.version}, expected ${STATE_VERSION}`);
const listing = !state;
state ??= createState(cfg, stats, now);
const before = JSON.stringify(state);
const sessionBefore = `${state.session?.date}:${state.session?.status}`;

const outcomes = [];
const closeOnly = [];
const orders = await loadOrders();
if (orders?.complete) outcomes.push(...cancelClosedAmos(state, cfg, new Set(orders.issues.map((i) => i.number)), now));
outcomes.push(...advance(state, stats, cfg, now));

let handled = 0;
const touched = new Set(outcomes.map((o) => o.issue));
for (const issue of orders?.issues ?? []) {
  if (state.processed.includes(issue.number)) {
    // Settled on an earlier tick but still open (closing it failed then). Queued AMOs stay open on
    // purpose, and AMOs that just filled at the bell already have a closing receipt.
    const queued = state.amo.some((a) => a.issue === issue.number);
    if (!queued && !touched.has(issue.number)) closeOnly.push({ issue: issue.number, close: true, reason: 'completed', body: null });
    continue;
  }
  if (handled++ >= MAX_ORDERS_PER_TICK) break;
  outcomes.push(placeOrder(state, cfg, parseOrder(issue, cfg), now));
  markProcessed(state, issue.number);
}

if (JSON.stringify(state) !== before) state.updatedAt = now.toISOString();
const sessionAfter = `${state.session?.date}:${state.session?.status}`;
const bell = listing
  ? 'listing day'
  : sessionAfter === sessionBefore ? null : state.session?.status === 'open' ? 'opening bell' : 'closing bell';

const view = marketView(state, stats, cfg);
const files = renderAll(view, await loadAvatars(state, stats));
// Every image lives at a content-hashed name, so clear out the previous versions first.
// Unchanged images get the same name back, so git sees no difference for them.
for (const dir of new Set(files.map((f) => dirname(f.path)))) {
  if (!existsSync(at(dir))) continue;
  for (const name of readdirSync(at(dir))) if (name.endsWith('.svg')) rmSync(join(at(dir), name));
}
for (const f of files) write(assetPath(f), f.content);
write('README.md', renderReadme(cfg, files));
writeJson('data/market.json', state);
writeJson('data/stats.json', stats);
const more = (orders?.issues ?? []).some((i) => !state.processed.includes(i.number));
writeJson('.vjk/receipts.json', { more, receipts: [...outcomes.map((o) => toReceipt(o, cfg)), ...closeOnly] });
write('.vjk/commit-message.txt', commitMessage(state, outcomes, bell));

const summary = outcomes.map((o) => `#${o.issue} ${o.status}`).join(', ') || 'no orders';
console.log(`${commitMessage(state, outcomes, bell).trim()} | ${summary} | stats via ${stats.source}`);
