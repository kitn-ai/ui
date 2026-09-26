#!/usr/bin/env node
/**
 * GUARD: every SHIPPED intra-workspace dependency is a publishable range with the right
 * lower bound, for every package in the workspace, derived rather than listed.
 *
 * WHY THIS EXISTS, and it is measured twice over.
 *
 * 1. `workspace:` IS NOT PUBLISHABLE. `npm publish` is what publishes here (pnpm publish
 *    skips npm's OIDC exchange), and `npm pack` leaves `"@kitn.ai/ui": "workspace:*"`
 *    verbatim in the tarball, which a consumer cannot install. So a package whose
 *    dependency ships must carry a plain semver range.
 * 2. THE RANGE MUST TRACK THE WORKSPACE, and EQUALITY ON THE LOWER BOUND is the assertion,
 *    not range membership: `^0.33.0` happily contains `0.34.0`, so a membership check is
 *    true by construction and can never fire -- the same trap `lint:cdn-pins` documents for
 *    CDN pins. Pre-1.0 a caret pins the MINOR, which is the behaviour wanted here.
 *
 * IT REPLACES PER-PACKAGE COPIES. There used to be one of these inside the CLI package,
 * reading that package's manifest by path. It could only ever see one edge, and when the
 * tooling split into `@kitn.ai/cli` + `@kitn.ai/mcp` the guard had to be copied to keep
 * coverage. This derives the package set from the workspace globs and the edges from the
 * manifests, so a new internal dependency is checked the day it lands, and an edge that
 * disappears cannot leave a stale expectation behind.
 *
 * DEV DEPENDENCIES ARE EXEMPT, on purpose and not by omission: a devDependency is not
 * shipped, `workspace:*` is the RIGHT spelling there, and a literal range in one is a
 * choice rather than a defect. `peerDependencies` IS checked, because that field ships.
 *
 *   node scripts/verify-workspace-ranges.mjs
 *   node scripts/verify-workspace-ranges.mjs --self-test   # prove it still detects
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');

/**
 * The lower bound of a dependency range, or undefined when it cannot be read as one.
 * `^1.2.3`, `~1.2.3`, `>=1.2.3`, `1.2.3` and `>=1.2.3 <2` all yield `1.2.3`; `workspace:*`,
 * `file:` and `latest` yield undefined, which the caller reports rather than skips.
 *
 * Deliberately NOT shared with `kai doctor`: doctor compares two VERSIONS (the kit installed
 * in a project against the kit this CLI was built against), which is a different question
 * from the bound of a range, and a shared half-implementation of semver is worse than two
 * four-line functions that each do one thing.
 */
export function lowerBound(range) {
  const m = /^\s*(?:\^|~|>=|=)?\s*(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)\s*(?:[<>= ].*)?$/.exec(String(range));
  return m ? m[1] : undefined;
}

/** Fields whose contents are SHIPPED to a consumer. */
export const SHIPPED_FIELDS = ['dependencies', 'optionalDependencies', 'peerDependencies'];

/** Floors. Today: the workspace has 20+ members and 2 shipped internal edges. */
export const MIN_PACKAGES = 4;
export const MIN_EDGES = 1;

/**
 * Every workspace member, as `{ dir, manifest }`, derived from pnpm-workspace.yaml globs.
 * Only the two shapes the file actually uses are supported (`dir/*` and an exact path);
 * anything else is reported rather than skipped, because a glob this cannot expand is a
 * hole in the walk.
 */
