#!/usr/bin/env node
/**
 * Runs every Storybook-driven Playwright suite the package declares, one
 * project per child process.
 *
 * WHY THIS EXISTS
 * `config/playwright/storybook.config.ts` declares nine projects (composer,
 * slots, menu, command, input-mask, promptinput, shot, audio-visualizer,
 * audio-visualizer-band-shape), and until this script landed, CI named seven of
 * them by hand and invoked four. The other six suites each had an npm script
 * that nothing called: green for whoever ran it by hand, invisible to the graph
 * a merge gate reads. `verify:playwright-projects` cannot see that gap -- it
 * asserts every project matches at least one spec, which is a fact about the
 * config, not about who runs it. `docs/handoff/2026-09-27-composer-empty-state-and-rail.md`
 * had already called `test:slots-ivp` "dead" in passing; the same was true of
 * the rest of the list.
 *
 * HOW THE LIST IS DERIVED, AND WHY NOT TYPED
 * The list is read from `package.json`: every script whose command is
 * `playwright test --config config/playwright/storybook.config.ts
 * --project=<name>` IS one suite, and the script name says so. Add a script for
 * a project and this runner picks it up with no edit here; that is the property
 * a hand-typed CI list does not have. The floor below fires if the derivation
 * stops finding scripts at all, so an empty scan fails instead of reporting
 * success over nothing.
 *
 * WHY ONE PROCESS PER PROJECT
 * The config's own header records the price of nine-in-one: a spec that throws
 * at module load aborts collection for the whole config, and all nine projects
 * then report zero tests and exit 1 together. Per-project processes keep a
 * failure attributed to the project that caused it, and keep the rest running.
 *
 * ADVISORY SET
 * The two audio projects are red in the environment this repo can measure
 * locally -- WebGL shader recompiles, audio playback through an
 * OfflineAudioContext, and a fake getUserMedia device. They run in CI as an
 * advisory step (`--advisory-only`, which is also what CI runs alone) rather
 * than gating, and this map is the one hand-typed list in the file: it is a
 * named exception with a reason, not a coverage list. Emptying it is the fix
 * that puts them back in the blocking run.
 *
 * COST: the suites' own runtime, sequential. Measured on this box against a
 * warm Storybook on :6006 (KAI_SB_PORT unset) -- the blocking set is ~1.2 min
 * for 55 tests across five projects; the audio pair is ~2.5 min and longer per
 * project on a cold one.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_REL = 'config/playwright/storybook.config.ts';
const SCRIPT_SHAPE = new RegExp(
  `^playwright\\s+test\\s+--config\\s+${CONFIG_REL.replace(/[/.]/g, '\\$&')}\\s+--project=(\\S+)$`,
);

/**
 * Advisory: run, report, never fail the run. Each entry carries the reason it is
 * not blocking. Deriving WHICH projects exist comes from package.json; this map
 * only says which of them a red run is already expected for.
 */
const ADVISORY = new Map([
  [
    'audio-visualizer',
    'red locally: Check 1+2 (bar: 5 states), Check 7 (explicit theme over OS dark), ' +
      'Check 8 (OfflineAudioContext), Check 9 (fake getUserMedia), Check 10 (shader recompiles)',
  ],
  [
    'audio-visualizer-band-shape',
    'red locally in the same class: WebGL draw-call/band assertions under a software rasteriser',
  ],
]);

/** Vacuity floor: the derivation above must find at least this many suites. */
const MIN_SUITES = 5;

const advisoryOnly = process.argv.includes('--advisory-only');

const pkg = JSON.parse(readFileSync(resolve(PKG, 'package.json'), 'utf-8'));
const suites = [];
for (const [name, body] of Object.entries(pkg.scripts ?? {})) {
  const m = SCRIPT_SHAPE.exec(body);
  if (m) suites.push({ script: name, project: m[1] });
}

if (suites.length < MIN_SUITES) {
  console.error(
    `run-playwright-suites: derived ${suites.length} suite script(s) for ${CONFIG_REL}, ` +
      `under the floor of ${MIN_SUITES}. Either the scripts were renamed, or they stopped ` +
      `spelling \`playwright test --config ${CONFIG_REL} --project=<name>\` -- in which case ` +
      `this runner would run nothing and report success over it. Fix the derivation.`,
  );
  process.exit(1);
}

const selected = suites.filter((s) =>
  advisoryOnly ? ADVISORY.has(s.project) : !ADVISORY.has(s.project),
);
const skipped = suites.filter((s) => (advisoryOnly ? !ADVISORY.has(s.project) : ADVISORY.has(s.project)));

if (selected.length === 0) {
  console.error(
    `run-playwright-suites: ${advisoryOnly ? '--advisory-only selected no suite' : 'nothing to run'} ` +
      `out of ${suites.length} derived suite(s). The ADVISORY map no longer names a real project.`,
  );
  process.exit(1);
}

console.log(
  `run-playwright-suites: ${advisoryOnly ? 'advisory' : 'blocking'} run of ${selected.length} ` +
    `derived suite(s) from ${CONFIG_REL}${skipped.length ? `; not in this run: ${skipped.map((s) => s.project).join(', ')}` : ''}`,
);

const outcomes = [];
for (const { script, project } of selected) {
  console.log(`\n=== ${project} (pnpm run ${script}) ===`);
  let ok = true;
  try {
    execFileSync('pnpm', ['run', script], { cwd: PKG, stdio: 'inherit' });
  } catch {
    ok = false;
  }
  outcomes.push({ project, ok, advisory: ADVISORY.has(project) });
}

console.log('\nrun-playwright-suites summary');
for (const { project, ok, advisory } of outcomes) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${project}${advisory ? '  (advisory)' : ''}`);
}

const failed = outcomes.filter((o) => !o.ok && !o.advisory);
if (failed.length > 0) {
  console.error(
    `\nrun-playwright-suites: ${failed.length} blocking suite(s) failed: ` +
      `${failed.map((o) => o.project).join(', ')}`,
  );
  process.exit(1);
}
const advisoryRed = outcomes.filter((o) => !o.ok);
if (advisoryRed.length > 0) {
  console.error(
    `\nrun-playwright-suites: ${advisoryRed.map((o) => o.project).join(', ')} failed and is ` +
      `ADVISORY -- the run still exits 0, so these suites prove nothing until their entries ` +
      `leave the ADVISORY map in scripts/run-playwright-suites.mjs. Reasons: ` +
      `${advisoryRed.map((o) => `${o.project} -> ${ADVISORY.get(o.project)}`).join('; ')}`,
  );
}
