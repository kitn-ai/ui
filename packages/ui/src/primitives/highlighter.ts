// On-demand code highlighter built on Shiki's fine-grained core.
//
// Nothing here loads until `highlight()` is first called with highlighting
// enabled — so a component set that never renders a code block ships and runs
// with ZERO Shiki bytes. When a code block does appear, only the core, the
// JavaScript regex engine (no WASM), the one theme, and the one language grammar
// it needs are dynamically imported, each as its own small lazy chunk.
//
// Hosts extend or disable this via `configureCodeHighlighting()`.
//
// REPORTS ARE PREFIXED `[kai-highlighter]`, which is this module and NOT an element
// (there is no `<kai-highlighter>`). Prefixes in this repo name the SOURCE that
// reported — `[kai-card-tools]` in `schemas/tool-defs.ts` is the non-element precedent
// — and naming the source is the accurate choice here because `highlight()` backs the
// code blocks of `<kai-code-block>` AND `<kai-markdown>` AND `<kai-message>` alike: a
// report that said `[kai-code-block]` told a markdown reader about an element they
// never rendered, and aimed the fix at the wrong place.

import type { HighlighterCore } from 'shiki/core';

type Loader = () => Promise<unknown>;

/**
 * The languages the kit ships a grammar for: each a separate lazy chunk, loaded
 * only on use.
 *
 * NOT A CLOSED SET, and not a statement about what is supported. Shiki ships
 * grammars for hundreds of languages, one chunk each, so a list of them here
 * would charge every consumer for the ones they never render. A language missing
 * from this map is UNREGISTERED, not unsupported: `highlight()` reports it and
 * names the one-line `configureCodeHighlighting({ languages })` call that fixes
 * it, with no rebuild needed (see that fn).
 *
 * `python` is the case that proved it. It is a common enough code block that
 * making every consumer register it would be the worse default (75.3 kB raw /
 * 9.2 kB gzip), and it costs nothing to an app that never renders one, because
 * the loader is a dynamic import: the chunk is fetched when the first Python
 * block appears, and never otherwise.
 */
const DEFAULT_LANGUAGES: Record<string, Loader> = {
  bash: () => import('@shikijs/langs/bash'),
  javascript: () => import('@shikijs/langs/javascript'),
  typescript: () => import('@shikijs/langs/typescript'),
  tsx: () => import('@shikijs/langs/tsx'),
  html: () => import('@shikijs/langs/html'),
  css: () => import('@shikijs/langs/css'),
  json: () => import('@shikijs/langs/json'),
  python: () => import('@shikijs/langs/python'),
  vue: () => import('@shikijs/langs/vue'),
  svelte: () => import('@shikijs/langs/svelte'),
};

const DEFAULT_THEMES: Record<string, Loader> = {
  'github-dark-dimmed': () => import('@shikijs/themes/github-dark-dimmed'),
  'github-light': () => import('@shikijs/themes/github-light'),
};

const DEFAULT_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  jsx: 'tsx',
  sh: 'bash',
  shell: 'bash',
  py: 'python',
};

const FALLBACK_THEME = 'github-dark-dimmed';

export interface CodeHighlightingOptions {
  /** Turn highlighting on/off globally. When false, code renders as plain text. */
  enabled?: boolean;
  /** Register/override language loaders, e.g. `{ ruby: () => import('@shikijs/langs/ruby') }`. */
  languages?: Record<string, Loader>;
  /** Register/override theme loaders. */
  themes?: Record<string, Loader>;
  /** Map short names to canonical language keys, e.g. `{ vue: 'html' }`. */
  aliases?: Record<string, string>;
}

let enabled = true;
let langLoaders: Record<string, Loader> = { ...DEFAULT_LANGUAGES };
let themeLoaders: Record<string, Loader> = { ...DEFAULT_THEMES };
let aliases: Record<string, string> = { ...DEFAULT_ALIASES };

let highlighterPromise: Promise<HighlighterCore> | null = null;
const loadedLangs = new Set<string>();
const loadedThemes = new Set<string>();

function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
        import('shiki/core'),
        import('shiki/engine/javascript'),
      ]);
      return createHighlighterCore({
        themes: [],
        langs: [],
        engine: createJavaScriptRegexEngine(),
      });
    })();
  }
  return highlighterPromise;
}

