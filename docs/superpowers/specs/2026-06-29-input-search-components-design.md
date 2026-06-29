# Design — Input & search element family (+ kbd, editable-label, nav trailing-action)

**Date:** 2026-06-29 · **Branch:** `feat/input-search-elements` (off `main`) · **Status:** approved, executing.

## Problem

The kit has no standalone text field. The input rendering already exists but is trapped inside `kai-form` (`src/components/form-widgets.tsx` `TextWidget` + the shared `inputBase` class), reachable only via the JSON-schema-driven generative-form path. So every app shell re-pastes the same `border-input bg-background … focus-visible:ring-ring` styling as raw HTML:

- `perplexity-pro.stories.tsx` — 2× `<input type="search">` (search sessions, search tasks)
- `proof-data-table.stories.tsx` — filter field + a hand-rolled `<table>`
- `split-workspace.stories.tsx` (AMUX) — inline rename `<input>` + hand-rolled `<kbd>` shortcuts
- `proof-auth.stories.tsx` — email/password (genuinely consumer markup; **out of scope**)

A raw light-DOM `<input>` also can't be themed with kit tokens from inside a shadow-DOM consumer app, so cohesion breaks across frameworks (React/Vue/plain HTML).

## Objective test

The bar is not "an input is useful" (every design system has one) — it is **does this help a developer compose AI chat boxes, environments, or harnesses.** A bare text box fails that bar. The differentiated, harness-relevant pieces pass it: an inline **search/filter field** (the front door to session/conversation/task navigation), a **keyboard-shortcut display** (harnesses are keyboard-driven), and **inline rename** (recurs across agent/conversation/artifact titles). A shared token-themed **field base** with leading/trailing slots is the seam they (and `kai-form`) all build on, and is what gives shadow-DOM token cohesion across frameworks.

## Scope

**In** (net +4 public elements; `kai-nav` extended):

- Phase 1: `kai-input` (public lean field), `kai-search` (built on it), refactor `kai-form` widgets onto the new field primitive.
- Phase 2: `kai-kbd`, `kai-editable-label`, `kai-nav` per-item trailing-action.

**Out (YAGNI guardrails):**

- No standalone select / checkbox / radio / file controls — those stay inside `kai-form`.
- `kai-textarea` deferred (prompt-input owns the chat textarea; standalone is demand-driven).
- No data-grid / `kai-table` (scope trap; only flagged, not built).
- `kai-kbd` is display only — not a keymap manager, does not bind keys.
- Auth/login forms are consumer markup; the kit does not own them.

## Architecture

Two-layer, Solid-first, mirroring the rest of the kit:

- **Primitives** (`src/ui/`): `input.tsx`, `kbd.tsx`, `editable-label.tsx` — in-house accessible SolidJS UI, token-themed, no third-party deps. `kai-search` reuses the Input primitive (no separate primitive).
- **Facades** (`src/elements/`): `input.tsx`, `search.tsx`, `kbd.tsx`, `editable-label.tsx` wrap the primitives via `defineWebComponent`, following `src/elements/segmented.tsx` exactly (controlled `value` via `Object.defineProperty`, attr reflection, `dispatch('kai-*')`, `<style>` host display, `::part()` styling, `ctx.expose` for methods).
- **Shared glue serialized through the orchestrator** (never parallel-edited): `register-impl.ts`, `slots.ts` parts registry, the per-story `declare module 'solid-js'` JSX intrinsics, `build:api` generated artifacts (element-meta.json, custom-elements.json, React wrappers, llms, element-types). After `build:api` run `git checkout -- src/components/component-meta.json`.

### `kai-form` refactor (Phase 1, the one existing-code change in P1)

`form-widgets.tsx` `TextWidget` currently owns `<input>` + `inputBase`. Extract the field shell into `src/ui/input.tsx` (the `Input` primitive) and have `TextWidget` render `Input` so there is a **single source of field styling**. `kai-form`'s external API and behavior are unchanged; its existing test suite must stay green. `inputBase` is removed from `form-widgets.tsx` once `Input` owns it.

## Phase 1 — element APIs

### `kai-input` (`src/ui/input.tsx` + `src/elements/input.tsx`)

Lean field. Structure: `[optional label] → [field row: leading slot · <input> · trailing slot] → [optional hint/error]`.

- **Scalar props (attributes):** `type` (`text`·`email`·`url`·`search`·`tel`·`password`·`number` — single-line only), `value` (controlled, reflected to the `value` attribute), `placeholder`, `label`, `hint`, `error`, `size` (`sm`·`md`, default `md`), `disabled`, `readonly`, `required`, `invalid`, `name`.
- **Slots:** `leading`, `trailing` (icon, unit, inline button) — the differentiator over a raw `<input>`. Rendered only when filled (facade occupancy read, per the card pattern).
- **Events (non-bubbling `kai-*` CustomEvents):** `kai-input` `{value}` (per keystroke) · `kai-change` `{value}` (commit/blur).
- **Methods (interaction API via `ctx.expose`):** `focus()`, `select()`, `clear()`; `value` get/set (live state).
- **Parts:** `::part(field)`, `::part(input)`, `::part(label)`, `::part(hint)`.
- Name kept as `kai-input` (discoverable, matches shadcn `Input`); label/hint/error optional so "lean" holds.
- a11y: `label` → associated `<label for>`; `error` → `aria-invalid` + `aria-describedby`; `hint` → `aria-describedby`.

### `kai-search` (`src/elements/search.tsx`, composes the Input primitive, `type=search`)

