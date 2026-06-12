# Design — Replace Kobalte with DIY accessible overlay primitives (2026-06-12)

Branch: `spike/composable-web-components`. Status: design approved, not yet implemented.

## Goal

Remove the `@kobalte/core` runtime dependency and reimplement the four primitives the
kit actually uses — **collapsible, tooltip, hover-card, dropdown (menu)** — as our own
SolidJS components, using `@floating-ui/dom` for positioning. We own the code, fix
known Kobalte bugs directly, and shave bundle weight.

Accessibility fundamentals (keyboard, focus, ARIA roles) are built into the widgets as
part of *building them correctly* — not deferred. The broader formal 508/WCAG audit of
the whole kit (contrast, labels, screen-reader nuance) remains a separate, later pass.

## Why this is tractable

All Kobalte usage is already centralized behind four `src/ui/*` wrappers, and the
consumed surface is small:

- **No submenus, radio/checkbox items, groups, or separators** anywhere — the dropdown
  is flat `DropdownItem`s with `onSelect`. The hardest part of menu a11y is out of scope.
- **No `placement`/`gutter` props** are passed — default placements are fine.
- Consumers use: `Collapsible` controlled (`open`/`onOpenChange`); dropdown trigger with
  polymorphic `as={(props) => …}`; tooltip/hover-card triggers with `as="span"`;
  `HoverCardRoot/Trigger/Content` compound API + the convenience `HoverCard`.

Consumers (≈9 components): tool, conversation-list, chain-of-thought (collapsible);
checkpoint, voice-input (tooltip); attachments, context, source (hover-card);
model-switcher, chat-scope-picker (dropdown). Only `context.tsx` imports Kobalte
directly (raw hover-card) — it migrates to our compound API.

## Economics (accurate)

Kobalte runtime ≈ **26 KB gzip** of the ~100 KB main chunk. We re-add `@floating-ui/dom`
(~6.6 KB), so **net saving ≈ 14–20 KB**. The saving only materializes when the *last*
Kobalte import is removed (tree-shaking is all-or-nothing); partial removal banks nothing.

## Architecture

Approach: **shared overlay core + thin per-primitive layers** (chosen over three
independent implementations to avoid triplicating floating-ui/dismiss glue and bundle
weight).

```
src/ui/
  overlay.tsx        NEW — internal shared core (NOT exported from src/index.ts)
                     • portal into config.portalMount()
                     • positioning: computePosition + offset/flip/shift/arrow + autoUpdate
                     • Presence: mount on open; on close → data-closed → animationend → unmount
                     • dismiss helpers: Escape, outside-pointerdown
                     • polymorphic <As> helper: as="span" | as={(props) => JSX}
                     • NEVER locks page scroll
  collapsible.tsx    REWRITE — standalone (no portal/positioning)
  tooltip.tsx        REWRITE — uses overlay core
  hover-card.tsx     REWRITE — uses overlay core
  dropdown.tsx       REWRITE — uses overlay core
src/components/context.tsx   EDIT — drop raw @kobalte import; use our HoverCard compound API
package.json                 EDIT — remove @kobalte/core; add @floating-ui/dom (direct dep)
```

**Hard constraint:** every primitive keeps its *exact current public API* (polymorphic
`as`, the `HoverCardRoot/Trigger/Content` compound shape, `Tooltip content=""`,
`Collapsible` controlled `open`/`onOpenChange`, `DropdownItem onSelect`). The ~9
consumers don't change beyond `context.tsx`.

**Transitions:** full parity with Kobalte via `tw-animate-css` (already a dep). Content
carries `data-expanded` (open) / `data-closed` (closing). Enter:
`animate-in fade-in-0 zoom-in-95`. Exit: `data-[closed]:animate-out
data-[closed]:fade-out-0 data-[closed]:zoom-out-95`. Presence keeps the node mounted
through the exit animation. Collapsible animates height via grid-rows `0fr↔1fr`.

## Per-primitive contracts

### Collapsible (standalone)
- Root: controlled `open` / `onOpenChange` (+ `defaultOpen` for parity). Context exposes
  open accessor + toggle + a content id.
- Trigger: `<button type=button>` (or `as`); `aria-expanded`, `aria-controls={contentId}`,
  `data-expanded` when open; click + Enter/Space → `onOpenChange(!open)`.
- Content: `id`; height animates via grid-rows `0fr↔1fr` transition; `overflow-hidden`;
  on close `transitionend` → set `hidden` + `inert` so it leaves the tab/a11y tree.

### Overlay core (shared by tooltip / hover-card / dropdown)
- Portals into `config.portalMount()` (keeps kit CSS + `.dark` scope).
- `computePosition` with `offset`, `flip`, `shift`, optional `arrow`.
- `autoUpdate(reference, floating, update)` — tracks scroll/resize; cleaned up on unmount.
- Presence: open → mount + enter anim; close → `data-closed` → wait `animationend` → unmount.
- Dismiss: Escape, outside `pointerdown`.
- Does **not** lock page scroll.
- `<As>` helper forwards trigger props onto `as="span"` (string tag) or `as={fn}` (render fn).

