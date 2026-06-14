# `<kc-artifact>` expand-to-fill + open-in-tab + configurable toolbar, and `<kc-resizable>` maximize/restore (design)

> Brainstormed 2026-06-13. Builds on `2026-06-13-kc-artifact-design.md`
> (`<kc-artifact>`) and `2026-06-13-kc-resizable-design.md` (`<kc-resizable>` /
> `<kc-resizable-item>`). Three artifact-toolbar enhancements + a generic
> maximize/restore capability on the resizable layout. Prefix scheme: `kc-*`.

## Problem / Goal

Today a `<kc-artifact>` sits in a `<kc-resizable>` panel beside chat. Three gaps:

1. **No expand-to-fill.** A user reading an artifact wants it to temporarily take
   over the whole resizable container (hide the chat/list siblings), then
   collapse back to the prior layout. This is **not** browser fullscreen
   (`requestFullscreen`) — it is a *layout* takeover **inside** the resizable
   container. The artifact cannot resize itself: `<kc-resizable>` owns layout. So
   the artifact must **ask**, and the resizable must **act**.
2. **No open-in-new-tab.** The framed URL is a real hosted page; a user wants to
   pop it out into a normal browser tab.
3. **Toolbar is fixed.** Every consumer gets back/forward/reload/home + path
   field + Preview|Code, with no way to compose a leaner toolbar (e.g. preview-
   only, no path field, no Code tab for a single-file artifact).

**Goal:** (1) a generic, zero-config **bubbling-intent** maximize/restore
protocol where *any* panel content asks its enclosing `<kc-resizable>` to fill
with its containing item and hide siblings, with full stash/restore of sizes;
(2) an open-in-tab toolbar button; (3) a show/hide attribute for **every**
toolbar affordance so consumers compose the toolbar they want.

## Non-goals

- **Browser fullscreen** (`element.requestFullscreen()`). Out of scope — this is
  in-container layout takeover only. (A separate `fullscreen` capability could be
  layered later; noted in Open questions.)
- **Animated** maximize/restore transitions. v1 is an instant layout swap (a CSS
  transition on flex-basis is a later polish; noted as future).
- **Persisting** the maximized state or stashed sizes across reloads
  (`<kc-resizable>` persistence is already a stated non-goal of its spec).
- **Nested-group maximize bubbling past the first `<kc-resizable>`.** The intent
  is caught by the **nearest** ancestor `<kc-resizable>` and `stopPropagation()`d
  there (so a maximize inside a nested group fills that inner group, not the
  outer one). Cross-group "maximize to the very top" is out of scope.
- **Multiple simultaneously-maximized items** in one group. One at a time; a new
  maximize request while already maximized re-targets (see edge cases).
- Changing the artifact's **sourcing model**, nav-history model, or PDF preview.

## Architecture overview

Two cooperating capabilities connected by **one event contract**:

```
 <kc-resizable>                         (gains: maximize/restore capability)
 ├─ <kc-resizable-item>  ← stays visible, fills container when maximized
 │    └─ <kc-artifact>   (gains: expand/collapse + open-in-tab + toolbar config)
 │         └── emits  kc-maximize-intent  (bubbles, composed) ──┐
 ├─ <kc-resizable-item>  ← hidden while maximized               │
 └─ <kc-resizable-item>  ← hidden while maximized               │
        ▲  caught by nearest <kc-resizable>, stopPropagation ───┘
```

- **`<kc-artifact>` is a pure intent emitter.** It does **not** know whether it
  is inside a `<kc-resizable>`, which item wraps it, or how layout works. It only
  toggles its own `maximized` view-state and fires a **bubbling, composed**
  `kc-maximize-intent` event. This keeps the protocol **zero-config** and usable
  by *any* slotted content (a `<kc-code-block>`, a custom card, etc.), not just
  the artifact.
