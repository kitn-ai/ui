# `<kc-resizable>` — resizable panel layout (design)

> Brainstormed 2026-06-13. Levels up the existing Solid `Resizable` primitives
> in `src/ui/resizable.tsx` and exposes a composable group+item layout as web
> components. Prefix scheme: `kc-*` (see `feat/kc-element-prefix`).

## Goal

A composable, resizable multi-panel layout — a `<kc-resizable>` group containing
up to three `<kc-resizable-item>` children, with **auto-inserted draggable
dividers**, per-item **sizing (px or %)**, **locking**, **min/max**, and
**show/hide**. Content-agnostic: it lays out whatever you slot in (e.g.
`list | chat | preview`). Shipped as web components **and** a SolidJS
convenience, on top of the existing primitives — whose dead `min/max` and
missing keyboard support we fix along the way.

Motivation: a clean way to compose layouts without hand-wiring panels + handles;
a candidate internal foundation for `<kc-workspace>`; the spine of the
"compose-your-own-chat" examples.

## Non-goals (v1 — deferred, noted as future)

- Size **persistence** (localStorage autosave).
- **Collapse-to-rail** (animated collapse to an icon strip).
- First-class **nested groups** (you can nest `<kc-resizable>` by hand; no special API).
- More than **3 items** per group (nest for more).

## Layers & files

1. **Primitives — improve** (`src/ui/resizable.tsx`; `ResizablePanelGroup` /
   `ResizablePanel` / `ResizableHandle`):
   - **Wire `minSize`/`maxSize`** — panel reflects them to `data-min-size` /
     `data-max-size`; the handle already reads those (currently dead because the
     panel never set them).
   - **Accept px or %** for `size`/`min`/`max` — `"280px"` (fixed) or `"25%"` /
     `25` (percent). Normalize internally.
   - Add **`locked`** (boolean) to `ResizablePanel`.
   - Add **keyboard resize** to `ResizableHandle`: ←/→ (horizontal) or ↑/↓
     (vertical) nudge by a step; Home/End → min/max; clamp to min/max. Keep
     `role="separator"`, add `aria-orientation` + `aria-valuemin/max/now`.
   - **Backward compatible** — existing manual-handle usage (`<kc-workspace>`)
     unaffected.
2. **Solid convenience — new `Resizable`** (in `src/ui/resizable.tsx`): a group
   that takes `ResizablePanel` children and **auto-inserts handles** between
   visible items. Props: `orientation`, `onChange`. Skips `hidden` panels (and
   their dividers); a handle is interactive only between two **unlocked**
   neighbors. Raw `ResizablePanelGroup` (manual handles) stays for power users.
3. **Web components — new** (`src/elements/resizable.tsx`):
   - **`<kc-resizable>`** — group. Attr `orientation` (`horizontal` default |
     `vertical`). Emits a public **`change`** CustomEvent.
   - **`<kc-resizable-item>`** — passive config-carrier; renders its slotted
     content. Attrs: `size` (px/%), `locked` (bool), `min` (px/%), `max` (px/%),
     `hidden` (bool).
   - Register both in `src/elements/register.ts`.

## Web-component composition mechanism

`<kc-resizable>` owns layout; `<kc-resizable-item>` carries config + content.

- The group reads its light-DOM `<kc-resizable-item>` children via a single
  **MutationObserver** (`childList` + `attributeFilter:
  ['size','locked','min','max','hidden']`) plus `slotchange` — central
  re-layout, **no per-item events**.
- Shadow DOM: a flex container (row/col by `orientation`); per visible item (in
  order) a panel wrapper holding a uniquely-named `<slot>`, with the item
  assigned to that slot by order. A `ResizableHandle` renders between
  consecutive visible panels — interactive only when both neighbors are
  unlocked, else a static divider.
- **Sizing**: panel wrapper `flex-basis` from the item's `size` (px or %); drag
  / keyboard adjusts the two adjacent panels (reuse the primitive handle logic),
  normalizing to % on release so it scales with the container.
- **`hidden`** item → its panel + adjacent divider drop; the rest reflow.
- Group emits **`change`** on drag-end / visibility change (`detail: { sizes:
  number[] }`).
- **Cap: 3 items** (3 slot positions). Extra items are ignored with a
  `console.warn`. Nest for more.

## Sizing semantics

- `size`: initial main-axis size — `"280px"` (fixed) or `"25%"`/`25` (percent);
  omitted → flexible (`flex: 1`). Mixed allowed (fixed sidebar + % main).
- `min`/`max`: clamp during resize; px or %.
- `locked`: size fixed; adjacent dividers non-draggable.

## Accessibility

Handle: `role="separator"`, `aria-orientation`, `tabindex=0`,
`aria-valuemin/max/now` (percent), keyboard resize. Static/locked dividers are
not focusable. Target: **0 axe violations** (light + dark).

## Stories

- **Web Components — required** (`src/elements/resizable.stories.tsx`,
  `Web Components/kc-resizable`): playground + `list | chat`, `list | chat |
  preview`, a `locked` fixed sidebar, vertical orientation, and a `hidden`-toggle
  demo. Includes the When/How/Placement description.
- **SolidJS — nice-to-have** (extend `src/ui/resizable.stories.tsx`): a
  `Resizable` convenience demo + the improved primitive (keyboard, min/max).

## Generated spec

Adding the facade + `npm run build` auto-generates the
element-meta/types/react-wrapper/web-components.md entries for `kc-resizable`
and `kc-resizable-item` (the spec system reads `defineKitnElement`). Uses global
tokens (no element-specific tokens). Verify the generated entries + idempotency.

## Testing

- **Element tests** (`tests/elements/`): registers; N items → N-1 dividers
  (`hidden` drops one); `size` applied (px + %); `locked` → static divider;
  `hidden` → dropped + reflow; drag clamps to min/max; keyboard resize; `change`
  fires.
- **a11y**: separator keyboard-operable; 0 axe violations (light + dark).
- **Visual**: Playwright — `list|chat|preview` horizontal, vertical, locked
  sidebar, hidden toggle, light + dark.
- **Gate**: build (meta regen idempotent) + typecheck + test (baseline = 3
  pre-existing Shiki failures) + test:react + a11y.

## Implementation risk / fallback

Interleaving handles among dynamically-slotted items is the trickiest part; the
**3-item cap** bounds it. If per-index slot assignment proves fiddly, fall back
to fixed internal named slots (`p0`/`p1`/`p2`) — identical UX, simpler
assignment.

## Out of scope but related (next cycles)

- The **composed-chat examples** (Solid + Web Components) that motivated this —
  separate effort; `<kc-resizable>` is their layout spine.
- **`<kc-preview>`** (HTML/PDF/generated-content viewer) — its own brainstorm
  (iframe sandboxing, formats); would commonly sit in a `<kc-resizable>` slot.
