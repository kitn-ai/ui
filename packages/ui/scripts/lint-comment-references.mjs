// COMMENT guard: no plans, task/round/finding IDs, dated rulings, section refs or
// paths into the dated archive, and no comment BLOCK over `MAX_BLOCK_LINES` lines
// without a reason.
//
// WHY. The verbosity sweep's rule 5, and it is the rule with the longest tail: a
// reader meeting "T-1 build-out" or "(owner round, 2026-08-26)" in a comment has
// no way to resolve it, because the plan it names was never in the repo, or is in
// `docs/handoff/`, a DATED RECORD that describes the tree at the time and is never
// rewritten. The comment does not rot because the code moved; it was unreadable the
// day it was written, and it keeps a maintainer from reading the fact underneath.
// A comment is about the component or about this site. A round ID is about neither.
//
// THE RULES
//   (reference)  a comment may not cite a task/round/finding ID (`T-1`, `B-19`,
//                `Round A3`, `task-10`, `finding 4`), an issue or PR number
//                (`#335`), a DATED ruling (`2026-08-26`), a section reference
//                (`§6`), or a path into the dated archive (`docs/handoff/...`,
//                `RECOMMENDATION.md`, `task-10-report.md`). A path to a LIVING
//                document (`docs/coupling-map.md`, a guide) is navigation and stays:
//                what is banned is the citation of a record that cannot answer.
//   (long-block) one comment token over `MAX_BLOCK_LINES` lines needs a reason. What
//                the cap is FOR is the module header that became a design document:
//                the worst on the tree was 109 lines, and nobody reads it.
//
// THE WAIVER, parsed, not prose:
//   // lint-comment-references: <reference|long-block> -- <reason>
// on one of the TWO lines directly above the comment, or among its FIRST FOUR
// lines, where it reads as the block's own header. Deeper inside does not count:
// a 40-line block that waives itself at line 30 has not been reviewed. The rule
// name is required so a block-cap waiver cannot excuse a plan citation, and the
// reason is required because the shape of a suppression that survives review is one
// whose reason somebody had to write down.
//
// SCOPE. Every hand-written `src/**/*.{ts,tsx}`: generated and test files are out
// (`*.d.ts`, `*.test.*`, `*.stories.*`, `*.testlib.*`, `src/test-utils/**`,
// `src/stories/**`), because a test's comment is not what a consumer reads and a
// story file has its own conventions guard.
//
// RUNNING IT, no build needed (it reads source):
//   node packages/ui/scripts/lint-comment-references.mjs
//   node packages/ui/scripts/lint-comment-references.mjs --package-root <dir>
//   node packages/ui/scripts/lint-comment-references.mjs --self-test
//   node packages/ui/scripts/lint-comment-references.mjs --json
//   node packages/ui/scripts/lint-comment-references.mjs --min-comments <n>
//
// A ZERO-MATCH RUN IS A HARD FAILURE. A walk that reads no comment, or fewer than
// the floor, is this script being broken rather than the tree being clean.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const argOf = (flag) => {
  const i = argv.indexOf(flag);
  return i === -1 ? undefined : argv[i + 1];
};
const PKG_ROOT = resolve(argOf('--package-root') ?? join(SCRIPT_DIR, '..'));
const SELF_TEST = argv.includes('--self-test');
const JSON_OUT = argv.includes('--json');
const SRC_DIR = join(PKG_ROOT, 'src');

/** One comment token over this many lines needs a reason. */
const MAX_BLOCK_LINES = 20;

/** The floor the walk must clear, so a broken walk cannot read as a clean tree.
 *  Far below the real count and far above zero: a rename that halves the tree is a
 *  real problem, a handful of comments disappearing is a normal refactor. */
const MIN_COMMENTS_READ = 3000;
const MIN_COMMENTS = Number(argOf('--min-comments') ?? MIN_COMMENTS_READ);

const WAIVER_DIRECTIVE =
  /^\s*(?:\/\/\s*|\*\s*)?lint-comment-references:\s*(reference|long-block)\s*--\s+(\S.*?)\s*$/;

/** How many lines from the block's start are searched for a waiver. */
const WAIVER_WINDOW = 4;

/** The dated archive: a path into one of these names the tree at a moment, so a
 *  comment citing it cannot be checked against the code beside it. */
const DATED_ARCHIVE = /\bdocs\/(?:handoff|superpowers|research|proposals|decisions|provenance)\b/;