- **`<kc-resizable>` is the actuator.** It listens for `kc-maximize-intent` from
  descendants, finds the **containing `<kc-resizable-item>`**, **stashes** the
  current per-item layout state, **hides the siblings**, **fills** with the
  requesting item, and **restores** on collapse. It re-broadcasts its own state
  back down so the requester can keep its toolbar affordance in sync (and so a
  programmatic/Escape restore updates the artifact's button).

### Why a new event mechanism (not `dispatch`)

`defineWebComponent`'s `dispatch` (src/elements/define.tsx) fires
**`bubbles:false, composed:false`** CustomEvents on purpose (consumers listen
directly on the element). That is wrong for an *intent that must reach an
ancestor across shadow boundaries*. So the maximize intent is **not** dispatched
through `dispatch`; the artifact facade fires it directly:

```ts
ctx.element.dispatchEvent(
  new CustomEvent('kc-maximize-intent', {
    detail: { requested: nextMaximized },   // true=maximize, false=restore
    bubbles: true,
    composed: true,   // cross the artifact's shadow boundary
  }),
);
```

`composed: true` is required because `<kc-artifact>` and `<kc-resizable>` each
have their own shadow root; a non-composed event would die at the artifact's
shadow boundary and never reach the resizable's host listener.

We also keep firing the existing **public** `dispatch`-style event
`maximizechange` (non-bubbling, on the host) so a *consumer* can observe the
artifact's own maximized state without engaging the resizable protocol. So there
are **two** events with distinct jobs:

| event | bubbles | composed | fired by | who listens | purpose |
|---|---|---|---|---|---|
| `kc-maximize-intent` | yes | yes | any panel content (artifact) | nearest `<kc-resizable>` | the **protocol** — request layout takeover |
| `maximizechange` | no | no | `<kc-artifact>` (via `dispatch`) | the consumer | observe the artifact's own button state |

`<kc-resizable>` likewise emits a public **`maximizechange`** (`dispatch`, non-
bubbling) so consumers can observe *layout* maximize state at the group level.

## Event contract (exact shapes, TS)

### `kc-maximize-intent` (the protocol)

```ts
/** Bubbling, composed intent: a descendant asks the nearest enclosing
 *  <kc-resizable> to maximize (fill with the descendant's containing item,
 *  hiding siblings) or restore. Any panel content may emit it. */
export interface KcMaximizeIntentDetail {
  /** true = please maximize the item containing me; false = please restore. */
  requested: boolean;
}
// CustomEvent<KcMaximizeIntentDetail>, type 'kc-maximize-intent',
// { bubbles: true, composed: true }
```

Caught by `<kc-resizable>` via a single delegated listener on its host:

```ts
element.addEventListener('kc-maximize-intent', (e: Event) => {
  const ce = e as CustomEvent<KcMaximizeIntentDetail>;
  e.stopPropagation();                       // nearest group wins (nesting)
  const item = findContainingItem(ce.target as Node); // the <kc-resizable-item>
  if (!item) return;                         // intent from outside any item → ignore
  if (ce.detail.requested) maximizeItem(item);
  else restore();
});
```

### `kc-maximize-state` (downward sync, the response)

After the resizable acts, it informs descendants of the **effective** state, so
a requester (artifact) can reconcile its own `maximized` view-state — important
for **Escape-to-restore handled by the resizable**, programmatic restore, or a
re-target. Bubbling is irrelevant going down; we use a composed, **non-bubbling**
event dispatched **on the maximized item element** (so only the relevant subtree
hears it) and a `null`-item broadcast on restore:

```ts
/** Composed, non-bubbling notification the group dispatches DOWN onto the
 *  affected <kc-resizable-item> (on maximize) or the group host (on restore)
 *  so descendant content can sync its own affordance. */
export interface KcMaximizeStateDetail {
  /** Whether THIS subtree's item is the maximized one. */
  maximized: boolean;
}
// CustomEvent<KcMaximizeStateDetail>, type 'kc-maximize-state',
// { bubbles: false, composed: true }
```

The artifact listens on its **own host** for `kc-maximize-state` and sets its
internal `maximized` signal from `detail.maximized` (idempotent with the
self-toggle that fired the original intent). Dispatching on the item element with
`composed:true` lets it cross into the artifact's shadow subtree; the artifact
adds the listener in `onMount` and removes it in `onCleanup`.

> Design note: the artifact optimistically flips its own button on click and
> fires the intent; `kc-maximize-state` is the **authoritative** reconcile (e.g.
> if the intent was a no-op because there's no enclosing resizable, no
> `kc-maximize-state` arrives and the artifact must NOT stay stuck "maximized" —
> see edge cases for the fallback rule).

## `<kc-resizable>` changes (src/elements/resizable.tsx, src/ui/resizable.tsx)

### New group state

A single maximize record on the group facade:

```ts
interface MaximizeStash {
  /** The maximized item's index in the (capped) item list. */
  index: number;
  /** Per-item stash of pre-maximize layout, keyed by item index. */
  saved: { size: string | null; hidden: boolean; locked: boolean }[];
}
const [maximized, setMaximized] = createSignal<MaximizeStash | null>(null);
```

`size`/`hidden`/`locked` are the **live `<kc-resizable-item>` attribute values**
captured at maximize time (`getAttribute`, presence). We stash and restore on the
*items*, not the internal panels, so the existing `readItems()` +
MutationObserver re-layout path stays the single source of truth.

### `maximizeItem(item)`

1. If already maximized:
   - same item → no-op;
   - different item → `restore()` synchronously first (re-targets), then continue.
2. Resolve `index` of `item` among the capped items.
3. **Stash** `saved[i] = { size, hidden, locked }` for every item (read from
   attributes).
4. For each **other** item: set `hidden` (attribute) → it drops from layout
   (existing `readItems()` honors `hidden`).
5. For the **maximized** item: clear any `size` and `locked` attribute so it
   becomes the lone flexible panel filling the container (`flex:1 1 0%`). (We do
   NOT need to set `size:100%`; with siblings hidden it is the only visible panel
   and `visible()` returns `[it]`, so the single panel fills — verified by the
   existing single-panel fill via the grid cell.)
6. `setMaximized({ index, saved })`.
7. Reflect `data-maximized` on the host + the maximized panel wrapper
   (`data-maximized-panel`) for styling/tests.
8. Dispatch `kc-maximize-state {maximized:true}` **on the item**.
9. `dispatch('maximizechange', { maximized: true, index })` (public, host).
10. The attribute writes are observed by the existing MutationObserver, which
    re-lays out and fires the existing **`change`** event with the new `sizes`.

> Implementation caution — **observer feedback loop / re-entrancy.** Steps 4–5
> mutate item attributes that the MutationObserver watches
> (`attributeFilter:['size','locked','min','max','hidden']`). The observer
> callback calls `readItems()` and `emitChange()` — fine — but `restore()` will
> mutate the same attributes again. Guard with a `applyingMaximize` boolean that
> the observer respects (skip the auto-`emitChange` while we are the ones
> writing), OR batch the attribute writes and let the single observer flush do
> the relayout. The spec mandates a guard flag so a maximize doesn't emit a
> spurious mid-flight `change`; the final `change` after relayout is the real one.

### `restore()`

1. If not maximized → no-op.
2. For each item, **restore** the stashed attributes:
   - `size`: `setAttribute('size', saved.size)` or `removeAttribute` if it was
     null;
   - `hidden`: set/remove to match `saved.hidden`;
   - `locked`: set/remove to match `saved.locked`.
3. `setMaximized(null)`, clear `data-maximized*`.
4. Dispatch `kc-maximize-state {maximized:false}` on the **group host**
   (broadcast; the previously-maximized subtree hears it via composed bubbling-
   down is N/A — instead we ALSO dispatch `{maximized:false}` directly on the
   previously-maximized item element so its artifact reconciles).
5. `dispatch('maximizechange', { maximized: false, index: null })`.
6. Observer relayout fires the existing `change` with the restored `sizes`.

> The stash captures the **attribute** sizes, not the dragged pixel/percent live
> sizes. If the user had dragged before maximizing, the live size lives on the
> panel's inline `flex-basis` (set by the handle's `settleToPercent`), NOT on the
> item attribute. **Decision:** stash should capture the *effective* current
> size. So `maximizeItem` reads the live size via `currentSizes()` (already
> implemented) and writes it back as a `size="NN%"` attribute on each item before
> hiding — making the stash a faithful snapshot of what the user sees. `restore()`
> then re-applies those `%` sizes. This guarantees "collapse restores the stashed
> sizes" exactly, including post-drag layouts. (Captured in testing.)

