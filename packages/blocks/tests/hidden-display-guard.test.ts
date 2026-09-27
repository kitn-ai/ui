/**
 * A block hides chrome with `hidden` / `:hidden`, and the UA's
 * `[hidden] { display: none }` is the WEAKEST rule in the cascade: any author
 * `display` on the same element outranks it, so the element stays LAID OUT while
 * claiming to be hidden.
 *
 * That is not a cosmetic slip in a flex row. A hidden child is a real flex ITEM:
 * it consumes the container's gap and shifts every sibling after it. It is how
 * the assistant block's `+` control came to sit 8px further in than the frame's
 * own padding puts it — beside a Send button that was measured correct — and it
 * reached the owner's eyes because jsdom lays nothing out, so no unit test in the
 * repo could see a strip that was invisible and still taking up room.
 *
 * So the rule this file enforces: for every subject the templates HIDE, a
 * `display` declared without a `[hidden]` guard is a defect. Two shapes are safe
 * and both are accepted:
 *
 *   1. a `[hidden]` guard elsewhere in the sheet (`.foo[hidden] { display: none }`,
 *      or an element selector like `kai-button[hidden]`, which is why the blocks
 *      carry those);
 *   2. a selector that already excludes the hidden state, `:not([hidden])`, which
 *      is the shape the view stacks use.
 *
 * WHAT THIS CANNOT SEE, and it matters as much as what it can: the KIT's own
 * stylesheet is a second cascade participant this file never reads. An element
 * whose `display` comes from there — an element's own `:host { display: … }` — is
 * out of scope, and those guards live with the kit's styles. This checks the
 * block's own sheet against the block's own templates, which is where this defect
 * has actually occurred.
 *
 * Anti-vacuity is deliberate: a scan that parses nothing and reports no offenders
 * is the failure mode of every static check, so each block has to yield hidden
 * subjects, display rules, and guards for this to pass.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const BLOCKS_DIR = new URL('../blocks/', import.meta.url).pathname;

interface Block {
  name: string;
  html: string;
  css: string;
}

/** Every block directory that ships a template and a stylesheet. Derived, so a new
 *  block is covered the moment it exists rather than when someone lists it here. */
function readBlocks(): Block[] {
  return readdirSync(BLOCKS_DIR)
    .filter((name) => statSync(join(BLOCKS_DIR, name)).isDirectory())
    .map((name) => {
      const dir = join(BLOCKS_DIR, name);
      const files = readdirSync(dir);
      const html = files.find((f) => f.endsWith('.html'));
      const css = files.find((f) => f.endsWith('.css'));
      return {
        name,
        html: html ? readFileSync(join(dir, html), 'utf8') : '',
        css: css ? readFileSync(join(dir, css), 'utf8') : '',
      };
    })
    .filter((b) => b.html && b.css);
}

/** `selector { declarations }` pairs, comments removed. At-rule preludes are
 *  skipped: `@media (width < 60rem) { … }` is not a selector, and treating it as
 *  one invents subjects that do not exist. */
function rules(css: string): { selector: string; body: string }[] {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: { selector: string; body: string }[] = [];
  for (const m of stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim();
    if (!selector || selector.startsWith('@')) continue;
    out.push({ selector, body: m[2] });
  }
  return out;
}

/** The classes, ids and tag names a selector addresses. Deliberately coarse: a
 *  subject listed here that nothing hides is harmless, because the check
 *  intersects this with what the TEMPLATES actually hide. */
function subjects(selector: string): string[] {
  const out = new Set<string>();
  for (const part of selector.split(',')) {
    for (const cls of part.matchAll(/\.([a-zA-Z0-9_-]+)/g)) out.add(`.${cls[1]}`);
    for (const id of part.matchAll(/#([a-zA-Z0-9_-]+)/g)) out.add(`#${id[1]}`);
    const tag = part.trim().match(/^[a-zA-Z][a-zA-Z0-9-]*/);
    if (tag) out.add(tag[0]);
  }
  return [...out];
}

/** `hidden`, or a framework binding that sets it: `:hidden="x"` / `.hidden="x"`. */
const HIDES = /(?:^|\s)hidden(?:\s*=|\s|>)|:hidden=|\.hidden=/;

/** Subjects the templates hide: read off each element that carries a hidden
 *  attribute or binding, from its OWN tag text. */
function hiddenSubjects(html: string): { subject: string; line: number }[] {
  const out: { subject: string; line: number }[] = [];
  const lines = html.split('\n');
  lines.forEach((line, i) => {
    // Walk back to the opening `<` of the tag this line belongs to, and forward
    // to its closing `>`: an element's attributes routinely span several lines.
    let start = i;
    while (start >= 0 && !lines[start].includes('<')) start--;
    if (start < 0) return;
    let end = i;
    while (end < lines.length && !lines[end].includes('>')) end++;
    const tag = lines.slice(start, end + 1).join('\n');
    if (!HIDES.test(line)) return;
    const name = tag.trim().match(/^<([a-zA-Z][a-zA-Z0-9-]*)/)?.[1];
    if (name) out.push({ subject: name, line: i + 1 });
    for (const cls of (tag.match(/class="([^"]*)"/)?.[1] ?? '').split(/\s+/)) {
      if (cls) out.push({ subject: `.${cls}`, line: i + 1 });
    }
    const id = tag.match(/id="([^"]+)"/)?.[1];
    if (id) out.push({ subject: `#${id}`, line: i + 1 });
  });
  return out;
}

describe('a block never hides something that keeps its own layout', () => {
  const blocks = readBlocks();

  it('scans every authored block (anti-vacuity)', () => {
    expect(blocks.map((b) => b.name).sort()).toEqual(['assistant', 'in-app-assistant', 'support-widget']);
  });

  for (const block of blocks) {
    it(`${block.name}: every hidden subject's display is guarded`, () => {
      const blockRules = rules(block.css);
      const hidden = hiddenSubjects(block.html);

      // Anti-vacuity: the parse has to have found both halves, or this passes by
      // finding nothing at all.
      expect(hidden.length, `${block.name}: no hidden bindings parsed`).toBeGreaterThan(0);

      const displayRules = blockRules.filter((r) => /(^|;)\s*display\s*:/.test(r.body));
      expect(displayRules.length, `${block.name}: no display rules parsed`).toBeGreaterThan(0);

      // A `[hidden]` guard is any rule whose selector names the hidden state — the
      // `:not([hidden])` shape counts, because it excludes the state it guards.
      const guarded = new Set<string>();
      for (const r of blockRules) {
        if (!r.selector.includes('[hidden]')) continue;
        for (const s of subjects(r.selector)) guarded.add(s);
      }
      expect(guarded.size, `${block.name}: no [hidden] guards found at all`).toBeGreaterThan(0);

      const hiddenNames = new Set(hidden.map((h) => h.subject));
      const offenders: string[] = [];
      for (const r of displayRules) {
        // A selector that already excludes the hidden state is safe by construction.
        if (r.selector.includes('[hidden]')) continue;
        for (const s of subjects(r.selector)) {
          if (hiddenNames.has(s) && !guarded.has(s)) offenders.push(`${s}  (${r.selector.trim()})`);
        }
      }

      expect([...new Set(offenders)], `${block.name}: these are hidden by a template but declare their own display, so they stay laid out`).toEqual([]);
    });
  }
});
