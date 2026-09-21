// GUARD -- this package's `@kitn.ai/ui` dependency range must track the kit's version.
//
// WHY THIS EXISTS. `@kitn.ai/kai` is the first published package in this workspace that
// DEPENDS on another one. The MCP resolves the kit's Custom Elements Manifest through
// `@kitn.ai/ui/custom-elements.json` at runtime (mcp/mcp/manifest.ts), so kai describes
// the kit version it resolved -- and a stale range would describe an API the app does
// not have.
//
// THE RANGE CANNOT BE RAISED BY DEPENDENCY-RANGE MECHANICS ALONE. `npm publish` is what
// publishes here (pnpm publish skips npm's OIDC exchange, see release-please.yml), and
// npm has no `workspace:` protocol: measured, `npm pack` leaves
// `"@kitn.ai/ui": "workspace:*"` verbatim in the tarball, which a consumer cannot
// install. So the range is a plain literal, kept fresh by release-please's
// `node-workspace` plugin and CHECKED here.
//
// THE ASSERTION IS EQUALITY ON THE LOWER BOUND, NOT RANGE MEMBERSHIP. `^0.31.0` happily
// contains `0.32.0`, so a membership check is true by construction and can never fire --
// the same trap `lint:cdn-pins` documents for CDN pins, and the reason both compare
// exact values. Pre-1.0 a caret pins the MINOR (`^0.32.0` means `>=0.32.0 <0.33.0`),
// which is the behaviour we want: the kit's minor releases are its breaking ones.
//
//   node scripts/verify-kit-range.mjs
//   node scripts/verify-kit-range.mjs --self-test   # prove the check still detects
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const KAI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UI_MANIFEST = resolve(KAI_ROOT, '../ui/package.json');

/**
 * The lower bound of a dependency range, or undefined when it cannot be read as one.
 * `^1.2.3`, `~1.2.3`, `>=1.2.3`, `1.2.3` and `>=1.2.3 <2` all yield `1.2.3`;
 * anything else (`workspace:*`, `latest`, a file path) yields undefined, which the
 * check below reports rather than skips.
 */
export function lowerBound(range) {
  const m = /^\s*(?:\^|~|>=|=)?\s*(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)\s*(?:[<>= ].*)?$/.exec(String(range));
  return m ? m[1] : undefined;
}

/** Every problem with `range` given the kit's `version`, as sentences. */
export function problemsWith(range, version) {
  const problems = [];
  const bound = lowerBound(range);
  if (bound === undefined) {
    problems.push(
      `the \`@kitn.ai/ui\` dependency is ${JSON.stringify(range)}, which this check cannot read as a version range. ` +
        `It must be a plain semver range (a \`workspace:\` range is NOT publishable: npm has no such protocol and ` +
        `packs it verbatim, so consumers cannot install the tarball).`,
    );
    return problems;
  }
  if (bound !== version) {
    problems.push(
      `the \`@kitn.ai/ui\` dependency is ${JSON.stringify(range)}, whose lower bound is ${bound}, but the kit in ` +
        `this workspace is ${version}. The MCP describes the kit it resolves at runtime, so a stale bound points ` +
        `every agent at an API the app may not have. Bump it to ^${version} (or whatever the intended bound is) in ` +
        `packages/kai/package.json.`,
    );
  }
  return problems;
}

if (process.argv.includes('--self-test')) {
  // Three probes. The middle one is the whole point: a range that CONTAINS the kit's
  // version but starts below it must still fail, because that is the case a membership
  // check would wave through.
  const probes = [
    ['a matching caret range passes', problemsWith('^0.32.0', '0.32.0').length === 0],
    ['a range that CONTAINS the version but starts lower fails', problemsWith('^0.31.0', '0.32.0').length === 1],
    ['an exact pin passes', problemsWith('0.32.0', '0.32.0').length === 0],
    ['a workspace range is reported, not skipped', problemsWith('workspace:*', '0.32.0').length === 1],
    ['a range starting ABOVE the version fails', problemsWith('^0.33.0', '0.32.0').length === 1],
  ];
  let failed = 0;
  for (const [what, ok] of probes) {
    console.log(`${ok ? '✓' : '✗'} ${what}`);
    if (!ok) failed++;
  }
  if (failed) {
    console.error(`\n✗ verify-kit-range self-test: ${failed}/${probes.length} probe(s) misbehaved.\n`);
    process.exit(1);
  }
  console.log(`✓ verify-kit-range self-test: ${probes.length} probes behave as specified.`);
  process.exit(0);
}

const kai = JSON.parse(readFileSync(resolve(KAI_ROOT, 'package.json'), 'utf8'));
const kit = JSON.parse(readFileSync(UI_MANIFEST, 'utf8'));
const range = kai.dependencies?.['@kitn.ai/ui'];

const problems = [
  ...(range === undefined ? ['packages/kai/package.json has no `@kitn.ai/ui` dependency. The MCP resolves the kit\'s manifest through it at runtime; without the dependency the CLI cannot start.'] : []),
  ...(range === undefined ? [] : problemsWith(range, kit.version)),
];

if (problems.length) {
  console.error(`✗ verify-kit-range: ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`✓ verify-kit-range: @kitn.ai/kai depends on @kitn.ai/ui ${JSON.stringify(range)}, the kit in this tree (${kit.version}).`);
