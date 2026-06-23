# W1 — Formalize `<kai-chat>` Composition Seams — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the proven `<kai-chat>` seam spike into a maintainable system: a typed seam registry as the single source of truth, the facade driven from it, `loading` reflected to a host attribute, and the spike's tests promoted into the committed suite with a drop-in regression guard.

**Architecture:** Extract the seam definitions the spike inlined in `src/elements/chat.tsx` into a new `src/elements/seams.ts` (types + `CHAT_SEAMS` + a pure `readSeams` helper). The facade imports and derives its detection from the registry instead of a local array. A `createEffect` reflects streaming state to a `loading` host attribute so slotted CSS can react. Tests move from a standalone spike into the committed unit suite (`readSeams`, jsdom) and the IVP suite (real shadow DOM), plus a new "drop-in renders unchanged" regression.

**Tech Stack:** SolidJS + `solid-element` (shadow-DOM custom elements via `defineWebComponent`), Vitest (jsdom unit tests), Playwright + Storybook (IVP / real shadow DOM), TypeScript.

## Global Constraints

- Elements are prefixed **`kai-`**, never `kitn-`. (`<kai-chat>`.)
- **Array/object props** are set as JS **properties**, never HTML attributes; only scalars work as attributes.
- Events are **non-bubbling, non-composed `kai-*` CustomEvents**, dispatched off the host.
- **`messages` stays a prop, never a slot** — per-item data rendering is the registry's job, not a seam.
- **Drop-in path must stay byte-for-byte unchanged**: with no seams projected, `<kai-chat>` renders exactly as before the spike (no extra slots, borders, or padding).
- **Conventional commits** drive release-please; never hand-edit the `package.json` version.
- Unit tests are **Vitest/jsdom** (`*.test.ts` collocated in `src/`); shadow-DOM/slot behavior is **Playwright/Storybook** only (jsdom can't render the shadow tree).
- Starting point is the spike commit `6166976` on branch `spike/kai-chat-seams`: `chat-thread.tsx` already places all eight seams; `chat.tsx` already detects them via a **local inlined `SEAMS` array** that this plan replaces.

---

## File Structure

- **Create** `src/elements/seams.ts` — `SeamMode`/`SeamDef` types, the `CHAT_SEAMS` registry, and the pure `readSeams(host, defs)` detector. Single source of truth.
- **Create** `src/elements/seams.test.ts` — jsdom unit tests for the registry shape and `readSeams`.
- **Modify** `src/elements/chat.tsx` — import the registry; replace the inlined `SEAMS` array + `read()` with `readSeams(element, CHAT_SEAMS)`; add the `loading` host-attribute reflection.
- **Modify** `src/elements/chat-seams.stories.tsx` — add a `DropIn` story (no slots projected) for the regression.
- **Modify** `tests/e2e/chat-seams-ivp.spec.ts` — add the `loading`-reflection test and the drop-in regression test.
- **Modify** `package.json` — add a `test:seams-ivp` script (mirrors `test:composer-ivp`).

**Out of scope (explicit split):** emitting a `slots` table into `custom-elements.json` / `element-meta.json` via `scripts/gen-element-api.mjs`. That generator AST-parses TS source and has no notion of slots; wiring it to read `seams.ts` is a separable, heavier task best done once the registry shape is settled. Tracked as a fast-follow (W1-docs), not part of this plan. The `doc` strings in `CHAT_SEAMS` are the interim human-readable source.

---

### Task 1: The seam registry (`seams.ts`) + `readSeams`

**Files:**
- Create: `src/elements/seams.ts`
- Test: `src/elements/seams.test.ts`

**Interfaces:**
- Produces: `type SeamMode = 'inject' | 'replace'`; `interface SeamDef { name: string; mode: SeamMode; part?: boolean; doc: string }`; `const CHAT_SEAMS: SeamDef[]`; `function readSeams(host: Element, defs?: SeamDef[]): Record<string, boolean>`.

- [ ] **Step 1: Write the failing test**

Create `src/elements/seams.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CHAT_SEAMS, readSeams } from './seams';

describe('CHAT_SEAMS registry', () => {
  it('lists the eight kai-chat seams, in order, with unique names', () => {
    expect(CHAT_SEAMS.map((s) => s.name)).toEqual([
      'header-start', 'header-end', 'header', 'sidebar',
      'empty', 'composer', 'composer-actions', 'footer',
    ]);
    const names = CHAT_SEAMS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('marks header, empty, and composer as replace seams', () => {
    expect(CHAT_SEAMS.filter((s) => s.mode === 'replace').map((s) => s.name))
      .toEqual(['header', 'empty', 'composer']);
  });

  it('every seam has a non-empty doc contract', () => {
    expect(CHAT_SEAMS.every((s) => s.doc.trim().length > 0)).toBe(true);
  });
});

describe('readSeams', () => {
  const host = (html: string): Element => {
    const el = document.createElement('kai-chat');
    el.innerHTML = html;
    return el;
  };

  it('reports false for every seam when nothing is projected', () => {
    const seams = readSeams(host(''));
    expect(Object.keys(seams)).toHaveLength(CHAT_SEAMS.length);
    expect(Object.values(seams).every((v) => v === false)).toBe(true);
  });

  it('detects direct children carrying a seam slot attribute', () => {
    const seams = readSeams(host('<nav slot="sidebar"></nav><footer slot="footer"></footer>'));
    expect(seams.sidebar).toBe(true);
    expect(seams.footer).toBe(true);
    expect(seams.header).toBe(false);
  });

  it('ignores nested (non-direct-child) slotted descendants', () => {
    const seams = readSeams(host('<div><span slot="sidebar"></span></div>'));
    expect(seams.sidebar).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/elements/seams.test.ts`
Expected: FAIL — `Failed to resolve import "./seams"` (the module does not exist yet).

- [ ] **Step 3: Write the registry + detector**

Create `src/elements/seams.ts`:

```ts
/**
 * Composition seams for `kai-*` elements. A seam is a named region a consumer
 * fills with their own markup. This registry is the SINGLE SOURCE OF TRUTH:
 * the facade derives its detection from it (and, later, docs are generated
 * from it). See docs/superpowers/specs/2026-06-23-kai-chat-composition-seams-design.md.
 */

/** `inject` = additive (the built-in region still renders, your markup is added
 *  in). `replace` = your markup stands in for the whole region — you own that
 *  region's data + events (a slotted light-DOM node can't read the component's
 *  reactive state). */
export type SeamMode = 'inject' | 'replace';

export interface SeamDef {
  /** Slot name (kebab-case). Also the `::part` name when `part` is true. */
  name: string;
  mode: SeamMode;
  /** Expose `::part(name)` on the region wrapper for consumer styling. */
  part?: boolean;
  /** One-line contract: what the consumer projects / owns. Feeds the docs. */
  doc: string;
}

/** Seams of `<kai-chat>`, in render order. */
export const CHAT_SEAMS: SeamDef[] = [
  { name: 'header-start',     mode: 'inject',  doc: 'Leading header controls, left of the title.' },
  { name: 'header-end',       mode: 'inject',  doc: 'Trailing header controls.' },
  { name: 'header',           mode: 'replace', part: true, doc: 'Full custom header; replaces the built-in title/model/context bar.' },
  { name: 'sidebar',          mode: 'inject',  part: true, doc: 'Left column (your nav / conversation list). Fixed width; use compose-your-own for resizable.' },
  { name: 'empty',            mode: 'replace', doc: 'Zero-state, shown while messages is empty.' },
  { name: 'composer',         mode: 'replace', doc: 'Full custom composer; you own submit + loading, drive the thread via messages.' },
  { name: 'composer-actions', mode: 'inject',  doc: 'Accessory row above the composer.' },
  { name: 'footer',           mode: 'inject',  part: true, doc: 'Row below the composer (disclaimers, token meter).' },
];

/**
 * Which seams have projected light-DOM content — a DIRECT child of `host`
 * carrying the matching `slot` attribute. Pure and synchronous; safe in jsdom
 * and SSR (returns all-false when `host` has no matching children). The facade
 * calls this on mount and on every childList mutation.
 */
export function readSeams(host: Element, defs: SeamDef[] = CHAT_SEAMS): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const def of defs) {
    out[def.name] = !!host.querySelector(`:scope > [slot="${def.name}"]`);
  }
  return out;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/elements/seams.test.ts`
Expected: PASS — 6 tests.

(If the `:scope` selector throws in this jsdom version, fall back to filtering direct children:
`out[def.name] = Array.from(host.children).some((c) => c.getAttribute('slot') === def.name);`
then re-run. Keep the same test assertions.)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/elements/seams.ts src/elements/seams.test.ts
git commit -m "feat(chat): typed seam registry + readSeams detector"
```

---

### Task 2: Drive the facade from the registry

**Files:**
- Modify: `src/elements/chat.tsx`

**Interfaces:**
- Consumes: `CHAT_SEAMS`, `readSeams` from `./seams` (Task 1).
- Produces: no API change — the eight `seam('…')` flags passed to `<ChatThread>` are unchanged; only their source moves from the inlined `SEAMS` array to the registry.

This is a behavior-preserving refactor. Its guard is the existing IVP staying green (Step 4) plus typecheck — there is no new unit behavior to red-green.

- [ ] **Step 1: Add the import**

In `src/elements/chat.tsx`, add to the imports at the top of the file:

```ts
import { CHAT_SEAMS, readSeams } from './seams';
```

- [ ] **Step 2: Replace the inlined detection with the registry-driven one**

In `src/elements/chat.tsx`, find the block the spike added inside the facade body:

```ts
  const SEAMS = [
    'header-start', 'header-end', 'header',
    'sidebar', 'empty', 'composer', 'composer-actions', 'footer',
  ] as const;
  const [seams, setSeams] = createSignal<Record<string, boolean>>({});
  const seam = (name: string) => seams()[name] === true;
  onMount(() => {
    const read = () => {
      const next: Record<string, boolean> = {};
      for (const name of SEAMS) next[name] = !!element.querySelector(`:scope > [slot="${name}"]`);
      setSeams(next);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true });
    onCleanup(() => observer.disconnect());
  });
