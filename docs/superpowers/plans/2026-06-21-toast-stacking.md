# Sonner-style Collapsed Toast Stacking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in `stack="collapsed"` mode to `kai-toast-region` (and `configureToasts()` for the imperative singleton) that piles toasts as layered cards and expands to the full column on hover/focus — without changing any existing behavior.

**Architecture:** One additive render branch in `ToastRegion` (`src/components/toast.tsx`): when `stack==='collapsed'` (and motion isn't reduced), the visible pills are absolutely positioned from the anchored edge and transformed by depth (small peek when resting; full-column spacing when expanded). The store, queue, `max`, `target`/`position` anchoring, and the `Toast` pill are untouched. The imperative singleton reads a module-level config set by `configureToasts()`.

**Tech Stack:** SolidJS (`createSignal`/`createMemo`/`createEffect`), Tailwind v4 utility classes + inline style for computed transforms, Vitest + `@solidjs/testing-library` (jsdom), the `defineWebComponent` facade.

## Global Constraints

- **Default `stack` is `'expanded'`** — current behavior MUST be byte-for-byte unchanged when `stack` is unset.
- **Collapse is presentational only** — never gate reading/acting on a toast behind it; all `max` pills stay in the DOM and focusable; `focus-within` expands.
- **`prefers-reduced-motion` → plain expanded column** (no transforms/transition).
- **`stack` is a scalar attribute** (`stack="collapsed"`); array/object props stay JS properties. Events stay non-bubbling `kai-*`.
- **No emoji; human-voice copy** (docs-site/STYLE.md).
- **After touching `src/elements/`, regenerate artifacts** (`npm run build` runs `build:api`) and `git checkout -- src/components/component-meta.json` (churns, not runtime).
- **Pixel constants (`OFFSET`, `SCALE_STEP`, opacity) are IVP-tunable** — lock behavior via the contract tests below, tune the look against screenshots.

---

## File Structure

- `src/components/toast.tsx` — **modify**: add `stack` to `ToastRegionProps`; a `prefersReducedMotion()` accessor; a collapsed render branch (depth transforms + expand-on-hover/focus); keep the expanded branch identical to today.
- `src/components/toast.test.tsx` — **modify**: contract tests for collapsed layout, expand toggle, reduced-motion, default-expanded regression.
- `src/primitives/toast-store.ts` — **modify**: `ToastConfig`, `configureToasts()`, and `ensureMounted()` applying config to the singleton region.
- `src/primitives/toast-store.test.ts` — **modify**: `configureToasts` applies to the auto-mounted region (before + after mount).
- `src/elements/toast.tsx` — **modify**: expose `stack` on the `kai-toast-region` facade (+ regenerated `element-meta.json` / React wrapper / docs tables via build:api).
- `docs-site/src/components/ToastDemo.tsx` — **modify**: a `Stack: expanded | collapsed` pill group alongside Position.
- `src/elements/toast.stories.tsx` — **modify**: a `CollapsedStack` story.

---

## Task 1: `stack` prop + collapsed render branch in `ToastRegion`

**Files:**
- Modify: `src/components/toast.tsx`
- Test: `src/components/toast.test.tsx`

**Interfaces:**
- Consumes: existing `ToastRegionProps`, `ToastPosition`, `POSITION_CLASSES`, `ANCHOR_FLEX`, `anchorStyle`, `Toast`, `visible()`, `position()`, `max()`.
- Produces: `ToastRegionProps.stack?: 'expanded' | 'collapsed'`; the rendered region gains `data-stack` (`'expanded'|'collapsed'`); in collapsed mode each pill wrapper gets `data-depth={i}`, an inline `z-index`, and a `transform`; the region toggles `data-expanded` on hover/focus.

- [ ] **Step 1: Write the failing tests** (append to `src/components/toast.test.tsx`).

```tsx
describe('ToastRegion — collapsed stacking', () => {
  const items = (n: number) =>
    Array.from({ length: n }, (_, i) => base({ id: `s${i}`, message: `S${i}`, duration: 0 }));

  it('default (no stack prop) renders the expanded column — unchanged', () => {
    const { getByRole } = render(() => <ToastRegion toasts={items(3)} />);
    const region = getByRole('region');
    expect(region.dataset.stack).toBe('expanded');
    // expanded column = the existing flex layout, no per-pill depth wrappers
    expect(region.querySelector('[data-depth]')).toBeNull();
  });

  it('collapsed: front pill (newest) has the highest z-index and zero depth', () => {
    const { getByRole } = render(() => <ToastRegion toasts={items(3)} stack="collapsed" />);
    const region = getByRole('region');
    expect(region.dataset.stack).toBe('collapsed');
    const depths = [...region.querySelectorAll('[data-depth]')] as HTMLElement[];
    expect(depths.length).toBe(3);
    // newest-first: depth 0 is the front
    expect(depths[0].dataset.depth).toBe('0');
    const z = (el: HTMLElement) => Number(el.style.zIndex);
    expect(z(depths[0])).toBeGreaterThan(z(depths[1]));
    expect(z(depths[1])).toBeGreaterThan(z(depths[2]));
    // resting front pill is not translated/scaled
    expect(depths[0].style.transform).toMatch(/translateY\(0px\)|scale\(1\)/);
  });

  it('collapsed: deeper pills are offset + scaled down while resting', () => {
    const { getByRole } = render(() => <ToastRegion toasts={items(3)} stack="collapsed" />);
    const d2 = getByRole('region').querySelectorAll('[data-depth]')[2] as HTMLElement;
    expect(d2.style.transform).toMatch(/scale\(0\.9\)/); // 1 - 0.05*2
    expect(d2.style.transform).toMatch(/translateY\(/);
  });

  it('expands on pointerenter and collapses on pointerleave', async () => {
    const { getByRole } = render(() => <ToastRegion toasts={items(3)} stack="collapsed" />);
    const region = getByRole('region');
    expect(region.dataset.expanded).toBeUndefined();
    fireEvent.pointerEnter(region);
    await waitFor(() => expect(region.dataset.expanded).toBe(''));
    fireEvent.pointerLeave(region);
    await waitFor(() => expect(region.dataset.expanded).toBeUndefined());
  });

  it('expands on focusin (keyboard) too', async () => {
    const { getByRole } = render(() => <ToastRegion toasts={items(3)} stack="collapsed" />);
    const region = getByRole('region');
    fireEvent.focusIn(region);
    await waitFor(() => expect(region.dataset.expanded).toBe(''));
  });

  it('prefers-reduced-motion → renders the expanded column even when stack=collapsed', () => {
    const spy = vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({
      matches: q.includes('reduced-motion'), media: q, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
    } as unknown as MediaQueryList));
    const { getByRole } = render(() => <ToastRegion toasts={items(3)} stack="collapsed" />);
    expect(getByRole('region').querySelector('[data-depth]')).toBeNull();
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run them red.** `npx vitest run src/components/toast.test.tsx` → FAIL (no `stack` handling, no `data-depth`).

- [ ] **Step 3: Implement.** In `src/components/toast.tsx`:

(a) Add `stack?: 'expanded' | 'collapsed'` to `ToastRegionProps` (doc: `/** Stacking: 'expanded' (default, full column) | 'collapsed' (Sonner-style pile that expands on hover/focus). Attribute: stack. */`).

(b) Add a module-level reduced-motion accessor near the top of the file:

```tsx
import { createSignal, createEffect, onCleanup, For, Show, createMemo } from 'solid-js';
// …existing imports…

/** Reactive `prefers-reduced-motion`. SSR-safe (returns false when no window). */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = createSignal(
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
  );
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    onCleanup(() => mq.removeEventListener?.('change', on));
  }
  return reduced;
}
```

(c) In `ToastRegion`, after `const position = …`, add stacking state + geometry. `dir` is `+1` for top-anchored positions, `-1` for bottom-anchored (the stack grows away from the anchored edge in both states):

```tsx
  const stack = () => props.stack ?? 'expanded';
  const reduced = usePrefersReducedMotion();
  const collapsed = () => stack() === 'collapsed' && !reduced();
  const [open, setOpen] = createSignal(false); // hover/focus-expanded (collapsed mode)

  // Tunable look (IVP). Resting peek + per-depth shrink; uniform expanded row height.
  const OFFSET = 14;       // px each deeper toast peeks past the one in front
  const SCALE_STEP = 0.05; // each deeper toast is 5% smaller
  const ROW_FALLBACK = 48; // px; used until the front pill is measured
  const GAP = 8;           // matches gap-2 in the expanded column

  const isBottom = () => position().startsWith('bottom');
  const dir = () => (isBottom() ? -1 : 1);

  // Measure ONE pill (all are single-line/uniform) to size the expanded spacing.
  const [rowH, setRowH] = createSignal(ROW_FALLBACK);
  const measure = (el: HTMLElement | undefined) => {
    if (!el || typeof window === 'undefined') return;
    const set = () => { const h = el.offsetHeight; if (h) setRowH(h); };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    onCleanup(() => ro.disconnect());
  };

  // The transform for the wrapper at depth i, given the current open/resting state.
  const depthTransform = (i: number): string => {
    if (open()) return `translateY(${dir() * (rowH() + GAP) * i}px) scale(1)`;
    return `translateY(${dir() * OFFSET * i}px) scale(${1 - SCALE_STEP * i})`;
  };
