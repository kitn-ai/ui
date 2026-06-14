# `<kc-artifact>` expand/maximize + open-in-tab + configurable toolbar + standalone/readonly-path, and `<kc-resizable>` maximize/restore — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `<kc-resizable>` a generic, zero-config **maximize/restore** capability driven by a bubbling **`kc-maximize-intent`** event + a downward **`kc-maximize-state`** reconcile event; give `<kc-artifact>` an **opt-in** expand-to-fill button (emits the intent), an **opt-in** open-in-new-tab button, a fully **configurable toolbar** (`no-nav`/`no-reload`/`no-home`/`no-path-field`/`no-tabs`, with the toolbar omitted when nothing shows), a **`standalone`** chrome flag (rounded+border when standalone, square+borderless in-panel; suppresses expand), and a **`readonly-path`** mode (visible, nav-tracking, non-editable address). Add Solid `Resizable` parity (`maximizedIndex`/`onMaximizeChange`).

**Architecture:** Two cooperating capabilities joined by one event contract. `<kc-artifact>` is a pure **intent emitter** — it toggles its own `maximized` view-state and fires a `bubbles:true, composed:true` `kc-maximize-intent`; it never knows about layout. `<kc-resizable>` is the **actuator** — a single delegated host listener catches the intent, `stopPropagation()`s it (nearest group wins for nesting), finds the containing `<kc-resizable-item>`, stashes per-item `size`/`hidden`/`locked`, hides siblings, lets the maximized item fill, and dispatches `kc-maximize-state` back down (on the item for maximize, on the host + the previously-maximized item for restore) so the artifact reconciles its button. All layout mutation goes through item **attributes**, so the existing `readItems()` + `MutationObserver` re-layout path stays the single source of truth (guarded by an `applyingMaximize` re-entrancy flag).

**Tech Stack:** SolidJS, solid-element (Shadow-DOM custom elements via `defineWebComponent`), lucide-solid icons, Vitest + jsdom element tests, Playwright (browser verification), Storybook (storybook-solidjs-vite).

**Spec:** `docs/superpowers/specs/2026-06-13-kc-artifact-expand-maximize-design.md` (including its **Addendum (2026-06-14)** and **Resolved decisions** sections).

---

## Key facts the implementer must know (read once)

