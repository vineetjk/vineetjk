import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weeksOf, metro } from '../scripts/lib/render/metro.js';
import { THEMES } from '../scripts/lib/render/theme.js';
import { stationsFromContributions, stationsFromRepos } from '../scripts/lib/stats.js';
import { createState } from '../scripts/lib/engine.js';
import { marketView } from '../scripts/lib/render/view.js';
import { cfg, steadyStats, ist, MON } from './helpers.js';

test('the calendar becomes Sunday-started weeks, with a partial week at each end', () => {
  const calendar = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06'].map((d) => ({ d, c: 1 }));
  const weeks = weeksOf(calendar);
  assert.deepEqual(weeks.map((w) => [w.start, w.days.map((d) => d.dow)]), [
    ['2026-09-27', [4, 5, 6]], // Thu–Sat
    ['2026-10-04', [0, 1, 2]], // Sun–Tue: the train still being built
  ]);
});

test('stations are the most-committed public repos, each at its busiest week', () => {
  const repo = (name, extra = {}) => ({ name, isPrivate: false, stargazerCount: 1, primaryLanguage: { name: 'C', color: '#555555' }, ...extra });
  const days = (...pairs) => ({ nodes: pairs.map(([occurredAt, commitCount]) => ({ occurredAt: `${occurredAt}T07:00:00Z`, commitCount })) });
  const stations = stationsFromContributions([
    { repository: repo('busy'), contributions: days(['2026-07-06', 3], ['2026-07-07', 9], ['2026-08-10', 4]) },
    { repository: repo('quiet'), contributions: days(['2026-03-02', 1]) },
    { repository: repo('secret', { isPrivate: true }), contributions: days(['2026-05-05', 50]) },
    { repository: repo(cfg.login), contributions: days(['2026-10-05', 40]) },
    { repository: null, contributions: days(['2026-01-05', 5]) },
  ], cfg.login);
  assert.deepEqual(stations.map((s) => [s.name, s.week, s.commits]), [
    ['quiet', '2026-03-01', 1],
    ['busy', '2026-07-05', 16],
  ]);
});

test('without per-repo data, stations are recently pushed public repos', () => {
  const repos = [
    { name: 'fresh', fork: false, private: false, pushed_at: '2026-09-30T10:00:00Z', stargazers_count: 2 },
    { name: 'forked', fork: true, private: false, pushed_at: '2026-10-01T10:00:00Z', stargazers_count: 0 },
    { name: 'ancient', fork: false, private: false, pushed_at: '2024-01-01T10:00:00Z', stargazers_count: 9 },
    { name: cfg.login, fork: false, private: false, pushed_at: '2026-10-06T10:00:00Z', stargazers_count: 0 },
  ];
  assert.deepEqual(stationsFromRepos(repos, cfg.login, '2026-10-06').map((s) => [s.name, s.week]), [['fresh', '2026-09-27']]);
});

test('the metro draws one coach per day and ends at Commit Street with the live price', () => {
  const stats = { ...steadyStats(), stations: [{ name: 'a<b&c', color: '#555', stars: 0, commits: 3, week: '2026-07-05' }] };
  const state = createState(cfg, stats, ist(MON, '07:00'));
  for (const theme of Object.values(THEMES)) {
    const out = metro(marketView(state, stats, cfg), theme);
    assert.equal(out.match(/<use href="#[cht]\d"/g).length, stats.calendar.length, 'one purple coach per calendar day');
    assert.match(out, /COMMIT STREET/);
    assert.match(out, /\$VJK ₹100\.00/);
    assert.match(out, /a&lt;b&amp;c/, 'repo names are escaped');
    assert.doesNotMatch(out, /NaN|undefined|Infinity/);
  }
});

test('the metro still renders before any station data exists', () => {
  const stats = steadyStats();
  const state = createState(cfg, stats, ist(MON, '07:00'));
  assert.doesNotMatch(metro(marketView(state, stats, cfg), THEMES.dark), /NaN|undefined/);
});

test("a repo whose busiest week is this week gets a station before Commit Street", () => {
  const stats = { ...steadyStats(), stations: [{ name: 'this-week-repo', color: '#555', stars: 0, commits: 9, week: '2026-10-04' }] };
  const state = createState(cfg, stats, ist(MON, '07:00'));
  const out = metro(marketView(state, stats, cfg), THEMES.dark);
  assert.ok(out.indexOf('this-week-repo') > 0 && out.indexOf('this-week-repo') < out.lastIndexOf('COMMIT STREET'));
});

test('the journey keyframes run forward in time and dwell at each station', () => {
  const stats = {
    ...steadyStats(),
    stations: [
      { name: 'spring', color: '#555', stars: 0, commits: 4, week: '2026-03-01' },
      { name: 'summer', color: '#555', stars: 0, commits: 9, week: '2026-07-05' },
    ],
  };
  const state = createState(cfg, stats, ist(MON, '07:00'));
  const out = metro(marketView(state, stats, cfg), THEMES.dark);
  const pan = /@keyframes pan\{((?:[\d.]+%\{[^}]*\})+)\}/.exec(out)[1];
  const frames = [...pan.matchAll(/([\d.]+)%\{transform:([^;]+);/g)].map(([, pct, transform]) => [Number(pct), transform]);
  assert.equal(frames[0][0], 0);
  assert.equal(frames.at(-1)[0], 100);
  assert.equal(frames[0][1], frames.at(-1)[1], 'the loop starts and ends on the same frame');
  for (let k = 1; k < frames.length; k++) assert.ok(frames[k][0] > frames[k - 1][0], `keyframe ${k} moves forward`);
  // Each station stop is a pair of frames holding the same position after the journey starts
  const dwells = frames.filter((f, k) => k > 0 && f[0] > 11.5 && f[0] < 100 && f[1] === frames[k - 1][1]);
  assert.equal(dwells.length, 2);
  assert.match(out, /spring/);
  assert.match(out, /summer/);
});
