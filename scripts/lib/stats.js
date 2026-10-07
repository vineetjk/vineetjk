// "Fundamentals": everything the market knows about me comes from GitHub.
// With a token it's one GraphQL query; without one it falls back to public pages,
// which is what makes local runs and first-time forks work with zero setup.

import { graphql, rest } from './github.js';
import { windowSum } from './engine.js';
import { weekStart, addDays } from './time.js';

const MAX_STATIONS = 6;

const QUERY = `query($login: String!) {
  user(login: $login) {
    login name avatarUrl
    followers { totalCount }
    pullRequests(states: MERGED) { totalCount }
    repositories(ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, first: 100, orderBy: {field: PUSHED_AT, direction: DESC}) {
      totalCount
      nodes {
        stargazerCount
        languages(first: 10, orderBy: {field: SIZE, direction: DESC}) { edges { size node { name color } } }
      }
    }
    contributionsCollection {
      contributionCalendar { weeks { contributionDays { date contributionCount } } }
    }
  }
}`;

// Fallback colours for the public-pages path, which doesn't get linguist colours.
const COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', HTML: '#e34c26', CSS: '#563d7c', SCSS: '#c6538c',
  Python: '#3572A5', Java: '#b07219', Kotlin: '#A97BFF', Dart: '#00B4AB', C: '#555555', 'C++': '#f34b7d',
  Go: '#00ADD8', Rust: '#dea584', Shell: '#89e051', Swift: '#F05138', 'Jupyter Notebook': '#DA5B0B',
};

function topLanguages(sizes, limit = 6) {
  const sorted = [...sizes.values()].sort((a, b) => b.size - a.size);
  const top = sorted.slice(0, limit);
  const rest = sorted.slice(limit).reduce((sum, l) => sum + l.size, 0);
  return rest > 0 ? [...top, { name: 'Other', color: '#8b949e', size: rest }] : top;
}

async function viaGraphQL(login, token) {
  const { user } = await graphql(token, QUERY, { login });
  const sizes = new Map();
  for (const repo of user.repositories.nodes) {
    for (const { size, node } of repo.languages.edges) {
      const lang = sizes.get(node.name) ?? { name: node.name, color: node.color ?? '#8b949e', size: 0 };
      lang.size += size;
      sizes.set(node.name, lang);
    }
  }
  return {
    source: 'graphql',
    login: user.login,
    name: user.name,
    avatarUrl: user.avatarUrl,
    followers: user.followers.totalCount,
    repos: user.repositories.totalCount,
    stars: user.repositories.nodes.reduce((sum, r) => sum + r.stargazerCount, 0),
    mergedPRs: user.pullRequests.totalCount,
    languages: topLanguages(sizes),
    calendar: user.contributionsCollection.contributionCalendar.weeks
      .flatMap((w) => w.contributionDays)
      .map((day) => ({ d: day.date, c: day.contributionCount })),
  };
}

