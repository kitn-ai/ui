# Web Components (solid-element) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `<kitn-chat>`, `<kitn-conversation-list>`, and `<kitn-prompt-input>` as Shadow-DOM web components that work in any host project without style conflicts, built by wrapping the existing SolidJS library.

**Architecture:** A thin layer of data-driven *facade* components (`src/elements/`) composes the existing compositional primitives and exposes flat property-in / CustomEvent-out surfaces. Each facade is registered as a custom element via `solid-element` (Shadow DOM). The kit's Tailwind CSS is compiled to a string and injected into every shadow root; Kobalte overlay portals are re-homed inside the shadow root via a mount node threaded through `ChatConfig`. A Vite library build bundles Solid in and emits `dist/`.

**Tech Stack:** SolidJS, `solid-element` v1.9.x, Tailwind v4 (`@tailwindcss/cli`), Kobalte, Vite library mode, Vitest (jsdom).

**Reference spec:** `docs/superpowers/specs/2026-06-03-web-components-design.md`

**Conventions for every task:** Run `npx vitest run tests/<path>` for the specific test. Commit only when that task's tests pass. The repo is **not yet a git repo** — Task 0 initializes it. Keep the existing 200 tests green: run `npx vitest run` before each commit from Task 4 onward.

---

### Task 0: Initialize git and add dependencies

**Files:**
- Create: `.gitignore`
- Modify: `package.json`

- [ ] **Step 1: Initialize git**

```bash
cd /Users/home/Projects/kitn-ai/kitn-chat
git init
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
dist/
storybook-static/
src/elements/compiled.css
*.log
.DS_Store
```

- [ ] **Step 3: Install dependencies**

```bash
npm install solid-element@^1.9.1
npm install -D @tailwindcss/cli@^4.3.0
```

Expected: both added to `package.json`, no peer warnings that block.

- [ ] **Step 4: Commit the baseline**

```bash
git add -A
git commit -m "chore: init git, add solid-element + tailwindcss cli"
```

---

### Task 1: CSS compile pipeline (shadow-root stylesheet as a string)

Produces `src/elements/compiled.css` — the full kit stylesheet — so it can be imported as an inline string and injected into shadow roots.

**Files:**
- Create: `src/elements/styles.css` (Tailwind entry for the element bundle)
- Create: `src/elements/css.ts` (re-exports the compiled string)
- Modify: `package.json` (scripts)

- [ ] **Step 1: Create the Tailwind entry `src/elements/styles.css`**

```css
/* Element-bundle stylesheet. Compiled to compiled.css and injected into each
   custom element's shadow root. Mirrors .storybook/styles.css but scans src/. */
@import "tailwindcss";
@import "../../theme.css";
@plugin "@tailwindcss/typography";

@source "../";

@layer base {
  :host { display: block; }
  * { border-color: var(--color-border); }
}
```

- [ ] **Step 2: Add compile scripts to `package.json`**

In the `"scripts"` block add:

```json
"build:css": "tailwindcss -i src/elements/styles.css -o src/elements/compiled.css --minify",
"build:css:watch": "tailwindcss -i src/elements/styles.css -o src/elements/compiled.css --watch"
```

- [ ] **Step 3: Run the compile and verify output exists**

Run: `npm run build:css && wc -c src/elements/compiled.css`
Expected: a non-empty CSS file (tens of KB). If `tailwindcss` is not found, run via `npx @tailwindcss/cli -i src/elements/styles.css -o src/elements/compiled.css --minify` and update the script accordingly.

- [ ] **Step 4: Create `src/elements/css.ts`**

```ts
// Imports the compiled kit CSS as a raw string (Vite `?raw`) so it can be
// injected into custom-element shadow roots. Run `npm run build:css` first.
import compiled from './compiled.css?raw';

export const KITN_CSS: string = compiled;
```

- [ ] **Step 5: Commit**

```bash
git add package.json src/elements/styles.css src/elements/css.ts
git commit -m "feat(elements): compile kit Tailwind CSS to an injectable string"
```

---

### Task 2: Portal mount plumbing through ChatConfig

Adds a `portalMount` accessor to chat config so Kobalte overlays can be redirected into a shadow-root node. Default is `undefined` → Solid `Portal` falls back to `document.body` (unchanged for existing consumers).

**Files:**
- Modify: `src/primitives/chat-config.tsx`
- Test: `tests/primitives/chat-config-portal.test.tsx`

