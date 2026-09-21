// GUARD -- prose and comments may not invoke the CLI under its RETIRED package.
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
 * The retired invocation. Anchored on the five subcommands the CLI dispatches, with any
 * run of whitespace between the package and the verb (`npx -y @kitn.ai/ui  mcp`, and a
 * line wrap too -- the match runs over the WHOLE file, not line by line, because `\s`
 * crossing a newline is exactly how a wrapped command reads in markdown).
 *
 * The lookahead is not `\b`: `\b` matches between `dev` and `-`, so `@kitn.ai/ui
 * dev-tooling` would fire on a phrase about the dev tooling. It must be a word or
 * hyphen continuation that is allowed, hence `(?<![-\w])`-style trailing guard.
 */
export const RETIRED_INVOCATION = /@kitn\.ai\/ui[ \t\n]+(mcp|dev|compile|eject|validate)(?![-\w])/g;

/**
 * The SAME invocation as a separate quoted ARGUMENT, which is how every MCP client config spells
 * it: `"args": ["-y", "@kitn.ai/ui", "mcp"]`, and the TOML/YAML equivalents. Measured on the day
 * this was added: ELEVEN of these were live in `guides/for-ai-agents.mdx` (every harness tab on
 * the page that teaches an agent to connect), and the whitespace pattern above matched none of
 * them, because the separator between the package and the verb is `", "` rather than a space. The
 * reader follows the page, gets the stub's "moved to @kitn.ai/kai" error, and has to work out that
 * the page is the thing that is wrong.
 *
 * The closing quote is NOT optional: it is what keeps `"mcp-server"` (a different package name)
 * from firing, and the `(?![−\w])` style trailing guard the name-shaped pattern needs would let
 * `"mcp-server"` through if the quote were optional here. A pretty-printed array matches too, since
 * the separator class spans newlines.
 */
export const RETIRED_INVOCATION_AS_ARG =
  /@kitn\.ai\/ui["'][ \t\n]*,[ \t\n]*["'](mcp|dev|compile|eject|validate)["']/g;

/** Both spellings, so a caller cannot scan for one and call it done. */
export const RETIRED_INVOCATIONS = [RETIRED_INVOCATION, RETIRED_INVOCATION_AS_ARG];

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
    'packages/kai/scripts/lint-cli-invocations.mjs',
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
  const probes = [
    ['the retired invocation is found', probe({ 'apps/docs/a.mdx': 'run `npx @kitn.ai/ui mcp` first' }) === 1],
    ['every subcommand is found', ['dev', 'compile', 'eject', 'validate'].every((v) => probe({ 'x.md': `npx @kitn.ai/ui ${v} f.json` }) === 1)],
    ['extra whitespace and a line wrap are found', probe({ 'x.md': 'npx @kitn.ai/ui\n  mcp' }) === 1],
    ['the NEW invocation is clean', probe({ 'x.md': 'npx @kitn.ai/kai mcp' }) === 0],
    ['a bare package mention is clean', probe({ 'x.md': 'import { cn } from "@kitn.ai/ui";' }) === 0],
    ['an import subpath is clean', probe({ 'x.md': '`@kitn.ai/ui/web-components`' }) === 0],
    ['a path to the stub bin is clean', probe({ 'x.md': 'node node_modules/@kitn.ai/ui/bin/mcp.js' }) === 0],
    ['a hyphenated word after the package is clean', probe({ 'x.md': 'the @kitn.ai/ui dev-tooling' }) === 0],
    ['a dated record is skipped', probe({ 'docs/handoff/2026-01-01-x.md': 'npx @kitn.ai/ui mcp' }) === 0],
    ['a waived file is skipped', probe({ 'packages/ui/bin/mcp.js': 'npx @kitn.ai/ui mcp -> npx @kitn.ai/kai mcp' }) === 0],
    ['a waiver is by exact path, so a near-miss still fires', probe({ 'packages/ui/bin/mcp-2.js': 'npx @kitn.ai/ui mcp' }) === 1],
    ['the MCP args-array shape is found', probe({ 'apps/docs/a.mdx': '"args": ["-y", "@kitn.ai/ui", "mcp"]' }) === 1],
    ['the TOML args-list shape is found', probe({ 'apps/docs/a.mdx': 'args = ["-y", "@kitn.ai/ui", "dev"]' }) === 1],
    [
      'a pretty-printed args array is found',
      probe({ 'apps/docs/a.mdx': '"args": [\n  "-y",\n  "@kitn.ai/ui",\n  "mcp"\n]' }) === 1,
    ],
    ['every subcommand is found in the args shape', ['dev', 'compile', 'eject', 'validate'].every((v) => probe({ 'x.md': `"args": ["-y", "@kitn.ai/ui", "${v}"]` }) === 1)],
    ['the new package in the args shape is clean', probe({ 'apps/docs/a.mdx': '"args": ["-y", "@kitn.ai/kai", "mcp"]' }) === 0],
    ['a verb that continues into another arg is clean', probe({ 'apps/docs/a.mdx': '"args": ["-y", "@kitn.ai/ui", "mcp-server"]' }) === 0],
    ['a component name after the package is clean', probe({ 'apps/docs/a.mdx': '"args": ["-y", "@kitn.ai/ui", "chat"]' }) === 0],
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
      `  The dev tooling moved to \`@kitn.ai/kai\`, and the kit's bin is now a stub that errors.\n` +
      `  Rewrite as \`npx @kitn.ai/kai <command>\`. A dated record is exempt; anything else is not.`,
  );
  process.exit(1);
}
console.log(`✓ lint-cli-invocations: ${targets.length} file(s) scanned; every CLI invocation names @kitn.ai/kai.`);