```

(d) Replace the single `return (...)` with a branch. Keep the existing expanded markup verbatim; add the collapsed branch. The region wrapper carries `data-stack` and (collapsed) `data-expanded`, and wires hover/focus:

```tsx
  return (
    <Show
      when={collapsed()}
      fallback={
        <div
          role="region"
          aria-label="Notifications"
          aria-live="polite"
          data-stack="expanded"
          class={cn(
            'pointer-events-none fixed z-[100] flex flex-col gap-2',
            anchor() ? ANCHOR_FLEX[position()] : cn('max-w-[min(28rem,calc(100vw-2rem))]', POSITION_CLASSES[position()]),
          )}
          style={anchor() ? anchorStyle(position(), anchor()!) : undefined}
        >
          <For each={visible()}>
            {(item) => (
              <Toast item={item} onDismiss={(r) => props.onDismiss?.(item.id, r)} onAction={(l) => props.onAction?.(item.id, l)} />
            )}
          </For>
        </div>
      }
    >
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        data-stack="collapsed"
        data-expanded={open() ? '' : undefined}
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => setOpen(false)}
        onFocusIn={() => setOpen(true)}
        onFocusOut={() => setOpen(false)}
        class={cn('pointer-events-none fixed z-[100]', !anchor() && POSITION_CLASSES[position()])}
        style={anchor() ? anchorStyle(position(), anchor()!) : undefined}
      >
        {/* Relative stage; pills are absolutely stacked from the anchored edge. */}
        <div class="relative" style={{ 'min-width': '16rem', 'max-width': 'min(28rem, calc(100vw - 2rem))' }}>
          <For each={visible()}>
            {(item, i) => (
              <div
                data-depth={i()}
                ref={(el) => { if (i() === 0) measure(el); }}
                class={cn(
                  'absolute inset-x-0 flex transition-[transform,opacity] duration-200 ease-out',
                  isBottom() ? 'bottom-0 origin-bottom' : 'top-0 origin-top',
                  position().endsWith('right') ? 'justify-end' : position().endsWith('left') ? 'justify-start' : 'justify-center',
                )}
                style={{ 'z-index': String(max() - i()), transform: depthTransform(i()) }}
              >
                <Toast item={item} onDismiss={(r) => props.onDismiss?.(item.id, r)} onAction={(l) => props.onAction?.(item.id, l)} />
              </div>
            )}
          </For>
        </div>
      </div>
    </Show>
  );
