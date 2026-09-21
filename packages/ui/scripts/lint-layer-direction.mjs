#!/usr/bin/env node
/**
 * Guard: no UPWARD VALUE import across the package's source layers.
 *
 * THE RULE, one line: a VALUE import may point at the importing file's own layer
 * or at one BELOW it, never above. `src/state` importing `src/utils` is fine;
 * `src/utils` importing `src/state` is a finding.
 *
 * THE TIER ORDER, bottom to top. MEASURED, and it IS the rule: do not reorder it
 * without measuring again.
 *
 *   src/utils, src/primitives, src/schemas, src/state, src/stores, src/wire,
 *   src/diagnostics, src/components, src/web-components, frameworks, mcp
 *
 * `src/state/` sits BELOW `src/stores/` on purpose: a store is a reactive wrapper
 * over the pure folds in `src/state`, so `stores -> state` is the intended
 * direction and nothing in `src/state/` imports `src/stores/`. Moving a store
 * down into `src/state/` would be the violation, not this.
 *
 * `src/web-components/` is a facade over the Solid components in
 * `src/components/`, so a component importing the facade layer is a real cycle
 * and not a style nit: the load order stops being resolvable, and the two layers
 * can neither be split nor reasoned about at publish time.
 *
 * TYPE-ONLY IMPORTS ARE ALWAYS ALLOWED, upward or not, and that is the repo's
 * position already, stated at the site in `src/wire/diagnostics.ts`: "TYPE-ONLY,
 * and that is what makes it legal here". A type-only import vanishes at build,
 * so it cannot create a load-order or bundler cycle. All three spellings count:
 * `import type { A } from`, `import { type A, type B } from` (EVERY named
 * specifier prefixed), and `import type A from`. A bare `import 'x'` is a VALUE:
 * it runs the module for its side effect.
 *
 * RESOLUTION, NOT PREFIX MATCHING. The specifier is resolved against the
 * importing file, then tried as `.ts` / `.tsx` / `.d.ts` / `.json`, then as
 * `index.ts` / `index.tsx`. A `.js` or `.mjs` specifier (the NodeNext spelling
 * this repo writes) also maps onto its `.ts` / `.tsx` sibling. Two bugs of
 * exactly the prefix-matching shape shipped in this repo in one day: a
 * `startsWith('../components/')` test that silently matched nothing once the
 * files moved one directory deeper, and a codemod that resolved against the
 * wrong tree. Both reported a clean tree.
 *
 * WAIVERS, same shape as the sibling guards: `lint-layer-direction: allowed --
 * <reason>` on a line waives that line, `lint-layer-direction: file-waived --
 * <reason>` in a file waives the file. The reason is mandatory, so a bare marker
 * waives nothing (`lint-layer-names.mjs` once waived ITSELF because it matched
 * the marker string it defines).
 *
 * THE DECLARED EXCEPTIONS live in ALLOWED_EDGES below, keyed by (file, resolved
 * target module) so a DIFFERENT upward edge in the same file still fires. The
 * construct engine under `mcp/construct` is the kit's own builder runtime, and
 * moving its zod schema into `src/` is a separate, larger change, so those edges
 * are waived here rather than by a comment in a shipped source file, which would
 * outlive its reason. An entry whose importing file is in the tree but whose edge
 * no longer fires fails the run, so the table cannot rot open either.
 *
 * VACUITY. A scan that walks nothing, or resolves no relative specifier, is a
 * hard failure: it prints the same clean line as a tree with no violations. The
 * floor is far below this tree and far above any accident that would empty it.
 *
 * OUT OF SCOPE, stated rather than implied. Files outside a listed layer
 * (`src/index.ts`, `src/solid.ts`, `src/types.ts`, `src/remote/`, `src/themes/`,
 * `apps/`, `tests/`, `scripts/`) have no rank, so they are neither importers nor
 * targets. Bare and aliased specifiers are not resolved: there is no source file
 * to rank them against, and no file inside a listed layer writes one today.
 * Dynamic `import()` is not a load-order edge. Test and story files are not
 * shipped. Each of those would need a decision this rule does not make.
 *
 *   node scripts/lint-layer-direction.mjs                    # this repo
 *   node scripts/lint-layer-direction.mjs --repo-root <dir>  # any tree
 *   node scripts/lint-layer-direction.mjs --self-test        # prove it still detects
 */
