# kc-conversations Declarative Child-Element API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `<kc-conversation>` light-DOM child-element composition API to `kc-conversations`, mirroring the established `parseSuggestionNode`/`parseKcSourceElement` pattern.

**Architecture:** Export a `parseKcConversationElement` helper from `conversation-list.tsx` (the element file) that maps a `<kc-conversation>` DOM node's `id` attribute and `textContent` to a `ConversationSummary`-compatible descriptor; wire it into `onMount`/`MutationObserver` inside `defineWebComponent`, merging with the `conversations` prop; update the story and specDescription; add a focused unit test.

**Tech Stack:** SolidJS, `defineWebComponent`, jsdom/vitest, Storybook (storybook-solidjs-vite)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/elements/conversation-list.tsx` | **Modify** | Add `parseKcConversationElement`, `onMount`/observer, merge signal |
| `src/elements/conversation-list.stories.tsx` | **Modify** | Add `DeclarativeConversations` story + `kc-conversation` JSX decl |
| `src/elements/conversation-list.declarative.test.tsx` | **Create** | Unit tests for `parseKcConversationElement` + merge/render |

---

## Task 1: Export `parseKcConversationElement` helper and wire it into the element

**Files:**
- Modify: `src/elements/conversation-list.tsx` (full file, currently 41 lines)

### Minimal `ConversationSummary` for a declarative child

A `<kc-conversation id="c1">Title</kc-conversation>` child carries two pieces of data: `id` (attribute) and `title` (textContent). The `ConversationSummary` type also requires `scope`, `messageCount`, `lastMessageAt`, and `updatedAt` — these must get safe defaults for the declarative path. Use:

```ts
{
  id: n.getAttribute('id') ?? '',
  title: n.textContent?.trim() ?? '',
  scope: { type: 'collection' } as ConversationScope,
  messageCount: 0,
  lastMessageAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
}
```

Optional: `groupId` can be read from a `group-id` attribute if present, so future `<kc-conversation group-id="g-work">Title</kc-conversation>` works.

- [ ] **Step 1: Write the new `src/elements/conversation-list.tsx`**

Replace the current file with the following (add the imports, export the helper, add the signal/observer, merge in render):

```tsx
import { createSignal, onMount, onCleanup } from 'solid-js';
import { defineWebComponent } from './define';
import { ConversationList } from '../components/conversation-list';
import type { ConversationGroup, ConversationSummary, ConversationScope } from '../types';

interface Props extends Record<string, unknown> {
  /** Pre-bucketed conversation groups (e.g. "Today", "Yesterday"), each with its
   *  own conversations. Use this when you want to control the grouping/headers
   *  yourself; otherwise pass a flat `conversations` array. Set as a JS property. */
  groups: ConversationGroup[];
  /** A flat list of conversation summaries; the component buckets them by recency
   *  for you. Ignored when `groups` is provided. Set as a JS property. */
  conversations: ConversationSummary[];
  /** The id of the currently-open conversation, highlighted in the list. */
  activeId?: string;
}

interface Events {
  /** A conversation was selected. */
  'kc-conversation-select': { id: string };
  /** The "New chat" button was clicked. */
  'kc-new-chat': Record<string, never>;
  /** The sidebar toggle was clicked. */
  'kc-toggle-sidebar': Record<string, never>;
}

/** Parse a single light-DOM `<kc-conversation>` element into a `ConversationSummary`.
 *  Attribute mapping:
 *   - `id`       → ConversationSummary.id
 *   - `group-id` → ConversationSummary.groupId (optional)
 *   - textContent → ConversationSummary.title
 *  Required fields not expressible as HTML attributes (`scope`, `messageCount`,
 *  `lastMessageAt`, `updatedAt`) receive safe defaults so the rendered list item
 *  is fully functional with just `id` + title text.
 */