```

Notes for the implementer: the `relative` stage has no intrinsic height (children are absolute), so the only fixed-position element is the region; the pills overlay outward from its anchored edge — correct for both viewport and target anchoring. The front pill (`data-depth=0`) is untransformed when resting. Keep `cn`, `For`, `Show` imported.

- [ ] **Step 4: Run green.** `npx vitest run src/components/toast.test.tsx` → all pass (existing + new). If the reduced-motion test leaks the mock, ensure `mockRestore()` runs.

- [ ] **Step 5: Commit.**

```bash
git add src/components/toast.tsx src/components/toast.test.tsx
git commit -m "feat(toast): collapsed stacking mode (Sonner-style pile, expand on hover/focus)"
```

---

## Task 2: `configureToasts()` for the imperative singleton

**Files:**
- Modify: `src/primitives/toast-store.ts`
- Test: `src/primitives/toast-store.test.ts`

**Interfaces:**
- Consumes: existing `ensureMounted()`, the `regions` map, `ToastPosition` (import the type from `../components/toast`).
- Produces: `interface ToastConfig { stack?: 'expanded' | 'collapsed'; position?: ToastPosition; max?: number }`; `configureToasts(config: ToastConfig): void`. `ensureMounted` applies the current config (as attributes) to every region it creates AND to already-mounted regions when `configureToasts` is called later.

- [ ] **Step 1: Write the failing tests** (append to `src/primitives/toast-store.test.ts`; the suite already drives `toast()`/`ensureMounted` against `document.body` in jsdom — match its existing setup/teardown).

```ts
import { configureToasts } from './toast-store';