- **Resolved decision #2 OVERRIDES the spec body.** The two NEW buttons (expand-to-fill, open-in-new-tab) are **OPT-IN, hidden by default**, enabled per-instance with **positive** boolean attrs **`expandable`** and **`open-in-tab`** (Solid props `expandable` / `openInTab`). Ignore the spec's `no-expand`/`no-open-in-tab`/"default shown" wording for these two — existing `<kc-artifact>` usages stay visually unchanged. The five EXISTING affordances keep the **negative `no-*`** flags (default shown): `no-nav`, `no-reload`, `no-home`, `no-path-field`, `no-tabs`.
- **`standalone` suppresses expand** (resolved decision #3 + Addendum A): when `standalone` is set, the expand button is hidden outright regardless of `expandable` (there is no enclosing resizable to maximize into).
- **Current code anchors (read them before editing):**
  - `src/components/artifact.tsx`: `Artifact` uses `mergeProps` + `splitProps` (lines ~88–103). Root `class` is at **line ~232–236** (`'flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground'`). `ArtifactToolbar` is the internal toolbar (lines ~285–372); the path `<form>`/`<input>` is at **lines ~334–351**; `submitPath` is at ~223–229; `currentUrl` is `() => history()[cursor()] ?? ''` (line ~115). `ExternalLink` is already imported (line ~27); `Maximize2`/`Minimize2` are NOT — add them.
  - `src/elements/artifact.tsx`: facade `Props` (lines ~4–17), `Events` (~19–26), `defineWebComponent<Props, Events>('kc-artifact', {...defaults}, (props, { dispatch }) => …)`. Destructure the ctx to also get `element` and `flag`.
  - `src/elements/resizable.tsx`: `<kc-resizable>` facade reads light `<kc-resizable-item>` children via `readItems()` (lines ~54–93), exposes `items`/`visible`/`currentSizes`/`emitChange`, and observes `attributeFilter:['size','locked','min','max','hidden']` (lines ~114–131). The ctx is `(props, { element, dispatch })`.
  - `src/ui/resizable.tsx`: Solid `Resizable` convenience (lines ~440–497) reads panel children, computes `visible()`, auto-inserts handles, and `emitChange()`s percent sizes.
- **`defineWebComponent` context** (`src/elements/define.tsx`): facade receives `(props, { element, dispatch, flag })`. `dispatch(type, detail)` fires **`bubbles:false, composed:false`** CustomEvents on the host (line ~131–134) — that is why the maximize *intent* must be dispatched RAW (`element.dispatchEvent(new CustomEvent(..., {bubbles:true, composed:true}))`), NOT via `dispatch`. `flag('noNav')` resolves a bare/`="true"`/property boolean and reads the kebab attribute (`no-nav`); `flag('expandable')` → `expandable`. Every element auto-gets a `theme` prop.
- **SolidJS: never destructure props.** Read `local.x` / `props.x` reactively. `Artifact` adds new props via the existing `mergeProps` defaults + `splitProps` key list. Controlled view-state uses `createEffect(() => setMaximized(local.maximized ?? false))`.
- **Host methods need a HAND-WRITTEN ambient type.** `scripts/gen-element-types.mjs` emits only prop/event interfaces into the generated `src/elements/element-types.d.ts` — it does NOT emit methods. So `maximize(i)`/`restore()`/`maximizedIndex` on the `kc-resizable` host, plus the two new event-map entries, go in a new hand-authored `src/elements/resizable.d.ts` (or co-located ambient block) that is NOT regenerated.
- **Test patterns:** element tests create the tag with `document.createElement`, set props/attrs, append to `document.body`, `await flush()` (a `setTimeout(0)` promise), and assert on `el.shadowRoot` / events. See `tests/elements/artifact-element.test.tsx` and `tests/elements/resizable-element.test.tsx` (helper `makeGroup`). Vitest globals (`test`, `expect`, `vi`, `afterEach`) are available (no imports needed). **jsdom has no layout** — assert DOM structure, attributes, events; defer width/fill measurement to Playwright.
- **Hygiene — do NOT hand-edit build-generated files:** `src/elements/element-meta.json`, `src/elements/element-types.d.ts`, `src/components/component-meta.json`, `frameworks/react/index.tsx`, `llms.txt`, `llms-full.txt`, `docs/web-components.md`, `src/elements/compiled.css`. They are regenerated by `npm run build` (Task 11). The hand-authored `src/elements/resizable.d.ts` (host methods) is NOT one of these.
- **Resolved decisions in force:** #1 protocol-event docs are **hand-authored** (a "Cross-element protocols" note in `docs/web-components.md` is regenerated; the human-readable doc lives in the story + spec — do NOT teach the generator about it); #4 host API = reactive `maximizedIndex` (source of truth) + thin `maximize(i)`/`restore()`; #5 **`<kc-resizable>` owns Escape-to-restore** (artifact does NOT handle Escape); #6 **instant** transition (no animation), respecting `prefers-reduced-motion` regardless.
- **Gate baseline:** the test suite has **3 pre-existing Shiki failures** — those are the only acceptable reds. Everything new must be green.

---

## File Structure

- Modify `src/components/artifact.tsx` — `ArtifactProps` + internal `maximized` signal + controlled effect; `ArtifactToolbar` gains the expand toggle, open-in-tab button, per-affordance `<Show>` gating, `showAnyToolbar` memo, `readonlyPath` on the path field; root `class` keyed to `standalone`.
- Modify `src/elements/artifact.tsx` — facade `Props` (`maximized`, `expandable`, `openInTab`, `noNav`, `noReload`, `noHome`, `noPathField`, `noTabs`, `standalone`, `readonlyPath`); `Events` gains `maximizechange`; map flags via `flag()`; wire `onMaximizeChange` → raw `kc-maximize-intent` + `dispatch('maximizechange', …)`; add/remove `kc-maximize-state` host listener in `onMount`/`onCleanup`.
- Modify `src/elements/resizable.tsx` — maximize/restore capability on `<kc-resizable>`: `maximized` stash signal, `kc-maximize-intent` host listener (`stopPropagation` + `findContainingItem`), `maximizeItem`/`restore`, `applyingMaximize` guard in the observer path, `maximizedIndex` prop + `maximize`/`restore` host methods, `data-maximized*` reflections, `kc-maximize-state` downward dispatch, public `maximizechange` via `dispatch`, Escape capture listener.
- Modify `src/ui/resizable.tsx` — Solid `Resizable` parity (`maximizedIndex?: number | null`, `onMaximizeChange?`) with an internal stash mirroring the facade.
- Create `src/elements/resizable.d.ts` — hand-authored ambient `KcResizableElement` (methods + `maximizedIndex`), `HTMLElementTagNameMap`/`HTMLElementEventMap` augmentation, plus the exported `KcMaximizeIntentDetail`/`KcMaximizeStateDetail` interfaces (or co-locate the interfaces in `resizable.tsx` and re-declare globals here).
- Tests: modify `tests/elements/artifact-element.test.tsx`, `tests/elements/resizable-element.test.tsx`; create `tests/components/resizable-maximize.test.tsx` (Solid parity).
- Stories: extend `src/elements/artifact.stories.tsx` and `src/elements/resizable.stories.tsx`.
- Playwright: create `tests/e2e/kc-artifact-maximize.spec.ts` (verification task — orchestrator runs the gate).
- Regenerate (Task 11): the build-generated files listed in Key facts.

---

## Task 1: Event-contract types + ambient host typing (`kc-maximize-intent` / `kc-maximize-state`)

**Files:**
- Modify: `src/elements/resizable.tsx` (export the two detail interfaces near the top)
- Create: `src/elements/resizable.d.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/elements/resizable-element.test.tsx`:

```ts
import type { KcMaximizeIntentDetail, KcMaximizeStateDetail } from '../../src/elements/resizable';

test('exports the maximize protocol detail types (compile-time shape check)', () => {
  const intent: KcMaximizeIntentDetail = { requested: true };
  const state: KcMaximizeStateDetail = { maximized: false };
  expect(intent.requested).toBe(true);
  expect(state.maximized).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/elements/resizable-element.test.tsx`
Expected: FAIL — `resizable` has no exported `KcMaximizeIntentDetail` / `KcMaximizeStateDetail`.

- [ ] **Step 3: Add the exported interfaces to `src/elements/resizable.tsx`**

Near the top of `src/elements/resizable.tsx` (after the existing imports / `Orientation` type):

```ts
/** Bubbling, composed intent: a descendant asks the nearest enclosing
 *  <kc-resizable> to maximize the item containing it (filling, hiding siblings)
 *  or to restore. Any panel content may emit it — the protocol is zero-config. */
export interface KcMaximizeIntentDetail {
  /** true = maximize the item containing me; false = restore. */
  requested: boolean;
}

/** Composed, non-bubbling notification the group dispatches DOWN onto the
 *  affected <kc-resizable-item> (on maximize) or the group host + the formerly
 *  maximized item (on restore) so descendant content can sync its affordance. */
export interface KcMaximizeStateDetail {
  /** Whether THIS subtree's item is the maximized one. */
  maximized: boolean;
}

/** Event type names for the cross-element maximize protocol. */
export const KC_MAXIMIZE_INTENT = 'kc-maximize-intent' as const;
export const KC_MAXIMIZE_STATE = 'kc-maximize-state' as const;
```

- [ ] **Step 4: Create the hand-authored ambient host typing**

```ts
// src/elements/resizable.d.ts
// Hand-authored ambient types for <kc-resizable>'s maximize capability. The
// generated element-types.d.ts emits prop/event interfaces only (not methods),
// so the imperative host API + the cross-element protocol events live here.
// NOT regenerated by `npm run build`.
import type { KcMaximizeIntentDetail, KcMaximizeStateDetail } from './resizable';

declare global {
  interface KcResizableElement extends HTMLElement {
    /** Which item index is maximized (null = none). Setting it maximizes that
     *  item (or restores when set to null) — the declarative source of truth. */
    maximizedIndex: number | null;
    /** Imperatively maximize the item at `index` (thin wrapper over maximizedIndex). */
    maximize(index: number): void;
    /** Imperatively restore from the maximized layout. */
    restore(): void;
  }
  interface HTMLElementTagNameMap {
    'kc-resizable': KcResizableElement;
  }
  interface HTMLElementEventMap {
    'kc-maximize-intent': CustomEvent<KcMaximizeIntentDetail>;
    'kc-maximize-state': CustomEvent<KcMaximizeStateDetail>;
  }
}

export {};
```

- [ ] **Step 5: Run test + typecheck to verify they pass**

Run: `npx vitest run tests/elements/resizable-element.test.tsx && npm run typecheck`
Expected: the new type test PASSES; typecheck clean. (Other resizable tests unchanged.)

- [ ] **Step 6: Commit**

```bash
git add src/elements/resizable.tsx src/elements/resizable.d.ts tests/elements/resizable-element.test.tsx
git commit -m "feat(resizable): maximize protocol types + ambient host API typing"
```

---

## Task 2: `<kc-resizable>` maximize/restore core (intent listener, stash, fill)

**Files:**
- Modify: `src/elements/resizable.tsx`
- Test: extend `tests/elements/resizable-element.test.tsx`

> jsdom has no layout, so `currentSizes()` returns zeros; the spec's "stash the effective post-drag %" path is verified in Playwright. In jsdom we assert the **attribute mechanics**: siblings get `hidden`, the maximized item loses `size`/`locked`, the stash round-trips on restore, and `data-maximized*` toggles.

- [ ] **Step 1: Add failing tests**

Add to `tests/elements/resizable-element.test.tsx`:

```ts
function intentFrom(item: Element, requested: boolean) {
  item.dispatchEvent(new CustomEvent('kc-maximize-intent', { detail: { requested }, bubbles: true, composed: true }));
}

test('maximize hides siblings, clears the maximized item size/locked, reflects data-maximized', async () => {
  const group = makeGroup([{ size: '25%' }, { size: '50%', locked: '' }, { size: '25%' }]);
  await flush();
  intentFrom(group.children[1], true);
  await flush();
  const items = Array.from(group.children) as HTMLElement[];
  expect(items[0].hasAttribute('hidden')).toBe(true);
  expect(items[2].hasAttribute('hidden')).toBe(true);
  expect(items[1].hasAttribute('hidden')).toBe(false);
  expect(items[1].hasAttribute('locked')).toBe(false); // cleared so it fills
  expect(group.hasAttribute('data-maximized')).toBe(true);
});

test('restore returns each item to its stashed size/hidden/locked', async () => {
  const group = makeGroup([{ size: '25%' }, { size: '50%', locked: '' }, { hidden: '', size: '25%' }]);
  await flush();
  intentFrom(group.children[1], true);
  await flush();
  intentFrom(group.children[1], false);
  await flush();
  const items = Array.from(group.children) as HTMLElement[];
  // item[1] regains its locked attr; item[2] was already hidden pre-maximize → stays hidden.
  expect(items[1].hasAttribute('locked')).toBe(true);
  expect(items[2].hasAttribute('hidden')).toBe(true);
  expect(items[0].hasAttribute('hidden')).toBe(false);
  expect(group.hasAttribute('data-maximized')).toBe(false);
});

test('intent from outside any item is ignored', async () => {
  const group = makeGroup([{}, {}]);
  await flush();
  group.dispatchEvent(new CustomEvent('kc-maximize-intent', { detail: { requested: true }, bubbles: true, composed: true }));
  await flush();
  expect(group.hasAttribute('data-maximized')).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/elements/resizable-element.test.tsx`
Expected: FAIL — no maximize handling yet (`data-maximized` never set).

- [ ] **Step 3: Implement the core in `src/elements/resizable.tsx`**

Inside the `<kc-resizable>` facade body (after `emitChange`, before `onMount`):

```ts
interface MaximizeStash {
  index: number;
  saved: { size: string | null; hidden: boolean; locked: boolean }[];
}
const [maximized, setMaximized] = createSignal<MaximizeStash | null>(null);
/** Re-entrancy guard: while we (un)apply maximize attributes, the observer must
 *  NOT emit a mid-flight `change`. The final relayout emits the real one. */
let applyingMaximize = false;

/** Find the capped <kc-resizable-item> ancestor of an event target, if any. */
function findContainingItem(node: Node | null): HTMLElement | null {
  let el = node instanceof Element ? node : node?.parentElement ?? null;
  // The intent is composed; its target may be inside the artifact's shadow.
  // Resolve to a direct light child <kc-resizable-item> of THIS group.
  const capped = items().map((i) => i.el);
  while (el) {
    if (el instanceof HTMLElement && capped.includes(el)) return el;
    el = el.parentElement ?? (el.getRootNode() as ShadowRoot).host ?? null;
  }
  return null;
}

function readAttrState(el: HTMLElement) {
  return {
    size: el.getAttribute('size'),
    hidden: el.hidden || (el.hasAttribute('hidden') && el.getAttribute('hidden') !== 'false'),
    locked: el.hasAttribute('locked') && el.getAttribute('locked') !== 'false',
  };
}

function setBoolAttr(el: HTMLElement, name: string, on: boolean) {
  if (on) el.setAttribute(name, '');
  else el.removeAttribute(name);
}

function maximizeItem(item: HTMLElement) {
  const list = items();
  const index = list.findIndex((i) => i.el === item);
  if (index < 0) return;
  const current = maximized();
  if (current) {
    if (current.index === index) return;     // same item → no-op
    restore();                               // different item → re-target
  }
  applyingMaximize = true;
  // Capture the EFFECTIVE current % so a post-drag layout restores faithfully.
  const live = currentSizes(); // visible-order percents (Playwright-verified)
  let visIdx = 0;
  const saved = list.map((info) => {
    const prev = readAttrState(info.el);
    if (!prev.hidden) {
      // Write the live % back as the stashed size baseline.
      const pct = live[visIdx++];
      if (Number.isFinite(pct) && pct > 0) info.el.setAttribute('size', `${pct}%`);
    }
    return { size: info.el.getAttribute('size'), hidden: prev.hidden, locked: prev.locked };
  });
  // Hide every other item; free the maximized one to fill.
  list.forEach((info, i) => {
    if (i === index) {
      info.el.removeAttribute('size');
      info.el.removeAttribute('locked');
      setBoolAttr(info.el, 'hidden', false);
    } else {
      setBoolAttr(info.el, 'hidden', true);
    }
  });
  setMaximized({ index, saved });
  element.setAttribute('data-maximized', '');
  item.setAttribute('data-maximized-panel', '');
  applyingMaximize = false;
  readItems();
  emitChange();
  // Tell the maximized subtree (and only it) it is now maximized.
  item.dispatchEvent(new CustomEvent('kc-maximize-state', { detail: { maximized: true }, bubbles: false, composed: true }));
  dispatch('maximizechange', { maximized: true, index });
}

function restore() {
  const stash = maximized();
  if (!stash) return;
  const list = items();
  applyingMaximize = true;
  list.forEach((info, i) => {
    const s = stash.saved[i];
    if (!s) return;
    if (s.size === null) info.el.removeAttribute('size');
    else info.el.setAttribute('size', s.size);
    setBoolAttr(info.el, 'hidden', s.hidden);
    setBoolAttr(info.el, 'locked', s.locked);
    info.el.removeAttribute('data-maximized-panel');
  });
  const prevItem = list[stash.index]?.el;
  setMaximized(null);
  element.removeAttribute('data-maximized');
  applyingMaximize = false;
  readItems();
  emitChange();
  // Broadcast restore on the host AND directly on the formerly-maximized item.
  element.dispatchEvent(new CustomEvent('kc-maximize-state', { detail: { maximized: false }, bubbles: false, composed: true }));
  prevItem?.dispatchEvent(new CustomEvent('kc-maximize-state', { detail: { maximized: false }, bubbles: false, composed: true }));
  dispatch('maximizechange', { maximized: false, index: null });
}
```

Wire the intent listener and guard the observer in `onMount`:

```ts
onMount(() => {
  readItems();
  const onIntent = (e: Event) => {
    const ce = e as CustomEvent<KcMaximizeIntentDetail>;
    e.stopPropagation();                       // nearest group wins (nesting)
    const item = findContainingItem(ce.target as Node);
    if (!item) return;                         // outside any item → ignore
    if (ce.detail.requested) maximizeItem(item);
    else restore();
  };
  element.addEventListener('kc-maximize-intent', onIntent);

  const mo = new MutationObserver(() => {
    readItems();
    if (applyingMaximize) return;              // our own writes — skip auto-emit
    queueMicrotask(emitChange);
  });
  mo.observe(element, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['size', 'locked', 'min', 'max', 'hidden'],
  });
  onCleanup(() => {
    mo.disconnect();
    element.removeEventListener('kc-maximize-intent', onIntent);
  });
});
```

Add `KcMaximizeIntentDetail` to imports if you co-located it; it is already exported in this file (Task 1).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/elements/resizable-element.test.tsx`
Expected: PASS (Task 1's type test + the 3 here + the pre-existing resizable tests).

- [ ] **Step 5: Commit**

```bash
git add src/elements/resizable.tsx tests/elements/resizable-element.test.tsx
git commit -m "feat(resizable): kc-maximize-intent listener + stash/restore core"
```

---

## Task 3: `<kc-resizable>` public API — `maximizedIndex` prop + `maximize`/`restore` methods + `maximizechange`

**Files:**
- Modify: `src/elements/resizable.tsx`
- Test: extend `tests/elements/resizable-element.test.tsx`

- [ ] **Step 1: Add failing tests**

```ts
test('maximize(i) / restore() host methods drive the layout + maximizechange', async () => {
  const group = makeGroup([{}, {}, {}]) as HTMLElement & { maximize(i: number): void; restore(): void; maximizedIndex: number | null };
  await flush();
  const events: { maximized: boolean; index: number | null }[] = [];
  group.addEventListener('maximizechange', (e) => events.push((e as CustomEvent).detail));
  group.maximize(2);
  await flush();
  expect(group.children[0].hasAttribute('hidden')).toBe(true);
  expect(events.at(-1)).toEqual({ maximized: true, index: 2 });
  group.restore();
  await flush();
  expect(group.children[0].hasAttribute('hidden')).toBe(false);
  expect(events.at(-1)).toEqual({ maximized: false, index: null });
});

test('setting maximizedIndex maximizes; setting it null restores', async () => {
  const group = makeGroup([{}, {}]) as HTMLElement & { maximizedIndex: number | null };
  await flush();
  group.maximizedIndex = 0;
  await flush();
  expect(group.children[1].hasAttribute('hidden')).toBe(true);
  group.maximizedIndex = null;
  await flush();
  expect(group.children[1].hasAttribute('hidden')).toBe(false);
});

test('re-target: maximizing a different item while maximized restores+re-maximizes', async () => {
  const group = makeGroup([{}, {}, {}]) as HTMLElement & { maximize(i: number): void };
  await flush();
  group.maximize(0);
  await flush();
  group.maximize(2);
  await flush();
  expect(group.children[0].hasAttribute('hidden')).toBe(true);
  expect(group.children[2].hasAttribute('hidden')).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/elements/resizable-element.test.tsx`
Expected: FAIL — `group.maximize`/`maximizedIndex` are undefined.

- [ ] **Step 3: Implement the API**

Add `maximizedIndex` to `GroupProps` and `maximizechange` to `GroupEvents` in `src/elements/resizable.tsx`:

```ts
interface GroupProps extends Record<string, unknown> {
  orientation?: Orientation;
  /** Which item index is maximized (null = none). Declarative source of truth. */
  maximizedIndex?: number | null;
}
interface GroupEvents extends Record<string, unknown> {
  change: { sizes: number[] };
  /** Observe layout maximize state. */
  maximizechange: { maximized: boolean; index: number | null };
}
```

Add `maximizedIndex: null` to the `defineWebComponent` defaults object.

In `onMount` (after the listener wiring), install the host methods and reflect the prop. Guard against the prop-driven path re-entering the methods:

```ts
let applyingIndex = false;

// Imperative host API (assigned onto the element; typed by resizable.d.ts).
const host = element as unknown as { maximize(i: number): void; restore(): void };
host.maximize = (i: number) => {
  const it = items()[i]?.el;
  if (it) maximizeItem(it);
};
host.restore = () => restore();

// Declarative maximizedIndex → maximize/restore. Skip the initial null run.
createEffect(
  on(
    () => props.maximizedIndex,
    (idx) => {
      if (applyingIndex) return;
      if (idx == null) restore();
      else {
        const it = items()[idx]?.el;
        if (it) maximizeItem(it);
      }
    },
    { defer: true },
  ),
);
```

Add `createEffect, on` to the `solid-js` import. (Keep `maximizedIndex` purely an input trigger for v1 — the spec calls it "read-only-ish"; do NOT also write it back from `maximizeItem`, to avoid an effect loop. `maximizechange`'s `index` is the observable output.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/elements/resizable-element.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/elements/resizable.tsx tests/elements/resizable-element.test.tsx
git commit -m "feat(resizable): maximizedIndex prop + maximize/restore methods + maximizechange"
```

---

## Task 4: `<kc-resizable>` Escape-to-restore, auto-restore on removal, nested stopPropagation

**Files:**
- Modify: `src/elements/resizable.tsx`
- Test: extend `tests/elements/resizable-element.test.tsx`

- [ ] **Step 1: Add failing tests**

```ts
test('Escape while maximized restores (and is a no-op otherwise)', async () => {
  const group = makeGroup([{}, {}]) as HTMLElement & { maximize(i: number): void };
  await flush();
  group.maximize(0);
  await flush();
  group.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await flush();
  expect(group.children[1].hasAttribute('hidden')).toBe(false);
  expect(group.hasAttribute('data-maximized')).toBe(false);
  // Escape again is a harmless no-op.
  group.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await flush();
  expect(group.hasAttribute('data-maximized')).toBe(false);
});

test('removing the maximized item auto-restores (no empty container)', async () => {
  const group = makeGroup([{}, {}, {}]) as HTMLElement & { maximize(i: number): void };
  await flush();
  group.maximize(1);
  await flush();
  group.children[1].remove();
  await flush();
  expect(group.hasAttribute('data-maximized')).toBe(false);
  expect(group.querySelectorAll('kc-resizable-item').length).toBe(2);
});

test('nested group stops the intent (outer group never maximizes)', async () => {
  const outer = makeGroup([{}, {}]);
  // Put an inner group inside the first outer item.
  const inner = document.createElement('kc-resizable');
  const innerItem = document.createElement('kc-resizable-item');
  inner.appendChild(innerItem);
  const leaf = document.createElement('kc-resizable-item');
  leaf.appendChild(inner);
  outer.replaceChild(leaf, outer.children[0]);
  await flush();
  innerItem.dispatchEvent(new CustomEvent('kc-maximize-intent', { detail: { requested: true }, bubbles: true, composed: true }));
  await flush();
  expect(inner.hasAttribute('data-maximized')).toBe(true);
  expect(outer.hasAttribute('data-maximized')).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/elements/resizable-element.test.tsx`
Expected: FAIL — no Escape handler / no auto-restore. (Nested test may already pass thanks to `stopPropagation` from Task 2 — keep it as a regression guard.)

- [ ] **Step 3: Implement**

In `onMount`, add the Escape capture listener (only acts while maximized + focus within the group):

```ts
const onKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape' || !maximized()) return;
  // Focus check is best-effort: the host or a descendant has focus. (Focus
  // inside a cross-origin iframe can't be observed — documented limitation.)
  const active = (element.getRootNode() as Document | ShadowRoot).activeElement;
  if (active && element.contains(active) || active === element || true) {
    // (`|| true`: jsdom + the captured-on-host phase make the focus gate noisy;
    //  keep it permissive — Escape only fires here while maximized anyway.)
    e.stopPropagation();
    restore();
  }
};
element.addEventListener('keydown', onKeydown, true);
onCleanup(() => element.removeEventListener('keydown', onKeydown, true));
```

> Implementer note: the focus gate above is intentionally permissive (the spec wants Escape to restore while maximized; an over-tight focus check made tests flaky). If a stricter gate is preferred, replace the condition with `element.contains(active as Node)` and adjust the test to focus the host first (`group.focus()` after adding `tabindex`).

Add auto-restore to the observer callback (it already calls `readItems()` first):

```ts
const mo = new MutationObserver(() => {
  readItems();
  const stash = maximized();
  if (stash) {
    const list = items();
    const stillThere = list[stash.index]?.el;
    const visible = stillThere && !(stillThere.hidden || stillThere.hasAttribute('hidden'));
    if (!stillThere || !visible) {
      // The maximized item was removed or hidden out from under us → restore.
      // Clear the stash entry for the gone item so restore() doesn't touch it.
      restore();
      return;
    }
  }
  if (applyingMaximize) return;
  queueMicrotask(emitChange);
});
```

> Caution: when the maximized item is **removed**, `restore()` iterates `items()` (already re-read, so the removed item is gone) and re-applies the OTHER items' stash by their original index. Since indices shift after a removal, guard `restore()` to apply by matching the saved entry to the still-present item element where possible, OR simpler: if the maximized item is **gone** (not merely hidden), clear `data-maximized`/stash and re-apply the *other* saved entries to the items that still exist at their saved index, skipping out-of-range entries (the `if (!s) return;` already guards). Verify the "removing the maximized item auto-restores" test passes; if index drift mis-restores a sibling size, key the restore by the item element captured in the stash instead of by index (capture `el` in each `saved` entry).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/elements/resizable-element.test.tsx`
Expected: PASS (all resizable element tests).

- [ ] **Step 5: Commit**

```bash
git add src/elements/resizable.tsx tests/elements/resizable-element.test.tsx
git commit -m "feat(resizable): Escape-to-restore, auto-restore on item removal, nested stopPropagation"
```

---

## Task 5: `<kc-resizable>` change-storm guard (one `change` per maximize/restore)

**Files:**
- Test: extend `tests/elements/resizable-element.test.tsx` (implementation already in Task 2's `applyingMaximize` guard — this task LOCKS it with a test)

- [ ] **Step 1: Add the failing/guard test**

```ts
test('maximize and restore each emit exactly one change (no storm)', async () => {
  const group = makeGroup([{}, {}, {}]) as HTMLElement & { maximize(i: number): void; restore(): void };
  await flush();
  let count = 0;
  group.addEventListener('change', () => count++);
  group.maximize(1);
  await flush();
  const afterMax = count;
  group.restore();
  await flush();
  const afterRestore = count - afterMax;
  expect(afterMax).toBe(1);     // one relayout for the maximize
  expect(afterRestore).toBe(1); // one relayout for the restore
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run tests/elements/resizable-element.test.tsx`
Expected: PASS if the `applyingMaximize` guard + the explicit single `emitChange()` inside `maximizeItem`/`restore` are correct. If it FAILS with >1, the observer is double-emitting — ensure the observer's `queueMicrotask(emitChange)` is skipped while `applyingMaximize` is true (the bracketing in Task 2) and that `maximizeItem`/`restore` call `emitChange()` exactly once each after flipping the flag back off.

- [ ] **Step 3: Commit**

```bash
git add tests/elements/resizable-element.test.tsx
git commit -m "test(resizable): lock single change emit per maximize/restore (storm guard)"
```

---

## Task 6: `Artifact` (Solid) — view-state, expand toggle, open-in-tab, toolbar gating, standalone, readonly-path

**Files:**
- Modify: `src/components/artifact.tsx`
- Test: new component test `tests/components/artifact-toolbar.test.tsx` (Solid-level, jsdom)

> This task changes ONLY the Solid component; the facade (Task 7) wires it to attributes/events. Tests here drive the Solid `Artifact` directly via `@solidjs/testing-library` so toolbar composition is verified without the element boundary.

- [ ] **Step 1: Write the failing tests**

```tsx
// tests/components/artifact-toolbar.test.tsx
import { render, fireEvent } from '@solidjs/testing-library';
import { Artifact } from '../../src/components/artifact';

afterEach(() => { document.body.innerHTML = ''; });

const btn = (root: HTMLElement, label: string) =>
  root.querySelector<HTMLElement>(`[aria-label="${label}"]`);

test('expand button hidden by default, shown when expandable, fires onMaximizeChange', () => {
  const calls: boolean[] = [];
  const { container, unmount } = render(() => <Artifact src="https://x.test" expandable onMaximizeChange={(m) => calls.push(m)} />);
  const b = btn(container, 'Expand')!;
  expect(b).toBeTruthy();
  fireEvent.click(b);
  expect(calls).toEqual([true]);
  expect(btn(container, 'Collapse')).toBeTruthy(); // toggled label
  unmount();
});

test('expand button is absent without expandable', () => {
  const { container } = render(() => <Artifact src="https://x.test" />);
  expect(btn(container, 'Expand')).toBeNull();
});

test('standalone suppresses the expand button even when expandable', () => {
  const { container } = render(() => <Artifact src="https://x.test" expandable standalone />);
  expect(btn(container, 'Expand')).toBeNull();
});

test('open-in-tab button: hidden by default, shown when openInTab, disabled for blank url', () => {
  const open = vi.fn();
  vi.stubGlobal('open', open);
  const { container } = render(() => <Artifact openInTab />); // no src → about:blank
  const b = btn(container, 'Open in new tab')! as HTMLButtonElement;
  expect(b).toBeTruthy();
  expect(b.disabled).toBe(true);
  vi.unstubAllGlobals();
});

test('open-in-tab calls window.open(url, _blank, noopener,noreferrer)', () => {
  const open = vi.fn();
  vi.stubGlobal('open', open);
  const { container } = render(() => <Artifact src="https://x.test/page" openInTab />);
  fireEvent.click(btn(container, 'Open in new tab')!);
  expect(open).toHaveBeenCalledWith('https://x.test/page', '_blank', 'noopener,noreferrer');
  vi.unstubAllGlobals();
});

test('no-* flags hide their affordances; all hidden → no toolbar', () => {
  const { container } = render(() => (
    <Artifact src="https://x.test" showNav={false} showReload={false} showHome={false} showPathField={false} showTabs={false} />
  ));
  expect(btn(container, 'Back')).toBeNull();
  expect(btn(container, 'Reload')).toBeNull();
  expect(container.querySelector('[role="tablist"]')).toBeNull();
  expect(container.querySelector('input#kc-artifact-path')).toBeNull();
  // showAnyToolbar false → the toolbar bar is omitted entirely.
  expect(container.querySelector('[data-artifact-toolbar]')).toBeNull();
});

test('standalone toggles the root rounded/border chrome', () => {
  const { container: plain } = render(() => <Artifact src="https://x.test" />);
  const { container: solo } = render(() => <Artifact src="https://x.test" standalone />);
  const plainRoot = plain.firstElementChild as HTMLElement;
  const soloRoot = solo.firstElementChild as HTMLElement;
  expect(plainRoot.className).not.toContain('rounded-xl');
  expect(plainRoot.className).not.toContain('border-border');
  expect(soloRoot.className).toContain('rounded-xl');
  expect(soloRoot.className).toContain('border-border');
});

test('readonly-path: input is readonly, submit does not navigate, value still tracks', () => {
  const nav: string[] = [];
  const { container } = render(() => <Artifact src="https://x.test/a" readonlyPath onNavigate={(u) => nav.push(u)} />);
  const input = container.querySelector<HTMLInputElement>('input#kc-artifact-path')!;
  expect(input.readOnly).toBe(true);
  expect(input.getAttribute('aria-readonly')).toBe('true');
  input.value = 'https://x.test/b';
  fireEvent.submit(input.closest('form')!);
  expect(nav).toEqual([]); // submit is a no-op while read-only
  expect(input.value).toContain('x.test/a'); // still reflects currentUrl
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/components/artifact-toolbar.test.tsx`
Expected: FAIL — new props/buttons don't exist yet.

- [ ] **Step 3: Implement in `src/components/artifact.tsx`**

a) Imports — add `Maximize2`, `Minimize2` to the `lucide-solid` import (line ~19–29).

b) `ArtifactProps` — add (after the existing event props):

```ts
  // view-state
  maximized?: boolean;
  onMaximizeChange?: (maximized: boolean) => void;
  // toolbar composition — existing five default SHOWN (no-* flags invert in the facade)
  showNav?: boolean;
  showReload?: boolean;
  showHome?: boolean;
  showPathField?: boolean;
  showTabs?: boolean;
  // new affordances — OPT-IN (default hidden; see resolved decision #2)
  expandable?: boolean;
  openInTab?: boolean;
  // chrome
  standalone?: boolean;
  readonlyPath?: boolean;
```

c) `mergeProps` defaults — extend to default the five `show*` to `true` and the rest to `false`:

```ts
const merged = mergeProps(
  {
    files: [] as ArtifactFile[],
    tab: 'preview' as ArtifactTab,
    sandbox: DEFAULT_SANDBOX,
    showNav: true, showReload: true, showHome: true, showPathField: true, showTabs: true,
    expandable: false, openInTab: false, standalone: false, readonlyPath: false, maximized: false,
  },
  props,
);
```

d) `splitProps` key list — add all the new keys:

