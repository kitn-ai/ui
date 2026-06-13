# Hover-Card Safe-Area Design

**Status:** Design proposal — not yet implemented  
**Bug reference:** Hover-card closes in the 8 px gutter between trigger and content

---

## 1. Problem statement

`HoverCardContent` is positioned via `usePosition` with `offset(8)` (the `gutter: 8`
option), producing an 8 px physical gap between the bottom of the trigger element and
the top of the floating content. Both elements share a single timer state-machine in
`HoverCardRoot`:

```
enter()  → clearTimeout; schedule setOpen(true)  after openDelay  (default 0)
leave()  → clearTimeout; schedule setOpen(false) after closeDelay (default 0)
```

When the pointer moves from trigger to content it briefly occupies the 8 px gap where
it is over **neither** element. `pointerleave` fires on the trigger, `leave()` runs,
and with `closeDelay=0` `setOpen(false)` executes synchronously (inside the same
microtask). The content disappears, the pointer then enters the content and `enter()`
fires — but the card is already gone and must re-open from scratch, causing a visible
flicker or a full close-then-reopen.

The consumers all pass `closeDelay={0}`:

| Consumer | openDelay | closeDelay |
|---|---|---|
| `source.tsx` `<Source>` | 150 | 0 |
| `context.tsx` `<Context>` | 0 | 0 |
| `attachments.tsx` `<AttachmentHoverCard>` | 0 | 0 |

**Constraint:** the 8 px visual gap must be preserved.

---

## 2. Two candidate approaches

### Approach A — Separate invisible "bridge" element

Render a zero-opacity `<div>` inside the same `<Portal>` as the content. The bridge
covers exactly the gutter rectangle between the trigger edge and the content top
(or side for left/right placements). It receives the same `onPointerEnter={ctx.enter}`
/ `onPointerLeave={ctx.leave}` handlers, so the pointer is always over a "hot" element
during transit.

```
   ┌─ trigger ──────────────────────┐
   └────────────────────────────────┘
   ████████████████████████████████   ← bridge (invisible, pointer-events: auto)
   ┌─ content ──────────────────────┐
   │                                │
   └────────────────────────────────┘
```

The bridge is sized from the `pos()` data already available in `HoverCardContent`.

### Approach B — Transparent padding on the content side facing the trigger

Keep `computePosition` offset but add CSS padding on the trigger-facing side of the
content `<div>` equal to the gutter. This makes the content's hit-box extend into the
gap while the _visible_ card (inner wrapper) stays at the same distance from the
trigger. No extra DOM element needed.

```
   ┌─ trigger ──────────────────────┐
   └────────────────────────────────┘
   [   8 px transparent padding     ]  ← part of the content element
   ┌─ visible card ─────────────────┐
   │                                │
   └────────────────────────────────┘
```

To implement this correctly the `computePosition` offset must be set to **0** (so
floating-ui places the content box flush with the trigger) and the 8 px gap is
produced purely by CSS `padding-top` (for `bottom` placement) on the outer element.
That way `pointer-events` on the padding area keep the card open.

---

## 3. Comparison

| Concern | Approach A (bridge element) | Approach B (transparent padding) |
|---|---|---|
| Extra DOM nodes | Yes — one extra `<div>` per card instance | No |
| Flip handling | Requires reading `pos().placement` and computing bridge geometry for all 4 sides | Same derivation, but purely in CSS with a conditional padding property |
| Diagonal pointer transit | The bridge covers only the gutter strip. A wide pointer arc can miss the trigger-width strip if the content is much wider/offset. Widening the bridge to `max(triggerW, contentW)` + centering it mitigates this, but adds complexity | Padding extends the _full width_ of the floating div, which already encompasses both trigger and content extents after `shift()` middleware; diagonal paths stay inside the box |
| z-index / stacking | Must ensure bridge stacks above page content but does not intercept clicks on elements _inside_ the gap | Padding region receives `pointer-events: auto` but contains no children, so no click blocking issues |
| `autoUpdate` realignment | `autoUpdate` calls `update()` which sets `pos()`, triggering a reactive re-render — the bridge must re-read its geometry each time | Padding value is constant (= gutter size); no per-tick geometry computation needed |
| Simplicity | Higher: two elements, geometry math, placement switch | Lower: one element, one extra CSS property keyed on placement |
| Arrow support | Bridge must not obscure a future arrow | Padding approach leaves the arrow area clear |