- Default leading search icon (overridable via `icon` — an icon-name string resolved through `renderIcon`, same path as `kai-button`/`kai-segmented`), a clear (×) trailing button shown when the value is non-empty, `placeholder` default `"Search…"`.
- **Props:** `value` (controlled/reflected), `placeholder`, `icon`, `debounce` (ms, default `200`), `loading` (swaps the leading icon for a `kai-loader` spinner), `shortcut` (optional, e.g. `"⌘K"`, rendered as a trailing kbd hint — uses `kai-kbd` once Phase 2 lands; until then a plain styled hint).
- **Events:** `kai-search` `{value}` (debounced live — the primary) · `kai-submit` `{value}` (Enter) · `kai-change` `{value}`.
- **Methods:** `focus()`, `clear()`. **Parts:** inherits Input parts + `::part(clear)`.
- **Distinct from `kai-command`:** `kai-command` is the ⌘K *palette* (overlay, grouped commands); `kai-search` is the *inline filter field* in a rail/toolbar. No overlap.

### Phase 1 verification + dogfood

- Unit (browser project) per element: controlled value drive/read, `kai-input`/`kai-change`/`kai-search`/`kai-submit` events, clear, disabled, slot occupancy, debounce timing.
- `kai-form` regression suite stays green.
- Dogfood: replace the raw `<input type="search">` in `perplexity-pro` (2 sites) and the filter in `proof-data-table` with `kai-search`; confirm the raw-input count drops. IVP screenshots light + dark.
- Gate: `build:api` (74 → 76 elements), typecheck 4/4, `npm test -- --project=unit`, `npm run build-storybook`.

## Phase 2 — element APIs

### `kai-kbd` (`src/ui/kbd.tsx` + `src/elements/kbd.tsx`)

- Renders a key combo. **Props:** `keys` (`"Mod+Shift+ArrowUp"` normalized to platform glyphs `⌘⇧↑`, or a literal `"⌘K"`) **or** default-slot content; `platform` (`auto`·`mac`·`other`, auto-detects ⌘ vs Ctrl); `size` (`sm`·`md`). **Parts:** `::part(key)`, `::part(separator)`.
- Display only. The shortcuts dialog/list (AMUX) stays consumer composition (`label + kai-kbd` rows).

### `kai-editable-label` (`src/ui/editable-label.tsx` + `src/elements/editable-label.tsx`)

- Renders `value` as text; switches to editing on dblclick and/or an `editing` controlled prop and/or a pencil trigger slot; composes `kai-input` internally; Enter/blur commits → `kai-rename` `{value}`; Esc cancels → `kai-cancel`.
- **Methods:** `edit()`, `commit()`, `cancel()`. **Parts:** `::part(text)`, `::part(input)`.
- Standalone; wiring into nav/conversations/artifact titles is deferred (not coupled now).

### `kai-nav` trailing-action (extend `src/components/nav.tsx` + `src/elements/nav.tsx`)

- `NavItem` gains optional `action` (`{icon, label}`) and/or `closable` (boolean). Nav renders a trailing button per item; activating it fires `kai-nav-item-action` `{value, action?}` (and `kai-nav-item-close` `{value}` when `closable`) **without** firing `kai-nav-select`. **Part:** `::part(item-action)`.
- ★**Critical (Solid document-click delegation):** the trailing button must be discriminated **inside nav's own click handler** (event-target check), not via a separate `stopPropagation`/document listener — otherwise select fires anyway (the recurring bug class from prior sessions). A regression test clicks the trailing button and asserts **no** `kai-nav-select`.
- Existing select API and behavior untouched.

### Phase 2 verification + dogfood

- Unit per element; `kai-nav` regression (select still fires; action event distinct; the doc-delegation case explicitly tested — click trailing → no select).
- Dogfood: AMUX shortcuts dialog → `kai-kbd`; AMUX agent rename → `kai-editable-label`; an AMUX rail / nav list → trailing-action (proves it erases the hand-rolled rail).
- Gate: `build:api` (76 → 78 — kbd, editable-label; nav extended, not new), typecheck, unit, build-storybook, IVP.

## Success criteria

1. The raw `<input type="search">`, hand-rolled `<kbd>`, and inline-rename `<input>` in the apps are replaced by kit elements (the dogfood is the proof the gaps were real).
2. `form-widgets` has a single field source (`inputBase` no longer duplicated).
3. Net +4 public elements (`kai-input`, `kai-search`, `kai-kbd`, `kai-editable-label`); `kai-nav` extended.
4. Full gate green (typecheck 4/4 · unit · build-storybook · drift); both phase IVPs pass.

## Risks / notes

- **Scope creep into a form library** — held by the YAGNI guardrails above (single-line text only in P1).
- **`kai-nav` regression** — the document-click delegation gotcha is the highest-risk change; explicit test + IVP required before claiming done.
- **`build:api` races** — only the orchestrator runs `build:api` and edits the generated/registry files; parallel workers touch disjoint source only.
- **Storybook restart** — new elements / new shadow CSS / new arbitrary Tailwind classes need a Storybook restart (build:css) before they appear in the shadow `compiled.css`; many false "not working" reports are stale `compiled.css`.

## Execution (orchestrate-and-verify)

Supervisor delegates to parallel **disjoint-file** workers, serializes shared glue + `build:api` + git, and verifies each change with `ivp-verifier` (IVP for UI, tests+typecheck for logic). Phase 1 ships and is dogfooded before Phase 2 starts. Per-element commits shown to Rob before committing.
