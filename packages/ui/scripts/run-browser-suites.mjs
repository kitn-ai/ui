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
 * THE THIRD GAP: A CONFIG THAT NO SCRIPT NAMES
 * Both derivations above read the `scripts` block, so a browser config with no
 * script at all is invisible to them -- and that is the mechanism, one level up,
 * that produced the six orphaned Playwright suites this runner was written to
 * end. A script with no CI step is silent; a config with no script is equally
 * silent and harder to notice, because nothing in package.json mentions it. So
 * the CONFIG SWEEP below walks the package for every `*.config.<ext>` that IS a
 * browser suite (a Playwright config, or a vitest config importing a
 * `@vitest/browser*` provider -- the same spelling shape 2 uses) and FAILS
 * naming any that no script references. It REPORTS rather than runs: a config
 * nobody wired is not a suite this runner may start, and the honest outcome is
 * that someone is told to wire it or delete it. The walk is a directory walk,
 * never a list of configs -- `verify-playwright-projects.mjs` scans the same
 * directory for a different question (does each project match a spec), and it
 * cannot see this one, because this is a fact about who names the config.
 *
 * `--self-test` proves that sweep catches a planted config AND that it stays
 * quiet over the real tree (a control run). It needs no browser and no build,
 * so `test:browser-suites` chains it ahead of the run.
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
 *
 * WHAT THE SWEEP COSTS, AND WHAT IT DOES NOT COVER. The config sweep is a
 * recursive directory walk of the package (~1.8k entries with build output
 * excluded) plus a read of each `*.config.*` it finds -- no browser, no build,
 * well under a second, and it runs BEFORE any suite, so a bad config fails the
 * leg immediately. `--self-test` adds a temp-dir plant and one control walk,
 * milliseconds, and needs neither browser nor build. NOT covered: a suite that
 * is not a config at all -- a spec run through a project of a config that IS
 * named, or a test invoked from a script in a shape no SHAPES entry matches (a
 * `pnpm exec vitest` spelling, say) is still invisible here; and a reference in
 * a script is a reference, so a config named by a broken or never-invoked script
 * passes this sweep -- `test:react`, `test:e2e` and the `bare.config.ts`
 * projects are exactly that, and they are wired as their own CI steps rather
 * than derived by this runner.
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_REL = 'config/playwright/storybook.config.ts';

/**
 * A vitest config is a BROWSER suite when its own source imports a
 * `@vitest/browser*` provider. One spelling, two readers: shape 2 of SHAPES and
 * the config sweep below, so a config that swaps provider keeps matching both.
 */
const VITEST_BROWSER_PROVIDER = /@vitest\/browser/;

/** A Playwright config, by its import rather than its filename. */
const PLAYWRIGHT_IMPORT = /from\s+['"](?:@playwright\/test|playwright\/test)['"]/;

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
    // Read from the file, so a config that swaps the provider keeps matching
    // and one that drops it stops being selected here rather than being driven
    // through a browser it does not use.
    accepts: (m) => {
      const file = resolve(PKG, m[1]);
      return existsSync(file) && VITEST_BROWSER_PROVIDER.test(readFileSync(file, 'utf-8'));
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
const selfTest = process.argv.includes('--self-test');

const pkg = JSON.parse(readFileSync(resolve(PKG, 'package.json'), 'utf-8'));

/**
 * Build output, dependency trees and tool scratch are not config sources. A
 * `*.config.ts` inside one of these is not a suite anyone wires.
 */
const WALK_SKIP = new Set([
  'node_modules',
  'dist',
  'storybook-static',
  '.nx',
  '.git',
  'coverage',
  'test-results',
  'playwright-report',
]);

/** vitest resolves this file with no `--config`; it is the tool's own default. */
const VITEST_DEFAULT_CONFIG = 'vitest.config.ts';

/** Every `*.config.*` under `root`, absolute, sorted -- walked, never listed. */
function collectConfigFiles(root) {
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!WALK_SKIP.has(entry.name)) walk(resolve(dir, entry.name));
      } else if (/\.config\.[cm]?[jt]s$/.test(entry.name)) {
        found.push(resolve(dir, entry.name));
      }
    }
  };
  walk(root);
  return found.sort();
}

/**
 * The scripts that REFERENCE a config, by its package-relative path. A config
 * vitest resolves with no `--config` at all is referenced by every script that
 * invokes vitest and passes no `--config` of its own -- that is how `test` and
 * `test:storybook` reach the root config, and reading it off the scripts is what
 * keeps this from being a typed "these are wired" list.
 */