/**
 * Resolve `lang` to the key its loader is registered under.
 *
 * EXACT MATCH FIRST, then a case-insensitive second pass, and both halves are
 * load-bearing. A language id is whatever a fence's author typed or an app's data
 * says, so `Python` and `PY` arrive as readily as `python`, and Shiki's own ids
 * are all lowercase, so before the second pass a capitalised id missed a grammar
 * that plainly existed and the block rendered plain with no signal at all.
 *
 * THE SECOND PASS ONLY EVER RETURNS A KEY THAT IS REALLY REGISTERED, in `aliases`
 * or `langLoaders`. An id nobody registered falls through both passes and comes
 * back AS GIVEN, so an unknown id is reported under its own spelling rather than
 * quietly lowered into the report of a language that is not the one asked for:
 * folding case must not turn a typo into a hit.
 */
function resolveLang(lang: string): string {
  const exact = aliases[lang] ?? lang;
  if (langLoaders[exact]) return exact;
  const lower = lang.toLowerCase();
  const folded = aliases[lower] ?? lower;
  return langLoaders[folded] ? folded : exact;
}

async function ensureLang(hl: HighlighterCore, lang: string): Promise<boolean> {
  const name = resolveLang(lang);
  if (loadedLangs.has(name)) return true;
  const loader = langLoaders[name];
  if (!loader) return false;
  await hl.loadLanguage(loader() as never);
  loadedLangs.add(name);
  return true;
}