- [ ] **Step 1: Write the failing test `tests/primitives/chat-config-portal.test.tsx`**

```tsx
import { render } from '@solidjs/testing-library';
import { ChatConfig, useChatConfig } from '../../src/primitives/chat-config';

function Probe(props: { onValue: (v: HTMLElement | undefined) => void }) {
  const cfg = useChatConfig();
  props.onValue(cfg.portalMount?.());
  return null;
}

test('portalMount defaults to undefined', () => {
  let seen: HTMLElement | undefined | symbol = Symbol('unset');
  render(() => <Probe onValue={(v) => (seen = v)} />);
  expect(seen).toBeUndefined();
});

test('ChatConfig exposes the provided portalMount node', () => {
  const node = document.createElement('div');
  let seen: HTMLElement | undefined | symbol = Symbol('unset');
  render(() => (
    <ChatConfig portalMount={node}>
      <Probe onValue={(v) => (seen = v)} />
    </ChatConfig>
  ));
  expect(seen).toBe(node);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/primitives/chat-config-portal.test.tsx`
Expected: FAIL — `portalMount` does not exist on `ChatConfigValue`.

- [ ] **Step 3: Implement in `src/primitives/chat-config.tsx`**

Add `portalMount` to the type and both provider/default. Replace the marked regions:

In `ChatConfigValue`:

```ts
export interface ChatConfigValue {
  /** Prose/text size for messages, markdown, and UI elements */
  proseSize: Accessor<ProseSize>;
  /** Shiki theme for code blocks */
  codeTheme: Accessor<string>;
  /** Node Kobalte overlays portal into. undefined → document.body. */
  portalMount: Accessor<HTMLElement | undefined>;
}
```

In `defaultConfig`:

```ts
const defaultConfig: ChatConfigValue = {
  proseSize: () => 'sm' as ProseSize,
  codeTheme: () => 'github-dark-dimmed',
  portalMount: () => undefined,
};
```

In `ChatConfigProps`:

```ts
export interface ChatConfigProps {
  proseSize?: ProseSize;
  codeTheme?: string;
  portalMount?: HTMLElement;
  children: JSX.Element;
}
```

In `ChatConfig`'s `value`:

```ts
  const value: ChatConfigValue = {
    proseSize: () => props.proseSize ?? 'sm',
    codeTheme: () => props.codeTheme ?? 'github-dark-dimmed',
    portalMount: () => props.portalMount,
  };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/primitives/chat-config-portal.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add src/primitives/chat-config.tsx tests/primitives/chat-config-portal.test.tsx
git commit -m "feat(chat-config): add portalMount accessor for shadow-root portals"
```

---

### Task 3: Route the 6 Kobalte components through portalMount

Each Kobalte component reads `useChatConfig().portalMount()` and passes it to its `*.Portal mount` prop.

**Files:**
- Modify: `src/ui/dropdown.tsx`, `src/ui/dialog.tsx`, `src/ui/tooltip.tsx`, `src/ui/hover-card.tsx`, `src/components/context.tsx`
- (`src/ui/collapsible.tsx` has no Portal — verify and skip if so)
- Test: `tests/elements/portal-mount.test.tsx`

- [ ] **Step 1: Write the failing test `tests/elements/portal-mount.test.tsx`**

```tsx
import { render } from '@solidjs/testing-library';
import { ChatConfig } from '../../src/primitives/chat-config';
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from '../../src/ui/dropdown';

test('dropdown content portals into the configured mount node when open', () => {
  const mount = document.createElement('div');
  mount.id = 'kitn-portal';
  document.body.appendChild(mount);

  render(() => (
    <ChatConfig portalMount={mount}>
      <Dropdown open>
        <DropdownTrigger>open</DropdownTrigger>
        <DropdownContent>
          <DropdownItem>Item A</DropdownItem>
        </DropdownContent>
      </Dropdown>
    </ChatConfig>
  ));

  expect(mount.textContent).toContain('Item A');
  mount.remove();
});
```

> If `Dropdown` does not accept an `open` prop, pass-through `{...rest}` already forwards it to `KDropdown.Root` (which supports `open`). Verify by reading `src/ui/dropdown.tsx` before running.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/elements/portal-mount.test.tsx`
Expected: FAIL — content renders in `document.body`, not in `mount`.

- [ ] **Step 3: Update `src/ui/dropdown.tsx`**

Add the import and read the config, then pass `mount` to the Portal. Current `DropdownContent` (lines ~8-18) wraps `<KDropdown.Portal>`. Change it to:

```tsx
import { useChatConfig } from '../primitives/chat-config';
// ...existing imports...