export function parseKcConversationElement(n: Element): ConversationSummary {
  return {
    id: n.getAttribute('id') ?? '',
    title: n.textContent?.trim() ?? '',
    groupId: n.getAttribute('group-id') ?? undefined,
    scope: { type: 'collection' } as ConversationScope,
    messageCount: 0,
    lastMessageAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

defineWebComponent<Props, Events>('kc-conversations', {
  groups: [],
  conversations: [],
  activeId: undefined,
}, (props, { dispatch, element }) => {
  // Read declarative <kc-conversation> children from light DOM.
  // Shadow DOM with no <slot> suppresses them visually — they're invisible data carriers.
  const [slottedConversations, setSlottedConversations] = createSignal<ConversationSummary[]>([]);
  onMount(() => {
    const read = () => {
      const nodes = [...element.querySelectorAll('kc-conversation')];
      setSlottedConversations(nodes.map(parseKcConversationElement));
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true, attributes: true, subtree: true });
    onCleanup(() => observer.disconnect());
  });

  // Prop conversations take precedence; slotted children are appended after.
  const allConversations = () => [...(props.conversations ?? []), ...slottedConversations()];

  return (
    <ConversationList
      groups={props.groups}
      conversations={allConversations()}
      activeId={props.activeId}
      onSelect={(id) => dispatch('kc-conversation-select', { id })}
      onNewChat={() => dispatch('kc-new-chat')}
      onToggleSidebar={() => dispatch('kc-toggle-sidebar')}
    />
  );
});
```

Note: `ConversationScope` must be imported from `../types`. Check that it is exported there — if not, use `{ type: 'collection' } as import('../types').ConversationSummary['scope']` instead.

---

## Task 2: Unit test for `parseKcConversationElement` + merge behaviour

**Files:**
- Create: `src/elements/conversation-list.declarative.test.tsx`

Mirrors `prompt-suggestions.declarative.test.tsx` and `source-list.test.tsx`.

- [ ] **Step 2: Create the test file**

```tsx
/**
 * Unit tests for the declarative `<kc-conversation>` light-DOM API of
 * `<kc-conversations>`.
 *
 * Strategy: `defineWebComponent` registers a real Shadow-DOM custom element
 * and is not suitable for jsdom unit tests. Instead:
 *   1. Test the exported `parseKcConversationElement` helper in isolation.
 *   2. Test that the merged list of prop + slotted items renders items correctly
 *      via `ConversationList` directly, mirroring the pattern in
 *      `source-list.test.tsx`.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { For } from 'solid-js';
import { parseKcConversationElement } from './conversation-list';
import type { ConversationSummary } from '../types';

afterEach(cleanup);

// ---------------------------------------------------------------------------
// parseKcConversationElement — pure helper
// ---------------------------------------------------------------------------

describe('parseKcConversationElement', () => {
  function makeEl(attrs: Record<string, string | null>, textContent = ''): Element {
    const el = document.createElement('kc-conversation');
    for (const [k, v] of Object.entries(attrs)) {
      if (v !== null) el.setAttribute(k, v);
    }
    el.textContent = textContent;
    return el;
  }

  it('maps id attribute to ConversationSummary.id', () => {
    const el = makeEl({ id: 'c-1' }, 'Q2 plan');
    expect(parseKcConversationElement(el).id).toBe('c-1');
  });

  it('uses trimmed textContent as title', () => {
    const el = makeEl({ id: 'c-1' }, '  Q2 plan  ');
    expect(parseKcConversationElement(el).title).toBe('Q2 plan');
  });

  it('reads group-id attribute as groupId when present', () => {
    const el = makeEl({ id: 'c-1', 'group-id': 'g-work' }, 'Q2 plan');
    expect(parseKcConversationElement(el).groupId).toBe('g-work');
  });

  it('sets groupId to undefined when group-id attribute is absent', () => {
    const el = makeEl({ id: 'c-1' }, 'Q2 plan');
    expect(parseKcConversationElement(el).groupId).toBeUndefined();
  });

  it('falls back to empty string for missing id attribute', () => {
    const el = makeEl({}, 'Untitled');
    expect(parseKcConversationElement(el).id).toBe('');
  });

  it('provides safe defaults for scope, messageCount, lastMessageAt, updatedAt', () => {
    const el = makeEl({ id: 'c-1' }, 'Q2 plan');
    const item = parseKcConversationElement(el);
    expect(item.scope).toEqual({ type: 'collection' });
    expect(item.messageCount).toBe(0);
    expect(typeof item.lastMessageAt).toBe('string');
    expect(typeof item.updatedAt).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Merge: prop conversations + slotted conversations combine correctly
// ---------------------------------------------------------------------------

describe('conversation merge order', () => {
  /** Minimal render harness that outputs a button per conversation. */
  function ConvList(props: { items: ConversationSummary[]; onSelect: (id: string) => void }) {
    return (
      <div>
        <For each={props.items}>
          {(c) => (
            <button type="button" onClick={() => props.onSelect(c.id)}>
              {c.title}
            </button>
          )}
        </For>
      </div>
    );
  }

  it('renders one item per conversation', () => {
    const items: ConversationSummary[] = [
      { id: 'c-1', title: 'First', scope: { type: 'collection' }, messageCount: 0, lastMessageAt: '', updatedAt: '' },
      { id: 'c-2', title: 'Second', scope: { type: 'collection' }, messageCount: 0, lastMessageAt: '', updatedAt: '' },
    ];
    const { getByText } = render(() => <ConvList items={items} onSelect={() => {}} />);
    expect(getByText('First')).toBeInTheDocument();
    expect(getByText('Second')).toBeInTheDocument();
  });

  it('fires onSelect with the conversation id when an item is clicked', () => {
    const onSelect = vi.fn();
    const items: ConversationSummary[] = [
      { id: 'c-42', title: 'API plan', scope: { type: 'collection' }, messageCount: 0, lastMessageAt: '', updatedAt: '' },
    ];
    const { getByText } = render(() => <ConvList items={items} onSelect={onSelect} />);
    fireEvent.click(getByText('API plan'));
    expect(onSelect).toHaveBeenCalledWith('c-42');
  });

  it('renders prop items before declarative (slotted) items', () => {
    const propItems: ConversationSummary[] = [
      { id: 'p-1', title: 'Prop conv', scope: { type: 'collection' }, messageCount: 0, lastMessageAt: '', updatedAt: '' },
    ];
    const slottedItems: ConversationSummary[] = [
      { id: 's-1', title: 'Slotted conv', scope: { type: 'collection' }, messageCount: 0, lastMessageAt: '', updatedAt: '' },
    ];
    const merged = [...propItems, ...slottedItems];

    const { getAllByRole } = render(() => <ConvList items={merged} onSelect={() => {}} />);
    const buttons = getAllByRole('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent('Prop conv');
    expect(buttons[1]).toHaveTextContent('Slotted conv');
  });

  it('parseKcConversationElement produces items that render and fire correct id', () => {
    const onSelect = vi.fn();
    const el = document.createElement('kc-conversation');
    el.setAttribute('id', 'c-99');
    el.textContent = 'My conversation';

    const parsed = parseKcConversationElement(el);
    const { getByText } = render(() => <ConvList items={[parsed]} onSelect={onSelect} />);
    fireEvent.click(getByText('My conversation'));
    expect(onSelect).toHaveBeenCalledWith('c-99');
  });
});
```

- [ ] **Step 3: Run the tests to verify they pass**

```bash
cd /Users/home/Projects/kitn-ai/kitn-chat && npx vitest run src/elements/conversation-list.declarative.test.tsx
```

Expected: All tests pass. If `ConversationScope` is not exported, fix the import in `conversation-list.tsx` (see Task 1 note).

---

## Task 3: Add `DeclarativeConversations` story to `conversation-list.stories.tsx`

**Files:**
- Modify: `src/elements/conversation-list.stories.tsx`

Three changes:
1. Add `'kc-conversation'` to the JSX `IntrinsicElements` declaration.
2. Add `DECLARATIVE_HTML_SNIPPET` constant.
3. Add `DeclarativeConversations` story export.

- [ ] **Step 4: Add `kc-conversation` to JSX IntrinsicElements**

In the existing `declare module 'solid-js'` block at the top of the stories file, add `'kc-conversation'` alongside `'kc-conversations'`:

```tsx
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-conversations': JSX.HTMLAttributes<HTMLElement>;
      'kc-conversation': JSX.HTMLAttributes<HTMLElement> & { id?: string; 'group-id'?: string };
    }
  }
}
```

- [ ] **Step 5: Add the declarative HTML snippet constant and the story**

After the `InSolidJS` story export at the bottom of the file, append:

```tsx
const DECLARATIVE_HTML_SNIPPET = `<!-- Works in any framework or plain HTML — no JS property wiring needed -->
<kc-conversations id="list" style="display:block; width:300px; height:560px;">
  <kc-conversation id="c-1">Q2 launch plan</kc-conversation>
  <kc-conversation id="c-2">API migration notes</kc-conversation>
  <kc-conversation id="c-3">Weekend trip ideas</kc-conversation>
</kc-conversations>

<script type="module">
  import '@kitn.ai/chat/elements';   // registers the custom elements

  // Events fire exactly the same as the data-driven approach.
  document.getElementById('list')
    .addEventListener('kc-conversation-select', (e) => console.log('opened:', e.detail.id));
</script>`;

