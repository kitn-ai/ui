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
// the dev-tooling package was added: three literals, hand-edited, with a publish ORDER that had to
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
// AND THE THIRD WAY, WHICH IS THE LOOP'S OWN SKIP PATH. The loop skips a name@version the
// registry already has, and a skipped publish runs NO pre-publish hook -- so on a release
// that does not bump a package, nothing builds its `dist/`. That is only a problem for the
// packages that come after it, whose OWN builds resolve it: create-kai, mcp and cli each
// import `@kitn.ai/ui/<subpath>` at build time, and a `workspace:` link resolves that into
// `packages/ui/dist`. On the 0.4.0 release (2026-09-22) ui@0.35.0 was already published, the
// loop skipped it, and create-kai's build died with
//   Cannot find module '.../create-kai/node_modules/@kitn.ai/ui/dist/construct.js'
// after the publish gate and `--frozen-lockfile` install had both passed. So: every published
// package that another published package BUILDS AGAINST must be BUILT before the loop, and
// that is checked below rather than left to a comment.
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

/** The publish loop, matched in both readers below so they cannot disagree. */
const PUBLISH_LOOP = /for\s+pkg\s+in\s+([^;\n]+);\s*do/;

/** `for pkg in a b c; do` -> ['a','b','c'], or null when the loop is gone. */
export function publishLoopPackages(workflowText) {
  const m = PUBLISH_LOOP.exec(workflowText);
  if (!m) return null;
  return m[1].trim().split(/\s+/).filter(Boolean);
}

/**
 * Everything in the release job BEFORE the publish loop. That is where a build has to be:
 * the loop is the thing whose skip check strands a later package's build, so a build placed
 * after the loop cannot help whoever is skipped, and a build placed inside it is the
 * `prepublishOnly` that already failed to run.
 */
export function textBeforePublishLoop(workflowText) {
  const m = PUBLISH_LOOP.exec(workflowText);
  return m ? workflowText.slice(0, m.index) : null;
}

/**
 * Published packages that ANOTHER published package BUILDS AGAINST. The derivable signal is
 * `devDependencies`: a dev dependency is resolved into a build by construction, which is why
 * release-please's `node-workspace` plugin counts it and treats peerDependencies as opt-in.
 *
 * `dependencies` is deliberately NOT a signal, and the live instance is why: `@kitn.ai/cli`
 * depends on `create-kai` at RUNTIME -- it forwards the verbs by resolving that package's bin
 * and spawning it -- and nothing under `packages/cli/config` or `packages/cli/src` imports it,
 * so cli's build never reads create-kai's `dist/`. Counting runtime edges here would demand a
 * pre-loop build of create-kai that nothing needs. (The same reasoning is what makes
 * `@kitn.ai/mcp`'s runtime edge to the kit harmless: its build EXTERNALISES the kit specifier,
 * and the kit is a devDependency of create-kai and cli anyway, so it is still built.)
 *
 * These are the packages whose `dist/` has to exist BEFORE the loop runs, because the loop's
 * skip path runs no pre-publish hook. `create-kai`'s `"@kitn.ai/ui": "workspace:*"` is that
 * edge, and it is how the 0.4.0 release died.
 */
export function buildInputPackages(packages) {
  const byName = new Map(packages.map((p) => [p.name, p]));
  const out = new Map();
  for (const p of packages) {
    for (const dep of Object.keys(p.pkg.devDependencies ?? {})) {
      const target = byName.get(dep);
      if (target && target.dir !== p.dir) out.set(target.dir, target);
    }
  }
  return [...out.values()].sort((a, b) => a.dir.localeCompare(b.dir));
}

/**
 * The accepted spellings of "build this workspace package", all three in use in this repo:
 * `pnpm exec nx build ui` (test.yml's build leg), `pnpm --filter <name> run build`, and
 * `npm --prefix <dir> run build`. A fourth spelling is a failure by design, and the message
 * names the accepted three so the fix is one line -- the same trade `lint:gate-parity` makes
 * in reading these files with a narrow reader instead of a YAML parser.
 */
export function buildSpellings(p) {
  return [
    `nx build ${p.dir.split('/').pop()}`,
    `--filter ${p.name} run build`,
    `--prefix ${p.dir} run build`,
  ];
}