### `<kc-resizable>` new public API

| name | kind | type | default | purpose |
|---|---|---|---|---|
| `maximizedIndex` | prop (read-only-ish) | `number \| null` | `null` | reflects which item index is maximized; setting it is an alternative programmatic trigger (set → `maximizeItem(items[i])`; `null` → `restore()`). |
| `maximize(index)` | method | `(i:number)=>void` | — | imperative API on the host element. |
| `restore()` | method | `()=>void` | — | imperative API. |
| `maximizechange` | event (public, `dispatch`) | `{ maximized: boolean; index: number \| null }` | — | observe layout maximize state. |

Methods are added by assigning them onto `ctx.element` in `onMount` (the facade
has `element`); typed via a `declare global` `HTMLElementTagNameMap` augmentation
in the generated `.d.ts` or a hand-written ambient type (the spec system already
emits element types — see "Generated spec" below).

### Interaction with existing `size`/`min`/`max`/`locked`/`hidden`

- **`hidden`:** maximize sets siblings `hidden`; restore returns them to their
  pre-maximize `hidden`. An item the consumer had *already* hidden stays hidden
  after restore (its `saved.hidden=true`).
- **`locked`:** the maximized item's `locked` is cleared during maximize (it must
  fill) and restored after. Siblings' `locked` is moot while hidden, restored on
  collapse.
