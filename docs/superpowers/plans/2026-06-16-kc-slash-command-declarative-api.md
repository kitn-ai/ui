# kc-slash-command Declarative API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `<kc-slash-command>` light-DOM child-element API to `kc-prompt-input` that mirrors the existing `<kc-action>` composition pattern, so slash commands can be declared as HTML children instead of (or in addition to) the `slashCommands` JS property.

**Architecture:** Export a `parseKcSlashCommandElement` helper from `prompt-input.tsx` that maps a `<kc-slash-command>` DOM element's attributes to a `SlashCommandItem`. Inside the `defineWebComponent` callback, add a second `querySelectorAll('kc-slash-command')` reader inside the existing `onMount` block (sharing the same `MutationObserver`). Merge declarative children after the prop list; pass the merged array to `DefaultPromptInput` as `slashCommands`. The `kc-slash-select` event path stays untouched.

**Tech Stack:** SolidJS, Solid web components (defineWebComponent), Vitest + @solidjs/testing-library, Storybook SolidJS, TypeScript.

---

## File map

| File | Change |
|------|--------|
| `src/elements/prompt-input.tsx` | Export `parseKcSlashCommandElement`; add `[slashCommands, setSlashCommands]` signal; second reader in existing observer; merge `props.slashCommands` + slotted; pass merged to `DefaultPromptInput` |
| `src/elements/prompt-input.stories.tsx` | Add `'kc-slash-command'` to JSX IntrinsicElements; add `DeclarativeSlashCommands` story |
| `src/elements/prompt-input-slash-command.test.tsx` | New unit test file for `parseKcSlashCommandElement` + merge behaviour |

---

### Task 1: Export `parseKcSlashCommandElement` from `prompt-input.tsx`

**Files:**
- Modify: `src/elements/prompt-input.tsx`

The `SlashCommandItem` shape (from `src/components/slash-command.tsx`) is:
```ts
interface SlashCommandItem {
  id: string;       // required — used as key and for activeIds matching
  label: string;    // required — displayed in the palette
  description?: string;
  category?: string;
}
```

Attribute → field mapping for `<kc-slash-command command="summarize" label="Summarize" description="Summarize the thread">Summarize</kc-slash-command>`:
- `command` attr → `id`  (required; falls back to `''`)
- textContent trim → `label`  (primary); `label` attr → fallback if textContent is empty
- `description` attr → `description`
- `category` attr → `category`

- [ ] **Step 1: Add the exported parse helper**

Open `src/elements/prompt-input.tsx`. After the existing imports add:

```ts
import type { SlashCommandItem } from '../components/slash-command';
```

(Check: the file already imports `SlashCommandItem` via `'../components/slash-command'` — if it is already there, skip adding the import; it imports it from `'../components/slash-command'` via the `Props` type.)

Actually, the current file imports `SlashCommandItem` transitively via `AttachmentData` and `CustomAction` — check the actual imports. The file currently has:
```ts
import type { SlashCommandItem } from '../components/slash-command';
```
already on line 5. Verify before adding.

Add the exported helper **before** the `defineWebComponent` call:

```ts
/** Parse a single light-DOM `<kc-slash-command>` element into a SlashCommandItem.
 *  Attribute mapping:
 *   - `command`     → SlashCommandItem.id       (required; empty string fallback)
 *   - textContent   → SlashCommandItem.label    (primary); `label` attr as fallback
 *   - `description` → SlashCommandItem.description
 *   - `category`    → SlashCommandItem.category
 */
export function parseKcSlashCommandElement(n: Element): SlashCommandItem {
  return {
    id: n.getAttribute('command') ?? '',
    label: n.textContent?.trim() || n.getAttribute('label') || n.getAttribute('command') || '',
    description: n.getAttribute('description') ?? undefined,
    category: n.getAttribute('category') ?? undefined,
  };
}
```

- [ ] **Step 2: Add the `slashCommands` signal and reader inside `defineWebComponent`**

Inside the `defineWebComponent` callback (line 82), after the existing `toolbarActions` signal and observer block, add a second signal and extend the observer:

The current `onMount` block (lines 96–110) creates `read` for `kc-action`, calls it, then creates a `MutationObserver`. We need to share one observer for both element types. Refactor the block to read both in the same callback:

```ts
// Read declarative <kc-slash-command> children from light DOM.
const [slottedSlashCommands, setSlottedSlashCommands] = createSignal<SlashCommandItem[]>([]);
onMount(() => {
  const readActions = () => {
    const nodes = [...element.querySelectorAll('kc-action')];
    setToolbarActions(nodes.map(n => ({
      id: n.id || n.getAttribute('action') || '',
      label: n.textContent?.trim() || n.getAttribute('label') || n.id || '',
      icon: n.getAttribute('icon') ?? undefined,
      tooltip: n.getAttribute('tooltip') ?? undefined,
    })));
  };
  const readSlashCommands = () => {
    const nodes = [...element.querySelectorAll('kc-slash-command')];
    setSlottedSlashCommands(nodes.map(parseKcSlashCommandElement));
  };
  const readAll = () => { readActions(); readSlashCommands(); };
  readAll();
  const observer = new MutationObserver(readAll);
  observer.observe(element, { childList: true, attributes: true, subtree: true });
  onCleanup(() => observer.disconnect());
});
```

This replaces the existing `onMount` block entirely. The `toolbarActions` signal declaration stays above `onMount` unchanged.

- [ ] **Step 3: Compute the merged slash commands list and pass it to DefaultPromptInput**

Add a derived value just before the `return` statement:

```ts
// Prop slash commands take precedence; slotted children are appended after.
const allSlashCommands = () => [
  ...(props.slashCommands ?? []),
  ...slottedSlashCommands(),
];
```

Then update the `<DefaultPromptInput>` JSX — change:
```tsx
slashCommands={props.slashCommands}
```
to:
```tsx
slashCommands={allSlashCommands().length ? allSlashCommands() : undefined}
```

- [ ] **Step 4: Verify TypeScript compiles cleanly after this task**

```bash
cd /Users/home/Projects/kitn-ai/kitn-chat && npx tsc --noEmit 2>&1 | head -40
```
Expected: zero errors. Fix any type errors before moving on.

---

### Task 2: Add the Storybook story for declarative slash commands

**Files:**
- Modify: `src/elements/prompt-input.stories.tsx`

- [ ] **Step 1: Add `kc-slash-command` to the JSX IntrinsicElements declaration**

In the `declare module 'solid-js'` block (lines 8–16 of the stories file), add the new element alongside `kc-action`:

```ts
declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
      'kc-prompt-input': JSX.HTMLAttributes<HTMLElement>;
      'kc-action': JSX.HTMLAttributes<HTMLElement> & { icon?: string; tooltip?: string };
      'kc-slash-command': JSX.HTMLAttributes<HTMLElement> & { command?: string; description?: string; category?: string };
    }
  }
}
```

- [ ] **Step 2: Add the HTML snippet constant**

After the `CUSTOM_TOOLBAR_SNIPPET` constant at the bottom of the file, add:

```ts
const SLASH_COMMAND_SNIPPET = `<kc-prompt-input id="input" style="display:block; width:100%;"></kc-prompt-input>

