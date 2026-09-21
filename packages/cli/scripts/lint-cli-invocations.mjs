// GUARD -- prose and comments may not invoke the CLI under a RETIRED package.
//
// TWO RETIRED NAMES NOW, and the second one never shipped: `@kitn.ai/ui` (where the MCP and the
// construct CLI lived until they were peeled out) and `@kitn.ai/kai` (the single package they
// moved to, which was never published -- the tooling was split into `@kitn.ai/cli` and
// `@kitn.ai/mcp` before its first release). Both spellings are flagged, from ONE list, so a
// third rename is a one-line change here rather than a second pattern nobody remembers to add.
//
// The CURRENT names are `@kitn.ai/cli` (bin `kai`) and, for the server alone, `@kitn.ai/mcp`
// (`npx -y @kitn.ai/mcp`, with no verb: the server takes no arguments).
//
// WHY THIS EXISTS, and it is measured rather than assumed. When the dev tooling moved
// to `@kitn.ai/kai`, the docs sweep's own mutation put `npx @kitn.ai/ui mcp` back into
// an `.mdx` page and ran everything: the docs suite stayed green (62 passed),
// `verify:docs` exited 0 with 0 findings, `lint:cdn-pins` was clean and
// `lint:gate-parity` was clean. Only a grep found it. Nothing in the required gate reads
// a CLI INVOCATION in prose:
//
//   - `verify:docs`'s prose scanner resolves IMPORT specifiers against the kit's entry
//     points. `npx @kitn.ai/ui mcp` is not an import, and its bash fences are not
//     compiled.
//   - `lint:cdn-pins` reads `@kitn.ai/ui@<version>` pins, which is a different spelling.
//   - `lint:gate-parity` reads gate lists, not commands.
//
// So a rename with no guard here rots back the moment someone copies an older page, and
// the failure is silent for a reader who follows the instructions and gets the migration
// stub's error instead of a CLI.
//
// WHAT IT MATCHES: `@kitn.ai/ui` followed by a subcommand of the CLI that moved (`mcp`,
// `dev`, `compile`, `eject`, `validate`). It deliberately does NOT match a bare
// `@kitn.ai/ui` mention, an import subpath, or a `.../bin/mcp.js` path -- those are
// either the kit's own package or the stub's job.
//
//   node packages/kai/scripts/lint-cli-invocations.mjs
//   node packages/kai/scripts/lint-cli-invocations.mjs --self-test   # prove it detects
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../../..');

/**
 * The retired spellings, one entry per package name, both SHAPES each can take:
 *
 *   whitespace   `npx @kitn.ai/ui mcp` -- the bin form a reader types after an install
 *   quoted-arg   `"args": ["-y", "@kitn.ai/ui", "mcp"]` -- the MCP client config form, where the
 *                package and the verb are separate JSON array elements and the separator is
 *                `", "` rather than a space. Measured: ELEVEN live configs in one docs page used
 *                the quoted-arg shape and the whitespace-only pattern matched none of them.
 *
 * The whitespace form's trailing guard is not `\b`: `\b` matches between `dev` and `-`, so
 * `@kitn.ai/ui dev-tooling` would fire on a phrase about the dev tooling. It must be a word or
 * hyphen continuation that is allowed, hence `(?<![-\w])`-style trailing guard. In the quoted
 * form the closing quote plays that role, which is what keeps `"@kitn.ai/ui", "mcp-server"` -- a
 * different package -- clean.
 */
export const RETIRED_PACKAGES = ['@kitn.ai/ui', '@kitn.ai/kai'];