### Tooltip
- Show on `pointerenter`/`focusin` after `openDelay`; hide on `pointerleave`/`focusout`/Escape.
- Content: `role="tooltip"`, `id`, `pointer-events:none`; trigger gets `aria-describedby`
  while open. WCAG 1.4.13: dismissable (Esc) + persistent while focused. Single string content.

### HoverCard (HC-1 fix)
- Compound `HoverCardRoot` (`openDelay`/`closeDelay`) + `HoverCardTrigger` +
  `HoverCardContent`, plus convenience `HoverCard` with `trigger` prop. Arrow supported.
- **One shared timer state machine** in Root context: `pointerenter` on trigger OR content
  clears any pending close + starts open(`openDelay`); `pointerleave` on either starts
  close(`closeDelay`). Shared timers across trigger+content mean the pointer transit
  trigger→content keeps it open — no flicker, no stale-timer sporadics. Opens on focus too;
  deterministic cleanup on unmount.
- Content is interactive. WCAG 1.4.13: dismissable + hoverable + persistent.

### Dropdown (menu) (DD-1/DD-2 fix)
- `Dropdown` Root: open-state context. Trigger (`as` render-prop supported):
  `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`; click toggles;
  ArrowDown/Up/Enter/Space open + focus first/last item.
- `DropdownContent`: `role="menu"`, portal, bottom-start, autoUpdate-tracked. **Page stays
  scrollable** (no scroll lock); menu **follows the trigger** on scroll.
- `DropdownItem`: `role="menuitem"`, `tabindex=-1`; roving focus (Arrow/Home/End);
  first-char typeahead; `onSelect` + close on Enter/Space/click; hover moves active item.
- Escape / Tab / outside-click → close + **return focus to trigger**.

## Bugs fixed (owned now)

- **DD-1** — Kobalte locks page scroll while a menu is open. Ours does not.
- **DD-2** — Kobalte's menu stays put on scroll (consequence of the scroll lock). Ours
  tracks the trigger via `autoUpdate` and flips correctly near edges.
- **HC-1** — Kobalte hover card works the first time then becomes sporadic (timer/listener
  race). Ours is one deterministic shared-timer state machine with clean teardown.

## Testing strategy

Bar: **automated tests + showcase.** Unit/integration via the existing vitest +
`@solidjs/testing-library` + jsdom. jsdom has no layout, so positioning is not
unit-tested — tests cover state machines, ARIA, keyboard, dismiss, `onSelect`:

- collapsible: toggle, `aria-expanded`/`aria-controls`, `hidden`+`inert` when closed,
  controlled `open`.
- tooltip: open on focus, `aria-describedby`, Escape dismiss.
- hover-card: **HC-1 regression** — rapid enter→leave→enter stays deterministic; pointer
  transit trigger→content keeps open.
- dropdown: keyboard-open focuses first item; roving focus Arrow/Home/End; typeahead;
  Escape returns focus to trigger; `onSelect`+close; outside-click close;
  `aria-haspopup`/`aria-expanded`; **DD-1** no scroll-lock side effects.

Positioning, autoUpdate-follows-scroll (**DD-2**), and animations are verified in the
showcase + a headless Playwright script (open dropdown, scroll, assert it moved).

Validation gate after each step: `npm run build` + `npm run typecheck` + `npm test`
(baseline = 3 pre-existing env-flaky Shiki/jsdom failures in
`tests/primitives/highlighter.test.ts`; any new failure = regression).

## Sequencing (risk-ordered; each its own commit; green before moving on)

1. `overlay.tsx` core (portal + floating-ui + autoUpdate + Presence + `As`) + add
   `@floating-ui/dom` dep.
2. Collapsible — lowest risk; proves the Presence/state pattern.
3. Tooltip — simplest overlay consumer.
4. HoverCard — HC-1 determinism + migrate `context.tsx`.
5. Dropdown — hardest; DD-1/DD-2 + roving focus/typeahead.
6. Remove `@kobalte/core` from `package.json`, delete dead imports, **measure bundle drop**
   (build, compare gzip main chunk; expect ~14–20 KB net), update the handoff doc.

Kobalte stays installed alongside through steps 1–5; the bundle win lands only at step 6.

## Risks / notes

- Polymorphic `as` fidelity — test both string (`as="span"`) and render-fn (`as={fn}`).
- jsdom can't validate positioning — covered by the Playwright/showcase pass.
- `tw-animate-css` exit classes need the `data-[closed]` variants wired on each content.
- `autoUpdate` must be cleaned up on unmount to avoid listener leaks.
- Overlays must keep portaling into `config.portalMount()` or they lose kit CSS + `.dark`.

## Out of scope

- The broad 508/WCAG audit of the whole kit (icon-button labels, color contrast across
  components, scrollable-region) — separate later pass.
- Vue wrappers, Storybook stories, `docs/web-components.md` full reference — separate work.
- Submenus / radio / checkbox menu items — not used; not built.
