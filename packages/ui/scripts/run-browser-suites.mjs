#!/usr/bin/env node
/**
 * Runs every suite the package declares a script for, one per child process.
 *
 * THE TWO SHAPES, AND WHY THEY ARE DERIVED RATHER THAN LISTED
 * The list is read from `package.json`, and two spellings count as a suite:
 *
 *   1. `playwright test --config config/playwright/storybook.config.ts
 *      --project=<name>` -- one project of the Storybook config, which declares
 *      nine (composer, slots, menu, command, input-mask, promptinput, shot,
 *      audio-visualizer, audio-visualizer-band-shape).
 *   2. `vitest run --config <cfg>` where `<cfg>` imports a `@vitest/browser*`
 *      provider -- a vitest project that needs a real browser (`|vitest.browser|.config.ts`,
 *      which drives `tests/browser/**`). Browser-ness is read from the config's
 *      own source, not from its filename, so a second browser config is covered
 *      the day its script lands. A vitest config importing no browser provider
 *      is a jsdom suite and stays out: this runner is the BROWSER leg.
 *
 * WHY THIS EXISTS
 * CI named seven of those nine Playwright projects by hand and invoked four.
 * The other six suites each had an npm script that nothing called: green for
 * whoever ran it by hand, invisible to the graph a merge gate reads.
 * `verify:playwright-projects` cannot see that gap -- it asserts every project
 * matches at least one spec, which is a fact about the config, not about who
 * runs it. `docs/handoff/2026-09-27-composer-empty-state-and-rail.md` had
 * already called `test:slots-ivp` "dead" in passing; the same was true of the
 * rest of the list. `test:containment` landed the next day with the same shape
 * (a new browser config, a new script, no CI step), which is why the vitest
 * shape is derived here rather than added as one more hand-named step.
 *
 * HOW THE LIST IS DERIVED, AND WHY NOT TYPED
 * The script name says so: add a script of either shape and this runner picks it
 * up with no edit here. That is the property a hand-typed CI list does not have.
 * The floor is PER SHAPE and not global on purpose -- a global floor stays
 * satisfied by the other shape's scripts while one shape derives nothing, which
 * is precisely how a suite stops being run without anyone noticing.
 *
 * WHY ONE PROCESS PER SUITE
 * The Storybook config's own header records the price of nine-in-one: a spec
 * that throws at module load aborts collection for the whole config, and all
 * nine projects then report zero tests and exit 1 together. Per-suite processes
 * keep a failure attributed to the suite that caused it, and keep the rest
 * running.
 *
 * ADVISORY SET
 * The two audio projects are red in the environment this repo can measure
 * locally -- WebGL shader recompiles, audio playback through an
 * OfflineAudioContext, and a fake getUserMedia device. They run in CI as an
 * advisory step (`--advisory-only`, which is also what CI runs alone) rather
 * than gating, and this map is the one hand-typed list in the file: it is a
 * named exception with a reason, not a coverage list. Emptying it is the fix
 * that puts them back in the blocking run. Keys are suite ids -- a project name
 * for shape 1, a script name for shape 2.
 *
 * COST: the suites' own runtime, sequential. Measured on this box against a
 * warm Storybook on :6006 (KAI_SB_PORT unset) -- the nine Playwright projects
 * are ~1.2 min for the seven blocking ones and ~2.5 min more for the audio pair,
 * longer per project on a cold server. `test:containment` needs no Storybook and
 * no kit build: it drives `src/` and boots its own chromium.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_REL = 'config/playwright/storybook.config.ts';

/**
 * One entry per script shape that IS a browser suite. `min` is this shape's own
 * vacuity floor: the number of suites a working derivation of this shape finds.
 */
