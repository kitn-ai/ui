# Resizable handle style + React example polish — design

Date: 2026-07-01
Status: approved (design), ready for implementation

## Goal

Two connected pieces of work, driven by reviewing the hand-composed React starter
example (`examples/react`):

- **Part A — kit enhancement.** Give `<kai-resizable>` a choice of divider
  affordance instead of the always-on dotted grip. Add a `handle` prop:
  `handle="line" | "grip" | "none"`. **`line` becomes the new default** (a 1px
  hairline centered in the existing 8px hit-area, transparent at rest, tinting on
  hover/drag). `grip` is today's dotted handle, now opt-in. `none` is an invisible
  hit-area. This is a public `kai-*` contract change and a deliberate visual change
  to every current consumer, including `kai-workspace`.
- **Part B — React example polish.** Consume Part A (drop the hand-rolled resizer),
  and reorganize the example so a first-time reader understands it from its
  structure: a `components/` folder (own icon components + extracted UI
  subcomponents) and a `hooks/` folder (named custom hooks for the imperative
  bits). Scope: idiomatic, well-organized React — not a rewrite.

Naming note (from Rob): avoid "thin"/"chunky" in the API. Values describe the
affordance: `line` / `grip` / `none`.

## Part A — `kai-resizable` handle style

### Behavior

- `line` (default): a 1px hairline strip centered in the 8px handle. `transparent`
  at rest → `var(--color-border)` on hover → `var(--color-muted)` while dragging.
  The full 8px grab zone and all keyboard/ARIA behavior stay intact.
- `grip`: the existing dotted SVG handle (unchanged appearance), now opt-in.
- `none`: no visible divider; the 8px invisible hit-area only.

### API + source of truth

Replace the internal boolean `withHandle` with `handle?: 'line' | 'grip' | 'none'`
(default `line`) across the resizable module. Migrate every internal caller (see
list below). The `withHandle` boolean is removed — this is internal-only API, not a
published symbol, so no back-compat alias is needed.

Files:

- `packages/ui/src/ui/resizable.tsx`
  - `ResizableHandleProps`: `withHandle?: boolean` → `handle?: 'line'|'grip'|'none'`.
  - Render: `grip` → existing dots SVG; `line` → hairline strip element
    (Tailwind classes work in the shadow — the grip SVG already uses
    `text-muted-foreground/40`; use `group`/`group-hover:` on the handle root +
    a `data-dragging` state for the drag tint); `none` → nothing.
  - `ResizableProps` (the convenience) + its splitProps + passthrough: same rename,
    default `line`.