function DropdownContent(props: ...) {            // keep existing signature
  const config = useChatConfig();
  const [local, rest] = splitProps(props, ['class', 'children']); // match existing
  return (
    <KDropdown.Portal mount={config.portalMount()}>
      <KDropdown.Content class={cn(/* existing classes */, local.class)} {...rest}>
        {local.children}
      </KDropdown.Content>
    </KDropdown.Portal>
  );
}
```

> Keep every existing class string and prop exactly as-is; the only additions are the `useChatConfig` import, the `config` line, and `mount={config.portalMount()}` on `<KDropdown.Portal>`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/elements/portal-mount.test.tsx`
Expected: PASS.

- [ ] **Step 5: Apply the identical pattern to the remaining files**

For each of `src/ui/dialog.tsx`, `src/ui/tooltip.tsx`, `src/ui/hover-card.tsx`, `src/components/context.tsx`:
1. Add `import { useChatConfig } from '../primitives/chat-config';` (use `'../primitives/chat-config'` for `ui/*`, `'../primitives/chat-config'` for `components/*` — both are one level up to `src/`, so `components/context.tsx` uses `'../primitives/chat-config'`).
2. Add `const config = useChatConfig();` inside the component that renders the Portal.
3. Add `mount={config.portalMount()}` to the `<X.Portal ...>` element.

`src/ui/collapsible.tsx` uses no Portal — open it to confirm; if `grep -n Portal src/ui/collapsible.tsx` returns nothing, skip it.

- [ ] **Step 6: Verify the whole suite still passes**

Run: `npx vitest run`
Expected: all tests pass (200 existing + new portal tests).

- [ ] **Step 7: Commit**

```bash
git add src/ui/dropdown.tsx src/ui/dialog.tsx src/ui/tooltip.tsx src/ui/hover-card.tsx src/components/context.tsx tests/elements/portal-mount.test.tsx
git commit -m "feat(ui): route Kobalte overlays through ChatConfig.portalMount"
```

---

### Task 4: `defineKitnElement` wrapper helper

A single helper that wraps a Solid facade as a Shadow-DOM custom element: injects `KITN_CSS`, creates a shadow-root portal node, provides it via `ChatConfig`, and exposes a `dispatch` helper for CustomEvents. Built on `solid-element`.

**Files:**
- Create: `src/elements/define.tsx`
- Test: `tests/elements/define.test.tsx`

- [ ] **Step 1: Write the failing test `tests/elements/define.test.tsx`**

```tsx
import { defineKitnElement } from '../../src/elements/define';

test('registers a custom element that renders content and CSS into its shadow root', async () => {
  defineKitnElement('kitn-test-el', { label: 'hi' }, (props, { dispatch }) => {
    return <button onClick={() => dispatch('pressed', { label: props.label })}>{props.label}</button>;
  });

  const el = document.createElement('kitn-test-el') as HTMLElement & { label: string };
  document.body.appendChild(el);
  await Promise.resolve();

  expect(el.shadowRoot).toBeTruthy();
  expect(el.shadowRoot!.querySelector('style')).toBeTruthy();
  expect(el.shadowRoot!.textContent).toContain('hi');

  let detail: any = null;
  el.addEventListener('pressed', (e) => (detail = (e as CustomEvent).detail));
  el.shadowRoot!.querySelector('button')!.click();
  expect(detail).toEqual({ label: 'hi' });

  el.remove();
});

test('defining the same tag twice is a no-op (idempotent)', () => {
  defineKitnElement('kitn-test-el2', {}, () => <span>a</span>);
  expect(() => defineKitnElement('kitn-test-el2', {}, () => <span>b</span>)).not.toThrow();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/elements/define.test.tsx`
Expected: FAIL — `src/elements/define` does not exist.

- [ ] **Step 3: Implement `src/elements/define.tsx`**

