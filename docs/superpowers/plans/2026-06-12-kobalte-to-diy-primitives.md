# Kobalte → DIY Accessible Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the `@kobalte/core` runtime dependency by reimplementing the four primitives the kit uses — collapsible, tooltip, hover-card, dropdown (menu) — as our own SolidJS components on `@floating-ui/dom`, behind unchanged public APIs, fixing three known Kobalte bugs along the way.

**Architecture:** A shared internal `overlay.tsx` core owns portal + floating-ui positioning (`autoUpdate`-tracked) + Presence (enter/exit animation) + dismiss + a polymorphic `As` helper. Tooltip, hover-card, and dropdown are thin layers on top; collapsible is standalone. Each primitive keeps its exact current public API so the ~9 consumer components don't change (except `context.tsx`, which migrates off a raw Kobalte import).

**Tech Stack:** SolidJS, `@floating-ui/dom`, `tw-animate-css` (already present), vitest + `@solidjs/testing-library` (jsdom), Playwright (headless, behavioral/visual verification).

**Source of truth:** `docs/superpowers/specs/2026-06-12-kobalte-to-diy-primitives-design.md`. Read it before starting any task.

**Bugs being fixed (verify each is better than Kobalte side-by-side):**
- **DD-1** — dropdown must NOT lock page scroll while open.
- **DD-2** — dropdown menu must follow the trigger on scroll/resize (Kobalte leaves it in place).
- **HC-1** — hover card must be deterministic across repeated hovers (Kobalte goes sporadic after the first).

**Validation gate (run after every task):** `npm run build` && `npm run typecheck` && `npm test`. Baseline = exactly 3 pre-existing env-flaky failures in `tests/primitives/highlighter.test.ts` (Shiki + jsdom `scrollTo`). Any NEW failure = regression. Commit only when green.

**Conventions to follow (from the codebase):**
- Tests: `import { render, screen } from '@solidjs/testing-library'`; vitest globals (`describe/it/expect`); jsdom env. To exercise `config.portalMount()`, wrap render in `<ChatConfig portalMount={node}>…</ChatConfig>` (see `tests/primitives/chat-config-portal.test.tsx`). `useChatConfig()` outside a provider returns defaults with `portalMount()` → `undefined` (Portal then mounts to `document.body`), so most unit tests can skip the provider.
- `cn` from `../utils/cn` for class merge.
- jsdom has **no layout** → never assert pixel positions in unit tests. Positioning, autoUpdate-on-scroll, and animations are verified only in the Playwright/showcase pass (Task 7).

---

## File Structure

- **Create** `src/ui/overlay.tsx` — internal shared core. Exports: `createPresence`, `usePosition`, `As`, `useDismiss`. NOT re-exported from `src/index.ts`.
- **Rewrite** `src/ui/collapsible.tsx` — standalone; same exports (`Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`).
- **Rewrite** `src/ui/tooltip.tsx` — same export (`Tooltip`).
- **Rewrite** `src/ui/hover-card.tsx` — same exports (`HoverCard`, `HoverCardRoot`, `HoverCardTrigger`, `HoverCardContent` + their prop interfaces).
- **Rewrite** `src/ui/dropdown.tsx` — same exports (`Dropdown`, `DropdownTrigger`, `DropdownContent`, `DropdownItem`).
- **Modify** `src/components/context.tsx` — replace raw `@kobalte/core/hover-card` usage with our compound API.
- **Modify** `package.json` — add `@floating-ui/dom` (Task 1); remove `@kobalte/core` (Task 8).
- **Create** tests under `tests/ui/`: `overlay.test.tsx`, `collapsible.test.tsx`, `tooltip.test.tsx`, `hover-card.test.tsx`, `dropdown.test.tsx`.

Each `src/ui/*` file owns one primitive. `overlay.tsx` holds only cross-cutting mechanics. No file should exceed ~200 lines; if dropdown grows past that, split the roving-focus logic into `src/ui/use-roving-focus.tsx`.

---

## Task 1: Overlay core — dependency + Presence

**Files:**
- Modify: `package.json`
- Create: `src/ui/overlay.tsx`
- Test: `tests/ui/overlay.test.tsx`

- [ ] **Step 1: Add the floating-ui dependency**

Run: `npm install @floating-ui/dom@^1.6.0`
Expected: `@floating-ui/dom` appears in `package.json` `dependencies`. (It was already transitive via Kobalte, so the lockfile barely changes.)

- [ ] **Step 2: Write the failing Presence test**

```tsx
// tests/ui/overlay.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { createPresence } from '../../src/ui/overlay';

describe('createPresence', () => {
  it('is present immediately when shown', () => {
    let present!: () => boolean;
    render(() => {
      const [show] = createSignal(true);
      const p = createPresence(show);
      present = p.present;
      return <div ref={p.setRef} />;
    });
    expect(present()).toBe(true);
  });

  it('unmounts immediately on hide when no animation is defined (jsdom)', async () => {
    const [show, setShow] = createSignal(true);
    let present!: () => boolean;
    render(() => {
      const p = createPresence(show);
      present = p.present;
      return <div ref={p.setRef} />;
    });
    expect(present()).toBe(true);
    setShow(false);
    // microtask flush
    await Promise.resolve();
    expect(present()).toBe(false);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run tests/ui/overlay.test.tsx`
Expected: FAIL — `createPresence` is not exported / module not found.

- [ ] **Step 4: Implement `createPresence` (+ file scaffolding)**

