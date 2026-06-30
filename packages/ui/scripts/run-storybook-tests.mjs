#!/usr/bin/env node
// Sub-batching + retry wrapper for the storybook browser test project.
//
// Why this exists: the storybook project runs ~112 *.stories.tsx as chromium
// browser tests (render + play + axe). vitest runs them through a SINGLE
// long-lived chromium process per invocation, which accumulates ~20MB of
// never-reclaimed memory PER story file (a vitest-browser/chromium harness cost,
// not our component code — proven: the ~45-file local crash ceiling is unchanged
// whether the theme MutationObserver or the heaviest app stories are removed). On
// the smaller CI runners that ceiling is lower, so even a 14-file shard sometimes
// dies mid-run ("Browser connection was closed" / "[birpc] rpc is closed") — a
// process-level crash that vitest's own per-test `retry` cannot recover.
//
// The only reliable lever is files-per-process. This wrapper splits the work into
// small SUB-SHARDS and runs EACH in a FRESH vitest process (= fresh chromium), so
// no single browser ever sees enough files to crash. Each sub-shard is retried a
// few times to absorb a rare crash; a real, deterministic regression still fails
// every attempt and goes red.
import { spawnSync } from 'node:child_process';

const MAX_ATTEMPTS = Number(process.env.STORYBOOK_TEST_ATTEMPTS ?? 3);

// Target number of sub-shards across ALL CI matrix shards combined. ~112 files /
// 20 ≈ 5-6 files per fresh chromium process — a comfortable margin under the
// crash ceiling. Raise it (env only, no workflow edit) if a runner ever still
// crashes; it just makes each batch smaller.
const SUBSHARD_TARGET = Number(process.env.STORYBOOK_SUBSHARD_TOTAL ?? 20);

// STORYBOOK_SHARD = "i/N" from the CI matrix (1-based i, N total jobs). Absent =>
// local full run (treated as shard 1/1, i.e. the whole suite, still sub-batched).
let i = 1, N = 1;
const shardEnv = process.env.STORYBOOK_SHARD;
if (shardEnv) {
  const [a, b] = shardEnv.split('/').map(Number);
  if (Number.isInteger(a) && Number.isInteger(b) && a >= 1 && b >= 1 && a <= b) { i = a; N = b; }
}

// Round the target up to a whole multiple of N so each CI shard owns an equal,
// integer number of sub-shards.
const M = Math.max(N, Math.ceil(SUBSHARD_TARGET / N) * N);
const per = M / N;
const start = (i - 1) * per + 1;
const subshards = Array.from({ length: per }, (_, j) => start + j);

console.log(`storybook tests — CI shard ${i}/${N}; sub-shards ${subshards.join(', ')} of ${M}, ${MAX_ATTEMPTS} attempts each\n`);

let failed = null;
for (const k of subshards) {
  const arg = `${k}/${M}`;
  let passed = false;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`\n> sub-shard ${arg} — attempt ${attempt}/${MAX_ATTEMPTS}\n`);
    const code = spawnSync('npx', ['vitest', 'run', '--project=storybook', `--shard=${arg}`], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    }).status ?? 1;
    if (code === 0) {
      if (attempt > 1) console.log(`\nsub-shard ${arg} passed on attempt ${attempt}\n`);
      passed = true;
      break;
    }
    if (attempt < MAX_ATTEMPTS) {
      console.warn(`\nsub-shard ${arg} exited ${code} on attempt ${attempt} — retrying (likely a chromium crash, not a test failure).\n`);
    }
  }
  if (!passed) { failed = arg; break; }
}

if (failed) {
  console.error(`\nsub-shard ${failed} failed all ${MAX_ATTEMPTS} attempts — failing CI shard ${i}/${N}.\n`);
  process.exit(1);
}
console.log(`\nall ${per} sub-shard(s) passed for CI shard ${i}/${N}.\n`);
process.exit(0);