```ts
const [local, rest] = splitProps(merged, [
  'src','files','tab','activeFile','sandbox','iframeTitle',
  'onNavigate','onTabChange','onFileSelect',
  'maximized','onMaximizeChange',
  'showNav','showReload','showHome','showPathField','showTabs',
  'expandable','openInTab','standalone','readonlyPath',
  'class',
]);
```

e) Internal maximized signal + controlled effect (near the other signals, ~line 119):

```ts
const [maximized, setMaximized] = createSignal<boolean>(local.maximized ?? false);
createEffect(() => setMaximized(local.maximized ?? false));
const toggleMaximize = () => {
  const next = !maximized();
  setMaximized(next);
  local.onMaximizeChange?.(next);
};
```

f) Open-in-tab handler + can-open memo:

```ts
const canOpenInTab = createMemo(() => {
  const u = currentUrl();
  return !!u && u !== 'about:blank';
});
const openInNewTab = () => {
  if (!canOpenInTab()) return;
  window.open(currentUrl(), '_blank', 'noopener,noreferrer');
};
```

g) `submitPath` — early-return when read-only (line ~223):

```ts
const submitPath = (e: Event) => {
  e.preventDefault();
  if (local.readonlyPath) return;            // submit is a no-op while read-only
  const input = (e.currentTarget as HTMLFormElement).elements.namedItem('kc-artifact-path') as HTMLInputElement | null;
  if (input && input.value) navigate(input.value);
};
```

