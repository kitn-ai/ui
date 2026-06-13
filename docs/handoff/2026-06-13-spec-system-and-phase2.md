# Handoff — spec system shipped, phase 2 next (2026-06-13)

Resume doc for `@kitnai/chat`. Read this first, then the phase-2 plan:
`docs/superpowers/plans/2026-06-13-phase2-solid-ui-specs.md`.

## Current state (all green, on `main`, nothing pending)
- **Published `@kitnai/chat@0.7.0`** (npm + unpkg + jsDelivr). `main` clean. No open PRs.
- Still intentionally **pre-1.0** (`release-please-config.json` `bump-minor-pre-major: true`). `feat:`→minor, `fix:`→patch, `refactor:`/`docs:`/`chore:`→no release. Cut a release by merging the release-please PR (publishes via OIDC). **Merge PRs with REST**: `gh api --method PUT repos/kitn-ai/chat/pulls/N/merge -f merge_method=merge` (the `gh pr merge` CLI trips a Projects-classic bug here).

## What shipped this session (0.4.0 → 0.7.0)
- **0.5.0** — post-0.4 polish: framework-agnostic repositioning (lead with web components, SolidJS secondary) + Kobalte refs removed; CDN docs (jsDelivr/unpkg); Storybook IA (Web Components above the Solid groups, Examples by importance, `· SolidJS` group labels); 6 new UI stories; 3 Patterns; **controlled blue focus ring** (0 axe violations); and a new shipped element **`<kitn-chat-workspace>`** (list + chat + resize, built by extracting `src/components/chat-thread.tsx` from `kitn-chat`).
- **0.6.0** — cross-platform **scrollbars** (`--color-scrollbar-thumb(-hover)` tokens, shadow-DOM base layer + `.scrollbar-thin`); examples DX (React data → `examples/shared/sample-data.ts`, CSS split) + root README Examples section; new runnable **`examples/angular/`** and **`examples/vue/`** apps.
  - **Example-app gotcha:** import `@kitnai/chat/elements` STATICALLY before the framework mounts (Angular `main.ts` before `bootstrapApplication`; Vue `main.ts` before `createApp().mount()`) — else the framework sets `[messages]`/`[conversations]` before the element upgrades and empty defaults clobber the data → blank UI.
- **0.7.0** — **auto-generated web-component spec system** (PR #30). Deterministic, no AI: `scripts/gen-element-api.mjs` (TS compiler) reads `propDefaults` for defaults, `components/`+`ui/` imports for "Composed from" links, a curated `COMPONENT_TOKENS` map, and typed `Events` maps declared on the facades (`defineKitnElement<Props, Events>` — also makes `dispatch` type-checked). Emits tracked `src/elements/element-meta.json` (with `displayType`/`displayDetail` alias-shortened via `gen-web-components-md.mjs`'s `shorten()`). Surfaced in `docs/web-components.md` (tables between `<!-- spec:tag -->` markers) + Storybook.
- **Then (PR #32, `refactor`, no release):** the Storybook spec moved to a dedicated **API tab** — a manager addon `.storybook/api-tab.tsx` (React, built separately from the Solid stories) that renders `element-meta.json` on its own "API" tab next to Docs/Canvas, scoped to Web Components, top-aligned, neutral types. A one-line pointer in each Docs description (`specDescription` in `src/stories/docs/element-controls.ts`) points to it. The Solid `ElementSpec` doc-component was removed; docs inline-code color neutralized (no blue).

## How to work
- **Gate:** `npm run build` + `npm run typecheck` (3 tsconfigs) + `npm test` (baseline = **3 pre-existing env-flaky Shiki failures** in `tests/primitives/highlighter.test.ts`; any OTHER failure is a regression) + `npm run test:react` (5/5). a11y: `npm run examples` (:8000) then `node scripts/audit-a11y.mjs` → 0 violations light+dark.
- **Verify VISUALLY** with Playwright (ephemeral `.mjs` in repo root → screenshot Storybook/showcase). "It compiles" missed real bugs repeatedly this session. The **API tab** is a manager addon → needs a full Storybook restart (not HMR) after changes.
- SolidJS: never destructure props. Subagent pattern that worked: dispatch focused implementers with explicit specs + mandatory screenshot verification.

## NEXT: Phase 2 — specs for the SolidJS + UI components
**Not started.** Extend the spec system + API tab to the public `src/components/*` and `src/ui/*` components (props/callbacks/slots/tokens), so the web components' "Composed from" links land on components that ALSO have a generated spec. Full design + task-by-task plan: **`docs/superpowers/plans/2026-06-13-phase2-solid-ui-specs.md`** (reuse the phase-1 generator + `shorten()` + the API-tab addon; new `scripts/gen-component-api.mjs` → `src/components/component-meta.json`).

Background: `docs/superpowers/specs/2026-06-13-web-component-spec-system-design.md` (phase 2 section), `docs/web-components.md` (web-component API reference). Memory: see auto-memory MEMORY.md ([[kitn-chat-state]], [[version-bump-each-change]], [[gh-cli-projects-classic-bug]], [[review-before-commit]]).