// Stations on the Commit Metro: the repos I committed to most this year, each at its busiest week.
const STATIONS_QUERY = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      commitContributionsByRepository(maxRepositories: 25) {
        repository { name isPrivate stargazerCount primaryLanguage { name color } }
        contributions(first: 100) { nodes { occurredAt commitCount } }
      }
    }
  }
}`;

/** Most-committed public repos (the profile repo itself is Commit Street, so it's left out). */
export function stationsFromContributions(byRepository, login) {
  return byRepository
    .filter((r) => r.repository && !r.repository.isPrivate && r.repository.name.toLowerCase() !== login.toLowerCase())
    .map((r) => {
      const weeks = new Map();
      for (const { occurredAt, commitCount } of r.contributions.nodes) {
        const week = weekStart(occurredAt.slice(0, 10));
        weeks.set(week, (weeks.get(week) ?? 0) + commitCount);
      }
      const [week] = [...weeks].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? 1 : -1))[0] ?? [];
      return {
        name: r.repository.name,
        color: r.repository.primaryLanguage?.color ?? '#8b949e',
        stars: r.repository.stargazerCount,
        commits: [...weeks.values()].reduce((sum, c) => sum + c, 0),
        week,
      };
    })
    .filter((s) => s.week)
    .sort((a, b) => b.commits - a.commits)
    .slice(0, MAX_STATIONS)
    .sort((a, b) => (a.week < b.week ? -1 : 1));
}

/** Fallback without per-repo commit data: recently pushed repos, each at the week of its last push. */
export function stationsFromRepos(repos, login, today = new Date().toISOString().slice(0, 10)) {
  const yearAgo = addDays(today, -364);
  return repos
    .filter((r) => !r.fork && !r.private && r.name.toLowerCase() !== login.toLowerCase() && r.pushed_at?.slice(0, 10) >= yearAgo)
    .sort((a, b) => (a.pushed_at < b.pushed_at ? 1 : -1))
    .slice(0, MAX_STATIONS)
    .map((r) => ({ name: r.name, color: '#8b949e', stars: r.stargazers_count, commits: null, week: weekStart(r.pushed_at.slice(0, 10)) }))
    .sort((a, b) => (a.week < b.week ? -1 : 1));
}

/** Commits this year per repo name, from the same per-repo contributions. */
export const commitTotals = (byRepository) =>
  new Map(byRepository.filter((r) => r.repository).map((r) => [r.repository.name, r.contributions.nodes.reduce((sum, d) => sum + d.commitCount, 0)]));

async function stationsViaGraphQL(login, token, log) {
  try {
    const { user } = await graphql(token, STATIONS_QUERY, { login });
    const byRepository = user.contributionsCollection.commitContributionsByRepository;
    return { stations: stationsFromContributions(byRepository, login), commits: commitTotals(byRepository) };
  } catch (err) {
    log(`Per-repo commits failed, using recently pushed repos for stations: ${err.message}`);
    try {
      return { stations: stationsFromRepos(await rest(`/users/${login}/repos?per_page=100&type=owner`, { token }), login), commits: new Map() };
    } catch {
      return { stations: [], commits: new Map() };
    }
  }
}

// Commit City: all-time contributions (the city grows with them), every public repo (one building
// each) and the pull requests merged in the last year (one BMTC bus each).
const CITY_QUERY = `query($login: String!) {
  user(login: $login) {
    contributionsCollection { contributionYears }
    repositories(ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, first: 100, orderBy: {field: PUSHED_AT, direction: DESC}) {
      nodes { name stargazerCount pushedAt createdAt diskUsage primaryLanguage { name color } }
    }
    pullRequests(states: MERGED, first: 50, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { number mergedAt repository { name isPrivate } }
    }
  }
}`;

/** One aliased contributionsCollection per year: the API only counts up to a year at a time. */
const yearsQuery = (years) => `query($login: String!) { user(login: $login) { ${years
  .map((y) => `y${y}: contributionsCollection(from: "${y}-01-01T00:00:00Z", to: "${y}-12-31T23:59:59Z") { contributionCalendar { totalContributions } }`)
  .join(' ')} } }`;

/** { total, since } from [year, count] pairs. */
export function lifetimeOf(perYear) {
  const active = perYear.filter(([, count]) => count > 0).map(([year]) => Number(year));
  return { total: perYear.reduce((sum, [, count]) => sum + count, 0), since: active.length ? Math.min(...active) : null };
}

/** Public repos as city buildings, minus the profile repo (that's Commit Street itself). */
export function repoListOf(repos, login, commits = new Map()) {
  return repos
    .filter((r) => r.name.toLowerCase() !== login.toLowerCase())
    .map((r) => ({ ...r, commits: commits.get(r.name) ?? 0 }))
    .sort((a, b) => (a.name < b.name ? -1 : 1));
}

/** Pull requests merged in the year up to `today`, oldest first, public repos only. */
export function prsOf(prs, today) {
  const yearAgo = addDays(today, -364);
  return prs
    .filter((pr) => pr.repo && !pr.private && pr.merged >= yearAgo && pr.merged <= today)
    .map(({ repo, number, merged }) => ({ repo, number, merged }))
    .sort((a, b) => (a.merged < b.merged ? -1 : a.merged > b.merged ? 1 : a.number - b.number));
}

async function cityViaGraphQL(login, token, commits, today, log) {
  try {
    const { user } = await graphql(token, CITY_QUERY, { login });
    const years = user.contributionsCollection.contributionYears;
    const totals = years.length ? (await graphql(token, yearsQuery(years), { login })).user : {};
    return {
      lifetime: lifetimeOf(years.map((y) => [y, totals[`y${y}`].contributionCalendar.totalContributions])),
      repoList: repoListOf(user.repositories.nodes.map((r) => ({
        name: r.name,
        color: r.primaryLanguage?.color ?? '#8b949e',
        stars: r.stargazerCount,
        pushed: (r.pushedAt ?? r.createdAt).slice(0, 10),
        created: r.createdAt.slice(0, 10),
        size: r.diskUsage ?? 0,
      })), login, commits),
      prs: prsOf(user.pullRequests.nodes.map((pr) => ({
        repo: pr.repository?.name,
        private: pr.repository?.isPrivate,
        number: pr.number,
        merged: pr.mergedAt?.slice(0, 10),
      })), today),
    };
  } catch (err) {
    log(`City stats failed, keeping the previous ones: ${err.message}`);
    return {};
  }
}

/** A year's total from its contributions page ("96 contributions in 2019"). */
export function parseYearTotal(html) {
  const m = /id="js-contribution-activity-description"[^>]*>\s*([\d,]+)\s+contributions?\s+in\s+(\d{4})/.exec(html);
  return m ? Number(m[1].replace(/,/g, '')) : null;
}

async function lifetimeFromPages(login, firstYear, lastYear) {
  // One page at a time: github.com is slow to serve these when asked for many at once
  const counts = [];
  for (let y = firstYear; y <= lastYear; y++) {
    const r = await fetch(`https://github.com/users/${login}/contributions?from=${y}-01-01&to=${y}-12-31`, { signal: AbortSignal.timeout(20_000) });
    if (!r.ok) throw new Error(`contributions ${y} → ${r.status}`);
    const total = parseYearTotal(await r.text());
    if (total == null) throw new Error(`no total on the ${y} contributions page`);
    counts.push([y, total]);
  }
  return lifetimeOf(counts);
}