import {
  existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync,
} from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const argOf = (flag) => {
  const i = argv.indexOf(flag);
  return i === -1 ? undefined : argv[i + 1];
};
// Anchored to THIS file, not the cwd: CLAUDE.md tells everyone to run from the
// repo root while `pnpm --filter` sets the cwd to the package.
const REPO_ROOT = resolve(argOf('--repo-root') ?? join(scriptDir, '..', '..', '..'));
const SELF_TEST = argv.includes('--self-test');

/**
 * The measured tier order, BOTTOM to TOP. The array index IS the rank, so this
 * table is the whole rule; the directory prefix is how a resolved file finds its
 * row.
 */
const LAYERS = [
  ['utils', 'packages/ui/src/utils/'],
  ['primitives', 'packages/ui/src/primitives/'],
  ['schemas', 'packages/ui/src/schemas/'],
  // `state` below `stores`: a store wraps the pure folds, never the reverse.
  ['state', 'packages/ui/src/state/'],
  ['stores', 'packages/ui/src/stores/'],
  ['wire', 'packages/ui/src/wire/'],
  ['diagnostics', 'packages/ui/src/diagnostics/'],
  ['components', 'packages/ui/src/components/'],
  ['web-components', 'packages/ui/src/web-components/'],
  ['frameworks', 'packages/ui/frameworks/'],
  ['mcp', 'packages/ui/mcp/'],
];
const RANK = new Map(LAYERS.map(([name], i) => [name, i]));

/** Directories never walked: build output, dependencies, other checkouts. */
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'storybook-static', '.kai', '.nx', 'coverage',
  '.astro', '.vercel', '.wrangler', '.turbo', '.output', '.cache', '.superpowers', 'tmp',
  // The dated record tree, and the docs site's own copies of built output. A record
  // of what the tree looked like THEN cannot be held to today's layering.
  'docs',
]);
/**
 * Skipped by PATH rather than by directory name: `.claude/worktrees/` holds
 * sibling checkouts of this repo, so walking into one reports findings for a tree
 * nobody is working in.
 */
const SKIP_PREFIXES = ['.claude/worktrees/'];
/** Not shipped, so not held to the layering: tests and stories. */
const SKIP_FILE_RE = /\.(?:test|spec)\.|\.stories\./;
/**
 * This guard's own two files, skipped on purpose. The fixture corpora below are
 * full of planted upward imports and of waiver markers, and the waiver check
 * reads the marker string this file defines: `lint-layer-names.mjs` waived ITSELF
 * that way. Both files sit outside every layer today, so this is belt and braces,
 * and it is stated rather than hidden.
 */
const SELF_FILES = new Set([
  'packages/ui/scripts/lint-layer-direction.mjs',
  'packages/ui/tests/scripts/layer-direction-guard-wiring.test.ts',
]);

const SOURCE_EXT = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);
/** Resolution candidates after the literal path, in the order NodeNext users expect. */
const RESOLVE_EXTS = ['ts', 'tsx', 'mts', 'cts', 'd.ts', 'json'];
const RESOLVE_INDEX_EXTS = ['ts', 'tsx', 'd.ts'];
/** A `.js`/`.mjs` specifier is the NodeNext spelling of a `.ts`/`.tsx` sibling. */
const NODENEXT_EXTS = new Set(['.js', '.mjs', '.cjs']);

/**
 * The vacuity floor. The walk sees ~1170 source files on today's tree and ~700 of
 * them sit inside a ranked layer; 300 is far below both and far above a scan
 * accidentally rooted at a single layer directory. It exists so an empty walk
 * cannot print the clean line: `--self-test` drives a case that trips it.
 */
const MIN_FILES = 300;

