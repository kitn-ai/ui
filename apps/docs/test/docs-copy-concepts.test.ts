// GUARD -- the concept tier's prose: a paragraph is at most ~4 rendered lines.
//
// WHY THIS FILE EXISTS. Rule 4 of `docs/verbosity-sweep.md` splits the docs tree in
// two, and each half has its own copy guard:
//
//   * a COMPONENT page is reference. Its top (frontmatter `description`, `kai-lede`,
//     "When to use" aside) is measured by `docs-copy.test.ts` against the 100/140/200
//     char caps, because a reader and an agent both read it before deciding whether
//     to open the page.
//   * a CONCEPT page -- `guides/`, `patterns/`, `examples/` -- keeps its prose. Its
//     job is to teach a flow, so a cap on the page would destroy the thing the page
//     is for. The rule there is about the SHAPE of the prose, not its total size:
//     no paragraph over ~4 lines. A wall of text is where a reader stops; the same
//     facts split into two paragraphs are readable and are the same length.
//
// So this file is deliberately NOT "the concept pages are shortened". It is "no
// paragraph runs on", which is a rule a writer can hold in their head while drafting
// and a reviewer can point at without counting words.
//
// THE MEASURE, and why it is characters rather than source lines. Markdown source
// wrapping is arbitrary: the same 600 characters are 6 lines hard-wrapped at 100 and
// ONE line if the author did not wrap. Measuring source lines would flag the careful
// writer and pass the careless one for the same paragraph. So a paragraph's length is
// its rendered width: `chars / 95`, the docs column's line length, rounded up. Four
// lines is ~380 characters.
//
// WHAT IS NOT A PARAGRAPH. Fenced code, indented code, headings, list items, tables,
// blockquotes, and the contents of the JSX blocks that carry code (`<Code>`, `<Tabs>`,
// `<Terminal>`, a file tree) are all skipped. Comparing a JSON sample against a prose
// cap is a false positive that trains people to add waivers, which is how a guard
// stops meaning anything. Prose inside a prose wrapper (`<Aside>`, `<Steps>`) IS
// measured: it renders as prose.
//
// THE WAIVER is the page-level one the component guard already uses, because MDX has
// no comment syntax and a waiver inside the file would either render or break the
// build: `copyReview: waived -- <reason>` in the frontmatter. Whole-page, reason
// required, refused rather than honoured when the reason is missing.
//
// A ZERO-MATCH RUN IS A HARD FAILURE, on both axes: a glob that stopped matching
// concept pages, and a paragraph extractor that stopped finding paragraphs, each read
// as a clean tree. The floors below are the real counts (54 pages, 622 paragraphs)
// minus a wide margin, tight enough that a partial glob fails too.

import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const DOCS_ROOT = dirname(require.resolve('../package.json'));
const CONCEPT_DIRS = ['guides', 'patterns', 'examples'] as const;
const CONCEPT_ROOT = join(DOCS_ROOT, 'src', 'content', 'docs');

/** Four rendered lines at the docs column. */
const MAX_PARAGRAPH_LINES = 4;
const EST_CHARS_PER_LINE = 95;
const MAX_PARAGRAPH_CHARS = MAX_PARAGRAPH_LINES * EST_CHARS_PER_LINE;

/** Anti-vacuity floors, just under what the tree holds (54 pages, 622 paragraphs). */
const MIN_CONCEPT_PAGES = 40;
const MIN_PARAGRAPHS = 400;

/** MDX has no comment syntax, so the waiver lives in the frontmatter, whole-page. */
const WAIVER = /^waived\s+--\s+(\S(?:.*\S)?)$/;
const MIN_WAIVER_REASON_LENGTH = 10;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

/** A JSX block whose inner lines are code rather than prose. */
const CODE_BLOCK =
  /^\s*<(Code|Tabs|TabItem|pre|script|style|Terminal|Diff|FileTree|PackageManagers|LinkCard|Code2|Steps|File|Icon)\b/;

