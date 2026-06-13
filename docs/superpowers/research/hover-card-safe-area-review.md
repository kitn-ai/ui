# Hover Card Safe Area — Adversarial Review

**Date:** 2026-06-13  
**Stack:** SolidJS + `@floating-ui/dom` (NOT `@floating-ui/react`)  
**Problem file:** `src/ui/hover-card.tsx`

---

## 1. How Production Libraries Solve the Hover Gap

### 1.1 Radix UI HoverCard

Radix relies **exclusively on timers**. Defaults are `openDelay=700ms`, `closeDelay=300ms`. When the pointer leaves the trigger, a 300 ms window gives the user time to reach the content. Both trigger and content share the same cancel/reschedule pattern (entering either element cancels the pending close), exactly like the current kit implementation.

**Is the timer-only approach acceptable?** Radix says yes for its use case — but it ships with a **300 ms close delay by default**, not 0. The existing kit code sets `closeDelay` to `0` at the `Source` component level, which is why the gap is lethal: any pointer transit time > 0 ms closes the card. Radix's 300 ms is a deliberate, tuned cushion, not an architectural solution.

**No bridge, no polygon.** Radix does not implement any geometric safe area.

### 1.2 Floating UI `safePolygon` (from `@floating-ui/react`)

`safePolygon` is the industry reference solution. Its algorithm:

1. On `mousemove`, computes a four-point polygon from the pointer's current position toward the floating element's bounding corners.
2. Uses `getBoundingClientRect()` on both reference and floating elements.
3. Runs an `isPointInPolygon()` point-in-polygon test against subsequent cursor positions.
4. Closes only when the pointer exits this dynamic zone.
5. Optional `requireIntent=true` (default) adds cursor velocity detection — the polygon only activates when the pointer is actually moving toward the floating element, not just drifting.

**Options:** `requireIntent` (bool, default `true`), `buffer` (px padding, default `0.5`; set to `-Infinity` for rectangular bridge only), `blockPointerEvents` (bool, default `false`).

**Source size:** ~370 lines in `@floating-ui/react/src/safePolygon.ts`. The file contains **no React-specific imports** — only internal type imports (`HandleClose`, `Rect`, `Side`). The core geometry is framework-agnostic: vanilla DOM APIs (`getBoundingClientRect`, `mousemove` events, `contains`).