const FILE_WAIVER_RE = /lint-layer-direction: file-waived -- \S/;
const LINE_WAIVER_RE = /lint-layer-direction: allowed -- \S/;

/**
 * The declared exceptions, keyed `"<importing file> -> <resolved target module>"`.
 * The target is the repo-relative resolved path with its extension stripped, so an
 * `index.ts` barrel is named `.../index`. Keyed by the PAIR rather than by file,
 * so a different upward edge in the same file still fires.
 *
 * `src/components/builder/builder-panel-derived.tsx` is deliberately NOT listed:
 * both of its edges into `mcp/construct` are type-only, which the rule allows on
 * its own, and listing it here would also silence the day one of them becomes a
 * value import.
 */
const ALLOWED_EDGES = new Map([
  [
    'packages/ui/src/primitives/construct-form-paths.ts -> packages/ui/mcp/construct/schema',
    "the construct engine under mcp/construct is the kit's own builder runtime, and moving its zod schema into src/ is a separate, larger change",
  ],
  [
    'packages/ui/src/components/builder/builder-start.tsx -> packages/ui/mcp/construct/templates',
    "same: the construct engine is the kit's own builder runtime, so its templates are read from where they live",
  ],
]);

/** `import ... from '<spec>'` / `import '<spec>'` / `export ... from '<spec>'`.
 *  The clause class excludes quotes and `;` but ALLOWS newlines on purpose, so a
 *  multi-line named import is one match; it still cannot walk past a statement
 *  boundary into the next statement when a bare import sits above a named one.
 *  (A measurement whose clause stopped at a newline missed the multi-line
 *  `primitives -> state` edge this guard was written for, so a four-line import
 *  is a fixture below.) */
