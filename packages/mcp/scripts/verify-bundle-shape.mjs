// GUARD -- this package's ONE bundle is the shape the release expects: present, within a
// size band, the MCP SDK still a SPECIFIER rather than inlined code, no dist/node_modules,
// and the `__MCP_VERSION__` define substituted.
//
// WHY THIS EXISTS, NARROWLY. The regression to fear is not drift. It is the SDK being
// inlined, or a dependency being copied into `dist/`, or the build emitting a bundle that
// no longer carries this package's own version into the MCP `instructions`. The first has
// been measured: setting `ssr.noExternal: true` (the strongest form of the same change)
// moves the bundle from 571,579 B to 616,386 B, so the 5.9 MB is an INSTALL footprint and
// not bundle weight -- which is why the ceiling here is a step-change tripwire and the
// FLOOR is the load-bearing half (a build that produced nothing still has a size, and
// "under the ceiling" is true of an empty file).
//
// SPLIT FROM THE CLI'S GUARD when the two packages separated: each now owns its own
// bundle, and neither should fail because the other's target moved.
//
//   node scripts/verify-bundle-shape.mjs
//   node scripts/verify-bundle-shape.mjs --self-test   # prove the band still detects
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(HERE, '..');
const DIST = join(PKG, 'dist');

/** Bands in bytes, per bundle. Measured for the shipped artifact; the floors matter. */
export const BANDS = {
  // Measured when the packages split: 572,451 B.
  'mcp.es.js': { floor: 200_000, ceiling: 2_000_000, expectsSdk: true },
};

/** The external dependency whose inlining this exists to catch. */
const EXTERNAL_SPECIFIER = '@modelcontextprotocol/sdk';

/** The build-time define, and what is left behind in the bundle if it was not substituted. */
const DEFINE_IDENTIFIER = '__MCP_VERSION__';

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

/**
 * `__MCP_VERSION__`, this package's own version, which the MCP reports in its
 * `instructions` (packages/ui/mcp/mcp/mcp-version.d.ts explains why it is a define rather
 * than a runtime read). A build that did not substitute it leaves the bare identifier in
 * the bundle while the size band, the SDK specifier and the file list all stay as they
 * were, so the BUILD is the quiet half. The runtime half is not quiet: measured on a
 * bundle built with the define key renamed, the bin exits 1 with
 * `[kitn-mcp] fatal: ReferenceError: __MCP_VERSION__ is not defined`. Pure, so the
 * self-test can plant each shape.
 */
export function defineProblems(name, text, version) {
  const problems = [];
  if (text.includes(DEFINE_IDENTIFIER)) {
    problems.push(
      `${name} still contains the bare ${DEFINE_IDENTIFIER} identifier: the \`define\` in config/vite/node.ts and the ` +
        `declaration in packages/ui/mcp/mcp/mcp-version.d.ts have drifted apart, and the server will throw ` +
        `ReferenceError on its first initialize.`,
    );
  }
  if (!text.includes(version)) {
    problems.push(
      `${name} does not carry this package's version (${version}), so the MCP's instructions cannot be naming it. ` +
        `The define reads it out of packages/mcp/package.json; check that it still does.`,
    );
  }
  return problems;
}

if (process.argv.includes('--self-test')) {
  const name = 'mcp.es.js';
  const band = BANDS[name];
  const big = 'x'.repeat(band.ceiling + 1) + EXTERNAL_SPECIFIER;
  const probes = [
    ['a healthy bundle passes', bundleProblems(name, 572_451, `${EXTERNAL_SPECIFIER} import`).length === 0],
    ['an inlined SDK is over the ceiling', bundleProblems(name, band.ceiling + 1, big).some((p) => p.includes('over its'))],
    ['an empty bundle is under the floor', bundleProblems(name, 10, EXTERNAL_SPECIFIER).some((p) => p.includes('floor'))],
    ['a bundle that lost the specifier is reported', bundleProblems(name, 572_451, 'no specifier here').some((p) => p.includes('no longer mentions'))],
    ['an unknown bundle name is ignored, not guessed at', bundleProblems('nope.js', 1, '').length === 0],
    ['a substituted bundle with the version literal passes', defineProblems(name, 'server 0.1.0', '0.1.0').length === 0],
    ['an unsubstituted identifier is reported', defineProblems(name, `server ${DEFINE_IDENTIFIER}`, '0.1.0').some((p) => p.includes('bare'))],
    ['a bundle that lost the version literal is reported', defineProblems(name, 'server 9.9.9', '0.1.0').some((p) => p.includes('does not carry'))],
    ['both define faults at once are both reported', defineProblems(name, DEFINE_IDENTIFIER, '0.1.0').length === 2],
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
// READ, NOT TYPED: the same manifest config/vite/node.ts substitutes from.
const MCP_VERSION = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8')).version;
for (const name of Object.keys(BANDS)) {
  const file = join(DIST, name);
  if (!existsSync(file)) {
    problems.push(`${name} is missing from ${DIST}. Run \`npm run build\` in packages/mcp first.`);
    continue;
  }
  const text = readFileSync(file, 'utf8');
  problems.push(...bundleProblems(name, statSync(file).size, text));
  problems.push(...defineProblems(name, text, MCP_VERSION));
}

// No `dist/node_modules`: the bundle externalises its deps rather than copying them, and a
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
console.log(
  `✓ verify-bundle-shape: ${sizes.join(', ')}; ${EXTERNAL_SPECIFIER} stays external; ${DEFINE_IDENTIFIER} substituted (${MCP_VERSION}).`,
);
