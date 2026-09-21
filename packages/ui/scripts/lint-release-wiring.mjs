// GUARD -- the release wiring for every PUBLISHED package, derived from the packages
// themselves rather than from the lists that describe them.
//
// WHY THIS EXISTS, and it is not hypothetical. This repo publishes from three different
// places, and every one of them is a hand-typed literal:
//
//   1. `release-please-config.json`'s `packages{}` map -- which packages get a release PR
//      at all.
//   2. `.release-please-manifest.json` -- the version each of those is at.
//   3. the publish loop in `.github/workflows/release-please.yml` (`for pkg in ...`) --
//      which packages actually get `npm publish`ed.
//
// `docs/coupling-map.md` §1 files each of those under **NOTHING**: a package added to one
// and forgotten in another is either never released or never published, silently, and the
// only way it was found before was by remembering. It happened to be found that way when
// `@kitn.ai/kai` was added: three literals, hand-edited, with a publish ORDER that had to
// put kai after the kit it depends on -- an invariant nothing expressed.
//
// So this derives the published set from `packages/*/package.json` (`private !== true`) and
// checks all three literals against it, in BOTH directions: a package missing from a list is
// named, and an entry in a list that names no package, or a private one, is named too.
//
// THE ORDER CHECK IS THE ONE NOBODY COULD HAVE TYPED. The publish loop runs under `bash -e`,
// so a package that needs an earlier one's tarball to be on the registry must come later.
// "Needs an earlier one" is derivable: a `dependency` that names a workspace package. The
// rule is checked as a POSITION invariant, so it holds however the loop is rewritten.
//
// AND THE TWO WAYS A PUBLISH SHIPS NOTHING, which npm does not warn about:
//   - no pre-publish hook (`prepublishOnly` / `prepack` / `prepare`). npm never builds
//     anything itself; `files` pointing at a gitignored `dist/` with no hook packs a tarball
//     with no code in it and exits 0.
//   - a `bin` entry whose file is not there, which npm ships as a broken command.
//
//   node scripts/lint-release-wiring.mjs
//   node scripts/lint-release-wiring.mjs --self-test   # prove every check still fires
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// This file is packages/ui/scripts/<name>, so the repo root is THREE levels up. (Getting
// this wrong reads packages/ as the root and the derivation silently finds nothing.)
const REPO = resolve(HERE, '../../..');

/** npm's pre-pack hooks, in npm's own vocabulary. Anything else builds nothing. */
export const PREPACK_HOOKS = ['prepublishOnly', 'prepack', 'prepare'];

/**
 * Where a package's BUILD OUTPUT lives. A `bin` under one of these is expected to be absent
 * before a build -- this lint runs in the pre-build leg, and create-kai's `dist/index.js`
 * failing that check is exactly how this constant came to exist. The pre-pack hook is what
 * has to produce it, and that is checked separately.
 */
export const BUILD_OUTPUT_PREFIXES = ['dist/'];

/** The published subset of packages/*, derived from the tree. */
export function publishedPackages(repoRoot = REPO) {
  const dir = join(repoRoot, 'packages');
  const out = [];
  for (const name of readdirSync(dir)) {
    const manifest = join(dir, name, 'package.json');
    if (!existsSync(manifest)) continue;
    const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
    if (pkg.private === true) continue;
    out.push({ dir: `packages/${name}`, name: pkg.name, version: pkg.version, manifest, pkg });
  }
  return out.sort((a, b) => a.dir.localeCompare(b.dir));
}

/** `for pkg in a b c; do` -> ['a','b','c'], or null when the loop is gone. */
export function publishLoopPackages(workflowText) {
  const m = /for\s+pkg\s+in\s+([^;\n]+);\s*do/.exec(workflowText);
  if (!m) return null;
  return m[1].trim().split(/\s+/).filter(Boolean);
}

/**
 * Every problem with the release wiring of `packages`, given the three literals.
 * Pure, so the self-test drives it with synthetic packages and literals.
 */