```tsx
// src/ui/overlay.tsx
import {
  createSignal, createEffect, onCleanup, type Accessor, type JSX,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';

/**
 * Keep a node mounted through its CSS exit animation.
 * Open  -> present=true, state='open'  (enter animation via base classes)
 * Close -> state='closed' (data-closed triggers tw-animate-css animate-out),
 *          then unmount on `animationend`. If no animation is defined
 *          (e.g. jsdom), unmount on the next microtask.
 */
export function createPresence(show: Accessor<boolean>) {
  const [present, setPresent] = createSignal(show());
  const [state, setState] = createSignal<'open' | 'closed'>(show() ? 'open' : 'closed');
  let node: HTMLElement | undefined;
  const setRef = (el: HTMLElement) => { node = el; };

  createEffect((prev: boolean | undefined) => {
    const visible = show();
    if (visible) {
      setPresent(true);
      setState('open');
    } else if (prev) {
      // transition true -> false
      setState('closed');
      const el = node;
      const hasAnim = el && (() => {
        const cs = getComputedStyle(el);
        return cs.animationName !== 'none' && parseFloat(cs.animationDuration || '0') > 0;
      })();
      if (!el || !hasAnim) {
        queueMicrotask(() => setPresent(false));
        return visible;
      }
      const onEnd = (e: AnimationEvent) => {
        if (e.target !== el) return;
        el.removeEventListener('animationend', onEnd);
        setPresent(false);
      };
      el.addEventListener('animationend', onEnd);
      onCleanup(() => el.removeEventListener('animationend', onEnd));
    }
    return visible;
  });

  return { present, state, setRef };
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/ui/overlay.test.tsx`
Expected: PASS (both presence tests).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/ui/overlay.tsx tests/ui/overlay.test.tsx
git commit -m "feat(ui): add @floating-ui/dom dep + createPresence overlay primitive"
```

---

## Task 2: Overlay core — polymorphic `As` helper

**Files:**
- Modify: `src/ui/overlay.tsx`
- Test: `tests/ui/overlay.test.tsx`

- [ ] **Step 1: Write the failing `As` tests**

Append to `tests/ui/overlay.test.tsx`:

```tsx
import { As } from '../../src/ui/overlay';
import { screen } from '@solidjs/testing-library';