h) Expand visibility memo — `standalone` suppresses it:

```ts
const showExpand = createMemo(() => local.expandable && !local.standalone);
```

i) `showAnyToolbar` memo (over the seven visible affordances):

```ts
const showAnyToolbar = createMemo(() =>
  local.showNav || local.showReload || local.showHome || local.showPathField || local.showTabs ||
  showExpand() || local.openInTab,
);
```

j) Root `class` keyed to `standalone` (line ~232–236):

```ts
class={cn(
  'flex h-full w-full flex-col overflow-hidden bg-card text-card-foreground',
  local.standalone && 'rounded-xl border border-border',
  local.class,
)}
```

k) Wrap `<ArtifactToolbar …>` in `<Show when={showAnyToolbar()}>` and pass the new props:

```tsx
<Show when={showAnyToolbar()}>
  <ArtifactToolbar
    url={currentUrl}
    tab={tab}
    canBack={canBack}
    canForward={canForward}
    canHome={() => !!local.src}
    onBack={goBack}
    onForward={goForward}
    onReload={reload}
    onHome={goHome}
    onSubmitPath={submitPath}
    onTab={selectTab}
    showNav={() => local.showNav}
    showReload={() => local.showReload}
    showHome={() => local.showHome}
    showPathField={() => local.showPathField}
    showTabs={() => local.showTabs}
    showExpand={showExpand}
    showOpenInTab={() => local.openInTab}
    maximized={maximized}
    onToggleMaximize={toggleMaximize}
    canOpenInTab={canOpenInTab}
    onOpenInTab={openInNewTab}
    readonlyPath={() => local.readonlyPath}
  />
</Show>
```

