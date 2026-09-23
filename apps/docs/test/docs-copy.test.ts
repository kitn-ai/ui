// GUARD -- the top of every component page reads as a DESCRIPTION of the
// component, not as an instruction, and it fits the caps rule 4 of
// docs/verbosity-sweep.md sets. The three fields this checks are the three a
// reader and an agent both see before deciding whether to open the page: the
// frontmatter `description` (Starlight renders it in the sidebar, the page head
// and every search result), the `kai-lede`, and the "When to use" aside.
//
// COMPONENT PAGES ONLY, and that boundary is deliberate rather than a limit of
// the glob. Rule 4 splits the two halves of `src/content/docs`: a component page
// is a reference page that stays terse, while a concept page -- `guides/`,
// `patterns/`, `examples/` -- keeps its prose, because its job is to teach a
// flow and the length is the teaching. A 100-char cap on `guides/streaming.mdx`
// would destroy the thing the page is for. The concept pages have their own rule
// (no paragraph over ~4 lines) and they are out of scope here.
//
// THE CAPS ARE RULE 4's, not invented here. `apps/docs/STYLE.md:44` bans the
// em-dash flourish, which is why the em dash is a rule and not a style opinion:
// on a page top it is usually doing the work of a second clause that the cap
// then hides.
//
// THE INSTRUCTION LIST IS THE COPY REVIEWER'S, quoted from
// /tmp/kai-lanes/copy-reviewer-calibration.md: it rejected "Set `variant` to fit
// the space", "Pass each item via `data`", "use `size=\"icon\"`" and "see the X
// story" in exactly these fields. Rule 7 states the principle ("a description
// DESCRIBES. It never instructs"), and a principle is what an agent re-reads
// differently the next time; the four literal shapes are what it gets flagged
// for. Anything the reader has to be TOLD to do belongs in the example or the
// props table directly below.
//
// WAIVED AT PAGE LEVEL, NOT PER LINE. Every other text guard in this repo hangs
// its waiver on the line it covers (`// docs-copy: waived -- <reason>`), and
// that is impossible here: MDX has no comment syntax, so a waiver comment inside
// the file would either render or break the build. The only place a machine can
// read a waiver and a reader cannot see one is the frontmatter, so that is where
// it lives: `copyReview: waived -- <reason>`. It is whole-page because the caps
// are, and it must state a reason -- a waiver with nothing after it is refused
// rather than honoured, so a page cannot opt out by typing the magic word.
//
// THIS FILE IS RED UNTIL THE SWEEP REACHES THE PAGE, and that is the point: the
// assertion messages are the next sweep's work list, counted per rule. Do not
// quiet it by adding waivers to pages nobody has reviewed.

import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Anchored to THIS file rather than to the runner's cwd, the way the
// neighbouring suites do it: `require.resolve` carries the docs package's own
// root, and the pages are relative to it wherever vitest was invoked from. NOT
// `new URL(relative, import.meta.url)` -- Vite intercepts that form and hands
// back an asset URL, which `fileURLToPath` then rejects as non-file.
const require = createRequire(import.meta.url);
const DOCS_ROOT = dirname(require.resolve('../package.json'));
const COMPONENT_PAGES_DIR = join(DOCS_ROOT, 'src', 'content', 'docs', 'components');

/** Rule 4's caps, per field. */
const TOP_CAPS = { description: 100, lede: 140, aside: 200 } as const;

/**
 * Anti-vacuity floors. A broken glob is the failure this file is most likely to
 * have -- `readdirSync` over a moved directory, a renamed extension, a filter
 * that swallows every page -- and it presents as a clean tree, because zero
 * pages produce zero violations. The floors are set just under what the tree
 * holds today (63 pages, 63 ledes, 61 asides, so a page may be added or lose an
 * aside without touching this file), which is tight enough that a partial glob
 * fails too.
 */
const MIN_PAGES = 50;
const MIN_LEDES = 50;
const MIN_ASIDES = 45;

/** How many opening words two fields may share before one is the other. */
const SHARED_OPENING_WORDS = 6;

/** A waiver's reason has to be a phrase, not a keystroke. */
const MIN_WAIVER_REASON_LENGTH = 10;

const EM_DASH = '\u2014';