**Recommendation: Approach B (transparent padding).**

It is structurally simpler, handles diagonal transit correctly by design, never needs
explicit geometry math beyond knowing the placement string, and requires no extra portal
element. The only subtlety is setting the `computePosition` offset to **0** and
producing the visual gap through CSS padding rather than floating-ui gutter.

---

## 4. Concrete implementation design

### 4.1 Changes to `usePosition` / `HoverCardContent`

The gutter option in `usePosition` is passed from `HoverCardContent`:

```ts
// current
const position = usePosition(ctx.trigger, ctx.content, { placement: 'bottom', gutter: 8 });
```

Change to:

```ts
// proposed
const position = usePosition(ctx.trigger, ctx.content, { placement: 'bottom', gutter: 0 });
```

`gutter: 0` means floating-ui places the outer box flush with the trigger. The 8 px
visual separation comes from the padding.

### 4.2 Padding helper

Add a pure function that converts a resolved placement to a padding property name:

```ts
/**
 * Returns the CSS padding property that, when set to `gutter`px on the outer
 * floating div, creates a transparent safe area on the trigger-facing side.
 *
 * placement strings from @floating-ui/dom after flip/shift:
 *   'bottom'        → padding-top    (gap is above the visible card)
 *   'bottom-start'  → padding-top
 *   'bottom-end'    → padding-top
 *   'top'           → padding-bottom
 *   'top-start'     → padding-bottom
 *   'top-end'       → padding-bottom
 *   'left'          → padding-right
 *   'left-start'    → padding-right
 *   'left-end'      → padding-right
 *   'right'         → padding-left
 *   'right-start'   → padding-left
 *   'right-end'     → padding-left
 */
function gapPaddingStyle(placement: string, gutter: number): JSX.CSSProperties {
  const side = placement.split('-')[0]; // 'bottom' | 'top' | 'left' | 'right'
  const prop: Record<string, keyof JSX.CSSProperties> = {
    bottom: 'padding-top',
    top:    'padding-bottom',
    left:   'padding-right',
    right:  'padding-left',
  };
  return { [prop[side] ?? 'padding-top']: `${gutter}px` };
}
```

### 4.3 Updated `HoverCardContent` JSX

```tsx
const GUTTER = 8; // px — visual gap preserved; also the safe-area depth

export function HoverCardContent(props: HoverCardContentProps) {
  const ctx = useHoverCard();
  const config = useChatConfig();
  const presence = createPresence(ctx.open);
  // gutter: 0 — the gap is produced by CSS padding instead
  const position = usePosition(ctx.trigger, ctx.content, { placement: 'bottom', gutter: 0 });
  useDismiss({
    enabled: ctx.open,
    onDismiss: (reason) => (reason === 'escape' ? ctx.close() : ctx.leave()),
    refs: () => [ctx.trigger(), ctx.content()],
  });

  return (
    <Show when={presence.present()}>
      <Portal mount={config.portalMount()}>
        {/*
          Outer shell: fixed-positioned at the floating-ui coordinates.
          Transparent padding on the trigger-facing side bridges the gutter.
          pointer-events: auto is the default, so the padded area is hot.
          background: transparent — the padding area must not be visible.
        */}
        <div
          ref={(el) => { ctx.setContent(el); presence.setRef(el); }}
          data-hovercard-content
          data-expanded={presence.state() === 'open' ? '' : undefined}
          data-closed={presence.state() === 'closed' ? '' : undefined}
          onPointerEnter={ctx.enter}
          onPointerLeave={ctx.leave}
          onFocusIn={ctx.enter}
          onFocusOut={ctx.leave}
          style={{
            position: 'fixed',
            left: `${position.pos().x}px`,
            top:  `${position.pos().y}px`,
            // No background — this element is the pointer-event shell only.
            // The visible card is the inner div below.
            background: 'transparent',
            // The padding on the trigger-facing side is the safe bridge.
            ...gapPaddingStyle(position.pos().placement, GUTTER),
          }}
          class="z-50"
        >
          {/* Inner card: all visual and animation classes go here */}
          <div
            class={cn(
              'rounded-lg bg-card shadow-lg',
              'animate-in fade-in-0 zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95',
              props.class,
            )}
          >
            {props.children}
          </div>
        </div>
      </Portal>
    </Show>
  );
}
```