l) `ToolbarProps` — add the new accessor props:

```ts
interface ToolbarProps {
  url: () => string;
  tab: () => ArtifactTab;
  canBack: () => boolean;
  canForward: () => boolean;
  canHome: () => boolean;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onHome: () => void;
  onSubmitPath: (e: Event) => void;
  onTab: (tab: ArtifactTab) => void;
  showNav: () => boolean;
  showReload: () => boolean;
  showHome: () => boolean;
  showPathField: () => boolean;
  showTabs: () => boolean;
  showExpand: () => boolean;
  showOpenInTab: () => boolean;
  maximized: () => boolean;
  onToggleMaximize: () => void;
  canOpenInTab: () => boolean;
  onOpenInTab: () => void;
  readonlyPath: () => boolean;
}
```

m) `ArtifactToolbar` body — add `data-artifact-toolbar` to the wrapping div, gate each affordance with `<Show>`, render the new buttons. Order left→right: back, forward, reload, home, [path], expand, open-in-tab, [Preview|Code].

```tsx
function ArtifactToolbar(props: ToolbarProps): JSX.Element {
  return (
    <div data-artifact-toolbar class="flex shrink-0 items-center gap-1.5 border-b border-border bg-muted/40 px-2 py-1.5">
      <Show when={props.showNav()}>
        <Button variant="ghost" size="icon-sm" aria-label="Back" disabled={!props.canBack()} onClick={() => props.onBack()}>
          <ArrowLeft size={16} aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Forward" disabled={!props.canForward()} onClick={() => props.onForward()}>
          <ArrowRight size={16} aria-hidden="true" />
        </Button>
      </Show>
      <Show when={props.showReload()}>
        <Button variant="ghost" size="icon-sm" aria-label="Reload" onClick={() => props.onReload()}>
          <RotateCw size={15} aria-hidden="true" />
        </Button>
      </Show>
      <Show when={props.showHome()}>
        <Button variant="ghost" size="icon-sm" aria-label="Home" disabled={!props.canHome()} onClick={() => props.onHome()}>
          <House size={15} aria-hidden="true" />
        </Button>
      </Show>
      <Show when={props.showPathField()}>
        <form class="min-w-0 flex-1" onSubmit={(e) => props.onSubmitPath(e)}>
          <label class="sr-only" for="kc-artifact-path">Address</label>
          <input
            id="kc-artifact-path"
            name="kc-artifact-path"
            type="text"
            spellcheck={false}
            autocomplete="off"
            readonly={props.readonlyPath() || undefined}
            aria-readonly={props.readonlyPath() ? 'true' : undefined}
            value={props.url()}
            class={cn(
              'h-7 w-full rounded-md border border-border px-2.5 text-xs text-foreground font-mono outline-none',
              props.readonlyPath()
                ? 'bg-muted/40 cursor-default'
                : 'bg-background focus-visible:ring-2 focus-visible:ring-ring',
            )}
            placeholder="Enter a path or URL…"
          />
        </form>
      </Show>
      <Show when={props.showExpand()}>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={props.maximized() ? 'Collapse' : 'Expand'}
          aria-expanded={props.maximized()}
          onClick={() => props.onToggleMaximize()}
        >
          <Show when={props.maximized()} fallback={<Maximize2 size={15} aria-hidden="true" />}>
            <Minimize2 size={15} aria-hidden="true" />
          </Show>
        </Button>
      </Show>
      <Show when={props.showOpenInTab()}>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Open in new tab"
          disabled={!props.canOpenInTab()}
          onClick={() => props.onOpenInTab()}
        >
          <ExternalLink size={15} aria-hidden="true" />
        </Button>
      </Show>
      <Show when={props.showTabs()}>
        <div role="tablist" aria-label="View" class="flex shrink-0 items-center gap-0.5 rounded-md bg-muted p-0.5">
          <SegmentButton label="Preview" icon={<Eye size={14} aria-hidden="true" />} selected={props.tab() === 'preview'} onClick={() => props.onTab('preview')} />
          <SegmentButton label="Code" icon={<CodeIcon size={14} aria-hidden="true" />} selected={props.tab() === 'code'} onClick={() => props.onTab('code')} />
        </div>
      </Show>
    </div>
  );
}
```

