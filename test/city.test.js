import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cityPlan, cityRules, cityState, cityNews, DEFAULT_RULES } from '../scripts/lib/city/growth.js';
import { dayPhase } from '../scripts/lib/time.js';
import { parseYearTotal, lifetimeOf, prsOf, repoListOf } from '../scripts/lib/stats.js';
import { rankRepos, styleOf } from '../scripts/lib/render/city/buildings.js';
import { builtTo } from '../scripts/lib/render/city/soudha.js';
import { city } from '../scripts/lib/render/city.js';
import { renderAll, renderViews } from '../scripts/lib/render/index.js';
import { renderReadme, renderViewPage } from '../scripts/lib/readme.js';
import { KN } from '../scripts/lib/render/kannada.js';
import { THEMES } from '../scripts/lib/render/theme.js';
import { createState } from '../scripts/lib/engine.js';
import { marketView } from '../scripts/lib/render/view.js';
import { cfg, steadyStats, ist, MON } from './helpers.js';

test('the city grows by contributions, each building costing a little more than the last', () => {
  const plan = cityPlan(925);
  assert.equal(plan.buildings, 15, '25 + 30 + … + 95 = 900');
  assert.deepEqual(plan.next, { progress: 0.25, toNext: 75 });
  assert.equal(plan.trees, 46);
  assert.ok(Math.abs(plan.soudha.built - 125 / 700) < 1e-9);
  assert.deepEqual(plan.has, { darshini: true, autos: true, buses: true, planes: true });

  assert.equal(cityPlan(0).buildings, 0);
  assert.deepEqual(cityPlan(99).has, { darshini: false, autos: false, buses: false, planes: false });
  assert.equal(cityPlan(1e6).buildings, DEFAULT_RULES.maxBuildings);
  assert.equal(cityPlan(1e6).next, null);
  assert.equal(cityPlan(1e6).soudha.built, 1);
  assert.equal(cityPlan(1e6).trees, DEFAULT_RULES.maxTrees);
});

test('config can change the rules, and anything it leaves out keeps its default', () => {
  const rules = cityRules({ city: { buildingBase: 10, soudha: { done: 1000 } } });
  assert.equal(rules.buildingBase, 10);
  assert.equal(rules.buildingStep, DEFAULT_RULES.buildingStep);
  assert.deepEqual(rules.soudha, { start: DEFAULT_RULES.soudha.start, done: 1000 });
  assert.equal(cityPlan(10, rules).buildings, 1);
});

test('the city never shrinks, and the commit message says what changed', () => {
  assert.deepEqual(cityState({ peak: 925, phase: 'day' }, 900, 'dusk'), { peak: 925, phase: 'dusk' });
  assert.deepEqual(cityState(null, 40, 'night'), { peak: 40, phase: 'night' });
  const rules = cityRules({});
  assert.deepEqual(cityNews(null, { peak: 925, phase: 'day' }, rules), []);
  assert.deepEqual(cityNews({ peak: 999, phase: 'day' }, { peak: 1000, phase: 'day' }, rules), ['a new building']);
  assert.deepEqual(cityNews({ peak: 1000, phase: 'day' }, { peak: 1000, phase: 'dusk' }, rules), ['dusk']);
});

test('the light follows the clock in Bengaluru', () => {
  const at = (hhmm) => dayPhase(ist('2026-10-07', hhmm), cfg.market);
  assert.deepEqual(['05:29', '05:30', '06:59', '07:00', '17:44', '17:45', '18:59', '19:00', '23:59'].map(at),
    ['night', 'dawn', 'dawn', 'day', 'day', 'dusk', 'dusk', 'night', 'night']);
});

test('lifetime contributions add up the yearly totals from either source', () => {
  const page = '<h2 tabindex="-1" id="js-contribution-activity-description" class="f4 text-normal mb-2">\n      1,096\n      contributions\n        in 2019\n    </h2>';
  assert.equal(parseYearTotal(page), 1096);
  assert.equal(parseYearTotal('<p>nothing here</p>'), null);
  assert.deepEqual(lifetimeOf([[2018, 0], [2019, 96], [2020, 470]]), { total: 566, since: 2019 });
  assert.deepEqual(lifetimeOf([]), { total: 0, since: null });
});

