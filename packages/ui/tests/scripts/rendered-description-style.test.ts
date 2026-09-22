/**
 * GUARD — house style over the descriptions the generators RENDER.
 *
 * `web-component-meta.json` is the single model every documentation artifact is built
 * from: `llms-full.txt`, `docs/web-components.md`, `src/web-components/web-component-types.d.ts`
 * (so a consumer's editor tooltip) and the `kai` MCP's `component_reference`. A
 * sentence written in a facade is therefore read by consumers and by coding agents
 * in four places at once, and a style slip propagates to all four on the next build.
 *
 * THREE RULES ARE ENFORCED HERE
 * -----------------------------
 * 1. NO EM DASHES. `apps/docs/STYLE.md` lists the "em-dash flourish" among the
 *    tells that make copy read as AI-generated. 122 rendered descriptions carried
 *    one; they were rewritten (a full stop, a comma, or a colon, whichever the
 *    sentence actually wanted) rather than having the punctuation deleted.
 *
 * 2. DELIBERATELY MIRRORED DESCRIPTIONS STAY IDENTICAL. A handful of members are
 *    declared on several elements and documented with the SAME words on purpose,
 *    so `<kai-chat>` and `<kai-message>` cannot drift into describing one concept
 *    two ways. That identity is invisible in a diff: a sweep that rewrites three
 *    of four copies leaves the fourth silently out of step, and each file looks
 *    fine on its own. See MIRRORED below.
 *
 * 3. NO DOC COMMENT A DOCUMENTATION PIPELINE RENDERS CITES AN INTERNAL PATH. The first
 *    two rules read `web-component-meta.json`, which is one of TWO sources those
 *    generators draw a description from: the other is the doc comment in the file
 *    itself, which Storybook's docgen harvests straight out of the .tsx it compiles.
 *    A citation of an internal working path (`.superpowers/…`, `docs/handoff/…`) in
 *    one of those comments therefore ships to a reader who has no such path, in a place
 *    that cannot even link to it. `web-component-meta.json` measured clean, so this rule
 *    is the only thing standing on the rendered source. See DOC_ROOTS and
 *    INTERNAL_PATH_IN_DOC below.
 *
 * WHY THIS IS NOT A CHECK THAT PROVES NOTHING
 * -------------------------------------------
 * Nothing here restates a number that could drift into agreement with a broken
 * model. The description set is read off `web-component-meta.json`, the offender list is
 * derived, and the mirrored GROUPS are derived too (membership is "every element
 * the model says declares this member", never a hand-listed tag list). The floors
 * exist for the opposite reason: every assertion below loops over the model, so a
 * model that collapsed to two web components would make the whole file pass while
 * covering nothing. The floors are what stop that. Rule 3 is the exception: it loops
 * over the SOURCE TREE instead, and carries floors of its own for the same reason,
 * since a walk that read nothing would also report a clean tree.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

interface Member {
  name: string;
  description?: string;
  doc?: string;
}
interface WebComponentMeta {
  tag: string;
  props?: Member[];
  events?: Member[];
  methods?: Member[];
  slots?: Member[];
  parts?: Member[];
}

const meta: WebComponentMeta[] = JSON.parse(
  readFileSync(resolve(pkgRoot, 'src/web-components/web-component-meta.json'), 'utf8'),
);

/**
 * Every string the generators render as a description, with where it came from.
 * `props`/`events`/`methods` carry `description`; `slots`/`parts` carry `doc`.
 * Both are read, so a slot doc is held to the same bar as a prop doc.
 */
const RENDERED: { tag: string; kind: string; name: string; text: string }[] = [];
for (const el of meta) {
  for (const kind of ['props', 'events', 'methods', 'slots', 'parts'] as const) {
    for (const item of el[kind] ?? []) {
      const text = item.description ?? item.doc;
      if (typeof text === 'string' && text.length > 0) {
        RENDERED.push({ tag: el.tag, kind, name: item.name || '(default)', text });
      }
    }
  }
}