/**
 * Words that carry no meaning in an opening, so "Render a set of file
 * attachments" and "Render file attachments" compare on what they say. Kept
 * short on purpose: this list decides which pairs of fields count as restating
 * each other, and a long one would start erasing real words from the comparison.
 */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'as', 'by',
  'at', 'from', 'into', 'that', 'this', 'these', 'those', 'it', 'its', 'is', 'are',
  'be', 'can', 'so', 'no', 'not', 'but', 'if', 'than', 'then', 'up', 'out', 'over',
  'your', 'you', 'when', 'where', 'which', 'what', 'any', 'every',
]);

/**
 * The four shapes the copy reviewer rejected in a page top. Each is anchored on
 * a word boundary so "Reset `x`" is not read as "Set `x`", and matched
 * case-sensitively: every real offender starts the shape at a sentence start,
 * and a case-insensitive "set `/`" would flag prose that merely names a setter.
 */
const INSTRUCTIONS: { shape: string; pattern: RegExp }[] = [
  { shape: 'Set `x`', pattern: /(?:^|[\s(])Set\s+`/ },
  { shape: 'Use `x`', pattern: /(?:^|[\s(])Use\s+`/ },
  { shape: 'Pass `x`', pattern: /(?:^|[\s(])Pass\s+`/ },
  { shape: 'see the ... story/page', pattern: /see the [^.]*\b(story|page)\b/i },
];

type Rule =
  | 'description-cap'
  | 'description-empty'
  | 'lede-cap'
  | 'aside-cap'
  | 'em-dash'
  | 'instructive'
  | 'restating'
  | 'waiver';

interface Violation {
  rule: Rule;
  page: string;
  field: 'description' | 'lede' | 'When to use';
  detail: string;
}

interface Page {
  name: string;
  description: string;
  lede: string | null;
  aside: string | null;
  /** Set when a well-formed `copyReview: waived -- <reason>` is present. */
  waiverReason: string | null;
  /** Set when a `copyReview` key exists but is not a waiver with a reason. */
  waiverError: string | null;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;
const LEDE = /<p class="kai-lede">([\s\S]*?)<\/p>/;
const WHEN_TO_USE_ASIDE = /<Aside[^>]*\stitle="When to use"[^>]*>([\s\S]*?)<\/Aside>/;
/** `waived -- <reason>`; the second half is what makes it a waiver. */
const WAIVER = /^waived\s+--\s+(\S(?:.*\S)?)$/;

function frontmatterOf(source: string): string {
  const match = source.match(FRONTMATTER);
  if (!match) throw new Error('no frontmatter block; every component page starts with one');
  return match[1];
}

function frontmatterValue(frontmatter: string, key: string): string | null {
  const match = frontmatter.match(new RegExp(`^${key}:[ \\t]*(.*)$`, 'm'));
  if (!match) return null;
  // Unquoted in this tree; strip quotes in case one page ever quotes a value.
  return match[1].trim().replace(/^(['"])(.*)\1$/, '$2');
}

/** Measurement text: whitespace collapsed, because a wrapped line is not a longer field. */
function measured(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

const lengthOf = (text: string) => [...text].length;

export function parsePage(source: string, name: string): Page {
  const frontmatter = frontmatterOf(source);
  const copyReview = frontmatterValue(frontmatter, 'copyReview');

  let waiverReason: string | null = null;
  let waiverError: string | null = null;
  if (copyReview !== null) {
    const match = copyReview.match(WAIVER);
    if (match && match[1].length >= MIN_WAIVER_REASON_LENGTH) {
      waiverReason = match[1];
    } else {
      waiverError =
        `copyReview is "${copyReview}", which waives nothing: a waiver states a reason at least ` +
        `${MIN_WAIVER_REASON_LENGTH} characters long ("copyReview: waived -- <reason>").`;
    }
  }

  const lede = source.match(LEDE);
  const aside = source.match(WHEN_TO_USE_ASIDE);

  return {
    name,
    description: measured(frontmatterValue(frontmatter, 'description') ?? ''),
    lede: lede ? measured(lede[1]) : null,
    aside: aside ? measured(aside[1]) : null,
    waiverReason,
    waiverError,
  };
}

function plainText(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[`*_]/g, '');
}

function significantWords(text: string): string[] {
  return plainText(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((word) => !STOPWORDS.has(word));
}

/** Why the lede is the description again, or null when it adds to it. */
function restatingDetail(description: string, lede: string): string | null {
  const d = significantWords(description);
  const l = significantWords(lede);

  if (d.length >= SHARED_OPENING_WORDS && l.length >= SHARED_OPENING_WORDS) {
    const shared = d.slice(0, SHARED_OPENING_WORDS).join(' ');
    if (shared === l.slice(0, SHARED_OPENING_WORDS).join(' ')) {
      return `the lede opens on the description's first ${SHARED_OPENING_WORDS} significant words ("${shared}")`;
    }
  }

  const dn = d.join(' ');
  const ln = l.join(' ');
  if (dn && ln && (dn.includes(ln) || ln.includes(dn))) {
    return `after normalising case and punctuation one contains the other ("${dn}" / "${ln}")`;
  }

  return null;
}

/** Every copy violation on a page, or none when the page carries a waiver. */
export function reviewPage(page: Page): Violation[] {
  const violations: Violation[] = [];

  // The one rule a waiver does NOT reach, and it is checked before the waiver
  // is read: an absent `description` is a structural defect rather than a
  // matter of taste. Starlight renders that field into the sidebar, the page
  // head and every search result, so a page that waives it away is a page with
  // no name in the index. Every other rule here is about length or tone, which
  // a reason can justify.
  if (page.description === '') {
    violations.push({ rule: 'description-empty', page: page.name, field: 'description', detail: 'is empty' });
  }

  if (page.waiverReason) return violations;

  const field = (name: 'description' | 'lede' | 'When to use', text: string | null, cap: number) => {
    if (text === null) return;
    const rule: Rule = name === 'When to use' ? 'aside-cap' : name === 'lede' ? 'lede-cap' : 'description-cap';
    if (lengthOf(text) > cap) {
      violations.push({ rule, page: page.name, field: name, detail: `${lengthOf(text)} chars, cap ${cap}` });
    }
    if (text.includes(EM_DASH)) {
      violations.push({ rule: 'em-dash', page: page.name, field: name, detail: 'contains an em dash' });
    }
    for (const { shape, pattern } of INSTRUCTIONS) {
      if (pattern.test(text)) {
        violations.push({
          rule: 'instructive',
          page: page.name,
          field: name,
          detail: `instructs ("${shape}"): ${text}`,
        });
      }
    }
  };

  field('description', page.description, TOP_CAPS.description);
  field('lede', page.lede, TOP_CAPS.lede);
  field('When to use', page.aside, TOP_CAPS.aside);

  if (page.lede !== null && page.description !== '') {
    const detail = restatingDetail(page.description, page.lede);
    if (detail) {
      violations.push({ rule: 'restating', page: page.name, field: 'lede', detail });
    }
  }

  return violations;
}

function readComponentPages(): Page[] {
  return readdirSync(COMPONENT_PAGES_DIR)
    .filter((entry) => entry.endsWith('.mdx'))
    .sort()
    .map((entry) => parsePage(readFileSync(`${COMPONENT_PAGES_DIR}/${entry}`, 'utf8'), entry));
}

const pages = readComponentPages();
const violations = pages.flatMap(reviewPage);

/** The failure message for one rule: how many, and which page, for each. */
function offenders(rule: Rule): string[] {
  return violations.filter((v) => v.rule === rule).map((v) => `${v.page} [${v.field}] ${v.detail}`);
}

const checkRule = (rule: Rule, what: string) => {
  const found = offenders(rule);
  expect(found, `${found.length} of ${pages.length} component pages ${what}:\n  - ${found.join('\n  - ')}`).toEqual(
    [],
  );
};

describe('component page tops read as descriptions and fit rule 4 caps', () => {
  it('walks the component pages, ledes and asides it claims to check', () => {
    // First, because every check below is an `toEqual([])` and an empty list
    // passes over a tree nobody read.
    expect(pages.length, `read ${pages.length} component pages from ${COMPONENT_PAGES_DIR}`).toBeGreaterThanOrEqual(
      MIN_PAGES,
    );
    const ledes = pages.filter((p) => p.lede !== null);
    const asides = pages.filter((p) => p.aside !== null);
    expect(ledes.length, `${ledes.length} pages carried a kai-lede`).toBeGreaterThanOrEqual(MIN_LEDES);
    expect(asides.length, `${asides.length} pages carried a "When to use" aside`).toBeGreaterThanOrEqual(MIN_ASIDES);

    // And the extractions carried TEXT. A regex that matched an empty span
    // would satisfy every count above and every cap below, which is the same
    // vacuous green as a broken glob with more steps.
    const shortestLede = Math.min(...ledes.map((p) => lengthOf(p.lede as string)));
    const shortestAside = Math.min(...asides.map((p) => lengthOf(p.aside as string)));
    expect(shortestLede, 'the shortest extracted lede is a fragment; the matcher is capturing the wrong span')
      .toBeGreaterThan(20);
    expect(shortestAside, 'the shortest extracted aside is a fragment; the matcher is capturing the wrong span')
      .toBeGreaterThan(20);
  });

  it('frontmatter descriptions fit the cap', () => checkRule('description-cap', `over ${TOP_CAPS.description} chars`));
  it('frontmatter descriptions are present', () => checkRule('description-empty', 'have no description'));
  it('ledes fit the cap', () => checkRule('lede-cap', `over ${TOP_CAPS.lede} chars`));
  it('"When to use" asides fit the cap', () => checkRule('aside-cap', `over ${TOP_CAPS.aside} chars`));
  it('no page top carries an em dash', () => checkRule('em-dash', 'carry an em dash'));
  it('no page top instructs the reader', () => checkRule('instructive', 'instruct instead of describing'));
  it('the lede adds to the description instead of restating it', () => checkRule('restating', 'restate their description'));

  it('every waiver states a reason', () => {
    const malformed = pages.filter((p) => p.waiverError !== null).map((p) => `${p.name}: ${p.waiverError}`);
    expect(
      malformed,
      `these pages carry a waiver with nothing after it, so the page is NOT waived and the copy rules ` +
        `still apply:\n  - ${malformed.join('\n  - ')}`,
    ).toEqual([]);
  });
});

describe('the checker, on fixtures', () => {
  const fixture = (opts: {
    description?: string;
    lede?: string | null;
    aside?: string | null;
    copyReview?: string | null;
  }): Page =>
    parsePage(
      [
        '---',
        'title: Fixture',
        `description: ${opts.description ?? 'Displays a thing.'}`,
        ...(opts.copyReview != null ? [`copyReview: ${opts.copyReview}`] : []),
        '---',
        '',
        ...(opts.lede === null ? [] : [`<p class="kai-lede">${opts.lede ?? 'Adds what the description leaves out.'}</p>`]),
        '',
        ...(opts.aside === null
          ? []
          : [
              '<Aside type="tip" title="When to use">',
              opts.aside ?? 'When a boxed surface of your own needs to carry a caption.',
              '</Aside>',
            ]),
      ].join('\n'),
      'fixture.mdx',
    );

  const rules = (page: Page) => reviewPage(page).map((v) => v.rule);

  it('passes a compliant page', () => {
    expect(reviewPage(fixture({}))).toEqual([]);
  });

  it('passes a page with neither a lede nor an aside', () => {
    expect(reviewPage(fixture({ lede: null, aside: null }))).toEqual([]);
  });

  it('fails a description over the cap, and names the page and the length', () => {
    const page = fixture({ description: `Displays ${'a thing '.repeat(20)}.` });
    expect(rules(page)).toEqual(['description-cap']);
    expect(reviewPage(page)[0].detail).toContain(`cap ${TOP_CAPS.description}`);
    expect(reviewPage(page)[0].page).toBe('fixture.mdx');
  });

  it('fails an empty description', () => {
    expect(rules(fixture({ description: '' }))).toEqual(['description-empty']);
  });

  it('fails an em dash in any of the three fields, and passes a hyphen', () => {
    expect(rules(fixture({ description: 'Displays a thing \u2014 once.' }))).toEqual(['em-dash']);
    expect(rules(fixture({ lede: 'Adds a thing \u2014 once.' }))).toEqual(['em-dash']);
    expect(rules(fixture({ aside: 'When a thing \u2014 once.' }))).toEqual(['em-dash']);
    expect(reviewPage(fixture({ description: 'Displays a thing - once.' }))).toEqual([]);
  });

  it('fails a lede over the cap', () => {
    expect(rules(fixture({ lede: 'Adds '.concat('a thing '.repeat(30)) }))).toEqual(['lede-cap']);
  });

  it('fails a "When to use" aside over the cap', () => {
    expect(rules(fixture({ aside: 'When '.concat('a thing '.repeat(40)) }))).toEqual(['aside-cap']);
  });

  it('fails an instructive lede, for each shape the reviewer rejected', () => {
    expect(rules(fixture({ lede: 'Set `variant` to change the surface.' }))).toEqual(['instructive']);
    expect(rules(fixture({ lede: 'Use `icon` for a glyph.' }))).toEqual(['instructive']);
    expect(rules(fixture({ lede: 'Pass `data` and an `onRemove` handler.' }))).toEqual(['instructive']);
    expect(rules(fixture({ lede: 'For a variant, see the Grid story.' }))).toEqual(['instructive']);
  });

  it('fails an instructive aside and an instructive description too', () => {
    expect(rules(fixture({ aside: 'When the space is tight. Set `variant` to `inline`.' }))).toEqual(['instructive']);
    expect(rules(fixture({ description: 'Use `variant` to pick the layout.' }))).toEqual(['instructive']);
  });

  it('reads prose about a setter as prose, not as an instruction', () => {
    // The anchor on a word boundary is load-bearing: without it "Reset `x`"
    // would be flagged, and a guard that fires on the word "set" inside another
    // word is one an author learns to ignore.
    expect(reviewPage(fixture({ lede: 'Reset `open` on close, which re-arms the trigger.' }))).toEqual([]);
  });

  it('fails a lede that restates the description word for word', () => {
    const page = fixture({
      description: 'Displays the files attached to a prompt.',
      lede: 'Displays the files attached to a prompt, in the layout you pick.',
    });
    expect(rules(page)).toEqual(['restating']);
  });

  it('fails a lede that opens on the description without containing it', () => {
    // The opening comparison alone fires here: the two diverge after the sixth
    // significant word, so neither normalised string contains the other. A guard
    // with only the containment clause passes this pair.
    const page = fixture({
      description: 'Displays the files attached to a prompt tile grid of chips.',
      lede: 'Displays the files attached to a prompt tile grid, each chip its own preview.',
    });
    expect(rules(page)).toEqual(['restating']);
    expect(reviewPage(page)[0].detail).toContain('opens on the description');
  });

  it('passes a field exactly at its cap, and fails it one character over', () => {
    // The cap is `>` rather than `>=`, and the boundary is where a cap rule is
    // actually decided. `feedback-bar.mdx` sits on it today.
    const atCap = (n: number) => 'x'.repeat(n);
    expect(reviewPage(fixture({ description: atCap(TOP_CAPS.description) }))).toEqual([]);
    expect(rules(fixture({ description: atCap(TOP_CAPS.description + 1) }))).toEqual(['description-cap']);
    expect(reviewPage(fixture({ lede: atCap(TOP_CAPS.lede), aside: atCap(TOP_CAPS.aside) }))).toEqual([]);
  });

  it('passes a lede that adds a fact the description does not carry', () => {
    expect(
      reviewPage(
        fixture({
          description: 'Displays the files attached to a prompt.',
          lede: 'Every item keeps its own preview, size label and remove control.',
        }),
      ),
    ).toEqual([]);
  });

  it('a waiver with a reason silences the copy rules', () => {
    const page = fixture({
      description: 'Displays a thing \u2014 once.',
      copyReview: 'waived -- the caps are the API surface on this one',
    });
    expect(page.waiverReason).toBe('the caps are the API surface on this one');
    expect(page.waiverError).toBeNull();
    expect(reviewPage(page)).toEqual([]);
  });

  it('a waiver does not excuse a page with no description at all', () => {
    // The one rule the waiver does not reach: absence is structural, and a
    // reason can justify length or tone but not a missing required field.
    const page = fixture({
      description: '',
      copyReview: 'waived -- the caps are the API surface on this one',
    });
    expect(rules(page)).toEqual(['description-empty']);
  });

  it('refuses a waiver without a reason, so the page is still checked', () => {
    for (const copyReview of ['waived', 'waived --', 'waived -- ', 'waived: because', '']) {
      const page = fixture({ description: 'Displays a thing \u2014 once.', copyReview });
      expect(page.waiverReason, `"${copyReview}" was honoured as a waiver`).toBeNull();
      expect(page.waiverError, `"${copyReview}" was accepted as a waiver`).not.toBeNull();
      expect(rules(page), `"${copyReview}" silenced the copy rules`).toContain('em-dash');
    }
  });
});
