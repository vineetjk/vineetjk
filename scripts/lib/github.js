// Thin wrappers over the GitHub REST and GraphQL APIs using the built-in fetch.

import { isOrderTitle } from './orders.js';

const API = 'https://api.github.com';

export async function rest(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(path.startsWith('http') ? path : API + path, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'commit-street',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(body && { 'Content-Type': 'application/json' }),
    },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}`);
  return res.status === 204 ? null : res.json();
}

export async function graphql(token, query, variables) {
  const res = await rest('/graphql', { token, method: 'POST', body: { query, variables } });
  if (res.errors?.length) throw new Error(`GraphQL: ${res.errors.map((e) => e.message).join('; ')}`);
  return res.data;
}

/**
 * Open issues that look like orders, oldest first. `complete` is false when there may be more
 * than one page, in which case callers must not treat a missing issue as closed.
 */
export async function listOrderIssues(cfg, repo, token) {
  const page = await rest(`/repos/${repo}/issues?state=open&sort=created&direction=asc&per_page=100`, { token });
  return {
    issues: page.filter((i) => !i.pull_request && isOrderTitle(i.title, cfg)),
    complete: page.length < 100,
  };
}

export const commentOnIssue = (repo, issue, body, token) =>
  rest(`/repos/${repo}/issues/${issue}/comments`, { token, method: 'POST', body: { body } });

export const closeIssue = (repo, issue, reason, token) =>
  rest(`/repos/${repo}/issues/${issue}`, { token, method: 'PATCH', body: { state: 'closed', state_reason: reason } });

/** Downloads an image as a data: URI so it can live inside an SVG (GitHub blocks external loads there). */
export async function fetchDataUri(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const type = res.headers.get('content-type')?.split(';')[0] ?? 'image/png';
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
  } catch {
    return null;
  }
}