- **`size`:** stash captures the effective % (post-drag), restore re-applies it.
- **`min`/`max`:** untouched by maximize (clamp bounds are about resize, not
  takeover); they apply again normally after restore. The maximized lone panel
  has no neighbor handle, so min/max are inert while maximized.
- **3-item cap:** unchanged; maximize works for 1, 2, or 3 items (with 1 item it
  is effectively a no-op visually but still toggles state + fires events).

## `<kc-artifact>` changes (src/components/artifact.tsx, src/elements/artifact.tsx)

### Feature 1 — expand/collapse affordance + intent

- New `Artifact` (Solid) prop `maximized?: boolean` (controlled view-state hint)
  and `onMaximizeChange?: (maximized: boolean) => void`. The Solid component
  keeps an internal `maximized` signal seeded from the prop, with a controlled
  `createEffect(() => setMaximized(local.maximized ?? false))` (never destructure
  props — read `local.maximized`).
- Toolbar gains a **maximize/restore toggle button** (an icon: `Maximize2` when
  collapsed, `Minimize2` when maximized — lucide-solid). `aria-label` =
  `"Expand"` / `"Collapse"`; `aria-expanded={maximized()}`. Clicking flips the
  signal and calls `onMaximizeChange(next)`.
- The **facade** wires `onMaximizeChange` to fire BOTH:
  1. the **protocol** intent on `ctx.element`
     (`new CustomEvent('kc-maximize-intent',{detail:{requested:next},bubbles:true,composed:true})`),
     and
  2. the **public** `dispatch('maximizechange', { maximized: next })`.
- The facade listens on `ctx.element` for `kc-maximize-state` (added in
  `onMount`, removed in `onCleanup`) and pushes `detail.maximized` into the
  `Artifact` via the `maximized` prop signal — the authoritative reconcile.

### Feature 2 — open in new tab

- Toolbar gains an **open-in-tab button** (`ExternalLink` icon, `aria-label`
  `"Open in new tab"`). On click:
  `window.open(currentUrl(), '_blank', 'noopener,noreferrer')`. Disabled when
  `currentUrl()` is empty or `about:blank`.
- No new event; purely a browser action. (The existing PDF fallback already uses
  this pattern via an `<a target="_blank" rel="noopener noreferrer">`; the
  toolbar button uses `window.open` per the product direction.)

### Feature 3 — configurable toolbar

Each affordance gets a show/hide boolean. **Defaults preserve current behavior:**
existing affordances default **shown**; the two new ones default **shown** too
(sensible: they are the headline features), with a documented way to turn them
off. All are boolean attributes resolved via the facade's `flag()` helper (so
`<el no-path-field>` / `="false"` / the IDL property all behave like HTML).

We use **negative `no-*` flags** for the affordances that are ON by default, so
the bare-attribute ergonomics read naturally (`<kc-artifact no-code-tab>`):

| Affordance | attribute | Solid prop | default | effect when set |
|---|---|---|---|---|
| Back/Forward | `no-nav` | `showNav` | shown | hides back **and** forward |
| Reload | `no-reload` | `showReload` | shown | hides reload |
| Home | `no-home` | `showHome` | shown | hides home |
| Path field | `no-path-field` | `showPathField` | shown | hides editable address input |
| Preview/Code tabs | `no-tabs` | `showTabs` | shown | hides the segmented Preview\|Code toggle (forces single view, see below) |
| Expand/collapse | `no-expand` | `showExpand` | **shown** | hides the maximize/restore button |
| Open in new tab | `no-open-in-tab` | `showOpenInTab` | **shown** | hides the open-in-tab button |

TS on the Solid component (additive to `ArtifactProps`):

```ts
export interface ArtifactProps /* … existing … */ {
  // view-state
  maximized?: boolean;
  onMaximizeChange?: (maximized: boolean) => void;
  // toolbar composition (all default true = shown)
  showNav?: boolean;
  showReload?: boolean;
  showHome?: boolean;
  showPathField?: boolean;
  showTabs?: boolean;
  showExpand?: boolean;
  showOpenInTab?: boolean;
}
```

Facade `Props` (kebab attrs, `no-*` reflected → `show*` via `flag` inversion):

```ts
interface Props extends Record<string, unknown> {
  // …existing src/files/tab/activeFile/sandbox/iframeTitle…
  maximized?: boolean;
  noNav?: boolean;
  noReload?: boolean;
  noHome?: boolean;
  noPathField?: boolean;
  noTabs?: boolean;
  noExpand?: boolean;
  noOpenInTab?: boolean;
}
interface Events extends Record<string, unknown> {
  navigate: { url: string };
  tabchange: { tab: ArtifactTab };
  fileselect: { path: string };
  /** Artifact's own maximize button toggled (consumer-observable; non-bubbling). */
  maximizechange: { maximized: boolean };
}
```