```tsx
import { customElement } from 'solid-element';
import { ChatConfig } from '../primitives/chat-config';
import { KITN_CSS } from './css';
import type { JSX } from 'solid-js';

export interface KitnElementContext {
  /** The custom element instance. */
  element: HTMLElement;
  /** Dispatch a composed CustomEvent off the host element. */
  dispatch: (type: string, detail?: unknown) => void;
}

type FacadeComponent<P> = (props: P, ctx: KitnElementContext) => JSX.Element;

/**
 * Register a Solid facade as a Shadow-DOM custom element:
 * - injects the compiled kit CSS into the shadow root
 * - creates a portal mount node inside the shadow root and supplies it via ChatConfig
 * - gives the facade a `dispatch` helper for composed CustomEvents
 * Idempotent: re-defining an existing tag is a no-op.
 */
export function defineKitnElement<P extends Record<string, unknown>>(
  tag: string,
  propDefaults: P,
  Facade: FacadeComponent<P>,
): void {
  if (typeof customElements !== 'undefined' && customElements.get(tag)) return;

  customElement(tag, propDefaults, (props: P, { element }: { element: HTMLElement }) => {
    let portalNode!: HTMLDivElement;
    const dispatch = (type: string, detail?: unknown) =>
      element.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));

    return (
      <>
        <style>{KITN_CSS}</style>
        <div ref={portalNode} />
        <ChatConfig portalMount={portalNode}>
          {Facade(props, { element, dispatch })}
        </ChatConfig>
      </>
    );
  });
}
```

> `solid-element` renders into a shadow root by default; the `<style>` element therefore lands inside it. The `portalNode` div is inside the same shadow root, so Kobalte overlays mounted there inherit the injected CSS.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/elements/define.test.tsx`
Expected: PASS. If `?raw` import of `compiled.css` fails in vitest, ensure `npm run build:css` has been run (the file must exist on disk).

- [ ] **Step 5: Commit**

```bash
git add src/elements/define.tsx tests/elements/define.test.tsx
git commit -m "feat(elements): add defineKitnElement shadow-DOM wrapper helper"
```

---

### Task 5: `<kitn-conversation-list>`

**Files:**
- Create: `src/elements/conversation-list.tsx`
- Test: `tests/elements/conversation-list-element.test.tsx`

- [ ] **Step 1: Write the failing test `tests/elements/conversation-list-element.test.tsx`**

```tsx
import '../../src/elements/conversation-list';
import type { ConversationGroup, ConversationSummary } from '../../src/types';

const groups: ConversationGroup[] = [{ id: 'g1', name: 'Today', sortOrder: 0, createdAt: '2026-06-01' }];
const conversations: ConversationSummary[] = [{
  id: 'c1', title: 'Hello world', groupId: 'g1', scope: { type: 'document' },
  messageCount: 2, lastMessageAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z',
}];

test('renders conversations and emits select', async () => {
  const el = document.createElement('kitn-conversation-list') as HTMLElement & {
    groups: ConversationGroup[]; conversations: ConversationSummary[]; activeId?: string;
  };
  el.groups = groups;
  el.conversations = conversations;
  document.body.appendChild(el);
  await Promise.resolve();

  expect(el.shadowRoot!.textContent).toContain('Hello world');

  let selected: string | null = null;
  el.addEventListener('select', (e) => (selected = (e as CustomEvent).detail.id));
  const item = el.shadowRoot!.querySelector('[data-conversation-id="c1"]') as HTMLElement
    ?? (el.shadowRoot!.textContent!.includes('Hello world')
        ? (Array.from(el.shadowRoot!.querySelectorAll('*')).find(n => n.textContent === 'Hello world') as HTMLElement)
        : null);
  item?.click();
  expect(selected).toBe('c1');

  el.remove();
});
```

> The exact clickable node depends on `ConversationItem` markup. Before finalizing, open `src/components/conversation-item.tsx` and target its root element (add `data-conversation-id={conversation.id}` to that root in this task if no stable selector exists — it is a harmless, additive attribute).

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/elements/conversation-list-element.test.tsx`
Expected: FAIL — element not registered.

- [ ] **Step 3: Implement `src/elements/conversation-list.tsx`**

```tsx
import { defineKitnElement } from './define';
import { ConversationList } from '../components/conversation-list';
import type { ConversationGroup, ConversationSummary } from '../types';

interface Props extends Record<string, unknown> {
  groups: ConversationGroup[];
  conversations: ConversationSummary[];
  activeId?: string;
}

defineKitnElement<Props>('kitn-conversation-list', {
  groups: [],
  conversations: [],
  activeId: undefined,
}, (props, { dispatch }) => {
  return (
    <ConversationList
      groups={props.groups}
      conversations={props.conversations}
      activeId={props.activeId}
      onSelect={(id) => dispatch('select', { id })}
      onNewChat={() => dispatch('newchat')}
      onToggleSidebar={() => dispatch('togglesidebar')}
    />
  );
});
```