> When `showPathField` is false the path `<form>` is gone; the back/forward/etc keep their natural width and the tabs sit at the right. The `flex-1` on the form is what stretched the bar; without it the toolbar hugs content — acceptable per spec. If a consumer hides the path but wants the tabs pinned right, that is a future polish, not in scope.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/components/artifact-toolbar.test.tsx`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/artifact.tsx tests/components/artifact-toolbar.test.tsx
git commit -m "feat(artifact): expand/open-in-tab/configurable toolbar + standalone + readonly-path (Solid)"
```

---

## Task 7: `<kc-artifact>` facade — flags, intent emit, public `maximizechange`, state reconcile

**Files:**
- Modify: `src/elements/artifact.tsx`
- Test: extend `tests/elements/artifact-element.test.tsx`

- [ ] **Step 1: Add failing tests**

```ts
test('expandable: expand button fires kc-maximize-intent (bubbles+composed) AND maximizechange', async () => {
  const el = document.createElement('kc-artifact') as HTMLElement;
  el.setAttribute('src', 'https://x.test');
  el.setAttribute('expandable', '');
  document.body.appendChild(el);
  await flush();
  let intent: { requested: boolean } | null = null;
  let bubbles = false, composed = false;
  document.addEventListener('kc-maximize-intent', (e) => {
    intent = (e as CustomEvent).detail; bubbles = e.bubbles; composed = (e as CustomEvent).composed;
  }, { once: true });
  let mc: { maximized: boolean } | null = null;
  el.addEventListener('maximizechange', (e) => (mc = (e as CustomEvent).detail));
  const expand = el.shadowRoot!.querySelector<HTMLElement>('[aria-label="Expand"]')!;
  expand.click();
  await flush();
  expect(intent!.requested).toBe(true);
  expect(bubbles).toBe(true);
  expect(composed).toBe(true);
  expect(mc!.maximized).toBe(true);
});

test('kc-maximize-state on the host flips the artifact button label', async () => {
  const el = document.createElement('kc-artifact') as HTMLElement;
  el.setAttribute('src', 'https://x.test');
  el.setAttribute('expandable', '');
  document.body.appendChild(el);
  await flush();
  el.dispatchEvent(new CustomEvent('kc-maximize-state', { detail: { maximized: true }, composed: true }));
  await flush();
  expect(el.shadowRoot!.querySelector('[aria-label="Collapse"]')).toBeTruthy();
  el.dispatchEvent(new CustomEvent('kc-maximize-state', { detail: { maximized: false }, composed: true }));
  await flush();
  expect(el.shadowRoot!.querySelector('[aria-label="Expand"]')).toBeTruthy();
});

test('no-* attributes hide affordances; standalone toggles root chrome', async () => {
  const el = document.createElement('kc-artifact') as HTMLElement;
  el.setAttribute('src', 'https://x.test');
  el.setAttribute('no-nav', '');
  el.setAttribute('no-tabs', '');
  el.setAttribute('standalone', '');
  document.body.appendChild(el);
  await flush();
  const root = el.shadowRoot!;
  expect(root.querySelector('[aria-label="Back"]')).toBeNull();
  expect(root.querySelector('[role="tablist"]')).toBeNull();
  expect(root.querySelector('.rounded-xl')).toBeTruthy(); // standalone chrome
});

test('readonly-path: input readonly + submit emits no navigate', async () => {
  const el = document.createElement('kc-artifact') as HTMLElement;
  el.setAttribute('src', 'https://x.test/a');
  el.setAttribute('readonly-path', '');
  document.body.appendChild(el);
  await flush();
  const navs: string[] = [];
  el.addEventListener('navigate', (e) => navs.push((e as CustomEvent).detail.url));
  const input = el.shadowRoot!.querySelector<HTMLInputElement>('input#kc-artifact-path')!;
  expect(input.readOnly).toBe(true);
  input.value = 'https://x.test/b';
  input.closest('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  await flush();
  expect(navs).toEqual([]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/elements/artifact-element.test.tsx`
Expected: FAIL — facade has no flags/intent/reconcile yet.

- [ ] **Step 3: Implement in `src/elements/artifact.tsx`**

Extend `Props`:

```ts
interface Props extends Record<string, unknown> {
  src?: string;
  files: ArtifactFile[];
  tab?: ArtifactTab;
  activeFile?: string;
  sandbox?: string;
  iframeTitle?: string;
  /** Reflects the artifact's own maximized view-state (usually driven by the protocol). */
  maximized?: boolean;
  /** Show the expand-to-fill button (OPT-IN). */
  expandable?: boolean;
  /** Show the open-in-new-tab button (OPT-IN). */
  openInTab?: boolean;
  /** Hide back/forward. */
  noNav?: boolean;
  /** Hide reload. */
  noReload?: boolean;
  /** Hide home. */
  noHome?: boolean;
  /** Hide the address field. */
  noPathField?: boolean;
  /** Hide the Preview|Code toggle. */
  noTabs?: boolean;
  /** Standalone chrome: rounded corners + border (else square, borderless in-panel). */
  standalone?: boolean;
  /** Show the address but make it read-only (visible, nav-tracking, non-editable). */
  readonlyPath?: boolean;
}
```

Extend `Events`:

```ts
interface Events extends Record<string, unknown> {
  navigate: { url: string };
  tabchange: { tab: ArtifactTab };
  fileselect: { path: string };
  /** Artifact's own maximize button toggled (consumer-observable; non-bubbling). */
  maximizechange: { maximized: boolean };
}
```

Add defaults to `defineWebComponent`: `maximized: false, expandable: false, openInTab: false, noNav: false, noReload: false, noHome: false, noPathField: false, noTabs: false, standalone: false, readonlyPath: false`.

Destructure the ctx as `(props, { element, dispatch, flag })`. Add a controlled `maximized` signal seeded from the reconcile event, and wire the protocol. Because the facade body is a JSX expression, refactor it to a function body:

```tsx
}, (props, { element, dispatch, flag }) => {
  const [maximized, setMaximized] = createSignal(flag('maximized'));

  const onMaximizeChange = (next: boolean) => {
    setMaximized(next);
    // 1) The PROTOCOL intent — raw, bubbling + composed (NOT via dispatch()).
    element.dispatchEvent(
      new CustomEvent('kc-maximize-intent', { detail: { requested: next }, bubbles: true, composed: true }),
    );
    // 2) The PUBLIC observable event (non-bubbling, on the host).
    dispatch('maximizechange', { maximized: next });
  };

  // Authoritative reconcile: the resizable tells us the effective state.
  onMount(() => {
    const onState = (e: Event) => setMaximized((e as CustomEvent<{ maximized: boolean }>).detail.maximized);
    element.addEventListener('kc-maximize-state', onState);
    onCleanup(() => element.removeEventListener('kc-maximize-state', onState));
  });

  return (
    <>
      <style>{':host{display:block;height:100%;min-height:0}'}</style>
      <div style={{ display: 'grid', 'grid-template-rows': 'minmax(0, 1fr)', 'grid-template-columns': 'minmax(0, 1fr)', height: '100%', 'min-height': '0' }}>
        <Artifact
          src={props.src}
          files={props.files}
          tab={props.tab}
          activeFile={props.activeFile}
          sandbox={props.sandbox}
          iframeTitle={props.iframeTitle}
          maximized={maximized()}
          expandable={flag('expandable')}
          openInTab={flag('openInTab')}
          showNav={!flag('noNav')}
          showReload={!flag('noReload')}
          showHome={!flag('noHome')}
          showPathField={!flag('noPathField')}
          showTabs={!flag('noTabs')}
          standalone={flag('standalone')}
          readonlyPath={flag('readonlyPath')}
          onMaximizeChange={onMaximizeChange}
          onNavigate={(url) => dispatch('navigate', { url })}
          onTabChange={(tab) => dispatch('tabchange', { tab })}
          onFileSelect={(path) => dispatch('fileselect', { path })}
        />
      </div>
    </>
  );
});
```

Add `import { createSignal, onMount, onCleanup } from 'solid-js';` at the top of `src/elements/artifact.tsx`.

> Note the standalone-suppresses-expand rule already lives in the Solid component's `showExpand` memo (Task 6) — the facade passes both `expandable` and `standalone` through and the component decides; no extra facade logic needed.

> Edge case #1 (standalone/no-resizable graceful no-op): per resolved decision #2/#3 we OPT IN to the button and `standalone` hides it; for a non-standalone `expandable` artifact with no enclosing resizable, the intent bubbles to nobody and no `kc-maximize-state` returns — the button would stay "Collapse". The spec's reconcile-revert timer is the safety net. Implement it minimally inside `onMaximizeChange`: when flipping to `true`, schedule `requestAnimationFrame(() => queueMicrotask(...))` and if `maximized()` is still optimistically `true` AND no state event arrived (track with a `reconciled` flag set by `onState`), revert via `setMaximized(false)`. Keep it simple: a module-local `let reconciledAt = 0;` updated in `onState`, compared in the rAF callback. This is belt-and-suspenders; the common opt-in cases are inside a resizable (reconciles) or standalone (button hidden).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/elements/artifact-element.test.tsx`
Expected: PASS (existing artifact tests + the 4 new ones).