The facade maps each `no*` flag to the inverse `show*` prop, e.g.
`showNav={!ctx.flag('noNav')}`. (Using `flag()` keeps bare-attr ergonomics.)

**`no-tabs` semantics:** with the toggle hidden, the artifact shows whichever
`tab` is active (default `preview`). Consumers wanting a code-only viewer set
`tab="code" no-tabs no-nav no-path-field`. The toolbar collapses to whatever is
left; if **everything** is hidden, the toolbar element still renders as an empty
1px-tall bar — **decision:** if no affordance is shown, omit the toolbar
entirely (a `showAnyToolbar` memo over the seven flags). Captured in tests.

### Toolbar prop plumbing

`ArtifactToolbar` (internal) gains the seven `show*` flags plus
`maximized`/`onToggleMaximize`/`canOpenInTab`/`onOpenInTab`, each rendered behind
a `<Show when={props.showX}>`. The Preview|Code `role="tablist"` block is wrapped
in `<Show when={props.showTabs}>`. Order, left→right: back, forward, reload,
home, [path field], expand, open-in-tab, [Preview|Code]. (Expand + open-in-tab go
on the right edge near the tabs — matching Claude/V0/Canvas placement.)

## Interaction, keyboard, a11y

- **Maximize button:** `role=button` (native `<button>` via kit `Button`),
  `aria-label` `Expand`/`Collapse`, `aria-expanded` reflects state. Focusable;
  Enter/Space activate (native). Focus stays on the button across the layout swap
  (the button persists; only siblings hide), so no focus-loss.
- **Escape to restore:** when maximized, **`<kc-resizable>`** installs a
  `keydown` listener (on its host, capture phase) that calls `restore()` on
  `Escape` **only while `maximized()` is non-null** and focus is within the group.
  Restoring fires `kc-maximize-state {maximized:false}` down to the artifact,
  which flips its button back — so Escape works even when focus is in the iframe-
  adjacent toolbar (focus inside the cross-origin iframe can't be observed; if
  focus is in the iframe, Escape won't reach us — documented limitation; the
  toolbar button remains the reliable collapse path). Remove the listener on
  restore/cleanup.
- **`aria-expanded` source of truth:** driven by the artifact's `maximized()`
  signal, which the `kc-maximize-state` reconcile keeps honest.
- **Hidden siblings:** set via the `hidden` attribute → removed from the
  accessibility tree and layout (existing behavior). No `aria-hidden` juggling
  needed.
- **Open-in-tab:** `noopener,noreferrer` prevents the opened tab from accessing
  `window.opener`. Disabled state communicated via `disabled` + the kit Button's
  disabled styling; `aria-disabled` follows.
- **Resizable handles a11y:** unchanged; while maximized there are no interactive
  handles (lone panel), so nothing focusable there — consistent with existing
  static-divider behavior.
- Target: **0 axe violations** (light + dark), maximized and collapsed.

## Error / edge cases

