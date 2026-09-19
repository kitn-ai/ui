#!/usr/bin/env node
/**
 * Guard: the kai-* layer is called WEB COMPONENTS, and nothing else catches a
 * straggler.
 *
 * The rename landed on 2026-09-19 (`src/elements` -> `src/web-components`,
 * `@kitn.ai/ui/elements` -> `@kitn.ai/ui/web-components`, `element-meta.json` ->
 * `web-component-meta.json`, `elementsReady` -> `webComponentsReady`). Nothing
 * enforces it: `lint:cdn-pins` guards VERSIONS, not paths, and a doc writer
 * copy-pasting last month's snippet reintroduces a subpath that does not resolve
 * and no build step complains. That is the whole reason this file exists.
 *
 * WHAT IS A FINDING. Only OUR retired names: the subpath (in both spellings -
 * a plain string and the `/`-escaped form a regex needs), the source/dist/test
 * directories, the four retired artifact file names, and three public symbols.
 * NOT the DOM's own vocabulary: `HTMLElement`, `customElements`,
 * `createElement`, `JSX.IntrinsicElements`, the generated DOM-interface family
 * `Kai<Name>Element` / `KaiElementJsxProps`, `parseKai*Element`, Angular's
 * `ElementRef`, Playwright's `ElementHandle`. Those name the ELEMENT, which is
 * what a custom element is; they are not the layer's name. A guard that fired on
 * them would be renamed back within a week, which is how guards die.
 *
 * THE DATED ARCHIVE IS EXEMPT, AND THE EXEMPTION IS EXPLAINED. `docs/handoff`,
 * `docs/superpowers`, `docs/research`, `docs/proposals`, `docs/decisions`,
 * `docs/provenance` and `packages/ui/CHANGELOG.md` are records of what the tree
 * looked like THEN (docs/superpowers alone names the subpath in 235 files).
 * Rewriting them would falsify them, the same precedent as `lint:cdn-pins`'
 * `historical` waiver. But an unexplained exemption is how a later reader
 * concludes the old name is current, so the exemption is CONDITIONAL: this guard
 * fails if `docs/README.md` stops carrying the note that says what happened and
 * where. Delete the note and the exemption dies with it.
 *
 * WAIVERS. `lint-layer-names: file-waived -- <reason>` anywhere in a file waives
 * that file; `lint-layer-names: historical -- <reason>` on a line waives that
 * line. Same shape as `lint:cdn-pins`, because the reason has to be readable at
 * the site rather than in this header.
 *
 * WALKED, NOT `git ls-files`, so a synthesized fixture tree behaves exactly like
 * this repo does (see the wiring test). The cost: an untracked scratch file
 * inside the tree can fail the run. That is the loud direction, and deleting the
 * file is the fix.
 *
 *   node scripts/lint-layer-names.mjs                    # this repo
 *   node scripts/lint-layer-names.mjs --repo-root <dir>   # any tree
 *   node scripts/lint-layer-names.mjs --self-test         # prove it still detects
 */
import { readdirSync, readFileSync, statSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const argOf = (flag) => {
  const i = argv.indexOf(flag);
  return i === -1 ? undefined : argv[i + 1];
};
const REPO_ROOT = resolve(argOf('--repo-root') ?? join(scriptDir, '..', '..', '..'));
const SELF_TEST = argv.includes('--self-test');

/** Directories never walked: build output, dependencies, other checkouts. */
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'storybook-static', '.nx', 'tmp', '.superpowers', 'coverage', '.astro']);
/**
 * Prefixes skipped by PATH, not by directory name. `.claude/worktrees/` holds
 * sibling checkouts of this repo (CLAUDE.md documents them as where worktrees
 * live), so walking into one reports thousands of findings for a tree nobody is
 * working in -- that exact accident is why the MCP manifest tests once resolved
 * a six-week-old `dist/custom-elements.json` out of a parent checkout.
 */
const SKIP_PREFIXES = ['.claude/worktrees/'];
/** Dated records: exempt from findings, and the exemption is asserted below. */
const ARCHIVE_PREFIXES = [
  'docs/handoff/', 'docs/superpowers/', 'docs/research/', 'docs/proposals/', 'docs/decisions/',
  'docs/provenance/',
];
const ARCHIVE_FILES = new Set(['packages/ui/CHANGELOG.md']);
/** The note that makes the exemption legitimate. Both strings must survive. */
const NOTE_FILE = 'docs/README.md';
const NOTE_MARKERS = ['The kai-* layer is called web components', 'lint-layer-names: archive-note'];

