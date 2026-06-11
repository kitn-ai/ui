# Lightweight On-Demand Code Highlighting (Shiki Tier 2) — Design

**Date:** 2026-06-03
**Status:** Approved (owner-delegated); implement + verify
**Package:** `@kitnai/chat`

## Goal

Make the web-component set **as lightweight as possible**. Code highlighting must be:

1. **Zero-cost when unused** — if no code block renders, *no* Shiki code, engine, grammar, or theme is ever fetched.
2. **On-demand, per-language** — when a code block renders, load only the core, the JS engine, the one theme, and the one language grammar it needs.
3. **No WASM** — use Shiki's JavaScript regex engine, not the Oniguruma WASM engine (~620 KB).
4. **Consumer-extensible** — hosts can register additional languages/themes, or disable highlighting entirely.

**Hard constraint:** no single shipped file may be large (target: nothing over a few hundred KB; absolutely no ~1 MB+ files).

## Root cause (post Tier 1)

`code-block.tsx` calls `codeToHtml` from `shiki/bundle/web`, which references the bundle's whole language map (~78) + all themes + the Oniguruma WASM engine. Even behind `await import(...)`, the entire set enters the bundle graph. The UMD format can't code-split, so it inlines all of it (5.1 MB after Tier 1).

## Decisions

1. **Drop the UMD build.** UMD/IIFE cannot code-split and therefore must inline every reachable dynamic import — structurally incompatible with the goal. Ship **ESM only**, usable via `<script type="module">` (universally supported). Document this as the drop-in method.
2. **Fine-grained Shiki via `shiki/core`.** Replace the bundled `codeToHtml` with a lazily-created `HighlighterCore` that has **no** preloaded languages/themes and uses `createJavaScriptRegexEngine()` (no WASM).
3. **Curated default language set, loaded individually on demand.** A small default map (~15 common languages) where each entry is `() => import('@shikijs/langs/<lang>')`. The bundler code-splits each into its own small lazy chunk, fetched only when that language first appears. Languages outside the map fall back to plain text unless the host registers them.
4. **Highlighting is optional** at two levels: a global `configureCodeHighlighting({ enabled: false })` and a per-subtree `ChatConfig codeHighlight={false}`. When off, render the existing plain `<pre><code>` fallback — nothing Shiki loads.

## Components

### `src/primitives/highlighter.ts` (new) — singleton manager
- Lazy singleton. First call dynamically imports `shiki/core` + `shiki/engine/javascript`, creates one `HighlighterCore` with the JS engine, empty langs/themes.
- Loader registries:
  - `langLoaders: Record<string, () => Promise<unknown>>` — default ~15: `javascript, jsx, typescript, tsx, json, html, css, python, bash, shellscript, markdown, yaml, sql, diff, go, rust`. Each `() => import('@shikijs/langs/<lang>').then(m => m.default)`.
  - `themeLoaders: Record<string, () => Promise<unknown>>` — default `github-dark-dimmed`, `github-light`. Each `() => import('@shikijs/themes/<name>').then(m => m.default)`.
- `ensureLang(lang)` / `ensureTheme(theme)` — load+cache via the registry; track what's already loaded into the highlighter to avoid reloading.
- `highlight(code, lang, theme): Promise<string>` — ensure theme+lang; if `lang` has no loader, return escaped plain `<pre><code>`; on any error, same fallback.
- `configureCodeHighlighting(options)` — public API:
  ```ts
  interface CodeHighlightingOptions {
    enabled?: boolean;                              // default true
    languages?: Record<string, () => Promise<unknown>>;  // merge/override loaders
    themes?: Record<string, () => Promise<unknown>>;     // merge/override loaders
    aliases?: Record<string, string>;               // e.g. { js: 'javascript', sh: 'bash' }
  }
  ```
- `isCodeHighlightingEnabled(): boolean`.
- Built-in aliases: `js→javascript, ts→typescript, sh→bash, shell→shellscript, yml→yaml, py→python, rs→rust, md→markdown`.

### `src/components/code-block.tsx` (modify)
- Replace the inline `import('shiki/bundle/web')` block with a call to the manager's `highlight()`.
- Respect disabled state: if `!isCodeHighlightingEnabled()` or `ChatConfig.codeHighlight() === false`, skip the resource and render the plain `<pre><code>` fallback (which already exists). No Shiki import happens in that path.

### `src/primitives/chat-config.tsx` (modify)
- Add `codeHighlight: Accessor<boolean>` to `ChatConfigValue` (default `() => true`), `codeHighlight?: boolean` to `ChatConfigProps`, and `codeHighlight: () => props.codeHighlight ?? true` in the provider. Backward compatible.

### Web-component facades (modify)
- `<kitn-chat>` gains a `codeHighlight?: boolean` property (default true), forwarded to its inner `ChatConfig`.
- `configureCodeHighlighting` is exported from `src/index.ts` and re-exported from `src/elements/register.ts` so both SolidJS and web-component consumers can call it.

### Build (`vite.config.ts`, `package.json`)
- `formats: ['es']` only (remove `'umd'`).
- Keep `./elements` → `dist/kitn-chat.es.js`. Lazy chunks (core, js-engine, per-language, per-theme) emit alongside and load on demand.
- Add `@shikijs/langs` and `@shikijs/themes` as explicit dependencies (currently transitive via `shiki`) so the import paths are guaranteed.

## Testing

- **Unit (jsdom):** `highlight('const x = 1', 'tsx', 'github-dark-dimmed')` returns HTML containing `<span` style markup (real highlighting, JS engine, no WASM). An unknown language (e.g. `brainfuck`) returns the escaped plain `<pre>` fallback. `configureCodeHighlighting({ enabled:false })` → `highlight` returns plain fallback and the manager never creates a highlighter.
- **Element:** `<kitn-chat codeHighlight={false}>` renders code blocks as plain `<pre>` (verify no Shiki chunk needed). Existing element tests stay green.
- Existing 213 tests stay green.

## Verification (acceptance)

- `npm run build` emits **no file larger than ~300 KB**; **no UMD file**; **no `.wasm`/oniguruma chunk**.
- `dist/kitn-chat.es.js` (main) contains no Shiki code (Shiki only in lazy chunks).
- Per-language chunks exist and are small (tens of KB each), loaded individually.
- A browser smoke test: a `<kitn-chat>` with a tsx code block highlights correctly (network shows core + js-engine + tsx + theme chunks fetched only then); a `<kitn-chat>` with no code block fetches none of them.

## Out of scope
- Bundling every Shiki language (the curated set + host registration is the model).
- Re-adding a UMD/IIFE build (ESM + `<script type="module">` replaces it).
- Restyling code blocks.