1. **Maximize when NOT inside a `<kc-resizable>`** (standalone `<kc-artifact>`):
   the `kc-maximize-intent` bubbles up and dies with no listener; **no**
   `kc-maximize-state` returns. **Decision:** the artifact must not get stuck
   showing "Collapse". Rule: the artifact's button click is **optimistic** but it
   sets a short (one microtask / `queueMicrotask` + a `requestAnimationFrame`)
   **reconcile timer**; if no `kc-maximize-state` arrives by then, it **reverts**
   the button to collapsed (the takeover didn't happen). It does NOT attempt a
   full-viewport CSS fallback (that's effectively browser-fullscreen, a non-goal).
   So standalone expand is a **graceful no-op** with the button snapping back.
   (Open question flags whether consumers want an explicit standalone behavior.)
2. **Re-target while maximized** (a *different* item requests maximize): the group
   `restore()`s the current one, then maximizes the new one (atomic; one final
   `change` + one `kc-maximize-state` pair down each affected subtree).
3. **Item hidden/removed while it is the maximized one** (consumer sets `hidden`
   or removes the `<kc-resizable-item>` from the DOM during maximize): the
   MutationObserver fires; `readItems()` finds the maximized index gone/hidden →
   the group auto-`restore()`s (clearing stash) to avoid an empty container.
4. **Container resized (window) while maximized:** lone panel is `flex:1`, fills
   automatically; nothing to do. On restore, stashed `%` sizes re-apply relative
   to the new container size (percentages scale) — correct.
5. **`change` storms:** the maximize/restore attribute writes are guarded
   (`applyingMaximize`) so only the final relayout emits `change`; siblings'
   hide/show during maximize do not each emit.
6. **Open-in-tab with empty/`about:blank` URL:** button disabled; click no-op.
7. **`window.open` blocked by a popup blocker:** `window.open` returns `null`; we
   do nothing further (no error). The browser shows its own blocked-popup UI.
8. **Nested `<kc-resizable>`:** inner group catches + `stopPropagation`s the
   intent; outer group never sees it. Verified in tests.
9. **Two `<kc-artifact>`s in one group, both maximize-capable:** one-at-a-time
   per group (re-target rule). Each artifact reconciles via the `kc-maximize-
   state` that targets *its* subtree (dispatched on the maximized item only), so a
   non-maximized artifact's button stays collapsed.

## Files changed

- **`src/components/artifact.tsx`** — `ArtifactProps` gains `maximized`,
  `onMaximizeChange`, and the seven `show*` flags; internal `maximized` signal +
  controlled effect; `ArtifactToolbar` gains the maximize toggle + open-in-tab
  button + `<Show>` gating on every affordance + the `showAnyToolbar` memo;
  import `Maximize2`/`Minimize2` from `lucide-solid` (`ExternalLink` already
  imported).
- **`src/elements/artifact.tsx`** — facade `Props` gains `maximized` + `no*`
  flags; `Events` gains `maximizechange`; map `no*`→`show*` via `flag()`; wire
  `onMaximizeChange` to fire `kc-maximize-intent` (raw composed/bubbling) **and**
  `dispatch('maximizechange', …)`; add/remove the `kc-maximize-state` host
  listener in `onMount`/`onCleanup`.
- **`src/elements/resizable.tsx`** — `<kc-resizable>` gains the maximize/restore
  capability: `maximized` stash signal; `kc-maximize-intent` host listener
  (`stopPropagation`, `findContainingItem`); `maximizeItem`/`restore`; the
  `applyingMaximize` guard in the MutationObserver path; `maximizedIndex` prop +
  `maximize`/`restore` methods on the host; `data-maximized*` reflections;
  `kc-maximize-state` downward dispatch; public `maximizechange` via `dispatch`;
  Escape `keydown` capture listener while maximized.
- **`src/ui/resizable.tsx`** — **no required change** for the web-component path
  (the maximize capability lives in the facade). *Optional parity:* the Solid
  `Resizable` convenience could gain a `maximizedIndex`/`onMaximizeChange` prop
  pair mirroring the facade so the pure-Solid story works without web components.
  **Decision:** add the Solid parity (`maximizedIndex?: number | null`,
  `onMaximizeChange?`), since the existing primitives already drive the elements
  and a Solid `Artifact`+`Resizable` story is in scope. It hides/shows panels via
  the existing `hidden`/`data-locked` reading + a stash kept in the convenience.
- **`src/elements/register.ts`** — no change (tags already registered).

## Type additions (ambient, host methods)

```ts
declare global {
  interface KcResizableElement extends HTMLElement {
    maximizedIndex: number | null;
    maximize(index: number): void;
    restore(): void;
  }
  interface HTMLElementTagNameMap { 'kc-resizable': KcResizableElement; }
  interface HTMLElementEventMap {
    'kc-maximize-intent': CustomEvent<KcMaximizeIntentDetail>;
    'kc-maximize-state': CustomEvent<KcMaximizeStateDetail>;
  }
}
```

(Co-located in the facade or the generated `.d.ts`; the spec system already emits
element types — verify the generated entries include the new props/events.)

## Generated spec / build artifacts

Adding the new facade props/events regenerates element-meta / types / react-
wrapper / web-components.md for `kc-artifact` and `kc-resizable` (the spec system
reads `defineKitnElement`/`defineWebComponent` defaults). Verify:
- `kc-artifact` shows the `no-*` attributes + `maximizechange` event;
- `kc-resizable` shows `maximizechange` + (if reflected) `maximized-index`;
- `kc-maximize-intent` is documented as a **cross-element protocol** event (it is
  NOT a `dispatch` event, so the generator won't auto-list it — add a hand-
  authored note in web-components.md, or extend the facade meta with a
  `protocolEvents` annotation). **Open question** flags the generator gap.
- regen is **idempotent** (no diff on a second build).

## Testing

### Unit / jsdom (`tests/elements/`)

- **artifact:** registers; each `no-*` flag hides exactly its affordance (query
  the shadow toolbar); `no-tabs` hides the segmented control; all-`no-*` → no
  toolbar (`showAnyToolbar` false); maximize button toggles `aria-expanded` and
  fires `kc-maximize-intent` (`bubbles && composed`, `detail.requested`) **and**
  `maximizechange`; open-in-tab calls a stubbed `window.open` with
  `(url,'_blank','noopener,noreferrer')` and is disabled for empty/`about:blank`;
  `kc-maximize-state` on the host flips the button.
- **resizable maximize:** N items → on `kc-maximize-intent` from inside item *k*,
  siblings get `hidden`, item *k* fills, stash captured; `restore()` re-applies
  stashed `size`/`hidden`/`locked`; `maximizechange` fires with
  `{maximized,index}`; `maximize(i)`/`restore()` methods work; `maximizedIndex`
  setter triggers; re-target restores+re-maximizes; nested group
  `stopPropagation` (outer group's listener never fires); auto-restore when the
  maximized item is removed; Escape restores; `applyingMaximize` guard → exactly
  one `change` per maximize and per restore.

### Playwright (empirically verified, with measurements)

- Real `<kc-resizable>` (`list | chat | preview`) with a `<kc-artifact>` framing a
  served fixture in the preview panel. **Measure** the preview panel's
  `getBoundingClientRect().width` before maximize, after maximize (≈ full
  container width, siblings `width:0`/removed), and after restore (back to the
  pre-maximize width **within ±2px** — proves stash/restore fidelity, including
  after a prior drag).
- Verify siblings are not in the layout while maximized (count visible panels =
  1) and reappear on restore (count = N).
- Drag a divider, then maximize, then restore → restored sizes equal the
  post-drag sizes (±2px) — the "stash captures effective size" guarantee.
- Escape while maximized restores; the artifact's button label returns to
  "Expand".
- Open-in-tab: stub/await a new page (`context.on('page')`) and assert its URL ==
  `currentUrl`.
- a11y (axe) maximized + collapsed, light + dark, 0 violations.
- Screenshots: collapsed, maximized, restored (light + dark).

### Gate

build (meta regen idempotent) + typecheck + test (baseline = 3 pre-existing Shiki
failures) + test:react + a11y.

## Storybook stories (source-visible)

Extend `src/elements/artifact.stories.tsx` and `src/elements/resizable.stories.tsx`:

1. **`Web Components/kc-artifact` → "Configurable toolbar"** — a controls-driven
   story toggling each `no-*` flag (args → attributes) so the source shows the
   exact attribute set; plus a "Minimal (preview-only)" preset
   (`no-nav no-reload no-home no-path-field no-tabs`).
2. **`Web Components/kc-artifact` → "Open in new tab"** — button visible; clicking
   pops the fixture (note in the docs blurb).
3. **`Web Components/kc-resizable` (or kc-artifact) → "Expand to fill"** — the
   headline integration: `list | chat | preview(<kc-artifact>)` inside a
   `<kc-resizable>`; the artifact's expand button maximizes the preview panel,
   collapse restores. Source shows **zero wiring** between them (the bubbling-
   intent protocol is automatic) — that's the point. Include the When/How/
   Placement description; log `change` + `maximizechange` to the Actions panel.
4. **SolidJS (nice-to-have)** — `Artifact` + `Resizable` parity demo using the
   Solid `maximizedIndex`/`onMaximizeChange` props.

Each story keeps `parameters.docs.source` visible (kit norm) and the existing
fixture-served pages (no backend).

## Resolved decisions (reviewed + approved 2026-06-13)

All six open questions were reviewed and decided. The implementation follows these:

1. **Protocol-event docs → hand-author for v1.** Document `kc-maximize-intent` /
   `kc-maximize-state` in a "Cross-element protocols" section of the docs + the
   story (option a). Teaching the generator about `protocolEvents` is a deferred,
   optional enhancement — not blocking.
2. **Both new buttons are OPT-IN (hidden by default).** Expand-to-fill and
   open-in-new-tab default **off**, enabled per-instance (`expandable` /
   `open-in-tab` attrs). This **overrides** any "default shown" wording elsewhere
   in this spec — existing `<kc-artifact>` usages stay visually unchanged; the new
   affordances are explicitly opt-in.
3. **Standalone (no resizable) = graceful no-op for v1.** The intent bubbles, no
   group catches it, the expand button hides/disables. A full-viewport overlay is
   **deferred** (a possible opt-in later) — it edges toward browser-fullscreen
   (a non-goal).
4. **Host API = `maximizedIndex` (source of truth) + `maximize()`/`restore()`.**
   Keep both: a reactive `maximizedIndex` property is the declarative,
   attribute-friendly source of truth; `maximize(i)`/`restore()` are thin
   convenience methods over it. Matches how the kit exposes state elsewhere.
5. **`<kc-resizable>` owns Escape-to-restore.** It owns the maximized state and
   emits the downward `kc-maximize-state` event so the artifact's button stays in
   sync. The artifact does **not** handle Escape locally (one owner, no
   double-handling).
6. **Instant transition for v1** (respecting `prefers-reduced-motion` regardless).
   A short flex-basis/grid transition is a deferred polish follow-up.

## Addendum (2026-06-14): `standalone` chrome + read-only path

Two chrome additions decided with Rob, folded into the same `artifact.tsx`
component + `elements/artifact.tsx` facade work as Feature 3. (His "hide the code
option / any header element" need is already met by Feature 3's `no-*` flags;
`no-tabs` + default `tab="preview"` gives a preview-only viewer — no new flag.)

### A. `standalone` — corners + border keyed to the container

Today the root is always `rounded-xl border border-border` (artifact.tsx:234). But
a `<kc-artifact>` usually lives **inside a panel** (e.g. a `<kc-resizable>` cell),
where rounded corners + a full border are redundant with the container's edges.

- New boolean attribute/prop **`standalone`** (Solid prop `standalone?: boolean`,
  facade flag `standalone`). **Default `false` = in-panel.**
- **In-panel (default):** square corners (`rounded-none`) and **no outer border**
  — the container provides the edge. Internal separators (the toolbar's `border-b`,
  the code/file-tree dividers) are unchanged.
- **`standalone` (true):** the current **`rounded-xl` + full `border`** card look,
  for when the artifact stands on its own.
- **Expand coupling:** when `standalone`, the expand affordance is **inert** —
  there is no enclosing `<kc-resizable>` to maximize into. Rule: `standalone`
  suppresses the expand button (overrides `expandable`); consistent with the
  "standalone = graceful no-op" decision (#3) — but here we hide it outright rather
  than relying on the reconcile-revert, since standalone is an explicit signal.
- This **flips the current default** (always-rounded → square in-panel). Acceptable
  pre-1.0; existing standalone demos add `standalone` to keep their look. Note in
  the changelog as a visual default change.

Implementation: the root `class` (artifact.tsx ~234) becomes
`cn('flex h-full w-full flex-col overflow-hidden bg-card text-card-foreground', local.standalone && 'rounded-xl border border-border', local.class)`
(read `local.standalone`, never destructure). Facade adds `standalone` to `Props`
+ defaults and passes `standalone={ctx.flag('standalone')}`.

### B. `readonly-path` — show the URL, don't let it be edited

Distinct from `no-path-field` (which hides the address entirely). A consumer may
want the location **visible but not editable** (e.g. a locked-down preview).

- New boolean attribute/prop **`readonly-path`** (Solid `readonlyPath?: boolean`,
  facade flag `readonlyPath`). Default `false` (editable, current behavior).
- When set: the path `<input>` gets `readonly` + `aria-readonly="true"`, the
  wrapping `<form>` submit is a no-op (no navigate-on-Enter), and the field gets a
  muted style (e.g. `bg-muted/40 cursor-default`, no focus ring action). It still
  **reflects** navigation (the value tracks `currentUrl()` as the iframe navigates).
- Precedence: if both `no-path-field` and `readonly-path` are set, **hidden wins**
  (the field isn't rendered, so read-only is moot).

Implementation: `ArtifactToolbar` already renders the path `<form>`/`<input>`
(artifact.tsx ~334–351). Gate editing on a `readonlyPath` prop: set `readonly`,
swap the class, and early-return from `onSubmitPath` when read-only. Thread
`readonlyPath` through `ArtifactProps` → `ArtifactToolbar`; facade maps
`readonlyPath={ctx.flag('readonlyPath')}`.

### Additions to the prop/attr tables

| Affordance/flag | attribute | Solid prop | default | effect |
|---|---|---|---|---|
| Standalone chrome | `standalone` | `standalone` | `false` (in-panel) | rounded-xl + border (else square, no border); suppresses expand |
| Read-only path | `readonly-path` | `readonlyPath` | `false` | path visible + nav-tracking but not editable; submit no-op |

### Tests / stories (additive)

- **artifact unit:** `standalone` toggles the root `rounded-xl`/`border` classes
  (assert class presence on the shadow root); `standalone` hides the expand button
  even with `expandable` set; `readonly-path` → input has `readonly` and a submit
  does not emit `navigate`; `readonly-path` still updates the field value on
  `navigate`; `no-path-field` + `readonly-path` → no input rendered.
- **stories:** add `standalone` + `readonly-path` to the "Configurable toolbar"
  controls story; the in-`<kc-resizable>` "Expand to fill" story shows the default
  (square, borderless) chrome sitting flush in its panel.
- a11y unchanged (0 violations); read-only input keeps its `<label>`.
