# Handoff — kitn-chat web components, examples & publishing (2026-06-11)

Snapshot of where things stand so work can resume after a context clear.

## Current published state
- **npm:** `@kitnai/chat` — latest **`0.3.1`** (also 0.1.0, 0.2.0). Live on unpkg + jsDelivr.
  - unpkg's *latest* tag can lag a few minutes after a publish; jsDelivr is near-instant.
- **GitHub:** `kitn-ai/chat` (org `kitn-ai`; npm scope `@kitnai` — note the different spelling). Branch `main`. **No open PRs.**

## Architecture (the key mental model)
Two layers:
1. **SolidJS primitives** — everything exported from `src/index.ts` (Message, ModelSwitcher, Context, ScrollButton, PromptInput, ConversationList, ChainOfThought, FeedbackBar, ThinkingBar, TextShimmer, VoiceInput, FileUpload, SlashCommand, …). Compose freely. Full flexibility. Styled via Tailwind v4 + `theme.css` tokens.
2. **Web components** — `src/elements/`: `<kitn-chat>`, `<kitn-conversation-list>`, `<kitn-prompt-input>`. Drop-in, framework-agnostic, Shadow DOM, SolidJS bundled in. **Configurable, not infinitely composable.** Data in via JS **properties**, config via **attributes**, data out via **CustomEvents** (non-bubbling). Theming via `--color-*` tokens + a `theme` attribute. The shared wrapper is `src/elements/define.tsx`.

`<kitn-chat>` surfaces per-message: markdown+code, `reasoning`, `tools`, `attachments`, `actions`; plus header (`chat-title` + `models`/ModelSwitcher + `context` meter), `scroll-button`, `search`/`voice` toolbar buttons (opt-in), input attach. Events: `submit {value, attachments}`, `valuechange`, `suggestionclick`, `messageaction`, `modelchange`, `search`, `voice`.
**Primitive-only (NOT in the web component):** ChainOfThought, FeedbackBar, ThinkingBar/TextShimmer (animated "thinking"), VoiceInput, FileUpload, SlashCommand. `loading` only locks the input — no thinking animation (convey progress by streaming `messages`).

Full API reference: **`docs/web-components.md`**.

## Publishing pipeline (works end-to-end)
- **release-please** (`.github/workflows/release-please.yml`) watches `main`, opens a `chore(main): release X` PR from Conventional Commits; merging it tags + creates the GitHub Release and publishes to npm via **OIDC trusted publishing** (no `NPM_TOKEN`). Trusted publisher is configured on npm for org `kitn-ai`/repo `chat`/workflow `release-please.yml`.
- `package.json`: `files: [dist, src, theme.css]`, `unpkg`/`jsdelivr` → `dist/kitn-chat.es.js`, `prepublishOnly: npm run build`, MIT license.
- **Minify:** Vite 6 *intentionally* skips minify for `build.lib` + ESM. Fixed via a custom `libMinifyPlugin()` (esbuild in a `generateBundle` hook) in `vite.config.ts`. Bundle ≈ 310 KB raw / 89 KB gzip with full parity.