- [ ] **Step 4: If needed, add a stable selector to `ConversationItem`**

If Step 1's test cannot find a clickable node, open `src/components/conversation-item.tsx` and add `data-conversation-id={props.conversation.id}` to the component's root element. Do not change any styling.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/elements/conversation-list-element.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/elements/conversation-list.tsx tests/elements/conversation-list-element.test.tsx src/components/conversation-item.tsx
git commit -m "feat(elements): add <kitn-conversation-list>"
```

---

### Task 6: `<kitn-prompt-input>`

A facade that renders a default textarea + send button over the existing `PromptInput`, with controlled-or-uncontrolled `value`.

**Files:**
- Create: `src/elements/prompt-input.tsx`
- Test: `tests/elements/prompt-input-element.test.tsx`

- [ ] **Step 1: Write the failing test `tests/elements/prompt-input-element.test.tsx`**

```tsx
import '../../src/elements/prompt-input';

test('emits valuechange on input and submit on Enter', async () => {
  const el = document.createElement('kitn-prompt-input') as HTMLElement & {
    value?: string; placeholder?: string;
  };
  el.placeholder = 'Ask...';
  document.body.appendChild(el);
  await Promise.resolve();

  const textarea = el.shadowRoot!.querySelector('textarea')!;
  expect(textarea.placeholder).toBe('Ask...');

  let changed: string | null = null;
  let submitted: string | null = null;
  el.addEventListener('valuechange', (e) => (changed = (e as CustomEvent).detail.value));
  el.addEventListener('submit', (e) => (submitted = (e as CustomEvent).detail.value));

  textarea.value = 'hello';
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  expect(changed).toBe('hello');

  textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  expect(submitted).toBe('hello');

  el.remove();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/elements/prompt-input-element.test.tsx`
Expected: FAIL — element not registered.

- [ ] **Step 3: Implement `src/elements/prompt-input.tsx`**

```tsx
import { createSignal } from 'solid-js';
import { defineKitnElement } from './define';
import { PromptInput, PromptInputTextarea, PromptInputActions } from '../components/prompt-input';
import { Button } from '../ui/button';

interface Props extends Record<string, unknown> {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

defineKitnElement<Props>('kitn-prompt-input', {
  value: undefined,
  placeholder: 'Send a message...',
  disabled: false,
  loading: false,
}, (props, { dispatch }) => {
  const [internal, setInternal] = createSignal(props.value ?? '');
  const current = () => props.value ?? internal();

  const handleChange = (v: string) => { setInternal(v); dispatch('valuechange', { value: v }); };
  const handleSubmit = () => dispatch('submit', { value: current() });

  return (
    <PromptInput
      value={current()}
      onValueChange={handleChange}
      onSubmit={handleSubmit}
      isLoading={props.loading}
      disabled={props.disabled}
    >
      <PromptInputTextarea placeholder={props.placeholder} class="min-h-[44px] pt-3 pl-4" />
      <PromptInputActions class="mt-2 flex w-full items-center justify-end gap-2 px-3 pb-3">
        <Button size="icon-sm" class="rounded-full" disabled={!current().trim()} onClick={handleSubmit}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
          </svg>
        </Button>
      </PromptInputActions>
    </PromptInput>
  );
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/elements/prompt-input-element.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/elements/prompt-input.tsx tests/elements/prompt-input-element.test.tsx
git commit -m "feat(elements): add <kitn-prompt-input>"
```

---

### Task 7: `<kitn-chat>` message schema + renderer

The data-driven message renderer: takes `messages[]`, renders the `ChatContainer` + `Message*` composition, includes an integrated input, and emits `submit` and `messageaction`.

**Files:**
- Create: `src/elements/chat-types.ts`
- Create: `src/elements/chat.tsx`
- Test: `tests/elements/chat-element.test.tsx`

- [ ] **Step 1: Create `src/elements/chat-types.ts`**

```ts
import type { ToolPart } from '../components/tool';
import type { AttachmentData } from '../components/attachments';

export type ChatMessageAction = 'copy' | 'like' | 'dislike' | 'regenerate' | 'edit';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: { text: string; label?: string };
  tools?: ToolPart[];
  attachments?: AttachmentData[];
  actions?: ChatMessageAction[];
}
```

> Confirm `ToolPart` is exported from `src/components/tool.tsx` and `AttachmentData` from `src/components/attachments.tsx` (both are re-exported in `src/index.ts`). If a name differs, import the actual exported name.

- [ ] **Step 2: Write the failing test `tests/elements/chat-element.test.tsx`**

```tsx
import '../../src/elements/chat';
import type { ChatMessage } from '../../src/elements/chat-types';

const messages: ChatMessage[] = [
  { id: 'm1', role: 'user', content: 'Hi there' },
  { id: 'm2', role: 'assistant', content: 'Hello! How can I help?', actions: ['copy'] },
];

test('renders messages and emits submit', async () => {
  const el = document.createElement('kitn-chat') as HTMLElement & { messages: ChatMessage[] };
  el.messages = messages;
  document.body.appendChild(el);
  await Promise.resolve();

  expect(el.shadowRoot!.textContent).toContain('Hi there');
  expect(el.shadowRoot!.textContent).toContain('Hello! How can I help?');

  let submitted: string | null = null;
  el.addEventListener('submit', (e) => (submitted = (e as CustomEvent).detail.value));
  const textarea = el.shadowRoot!.querySelector('textarea')!;
  textarea.value = 'next question';
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  expect(submitted).toBe('next question');

  el.remove();
});

test('emits messageaction when an action button is clicked', async () => {
  const el = document.createElement('kitn-chat') as HTMLElement & { messages: ChatMessage[] };
  el.messages = messages;
  document.body.appendChild(el);
  await Promise.resolve();

  let action: { messageId: string; action: string } | null = null;
  el.addEventListener('messageaction', (e) => (action = (e as CustomEvent).detail));
  const btn = el.shadowRoot!.querySelector('[data-action="copy"]') as HTMLElement;
  btn.click();
  expect(action).toEqual({ messageId: 'm2', action: 'copy' });

  el.remove();
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run tests/elements/chat-element.test.tsx`
Expected: FAIL — element not registered.

- [ ] **Step 4: Implement `src/elements/chat.tsx`**

```tsx
import { createSignal, For, Show } from 'solid-js';
import { defineKitnElement } from './define';
import { ChatConfig } from '../primitives/chat-config';
import {
  ChatContainer, ChatContainerContent, ChatContainerScrollAnchor,
} from '../components/chat-container';
import { Message, MessageContent, MessageActions } from '../components/message';
import { Reasoning, ReasoningTrigger, ReasoningContent } from '../components/reasoning';
import { Tool } from '../components/tool';
import { Button } from '../ui/button';
import { PromptInput, PromptInputTextarea, PromptInputActions } from '../components/prompt-input';
import type { ChatMessage, ChatMessageAction } from './chat-types';
import type { ProseSize } from '../primitives/chat-config';

interface Props extends Record<string, unknown> {
  messages: ChatMessage[];
  value?: string;
  placeholder?: string;
  loading?: boolean;
  proseSize?: ProseSize;
  codeTheme?: string;
}

const ACTION_LABEL: Record<ChatMessageAction, string> = {
  copy: 'Copy', like: 'Like', dislike: 'Dislike', regenerate: 'Regenerate', edit: 'Edit',
};

defineKitnElement<Props>('kitn-chat', {
  messages: [],
  value: undefined,
  placeholder: 'Send a message...',
  loading: false,
  proseSize: 'sm',
  codeTheme: 'github-dark-dimmed',
}, (props, { dispatch }) => {
  const [internal, setInternal] = createSignal(props.value ?? '');
  const current = () => props.value ?? internal();
  const handleChange = (v: string) => { setInternal(v); dispatch('valuechange', { value: v }); };
  const handleSubmit = () => dispatch('submit', { value: current() });

  return (
    <ChatConfig proseSize={props.proseSize} codeTheme={props.codeTheme}>
      <div class="flex h-full flex-col bg-background">
        <ChatContainer class="flex-1 px-4 py-3">
          <ChatContainerContent class="mx-auto w-full max-w-3xl space-y-4">
            <For each={props.messages}>
              {(m) => (
                <Message class={m.role === 'user' ? 'flex-col items-end' : 'flex-col items-start'}>
                  <Show when={m.reasoning}>
                    <Reasoning class="mb-2 w-full">
                      <ReasoningTrigger>{m.reasoning!.label ?? 'Reasoning'}</ReasoningTrigger>
                      <ReasoningContent markdown>{m.reasoning!.text}</ReasoningContent>
                    </Reasoning>
                  </Show>
                  <For each={m.tools ?? []}>
                    {(tp) => <Tool toolPart={tp} class="mb-2 w-full" />}
                  </For>
                  <MessageContent
                    markdown={m.role === 'assistant'}
                    class={m.role === 'user'
                      ? 'bg-muted text-primary max-w-[85%] rounded-2xl px-4 py-2'
                      : 'bg-transparent p-0'}
                  >
                    {m.content}
                  </MessageContent>
                  <Show when={m.actions?.length}>
                    <MessageActions class="mt-1 flex gap-0">
                      <For each={m.actions!}>
                        {(a) => (
                          <Button
                            variant="ghost" size="icon-sm" class="rounded-full"
                            data-action={a}
                            aria-label={ACTION_LABEL[a]}
                            onClick={() => dispatch('messageaction', { messageId: m.id, action: a })}
                          >
                            <span class="text-xs">{ACTION_LABEL[a][0]}</span>
                          </Button>
                        )}
                      </For>
                    </MessageActions>
                  </Show>
                </Message>
              )}
            </For>
            <ChatContainerScrollAnchor />
          </ChatContainerContent>
        </ChatContainer>
        <div class="shrink-0 px-4 pb-4">
          <div class="mx-auto max-w-3xl">
            <PromptInput value={current()} onValueChange={handleChange} onSubmit={handleSubmit} isLoading={props.loading}>
              <PromptInputTextarea placeholder={props.placeholder} class="min-h-[44px] pt-3 pl-4" />
              <PromptInputActions class="mt-2 flex w-full items-center justify-end gap-2 px-3 pb-3">
                <Button size="icon-sm" class="rounded-full" disabled={!current().trim()} onClick={handleSubmit}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                  </svg>
                </Button>
              </PromptInputActions>
            </PromptInput>
          </div>
        </div>
      </div>
    </ChatConfig>
  );
});
```

> The wrapper already provides a `ChatConfig` (for `portalMount`); nesting a second `ChatConfig` here to set `proseSize`/`codeTheme` is fine — Solid context nests, and `portalMount` from the outer provider is *not* inherited by the inner one, so re-supply it if a future task needs portals from inside `<kitn-chat>`. For now Kobalte overlays inside `<kitn-chat>` come from `Tool`/`Reasoning` (Collapsible, no Portal), so this is safe. If that changes, pass `portalMount` through here too.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/elements/chat-element.test.tsx`
Expected: PASS (both tests). If `Reasoning`/`Tool` imports fail, verify exact export names in `src/components/reasoning.tsx` and `src/components/tool.tsx`.

- [ ] **Step 6: Commit**

```bash
git add src/elements/chat-types.ts src/elements/chat.tsx tests/elements/chat-element.test.tsx
git commit -m "feat(elements): add <kitn-chat> data-driven message renderer"
```

---

### Task 8: Registration entry, Vite library build, and package exports

**Files:**
- Create: `src/elements/register.ts`
- Create: `vite.config.ts`
- Modify: `package.json`
- Test: `tests/elements/register.test.ts`

- [ ] **Step 1: Create `src/elements/register.ts`**

```ts
// Single entry that registers all kitn custom elements. Importing this file
// (or the built bundle) defines the elements as a side effect.
import './conversation-list';
import './prompt-input';
import './chat';

export type { ChatMessage, ChatMessageAction } from './chat-types';
```

- [ ] **Step 2: Write the failing test `tests/elements/register.test.ts`**

```ts
import '../../src/elements/register';

test('all three custom elements are defined', () => {
  expect(customElements.get('kitn-chat')).toBeTruthy();
  expect(customElements.get('kitn-conversation-list')).toBeTruthy();
  expect(customElements.get('kitn-prompt-input')).toBeTruthy();
});
```

- [ ] **Step 3: Run it to verify it passes (no impl needed beyond the entry)**

Run: `npx vitest run tests/elements/register.test.ts`
Expected: PASS.

- [ ] **Step 4: Create `vite.config.ts` (library build)**

```ts
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/elements/register.ts'),
      name: 'KitnChat',
      fileName: (format) => `kitn-chat.${format}.js`,
      formats: ['es', 'umd'],
    },
    // Solid is bundled in — hosts do not have it. No externals.
    emptyOutDir: true,
  },
});
```

- [ ] **Step 5: Add build scripts and exports to `package.json`**

In `"scripts"`:

```json
"build": "npm run build:css && vite build",
"prebuild": "npm run build:css"
```

In `"exports"`, add the elements bundle:

```json
"exports": {
  ".": "./src/index.ts",
  "./elements": "./dist/kitn-chat.es.js",
  "./theme.css": "./theme.css"
}
```

- [ ] **Step 6: Run the production build and verify artifacts**

Run: `npm run build && ls dist/`
Expected: `dist/kitn-chat.es.js` and `dist/kitn-chat.umd.js` exist. The build should complete without unresolved-import errors.

- [ ] **Step 7: Smoke-test the built bundle in a throwaway HTML file**

Create `dist/smoke.html` (temporary, not committed):

```html
<!doctype html><html><body>
  <kitn-chat id="c"></kitn-chat>
  <script type="module">
    import './kitn-chat.es.js';
    document.getElementById('c').messages = [{ id: '1', role: 'assistant', content: 'It works.' }];
  </script>
</body></html>
```

Run: `npx vite preview --outDir dist` (or open via any static server) and confirm "It works." renders with kit styling and no console errors. Delete `dist/smoke.html` afterward.

- [ ] **Step 8: Commit**

```bash
rm -f dist/smoke.html
git add src/elements/register.ts vite.config.ts package.json tests/elements/register.test.ts
git commit -m "feat(elements): add registration entry, Vite library build, ./elements export"
```

---

### Task 9: Documentation

**Files:**
- Create: `docs/web-components.md`
- Modify: `package.json` (ensure `files`/publish surface if relevant — optional)

- [ ] **Step 1: Write `docs/web-components.md`**

Document: install, `import '@kitn-ai/chat/elements'`, the three tags, every property and event with its `detail` shape (from Tasks 5–7), the `ChatMessage` schema, and a note that styling is fully isolated via Shadow DOM. Include one runnable HTML snippet per element mirroring the Task 8 smoke test.

- [ ] **Step 2: Commit**

```bash
git add docs/web-components.md
git commit -m "docs: document the kitn web components"
```

---

## Self-Review

**Spec coverage:**
- Shadow DOM isolation → Task 4 (`<style>` injection in `defineKitnElement`). ✓
- `solid-element` wrapper → Task 4. ✓
- Facade layer (data-in/events-out) → Tasks 5, 6, 7. ✓
- Three entry points → Tasks 5 (`conversation-list`), 6 (`prompt-input`), 7 (`chat`). ✓
- Message schema → Task 7 Step 1 (`chat-types.ts`). ✓
- CSS compile to string → Task 1. ✓
- Portal re-homing through ChatConfig → Tasks 2 + 3. ✓
- Vite library build / `./elements` export → Task 8. ✓
- Tests (jsdom: properties render, events fire, portal lands in mount) → Tasks 2, 3, 4, 5, 6, 7, 8. ✓
- Existing 200 tests stay green → Task 3 Step 6 + run `npx vitest run` before later commits. ✓
- Docs → Task 9. ✓

**Deferred-to-implementation decisions (from spec Open Questions):**
- solid-element vs hand-rolled: Task 4 uses solid-element; if `<style>`/shadow-root behavior misbehaves in `solid-element`, the same `defineKitnElement` signature can be reimplemented with Solid's `render()` without touching Tasks 5–7.
- `<kitn-chat>` integrated input: implemented as integrated (Task 7); standalone `<kitn-prompt-input>` also exists (Task 6).
- Controlled/uncontrolled value: handled via `props.value ?? internal()` in Tasks 6, 7.

**Type consistency:** `ChatMessage`/`ChatMessageAction` defined once in `chat-types.ts` and imported in `chat.tsx` and `register.ts`. `portalMount` accessor name consistent across `chat-config.tsx`, the 6 Kobalte files, and `define.tsx`. `defineKitnElement` signature identical across Tasks 4–7.

**Known risk to validate early:** the `compiled.css?raw` import must resolve in both vitest and the Vite build. Task 1 generates the file on disk before any consumer imports it; `prebuild`/`build:css` keep it fresh. If vitest cannot resolve `?raw`, add `assetsInclude`/a tiny plugin, or switch `css.ts` to read the file via a Vite `?inline` import.
