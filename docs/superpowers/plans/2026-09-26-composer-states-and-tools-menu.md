# The composer's states and tools menu — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The composer collapses to a single row when its content fits one line, expands to two rows when it does not, and carries a `+` menu built from an item tree the host supplies — with capability chips for the items that opt in.

**Architecture:** The menu work is composition over `<kai-menu>`, whose item tree renderer is extracted into a shared component so the composer and the element cannot drift. The composer's two layouts come from a pure resolver fed by `observeContentHeight`, never from a second measurement. Everything the host controls stays a prop or an item; the composer holds no capability state.

**Tech Stack:** SolidJS, Tailwind (scanned sheet), Vitest (jsdom), Playwright (real-chromium probes), the kit's `defineWebComponent` facade layer.

**Spec:** `docs/superpowers/specs/2026-09-26-composer-states-and-tools-menu-design.md` — the plan argues from it; read both.

## Global Constraints

- Web components are prefixed **`kai-`**. Events are **non-bubbling `kai-*` CustomEvents**; consumers listen on the element itself.
- **Array/object props are JS properties, never attributes.** A new array prop must be listed in `packages/ui/src/web-components/web-component-nonscalar.json` or the generator emits an attribute path for it.
- **Behaviors are prop/JSON-driven** — never CSS-manipulated, never shadow-pierced.
- **Decide loudly.** A value the kit cannot honour is reported, never silently dropped.
- **Derive it, don't type it.** No hand-typed copy of a list, a count, a colour or a version the code already knows.
- **Nothing consumes the kit yet**, so breaking changes are free (spec §12.2): one event, no aliases, `webSearch` removed rather than deprecated.
- `chip` defaults to **false**; `expanded` omitted means **derive** (spec §3.5, §12.1, §12.6).
- Run everything from the repo root. Unit tests: `pnpm --filter @kitn.ai/ui exec vitest run --project=unit <path>`. Typecheck: `npm run typecheck` inside `packages/ui`.
- After touching props or comments, from `packages/ui`: `node scripts/lint-prop-docs.mjs` and `node scripts/lint-comment-references.mjs`.
- **A comment in `src/**` must not cite a spec section, a task/round/finding ID, or a dated ruling** — `scripts/lint-comment-references.mjs` enforces it, and its rationale is that a reader meeting "(spec §6)" has no way to resolve it. State the fact instead. One comment token over 20 lines also needs a reason. (Found the hard way: a lane copied this plan's `(spec §3.5)` into a doc comment and the lint failed.)
- **A new `--kai-*` theme token or `--radius-*` rung has FOUR dependents, and this plan adds one.** Missing any of them is a red suite, and the narrower a run's file count the longer it stays invisible: the theme editor's catalog (`src/themes/theme-tokens.ts`), the Token Reference's table (`src/stories/docs/theme-tokens.tsx`), the generated catalog (`node scripts/gen-catalog.mjs`, part of `build:api`), and the class-merger oracle's config (`src/utils/cn-merge.drift.test.ts`) — a new `rounded-*` utility is in the merger's conflict group and the oracle has to be told. Prove a token change against the FULL unit suite; a sweep of a few hundred files is what hid these.
- **Commits are approved** (owner, 2026-09-26: "commits are fine to do now … free to move forward and orchestrate the agents"). Every commit step below runs as written. Nothing is pushed; this is the feature branch only.

---

### Task 1: The three item fields, in a shared tree renderer

The item vocabulary grows by `description`, `control` and `note` — and the tree renderer moves out of the `kai-menu` facade so the composer can render the same tree without a second copy of the mapping.

**Files:**
- Modify: `packages/ui/src/web-components/web-component/web-component-data-types.ts:98-121` (`KaiMenuItem`)
- Modify: `packages/ui/src/components/dropdown/dropdown.tsx:138` (`DropdownItemProps`), `:415` (`DropdownCheckboxItem`), `:452` (`DropdownRadioItem`), add `DropdownNote`
- Create: `packages/ui/src/components/dropdown/dropdown-items.tsx`
- Modify: `packages/ui/src/web-components/menu/menu.tsx:99-160` (delete `renderItems`, call the shared component)
- Test: `packages/ui/tests/components/dropdown.test.tsx` (extend), `packages/ui/tests/web-components/menu.test.tsx` (extend)

**Interfaces:**
- Consumes: `renderIcon` (`src/components/icon/icon.tsx`), `Kbd` (`src/components/kbd/kbd.tsx`), `Switch` (`src/components/switch/switch.tsx:41`).
- Produces:
  - `KaiMenuItem` gains `description?: string`, `control?: 'check' | 'switch'`, `note?: true`.
  - `DropdownItems(props: { items: KaiMenuItem[]; onSelect: (detail: { id: string; checked?: boolean; radioGroup?: string }) => void })` — named export from `src/components/dropdown/dropdown-items.tsx`.
  - `DropdownNote(props: { children: JSX.Element; class?: string })`.
  - `DropdownItemProps` gains `description?: string`; `DropdownCheckboxItemProps` gains `control?: 'check' | 'switch'`.

- [ ] **Step 1: Write the failing tests**

Extend `packages/ui/tests/components/dropdown.test.tsx` (its existing `setup()` helper and the `PointerEvent` shim stay as they are):

```tsx
import { DropdownCheckboxItem, DropdownItem, DropdownNote } from '../../src/components/dropdown/dropdown';

describe('Dropdown item length and state', () => {
  it('renders a muted second line when an item has a description', () => {
    render(() => (
      <Dropdown>
        <DropdownTrigger as={(p: any) => <button {...p} data-testid="trg">Menu</button>} />
        <DropdownContent>
          <DropdownItem description="Visualize anything">Create image</DropdownItem>
        </DropdownContent>
      </Dropdown>
    ));
    fireEvent.click(screen.getByTestId('trg'));
    expect(screen.getByText('Visualize anything')).toBeInTheDocument();
  });

  it('leaves the DOM unwrapped when an item has no description', () => {
    render(() => (
      <Dropdown>
        <DropdownTrigger as={(p: any) => <button {...p} data-testid="trg">Menu</button>} />
        <DropdownContent>
          <DropdownItem>Plain</DropdownItem>
        </DropdownContent>
      </Dropdown>
    ));
    fireEvent.click(screen.getByTestId('trg'));
    // The label is the item's own text node: no wrapper element was introduced
    // for a description that does not exist. This is what keeps every existing
    // menu byte-identical.
    expect(screen.getByText('Plain').tagName).toBe('DIV');
  });

  it('draws a check by default and a switch when asked', () => {
    render(() => (
      <Dropdown>
        <DropdownTrigger as={(p: any) => <button {...p} data-testid="trg">Menu</button>} />
        <DropdownContent>
          <DropdownCheckboxItem checked>Web search</DropdownCheckboxItem>
          <DropdownCheckboxItem checked control="switch">Google Drive</DropdownCheckboxItem>
        </DropdownContent>
      </Dropdown>
    ));
    fireEvent.click(screen.getByTestId('trg'));

    const rows = screen.getAllByRole('menuitemcheckbox');
    // The ROW is the control in both cases; the glyph is what differs.
    expect(rows[0]).toHaveAttribute('aria-checked', 'true');
    expect(rows[1]).toHaveAttribute('aria-checked', 'true');
    // Nothing focusable is nested in a menu item: the switch is decoration.
    expect(rows[1].querySelector('[role="switch"]')).toHaveAttribute('aria-hidden', 'true');
    expect(rows[1].querySelector('[role="switch"]')).toHaveAttribute('tabindex', '-1');
  });

  it('a note is not a menu item', () => {
    render(() => (
      <Dropdown>
        <DropdownTrigger as={(p: any) => <button {...p} data-testid="trg">Menu</button>} />
        <DropdownContent>
          <DropdownNote>Design systems aren't available on your plan.</DropdownNote>
          <DropdownItem>New design system</DropdownItem>
        </DropdownContent>
      </Dropdown>
    ));
    fireEvent.click(screen.getByTestId('trg'));
    expect(screen.getByText(/aren't available/)).not.toHaveAttribute('role');
    expect(screen.getAllByRole('menuitem')).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @kitn.ai/ui exec vitest run --project=unit tests/components/dropdown.test.tsx`
Expected: FAIL — `DropdownNote` is not exported; `description` renders nothing; `control` is not a prop.

- [ ] **Step 3: Add the fields to `KaiMenuItem`**

In `web-component-data-types.ts`, after `disabled?: boolean;`:

```ts
  /** Muted second line under the label (e.g. "Visualize anything"). */
  description?: string;
  /** The trailing glyph for a togglable item. Defaults to `check`. */
  control?: 'check' | 'switch';
  /** A non-interactive muted text row (uses `label`) — a disabled group's
   *  reason, not a command. Ignores every other field. */
  note?: true;
```

- [ ] **Step 4: Render description, switch and note in the dropdown primitives**

In `dropdown.tsx`, add `description?: string` to `DropdownItemProps`, `control?: 'check' | 'switch'` to `DropdownCheckboxItemProps`, and this shared label block above `DropdownItem`:

```tsx
/** A row's label, with an optional muted second line. Shared so every item kind
 *  stacks them identically. With no description the children render UNWRAPPED,
 *  which is what keeps every existing menu's DOM unchanged. */
function ItemLabel(props: { children: JSX.Element; description?: string }) {
  return (
    <Show when={props.description} fallback={<>{props.children}</>}>
      <span class="flex min-w-0 flex-col items-start">
        <span class="flex min-w-0 items-center">{props.children}</span>
        <span class="text-muted-foreground mt-0.5 text-xs">{props.description}</span>
      </span>
    </Show>
  );
}
```

In `DropdownItem`, `DropdownCheckboxItem` and `DropdownRadioItem`, replace `{props.children}` with `<ItemLabel description={props.description}>{props.children}</ItemLabel>`.

In `DropdownCheckboxItem`'s trailing column, replace the `Check` line with:

```tsx
        <Show when={props.checked}>
          <Show when={props.control === 'switch'} fallback={<Check class="size-4" aria-hidden="true" />}>
            {/* DECORATION. The row owns role="menuitemcheckbox" and aria-checked;
                a real focusable switch in here would be nested interactive
                content, and would give AT two controls for one state. */}
            <Switch checked aria-hidden="true" tabindex="-1" class="pointer-events-none" />
          </Show>
        </Show>
```

Add, after `DropdownLabel`:

```tsx
/** A non-interactive muted text row — a disabled group's reason, not a command.
 *  a11y: deliberately role-less, so it is not a menu item and the roving-focus
 *  `[role="menuitem"]` query skips it. */
export function DropdownNote(props: { children: JSX.Element; class?: string }) {
  return (
    <div class={cn('text-muted-foreground px-2 py-1.5 text-xs', props.class)}>{props.children}</div>
  );
}
```

- [ ] **Step 5: Extract the tree renderer**

Create `src/components/dropdown/dropdown-items.tsx` and move the body of `renderItems` from `web-components/menu/menu.tsx:99-160` into it unchanged, except:

- the recursion becomes `<DropdownItems items={item.items} onSelect={props.onSelect} />`
- `dispatch('kai-select', …)` becomes `props.onSelect({ id: item.id, checked: !item.checked })` and `props.onSelect({ id: item.id, radioGroup: item.radioGroup })` and `props.onSelect({ id: item.id })`
- add the two new branches, **above** the submenu branch so a note is never mistaken for one:

```tsx
          if (item.note) {
            return <DropdownNote>{item.label}</DropdownNote>;
          }
```

- and pass `description`/`control` through on the item kinds that take them:

```tsx
            <DropdownCheckboxItem checked={item.checked} control={item.control} description={item.description} …>
```

The full file:

```tsx
import { For, Show } from 'solid-js';
import {
  DropdownItem, DropdownSeparator, DropdownLabel, DropdownCheckboxItem, DropdownRadioItem,
  DropdownSub, DropdownSubTrigger, DropdownSubContent, DropdownNote,
} from './dropdown';
import { renderIcon } from '../icon/icon';
import { Kbd } from '../kbd/kbd';
import type { KaiMenuItem } from '../../web-components/web-component/web-component-data-types';

export interface DropdownItemsProps {
  items: KaiMenuItem[];
  /** Called for every actionable item. `checked` is present exactly when the item
   *  is a toggle, and it carries the NEW state — the consumer owns it. */
  onSelect: (detail: { id: string; checked?: boolean; radioGroup?: string }) => void;
}

const ICON_OPTS = {
  imgClass: 'mr-2 size-4 shrink-0',
  spanClass: 'mr-2 flex h-4 w-4 shrink-0 items-center justify-center text-sm',
};

export function DropdownItems(props: DropdownItemsProps) {
  const renderItems = (items: KaiMenuItem[]): JSX.Element => (
    <For each={items}>
      {(item) => {
        if (item.separator) return <DropdownSeparator />;
        if (item.heading) return <DropdownLabel>{item.label}</DropdownLabel>;
        if (item.note) return <DropdownNote>{item.label}</DropdownNote>;
        if (item.items && item.items.length > 0) {
          return (
            <DropdownSub>
              <DropdownSubTrigger>
                <Show when={item.icon}>{renderIcon(item.icon, ICON_OPTS)}</Show>
                {item.label}
              </DropdownSubTrigger>
              <DropdownSubContent>{renderItems(item.items!)}</DropdownSubContent>
            </DropdownSub>
          );
        }
        if (item.radioGroup !== undefined) {
          return (
            <DropdownRadioItem
              checked={item.checked} description={item.description} disabled={item.disabled}
              onSelect={() => { if (item.id) props.onSelect({ id: item.id, radioGroup: item.radioGroup }); }}
            >
              <Show when={item.icon}>{renderIcon(item.icon, ICON_OPTS)}</Show>
              {item.label}
            </DropdownRadioItem>
          );
        }
        if (item.checked !== undefined) {
          return (
            <DropdownCheckboxItem
              checked={item.checked} control={item.control} description={item.description} disabled={item.disabled}
              onSelect={() => { if (item.id) props.onSelect({ id: item.id, checked: !item.checked }); }}
            >
              <Show when={item.icon}>{renderIcon(item.icon, ICON_OPTS)}</Show>
              {item.label}
            </DropdownCheckboxItem>
          );
        }
        return (
          <DropdownItem
            description={item.description} disabled={item.disabled}
            onSelect={() => { if (item.id) props.onSelect({ id: item.id }); }}
          >
            <Show when={item.icon}>{renderIcon(item.icon, ICON_OPTS)}</Show>
            {item.label}
            <Show when={item.shortcut}>
              <span part="shortcut" class="ml-auto pl-4 text-muted-foreground">
                <Kbd keys={item.shortcut!} platform="auto" size="sm" />
              </span>
            </Show>
          </DropdownItem>
        );
      }}
    </For>
  );

  return <>{renderItems(props.items)}</>;
}
```

- [ ] **Step 6: Point the facade at it**

In `web-components/menu/menu.tsx`: delete `renderItems` (lines 99-160) and the now-unused imports (`For`, `DropdownItem`, `DropdownSeparator`, `DropdownLabel`, `DropdownCheckboxItem`, `DropdownRadioItem`, `DropdownSub`, `DropdownSubTrigger`, `DropdownSubContent`, `renderIcon`, `Kbd`), keep `Dropdown`, `DropdownTrigger`, `DropdownContent` and `DropdownController`, import `DropdownItems`, and render:

```tsx
                <DropdownItems
                  items={props.items ?? []}
                  onSelect={(detail) => dispatch('kai-select', detail)}
                />
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm --filter @kitn.ai/ui exec vitest run --project=unit tests/components/dropdown.test.tsx tests/web-components/menu.test.tsx`
Expected: PASS, with the pre-existing menu assertions unchanged — they are the control that the extraction preserved behaviour.

- [ ] **Step 8: Lint and typecheck**

```bash
cd packages/ui && node scripts/lint-prop-docs.mjs && node scripts/lint-comment-references.mjs && npm run typecheck
```
Expected: no findings. `KaiMenuItem`'s new fields need doc comments within the 160-character cap and free of em dashes — the prop-docs lint is what enforces both.

- [ ] **Step 9: Commit** (commits approved)

```bash
git add packages/ui/src/components/dropdown/ packages/ui/src/web-components/menu/ packages/ui/src/web-components/web-component/web-component-data-types.ts packages/ui/tests/components/dropdown.test.tsx
git commit -m "feat(menu): item descriptions, switch control and note rows, in one shared tree renderer"
```

---

### Task 2: The expansion resolver

The rule that decides the composer's layout, as a pure function plus a hook that feeds it.

**Files:**
- Create: `packages/ui/src/primitives/composer-expansion.ts`
- Test: `packages/ui/src/primitives/composer-expansion.test.ts`
- Test: the hook `useComposerExpansion` — see Step 4b. It IS unit-tested, with the `ResizeObserver`-stub pattern `src/primitives/use-auto-resize.test.ts` already uses.

**Interfaces:**
- Consumes: `observeContentHeight` (`src/primitives/use-resize-observer.ts`).
- Produces:
  - `type ComposerLayout = 'collapsed' | 'expanded'`
  - `resolveComposerLayout(input: { pinned?: boolean; contentHeight: number; lineHeight: number; attachmentCount: number }): ComposerLayout`
  - `resolveExpandedProp(raw: unknown, hasAttribute: boolean, attributeValue: string | null): boolean | undefined`
  - `useComposerExpansion(options: { editable: () => HTMLElement | undefined; pinned: () => boolean | undefined; attachmentCount: () => number }): () => ComposerLayout`

- [ ] **Step 1: Write the failing test**

Create `packages/ui/src/primitives/composer-expansion.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveComposerLayout, resolveExpandedProp } from './composer-expansion';

const base = { contentHeight: 20, lineHeight: 20, attachmentCount: 0 };

describe('resolveComposerLayout', () => {
  it('derives collapsed for one line and expanded for two', () => {
    expect(resolveComposerLayout(base)).toBe('collapsed');
    expect(resolveComposerLayout({ ...base, contentHeight: 40 })).toBe('expanded');
  });

  it('treats a trailing descender as one line, not two', () => {
    // 1.5× the line height is the threshold: 29px is still one line,
    // 31px is not.
    expect(resolveComposerLayout({ ...base, contentHeight: 29 })).toBe('collapsed');
    expect(resolveComposerLayout({ ...base, contentHeight: 31 })).toBe('expanded');
  });

  it('expands for an attachment even with no text', () => {
    expect(resolveComposerLayout({ ...base, attachmentCount: 1 })).toBe('expanded');
  });

  it('a pin wins over both the content and the attachments', () => {
    expect(resolveComposerLayout({ ...base, pinned: false, contentHeight: 200, attachmentCount: 3 })).toBe('collapsed');
    expect(resolveComposerLayout({ ...base, pinned: true, contentHeight: 20, attachmentCount: 0 })).toBe('expanded');
  });

  it('stays collapsed when no line height could be measured', () => {
    // Never expand on a measurement we could not take: an unreadable
    // line-height would otherwise read as an infinite number of lines.
    expect(resolveComposerLayout({ ...base, lineHeight: 0, contentHeight: 500 })).toBe('collapsed');
  });
});

describe('resolveExpandedProp', () => {
  it('reads true and false from the property', () => {
    expect(resolveExpandedProp(true, false, null)).toBe(true);
    expect(resolveExpandedProp(false, false, null)).toBe(false);
  });

  it('reads the attribute, including an explicit ="false"', () => {
    expect(resolveExpandedProp(undefined, true, '')).toBe(true);
    expect(resolveExpandedProp(undefined, true, 'false')).toBe(false);
  });

  it('is undefined when nothing was set — that is the derive state', () => {
    // `flag()` cannot answer this: resolveFlag (define.tsx:339-341) returns false
    // for an absent attribute AND for an explicit ="false", collapsing the third
    // state the composer needs.
    expect(resolveExpandedProp(undefined, false, null)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @kitn.ai/ui exec vitest run --project=unit src/primitives/composer-expansion.test.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the resolver and the hook**

Create `packages/ui/src/primitives/composer-expansion.ts`:

```ts
import { createEffect, createSignal, onCleanup } from 'solid-js';
import { observeContentHeight } from './use-resize-observer';

/** Which of the composer's two layouts applies. */
export type ComposerLayout = 'collapsed' | 'expanded';

export interface ComposerExpansionInput {
  /** The `expanded` prop. `undefined` derives; `true`/`false` pin. */
  pinned?: boolean;
  /** The editable's observed content height, in px. */
  contentHeight: number;
  /** The editable's computed line-height, in px. */
  lineHeight: number;
  /** Attachments staged in the composer. */
  attachmentCount: number;
}

/** One line or two. PURE, so the rule is testable without a browser — the
 *  observer only supplies the numbers, and nothing here reads the DOM. */
export function resolveComposerLayout(input: ComposerExpansionInput): ComposerLayout {
  if (input.pinned !== undefined) return input.pinned ? 'expanded' : 'collapsed';
  if (input.attachmentCount > 0) return 'expanded';
  // Never expand on a line height we could not measure: 0 would make the next
  // line true for ANY content, so the collapse would fail open.
  if (!(input.lineHeight > 0)) return 'collapsed';
  // 1.5, not 1: a trailing descender and sub-pixel rounding must not read as a
  // second line.
  return input.contentHeight > input.lineHeight * 1.5 ? 'expanded' : 'collapsed';
}

/** The `expanded` prop as a custom element must read it.
 *
 *  NOT `flag()`: `resolveFlag` (define.tsx:339-341) returns false for both an
 *  absent attribute and an explicit `="false"`, which collapses "derive" into
 *  "pinned closed" and loses the third state entirely. */
export function resolveExpandedProp(
  raw: unknown,
  hasAttribute: boolean,
  attributeValue: string | null,
): boolean | undefined {
  if (raw === true) return true;
  if (raw === false) return false;
  if (!hasAttribute) return undefined;
  return attributeValue !== 'false';
}

/** Feeds the resolver from a live editable. */
export function useComposerExpansion(options: {
  editable: () => HTMLElement | undefined;
  pinned: () => boolean | undefined;
  attachmentCount: () => number;
}): () => ComposerLayout {
  const [contentHeight, setContentHeight] = createSignal(0);
  const [lineHeight, setLineHeight] = createSignal(0);

  createEffect(() => {
    const el = options.editable();
    if (!el) return;
    // The line height comes from the element's OWN computed style, so a theme
    // that changes the prose size moves the threshold with it instead of leaving
    // a hand-typed number behind.
    const measured = Number.parseFloat(getComputedStyle(el).lineHeight);
    setLineHeight(Number.isFinite(measured) && measured > 0 ? measured : 0);
    onCleanup(observeContentHeight(el, setContentHeight));
  });

  return () =>
    resolveComposerLayout({
      pinned: options.pinned(),
      contentHeight: contentHeight(),
      lineHeight: lineHeight(),
      attachmentCount: options.attachmentCount(),
    });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @kitn.ai/ui exec vitest run --project=unit src/primitives/composer-expansion.test.ts`
Expected: PASS.

- [ ] **Step 4b: Test the hook's wiring, because a defect escaped through that gap**

Stub `ResizeObserver` (the pattern in `src/primitives/use-auto-resize.test.ts`) and use a
MUTABLE computed style, then assert through `createRoot`:

- the classification follows the element's CURRENT computed line height, with NO
  remount, in BOTH directions. The threshold and the content box move together in
  reality and apart in a test, so the two directions need different numbers — and the
  naive version of this step (hold the content, grow the line height, assert
  `expanded`) is arithmetically wrong, because it asserts the bug:
  - **grown:** content 20px with lineHeight 20px → `collapsed`; then content 60px with
    lineHeight 60px → **still `collapsed`**, because one line is still one line. A
    cached 20px threshold decides `60 > 30` and renders ONE line as TWO rows: that is
    the defect, and this is the case that fails without the fix.
  - **shrunk:** content 20px with lineHeight 20px → `collapsed`; then lineHeight 10px
    with the observed content UNCHANGED at 20px → `expanded`, because the same box is
    now two lines. A cached 20px threshold says `collapsed` — the mirror defect, and
    the one the observer-callback fix would have missed, since no resize arrives.
- the observer is disposed when the editable is replaced, and the new element is
  observed instead.

This is the one place a pure-function test cannot reach, and the geometry probe is a
hand-run script rather than a gate, so this is the only automated pin that wiring has.

- [ ] **Step 5: Commit** (commits approved)

```bash
git add packages/ui/src/primitives/composer-expansion.ts packages/ui/src/primitives/composer-expansion.test.ts
git commit -m "feat(composer): derive the two-row layout from the editable's measured height"
```

---

### Task 3: The frame's two layouts and the radius token

**Files:**
- Modify: `packages/ui/theme.css:236-249` (add the radius rung)
- Modify: `packages/ui/src/components/prompt/prompt-input.tsx` (root frame, context, `PromptInputTextarea`, `PromptInputActions`)
- Modify: `packages/ui/src/components/prompt/default-input.tsx:262-263` (stop passing the insets; pass `attachmentCount`/`expanded`)
- Test: `packages/ui/src/components/prompt/default-input.test.tsx` (the inset test becomes per-layout)

**Interfaces:**
- Consumes: `ComposerLayout`, `useComposerExpansion` (Task 2).
- Produces:
  - `PromptInputProps` gains `expanded?: boolean` and `attachmentCount?: number`.
  - The frame owns EVERY inset, in both layouts; nothing inside it carries one.
  - **A DOM reorder in `DefaultPromptInput`:** the leading cluster moves BEFORE the editable, so the two can share one row when collapsed, and `order-first basis-full` on the editable is what moves the text onto its own line when expanded.
  - `PromptInputContextType` gains `layout: () => ComposerLayout`, and its `textareaRef` becomes SIGNAL-backed (the expansion effect tracks it; the plain `let` it used to be would attach the observer to `undefined` once and never again).
  - `usePromptInput().layout()` for the subcomponents.

- [ ] **Step 1: Write the failing test**

Replace the `DefaultPromptInput horizontal inset` block in `packages/ui/src/components/prompt/default-input.test.tsx`:

```tsx
describe('DefaultPromptInput geometry', () => {
  const frame = (c: HTMLElement) => c.querySelector('[data-prompt-input]') as HTMLElement;
  const editable = (c: HTMLElement) => c.querySelector('[data-kai-composer-editable]') as HTMLElement;

  it('collapsed: one row, on the measured padding, with the frame owning the insets', () => {
    const { container } = render(() => <DefaultPromptInput {...baseProps} />);
    expect(frame(container).className).toContain('flex-row');
    // MEASURED from the reference screenshots: 10px + a 28px control + 10px = 48px,
    // 18px leading, 14px trailing. These are the numbers, not a guess at them.
    expect(frame(container).className).toContain('py-2.5');
    expect(frame(container).className).toContain('pl-4.5');
    expect(frame(container).className).toContain('pr-3.5');
    // The text never carries an inset of its own: the frame's padding is the one edge.
    expect(editable(container).className).not.toMatch(/\bpl-/);
    expect(editable(container).className).not.toMatch(/\bpt-/);
  });

  it('expanded: the text takes the whole line and the controls wrap below it', () => {
    const { container } = render(() => (
      <DefaultPromptInput {...baseProps} attachments={[{ id: 'a', type: 'file', filename: 'a.pdf' }]} />
    ));
    expect(frame(container).className).toContain('flex-wrap');
    expect(frame(container).className).toContain('pt-3.5');
    expect(frame(container).className).toContain('px-4.5');
    // order-first + basis-full is the whole mechanism that puts the text on its own
    // line while the leading cluster stays earlier in the DOM.
    expect(editable(container).className).toContain('order-first');
    expect(editable(container).className).toContain('basis-full');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @kitn.ai/ui exec vitest run --project=unit src/components/prompt/default-input.test.tsx`
Expected: FAIL — the frame is neither `flex-row` nor `flex-col`, and the editable always carries `pl-3`.

- [ ] **Step 3: Add the radius rung**

In `theme.css`, beside `--radius-pill` (line 245):

```css
    /* The composer's own corner: a FIXED rung, deliberately not `--radius-pill`.
       That rung is 4rem and CSS clamps a radius to half the box, so it stays fully
       round as the composer grows; this one is half the COLLAPSED height, which is
       what makes the collapsed box read as a pill and the expanded one as a card.

       Six spacing units, not a rem literal: the collapsed row is `py-2.5` + a 28px
       control + `py-2.5` = 12 units, and every one of those scales with `--spacing`.
       A literal 24px would be half the row at the default density only, so the
       relationship would break the moment a theme turned density up. */
    --radius-composer: var(--kai-radius-composer, calc(var(--spacing) * 6));
```

- [ ] **Step 4: Make the frame layout-aware and provide it**

In `prompt-input.tsx`:

```tsx
interface PromptInputContextType {
  // …existing fields…
  layout: () => ComposerLayout;
}
```

`PromptInputProps` gains:

```tsx
  /** Pins the layout. Omitted derives it from the content (see `composer-expansion`). */
  expanded?: boolean;
  /** How many attachments are staged — their presence is an expansion trigger.
   *  A COUNT, deliberately not `attachments`: naming a number the same as a
   *  component's attachment array invites the two being read as one thing. */
  attachmentCount?: number;
```

`PromptInput` owns the hook (it is the provider and it holds the editable ref), then provides `layout`:

**The ref must become a SIGNAL first.** It is currently a plain `let textareaRef` with a getter over it, so `editable: () => textareaRef` would never re-run the effect when the element arrives — the observer would never attach at all, and the composer would sit permanently collapsed with no error anywhere:

```tsx
  // A SIGNAL, not the plain `let` this used to be: the expansion effect tracks the
  // element, so a non-reactive read would attach the observer to `undefined` once and
  // never again. `handleClick` reads it as a call site too.
  const [textareaRef, setTextareaRef] = createSignal<HTMLElement>();

  const layout = useComposerExpansion({
    editable: textareaRef,
    pinned: () => local.expanded,
    attachmentCount: () => local.attachmentCount ?? 0,
  });
```

`handleClick`'s `textareaRef?.focus()` becomes `textareaRef()?.focus()`, and the context's `textareaRef` / `setTextareaRef` fields are served by the signal's accessor and setter.

and the frame becomes:

```tsx
      <div
        data-prompt-input
        onClick={handleClick}
        class={cn(
          'bg-surface cursor-text shadow-xs',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0',
          'rounded-composer',
          // MEASURED from the reference screenshots, not guessed: the collapsed row
          // is 48px (10px + a 28px control + 10px) with 18px leading and 14px
          // trailing; the expanded box opens 14px above the text and closes with the
          // same 10px the row uses.
          layout() === 'collapsed'
            ? 'flex flex-row items-center gap-2 py-2.5 pl-4.5 pr-3.5'
            : 'flex flex-wrap pt-3.5 px-4.5 pb-2.5',
          local.disabled && 'cursor-not-allowed opacity-60',
          local.class
        )}
        {...rest}
      >
```

`PromptInputTextarea` stops being handed its insets and owns them per layout:

```tsx
  const editableClass = () =>
    cn(
      'text-foreground w-full bg-transparent text-start shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 overflow-y-auto whitespace-pre-wrap break-words',
      // The editable carries NO inset of its own in EITHER layout — the frame owns the
      // padding, so the paragraph and the buttons under it start on one edge by
      // construction rather than by two values agreeing. (`pl-3` used to live here,
      // which is the class the old test pinned; it now lives on the frame once.)
      // `min-h-6` is one line, which is also what makes the expansion rule read
      // correctly: an empty composer is exactly one line tall, so it is collapsed.
      // No min-height HERE — but the editable does carry one line's floor from the
      // composer's own stylesheet (`min-height: 1lh`). Both facts matter: `min-h-6` (24px)
      // against a ~20px line box lifted the text 2-3px above the centreline the 28px
      // controls are on, so the ROW's centring happens on the wrapper instead
      // (`flex min-h-7 items-center` when collapsed). Removing the floor outright is what
      // made an empty composer 0px tall with its absolutely-positioned placeholder half a
      // line low — see the arithmetic at the stylesheet rule.
      'w-full bg-transparent',
      // Expanded only: the text takes the whole line so the control row wraps below
      // it. `order-first` is why this works — the leading cluster is EARLIER in the
      // DOM (so it can precede the text when collapsed), and order is what moves the
      // text ahead of it when there is no room to share the row.
      ctx.layout() === 'expanded' && 'order-first basis-full',
      textClass(config.proseSize()),
      local.class,
    );
```

`PromptInputActions` is the **box** form, for hand-composed call sites, and the
layout decides its width rather than its existence:

```tsx
function PromptInputActions(props: PromptInputActionsProps) {
  const [local, rest] = splitProps(props, ['children', 'class']);
  const ctx = usePromptInput();
  return (
    <div
      class={cn(
        'flex items-center gap-2',
        // Collapsed: content-width, so it sits after the `flex-1` body at the trailing
        // edge. Expanded: it fills the wrapped line, which is what lets the SITE'S own
        // `justify-*` distribute — a content-width item has nothing to distribute in,
        // and a lone item under the frame's `justify-between` lands at the START, which
        // is the opposite of what a `justify-end` site asked for.
        ctx.layout() === 'collapsed' ? 'shrink-0' : 'w-full',
        // The kit's default BEFORE `local.class`: `cn` is last-wins per conflict group,
        // so a host's own `justify-*` overrides this one instead of fighting CSS order.
        'justify-between',
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}
```

**The composer's two clusters are NOT this component.** They are `contents` — their
children are the frame's flex items — with an inner group div each so one cluster is
one item, which is what lets the frame's `justify-between` spread the two on the
wrapped line. That is the other shape, and it is only for the composer.

- [ ] **Step 5: Reorder `DefaultPromptInput` so the clusters can share one row**

This is the step the two layouts actually depend on. The leading cluster must be
EARLIER in the DOM than the editable for the collapsed row to read `+ · text ·
controls`, and the expanded layout is then produced by the editable's `order-first
basis-full` wrapping the control row below it — no duplicated markup, no
`display: contents`, and the same tree in both states.

The body becomes, in this order:

```tsx
        {/* Leading cluster BEFORE the editable: collapsed, these controls share the
            text's row and sit to its left; expanded, the editable's `order-first`
            moves the text onto its own line and this cluster rides the row below. */}
        <PromptInputActions class="shrink-0">
          {/* the `+` trigger (Task 4), the chips (Task 5), the toolbar-start slot,
              the file input, the capability buttons and the host's custom actions */}
        </PromptInputActions>
        <PromptInputTextarea placeholder={props.placeholder} aria-label={props.placeholder || 'Message'} triggers={props.triggers} kindIcons={props.kindIcons} onComposerChange={props.onComposerChange} />
        {/* Trailing cluster: `ml-auto` pins it to the far edge of the expanded row;
            collapsed it is simply last, separated by the frame's gap. */}
        <PromptInputActions class="ml-auto shrink-0">
          {/* the toolbar-end slot and Send/Stop */}
        </PromptInputActions>
```

The comment above the textarea that explains the inset moves into
`PromptInputTextarea`, where the value now lives — do not leave a comment describing
a class that is no longer there. The `<Show>` blocks and the file input move with
their cluster; nothing about their behaviour changes.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @kitn.ai/ui exec vitest run --project=unit src/components/prompt/`
Expected: PASS.

- [ ] **Step 7: Regenerate the sheet and re-run the class scan**

Run, from `packages/ui`: `npm run build:css`
Then: `pnpm --filter @kitn.ai/ui exec vitest run --project=unit tests/styles/shadow-sheet-scan.test.ts`
Expected: PASS. `rounded-composer` is a new utility: until the sheet is regenerated the scan fails and names it, because the kit's CSS is a scanned artifact — a class no other file uses does not exist until it is rebuilt.

- [ ] **Step 8: Commit** (commits approved)

```bash
git add packages/ui/theme.css packages/ui/src/components/prompt/ packages/ui/src/web-components/compiled.css
git commit -m "feat(composer): one row when it fits, two when it does not, on a fixed radius"
```

---

### Task 4: The `+` trigger and the assembled tree

**Files:**
- Modify: `packages/ui/src/components/prompt/default-input.tsx`
- Test: `packages/ui/src/components/prompt/default-input.test.tsx`

**Interfaces:**
- Consumes: `DropdownItems` (Task 1), `Dropdown*` primitives.
- Produces:
  - `type ComposerToolItem = KaiMenuItem & { chip?: boolean }` exported from `src/components/prompt/default-input.tsx`.
  - `DefaultPromptInputProps` gains `tools?: ComposerToolItem[]` and `onToolSelect?: (detail: { id: string; checked?: boolean }) => void`.
  - `buildComposerTools(options: { attach: boolean; tools?: ComposerToolItem[] }): KaiMenuItem[]` — exported for its own test.

- [ ] **Step 1: Write the failing test**

Append to `default-input.test.tsx`:

```tsx
import { buildComposerTools } from './default-input';

describe('buildComposerTools', () => {
  it('puts the built-in file item first and the host tree after it', () => {
    const items = buildComposerTools({
      attach: true,
      tools: [{ id: 'github', label: 'Add from GitHub' }],
    });
    expect(items[0]).toMatchObject({ id: 'files', label: 'Add files or photos' });
    // The separator is DERIVED from there being more than one item, so a host
    // tree cannot begin with a divider that has nothing above it.
    expect(items[1]).toMatchObject({ separator: true });
    expect(items[2]).toMatchObject({ id: 'github' });
  });

  it('is empty when attachments are off and the host declared nothing', () => {
    expect(buildComposerTools({ attach: false })).toEqual([]);
  });

  it('adds no trailing separator after the file item alone', () => {
    expect(buildComposerTools({ attach: true }).map((i) => i.id)).toEqual(['files']);
  });
});

describe('DefaultPromptInput tools menu', () => {
  it('renders the trigger and reports the chosen item', async () => {
    const onToolSelect = vi.fn();
    const { getByRole } = render(() => (
      <DefaultPromptInput
        {...baseProps}
        tools={[{ id: 'web-search', label: 'Web search', checked: false }]}
        onToolSelect={onToolSelect}
      />
    ));
    fireEvent.click(getByRole('button', { name: 'More tools' }));
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Web search' }));
    // The NEW state, so the host can set its own field from the event alone.
    expect(onToolSelect).toHaveBeenCalledWith({ id: 'web-search', checked: true });
  });

  it('renders no trigger at all when there is nothing to offer', () => {
    const { queryByRole } = render(() => <DefaultPromptInput {...baseProps} attach={false} />);
    expect(queryByRole('button', { name: 'More tools' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @kitn.ai/ui exec vitest run --project=unit src/components/prompt/default-input.test.tsx`
Expected: FAIL — `buildComposerTools` is not exported and no trigger renders.

- [ ] **Step 3: Write the assembler**

In `default-input.tsx`:

```tsx
/** A tool the host declares for the composer's `+` menu. `chip` is the ONE field
 *  the menu does not read: it asks the composer to also show this item's state as
 *  a chip in the control row. It lives here rather than on `KaiMenuItem` because
 *  `<kai-menu>` ignores it, and a menu-side field only one caller reads is a field
 *  someone later assumes works. */
export type ComposerToolItem = KaiMenuItem & { chip?: boolean };

export const COMPOSER_FILE_ITEM_ID = 'files';

/** The `+` menu's tree: the built-in file item, then the host's items verbatim.
 *  Exported so the assembly is tested without rendering. */
export function buildComposerTools(options: {
  attach: boolean;
  tools?: ComposerToolItem[];
}): KaiMenuItem[] {
  const host = options.tools ?? [];
  if (!options.attach) return host;
  const fileItem: KaiMenuItem = { id: COMPOSER_FILE_ITEM_ID, label: 'Add files or photos', icon: 'paperclip' };
  // The separator is derived from the tree, never declared by the host: a host
  // tree that starts with one would otherwise render a divider with nothing above.
  return host.length > 0 ? [fileItem, { separator: true }, ...host] : [fileItem];
}
```

- [ ] **Step 4: Render the trigger**

In `DefaultPromptInput`, in the leading cluster, **before** the attach `<Show>`:

```tsx
            <Show when={toolItems().length > 0}>
              <Dropdown>
                {/* The tip is a DESCRIPTION; the name stays `More tools`. Re-pointed
                    from the paperclip: the guard against a tooltip becoming the
                    accessible name is a class, not an instance of one button. */}
                <Tooltip content="More tools">
                  <DropdownTrigger
                    as={(p) => (
                      <Button {...p} type="button" variant="outline" size="icon-sm" class="rounded-full" aria-label="More tools" disabled={props.disabled}>
                        <Plus class="size-4" />
                      </Button>
                    )}
                  />
                </Tooltip>
                <DropdownContent align="start">
                  <DropdownItems
                    items={toolItems()}
                    onSelect={(detail) => {
                      // The built-in file item is the composer's own, so it opens the
                      // picker here rather than being reported as a host tool.
                      if (detail.id === COMPOSER_FILE_ITEM_ID) { fileInput?.click(); return; }
                      props.onToolSelect?.(detail);
                    }}
                  />
                </DropdownContent>
              </Dropdown>
            </Show>
```

with `const toolItems = () => buildComposerTools({ attach: canAttach() && props.attach !== false, tools: props.tools });` and `import { Plus } from 'lucide-solid'`.

Remove the standalone paperclip `<Button>` and its `<Tooltip>`: the file item has replaced it, and the picker's `<input type="file">` stays exactly where it is.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @kitn.ai/ui exec vitest run --project=unit src/components/prompt/`
Expected: PASS. The three attach-tooltip cases in this file are now about the menu's
trigger: **re-point them onto it, do not delete them.** The paperclip was the only
tooltip in the default input, and those cases guard a defect the kit has already
shipped once — a tooltip becoming the accessible name. The trigger keeps the name
`More tools` and the tip is a description of it, which is exactly the shape those
three cases assert.

- [ ] **Step 6: Commit** (commits approved)

```bash
git add packages/ui/src/components/prompt/
git commit -m "feat(composer): a + menu built from the host's item tree"
```

---

### Task 5: Chips

**Files:**
- Create: `packages/ui/src/components/prompt/composer-chips.tsx`
- Modify: `packages/ui/src/components/prompt/default-input.tsx`
- Test: `packages/ui/src/components/prompt/composer-chips.test.tsx`

**Interfaces:**
- Consumes: `ComposerToolItem` (Task 4).
- Produces:
  - `chipItems(tools?: ComposerToolItem[]): ComposerToolItem[]` — the items that are `chip === true` and `checked === true`, in declaration order, flattening submenus.
  - `<ComposerChips items={ComposerToolItem[]} disabled?={boolean} onRemove={(id: string) => void} />`.

- [ ] **Step 1: Write the failing test**

Create `composer-chips.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { ComposerChips, chipItems } from './composer-chips';

describe('chipItems', () => {
  it('takes only items that are checked AND opted in', () => {
    const tools = [
      { id: 'web', label: 'Web search', checked: true, chip: true },
      { id: 'img', label: 'Create image', checked: true },
      { id: 'sketch', label: 'Sketch', checked: false, chip: true },
    ];
    expect(chipItems(tools).map((i) => i.id)).toEqual(['web']);
  });

  it('finds a chip one level down, because capabilities live in submenus too', () => {
    const tools = [{ id: 'plugins', label: 'Plugins', items: [{ id: 'web', label: 'Web search', checked: true, chip: true }] }];
    expect(chipItems(tools).map((i) => i.id)).toEqual(['web']);
  });
});

describe('ComposerChips', () => {
  it('names the action, not just the thing', () => {
    const onRemove = vi.fn();
    const { getByRole } = render(() => (
      <ComposerChips items={[{ id: 'web', label: 'Web search', checked: true, chip: true }]} onRemove={onRemove} />
    ));
    // The name CONTAINS the visible text: a bare "Remove" is a chip a speech-input
    // user cannot operate (WCAG 2.5.3).
    const chip = getByRole('button', { name: 'Web search, turn off' });
    expect(chip).toHaveTextContent('Web search');
    fireEvent.click(chip);
    expect(onRemove).toHaveBeenCalledWith('web');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @kitn.ai/ui exec vitest run --project=unit src/components/prompt/composer-chips.test.tsx`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the component**

```tsx
import { For } from 'solid-js';
import { X } from 'lucide-solid';
import { Button } from '../button/button';
import { renderIcon } from '../icon/icon';
import type { ComposerToolItem } from './default-input';
import type { KaiMenuItem } from '../../web-components/web-component/web-component-data-types';

/** The items that are ON and opted in for a chip, in declaration order.
 *  Recurses, because a capability is allowed to live in a submenu. */
export function chipItems(tools: ComposerToolItem[] = []): ComposerToolItem[] {
  return tools.flatMap((item) =>
    item.items?.length ? chipItems(item.items as ComposerToolItem[]) : item.chip === true && item.checked === true ? [item] : [],
  );
}

/** The composer's active-capability chips: one view of the same `checked` field
 *  the menu renders, which is what stops the two from disagreeing. */
export function ComposerChips(props: {
  items: ComposerToolItem[];
  disabled?: boolean;
  onRemove: (id: string) => void;
}) {
  return (
    <For each={props.items}>
      {(item) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="rounded-pill gap-1"
          disabled={props.disabled}
          aria-label={`${item.label}, turn off`}
          onClick={() => item.id && props.onRemove(item.id)}
        >
          <Show when={item.icon}>{(icon) => renderIcon(icon(), { imgClass: 'size-3.5', spanClass: 'flex size-3.5 items-center justify-center' })}</Show>
          {item.label}
          <X class="size-3 opacity-60" aria-hidden="true" />
        </Button>
      )}
    </For>
  );
}
```

- [ ] **Step 4: Wire it into the control row**

In `DefaultPromptInput`'s leading cluster, after the trigger:

```tsx
            <Show when={chips().length > 0}>
              <span class="bg-border h-4 w-px shrink-0" aria-hidden="true" />
              <ComposerChips
                items={chips()}
                disabled={props.disabled}
                onRemove={(id) => props.onToolSelect?.({ id, checked: false })}
              />
            </Show>
```

with `const chips = () => chipItems(props.tools);`. The chip does not change the layout: §5.3 gives it the row like any other control, and the expansion rule is unchanged.

**The overflow boundary, and why it needs no new rule.** Both clusters are `shrink-0`, so as chips multiply the only item that can give is the text — which wraps, which exceeds one line, which expands the composer, which gives the chips their own row. The system self-corrects, and the resolver needs no chip input. The remaining case is a row whose chips alone exceed the width: that is a host with more active capabilities than the leading edge can hold, and the documented answer is to pin `expanded`. Say that in the chips' story rather than inventing a clamp.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @kitn.ai/ui exec vitest run --project=unit src/components/prompt/`
Expected: PASS.

- [ ] **Step 6: Commit** (commits approved)

```bash
git add packages/ui/src/components/prompt/
git commit -m "feat(composer): opt-in capability chips, sharing the menu's own state field"
```

---

### Task 6: The surface — both elements, ChatThread, and the removals

**Files:**
- Modify: `packages/ui/src/components/chat/chat-thread.tsx:44` (props), `:871-880` (the render site)
- Modify: `packages/ui/src/web-components/prompt/prompt-input.tsx` (props, events, defaults)
- Modify: `packages/ui/src/web-components/chat/chat.tsx:196` (defaults), `:289-330` (the ChatThread call site), events
- Modify: `packages/ui/src/web-components/web-component-nonscalar.json`
- Test: `packages/ui/tests/web-components/prompt-input-web-search.test.tsx` → rename to `prompt-input-tools.test.tsx` and rewrite

**Interfaces:**
- Consumes: everything above.
- Produces:
  - Both `<kai-prompt-input>` and `<kai-chat>` accept `tools` (JS property) and `expanded` (boolean), and fire `kai-select { id, checked? }`.
  - `webSearch`, `onWebSearch` and `kai-web-search` no longer exist on either element or on `ChatThread`/`DefaultPromptInput`.
  - **A `part` for the `+` trigger**, which Task 4 left out. Every other control in the composer's clusters is reachable by a host through a `::part` (or is inside a cluster that is); the trigger is the one control with no hook of its own, so a host restyling the composer has the clusters and not this button. While the element layer is being finished, give it the same convention its neighbours use.

- [ ] **Step 1: Write the failing test**

Rewrite `packages/ui/tests/web-components/prompt-input-web-search.test.tsx` as `prompt-input-tools.test.tsx` (follow the mount-and-property-set pattern already in `packages/ui/tests/web-components/`; the light DOM children are the subject there, so keep the same caution):

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import '../../../src/web-components/prompt/prompt-input';

afterEach(() => { document.body.innerHTML = ''; });

function mount(): HTMLElement {
  const el = document.createElement('kai-prompt-input');
  document.body.appendChild(el);
  return el;
}

describe('kai-prompt-input tools', () => {
  it('takes the tree as a property and reports a toggle with its new state', async () => {
    const el = mount();
    const seen: unknown[] = [];
    el.addEventListener('kai-select', (e) => seen.push((e as CustomEvent).detail));
    (el as never as { tools: unknown }).tools = [{ id: 'web', label: 'Web search', checked: false }];

    const trigger = el.shadowRoot!.querySelector('[aria-label="More tools"]') as HTMLElement;
    trigger.click();
    const row = await new Promise<HTMLElement>((resolve) => {
      const find = () => {
        const found = document.querySelector('[role="menuitemcheckbox"]') as HTMLElement | null;
        if (found) resolve(found); else requestAnimationFrame(find);
      };
      find();
    });
    row.click();
    expect(seen).toEqual([{ id: 'web', checked: true }]);
  });

  it('pins the layout with the expanded property', () => {
    const el = mount() as HTMLElement & { expanded?: boolean };
    const frame = () => el.shadowRoot!.querySelector('[data-prompt-input]') as HTMLElement;
    expect(frame().className).toContain('flex-row');
    el.expanded = true;
    expect(frame().className).toContain('flex-col');
    el.expanded = false;
    expect(frame().className).toContain('flex-row');
  });

  it('reads `expanded="false"` as a pin, not as absent', () => {
    const el = document.createElement('kai-prompt-input');
    el.setAttribute('expanded', 'false');
    document.body.appendChild(el);
    const frame = el.shadowRoot!.querySelector('[data-prompt-input]') as HTMLElement;
    // The case flag() cannot express — see resolveExpandedProp.
    expect(frame.className).toContain('flex-row');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @kitn.ai/ui exec vitest run --project=unit tests/web-components/prompt-input-tools.test.tsx`
Expected: FAIL — no such trigger, no `tools` property, no `expanded`.

- [ ] **Step 3: Wire `ChatThread`**

Delete `webSearch={props.webSearch === true}` from the `<DefaultPromptInput>` call at `:875` and `onWebSearch={() => props.onWebSearch?.()}` at `:879`; add beside `attach`:

```tsx
                      tools={props.tools} expanded={props.expanded}
                      onToolSelect={(detail) => props.onToolSelect?.(detail)}
```

In `ChatThreadProps`, replace the `webSearch?: boolean` and `onWebSearch?: () => void` declarations with:

```tsx
  /** The composer's `+` menu tree: built-in file item first, then these. */
  tools?: ComposerToolItem[];
  /** Fired when a menu item is chosen; `checked` is the item's NEW state. */
  onToolSelect?: (detail: { id: string; checked?: boolean }) => void;
  /** Pins the composer's layout. Omit to derive it (composer-expansion). */
  expanded?: boolean;
```

- [ ] **Step 4: Wire both elements**

In `web-components/prompt/prompt-input.tsx`: replace the `webSearch` prop declaration and its `kai-web-search` event with

```tsx
  /** The composer's `+` menu tree. **JS property** — it is an array. */
  tools?: ComposerToolItem[];
  /** Pins the composer's layout: `true` two rows, `false` one row, omitted derives.
   *  Attribute: `expanded` (`="false"` pins one row). */
  expanded?: boolean;
```

and in `Events`, replace `'kai-web-search'` with

```tsx
  /** A `+` menu item was chosen. `checked` is present exactly when the item is a
   *  toggle, and carries its NEW state. */
  'kai-select': { id: string; checked?: boolean };
```

Add `tools: undefined, expanded: undefined,` to the defaults object and read the pin with the helper:

```tsx
      expanded={resolveExpandedProp(props.expanded, element.hasAttribute('expanded'), element.getAttribute('expanded'))}
```

In `web-components/chat/chat.tsx`: same three changes at the `defineWebComponent` defaults (`:196`), in `Events` (`kai-web-search` → the same `kai-select` detail), and at the `ChatThread` call site (`webSearch={flag('webSearch')}` and `onWebSearch={() => dispatch('kai-web-search', {})}` replaced by `tools={props.tools as ComposerToolItem[] | undefined} expanded={resolveExpandedProp(props.expanded, element.hasAttribute('expanded'), element.getAttribute('expanded'))}` and `onToolSelect={(detail) => dispatch('kai-select', detail)}`).

- [ ] **Step 5: Declare both arrays non-scalar**

In `web-component-nonscalar.json`, add `"tools"` to the `kai-chat` array (keeping the file's alphabetical order) and add a `kai-prompt-input` entry with `"tools"`. Verify with:

```bash
cd packages/ui && node scripts/gen-web-components-manifest.mjs && git diff --stat src/web-components/web-component-meta.json
```
Expected: `tools` appears as a property and **no** `tools` attribute is generated for either element.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @kitn.ai/ui exec vitest run --project=unit tests/web-components/prompt-input-tools.test.tsx src/components/chat/`
Expected: PASS.

- [ ] **Step 7: Commit** (commits approved)

```bash
git add packages/ui/src/components/chat/chat-thread.tsx packages/ui/src/web-components/ packages/ui/tests/web-components/prompt-input-tools.test.tsx
git rm packages/ui/tests/web-components/prompt-input-web-search.test.tsx
git commit -m "feat(composer)!: tools and expanded on both elements; webSearch and kai-web-search removed"
```

---

### Task 7: The in-tree consumers of the removed props

Every remaining `webSearch` / `web-search` hit is one of three things: the prop (remove), the event (rename), or an unrelated icon/skill id (leave alone).

**Files (triage each, do not bulk-edit):**
- Modify: `packages/ui/tests/web-components/chat-conversations.test.tsx`, `packages/ui/tests/e2e/menu-ivp.spec.ts`
- **Verify, do not assume:** `packages/ui/tests/e2e/promptinput-*.spec.ts` drives a HAND-COMPOSED `PromptInput` (the story fixtures compose it directly, not through `DefaultPromptInput`). Task 3 changed that frame's default layout to a single row, so those specs are the only place the old expectation could be encoded. Run them if Playwright and a served Storybook are available; if they are not runnable here, say so LOUDLY in the report with the reason — do not let an unrunnable suite read as a passing one. CI's own comment lists promptinput as a suite named by no step, so nothing else will catch it.
- **The sweep this task owes, corrected after Task 3's fix rounds.** An earlier note said to sweep classes a `display: contents` wrapper had made inert; that list is SUPERSEDED, because the wrapper is a box again and the sites' own `justify-*` work again. What remains is not class work but LAYOUT work: **every hand-composed `PromptInput` is now one row until its text wraps** — roughly 95 usages across five files, plus the two e2e specs. Each needs a look, not a mechanical edit: a site that composed the frame expecting two rows now renders the controls beside the text, which for a one-row composer is the intent and for a documentation snippet may not be. The genuinely redundant leftovers are wrapper paddings that used to inset the row the frame now owns — `empty.stories.tsx:341`'s `px-2 pb-2` is the clear one.
- Modify: `packages/ui/mcp/construct/codegen.ts` and `codegen.test.ts` — the emitted templates
- Modify: `packages/ui/.kai/acme-support/src/App.tsx`
- Modify: `packages/ui/src/web-components/prompt/prompt-input.stories.tsx`, `packages/ui/src/components/chat/chat-thread.stories.tsx`, `packages/ui/src/components/dropdown/dropdown.stories.tsx`, `packages/ui/src/web-components/menu/menu.stories.tsx`
- Modify: `packages/ui/scripts/lint-story-conventions.mjs` (only if it names the prop as a required story axis)
- Regenerate: `packages/ui/frameworks/react/index.tsx`, `packages/ui/src/web-components/web-component-types.d.ts`, `packages/ui/src/web-components/web-component-meta.json`, `packages/ui/llms-full.txt`, `packages/ui/mcp/catalog/derived.json`

**Interfaces:**
- Consumes: the surface from Task 6.
- Produces: no `webSearch`, `web-search` attribute, or `kai-web-search` listener anywhere in source.

- [ ] **Step 1: Enumerate the real hits**

```bash
grep -rn "webSearch\|web-search\|onWebSearch" packages apps examples docs --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=storybook-static
```
Expected: the list above, plus `packages/ui/src/web-components/message/message-skills.tsx` and `menu.stories.tsx` which mention a web-search **icon or skill id** — confirm before touching, and leave them if they are not the prop.

- [ ] **Step 2: Convert each prop use to a `tools` item**

The web-search declaration becomes, everywhere:

```tsx
tools={[{ id: 'web-search', label: 'Web search', icon: 'globe', checked: webSearch, chip: true }]}
```

with the host toggling `webSearch` from the event:

```tsx
onToolSelect={(d) => { if (d.id === 'web-search') setWebSearch(d.checked ?? false); }}
```

For the scaffolder's emitted templates (`codegen.ts`), colour the string so the emitted app's own state field drives `checked` — the emitted code must compile under `verify:scaffold`, which is the gate that proves it.

- [ ] **Step 2b: The send button is a circle with an icon — and it already is the default**

Owner ruling: the round icon-only button is the default, "since that seems to be where
everybody's landed with their UI". **The component agrees already.** `DefaultPromptInput`
sends with a 28px circle holding an up arrow (`default-input.tsx:391-393`, `size="icon-sm"`
`rounded-full`), which is ChatGPT's shape and its measured size — their send button is 28px
too. Nothing about the default changes.

What is wrong is that the kit's own stories contradict it. `prompt-input.stories.tsx`
hand-composes `<Button variant="default" size="sm">Send</Button>` ten times, which is
`rounded-md` — a rounded square with a word in it. That is the shape the owner saw, and it
is the one that reads wrong against a 24px-radius frame in either layout. So:

1. **Replace the labelled `Send` buttons in `prompt-input.stories.tsx`** with the component's
own shape: `size="icon-sm"`, `rounded-full`, the same up-arrow glyph, `aria-label="Send
   message"`. A story that renders a shape the component does not use is documentation that
   is wrong, and these ten are why the owner thought the default was a square.
2. **Add a dedicated story for the send button itself** (owner request), in its own file so it
   is findable rather than buried in a composer fixture. It shows, side by side:
   - the default — a circle, icon only, `aria-label` carrying the name;
   - the custom submit button a host can build instead — the labelled square
     (`variant="default" size="sm"`), which stays a legitimate choice and uses only public
     parts;
   - a circle with a DIFFERENT icon, because the glyph is the host's (the default happens to
     be an up arrow because that is where the references landed, not because it is pinned).
   Each case states what it is for. The point of the story is that all three are reachable
   without patching the component.

Pin the default's shape in a test rather than only in a story: `size="icon-sm"` is 28px, the
same as every other control in the row, and that shared size is why it reads as belonging to a
24px-radius frame. A class assertion plus the geometry probe is the honest pair — the probe
already measures the frame.

- [ ] **Step 2c: The shape is a TOKEN, and both shapes get shown**

The owner wants the pill/rounded-square choice back, and the mechanism already exists:
`--radius-composer` is `var(--kai-radius-composer, calc(var(--spacing) * 6))`, so a theme
that sets `--kai-radius-composer` to a smaller fixed value gets the pre-change rounded
square, and one that leaves it alone gets the derived pill.

**Ruled: no `shape` prop.** Every other dimension of this frame is a spacing step or a
token, and a look-shaped prop would be the first of its kind on the component — the kit's
convention is that looks come from the theme and the app decides them there. A per-instance
difference is already available through the frame's own `class` prop, which merges last-wins
(`utils/cn.ts`), so a single squared composer does not need new API either.

What this step actually adds:

1. Update the token's comment in `theme.css` to say it is OVERRIDABLE for a squared look
   and what that costs (the collapsed box stops being a pill, because the pill is half the
   row rather than a shape of its own). Right now the comment argues the derivation without
   saying anyone may replace it.
2. A story showing the squared variant, so the option is visible rather than described: set
   `--kai-radius-composer` on the story's host and render the same composer. Name it for what
   it is, not as an alternative default.
3. A line in the input's docs page, where a developer looks for "can I change this".

- [ ] **Step 3: Regenerate the derived artifacts**

```bash
npx nx build ui --skip-nx-cache
```
Expected: `web-component-meta.json`, `web-component-types.d.ts`, the React wrappers, `llms-full.txt` and the catalog all pick up `tools`/`expanded` and drop `webSearch`. Confirm with `git status --porcelain` that the generated files are the only unexpected ones.

- [ ] **Step 4: Prove the emitted templates still compile**

Run: `pnpm --filter @kitn.ai/ui run verify:scaffold`
Expected: PASS, and read the axes and cell counts it prints rather than assuming them.

- [ ] **Step 5: Run the affected suites**

```bash
pnpm --filter @kitn.ai/ui exec vitest run --project=unit tests/web-components src/components/chat src/components/prompt
pnpm --filter @kitn.ai/ui exec vitest run --project=unit src/stories
```
Expected: PASS.

- [ ] **Step 6: Commit** (commits approved)

```bash
git add -A
git commit -m "refactor!: web search is a tools item; regenerate the derived artifacts"
```

---

### Task 8: The geometry probe

jsdom cannot answer "is this one row or two", so the claim gets a real chromium.

**Files:**
- Create: `packages/ui/scripts/probe-composer-states.mjs` — geometry **and** the
  menu row's accessibility-tree shape (checks 1–7 and 8 below).
- Reference: `packages/ui/scripts/probe-workspace-shell-resize.mjs` (the harness: vite + solid plugin + playwright chromium, a self-contained `PAGE` string, a printed pass count, exit 1 on failure, and a "watch it fail" note at the top)

**Interfaces:**
- Consumes: the built kit through the vite dev server the probe boots.
- Produces: `node scripts/probe-composer-states.mjs [--headed]`.

- [ ] **Step 1: Write the probe**

Follow the reference script's structure exactly. The page mounts a real `<kai-prompt-input>` and the assertions are all geometry:

```js
// Heights come from the measured reference geometry, so a failure reports a
// pixel count against a real target rather than a vague "too tall":
//   collapsed        = 10 + 28 + 10                       = 48
//   expanded, 1 line + an attachment = 14 + 20 + 6 + 28 + 10 = 78
//   expanded, 2 lines              = 14 + 40 + 6 + 28 + 10 = 98
//
// 1. collapsed: the editable and Send share a vertical centre, and the frame is
//    one row tall.
//    assert Math.abs(editableRect.top - sendRect.top) < 4     // same line, centred
//    assert Math.abs(frameRect.height - 48) <= 3
// 2. typing ONE line keeps it collapsed.
//    assert Math.abs(frameRect.height - 48) <= 3
// 3. typing a second line expands it WITHOUT the user doing anything else.
//    assert Math.abs(frameRect.height - 98) <= 6
//    assert sendRect.top > editableRect.bottom - 4      // the controls moved BELOW
// 4. clearing the text collapses it again.
//    assert Math.abs(frameRect.height - 48) <= 3
// 5. an attachment alone expands it, with no text at all.
//    assert Math.abs(frameRect.height - 78) <= 6
// 6. expanded={false} pinned: three lines of text still render ONE row.
//    assert Math.abs(frameRect.height - 48) <= 3
// 7. expanded={true} pinned: empty renders TWO rows.
//    assert frameRect.height > 60
// 8. the menu row is ONE checkbox to assistive tech. Read the computed AX tree via
//    CDP `Accessibility.getFullAXTree`, the way probe-button-accessible-name.mjs
//    already establishes a computed name: the row must be present as a checkbox
//    with the right checked state, and the switch inside it must NOT appear as a
//    separate focusable control. This half cannot live in the unit suite — jsdom has
//    no accessibility tree, which is exactly why Task 1 could only assert attributes.
//    assert row.role === 'menuitemcheckbox' && row.checked === expected
//    assert no other node in that row has role 'switch' || focusable
// 9. a `control: 'switch'` row does not overflow its column. The column was sized
//    around a 16px checkmark; the themed Switch is 36x20. Measure the switch against
//    its column's content box and against the row's own box:
//    assert switchRect.right <= columnRect.right + 1
//    assert columnRect.width >= switchRect.width
//    assert switchRect.height <= rowRect.height
//    (finding 1 of Task 1's review: not assertable in jsdom, where nothing is
//    measured, which is how it survived a green suite.)
// 10. the threshold FOLLOWS a live font-size change. The line height must be read
//    from the element's current computed style, not captured once per element, or a
//    prose-size change leaves a stale threshold and ONE line of text renders as TWO
//    rows. Change the font size on the mounted element at runtime, then:
//    assert a ONE-line composer is still 48px tall   // collapsed, not expanded
//    assert a TWO-line composer is still ~98px tall  // and did not collapse
// 11. the radius stays half the collapsed row AT ANY DENSITY, not only the default.
//    `--radius-composer` is derived from the spacing scale and so is every padding
//    around it, so the relationship has to survive the row growing. Set a DOUBLED
//    `--kai-density` on the host, then:
//    assert collapsedHeight ≈ 2 × the default-density collapsed height
//    assert computed borderRadius ≈ collapsedHeight / 2
//    Without this the invariant is true by construction and measured NOWHERE — a unit
//    assertion only proves the utility is present, and jsdom measures nothing, so a
//    later tidy-up could restore a rem literal with every gate green.
// 12. a HAND-COMPOSED `PromptInput` keeps its controls at the trailing edge in the
//    expanded layout. The two story sites compose PromptInput + Textarea + Actions with
//    `justify-end` and nothing else, which worked while the frame was block-level. Now
//    that the frame is a flex container the actions wrapper is a content-width flex item,
//    so `justify-end` is inert and the frame's own `justify-between` is what places it.
//    Mount exactly that composition (not DefaultPromptInput, which has `ml-auto` and would
//    pass either way) and:
//    assert Math.abs(actionsRect.right - frameRect.right) < 3
// 13. the text sits on the row's centreline in the collapsed layout, EMPTY and TYPED.
//    Comparing centres alone is not enough: a 0-height editable centred in the body has
//    the same centre as the body, so that check passes while the placeholder sits half a
//    line low. Assert the height too, or the check has no teeth.
//    EMPTY: assert editableRect.height >= oneLine * 0.9      // it has an in-flow floor
//           assert |editableCentre - frameCentre| <= 1
//    TYPED, one line: both of the above again
//    A class assertion cannot see this, which is exactly how a 2-3px misalignment reached
//    the owner's eyes instead of a gate — and how the fix for it then made the empty state
//    10px low with every test green.
// 14. the shape token is a real switch. Set `--kai-radius-composer` to a squared value on
//    the host and assert the collapsed frame's computed `border-radius` is that value and
//    NOT half the row — i.e. the override replaces the derivation rather than losing to it.
//    The pill/rounded choice is a supported path, so it gets the same measurement the
//    derived default does.
```

Print each check with its measured numbers, so a failure shows the pixels rather than a boolean.

- [ ] **Step 2: Watch it fail**

Comment out the `useComposerExpansion` call and make `layout()` return `'collapsed'` unconditionally. Run:

```bash
cd packages/ui && node scripts/probe-composer-states.mjs
```
Expected: exit 1, with checks 3 and 5 (and 7) reporting the measured heights. A probe that passes before the fix is not measuring what it claims.

- [ ] **Step 3: Restore and confirm green**

```bash
cd packages/ui && node scripts/probe-composer-states.mjs
```
Expected: every check passes; the script exits 0.

- [ ] **Step 4: Commit** (commits approved)

```bash
git add packages/ui/scripts/probe-composer-states.mjs
git commit -m "test(composer): a real-chromium probe for the one-row/two-row geometry"
```

---

### Task 9: The block template, and the re-recorded baseline

**Files:**
- Modify: `packages/blocks/blocks/assistant/assistant.html` (the `<kai-chat>`/`<kai-prompt-input>` element and its script)
- Modify: `packages/blocks/blocks/assistant/assistant.controller.ts`
- Regenerate: `packages/ui/scripts/block-driver/baselines/assistant.json` and `baselines/screenshots-assistant/`

**Interfaces:**
- Consumes: the surface from Task 6.
- Produces: the template's own `tools` tree, with the chip on web search.

- [ ] **Step 1: Declare the template's tools**

In the block's controller, replace the web-search boolean with the tree (the block owns its own state, so the toggle round-trips through the event):

```ts
const tools = () => [
  { id: 'web-search', label: 'Web search', icon: 'globe', checked: store.webSearch(), chip: true },
  { id: 'skills', label: 'Skills', icon: 'sparkles', items: [/* the block's skills */] },
];
```

and the handler:

```ts
onToolSelect={(d) => { if (d.id === 'web-search') store.setWebSearch(d.checked ?? false); }}
```

This is the `chip: true` the spec's §8 names as the template's own choice — the kit's default stays quiet.

- [ ] **Step 2: Verify the block renders**

Run: `pnpm dev:blocks`, open <http://localhost:4321/blocks/>, and confirm in the assistant block: one row when empty, two when typing past a line, the `+` menu with the file item first, and a "Web search" chip after toggling it on from the menu.

- [ ] **Step 3: Re-record the baseline**

Run the block driver's record path (see `packages/ui/scripts/block-driver/`), then confirm `git status` shows `baselines/assistant.json` and the screenshots as the only changed artifacts.

- [ ] **Step 4: Run the block gates**

```bash
pnpm --filter @kitn.ai/ui run verify:blocks
```
Expected: PASS.

- [ ] **Step 5: Commit** (commits approved)

```bash
git add packages/blocks/blocks/assistant/ packages/ui/scripts/block-driver/baselines/
git commit -m "feat(blocks/assistant): the template declares its own tools, with a web-search chip"
```

---

## Self-review

**Spec coverage.** §2 (measured facts) — no task, correctly: it is evidence, and §2.7 is the input to Task 2. §3.1–3.2 the two layouts → Task 3. §3.3 the derived trigger → Task 2. §3.4 the radius → Task 3 step 3. §3.5 pinned layouts → Tasks 2 and 6. §3.6 out of scope — no task, correctly. §4.2 the default tree → Task 4. §4.3 groups and separators — already supported, exercised in Tasks 1 and 4's tests. §4.4 the three fields → Task 1. §4.5 selection events → Tasks 4 and 6. §4.6 replacement — no task: the slot already exists and `toolbarActions` is untouched. §5.1–5.3 → Task 5. §5.4 the accessible name → Task 5's test. §6.1–6.4 → Tasks 1, 6 and 7. §6.5 the mic — no task, deliberately: spec 2. §7 in-tree changes → Task 7. §8 the template → Task 9. §9 testing → Tasks 2, 5, 8 and 9.
Gap found and closed: the spec's §9 asks for a real-browser probe, which the first draft of this plan folded into Task 7's unit run. It is now Task 8, with its own "watch it fail" step.

**Placeholder scan.** No TBD/TODO. Two steps describe a judgement rather than a line of code (Task 4's rewrite of the three attach-tooltip cases, Task 7's triage of icon-vs-prop hits); both name the exact file and the exact decision, and neither can be written blind without reading the file.

**Type consistency.** `ComposerLayout`, `resolveComposerLayout`, `resolveExpandedProp` and `useComposerExpansion` are named identically in Tasks 2, 3 and 6. `ComposerToolItem` is defined in Task 4 and consumed in Tasks 5, 6, 7 and 9. `buildComposerTools`, `COMPOSER_FILE_ITEM_ID`, `chipItems` and `ComposerChips` are defined once each. `kai-select` is the single event name in Tasks 6, 7 and 9, and it matches `<kai-menu>`'s existing event, as the spec's §6.3 requires.