describe('configureToasts — singleton region config', () => {
  afterEach(() => {
    document.querySelectorAll('kai-toast-region').forEach((n) => n.remove());
    configureToasts({ stack: 'expanded', position: 'top-center', max: 3 }); // reset
    toast.clear();
  });

  it('applies stack/position/max to the region mounted on the next toast', () => {
    configureToasts({ stack: 'collapsed', position: 'bottom-right', max: 2 });
    toast('hi');
    const region = document.querySelector('kai-toast-region')!;
    expect(region.getAttribute('stack')).toBe('collapsed');
    expect(region.getAttribute('position')).toBe('bottom-right');
    expect(region.getAttribute('max')).toBe('2');
  });

  it('updates an already-mounted region when called after mount', () => {
    toast('first'); // mounts with defaults
    const region = document.querySelector('kai-toast-region')!;
    expect(region.getAttribute('stack')).not.toBe('collapsed');
    configureToasts({ stack: 'collapsed' });
    expect(region.getAttribute('stack')).toBe('collapsed');
  });
});
```

- [ ] **Step 2: Run red.** `npx vitest run src/primitives/toast-store.test.ts` → FAIL (`configureToasts` not exported).

- [ ] **Step 3: Implement** in `src/primitives/toast-store.ts`:

```ts
import type { ToastPosition } from '../components/toast';

export interface ToastConfig {
  stack?: 'expanded' | 'collapsed';
  position?: ToastPosition;
  max?: number;
}

// Module-level config the imperative singleton regions inherit. Defaults match
// the element's own defaults, so an un-configured app behaves exactly as before.
let toastConfig: ToastConfig = {};

/** Apply the current config to a region element (attributes for scalars). */
function applyConfig(el: HTMLElement): void {
  if (toastConfig.stack) el.setAttribute('stack', toastConfig.stack);
  if (toastConfig.position) el.setAttribute('position', toastConfig.position);
  if (toastConfig.max !== undefined) el.setAttribute('max', String(toastConfig.max));
}

/**
 * Configure the imperative `toast()` singleton — call once at app start.
 * `toast.success('…')` has no element to set a prop on, so this is how you opt
 * the auto-mounted region into collapsed stacking / a position / a max. Updates
 * any already-mounted regions too, so call order doesn't matter.
 */
export function configureToasts(config: ToastConfig): void {
  toastConfig = { ...toastConfig, ...config };
  if (typeof document === 'undefined') return;
  document.querySelectorAll('kai-toast-region').forEach((el) => applyConfig(el as HTMLElement));
}
```

Then in `ensureMounted`, after `document.body.appendChild(el);` and binding `toasts`/`target`, apply the config:

```ts
  document.body.appendChild(el);
  (el as unknown as { toasts: ToastItem[] }).toasts = toasts as ToastItem[];
  if (target) (el as unknown as { target: HTMLElement }).target = target;
  applyConfig(el); // inherit stack/position/max from configureToasts()
  regions.set(target, el);
```

- [ ] **Step 4: Run green.** `npx vitest run src/primitives/toast-store.test.ts` → pass.

- [ ] **Step 5: Commit.**

```bash
git add src/primitives/toast-store.ts src/primitives/toast-store.test.ts
git commit -m "feat(toast): configureToasts() to opt the imperative singleton into stack/position/max"
```

---

## Task 3: Expose `stack` on the `kai-toast-region` facade

**Files:**
- Modify: `src/elements/toast.tsx`
- Regenerated (by build): `src/elements/element-meta.json`, `frameworks/react/index.tsx`, `src/elements/element-types.d.ts`, `llms*.txt`

**Interfaces:**
- Consumes: `ToastRegion`'s new `stack` prop (Task 1).
- Produces: `<kai-toast-region stack="collapsed">` works; the prop flows to `ToastRegion`.

- [ ] **Step 1: Add the prop to the facade.** In `src/elements/toast.tsx`, add to the `Props` interface (with the same JSDoc as Task 1), add `stack: 'expanded'` to the defaults object, and pass `stack={props.stack as 'expanded' | 'collapsed' | undefined}` into `<ToastRegion …>`. Match the existing `position`/`max` wiring in that file exactly.

- [ ] **Step 2: Regenerate + verify.**

```bash
npm run build && git checkout -- src/components/component-meta.json
npx vitest run src/elements/toast.declarative.test.tsx
npm run typecheck
```
Expected: build clean; the declarative toast test passes; typecheck (4 passes) clean. Confirm `git status` shows `stack` added in `src/elements/element-meta.json` + `frameworks/react/index.tsx`.

- [ ] **Step 3: Commit.**

```bash
git add src/elements/toast.tsx src/elements/element-meta.json src/elements/element-types.d.ts frameworks/react/index.tsx llms.txt llms-full.txt
git commit -m "feat(toast): expose stack on the kai-toast-region facade (+ regen artifacts)"
```

---

## Task 4: Docs `ToastDemo` stack toggle + Storybook story

**Files:**
- Modify: `docs-site/src/components/ToastDemo.tsx`
- Modify: `src/elements/toast.stories.tsx`

**Interfaces:**
- Consumes: the live `<kai-toast-region stack>` (Tasks 1+3).

- [ ] **Step 1: Add a Stack toggle to `ToastDemo.tsx`.** Mirror the existing Position pill group. Add `const [stack, setStack] = createSignal<'expanded' | 'collapsed'>('collapsed');` (collapsed by default in the demo so the new mode is the first thing shown), render a pill group `Stack: expanded | collapsed` (reuse the `pillCls` helper + a parallel `stackCls`), and in `onMount`/on change set `region.setAttribute('stack', stack())`. Raise a few sticky toasts on mount or keep the trigger buttons — clicking several now shows the pile.

```tsx
  const chooseStack = (s: 'expanded' | 'collapsed') => { setStack(s); region?.setAttribute('stack', s); };
  // in onMount, after setting position: region.setAttribute('stack', stack());
