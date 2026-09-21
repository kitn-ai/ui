#!/usr/bin/env node
/**
 * GUARD: the kai CLI's tarball is the shape a release expects: the four built outputs and the two
 * bins are IN it, nothing from node_modules is, and it has not changed size by a STEP.
 *
 * WHY THIS EXISTS. `packages/ui/scripts/verify-pack-weight.mjs` is ui-specific and kai ships a
 * package of its own, so until now kai's 367,527 B tarball had a ceiling only by inspection. The
 * failure this is aimed at is not drift: it is a dependency copied into `dist/` (vite writes
 * `dist/node_modules` when a target stops externalising) or one of the two dev pages bundling the
 * kit's own dist instead of loading the installed package. Either doubles or triples the tarball
 * in one commit, and both are invisible to `verify:bundle-shape`, which reads the two Node bundles
 * and not the pages.
 *
 * MEASURED WHEN IT LANDED: 367,527 B packed, 1,344,784 B unpacked, 12 files, the largest being
 * `dist/mcp.es.js` at 571,983 B. The ceilings below are tripwires for an order-of-magnitude
 * blunder, not budgets: 1.5 MiB packed (4x), 4 MiB unpacked (3x), 2 MiB for any single file
 * (3.5x). The floors are the load-bearing half, because a build that produced nothing still packs
 * a package.json and "under the ceiling" is true of a tarball holding one file.
 *
 * THE LIST OF REQUIRED PATHS IS HAND-TYPED, and that is the one place this guard can rot: rename a
 * build output in config/vite/node.ts or page.ts and this fails naming the path, which is loud and
 * is the point. The four outputs are the whole shipped surface; the hashed `assets/*` files under
 * the pages are deliberately not listed, because their names carry a content hash.
 *
 * WIRED IN TWO PLACES: `prepublishOnly` (the create-kai precedent, because the tarball the
 * release is about to ship is exactly when this shape matters) and the construct leg of required
 * CI, which builds kai first.
 *
 *   node scripts/verify-pack-weight.mjs
 *   node scripts/verify-pack-weight.mjs --self-test   # prove each rule still detects
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPackEntry } from '../../../scripts/pack-listing.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(HERE, '..');

/** Every path the tarball must carry. See the header: this list is the rot surface. */
export const REQUIRED = [
  'bin/mcp.js',
  'bin/route.js',
  'dist/construct-cli.es.js',
  'dist/mcp.es.js',
  'dist/builder-page/index.html',
  'dist/theme-studio/index.html',
  'package.json',
];

/** Forbidden in the tarball, with the reason each is here. */
const FORBIDDEN = [
  // A dependency copied into the bundle directory instead of staying external: the exact
  // regression the peel removed from a browser consumer's install, one level down.
  [/node_modules/, 'node_modules'],
  // `files` negates `!bin/**/*.test.js`; a shipped test file would mean that negation broke.
  [/^bin\/.*\.test\.js$/, 'a bin test file'],
];

export const LIMITS = {
  packedCeiling: 1_572_864, // 1.5 MiB; measured 367,527 B
  packedFloor: 100_000,
  unpackedCeiling: 4_194_304, // 4 MiB; measured 1,344,784 B
  unpackedFloor: 400_000,
  fileCeiling: 2_097_152, // 2 MiB; measured largest 571,983 B
};

/**
 * Problems in one packed listing. Pure over `entry` and `files`, so `--self-test` can plant each
 * shape: the real run passes the `npm pack --json` report straight in.
 */