Key points:

1. The outer `<div>` carries `position: fixed` + `left`/`top` from floating-ui and
   the transparent padding. It holds `onPointerEnter`/`onPointerLeave`.
2. The inner `<div>` carries all visual and animation classes. The `data-expanded` /
   `data-closed` attributes on the outer element still drive the inner `animate-in`
   / `animate-out` classes because they are descendants in the same DOM subtree (CSS
   `[data-closed]` selectors match on the inner class when the attribute is on the
   outer parent — verify if selectors use direct vs descendant combinators and move
   attributes to inner div if needed).
3. `z-50` moves to the outer shell so the full hit area (including padding) stacks
   above other content.

> **Data-attribute note:** If Tailwind `data-[closed]:animate-out` uses a `:self`-scoped
> selector (the element that has the attribute must also have the class), move
> `data-expanded` / `data-closed` attributes AND the animation classes to the **inner**
> div. That is the safer placement regardless.

Updated inner div with attributes:

```tsx
<div
  data-expanded={presence.state() === 'open' ? '' : undefined}
  data-closed={presence.state() === 'closed' ? '' : undefined}
  class={cn(
    'rounded-lg bg-card shadow-lg',
    'animate-in fade-in-0 zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95',
    props.class,
  )}
>
  {props.children}
</div>
```

### 4.4 `closeDelay` recommendation

The transparent-padding approach means the pointer can never be "over nothing" during
a straight trigger→content transit. However:

- Diagonal transits that escape the content's width (content is narrow, trigger is
  wide, pointer moves at an angle) can still exit the hit area before reaching the
  content.
- Touch / stylus devices don't fire hover events at all, so `closeDelay` is irrelevant
  there but harmless.
- A small `closeDelay` (50–100 ms) is a useful **belt-and-suspenders** fallback for
  pathological cases without making the card feel sticky.

**Recommended default: `closeDelay = 100` ms** in `HoverCardRootProps` (change the
`props.closeDelay ?? 0` default to `props.closeDelay ?? 100`).

Consumers that need snappier behaviour can still pass `closeDelay={0}`. The source
and context consumers should be updated to omit the explicit `closeDelay={0}` so they
inherit the safer default:

```tsx
// source.tsx — before
<HoverCardRoot openDelay={150} closeDelay={0}>
// after
<HoverCardRoot openDelay={150}>

// context.tsx — before
<HoverCardRoot openDelay={0} closeDelay={0}>
// after
<HoverCardRoot>
```

`AttachmentHoverCard` passes through the caller's prop, so it is already flexible.

---

## 5. Edge case analysis

### 5.1 Diagonal pointer transit

The outer shell div width equals the floating-ui-computed width of the content, which
after `shift({ padding: 8 })` is clamped to the viewport. For typical hover-cards
(width ≥ trigger width) the outer div is at least as wide as the trigger, so straight
and moderate-diagonal paths stay inside. For narrow cards (e.g. a short tooltip) a
strongly diagonal exit is still possible; the `closeDelay=100` fallback covers this
by giving the pointer 100 ms to enter the card before close is committed.

### 5.2 Flipped placement

