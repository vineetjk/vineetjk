// Commit City grows with my all-time contributions. Each new building costs a little more than the
// last, so the city fills in quickly at first and then slowly, and extras (the darshini, autos,
// buses, banner planes) open up at fixed milestones. The town hall, Commit Soudha, is built in
// stages between two milestones. Nothing here ever shrinks: the city is planned from the highest
// total seen so far, which tick.js keeps in data/city.json.

export const DEFAULT_RULES = {
  maxBuildings: 40,
  buildingBase: 25, // contributions for the first building
  buildingStep: 5, // each one after costs this much more than the one before
  treeEvery: 20,
  maxTrees: 120,
  unlock: { darshini: 100, autos: 300, buses: 500, planes: 600 },
  soudha: { start: 800, done: 1500 },
};

const clamp01 = (x) => Math.min(1, Math.max(0, x));

/** The rules from vjk.config.json's "city" block, with defaults for anything it leaves out. */
export function cityRules(cfg) {
  const own = cfg.city ?? {};
  return { ...DEFAULT_RULES, ...own, unlock: { ...DEFAULT_RULES.unlock, ...own.unlock }, soudha: { ...DEFAULT_RULES.soudha, ...own.soudha } };
}

/** Contributions needed for the k-th building (1-based) on its own. */
export const buildingCost = (k, rules) => rules.buildingBase + rules.buildingStep * (k - 1);

/** What the city has at `contributions` (all time). */
export function cityPlan(contributions, rules = DEFAULT_RULES) {
  let buildings = 0;
  let spent = 0;
  while (buildings < rules.maxBuildings && spent + buildingCost(buildings + 1, rules) <= contributions) {
    spent += buildingCost(buildings + 1, rules);
    buildings++;
  }
  const full = buildings >= rules.maxBuildings;
  const nextCost = full ? null : buildingCost(buildings + 1, rules);
  const { start, done } = rules.soudha;
  return {
    contributions,
    buildings,
    // The next building is a construction site this far along (0–1), done when toNext reaches 0
    next: full ? null : { progress: (contributions - spent) / nextCost, toNext: spent + nextCost - contributions },
    trees: Math.min(rules.maxTrees, Math.floor(contributions / rules.treeEvery)),
    has: Object.fromEntries(Object.entries(rules.unlock).map(([name, at]) => [name, contributions >= at])),
    soudha: { built: clamp01((contributions - start) / (done - start)), start, done },
  };
}

/** data/city.json after a tick: the highest all-time total seen (it only goes up) and the light. */
export const cityState = (previous, contributions, phase) => ({ peak: Math.max(previous?.peak ?? 0, contributions ?? 0), phase });

/** What changed in the city between two ticks, for the commit message. */
export function cityNews(before, after, rules) {
  if (!before) return [];
  const built = cityPlan(after.peak, rules).buildings - cityPlan(before.peak ?? 0, rules).buildings;
  const news = [];
  if (built > 0) news.push(built === 1 ? 'a new building' : `${built} new buildings`);
  if (before.phase && before.phase !== after.phase) news.push(after.phase);
  return news;
}