describe('As', () => {
  it('renders the string tag with forwarded props', () => {
    render(() => (
      <As as="button" data-testid="t" type="button" aria-expanded="false">hi</As>
    ));
    const el = screen.getByTestId('t');
    expect(el.tagName).toBe('BUTTON');
    expect(el.getAttribute('aria-expanded')).toBe('false');
  });

  it('passes forwarded props to a render-function `as`', () => {
    let received: any;
    render(() => (
      <As as={(p: any) => { received = p; return <span data-testid="r" {...p} />; }} data-x="1" />
    ));
    expect(received['data-x']).toBe('1');
    expect(screen.getByTestId('r').getAttribute('data-x')).toBe('1');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/ui/overlay.test.tsx`
Expected: FAIL — `As` not exported.

- [ ] **Step 3: Implement `As`**

Append to `src/ui/overlay.tsx`:

```tsx
import { splitProps } from 'solid-js'; // add to the existing solid-js import

export type AsTag = string | ((props: Record<string, any>) => JSX.Element);

/**
 * Polymorphic element. `as` may be a tag name (default 'span') or a render
 * function that receives the forwarded props (Kobalte-compatible `as={fn}`).
 * Uses splitProps (NOT destructuring) so reactive forwarded props such as
 * aria-expanded stay reactive. All extra props (incl. `ref`, event handlers,
 * aria-*) are forwarded.
 */
export function As(props: { as?: AsTag; children?: JSX.Element; [k: string]: any }) {
  const [local, rest] = splitProps(props, ['as']);
  if (typeof local.as === 'function') return local.as(rest);
  return <Dynamic component={local.as ?? 'span'} {...rest} />;
}
```

> Notes: `rest` from `splitProps` is a reactive proxy, so `<Dynamic {...rest} />` and `local.as(rest)` both keep forwarded props (e.g. `aria-expanded`) reactive — plain object destructuring would freeze them. `children` is left in `rest` so it forwards naturally. SolidJS wires `ref` through spread onto host elements, so a consumer's `as={(p) => <Button {...p} />}` gets our ref.
>
> **Convention for all primitives below:** never destructure `props` (`const { a, ...rest } = props` breaks reactivity). Use `splitProps`. Where a snippet shows destructuring for brevity, convert it to `splitProps` in implementation — the test for that primitive's reactive attribute (e.g. `aria-expanded` flipping) will catch it if you don't.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/ui/overlay.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/overlay.tsx tests/ui/overlay.test.tsx
git commit -m "feat(ui): add polymorphic As helper to overlay core"
```

---

## Task 3: Overlay core — positioning + dismiss

**Files:**
- Modify: `src/ui/overlay.tsx`
- Test: `tests/ui/overlay.test.tsx`

jsdom can't compute layout, so these are smoke/contract tests only (real positioning is verified in Task 7).

- [ ] **Step 1: Write the failing dismiss test**

Append to `tests/ui/overlay.test.tsx`:

```tsx
import { useDismiss } from '../../src/ui/overlay';
import { createSignal } from 'solid-js';

describe('useDismiss', () => {
  it('calls onDismiss on Escape keydown', () => {
    let dismissed = 0;
    render(() => {
      const [open] = createSignal(true);
      useDismiss({ enabled: open, onDismiss: () => { dismissed++; }, refs: () => [] });
      return null;
    });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(dismissed).toBe(1);
  });

  it('calls onDismiss on pointerdown outside the provided refs', () => {
    const inside = document.createElement('div');
    document.body.appendChild(inside);
    let dismissed = 0;
    render(() => {
      const [open] = createSignal(true);
      useDismiss({ enabled: open, onDismiss: () => { dismissed++; }, refs: () => [inside] });
      return null;
    });
    // pointerdown inside -> no dismiss
    inside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(dismissed).toBe(0);
    // pointerdown elsewhere -> dismiss
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(dismissed).toBe(1);
    inside.remove();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/ui/overlay.test.tsx`
Expected: FAIL — `useDismiss` not exported.

- [ ] **Step 3: Implement `usePosition` + `useDismiss`**

Append to `src/ui/overlay.tsx` (add the floating-ui import at the top of the file):

```tsx
import {
  computePosition, autoUpdate, offset, flip, shift, arrow, type Placement,
} from '@floating-ui/dom';

export interface UsePositionOptions {
  placement?: Placement;
  gutter?: number;
  arrowEl?: Accessor<HTMLElement | undefined>;
}

/**
 * Position `floating` relative to `reference` using fixed strategy + autoUpdate,
 * so the element tracks the trigger on scroll/resize (fix DD-2). Writes
 * position into the returned `pos` signal; caller applies it as inline style.
 */
export function usePosition(
  reference: Accessor<HTMLElement | undefined>,
  floating: Accessor<HTMLElement | undefined>,
  options: UsePositionOptions = {},
) {
  const [pos, setPos] = createSignal<{ x: number; y: number; placement: Placement }>(
    { x: 0, y: 0, placement: options.placement ?? 'bottom' },
  );
  const [arrowPos, setArrowPos] = createSignal<{ x?: number; y?: number }>({});

  createEffect(() => {
    const ref = reference();
    const float = floating();
    if (!ref || !float) return;
    const update = () => {
      const middleware = [offset(options.gutter ?? 8), flip(), shift({ padding: 8 })];
      const aEl = options.arrowEl?.();
      if (aEl) middleware.push(arrow({ element: aEl }));
      computePosition(ref, float, {
        placement: options.placement ?? 'bottom',
        strategy: 'fixed',
        middleware,
      }).then(({ x, y, placement, middlewareData }) => {
        setPos({ x, y, placement });
        if (middlewareData.arrow) setArrowPos({ x: middlewareData.arrow.x, y: middlewareData.arrow.y });
      });
    };
    const cleanup = autoUpdate(ref, float, update);
    onCleanup(cleanup);
  });

  return { pos, arrowPos };
}

export type DismissReason = 'escape' | 'outside';

export interface UseDismissOptions {
  enabled: Accessor<boolean>;
  onDismiss: (reason: DismissReason) => void;
  /** Elements considered "inside" (trigger + content). Pointerdown outside all of them dismisses. */
  refs: () => (HTMLElement | undefined)[];
}

/** Escape key + outside-pointerdown dismissal. Does NOT lock page scroll (fix DD-1). */
export function useDismiss(opts: UseDismissOptions) {
  createEffect(() => {
    if (!opts.enabled()) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') opts.onDismiss('escape'); };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      const inside = opts.refs().some((el) => el && el.contains(target));
      if (!inside) opts.onDismiss('outside');
    };
    document.addEventListener('keydown', onKey);
    // capture phase so we see it before content handlers stop propagation
    document.addEventListener('pointerdown', onPointer, true);
    onCleanup(() => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer, true);
    });
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/ui/overlay.test.tsx`
Expected: PASS (all overlay tests).

- [ ] **Step 5: Run the full validation gate**

Run: `npm run build && npm run typecheck && npm test`
Expected: build + typecheck clean; tests green except the 3 known Shiki/jsdom baseline failures.

- [ ] **Step 6: Commit**

```bash
git add src/ui/overlay.tsx tests/ui/overlay.test.tsx
git commit -m "feat(ui): add usePosition (autoUpdate) + useDismiss to overlay core"
```

---

## Task 4: Collapsible (standalone)

**Files:**
- Rewrite: `src/ui/collapsible.tsx`
- Test: `tests/ui/collapsible.test.tsx`

Public API to preserve (consumers in tool / conversation-list / chain-of-thought):
`<Collapsible open={sig()} onOpenChange={setSig}>`, `<CollapsibleTrigger>`, `<CollapsibleContent class?>`. Controlled `open`/`onOpenChange` is what consumers use; also support uncontrolled `defaultOpen` for parity.

- [ ] **Step 1: Write the failing tests**

```tsx
// tests/ui/collapsible.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../../src/ui/collapsible';

describe('Collapsible', () => {
  it('trigger has aria-expanded reflecting controlled open + toggles via onOpenChange', () => {
    const [open, setOpen] = createSignal(false);
    render(() => (
      <Collapsible open={open()} onOpenChange={setOpen}>
        <CollapsibleTrigger data-testid="trg">Toggle</CollapsibleTrigger>
        <CollapsibleContent><p>Body</p></CollapsibleContent>
      </Collapsible>
    ));
    const trg = screen.getByTestId('trg');
    expect(trg.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trg);
    expect(open()).toBe(true);
    expect(trg.getAttribute('aria-expanded')).toBe('true');
  });

  it('content links to trigger via aria-controls', () => {
    const [open] = createSignal(true);
    render(() => (
      <Collapsible open={open()} onOpenChange={() => {}}>
        <CollapsibleTrigger data-testid="trg">Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="body">Body</CollapsibleContent>
      </Collapsible>
    ));
    const id = screen.getByTestId('trg').getAttribute('aria-controls');
    expect(id).toBeTruthy();
    expect(screen.getByTestId('body').id).toBe(id);
  });

  it('uncontrolled defaultOpen toggles internally', () => {
    render(() => (
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger data-testid="trg">Toggle</CollapsibleTrigger>
        <CollapsibleContent>Body</CollapsibleContent>
      </Collapsible>
    ));
    const trg = screen.getByTestId('trg');
    expect(trg.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trg);
    expect(trg.getAttribute('aria-expanded')).toBe('true');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/ui/collapsible.test.tsx`
Expected: FAIL — new component shape not present.

- [ ] **Step 3: Implement collapsible**

```tsx
// src/ui/collapsible.tsx
import { createContext, useContext, createSignal, createUniqueId, type JSX, type Accessor } from 'solid-js';
import { cn } from '../utils/cn';

interface CollapsibleCtx {
  open: Accessor<boolean>;
  toggle: () => void;
  contentId: string;
}
const Ctx = createContext<CollapsibleCtx>();
const useCollapsible = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('Collapsible parts must be used within <Collapsible>');
  return c;
};

export function Collapsible(props: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: JSX.Element;
  class?: string;
}) {
  const [uncontrolled, setUncontrolled] = createSignal(props.defaultOpen ?? false);
  const isControlled = () => props.open !== undefined;
  const open = () => (isControlled() ? !!props.open : uncontrolled());
  const toggle = () => {
    const next = !open();
    if (!isControlled()) setUncontrolled(next);
    props.onOpenChange?.(next);
  };
  const contentId = createUniqueId();
  return (
    <Ctx.Provider value={{ open, toggle, contentId }}>
      <div class={props.class} data-expanded={open() ? '' : undefined}>{props.children}</div>
    </Ctx.Provider>
  );
}

export function CollapsibleTrigger(props: { children: JSX.Element; class?: string; [k: string]: any }) {
  const ctx = useCollapsible();
  const { children, class: cls, ...rest } = props;
  return (
    <button
      type="button"
      class={cls}
      aria-expanded={ctx.open()}
      aria-controls={ctx.contentId}
      data-expanded={ctx.open() ? '' : undefined}
      onClick={() => ctx.toggle()}
      {...rest}
    >
      {children}
    </button>
  );
}

export function CollapsibleContent(props: { children: JSX.Element; class?: string; [k: string]: any }) {
  const ctx = useCollapsible();
  const { children, class: cls, ...rest } = props;
  return (
    <div
      id={ctx.contentId}
      data-expanded={ctx.open() ? '' : undefined}
      data-closed={ctx.open() ? undefined : ''}
      // grid-rows trick: animate 0fr<->1fr for smooth height in both directions
      class={cn(
        'grid transition-[grid-template-rows] duration-200 ease-out',
        ctx.open() ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
      )}
      // a11y: when closed, remove from tab/AX tree
      inert={ctx.open() ? undefined : true}
      {...rest}
    >
      <div class={cn('overflow-hidden', cls)}>{children}</div>
    </div>
  );
}
```

> The `inert` attribute on close handles a11y immediately. (jsdom sets the attribute fine; real height animation is verified in Task 7. If a consumer relied on `CollapsibleContent` being the single child element for layout, the extra wrapper `div` is contained by `overflow-hidden` and should be visually inert — verify in showcase.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/ui/collapsible.test.tsx`
Expected: PASS.

- [ ] **Step 5: Validation gate + visual sanity**

Run: `npm run build && npm run typecheck && npm test`
Expected: green vs baseline. Then in the showcase (Task 7 harness) confirm tool / conversation-list / chain-of-thought expand/collapse smoothly.

- [ ] **Step 6: Commit**

```bash
git add src/ui/collapsible.tsx tests/ui/collapsible.test.tsx
git commit -m "feat(ui): reimplement Collapsible without Kobalte (grid-rows anim, inert on close)"
```

---

## Task 5: Tooltip

**Files:**
- Rewrite: `src/ui/tooltip.tsx`
- Test: `tests/ui/tooltip.test.tsx`

Public API: `<Tooltip content={string} class?>{trigger}</Tooltip>`. Show on hover/focus after a delay; `role="tooltip"`; `aria-describedby`; dismiss on Escape/leave/blur.

- [ ] **Step 1: Write the failing tests**

```tsx
// tests/ui/tooltip.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { Tooltip } from '../../src/ui/tooltip';

describe('Tooltip', () => {
  it('shows on focus and wires aria-describedby', async () => {
    render(() => <Tooltip content="Hello"><button data-testid="b">x</button></Tooltip>);
    const trigger = screen.getByTestId('b').parentElement!; // As span wraps the button
    fireEvent.focusIn(trigger);
    const tip = await screen.findByRole('tooltip');
    expect(tip.textContent).toBe('Hello');
    expect(trigger.getAttribute('aria-describedby')).toBe(tip.id);
  });

  it('hides on Escape', async () => {
    render(() => <Tooltip content="Hello"><button>x</button></Tooltip>);
    const trigger = screen.getByText('x').parentElement!;
    fireEvent.focusIn(trigger);
    await screen.findByRole('tooltip');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
```

> Tooltip `openDelay` defaults to a small value; for deterministic tests, the implementation must open synchronously on `focusin` (delay applies to pointer-hover only) OR the tests use fake timers. This plan opens immediately on focus, applies `openDelay` only to pointer hover — simpler and matches Kobalte's "focus is instant" behavior.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/ui/tooltip.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement tooltip**

```tsx
// src/ui/tooltip.tsx
import { createSignal, createUniqueId, Show, type JSX, splitProps } from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../utils/cn';
import { useChatConfig } from '../primitives/chat-config';
import { createPresence, usePosition, useDismiss, As } from './overlay';

export interface TooltipProps { content: string; children: JSX.Element; class?: string; openDelay?: number; }

export function Tooltip(props: TooltipProps) {
  const [local] = splitProps(props, ['content', 'children', 'class', 'openDelay']);
  const config = useChatConfig();
  const id = createUniqueId();
  const [open, setOpen] = createSignal(false);
  let trigger: HTMLElement | undefined;
  let content: HTMLElement | undefined;
  let timer: number | undefined;

  const show = (delay = 0) => {
    clearTimeout(timer);
    if (delay) timer = window.setTimeout(() => setOpen(true), delay);
    else setOpen(true);
  };
  const hide = () => { clearTimeout(timer); setOpen(false); };

  const presence = createPresence(open);
  const position = usePosition(() => trigger, () => content, { placement: 'top', gutter: 6 });
  useDismiss({ enabled: open, onDismiss: hide, refs: () => [trigger, content] });

  return (
    <>
      <As
        as="span"
        ref={(el: HTMLElement) => (trigger = el)}
        aria-describedby={open() ? id : undefined}
        onPointerEnter={() => show(local.openDelay ?? 600)}
        onPointerLeave={hide}
        onFocusIn={() => show()}
        onFocusOut={hide}
      >
        {local.children}
      </As>
      <Show when={presence.present()}>
        <Portal mount={config.portalMount()}>
          <div
            ref={(el) => { content = el; presence.setRef(el); }}
            id={id}
            role="tooltip"
            data-expanded={presence.state() === 'open' ? '' : undefined}
            data-closed={presence.state() === 'closed' ? '' : undefined}
            style={{ position: 'fixed', left: `${position.pos().x}px`, top: `${position.pos().y}px`, 'pointer-events': 'none' }}
            class={cn(
              'z-50 rounded-md bg-foreground px-2.5 py-1 text-xs text-background shadow-md',
              'animate-in fade-in-0 zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95',
              local.class,
            )}
          >
            {local.content}
          </div>
        </Portal>
      </Show>
    </>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/ui/tooltip.test.tsx`
Expected: PASS.

- [ ] **Step 5: Validation gate + commit**

```bash
npm run build && npm run typecheck && npm test
git add src/ui/tooltip.tsx tests/ui/tooltip.test.tsx
git commit -m "feat(ui): reimplement Tooltip on overlay core (role=tooltip, aria-describedby)"
```

---

## Task 6: HoverCard (HC-1 fix)

**Files:**
- Rewrite: `src/ui/hover-card.tsx`
- Modify: `src/components/context.tsx`
- Test: `tests/ui/hover-card.test.tsx`

Public API: `HoverCard` (convenience, `trigger` prop), `HoverCardRoot` (`openDelay`/`closeDelay`), `HoverCardTrigger`, `HoverCardContent` (+ interfaces). Add optional arrow for `context.tsx`. The fix: **one shared timer state machine** in Root context — enter on trigger OR content cancels close + starts open; leave on either starts close; deterministic teardown.

- [ ] **Step 1: Write the failing HC-1 determinism tests**

```tsx
// tests/ui/hover-card.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { HoverCardRoot, HoverCardTrigger, HoverCardContent } from '../../src/ui/hover-card';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup() {
  return render(() => (
    <HoverCardRoot openDelay={100} closeDelay={100}>
      <HoverCardTrigger><button data-testid="trg">trigger</button></HoverCardTrigger>
      <HoverCardContent><div data-testid="content">card</div></HoverCardContent>
    </HoverCardRoot>
  ));
}

describe('HoverCard determinism (HC-1)', () => {
  it('opens after openDelay on enter and stays deterministic across repeated cycles', () => {
    setup();
    const trg = screen.getByTestId('trg').parentElement!;
    for (let i = 0; i < 5; i++) {
      fireEvent.pointerEnter(trg);
      vi.advanceTimersByTime(100);
      expect(screen.queryByTestId('content')).toBeTruthy();
      fireEvent.pointerLeave(trg);
      vi.advanceTimersByTime(100);
      expect(screen.queryByTestId('content')).toBeNull();
    }
  });

  it('pointer transit trigger -> content keeps it open', () => {
    setup();
    const trg = screen.getByTestId('trg').parentElement!;
    fireEvent.pointerEnter(trg);
    vi.advanceTimersByTime(100);
    const content = screen.getByTestId('content').closest('[data-hovercard-content]')!;
    fireEvent.pointerLeave(trg);
    fireEvent.pointerEnter(content); // enters before closeDelay elapses
    vi.advanceTimersByTime(100);
    expect(screen.queryByTestId('content')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/ui/hover-card.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement hover-card**

```tsx
// src/ui/hover-card.tsx
import {
  createContext, useContext, createSignal, createUniqueId, Show, splitProps,
  type JSX, type Accessor,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../utils/cn';
import { useChatConfig } from '../primitives/chat-config';
import { createPresence, usePosition, useDismiss, As } from './overlay';

interface HoverCardCtx {
  open: Accessor<boolean>;
  enter: () => void;
  leave: () => void;
  setTrigger: (el: HTMLElement) => void;
  setContent: (el: HTMLElement) => void;
  trigger: () => HTMLElement | undefined;
  content: () => HTMLElement | undefined;
}
const Ctx = createContext<HoverCardCtx>();
const useHoverCard = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('HoverCard parts must be used within <HoverCardRoot>');
  return c;
};

export interface HoverCardRootProps { children: JSX.Element; openDelay?: number; closeDelay?: number; }

export function HoverCardRoot(props: HoverCardRootProps) {
  const [open, setOpen] = createSignal(false);
  let trigger: HTMLElement | undefined;
  let content: HTMLElement | undefined;
  let timer: number | undefined;

  // Single deterministic state machine shared by trigger AND content (HC-1 fix).
  const enter = () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => setOpen(true), props.openDelay ?? 0);
  };
  const leave = () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => setOpen(false), props.closeDelay ?? 0);
  };

  return (
    <Ctx.Provider
      value={{
        open,
        enter,
        leave,
        setTrigger: (el) => (trigger = el),
        setContent: (el) => (content = el),
        trigger: () => trigger,
        content: () => content,
      }}
    >
      {props.children}
    </Ctx.Provider>
  );
}

export interface HoverCardTriggerProps { children: JSX.Element; }

export function HoverCardTrigger(props: HoverCardTriggerProps) {
  const ctx = useHoverCard();
  return (
    <As
      as="span"
      ref={ctx.setTrigger}
      onPointerEnter={ctx.enter}
      onPointerLeave={ctx.leave}
      onFocusIn={ctx.enter}
      onFocusOut={ctx.leave}
    >
      {props.children}
    </As>
  );
}

export interface HoverCardContentProps { children: JSX.Element; class?: string; }

export function HoverCardContent(props: HoverCardContentProps) {
  const ctx = useHoverCard();
  const config = useChatConfig();
  const presence = createPresence(ctx.open);
  const position = usePosition(ctx.trigger, ctx.content, { placement: 'bottom', gutter: 8 });
  useDismiss({ enabled: ctx.open, onDismiss: ctx.leave, refs: () => [ctx.trigger(), ctx.content()] });

  return (
    <Show when={presence.present()}>
      <Portal mount={config.portalMount()}>
        <div
          ref={(el) => { ctx.setContent(el); presence.setRef(el); }}
          data-hovercard-content
          data-expanded={presence.state() === 'open' ? '' : undefined}
          data-closed={presence.state() === 'closed' ? '' : undefined}
          onPointerEnter={ctx.enter}
          onPointerLeave={ctx.leave}
          style={{ position: 'fixed', left: `${position.pos().x}px`, top: `${position.pos().y}px` }}
          class={cn(
            'z-50 rounded-lg bg-card shadow-lg',
            'animate-in fade-in-0 zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95',
            props.class,
          )}
        >
          {props.children}
        </div>
      </Portal>
    </Show>
  );
}

// Convenience wrapper (single-call form used by attachments/context list items).
export interface HoverCardProps { trigger: JSX.Element; children: JSX.Element; class?: string; openDelay?: number; closeDelay?: number; }

export function HoverCard(props: HoverCardProps) {
  const [local] = splitProps(props, ['trigger', 'children', 'class', 'openDelay', 'closeDelay']);
  return (
    <HoverCardRoot openDelay={local.openDelay} closeDelay={local.closeDelay}>
      <HoverCardTrigger>{local.trigger}</HoverCardTrigger>
      <HoverCardContent class={cn('w-64 p-4', local.class)}>{local.children}</HoverCardContent>
    </HoverCardRoot>
  );
}
```

> The `data-hovercard-content` attribute is what the determinism test queries; keep it. If `context.tsx` needs an arrow, render a positioned `<div>` inside content using `position.arrowPos()` — but verify `context.tsx`'s current visual first; it may not need the arrow once re-themed. Match the previous `bg-card` look.

- [ ] **Step 4: Migrate `context.tsx`**

Open `src/components/context.tsx`. Replace `import { HoverCard as KHoverCard } from '@kobalte/core/hover-card'` and its `KHoverCard.Root/Trigger/Portal/Content/Arrow` usage with our `HoverCardRoot` / `HoverCardTrigger` / `HoverCardContent` (import from `../ui/hover-card`). Preserve the `openDelay={0} closeDelay={0}` values and the existing content markup/classes. Remove the `KHoverCard.Arrow` (or reimplement as a small rotated `<div>` if the visual needs it — confirm in showcase). Do not change `context.tsx`'s public props.

- [ ] **Step 5: Run to verify it passes + gate**

Run: `npx vitest run tests/ui/hover-card.test.tsx && npm run build && npm run typecheck && npm test`
Expected: hover-card tests PASS; gate green vs baseline.

- [ ] **Step 6: Commit**

```bash
git add src/ui/hover-card.tsx src/components/context.tsx tests/ui/hover-card.test.tsx
git commit -m "feat(ui): reimplement HoverCard with deterministic shared-timer machine (HC-1); migrate context.tsx"
```

---

## Task 7: Dropdown menu (DD-1 / DD-2 fix)

**Files:**
- Rewrite: `src/ui/dropdown.tsx`
- (Optional) Create: `src/ui/use-roving-focus.tsx` if `dropdown.tsx` exceeds ~200 lines
- Test: `tests/ui/dropdown.test.tsx`

Public API: `Dropdown` (root), `DropdownTrigger` (supports `as={(props) => …}`), `DropdownContent`, `DropdownItem` (`onSelect`). `role=menu`/`menuitem`, roving focus, typeahead, Escape→close+return focus, outside-click close, page stays scrollable, menu follows trigger on scroll.

- [ ] **Step 1: Write the failing tests**

```tsx
// tests/ui/dropdown.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from '../../src/ui/dropdown';

function setup(onSelect = vi.fn()) {
  const utils = render(() => (
    <Dropdown>
      <DropdownTrigger as={(p: any) => <button {...p} data-testid="trg">Menu</button>} />
      <DropdownContent>
        <DropdownItem onSelect={() => onSelect('a')}>Alpha</DropdownItem>
        <DropdownItem onSelect={() => onSelect('b')}>Beta</DropdownItem>
        <DropdownItem onSelect={() => onSelect('c')}>Gamma</DropdownItem>
      </DropdownContent>
    </Dropdown>
  ));
  return { ...utils, onSelect, trg: screen.getByTestId('trg') };
}

describe('Dropdown', () => {
  it('trigger exposes menu button semantics', () => {
    const { trg } = setup();
    expect(trg.getAttribute('aria-haspopup')).toBe('menu');
    expect(trg.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens on click and renders role=menu with menuitems', () => {
    const { trg } = setup();
    fireEvent.click(trg);
    expect(trg.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
  });

  it('ArrowDown from trigger opens and focuses first item; Arrow keys move roving focus', () => {
    const { trg } = setup();
    fireEvent.keyDown(trg, { key: 'ArrowDown' });
    const items = screen.getAllByRole('menuitem');
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(items[1], { key: 'Home' });
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: 'End' });
    expect(document.activeElement).toBe(items[2]);
  });

  it('Enter on a focused item fires onSelect and closes, returning focus to trigger', () => {
    const { trg, onSelect } = setup();
    fireEvent.keyDown(trg, { key: 'ArrowDown' });
    const items = screen.getAllByRole('menuitem');
    fireEvent.keyDown(items[0], { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('a');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trg);
  });

  it('Escape closes and returns focus to the trigger', () => {
    const { trg } = setup();
    fireEvent.click(trg);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trg);
  });

  it('typeahead focuses the first item starting with the typed character', () => {
    const { trg } = setup();
    fireEvent.keyDown(trg, { key: 'ArrowDown' });
    const items = screen.getAllByRole('menuitem');
    fireEvent.keyDown(items[0], { key: 'g' });
    expect(document.activeElement).toBe(items[2]); // Gamma
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/ui/dropdown.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement dropdown**

```tsx
// src/ui/dropdown.tsx
import {
  createContext, useContext, createSignal, createUniqueId, Show, onMount,
  type JSX, type Accessor,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../utils/cn';
import { useChatConfig } from '../primitives/chat-config';
import { createPresence, usePosition, useDismiss, As, type AsTag } from './overlay';

interface DropdownCtx {
  open: Accessor<boolean>;
  setOpen: (v: boolean, opts?: { viaKeyboard?: boolean; returnFocus?: boolean }) => void;
  triggerId: string;
  menuId: string;
  setTrigger: (el: HTMLElement) => void;
  setMenu: (el: HTMLElement) => void;
  trigger: () => HTMLElement | undefined;
  menu: () => HTMLElement | undefined;
  openedViaKeyboard: Accessor<boolean>;
}
const Ctx = createContext<DropdownCtx>();
const useDropdown = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('Dropdown parts must be used within <Dropdown>');
  return c;
};

export function Dropdown(props: { children: JSX.Element }) {
  const [open, setOpenSig] = createSignal(false);
  const [viaKb, setViaKb] = createSignal(false);
  let trigger: HTMLElement | undefined;
  let menu: HTMLElement | undefined;
  const setOpen = (v: boolean, opts?: { viaKeyboard?: boolean; returnFocus?: boolean }) => {
    setViaKb(!!opts?.viaKeyboard);
    setOpenSig(v);
    // Return focus to the trigger on keyboard/select close, but NOT on outside-click
    // (that would steal focus from wherever the user just clicked).
    if (!v && opts?.returnFocus !== false) trigger?.focus();
  };
  return (
    <Ctx.Provider value={{
      open, setOpen, triggerId: createUniqueId(), menuId: createUniqueId(),
      setTrigger: (el) => (trigger = el), setMenu: (el) => (menu = el),
      trigger: () => trigger, menu: () => menu, openedViaKeyboard: viaKb,
    }}>
      {props.children}
    </Ctx.Provider>
  );
}

export function DropdownTrigger(props: { as?: AsTag; children?: JSX.Element; class?: string; [k: string]: any }) {
  const ctx = useDropdown();
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      ctx.setOpen(true, { viaKeyboard: true });
    }
  };
  return (
    <As
      as={props.as ?? 'button'}
      ref={ctx.setTrigger}
      id={ctx.triggerId}
      aria-haspopup="menu"
      aria-expanded={ctx.open()}
      aria-controls={ctx.open() ? ctx.menuId : undefined}
      onClick={() => ctx.setOpen(!ctx.open())}
      onKeyDown={onKeyDown}
      class={props.class}
      {...(props.as ? {} : { type: 'button' })}
    >
      {props.children}
    </As>
  );
}

export function DropdownContent(props: { children: JSX.Element; class?: string }) {
  const ctx = useDropdown();
  const config = useChatConfig();
  const presence = createPresence(ctx.open);
  const position = usePosition(ctx.trigger, ctx.menu, { placement: 'bottom-start', gutter: 6 });
  useDismiss({
    enabled: ctx.open,
    onDismiss: (reason) => ctx.setOpen(false, { returnFocus: reason === 'escape' }),
    refs: () => [ctx.trigger(), ctx.menu()],
  });

  const items = () => Array.from(ctx.menu()?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  const focusIndex = (i: number) => {
    const list = items();
    if (!list.length) return;
    const idx = ((i % list.length) + list.length) % list.length;
    list[idx].focus();
  };
  const currentIndex = () => items().findIndex((el) => el === document.activeElement);

  const onKeyDown = (e: KeyboardEvent) => {
    const list = items();
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); focusIndex(currentIndex() + 1); break;
      case 'ArrowUp': e.preventDefault(); focusIndex(currentIndex() - 1); break;
      case 'Home': e.preventDefault(); focusIndex(0); break;
      case 'End': e.preventDefault(); focusIndex(list.length - 1); break;
      case 'Tab': ctx.setOpen(false); break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const start = currentIndex() + 1;
          const match = list.findIndex((el, i) =>
            i >= start && (el.textContent ?? '').trim().toLowerCase().startsWith(e.key.toLowerCase()));
          const found = match >= 0 ? match
            : list.findIndex((el) => (el.textContent ?? '').trim().toLowerCase().startsWith(e.key.toLowerCase()));
          if (found >= 0) { e.preventDefault(); focusIndex(found); }
        }
    }
  };

  return (
    <Show when={presence.present()}>
      <Portal mount={config.portalMount()}>
        <div
          ref={(el) => {
            ctx.setMenu(el); presence.setRef(el);
            if (ctx.openedViaKeyboard()) queueMicrotask(() => el.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
          }}
          id={ctx.menuId}
          role="menu"
          aria-labelledby={ctx.triggerId}
          tabindex={-1}
          data-expanded={presence.state() === 'open' ? '' : undefined}
          data-closed={presence.state() === 'closed' ? '' : undefined}
          onKeyDown={onKeyDown}
          style={{ position: 'fixed', left: `${position.pos().x}px`, top: `${position.pos().y}px` }}
          class={cn(
            'z-50 min-w-[8rem] rounded-lg bg-card p-1 shadow-lg',
            'animate-in fade-in-0 zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95',
            props.class,
          )}
        >
          {props.children}
        </div>
      </Portal>
    </Show>
  );
}

export function DropdownItem(props: { children: JSX.Element; class?: string; onSelect?: () => void }) {
  const ctx = useDropdown();
  const activate = () => { props.onSelect?.(); ctx.setOpen(false); };
  return (
    <div
      role="menuitem"
      tabindex={-1}
      onClick={activate}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } }}
      onPointerMove={(e) => (e.currentTarget as HTMLElement).focus()}
      class={cn(
        'flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors',
        'hover:bg-muted focus:bg-muted',
        props.class,
      )}
    >
      {props.children}
    </div>
  );
}
```

> Notes: page scroll is never locked (DD-1) because we add no scroll-lock; the menu tracks the trigger via `usePosition`'s `autoUpdate` (DD-2). Focus return happens in `setOpen(false)`. `onPointerMove` (not enter) moves focus so hover and keyboard agree without fighting.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/ui/dropdown.test.tsx`
Expected: PASS (all dropdown tests).

- [ ] **Step 5: Validation gate + commit**

```bash
npm run build && npm run typecheck && npm test
git add src/ui/dropdown.tsx tests/ui/dropdown.test.tsx
git commit -m "feat(ui): reimplement Dropdown menu on overlay core (roving focus, typeahead, no scroll-lock, follows scroll)"
```

---

## Task 8: Playwright side-by-side verification vs Kobalte

**Files:**
- Create (ephemeral): `scripts/_verify-overlays.mjs` (delete after)

Kobalte is still installed; this is the side-by-side opportunity. Verify our primitives meet or beat Kobalte on the three bugs and on baseline behavior, in light AND dark.

- [ ] **Step 1: Build + serve**

Run: `npm run build` then `npm run examples` (serves repo root on `:8000`). Open `http://localhost:8000/examples/composable/index.html`.

- [ ] **Step 2: Write the ephemeral Playwright script**

Create `scripts/_verify-overlays.mjs` that, against the running showcase:
1. **DD-1 (scroll not locked):** open a dropdown (model-switcher / chat-scope-picker specimen), then `page.mouse.wheel(0, 300)` and assert `window.scrollY` changed (page scrolled while menu open).
2. **DD-2 (menu follows trigger):** with the dropdown open, record the menu's `getBoundingClientRect().top`, scroll the page, and assert the menu's viewport-relative position tracks the trigger (delta within a few px of the trigger's delta), i.e. it did NOT stay pinned to the old document position.
3. **HC-1 (deterministic hover):** hover a hover-card trigger (attachments/source/context specimen), assert it opens; move away, assert it closes; repeat 5×; assert it opens all 5 times (no sporadic failures). Then hover trigger→content transit, assert it stays open.
4. **Tooltip:** focus a tooltip trigger (voice-input/checkpoint), assert `role=tooltip` appears with correct text and `aria-describedby` wired; Escape dismisses.
5. **Collapsible:** click a collapsible trigger (tool specimen), assert `aria-expanded` flips and content height grows then shrinks.
6. Screenshot each specimen open, in light and dark (toggle the showcase theme), to `/tmp/overlay-*.png` for visual review.

Reuse the open-shadow-root `page.evaluate` pattern from the spike (elements expose open shadow roots).

- [ ] **Step 3: Run it**

Run: `node scripts/_verify-overlays.mjs`
Expected: all five behavioral assertions pass; screenshots written.

- [ ] **Step 4: Review screenshots + delete the script**

Review `/tmp/overlay-*.png` for visual parity (positioning, arrow, animation end-state, theme colors) against the same specimens. Then: `rm scripts/_verify-overlays.mjs`.

- [ ] **Step 5: Commit any fixes** found during verification (no commit if none).

---

## Task 9: Remove Kobalte + measure the bundle win

**Files:**
- Modify: `package.json`
- Modify: `docs/handoff/2026-06-12-composable-web-components-spike.md`

- [ ] **Step 1: Confirm no remaining Kobalte references**

Run: `grep -rn "@kobalte" src/ && echo "STILL REFERENCED" || echo "clean"`
Expected: `clean` (no matches). If any remain, fix them before continuing.

- [ ] **Step 2: Measure the BEFORE bundle (Kobalte still in deps)**

Run: `npm run build` then record the gzipped size of the main chunk (the build prints sizes; or `gzip -c dist/<main-chunk>.js | wc -c`). Note it.

- [ ] **Step 3: Remove the dependency**

Run: `npm uninstall @kobalte/core`
Expected: `@kobalte/core` gone from `package.json`; `package-lock.json` updated.

- [ ] **Step 4: Measure the AFTER bundle + full gate**

Run: `npm run build && npm run typecheck && npm test`
Expected: build clean (no missing-module errors → proves nothing still imports Kobalte); typecheck clean; tests green vs baseline. Record the new gzipped main-chunk size; compute the delta (expect ~14–20 KB net saved).

- [ ] **Step 5: Update the handoff doc**

In `docs/handoff/2026-06-12-composable-web-components-spike.md`, update the Kobalte section + "Open issues": Kobalte removed; record the measured bundle delta; note the three fixed bugs (DD-1/DD-2/HC-1); move "Kobalte keep-vs-DIY" from open to resolved.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json docs/handoff/2026-06-12-composable-web-components-spike.md
git commit -m "feat(ui): remove @kobalte/core dependency; record bundle savings"
```

---

## Final verification (before handing back to the user)

- [ ] `npm run build && npm run typecheck && npm test` — green vs the 3-failure baseline.
- [ ] `grep -rn "@kobalte" . --include=*.ts --include=*.tsx --include=*.json | grep -v node_modules` — only historical doc mentions remain, no code/deps.
- [ ] Showcase loads and every overlay specimen (collapsible, tooltip, hover-card, dropdown) works in light + dark.
- [ ] The three bugs are demonstrably fixed (DD-1, DD-2, HC-1) per Task 8.
- [ ] Bundle delta recorded in the handoff.

---

## Notes on parallelization (for the orchestrator)

Tasks 1–3 (overlay core) are foundational and **must complete and stay frozen first**. After that, Tasks 4 (collapsible), 5 (tooltip), 6 (hover-card), 7 (dropdown) touch disjoint files (`context.tsx` only by Task 6) and can be implemented in parallel by separate agents, each TDD'd against its own test file, then independently verified. Tasks 8–9 are sequential and run after all primitives land. The shared dependency is `overlay.tsx`'s exported API (`createPresence`, `usePosition`, `useDismiss`, `As`) — do not change it once Tasks 4–7 start; if a primitive needs a new overlay capability, add it without breaking existing signatures.