When floating-ui's `flip()` middleware changes `bottom` to `top` (not enough space
below), `pos().placement` becomes `'top'`. The `gapPaddingStyle` function maps `'top'`
→ `padding-bottom`, so the safe padding appears **below** the visible card (between
the card and the trigger above it). This is correct without any additional logic.

The same applies to `left`/`right` placements.

### 5.3 No arrow currently

There is no arrow element in the current implementation (`options.arrowEl` is never
passed). The padding approach leaves room for a future arrow: if an arrow is added, it
should be placed inside the **inner** div (or positioned relative to it) so the arrow
visually bridges the remaining gap naturally.

### 5.4 `autoUpdate` realignment

`autoUpdate` calls `update()` on scroll/resize, which re-runs `computePosition` and
calls `setPos(...)`. In SolidJS the `style` binding is a reactive accessor — when
`pos()` changes the outer div's `left`, `top`, and padding are updated synchronously
in the same reactive flush. No extra effect or observer is needed.

### 5.5 Focus path

`onFocusIn`/`onFocusOut` are already on the outer element and propagate from inner
focusable children. Focus never travels through the padding region (it is not
focusable), so keyboard navigation is unaffected.

### 5.6 Touch / mobile

Touch events do not fire `pointerenter`/`pointerleave` in the same way. The hover-card
should remain invisible on touch-only devices (no hover intent). The padding approach
adds no regression: `pointer-events: auto` on the transparent area only intercepts
hover-family events; tap events on underlying elements in the gap are not blocked
because the padding region has no visible content and typically the user would not
intentionally tap the gap between a trigger chip and a floating card.

### 5.7 Not blocking clicks in the gap

The transparent padding intercepts `pointerenter`/`pointerleave` and any `click` on
elements underneath it. Because the gap is only 8 px and sits above a floating card,
there are rarely interactive elements directly underneath the padding strip. If this
becomes an issue in a specific layout, `pointer-events: none` can be applied to the
outer shell and `pointer-events: auto` to the inner card, but then the safe-area
bridge would be lost. The correct resolution in that case is Approach A (bridge
element with pointer-events only on the bridge itself). For the current consumers
(source chip, context button, attachment chip) no elements sit in the gap.

---

## 6. Playwright verification recipe

### 6.1 Setup assumptions

```ts
// Playwright config: browser = chromium, slowMo not required
// The card portal mounts into document.body or a known portal container.
// Trigger selector: [data-hovercard-trigger] (or the test adds data-testid)
// Content selector: [data-hovercard-content]
```

### 6.2 Test: pointer travels trigger → gap → content without card closing

```ts
import { test, expect } from '@playwright/test';

test('hover-card stays open when pointer crosses gutter gap', async ({ page }) => {
  await page.goto('/'); // load the showcase or a dedicated test page

  const trigger = page.locator('[data-hovercard-trigger]').first();
  // or: const trigger = page.getByTestId('source-trigger').first();

  // 1. Move to trigger center to open the card.
  await trigger.hover();
  // Wait for the card to be present (openDelay may be up to 150 ms for source).
  const content = page.locator('[data-hovercard-content]');
  await expect(content).toBeVisible({ timeout: 300 });

  // 2. Get the bounding boxes of trigger and content.
  const triggerBox = await trigger.boundingBox();
  const contentBox = await content.boundingBox();
  expect(triggerBox).not.toBeNull();
  expect(contentBox).not.toBeNull();

  // 3. Walk the pointer from trigger center through the gap into the content
  //    in small steps (2 px each). The card must remain visible throughout.
  const startX = triggerBox!.x + triggerBox!.width / 2;
  const startY = triggerBox!.y + triggerBox!.height / 2;
  // For 'bottom' placement the gap is between triggerBox.y+height and contentBox.y
  const endX = contentBox!.x + contentBox!.width / 2;
  const endY = contentBox!.y + contentBox!.height / 2;

  const steps = 20; // number of intermediate pointer positions
  for (let i = 0; i <= steps; i++) {
    const x = startX + ((endX - startX) * i) / steps;
    const y = startY + ((endY - startY) * i) / steps;
    await page.mouse.move(x, y);
    // Assert the card is still in the DOM at every step.
    await expect(content).toBeVisible(
      { timeout: 50 }
    ).catch(() => {
      throw new Error(`Card disappeared at step ${i} (x=${x.toFixed(1)}, y=${y.toFixed(1)})`);
    });
    // Small wait to allow any close timer to fire if the fix is broken.
    await page.waitForTimeout(10);
  }

  // 4. Pointer is now inside the content — card must be open.
  await expect(content).toBeVisible();
});
```