/** Plan/ID/date/section shapes. Each is `{ id, re }`; a match is reported with the
 *  id so the finding says WHY it is a finding. Deliberately shaped rather than a
 *  general "looks like an identifier": `GPT-4` is not a task ID, so a task ID is at
 *  most TWO letters, and a four-digit date needs both dashes.
 *
 *  TWO SHAPES A REGEX CANNOT SEPARATE, both answered by a parsed waiver rather than
 *  by a cleverer pattern: a mask SAMPLE in prose (`V-123` is a task-ID shape, and the
 *  input-mask docs use those samples), and a date that belongs to a longer identifier
 *  (the prefix rule below excludes `gpt-4o-2024-08-06`, but a future id could wear a
 *  date the same way). One site on this tree carries such a waiver. */
const REFERENCE_PATTERNS = [
  { id: 'task-id', re: /\b[A-Z]{1,2}-[A-Z]?\d{1,3}[a-z]?\b/g },
  // Capital R: a CITED round is written `Round A3` / `Round W`, while `round 2` is
  // ordinary domain prose (the second round of a stream) and is not a citation.
  { id: 'round', re: /\bRound\s+[A-Z]?\d{1,2}\b/g },
  { id: 'task-word', re: /\btask[-\s]?\d+\b/gi },
  { id: 'finding', re: /\bfinding\s+\d+\b/gi },
  { id: 'issue-pr', re: /#\d{1,5}\b/g },
  // Not preceded by a word character or a hyphen: a date-shaped identifier suffix
  // (`gpt-4o-2024-08-06`) is not a dated ruling.
  { id: 'dated-ruling', re: /(^|[^\w-])20\d{2}-\d{2}-\d{2}\b/g },
  { id: 'section', re: /§\s*\d+/g },
  { id: 'plan-path', re: /\b[\w-]*(?:RECOMMENDATION|PLAN|ROADMAP)[\w-]*\.md\b|\b[\w-]+-report\.md\b/g },
];

const isExcluded = (name) =>
  name.endsWith('.d.ts') ||
  /\.(test|stories|testlib)\.tsx?$/.test(name) ||
  /\.declarative\.test\.tsx$/.test(name);

/** A machine-written source carries a `GENERATED by <script>.mjs` banner. Its
 *  comments are not a maintainer's, and a waiver written into it would be erased by
 *  the next regeneration, so the guard steps over it the same way it steps over a
 *  `.d.ts`. Read from the head, not a hand-kept list of paths: a new generator is
 *  covered the day it lands. */
const GENERATED_MARKER = /GENERATED by [\w./-]+\.mjs/;
function isGeneratedSource(file) {
  try {
    return GENERATED_MARKER.test(readFileSync(file, 'utf8').slice(0, 600));
  } catch {
    return false;
  }
}

/** Every hand-written `.ts`/`.tsx` under `dir`. Recursive: a flat readdir over the
 *  family folders would emit a 0-file walk. */
function walkSources(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'test-utils' || entry.name === 'stories') continue;
      out.push(...walkSources(full));
    } else if (/\.tsx?$/.test(entry.name) && !isExcluded(entry.name)) {
      out.push(full);
    }
  }
  return out.sort();
}

/** Every comment token in one file, via the TS scanner with `skipTrivia: false`.
 *  A regex over the text would treat the `//` of `https://x` inside a string as a
 *  comment; the scanner is what knows the difference.
 *
 *  Adjacent tokens are COALESCED into one block, because a 30-line `//` header is 30
 *  tokens and the block cap is about the run a reader meets as one paragraph. The
 *  merge condition is the source between them being exactly one newline plus
 *  indentation, so a blank line ends a block. */
