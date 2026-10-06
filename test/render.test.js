import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, advance, placeOrder } from '../scripts/lib/engine.js';
import { parseOrder } from '../scripts/lib/orders.js';
import { marketView } from '../scripts/lib/render/view.js';
import { renderAll } from '../scripts/lib/render/index.js';
import { renderReadme } from '../scripts/lib/readme.js';
import { cfg, steadyStats, ist, issue, MON } from './helpers.js';

const stats = steadyStats();
const noAvatars = { owner: null, users: {} };

function assertCleanSvgs(files) {
  assert.equal(files.length, 2 * (6 + 4 + (cfg.buyMeACoffee ? 1 : 0)), 'six panels, four order buttons and the coffee button per theme');
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

  const readme = renderReadme(cfg, files);
  assert.doesNotMatch(readme, /\{\{/);
  for (const f of files) assert.ok(readme.includes(`${f.path}?v=`), `README references ${f.path}`);
  assert.match(readme, /issues\/new\?title=BUY%205%20%24VJK&amp;body=/);
  assert.match(readme, /<a href="https:\/\/buymeacoffee\.com\/vineetjk"><picture>/);
});

test('without a Buy Me a Coffee id the button and its placeholder disappear', () => {
  const plain = { ...cfg, buyMeACoffee: undefined };
  const state = createState(plain, stats, ist(MON, '07:00'));
  const files = renderAll(marketView(state, stats, plain), noAvatars);
  assert.ok(!files.some((f) => f.path.endsWith('coffee.svg')));
  const readme = renderReadme(plain, files);
  assert.doesNotMatch(readme, /buymeacoffee|\{\{/);
});

test('rendering is deterministic, so a quiet tick changes nothing', () => {
  const state = createState(cfg, stats, ist(MON, '07:00'));
  const a = renderAll(marketView(state, stats, cfg), noAvatars);
  const b = renderAll(marketView(structuredClone(state), stats, cfg), noAvatars);
  assert.deepEqual(a, b);
});