### 6.3 Test: card closes when pointer moves to empty space

```ts
test('hover-card closes when pointer leaves to empty space', async ({ page }) => {
  await page.goto('/');

  const trigger = page.locator('[data-hovercard-trigger]').first();
  await trigger.hover();
  const content = page.locator('[data-hovercard-content]');
  await expect(content).toBeVisible({ timeout: 300 });

  // Move to a safe empty area far from both trigger and content.
  await page.mouse.move(10, 10);

  // Card should close within closeDelay + animation duration (~300 ms total).
  await expect(content).not.toBeVisible({ timeout: 500 });
});
```

### 6.4 Test: flipped placement (top) also works

```ts
test('hover-card safe area works when placement flips to top', async ({ page }) => {
  // Force trigger to be near the bottom of the viewport so flip() activates.
  await page.goto('/test-page-bottom-trigger'); // or scroll to a trigger near viewport bottom

  const trigger = page.locator('[data-hovercard-trigger]').first();
  await trigger.hover();
  const content = page.locator('[data-hovercard-content]');
  await expect(content).toBeVisible({ timeout: 300 });

  // Verify the card opened ABOVE the trigger (flipped placement).
  const triggerBox = await trigger.boundingBox();
  const contentBox = await content.boundingBox();
  // Inner visible card bottom should be above trigger top.
  // Allow for the padding (8 px): contentBox.y + contentBox.height <= triggerBox.y + GUTTER
  expect(contentBox!.y + contentBox!.height).toBeLessThanOrEqual(triggerBox!.y + 10);

  // Walk pointer from trigger center UP to content (opposite direction from bottom case).
  const startX = triggerBox!.x + triggerBox!.width / 2;
  const startY = triggerBox!.y + triggerBox!.height / 2;
  const endX = contentBox!.x + contentBox!.width / 2;
  const endY = contentBox!.y + contentBox!.height / 2;

  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const x = startX + ((endX - startX) * i) / steps;
    const y = startY + ((endY - startY) * i) / steps;
    await page.mouse.move(x, y);
    await expect(content).toBeVisible({ timeout: 50 }).catch(() => {
      throw new Error(`Card disappeared at step ${i} during upward transit`);
    });
    await page.waitForTimeout(10);
  }

  await expect(content).toBeVisible();
});
```

---

## 7. Implementation checklist

- [ ] Change `gutter: 8` → `gutter: 0` in the `usePosition` call inside
      `HoverCardContent`.
- [ ] Add `gapPaddingStyle(placement, gutter)` helper (can live in `hover-card.tsx`
      or `overlay.tsx`).
- [ ] Split the content `<div>` into an **outer shell** (fixed position, transparent,
      padding, event handlers, z-index) and an **inner card** (all visual/animation
      classes).
- [ ] Move `data-expanded`/`data-closed` to the inner card `<div>` to keep Tailwind
      `data-[closed]:` selectors working on the element that also carries the animation
      classes.
- [ ] Change `closeDelay` default in `HoverCardRootProps` from `0` to `100`.
- [ ] Remove explicit `closeDelay={0}` from `source.tsx` and `context.tsx`.
- [ ] Write/run the Playwright tests from §6.
- [ ] Visual regression: confirm the 8 px visual gap is unchanged in screenshots.