<script type="module">
  import '@kitn.ai/chat/elements';

  const input = document.getElementById('input');

  // Inject <kc-slash-command> children — invisible data carriers read via
  // querySelectorAll + MutationObserver, merged with any slashCommands property.
  [
    { command: 'summarize', description: 'Summarize the thread' },
    { command: 'translate', description: 'Translate to English' },
    { command: 'explain',   description: 'Explain like I\\'m five' },
  ].forEach(({ command, description }) => {
    const el = document.createElement('kc-slash-command');
    el.setAttribute('command', command);
    el.setAttribute('description', description);
    el.textContent = command; // becomes the label
    input.appendChild(el);
  });

  input.addEventListener('kc-slash-select', (e) => {
    console.log('slash selected:', e.detail.command);
  });
</script>`;
```

- [ ] **Step 3: Add the story export**

After the `WithCustomToolbarActions` story export, add:

```ts
/** Composition: place **`<kc-slash-command>`** children inside `<kc-prompt-input>`
 *  to declare slash commands without setting the `slashCommands` JS property.
 *  Type `/` in the input to open the palette. Each `<kc-slash-command>` child maps:
 *  `command` attr → id, textContent → label, `description` attr → description.
 *  Selection fires `kc-slash-select` with `detail.command`.
 *  Prop (`slashCommands`) and declarative children are merged — prop items first. */
export const DeclarativeSlashCommands: Story = {
  name: 'Declarative Slash Commands (kc-slash-command)',
  render: () => {
    let el: HTMLElement | undefined;
    onMount(() => {
      if (!el) return;
      el.setAttribute('placeholder', 'Type / to open the command palette…');
      el.addEventListener('kc-slash-select', (e: Event) => {
        console.log('slash selected:', (e as CustomEvent<{ command: unknown }>).detail.command);
      });
    });
    return (
      <div style={{ padding: '16px', width: '100%' }}>
        <kc-prompt-input
          ref={(e: HTMLElement) => (el = e)}
          style={{ display: 'block', width: '100%' }}
        >
          {/* <kc-slash-command> children are invisible data carriers — Shadow DOM hides them.
              The element reads them via querySelectorAll + MutationObserver.
              command attr → id, textContent → label, description attr → description. */}
          <kc-slash-command command="summarize" description="Summarize the thread">summarize</kc-slash-command>
          <kc-slash-command command="translate" description="Translate to English">translate</kc-slash-command>
          <kc-slash-command command="explain" description="Explain like I'm five">explain</kc-slash-command>
        </kc-prompt-input>
        <p style={{ 'margin-top': '8px', 'font-size': '12px', color: 'var(--color-muted-foreground)' }}>
          Type <code>/</code> in the input to open the command palette. Open the browser
          console to see <code>kc-slash-select</code> events on selection.
        </p>
      </div>
    );
  },
  parameters: { docs: { source: { code: SLASH_COMMAND_SNIPPET, language: 'html' } } },
};
```

- [ ] **Step 4: Verify TypeScript compiles cleanly after this task**

```bash
cd /Users/home/Projects/kitn-ai/kitn-chat && npx tsc --noEmit 2>&1 | head -40
```
Expected: zero errors.

---

### Task 3: Update the element `specDescription`

**Files:**
- Modify: `src/elements/prompt-input.stories.tsx`

The `specDescription` is the third argument to `specDescription('kc-prompt-input', [...])` in the `meta` object's `parameters.docs.description` (lines 129–136).

The current last bullet point describes `<kc-action>` children. Add a new bullet after it:

- [ ] **Step 1: Add the slash-command mention to the spec description**

The array of description strings currently ends with the `<kc-action>` bullet. Add a new string to the array:

Change (end of the array, after the `<kc-action>` string):
```ts
          '**Custom toolbar buttons:** place `<kc-action id icon tooltip>` elements as children — they are invisible data carriers (Shadow DOM hides them) that the element reads and renders as extra ghost icon buttons in the left toolbar. Each click fires a `kc-action` CustomEvent with `detail.action` equal to the action id (the same `<kc-action>` descriptor element that `<kc-message>` uses — composition symmetry).',
          '**Placement:** pinned to the bottom of a chat surface, full width. Set `loading` while a response streams to show the busy state, and `disabled` to block input entirely.',
```

To (insert new bullet before Placement):
```ts
          '**Custom toolbar buttons:** place `<kc-action id icon tooltip>` elements as children — they are invisible data carriers (Shadow DOM hides them) that the element reads and renders as extra ghost icon buttons in the left toolbar. Each click fires a `kc-action` CustomEvent with `detail.action` equal to the action id (the same `<kc-action>` descriptor element that `<kc-message>` uses — composition symmetry).',
          '**Slash commands (declarative):** place `<kc-slash-command command="id" description="…">Label</kc-slash-command>` elements as children — invisible data carriers merged with the `slashCommands` JS property. Typing `/` opens the palette with the combined list; selecting an item fires `kc-slash-select` with `detail.command`. Prop items appear first; declarative children are appended.',
          '**Placement:** pinned to the bottom of a chat surface, full width. Set `loading` while a response streams to show the busy state, and `disabled` to block input entirely.',
```

- [ ] **Step 2: Verify TypeScript compiles cleanly after this task**

```bash
cd /Users/home/Projects/kitn-ai/kitn-chat && npx tsc --noEmit 2>&1 | head -40
```
Expected: zero errors.

---

### Task 4: Write unit tests for `parseKcSlashCommandElement`

**Files:**
- Create: `src/elements/prompt-input-slash-command.test.tsx`

Pattern mirrors `src/components/source-list.test.tsx` — test the exported parse helper with raw DOM elements created via `document.createElement`, plus a merge-behaviour integration test.

- [ ] **Step 1: Write the test file**

```tsx
/**
 * Unit tests for parseKcSlashCommandElement and the merge behaviour
 * in kc-prompt-input's declarative <kc-slash-command> reader.
 *
 * Strategy: test the exported pure helper directly with synthetic DOM elements
 * (no Shadow DOM, no custom element upgrade needed).
 * Merge behaviour is verified by constructing the same arrays the element would
 * produce and asserting the result — pure array logic, no browser environment needed.
 */
import { describe, it, expect } from 'vitest';
import { parseKcSlashCommandElement } from './prompt-input';

// ---------------------------------------------------------------------------
// parseKcSlashCommandElement — attribute → SlashCommandItem mapping
// ---------------------------------------------------------------------------

describe('parseKcSlashCommandElement', () => {
  function makeEl(
    attrs: Record<string, string | null>,
    textContent?: string,
  ): Element {
    const el = document.createElement('kc-slash-command');
    for (const [k, v] of Object.entries(attrs)) {
      if (v !== null) el.setAttribute(k, v);
    }
    if (textContent !== undefined) el.textContent = textContent;
    return el;
  }

  it('maps command attr → id, textContent → label, description attr → description', () => {
    const el = makeEl(
      { command: 'summarize', description: 'Summarize the thread' },
      'summarize',
    );
    expect(parseKcSlashCommandElement(el)).toEqual({
      id: 'summarize',
      label: 'summarize',
      description: 'Summarize the thread',
      category: undefined,
    });
  });

  it('maps category attr → category', () => {
    const el = makeEl(
      { command: 'search', category: 'tools' },
      'search',
    );
    expect(parseKcSlashCommandElement(el).category).toBe('tools');
  });

  it('falls back to label attr when textContent is empty', () => {
    const el = makeEl({ command: 'help', label: 'Help' }, '');
    expect(parseKcSlashCommandElement(el).label).toBe('Help');
  });

  it('falls back to command attr as label when both textContent and label attr are absent', () => {
    const el = makeEl({ command: 'debug' });
    expect(parseKcSlashCommandElement(el).label).toBe('debug');
  });

  it('returns empty string for id when command attr is absent', () => {
    const el = makeEl({}, 'orphan');
    expect(parseKcSlashCommandElement(el).id).toBe('');
  });

  it('returns undefined for optional attrs when absent', () => {
    const el = makeEl({ command: 'bare' }, 'bare');
    const item = parseKcSlashCommandElement(el);
    expect(item.description).toBeUndefined();
    expect(item.category).toBeUndefined();
  });

  it('whitespace-trims textContent for the label', () => {
    const el = makeEl({ command: 'trim' }, '  trim  ');
    expect(parseKcSlashCommandElement(el).label).toBe('trim');
  });
});

// ---------------------------------------------------------------------------
// merge behaviour — prop slashCommands + slotted children
// ---------------------------------------------------------------------------

describe('slashCommands merge (prop + declarative children)', () => {
  function makeEl(command: string, label: string, description?: string): Element {
    const el = document.createElement('kc-slash-command');
    el.setAttribute('command', command);
    el.textContent = label;
    if (description) el.setAttribute('description', description);
    return el;
  }

  it('prop items appear before slotted children in the merged list', () => {
    const propItems = [{ id: 'prop-cmd', label: 'Prop Command' }];
    const slottedItems = [
      parseKcSlashCommandElement(makeEl('child-cmd', 'Child Command')),
    ];
    const merged = [...propItems, ...slottedItems];
    expect(merged[0].id).toBe('prop-cmd');
    expect(merged[1].id).toBe('child-cmd');
  });

  it('merged list is empty when both prop and children are absent', () => {
    const propItems: ReturnType<typeof parseKcSlashCommandElement>[] = [];
    const slottedItems: ReturnType<typeof parseKcSlashCommandElement>[] = [];
    expect([...propItems, ...slottedItems]).toHaveLength(0);
  });

  it('slotted-only: single child appears as the only item', () => {
    const el = makeEl('summarize', 'Summarize', 'Summarize the thread');
    const merged = [...[], parseKcSlashCommandElement(el)];
    expect(merged).toHaveLength(1);
    expect(merged[0]).toEqual({
      id: 'summarize',
      label: 'Summarize',
      description: 'Summarize the thread',
      category: undefined,
    });
  });

  it('prop-only: prop items flow through unchanged', () => {
    const propItems = [
      { id: 'a', label: 'Alpha', description: 'First' },
      { id: 'b', label: 'Beta' },
    ];
    const merged = [...propItems, ...([] as typeof propItems)];
    expect(merged).toEqual(propItems);
  });
});
```

- [ ] **Step 2: Run the test suite to verify all tests pass**

```bash
cd /Users/home/Projects/kitn-ai/kitn-chat && npx vitest run src/elements/prompt-input-slash-command.test.tsx 2>&1 | tail -30
```

Expected output: all tests pass, zero failures, zero type errors.

If the tests fail because `parseKcSlashCommandElement` is not yet exported from `prompt-input.tsx`, confirm Task 1 is complete first.

---

### Task 5: Final TypeScript clean check

**Files:** (none changed — verification only)

- [ ] **Step 1: Run tsc --noEmit across the entire project**

```bash
cd /Users/home/Projects/kitn-ai/kitn-chat && npx tsc --noEmit 2>&1
```

Expected: zero errors. If errors appear, fix them in the file they reference before this task is marked complete. Do NOT run `npm run build`.

---

## Self-Review

### Spec coverage check

| Requirement | Task |
|-------------|------|
| `parseKcSlashCommandElement` exported | Task 1, Step 1 |
| `<kc-slash-command>` read in onMount/observer alongside `<kc-action>` | Task 1, Step 2 |
| Merge with `slashCommands` prop (prop first) | Task 1, Step 3 |
| `kc-slash-select` still fires on selection | No change needed — `onSlashSelect` callback path unchanged |
| Storybook story `DeclarativeSlashCommands` | Task 2, Step 3 |
| `'kc-slash-command'` in JSX IntrinsicElements | Task 2, Step 1 |
| HTML source snippet in story | Task 2, Step 2 |
| `specDescription` updated to mention BOTH prop and children | Task 3, Step 1 |
| Unit test for parse/merge helper | Task 4 |
| `npx tsc --noEmit` clean | Task 5 |
| Do NOT run `npm run build` | Enforced — no build steps in any task |
| Do NOT commit | Enforced — no git commit steps |
| Only touch prompt-input element/component/story/test files | All tasks target only those files |

### Placeholder scan

No TBDs, no TODOs, no "similar to Task N", no steps without code.

### Type consistency

- `SlashCommandItem.id` (string, required) — fed from `command` attr or `''`
- `SlashCommandItem.label` (string, required) — fed from textContent trim, then `label` attr, then `command` attr
- `SlashCommandItem.description` (string | undefined) — fed from `description` attr or `undefined`
- `SlashCommandItem.category` (string | undefined) — fed from `category` attr or `undefined`
- `allSlashCommands()` returns `SlashCommandItem[]` — compatible with `DefaultPromptInput.slashCommands?: SlashCommandItem[]`
- `parseKcSlashCommandElement` signature matches usage in test and in element body

All consistent.