## Examples (build-free vanilla + Vite frameworks)
- `examples/vanilla/index.html` — single-file CDN showcase: full header, streaming, message actions, attachments, theme toggle (sun/moon, system-aware), resizable sidebar, runtime language registration.
- `examples/widget/index.html` — Intercom-style FAB floating chat.
- `examples/react/` — Vite + React using the web components (properties via refs + addEventListener).
- `examples/solid/` — Vite + Solid composing the primitives. **Key setup:** Tailwind v4 `@tailwindcss/vite` + `@import "@kitnai/chat/theme.css"` + `@source "../node_modules/@kitnai/chat"` (the `@source` is essential or Tailwind tree-shakes the kit's classes).
- `examples/shared/logo.svg` — four-square favicon.

## Recent fixes shipped this session
Real action icons (was "C/L/D"); web-component dark mode via `theme` attr (was broken — `:host` pinned light tokens); input attachments (images→thumbnail, files→icon); curated default highlighter languages; minify fix; full `<kitn-chat>` parity; smaller conversation labels; inherited-text-color follows dark mode (define.tsx wrapper sets `color: var(--color-foreground)`).

## Parked / candidate next steps
- **Slots** on `<kitn-chat>` (bring-your-own header / input-actions) — deferred by choice.
- **Typography config/tokens** — font sizes are Tailwind classes in components, NOT tokenized (only `--color-*` + `--radius` are). Open question whether to add a typography knob.
- Optionally **surface more primitives** in the web component (ChainOfThought, FeedbackBar, thinking/shimmer while `loading`).
- Polish the React/Solid examples; consider a Vue example.

## Composable web components — spike (branch `spike/composable-web-components`, uncommitted)

R&D into shipping the *individual* primitives as web components so consumers can compose in plain HTML/React/Vue, not only use the batteries-included `<kitn-chat>`. **Verdict so far: the approach holds; staying on Solid + `solid-element` (no Stencil rewrite).**

**Decision — Solid, not Stencil.** The web-component layer is a thin facade; the library's actual value is the ~50 SolidJS primitives + **Kobalte** (accessible Dropdown/HoverCard/Dialog/Collapsible/etc.). A Stencil rewrite would mean rebuilding that whole layer and replacing Kobalte for benefits that are mostly DX polish — which we can get incrementally on Solid. Revisit only if the product becomes web-component-first (SSR/hydration + auto framework wrappers as core, Solid layer not strategic).

**Composition model (settled).** Each element is its own complete Solid tree; composition happens at the **data layer** (properties in, CustomEvents out), NOT by splitting compound components across shadow roots. Three routes considered:
- **Route 1 (default):** one configurable element per feature. Presentation that the Solid layer expresses by composing sub-parts becomes **`variant` attribute + boolean flags**. (e.g. `<kitn-attachments variant="inline">` = icon+label; `variant="grid" hover-card removable` = visual+hover+remove.)
- **Route 2 (opt-in, designed-but-deferred):** a `<template slot="…">` for genuinely-custom content (e.g. a bespoke hover-card body). Not built yet.
- **Route 3 (rejected):** nested per-sub-part elements (`<kitn-attachment-preview>` reading parent state) — Solid Context does NOT cross shadow-root boundaries, so this means re-plumbing context over the DOM. Too much work, fragile.
- The **SolidJS primitive layer** remains the escape hatch below all of this. Not every export becomes an element — hooks (`useTextStream`…) and generic UI primitives (`Button`, `Dialog`…) stay Solid-only. Roster is ~15–20 feature elements.

**Built in the spike:**
- `define.tsx` — (1) **shared constructable `CSSStyleSheet`** adopted into every shadow root via `adoptedStyleSheets` (was: full ~77 KB compiled CSS inline-`<style>` per instance; inline is now only a fallback). Verified: 4 elements → 1 shared sheet. (2) `defineKitnElement<P, E>` now bakes in **typed `dispatch`** (event map `E`) and a **`flag(name)`** helper on the facade context.
- New elements: `<kitn-thinking-bar>` (leaf; `stop`), `<kitn-model-switcher>` (`modelchange`), `<kitn-attachments>` (the Route 1 exemplar: `variant` + `hover-card`/`removable`/`show-media-type` flags; `remove`). Registered in `register.ts`.
- `examples/composable/` — `MOCKUP.html` (approved API sketch) + functional `index.html` test page. Verified headless via Playwright (render, events, shared sheet, dark mode). **Bundle: ~90.4 KB gzip (was ~89) — +~1.4 KB for 3 elements + the shared-sheet refactor.** Confirms per-element marginal cost is tiny; full roster projected ~100–120 KB gzip.

**Findings / gaps surfaced:**
- **Bare boolean attributes parse to `undefined`** in `component-register` (`<el removable>` → `undefined`, not `true`). The new `flag()` fixes it. **This also affects the EXISTING `<kitn-chat>`** — its `loading`/`search`/`voice` attributes only *seem* to work because their default is `false`; `<kitn-chat loading>` would NOT lock the input. **TODO: apply `flag()` to `<kitn-chat>` + fix `docs/web-components.md`.**
- **`theme.css` is a Tailwind v4 *source* file, not a browser stylesheet** (uses `@theme`/`@custom-variant`/`@import "tw-animate-css"`). Loaded directly via `<link>` (as the docs recommended) it (a) **404s on `tw-animate-css`** and (b) **applies NO tokens** — the browser ignores `@theme {}`, so `--color-background` resolves empty (verified). The web components are unaffected: each ships the compiled token set inside its Shadow DOM (`:root, :host` in `compiled.css`), so they're self-themed and need no host stylesheet. **✅ Fixed** (non-breaking): `scripts/build-theme-tokens.mjs` generates a browser-ready **`dist/theme.tokens.css`** from the source `theme.css` on every build (`postbuild` → `build:theme`) — `@theme {}` → `:root {}`, `@keyframes` hoisted, `.dark`/`.chat-markdown` kept. Added as a NEW export `./theme.tokens.css` (the Tailwind-source `./theme.css` export is unchanged, so `@import` build consumers like examples/solid keep working). Verified: `<link>`-ing it applies `:root` tokens (light) + `.dark` flip, no 404. Docs updated to send `<link>`/CDN consumers to `theme.tokens.css` and Tailwind builds to `theme.css`.
- **Cosmetic:** non-image attachments in `variant="grid"` render as thin icon pills (pre-existing primitive behavior, not the wrapper) — polish pass if grid ships.

**Build progress (branch `spike/composable-web-components`, all phases committed, NOT merged):**
- ✅ Phase 0 — `defineKitnElement<P,E>` infra (shared stylesheet, `flag()`, typed `dispatch`) + 3 spike elements.
- ✅ Phase 1 — message core: `<kitn-message>`, `<kitn-markdown>`, `<kitn-code-block>`, `<kitn-reasoning>`, `<kitn-tool>`.
- ✅ Phase 2 — header/meta: `<kitn-context-meter>`, `<kitn-feedback-bar>`, `<kitn-chat-scope-picker>`.
- ✅ Phase 3 — input: `<kitn-prompt-suggestions>`, `<kitn-file-upload>` (Route 2 slot), `<kitn-voice-input>` (function-property). `<kitn-slash-command>` deliberately deferred (context-bound to PromptInput — folds into `<kitn-prompt-input>` later).
- ✅ Phase 4 — leaves: `<kitn-loader>`, `<kitn-text-shimmer>`, `<kitn-image>`, `<kitn-checkpoint>`, `<kitn-message-skills>`, `<kitn-source>`/`<kitn-source-list>`, `<kitn-response-stream>`, `<kitn-empty>` (Route 2 slots), `<kitn-chain-of-thought>` (`steps[]` data model).
- ✅ Cross-cutting — `flag()` applied to existing `<kitn-chat>` (`loading`/`search`/`voice`/`code-highlight`) + `<kitn-prompt-input>` (`disabled`/`loading`) booleans; docs updated. `define.tsx` now throws a clear error if a prop name collides with a global reflected attribute (`title`/`id`/`slot`/`lang`) — the CE-constructor footgun that `<kitn-source>.title` hit.
- **~28 elements total; bundle ~101 KB gzip** (was ~89), in the projected 100–120 KB range. Each phase: build + typecheck + headless Playwright smoke (render/events/shared-sheet) + element unit tests, all green. Validated against `npm pack` consumer install.

- ✅ **Slash commands folded in** — `SlashCommand` is context-bound to the prompt input, so it's wired into the shared `DefaultPromptInput` and exposed on both `<kitn-prompt-input>` and `<kitn-chat>` via a `slashCommands` property (+ `slashActiveIds`/`slash-compact`); typing `/` opens the palette, emits `slashselect`. Verified headless.
- ✅ **Full-roster showcase** — `examples/composable/index.html` rebuilt as a themed showcase of all ~26 elements (light/dark toggle + live event log). `_harness.html` is the test-only blank page.

- ✅ **theme.css compiled-token file** — `dist/theme.tokens.css` + `./theme.tokens.css` export (see the theming finding above). Non-breaking.
- ✅ **Element API codegen** — `scripts/gen-element-api.mjs` (TS compiler API) extracts every element's props/events/attributes from the facades and emits, on every build (`postbuild`): `dist/custom-elements.json` (CEM, `customElements` field), `src/elements/element-types.d.ts` (typed `HTMLElementTagNameMap` → typed `querySelector`/`createElement`, wired as the `./elements` types entry), and `frameworks/react/index.tsx` (typed React wrappers, `./react` export, react optional peer dep). Types are fully self-contained (kit types expanded inline) so they don't drag Solid `.tsx` into a React/consumer compile. `npm run typecheck` covers both JSX contexts. **NB:** wrappers live in `frameworks/react/` — a top-level `react/` dir + `baseUrl:"."` shadows the `react` package.

- ✅ **Tokenized typography** — `theme.css` `@theme` now defines `--text-caption/meta/body/title` (utilities + CSS custom properties). Control-tier components (reasoning, chain-of-thought, model-switcher) migrated off ad-hoc `text-xs/sm` to the semantic classes; default chat reading size base→sm (14px) so message/input/suggestions/markdown agree. Storybook **Theming/Typography** story documents it.
- ✅ **Themeable via a namespaced `--kc-*` surface (isolated + overridable)** — Tailwind v4 pins `@theme` tokens on `:host`, which (good) isolates the kit from a host's generic `--color-primary`/`--radius` but (bad) blocked `:root` overrides. Fix: each kit token in `theme.css` is now defined as `--color-x: var(--kc-color-x, <default>)` (light + dark, colours + `--radius` + `--text-*`; done via a regex pass). So the `:host` pin stays (isolation — a shadcn host's `--color-primary` can't bleed in), but the fallback resolves the **namespaced** `--kc-color-x` which inherits from `:root` → consumers override `--kc-color-*`/`--kc-text-*`/`--kc-radius`. No utility renames (utilities still read `--color-x`). Single `--kc-*` value applies to both modes; scope to `:root.dark` for per-mode. Verified: host `--color-primary` ignored, `--kc-color-primary`/`--kc-text-meta` apply inside the shadow, self-theming intact light+dark. (Superseded the earlier de-pin+inject approach.)

**Remaining / next:**
1. **Vue wrappers** (optional) — same generator pattern as React (`scripts/gen-element-vue.mjs` + `frameworks/vue/`, `./vue` export). Not built yet.
2. Add Storybook stories for the new elements; update `docs/web-components.md` with the full element reference (currently covers the original 3).

## Working norms / gotchas
- **Review before commit/merge** (memory `review-before-commit`) — though the user has been actively authorizing merges + releases this session.
- `gh pr edit`/`gh pr merge` trip on a **Projects-classic GraphQL deprecation** in this repo. Use REST: `gh api --method PUT repos/kitn-ai/chat/pulls/N/merge -f merge_method=merge` and `gh api --method PATCH repos/kitn-ai/chat/pulls/N -F body=@file`.
- Examples load `@kitnai/chat` (latest) from the CDN — verify changes by building locally and pointing a temp copy at `/dist` (or jsDelivr `@<version>`), since unpkg lags.
- There was earlier theme-editor work (Theming/Editor Storybook story, presets, light/dark token editor) shipped before the web-component pivot — see `docs/superpowers/specs/2026-06-11-theme-editor-design.md`.
