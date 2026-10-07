import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, advance, placeOrder } from '../scripts/lib/engine.js';
import { parseOrder } from '../scripts/lib/orders.js';
import { marketView } from '../scripts/lib/render/view.js';
import { renderAll } from '../scripts/lib/render/index.js';
import { renderReadme, assetPath } from '../scripts/lib/readme.js';
import { cfg, steadyStats, ist, issue, MON } from './helpers.js';

const stats = steadyStats();
const noAvatars = { owner: null, users: {} };

function assertCleanSvgs(files) {
  assert.equal(files.length, 2 * (8 + 4 + (cfg.buyMeACoffee ? 1 : 0)), 'eight panels, four order buttons and the coffee button per theme');
  for (const f of files) {
    assert.match(f.content, /^<svg [^>]*viewBox="0 0 \d+ \d+"/, f.path);
    assert.ok(f.content.endsWith('</svg>'), f.path);
    assert.doesNotMatch(f.content, /NaN|undefined|Infinity|\[object/, f.path);
    assert.match(f.content, /<title>[^<]+<\/title>/, `${f.path} has a title for alt text`);
  }
}

test('a freshly listed market with no traders renders cleanly', () => {
  const state = createState(cfg, stats, ist(MON, '07:00'));
  assertCleanSvgs(renderAll(marketView(state, stats, cfg), noAvatars));
});

test('a busy open market renders cleanly and the README links every asset', () => {
  const state = createState(cfg, stats, ist(MON, '07:00'));
  advance(state, stats, cfg, ist(MON, '09:16'));
  for (const [i, who] of ['ann', 'ben', 'cat', 'dan'].entries()) {
    placeOrder(state, cfg, parseOrder(issue(who, `BUY ${5 + i} $VJK`), cfg), ist(MON, '10:00'));
  }
  const files = renderAll(marketView(state, stats, cfg), noAvatars);
  assertCleanSvgs(files);

  // The profile shows Commit City; the market lives on at market/README.md
  const readme = renderReadme(cfg, files);
  const market = renderReadme(cfg, files, { template: 'market', base: '../' });
  for (const page of [readme, market]) {
    assert.doesNotMatch(page, /\{\{/);
    assert.doesNotMatch(page, /\.svg\?v=/, 'no query-string versions: GitHub drops them');
  }
  for (const f of files) {
    assert.ok(readme.includes(assetPath(f)) || market.includes(`../${assetPath(f)}`), `a README links ${f.path} by its hashed name`);
  }
  assert.match(readme, /assets\/dark\/city\.[0-9a-f]{10}\.svg/);
  assert.doesNotMatch(readme, /assets\/dark\/quote/, 'the market left the front page');
  assert.match(readme, /href="https:\/\/github\.com\/vineetjk\/vineetjk\/blob\/HEAD\/market\/README\.md"/);
  assert.match(readme, /<a href="https:\/\/buymeacoffee\.com\/vineetjk"><picture>/);
  assert.match(readme, /<img src="https:\/\/komarev\.com\/ghpvc\/\?username=vineetjk&amp;label=Profile%20views/);
  assert.match(market, /issues\/new\?title=BUY%205%20%24VJK&amp;body=/);
  assert.match(market, /srcset="\.\.\/assets\/dark\/quote\.[0-9a-f]{10}\.svg"/);
  assert.match(market, /href="\.\.\/data\/market\.json"/);
  assert.match(market, /href="https:\/\/github\.com\/vineetjk">← Back to Commit City/);
});

test('without a Buy Me a Coffee id or view counter, those extras disappear', () => {
  const plain = { ...cfg, buyMeACoffee: undefined, viewCounter: false };
  const state = createState(plain, stats, ist(MON, '07:00'));
  const files = renderAll(marketView(state, stats, plain), noAvatars);
  assert.ok(!files.some((f) => f.path.endsWith('coffee.svg')));
  const readme = renderReadme(plain, files);
  assert.doesNotMatch(readme, /buymeacoffee|komarev|\{\{/);
});

test('rendering is deterministic, so a quiet tick changes nothing', () => {
  const state = createState(cfg, stats, ist(MON, '07:00'));
  const a = renderAll(marketView(state, stats, cfg), noAvatars);
  const b = renderAll(marketView(structuredClone(state), stats, cfg), noAvatars);
  assert.deepEqual(a, b);
});