describe('the description model is big enough for the loops below to mean anything', () => {
  it('covers most of the element set, across every documented member kind', () => {
    expect(meta.length).toBeGreaterThan(50);
    expect(RENDERED.length).toBeGreaterThan(700);
    // A rule applied to props alone would miss the 15 slot/part docs that also
    // carried an em dash, so assert every kind is actually represented.
    for (const kind of ['props', 'events', 'methods', 'slots', 'parts']) {
      expect(RENDERED.filter((r) => r.kind === kind).length, `${kind} descriptions`).toBeGreaterThan(3);
    }
  });
});

// This file runs standalone in seconds (`pnpm exec vitest run
// tests/scripts/rendered-description-style.test.ts` from packages/ui, after a
// build has refreshed web-component-meta.json): any agent adding or editing element
// JSDoc must run it before reporting, because targeted suites skip it and the
// slip otherwise surfaces only in full-suite CI (three times on 2026-08-31).
describe('no rendered description uses an em dash (apps/docs/STYLE.md)', () => {
  it('is zero, and names every offender', () => {
    const offenders = RENDERED.filter((r) => r.text.includes('—')).map(
      (r) => `${r.tag}.${r.kind}.${r.name}: ${r.text.slice(Math.max(0, r.text.indexOf('—') - 40), r.text.indexOf('—') + 40)}`,
    );
    expect(offenders).toEqual([]);
  });
});

/**
 * Members documented with the SAME sentence on every element that declares them.
 *
 * Only the member NAMES are listed: which web components are in each group, and what the
 * shared text is, both come from the model. `theme` is injected into all 80
 * web components by `define.tsx`; `show`/`hide`/`defaultOpen` are the shared disclosure
 * vocabulary; `cardTypes`/`cardSchemas` are the card-rendering pair that
 * `<kai-chat>`, `<kai-message>` and `<kai-thread>` all take.
 *
 * A name only belongs here when the members really are one concept. Most repeated
 * names are NOT: `value`, `disabled` and `select` mean different things per
 * web component, and 101 such groups diverge on purpose.
 */
const MIRRORED: { kind: 'props' | 'events' | 'methods'; name: string; minElements: number }[] = [
  { kind: 'props', name: 'theme', minElements: 50 },
  { kind: 'props', name: 'defaultOpen', minElements: 8 },
  // Floor 3, was 4: the 2026-08-20 workspace re-cast dissolved kai-workspace's
  // chat surface, so the card pair now lives on kai-chat/kai-message/kai-thread.
  { kind: 'props', name: 'cardTypes', minElements: 3 },
  { kind: 'props', name: 'cardSchemas', minElements: 3 },
  { kind: 'methods', name: 'show', minElements: 8 },
  { kind: 'methods', name: 'hide', minElements: 8 },
  // `kai-new-chat` left this list with the same re-cast: kai-workspace stopped
  // firing it, leaving kai-conversations as the ONLY declarer, and a mirror
  // group of one is vacuous (there is nothing for the copy to drift from).
  { kind: 'events', name: 'kai-voice-error', minElements: 2 },
];

describe('deliberately mirrored descriptions stay word-for-word identical', () => {
  for (const { kind, name, minElements } of MIRRORED) {
    it(`${kind}.${name} reads the same on every element that declares it`, () => {
      const found = meta
        .map((el) => ({ tag: el.tag, item: (el[kind] ?? []).find((m) => m.name === name) }))
        .filter((x): x is { tag: string; item: Member } => x.item !== undefined)
        .map((x) => ({ tag: x.tag, text: x.item.description ?? x.item.doc ?? '' }));

      // The group must still exist at the size the design implies, so deleting
      // the members cannot turn this into a vacuous pass.
      expect(found.length, `${kind}.${name} should be declared on several elements`).toBeGreaterThanOrEqual(minElements);

      const variants = [...new Set(found.map((f) => f.text))];
      if (variants.length > 1) {
        // Report WHICH copies drifted, since that is the whole failure mode.
        const byVariant = variants.map((v) => `\n  [${found.filter((f) => f.text === v).map((f) => f.tag).join(', ')}]\n    ${v.slice(0, 160)}`);
        throw new Error(`${kind}.${name} has ${variants.length} different descriptions:${byVariant.join('')}`);
      }
      expect(variants[0].length).toBeGreaterThan(20);
    });
  }
});

