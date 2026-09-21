#!/usr/bin/env node
/**
 * GUARD: every PUBLISHED package carries the same npm metadata, and its
 * `repository.directory` names its own directory.
 *
 * WHY THIS EXISTS, from one measured drift. `@kitn.ai/ui` was missing BOTH
 * `repository.directory` and `engines.node` while the three packages published beside it
 * (`create-kai`, `@kitn.ai/cli`, `@kitn.ai/mcp`) carried both. Nothing noticed, because npm
 * prints neither a warning nor an error for absent metadata — it just renders a worse page and
 * skips the engine check:
 *
 *   - a missing `repository.directory` sends the npm page's Repository link to the repo ROOT
 *     instead of the package's folder, so the three tools linked into their own subdirectory and
 *     the kit did not;
 *   - a missing `engines.node` means npm prints NO `EBADENGINE` warning for a Node version that
 *     the package's own tools refuse to run on, which is the worse half: the tooling told you
 *     `>=20.19` and the library you installed said nothing.
 *
 * THE CONSISTENCY IS DERIVED BY COMPARISON, not from a typed-in list: this reads the published
 * manifests, requires each shared field to be present, and requires the values to agree with each
 * other. Only ONE assertion has an external truth beside it, and it is the one that can have one:
 * `repository.directory` must equal the package's own directory, which the walk already knows.
 *
 * PRIVATE MEMBERS ARE EXEMPT (`packages/blocks`): they never publish, so no page renders them and
 * no consumer installs them.
 *
 *   node scripts/lint-package-metadata.mjs
 *   node scripts/lint-package-metadata.mjs --self-test   # prove it still detects
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');

/**
 * Floors. A consistency check over fewer than two packages is vacuous by definition, and the
 * workspace publishes four.
 */
export const MIN_PACKAGES = 2;

/** The fields every published manifest carries, in the order a reader meets them on npm. */
export const SHARED_METADATA = [
  ['license', (pkg) => pkg.license],
  ['homepage', (pkg) => pkg.homepage],
  ['bugs.url', (pkg) => pkg.bugs?.url],
  ['repository.url', (pkg) => pkg.repository?.url],
  ['engines.node', (pkg) => pkg.engines?.node],
];

/** Every published package in the workspace, as `{ dir, pkg }`. */
export function publishedPackages(repoRoot = REPO) {
  const root = join(repoRoot, 'packages');
  const out = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifest = join(root, entry.name, 'package.json');
    if (!existsSync(manifest)) continue;
    const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
    if (pkg.private === true || typeof pkg.name !== 'string') continue;
    out.push({ dir: `packages/${entry.name}`, pkg });
  }
  return out.sort((a, b) => a.dir.localeCompare(b.dir));
}

/**
 * Every problem with `packages`. Pure, so `--self-test` drives it over fixtures.
 */
export function metadataProblems(packages) {
  const problems = [];
  if (packages.length < MIN_PACKAGES) {
    problems.push(
      `found ${packages.length} published package(s). A consistency check compares packages against each other, ` +
        `so one (or none) means the walk or the 'private' filter broke, not that the metadata is fine.`,
    );
  }
  const reference = packages[0];
  for (const { dir, pkg } of packages) {
    for (const [field, read] of SHARED_METADATA) {
      const value = read(pkg);
      if (value === undefined || value === null || value === '') {
        problems.push(
          `${dir}/package.json has no \`${field}\`. Every published package here declares it, and npm renders it ` +
            `on the package page; a missing one is a worse page and, for engines, a warning nobody gets.`,
        );
        continue;
      }
      if (reference !== undefined && reference.dir !== dir) {
        const expected = read(reference.pkg);
        if (expected !== undefined && value !== expected) {
          problems.push(
            `${dir}/package.json declares ${field} = ${JSON.stringify(value)}, but ${reference.dir} declares ` +
              `${JSON.stringify(expected)}. These are the same product's packages, so a divergence is confusion on ` +
              `the npm pages rather than a decision.`,
          );
        }
      }
    }
    const directory = pkg.repository?.directory;
    if (directory !== dir) {
      problems.push(
        `${dir}/package.json declares repository.directory = ${JSON.stringify(directory)}, but the package is at ` +
          `${dir}. The field is what makes the npm page's repository link point into the right subfolder; absent or ` +
          `wrong, it sends readers to the repo root.`,
      );
    }
  }
  return problems;
}

if (process.argv.includes('--self-test')) {
  const healthy = (name, dir, extra = {}) => ({
    dir,
    pkg: {
      name,
      license: 'MIT',
      homepage: 'https://ui.kitn.ai',
      bugs: { url: 'https://github.com/kitn-ai/ui/issues' },
      repository: { url: 'git+https://github.com/kitn-ai/ui.git', directory: dir },
      engines: { node: '>=20.19' },
      ...extra,
    },
  });
  const ui = healthy('@kitn.ai/ui', 'packages/ui');
  const mcp = healthy('@kitn.ai/mcp', 'packages/mcp');
  const probe = (packages) => metadataProblems(packages);
  const probes = [
    ['a consistent set passes', probe([ui, mcp]).length === 0],
    [
      'a missing repository.directory is reported',
      probe([ui, { ...mcp, pkg: { ...mcp.pkg, repository: { url: mcp.pkg.repository.url } } }]).some((p) =>
        p.includes('repository.directory'),
      ),
    ],
    [
      'a directory that names the WRONG folder is reported (the derived half)',
      probe([ui, { ...mcp, pkg: { ...mcp.pkg, repository: { ...mcp.pkg.repository, directory: 'packages/cli' } } }]).some(
        (p) => p.includes('but the package is at packages/mcp'),
      ),
    ],
    [
      'a missing engines.node is reported',
      probe([ui, { ...mcp, pkg: { ...mcp.pkg, engines: undefined } }]).some((p) => p.includes('no `engines.node`')),
    ],
    [
      'a missing license is reported',
      probe([ui, { ...mcp, pkg: { ...mcp.pkg, license: undefined } }]).some((p) => p.includes('no `license`')),
    ],
    [
      'a DIVERGENT homepage is reported (consistency, not just presence)',
      probe([ui, { ...mcp, pkg: { ...mcp.pkg, homepage: 'https://example.com' } }]).some((p) =>
        p.includes('declares homepage'),
      ),
    ],
    [
      'a divergent engines floor is reported',
      probe([ui, { ...mcp, pkg: { ...mcp.pkg, engines: { node: '>=22' } } }]).some((p) => p.includes('engines.node')),
    ],
    ['VACUITY: a single package is not a consistency check', probe([ui]).some((p) => p.includes('compares packages'))],
  ];
  let failed = 0;
  for (const [what, ok] of probes) {
    console.log(`${ok ? '✓' : '✗'} ${what}`);
    if (!ok) failed += 1;
  }
  if (failed) {
    console.error(`\n✗ lint-package-metadata self-test: ${failed}/${probes.length} probe(s) misbehaved.\n`);
    process.exit(1);
  }
  console.log(`✓ lint-package-metadata self-test: ${probes.length} probes behave as specified.`);
  process.exit(0);
}

const packages = publishedPackages();
const problems = metadataProblems(packages);
if (problems.length) {
  console.error(`✗ lint-package-metadata: ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(
  `✓ lint-package-metadata: ${packages.length} published package(s) carry the same metadata, and each names its own ` +
    `directory (repository.directory, engines.node ${JSON.stringify(packages[0]?.pkg.engines?.node)}).`,
);
