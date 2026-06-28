# kai-status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `<kai-status>`, a tiny presence / "new" dot whose color comes from the kit's `tool-*` hue tokens, with an optional pulse and a styleable `::part(dot)`.

**Architecture:** Two layers, matching every leaf element in this repo. A pure presentational `Status` SolidJS component in `src/ui/status.tsx` (color + size maps, optional pulse ring, a11y). A thin `defineWebComponent` facade in `src/elements/status.tsx` that maps scalar attributes to the component and forwards `part="dot"`. The `::part(dot)` is registered in `src/elements/slots.ts` so the build emits it and the drift guard passes.

**Tech Stack:** SolidJS, Tailwind v4 (`@theme` tokens → utilities), `class-variance-authority`/maps, Vitest + `@solidjs/testing-library`, the repo's `defineWebComponent` Shadow-DOM helper.

## Global Constraints

- Elements are prefixed `kai-` (never `kitn-`). This element is `kai-status`.
- Scalars (`status`, `pulse`, `label`, `size`) are fine as HTML attributes; only arrays/objects must be JS properties (this element has none).
- No hardcoded colors. Use the `tool-*` / `muted-foreground` utilities backed by `var(--color-*)`.
- No em dashes in any doc/JSDoc/story copy (AI tell). Write terse, dev-audience copy.
- Conventional commits drive release-please. Use `feat:` for the element.
- After `npm run build:api`, run `git checkout -- src/components/component-meta.json` (it churns and is not used at runtime).
- A NEW element needs a Storybook RESTART (`lsof -ti:6006 | xargs kill; npm run storybook`) to pick up shadow CSS. HMR will not show it.
- Any `part="…"` in source MUST be registered in `slots.ts` `ELEMENT_COMPOSITION` or `slots.test.ts` (the drift guard) fails.

---

### Task 1: `Status` presentational component

**Files:**
- Create: `src/ui/status.tsx`
- Test: `src/ui/status.test.tsx`

**Interfaces:**
- Produces: `Status(props: StatusProps)` SolidJS component; `STATUS_BG: Record<StatusKind, string>`; `type StatusKind = 'new' | 'online' | 'busy' | 'away' | 'offline'`. `StatusProps` extends `JSX.HTMLAttributes<HTMLSpanElement>` with `status?: StatusKind`, `size?: 'sm' | 'md'`, `pulse?: boolean`, `label?: string`. Unknown attrs (e.g. `part`) forward to the inner dot span.

- [ ] **Step 1: Write the failing test**

```tsx
// src/ui/status.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@solidjs/testing-library';
import { Status, STATUS_BG } from './status';

afterEach(cleanup);

describe('STATUS_BG mapping', () => {
  it('maps new to the blue tool hue (the default)', () => {
    expect(STATUS_BG.new).toBe('bg-tool-blue');
  });
  it('maps the presence states to their hues', () => {
    expect(STATUS_BG.online).toBe('bg-tool-green');
    expect(STATUS_BG.busy).toBe('bg-tool-red');
    expect(STATUS_BG.away).toBe('bg-tool-amber');
    expect(STATUS_BG.offline).toBe('bg-muted-foreground');
  });
});

describe('Status', () => {
  it('renders a pulsing ring when pulse is set', () => {
    const { container } = render(() => <Status pulse status="new" />);
    expect(container.querySelector('.animate-ping')).toBeInTheDocument();
  });
  it('omits the ring when pulse is unset', () => {
    const { container } = render(() => <Status status="new" />);
    expect(container.querySelector('.animate-ping')).toBeNull();
  });
  it('is decorative (aria-hidden) without a label', () => {
    const { container } = render(() => <Status status="online" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
  it('exposes a status role + accessible name when given a label', () => {
    const { container } = render(() => <Status status="online" label="Online" />);
    expect(container.firstChild).toHaveAttribute('role', 'status');
    expect(container.firstChild).toHaveAttribute('aria-label', 'Online');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/status.test.tsx`
Expected: FAIL — cannot resolve `./status`.

- [ ] **Step 3: Write the minimal implementation**