const SHAPES = [
  {
    kind: 'playwright-project',
    min: 5,
    re: new RegExp(
      `^playwright\\s+test\\s+--config\\s+${CONFIG_REL.replace(/[/.]/g, '\\$&')}\\s+--project=(\\S+)$`,
    ),
    // The project name IS the suite id.
    idOf: (m) => m[1],
  },
  {
    kind: 'vitest-config',
    min: 1,
    re: /^vitest\s+run\s+--config\s+(\S+\.config\.ts)$/,
    idOf: (m) => m[1],
    // A vitest config is a BROWSER suite only if its own source imports a
    // `@vitest/browser*` provider. Read from the file, so a config that swaps
    // the provider keeps matching and one that drops it stops being selected
    // here rather than being driven through a browser it does not use.
    accepts: (m) => {
      const file = resolve(PKG, m[1]);
      return existsSync(file) && /@vitest\/browser/.test(readFileSync(file, 'utf-8'));
    },
  },
];

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

const advisoryOnly = process.argv.includes('--advisory-only');

const pkg = JSON.parse(readFileSync(resolve(PKG, 'package.json'), 'utf-8'));
const suites = [];
for (const shape of SHAPES) {
  const found = [];
  for (const [name, body] of Object.entries(pkg.scripts ?? {})) {
    const m = shape.re.exec(body);
    if (!m) continue;
    if (shape.accepts && !shape.accepts(m)) continue;
    found.push({ script: name, id: shape.idOf(m), kind: shape.kind });
  }
  if (found.length < shape.min) {
    console.error(
      `run-browser-suites: the ${shape.kind} derivation found ${found.length} suite script(s), ` +
        `under its floor of ${shape.min}. Either the scripts were renamed, or they stopped ` +
        `spelling the ${shape.kind} shape -- in which case this runner would run none of them ` +
        `and report success over it. Fix the derivation:\n  ${shape.re}`,
    );
    process.exit(1);
  }
  suites.push(...found);
}

const selected = suites.filter((s) =>
  advisoryOnly ? ADVISORY.has(s.id) : !ADVISORY.has(s.id),
);
const skipped = suites.filter((s) => (advisoryOnly ? !ADVISORY.has(s.id) : ADVISORY.has(s.id)));

if (selected.length === 0) {
  console.error(
    `run-browser-suites: ${advisoryOnly ? '--advisory-only selected no suite' : 'nothing to run'} ` +
      `out of ${suites.length} derived suite(s). The ADVISORY map no longer names a real suite.`,
  );
  process.exit(1);
}

console.log(
  `run-browser-suites: ${advisoryOnly ? 'advisory' : 'blocking'} run of ${selected.length} ` +
    `derived suite(s): ${selected.map((s) => `${s.id} (${s.kind} · pnpm run ${s.script})`).join(', ')}` +
    `${skipped.length ? `; not in this run: ${skipped.map((s) => s.id).join(', ')}` : ''}`,
);

const outcomes = [];
for (const { script, id } of selected) {
  console.log(`\n=== ${id} (pnpm run ${script}) ===`);
  let ok = true;
  try {
    execFileSync('pnpm', ['run', script], { cwd: PKG, stdio: 'inherit' });
  } catch {
    ok = false;
  }
  outcomes.push({ id, ok, advisory: ADVISORY.has(id) });
}

console.log('\nrun-browser-suites summary');
for (const { id, ok, advisory } of outcomes) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id}${advisory ? '  (advisory)' : ''}`);
}

const failed = outcomes.filter((o) => !o.ok && !o.advisory);
if (failed.length > 0) {
  console.error(
    `\nrun-browser-suites: ${failed.length} blocking suite(s) failed: ` +
      `${failed.map((o) => o.id).join(', ')}`,
  );
  process.exit(1);
}
const advisoryRed = outcomes.filter((o) => !o.ok);
if (advisoryRed.length > 0) {
  console.error(
    `\nrun-browser-suites: ${advisoryRed.map((o) => o.id).join(', ')} failed and is ` +
      `ADVISORY -- the run still exits 0, so these suites prove nothing until their entries ` +
      `leave the ADVISORY map in scripts/run-browser-suites.mjs. Reasons: ` +
      `${advisoryRed.map((o) => `${o.id} -> ${ADVISORY.get(o.id)}`).join('; ')}`,
  );
}