/** A paragraph that is really a data sample: braces with keys, or a record literal. */
const CODEISH = /\{[^}]*:|\b(id|role|type|parts|text|name):\s*['"]/;

interface Paragraph {
  line: number;
  chars: number;
  lines: number;
  preview: string;
}

interface ConceptPage {
  file: string;
  paragraphs: number;
  waiverReason: string | null;
  waiverError: string | null;
  over: Paragraph[];
}

function frontmatterOf(source: string): string {
  const m = FRONTMATTER.exec(source);
  return m ? m[1] : '';
}

/** `waived -- <reason>`, or an error string when the key exists but is not one. */
function waiverOf(frontmatter: string): { reason: string | null; error: string | null } {
  const line = frontmatter.split('\n').find((l) => /^copyReview:/.test(l));
  if (!line) return { reason: null, error: null };
  const value = line.slice('copyReview:'.length).trim();
  const m = WAIVER.exec(value);
  if (!m) return { reason: null, error: `copyReview is not a waiver with a reason: ${JSON.stringify(value)}` };
  if (m[1].length < MIN_WAIVER_REASON_LENGTH) {
    return { reason: null, error: `the waiver reason is too short to be one: ${JSON.stringify(m[1])}` };
  }
  return { reason: m[1], error: null };
}

/**
 * Every prose paragraph in one concept page. Exported shape is internal to the test,
 * but the extractor is a function so the fixture cases below can exercise it directly
 * rather than only through the tree.
 */
function paragraphsOf(source: string): { line: number; text: string }[] {
  // The line numbers a finding reports must be the FILE's lines, not the body's: the
  // work list a person reads is opened in an editor. Everything below is therefore
  // offset by the frontmatter's line count.
  const frontmatter = FRONTMATTER.exec(source);
  // The frontmatter block ends WITH a newline, so the body's first line is the block's
  // newline count plus one. Counting `split('\n').length` instead would be off by one,
  // which is how a work list points at the line after the paragraph it names.
  const bodyStart = frontmatter ? (frontmatter[0].match(/\n/g) ?? []).length : 0;
  const body = source.replace(FRONTMATTER, '');
  const lines = body.split('\n');
  const out: { line: number; text: string }[] = [];
  let inFence = false;
  let skipUntil: string | null = null;
  let para: string[] = [];
  let startLine = 1;
  const flush = () => {
    if (para.length === 0) return;
    const text = para.join(' ').replace(/\s+/g, ' ').trim();
    if (text) out.push({ line: startLine, text });
    para = [];
  };
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) {
      flush();
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    if (skipUntil) {
      if (new RegExp(`</${skipUntil}>`).test(line)) skipUntil = null;
      return;
    }
    const open = CODE_BLOCK.exec(line);
    if (open && !new RegExp(`</${open[1]}>`).test(line)) {
      flush();
      skipUntil = open[1];
      return;
    }
    if (/^\s*$/.test(line)) {
      flush();
      return;
    }
    // Headings, lists, tables, blockquotes, JSX tags, imports/exports, directives.
    if (/^\s*(#{1,6}\s|[-*+]\s|\d+\.\s|\||>|<[A-Za-z]|<\/|import\s|export\s|:::)/.test(line)) {
      flush();
      return;
    }
    if (para.length === 0) startLine = i + 1 + bodyStart;
    para.push(line);
  });
  flush();
  return out;
}