const IMPORT_FROM_RE = /\bimport\s+([^;'"]*?)\bfrom\s*['"]([^'"]+)['"]/g;
const BARE_IMPORT_RE = /\bimport\s*['"]([^'"]+)['"]/g;
const EXPORT_FROM_RE = /\bexport\s+([^;'"]*?)\bfrom\s*['"]([^'"]+)['"]/g;

/** Does the clause before `from` bind only types? */
function isTypeOnlyImport(clause) {
  if (/^\s*type\b/.test(clause)) return true; // `import type { A } from` / `import type A from`
  if (!/^\{/.test(clause)) return false; // `import A from` binds a value
  const named = (/^\{([\s\S]*)\}/.exec(clause)?.[1] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  // `import {} from` runs the module for its side effect, so an empty list is a value.
  return named.length > 0 && named.every((s) => s.startsWith('type '));
}

function isTypeOnlyExport(clause) {
  if (/^\s*type\b/.test(clause)) return true; // `export type { A } from` / `export type * from`
  if (/^\*/.test(clause)) return false; // `export * from` / `export * as ns from`
  if (!/^\{/.test(clause)) return false;
  const named = (/^\{([\s\S]*)\}/.exec(clause)?.[1] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return named.length > 0 && named.every((s) => s.startsWith('type '));
}

/** Every import in one file's text, as { spec, typeOnly, at, end } with offsets. */
function importSpecifiers(text) {
  const out = [];
  for (const [re, kind] of [
    [IMPORT_FROM_RE, 'import'],
    [BARE_IMPORT_RE, 'bare'],
    [EXPORT_FROM_RE, 'export'],
  ]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (kind === 'bare') {
        out.push({ spec: m[1], typeOnly: false, kind, at: m.index, end: m.index + m[0].length });
      } else {
        const clause = m[1];
        out.push({
          spec: m[2],
          typeOnly: kind === 'import' ? isTypeOnlyImport(clause) : isTypeOnlyExport(clause),
          kind,
          at: m.index,
          end: m.index + m[0].length,
        });
      }
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

function isFile(path) {
  return statSync(path, { throwIfNoEntry: false })?.isFile() === true;
}

/**
 * Resolve one specifier to a real file, or null. Relative only: a bare specifier
 * names a package, not a path in this tree, so there is no layer to compare with.
 */
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

/** The layer a file belongs to, or null when it is outside every layer. */
function layerOf(abs, root) {
  const rel = relative(root, abs).split(sep).join('/');
  for (const [name, prefix] of LAYERS) if (rel.startsWith(prefix)) return name;
  return null;
}

/** The key ALLOWED_EDGES is written with: repo-relative module, no extension. */
function moduleKey(abs, root) {
  return relative(root, abs).split(sep).join('/').replace(/\.(?:d\.ts|tsx|mts|cts|ts|jsx|mjs|cjs|js|json)$/, '');
}

function walk(dir, out = [], root = dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = relative(root, full).split(sep).join('/') + '/';
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !SKIP_PREFIXES.some((p) => rel.startsWith(p))) walk(full, out, root);
    } else if (SOURCE_EXT.has(extname(entry.name)) && !SKIP_FILE_RE.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Every finding in one tree. Pure over the filesystem, so `--self-test` drives it
 * over fixtures; the exits live in the caller.
 */
function checkTree(root, allowedEdges = ALLOWED_EDGES) {
  const findings = [];
  const fatal = [];
  const files = walk(root);
  const usedAllowed = new Set();
  let specifiers = 0;

  // Vacuity. A run that walked nothing prints the same clean line as a repo with
  // no violations, and a walk that resolves nothing cannot tell an upward edge
  // from a missing file.
  if (files.length < MIN_FILES) {
    fatal.push(`walked ${files.length} source file(s) under ${root}: a run this small has stopped scanning.`);
  }

  for (const abs of files) {
    const rel = relative(root, abs).split(sep).join('/');
    if (SELF_FILES.has(rel)) continue;
    const fromLayer = layerOf(abs, root);
    if (fromLayer === null) continue;

    let text;
    try {
      text = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    if (FILE_WAIVER_RE.test(text)) continue;

    const lines = text.split('\n');
    for (const hit of importSpecifiers(text)) {
      if (!hit.spec.startsWith('.')) continue;
      specifiers += 1;
      const target = resolveSpecifier(hit.spec, abs);
      if (target === null) continue;
      const toLayer = layerOf(target, root);
      if (toLayer === null) continue; // outside every layer: no rank to compare
      if (RANK.get(toLayer) <= RANK.get(fromLayer)) continue; // same rank or downward
      if (hit.typeOnly) continue; // erased at build, so it cannot cycle

      const line = text.slice(0, hit.at).split('\n').length;
      const endLine = text.slice(0, hit.end).split('\n').length;
      const key = `${rel} -> ${moduleKey(target, root)}`;
      if (allowedEdges.has(key)) {
        usedAllowed.add(key);
        continue;
      }
      const waived = lines.slice(line - 1, endLine).some((l) => LINE_WAIVER_RE.test(l));
      if (waived) continue;
      findings.push({
        file: rel,
        line,
        from: fromLayer,
        to: toLayer,
        spec: hit.spec,
        key,
        text: lines[line - 1]?.trim().slice(0, 120) ?? '',
      });
    }
  }

  if (specifiers === 0) {
    fatal.push(
      `walked ${files.length} file(s) under ${root} and resolved NO relative specifier at all: ` +
        `a scan that resolves nothing reads exactly like a tree with no upward import.`,
    );
  }

  // An exception that is no longer hit is an exception nobody can justify, and it
  // would silently cover a future edge in the same file. Same rule the sibling
  // guards apply to a waiver that has outlived its reason. Only entries whose
  // importing file is IN this tree are judged: a tree the linter is pointed at
  // with `--repo-root` has no business proving anything about another tree's
  // declared exceptions.
  const walked = new Set(files.map((f) => relative(root, f).split(sep).join('/')));
  for (const key of allowedEdges.keys()) {
    if (usedAllowed.has(key)) continue;
    const [file] = key.split(' -> ');
    if (!walked.has(file)) continue;
    fatal.push(
      `ALLOWED_EDGES names an edge in ${file} that no longer fires: ${key}. Delete the entry, or ` +
        `the declared exception outlives the reason it was written for.`,
    );
  }

  return { findings, fatal, files: files.length, specifiers, allowed: allowedEdges.size };
}

// ---------------------------------------------------------------------------
// self-test: proves the analyzer still DETECTS, in either direction.
// Fixtures are built in a temp dir and driven through the REAL walk and resolver,
// so "zero findings" here means the resolver ran and found nothing, not that it
// matched nothing.
// ---------------------------------------------------------------------------

/** Padding: clears the vacuity floor so a fixture exercises the real scan. */
function pad(count = MIN_FILES + 12) {
  const out = {};
  for (let i = 0; i < count; i++) out[`packages/ui/src/utils/pad-${i}.ts`] = `export const pad${i} = ${i};\n`;
  return out;
}

const TYPES = 'export interface A { a: number }\nexport type B = string;\nexport default (() => 1);\n';
const SIBLING = 'export const sibling = 1;\n';

/** A tree with no upward value edge: downward, same-rank and type-only edges, so
 *  the relative-specifier floor is satisfied by a genuinely clean scan. */
const CLEAN = {
  ...pad(),
  'packages/ui/src/utils/base.ts': 'export const base = 1;\n',
  'packages/ui/src/primitives/downward.ts': `import { base } from '../utils/base';\n`,
  'packages/ui/src/components/sibling.ts': SIBLING,
  'packages/ui/src/components/index.ts': `export { sibling } from './sibling';\n`,
  'packages/ui/src/components/same-rank.ts': `import { sibling } from './sibling';\n`,
  'packages/ui/src/components/types.ts': TYPES,
  'packages/ui/src/state/folds.ts': 'export const fold = 1;\n',
  'packages/ui/src/stores/holder.ts': 'export const holder = 1;\n',
  'packages/ui/src/utils/type-only.ts': `import type { A } from '../components/types';\n`,
};

const SELF_TEST_CASES = [
  { name: 'a clean tree draws EXACTLY zero findings', files: CLEAN, expect: [] },
  {
    name: 'an upward VALUE import fires',
    files: { ...CLEAN, 'packages/ui/src/utils/planted.ts': `import { x } from '../components/sibling';\n` },
    expect: ['utils/planted.ts:1', 'utils -> components'],
  },
  {
    name: 'all three TYPE-ONLY spellings are allowed upward',
    files: {
      ...CLEAN,
      'packages/ui/src/utils/t1.ts': `import type { A } from '../components/types';\n`,
      'packages/ui/src/utils/t2.ts': `import { type A, type B } from '../components/types';\n`,
      'packages/ui/src/utils/t3.ts': `import type A from '../components/types';\n`,
    },
    expect: [],
  },
  {
    name: 'stores -> state is DOWNWARD: a store is a wrapper over the pure folds',
    files: {
      ...CLEAN,
      'packages/ui/src/stores/reads-folds.ts': `import { fold } from '../state/folds';\n`,
    },
    expect: [],
  },
  {
    name: 'state -> stores is UPWARD, so the corrected tier order cannot be quietly reversed',
    files: {
      ...CLEAN,
      'packages/ui/src/state/reads-a-store.ts': `import { holder } from '../stores/holder';\n`,
    },
    expect: ['state/reads-a-store.ts:1', 'state -> stores'],
  },
  {
    name: 'a same-rank value import is allowed',
    files: { ...CLEAN, 'packages/ui/src/components/peer.ts': `import { sibling } from './sibling';\n` },
    expect: [],
  },
  {
    name: 'a downward value import is allowed',
    files: { ...CLEAN, 'packages/ui/src/wire/reads-utils.ts': `import { base } from '../utils/base';\n` },
    expect: [],
  },
  {
    name: 'a bare side-effect import upward is a VALUE import',
    files: { ...CLEAN, 'packages/ui/src/utils/side.ts': `import '../components/sibling';\n` },
    expect: ['utils/side.ts:1', 'utils -> components'],
  },
  {
    name: 'an upward VALUE re-export fires too (a barrel is a real edge)',
    files: { ...CLEAN, 'packages/ui/src/utils/barrel.ts': `export { sibling } from '../components/sibling';\n` },
    expect: ['utils/barrel.ts:1', 'utils -> components'],
  },
  {
    name: 'the .js -> .ts NodeNext specifier resolves, and fires',
    files: { ...CLEAN, 'packages/ui/src/utils/nodenext.ts': `import { sibling } from '../components/sibling.js';\n` },
    expect: ['utils/nodenext.ts:1', 'utils -> components'],
  },
  {
    name: 'the .js -> .ts resolution also allows a DOWNWARD edge',
    files: { ...CLEAN, 'packages/ui/src/wire/nodenext-down.ts': `import { base } from '../utils/base.js';\n` },
    expect: [],
  },
  {
    name: 'an upward edge into an index barrel resolves to the barrel module',
    files: { ...CLEAN, 'packages/ui/src/utils/barrel-import.ts': `import { s } from '../components';\n` },
    expect: ['utils -> components'],
  },
  {
    name: 'a line waiver is honoured, its neighbour is not',
    files: {
      ...CLEAN,
      'packages/ui/src/utils/waived.ts':
        `import { x } from '../components/sibling'; // lint-layer-direction: allowed -- the facade owns this one\n` +
        `import { y } from '../components/types';\n`,
    },
    expect: ['utils/waived.ts:2'],
    reject: ['utils/waived.ts:1'],
  },
  {
    name: 'a file waiver is honoured',
    files: {
      ...CLEAN,
      'packages/ui/src/utils/file-waived.ts':
        `// lint-layer-direction: file-waived -- this file is the facade's own bridge\n` +
        `import { x } from '../components/sibling';\n`,
    },
    expect: [],
  },
  {
    name: 'a marker with NO reason waives nothing',
    files: {
      ...CLEAN,
      'packages/ui/src/utils/no-reason-line.ts':
        `import { x } from '../components/sibling'; // lint-layer-direction: allowed\n`,
      'packages/ui/src/utils/no-reason-file.ts':
        `// lint-layer-direction: file-waived\nimport { x } from '../components/sibling';\n`,
    },
    expect: ['utils/no-reason-line.ts:1', 'utils/no-reason-file.ts:2'],
  },
  {
    name: 'a MULTI-LINE upward value import fires on its first line',
    files: {
      ...CLEAN,
      'packages/ui/src/utils/multi-line.ts':
        `import {\n` +
        `  first, second, third,\n` +
        `  fourth, type Fifth, type Sixth,\n` +
        `} from '../components/sibling';\n`,
    },
    expect: ['utils/multi-line.ts:1', 'utils -> components'],
  },
  {
    name: 'a MULTI-LINE type-only upward import is allowed',
    files: {
      ...CLEAN,
      'packages/ui/src/utils/multi-line-types.ts':
        `import {\n  type A,\n  type B,\n} from '../components/types';\n`,
    },
    expect: [],
  },
  {
    name: 'a declared exception covers its own edge and NOT another edge in the same file',
    files: {
      ...CLEAN,
      'packages/ui/src/utils/declared.ts':
        `import { x } from '../components/sibling';\nimport { y } from '../components/types';\n`,
    },
    allowed: [['packages/ui/src/utils/declared.ts -> packages/ui/src/components/sibling', 'declared']],
    expect: ['utils/declared.ts:2'],
    reject: ['utils/declared.ts:1'],
  },
  {
    name: 'a declared exception that no longer fires is itself a failure',
    files: {
      ...CLEAN,
      'packages/ui/src/utils/gone.ts': `import { base } from './base';\n`,
    },
    allowed: [['packages/ui/src/utils/gone.ts -> packages/ui/src/components/sibling', 'stale']],
    expect: ['no longer fires'],
  },
  {
    name: 'a declared exception for a file this tree does not hold is not judged',
    files: CLEAN,
    allowed: [['packages/ui/src/elsewhere/other.ts -> packages/ui/src/components/sibling', 'another tree']],
    expect: [],
  },
  {
    name: 'an unlayered target is not judged (out of scope, stated in the header)',
    files: { ...CLEAN, 'packages/ui/src/types.ts': 'export interface T { t: number }\n', 'packages/ui/src/utils/unlayered.ts': `import type { T } from '../types';\n` },
    expect: [],
  },
  {
    name: 'a bare specifier is not resolved (no source file to rank it against)',
    files: { ...CLEAN, 'packages/ui/src/utils/bare.ts': `import { createSignal } from 'solid-js';\n` },
    expect: [],
  },
  {
    name: 'VACUITY: a tree too small to have scanned anything',
    files: { 'packages/ui/src/utils/only.ts': `import { x } from './only';\n` },
    expect: ['has stopped scanning'],
  },
  {
    name: 'VACUITY: a tree that resolves no relative specifier at all',
    files: { ...pad(), 'packages/ui/src/utils/no-imports.ts': 'export const x = 1;\n' },
    expect: ['resolved NO relative specifier'],
  },
];

const findingText = (v) =>
  [...v.fatal, ...v.findings.map((f) => `${f.file}:${f.line} ${f.from} -> ${f.to} '${f.spec}'`)].join('\n');

function writeFixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'lint-layer-direction-'));
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
    const verdict = checkTree(writeFixture(c.files), new Map(c.allowed ?? []));
    const text = findingText(verdict);
    const missing = c.expect.filter((s) => !text.includes(s));
    const wrong = (c.reject ?? []).filter((s) => text.includes(s));
    const cleanMismatch = c.expect.length === 0 && verdict.findings.length + verdict.fatal.length > 0;
    const ok = missing.length === 0 && wrong.length === 0 && !cleanMismatch;
    if (!ok) failed++;
    const got = verdict.findings.length + verdict.fatal.length;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${c.name} (expected ${c.expect.length === 0 ? 'clean' : c.expect.map((s) => `"${s}"`).join(' + ')}, got ${got === 0 ? 'clean' : `${got} finding(s)`})`);
    if (missing.length) console.log(`       missing: ${missing.map((s) => `"${s}"`).join(', ')}`);
    if (wrong.length) console.log(`       fired for the wrong reason: ${wrong.map((s) => `"${s}"`).join(', ')}`);
    if (cleanMismatch) console.log(`       unexpected: ${text.split('\n')[0]}`);
  }
  if (failed > 0) {
    console.error(`\nFAIL lint-layer-direction self-test: ${failed}/${SELF_TEST_CASES.length} case(s) failed.`);
    process.exit(1);
  }
  console.log(`\nok   lint-layer-direction self-test: ${SELF_TEST_CASES.length}/${SELF_TEST_CASES.length} cases behave as specified.`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// the real run
// ---------------------------------------------------------------------------

const { findings, fatal, files, specifiers, allowed } = checkTree(REPO_ROOT);
if (fatal.length === 0 && findings.length === 0) {
  console.log(
    `ok   lint-layer-direction: ${files} source file(s), ${specifiers} relative specifier(s); no upward ` +
      `value import across ${LAYERS.length} layers (${allowed} declared exception(s) in ALLOWED_EDGES).`,
  );
  process.exit(0);
}
for (const f of fatal) console.error(`FAIL ${f}\n`);
if (findings.length > 0) {
  console.error(`FAIL lint-layer-direction: ${findings.length} upward value import(s) across the source layers.\n`);
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}  [value]  ${f.from} -> ${f.to}  '${f.spec}'`);
    console.error(`    ${f.text}`);
  }
  console.error(
    `\n  A layer imports from BELOW it or from its own layer, never from above: an upward value\n` +
      `  edge is what stops the load order resolving and stops the two layers being split or\n` +
      `  published apart. Fix it one of two ways:\n` +
      `    - move the file into the layer it belongs to (usually the real fix), or\n` +
      `    - declare the edge at its site:  // lint-layer-direction: allowed -- <why>\n` +
      `      The reason is mandatory; a bare marker waives nothing. If the edge is a whole-file\n` +
      `      condition, the file half is  lint-layer-direction: file-waived -- <why>.\n`,
  );
}
process.exit(1);