```

Replace it with:

```ts
  // Seam detection is driven by the CHAT_SEAMS registry (single source of truth)
  // so slot names never drift between the view, the facade, and the docs.
  const [seams, setSeams] = createSignal<Record<string, boolean>>({});
  const seam = (name: string) => seams()[name] === true;
  onMount(() => {
    const read = () => setSeams(readSeams(element, CHAT_SEAMS));
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true });
    onCleanup(() => observer.disconnect());
  });
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. (`createSignal`, `onMount`, `onCleanup` remain imported and used.)

- [ ] **Step 4: Verify the IVP still passes (refactor guard)**

Run: `npx playwright test --config playwright.seams.config.ts`
Expected: PASS — 3 tests (Inject / EmptyState / ReplaceComposer). Slot projection is unchanged because the registry lists the same eight names.

- [ ] **Step 5: Commit**

```bash
git add src/elements/chat.tsx
git commit -m "refactor(chat): drive seam detection from the registry"
```

---

### Task 3: Reflect `loading` to a host attribute

**Files:**
- Modify: `src/elements/chat.tsx`
- Test: `tests/e2e/chat-seams-ivp.spec.ts`

**Interfaces:**
- Produces: `<kai-chat>` carries a bare `loading` attribute on its host element whenever its `loading` flag is on, so slotted CSS can target `:host([loading]) ::slotted([slot="composer"])`.