/**
 * Waivers must carry a REASON (`-- something`), and the guard's own two files are
 * skipped by path. Both halves are load-bearing and were found the hard way: with
 * a plain `text.includes('lint-layer-names: file-waived')`, THIS FILE waived
 * ITSELF, because it defines the marker as a string constant and spells every
 * retired name it looks for. A guard that exempts itself reports a clean tree no
 * matter what the tree says.
 */
const FILE_WAIVER_RE = /lint-layer-names: file-waived -- \S/;
const LINE_WAIVER_RE = /lint-layer-names: historical -- \S/;
/** Files that must contain the retired spellings to do their job. */
const SELF_FILES = new Set([
  'packages/ui/scripts/lint-layer-names.mjs',
  'packages/ui/tests/scripts/layer-names-guard-wiring.test.ts',
]);

/**
 * Built from STRINGS, not regex literals, because one of them has to name the
 * `/`-escaped spelling, and hand-escaping that inside a literal is a trap this
 * file already fell into once: the first version matched a backslash before the
 * slashes but a BARE dot, so it missed `@kitn\.ai\/ui\/elements` -- the exact
 * string that sat in config/vite/react.ts before the rename. The guard that
 * exists to find an escaped subpath has to be able to spell one.
 */
const literal = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SUBPATH_ESCAPED = '@kitn\\.ai\\/ui\\/elements'; // how consumer regexes spell it

