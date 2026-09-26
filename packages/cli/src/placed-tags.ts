/**
 * Which `<kai-*>` tags a project PLACES, and whether anything it imports REGISTERS them.
 *
 * WHY THIS EXISTS, in one line: a `kai-*` tag nothing defines is an INERT unknown element. It
 * renders nothing, throws nothing and logs nothing, so the only signal a consumer gets is empty
 * chrome. The default scaffold now registers one entry per tag it places
 * (`@kitn.ai/ui/web-components/<entry>`), which means a single `<kai-sources>` added by hand has a
 * new way to become exactly that. `kai doctor` is where the silence gets broken: this module
 * derives the fact, and doctor.ts warns with the import line to add. The MCP `debug` tool has a
 * rule that reads the SYMPTOM out of a pasted error ("renders nothing", debug-rules.ts
 * `web-components-not-registered`); this is the structural version of the same question, answered
 * from the project's own source before anybody has an error to paste.
 *
 * WHERE THE TAG -> ENTRY MAP COMES FROM. A static import of the kit's own
 * web-component-manifest.json, inlined at build time exactly as `mcp/mcp/manifest.ts:285` and
 * `mcp/mcp/tools/scaffold.ts:1385` already inline it: the same map the scaffolder emits its per-tag
 * imports from, so the line this reports is character-for-character the line the scaffolder would
 * have written.
 *
 * THE ALTERNATIVE WAS CONSIDERED AND IS NOT USABLE, rather than merely heavier. Deriving the map
 * from the kit INSTALLED in the project is the version that matters to a consumer, and the
 * precedent for reading the installed dist exists (`mcp/mcp/manifest.ts:327` `optInEntryForTag`).
 * But web-component-manifest.json is never copied into dist/ (manifest.ts:278), and the installed
 * dist cannot be inverted back into the map: a per-web-component module names the tags it merely
 * RENDERS alongside the one it registers -- measured, `dist/web-components/chat.js` carries
 * `kai-attachments-change`, `kai-submit`, `kai-suggestion-click` and the rest of the events it
 * dispatches around the single tag it defines -- which is exactly why `optInEntryForTag` narrows
 * itself to the tags the manifest does NOT already claim. Reading the dist would also make the
 * check unverifiable in a fixture (every test would need a fake installed dist with 96 built
 * modules) and cost a readdir plus per-file reads on every run, against one 2.6 kB map inlined at
 * build time. What that costs the bundle: `scripts/verify-bundle-shape.mjs` bands doctor.es.js at
 * 5,000-200,000 B around a ~12 kB bundle, so 2.6 kB of map moves no band and that file is
 * untouched by this change.
 *
 * WHAT IT CANNOT SEE, stated rather than implied:
 *   - a tag the map does not answer for is NOT reported. There is no entry to name, and the map is
 *     generated from the same import list the register-all barrel carries, so "import the barrel"
 *     is not a line that would register it either. The case where skipping would be wrong is a CLI
 *     older than the project's kit, and doctor reports that skew as its own finding.
 *   - a tag inside a STRING is data, not a placement: `innerHTML = '<kai-chat>'` and a markdown
 *     body both read that way. That direction is deliberate and it is what keeps the starters'
 *     mock conversation copy quiet (examples/starters/vanilla/src/chat-data.ts:36 names
 *     `<kai-conversations>`, `<kai-thread>` and `<kai-prompt-input>` inside a message body).
 *   - a SPECIFIER is read as a registration wherever `import` precedes it, including inside a
 *     string, and that permissive direction costs nothing here: the same starter files quote
 *     `import '@kitn.ai/ui/web-components/thread'` in a markdown code fence (chat-data.ts:83) for
 *     an entry they also import for real (main.ts:4-8).
 *   - the React wrappers register their own tag when they render, so a RAW `<kai-*>` placed next to
 *     a wrapper import of the same tag is reported even though the wrapper would define it. No
 *     scaffold and no starter does that: the React-target front ends place wrappers
 *     (examples/starters/react/src/main.tsx:3).
 */

import { tags as WEB_COMPONENT_ENTRY_TAGS } from '../../ui/src/web-components/web-component-manifest.json';

/** The register-all barrel: importing it as a value defines every tag. */
export const WEB_COMPONENTS_ENTRY = '@kitn.ai/ui/web-components';