export function releaseWiringProblems({ packages, configPackages, manifest, loop, repoRoot = REPO }) {
  const problems = [];
  const byDir = new Map(packages.map((p) => [p.dir, p]));
  const byName = new Map(packages.map((p) => [p.name, p]));

  if (loop === null) {
    problems.push(
      'could not find the publish loop (`for pkg in ...; do`) in .github/workflows/release-please.yml. ' +
        'If the loop was restructured, teach this guard the new shape rather than deleting the check -- ' +
        'a package the loop does not name is never published and nothing says so.',
    );
  }

  for (const p of packages) {
    // 1. release-please: without a config entry there is no release PR at all.
    const entry = configPackages?.[p.dir];
    if (!entry) {
      problems.push(`${p.dir} (${p.name}) is not in release-please-config.json's packages{}, so it never gets a release PR.`);
    } else {
      if (entry['package-name'] !== p.name) {
        problems.push(
          `${p.dir}: release-please-config.json says package-name ${JSON.stringify(entry['package-name'])}, the manifest says ${JSON.stringify(p.name)}.`,
        );
      }
      if (!entry['release-type']) problems.push(`${p.dir}: release-please-config.json has no release-type.`);
    }

    // 2. the version manifest: bootstrap re-arms if a package is missing from it.
    if (!(p.dir in (manifest ?? {}))) {
      problems.push(`${p.dir} (${p.name}) is not in .release-please-manifest.json, so release-please bootstraps it instead of tracking its version.`);
    } else if (manifest[p.dir] !== p.version) {
      problems.push(`${p.dir}: the manifest says ${manifest[p.dir]}, the package says ${p.version}.`);
    }

    // 3. the publish loop.
    if (loop !== null && !loop.includes(p.dir)) {
      problems.push(`${p.dir} (${p.name}) is not in the publish loop, so it is never published.`);
    }

    // 4. the two ways a publish ships nothing.
    const hooks = PREPACK_HOOKS.filter((h) => p.pkg.scripts?.[h]);
    if (hooks.length === 0) {
      problems.push(
        `${p.dir} has no pre-publish build hook (${PREPACK_HOOKS.join(' / ')}). npm builds nothing itself, so a ` +
          `\`files\` entry pointing at a gitignored dist/ packs a tarball with no code in it and exits 0.`,
      );
    }
    if (!p.pkg.files || p.pkg.files.length === 0) {
      problems.push(`${p.dir} has no \`files\` array, so npm packs the whole package directory.`);
    }
    for (const [bin, target] of Object.entries(p.pkg.bin ?? {})) {
      const rel = target.replace(/^\.\//, '');
      // `files` must cover the bin, or npm ships a command with no file behind it.
      const covered = (p.pkg.files ?? []).some((f) => {
        const entry = String(f).replace(/^!/, '').replace(/\/$/, '');
        return rel === entry || rel.startsWith(`${entry}/`);
      });
      if (!covered) {
        problems.push(`${p.dir}: bin ${bin} -> ${target}, which its \`files\` array does not cover, so npm ships a command with no file behind it.`);
      }
      // A bin under a build-output directory is EXPECTED to be missing before a build --
      // this lint runs in the pre-build leg, where create-kai's dist/ does not exist yet.
      // That case is covered by the pre-pack-hook check above instead: something has to
      // produce it. A bin anywhere else is a committed file, and must be there.
      const isBuildOutput = BUILD_OUTPUT_PREFIXES.some((prefix) => rel.startsWith(prefix));
      if (!isBuildOutput && !existsSync(join(repoRoot, p.dir, target))) {
        problems.push(`${p.dir}: bin ${bin} -> ${target}, which is not a build output and does not exist (a broken command on install).`);
      }
    }
  }

  // 5. ORDER: a package that depends on another PUBLISHED one must be published after it.
  if (loop !== null) {
    for (const p of packages) {
      const position = loop.indexOf(p.dir);
      if (position === -1) continue;
      for (const [dep, range] of Object.entries(p.pkg.dependencies ?? {})) {
        const needed = byName.get(dep);
        if (!needed) continue;
        const depPosition = loop.indexOf(needed.dir);
        if (depPosition === -1 || depPosition < position) continue;
        problems.push(
          `${p.dir} depends on ${dep} (${range}) but is published at loop position ${position}, before it at ${depPosition}. ` +
            `The loop runs under \`bash -e\`, so a consumer of the earlier tarball cannot resolve a version that does not exist yet.`,
        );
      }
    }
  }

  // 6. The other direction: a literal naming a directory that is not a published package.
  for (const key of Object.keys(configPackages ?? {})) {
    if (!byDir.has(key)) {
      problems.push(`release-please-config.json's packages{} names ${key}, which is not a published package under packages/.`);
    }
  }
  for (const key of Object.keys(manifest ?? {})) {
    if (!byDir.has(key)) problems.push(`.release-please-manifest.json names ${key}, which is not a published package under packages/.`);
  }
  for (const dir of loop ?? []) {
    if (!byDir.has(dir)) {
      problems.push(`the publish loop names ${dir}, which is not a published package under packages/ (a private package listed here would be published).`);
    }
  }

  return problems;
}

// ── self-test ────────────────────────────────────────────────────────────────
if (process.argv.includes('--self-test')) {
  const ui = {
    dir: 'packages/ui',
    name: '@kitn.ai/ui',
    version: '1.2.3',
    manifest: '/tmp/nonexistent-package.json',
    pkg: { name: '@kitn.ai/ui', version: '1.2.3', scripts: { prepublishOnly: 'npm run build' }, files: ['dist'], bin: {} },
  };
  const kai = {
    dir: 'packages/kai',
    name: '@kitn.ai/kai',
    version: '0.1.0',
    manifest: '/tmp/nonexistent-package.json',
    pkg: {
      name: '@kitn.ai/kai',
      version: '0.1.0',
      scripts: { prepublishOnly: 'npm run build' },
      files: ['dist', 'bin'],
      bin: { kai: './bin/mcp.js' },
      dependencies: { '@kitn.ai/ui': '^1.2.3' },
    },
  };
  const good = {
    packages: [ui, kai],
    configPackages: { 'packages/ui': { 'release-type': 'node', 'package-name': '@kitn.ai/ui' }, 'packages/kai': { 'release-type': 'node', 'package-name': '@kitn.ai/kai' } },
    manifest: { 'packages/ui': '1.2.3', 'packages/kai': '0.1.0' },
    loop: ['packages/ui', 'packages/kai'],
    // The bin check reads the real tree, so point it at a path that exists for the probe.
    repoRoot: REPO,
  };
  const fires = (mutate, needle) => {
    const input = { ...good, ...mutate() };
    return releaseWiringProblems(input).some((p) => p.includes(needle));
  };

  const probes = [
    ['a correct wiring has no problems', releaseWiringProblems({ ...good, repoRoot: REPO }).length === 0],
    ['a package missing from release-please-config is reported', fires(() => ({ configPackages: { 'packages/ui': good.configPackages['packages/ui'] } }), 'never gets a release PR')],
    ['a package missing from the version manifest is reported', fires(() => ({ manifest: { 'packages/ui': '1.2.3' } }), 'bootstraps it')],
    ['a version drift between manifest and package is reported', fires(() => ({ manifest: { 'packages/ui': '1.2.3', 'packages/kai': '0.9.9' } }), 'the manifest says 0.9.9')],
    ['a package missing from the publish loop is reported', fires(() => ({ loop: ['packages/ui'] }), 'never published')],
    ['a dependency published BEFORE its dependency is reported', fires(() => ({ loop: ['packages/kai', 'packages/ui'] }), 'before it at')],
    ['a missing pre-publish hook is reported', () => releaseWiringProblems({ ...good, packages: [{ ...ui, pkg: { ...ui.pkg, scripts: {} } }], repoRoot: REPO }).some((p) => p.includes('no pre-publish build hook'))],
    ['a missing files array is reported', () => releaseWiringProblems({ ...good, packages: [{ ...ui, pkg: { ...ui.pkg, files: [] } }], repoRoot: REPO }).some((p) => p.includes('no `files` array'))],
    [
      'a bin that is NOT a build output and is missing is reported',
      () =>
        releaseWiringProblems({
          ...good,
          packages: [{ ...kai, pkg: { ...kai.pkg, bin: { kai: './bin/not-there.js' } } }],
          repoRoot: REPO,
        }).some((p) => p.includes('is not a build output and does not exist')),
    ],
    [
      'a bin under dist/ that does not exist yet is NOT reported (the pre-build leg has no dist)',
      () =>
        releaseWiringProblems({
          ...good,
          packages: [{ ...kai, pkg: { ...kai.pkg, bin: { kai: './dist/mcp.js' } } }],
          repoRoot: REPO,
        }).length === 0,
    ],
    [
      'a bin its files array does not cover is reported',
      () =>
        releaseWiringProblems({
          ...good,
          packages: [{ ...kai, pkg: { ...kai.pkg, files: ['dist'], bin: { kai: './bin/mcp.js' } } }],
          repoRoot: REPO,
        }).some((p) => p.includes('does not cover')),
    ],
    ['a config entry naming no package is reported', fires(() => ({ configPackages: { ...good.configPackages, 'packages/gone': { 'release-type': 'node', 'package-name': 'x' } } }), 'is not a published package')],
    ['a manifest entry naming no package is reported', fires(() => ({ manifest: { ...good.manifest, 'packages/gone': '1.0.0' } }), 'is not a published package')],
    ['a publish loop naming no package is reported', fires(() => ({ loop: ['packages/ui', 'packages/kai', 'packages/gone'] }), 'a private package listed here would be published')],
    ['a package-name mismatch is reported', fires(() => ({ configPackages: { ...good.configPackages, 'packages/kai': { 'release-type': 'node', 'package-name': '@kitn.ai/wrong' } } }), 'package-name')],
  ];

  let failed = 0;
  for (const [what, ok] of probes) {
    console.log(`${ok ? '✓' : '✗'} ${what}`);
    if (!ok) failed++;
  }
  if (failed) {
    console.error(`\n✗ lint-release-wiring self-test: ${failed}/${probes.length} probe(s) misbehaved.\n`);
    process.exit(1);
  }
  console.log(`✓ lint-release-wiring self-test: ${probes.length} probes behave as specified.`);
  process.exit(0);
}

// ── the real run ─────────────────────────────────────────────────────────────
// Only when this file IS the entry point, in the repo's required form: importing it (a probe,
// a test) must not run the check and exit the process out from under the caller, and the
// NEGATED spelling of this test (`argv[1] !== fileURLToPath(import.meta.url)`) is FALSE on a
// path containing a space -- `tests/scripts/main-module-guards.test.ts` catches exactly that,
// and caught this.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {

const packages = publishedPackages();
const config = JSON.parse(readFileSync(join(REPO, 'release-please-config.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(join(REPO, '.release-please-manifest.json'), 'utf8'));
const workflow = readFileSync(join(REPO, '.github/workflows/release-please.yml'), 'utf8');
const loop = publishLoopPackages(workflow);

// Anti-vacuity: a derived set of zero or one package would make every check below pass.
if (packages.length < 3) {
  console.error(
    `✗ lint-release-wiring: only ${packages.length} published package(s) found under packages/. ` +
      `Either the derivation is wrong or packages were deleted; both need a look before this can pass.`,
  );
  process.exit(1);
}

const problems = releaseWiringProblems({ packages, configPackages: config.packages, manifest, loop });

if (problems.length) {
  console.error(`✗ lint-release-wiring: ${problems.length} problem(s) with the release wiring:`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error(
    `\n  These three literals are hand-typed and NOTHING else reads them: release-please-config.json's packages{},\n` +
      `  .release-please-manifest.json, and the publish loop in release-please.yml. Fix them together.`,
  );
  process.exit(1);
}
console.log(
  `✓ lint-release-wiring: ${packages.length} published package(s) (${packages.map((p) => p.name).join(', ')}) agree with ` +
    `release-please-config.json, .release-please-manifest.json and the publish loop (${(loop ?? []).join(' -> ')}).`,
);
}