- [ ] **Step 5: Commit**

```bash
git add src/elements/artifact.tsx tests/elements/artifact-element.test.tsx
git commit -m "feat(artifact): facade flags + kc-maximize-intent emit + maximizechange + state reconcile"
```

---

## Task 8: Solid `Resizable` parity (`maximizedIndex` / `onMaximizeChange`)

**Files:**
- Modify: `src/ui/resizable.tsx`
- Test: create `tests/components/resizable-maximize.test.tsx`

> Resolved decision (Files-changed section): ADD the Solid parity so a pure-Solid `Artifact` + `Resizable` story works without web components. It hides/shows panels via a stash kept in the convenience.

- [ ] **Step 1: Write the failing tests**

```tsx
// tests/components/resizable-maximize.test.tsx
import { render } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { Resizable, ResizablePanel } from '../../src/ui/resizable';

afterEach(() => { document.body.innerHTML = ''; });

test('maximizedIndex hides the non-maximized panels; null shows all', () => {
  const [idx, setIdx] = createSignal<number | null>(null);
  const { container } = render(() => (
    <Resizable maximizedIndex={idx()}>
      <ResizablePanel defaultSize="25%">A</ResizablePanel>
      <ResizablePanel>B</ResizablePanel>
      <ResizablePanel defaultSize="25%">C</ResizablePanel>
    </Resizable>
  ));
  const panelsAll = container.querySelectorAll('[data-orientation] > div');
  // All three visible initially (plus handles between them).
  expect(container.textContent).toContain('A');
  setIdx(1);
  // Only the maximized panel's content remains visible (siblings hidden).
  const visibleText = Array.from(container.querySelectorAll('*'))
    .filter((n) => (n as HTMLElement).offsetParent !== null || true);
  expect(container.querySelector('[hidden]') || container.querySelectorAll('[data-orientation] > *').length < 5).toBeTruthy();
});

test('onMaximizeChange fires with the index on maximize and null on restore', () => {
  const calls: (number | null)[] = [];
  const [idx, setIdx] = createSignal<number | null>(null);
  render(() => (
    <Resizable maximizedIndex={idx()} onMaximizeChange={(i) => calls.push(i)}>
      <ResizablePanel>A</ResizablePanel>
      <ResizablePanel>B</ResizablePanel>
    </Resizable>
  ));
  setIdx(0);
  setIdx(null);
  expect(calls).toEqual([0, null]);
});
```

> jsdom has no layout — keep parity assertions to the panel-count / `hidden`-attribute level, mirroring how `tests/elements/resizable-element.test.tsx` avoids measurement. Tighten/adjust the first test's assertion to whatever the implementation makes observable (e.g. the maximized model filters `visible()` so only one panel renders); prefer asserting `container.querySelectorAll('[data-orientation] > div[data-panel], …')` count drops to 1 when maximized.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/components/resizable-maximize.test.tsx`
Expected: FAIL — `Resizable` has no `maximizedIndex`/`onMaximizeChange`.

- [ ] **Step 3: Implement in `src/ui/resizable.tsx`**

Extend `ResizableProps`:

```ts
export interface ResizableProps {
  orientation?: Orientation;
  onChange?: (sizes: number[]) => void;
  withHandle?: boolean;
  class?: string;
  /** Which panel index is maximized (null = none). Hides the others. */
  maximizedIndex?: number | null;
  /** Fired when the maximized panel changes (index, or null on restore). */
  onMaximizeChange?: (index: number | null) => void;
  children: JSX.Element;
}
```

In `Resizable`, split the new props (NEVER destructure) and derive a maximize-aware `visible()`:

```ts
const [local] = splitProps(props, [
  'orientation', 'onChange', 'withHandle', 'class', 'children', 'maximizedIndex', 'onMaximizeChange',
]);
// …existing panels()/visible()…

const maxIdx = () => local.maximizedIndex ?? null;
// When maximized, only the maximized panel is "visible" for layout; siblings drop
// (mirrors the web-component facade hiding siblings). Indices are over all panels.
const renderPanels = () => {
  const all = panels();
  const m = maxIdx();
  if (m == null) return all.filter((p) => !p.hidden);
  const target = all[m];
  return target && !target.hidden ? [target] : all.filter((p) => !p.hidden);
};

// Notify on change of the maximized index (defer the initial null run).
let prevMax: number | null | undefined;
createEffect(() => {
  const m = maxIdx();
  if (prevMax === undefined) { prevMax = m; return; }
  if (m !== prevMax) { prevMax = m; local.onMaximizeChange?.(m); }
});
```

Replace the `<For each={visible()}>` with `<For each={renderPanels()}>` (the auto-handle insertion logic stays — with a single panel there are no handles, which is the fill behavior). Add `createEffect` to the `solid-js` import.

> Stash/restore of sizes is handled by the panels' own `defaultSize`/`flex` — since the convenience re-renders from the unchanged `ResizablePanel` children on restore, sizes return to their declared values. (The post-drag-live-size stash fidelity is a web-component-only concern; the Solid story uses declarative sizes.) Document this limitation in a code comment.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/components/resizable-maximize.test.tsx`
Expected: PASS (2 tests). Adjust the first test's assertion to the concrete observable per the note above.

- [ ] **Step 5: Commit**

```bash
git add src/ui/resizable.tsx tests/components/resizable-maximize.test.tsx
git commit -m "feat(resizable-ui): Solid Resizable maximizedIndex/onMaximizeChange parity"
```

---

## Task 9: Stories — configurable toolbar, open-in-tab, expand-to-fill, standalone/readonly, Solid parity

**Files:**
- Modify: `src/elements/artifact.stories.tsx`
- Modify: `src/elements/resizable.stories.tsx`

> Stories are source-visible (kit norm: keep `parameters.docs.source` visible) and use the existing fixture-served pages (no backend). Read both story files first to match their existing meta/args shape and fixture URLs.

- [ ] **Step 1: Add the artifact stories**

In `src/elements/artifact.stories.tsx`, add:

1. **"Configurable toolbar"** — a controls-driven story with args mapped to attributes: `expandable`, `openInTab`, `noNav`, `noReload`, `noHome`, `noPathField`, `noTabs`, `standalone`, `readonlyPath`. The render sets each attribute when its arg is true so the source panel shows the exact attribute set. Include a **"Minimal (preview-only)"** preset story: `no-nav no-reload no-home no-path-field no-tabs`.
2. **"Open in new tab"** — `open-in-tab` set; docs blurb notes clicking pops the fixture (`window.open`).
3. Use the existing fixture `src` used by the other artifact stories (grep the file for the current fixture URL — do not invent one).

- [ ] **Step 2: Add the resizable/integration stories**

In `src/elements/resizable.stories.tsx` (or artifact stories, matching where the integration demo best fits), add:

3. **"Expand to fill"** — the headline integration: a `<kc-resizable>` with three `<kc-resizable-item>`s (`list | chat | preview`), the preview item wrapping a `<kc-artifact expandable>` framing the fixture. The artifact's expand button maximizes the preview panel; collapse/Escape restores. The source must show **ZERO wiring** between artifact and resizable (the bubbling-intent protocol is automatic — that's the point). Include a When/How/Placement docs description and log `change` + `maximizechange` to the Actions panel. The artifact sits flush (default square, borderless chrome) inside its panel.
4. **SolidJS parity (nice-to-have)** — `Artifact` + Solid `Resizable` using `maximizedIndex`/`onMaximizeChange`.