test("merged PRs are this year's, public, oldest first", () => {
  const prs = prsOf([
    { repo: 'b', number: 4, merged: '2026-07-13' },
    { repo: 'a', number: 1, merged: '2026-03-16' },
    { repo: 'old', number: 9, merged: '2025-01-01' },
    { repo: 'secret', private: true, number: 2, merged: '2026-05-01' },
    { repo: undefined, number: 3, merged: '2026-05-01' },
  ], '2026-10-07');
  assert.deepEqual(prs, [{ repo: 'a', number: 1, merged: '2026-03-16' }, { repo: 'b', number: 4, merged: '2026-07-13' }]);
});

test('buildings are every public repo but this one, busiest first, styled by how recently pushed', () => {
  const repo = (name, pushed, extra = {}) => ({ name, color: '#555', stars: 0, pushed, created: '2020-01-01', size: 10, ...extra });
  const list = repoListOf([repo('quiet', '2019-05-01'), repo(cfg.login, '2026-10-06'), repo('busy', '2026-10-01'), repo('mid', '2025-06-01')], cfg.login, new Map([['busy', 30]]));
  assert.deepEqual(list.map((r) => r.name), ['busy', 'mid', 'quiet']);
  assert.deepEqual(rankRepos(list).map((r) => [r.name, styleOf(r, '2026-10-07')]), [['busy', 'tower'], ['mid', 'apartment'], ['quiet', 'house']]);
});

test('Commit Soudha rises walls first, then the domes', () => {
  const heights = [0, 0.1, 0.3, 0.6, 0.8, 0.92, 1].map(builtTo);
  for (let k = 1; k < heights.length; k++) assert.ok(heights[k] < heights[k - 1], 'it only ever gets taller');
});

/** A view with the city data a real tick would have. */
function cityView({ lifetime = 925, phase = 'night', prs, posts, repoList, perDay = 1 } = {}) {
  const repo = (name, pushed, commits = 0) => ({ name, color: '#3178c6', stars: 0, pushed, created: '2024-01-01', size: 100, commits });
  const stats = {
    ...steadyStats('2026-10-09', perDay),
    lifetime: { total: lifetime, since: 2018 },
    repoList: repoList ?? [repo('AllergySafe', '2026-10-04', 29), repo('tripppyyy', '2026-03-16', 4), repo('old-house', '2021-02-02'), ...Array.from({ length: 20 }, (_, k) => repo(`repo-${k}`, '2024-05-01'))],
    prs: prs ?? [{ repo: 'Alpha-Fin', number: 2, merged: '2026-07-13' }, { repo: 'Alpha-Fin', number: 10, merged: '2026-07-13' }],
    posts: posts ?? [{ title: 'I turned my GitHub contribution graph into a Metro train', published: '2026-10-06' }],
    stations: [{ name: 'AllergySafe', color: '#555', stars: 0, commits: 29, week: '2026-07-05' }],
  };
  const state = createState(cfg, stats, ist(MON, '07:00'));
  const v = marketView(state, stats, cfg);
  return { ...v, phase };
}