- `packages/ui/src/elements/resizable.tsx`
  - Stop hardcoding `withHandle` at line ~455. Add a `handle` prop to `GroupProps`
    with a JSDoc block (this JSDoc is what the generator turns into the React
    wrapper's prop doc). Default `line` in the `defineWebComponent` defaults. Pass
    it through to `<ResizableHandle handle={…}>`. Reflect it as an attribute so it
    works as `<kai-resizable handle="grip">` from plain HTML.
- `packages/ui/frameworks/react/index.tsx` — **do not hand-edit** (auto-generated).
  Regenerate via `npm run build:api` after the facade change.

### Migrate `withHandle` callers

- `packages/ui/src/elements/resizable.tsx:455` — facade: drop hardcode, use the new `handle` prop (default `line`).
- `packages/ui/src/elements/chat-workspace.tsx:269` — `<ResizableHandle withHandle />`
  → drop the explicit prop so the workspace inherits the new `line` default
  (Rob's Option B intent: the workspace changes look too). **Verify visually**; if
  `line` hurts usability there, fall back to explicit `handle="grip"`.
- `packages/ui/src/ui/resizable.stories.tsx` — map existing `withHandle` →
  `handle="grip"` to preserve each demo's current look, and add a new story/control
  showcasing the `line` default and `none`.
- `packages/ui/src/components/message-narrow.stories.tsx` — `withHandle` → `handle="grip"` (preserve look).

### Tests + docs regen

- `packages/ui/src/ui/resizable.test.tsx` — add coverage: `grip` renders the dots
  SVG; `line` renders the hairline strip (and no dots); `none` renders neither.
- `npm run build:api` regenerates `element-meta.json`, the React wrapper, types,
  and `custom-elements.json`. `verify-react-wrappers.mjs` (runs in build) must pass.
- `git checkout -- packages/ui/src/components/component-meta.json` after build (known churn, not runtime).

### Versioning

Conventional commit `feat(resizable): handle style prop, line divider by default`.
Minor bump. Body notes the default divider appearance changed for existing consumers.

## Part B — React example polish (`examples/react`)

Consumes the freshly built kit (`nx build ui` before running the example so `dist`
has the `handle` prop).

### `src/components/`

- `icons/MoonIcon.tsx`, `icons/SunIcon.tsx` — typed React components wrapping the
  SVGs currently inline in `App.tsx` (moon/sun are not in the kit `<Icon>` set).
  They forward `slot`/`className`/size so they drop into `<Button>`'s icon slot.
- Extracted UI subcomponents so `App.tsx` reads as composition + state wiring:
  `ThemeToggle`, `Sidebar` (wraps `<Conversations>`), `ThreadView` (the message
  list), `Composer` (wraps `<PromptInput>` + hint + voice). Keep each focused, one
  clear purpose, props-in / events-out.

### `src/hooks/`

- `useVoiceInput` — the Web Speech mic→text logic currently in `App.onVoice`
  (Chromium-gated, appends to current text, seeds the uncontrolled input as a
  ComposerDoc). Returns a `start()` (and availability flag) the `Composer` calls.
- `useThreadAutoScroll` — the "keep newest message in view" effect (returns the ref).
- Additional small hooks only where they clarify (e.g. a `useConversations` for the
  select/new/thread-stash logic) — keep it honest, no hook-for-hook's-sake.

### Layout: replace the hand-rolled resizer

Replace the `.resizer` div + `startResize/onResizeMove/endResize` + `draggingRef` +
`sidebarWidth` + `MIN/MAX` consts + the `grid-template-columns` CSS with:

```tsx
<Resizable orientation="horizontal">
  <ResizableItem size="280px" min="220px" max="420px" collapsed={collapsed}>
    <Sidebar … />
  </ResizableItem>
  <ResizableItem>
    <main>…</main>
  </ResizableItem>
</Resizable>
```

The element owns the width + divider (now the `line` default); sidebar collapse maps
to `<ResizableItem collapsed>`. Remove the now-dead `.resizer` CSS from `index.css`.
Keep the already-landed `clear()`/voice fixes (relocated into `Composer`/`useVoiceInput`).

### `App.tsx`

Ends as: theme + chat state, `useConversations`, and the composition tree
(`<Resizable>` → `Sidebar` / `main` → `ThreadView` + `Composer` + `ThemeToggle`).
The big doc-comment that explains "composed by hand from individual elements" stays
(updated to mention `Resizable`).

## Verification

- Part A: `nx typecheck ui` (4 passes) + unit (`resizable.test.tsx` and the suite) +
  `nx build ui`. Confirm the React wrapper regenerated with `handle`.
- Part B: build kit → run the React example → Playwright/browser IVP **at the end**
  (per defer-IVP-to-end): resizer drags with the `line` divider, hover tint, sidebar
  collapse, `/`+`@` triggers still work, theme toggle icons render. Also eyeball
  `kai-workspace` in Storybook to confirm the new default looks right there.

## Out of scope

- Rolling the example pattern to other frameworks (Vue/Svelte/Angular/Solid/vanilla) — later phase.
- Adding moon/sun to the kit `<Icon>` set — the example owns its icons.
- Any change to trigger/caret behavior (already fixed, separate commit).
