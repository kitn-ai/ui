#!/usr/bin/env node
/**
 * Guard: every STATEMENT-POSITION relative specifier in the tree resolves to a real file.
 *
 * WHY THIS EXISTS, in one measured incident. On 2026-09-20
 * `src/components/conversation/conversation-item.stories.tsx` began with
 * `import '../web-components/register'`, a path that lost a `..` AND its final segment in the
 * family-folder reorg. Nothing in the repo could see it: this config's tsc does not report an
 * unresolved SIDE-EFFECT import (measured, next to a `from` import that does error), and the
 * `unit` project excludes `*.stories.*`, so only the storybook browser job could, and that job
 * is documented flaky. The story then collected 0 tests where it should have collected 9, which
 * is the quiet version of the whole defect: a file that is no longer tested reads exactly like a
 * file with nothing to test. The same class bit the same branch twice, the other time as a
 * codemod that rewrote every `from '...'` specifier and left `import './x'` pointing at an old
 * directory behind six green tsc passes.
 *
 * WHAT IT CHECKS. Every `.ts/.tsx/.mts/.cts/.js/.jsx/.mjs/.cjs` file in the repo, for the three
 * statement-position relative forms (`import ... from`, `import '...'`, `export ... from`),
 * resolved against the importing file with extension probing (`ts`, `tsx`, `mts`, `cts`, `d.ts`,
 * `json`, then `index.*`, and a `.js`/`.mjs`/`.cjs` specifier mapped onto its `.ts` sibling, the
 * NodeNext spelling this repo writes). A bundler query (`?inline`, `?raw`) is stripped, because
 * it is not part of the path.
 *
 * THE SPECIFIER IS RESOLVED, NEVER PREFIX-MATCHED. Two bugs of exactly the prefix-matching shape
 * shipped here in one day, both reporting a clean tree: a `startsWith('../components/')` test
 * that silently matched nothing once the files moved one directory deeper, and a codemod that
 * resolved against the wrong tree.
 *
 * TEMPLATE LITERALS AND STRINGS ARE MASKED, WHICH IS WHAT MAKES IT USABLE. The tree is full of
 * `import './x'` inside template literals: emitted code for a generated project (`codegen.ts`
 * writes a consumer's App.tsx, `patches.ts` and `routes.ts` hold snippets of an app that does not
 * exist here) and assertions' expected text (`scaffold.test.ts`, `kit-contract.test.ts`).
 * Measured on this tree: 157 unresolved specifiers without masking, ONE with it, and that one is
 * real (the waived `./block` below). So the masker runs the real scan and the findings stay the
 * signal. It is a scanner rather than a regex because a template literal's `${}` carries CODE
 * that can nest another template literal, and a quote inside that interpolation would otherwise
 * look like the opening of a string in the template's body.
 *
 * OUT OF SCOPE, stated rather than implied:
 *   - dynamic `import('./x')` and `require('./x')`: tsc reports an unresolved one, and the three
 *     statement forms are the class it is blind to. A `--self-test` case pins this, so the line
 *     is a decision rather than an accident.
 *   - bare and aliased specifiers: they name a package, not a path in this tree. The resolvers
 *     that own them (`verify:ssr`, `verify:consumer`, `verify:schemas`) read the shipped entry
 *     points instead, which is the stronger check for that layer.
 *   - `.svelte`, `.vue`, `.astro`, `.mdx`: not parsed by TS or Node here, and each has a compiler
 *     of its own. The ones that ship are built by `verify:starters` (the svelte starter) or
 *     rendered by Storybook and the docs site. Adding one to this guard means writing its
 *     resolver, not widening a set.
 *   - a REGEX LITERAL containing text that looks like an import: the masker does not model regex
 *     literals. Measured, none in the tree today, and the failure direction is a missed finding
 *     rather than a false one.
 *   - case-insensitive filesystems, where a mis-cased specifier resolves on macOS and not on
 *     Linux. This is the note that says nobody has hit it.
 *
 * VACUITY. A walk that finds nothing, or finds no relative specifier, is a hard failure: it
 * prints the same clean line as a tree with no dangling import. The floors are far below the
 * measured tree and far above any accident that would empty the walk.
 *
 * WAIVERS, the sibling guards' shape. `// lint:dangling-imports: allowed -- <reason>` on the
 * finding's line (or the line above it, or the last line of a multi-line statement), or
 * `lint:dangling-imports: file-waived -- <reason>` anywhere in a file. The reason is mandatory,
 * so a bare marker waives nothing. `lint-layer-names` once waived ITSELF by matching the marker
 * string it defines, which is why this file is skipped by name below, and a waiver that
 * suppresses nothing is a FAILURE here rather than a silence: an exemption nobody re-reads is how
 * a guard starts covering less than its name says.
 *
 *   node scripts/lint-dangling-imports.mjs                    # this repo
 *   node scripts/lint-dangling-imports.mjs --repo-root <dir>  # any tree
 *   node scripts/lint-dangling-imports.mjs --self-test        # prove it still detects
 */
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const argOf = (flag) => {
  const i = argv.indexOf(flag);
  return i === -1 ? undefined : argv[i + 1];
};
// Anchored to THIS file, not the cwd: CLAUDE.md tells everyone to run from the repo
// root while `pnpm --filter` sets the cwd to the package.
const REPO_ROOT = resolve(argOf('--repo-root') ?? join(scriptDir, '..', '..', '..'));
const SELF_TEST = argv.includes('--self-test');