- [ ] **Step 1: Write the failing test**

In `tests/e2e/chat-seams-ivp.spec.ts`, add this test inside the existing `test.describe('kai-chat composition seams IVP', …)` block:

```ts
  test('reflects loading to a host attribute for slotted CSS', async ({ page }) => {
    await page.goto(STORY('inject'));
    await expect(page.locator('kai-chat')).toBeVisible();
    await page.waitForTimeout(300);

    const before = await page.evaluate(() => document.querySelector('kai-chat')!.hasAttribute('loading'));
    expect(before).toBe(false);

    await page.evaluate(() => { (document.querySelector('kai-chat') as HTMLElement & { loading: boolean }).loading = true; });
    await page.waitForTimeout(100);
    const on = await page.evaluate(() => document.querySelector('kai-chat')!.hasAttribute('loading'));
    expect(on).toBe(true);

    await page.evaluate(() => { (document.querySelector('kai-chat') as HTMLElement & { loading: boolean }).loading = false; });
    await page.waitForTimeout(100);
    const off = await page.evaluate(() => document.querySelector('kai-chat')!.hasAttribute('loading'));
    expect(off).toBe(false);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test --config playwright.seams.config.ts -g "reflects loading"`
Expected: FAIL on the `on` assertion — the host never gains the `loading` attribute.

- [ ] **Step 3: Add the reflection effect**

In `src/elements/chat.tsx`, ensure `createEffect` is imported from `solid-js`:

```ts
import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
```

Then, inside the facade body (just after the seam-detection `onMount` block from Task 2), add:

```ts
  // Reflect streaming state to a host attribute so slotted composer/notice CSS
  // can react without reading internals (e.g. :host([loading]) ::slotted(...)).
  createEffect(() => { element.toggleAttribute('loading', flag('loading')); });
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx playwright test --config playwright.seams.config.ts -g "reflects loading"`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/elements/chat.tsx tests/e2e/chat-seams-ivp.spec.ts
git commit -m "feat(chat): reflect loading to a host attribute for slotted CSS"
```

---

### Task 4: Drop-in regression + committed IVP script

**Files:**
- Modify: `src/elements/chat-seams.stories.tsx`
- Modify: `tests/e2e/chat-seams-ivp.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: the `STORY(id)` helper and `assignedCounts` already defined in `chat-seams-ivp.spec.ts`.
- Produces: a `spikes-chat-seams--drop-in` story and an `npm run test:seams-ivp` script.

The regression locks the Global Constraint "drop-in renders unchanged": with nothing projected, the shadow tree contains **no seam slots at all** (every region is flag-gated off, and the built-in header is hidden without a title), so the shell is the original single column.

- [ ] **Step 1: Add the drop-in story**

In `src/elements/chat-seams.stories.tsx`, add at the end of the file:

```ts
// ── Drop-in baseline — NO seams projected. The shell must render exactly as it
//    did before seams existed (regression guard). ─────────────────────────────
function DropInDemo() {
  let el: ChatEl | undefined;
  onMount(() => { if (el) el.messages = thread; });
  return <kai-chat ref={(e) => (el = e as ChatEl)} style={{ display: 'block', height: '560px' }} />;
}
export const DropIn: Story = { render: () => <DropInDemo /> };
```

- [ ] **Step 2: Write the failing regression test**

In `tests/e2e/chat-seams-ivp.spec.ts`, add inside the `test.describe` block:

```ts
  test('DROP-IN: no seams projected → no seam slots in the shadow tree', async ({ page }) => {
    await page.goto(STORY('drop-in'));
    await expect(page.locator('kai-chat')).toBeVisible();
    await page.waitForTimeout(700);
    const slotCount = await page.evaluate(() => {
      const root = document.querySelector('kai-chat')?.shadowRoot;
      return root ? root.querySelectorAll('slot[name]').length : -1;
    });
    expect(slotCount).toBe(0);
    await page.screenshot({ path: 'spike-screens/seams-dropin.png' });
  });
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx playwright test --config playwright.seams.config.ts -g "DROP-IN"`
Expected: FAIL — the story id `drop-in` 404s until Storybook recompiles, or (once it loads) the assertion runs. If it fails only because the story isn't found, confirm Step 1 saved and re-run.

- [ ] **Step 4: Run it to verify it passes**

Run: `npx playwright test --config playwright.seams.config.ts -g "DROP-IN"`
Expected: PASS — `slotCount === 0` (no title ⇒ no header ⇒ no header-start/-end slots; nothing projected ⇒ every flag-gated region collapsed).

- [ ] **Step 5: Add the committed IVP script**

In `package.json`, in `"scripts"`, add a line directly after the existing `"test:composer-ivp"` entry:

```json
    "test:seams-ivp": "playwright test --config playwright.seams.config.ts",
```

- [ ] **Step 6: Run the full seams IVP via the script**

Run: `npm run test:seams-ivp`
Expected: PASS — 5 tests (Inject, EmptyState, ReplaceComposer, loading reflection, DROP-IN).

- [ ] **Step 7: Run the unit suite to confirm nothing regressed**

Run: `npx vitest run src/elements/seams.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 8: Commit**

```bash
git add src/elements/chat-seams.stories.tsx tests/e2e/chat-seams-ivp.spec.ts package.json spike-screens/seams-dropin.png
git commit -m "test(chat): drop-in regression + committed seams IVP script"
```

---

## Self-Review

**1. Spec coverage (W1 rows of the spec's rollout):**
- "Extract `seams.ts`" → Task 1. ✓
- "Wire the facade from it" → Task 2. ✓
- "`loading` reflection" → Task 3. ✓
- "Promote the spike's stories/IVP into the committed suite" → Task 4 (script + drop-in; the spike stories/IVP were already committed in `6166976`). ✓
- "Assert the drop-in (no-seam) snapshot is unchanged" → Task 4 Step 2. ✓
- "Wire the docs generator from it" → **deliberately split out** (see File Structure "Out of scope"); not silently dropped. ✓ (gap is documented, not a miss)

**2. Placeholder scan:** No TBD/TODO; every code step shows complete code; commands have expected output. ✓

**3. Type consistency:** `SeamDef`/`SeamMode`/`CHAT_SEAMS`/`readSeams` names are identical across Tasks 1–2. The `seam('name')` accessor and the eight slot names match `chat-thread.tsx` (unchanged) and `CHAT_SEAMS`. The `loading` attribute name matches the `flag('loading')` source. ✓
