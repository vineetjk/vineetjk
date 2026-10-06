// Runs the real scripts/tick.js against fixtures, the way the workflow does.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cfg, steadyStats, MON } from './helpers.js';

const TICK = fileURLToPath(new URL('../scripts/tick.js', import.meta.url));

function setup() {
  const root = mkdtempSync(join(tmpdir(), 'vjk-'));
  const statsFile = join(root, 'stats-fixture.json');
  writeFileSync(statsFile, JSON.stringify(steadyStats()));
  return { root, statsFile };
}

function run({ root, statsFile }, now, issues) {
  const ordersFile = join(root, 'orders-fixture.json');
  writeFileSync(ordersFile, JSON.stringify(issues));
  execFileSync(process.execPath, [TICK], {
    env: { ...process.env, VJK_ROOT: root, VJK_NOW: now, VJK_STATS_FILE: statsFile, VJK_ORDERS_FILE: ordersFile, VJK_OFFLINE: '1', GITHUB_TOKEN: '' },
    stdio: 'pipe',
  });
  const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
  const { more, receipts } = read('.vjk/receipts.json');
  return { state: read('data/market.json'), receipts, more, message: readFileSync(join(root, '.vjk/commit-message.txt'), 'utf8') };
}

const buy = { number: 7, title: 'BUY 5 $VJK', user: { login: 'zed', id: 1, type: 'User', avatar_url: null } };
const noise = { number: 8, title: 'Found a typo', user: { login: 'yan', id: 2, type: 'User', avatar_url: null } };

test('tick: list, queue an AMO before the bell, fill it at the open, then go quiet', () => {
  const env = setup();

  const first = run(env, `${MON}T08:00:00+05:30`, [buy, noise]);
  assert.match(first.message, /listing day/);
  assert.deepEqual(first.state.amo.map((a) => a.issue), [7]);
  assert.deepEqual(first.receipts.map((r) => [r.issue, r.close]), [[7, false]], 'queued orders stay open; non-orders are ignored');
  assert.match(first.receipts[0].body, /Queued/);
  assert.match(readFileSync(join(env.root, 'README.md'), 'utf8'), /assets\/dark\/quote\.[0-9a-f]{10}\.svg/);
  assert.equal(readdirSync(join(env.root, 'assets/dark')).length, 11 + (cfg.buyMeACoffee ? 1 : 0));

  const second = run(env, `${MON}T09:17:00+05:30`, [buy, noise]);
  assert.match(second.message, /opening bell, 1 fill/);
  assert.equal(second.state.holders.zed.shares, 5);
  assert.deepEqual(second.receipts.map((r) => [r.issue, r.close]), [[7, true]], 'one closing receipt, no duplicate close');
  assert.match(second.receipts[0].body, /Filled/);
  // Old image versions are cleaned up, and every image the README links to exists.
  assert.equal(readdirSync(join(env.root, 'assets/dark')).length, 11 + (cfg.buyMeACoffee ? 1 : 0));
  for (const [link] of readFileSync(join(env.root, 'README.md'), 'utf8').matchAll(/assets\/(dark|light)\/[\w.-]+\.svg/g)) {
    assert.ok(existsSync(join(env.root, link)), `${link} exists`);
  }

  // Same moment, issue now closed by the bot: nothing to do and nothing should change.
  const snapshot = readFileSync(join(env.root, 'data/market.json'), 'utf8');
  const readme = readFileSync(join(env.root, 'README.md'), 'utf8');
  const third = run(env, `${MON}T09:17:00+05:30`, []);
  assert.deepEqual(third.receipts, []);
  assert.equal(readFileSync(join(env.root, 'data/market.json'), 'utf8'), snapshot);
  assert.equal(readFileSync(join(env.root, 'README.md'), 'utf8'), readme);
});

test('tick: an issue settled earlier but still open gets closed without a second fill', () => {
  const env = setup();
  run(env, `${MON}T10:00:00+05:30`, [buy]);
  const retry = run(env, `${MON}T10:30:00+05:30`, [buy]);
  assert.equal(retry.state.holders.zed.shares, 5);
  assert.deepEqual(retry.receipts, [{ issue: 7, close: true, reason: 'completed', body: null }]);
});

test('tick: a burst bigger than one tick settles in batches and asks for a follow-up', () => {
  const env = setup();
  const burst = Array.from({ length: 25 }, (_, i) => ({ number: 100 + i, title: 'BUY 1 $VJK', user: { login: `fan${i}`, id: 100 + i, type: 'User', avatar_url: null } }));
  const first = run(env, `${MON}T11:00:00+05:30`, burst);
  assert.equal(first.receipts.length, 20);
  assert.equal(first.more, true);
  const second = run(env, `${MON}T11:01:00+05:30`, burst.slice(20));
  assert.equal(second.receipts.length, 5);
  assert.equal(second.more, false);
  assert.equal(Object.keys(second.state.holders).length, 25);
});