export function workspaceMembers(repoRoot = REPO) {
  const problems = [];
  const yaml = readFileSync(join(repoRoot, 'pnpm-workspace.yaml'), 'utf8');
  const globs = yaml
    .split('\n')
    .map((line) => /^\s*-\s*'([^']+)'\s*$/.exec(line)?.[1])
    .filter((g) => typeof g === 'string');
  const dirs = [];
  for (const glob of globs) {
    if (glob.endsWith('/*')) {
      const parent = join(repoRoot, glob.slice(0, -2));
      if (!existsSync(parent)) continue;
      for (const entry of readdirSync(parent, { withFileTypes: true })) {
        if (entry.isDirectory() && existsSync(join(parent, entry.name, 'package.json'))) {
          dirs.push(join(parent, entry.name));
        }
      }
    } else if (existsSync(join(repoRoot, glob, 'package.json'))) {
      dirs.push(join(repoRoot, glob));
    } else {
      problems.push(`pnpm-workspace.yaml lists ${glob}, which holds no package.json. An entry this cannot resolve is a hole in the walk.`);
    }
  }
  const members = dirs.map((dir) => ({
    dir: relative(repoRoot, dir).split(sep).join('/'),
    manifest: JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')),
  }));
  return { members, problems };
}

/**
 * Every problem with the shipped intra-workspace edges of `members`. Pure, so `--self-test`
 * drives it over fixture workspaces.
 */
export function rangeProblems(members) {
  const problems = [];
  const versionOf = new Map(members.filter((m) => m.manifest.name).map((m) => [m.manifest.name, m.manifest.version]));
  for (const { dir, manifest } of members) {
    // A PRIVATE member never publishes, so `workspace:` is the correct spelling there and
    // there is no bound to track. Derived from the manifest's own `private` field, not from
    // a list of paths: the docs site and the whole examples corpus are private, and a rule
    // that flagged them would be switched off within a week.
    if (manifest.private === true) continue;
    for (const field of SHIPPED_FIELDS) {
      for (const [dep, spec] of Object.entries(manifest[field] ?? {})) {
        const workspaceVersion = versionOf.get(dep);
        if (workspaceVersion === undefined) continue; // not an internal edge
        if (String(spec).startsWith('workspace:')) {
          problems.push(
            `${dir}/package.json: ${field}["${dep}"] is ${JSON.stringify(spec)}. A \`workspace:\` range is NOT ` +
              `publishable (npm has no such protocol and packs it verbatim, so consumers cannot install the ` +
              `tarball) and this field ships. Use ^${workspaceVersion}.`,
          );
          continue;
        }
        const bound = lowerBound(spec);
        if (bound === undefined) {
          problems.push(
            `${dir}/package.json: ${field}["${dep}"] is ${JSON.stringify(spec)}, which cannot be read as a version ` +
              `range. It must be a plain semver range tracking the workspace version (${workspaceVersion}).`,
          );
          continue;
        }
        if (bound !== workspaceVersion) {
          problems.push(
            `${dir}/package.json: ${field}["${dep}"] is ${JSON.stringify(spec)}, whose lower bound is ${bound}, but ` +
              `the ${dep} in this workspace is ${workspaceVersion}. Bump it to ^${workspaceVersion}. (A range that ` +
              `merely CONTAINS the version is not enough: a caret cannot cross a pre-1.0 minor, so a stale lower ` +
              `bound is a bound the dependency will never reach.)`,
          );
        }
      }
    }
  }
  return problems;
}

function healthProblems(members, problems) {
  const health = [];
  if (members.length < MIN_PACKAGES) {
    health.push(`discovered ${members.length} workspace package(s): a walk this small has stopped scanning.`);
  }
  let edges = 0;
  const versionOf = new Set(members.filter((m) => m.manifest.name).map((m) => m.manifest.name));
  for (const { manifest } of members) {
    if (manifest.private === true) continue; // the check skips these, so the floor must too
    for (const field of SHIPPED_FIELDS) {
      for (const dep of Object.keys(manifest[field] ?? {})) if (versionOf.has(dep)) edges += 1;
    }
  }
  if (edges < MIN_EDGES) {
    health.push(
      `found ${edges} shipped intra-workspace edge(s). This guard exists to check them, so zero means either the ` +
        `workspace stopped having internal dependencies or the discovery broke; both need a look before this passes.`,
    );
  }
  return [...health, ...problems];
}