test('the city renders cleanly in every light, with its data on the signs', () => {
  for (const phase of ['dawn', 'day', 'dusk', 'night']) {
    for (const theme of Object.values(THEMES)) {
      const out = city(cityView({ phase }), theme);
      assert.match(out, /^<svg [^>]*viewBox="0 0 880 504"/);
      assert.doesNotMatch(out, /NaN|undefined|Infinity|\[object/, `${phase}/${theme.scheme}`);
      assert.match(out, /@font-face\{font-family:K;/, 'Kannada signs bring their font');
      assert.match(out, new RegExp(`${KN.bengaluru}</text>`));
      assert.match(out, new RegExp(`· ${phase.toUpperCase()}<`));
    }
  }
  const out = city(cityView(), THEMES.dark);
  assert.match(out, />AllergySafe</, 'the busiest repo has a building');
  assert.match(out, />NEXT: repo-3</, 'the 16th busiest repo is the construction site');
  assert.match(out, />75 TO GO</);
  assert.match(out, />#10 Alpha-Fin</, 'the latest merged PR waits at the bus stop');
  assert.match(out, />#2 Alpha-Fin</);
  assert.match(out, />I turned my GitHub contribution graph into a…</, 'a banner plane for the DEV post');
  assert.match(out, />18% BUILT · OPENS AT 1,500</);
  assert.match(out, />925 CONTRIBUTIONS · 15 BUILDINGS</);
  assert.equal(out, city(cityView(), THEMES.dark), 'deterministic, so a quiet tick changes nothing');
});

test('a young city has no extras yet, and a big one has a finished town hall', () => {
  const young = city(cityView({ lifetime: 40, perDay: 0 }), THEMES.dark);
  assert.match(young, />40 CONTRIBUTIONS · 1 BUILDING</);
  assert.doesNotMatch(young, /COMMIT DARSHINI|#10 Alpha-Fin|href="#plane"/);
  assert.match(young, />WORK STARTS AT 800</);

  const grown = city(cityView({ lifetime: 6000 }), THEMES.dark);
  assert.match(grown, new RegExp(`>${KN.motto}<`), 'the finished Soudha carries its motto');
  assert.doesNotMatch(grown, /BUILT ·|NEXT BUILDING IN/);
});

test('the city copes with no repos, PRs or posts at all', () => {
  const out = city(cityView({ repoList: [], prs: [], posts: [] }), THEMES.light);
  assert.doesNotMatch(out, /NaN|undefined|Infinity/);
  assert.match(out, />NEXT: NEW BUILDING</);
});

test('DEV posts get clickable banners under the city, linking to each post', () => {
  const posts = [
    { title: 'I turned my GitHub contribution graph into a Metro train', published: '2026-10-06', url: 'https://dev.to/vineetjk/metro' },
    { title: 'Can Prithvi Eat This? A Food Companion I Built for My Friend Living in a PG', published: '2026-10-04', url: 'https://dev.to/vineetjk/prithvi' },
  ];
  const files = renderAll(cityView({ posts }), { owner: null, users: {} });
  const flights = files.filter((f) => f.path.includes('/flight-'));
  assert.deepEqual(flights.map((f) => [f.path, f.href]), [
    ['assets/dark/flight-0.svg', 'https://dev.to/vineetjk/metro'],
    ['assets/dark/flight-1.svg', 'https://dev.to/vineetjk/prithvi'],
    ['assets/light/flight-0.svg', 'https://dev.to/vineetjk/metro'],
    ['assets/light/flight-1.svg', 'https://dev.to/vineetjk/prithvi'],
  ]);
  assert.match(flights[1].content, />Can Prithvi Eat This\? A Food Companion I Built for My…</, 'long titles are cut at a word to fit');
  for (const f of flights) assert.doesNotMatch(f.content, /NaN|undefined/);
  const readme = renderReadme(cfg, files);
  assert.match(readme, /<a href="https:\/\/dev\.to\/vineetjk\/metro"><picture><source[^>]+flight-0\.[0-9a-f]{10}\.svg/);
  assert.match(readme, /Click a banner to read one/);
  // No planes in a young city, so no banners either
  assert.ok(!renderAll(cityView({ posts, lifetime: 300 }), { owner: null, users: {} }).some((f) => f.path.includes('/flight-')));
});

test('each time of day has a page with the city, buttons to switch and a way back', () => {
  const v = cityView();
  const files = renderAll(v, { owner: null, users: {} });
  const views = renderViews(v);
  assert.deepEqual(views.map((x) => x.phase), ['dawn', 'day', 'dusk', 'night']);
  assert.match(views[2].content, new RegExp(`· DUSK<`));
  const page = renderViewPage(cfg, files, { phase: 'dusk', view: views[2], date: '2026-10-08' });
  assert.match(page, /<a href="https:\/\/github\.com\/vineetjk">← Back to the live city<\/a>/);
  assert.match(page, /<img src="\.\.\/assets\/views\/city-dusk\.[0-9a-f]{10}\.svg" width="100%" alt="Commit City: /);
  for (const phase of ['dawn', 'day', 'dusk', 'night']) assert.match(page, new RegExp(`<a href="${phase}\\.md"><picture><source media="\\(prefers-color-scheme: dark\\)" srcset="\\.\\./assets/dark/light-${phase}\\.`));
  assert.match(page, /Commit City at dusk, drawn on 08 Oct\./);
});