/**
 * The per-web-component entry basename for a tag, e.g. `kai-conversations` -> `conversation-list`.
 *
 * Read from the manifest's `tags` map, NEVER derived by stripping `kai-`: the tags whose entry is
 * not the tag minus its prefix (`kai-conversations`, `kai-sources`, `kai-workspace`,
 * `kai-scope-picker`, `kai-resizable-item`, ...) would resolve to a module the kit does not build.
 */
export function entryForTag(tag: string): string | undefined {
  return (WEB_COMPONENT_ENTRY_TAGS as Record<string, string>)[tag];
}

/** A JS-ish identifier character: the test for "this quote can OPEN a string". */
const WORD = /[\w$]/;

/** `<kai-...` in markup, in an HTML template or in JSX. Runs on the STRING-BLANKED text. */
const PLACED_TAG = /<(kai-[a-z][a-z0-9-]*)/g;

/** `el('kai-...')` / `document.createElement('kai-...')`. Runs on the COMMENT-BLANKED text. */
const CREATED_TAG = /\b(?:el|createElement)\s*\(\s*['"](kai-[a-z][a-z0-9-]*)['"]/g;

/**
 * A registration import: the barrel (no entry in group 2) or one per-web-component entry.
 *
 * The three VALUE forms are a side-effect import (`import 'x'`), a static one with bindings
 * (`import { A } from 'x'`, whose `from` clause group 1 consumes) and a dynamic one
 * (`import('x')`). `import type ... from 'x'` is deliberately NONE of them: a type-only barrel
 * import is what the emitted front ends use to type a ref (mcp/mcp/tools/scaffold.ts:2489), it
 * defines no custom element, and reading it as a registration is how this check would go quiet on
 * the exact app it was written for. The lookahead swallows the whitespace (`(?!\s*type\b)`) rather
 * than sitting behind it, because `import\s*(?!type\b)` is dodgeable: `\s*` backtracks to zero
 * characters and the group then reads `type` as part of the binding clause, which is how the first
 * cut of this pattern passed a type-only import off as a registration.
 */
const REGISTRATION_IMPORT =
  /(?:import\s*\(\s*|import(?!\s*type\b)\s*([^;'"]*?\bfrom\s*)?)['"]@kitn\.ai\/ui\/web-components(?:\/([a-z][a-z0-9-]*))?['"]/g;

/** The project defines the tag itself, so nothing the kit ships is needed for it. */
const SELF_DEFINE = /customElements\s*\.\s*define\s*\(\s*['"](kai-[a-z][a-z0-9-]*)['"]/g;

/** The index just past the first `terminator` at or after `from`, or the end of the text. */
function past(text: string, from: number, terminator: string): number {
  const at = text.indexOf(terminator, from);
  return at === -1 ? text.length : at + terminator.length;
}

/**
 * The index of the character that ENDS the string opened at `open`: its closing quote, or the end
 * of the line for an unterminated `'...'` or `"..."` (a backtick string may span lines).
 */
function stringEnd(text: string, open: number): number {
  const quote = text[open]!;
  for (let i = open + 1; i < text.length; i += 1) {
    const ch = text[i]!;
    if (ch === '\\') {
      i += 1;
      continue;
    }
    if (ch === quote) return i;
    if (ch === '\n' && quote !== '`') return i;
  }
  return text.length;
}

/**
 * A file's text in two masks, built in ONE pass:
 *
 *   `code`    comments blanked, string bodies intact -- what an import or a createElement call lives in
 *   `markup`  comments blanked AND string bodies blanked -- what a placed tag lives in
 *
 * THE COMMENTS ARE `//`, a block comment, and an HTML comment -- which is also the spelling a JSX
 * comment is built from. That is not scenery: the emitted front ends explain themselves in
 * comments that name tags ("Add a line when you place another <kai-*> tag",
 * mcp/mcp/tools/scaffold.ts:1458), and a check that counted those would warn about every scaffold
 * it ever looked at.
 *
 * THE RULES, each with the case that forced it:
 *   - a quote only OPENS a string when it is not preceded by a word character. An apostrophe in
 *     prose ("It's") would otherwise open a string running to the next apostrophe anywhere later,
 *     blanking the markup in between; JS never puts a string literal right after an identifier.
 *   - a `//` preceded by `:` is not a comment: `https://` in a starter's copy is a URL inside a
 *     string, and blanking from there would take the code after it on the same line with it.
 *   - a quote that never closes stops at the end of its line (a backtick string may span lines), so
 *     a misread quote can blank one string, never the rest of the file.
 *
 * A blanked region is replaced with SPACES rather than deleted, so a comment can never JOIN two
 * halves of a tag or a specifier into a match that is not in the source (a comment wedged inside
 * a tag name would otherwise stitch `<ka` and `i-chat>` together).
 */
function blank(text: string): { code: string; markup: string } {
  const code: string[] = [];
  const markup: string[] = [];
  const put = (chunk: string, visibleInMarkup = true): void => {
    code.push(chunk);
    markup.push(visibleInMarkup ? chunk : ' '.repeat(chunk.length));
  };
  const blanked = (count: number): void => put(' '.repeat(count));

  let i = 0;
  while (i < text.length) {
    if (text.startsWith('<!--', i)) {
      const end = past(text, i + 4, '-->');
      blanked(end - i);
      i = end;
      continue;
    }
    if (text.startsWith('//', i) && text[i - 1] !== ':') {
      const stop = text.indexOf('\n', i);
      const end = stop === -1 ? text.length : stop;
      blanked(end - i);
      i = end;
      continue;
    }
    if (text.startsWith('/*', i)) {
      const end = past(text, i + 2, '*/');
      blanked(end - i);
      i = end;
      continue;
    }
    const ch = text[i]!;
    if ((ch === "'" || ch === '"' || ch === '`') && !WORD.test(text[i - 1] ?? ' ')) {
      const end = stringEnd(text, i);
      // The opener stays in BOTH masks: it is what the specifier and createElement patterns anchor
      // on. Only the body is invisible to the markup pattern.
      put(ch);
      put(text.slice(i + 1, end), false);
      if (text[end] === ch) {
        put(ch);
        i = end + 1;
      } else {
        i = end;
      }
      continue;
    }
    put(ch);
    i += 1;
  }
  return { code: code.join(''), markup: markup.join('') };
}

/**
 * A file's text with COMMENTS blanked and everything else intact.
 *
 * Exported for `doctor.ts`, which matches the shared rule set against it. The rules were written
 * for `debug`, which matches what someone PASTED (an error message, a paragraph), so several of
 * them match symptom VOCABULARY -- and a source file's comments explain the very failure a rule
 * describes. Measured: `kai doctor` reported the vanilla starter, a correct app, under "Web
 * components not registered", because its upgrade-gate comment ends "renders a blank page with no
 * error to show for it". Code is the signal; prose about the symptom is not.
 *
 * String BODIES stay visible here, unlike in the `markup` mask: a specifier or a code pattern
 * quoted in a string is still evidence about the file.
 */
export function sourceCode(text: string): string {
  return blank(text).code;
}

/** One tag the project places, with the entry that would register it. */
export interface UnregisteredTag {
  tag: string;
  /** the per-web-component entry basename the manifest maps `tag` to */
  entry: string;
  /** the project's own files that place it, in walk order, as the scan received them */
  files: string[];
}

/**
 * Every tag `files` PLACES that nothing they IMPORT registers, in the order first placed.
 *
 * Registered means one of exactly three things: the register-all barrel is imported as a value, an
 * entry the manifest maps the tag to is imported, or the project defines the tag itself. A tag
 * named in a comment or in a string is not a placement; an `import type` of the barrel is not a
 * registration.
 */
export function unregisteredPlacedTags(
  files: readonly { file: string; text: string }[],
): UnregisteredTag[] {
  const placed = new Map<string, string[]>();
  const imported = new Set<string>();
  const defined = new Set<string>();
  let barrel = false;

  const note = (tag: string, file: string): void => {
    const seen = placed.get(tag);
    if (seen === undefined) placed.set(tag, [file]);
    else if (!seen.includes(file)) seen.push(file);
  };

  for (const { file, text } of files) {
    const { code, markup } = blank(text);
    for (const match of markup.matchAll(PLACED_TAG)) note(match[1]!, file);
    for (const match of code.matchAll(CREATED_TAG)) note(match[1]!, file);
    for (const match of code.matchAll(REGISTRATION_IMPORT)) {
      const entry: string | undefined = match[2];
      if (entry === undefined) barrel = true;
      else imported.add(entry);
    }
    for (const match of code.matchAll(SELF_DEFINE)) defined.add(match[1]!);
  }

  if (barrel) return [];

  const out: UnregisteredTag[] = [];
  for (const [tag, names] of placed) {
    const entry = entryForTag(tag);
    if (entry === undefined || imported.has(entry) || defined.has(tag)) continue;
    out.push({ tag, entry, files: names });
  }
  return out;
}