async function ensureTheme(hl: HighlighterCore, theme: string): Promise<boolean> {
  if (loadedThemes.has(theme)) return true;
  const loader = themeLoaders[theme];
  if (!loader) return false;
  await hl.loadTheme(loader() as never);
  loadedThemes.add(theme);
  return true;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function plain(code: string): string {
  return `<pre><code>${escapeHtml(code)}</code></pre>`;
}

/**
 * The languages and themes already reported, per copy of this module.
 *
 * ONCE PER LANGUAGE OR THEME, and that is what makes leaving the report on
 * affordable: a thread with forty blocks in an unregistered language is forty calls to
 * `highlight()` and exactly ONE sentence, so the signal reaches the developer
 * without the console becoming unreadable. A registered language whose loader
 * throws gets its own key, so a later failure is not suppressed by an earlier
 * not-registered report. Keyed on the lowercased id, so `Python` and `PY` cannot
 * each produce one. A language failure and a theme failure over the same spelling
 * are separately keyed, so one cannot suppress the other.
 *
 * THEME KEYS USE THE THEME EXACTLY AS ASKED, because `ensureTheme` matches a theme
 * exactly and does not fold case: `Github-Dark` and `github-dark` are two different
 * asks, and reporting them as two failures is the honest pair.
 *
 * The keys are `unregistered:<lang>`, `failed:<lang>`, `unregistered-theme:<theme>`
 * and `unresolved-theme:<theme>`.
 *
 * SCOPE, stated rather than implied: module state, exactly like every registry in
 * this file, so a realm holding two copies of this module warns once per copy,
 * and copies of a module are a real shape in this kit (see the shared-state note
 * in `wire/diagnostics.ts`, where one made a whole surface inert). Collapsing
 * that would take a `Symbol.for` global here, deferred on purpose: the cost of
 * the duplicate is one extra line, and the per-module registries above mean the
 * second copy is a second highlighter with its own states, for which a shared
 * report would be the inconsistent half of the pair.
 *
 * Cleared by the test reset helper, so one test's report does not silence the
 * next one's assertion.
 */
const reported = new Set<string>();

/** The kit's own roster, read off the live maps so a language added above is
 *  named in the report without a second edit here. */
function shippedLanguages(): string {
  return (
    `The kit ships ${Object.keys(DEFAULT_LANGUAGES).join(', ')} ` +
    `and the aliases ${Object.keys(DEFAULT_ALIASES).join(', ')}. ` +
    `Every other grammar is a separate lazy chunk the app opts into.`
  );
}

/** The kit's own theme roster, read off the live map for the same reason
 *  `shippedLanguages()` reads its own: a theme added above is named in a report
 *  without a second edit here. */
function shippedThemes(): string {
  return (
    `The kit ships ${Object.keys(DEFAULT_THEMES).join(', ')} ` +
    `and substitutes "${FALLBACK_THEME}" when no theme resolves. ` +
    `Every other theme is a separate lazy chunk the app opts into.`
  );
}

/**
 * The one-line fix a theme report names.
 *
 * The option shape is quoted from `CodeHighlightingOptions`, not paraphrased: it is
 * `themes?: Record<string, Loader>` with `Loader = () => Promise<unknown>`, so an app
 * that writes `() => import('@shikijs/themes/x').then((m) => m.default)` is still
 * telling the truth.
 *
 * KEY AND SUBPATH ARE SPELLED DIFFERENTLY ON PURPOSE. `ensureTheme` matches a theme
 * exactly, so the map KEY keeps the spelling that was asked for, which is the key the
 * next lookup will hit. The SUBPATH is lowercased because every theme subpath Shiki
 * ships is lowercase, so `Github-Light` as a path is a second failure rather than a
 * fix. Unlike a language there is no case-folding rescue on the way in, so the two
 * differ exactly where the ask did.
 */
function themeFixCall(theme: string): string {
  return (
    `configureCodeHighlighting({ themes: { ${theme}: () => import('@shikijs/themes/${theme.toLowerCase()}') } }), ` +
    `whose themes option is Record<string, () => Promise<unknown>>`
  );
}

/**
 * Report a decision once per language or theme, then stay quiet.
 *
 * WHY A CONSOLE WARNING AND NOT THE DIAGNOSTICS CHANNEL. The kit's diagnostics
 * stream (`@kitn.ai/ui/diagnostics`) is the right home for "the kit made a
 * decision you did not see" and this primitive cannot reach it. Its producer is
 * `emitWireDiagnostic`, which is internal and whose union (`WireDiagnosticEvent`)
 * carries no general warning member. The nearest thing, a `kit.warn`, is still an
 * inventory item in `wire/diagnostics.ts`. Emitting one would mean widening a
 * versioned, forward-compat, payload-audited contract, which is a decision about
 * the diagnostics surface rather than about highlighting; and importing
 * `../wire/diagnostics` from a primitive would pull wire bytes into the bundle of
 * every consumer that only renders a code block, which is the same cost the
 * element-event types are declared separately to avoid.
 *
 * NO `NODE_ENV` GATE, following `schemas/registry.ts`'s recorded reasoning: this
 * package's `src/` has no dev/prod build convention, a stripping contract has to
 * hold across every consumer bundler on a PRE-BUILT dist, and a gate that gets it
 * wrong makes the developer's laptop look fine while production is the silent one.
 * The cost here is one line per language or theme per process, which is nothing.
 */
function reportOnce(key: string, message: string): void {
  if (reported.has(key)) return;
  reported.add(key);
  // A missing console is a real environment -- a stripped SSR runtime, a worker, a
  // test harness that removed it. Losing the report there beats throwing on a path
  // the caller never asked about, which is the whole reason the fallback exists.
  if (typeof console === 'undefined' || typeof console.warn !== 'function') return;
  console.warn(message);
}

/** What a caught value says about itself. Not every throw is an `Error`. */
function describeError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return String(err);
}

/**
 * Highlight `code` as `lang` with `theme`, returning HTML. Loads only what's
 * needed, on demand. Falls back to escaped plain `<pre><code>` when highlighting
 * is disabled, the language has no registered loader, or anything fails, and the
 * last two are REPORTED once per language rather than falling back silently, so a
 * block that came out plain because nobody registered its grammar is
 * distinguishable from one that came out plain because it is disabled.
 *
 * A THEME falls back two ways and BOTH ARE REPORTED, because a theme is where the
 * silent fallback hides best: nothing throws and the block still comes out
 * highlighted, just in colors the app never chose. An unregistered theme is a
 * SUBSTITUTION: `FALLBACK_THEME` renders the block, and the report names the theme
 * asked for, the one used instead, and the one-line call that registers the first,
 * which is a different fact from a theme that cannot resolve at all, where the
 * block renders plain and the report says so. Neither changes what is returned.
 */