export function packProblems(entry, files, limits = LIMITS) {
  const problems = [];
  const paths = files.map((f) => f.path);
  for (const required of REQUIRED) {
    if (!paths.includes(required)) {
      problems.push(
        `${required} is MISSING from the tarball. If the build target or its output name moved, this list ` +
          `is the thing to update; if it built and did not pack, the \`files\` array is.`,
      );
    }
  }
  for (const file of files) {
    for (const [pattern, why] of FORBIDDEN) {
      if (pattern.test(file.path)) {
        problems.push(`${file.path} is in the tarball (${why}). Nothing here may ship that.`);
      }
    }
    if (file.size > limits.fileCeiling) {
      problems.push(
        `${file.path} is ${file.size} B, over the ${limits.fileCeiling} B per-file ceiling. Something ` +
          `started being bundled INTO a single output: look at what the build externalises.`,
      );
    }
  }
  const unpacked = files.reduce((sum, f) => sum + f.size, 0);
  if (unpacked < limits.unpackedFloor) {
    problems.push(`the tarball unpacks to ${unpacked} B, under the ${limits.unpackedFloor} B floor: it packed (almost) nothing.`);
  }
  if (unpacked > limits.unpackedCeiling) {
    problems.push(
      `the unpacked size is ${unpacked} B, over the ${limits.unpackedCeiling} B ceiling: a step, not drift. ` +
        `Check for a dependency copied into dist/ and for a dev page that started bundling the kit.`,
    );
  }
  if (typeof entry.size === 'number') {
    if (entry.size < limits.packedFloor) {
      problems.push(`the tarball is ${entry.size} B, under the ${limits.packedFloor} B floor.`);
    }
    if (entry.size > limits.packedCeiling) {
      problems.push(`the tarball is ${entry.size} B, over the ${limits.packedCeiling} B ceiling.`);
    }
  }
  return problems;
}

if (process.argv.includes('--self-test')) {
  const HEALTHY = [
    { path: 'bin/mcp.js', size: 1_622 },
    { path: 'bin/route.js', size: 1_109 },
    { path: 'dist/mcp.es.js', size: 571_983 },
    { path: 'dist/construct-cli.es.js', size: 140_294 },
    { path: 'dist/builder-page/index.html', size: 930 },
    { path: 'dist/builder-page/assets/index-abc.js', size: 261_583 },
    { path: 'dist/theme-studio/index.html', size: 722 },
    { path: 'dist/theme-studio/assets/index-def.js', size: 206_815 },
    { path: 'package.json', size: 1_846 },
  ];
  const healthyEntry = { size: 367_527 };
  const withFile = (file) => [...HEALTHY, file];
  const drop = (path) => HEALTHY.filter((f) => f.path !== path);
  const big = (path, size) => HEALTHY.map((f) => (f.path === path ? { ...f, size } : f));
  const probes = [
    ['a healthy tarball passes', packProblems(healthyEntry, HEALTHY).length === 0],
    [
      'a missing bundle is reported by name',
      packProblems(healthyEntry, drop('dist/construct-cli.es.js')).some((p) => p.includes('dist/construct-cli.es.js is MISSING')),
    ],
    [
      'a missing DEV PAGE is reported (verify:bundle-shape does not look at the pages)',
      packProblems(healthyEntry, drop('dist/theme-studio/index.html')).some((p) => p.includes('dist/theme-studio/index.html is MISSING')),
    ],
    [
      'a copied dependency is reported',
      packProblems(healthyEntry, withFile({ path: 'dist/node_modules/zod/index.js', size: 10 })).some((p) => p.includes('node_modules')),
    ],
    [
      'a shipped bin test file is reported',
      packProblems(healthyEntry, withFile({ path: 'bin/route.test.js', size: 10 })).some((p) => p.includes('bin/route.test.js')),
    ],
    [
      'one file over the per-file ceiling is reported',
      packProblems(healthyEntry, big('dist/mcp.es.js', LIMITS.fileCeiling + 1)).some((p) => p.includes('per-file ceiling')),
    ],
    [
      'a total over the unpacked ceiling is reported even when every file is under its own',
      packProblems(healthyEntry, [
        ...HEALTHY,
        { path: 'dist/big-1.js', size: LIMITS.fileCeiling - 1 },
        { path: 'dist/big-2.js', size: LIMITS.fileCeiling - 1 },
        { path: 'dist/big-3.js', size: LIMITS.fileCeiling - 1 },
      ]).some((p) => p.includes('over the') && p.includes('unpacked')),
    ],
    [
      'a tarball under the floor is reported (a pack of nothing still packs package.json)',
      packProblems({ size: 10 }, [{ path: 'package.json', size: 10 }]).some((p) => p.includes('floor')),
    ],
    [
      'a tarball over the packed ceiling is reported',
      packProblems({ size: LIMITS.packedCeiling + 1 }, HEALTHY).some((p) => p.includes('over the') && p.includes('tarball')),
    ],
    [
      'the rules are independent: a copied dependency and a missing bundle are both reported',
      (() => {
        const found = packProblems(healthyEntry, [
          ...drop('dist/mcp.es.js'),
          { path: 'dist/node_modules/zod/index.js', size: 10 },
        ]);
        return found.some((p) => p.includes('dist/mcp.es.js is MISSING')) && found.some((p) => p.includes('node_modules'));
      })(),
    ],
  ];
  let failed = 0;
  for (const [what, ok] of probes) {
    console.log(`${ok ? '✓' : '✗'} ${what}`);
    if (!ok) failed += 1;
  }
  if (failed) {
    console.error(`\n✗ verify-pack-weight self-test: ${failed}/${probes.length} probe(s) misbehaved.\n`);
    process.exit(1);
  }
  console.log(`✓ verify-pack-weight self-test: ${probes.length} probes behave as specified.`);
  process.exit(0);
}

