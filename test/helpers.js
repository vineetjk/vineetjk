import { loadConfig } from '../scripts/lib/config.js';
import { addDays } from '../scripts/lib/time.js';

export const cfg = loadConfig();

/** A year of exactly one contribution a day: 30 in any 30-day window, so fair value = listing price. */
export function steadyStats(endDate = '2026-10-09', perDay = 1) {
  const calendar = [];
  for (let i = 364; i >= 0; i--) calendar.push({ d: addDays(endDate, -i), c: perDay });
  return {
    source: 'test',
    login: cfg.login,
    name: 'Test',
    avatarUrl: null,
    followers: 1,
    repos: 2,
    stars: 3,
    mergedPRs: 10,
    languages: [{ name: 'JavaScript', color: '#f1e05a', size: 100 }],
    calendar,
  };
}

/** A Date at the given IST wall-clock time. */
export const ist = (date, time) => new Date(`${date}T${time}:00+05:30`);

let nextIssue = 1;
export function issue(login, title, extra = {}) {
  return { number: nextIssue++, title, user: { login, id: nextIssue, type: 'User', avatar_url: null }, ...extra };
}

// 2026-10-05 is a Monday.
export const MON = '2026-10-05';
export const TUE = '2026-10-06';
export const FRI = '2026-10-09';
export const SAT = '2026-10-10';