function scriptsReferencing(rel) {
  const entries = Object.entries(pkg.scripts ?? {});
  const named = entries.filter(([, body]) => body.includes(rel)).map(([name]) => name);
  if (named.length > 0 || rel !== VITEST_DEFAULT_CONFIG) return named;
  return entries
    .filter(([, body]) => /(^|\s)vitest(\s+run)?(\s|$)/.test(body) && !/--config/.test(body))
    .map(([name]) => name);
}

/**
 * Suite configs under `root` that no script names, as `{ rel, kind }`. Only
 * browser suites are in scope: a jsdom vitest config or a Vite build config is
 * not this runner's business and is passed over silently, by content.
 */
function unreferencedConfigs(root) {
  const findings = [];
  for (const abs of collectConfigFiles(root)) {
    const src = readFileSync(abs, 'utf-8');
    const kind = PLAYWRIGHT_IMPORT.test(src)
      ? 'playwright config'
      : VITEST_BROWSER_PROVIDER.test(src)
        ? 'vitest browser config'
        : null;
    if (!kind) continue;
    const rel = relative(root, abs);
    if (scriptsReferencing(rel).length === 0) findings.push({ rel, kind });
  }
  return findings;
}

/**
 * `--self-test`: plant one of each config shape in a temp tree, require the
 * sweep to report each by name, require it to pass over a planted JSDOM config
 * (the classification's negative control), and require ZERO findings over the
 * real package (the control that says this check is not simply always-red).
 * Everything happens in tmpdir/; nothing is written into the checkout.
 */
function runSelfTest() {
  const fail = (why) => {
    console.error(`run-browser-suites --self-test: ${why}`);
    process.exit(1);
  };
  const tmp = mkdtempSync(resolve(tmpdir(), 'run-browser-suites-selftest-'));
  try {
    const plants = [
      // Nested on purpose: this also proves the walk recurses.
      [
        'config/playwright/planted-playwright.config.ts',
        "import { defineConfig } from '@playwright/test';\n",
      ],
      [
        'vitest.planted-browser.config.ts',
        "import { playwright } from '@vitest/browser-playwright';\n",
      ],
      // Not a browser suite: must NOT be reported, or the sweep would demand a
      // script for every config in the tree.
      ['vitest.planted-jsdom.config.ts', "import { defineConfig } from 'vitest/config';\n"],
    ];
    for (const [rel, body] of plants) {
      const p = resolve(tmp, rel);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, body);
    }
    const findings = unreferencedConfigs(tmp).map((f) => f.rel);
    for (const [rel] of plants.slice(0, 2)) {
      if (!findings.includes(rel)) fail(`planting ${rel} did not report it (findings: ${findings.join(', ') || 'none'})`);
    }
    if (findings.includes(plants[2][0])) {
      fail(`${plants[2][0]} is not a browser suite and must not be reported`);
    }
    console.log(
      `run-browser-suites --self-test: the config sweep reported both planted suite configs ` +
        `(${plants[0][0]}, ${plants[1][0]}) and passed over ${plants[2][0]}.`,
    );
    const real = unreferencedConfigs(PKG);
    if (real.length > 0) {
      fail(
        `the real package has unreferenced suite config(s): ` +
          `${real.map((f) => `${f.rel} (${f.kind})`).join(', ')}. Wire a script that names each ` +
          `one, or delete it -- the run below would fail on them anyway.`,
      );
    }
    console.log(
      `run-browser-suites --self-test: control run over the real package reported 0 unreferenced ` +
        `suite config(s) out of ${collectConfigFiles(PKG).length} config file(s) walked.`,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
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

if (selfTest) {
  runSelfTest();
  process.exit(0);
}

// The config sweep, after the floors (which judge the derivation) and before a
// single suite runs. It cannot check anything under `--advisory-only` -- that
// mode runs two named projects of one config -- so it reports on the full run.
const unreferenced = unreferencedConfigs(PKG);
if (unreferenced.length > 0) {
  console.error(
    `run-browser-suites: ${unreferenced.length} browser suite config(s) under ${PKG} are named ` +
      `by NO script, so nothing here runs them and CI cannot know they exist:\n` +
      unreferenced.map((f) => `  ${f.rel}  (${f.kind})`).join('\n') +
      `\nA config whose script is missing is the same hole as a script no CI step calls, one ` +
      `level up -- this runner derives from the \`scripts\` block, so it can run neither. ` +
      `Fix: add the script that names it (shape 1 or 2 above, and this runner picks the suite ` +
      `up), or delete the config if it is not meant to run. If it is meant to be run by hand ` +
      `only, say so by adding its script -- an unreferenced config is unreachable by hand too.`,
  );
  process.exit(1);
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
console.log(
  `run-browser-suites: config sweep walked ${collectConfigFiles(PKG).length} config file(s) under ` +
    `${PKG}; every browser suite config is named by a script.`,
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