if (!existsSync(join(PKG, 'dist', 'mcp.es.js'))) {
  console.error(`✗ verify-pack-weight: ${join(PKG, 'dist', 'mcp.es.js')} is missing. Run \`npm run build\` in packages/kai first.`);
  process.exit(1);
}

const npmVersion = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim();
const destination = mkdtempSync(join(tmpdir(), 'kai-pack-'));
let entry;
let writtenBytes;
try {
  // `--no-dry-run` IS LOAD-BEARING, and it is what running this from prepublishOnly taught.
  // A nested `npm pack` INHERITS npm_config_dry_run from the `npm publish --dry-run` that invoked
  // this hook, and then writes NO tarball while still reporting `files`, `size` and `unpackedSize`:
  // measured, `npm_config_dry_run=1 node scripts/verify-pack-weight.mjs` fails on the statSync
  // below with ENOENT. DRY RUN IS A PROPERTY OF THE PUBLISH, not of this inspection, so the child
  // is told explicitly to produce the tarball; the flag is a no-op outside a dry run, and the
  // file lands in a temp directory that is deleted either way.
  const raw = execFileSync('npm', ['pack', '--json', '--no-dry-run', '--pack-destination', destination], {
    cwd: PKG,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
  ({ entry } = readPackEntry(raw, { npmVersion }));
  // The packer's own number against the file it wrote. Independent reads, so a `size` npm stopped
  // reporting (or reported for something else) fails here instead of silently skipping the
  // ceilings above.
  writtenBytes = typeof entry.size === 'number' ? statSync(join(destination, entry.filename)).size : -1;
} finally {
  rmSync(destination, { recursive: true, force: true });
}

const files = entry.files.map((f) => ({ path: f.path, size: f.size }));
const problems = packProblems(entry, files);
if (writtenBytes === -1) {
  problems.push(
    `npm pack reported no numeric \`size\` for the tarball (${JSON.stringify(entry.size)}), so the packed ` +
      `ceilings were not applied.`,
  );
} else if (writtenBytes !== entry.size) {
  problems.push(
    `npm pack reported ${entry.size} B for ${entry.filename}, but the file it wrote is ${writtenBytes} B. ` +
      `The packed ceilings are read off the report, so a discrepancy here means they grade the wrong number.`,
  );
}

if (problems.length) {
  console.error(`✗ verify-pack-weight: ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
const largest = files.reduce((a, b) => (b.size > a.size ? b : a));
console.log(
  `✓ verify-pack-weight: ${entry.size} B packed / ${files.reduce((s, f) => s + f.size, 0)} B unpacked, ` +
    `${files.length} files, largest ${largest.path} ${largest.size} B (npm ${npmVersion}); the tarball on disk matches the report.`,
);