**Framework portability:** The Floating UI maintainers explicitly rejected moving safe polygon logic to `@floating-ui/dom` (Discussion #2867) to keep the vanilla library narrowly scoped to CSS anchor positioning. Non-React users **must re-implement or port** the algorithm themselves. For a SolidJS project using `@floating-ui/dom`, this means writing ~150–200 lines of geometry + event wiring.

### 1.3 Material UI Tooltip

MUI uses **interactive mode by default** (`disableInteractive=false`). In this mode, the tooltip does not close while the pointer is moving toward it, implemented via a `leaveDelay` that is reset on content hover — effectively the same shared-timer pattern as Radix and the current kit. MUI's key insight: interactive mode is required for WCAG 2.2 success criterion 1.4.13 (hoverable content). No bridge or polygon.

### 1.4 Summary: What the Industry Considers "Correct"

The accepted correct solution is **`safePolygon`** (dynamic polygon/triangle from cursor exit point). It is precise, non-blocking, and not a hack. However, the industry also accepts the **shared cancel-timer pattern with a non-zero `closeDelay`** (300–500 ms) as a pragmatic, WCAG-compliant fallback — Radix UI is proof. A `closeDelay=0` is the root cause of the reported bug, not a fundamental architectural flaw.

---

## 2. Adversarial Review of the "Safe Bridge" Approach

The "safe bridge" approach inserts an invisible rectangular element spanning the gutter between trigger and content, wired into the hover state machine so that entering it cancels the pending close.

### Where a Simple Rectangular Bridge Fails

#### 2.1 Diagonal Transit to an Offset or Wider Card

A rectangular bridge spans the direct vertical/horizontal gap but has the same horizontal bounds as the trigger. If the card is wider than the trigger and aligned to one side (e.g., `align='end'` or flipped), the pointer may exit the trigger at an angle, miss the bridge entirely, and close the card before reaching the content. This is a **systematic failure mode**, not an edge case.

Concrete example in this kit: `Source.SourceContent` renders a `w-80` (320 px) card below small `h-5` pill triggers. A pointer exiting the right edge of a narrow pill and moving diagonally toward the right half of the card will leave the trigger, miss a trigger-width bridge, and close.

#### 2.2 Flipped Placement

`usePosition` applies `flip()` middleware — if the viewport has insufficient space below, the card renders above the trigger. The bridge must be repositioned to span the top gap. A statically placed bridge (hard-coded `top: trigger.bottom`) will be in the wrong place entirely. The bridge implementation must read `position.pos().placement` and conditionally render above or below.

#### 2.3 Bridge Intercepting Clicks and Hover on Underlying Content

The bridge must be visible to pointer events (to capture `pointerenter`/`pointerleave`) but invisible to the user. With `pointer-events: auto` and `z-index` covering page content, the bridge will silently swallow clicks on text, links, or other interactive elements that happen to sit in the 8 px gap zone. Setting `pointer-events: none` defeats the purpose — the bridge can no longer capture hover entry.

The correct mitigation (`pointer-events: none` on the bridge + listening via a `mousemove` document listener with hit-testing) essentially re-implements a simplified `safePolygon`.

#### 2.4 Z-Index and Portal Stacking Context

`HoverCardContent` renders into a `<Portal>` with `z-50`. The bridge must also be portaled at the same z-level, or it will be occluded by other stacking contexts on the page. If the bridge lives inside the trigger's DOM subtree, it will be behind the portal layer and invisible to the portal's floating content — a subtle but real failure in dense UIs.

#### 2.5 Touch and Pointer-Type Contamination

Touch devices fire `pointerenter`/`pointerleave` with `pointerType='touch'`, but hover cards should not activate on touch (no persistent hover concept). The bridge adds another surface that can fire spurious touch events, potentially opening the card on tap-then-scroll gestures. The kit's current code does not filter by pointer type, making this worse.

#### 2.6 Is the Bridge Sufficient for This Kit?

For the actual card geometry in this kit:
- Triggers: small horizontal pills (`h-5`, up to `max-w-32`)
- Content: `w-80` cards placed `bottom` (default), with `flip()` active
- Gutter: 8 px

The rectangular bridge works reliably **only** when the card is at least as wide as the trigger AND center-aligned. For `Source.SourceContent` (`w-80` below a `max-w-32` pill), the bridge covers the trigger's width — roughly the left third of the card. Diagonal exits toward the right two-thirds of the card are unprotected. **The bridge is not sufficient for this kit's dominant use case.**

---

## 3. Recommendation

### Ranked Solutions

#### Rank 1 (Recommended): Non-zero `closeDelay` + shared-timer pattern (already in place)

The existing kit implementation already has the correct architecture: one shared timer that both trigger and content cancel on entry. The **only bug is `closeDelay=0`** at the `Source` component callsite (`src/components/source.tsx` line 38).

Setting `closeDelay` to **150–300 ms** at the `HoverCardRoot` default level (and removing the explicit `closeDelay={0}` override in `Source`) makes the transit window wide enough for normal human pointer movement, exactly as Radix UI does. This is:
- Zero additional code complexity
- No new DOM elements
- No geometry
- WCAG 1.4.13 compliant (content remains hoverable within the delay window)
- Proven by Radix UI (300 ms) and MUI

**Concrete change:** In `hover-card.tsx`, change the default:
```ts
props.closeDelay ?? 300  // was: props.closeDelay ?? 0
```
And in `source.tsx`, remove or raise the `closeDelay={0}` prop (or change to `closeDelay={150}`).

**Residual risk:** If a user pauses mid-transit for longer than `closeDelay`, the card closes. This is acceptable UX — Radix ships with this exact behavior and it is not considered a defect.

#### Rank 2 (Better UX, higher effort): Port `safePolygon` to vanilla DOM + Solid

For a definitive, pause-tolerant solution, port the geometric algorithm from `@floating-ui/react/src/safePolygon.ts`. The core is framework-agnostic (pure DOM APIs). Required work:

1. **Extract geometry:** ~100 lines — the four-point polygon calculation using `getBoundingClientRect()` on reference and floating, keyed on placement side (top/bottom/left/right).
2. **Event wiring:** ~60 lines — attach `mousemove` to `document` on trigger leave; run point-in-polygon test; call `leave()` only when the pointer exits the safe zone; remove listener on content enter or close.
3. **Solid integration:** ~30 lines — integrate into `HoverCardRoot` as a `createEffect` that reads `trigger()`, `content()`, and current `open()` state.

Total: ~190 lines. This lives cleanly in a `src/ui/safe-polygon.ts` utility, testable in isolation. No React dependency, no bridge element, no DOM mutation.

The safePolygon approach handles all the failure modes the bridge does not: diagonal transits to wider cards, offset alignment, flip placement (the polygon is computed from `placement` data already available in `usePosition`), and no click-interception issues.

**The bridge approach is NOT recommended** for this kit. It fails for the `Source` component's primary geometry (narrow pill trigger, wide offset card), requires portal-aware z-index management, and degrades to a partial `safePolygon` reimplementation once the diagonal-transit and flip cases are patched.

### Must-Handle Edge Cases (whichever solution is chosen)

1. **Pointer type filtering:** Filter `pointerType !== 'mouse'` in all hover handlers — touch should not engage the hover-card open path at all.
2. **Flip awareness:** Any safe-area logic (bridge or polygon) must read the resolved `placement` from `usePosition` to know which side the card actually landed on.
3. **Content wider than trigger:** The safe area must cover the full content bounding box width, not just the trigger width.
4. **`closeDelay` as a fallback floor:** Even with `safePolygon`, keep `closeDelay >= 100 ms` as a timer backstop for edge cases (very fast flicks, `requireIntent` velocity misses).
5. **Focus path:** Focus-driven open/close (`onFocusIn`/`onFocusOut`) is unaffected by all of this — ensure it still closes immediately on blur without waiting for the pointer timer.

### Sane Defaults Recommendation

| Prop | Current default | Recommended default |
|---|---|---|
| `openDelay` | `0` | `150` ms |
| `closeDelay` | `0` | `300` ms |

These match the Radix UI and MUI ecosystem expectations and are safe as kit-level defaults. Individual callsites can override to `0`/`0` for instant open/close if desired (e.g., programmatically-triggered cards).

---

## Sources

- [Floating UI useHover docs](https://floating-ui.com/docs/usehover)
- [floating-ui/floating-ui — Move safe polygon to @floating-ui/dom (Discussion #2867)](https://github.com/floating-ui/floating-ui/discussions/2867)
- [floating-ui/floating-ui — safePolygon issue #1807](https://github.com/floating-ui/floating-ui/issues/1807)
- [Radix UI HoverCard Primitives](https://www.radix-ui.com/primitives/docs/components/hover-card)
- [Material UI Tooltip](https://mui.com/material-ui/react-tooltip/)
- [Hover Triangles — Mayank](https://mayank.co/blog/hover-triangles/)
- [floating-ui useHover (folz/anchors mirror)](https://folz.github.io/anchors/docs/useHover)
