// GUARD -- this package's two bundles are the shape the release expects: present, within a size
// band, no dist/node_modules, and the `__KIT_VERSION__` define substituted in `doctor`.
//
// WHY THIS EXISTS, NARROWLY. The regression to fear is not drift. It is a bundle that built to
// almost nothing (the FLOOR is the load-bearing half: "under the ceiling" is true of an empty
// file), a dependency copied into `dist/`, or the build-time kit version silently not
// substituted. The last one is the quiet half of a coupling: `kai doctor` reports the kit this CLI
// was built against, and if the define did not run, the bundle keeps a bare identifier and the
// verb dies with `ReferenceError` on the one command a user runs when something is already wrong.
//
// SPLIT FROM THE MCP'S GUARD when the two packages separated: each owns its own bundles, and
// neither should fail because the other's target moved.
//
//   node scripts/verify-bundle-shape.mjs
//   node scripts/verify-bundle-shape.mjs --self-test   # prove the band still detects
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(HERE, '..');
const DIST = join(PKG, 'dist');
const KIT_MANIFEST = resolve(PKG, '../ui/package.json');

/**
 * Bands in bytes, per bundle. Measured when the packages split: construct-cli 140,294 B and
 * doctor ~12,000 B. The ceilings are tripwires for an order-of-magnitude blunder, not budgets.
 */
export const BANDS = {
  'construct-cli.es.js': { floor: 40_000, ceiling: 600_000, expectsKitDefine: false },
  'doctor.es.js': { floor: 5_000, ceiling: 200_000, expectsKitDefine: true },
};

/** The build-time define doctor's report depends on. */
const DEFINE_IDENTIFIER = '__KIT_VERSION__';

/** Problems with one bundle, given its bytes and text. Pure, for the self-test. */
export function bundleProblems(name, bytes, text, bands = BANDS) {
  const band = bands[name];
  const problems = [];
  if (!band) return problems;
  if (bytes < band.floor) {
    problems.push(`${name} is ${bytes} B, under its ${band.floor} B floor: it built to (almost) nothing.`);
  }
  if (bytes > band.ceiling) {
    problems.push(
      `${name} is ${bytes} B, over its ${band.ceiling} B ceiling. Something started being bundled or a target changed ` +
        `shape: look at what config/vite/node.ts externalises and at what the entry now imports.`,
    );
  }
  // NOTE: there is deliberately NO "does the bundle contain the define" check here. A bundle whose
  // define RAN does not contain the identifier at all -- it contains the version the define
  // substituted. The first cut of this file asserted the opposite and passed its own self-test,
  // because the probes had been written to match the implementation instead of the contract;
  // running it on the real bundle is what exposed that (see defineProblems for the real check).
  return problems;
}

/**
 * The define substituted from `../ui/package.json`, read back out of the bundle. A build that did
 * not substitute it leaves the bare identifier while every size stays as it was; the runtime half
 * is loud (`ReferenceError` in `kai doctor`) but arrives after the release. Pure, for the self-test.
 */
export function defineProblems(name, text, kitVersion) {
  const problems = [];
  if (text.includes(DEFINE_IDENTIFIER)) {
    problems.push(
      `${name} still contains the bare ${DEFINE_IDENTIFIER} identifier: the \`define\` in config/vite/node.ts and the ` +
        `declaration in types/globals.d.ts have drifted apart, and \`kai doctor\` will throw ReferenceError.`,
    );
  }
  if (!text.includes(kitVersion)) {
    problems.push(
      `${name} does not carry the kit version (${kitVersion}), so the doctor report cannot be naming the kit this CLI ` +
        `was built against. The define reads it out of packages/ui/package.json; check that it still does.`,
    );
  }
  return problems;
}

if (process.argv.includes('--self-test')) {
  const probes = [
    ['a healthy construct bundle passes', bundleProblems('construct-cli.es.js', 140_294, 'no define here').length === 0],
    ['a healthy doctor bundle passes', bundleProblems('doctor.es.js', 12_000, 'kit 0.33.0').length === 0],
    ['an empty bundle is under the floor', bundleProblems('doctor.es.js', 10, DEFINE_IDENTIFIER).some((p) => p.includes('floor'))],
    [
      'a bundle over its ceiling is reported',
      bundleProblems('construct-cli.es.js', BANDS['construct-cli.es.js'].ceiling + 1, '').some((p) => p.includes('over its')),
    ],
    [
      'a doctor bundle that no longer mentions the kit version is reported',
      defineProblems('doctor.es.js', 'nothing here', '0.33.0').some((p) => p.includes('does not carry')),
    ],
    ['an unknown bundle name is ignored, not guessed at', bundleProblems('nope.js', 1, '').length === 0],
    ['a substituted define passes', defineProblems('doctor.es.js', 'kit 0.33.0', '0.33.0').length === 0],
    ['an unsubstituted identifier is reported', defineProblems('doctor.es.js', `kit ${DEFINE_IDENTIFIER}`, '0.33.0').some((p) => p.includes('bare'))],
    ['a missing version literal is reported', defineProblems('doctor.es.js', 'kit 9.9.9', '0.33.0').some((p) => p.includes('does not carry'))],
  ];
  let failed = 0;
  for (const [what, ok] of probes) {
    console.log(`${ok ? '✓' : '✗'} ${what}`);
    if (!ok) failed++;
  }
  if (failed) {
    console.error(`\n✗ verify-bundle-shape self-test: ${failed}/${probes.length} probe(s) misbehaved.\n`);
    process.exit(1);
  }
  console.log(`✓ verify-bundle-shape self-test: ${probes.length} probes behave as specified.`);
  process.exit(0);
}

const problems = [];
const KIT_VERSION = JSON.parse(readFileSync(KIT_MANIFEST, 'utf8')).version;
for (const name of Object.keys(BANDS)) {
  const file = join(DIST, name);
  if (!existsSync(file)) {
    problems.push(`${name} is missing from ${DIST}. Run \`npm run build\` in packages/cli first.`);
    continue;
  }
  const text = readFileSync(file, 'utf8');
  problems.push(...bundleProblems(name, statSync(file).size, text));
  if (BANDS[name].expectsKitDefine) problems.push(...defineProblems(name, text, KIT_VERSION));
}

// No `dist/node_modules`: these bundles externalise their deps rather than copying them, and a
// copy would be the same regression wearing a different path.
if (existsSync(join(DIST, 'node_modules'))) {
  problems.push('dist/node_modules exists: a dependency is being copied into the bundle directory instead of staying external.');
}

if (problems.length) {
  console.error(`✗ verify-bundle-shape: ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
const sizes = Object.keys(BANDS).map((n) => `${n} ${statSync(join(DIST, n)).size} B`);
console.log(`✓ verify-bundle-shape: ${sizes.join(', ')}; ${DEFINE_IDENTIFIER} substituted (${KIT_VERSION}).`);