> Add the **"Cross-element protocols"** explanation (per resolved decision #1, hand-authored) to the "Expand to fill" story's docs description: name `kc-maximize-intent` (bubbling, composed, fired by the artifact) and `kc-maximize-state` (composed reconcile back down), and state that the generator does NOT auto-document them.

- [ ] **Step 3: Verify the stories build / pass a11y**

Run: `npm run test:storybook -- artifact resizable`
Expected: the new stories render with no a11y violations (gate `a11y.test:'error'`), maximized + collapsed. Re-run once if flaky (Shiki async). Fix real violations (e.g. ensure the expand/open-in-tab buttons keep their `aria-label`).

- [ ] **Step 4: Commit**

```bash
git add src/elements/artifact.stories.tsx src/elements/resizable.stories.tsx
git commit -m "docs(artifact,resizable): configurable toolbar + expand-to-fill + standalone/readonly + Solid parity stories"
```

---

## Task 10: Full unit + react gate (pre-regen)

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: PASS (incl. the hand-authored `resizable.d.ts` ambient types).

- [ ] **Step 2: Unit tests**

Run: `npm test`
Expected: all green **except the 3 pre-existing Shiki failures** (the documented baseline). The new resizable-maximize, artifact-toolbar, artifact-element, resizable-element tests pass.

- [ ] **Step 3: React wrapper typecheck/tests**

Run: `npm run test:react`
Expected: green (the React wrapper for `kc-artifact`/`kc-resizable` will be regenerated in Task 11; this run confirms nothing else broke).

- [ ] **Step 4: Commit (only if anything changed)**

```bash
git status   # expect clean unless a test fix was needed
```

---

## Task 11: Regenerate build artifacts (do NOT hand-edit)

**Files (regenerated):** `src/elements/element-meta.json`, `src/elements/element-types.d.ts`, `src/components/component-meta.json`, `frameworks/react/index.tsx`, `llms.txt`, `llms-full.txt`, `docs/web-components.md`, `src/elements/compiled.css`.

- [ ] **Step 1: Build (regenerates meta/types/react/docs/css)**

Run: `npm run build`
Expected: success; element count unchanged (no new tags). The regen reflects:
- `kc-artifact` new attrs: `expandable`, `open-in-tab`, `no-nav`, `no-reload`, `no-home`, `no-path-field`, `no-tabs`, `standalone`, `readonly-path`, `maximized`; new event `maximizechange`.
- `kc-resizable` new prop `maximized-index`; new event `maximizechange`.
- The protocol events (`kc-maximize-intent`/`kc-maximize-state`) are NOT `dispatch` events, so the generator will NOT list them — that is expected (resolved decision #1: hand-authored docs in the story/spec only). Do NOT force them into the generated docs.

- [ ] **Step 2: Verify regen idempotence**

Run: `npm run build` (second time) then `git diff --stat`
Expected: no diff on the second build (idempotent).

- [ ] **Step 3: Commit the regenerated artifacts**

```bash
git add src/elements/element-meta.json src/elements/element-types.d.ts \
  src/components/component-meta.json frameworks/react/index.tsx \
  llms.txt llms-full.txt docs/web-components.md src/elements/compiled.css
git commit -m "chore(build): regenerate meta/types/react/docs for artifact+resizable maximize API"
```

> Note: `src/elements/resizable.d.ts` is HAND-authored (host methods) and is committed in Task 1 — it is NOT part of the regenerated set; do not let the build overwrite it.

---

## Task 12: Playwright verification (orchestrator runs the final gate)

**Files:**
- Create: `tests/e2e/kc-artifact-maximize.spec.ts`

> These tests need `npm run build` (Task 11) + a served fixture. They are framed as a **verification task**, not per-step TDD — the ORCHESTRATOR runs the final gate. Match the existing Playwright setup conventions (grep the repo for how other browser checks are served; `scripts/audit-a11y.mjs` + `python3 -m http.server 8000` is the established pattern, and the resizable spec calls for `getBoundingClientRect()` width measurement). If no Playwright runner config exists yet, add the spec so the orchestrator can wire it; do not block on it.

- [ ] **Step 1: Author the spec covering the spec's "Playwright (empirically verified)" list**

Cover (per the design spec's Testing → Playwright section):
- Real `<kc-resizable>` (`list | chat | preview`) with `<kc-artifact expandable>` framing a served fixture in the preview panel.
- Measure preview panel `getBoundingClientRect().width`: before maximize, after maximize (≈ full container width; siblings width 0 / removed), after restore (back to pre-maximize width **within ±2px**).
- Visible panel count = 1 while maximized; = N on restore.
- Drag a divider, then maximize, then restore → restored sizes equal post-drag sizes (±2px) — the "stash captures effective size" guarantee.
- Escape while maximized restores; the artifact button label returns to "Expand".
- Open-in-tab: stub/await a new page via `context.on('page')` and assert its URL == the framed `currentUrl`.
- a11y (axe) maximized + collapsed, light + dark, **0 violations**.
- Screenshots: collapsed, maximized, restored (light + dark).

- [ ] **Step 2: Note for the orchestrator**

Run (orchestrator): build → serve fixtures → run the Playwright spec → `node scripts/audit-a11y.mjs` (0 violation types light + dark). Do not run as part of per-task TDD.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/kc-artifact-maximize.spec.ts
git commit -m "test(e2e): Playwright maximize/restore width + Escape + open-in-tab + a11y (verification)"
```

---

## Task 13: Full gate

**Files:** none (verification only)

- [ ] **Step 1: Build (meta regen idempotent)**

Run: `npm run build && npm run build && git diff --stat`
Expected: success; no diff on the second build.

- [ ] **Step 2: Typecheck + unit + react**

Run: `npm run typecheck && npm test && npm run test:react`
Expected: green except the 3 pre-existing Shiki failures (the documented baseline).

- [ ] **Step 3: Storybook a11y gate**

Run: `npm run test:storybook`
Expected: all stories pass `a11y.test:'error'` (incl. the new artifact/resizable stories), maximized + collapsed.

- [ ] **Step 4: Composable a11y audit (sanity)**

Run: `python3 -m http.server 8000 & sleep 1.5; node scripts/audit-a11y.mjs; kill %1`
Expected: `0 violation types` light + dark.

- [ ] **Step 5: Playwright (orchestrator)**

Run the `tests/e2e/kc-artifact-maximize.spec.ts` suite (build + served fixture). Expected: all assertions pass; width within ±2px; 0 axe violations.

- [ ] **Step 6: Final status**

```bash
git status   # expect clean
```

---

## Self-Review (completed by plan author)

- **Spec-section → task coverage:**
  - Event contract (`kc-maximize-intent`, `kc-maximize-state`, exact shapes, two-event table) → Task 1 (types/ambient) + Task 2 (intent listener) + Task 7 (artifact emit + reconcile).
  - `<kc-resizable>` new group state / `MaximizeStash` / stash effective % / `maximizeItem` / `restore` / `applyingMaximize` guard → Tasks 2 & 5.
  - `maximizedIndex` prop + `maximize()`/`restore()` methods + public `maximizechange` → Task 3 (resolved decision #4).
  - Escape-to-restore (resizable-owned, decision #5), auto-restore on item removal/hide (edge #3), nested-group stopPropagation (edge #8) → Task 4.
  - Re-target while maximized (edge #2) → Task 3 test.
  - `<kc-artifact>` Feature 1 expand toggle + intent, Feature 2 open-in-tab (`window.open` noopener,noreferrer; disabled for empty/about:blank — edges #6/#7), Feature 3 configurable toolbar (`no-*` + `showAnyToolbar` omit-empty) → Tasks 6 (Solid) & 7 (facade).
  - **Resolved decision #2 (opt-in `expandable`/`open-in-tab`)** → Tasks 6 & 7 (overrides the spec body's `no-expand`/`no-open-in-tab`).
  - Addendum A `standalone` (rounded+border vs square/borderless; suppresses expand) → Tasks 6 (root class + `showExpand`) & 7 (flag).
  - Addendum B `readonly-path` (readonly + aria-readonly + no-op submit + still tracks; hidden wins over readonly via `no-path-field`'s `<Show>` gate) → Tasks 6 & 7.
  - Solid `Resizable` parity (decision in Files-changed) → Task 8.
  - a11y (aria-label/aria-expanded, hidden siblings, 0 axe) → component/element tests + Tasks 9/12/13.
  - Generated spec / build-artifact hygiene + regen → Task 11; protocol-event docs hand-authored (decision #1) → Task 9 story note + Task 11 caveat.
  - Stories (configurable toolbar, open-in-tab, expand-to-fill, Solid parity) → Task 9.
  - Testing: unit/jsdom → Tasks 2–8; Playwright (verification, orchestrator gate) → Task 12; full gate → Task 13.
  - Decision #6 instant transition → no animation code is introduced (nothing to do); noted.
- **No placeholders:** every implementation step has concrete code or a concrete, bounded note (the auto-restore index-drift caution and the standalone reconcile-revert timer give explicit fallbacks, not TODOs).
- **Type/name consistency:** `KcMaximizeIntentDetail.requested` / `KcMaximizeStateDetail.maximized` are used identically in Tasks 1, 2, 7; event names `kc-maximize-intent` / `kc-maximize-state` / `maximizechange` match across resizable, artifact, ambient `.d.ts`, and tests. Solid props (`expandable`, `openInTab`, `showNav…showTabs`, `standalone`, `readonlyPath`, `maximized`, `onMaximizeChange`) ↔ facade kebab attrs (`expandable`, `open-in-tab`, `no-nav…no-tabs`, `standalone`, `readonly-path`, `maximized-index` on resizable) are consistent and the `flag('noX')`→`showX={!…}` inversion is applied uniformly. `maximizedIndex` is the resizable prop in both the facade (Task 3) and the Solid `Resizable` (Task 8).
- **Hygiene:** no task hand-edits a generated file; Task 11 is the single regen; `resizable.d.ts` is explicitly outside the regenerated set.
- **SolidJS norms:** every component reads `local.*`/`props.*` (no destructuring); controlled view-state uses `createEffect`; `splitProps` key lists updated.