/**
 * WHERE A DOC COMMENT GETS RENDERED, AND WHERE IT DOES NOT
 * --------------------------------------------------------
 * Three roots feed a documentation pipeline with the doc comments they contain:
 * `components/**` and `web-components/**` are what Storybook's docgen and the meta
 * generator harvest, so a sentence in one becomes a description, an editor tooltip or
 * an MCP `component_reference` row; `stories/**` carries the `docs.description.component`
 * copy the docs site prints. Nothing outside these three is walked.
 *
 * TWO EXCLUSIONS, both for the same reason: a `.test.`/`.spec.` file and a
 * `__snapshots__` directory are read by nobody but the suite that owns them, so a comment
 * there reaches no consumer, and a citation in one is the note to the next engineer it
 * looks like. Only DOC comments are harvested at all: a `//` comment is read by nobody
 * downstream either.
 */
const DOC_ROOTS = ['src/components', 'src/web-components', 'src/stories'];

/** The only comment form any of those pipelines reads. A `//` line is never matched. */
const DOC_COMMENT = /\/\*\*[\s\S]*?\*\//g;

/**
 * The spellings of an internal-path receipt that have reached a rendered doc comment.
 * Held as one list so a new spelling is added HERE, and the control below fails until a
 * fixture covers it.
 *
 * The failure this prevents: a facade's doc comment cited
 * `.superpowers/sdd/<run>/research-intercom-messages-view.md`, Storybook's docgen rendered
 * the citation into the component's description, and a reader was handed a path that
 * exists only in the tree the change was authored in, from a page that cannot link to it.
 * The fact the sentence was carrying, what the reading showed and what followed from it,
 * was worth keeping; the receipt was not.
 */
const INTERNAL_PATH_TOKENS = [
  '\\.superpowers/',
  'docs/superpowers',
  'docs/handoff',
  'docs/research',
  'research-[\\w-]+\\.md',
];

const INTERNAL_PATH_IN_DOC = new RegExp(INTERNAL_PATH_TOKENS.join('|'), 'g');

/** Every doc comment in a file's text, with the line it opens on. */
function docCommentsIn(src: string): { line: number; text: string }[] {
  return [...src.matchAll(DOC_COMMENT)].map((m) => ({
    line: src.slice(0, m.index).split('\n').length,
    text: m[0],
  }));
}

/**
 * One string per internal path the doc comments of a file cite, in the shape the failure
 * message wants: the file, the line, the token, and what to write instead. The walk and
 * the controls both go through this, so the controls exercise the shipped path.
 */
const citationsIn = (file: string, src: string): string[] =>
  docCommentsIn(src).flatMap((comment) =>
    [...comment.text.matchAll(INTERNAL_PATH_IN_DOC)].map(
      (m) =>
        `${file}:${comment.line} cites "${m[0]}". Keep the fact, drop the receipt: say what the reading showed and what follows from it, and leave out a path the reader cannot open.`,
    ),
  );

interface Source {
  /** Relative to packages/ui, which is how every failure message below should read. */
  file: string;
  text: string;
}

/**
 * Every .ts/.tsx file under `dir` whose comments a pipeline renders, with its text.
 * Returns the file count as well, so a root that stopped being walked is visible to the
 * floors rather than passing as a clean tree.
 */
function collectSources(dir: string, out: Source[] = []): number {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === '__snapshots__') continue;
      count += collectSources(join(dir, entry.name), out);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    const file = join(dir, entry.name);
    if (/\.(test|spec)\./.test(file)) continue;
    out.push({ file: file.replace(`${pkgRoot}/`, ''), text: readFileSync(file, 'utf8') });
    count += 1;
  }
  return count;
}