const PATTERNS = [
  ['subpath specifier', new RegExp(`${literal('@kitn.ai/ui/elements')}(?![A-Za-z0-9-])`)],
  ['subpath specifier (regex-escaped)', new RegExp(`${literal(SUBPATH_ESCAPED)}(?![A-Za-z0-9-])`)],
  ['source directory', /(?:^|[^A-Za-z0-9_./-])src\/elements\//],
  ['built directory', /dist\/elements(?:[./]|$)/],
  ['test directory', /tests\/elements\//],
  ['retired artifact name', /element-(?:meta|manifest|nonscalar)\.json|element-types\.d\.ts/],
  ['retired public symbol', /(?<![A-Za-z0-9_$])(?:elementsReady|ElementMeta|ELEMENT_COMPOSITION)(?![A-Za-z0-9_$])/],
];

const TEXT_EXT = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs|json|jsonc|md|mdx|astro|vue|svelte|html|css|ya?ml|py|toml|txt)$/;

function walk(dir, out = [], root = dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = relative(root, full).split(sep).join('/') + '/';
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !SKIP_PREFIXES.some((p) => rel.startsWith(p))) walk(full, out, root);
    } else if (TEXT_EXT.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * The files to scan: TRACKED ones in a git work tree, else a filesystem walk.
 * Not a preference -- a correctness one. The walk sees gitignored build output
 * and scratch, so the first real run reported 114 findings that were all stale
 * artifacts (`.kai/` example apps, `examples/starters/nextjs/.next/`, and a
 * `apps/docs/public/kitn/elements/` copy left by a pre-rename docs build).
 * Fixtures have no git, so they walk, which is what the self-test drives.
 */
function listFiles(root) {
  const git = (args) => spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  const probe = git(['rev-parse', '--is-inside-work-tree']);
  if (probe.status === 0 && probe.stdout.trim() === 'true') {
    const listed = git(['ls-files', '-z']);
    if (listed.status === 0) {
      return listed.stdout
        .split('\0')
        .filter((rel) => rel && TEXT_EXT.test(rel))
        .map((rel) => join(root, rel))
        .filter((abs) => statSync(abs, { throwIfNoEntry: false })?.isFile());
    }
  }
  return walk(root);
}

const isArchive = (rel) =>
  ARCHIVE_PREFIXES.some((p) => rel.startsWith(p)) || ARCHIVE_FILES.has(rel);

/**
 * Every finding in one tree. Pure over the filesystem so `--self-test` can drive
 * it over fixtures; the exits live in the caller.
 */
function checkTree(root) {
  const findings = [];
  const fatal = [];
  const files = listFiles(root);

  // Vacuity: a run that walked nothing reports the same clean line as a repo
  // with no stragglers. 100 is far below this tree (~2200 text files) and far
  // above any structural accident that would make the walk empty.
  if (files.length < 100) {
    fatal.push(
      `walked ${files.length} text file(s) under ${root} -- a run this small has stopped scanning.`,
    );
  }

  for (const abs of files) {
    const rel = relative(root, abs).split(sep).join('/');
    if (isArchive(rel) || SELF_FILES.has(rel)) continue;
    let text;
    try {
      text = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    if (FILE_WAIVER_RE.test(text)) continue;
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (LINE_WAIVER_RE.test(line)) continue;
      for (const [name, re] of PATTERNS) {
        if (re.test(line)) findings.push({ file: rel, line: i + 1, name, text: line.trim().slice(0, 120) });
      }
    }
  }

  // The exemption's receipt. Both markers, so the note cannot be trimmed to a
  // heading that mentions the layer without saying what happened to the old name.
  const notePath = join(root, NOTE_FILE);
  let note = null;
  try {
    note = readFileSync(notePath, 'utf8');
  } catch {
    note = null;
  }
  if (note === null) {
    fatal.push(
      `${NOTE_FILE} is missing. It is what explains why the dated archive is exempt from this ` +
        `guard, so without it a reader assumes the retired spelling is current.`,
    );
  } else {
    for (const marker of NOTE_MARKERS) {
      if (!note.includes(marker)) {
        fatal.push(`${NOTE_FILE} no longer contains ${JSON.stringify(marker)} -- restore it or the archive exemption is unexplained.`);
      }
    }
  }

  return { findings, fatal, files: files.length };
}

// ---------------------------------------------------------------------------
// self-test
// ---------------------------------------------------------------------------

const CLEAN = {
  'docs/README.md': `# Docs\n\nThe kai-* layer is called web components.\n\nlint-layer-names: archive-note\n`,
  'packages/ui/src/web-components/chat.tsx': `import { defineWebComponent } from './define';\nexport const ready = webComponentsReady;\n`,
  'packages/ui/dist/web-components/chat.js': `import '@kitn.ai/ui/elements';\n`,
  'docs/superpowers/plans/2026-01-01-old.md': `we shipped @kitn.ai/ui/elements and src/elements/chat.tsx\n`,
  'packages/ui/CHANGELOG.md': `chore: src/elements -> src/web-components\n`,
  'examples/x/main.ts': `import '@kitn.ai/ui/web-components';\n`,
};
for (let i = 0; i < 120; i++) CLEAN[`packages/ui/src/web-components/filler-${i}.ts`] = `export const n${i} = 1;\n`;

const SELF_TEST_CASES = [
  { name: 'a clean tree draws EXACTLY zero findings', files: CLEAN, expect: [] },
  {
    name: 'the subpath specifier in source',
    files: { ...CLEAN, 'packages/ui/src/x.ts': `import { toast } from '@kitn.ai/ui/elements';\n` },
    expect: ['subpath specifier', 'packages/ui/src/x.ts:1'],
  },
  {
    name: 'the regex-escaped spelling a plain-string sweep misses',
    files: { ...CLEAN, 'packages/ui/config/vite/react.ts': `aliasesExclude: [/^@kitn\\.ai\\/ui\\/elements$/],\n` },
    expect: ['regex-escaped', 'react.ts:1'],
  },
  {
    name: 'a source-directory mention',
    files: { ...CLEAN, 'packages/ui/notes.md': `see src/elements/chat-types.ts\n` },
    expect: ['source directory', 'notes.md:1'],
  },
  {
    name: 'a retired artifact name',
    files: { ...CLEAN, 'packages/ui/tests/a.test.ts': `readFileSync('src/web-components/element-meta.json')\n` },
    expect: ['retired artifact name'],
  },
  { name: 'a retired public symbol', files: { ...CLEAN, 'packages/ui/src/y.ts': `await elementsReady;\n` }, expect: ['retired public symbol'] },
  {
    name: 'dist/ is not scanned at all',
    files: { ...CLEAN, 'packages/ui/dist/elements/chat.js': `import '@kitn.ai/ui/elements';\n` },
    expect: [],
  },
  { name: 'the dated archive is exempt', files: { ...CLEAN, 'docs/superpowers/specs/x.md': `src/elements/ was the old path\n` }, expect: [] },
  { name: 'CHANGELOG is exempt', files: { ...CLEAN, 'packages/ui/CHANGELOG.md': `renamed src/elements\n` }, expect: [] },
  {
    name: 'a line waiver is honoured, its neighbours are not',
    files: {
      ...CLEAN,
      'docs/coupling-map.md': `| a | src/elements/x.ts | lint-layer-names: historical -- the 2026-09-19 rename |\n| b | src/elements/y.ts |\n`,
    },
    expect: ['coupling-map.md:2'],
    reject: ['coupling-map.md:1'],
  },
  {
    name: 'a file waiver is honoured',
    files: { ...CLEAN, 'packages/ui/self.md': `lint-layer-names: file-waived -- this file names the retired spelling\n@kitn.ai/ui/elements\n` },
    expect: [],
  },
  {
    name: 'VACUITY: a tree too small to have scanned anything',
    files: { 'docs/README.md': CLEAN['docs/README.md'], 'a.ts': 'export const x = 1;\n' },
    expect: ['has stopped scanning'],
  },
  {
    name: 'the archive note is required: a missing docs/README.md is fatal',
    files: { ...CLEAN, 'docs/README.md': null },
    expect: ['is missing'],
  },
  {
    name: 'and so is an emasculated note',
    files: { ...CLEAN, 'docs/README.md': `# Docs\n\nlint-layer-names: archive-note\n` },
    expect: ['no longer contains'],
  },
];

const findingText = (v) =>
  [...v.fatal, ...v.findings.map((f) => `${f.file}:${f.line} ${f.name} ${f.text}`)].join('\n');

function writeFixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'lint-layer-names-'));
  for (const [rel, content] of Object.entries(files)) {
    if (content === null) continue;
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return root;
}