/** My DEV posts, newest first: the banner planes over Commit City. */
export async function fetchPosts(username) {
  const r = await fetch(`https://dev.to/api/articles?username=${encodeURIComponent(username)}&per_page=10`, {
    headers: { accept: 'application/vnd.forem.api-v1+json' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!r.ok) throw new Error(`dev.to articles → ${r.status}`);
  return (await r.json()).map((a) => ({ title: a.title, published: a.published_at.slice(0, 10) }));
}

/** Parses the public contribution calendar HTML (the same grid you see on a profile). */
export function parseCalendarHtml(html) {
  const tips = new Map();
  for (const m of html.matchAll(/for="(contribution-day-component-[\d-]+)"[^>]*>([^<]*)/g)) tips.set(m[1], m[2]);
  return [...html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})" id="(contribution-day-component-[\d-]+)"/g)]
    .map(([, d, id]) => ({ d, c: Number(/^(\d+) contribution/.exec(tips.get(id) ?? '')?.[1] ?? 0) }))
    .sort((a, b) => (a.d < b.d ? -1 : 1));
}

const MERGED_PRS = (login) => `/search/issues?q=${encodeURIComponent(`author:${login} type:pr is:merged`)}&per_page=50&sort=created&order=desc`;

/** The city's extras from the REST API and the yearly contribution pages. */
async function cityFromRest(login, today, { user, repos, prs }, log) {
  const lifetime = await lifetimeFromPages(login, Number(user.created_at.slice(0, 4)), Number(today.slice(0, 4))).catch((err) => {
    log(`Yearly contribution pages failed, keeping the previous lifetime total: ${err.message}`);
    return undefined;
  });
  return {
    lifetime,
    repoList: repoListOf(repos.filter((r) => !r.fork && !r.private).map((r) => ({
      name: r.name,
      color: COLORS[r.language] ?? '#8b949e',
      stars: r.stargazers_count,
      pushed: (r.pushed_at ?? r.created_at).slice(0, 10),
      created: r.created_at.slice(0, 10),
      size: r.size,
    })), login),
    prs: prsOf(prs.items.map((pr) => ({
      repo: pr.repository_url?.split('/').pop(),
      private: false,
      number: pr.number,
      merged: pr.pull_request?.merged_at?.slice(0, 10),
    })), today),
  };
}

/** Fallback for when the GraphQL city query fails: the same extras over REST. */
async function cityViaRest(login, token, today, log) {
  try {
    const [user, repos, prs] = await Promise.all([
      rest(`/users/${login}`, { token }),
      rest(`/users/${login}/repos?per_page=100&type=owner`, { token }),
      rest(MERGED_PRS(login), { token }),
    ]);
    return await cityFromRest(login, today, { user, repos, prs }, log);
  } catch (err) {
    log(`City stats over REST failed too, keeping the previous ones: ${err.message}`);
    return {};
  }
}

async function viaPublicPages(login, log = console.warn) {
  const [user, repos, prs, html] = await Promise.all([
    rest(`/users/${login}`),
    rest(`/users/${login}/repos?per_page=100&type=owner`),
    rest(MERGED_PRS(login)),
    fetch(`https://github.com/users/${login}/contributions`, { signal: AbortSignal.timeout(20_000) }).then((r) => {
      if (!r.ok) throw new Error(`contributions page → ${r.status}`);
      return r.text();
    }),
  ]);
  const own = repos.filter((r) => !r.fork);
  const sizes = new Map();
  for (const r of own) {
    if (!r.language) continue;
    const lang = sizes.get(r.language) ?? { name: r.language, color: COLORS[r.language] ?? '#8b949e', size: 0 };
    lang.size += r.size;
    sizes.set(r.language, lang);
  }
  const calendar = parseCalendarHtml(html);
  if (calendar.length < 300) throw new Error(`contribution calendar looks wrong (${calendar.length} days)`);
  const today = calendar.at(-1).d;
  return {
    source: 'public',
    login: user.login,
    name: user.name,
    avatarUrl: user.avatar_url,
    followers: user.followers,
    repos: own.length,
    stars: own.reduce((sum, r) => sum + r.stargazers_count, 0),
    mergedPRs: prs.total_count,
    languages: topLanguages(sizes),
    calendar,
    stations: stationsFromRepos(repos, login, today),
    ...(await cityFromRest(login, today, { user, repos, prs }, log)),
  };
}

/** Fresh stats, trying GraphQL first, then public pages. Throws only if both fail. */
export async function fetchStats(login, token, log = console.warn) {
  if (token) {
    try {
      const stats = await viaGraphQL(login, token);
      const { stations, commits } = await stationsViaGraphQL(login, token, log);
      const today = stats.calendar.at(-1).d;
      let city = await cityViaGraphQL(login, token, commits, today, log);
      if (!city.lifetime) city = { ...(await cityViaRest(login, token, today, log)), ...city };
      return { ...stats, stations, ...city };
    } catch (err) {
      log(`GraphQL stats failed, trying public pages: ${err.message}`);
    }
  }
  return viaPublicPages(login, log);
}

/** Streaks and totals, computed relative to the last day in the calendar. */
export function derive(stats) {
  const cal = stats.calendar;
  const today = cal.at(-1)?.d;
  let best = 0;
  let run = 0;
  for (const { c } of cal) {
    run = c > 0 ? run + 1 : 0;
    best = Math.max(best, run);
  }
  // Today isn't over yet: a streak that ended yesterday is still alive.
  let i = cal.length - 1;
  if (i >= 0 && cal[i].c === 0) i--;
  let streak = 0;
  while (i >= 0 && cal[i].c > 0) {
    streak++;
    i--;
  }
  return {
    today,
    last30: today ? windowSum(cal, today) : 0,
    total: cal.reduce((sum, d) => sum + d.c, 0),
    streak,
    best,
  };
}
