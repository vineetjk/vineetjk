#!/usr/bin/env node
// Posts receipts and closes order issues for the tick that was just pushed. The workflow only
// runs this after a successful push, so nobody gets a receipt for a trade the ledger doesn't have.

import { readFileSync, existsSync } from 'node:fs';
import { commentOnIssue, closeIssue, rest } from './lib/github.js';

const PAUSE_MS = 600; // stay well under GitHub's secondary rate limit for bot comments

const file = new URL('../.vjk/receipts.json', import.meta.url);
const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!repo || !token) {
  console.error('GITHUB_REPOSITORY and GITHUB_TOKEN are required');
  process.exit(1);
}

const { more = false, receipts = [] } = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
const pause = () => new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
let failed = 0;
for (const r of receipts) {
  try {
    if (r.body) {
      await commentOnIssue(repo, r.issue, r.body, token);
      await pause();
    }
    if (r.close) {
      await closeIssue(repo, r.issue, r.reason ?? 'completed', token);
      await pause();
    }
    console.log(`#${r.issue}: ${r.close ? 'settled and closed' : 'commented'}`);
  } catch (err) {
    failed++;
    console.error(`#${r.issue}: ${err.message}`);
  }
}

// A burst of orders bigger than one tick handles: queue another tick right away instead of
// leaving them until the next bell. workflow_dispatch is one of the few events GITHUB_TOKEN may trigger.
if (more) {
  await rest(`/repos/${repo}/actions/workflows/market.yml/dispatches`, {
    token,
    method: 'POST',
    body: { ref: process.env.GITHUB_REF_NAME || 'master' },
  });
  console.log('More orders are waiting: dispatched another tick.');
}

// Anything left open is retried by the next tick, which closes already-processed issues.
if (failed) process.exit(1);