function readConceptPages(): ConceptPage[] {
  const out: ConceptPage[] = [];
  for (const dir of CONCEPT_DIRS) {
    const walk = (d: string) => {
      for (const entry of readdirSync(d, { withFileTypes: true })) {
        const full = join(d, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.mdx?$/.test(entry.name)) out.push(reviewPage(full));
      }
    };
    walk(join(CONCEPT_ROOT, dir));
  }
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

function reviewPage(file: string): ConceptPage {
  const source = readFileSync(file, 'utf8');
  const { reason, error } = waiverOf(frontmatterOf(source));
  const paragraphs = paragraphsOf(source);
  const over: Paragraph[] = [];
  for (const p of paragraphs) {
    const chars = [...p.text].length;
    const lines = Math.ceil(chars / EST_CHARS_PER_LINE);
    if (lines > MAX_PARAGRAPH_LINES && !CODEISH.test(p.text)) {
      over.push({ line: p.line, chars, lines, preview: p.text.slice(0, 100) });
    }
  }
  return { file: relative(CONCEPT_ROOT, file), paragraphs: paragraphs.length, waiverReason: reason, waiverError: error, over };
}

const pages = readConceptPages();
const paragraphsRead = pages.reduce((n, p) => n + p.paragraphs, 0);
const offenders = pages.filter((p) => p.over.length > 0 && !p.waiverReason);

describe('concept pages keep prose to ~4 lines per paragraph', () => {
  it('walks the concept tier it claims to check', () => {
    // Anti-vacuity, on both axes: a moved directory or a broken extractor passes every
    // assertion below while checking nothing.
    expect(
      pages.length,
      `read ${pages.length} concept page(s) under ${CONCEPT_DIRS.join(', ')}: the glob or the tree moved`,
    ).toBeGreaterThanOrEqual(MIN_CONCEPT_PAGES);
    expect(
      paragraphsRead,
      `read ${paragraphsRead} prose paragraph(s): the extractor stopped finding prose`,
    ).toBeGreaterThanOrEqual(MIN_PARAGRAPHS);
  });

  it('every waiver states a reason, and is refused when it does not', () => {
    const bad = pages.filter((p) => p.waiverError);
    expect(
      bad.map((p) => `${p.file}: ${p.waiverError}`).join('\n'),
      'a page-level waiver with no reason is refused rather than honoured',
    ).toBe('');
  });

  it(`has no paragraph over ${MAX_PARAGRAPH_LINES} lines (~${MAX_PARAGRAPH_CHARS} chars)`, () => {
    const list = offenders
      .flatMap((p) => p.over.map((o) => `    ${p.file}:${o.line} (${o.chars} chars, ~${o.lines} lines) ${o.preview}...`))
      .join('\n');
    expect(
      offenders.length,
      `${offenders.length} concept page(s) run a paragraph on:\n${list}\n` +
        `  Split it, or cut it. A concept page keeps its prose; it does not keep a wall of it.`,
    ).toBe(0);
  });

  describe('the extractor', () => {
    it('measures rendered width, not source wrapping', () => {
      const words = Array.from({ length: 150 }, (_, i) => `w${i}`); // one paragraph, two spellings
      const oneLine = words.join(' ');
      const wrapped = Array.from({ length: 17 }, (_, i) => words.slice(i * 9, i * 9 + 9).join(' ')).join('\n');
      const one = paragraphsOf(`---\ntitle: x\n---\n\n${oneLine}\n`)[0];
      const two = paragraphsOf(`---\ntitle: x\n---\n\n${wrapped}\n`)[0];
      expect(one.text, 'the same words, however they are wrapped').toBe(two.text);
      expect(Math.ceil(one.text.length / EST_CHARS_PER_LINE)).toBeGreaterThan(MAX_PARAGRAPH_LINES);
    });

    it('skips fences, lists, headings, tables and the JSX blocks that carry code', () => {
      const source = [
        '---',
        'title: x',
        '---',
        '',
        `# ${'A heading that is long enough to look like a paragraph but is not one'}`,
        '',
        '- a list item that is long enough to look like a paragraph but is not one, oh no it is long ',
        '',
        '```ts',
        `const x = "${'y'.repeat(500)}"; // a fence is not prose, ever`,
        '```',
        '',
        '<Code>',
        `{ id: "${'z'.repeat(400)}", role: "user" }`,
        '</Code>',
        '',
        'A short paragraph.',
      ].join('\n');
      const found = paragraphsOf(source).map((p) => p.text);
      expect(found, 'only the short paragraph should be read').toEqual(['A short paragraph.']);
    });
  });
});
