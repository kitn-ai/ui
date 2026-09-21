#!/usr/bin/env node
/**
 * GUARD: the MCP package's tarball is the shape a release expects: the bundle and the bin
 * are IN it, nothing from node_modules is, and it has not changed size by a STEP.
 *
 * WHY THIS IS NOT THE CLI'S GUARD. The two packages split so that the MCP SDK (5.9 MB
 * installed, 17 direct deps) is installed only by harness configs, and this package is now
 * the only one that carries it. Its tarball is therefore small and its failure modes are
 * its own: a dependency copied into `dist/` (vite writes `dist/node_modules` when a target
 * stops externalising), or the SDK bundled in.
 *
 * THE LIMITS ARE TRIPWIRES, NOT BUDGETS (see verify-bundle-shape.mjs for the measurement:
 * inlining the SDK moves the bundle +45 KB, so a size ceiling is not what catches it). The
 * FLOORS are the load-bearing half, because a build that produced nothing still packs a
 * package.json.
 *
 * WIRED IN TWO PLACES: `prepublishOnly` (the create-kai precedent, because the tarball the
 * release is about to ship is exactly when this shape matters) and the construct leg of
 * required CI, which builds this package first.
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
export const REQUIRED = ['bin/kai-mcp.js', 'dist/mcp.es.js', 'package.json'];

/** Forbidden in the tarball, with the reason each is here. */
const FORBIDDEN = [
  // A dependency copied into the bundle directory instead of staying external: the exact
  // regression the split removed from a CLI install, one level down.
  [/node_modules/, 'node_modules'],
  // `files` negates `!bin/**/*.test.js`; a shipped test file would mean that negation broke.
  [/^bin\/.*\.test\.js$/, 'a bin test file'],
];

export const LIMITS = {
  packedCeiling: 1_048_576, // 1 MiB; measured 163,082 B
  packedFloor: 60_000,
  unpackedCeiling: 2_097_152, // 2 MiB; measured 575,511 B
  unpackedFloor: 200_000,
  fileCeiling: 1_048_576, // 1 MiB; measured largest 572,003 B
};

/**
 * Problems in one packed listing. Pure over `entry` and `files`, so `--self-test` can plant
 * each shape: the real run passes the `npm pack --json` report straight in.
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
        `${file.path} is ${file.size} B, over the ${limits.fileCeiling} B per-file ceiling. Something started being ` +
          `bundled INTO a single output: look at what config/vite/node.ts externalises.`,
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
        `Check for a dependency copied into dist/ and for the SDK being inlined.`,
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
    { path: 'bin/kai-mcp.js', size: 1_700 },
    { path: 'dist/mcp.es.js', size: 572_451 },
    { path: 'package.json', size: 1_500 },
  ];
  const healthyEntry = { size: 163_082 };
  const withFile = (file) => [...HEALTHY, file];
  const drop = (path) => HEALTHY.filter((f) => f.path !== path);
  const big = (path, size) => HEALTHY.map((f) => (f.path === path ? { ...f, size } : f));
  const probes = [
    ['a healthy tarball passes', packProblems(healthyEntry, HEALTHY).length === 0],
    [
      'a missing bundle is reported by name',
      packProblems(healthyEntry, drop('dist/mcp.es.js')).some((p) => p.includes('dist/mcp.es.js is MISSING')),
    ],
    [
      'a missing bin is reported (the package would install with no command)',
      packProblems(healthyEntry, drop('bin/kai-mcp.js')).some((p) => p.includes('bin/kai-mcp.js is MISSING')),
    ],
    [
      'a copied dependency is reported',
      packProblems(healthyEntry, withFile({ path: 'dist/node_modules/zod/index.js', size: 10 })).some((p) => p.includes('node_modules')),
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
  console.error(`✗ verify-pack-weight: ${join(PKG, 'dist', 'mcp.es.js')} is missing. Run \`npm run build\` in packages/mcp first.`);
  process.exit(1);
}

const npmVersion = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim();
const destination = mkdtempSync(join(tmpdir(), 'mcp-pack-'));
let entry;
let writtenBytes;
try {
  // `--no-dry-run` IS LOAD-BEARING: a nested `npm pack` INHERITS npm_config_dry_run from
  // the `npm publish --dry-run` that invoked this through prepublishOnly, and then writes
  // NO tarball while still reporting `files`/`size` (measured). A dry run is a property of
  // the publish, not of this inspection.
  const raw = execFileSync('npm', ['pack', '--json', '--no-dry-run', '--pack-destination', destination], {
    cwd: PKG,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
  ({ entry } = readPackEntry(raw, { npmVersion }));
  writtenBytes = typeof entry.size === 'number' ? statSync(join(destination, entry.filename)).size : -1;
} finally {
  rmSync(destination, { recursive: true, force: true });
}

const files = entry.files.map((f) => ({ path: f.path, size: f.size }));
const problems = packProblems(entry, files);
if (writtenBytes === -1) {
  problems.push(
    `npm pack reported no numeric \`size\` for the tarball (${JSON.stringify(entry.size)}), so the packed ceilings ` +
      `were not applied.`,
  );
} else if (writtenBytes !== entry.size) {
  problems.push(
    `npm pack reported ${entry.size} B for ${entry.filename}, but the file it wrote is ${writtenBytes} B. The packed ` +
      `ceilings are read off the report, so a discrepancy here means they grade the wrong number.`,
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
