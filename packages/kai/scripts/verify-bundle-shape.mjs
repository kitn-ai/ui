// GUARD -- the CLI's two bundles are the shape the release expects: present, within a
// size band, and with the MCP SDK EXTERNAL.
//
// WHY THIS EXISTS, NARROWLY. Two bundles ship from this package, and this pins the shape a
// release expects: both present, neither empty, the MCP SDK still a SPECIFIER rather than
// inlined code, and no dist/node_modules.
//
// A CLAIM IN THIS FILE'S FIRST CUT WAS MEASURED AND IS WRONG, kept here because the correction
// is the useful part. It said the regression to fear was dropping the SDK from the `mcp`
// target's `external` list, "because the whole SDK gets inlined -- measured at 5.9 MB
// installed". Setting `ssr.noExternal: true` (vite's SSR build already externalises declared
// dependencies, so that is the strongest form of the same change) moves dist/mcp.es.js from
// 571,579 B to 616,386 B: **+45 KB**. The three SDK modules this server imports
// (server/index.js, server/stdio.js, types.js) reach almost none of the package's tree.
// The 5.9 MB is the INSTALL footprint of the dependency, which is what the peel bought and
// what `verify-kit-pack` / the pack guards care about -- it is not bundle weight, and
// conflating the two would have made this guard look far stronger than it is.
//
// So the ceiling is a STEP-CHANGE tripwire and nothing sharper. The checks that carry real
// weight are the FLOOR (a build that produced nothing still has a size, and "under the
// ceiling" is true of an empty file), the presence of both bundles, and the specifier check --
// which says something the band cannot: an artifact that changed size but lost the external
// would sail through a size test alone.
//
//   node scripts/verify-bundle-shape.mjs
//   node scripts/verify-bundle-shape.mjs --self-test   # prove the band still detects
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(HERE, '..');
const DIST = join(PKG, 'dist');

/**
 * Bands, in bytes. The ceilings are loose on purpose (see the note above: the plausible
 * inlining regression is +45 KB, not megabytes), so treat them as tripwires for an
 * order-of-magnitude blunder rather than as budgets. The floors are the load-bearing half.
 */
export const BANDS = {
  // `expectsSdk` is per bundle, not global: only the MCP server imports the SDK. The
  // construct CLI never did (see the note in config/vite/node.ts), so asserting it there
  // would be a check that cannot pass -- which is how this file's first cut failed.
  'mcp.es.js': { floor: 200_000, ceiling: 2_000_000, expectsSdk: true },
  'construct-cli.es.js': { floor: 40_000, ceiling: 600_000, expectsSdk: false },
};

/** The external dependency whose inlining this exists to catch. */
const EXTERNAL_SPECIFIER = '@modelcontextprotocol/sdk';

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
  if (band.expectsSdk && !text.includes(EXTERNAL_SPECIFIER)) {
    problems.push(
      `${name} no longer mentions ${EXTERNAL_SPECIFIER} at all. If the dependency was dropped, update this check; ` +
        `if it was inlined, it is now shipping inside the bundle.`,
    );
  }
  return problems;
}

if (process.argv.includes('--self-test')) {
  const name = 'mcp.es.js';
  const band = BANDS[name];
  const big = 'x'.repeat(band.ceiling + 1) + EXTERNAL_SPECIFIER;
  const tiny = EXTERNAL_SPECIFIER;
  const probes = [
    ['a healthy bundle passes', bundleProblems(name, 571_579, `${EXTERNAL_SPECIFIER} import`).length === 0],
    ['an inlined SDK is over the ceiling', bundleProblems(name, band.ceiling + 1, big).some((p) => p.includes('over its'))],
    ['an empty bundle is under the floor', bundleProblems(name, 10, EXTERNAL_SPECIFIER).some((p) => p.includes('floor'))],
    ['a bundle that lost the specifier is reported', bundleProblems(name, 571_579, 'no specifier here').some((p) => p.includes('no longer mentions'))],
    ['an unknown bundle name is ignored, not guessed at', bundleProblems('nope.js', 1, '').length === 0],
    ['a bundle that does NOT import the SDK is not asked to', bundleProblems('construct-cli.es.js', 140_294, 'no sdk here').length === 0],
    ['the tiny fixture fails the floor AND the specifier, so the probes are not interchangeable', bundleProblems(name, 10, '').length === 2],
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
for (const name of Object.keys(BANDS)) {
  const file = join(DIST, name);
  if (!existsSync(file)) {
    problems.push(`${name} is missing from ${DIST}. Run \`npm run build\` in packages/kai first.`);
    continue;
  }
  problems.push(...bundleProblems(name, statSync(file).size, readFileSync(file, 'utf8')));
}

// No `dist/node_modules`: the bundles externalise their deps rather than copying them, and a
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
console.log(`✓ verify-bundle-shape: ${sizes.join(', ')}; ${EXTERNAL_SPECIFIER} stays external.`);
