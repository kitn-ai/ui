// On-demand code highlighter built on Shiki's fine-grained core.
//
// Nothing here loads until `highlight()` is first called with highlighting
// enabled — so a component set that never renders a code block ships and runs
// with ZERO Shiki bytes. When a code block does appear, only the core, the
// JavaScript regex engine (no WASM), the one theme, and the one language grammar
// it needs are dynamically imported, each as its own small lazy chunk.
//
// Hosts extend or disable this via `configureCodeHighlighting()`.

import type { HighlighterCore } from 'shiki/core';

type Loader = () => Promise<unknown>;

/**
 * Minimal default language set — each a separate lazy chunk, loaded only on use.
 * Kept deliberately small to keep the bundle lean; hosts add more at runtime via
 * `configureCodeHighlighting({ languages })` (no rebuild needed — see that fn).
 */
const DEFAULT_LANGUAGES: Record<string, Loader> = {
  bash: () => import('@shikijs/langs/bash'),
  javascript: () => import('@shikijs/langs/javascript'),
  typescript: () => import('@shikijs/langs/typescript'),
  tsx: () => import('@shikijs/langs/tsx'),
  html: () => import('@shikijs/langs/html'),
  css: () => import('@shikijs/langs/css'),
  json: () => import('@shikijs/langs/json'),
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

function resolveLang(lang: string): string {
  return aliases[lang] ?? lang;
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
 * Highlight `code` as `lang` with `theme`, returning HTML. Loads only what's
 * needed, on demand. Falls back to escaped plain `<pre><code>` when highlighting
 * is disabled, the language has no registered loader, or anything fails.
 */
export async function highlight(code: string, lang: string, theme: string): Promise<string> {
  if (!enabled || !code) return plain(code);
  try {
    const hl = await getHighlighter();
    const hasLang = await ensureLang(hl, lang);
    if (!hasLang) return plain(code);
    const useTheme = (await ensureTheme(hl, theme))
      ? theme
      : (await ensureTheme(hl, FALLBACK_THEME)) ? FALLBACK_THEME : null;
    if (!useTheme) return plain(code);
    return hl.codeToHtml(code, { lang: resolveLang(lang), theme: useTheme });
  } catch {
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

/** Test helper — reset the singleton and registries to defaults. */
export function __resetCodeHighlightingForTests(): void {
  enabled = true;
  langLoaders = { ...DEFAULT_LANGUAGES };
  themeLoaders = { ...DEFAULT_THEMES };
  aliases = { ...DEFAULT_ALIASES };
  highlighterPromise = null;
  loadedLangs.clear();
  loadedThemes.clear();
}
