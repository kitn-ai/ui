# Card Resolution (chromed read-only state) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user acts on an interactive card (confirm / choice / task-list / form), the card flips to a chromed **read-only** view showing only the resolved answer — optimistically on action, and re-hydratable from a `resolution` field on the envelope so it survives reload.

**Architecture:** Add an optional `CardResolution` to `CardEnvelope` (the two terminal verbs, `action` + `submit-data`, minus `cardId`). A shared `useCardResolution` helper computes `props.resolution ?? localResolution()` and resets local state on a new `data` identity. Each card calls `setLocal(...)` in its terminal handler (alongside the unchanged emit) and renders a read-only branch when resolved. The dispatcher (`card-registry`, `<kc-cards>`) forwards `envelope.resolution`; the element facades accept a `resolution` property.

**Tech Stack:** SolidJS (never destructure props), TypeScript, vitest + @solidjs/testing-library, Storybook (a11y gate `error`, light+dark), web components via `defineWebComponent`.

**Spec:** `docs/superpowers/specs/2026-06-14-card-resolved-readonly-design.md`

**Conventions reminder:**
- Run all tests from the **main checkout** (worktree vitest is broken).
- SolidJS: never destructure props; use `splitProps`/`mergeProps`.
- Commit after each task. Pre-1.0: commits use `feat:`/`test:`/`refactor:`; release-please bumps the minor.
- Gate before done: `npm run build && npm run typecheck && npm run test && npm run test:react && npm run test:storybook`.

---

## File Structure

**Create:**
- `src/components/use-card-resolution.ts` — shared resolution controller (precedence + reset + optimistic flag).
- `tests/components/use-card-resolution.test.tsx` — its unit tests.
- `src/primitives/card-resolution.ts` — `resolutionFromEvent` + `applyResolution` round-trip helpers.
- `tests/primitives/card-resolution.test.ts` — their unit tests.

**Modify:**
- `src/primitives/card-contract.ts` — `CardResolution` type + `CardEnvelope.resolution`.
- `src/components/confirm-card.tsx` — resolution model + read-only branch + `resolution` prop.
- `src/components/choice-card.tsx` — same.
- `src/components/task-list-card.tsx` — same.
- `src/components/form.tsx` — same + `summarizeForm`/`formatFieldValue` pure helpers.
- `src/index.ts` — re-export `applyResolution` / `resolutionFromEvent` (+ `CardResolution`).
- `src/primitives/card-registry.tsx` — forward `resolution` to the 4 interactive wrappers.
- `src/elements/cards.tsx` — `CardSlot` forwards `resolution` as a DOM property.
- `src/elements/confirm-card.tsx`, `choice.tsx`, `form.tsx`, `task-list-card.tsx` — accept + forward `resolution`.
- `*.stories.tsx` for the 4 cards — add a "Resolved" story.
- `tests/components/*` (confirm/choice/task-list/form) and `tests/elements/*` — new + updated assertions.
- `src/stories/generative-ui/*` Overview MDX — round-trip note (path confirmed in Task 9).

---

## Task 1: Contract — `CardResolution` + `CardEnvelope.resolution`

**Files:**
- Modify: `src/primitives/card-contract.ts`
- Test: `tests/primitives/card-resolution-type.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `tests/primitives/card-resolution-type.test.ts`:

```ts
// Construction/shape test for the additive resolution channel. Pure types have no
// runtime, so this asserts the values are assignable and the union discriminates.
import { test, expect } from 'vitest';
import type { CardEnvelope, CardResolution } from '../../src/primitives/card-contract';
import { CARD_CONTRACT_VERSION } from '../../src/primitives/card-contract';

test('resolution is an optional, additive field (version unchanged)', () => {
  expect(CARD_CONTRACT_VERSION).toBe('1');
});

test('CardEnvelope accepts an action resolution', () => {
  const env: CardEnvelope = {
    type: 'confirm',
    id: 'c1',
    data: {},
    resolution: { kind: 'action', action: 'approve', payload: { n: 1 }, at: '2026-06-14T00:00:00Z' },
  };
  const r = env.resolution as Extract<CardResolution, { kind: 'action' }>;
  expect(r.action).toBe('approve');
});

test('CardEnvelope accepts a submit-data resolution', () => {
  const env: CardEnvelope = {
    type: 'form',
    id: 'f1',
    data: {},
    resolution: { kind: 'submit-data', data: { email: 'a@b.c' } },
  };
  const r = env.resolution as Extract<CardResolution, { kind: 'submit-data' }>;
  expect((r.data as { email: string }).email).toBe('a@b.c');
});