const escape = (name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const VERBS = 'mcp|dev|compile|eject|validate';

/** Both shapes, for every retired package. Exported so the self-test can count them. */
export const RETIRED_INVOCATIONS = RETIRED_PACKAGES.flatMap((name) => [
  new RegExp(`${escape(name)}[ \\t\\n]+(${VERBS})(?![-\\w])`, 'g'),
  new RegExp(`${escape(name)}["'][ \\t\\n]*,[ \\t\\n]*["'](${VERBS})["']`, 'g'),
]);

/** Where prose about this kit lives. Every file under these, by extension. */
const SCAN_ROOTS = ['apps', 'packages', 'examples', 'scripts', 'docs'];
const SCAN_FILES = ['README.md', 'CLAUDE.md', 'SECURITY.md'];
const EXTENSIONS = ['.md', '.mdx', '.ts', '.tsx', '.js', '.mjs', '.json', '.astro', '.html', '.txt'];

/**
 * Deliberate exceptions, each with the reason. A waiver is by exact repo-relative path,
 * never by pattern: a pattern is how a carve-out grows to cover the file that was
 * supposed to fail.
 */
const WAIVED = new Map([
  [
    'packages/ui/bin/mcp.js',
    'the migration stub: it names the retired command as the INPUT side of the message it prints',
  ],
  [
    'packages/cli/scripts/lint-cli-invocations.mjs',
    'this guard: the self-test plants the retired invocation, and skipping it by name keeps that from being a self-match',
  ],
]);

/**
 * Dated records. A handoff, a plan or a research note describes the tree AT THE TIME, so
 * rewriting an invocation in one would falsify it -- the same precedent as
 * `lint:cdn-pins`' `historical` waiver and `lint:layer-names`' archive exemption.
 */
const DATED = ['docs/handoff/', 'docs/superpowers/', 'docs/research/', 'docs/proposals/', 'docs/decisions/', 'docs/provenance/', 'packages/ui/CHANGELOG.md'];

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

/** Every tracked-ish file worth scanning, repo-relative. */
export function scanTargets(repoRoot = REPO) {
  const out = [];
  for (const root of SCAN_ROOTS) {
    const abs = join(repoRoot, root);
    let stat;
    try {
      stat = statSync(abs);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;
    for (const file of walk(abs)) {
      if (EXTENSIONS.some((ext) => file.endsWith(ext))) out.push(file);
    }
  }
  for (const file of SCAN_FILES) {
    const abs = join(repoRoot, file);
    try {
      if (statSync(abs).isFile()) out.push(abs);
    } catch {
      /* not every repo has every one */
    }
  }
  return [...new Set(out)].sort();
}

/** The findings for a `path -> contents` map, as `{ path, line, text }`. */
export function findingsFor(files, { waived = WAIVED, dated = DATED } = {}) {
  const findings = [];
  for (const [path, contents] of Object.entries(files)) {
    if (waived.has(path)) continue;
    if (dated.some((prefix) => path.startsWith(prefix) || path === prefix)) continue;
    for (const pattern of RETIRED_INVOCATIONS) {
      for (const match of contents.matchAll(pattern)) {
        const line = contents.slice(0, match.index).split('\n').length;
        const text = contents.split('\n')[line - 1]?.trim() ?? match[0];
        findings.push({ path, line, text });
      }
    }
  }
  return findings;
}

if (process.argv.includes('--self-test')) {
  const probe = (files, opts) => findingsFor(files, opts).length;
  const VERBS = ['mcp', 'dev', 'compile', 'eject', 'validate'];
  const probes = [
    [
      'the retired invocation is found, for BOTH retired packages',
      RETIRED_PACKAGES.every((pkg) => probe({ 'apps/docs/a.mdx': `run \`npx ${pkg} mcp\` first` }) === 1),
    ],
    [
      'every subcommand is found, for both packages',
      RETIRED_PACKAGES.every((pkg) => VERBS.every((v) => probe({ 'x.md': `npx ${pkg} ${v} f.json` }) === 1)),
    ],
    ['extra whitespace and a line wrap are found', probe({ 'x.md': 'npx @kitn.ai/ui\n  mcp' }) === 1],
    [
      'the NEW invocations are clean: the cli package, and the mcp package with NO verb',
      probe({ 'x.md': 'npx -y @kitn.ai/cli doctor' }) === 0 &&
        probe({ 'x.md': 'npx -y @kitn.ai/mcp' }) === 0 &&
        probe({ 'x.md': '"args": ["-y", "@kitn.ai/mcp"]' }) === 0,
    ],
    ['a bare package mention is clean', probe({ 'x.md': 'import { cn } from "@kitn.ai/ui";' }) === 0],
    [
      'a bare mention of either NEW package is clean',
      probe({ 'x.md': 'install @kitn.ai/cli, or @kitn.ai/mcp for a harness' }) === 0,
    ],
    ['an import subpath is clean', probe({ 'x.md': '`@kitn.ai/ui/web-components`' }) === 0],
    ['a path to the stub bin is clean', probe({ 'x.md': 'node node_modules/@kitn.ai/ui/bin/mcp.js' }) === 0],
    ['a hyphenated word after the package is clean', probe({ 'x.md': 'the @kitn.ai/ui dev-tooling' }) === 0],
    ['a dated record is skipped', probe({ 'docs/handoff/2026-01-01-x.md': 'npx @kitn.ai/ui mcp' }) === 0],
    [
      'a waived file is skipped',
      probe({ 'packages/ui/bin/mcp.js': 'npx @kitn.ai/ui mcp -> npx @kitn.ai/cli mcp' }) === 0,
    ],
    ['a waiver is by exact path, so a near-miss still fires', probe({ 'packages/ui/bin/mcp-2.js': 'npx @kitn.ai/ui mcp' }) === 1],
    [
      'the MCP args-array shape is found, for both packages',
      RETIRED_PACKAGES.every((pkg) => probe({ 'apps/docs/a.mdx': `"args": ["-y", "${pkg}", "mcp"]` }) === 1),
    ],
    ['the TOML args-list shape is found', probe({ 'apps/docs/a.mdx': 'args = ["-y", "@kitn.ai/ui", "dev"]' }) === 1],
    [
      'a pretty-printed args array is found',
      probe({ 'apps/docs/a.mdx': '"args": [\n  "-y",\n  "@kitn.ai/kai",\n  "mcp"\n]' }) === 1,
    ],
    [
      'every subcommand is found in the args shape, for both packages',
      RETIRED_PACKAGES.every((pkg) =>
        VERBS.every((v) => probe({ 'x.md': `"args": ["-y", "${pkg}", "${v}"]` }) === 1),
      ),
    ],
    ['a verb that continues into another arg is clean', probe({ 'apps/docs/a.mdx': '"args": ["-y", "@kitn.ai/ui", "mcp-server"]' }) === 0],
    ['a component name after the package is clean', probe({ 'apps/docs/a.mdx': '"args": ["-y", "@kitn.ai/ui", "chat"]' }) === 0],
    [
      'a hyphenated arg after a retired package is clean too',
      probe({ 'apps/docs/a.mdx': '"args": ["-y", "@kitn.ai/kai", "dev-tooling"]' }) === 0,
    ],
  ];

  let failed = 0;
  for (const [what, ok] of probes) {
    console.log(`${ok ? '✓' : '✗'} ${what}`);
    if (!ok) failed++;
  }
  if (failed) {
    console.error(`\n✗ lint-cli-invocations self-test: ${failed}/${probes.length} probe(s) misbehaved.\n`);
    process.exit(1);
  }
  console.log(`✓ lint-cli-invocations self-test: ${probes.length} probes behave as specified.`);
  process.exit(0);
}

const targets = scanTargets();
const files = Object.fromEntries(targets.map((abs) => [relative(REPO, abs), readFileSync(abs, 'utf8')]));
const findings = findingsFor(files);

// A zero-match run over zero files reads as "nothing to do". Pin what was actually read.
if (targets.length < 50) {
  console.error(`✗ lint-cli-invocations: only ${targets.length} file(s) scanned; the walk or the roots are wrong.`);
  process.exit(1);
}

for (const f of findings) {
  console.error(`✗ ${f.path}:${f.line}  ${f.text}`);
}
if (findings.length) {
  console.error(
    `\n✗ lint-cli-invocations: ${findings.length} invocation(s) of the CLI under its retired package, across ${targets.length} file(s).\n` +
      `  The dev tooling is \`@kitn.ai/cli\` (bin \`kai\`); the MCP server alone is \`@kitn.ai/mcp\`.\n` +
      `  An MCP client config needs no verb: \`"args": ["-y", "@kitn.ai/mcp"]\`. Everything else is\n` +
      `  \`npx -y @kitn.ai/cli <command>\`. A dated record is exempt; anything else is not.`,
  );
  process.exit(1);
}
console.log(
  `✓ lint-cli-invocations: ${targets.length} file(s) scanned; no invocation names a retired package ` +
    `(${RETIRED_PACKAGES.join(', ')}).`,
);