if (SELF_TEST) {
  let failed = 0;
  for (const c of SELF_TEST_CASES) {
    const verdict = checkTree(writeFixture(c.files));
    const text = findingText(verdict);
    const missing = c.expect.filter((s) => !text.includes(s));
    const wrong = (c.reject ?? []).filter((s) => text.includes(s));
    const cleanMismatch = c.expect.length === 0 && verdict.findings.length + verdict.fatal.length > 0;
    const ok = missing.length === 0 && wrong.length === 0 && !cleanMismatch;
    if (!ok) failed++;
    const got = verdict.findings.length + verdict.fatal.length;
    console.log(`${ok ? '✓' : '✗'} ${c.name} (expected ${c.expect.length === 0 ? 'clean' : c.expect.map((s) => `"${s}"`).join(' + ')}, got ${got === 0 ? 'clean' : `${got} finding(s)`})`);
    if (missing.length) console.log(`    missing: ${missing.map((s) => `"${s}"`).join(', ')}`);
    if (wrong.length) console.log(`    fired for the wrong reason: ${wrong.map((s) => `"${s}"`).join(', ')}`);
    if (cleanMismatch) console.log(`    unexpected: ${text.split('\n')[0]}`);
  }
  if (failed > 0) {
    console.error(`\n✗ lint-layer-names self-test: ${failed}/${SELF_TEST_CASES.length} case(s) failed.`);
    process.exit(1);
  }
  console.log(`\n✓ lint-layer-names self-test: ${SELF_TEST_CASES.length}/${SELF_TEST_CASES.length} cases behave as specified.`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// the real run
// ---------------------------------------------------------------------------

const { findings, fatal, files } = checkTree(REPO_ROOT);
if (fatal.length === 0 && findings.length === 0) {
  console.log(
    `✓ lint-layer-names: ${files} file(s) walked; the layer is called web components everywhere ` +
      `(the dated archive is exempt, and ${NOTE_FILE} still says why).`,
  );
  process.exit(0);
}
for (const f of fatal) console.error(`✗ ${f}\n`);
if (findings.length > 0) {
  console.error(`✗ ${findings.length} retired name(s) of the kai-* layer:\n`);
  for (const f of findings) console.error(`  ${f.file}:${f.line}  [${f.name}]  ${f.text}`);
  console.error(
    '\n  The layer is `src/web-components` / `@kitn.ai/ui/web-components` / `web-component-meta.json`.\n' +
      '  If this is a dated record, put it in docs/{handoff,superpowers,research,proposals,decisions,provenance}/\n' +
      '  or waive the line with: lint-layer-names: historical -- <reason>\n',
  );
}
process.exit(1);