// Derived from the tree, never listed, so a new directory under one of the three roots is
// covered the moment it is created.
const SOURCES: Source[] = [];
const FILES_PER_ROOT = new Map<string, number>();
for (const root of DOC_ROOTS) {
  FILES_PER_ROOT.set(root, collectSources(resolve(pkgRoot, root), SOURCES));
}
const DOC_COMMENT_COUNT = SOURCES.reduce((n, s) => n + docCommentsIn(s.text).length, 0);

describe('the doc-comment walk is big enough for the citation rule to mean anything', () => {
  it('reads every root, and a substantial number of files and doc comments', () => {
    // Floors, not measurements. The walk is the whole rule, so a root that moved, a
    // filter that swallowed everything, or a path typo must fail here instead of
    // reporting a clean tree.
    expect(SOURCES.length).toBeGreaterThan(300);
    expect(DOC_COMMENT_COUNT).toBeGreaterThan(3000);
    for (const root of DOC_ROOTS) {
      expect(FILES_PER_ROOT.get(root) ?? 0, root).toBeGreaterThan(10);
    }
  });
});

describe('no doc comment a documentation pipeline renders cites an internal path', () => {
  it('is zero, and names the file, the line and the token', () => {
    // The failure message each entry carries is the fix: the sentence stays, the path
    // goes. Listing the offenders is what lets the tree be scanned before a sweep rather
    // than by grepping for a path nobody remembers writing.
    expect(SOURCES.flatMap((s) => citationsIn(s.file, s.text))).toEqual([]);
  });
});

/**
 * Both directions over the same fixture, so a rule that matched nothing cannot pass as
 * "the tree is clean" and a rule that matched everything cannot pass as "the rule is
 * strict". Each receipt carries exactly ONE token, so the count is asserted and not just
 * the presence; `research-[\w-]+\.md` is spelled on its own for that reason, since the
 * real citation carried it together with `.superpowers/` and would have matched twice.
 * The rewritten sentence keeps the fact the original was carrying, which is what the
 * failure message asks a writer to do.
 */
describe('the citation rule fires on a receipt and stays quiet on the rewritten sentence', () => {
  const RECEIPTS = [
    '.superpowers/sdd/notes.md',
    'docs/superpowers/notes.md',
    'docs/handoff/2026-09-19-web-components-rename.md',
    'docs/research/thread-collapse.md',
    'research-intercom-messages-view.md',
  ];

  it('fires once on each receipt, in a doc comment', () => {
    for (const receipt of RECEIPTS) {
      expect(citationsIn('fixture.tsx', `/** Derived from ${receipt}. */`), receipt).toHaveLength(1);
    }
  });

  it('has a fixture for every token, so a new spelling cannot be added untested', () => {
    for (const token of INTERNAL_PATH_TOKENS) {
      const matches = new RegExp(token);
      expect(RECEIPTS.some((r) => matches.test(r)), token).toBe(true);
    }
  });

  it('stays quiet on the same sentence with the receipt dropped, and on a // comment', () => {
    const rewritten = [
      '/**',
      ' * Reading the collapsed thread view showed that the panel should keep the scroll',
      ' * offset it had when it closed, so reopening does not jump to the first message.',
      ' */',
    ].join('\n');
    expect(citationsIn('fixture.tsx', rewritten)).toEqual([]);
    // A `//` comment is not harvested by any of these pipelines, so a path in one is a
    // note to the next engineer and stays legal. Asserted here rather than left implicit,
    // because widening the extractor to every comment would be a silent change.
    expect(docCommentsIn('// see .superpowers/sdd/notes.md\nconst x = 1;')).toEqual([]);
    expect(citationsIn('fixture.tsx', '// see .superpowers/sdd/notes.md\nconst x = 1;')).toEqual([]);
  });
});