/** Extensions parsed for statement-position imports. See the header for what is left out. */
const SOURCE_EXT = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);
/** Resolution candidates after the literal path, in the order a TS/Node consumer expects. */
const RESOLVE_EXTS = ['ts', 'tsx', 'mts', 'cts', 'd.ts', 'json'];
const RESOLVE_INDEX_EXTS = ['ts', 'tsx', 'd.ts'];
/** A `.js`/`.mjs`/`.cjs` specifier is the NodeNext spelling of a `.ts`/`.tsx` sibling. */
const NODENEXT_EXTS = new Set(['.js', '.mjs', '.cjs']);

/** Build output, dependencies, caches and scratch: nothing we own. */
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'storybook-static', '.kai', '.nx', 'coverage', '.astro',
  '.vercel', '.wrangler', '.turbo', '.output', '.cache', '.superpowers', 'tmp',
  'playwright-report', 'test-results', '.vite',
]);
/**
 * Repo-relative prefixes never walked. `.claude/worktrees/` holds sibling CHECKOUTS of this repo,
 * so descending reports on a tree nobody is working in. The six dated directories under `docs/`
 * are records of what the tree looked like on their date, the same ones `lint:layer-names`
 * exempts and `lint:cli-invocations` waives by prefix: a path in a record describes the tree AT
 * THE TIME, so a finding there is not ours to fix without falsifying the record.
 */
const SKIP_PREFIXES = [
  '.claude/worktrees/',
  'docs/handoff/',
  'docs/superpowers/',
  'docs/research/',
  'docs/proposals/',
  'docs/decisions/',
  'docs/provenance/',
];
/**
 * This guard and its wiring test, skipped on purpose. Both carry the waiver markers below as
 * fixture text, so the file-waiver check would waive the guard itself, and their fixtures are
 * full of dangling specifiers by construction. Their own correctness is the wiring test's job.
 */
const SELF_FILES = new Set([
  'packages/ui/scripts/lint-dangling-imports.mjs',
  'packages/ui/tests/scripts/dangling-imports-guard-wiring.test.ts',
]);

// Measured on this tree when the guard landed: 1953 source files and 3604 specifiers (every run
// prints its own). The floor is a "the walk is still alive" tripwire, NOT a coverage guarantee,
// so it sits well below the measured size: the wiring fixtures below have to reach it too, and a
// floor near the real count would force each of them to write a repo-sized tree. The two vacuity
// `--self-test` cases are what prove the tripwire fires.
const MIN_FILES = 500;
const MIN_SPECIFIERS = 800;

