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

## Working norms / gotchas
- **Review before commit/merge** (memory `review-before-commit`) — though the user has been actively authorizing merges + releases this session.
- `gh pr edit`/`gh pr merge` trip on a **Projects-classic GraphQL deprecation** in this repo. Use REST: `gh api --method PUT repos/kitn-ai/chat/pulls/N/merge -f merge_method=merge` and `gh api --method PATCH repos/kitn-ai/chat/pulls/N -F body=@file`.
- Examples load `@kitnai/chat` (latest) from the CDN — verify changes by building locally and pointing a temp copy at `/dist` (or jsDelivr `@<version>`), since unpkg lags.
- There was earlier theme-editor work (Theming/Editor Storybook story, presets, light/dark token editor) shipped before the web-component pivot — see `docs/superpowers/specs/2026-06-11-theme-editor-design.md`.