/**
 * Every problem with the release wiring of `packages`, given the three literals.
 * Pure, so the self-test drives it with synthetic packages and literals.
 */
export function releaseWiringProblems({ packages, configPackages, manifest, loop, preLoop, repoRoot = REPO }) {
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

  // 6. THE LOOP'S SKIP PATH BUILDS NOTHING, so a package the loop builds against has to be
  // built before the loop. Skipped when the caller did not ask (a synthetic probe), and the
  // real run passes it alongside `loop`.
  if (preLoop != null) {
    for (const p of buildInputPackages(packages)) {
      const spellings = buildSpellings(p);
      if (spellings.some((s) => preLoop.includes(s))) continue;
      problems.push(
        `${p.dir} (${p.name}) is a build input for another published package, but nothing BUILDS it ` +
          `before the publish loop. The loop skips a name@version already on the registry, and a skipped ` +
          `publish runs no prepublishOnly, so on a release that does not bump ${p.name} its dist/ never ` +
          `exists and the later package's own build fails with ERR_MODULE_NOT_FOUND (create-kai@0.8.0, ` +
          `2026-09-22). Add a step before the loop that builds it; accepted spellings: ` +
          spellings.map((s) => `\`${s}\``).join(', ') +
          `.`,
      );
    }
  }

  // 7. The other direction: a literal naming a directory that is not a published package.
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
  const mcp = {
    dir: 'packages/mcp',
    name: '@kitn.ai/mcp',
    version: '0.1.0',
    manifest: '/tmp/nonexistent-package.json',
    pkg: {
      name: '@kitn.ai/mcp',
      version: '0.1.0',
      scripts: { prepublishOnly: 'npm run build' },
      files: ['dist', 'bin'],
      bin: { 'kai-mcp': './bin/kai-mcp.js' },
      // Both edges mirror the real tree, and each feeds a different rule: the runtime
      // `dependencies` entry is what the ORDER check reads (mcp must publish after ui), and the
      // `devDependencies` entry is what the BUILD-INPUT check reads (a dev dependency is
      // resolved into a build). In the real tree that dev edge is create-kai's and cli's.
      dependencies: { '@kitn.ai/ui': '^1.2.3' },
      devDependencies: { '@kitn.ai/ui': '^1.2.3' },
    },
  };
  const good = {
    packages: [ui, mcp],
    configPackages: { 'packages/ui': { 'release-type': 'node', 'package-name': '@kitn.ai/ui' }, 'packages/mcp': { 'release-type': 'node', 'package-name': '@kitn.ai/mcp' } },
    manifest: { 'packages/ui': '1.2.3', 'packages/mcp': '0.1.0' },
    loop: ['packages/ui', 'packages/mcp'],
    // mcp depends on @kitn.ai/ui, so ui is a build input and needs a pre-loop build.
    preLoop: 'pnpm exec nx build ui\n',
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
    ['a version drift between manifest and package is reported', fires(() => ({ manifest: { 'packages/ui': '1.2.3', 'packages/mcp': '0.9.9' } }), 'the manifest says 0.9.9')],
    ['a package missing from the publish loop is reported', fires(() => ({ loop: ['packages/ui'] }), 'never published')],
    ['a dependency published BEFORE its dependency is reported', fires(() => ({ loop: ['packages/mcp', 'packages/ui'] }), 'before it at')],
    ['a missing pre-publish hook is reported', () => releaseWiringProblems({ ...good, packages: [{ ...ui, pkg: { ...ui.pkg, scripts: {} } }], repoRoot: REPO }).some((p) => p.includes('no pre-publish build hook'))],
    ['a missing files array is reported', () => releaseWiringProblems({ ...good, packages: [{ ...ui, pkg: { ...ui.pkg, files: [] } }], repoRoot: REPO }).some((p) => p.includes('no `files` array'))],
    [
      'a bin that is NOT a build output and is missing is reported',
      () =>
        releaseWiringProblems({
          ...good,
          packages: [{ ...mcp, pkg: { ...mcp.pkg, bin: { 'kai-mcp': './bin/not-there.js' } } }],
          repoRoot: REPO,
        }).some((p) => p.includes('is not a build output and does not exist')),
    ],
    [
      'a bin under dist/ that does not exist yet is NOT reported (the pre-build leg has no dist)',
      () =>
        releaseWiringProblems({
          ...good,
          packages: [{ ...mcp, pkg: { ...mcp.pkg, bin: { 'kai-mcp': './dist/mcp.js' } } }],
          repoRoot: REPO,
        }).length === 0,
    ],
    [
      'a bin its files array does not cover is reported',
      () =>
        releaseWiringProblems({
          ...good,
          packages: [{ ...mcp, pkg: { ...mcp.pkg, files: ['dist'], bin: { 'kai-mcp': './bin/kai-mcp.js' } } }],
          repoRoot: REPO,
        }).some((p) => p.includes('does not cover')),
    ],
    ['a config entry naming no package is reported', fires(() => ({ configPackages: { ...good.configPackages, 'packages/gone': { 'release-type': 'node', 'package-name': 'x' } } }), 'is not a published package')],
    ['a manifest entry naming no package is reported', fires(() => ({ manifest: { ...good.manifest, 'packages/gone': '1.0.0' } }), 'is not a published package')],
    ['a publish loop naming no package is reported', fires(() => ({ loop: ['packages/ui', 'packages/mcp', 'packages/gone'] }), 'a private package listed here would be published')],
    ['a package-name mismatch is reported', fires(() => ({ configPackages: { ...good.configPackages, 'packages/mcp': { 'release-type': 'node', 'package-name': '@kitn.ai/wrong' } } }), 'package-name')],
    [
      'a build input with no pre-loop build is reported',
      fires(() => ({ preLoop: 'pnpm install --frozen-lockfile\n' }), 'is a build input for another published package'),
    ],
    [
      'a RUNTIME dependency on a sibling is NOT a build input (cli -> create-kai is spawned, never built against)',
      releaseWiringProblems({
        packages: [
          { ...mcp, pkg: { ...mcp.pkg, dependencies: { 'create-kai': '^1.0.0' }, devDependencies: {} } },
          {
            dir: 'packages/ui',
            name: 'create-kai',
            version: '1.2.3',
            manifest: '/tmp/nonexistent-package.json',
            pkg: { name: 'create-kai', version: '1.2.3', scripts: { prepublishOnly: 'npm run build' }, files: ['dist'], bin: {} },
          },
        ],
        configPackages: {
          'packages/ui': { 'release-type': 'node', 'package-name': 'create-kai' },
          'packages/mcp': good.configPackages['packages/mcp'],
        },
        manifest: { 'packages/ui': '1.2.3', 'packages/mcp': '0.1.0' },
        loop: ['packages/ui', 'packages/mcp'],
        preLoop: '',
        repoRoot: REPO,
      }).length === 0,
    ],
    [
      'a build input built before the loop is NOT reported (each accepted spelling)',
      buildSpellings(ui).every((spelling) =>
        releaseWiringProblems({ ...good, preLoop: `${spelling}\n` }).length === 0,
      ),
    ],
    [
      'no pre-loop build is required when nothing depends on a sibling',
      releaseWiringProblems({
        ...good,
        packages: [{ ...ui, pkg: { ...ui.pkg, dependencies: {}, devDependencies: {} } }],
        configPackages: { 'packages/ui': good.configPackages['packages/ui'] },
        manifest: { 'packages/ui': '1.2.3' },
        loop: ['packages/ui'],
        preLoop: '',
      }).length === 0,
    ],
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
const preLoop = textBeforePublishLoop(workflow);

// Anti-vacuity: a derived set of zero or one package would make every check below pass.
if (packages.length < 3) {
  console.error(
    `✗ lint-release-wiring: only ${packages.length} published package(s) found under packages/. ` +
      `Either the derivation is wrong or packages were deleted; both need a look before this can pass.`,
  );
  process.exit(1);
}

const problems = releaseWiringProblems({ packages, configPackages: config.packages, manifest, loop, preLoop });

// Anti-vacuity for the pre-loop build rule: print what it derived, so a run that checked
// nothing is visible rather than merely green.
const buildInputs = buildInputPackages(packages);

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
    `release-please-config.json, .release-please-manifest.json and the publish loop (${(loop ?? []).join(' -> ')}). ` +
    `Build inputs built before the loop: ${buildInputs.length ? buildInputs.map((p) => p.dir).join(', ') : 'none'}.`,
);
}
