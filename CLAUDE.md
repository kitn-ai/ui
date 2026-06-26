# CLAUDE.md

Guidance for working **in this repo** with Claude Code. Consumer-facing usage lives in [README.md](README.md); the public docs are at <https://ui.kitn.ai>; the Claude Code tooling index is [`.claude/README.md`](.claude/README.md).

## What this is

`@kitn.ai/ui` — framework-agnostic, Shadow-DOM **web components** for building AI chat UIs (message threads, prompt input, streaming, markdown/code, reasoning + tool panels, attachments, generative-UI cards, artifacts). **Authored in SolidJS**, consumed from React / Vue / Svelte / Angular / plain HTML. Published to npm. The repo also ships the **`kai` MCP** (`src/agent-tooling/`) — a dev-time scaffolder that makes AI coding harnesses fluent at building with the library (`npx @kitn.ai/ui mcp`; tools: `scaffold` · `component_reference` · `theme` · `debug`).

## Architecture — two layers, Solid is the source of truth

- `src/primitives/` headless logic hooks + `ChatConfig` + on-demand highlighter · `src/ui/` in-house accessible UI primitives (no third-party UI deps) · `src/components/` the SolidJS AI feature components.
- `src/elements/` wraps coarse **`kai-*` web-component facades** over those via `defineWebComponent`; the elements bundle registers them (client-only — `register.ts` → `register-impl.ts`). `frameworks/react/` holds generated typed React wrappers (`@kitn.ai/ui/react`, exports `Chat`, `Message`, …).
- `src/agent-tooling/` the `kai` MCP server + the integration/archetype catalogs — independent of the components.

## The `kai-` contract — do NOT get this wrong (it's what consumers hit)

- Elements are prefixed **`kai-`** (`<kai-chat>`). NEVER `kitn-` (a legacy prefix; the register-all bundle is `dist/kai.es.js`).
- **Array/object props** (`messages`, `suggestions`, `models`, …) are set as **JS properties**, never HTML attributes; only scalars (`placeholder`, `loading`, `theme`) work as attributes.
- Events are **non-bubbling `kai-*` CustomEvents** — listen on the element itself. Submit = **`kai-submit`**, read `event.detail.value`.
- Streaming needs a **new array/object reference per chunk** — mutating in place does not re-render.

## Build / test / dev

```bash
npm install
npm run dev          # Storybook playground (port 6006) — the primary dev loop
npm test             # ~1190 Vitest unit + browser tests (the kit's INTERNALS)
npm run typecheck    # 4 tsc passes: Solid src + react wrappers + react tests + the Node MCP
npm run build        # vite lib builds → dist/ (main + provider + react + barrel + mcp bin) + element-meta + react wrappers + schemas
```

- **Gotcha:** after `npm run build` / `build:api`, run `git checkout -- src/components/component-meta.json` — it churns with TS-type-expansion noise and is NOT used at runtime.
- `dist/` is a gitignored build artifact; `prepublishOnly` rebuilds it. The package ships **compiled** entry points (`.`, `./react`, `./elements`) — don't reintroduce raw-source exports.

## Testing the CONSUMER experience (not just internals)

`npm test` is internal. To test what a consumer of the **published package** hits — packaging, exports, SSR, scaffold output, across every framework/integration — use the project skill **`/consumer-regression`** (`smoke` = one parallel pass + report; `regression` = the full build → triage → fix → re-verify loop). Unit tests catch none of those. See [`.claude/README.md`](.claude/README.md).

## Conventions

- **Copy/voice:** sound like a sharp human engineer, not AI-generated — follow `docs-site/STYLE.md`. Web-components-FIRST framing; no emoji.
- **Versioning:** conventional commits drive **release-please** — never hand-edit the `package.json` version. Pre-1.0, so `feat!`/breaking = a minor bump.
- **Behaviors are prop/JSON-driven**, never CSS-manipulated or shadow-pierced.
- Known consumer-packaging issues + their fixes: [`docs/package-consumer-issues.md`](docs/package-consumer-issues.md).

## Map

`src/` (`primitives` · `ui` · `components` · `elements` · `agent-tooling`) · `frameworks/react/` (wrappers) · `docs-site/` (public Astro Starlight docs → ui.kitn.ai) · `theme.css` / `theme.tokens.css` (design tokens) · `examples/` · `bin/` (the MCP bin) · `dist/` (built, gitignored).