const FILE_WAIVER_RE = /lint:dangling-imports: file-waived -- \S/;
const LINE_WAIVER_RE = /lint:dangling-imports: allowed -- \S/;

const IMPORT_FROM_RE = /\bimport\s+([^;'"]*?)\bfrom\s*['"]([^'"]+)['"]/g;
const BARE_IMPORT_RE = /\bimport\s*['"]([^'"]+)['"]/g;
const EXPORT_FROM_RE = /\bexport\s+([^;'"]*?)\bfrom\s*['"]([^'"]+)['"]/g;

/**
 * Mask everything that is not code: comment bodies and string/template literal bodies. Returns a
 * Uint8Array where 1 = masked. A match whose `import`/`export` keyword starts in a masked region
 * is emitted code or expected text, not a statement.
 *
 * `stack` holds the MODE to return to, innermost last: `${` pushes `'template'` (the enclosing
 * template's body is where the interpolation ends, at its matching `}`), and a backtick starting
 * a template pushes `'code'`. That is what makes a nested template inside an interpolation work,
 * and it makes "the innermost frame is `'template'`" exactly the test for "this `}` closes an
 * interpolation".
 */
function maskCode(text) {
  const mask = new Uint8Array(text.length);
  const n = text.length;
  const stack = [];
  let mode = 'code';
  let brace = 0;
  let i = 0;
  const pop = () => {
    mode = stack.pop() ?? 'code';
  };
  while (i < n) {
    const c = text[i];
    if (mode === 'template') {
      if (c === '\\') {
        mask[i] = 1;
        if (i + 1 < n) mask[i + 1] = 1;
        i += 2;
        continue;
      }
      if (c === '`') {
        mask[i] = 1;
        pop();
        i += 1;
        continue;
      }
      if (c === '$' && text[i + 1] === '{') {
        mask[i] = 1;
        mask[i + 1] = 1;
        stack.push('template');
        mode = 'code';
        brace = 0;
        i += 2;
        continue;
      }
      mask[i] = 1;
      i += 1;
      continue;
    }
    // mode === 'code'
    if (c === '{') {
      brace += 1;
      i += 1;
      continue;
    }
    if (c === '}') {
      if (brace > 0) {
        brace -= 1;
        i += 1;
        continue;
      }
      if (stack[stack.length - 1] === 'template') {
        mask[i] = 1;
        pop();
        i += 1;
        continue;
      }
      i += 1;
      continue;
    }
    if (c === '`') {
      mask[i] = 1;
      stack.push('code');
      mode = 'template';
      i += 1;
      continue;
    }
    if (c === '/' && text[i + 1] === '/') {
      const end = text.indexOf('\n', i);
      const stop = end === -1 ? n : end;
      for (let k = i; k < stop; k += 1) mask[k] = 1;
      i = stop;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      for (let k = i; k < stop; k += 1) mask[k] = 1;
      i = stop;
      continue;
    }
    if (c === "'" || c === '"') {
      let k = i + 1;
      while (k < n) {
        if (text[k] === '\\') {
          k += 2;
          continue;
        }
        if (text[k] === c || text[k] === '\n') break;
        k += 1;
      }
      const stop = Math.min(k + 1, n);
      for (let j = i; j < stop; j += 1) mask[j] = 1;
      i = stop;
      continue;
    }
    i += 1;
  }
  return mask;
}

/** Every statement-position relative specifier in one file's text, with its offsets. */
function specifiersIn(text) {
  const mask = maskCode(text);
  const out = [];
  for (const [re, kind] of [
    [IMPORT_FROM_RE, 'import'],
    [BARE_IMPORT_RE, 'side-effect'],
    [EXPORT_FROM_RE, 'export'],
  ]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const spec = kind === 'side-effect' ? m[1] : m[2];
      if (!spec.startsWith('.')) continue; // a package name, not a path in this tree
      // STATEMENT POSITION, not just "the keyword is in code": the clause class cannot exclude
      // a backtick, so `export const emit = ` + backtick + `import x from './nope'` matches from
      // the REAL `export` at the start of the line, through the template, to the emitted
      // specifier inside it. So the whole region from the keyword to the specifier's opening
      // quote must be unmasked. Both quotes are one character, so that offset is arithmetic.
      const quoteAt = m.index + m[0].length - spec.length - 2;
      let code = true;
      for (let k = m.index; k < quoteAt; k += 1) {
        if (mask[k] === 1) {
          code = false;
          break;
        }
      }
      if (!code) continue;
      out.push({ kind, spec, at: m.index, end: m.index + m[0].length });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

function isFile(path) {
  return statSync(path, { throwIfNoEntry: false })?.isFile() === true;
}

/** Resolve one relative specifier to a real file, or null. */
function resolveSpecifier(spec, importer) {
  if (!spec.startsWith('.')) return null;
  // A bundler query (`../theme.css?inline`) is not part of the path.
  const clean = spec.replace(/[?#].*$/, '');
  const base = resolve(dirname(importer), clean);
  const candidates = [];
  const ext = extname(base);
  if (NODENEXT_EXTS.has(ext)) {
    const stem = base.slice(0, -ext.length);
    for (const e of RESOLVE_EXTS.filter((x) => x !== 'json')) candidates.push(`${stem}.${e}`);
    candidates.push(`${stem}.json`);
  }
  candidates.push(base);
  for (const e of RESOLVE_EXTS) candidates.push(`${base}.${e}`);
  for (const e of RESOLVE_INDEX_EXTS) candidates.push(join(base, `index.${e}`));
  return candidates.find(isFile) ?? null;
}

function walk(dir, out = [], root = dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = relative(root, full).split(sep).join('/') + '/';
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !SKIP_PREFIXES.some((p) => rel.startsWith(p))) {
        walk(full, out, root);
      }
    } else if (SOURCE_EXT.has(extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Every unresolved specifier in one tree. Pure over the filesystem, so `--self-test` drives it
 * over fixtures; the exits live in the caller. `floors` is a parameter so a fixture can exercise
 * the real scan without padding to a repo-sized tree, while the vacuity cases can ask for the
 * real ones.
 */
function checkTree(root, floors = { files: MIN_FILES, specifiers: MIN_SPECIFIERS }) {
  const fatal = [];
  const findings = [];
  const staleWaivers = [];
  const files = walk(root);
  let specifiers = 0;

  if (files.length < floors.files) {
    fatal.push(`walked ${files.length} source file(s) under ${root}: a run this small has stopped scanning.`);
  }

  for (const abs of files) {
    const rel = relative(root, abs).split(sep).join('/');
    if (SELF_FILES.has(rel)) continue;
    let text;
    try {
      text = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    const lines = text.split('\n');
    const markerLines = new Set();
    for (let l = 0; l < lines.length; l += 1) if (LINE_WAIVER_RE.test(lines[l])) markerLines.add(l + 1);
    const fileWaiverLine = lines.findIndex((l) => FILE_WAIVER_RE.test(l));
    const consumed = new Set();
    let unresolvedHere = 0;

    for (const hit of specifiersIn(text)) {
      specifiers += 1;
      if (resolveSpecifier(hit.spec, abs) !== null) continue;
      unresolvedHere += 1;
      const line = text.slice(0, hit.at).split('\n').length;
      const endLine = text.slice(0, hit.end).split('\n').length;
      if (fileWaiverLine !== -1) continue; // a file waiver covers the whole file
      // A marker on any line the STATEMENT spans, and only those: the line above is inside the
      // statement in neither direction, and accepting it waives the next statement instead.
      const waiver = [line, endLine].find((l) => markerLines.has(l));
      if (waiver !== undefined) {
        consumed.add(waiver);
        continue;
      }
      findings.push({
        file: rel,
        line,
        kind: hit.kind,
        spec: hit.spec,
        text: (lines[line - 1] ?? '').trim().slice(0, 120),
      });
    }

    // An exemption that suppresses nothing outlives the reason it was written for, and the next
    // dangling import in that file is then waived without anybody deciding to waive it.
    for (const marker of markerLines) {
      if (!consumed.has(marker)) staleWaivers.push({ file: rel, line: marker, marker: 'allowed' });
    }
    if (fileWaiverLine !== -1 && unresolvedHere === 0) {
      staleWaivers.push({ file: rel, line: fileWaiverLine + 1, marker: 'file-waived' });
    }
  }

  if (specifiers < floors.specifiers) {
    fatal.push(
      `walked ${files.length} file(s) under ${root} and found ${specifiers} statement-position relative specifier(s): ` +
        `a scan that resolves almost nothing reads exactly like a tree with no dangling import.`,
    );
  }

  return { findings, fatal, staleWaivers, files: files.length, specifiers };
}

const findingText = (v) =>
  [
    ...v.fatal,
    ...v.findings.map((f) => `${f.file}:${f.line} [${f.kind}] '${f.spec}'`),
    ...v.staleWaivers.map((w) => `${w.file}:${w.line} stale ${w.marker} waiver`),
  ].join('\n');

// ---------------------------------------------------------------------------
// self-test: proves the analyzer still DETECTS, in either direction. Every case runs the REAL
// masker, extractor and resolver over a temp tree, so "clean" means resolved-and-found-nothing.
// ---------------------------------------------------------------------------

const CLEAN = {
  'packages/ui/src/web-components/register.ts': 'export const register = 1;\n',
  'packages/ui/src/components/side-effect.ts': "import '../web-components/register';\n",
  'packages/ui/src/components/from-import.ts': "import { register } from '../web-components/register';\n",
  'packages/ui/src/components/export-from.ts': "export { register } from '../web-components/register';\n",
  'packages/ui/src/components/dir/index.ts': 'export const barrel = 1;\n',
  'packages/ui/src/components/extensionless.ts': "import { barrel } from './dir';\n",
  'packages/ui/src/components/nodenext.ts': "import { barrel } from './dir/index.js';\n",
  'packages/ui/src/components/query.ts': "import css from '../theme.css?inline';\n",
  'packages/ui/src/components/asset.ts': "import data from '../data.json';\n",
  'packages/ui/src/components/bare.ts': "import { createSignal } from 'solid-js';\n",
  'packages/ui/src/theme.css': ':root { --kai-x: 1; }\n',
  'packages/ui/src/data.json': '{ "a": 1 }\n',
};

const SELF_TEST_CASES = [
  { name: 'a clean fixture draws EXACTLY zero findings', files: CLEAN, expect: [] },
  {
    name: 'a dangling SIDE-EFFECT import fires (the class tsc is blind to, and the one that shipped)',
    files: { ...CLEAN, 'packages/ui/src/components/planted.ts': "import './nope';\n" },
    expect: ['components/planted.ts:1', "[side-effect] './nope'"],
  },
  {
    name: 'a dangling `from` import fires',
    files: { ...CLEAN, 'packages/ui/src/components/planted.ts': "import { x } from './nope';\n" },
    expect: ['components/planted.ts:1', "[import] './nope'"],
  },
  {
    name: 'a dangling `export ... from` fires',
    files: { ...CLEAN, 'packages/ui/src/components/planted.ts': "export { x } from './nope';\n" },
    expect: ['components/planted.ts:1', "[export] './nope'"],
  },
  {
    name: 'a path missing one `..` fires (the conversation-item.stories.tsx shape)',
    files: { ...CLEAN, 'packages/ui/src/components/planted.ts': "import '../components/web-components/register';\n" },
    expect: ['components/planted.ts:1'],
  },
  {
    name: 'the SAME text inside a template literal is emitted code, not a statement',
    files: {
      ...CLEAN,
      'packages/ui/src/components/codegen.ts': "export const emit = `import { App } from './App';\\n`;\n",
    },
    expect: [],
  },
  {
    name: 'a template nested inside an interpolation stays masked, and code after it is still CODE',
    files: {
      ...CLEAN,
      'packages/ui/src/components/codegen.ts': "export const emit = `a${`b${1}c`}import x from './nope'`;\nimport './real-dangle';\n",
    },
    expect: ['components/codegen.ts:2', "'./real-dangle'"],
    reject: ["'./nope'"],
  },
  {
    name: 'an import in a line comment, a block comment and both quote styles is not a statement',
    files: {
      ...CLEAN,
      'packages/ui/src/components/commented.ts':
        "// import x from './nope'\n/* import y from './nope2' */\nconst a = \"import z from './nope3'\";\nconst b = 'import w from \"./nope4\"';\n",
    },
    expect: [],
  },
  {
    name: 'a dynamic import() is OUT OF SCOPE by decision, and this fixture pins that',
    files: { ...CLEAN, 'packages/ui/src/components/dynamic.ts': "export const load = () => import('./nope');\n" },
    expect: [],
  },
  {
    name: 'a require() is OUT OF SCOPE by decision too',
    files: { ...CLEAN, 'packages/ui/scripts/tool.cjs': "const x = require('./nope');\n" },
    expect: [],
  },
  {
    name: 'an absolute specifier is not a path in this tree',
    files: { ...CLEAN, 'packages/ui/src/components/absolute.ts': "import '/nope';\n" },
    expect: [],
  },
  {
    name: 'a line waiver WITH a reason suppresses its own line only',
    files: {
      ...CLEAN,
      'packages/ui/src/components/waived.ts':
        "import './nope'; // lint:dangling-imports: allowed -- generated at run time\nimport './also-nope';\n",
    },
    expect: ['components/waived.ts:2'],
    reject: ['components/waived.ts:1'],
  },
  {
    name: 'a waiver on the LAST line of a multi-line statement covers it',
    files: {
      ...CLEAN,
      'packages/ui/src/components/waived.ts':
        "import {\n  Block,\n} from './block'; // lint:dangling-imports: allowed -- generated at run time\n",
    },
    expect: [],
  },
  {
    name: 'a bare marker with no reason waives NOTHING (the lint-layer-names lesson)',
    files: { ...CLEAN, 'packages/ui/src/components/bare-marker.ts': "import './nope'; // lint:dangling-imports: allowed\n" },
    expect: ['components/bare-marker.ts:1'],
  },
  {
    name: 'a file waiver suppresses every finding in that file',
    files: {
      ...CLEAN,
      'packages/ui/src/components/host.tsx':
        "// lint:dangling-imports: file-waived -- written into a copy of this host at run time\nimport { Block } from './block';\n",
    },
    expect: [],
  },
  {
    name: 'a STALE line waiver is itself a failure (an exemption nobody re-reads)',
    files: {
      ...CLEAN,
      'packages/ui/src/components/fixed.ts':
        "import { register } from './from-import'; // lint:dangling-imports: allowed -- was dangling\n",
    },
    expect: ['stale allowed waiver'],
  },
  {
    name: 'a STALE file waiver is itself a failure',
    files: {
      ...CLEAN,
      'packages/ui/src/components/fixed.tsx':
        "// lint:dangling-imports: file-waived -- written into a copy of this host at run time\nexport const fixed = 1;\n",
    },
    expect: ['stale file-waived waiver'],
  },
  {
    name: 'VACUITY: a tree too small to have scanned anything',
    files: { 'packages/ui/src/only.ts': "import './only';\n" },
    expect: ['has stopped scanning'],
    realFloors: true,
  },
  {
    name: 'VACUITY: a tree that finds almost no relative specifier',
    files: { ...CLEAN, 'packages/ui/src/components/no-imports.ts': 'export const x = 1;\n' },
    expect: ['relative specifier(s):'],
    floors: { files: 1, specifiers: 5000 },
  },
];

function writeFixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'lint-dangling-imports-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return root;
}

if (SELF_TEST) {
  let failed = 0;
  for (const c of SELF_TEST_CASES) {
    const root = writeFixture(c.files);
    const floors = c.floors ?? (c.realFloors ? undefined : { files: 1, specifiers: 1 });
    const verdict = checkTree(root, floors);
    rmSync(root, { recursive: true, force: true });
    const text = findingText(verdict);
    const missing = c.expect.filter((s) => !text.includes(s));
    const wrong = (c.reject ?? []).filter((s) => text.includes(s));
    const cleanMismatch =
      c.expect.length === 0 && verdict.findings.length + verdict.fatal.length + verdict.staleWaivers.length > 0;
    const ok = missing.length === 0 && wrong.length === 0 && !cleanMismatch;
    if (!ok) failed += 1;
    const got = verdict.findings.length + verdict.fatal.length + verdict.staleWaivers.length;
    console.log(
      `${ok ? 'ok  ' : 'FAIL'} ${c.name} (expected ${
        c.expect.length === 0 ? 'clean' : c.expect.map((s) => `"${s}"`).join(' + ')
      }, got ${got === 0 ? 'clean' : `${got} finding(s)`})`,
    );
    if (missing.length) console.log(`       missing: ${missing.map((s) => `"${s}"`).join(', ')}`);
    if (wrong.length) console.log(`       fired for the wrong reason: ${wrong.map((s) => `"${s}"`).join(', ')}`);
    if (cleanMismatch) console.log(`       unexpected: ${text.split('\n')[0]}`);
  }
  if (failed > 0) {
    console.error(`\nFAIL lint-dangling-imports self-test: ${failed}/${SELF_TEST_CASES.length} case(s) failed.`);
    process.exit(1);
  }
  console.log(
    `\nok   lint-dangling-imports self-test: ${SELF_TEST_CASES.length}/${SELF_TEST_CASES.length} cases behave as specified.`,
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// the real run
// ---------------------------------------------------------------------------

const { findings, fatal, staleWaivers, files, specifiers } = checkTree(REPO_ROOT);
if (fatal.length === 0 && findings.length === 0 && staleWaivers.length === 0) {
  console.log(
    `ok   lint-dangling-imports: ${files} source file(s), ${specifiers} statement-position relative specifier(s); ` +
      `every one resolves.`,
  );
  process.exit(0);
}
for (const f of fatal) console.error(`FAIL ${f}\n`);
if (findings.length > 0) {
  console.error(
    `FAIL lint-dangling-imports: ${findings.length} statement-position relative specifier(s) resolve to nothing.\n`,
  );
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}  [${f.kind}]  '${f.spec}'`);
    console.error(`    ${f.text}`);
  }
  console.error(
    `\n  tsc does not report an unresolved SIDE-EFFECT import, so a stale path here is a file that\n` +
      `  silently stops being tested or rendered. Fix the path, or waive it at its site when the\n` +
      `  target really is generated later:\n` +
      `    // lint:dangling-imports: allowed -- <why>\n` +
      `  The reason is mandatory, and a waiver that suppresses nothing fails this guard.\n`,
  );
}
if (staleWaivers.length > 0) {
  console.error(`FAIL lint:dangling-imports: ${staleWaivers.length} waiver(s) suppress nothing.\n`);
  for (const w of staleWaivers) {
    console.error(`  ${w.file}:${w.line}  stale ${w.marker} waiver  (delete the marker, or its reason is stale)`);
  }
  console.error('');
}
process.exit(1);
