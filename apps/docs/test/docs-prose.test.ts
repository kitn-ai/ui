// GUARD -- the prose checker's own behaviour, proved on fixtures before the tree is read.
//
// WHY THIS FILE EXISTS. `scripts/docs-alignment/prose.mjs` reads prose and reports the names it cannot
// resolve. It had no self-test, so the only evidence it detected anything was the real tree going quiet
// -- and a checker whose waiver path is exercised nowhere is a checker whose exception was never proved.
//
// THE ONE CLASS THAT HAS TO BE ABLE TO PASS. A HISTORICAL `kai-` name. The docs deliberately name an
// element the kit renamed away from (`kai-sidebar-toggle` -> `kai-aside-toggle` with a `side`), and
// `knownTokens` is built from what the kit STILL writes down, so it cannot know the old name. The fix
// is a declared waiver so the page owns its own exception instead of depending on an unrelated comment.
//
// THE WAIVER IS TESTED BEFORE THE FINDING KIND IS CHOSEN. It used to sit inside the branch for names
// the kit never mentions, which made it unreachable for `kai-sidebar-toggle` itself -- the kit still
// writes that name down in a `//` comment, so the page took the advisory branch and its waiver could
// never fire. The three probes at the bottom pin both halves of that: the advisory is real, the waiver
// silences it, and the widening is still one line wide.
//
// THE WAIVER IS PARSED, NOT TEXT-MATCHED, and covers the line it sits on plus the line below, nothing
// further. A reason is required: a directive without one is prose that reads like a decision, which is
// exactly what a rule honouring written words would pass.
//
// A fixture that stopped producing findings would read as a clean tree here, so the MUST-FAIL cases are
// the anti-vacuity floor: the unknown token is reported with no waiver, and still reported when the
// waiver is reason-less or parked two lines away.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkProse } from '../scripts/docs-alignment/prose.mjs';
import { coverage } from '../scripts/docs-alignment/coverage.mjs';
import { parseDoc } from '../scripts/docs-alignment/extract.mjs';

const HISTORICAL = 'kai-sidebar-toggle';
/** A name the kit's own source still writes down, so it is NOT an unknown token — it
takes the advisory `undeclared-in-web-component-meta` branch instead. This is the token
the waiver used to be unable to reach. */
const KNOWN_TO_THE_KIT = 'kai-maximize-intent';
const WAIVER = '{/* docs-alignment: historical-kai-token -- the pre-rename name, kept in this note */}';
const NO_REASON = '{/* docs-alignment: historical-kai-token -- short */}';

/** The smallest surface `checkProse` and `coverage` need: the current name is known, the old one is not. */
function surface() {
  return {
    byName: new Map(),
    components: new Set(),
    globalNames: new Set(),
    tags: new Set(['kai-aside-toggle', 'kai-chat']),
    eventNames: new Set(['kai-aside-toggle']),
    knownTokens: new Set(['kai-aside-toggle', KNOWN_TO_THE_KIT]),
    byTag: new Map([
      [
        'kai-chat',
        {
          partNames: new Set(),
          slotNames: new Set(),
          propIndex: new Map(),
          eventNames: new Set(['kai-aside-toggle']),
          handlerNames: new Set(),
        },
      ],
    ]),
  };
}

/** A one-page MDX fixture; every entry in `body` is its own source line, so line numbers are fixed. */
function docFrom(body: string[]) {
  const root = mkdtempSync(join(tmpdir(), 'kai-prose-'));
  const path = join(root, 'page.mdx');
  writeFileSync(path, ['---', 'title: Fixture', '---', '', ...body, ''].join('\n'));
  return parseDoc(path, root);
}

const kinds = (doc: any) => checkProse(doc, surface()).map((f: any) => f.kind);

describe('the historical kai- name waiver', () => {
  it('MUST FAIL: an unknown kai- name in prose is reported when nothing waives it', () => {
    const doc = docFrom(['The shell no longer fires `kai-sidebar-toggle`.']);
    expect(kinds(doc)).toContain('unknown-kai-token');
  });

  it('MUST PASS: the line above a rename note can declare the historical name', () => {
    const doc = docFrom([WAIVER, 'The shell no longer fires `kai-sidebar-toggle`.']);
    expect(kinds(doc)).not.toContain('unknown-kai-token');
  });

  it('MUST PASS: the directive on the note line itself also covers it', () => {
    const doc = docFrom([`The shell no longer fires \`${HISTORICAL}\`. ${WAIVER}`]);
    expect(kinds(doc)).not.toContain('unknown-kai-token');
  });

  it('MUST FAIL: a waiver carrying no reason is not a waiver (parsed, not text-matched)', () => {
    const doc = docFrom([NO_REASON, 'The shell no longer fires `kai-sidebar-toggle`.']);
    expect(kinds(doc)).toContain('unknown-kai-token');
  });

  it('MUST FAIL: the waiver covers one line, not the rest of the page', () => {
    const doc = docFrom([WAIVER, 'A line in between.', 'The shell no longer fires `kai-sidebar-toggle`.']);
    expect(kinds(doc)).toContain('unknown-kai-token');
  });

  it('MUST PASS: a name the kit still declares is never reported (what makes the rule non-vacuous)', () => {
    const doc = docFrom(['The shell fires `kai-aside-toggle`.']);
    expect(kinds(doc)).not.toContain('unknown-kai-token');
  });

  // The waiver used to be tested INSIDE the branch for names the kit never mentions, so a
  // historical name the kit DOES still write down somewhere -- `kai-sidebar-toggle` does, in
  // chat-workspace.tsx -- took the other branch and could not be waived at all. That is what
  // these three pin: the advisory is real without a waiver, the same waiver silences it, and
  // the widening is still per-line rather than per-page.
  it('MUST FAIL: a kai- name the kit writes down but web-component-meta.json omits is an advisory', () => {
    const doc = docFrom([`The shell also fires \`${KNOWN_TO_THE_KIT}\`.`]);
    expect(kinds(doc)).toContain('undeclared-in-web-component-meta');
  });

  it('MUST PASS: the waiver reaches that advisory too, not only the unknown-token kind', () => {
    const doc = docFrom([WAIVER, `The shell also fires \`${KNOWN_TO_THE_KIT}\`.`]);
    expect(kinds(doc)).toEqual([]);
  });

  it('MUST FAIL: the widened waiver still covers one line, not the rest of the page', () => {
    const doc = docFrom([WAIVER, 'A line in between.', `The shell also fires \`${KNOWN_TO_THE_KIT}\`.`]);
    expect(kinds(doc)).toContain('undeclared-in-web-component-meta');
  });

  it('MUST PASS: the waiver also keeps the name out of reverse coverage\'s stale-token list', () => {
    const has = (cov: any, tag: string) => cov.staleTags.some((t: any) => t.tag === tag);
    const waived = coverage([docFrom([WAIVER, 'The shell no longer fires `kai-sidebar-toggle`.'])], surface());
    expect(has(waived, HISTORICAL)).toBe(false);
    const bare = coverage([docFrom(['The shell no longer fires `kai-sidebar-toggle`.'])], surface());
    expect(has(bare, HISTORICAL)).toBe(true);
  });
});