```
Add the pill group to the controls bar (a second row or inline, labeled `Stack`), using the same selected/unselected classes as the Position pills.

- [ ] **Step 2: Add a Storybook story** to `src/elements/toast.stories.tsx`. A `CollapsedStack` story that mounts a `<kai-toast-region stack="collapsed">` (or uses `configureToasts({ stack: 'collapsed' })`) and raises 3–4 toasts so the pile renders; document hover-to-expand in the story description. Match the file's existing story style (the trigger-button pattern).

- [ ] **Step 3: Verify the docs build + story compile.**

```bash
npm --prefix docs-site run build 2>&1 | tail -3   # 104+ pages, clean
npm run typecheck                                  # story file typechecks
```

- [ ] **Step 4: Commit.**

```bash
git add docs-site/src/components/ToastDemo.tsx src/elements/toast.stories.tsx
git commit -m "docs(toast): stack toggle in the demo + collapsed-stack story"
```

---

## Task 5: Full verification (IVP)

**Files:** none (verification + any pixel tuning the IVP surfaces, applied back to `src/components/toast.tsx`).

- [ ] **Step 1: Rebuild + restart docs.** `npm run build && git checkout -- src/components/component-meta.json`; restart the docs dev server (`npm --prefix docs-site run dev`) so it serves the fresh bundle (the stale-`dist` footgun).

- [ ] **Step 2: Playwright-IVP the docs `ToastDemo` in BOTH themes.** Raise 3 toasts; confirm: collapsed shows a layered pile (front = newest, full; others peek + scaled); **hover the pile → it expands to the full column**, leave → collapses; switching Position pills moves the pile to that corner; switching Stack to `expanded` shows today's column. Capture light + dark. Read the PNGs. Tune `OFFSET`/`SCALE_STEP`/opacity in `toast.tsx` if the pile looks off, re-capture.

- [ ] **Step 3: Reduced-motion check.** With Playwright `colorScheme`/reduced-motion emulation (`page.emulateMedia({ reducedMotion: 'reduce' })`), confirm the collapsed region renders the plain column (no pile).

- [ ] **Step 4: Suites.** `npm test` (expect green, +~8 new tests), `npm run typecheck` (4 passes). `git checkout -- src/components/component-meta.json` if it churned.

- [ ] **Step 5: Report** the captures + results; do NOT push (held for Rob's review).

---

## Self-Review

**Spec coverage:** `stack` prop + default expanded (T1) ✓ · collapsed render w/ depth transforms + per-position peek (T1) ✓ · expand on hover/focus-within (T1) ✓ · reduced-motion → plain column (T1) ✓ · single measured pill height (T1 `measure`/`rowH`) ✓ · `configureToasts` + ensureMounted applies + order-independent (T2) ✓ · facade prop + regen (T3) ✓ · a11y pills focusable + focus-within expands (T1 `onFocusIn`/`data-expanded`) ✓ · docs demo toggle + story (T4) ✓ · IVP both themes + reduced-motion (T5) ✓. Non-goals (height-measurement per pill, swipe, +N badge) excluded ✓.

**Placeholder scan:** no TBD/TODO; pixel constants have concrete starting values flagged IVP-tunable (intentional, per spec). All code blocks complete.

**Type consistency:** `stack: 'expanded' | 'collapsed'` identical across T1 (props), T2 (`ToastConfig.stack`), T3 (facade). `ToastConfig`/`configureToasts`/`applyConfig` names consistent T2. `data-depth`/`data-stack`/`data-expanded` contract matches the T1 tests. `ToastPosition` imported from `../components/toast` in T2 (where it's exported).