```tsx
// src/ui/status.tsx
import { type JSX, Show, splitProps } from 'solid-js';
import { cn } from '../utils/cn';

export type StatusKind = 'new' | 'online' | 'busy' | 'away' | 'offline';

/** status → background hue utility (backed by the kit's tool-* / muted tokens). */
export const STATUS_BG: Record<StatusKind, string> = {
  new: 'bg-tool-blue',
  online: 'bg-tool-green',
  busy: 'bg-tool-red',
  away: 'bg-tool-amber',
  offline: 'bg-muted-foreground',
};

const SIZE: Record<'sm' | 'md', string> = { sm: 'size-2', md: 'size-2.5' };

export interface StatusProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  status?: StatusKind;
  size?: 'sm' | 'md';
  /** Add an animated ping ring (disabled under prefers-reduced-motion). */
  pulse?: boolean;
  /** Accessible name. With it, the dot is announced; without it, it is decorative. */
  label?: string;
}

export function Status(props: StatusProps) {
  const [local, rest] = splitProps(props, ['status', 'size', 'pulse', 'label', 'class']);
  const kind = () => local.status ?? 'new';
  return (
    <span
      class={cn('relative inline-flex', local.class)}
      role={local.label ? 'status' : undefined}
      aria-label={local.label}
      aria-hidden={local.label ? undefined : 'true'}
    >
      <Show when={local.pulse}>
        <span
          aria-hidden="true"
          class={cn(
            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 motion-reduce:hidden',
            STATUS_BG[kind()],
          )}
        />
      </Show>
      <span {...rest} class={cn('relative inline-block rounded-full', STATUS_BG[kind()], SIZE[local.size ?? 'sm'])} />
    </span>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ui/status.test.tsx`