if (process.argv.includes('--self-test')) {
  const pkg = (name, extra = {}) => ({ dir: `packages/${name}`, manifest: { name, version: '0.33.0', ...extra } });
  const probes = [
    [
      'a matching caret range passes',
      rangeProblems([pkg('a'), pkg('b', { dependencies: { a: '^0.33.0' } })]).length === 0,
    ],
    [
      'a range that CONTAINS the version but starts lower fails',
      rangeProblems([pkg('a'), pkg('b', { dependencies: { a: '^0.32.0' } })]).some((p) => p.includes('lower bound is 0.32.0')),
    ],
    [
      'a range starting ABOVE the version fails',
      rangeProblems([pkg('a'), pkg('b', { dependencies: { a: '^0.34.0' } })]).some((p) => p.includes('lower bound is 0.34.0')),
    ],
    [
      'an exact pin passes',
      rangeProblems([pkg('a'), pkg('b', { dependencies: { a: '0.33.0' } })]).length === 0,
    ],
    [
      'a workspace: range in a SHIPPED field is reported as unpublishable',
      rangeProblems([pkg('a'), pkg('b', { dependencies: { a: 'workspace:*' } })]).some((p) => p.includes('NOT publishable')),
    ],
    [
      'the same workspace: range in a devDependency is NOT reported',
      rangeProblems([pkg('a'), pkg('b', { devDependencies: { a: 'workspace:*' } })]).length === 0,
    ],
    [
      'a PRIVATE member is exempt: workspace:* is correct there, it never publishes',
      rangeProblems([pkg('a'), { dir: 'apps/docs', manifest: { name: 'docs', private: true, dependencies: { a: 'workspace:*' } } }]).length === 0,
    ],
    [
      'a private member with a stale literal is exempt too (nothing of it ships)',
      rangeProblems([pkg('a'), { dir: 'apps/docs', manifest: { name: 'docs', private: true, dependencies: { a: '^0.1.0' } } }]).length === 0,
    ],
    [
      'a dependency on a package outside the workspace is ignored',
      rangeProblems([pkg('b', { dependencies: { 'some-other-pkg': '^9.9.9' } })]).length === 0,
    ],
    [
      'peerDependencies are checked, because that field ships',
      rangeProblems([pkg('a'), pkg('b', { peerDependencies: { a: '^0.30.0' } })]).some((p) => p.includes('peerDependencies')),
    ],
    [
      'VACUITY: a workspace too small to have scanned anything',
      healthProblems([pkg('a')], []).some((p) => p.includes('has stopped scanning')),
    ],
    [
      'VACUITY: a workspace with no shipped internal edge',
      healthProblems([pkg('a'), pkg('b'), pkg('c'), pkg('d')], []).some((p) => p.includes('shipped intra-workspace edge')),
    ],
    [
      'every fault at once is still reported (the probe is not vacuous)',
      rangeProblems([pkg('a'), pkg('b', { dependencies: { a: 'workspace:*' }, peerDependencies: { a: '^0.1.0' } })]).length === 2,
    ],
  ];
  let failed = 0;
  for (const [what, ok] of probes) {
    console.log(`${ok ? '✓' : '✗'} ${what}`);
    if (!ok) failed += 1;
  }
  if (failed) {
    console.error(`\n✗ verify-workspace-ranges self-test: ${failed}/${probes.length} probe(s) misbehaved.\n`);
    process.exit(1);
  }
  console.log(`✓ verify-workspace-ranges self-test: ${probes.length} probes behave as specified.`);
  process.exit(0);
}

const { members, problems: walkProblems } = workspaceMembers();
const problems = healthProblems(members, [...walkProblems, ...rangeProblems(members)]);
if (problems.length) {
  console.error(`✗ verify-workspace-ranges: ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
const edges = members
  .filter(({ manifest }) => manifest.private !== true)
  .flatMap(({ manifest }) =>
    SHIPPED_FIELDS.flatMap((field) =>
      Object.keys(manifest[field] ?? {}).filter((dep) => members.some((m) => m.manifest.name === dep)),
    ),
  )
  .length;
console.log(
  `✓ verify-workspace-ranges: ${members.length} workspace package(s); every shipped internal edge (${edges}) is a ` +
    `publishable range whose lower bound matches the workspace.`,
);
