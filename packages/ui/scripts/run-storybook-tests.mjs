#!/usr/bin/env node
// Process-level retry wrapper for the storybook browser test project.
//
// Why this exists: the storybook project runs ~118 *.stories.tsx as Playwright/
// chromium browser tests through a SINGLE long-lived chromium session. Under CI
// load that session occasionally has a renderer page die mid-run — the whole
// vitest runner then aborts with "Browser connection was closed" /
// "[birpc] rpc is closed", which is NOT a per-test assertion failure, so
// vitest's own `retry` can't recover it. The crash is non-deterministic (it
// lands on a different story each run; a clean run passes every test, e.g.
// "177 passed (177)") — it's resource/concurrency flake, not a real bug.
//
// The only thing that recovers a runner-level crash is re-running the suite as
// a fresh process. The suite is short (~70s), so we retry the whole thing a few
// times and exit 0 on the first clean pass; only a persistent failure across
// every attempt fails the step (so a genuine, deterministic test regression
// still goes red).
import { spawnSync } from 'node:child_process';

const MAX_ATTEMPTS = Number(process.env.STORYBOOK_TEST_ATTEMPTS ?? 3);
const cmd = 'npx';
const args = ['vitest', 'run', '--project=storybook'];

let lastCode = 1;
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  console.log(`\n> storybook browser tests - attempt ${attempt}/${MAX_ATTEMPTS}\n`);
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  lastCode = res.status ?? 1;
  if (lastCode === 0) {
    if (attempt > 1) console.log(`\nstorybook browser tests passed on attempt ${attempt}\n`);
    process.exit(0);
  }
  if (attempt < MAX_ATTEMPTS) {
    console.warn(
      `\nstorybook browser tests exited ${lastCode} on attempt ${attempt} - ` +
        `retrying (likely a chromium runner crash, not a test failure).\n`,
    );
  }
}

console.error(`\nstorybook browser tests failed all ${MAX_ATTEMPTS} attempts (exit ${lastCode}).\n`);
process.exit(lastCode);