test('an envelope without resolution is still valid', () => {
  const env: CardEnvelope = { type: 'confirm', id: 'c2', data: {} };
  expect(env.resolution).toBeUndefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/primitives/card-resolution-type.test.ts`
Expected: FAIL — `CardResolution` not exported / `resolution` not a known property (TS error).

- [ ] **Step 3: Add the type + field**

In `src/primitives/card-contract.ts`, after the `CardEvent` block, add:

```ts
/** How a card was resolved by the user — the re-hydration channel for the chromed
 *  read-only state. Mirrors the two terminal CardEvents (minus `cardId`): the
 *  resolution is just the event that resolved the card. `at` is optional ISO-8601
 *  provenance (data only; never rendered). Additive — does not bump the contract
 *  version. */
export type CardResolution =
  | { kind: 'action'; action: string; payload?: unknown; at?: string }
  | { kind: 'submit-data'; data: unknown; at?: string };
```

And add the optional field to `CardEnvelope`:

```ts
export interface CardEnvelope<TType extends string = string, TData = unknown> {
  type: TType;
  id: string;
  data: TData;
  title?: string;
  /** Set when the user has resolved this card; renders the chromed read-only view. */
  resolution?: CardResolution;
}
```

- [ ] **Step 4: Run test + typecheck to verify pass**

Run: `npx vitest run tests/primitives/card-resolution-type.test.ts && npm run typecheck`
Expected: PASS; typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/primitives/card-contract.ts tests/primitives/card-resolution-type.test.ts
git commit -m "feat(cards): add CardResolution re-hydration field to the card contract"
```

---

## Task 2: Shared `useCardResolution` helper

**Files:**
- Create: `src/components/use-card-resolution.ts`
- Test: `tests/components/use-card-resolution.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/use-card-resolution.test.tsx`:

```tsx
import { test, expect, afterEach } from 'vitest';
import { render } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { useCardResolution } from '../../src/components/use-card-resolution';
import type { CardResolution } from '../../src/primitives/card-contract';

afterEach(() => { document.body.innerHTML = ''; });

test('prop resolution takes precedence and is not optimistic', () => {
  let ctl!: ReturnType<typeof useCardResolution>;
  render(() => {
    ctl = useCardResolution({
      prop: () => ({ kind: 'action', action: 'a' }) as CardResolution,
      data: () => ({}),
    });
    return <div />;
  });
  expect(ctl.isResolved()).toBe(true);
  expect(ctl.isOptimistic()).toBe(false);
  expect(ctl.resolution()).toEqual({ kind: 'action', action: 'a' });
});

test('setLocal resolves optimistically when no prop is present', () => {
  let ctl!: ReturnType<typeof useCardResolution>;
  render(() => {
    ctl = useCardResolution({ prop: () => undefined, data: () => ({}) });
    return <div />;
  });
  expect(ctl.isResolved()).toBe(false);
  ctl.setLocal({ kind: 'submit-data', data: { x: 1 } });
  expect(ctl.isResolved()).toBe(true);
  expect(ctl.isOptimistic()).toBe(true);
});

test('a new data identity clears the local resolution', () => {
  const [data, setData] = createSignal<object>({ v: 1 });
  let ctl!: ReturnType<typeof useCardResolution>;
  render(() => {
    ctl = useCardResolution({ prop: () => undefined, data });
    return <div />;
  });
  ctl.setLocal({ kind: 'action', action: 'a' });
  expect(ctl.isResolved()).toBe(true);
  setData({ v: 2 });
  expect(ctl.isResolved()).toBe(false);
});

test('prop keeps the card resolved across a data change', () => {
  const [data, setData] = createSignal<object>({ v: 1 });
  let ctl!: ReturnType<typeof useCardResolution>;
  render(() => {
    ctl = useCardResolution({
      prop: () => ({ kind: 'action', action: 'a' }) as CardResolution,
      data,
    });
    return <div />;
  });
  setData({ v: 2 });
  expect(ctl.isResolved()).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/use-card-resolution.test.tsx`
Expected: FAIL — module `use-card-resolution` not found.

- [ ] **Step 3: Implement the helper**

Create `src/components/use-card-resolution.ts`:

```ts
// Shared resolution controller for interactive cards. Precedence:
//   props.resolution  (host-driven / re-hydrated)   >   local optimistic flip   >   none
// A new `data` identity clears the local flip (a fresh card definition is interactive
// again), but an explicit prop keeps it resolved. `isOptimistic` is true only for a
// flip made this session (used to announce via role="status"; silent on re-hydrate).
import { createSignal, createMemo, createEffect, on, type Accessor } from 'solid-js';
import type { CardResolution } from '../primitives/card-contract';

export interface ResolutionController {
  resolution: Accessor<CardResolution | undefined>;
  isResolved: Accessor<boolean>;
  isOptimistic: Accessor<boolean>;
  setLocal: (r: CardResolution) => void;
}

export function useCardResolution(opts: {
  prop: Accessor<CardResolution | undefined>;
  data: Accessor<unknown>;
}): ResolutionController {
  const [local, setLocal] = createSignal<CardResolution | undefined>(undefined);
  // Reset the optimistic flip when a NEW data identity arrives (deferred so mount
  // doesn't clobber an initial prop). The prop still wins via the memo below.
  createEffect(on(opts.data, () => setLocal(undefined), { defer: true }));
  const resolution = createMemo(() => opts.prop() ?? local());
  const isResolved = createMemo(() => resolution() !== undefined);
  const isOptimistic = createMemo(() => opts.prop() === undefined && local() !== undefined);
  return { resolution, isResolved, isOptimistic, setLocal };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/use-card-resolution.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/use-card-resolution.ts tests/components/use-card-resolution.test.tsx
git commit -m "feat(cards): add useCardResolution controller (prop > optimistic precedence)"
```

---

## Task 3: confirm-card read-only

**Files:**
- Modify: `src/components/confirm-card.tsx`
- Test: `tests/components/confirm-card-resolved.test.tsx` (create), `tests/components/confirm-logic.test.ts` (verify still green)

- [ ] **Step 1: Write the failing test**

Create `tests/components/confirm-card-resolved.test.tsx`:

```tsx
import { test, expect, afterEach } from 'vitest';
import { render } from '@solidjs/testing-library';
import { ConfirmCard, type ConfirmCardData } from '../../src/components/confirm-card';
import type { CardEvent, CardHost, CardContext } from '../../src/primitives/card-contract';

afterEach(() => { document.body.innerHTML = ''; });

function makeHost(): { host: CardHost; events: CardEvent[] } {
  const events: CardEvent[] = [];
  const ctx: CardContext = { theme: { mode: 'light' }, locale: 'en' };
  return { events, host: { context: () => ctx, emit: (e) => events.push(e) } };
}

const DATA: ConfirmCardData = {
  body: 'Apply 3 migrations?',
  actions: [
    { id: 'approve', label: 'Run migration', style: 'primary' },
    { id: 'reject', label: 'Cancel' },
  ],
};

test('re-hydrated resolution renders read-only with the chosen label, no buttons', () => {
  const { host } = makeHost();
  const { queryByRole, getByText } = render(() => (
    <ConfirmCard host={host} cardId="c1" data={DATA} resolution={{ kind: 'action', action: 'approve' }} />
  ));
  expect(getByText('Run migration')).toBeTruthy();
  // The interactive buttons are gone (read-only).
  expect(queryByRole('button', { name: 'Cancel' })).toBeNull();
});

test('unknown resolved action id falls back to the raw id', () => {
  const { host } = makeHost();
  const { getByText } = render(() => (
    <ConfirmCard host={host} cardId="c1" data={DATA} resolution={{ kind: 'action', action: 'ghost' }} />
  ));
  expect(getByText('ghost')).toBeTruthy();
});

test('re-hydrated render does not emit a new action event', () => {
  const { host, events } = makeHost();
  render(() => (
    <ConfirmCard host={host} cardId="c1" data={DATA} resolution={{ kind: 'action', action: 'approve' }} />
  ));
  expect(events.some((e) => e.kind === 'action')).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/confirm-card-resolved.test.tsx`
Expected: FAIL — `resolution` is not a `ConfirmCardProps` member; buttons still render.

- [ ] **Step 3: Implement read-only branch**

In `src/components/confirm-card.tsx`:

1. Add the import:
```ts
import { useCardResolution } from './use-card-resolution';
import type { CardEnvelope, CardEvent, CardHost, CardResolution } from '../primitives/card-contract';
```
(extend the existing contract import to include `CardResolution`.)

2. Add `resolution` to `ConfirmCardProps`:
```ts
  /** When set, render the chromed read-only view instead of the buttons. */
  resolution?: CardResolution;
```

3. Add `'resolution'` to the `splitProps` key list.

4. Replace the local `resolved` signal + its reset effect with the controller:
```ts
  const res = useCardResolution({ prop: () => local.resolution, data: () => local.data });
```
Remove `const [resolved, setResolved] = createSignal...` and the
`createEffect(on(() => local.data, () => setResolved(undefined)))` line.

5. In `onAction`, swap the guard + flip:
```ts
  const onAction = (action: ConfirmAction): void => {
    if (res.isResolved()) return; // single-shot
    emit({
      kind: 'action',
      cardId: local.cardId,
      action: action.id,
      ...(action.payload !== undefined ? { payload: action.payload } : {}),
    });
    res.setLocal({ kind: 'action', action: action.id, payload: action.payload });
  };
```

6. Replace the `data-kc-resolved` effect to read the controller:
```ts
  createEffect(() => {
    const el = local.hostElement;
    if (!el) return;
    const r = res.resolution();
    if (r && r.kind === 'action') el.setAttribute('data-kc-resolved', r.action);
    else el.removeAttribute('data-kc-resolved');
  });
```

7. Add the resolved label memo (place near `defaultId`):
```ts
  const resolvedAction = createMemo(() => {
    const r = res.resolution();
    if (!r || r.kind !== 'action') return undefined;
    const found = actions().find((a) => a.id === r.action);
    return { label: found?.label ?? r.action };
  });
```

8. In the JSX, make the `Card`'s `actions` slot conditional. Wrap the existing
button-row markup in `<Show when={!res.isResolved()}>` and add the read-only fallback:
```tsx
        <Card
          heading={local.heading}
          actions={
            <Show
              when={!res.isResolved()}
              fallback={
                <div
                  class="ml-auto flex items-center gap-2 text-sm font-medium text-foreground"
                  role={res.isOptimistic() ? 'status' : undefined}
                >
                  <Check size={16} aria-hidden="true" />
                  <span>{resolvedAction()?.label}</span>
                </div>
              }
            >
              <div class="flex w-full flex-wrap items-center justify-between gap-2">
                {/* …existing dismiss button + <For each={actions()}> button row, unchanged… */}
              </div>
            </Show>
          }
        >
```
Inside the `<For>` button, the `disabled`/`aria-pressed`/`isChosen` logic can stay
(it is now only reached when not resolved, so it is effectively dead for the resolved
state but harmless). Keep the body block (`heading`/`body`/danger banner) unchanged.

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run tests/components/confirm-card-resolved.test.tsx tests/components/confirm-logic.test.ts`
Expected: PASS. If `confirm-logic.test.ts` has an assertion about post-click disabled
buttons remaining in the DOM, update it to assert the read-only view: the chosen label
is present and the other action button is absent (mirror the resolved test above).

- [ ] **Step 5: Run the element + full component suite for regressions**

Run: `npx vitest run tests/elements/confirm-card-element.test.tsx`
Expected: PASS. The element test clicks then asserts a single `action` event — still true.
If it asserts the other button is present-but-disabled after the click, change it to
assert that button is now absent.

- [ ] **Step 6: Commit**

```bash
git add src/components/confirm-card.tsx tests/components/confirm-card-resolved.test.tsx tests/components/confirm-logic.test.ts tests/elements/confirm-card-element.test.tsx
git commit -m "feat(cards): kc-confirm chromed read-only resolved state"
```

---

## Task 4: choice-card read-only

**Files:**
- Modify: `src/components/choice-card.tsx`
- Test: `tests/components/choice-card-resolved.test.tsx` (create), `tests/components/choice-card.test.tsx` (verify/adjust)

- [ ] **Step 1: Write the failing test**

Create `tests/components/choice-card-resolved.test.tsx`:

```tsx
import { test, expect, afterEach } from 'vitest';
import { render } from '@solidjs/testing-library';
import { ChoiceCard } from '../../src/components/choice-card';
import type { CardEvent, CardHost, CardContext } from '../../src/primitives/card-contract';

afterEach(() => { document.body.innerHTML = ''; });

function makeHost(): { host: CardHost; events: CardEvent[] } {
  const events: CardEvent[] = [];
  const ctx: CardContext = { theme: { mode: 'light' }, locale: 'en' };
  return { events, host: { context: () => ctx, emit: (e) => events.push(e) } };
}

const DATA = {
  prompt: 'Which plan?',
  options: [
    { id: 'free', label: 'Free' },
    { id: 'pro', label: 'Pro', meta: '$20/mo' },
  ],
};

test('re-hydrated resolution shows only the chosen option, no radiogroup', () => {
  const { host } = makeHost();
  const { getByText, queryByText, queryByRole } = render(() => (
    <ChoiceCard host={host} cardId="c1" data={DATA} resolution={{ kind: 'action', action: 'pro' }} />
  ));
  expect(getByText('Pro')).toBeTruthy();
  expect(queryByText('Free')).toBeNull();        // unchosen option removed
  expect(queryByRole('radiogroup')).toBeNull();  // not interactive
});

test('__other__ resolution shows the typed free text', () => {
  const { host } = makeHost();
  const { getByText } = render(() => (
    <ChoiceCard
      host={host}
      cardId="c1"
      data={DATA}
      resolution={{ kind: 'action', action: '__other__', payload: { text: 'A la carte' } }}
    />
  ));
  expect(getByText(/A la carte/)).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/choice-card-resolved.test.tsx`
Expected: FAIL — `resolution` not a prop; both options still render.

- [ ] **Step 3: Implement read-only branch**

In `src/components/choice-card.tsx`:

1. Extend the contract import with `CardResolution`; add:
```ts
import { useCardResolution } from './use-card-resolution';
```
2. Add `resolution?: CardResolution;` to `ChoiceCardProps` and `'resolution'` to `splitProps`.
3. Replace `const [resolved, setResolved] = createSignal...` with:
```ts
  const res = useCardResolution({ prop: () => local.resolution, data: () => local.data });
```
   In the reset effect `createEffect(on(() => local.data, () => { ... }))`, remove the
   `setResolved(undefined)` line (the controller handles it); keep the `setOtherOpen`,
   `setOtherText`, `setFocusIndex` resets.
4. Replace every `resolved()` read with `res.resolution()?.kind === 'action' ? (res.resolution() as Extract<CardResolution,{kind:'action'}>).action : undefined` — simpler: add a memo:
```ts
  const resolvedId = createMemo(() => {
    const r = res.resolution();
    return r && r.kind === 'action' ? r.action : undefined;
  });
```
   Then: `checked = () => resolvedId() === opt.id`; guards `if (res.isResolved()) return;`
   in `pick`, `submitOther`, `onGroupKeyDown`; `tabStop` uses `res.isResolved()`.
5. In `emitChoice` and `submitOther`, after `emit(...)`, replace `setResolved(...)` with
   `res.setLocal({ kind: 'action', action: opt.id, payload: opt.payload })` and
   `res.setLocal({ kind: 'action', action: OTHER_ACTION, payload: { text } })` respectively.
6. Update the `data-kc-resolved` effect to use `resolvedId()`.
7. Add the resolved view. Add a memo:
```ts
  const resolvedChoice = createMemo(() => {
    const r = res.resolution();
    if (!r || r.kind !== 'action') return undefined;
    if (r.action === OTHER_ACTION) {
      const text = (r.payload as { text?: string } | undefined)?.text ?? '';
      return { other: true as const, text };
    }
    const opt = baseOptions().find((o) => o.id === r.action);
    return { other: false as const, opt, id: r.action };
  });
```
   Wrap the `<div role="radiogroup">…</div>` (and the `allowOther` `<Show>` block) in a
   `<Show when={!res.isResolved()} fallback={<ResolvedChoice choice={resolvedChoice()!} optimistic={res.isOptimistic()} />}>`.
8. Add the static presenter at the bottom of the file:
```tsx
function ResolvedChoice(props: {
  choice: { other: true; text: string } | { other: false; opt?: ChoiceOption; id: string };
  optimistic: boolean;
}): JSX.Element {
  const c = props.choice;
  return (
    <div
      class="flex items-center gap-3 rounded-lg border border-input bg-accent px-3 py-2.5 text-sm font-medium text-accent-foreground"
      role={props.optimistic ? 'status' : undefined}
    >
      <Check size={16} aria-hidden="true" />
      <Show
        when={!c.other}
        fallback={<span>Other: {c.other ? c.text : ''}</span>}
      >
        <span>{!c.other ? (c.opt?.label ?? c.id) : ''}</span>
        <Show when={!c.other && c.opt?.meta}>
          <span class="ml-auto text-xs font-normal text-muted-foreground">{!c.other ? c.opt?.meta : ''}</span>
        </Show>
      </Show>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run tests/components/choice-card-resolved.test.tsx tests/components/choice-card.test.tsx tests/components/choice-logic.test.ts`
Expected: PASS. In `choice-card.test.tsx`, the "single-shot: a second pick does not emit
again" test clicks `Pro`, then clicks again — after the first click only `Pro` remains in
the DOM, so a second `getByText('Free')`/click target may be gone. Update that test to
re-click the now-rendered chosen row (or assert exactly one `action` event after a second
click on the resolved view), keeping the single-emit assertion.

- [ ] **Step 5: Commit**

```bash
git add src/components/choice-card.tsx tests/components/choice-card-resolved.test.tsx tests/components/choice-card.test.tsx
git commit -m "feat(cards): kc-choice chromed read-only resolved state"
```

---

## Task 5: task-list-card read-only

**Files:**
- Modify: `src/components/task-list-card.tsx`
- Test: `tests/components/task-list-resolved.test.tsx` (create), `tests/components/task-list-logic.test.ts` (verify)

- [ ] **Step 1: Write the failing test**

Create `tests/components/task-list-resolved.test.tsx`:

```tsx
import { test, expect, afterEach } from 'vitest';
import { render } from '@solidjs/testing-library';
import { TaskListCard } from '../../src/components/task-list-card';
import type { CardEvent, CardHost, CardContext } from '../../src/primitives/card-contract';

afterEach(() => { document.body.innerHTML = ''; });

function makeHost(): { host: CardHost; events: CardEvent[] } {
  const events: CardEvent[] = [];
  const ctx: CardContext = { theme: { mode: 'light' }, locale: 'en' };
  return { events, host: { context: () => ctx, emit: (e) => events.push(e) } };
}

const DATA = {
  tasks: [
    { id: 'sum', label: 'Executive summary' },
    { id: 'data', label: 'Raw data' },
    { id: 'charts', label: 'Charts' },
  ],
};

test('re-hydrated resolution shows N-of-M and the chosen labels', () => {
  const { host } = makeHost();
  const { getByText, queryByRole } = render(() => (
    <TaskListCard
      host={host}
      cardId="t1"
      data={DATA}
      resolution={{ kind: 'submit-data', data: { selected: ['sum', 'charts'] } }}
    />
  ));
  expect(getByText(/Selected 2 of 3/)).toBeTruthy();
  expect(getByText('Executive summary')).toBeTruthy();
  expect(getByText('Charts')).toBeTruthy();
  // No interactive Continue button in the read-only view.
  expect(queryByRole('button')).toBeNull();
});

test('empty selection reads "None selected"', () => {
  const { host } = makeHost();
  const { getByText } = render(() => (
    <TaskListCard host={host} cardId="t1" data={DATA} resolution={{ kind: 'submit-data', data: { selected: [] } }} />
  ));
  expect(getByText(/None selected/)).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/task-list-resolved.test.tsx`
Expected: FAIL — `resolution` not a prop; checklist + button still render.

- [ ] **Step 3: Implement read-only branch**

In `src/components/task-list-card.tsx`:

1. Add imports: `useCardResolution` and `CardResolution` (extend the contract import).
2. Add `resolution?: CardResolution;` to the props interface + `'resolution'` to `splitProps`.
3. Add the controller:
```ts
  const res = useCardResolution({ prop: () => local.resolution, data: () => local.data });
```
   Keep the existing `submitted` signal usage only if other code needs it; otherwise
   replace `setSubmitted(true)` paths. Simplest: keep `submitted` for the in-card "Submitted"
   affordance during a live session BUT drive the read-only switch off `res.isResolved()`.
   In `onSubmit` (the confirm handler that emits), after `emit(...)` add:
```ts
   res.setLocal({ kind: 'submit-data', data: result });
```
   and change its single-shot guard to `if (res.isResolved()) return;`.
4. Add a memo computing the resolved summary:
```ts
  const resolvedSummary = createMemo(() => {
    const r = res.resolution();
    if (!r || r.kind !== 'submit-data') return undefined;
    const ids: string[] = Array.isArray((r.data as { selected?: unknown })?.selected)
      ? ((r.data as { selected: string[] }).selected)
      : [];
    const all = tasks();
    const chosen = all.filter((t) => ids.includes(t.id)).map((t) => t.label);
    return { count: chosen.length, total: all.length, labels: chosen };
  });
```
5. Wrap the interactive body + actions in `<Show when={!res.isResolved()} fallback={…}>`.
   The fallback (inside the `Card`):
```tsx
  <div class="flex flex-col gap-2" role={res.isOptimistic() ? 'status' : undefined}>
    <p class="flex items-center gap-2 text-sm font-medium text-foreground">
      <Check size={16} aria-hidden="true" />
      <span>Selected {resolvedSummary()?.count} of {resolvedSummary()?.total}</span>
    </p>
    <Show
      when={(resolvedSummary()?.labels.length ?? 0) > 0}
      fallback={<p class="text-sm text-muted-foreground">None selected</p>}
    >
      <ul class="list-disc pl-5 text-sm text-foreground">
        <For each={resolvedSummary()?.labels}>{(l) => <li>{l}</li>}</For>
      </ul>
    </Show>
  </div>
```
   Import `Check` from `lucide-solid` if not already imported.
6. Update any `data-kc-resolved` host effect (add one mirroring the others if the card
   does not yet set it): set `data-kc-resolved="submitted"` when `res.isResolved()`.

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run tests/components/task-list-resolved.test.tsx tests/components/task-list-logic.test.ts`
Expected: PASS. If a logic test asserts the post-submit disabled-but-present checkboxes,
update it to assert the read-only summary (count + labels, no button).

- [ ] **Step 5: Commit**

```bash
git add src/components/task-list-card.tsx tests/components/task-list-resolved.test.tsx tests/components/task-list-logic.test.ts
git commit -m "feat(cards): kc-task-list chromed read-only resolved state"
```

---

## Task 6: form read-only + summary helpers

**Files:**
- Modify: `src/components/form.tsx`
- Test: `tests/components/form-summary.test.ts` (create), `tests/components/form-resolved.test.tsx` (create), `tests/components/form-mapping.test.ts` (verify)

- [ ] **Step 1: Write the failing test for the pure helpers**

Create `tests/components/form-summary.test.ts`:

```ts
import { test, expect } from 'vitest';
import { summarizeForm, formatFieldValue } from '../../src/components/form';
import type { FormDefinition } from '../../src/components/form';

const DEF: FormDefinition = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Full name' },
    optIn: { type: 'boolean', title: 'Email me' },
    tags: { type: 'array', title: 'Tags' },
    secret: { type: 'string', title: 'Password', 'x-kc-widget': 'password' },
    notes: { type: 'string', title: 'Notes' },
  },
  'x-kc-order': ['name', 'optIn', 'tags', 'secret', 'notes'],
};

test('formatFieldValue handles booleans, arrays, password, and empties', () => {
  expect(formatFieldValue({ type: 'boolean' }, true)).toBe('Yes');
  expect(formatFieldValue({ type: 'boolean' }, false)).toBe('No');
  expect(formatFieldValue({ type: 'array' }, ['a', 'b'])).toBe('a, b');
  expect(formatFieldValue({ type: 'array' }, [])).toBe('—');
  expect(formatFieldValue({ type: 'string', 'x-kc-widget': 'password' }, 'hunter2')).toBe('••••');
  expect(formatFieldValue({ type: 'string' }, '')).toBe('—');
  expect(formatFieldValue({ type: 'string' }, 'hi')).toBe('hi');
});

test('summarizeForm follows x-kc-order and resolves labels', () => {
  const rows = summarizeForm(DEF, { name: 'Jane', optIn: false, tags: ['x'], secret: 'p', notes: '' });
  expect(rows.map((r) => r.label)).toEqual(['Full name', 'Email me', 'Tags', 'Password', 'Notes']);
  expect(rows.map((r) => r.value)).toEqual(['Jane', 'No', 'x', '••••', '—']);
});

test('summarizeForm falls back to declaration order and key labels', () => {
  const rows = summarizeForm({ type: 'object', properties: { a: { type: 'string' } } }, { a: '1' });
  expect(rows).toEqual([{ key: 'a', label: 'a', value: '1' }]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/form-summary.test.ts`
Expected: FAIL — `summarizeForm`/`formatFieldValue` not exported.

- [ ] **Step 3: Implement the pure helpers**

In `src/components/form.tsx`, add (near the other exported helpers):

```ts
export interface FormSummaryRow { key: string; label: string; value: string; }

/** Format one field's value for the read-only summary. */
export function formatFieldValue(field: FormField | undefined, raw: unknown): string {
  if (field?.['x-kc-widget'] === 'password') {
    return raw == null || raw === '' ? '—' : '••••';
  }
  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No';
  if (raw == null || raw === '') return '—';
  if (Array.isArray(raw)) return raw.length ? raw.map((v) => String(v)).join(', ') : '—';
  return String(raw);
}

/** Build the label→value rows for a submitted form, honoring x-kc-order. */
export function summarizeForm(def: FormDefinition, data: Record<string, unknown>): FormSummaryRow[] {
  const props = def.properties ?? {};
  const ordered =
    Array.isArray(def['x-kc-order']) && def['x-kc-order']!.length > 0
      ? def['x-kc-order']!.filter((k) => k in props)
      : Object.keys(props);
  return ordered.map((key) => {
    const field = props[key];
    return { key, label: field?.title ?? key, value: formatFieldValue(field, data[key]) };
  });
}
```

- [ ] **Step 4: Run helper test to verify pass**

Run: `npx vitest run tests/components/form-summary.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing component test**

Create `tests/components/form-resolved.test.tsx`:

```tsx
import { test, expect, afterEach } from 'vitest';
import { render } from '@solidjs/testing-library';
import { Form, type FormDefinition } from '../../src/components/form';
import type { CardEvent, CardHost, CardContext } from '../../src/primitives/card-contract';

afterEach(() => { document.body.innerHTML = ''; });

function makeHost(): { host: CardHost; events: CardEvent[] } {
  const events: CardEvent[] = [];
  const ctx: CardContext = { theme: { mode: 'light' }, locale: 'en' };
  return { events, host: { context: () => ctx, emit: (e) => events.push(e) } };
}

const DEF: FormDefinition = {
  type: 'object',
  title: 'Book a demo',
  properties: { name: { type: 'string', title: 'Full name' }, optIn: { type: 'boolean', title: 'Email me' } },
  'x-kc-order': ['name', 'optIn'],
};

test('re-hydrated form renders a read-only dl summary, no inputs', () => {
  const { host } = makeHost();
  const { getByText, container } = render(() => (
    <Form host={host} cardId="f1" data={DEF} resolution={{ kind: 'submit-data', data: { name: 'Jane', optIn: true } }} />
  ));
  expect(getByText('Full name')).toBeTruthy();
  expect(getByText('Jane')).toBeTruthy();
  expect(getByText('Email me')).toBeTruthy();
  expect(getByText('Yes')).toBeTruthy();
  expect(container.querySelector('input')).toBeNull(); // no live inputs
  expect(container.querySelector('dl')).toBeTruthy();
});
```

- [ ] **Step 6: Run it to verify it fails, then implement the branch**

Run: `npx vitest run tests/components/form-resolved.test.tsx`
Expected: FAIL — `resolution` not a prop; inputs still render.

Implement in `src/components/form.tsx`:
1. Add imports: `useCardResolution`, and extend the contract import with `CardResolution`.
   Ensure `For` is imported (it is) and `Check` from `lucide-solid`.
2. Add `resolution?: CardResolution;` to the form props interface + `'resolution'` to `splitProps`.
3. Add the controller and drive the switch off it:
```ts
  const res = useCardResolution({ prop: () => local.resolution, data: () => local.data });
```
   In `onSubmit`, after the successful `emit({ kind: 'submit-data', ... })`, add:
```ts
   res.setLocal({ kind: 'submit-data', data: out });
```
   (keep `setSubmitted(true)` if other UI relies on it, or remove it in favor of
   `res.isResolved()`). Guard the top of `onSubmit` with `if (res.isResolved()) return;`.
4. Add a summary memo:
```ts
  const summaryRows = createMemo(() => {
    const r = res.resolution();
    if (!r || r.kind !== 'submit-data') return [];
    return summarizeForm(def(), (r.data ?? {}) as Record<string, unknown>);
  });
```
5. In the JSX, wrap the `<form>` element (and its submit/action buttons) in
   `<Show when={!res.isResolved()} fallback={<ResolvedForm rows={summaryRows()} optimistic={res.isOptimistic()} />}>`.
   Keep the `Card heading={local.heading}` wrapper; the fallback renders inside it.
6. Add the presenter at the bottom of the file:
```tsx
function ResolvedForm(props: { rows: FormSummaryRow[]; optimistic: boolean }): JSX.Element {
  return (
    <div class="flex flex-col gap-3" role={props.optimistic ? 'status' : undefined}>
      <p class="flex items-center gap-2 text-sm font-medium text-foreground">
        <Check size={16} aria-hidden="true" />
        <span>Submitted</span>
      </p>
      <dl class="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5">
        <For each={props.rows}>
          {(row) => (
            <>
              <dt class="text-xs text-muted-foreground">{row.label}</dt>
              <dd class="m-0 text-sm font-medium text-foreground">{row.value}</dd>
            </>
          )}
        </For>
      </dl>
    </div>
  );
}
```

- [ ] **Step 7: Run all form tests to verify pass**

Run: `npx vitest run tests/components/form-resolved.test.tsx tests/components/form-summary.test.ts tests/components/form-mapping.test.ts`
Expected: PASS. If `form-mapping.test.ts` asserts post-submit disabled inputs remain,
update it to assert the read-only `<dl>` (label + value, no inputs).

- [ ] **Step 8: Commit**

```bash
git add src/components/form.tsx tests/components/form-summary.test.ts tests/components/form-resolved.test.tsx tests/components/form-mapping.test.ts
git commit -m "feat(cards): kc-form chromed read-only summary (summarizeForm + dl view)"
```

---

## Task 7: Dispatcher + element plumbing (re-hydration end-to-end)

**Files:**
- Modify: `src/primitives/card-registry.tsx`
- Modify: `src/elements/cards.tsx`
- Modify: `src/elements/confirm-card.tsx`, `choice.tsx`, `form.tsx`, `task-list-card.tsx`
- Test: `tests/elements/cards-resolution.test.tsx` (create)

- [ ] **Step 1: Write the failing end-to-end test**

Create `tests/elements/cards-resolution.test.tsx`:

```tsx
import { test, expect, afterEach } from 'vitest';
import '../../src/elements/cards';
import type { CardEnvelope } from '../../src/primitives/card-contract';

const flush = () => new Promise((r) => setTimeout(r, 0));
afterEach(() => { document.querySelectorAll('kc-cards').forEach((e) => e.remove()); });

test('<kc-cards> renders a re-hydrated confirm card read-only', async () => {
  const el = document.createElement('kc-cards') as HTMLElement & { cards: CardEnvelope[] };
  el.cards = [
    {
      type: 'confirm',
      id: 'c1',
      title: 'Delete?',
      data: { body: 'Delete it?', actions: [{ id: 'yes', label: 'Delete' }, { id: 'no', label: 'Cancel' }] },
      resolution: { kind: 'action', action: 'yes' },
    },
  ];
  document.body.appendChild(el);
  await flush();
  // The chosen label renders; the Cancel button does not (read-only).
  expect(el.textContent).toContain('Delete');
  const buttons = el.querySelectorAll('button');
  expect(Array.from(buttons).some((b) => b.textContent?.trim() === 'Cancel')).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/elements/cards-resolution.test.tsx`
Expected: FAIL — `resolution` not forwarded; Cancel button present.

- [ ] **Step 3: Forward resolution in the registry**

In `src/primitives/card-registry.tsx`, add `resolution={p.envelope.resolution}` to the
four interactive wrappers (form, confirm, task-list, choice). Example for confirm:

```tsx
  confirm: (p) => (
    <ConfirmCard
      data={p.envelope.data as never}
      cardId={p.envelope.id}
      heading={p.envelope.title}
      resolution={p.envelope.resolution}
      host={p.host}
    />
  ),
```
Do the same for `form`, `'task-list'`, and `choice`. Leave `link`/`embed` unchanged.

- [ ] **Step 4: Forward resolution in `<kc-cards>`**

In `src/elements/cards.tsx`, inside `CardSlot`'s `createEffect`, after the `heading` line add:

```ts
    (ref as unknown as { resolution: unknown }).resolution = props.envelope.resolution;
```

- [ ] **Step 5: Accept `resolution` on the element facades**

In each of `src/elements/confirm-card.tsx`, `choice.tsx`, `form.tsx`, `task-list-card.tsx`:
add a `resolution?: Record<string, unknown>;` (documented) member to the `Props` interface,
add `resolution: undefined` to the `defaultProps` object, and pass
`resolution={props.resolution as CardResolution | undefined}` into the Solid component
(import `type { CardResolution }` from `../primitives/card-contract`). Example for `confirm-card.tsx`:

```tsx
interface Props extends Record<string, unknown> {
  // …existing members…
  /** Set when the user has resolved this card; renders the read-only view.
   *  Property: `el.resolution = { kind:'action', action:'…' }`. */
  resolution?: Record<string, unknown>;
}
// in defaultProps: resolution: undefined,
// in the render:   resolution={props.resolution as CardResolution | undefined}
```

- [ ] **Step 6: Run the end-to-end + existing element tests**

Run: `npx vitest run tests/elements/cards-resolution.test.tsx tests/elements/confirm-card-element.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/primitives/card-registry.tsx src/elements/cards.tsx src/elements/confirm-card.tsx src/elements/choice.tsx src/elements/form.tsx src/elements/task-list-card.tsx tests/elements/cards-resolution.test.tsx
git commit -m "feat(cards): forward resolution through dispatcher + element facades"
```

---

## Task 8: Resolved stories (a11y, light + dark)

**Files:**
- Modify: `src/elements/confirm-card.stories.tsx`, `choice.stories.tsx`, `form.stories.tsx`, `task-list-card.stories.tsx`

- [ ] **Step 1: Inspect an existing story for the established pattern**

Run: `sed -n '1,80p' src/elements/choice.stories.tsx`
Expected: shows how a story sets `el.data` / args and the meta. Match it.

- [ ] **Step 2: Add a "Resolved" story to each card**

For each card's stories file, add one story that constructs the element with both `data`
and a `resolution` property set (data-in → render-out, no interaction). Example for
`confirm-card.stories.tsx` (adapt to the file's existing render helper):

```tsx
export const Resolved: Story = {
  name: 'Resolved (read-only)',
  render: () => {
    const el = document.createElement('kc-confirm') as HTMLElement & {
      data: unknown; resolution: unknown;
    };
    el.data = { body: 'Apply 3 migrations?', actions: [
      { id: 'approve', label: 'Run migration', style: 'primary' },
      { id: 'reject', label: 'Cancel' },
    ] };
    el.resolution = { kind: 'action', action: 'approve' };
    return el;
  },
};
```
Add equivalent `Resolved` stories for choice (`{ kind:'action', action:'pro' }`),
task-list (`{ kind:'submit-data', data:{ selected:['sum','charts'] } }`), and form
(`{ kind:'submit-data', data:{ name:'Jane', optIn:true } }`).

- [ ] **Step 3: Run the storybook a11y project**

Run: `npm run test:storybook`
Expected: PASS — 0 axe violations (light + dark) including the new Resolved stories.

- [ ] **Step 4: Commit**

```bash
git add src/elements/confirm-card.stories.tsx src/elements/choice.stories.tsx src/elements/form.stories.tsx src/elements/task-list-card.stories.tsx
git commit -m "docs(stories): add resolved read-only stories for the interactive cards"
```

---

## Task 9: `applyResolution` round-trip helper

**Files:**
- Create: `src/primitives/card-resolution.ts`
- Modify: `src/index.ts` (re-export)
- Test: `tests/primitives/card-resolution.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `tests/primitives/card-resolution.test.ts`:

```ts
import { test, expect } from 'vitest';
import { applyResolution, resolutionFromEvent } from '../../src/primitives/card-resolution';
import type { CardEnvelope, CardEvent } from '../../src/primitives/card-contract';

const cards: CardEnvelope[] = [
  { type: 'confirm', id: 'c1', data: {} },
  { type: 'form', id: 'f1', data: {} },
];

test('resolutionFromEvent maps the two terminal verbs, ignores the rest', () => {
  expect(resolutionFromEvent({ kind: 'action', cardId: 'c1', action: 'yes', payload: { n: 1 } }))
    .toEqual({ kind: 'action', action: 'yes', payload: { n: 1 } });
  expect(resolutionFromEvent({ kind: 'submit-data', cardId: 'f1', data: { a: 1 } }))
    .toEqual({ kind: 'submit-data', data: { a: 1 } });
  expect(resolutionFromEvent({ kind: 'ready', cardId: 'c1' })).toBeUndefined();
  expect(resolutionFromEvent({ kind: 'error', cardId: 'c1', message: 'x' })).toBeUndefined();
});

test('applyResolution stamps the matching envelope (new array, no mutation)', () => {
  const next = applyResolution(cards, { kind: 'action', cardId: 'c1', action: 'yes' });
  expect(next).not.toBe(cards);
  expect(next[0].resolution).toEqual({ kind: 'action', action: 'yes' });
  expect(next[1].resolution).toBeUndefined();
  expect(cards[0].resolution).toBeUndefined(); // original untouched
});

test('applyResolution returns the SAME reference for non-terminal events', () => {
  const e: CardEvent = { kind: 'ready', cardId: 'c1' };
  expect(applyResolution(cards, e)).toBe(cards);
});

test('applyResolution returns the SAME reference when cardId is unknown', () => {
  const e: CardEvent = { kind: 'action', cardId: 'nope', action: 'x' };
  expect(applyResolution(cards, e)).toBe(cards);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/primitives/card-resolution.test.ts`
Expected: FAIL — module `card-resolution` not found.

- [ ] **Step 3: Implement the helpers**

Create `src/primitives/card-resolution.ts`:

```ts
// Pure consumer-facing helpers for the re-hydration round-trip. Feed a terminal
// CardEvent back into the cards array so a resolved card survives reload:
//   el.cards = applyResolution(el.cards, e.detail)
// Deterministic — no Date (the optional `at` provenance is left to the consumer).
import type { CardEnvelope, CardEvent, CardResolution } from './card-contract';

/** Map a terminal CardEvent (`action` | `submit-data`) to a CardResolution.
 *  Returns undefined for every non-terminal verb (ready/error/resize/state/…). */
export function resolutionFromEvent(event: CardEvent): CardResolution | undefined {
  if (event.kind === 'action') {
    return {
      kind: 'action',
      action: event.action,
      ...(event.payload !== undefined ? { payload: event.payload } : {}),
    };
  }
  if (event.kind === 'submit-data') {
    return { kind: 'submit-data', data: event.data };
  }
  return undefined;
}

/** Return a new cards array with the envelope matching `event.cardId` stamped with its
 *  resolution. Non-terminal events or an unknown cardId return the SAME array reference
 *  (cheap no-op; safe to call on every event). Never mutates the input. */
export function applyResolution(cards: CardEnvelope[], event: CardEvent): CardEnvelope[] {
  const resolution = resolutionFromEvent(event);
  if (!resolution) return cards;
  let changed = false;
  const next = cards.map((c) => {
    if (c.id !== event.cardId) return c;
    changed = true;
    return { ...c, resolution };
  });
  return changed ? next : cards;
}
```

- [ ] **Step 4: Re-export from the package root**

In `src/index.ts`, add to the card-contract / primitives export area:

```ts
export { applyResolution, resolutionFromEvent } from './primitives/card-resolution';
```
(If the contract types are re-exported nearby, also ensure `CardResolution` is exported
from wherever `CardEnvelope`/`CardEvent` are — add it to that `export type { … }` list.)

- [ ] **Step 5: Run test + typecheck to verify pass**

Run: `npx vitest run tests/primitives/card-resolution.test.ts && npm run typecheck`
Expected: PASS; typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add src/primitives/card-resolution.ts src/index.ts tests/primitives/card-resolution.test.ts
git commit -m "feat(cards): add applyResolution round-trip helper"
```

---

## Task 10: Docs round-trip note + full gate

**Files:**
- Modify: the Generative UI Overview MDX (find it in Step 1).

- [ ] **Step 1: Locate the Overview MDX**

Run: `grep -rl "Generative UI" src --include=*.mdx`
Expected: the Overview file path (e.g. `src/stories/generative-ui/overview.mdx`).

- [ ] **Step 2: Add a "Resolved cards" subsection**

Document: cards flip to a read-only view on action (optimistic); to make that survive a
reload, the consumer persists the resolution back onto the envelope and re-supplies the
`cards` array. Use the `applyResolution` helper from Task 9 — it is a one-liner, safe to
call on every event (non-terminal events / unknown ids return the same array):

```ts
import { applyResolution } from '@kitn.ai/chat';

el.addEventListener('kc-card', (e) => {
  el.cards = applyResolution(el.cards, e.detail); // re-render; resolved cards re-hydrate read-only
  // …then persist el.cards so the resolution survives reload.
});
```

- [ ] **Step 3: Run the full gate**

Run: `npm run build && npm run typecheck && npm run test && npm run test:react && npm run test:storybook`
Expected: build emits 40 elements; typecheck clean; all suites green; 0 axe violations.

Note: `npm run build` regenerates `element-meta.json` / `component-meta.json` /
`docs/web-components.md`. Stage whatever it changes.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs(generative-ui): document the resolved read-only round-trip"
```

- [ ] **Step 5: Open the PR**

```bash
git push -u origin <branch>
```
Open a PR to `main` titled `feat(cards): chromed read-only resolved state` summarizing the
feature, linking the spec + this plan. **Call out in the PR body that this changes the
existing optimistic post-action behavior** — the four cards previously disabled-in-place
(controls greyed but present); they now render the read-only view (unchosen controls
removed). API is additive (one optional `resolution` field) but the post-action DOM
changes. Merge via REST (see [[gh-cli-projects-classic-bug]]). Do NOT cut 1.0 —
release-please bumps the minor.

---

## Self-Review

**Spec coverage:**
- Contract `resolution` (§1) → Task 1. ✓
- Trigger/precedence/reset (§2) → Task 2 (helper) + applied per card (Tasks 3–6). ✓
- Per-card read-only views (§3): confirm → T3, choice → T4, task-list → T5, form `<dl>`/kc-detail precursor → T6. ✓
- Dispatcher/facade plumbing + controlled `<kc-cards>` (§4) → Task 7. ✓
- `applyResolution`/`resolutionFromEvent` round-trip helper (§4) → Task 9. ✓
- Consumer round-trip doc + behavior-change PR callout (§4) → Task 10. ✓
- a11y: static content, `role="status"` optimistic-only, axe light+dark (§5) → built into each card task + Tasks 8/9. ✓
- Theming: tokens + `Check`, no green (§6) → presenters use `text-foreground`/`muted`/`accent` + `Check`. ✓
- Scope: link/embed/kc-card untouched → not in any task. ✓

**Placeholder scan:** No TBD/TODO; each code step shows real code. Two intentionally
soft steps — "update existing tests that asserted disabled-in-place" — are unavoidable
(the exact prior assertions aren't known until read) and each gives the concrete new
assertion to write. The MDX path is resolved by a grep step before editing.

**Type consistency:** `useCardResolution` returns `{ resolution, isResolved, isOptimistic, setLocal }`
— used consistently in Tasks 3–6. `CardResolution` union (`action` | `submit-data`)
matches every `setLocal(...)` call and every read-only memo. `summarizeForm`/`formatFieldValue`
/`FormSummaryRow` names match between Task 6 definition and its tests. Element facades pass
`resolution` as `Record<string, unknown>` cast to `CardResolution` (matches the existing
`data` prop convention).