/** Declarative conversations — \`<kc-conversation>\` light-DOM children instead of
 *  a \`conversations\` property. Each child carries its \`id\` as an attribute and
 *  its title as text content. Great for plain HTML or server-rendered markup
 *  where JS property wiring is inconvenient. */
export const DeclarativeConversations: Story = {
  name: 'Declarative Conversations (kc-conversation)',
  render: () => {
    let el: HTMLElement | undefined;
    onMount(() => {
      if (!el) return;
      el.addEventListener('kc-conversation-select', (e: Event) => {
        console.log('selected:', (e as CustomEvent<{ id: string }>).detail.id);
      });
    });
    return (
      <kc-conversations
        ref={(e) => (el = e as HTMLElement)}
        style={{ display: 'block', width: '300px', height: '560px' }}
      >
        <kc-conversation id="c-1">Q2 launch plan</kc-conversation>
        <kc-conversation id="c-2">API migration notes</kc-conversation>
        <kc-conversation id="c-3">Weekend trip ideas</kc-conversation>
      </kc-conversations>
    );
  },
  parameters: {
    docs: {
      source: {
        code: DECLARATIVE_HTML_SNIPPET,
        language: 'html',
      },
    },
  },
};
```

---

## Task 4: Update `specDescription` to document both usage paths

**Files:**
- Modify: `src/elements/conversation-list.stories.tsx` (the `meta` object's `specDescription` call)

- [ ] **Step 6: Update the specDescription "How to use" paragraph**

Find the existing `'**How to use:** ...'` string in the `specDescription` array and replace it with two entries — one for the data-driven path and one for the declarative path:

Current (single string, lines 164–165 area):
```ts
'**How to use:** register once with `import \'@kitn.ai/chat/elements\'`, set rich data as JS **properties** (`el.groups = [...]`, `el.conversations = [...]`, `el.activeId = \'c-1\'`), and listen for **CustomEvents** (`kc-conversation-select`, `kc-new-chat`, `kc-toggle-sidebar`) directly on the element.',
```

Replace with two strings:
```ts
'**How to use — data-driven:** register once with `import \'@kitn.ai/chat/elements\'`, then set rich data as JS **properties** (`el.groups = [...]`, `el.conversations = [...]`, `el.activeId = \'c-1\'`) and listen for **CustomEvents** (`kc-conversation-select`, `kc-new-chat`, `kc-toggle-sidebar`) directly on the element.',
'**How to use — declarative:** alternatively, compose `<kc-conversation>` child elements directly in markup — each child carries its `id` as an attribute and its title as text content (`<kc-conversation id="c-1">Q2 plan</kc-conversation>`). No JS property wiring needed; the element reads them on mount and re-reads on DOM changes via MutationObserver. Events fire identically to the data-driven path.',
```

---

## Task 5: TypeScript check

**Files:** Read-only (compilation check only)

- [ ] **Step 7: Run tsc --noEmit**

```bash
cd /Users/home/Projects/kitn-ai/kitn-chat && npx tsc --noEmit
```

Expected: Zero errors. If `ConversationScope` is missing from the `../types` import in `conversation-list.tsx`, use a type assertion cast instead:

```ts
scope: { type: 'collection' } as ConversationSummary['scope'],
```

---

## Self-Review Against Spec

### Spec coverage checklist

| Spec requirement | Task |
|-----------------|------|
| Read `<kc-conversation id="c1">Title</kc-conversation>` light-DOM children | Task 1 |
| Map `id` attribute → `id`, `textContent` → `title` | Task 1 (`parseKcConversationElement`) |
| Merge with `conversations` prop (prop first, slotted after) | Task 1 (`allConversations()`) |
| Clicking rendered item fires `kc-conversation-select` with id | Task 1 (unchanged dispatch path) |
| Optional `group-id` attribute support | Task 1 (`groupId` field) |
| Export `parseKcConversationElement` for testability | Task 1 (exported function) |
| `DeclarativeConversations` story | Task 3 |
| `'kc-conversation'` in JSX IntrinsicElements | Task 3 |
| Both data-driven story and declarative story present | Existing `Default`/`InSolidJS` + new `DeclarativeConversations` |
| `specDescription` updated for both paths | Task 4 |
| Unit test mirroring `source-list.test.tsx` | Task 2 |
| `npx tsc --noEmit` clean | Task 5 |
| No build | N/A — explicitly excluded |
| No commit | N/A — explicitly excluded |

### Groups decision

**Groups are deferred** (deferred to prop-only). The spec says "flat `conversations` is the priority; if supporting `<kc-conversation-group label="…">` wrapping is clean, add it, else leave groups to the prop." The `ConversationGroup` type has many required fields (`userId`, `teamId`, `sortOrder`, `createdAt`) that aren't easily expressible as HTML attributes without opaque defaults, and the group rendering logic in `ConversationList` groups by `conv.groupId` which is already wired. Adding declarative groups would require `<kc-conversation-group>` + `<kc-conversation group-id="…">` two-level nesting — not clean. Deferred.

The `group-id` attribute on `<kc-conversation>` IS supported (Task 1) so flat conversations can still be associated with existing prop-defined groups.

### Placeholder scan

No TBDs, no "add appropriate" vagueness, no forward references to undefined types. All code blocks show complete file content or complete replacement snippets.

### Type consistency

`ConversationSummary` (from `../types`) is used uniformly across all tasks. `parseKcConversationElement` returns `ConversationSummary`. The test harness `ConvList` accepts `ConversationSummary[]`. `allConversations()` in the element returns `ConversationSummary[]`.