export async function highlight(code: string, lang: string, theme: string): Promise<string> {
  if (!enabled || !code) return plain(code);
  try {
    const hl = await getHighlighter();
    const hasLang = await ensureLang(hl, lang);
    if (!hasLang) {
      // The suggestion uses the folded id for BOTH the map key and the subpath:
      // Shiki's package ids are lowercase, and `resolveLang` folds case, so a
      // lowercase key matches whatever spelling the block asked with.
      const id = lang.toLowerCase();
      reportOnce(
        `unregistered:${id}`,
        `[kai-highlighter] no grammar registered for "${lang}": rendering it as plain text. ` +
          `Register it once at app start: ` +
          `configureCodeHighlighting({ languages: { ${id}: () => import('@shikijs/langs/${id}') } }), ` +
          `whose languages option is Record<string, () => Promise<unknown>>. ` +
          shippedLanguages(),
      );
      return plain(code);
    }
    const hasTheme = await ensureTheme(hl, theme);
    const useTheme = hasTheme
      ? theme
      : (await ensureTheme(hl, FALLBACK_THEME)) ? FALLBACK_THEME : null;
    if (!useTheme) {
      // No theme at all: the grammar loaded and the block is still unhighlighted,
      // so the report has to say which of the two is missing. This branch is reached
      // when the fallback has no loader either — which `configureCodeHighlighting`
      // can only produce by OVERWRITING `themes[FALLBACK_THEME]` with a falsy loader,
      // since that option merges and has no way to remove an entry — and reporting a
      // theme here is what keeps it apart from the plain text a disabled highlighter
      // or an unregistered LANGUAGE produces.
      reportOnce(
        `unresolved-theme:${theme}`,
        `[kai-highlighter] no theme registered for "${theme}", and nothing to fall back to ` +
          `(the kit's fallback is "${FALLBACK_THEME}"), rendering this block as plain text, ` +
          `unhighlighted. The language resolved and the grammar loaded; the THEME is what is ` +
          `missing, which is a different report from an unregistered language. ` +
          `Register it once at app start: ${themeFixCall(theme)}. ` +
          shippedThemes(),
      );
      return plain(code);
    }
    if (!hasTheme) {
      // A substitution, not a failure: the block IS highlighted, in colors the app
      // did not configure. Same once-per-theme rule as the language reports.
      reportOnce(
        `unregistered-theme:${theme}`,
        `[kai-highlighter] no theme registered for "${theme}": highlighting this block with ` +
          `"${useTheme}" instead, so it renders in colors you did not configure. ` +
          `Register it once at app start: ${themeFixCall(theme)}. ` +
          shippedThemes(),
      );
    }
    return hl.codeToHtml(code, { lang: resolveLang(lang), theme: useTheme });
  } catch (err) {
    // The PLAIN FALLBACK stays, deliberately — a thread that renders at all beats
    // one that throws because a grammar chunk failed to load. What does not stay
    // is the silence: the language and the loader's own message are the two facts
    // that separate "Shiki has no such language" from "the network ate the chunk".
    reportOnce(
      `failed:${lang.toLowerCase()}`,
      `[kai-highlighter] highlighting "${lang}" failed: ${describeError(err)}, ` +
        `rendering it as plain text instead.`,
    );
    return plain(code);
  }
}

/** Register additional languages/themes/aliases, or disable highlighting entirely. */
export function configureCodeHighlighting(options: CodeHighlightingOptions): void {
  if (options.enabled !== undefined) enabled = options.enabled;
  if (options.languages) langLoaders = { ...langLoaders, ...options.languages };
  if (options.themes) themeLoaders = { ...themeLoaders, ...options.themes };
  if (options.aliases) aliases = { ...aliases, ...options.aliases };
}

export function isCodeHighlightingEnabled(): boolean {
  return enabled;
}

/** Test helper: reset the singleton and registries to defaults. */
export function __resetCodeHighlightingForTests(): void {
  enabled = true;
  langLoaders = { ...DEFAULT_LANGUAGES };
  themeLoaders = { ...DEFAULT_THEMES };
  aliases = { ...DEFAULT_ALIASES };
  highlighterPromise = null;
  loadedLangs.clear();
  loadedThemes.clear();
  reported.clear();
}