Expected: PASS (8 assertions across 6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/status.tsx src/ui/status.test.tsx
git commit -m "feat(ui): Status dot primitive (tool-* hues, pulse, a11y)"
```

---

### Task 2: `<kai-status>` facade + part registration

**Files:**
- Create: `src/elements/status.tsx`
- Modify: `src/elements/slots.ts` (add `STATUS_PARTS` and the `ELEMENT_COMPOSITION` entry)
- Modify: `src/elements/register-impl.ts` (add the import)

**Interfaces:**
- Consumes: `Status`, `StatusKind` from `../ui/status`; `defineWebComponent` from `./define`; `PartDef`, `ELEMENT_COMPOSITION` from `./slots`.
- Produces: the registered `kai-status` custom element with attributes `status` / `pulse` / `label` / `size` / `theme` and `::part(dot)`.

- [ ] **Step 1: Register the `::part(dot)` in `slots.ts`**

Add after `ATTACHMENTS_PARTS` (around `src/elements/slots.ts:209`):

```ts
/** Styleable `::part`s of `<kai-status>`. */
export const STATUS_PARTS: PartDef[] = [
  {
    name: 'dot',
    doc: 'The status dot. Recolor or resize it from outside; the `status` prop sets the default hue.',
    recipe: 'kai-status::part(dot) { background: var(--color-tool-green) }',
  },
];
```

Then add to the `ELEMENT_COMPOSITION` map (around `src/elements/slots.ts:241`, alongside the other parts-only entries):

```ts
  'kai-status': { parts: STATUS_PARTS },
```

- [ ] **Step 2: Write the failing drift-guard run**

Run: `npx vitest run slots.test`
Expected: PASS for the registry shape now, but the guard will FAIL once Step 3 adds `part="dot"` in source without... no — registration is already done in Step 1, so this confirms the registry parses. Expected: PASS. (If it FAILS here, the `ELEMENT_COMPOSITION` entry is malformed; fix before continuing.)

- [ ] **Step 3: Write the facade**

```tsx
// src/elements/status.tsx
import { defineWebComponent } from './define';
import { Status, type StatusKind } from '../ui/status';

interface Props extends Record<string, unknown> {
  /** Presence/notification state → color. `new` (default) maps to the blue hue. */
  status?: StatusKind;
  /** Animated ping ring (off by default; respects prefers-reduced-motion). */
  pulse?: boolean;
  /** Accessible name. Without it the dot is decorative. */
  label?: string;
  /** `sm` (default) or `md`. */
  size?: 'sm' | 'md';
}

/**
 * `<kai-status>` — a small presence / new dot.
 *
 * ```html
 * <kai-status status="online" label="Online"></kai-status>
 * <kai-status status="new" pulse></kai-status>
 * ```
 * Recolor via `::part(dot)`.
 */
defineWebComponent<Props>('kai-status', {
  status: 'new',
  pulse: false,
  label: undefined,
  size: 'sm',
}, (props, { flag }) => (
  <Status
    status={(props.status as StatusKind) ?? 'new'}
    size={(props.size as 'sm' | 'md') ?? 'sm'}
    pulse={flag('pulse')}
    label={props.label as string | undefined}
    part="dot"
  />
));
```

- [ ] **Step 4: Add the registration import**

In `src/elements/register-impl.ts`, add alongside the other leaf-element imports (e.g. after `import './empty';`):

```ts
import './status';
```

- [ ] **Step 5: Run the drift guard + typecheck**

Run: `npx vitest run slots.test`
Expected: PASS — `part="dot"` in `src/elements/status.tsx` is now registered.

Run: `npx tsc --noEmit`
Expected: PASS (no type errors).

- [ ] **Step 6: Regenerate element metadata**

Run: `npm run build:api`
Then: `git checkout -- src/components/component-meta.json`
Verify: `kai-status` now appears in `src/elements/element-meta.json` with its `status`/`pulse`/`label`/`size` props and the `dot` part. Confirm `grep -c '"tag": "kai-status"' src/elements/element-meta.json` returns `1`.

- [ ] **Step 7: Commit**

```bash
git add src/elements/status.tsx src/elements/slots.ts src/elements/register-impl.ts src/elements/element-meta.json frameworks/react dist/custom-elements.json docs/web-components.md llms*.txt
git commit -m "feat(elements): kai-status presence/new dot"
```

(Only stage the files that actually changed from `build:api`; run `git status` first and add the regenerated artifacts it touched.)

---

### Task 3: Story + visual verification (light + dark)

**Files:**
- Create: `src/elements/status.stories.tsx`

**Interfaces:**
- Consumes: the registered `kai-status` element.

- [ ] **Step 1: Write the story**

```tsx
// src/elements/status.stories.tsx
import type { Meta, StoryObj } from 'storybook-solidjs';
import './status';

const meta: Meta = {
  title: 'Labs/Foundations/Status',
};
export default meta;

export const States: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', gap: '1.5rem', 'align-items': 'center', padding: '1rem' }}>
      <kai-status status="new" pulse label="New"></kai-status>
      <kai-status status="online" label="Online"></kai-status>
      <kai-status status="busy" label="Busy"></kai-status>
      <kai-status status="away" label="Away"></kai-status>
      <kai-status status="offline" label="Offline"></kai-status>
      <kai-status status="online" size="md" label="Online (md)"></kai-status>
    </div>
  ),
};
```

- [ ] **Step 2: Restart Storybook so it builds the new element's shadow CSS**

Run: `lsof -ti:6006 | xargs kill 2>/dev/null; npm run storybook` (background)
Expected: Storybook serves on :6006 with the new `Labs/Foundations/Status` story.

- [ ] **Step 3: Screenshot light + dark and read them**

Use the session scratchpad for the screenshot script (symlink the repo `node_modules` into it so Playwright resolves), per the handoff `_shot.mjs` recipe. Capture `labs-foundations-status--states` in both light and dark, then Read the PNGs.
Expected: five dots in blue/green/red/amber/grey, the `new` one pulsing, the `md` one visibly larger, all reading correctly against both backgrounds.

- [ ] **Step 4: Commit**

```bash
git add src/elements/status.stories.tsx
git commit -m "docs(storybook): kai-status states story"
```

---

## Self-Review

**Spec coverage (§5 of the design spec):** `status` enum → `tool-*`/`muted-foreground` mapping (Task 1, `STATUS_BG`) ✓; `pulse` with reduced-motion (Task 1, `animate-ping motion-reduce:hidden`) ✓; `label` a11y (Task 1) ✓; `size` sm/md (Task 1, `SIZE`) ✓; `::part(dot)` recolor (Task 2) ✓; standalone element (Task 2) ✓; story + light/dark IVP (Task 3) ✓. Avatar-corner composition is consumer layout, no code here, as specced.

**Placeholder scan:** none — all steps carry real code/commands.

**Type consistency:** `StatusKind` and `STATUS_BG` defined in Task 1 and consumed by name in Task 2; `part="dot"` registered (Task 2 Step 1) matches the source attribute (Task 2 Step 3).