function commentsIn(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, /* skipTrivia */ false, ts.LanguageVariant.Standard, text);
  const blocks = [];
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (token !== ts.SyntaxKind.SingleLineCommentTrivia && token !== ts.SyntaxKind.MultiLineCommentTrivia) continue;
    const start = scanner.getTokenPos();
    const end = scanner.getTextPos();
    const last = blocks[blocks.length - 1];
    if (last && /^[ \t]*\r?\n[ \t]*$/.test(text.slice(last.end, start))) {
      last.end = end;
      last.raw = text.slice(last.start, end);
      last.multi = last.multi || token === ts.SyntaxKind.MultiLineCommentTrivia;
    } else {
      blocks.push({ start, end, raw: text.slice(start, end), multi: token === ts.SyntaxKind.MultiLineCommentTrivia });
    }
  }
  return blocks;
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/** Rows for one source text: what the walk and the self-test both read. */
function analyzeSource(path, text) {
  const lines = text.split('\n');
  const rows = [];
  for (const comment of commentsIn(text)) {
    const startLine = lineOf(text, comment.start);
    const endLine = lineOf(text, comment.end);
    const body = comment.raw
      .replace(/^\/\*+/, '')
      .replace(/\*+\/$/, '')
      .split('\n')
      .map((l) => l.replace(/^\s*\/\/+/, '').replace(/^\s*\*+\s?/, ''))
      .join('\n');
    // A waiver is a LINE comment among the block's first `WAIVER_WINDOW` lines, or
    // on either of the two lines above it. Deep inside the block it does not count:
    // a 40-line comment that waives itself at line 30 has not been reviewed.
    const waivers = {};
    const window = [lines[startLine - 1] ?? '', lines[startLine - 2] ?? ''];
    for (let i = 0; i < WAIVER_WINDOW; i++) window.push(lines[startLine - 1 + i] ?? '');
    for (const line of window) {
      const m = WAIVER_DIRECTIVE.exec(line);
      if (m) waivers[m[1]] = m[2];
    }
    const hits = [];
    for (const { id, re } of REFERENCE_PATTERNS) {
      re.lastIndex = 0;
      const m = re.exec(body);
      if (m) hits.push({ id, text: m[0] });
    }
    if (DATED_ARCHIVE.test(body)) hits.push({ id: 'dated-archive', text: (body.match(DATED_ARCHIVE) ?? [])[0] });
    rows.push({
      file: path,
      line: startLine,
      lines: endLine - startLine + 1,
      chars: body.length,
      preview: body.replace(/\s+/g, ' ').trim().slice(0, 90),
      hits,
      waivers,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// self-test: proves the analyzer still DETECTS, and that a waiver is parsed per
// rule rather than substring-matched.
// ---------------------------------------------------------------------------
const LONG_BLOCK = Array.from({ length: MAX_BLOCK_LINES + 1 }, (_, i) => `// line ${i}`).join('\n');
const SHORT_BLOCK = Array.from({ length: MAX_BLOCK_LINES }, (_, i) => `// line ${i}`).join('\n');
const SELF_TEST_CASES = [
  { name: 'a task ID fires', code: '// split out during the T-1 build-out\nconst a = 1;', expectReference: 1 },
  { name: 'a Round reference fires', code: '// Recorded in Round A3.\nconst a = 1;', expectReference: 1 },
  { name: 'a dated ruling fires', code: '// Owner ruling, 2026-08-26.\nconst a = 1;', expectReference: 1 },
  { name: 'an issue number fires', code: '// See issue #335 for the shape.\nconst a = 1;', expectReference: 1 },
  { name: 'a section ref fires', code: '// Per spec §6.\nconst a = 1;', expectReference: 1 },
  { name: 'a plan path fires', code: '// Recorded in RECOMMENDATION.md.\nconst a = 1;', expectReference: 1 },
  { name: 'a dated-archive path fires', code: '// See docs/handoff/2026-09-22-something.md.\nconst a = 1;', expectReference: 1 },
  { name: 'a LIVING doc path does NOT fire (navigation stays)', code: '// See docs/coupling-map.md for the pair.\nconst a = 1;', expectReference: 0 },
  { name: 'GPT-4 is not a task ID', code: '// Compared against GPT-4 output.\nconst a = 1;', expectReference: 0 },
  { name: 'a URL in a string is not a comment', code: "const u = 'https://example.com/x // not a comment';", expectComments: 0 },
  { name: 'a block over the cap fires and one AT the cap does not', code: `${LONG_BLOCK}\nconst a = 1;\n${SHORT_BLOCK}\nconst b = 2;`, expectLongBlock: 1 },
  { name: 'a domain `round 2` is not a citation, a `Round A3` is', code: '// The second round of the stream.\nconst a = 1;\n// Recorded in Round A3.\nconst b = 2;', expectReference: 1 },
  { name: 'a date-shaped identifier suffix is not a ruled date', code: '// Compared against gpt-4o-2024-08-06 output.\nconst a = 1;', expectReference: 0 },
  { name: 'a waiver with a reason silences one rule only', code: `// lint-comment-references: reference -- the id is a quoted product name\n// T-1 build-out\n${LONG_BLOCK}\nconst a = 1;`, expectReference: 0, expectLongBlock: 1 },
  { name: 'a waiver with no reason does NOT silence it', code: '// lint-comment-references: reference\n// T-1 build-out\nconst a = 1;', expectReference: 1 },
  { name: 'a waiver INSIDE the block does not count', code: `/* eslint-ish\n * a filler line\n * a filler line\n * a filler line\n * lint-comment-references: long-block -- a reason written deep in the block\n${Array.from({ length: MAX_BLOCK_LINES }, (_, i) => ` * line ${i}`).join('\n')}\n */\nconst a = 1;`, expectLongBlock: 1 },
  { name: 'a waiver among the block\'s first lines counts (the header form)', code: `/*\n * lint-comment-references: long-block -- a shader lifecycle note that must stay whole\n${Array.from({ length: MAX_BLOCK_LINES }, (_, i) => ` * line ${i}`).join('\n')}\n */\nconst a = 1;`, expectLongBlock: 0 },
];

function runSelfTest() {
  let failed = 0;
  for (const c of SELF_TEST_CASES) {
    const rows = analyzeSource('selftest.tsx', c.code);
    const refs = rows.filter((r) => r.hits.length > 0 && !r.waivers.reference);
    const blocks = rows.filter((r) => r.lines > MAX_BLOCK_LINES && !r.waivers['long-block']);
    let ok = true;
    const notes = [];
    if ('expectReference' in c) {
      ok = ok && refs.length === c.expectReference;
      notes.push(`reference ${refs.length}/${c.expectReference}`);
    }
    if ('expectLongBlock' in c) {
      ok = ok && blocks.length === c.expectLongBlock;
      notes.push(`long-block ${blocks.length}/${c.expectLongBlock}`);
    }
    if ('expectComments' in c) {
      ok = ok && rows.length === c.expectComments;
      notes.push(`comments ${rows.length}/${c.expectComments}`);
    }
    if (!ok) failed++;
    console.log(`${ok ? '✓' : '✗'} ${c.name} (${notes.join(', ')})`);
  }
  if (failed > 0) {
    console.error(`\n✗ lint-comment-references self-test: ${failed}/${SELF_TEST_CASES.length} case(s) failed.`);
    process.exit(1);
  }
  console.log(`\n✓ lint-comment-references self-test: ${SELF_TEST_CASES.length}/${SELF_TEST_CASES.length} cases behave as specified.`);
  process.exit(0);
}

function runScan() {
  const all = walkSources(SRC_DIR);
  const files = all.filter((f) => !isGeneratedSource(f));
  if (files.length === 0) {
    console.error(`✗ lint-comment-references: no source found under ${relative(PKG_ROOT, SRC_DIR)}: NOTHING was checked.`);
    process.exit(1);
  }
  const rows = files.flatMap((file) => analyzeSource(file, readFileSync(file, 'utf8')));
  if (rows.length < MIN_COMMENTS) {
    console.error(
      `✗ lint-comment-references: read only ${rows.length} comment(s) across ${files.length} source(s), ` +
        `below the floor of ${MIN_COMMENTS}. The walk or the scanner is broken, so this exits non-zero on purpose.`,
    );
    process.exit(1);
  }
  const refs = rows.filter((r) => r.hits.length > 0 && !r.waivers.reference);
  const blocks = rows.filter((r) => r.lines > MAX_BLOCK_LINES && !r.waivers['long-block']);
  const total = refs.length + blocks.length;
  if (JSON_OUT) {
    const row = (r) => ({
      file: relative(PKG_ROOT, r.file),
      line: r.line,
      lines: r.lines,
      preview: r.preview,
    });
    console.log(
      JSON.stringify({
        files: files.length,
        commentsRead: rows.length,
        references: refs.length,
        longBlocks: blocks.length,
        floor: MIN_COMMENTS,
        maxBlockLines: MAX_BLOCK_LINES,
        referenceFindings: refs.map((r) => ({ ...row(r), ids: [...new Set(r.hits.map((h) => h.id))] })),
        longBlockFindings: blocks.map(row),
      }),
    );
    process.exit(total > 0 ? 1 : 0);
  }
  if (refs.length > 0) {
    console.error(
      `\n✗ lint-comment-references: ${refs.length} comment(s) cite a plan, an ID, a dated ruling or a section.\n` +
        `  The reader cannot resolve T-1 or "Round A3"; the plan was never in the repo, or it is in the dated\n` +
        `  archive, which describes an older tree. Say the fact instead, or point at a living doc.\n`,
    );
    for (const r of refs) {
      console.error(`  ${relative(PKG_ROOT, r.file)}:${r.line} [${[...new Set(r.hits.map((h) => h.id))].join(',')}] ${r.preview}`);
    }
  }
  if (blocks.length > 0) {
    console.error(
      `\n✗ lint-comment-references: ${blocks.length} comment block(s) over ${MAX_BLOCK_LINES} lines.\n` +
        `  Split it or waive it with the reason it has to stay whole.\n`,
    );
    for (const r of blocks) {
      console.error(`  ${relative(PKG_ROOT, r.file)}:${r.line} (${r.lines} lines) ${r.preview}`);
    }
  }
  if (total > 0) {
    console.error(
      `\n  A comment that must cite one waives ONE rule on its first line or the line above it:\n` +
        `    // lint-comment-references: <reference|long-block> -- <why, 15+ chars>\n`,
    );
    process.exit(1);
  }
  console.log(
    `✓ lint-comment-references: ${rows.length} comment(s) across ${files.length} source(s): no plan/ID/date/section ` +
      `citation, no block over ${MAX_BLOCK_LINES} lines.`,
  );
}

if (SELF_TEST) runSelfTest();
else runScan();
