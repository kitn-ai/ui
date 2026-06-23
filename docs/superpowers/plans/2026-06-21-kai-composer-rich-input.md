# kai-composer Rich Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A standalone `<kai-composer>` web component that types like a textarea, supports atomic inline entity pills (skills/mentions) via `/` and `@` triggers, highlights keywords, and emits a structured `{ doc, text, entities }` event for downstream agent expansion.

**Architecture:** Two-model split (OpenCode-faithful). A pure headless model (`composer-model.ts` + `composer-triggers.ts`) defines `Segment[]` and serialization with zero DOM. A Solid view (`composer.tsx` + `composer-dom.ts`) owns a `contenteditable="plaintext-only"` surface, parses DOM→model on input, renders atomic pills, drives a caret-anchored trigger menu, and decorates keyword ranges via the CSS Custom Highlight API. A thin `kai-composer` element bridges props/events via `defineWebComponent`.

**Tech Stack:** SolidJS, TypeScript, `@floating-ui/dom` (via existing `usePosition`/`useDismiss` in `src/ui/overlay.tsx`), Vitest (jsdom unit + Storybook/Playwright browser), Storybook (`storybook-solidjs-vite`).

## Global Constraints

- Element prefix is **`kai-`** (never `kitn-`). Tag: `kai-composer`.
- Array/object props (`value` as doc, `triggers`, `highlights`) are set as **JS properties**, not attributes; scalars (`placeholder`, `disabled`, `loading`, `maxHeight`, `submitOnEnter`) work as attributes.
- Events are **non-bubbling, non-composed `kai-*` CustomEvents** fired on the host (use the `dispatch` helper from `defineWebComponent`).
- **Not an RTE:** no bold/italic, no markdown shortcuts. `contenteditable="plaintext-only"` (fallback `"true"` + paste sanitize). Only non-text node = entity pill.
- The component emits **references only** — it never resolves a skill body or reads a file.
- No new runtime dependencies. Reuse `src/ui/overlay.tsx`, `src/primitives/chat-config.tsx`, `src/utils/cn.ts`.
- TDD: pure model/helpers fully unit-tested (jsdom); view/element interaction via Storybook browser tests. Frequent commits. Run `git checkout -- src/components/component-meta.json` if a build churns it.
- No React wrapper in v1.

## File Structure

- Create `src/primitives/composer-model.ts` — types `Segment`/`EntityRef`/`ComposerDoc`; `normalizeValue`, `serializeToText`, `entitiesOf`, `docIsEmpty`. Pure, no DOM.
- Create `src/primitives/composer-model.test.ts` — unit tests for the above.
- Create `src/primitives/composer-triggers.ts` — `detectTrigger(text, caret, chars)`. Pure.
- Create `src/primitives/composer-triggers.test.ts` — unit tests.
- Create `src/components/composer-dom.ts` — DOM↔model glue: `ZWSP`, `ENTITY_ATTR`, `entityStore` (WeakMap), `createEntityEl`, `isEntityEl`, `parseDom`, `renderDoc`. Operates on DOM nodes (jsdom-testable).
- Create `src/components/composer-dom.test.ts` — unit tests (synthetic DOM).
- Create `src/components/composer.tsx` — the Solid `Composer` component (view). Exports `Composer`, `ComposerProps`, `TriggerDef`, `TriggerItem`, `HighlightRule`.
- Create `src/components/composer.test.tsx` — jsdom render/behavior tests where feasible (value render, Enter submit, change emit).
- Create `src/components/composer.stories.tsx` — Solid-level stories (also browser tests).
- Create `src/elements/composer.tsx` — `kai-composer` via `defineWebComponent`; exports `parseKaiTriggerElement` (declarative `<kai-trigger-item>` reader, pure) for unit testing.
- Create `src/elements/composer.test.tsx` — unit tests for the pure element helpers.
- Create `src/elements/composer.stories.tsx` — `kai-composer` element stories (browser tests; the IVP target).
- Modify `src/elements/register-impl.ts` — import `./composer` so the element registers with the bundle.
- Create `tests/e2e/composer-ivp.spec.ts` — Playwright IVP: screenshot + asserts emitted `kai-submit` payload.

---

### Task 1: Model types + `normalizeValue`

**Files:**
- Create: `src/primitives/composer-model.ts`
- Test: `src/primitives/composer-model.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Segment = { type: 'text'; text: string } | { type: 'entity'; entity: EntityRef };
  export interface EntityRef { kind: string; id: string; label: string; icon?: string; promptText?: string; data?: Record<string, unknown>; }
  export type ComposerDoc = Segment[];
  export function normalizeValue(value: string | ComposerDoc | null | undefined): ComposerDoc;
  ```
- `normalizeValue` contract: `null`/`undefined`/`''` → `[]`. A string → `[{type:'text', text}]` (only if non-empty). A doc → a canonical copy: drop empty `text` segments, merge adjacent `text` segments, keep `entity` segments in order. Never mutates input.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { normalizeValue, type ComposerDoc } from './composer-model';

describe('normalizeValue', () => {
  it('returns [] for nullish/empty', () => {
    expect(normalizeValue(undefined)).toEqual([]);
    expect(normalizeValue(null)).toEqual([]);
    expect(normalizeValue('')).toEqual([]);
  });
  it('wraps a non-empty string in a single text segment', () => {
    expect(normalizeValue('hello')).toEqual([{ type: 'text', text: 'hello' }]);
  });
  it('merges adjacent text segments and drops empties', () => {
    const input: ComposerDoc = [
      { type: 'text', text: 'a' }, { type: 'text', text: '' }, { type: 'text', text: 'b' },
    ];
    expect(normalizeValue(input)).toEqual([{ type: 'text', text: 'ab' }]);
  });
  it('keeps entities in order and merges text around them', () => {
    const e = { kind: 'skill', id: 'rec', label: 'Record & Replay' };
    const input: ComposerDoc = [
      { type: 'text', text: '' }, { type: 'entity', entity: e },
      { type: 'text', text: ' ' }, { type: 'text', text: 'go' },
    ];
    expect(normalizeValue(input)).toEqual([
      { type: 'entity', entity: e }, { type: 'text', text: ' go' },
    ]);
  });
  it('does not mutate the input array', () => {
    const input: ComposerDoc = [{ type: 'text', text: 'x' }];
    normalizeValue(input);
    expect(input).toEqual([{ type: 'text', text: 'x' }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/primitives/composer-model.test.ts` → FAIL (module/exports missing).
- [ ] **Step 3: Write minimal implementation**

```ts
export interface EntityRef {
  kind: string;
  id: string;
  label: string;
  icon?: string;
  promptText?: string;
  data?: Record<string, unknown>;
}
export type Segment =
  | { type: 'text'; text: string }
  | { type: 'entity'; entity: EntityRef };
export type ComposerDoc = Segment[];

export function normalizeValue(value: string | ComposerDoc | null | undefined): ComposerDoc {
  if (value == null) return [];
  if (typeof value === 'string') return value.length ? [{ type: 'text', text: value }] : [];
  const out: ComposerDoc = [];
  for (const seg of value) {
    if (seg.type === 'text') {
      if (!seg.text) continue;
      const last = out[out.length - 1];
      if (last && last.type === 'text') last.text += seg.text;
      else out.push({ type: 'text', text: seg.text });
    } else {
      out.push({ type: 'entity', entity: seg.entity });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/primitives/composer-model.test.ts` → PASS.
- [ ] **Step 5: Commit** — `git add src/primitives/composer-model.* && git commit -m "feat(composer): document model types + normalizeValue"`

---

### Task 2: `serializeToText` + `entitiesOf` + `docIsEmpty`

**Files:**
- Modify: `src/primitives/composer-model.ts`
- Test: `src/primitives/composer-model.test.ts` (append)

**Interfaces:**
- Consumes: `Segment`, `EntityRef`, `ComposerDoc` from Task 1.
- Produces:
  ```ts
  export function serializeToText(doc: ComposerDoc, opts?: { entity?: (e: EntityRef) => string }): string;
  export function entitiesOf(doc: ComposerDoc): EntityRef[];
  export function docIsEmpty(doc: ComposerDoc): boolean;
  ```
- `serializeToText` contract: text segments verbatim; entity → `opts.entity(e)` if given, else `e.promptText ?? e.label`, rendered inline (no added spaces). `entitiesOf` returns entities in document order. `docIsEmpty` true when serialized text is empty AND no entities.

- [ ] **Step 1: Write the failing test**

```ts
import { serializeToText, entitiesOf, docIsEmpty } from './composer-model';

describe('serializeToText', () => {
  const skill = { kind: 'skill', id: 'rec', label: 'Record & Replay' };
  it('renders text verbatim', () => {
    expect(serializeToText([{ type: 'text', text: 'hi there' }])).toBe('hi there');
  });
  it('renders an entity as promptText ?? label, inline', () => {
    expect(serializeToText([
      { type: 'entity', entity: skill }, { type: 'text', text: " I'm going to show y" },
    ])).toBe("Record & Replay I'm going to show y");
  });
  it('prefers promptText when present', () => {
    const e = { ...skill, promptText: 'Use the Record & Replay skill.' };
    expect(serializeToText([{ type: 'entity', entity: e }])).toBe('Use the Record & Replay skill.');
  });
  it('honors a custom entity serializer', () => {
    expect(serializeToText([{ type: 'entity', entity: skill }], { entity: (e) => `@${e.id}` })).toBe('@rec');
  });
});

describe('entitiesOf / docIsEmpty', () => {
  const skill = { kind: 'skill', id: 'rec', label: 'Record & Replay' };
  it('collects entities in order', () => {
    expect(entitiesOf([{ type: 'text', text: 'a' }, { type: 'entity', entity: skill }])).toEqual([skill]);
  });
  it('docIsEmpty is true for [] and false when text or entity present', () => {
    expect(docIsEmpty([])).toBe(true);
    expect(docIsEmpty([{ type: 'text', text: '' }])).toBe(true);
    expect(docIsEmpty([{ type: 'entity', entity: skill }])).toBe(false);
    expect(docIsEmpty([{ type: 'text', text: 'x' }])).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — same file → FAIL (exports missing).
- [ ] **Step 3: Write minimal implementation** (append to `composer-model.ts`)

```ts
export function serializeToText(
  doc: ComposerDoc,
  opts?: { entity?: (e: EntityRef) => string },
): string {
  let out = '';
  for (const seg of doc) {
    if (seg.type === 'text') out += seg.text;
    else out += opts?.entity ? opts.entity(seg.entity) : (seg.entity.promptText ?? seg.entity.label);
  }
  return out;
}
export function entitiesOf(doc: ComposerDoc): EntityRef[] {
  return doc.filter((s): s is Extract<Segment, { type: 'entity' }> => s.type === 'entity').map((s) => s.entity);
}
export function docIsEmpty(doc: ComposerDoc): boolean {
  return doc.every((s) => s.type === 'text' && s.text.length === 0);
}
```

- [ ] **Step 4: Run test to verify it passes** — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(composer): serializeToText, entitiesOf, docIsEmpty"`

---

### Task 3: Trigger detection (`detectTrigger`)

**Files:**
- Create: `src/primitives/composer-triggers.ts`
- Test: `src/primitives/composer-triggers.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface ActiveTrigger { char: string; query: string; start: number; }
  export function detectTrigger(text: string, caret: number, chars: string[]): ActiveTrigger | null;
  ```
- Contract: scan left from `caret-1`. A trigger is active iff one of `chars` appears such that (a) it is at index 0 OR preceded by whitespace, and (b) every character between it and `caret` is a non-whitespace query character. Returns the nearest such trigger (`start` = its index, `query` = `text.slice(start+1, caret)`), else `null`. Whitespace between the char and caret ⇒ no active trigger.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { detectTrigger } from './composer-triggers';

const CH = ['/', '@'];
describe('detectTrigger', () => {
  it('detects a slash at start of text', () => {
    expect(detectTrigger('/rec', 4, CH)).toEqual({ char: '/', query: 'rec', start: 0 });
  });
  it('detects an @ after whitespace', () => {
    expect(detectTrigger('hi @ro', 6, CH)).toEqual({ char: '@', query: 'ro', start: 3 });
  });
  it('returns null when a space follows the trigger before the caret', () => {
    expect(detectTrigger('/rec now', 8, CH)).toBeNull();
  });
  it('returns null when the trigger is glued to a word (no boundary)', () => {
    expect(detectTrigger('a/b', 3, CH)).toBeNull();
  });
  it('returns empty query right after typing the char', () => {
    expect(detectTrigger('hello @', 7, CH)).toEqual({ char: '@', query: '', start: 6 });
  });
  it('ignores chars not in the set', () => {
    expect(detectTrigger('#tag', 4, CH)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — FAIL.
- [ ] **Step 3: Write minimal implementation**

```ts
export interface ActiveTrigger { char: string; query: string; start: number; }

export function detectTrigger(text: string, caret: number, chars: string[]): ActiveTrigger | null {
  for (let i = caret - 1; i >= 0; i--) {
    const c = text[i];
    if (/\s/.test(c)) return null; // hit whitespace before any trigger char
    if (chars.includes(c)) {
      const boundaryOk = i === 0 || /\s/.test(text[i - 1]);
      if (!boundaryOk) return null;
      return { char: c, query: text.slice(i + 1, caret), start: i };
    }
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes** — PASS.
- [ ] **Step 5: Commit** — `git add src/primitives/composer-triggers.* && git commit -m "feat(composer): caret trigger detection"`

---

### Task 4: DOM↔model glue (`composer-dom.ts`)

**Files:**
- Create: `src/components/composer-dom.ts`
- Test: `src/components/composer-dom.test.ts`

**Interfaces:**
- Consumes: `EntityRef`, `Segment`, `ComposerDoc`, `normalizeValue` from `../primitives/composer-model`.
- Produces:
  ```ts
  export const ZWSP = '​';
  export const ENTITY_ATTR = 'data-kai-entity';
  export const entityStore: WeakMap<HTMLElement, EntityRef>;
  export function isEntityEl(node: Node | null): node is HTMLElement;
  export function createEntityEl(doc: Document, entity: EntityRef): HTMLElement;
  export function parseDom(root: HTMLElement): ComposerDoc;
  export function renderDoc(root: HTMLElement, doc: ComposerDoc): void;
  ```
- `createEntityEl`: builds `<span data-kai-entity data-kind data-id contenteditable="false">` containing optional icon + the label text; stores the full `EntityRef` in `entityStore`. Caller appends a `ZWSP` text node after it.
- `parseDom`: walk `root.childNodes` in order → text node = text (with ZWSP stripped); `<br>` = `'\n'`; entity el = its stored `EntityRef` (fallback to dataset `{kind,id,label}` if not in store). Result passed through `normalizeValue`.
- `renderDoc`: clears `root`, appends text nodes / entity els (+ trailing ZWSP) for the doc.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { ZWSP, createEntityEl, isEntityEl, parseDom, renderDoc } from './composer-dom';

const skill = { kind: 'skill', id: 'rec', label: 'Record & Replay' };

describe('composer-dom', () => {
  it('createEntityEl carries kind/id and is non-editable, isEntityEl recognizes it', () => {
    const el = createEntityEl(document, skill);
    expect(isEntityEl(el)).toBe(true);
    expect(el.getAttribute('contenteditable')).toBe('false');
    expect(el.dataset.kind).toBe('skill');
    expect(el.dataset.id).toBe('rec');
    expect(el.textContent).toContain('Record & Replay');
    expect(isEntityEl(document.createTextNode('x'))).toBe(false);
  });

  it('parseDom turns text + entity + ZWSP into a normalized doc', () => {
    const root = document.createElement('div');
    const pill = createEntityEl(document, skill);
    root.appendChild(pill);
    root.appendChild(document.createTextNode(ZWSP + " I'm going to show y"));
    expect(parseDom(root)).toEqual([
      { type: 'entity', entity: skill },
      { type: 'text', text: " I'm going to show y" },
    ]);
  });

  it('parseDom maps <br> to a newline', () => {
    const root = document.createElement('div');
    root.appendChild(document.createTextNode('a'));
    root.appendChild(document.createElement('br'));
    root.appendChild(document.createTextNode('b'));
    expect(parseDom(root)).toEqual([{ type: 'text', text: 'a\nb' }]);
  });

  it('renderDoc round-trips through parseDom', () => {
    const root = document.createElement('div');
    const doc = [{ type: 'text', text: 'hi ' }, { type: 'entity', entity: skill }, { type: 'text', text: ' end' }] as const;
    renderDoc(root, doc as any);
    expect(parseDom(root)).toEqual(doc);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/components/composer-dom.test.ts` → FAIL.
- [ ] **Step 3: Write minimal implementation**

```ts
import type { EntityRef, ComposerDoc } from '../primitives/composer-model';
import { normalizeValue } from '../primitives/composer-model';

export const ZWSP = '​';
export const ENTITY_ATTR = 'data-kai-entity';
export const entityStore = new WeakMap<HTMLElement, EntityRef>();

export function isEntityEl(node: Node | null): node is HTMLElement {
  return !!node && node.nodeType === 1 && (node as HTMLElement).hasAttribute(ENTITY_ATTR);
}

export function createEntityEl(doc: Document, entity: EntityRef): HTMLElement {
  const el = doc.createElement('span');
  el.setAttribute(ENTITY_ATTR, '');
  el.setAttribute('contenteditable', 'false');
  el.dataset.kind = entity.kind;
  el.dataset.id = entity.id;
  el.className = 'kai-composer-pill';
  if (entity.icon) {
    const img = doc.createElement('img');
    img.src = entity.icon;
    img.alt = '';
    img.className = 'kai-composer-pill-icon';
    el.appendChild(img);
  }
  el.appendChild(doc.createTextNode(entity.label));
  entityStore.set(el, entity);
  return el;
}

export function parseDom(root: HTMLElement): ComposerDoc {
  const segs: ComposerDoc = [];
  root.childNodes.forEach((node) => {
    if (isEntityEl(node)) {
      const stored = entityStore.get(node as HTMLElement);
      const el = node as HTMLElement;
      segs.push({ type: 'entity', entity: stored ?? { kind: el.dataset.kind ?? '', id: el.dataset.id ?? '', label: el.textContent ?? '' } });
    } else if (node.nodeType === 1 && (node as HTMLElement).tagName === 'BR') {
      segs.push({ type: 'text', text: '\n' });
    } else if (node.nodeType === 3) {
      segs.push({ type: 'text', text: (node.textContent ?? '').split(ZWSP).join('') });
    }
  });
  return normalizeValue(segs);
}

export function renderDoc(root: HTMLElement, doc: ComposerDoc): void {
  root.textContent = '';
  for (const seg of doc) {
    if (seg.type === 'text') root.appendChild(document.createTextNode(seg.text));
    else {
      root.appendChild(createEntityEl(document, seg.entity));
      root.appendChild(document.createTextNode(ZWSP));
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes** — PASS.
- [ ] **Step 5: Commit** — `git add src/components/composer-dom.* && git commit -m "feat(composer): DOM<->model parse/render glue"`

---

### Task 5: `Composer` view — value render, input→change, Enter submit, auto-grow

**Files:**
- Create: `src/components/composer.tsx`
- Test: `src/components/composer.test.tsx`

**Interfaces:**
- Consumes: `composer-model` (`ComposerDoc`, `normalizeValue`, `serializeToText`, `entitiesOf`, `docIsEmpty`), `composer-dom` (`parseDom`, `renderDoc`, `ZWSP`, `createEntityEl`, `isEntityEl`), `composer-triggers` (`detectTrigger`), `../utils/cn`.
- Produces:
  ```ts
  export interface TriggerItem { id: string; label: string; icon?: string; promptText?: string; data?: Record<string, unknown>; }
  export interface TriggerDef { char: string; kind: string; items?: TriggerItem[]; }
  export type HighlightRule = string | { pattern: string; flags?: string; class?: string };
  export interface ComposerChange { doc: ComposerDoc; text: string; entities: EntityRef[]; }
  export interface ComposerProps {
    value?: string | ComposerDoc;
    placeholder?: string;
    disabled?: boolean;
    loading?: boolean;
    maxHeight?: number | string;
    submitOnEnter?: boolean;
    triggers?: TriggerDef[];
    highlights?: HighlightRule[];
    onChange?: (change: ComposerChange) => void;
    onSubmit?: (change: ComposerChange) => void;
    onTrigger?: (info: { char: string; query: string; rect: DOMRect }) => void;
    onTriggerClose?: () => void;
    onEntityAdd?: (entity: EntityRef) => void;
    onEntityRemove?: (entity: EntityRef) => void;
  }
  export function Composer(props: ComposerProps): JSX.Element;
  ```
- This task implements ONLY: initial render of `value`, `input` handler that `parseDom`→builds `ComposerChange`→`onChange`, `keydown` Enter (submit when `submitOnEnter !== false` and not Shift/disabled/loading) / Shift+Enter newline, placeholder when empty, and CSS auto-grow (`min-height`, `max-height`, `overflow-y:auto`). Triggers, pills-insertion, and highlighting come in Tasks 6–8 — leave typed stubs (`onTrigger` etc.) unused for now.

- [ ] **Step 1: Write the failing test** (jsdom; uses `@solidjs/testing-library`)

```tsx
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { Composer } from './composer';

afterEach(cleanup);

function editable(container: HTMLElement) {
  return container.querySelector('[data-kai-composer-editable]') as HTMLElement;
}

describe('Composer view', () => {
  it('renders a string value into the editable surface', () => {
    const { container } = render(() => <Composer value="hello" />);
    expect(editable(container).textContent).toContain('hello');
  });

  it('emits onChange with doc/text/entities on input', () => {
    const onChange = vi.fn();
    const { container } = render(() => <Composer onChange={onChange} />);
    const el = editable(container);
    el.textContent = 'hi there';
    fireEvent.input(el);
    expect(onChange).toHaveBeenCalled();
    const arg = onChange.mock.calls.at(-1)![0];
    expect(arg.text).toBe('hi there');
    expect(arg.doc).toEqual([{ type: 'text', text: 'hi there' }]);
    expect(arg.entities).toEqual([]);
  });

  it('Enter submits, Shift+Enter does not', () => {
    const onSubmit = vi.fn();
    const { container } = render(() => <Composer value="go" onSubmit={onSubmit} />);
    const el = editable(container);
    fireEvent.keyDown(el, { key: 'Enter', shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(el, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].text).toBe('go');
  });

  it('does not submit when disabled or loading', () => {
    const onSubmit = vi.fn();
    const { container } = render(() => <Composer value="go" disabled onSubmit={onSubmit} />);
    fireEvent.keyDown(editable(container), { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/components/composer.test.tsx` → FAIL.
- [ ] **Step 3: Write minimal implementation** (full component skeleton; subsequent tasks extend it)

```tsx
import { type JSX, createSignal, onMount, splitProps } from 'solid-js';
import { cn } from '../utils/cn';
import { type ComposerDoc, type EntityRef, normalizeValue, serializeToText, entitiesOf, docIsEmpty } from '../primitives/composer-model';
import { parseDom, renderDoc } from './composer-dom';

export interface TriggerItem { id: string; label: string; icon?: string; promptText?: string; data?: Record<string, unknown>; }
export interface TriggerDef { char: string; kind: string; items?: TriggerItem[]; }
export type HighlightRule = string | { pattern: string; flags?: string; class?: string };
export interface ComposerChange { doc: ComposerDoc; text: string; entities: EntityRef[]; }
export interface ComposerProps {
  value?: string | ComposerDoc;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  maxHeight?: number | string;
  submitOnEnter?: boolean;
  triggers?: TriggerDef[];
  highlights?: HighlightRule[];
  onChange?: (change: ComposerChange) => void;
  onSubmit?: (change: ComposerChange) => void;
  onTrigger?: (info: { char: string; query: string; rect: DOMRect }) => void;
  onTriggerClose?: () => void;
  onEntityAdd?: (entity: EntityRef) => void;
  onEntityRemove?: (entity: EntityRef) => void;
}

export function Composer(props: ComposerProps): JSX.Element {
  let editable!: HTMLDivElement;
  const [empty, setEmpty] = createSignal(docIsEmpty(normalizeValue(props.value)));

  const snapshot = (): ComposerChange => {
    const doc = parseDom(editable);
    return { doc, text: serializeToText(doc), entities: entitiesOf(doc) };
  };

  onMount(() => {
    renderDoc(editable, normalizeValue(props.value));
    setEmpty(docIsEmpty(parseDom(editable)));
  });

  const handleInput = () => {
    const change = snapshot();
    setEmpty(docIsEmpty(change.doc));
    props.onChange?.(change);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && props.submitOnEnter !== false) {
      e.preventDefault();
      if (props.disabled || props.loading) return;
      props.onSubmit?.(snapshot());
    }
  };

  const maxH = () => props.maxHeight ?? 240;
  return (
    <div class={cn('kai-composer relative rounded-xl bg-muted/40 p-2', props.disabled && 'cursor-not-allowed opacity-60')}>
      <div
        ref={editable}
        data-kai-composer-editable
        contentEditable={props.disabled ? false : ('plaintext-only' as unknown as boolean)}
        role="textbox"
        aria-multiline="true"
        aria-label={props.placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        class={cn('text-foreground min-h-[44px] w-full overflow-y-auto outline-none whitespace-pre-wrap break-words')}
        style={{ 'max-height': typeof maxH() === 'number' ? `${maxH()}px` : String(maxH()) }}
      />
      {empty() && props.placeholder && (
        <div class="text-muted-foreground pointer-events-none absolute left-2 top-2 select-none">{props.placeholder}</div>
      )}
    </div>
  );
}
```

> Note: `contenteditable="plaintext-only"` is set via a string cast (Solid's prop typing expects boolean). jsdom may not honor `plaintext-only`, but tests drive `textContent` + `fireEvent` directly, so behavior is unaffected.

- [ ] **Step 4: Run test to verify it passes** — PASS.
- [ ] **Step 5: Commit** — `git add src/components/composer.tsx src/components/composer.test.tsx && git commit -m "feat(composer): Composer view — render, change, submit, autogrow"`

---

### Task 6: Entity insertion + atomic backspace deletion

**Files:**
- Modify: `src/components/composer.tsx`
- Modify: `src/components/composer-dom.ts` (add `caretOffset`, `insertEntityAtCaret` if helpful)
- Test: `src/components/composer.test.tsx` (append)

**Interfaces:**
- Produces (on `Composer`, exposed for Task 8 + element): an internal `insertEntity(entity: EntityRef, opts?: { replaceFrom?: number })` callable; and keydown handling so Backspace/Delete adjacent to a pill removes the whole pill and fires `onEntityRemove`.
- Consumes: `createEntityEl`, `isEntityEl`, `ZWSP` from `composer-dom`.

- [ ] **Step 1: Write the failing test** (jsdom: simulate a pill already present, press Backspace with caret after it)

```tsx
import { createEntityEl, ZWSP } from './composer-dom';

it('Backspace removes a whole pill atomically and fires onEntityRemove', () => {
  const onEntityRemove = vi.fn();
  const onChange = vi.fn();
  const { container } = render(() => <Composer onEntityRemove={onEntityRemove} onChange={onChange} />);
  const el = editable(container);
  const skill = { kind: 'skill', id: 'rec', label: 'Record & Replay' };
  const pill = createEntityEl(document, skill);
  el.appendChild(pill);
  el.appendChild(document.createTextNode(ZWSP));
  // place caret right after the ZWSP (end of content)
  const range = document.createRange();
  range.selectNodeContents(el); range.collapse(false);
  const sel = window.getSelection()!; sel.removeAllRanges(); sel.addRange(range);
  fireEvent.keyDown(el, { key: 'Backspace' });
  expect(onEntityRemove).toHaveBeenCalledWith(skill);
  expect(el.querySelector('[data-kai-entity]')).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails** — FAIL.
- [ ] **Step 3: Write minimal implementation** — in `handleKeyDown`, before the Enter branch, handle Backspace/Delete: compute the node immediately before the caret (skipping an empty/ZWSP text node); if it is (or ends adjacent to) an entity el, `e.preventDefault()`, remove the pill (and its trailing ZWSP text node), fire `onEntityRemove(stored)`, then `handleInput()`. Add a private `insertEntity(entity)` that, at the current selection, deletes the active trigger token range if provided and inserts `createEntityEl(...)` + a `ZWSP` text node, moves the caret after it, fires `onEntityAdd`, then `handleInput()`. Use `window.getSelection()` for ranges.
- [ ] **Step 4: Run test to verify it passes** — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(composer): atomic pill insertion + backspace deletion"`

---

### Task 7: Trigger menu (caret-anchored, prop-driven + events)

**Files:**
- Modify: `src/components/composer.tsx`
- Test: `src/components/composer.stories.tsx` (Task 9 covers the browser interaction; here add a jsdom unit test for the trigger-state computation)

**Interfaces:**
- Consumes: `detectTrigger` (Task 3), `usePosition`/`useDismiss`/`createPresence` from `../ui/overlay`, `TriggerDef`/`TriggerItem`.
- Behavior: on `input` and selection change, read caret offset in the editable's *text* and call `detectTrigger(text, caret, triggerChars)`. When active, compute the caret client rect (via `range.getClientRects()` / a temporary range at the caret) and fire `onTrigger({char, query, rect})`; if the matching `TriggerDef.items` exist, render a floating menu anchored at the caret rect (virtual reference element built from the rect) filtered by `query`. Selecting an item calls `insertEntity({kind: def.kind, id, label, icon, promptText, data}, {replaceFrom: trigger.start})`. Escape/space/outside closes and fires `onTriggerClose`.

- [ ] **Step 1: Write the failing test** — unit-test the pure trigger-state reducer extracted as `activeTriggerFor(text, caret, defs)` returning `{ def, query, start } | null`:

```ts
// in src/primitives/composer-triggers.ts (extend) + test in composer-triggers.test.ts
import { activeTriggerFor } from './composer-triggers';
it('activeTriggerFor matches a defined trigger and returns its def + query', () => {
  const defs = [{ char: '/', kind: 'skill' }, { char: '@', kind: 'mention' }];
  expect(activeTriggerFor('/re', 3, defs)).toEqual({ def: defs[0], query: 're', start: 0 });
  expect(activeTriggerFor('hi', 2, defs)).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails** — FAIL.
- [ ] **Step 3: Write minimal implementation** — add `activeTriggerFor(text, caret, defs)` to `composer-triggers.ts` (wraps `detectTrigger` with the defs' chars, returns the matching def). Then wire the floating menu into `Composer` using `usePosition` with a virtual reference (`{ getBoundingClientRect: () => caretRect }`) and `useDismiss`; render filtered `def.items` as a keyboard-navigable list (Arrow/Enter/Escape), reusing existing list styles. Fire `onTrigger`/`onTriggerClose`.
- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/primitives/composer-triggers.test.ts` → PASS (menu interaction proven in Task 9 browser tests).
- [ ] **Step 5: Commit** — `git commit -am "feat(composer): caret-anchored trigger menu + activeTriggerFor"`

---

### Task 8: Keyword highlighting (CSS Custom Highlight API, decoration-only)

**Files:**
- Modify: `src/components/composer.tsx`
- Create: `src/components/composer-highlight.ts` (pure range-finding) + `src/components/composer-highlight.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface HighlightMatch { start: number; end: number; class?: string; }
  export function findHighlightMatches(text: string, rules: HighlightRule[]): HighlightMatch[];
  ```
- `findHighlightMatches`: for each rule (string → literal, case-insensitive, word-ish; object → `new RegExp(pattern, flags ?? 'gi')`), collect non-overlapping `{start,end,class}` ranges over `text`. The view applies them via `CSS.highlights.set('kai-composer', new Highlight(...ranges))` over text-node ranges when `CSS?.highlights` exists; otherwise it no-ops (cosmetic only).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { findHighlightMatches } from './composer-highlight';

describe('findHighlightMatches', () => {
  it('finds literal keyword ranges (case-insensitive)', () => {
    expect(findHighlightMatches('Deploy the deploy now', ['deploy'])).toEqual([
      { start: 0, end: 6, class: undefined },
      { start: 11, end: 17, class: undefined },
    ]);
  });
  it('supports regex rules with a class', () => {
    expect(findHighlightMatches('id-123 ok', [{ pattern: 'id-\\d+', class: 'tok' }])).toEqual([
      { start: 0, end: 6, class: 'tok' },
    ]);
  });
  it('returns [] when nothing matches', () => {
    expect(findHighlightMatches('nothing', ['zzz'])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — FAIL.
- [ ] **Step 3: Write minimal implementation** — implement `findHighlightMatches` (escape literal strings, build regexes, scan with `matchAll`, dedupe overlaps by earliest-start). In `Composer`, after each input, compute matches over the editable's text content and, if `typeof CSS !== 'undefined' && CSS.highlights`, map offsets → `Range`s across text nodes and register a `Highlight`. Feature-detect; no-op otherwise.
- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/components/composer-highlight.test.ts` → PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(composer): decoration-only keyword highlighting"`

---

### Task 9: Solid `Composer` stories (browser interaction tests)

**Files:**
- Create: `src/components/composer.stories.tsx`

**Interfaces:**
- Consumes: `Composer`, `TriggerDef`. Stories double as Playwright browser tests via `storybookTest`.

- [ ] **Step 1: Write the story file** with `Playground`, `WithSkills` (a `/` trigger with items incl. an `icon`), `WithMentions` (`@`), `Prefilled` (a `value` doc containing a skill pill + text, matching the reference image), and `Highlighted`. Add `play()` functions asserting: typing `/` opens the menu, selecting inserts a pill, Backspace deletes it, and the `onSubmit` payload (captured via an `args` spy `fn()`) has the expected `{doc,text,entities}`.
- [ ] **Step 2: Run the stories as tests** — `npm run test:storybook -- --project=storybook src/components/composer.stories.tsx` (or `npx vitest run --project=storybook`). Expected: PASS (incl. axe a11y).
- [ ] **Step 3: Fix any a11y or interaction failures** until green.
- [ ] **Step 4: Commit** — `git add src/components/composer.stories.tsx && git commit -m "test(composer): Solid stories + browser interaction tests"`

---

### Task 10: `kai-composer` element + registration

**Files:**
- Create: `src/elements/composer.tsx`
- Create: `src/elements/composer.test.tsx`
- Modify: `src/elements/register-impl.ts`

**Interfaces:**
- Consumes: `defineWebComponent`, `WebComponentContext` (`src/elements/define`); `Composer`, `ComposerProps`, `TriggerDef`, `ComposerChange` (`../components/composer`).
- Produces: registers `kai-composer`; exports a pure `parseKaiTriggerItemElement(n: Element, char: string, kind: string): TriggerItem` for declarative `<kai-trigger-item>` children (unit-tested like `parseKaiSlashCommandElement`).
- Element props: `value` (string|doc), `placeholder`, `disabled`, `loading`, `maxHeight`, `submitOnEnter`, `triggers`, `highlights`.
- Element events:
  ```ts
  'kai-submit': { doc: ComposerDoc; text: string; entities: EntityRef[] };
  'kai-value-change': { doc: ComposerDoc; text: string; entities: EntityRef[] };
  'kai-entity-add': { entity: EntityRef };
  'kai-entity-remove': { entity: EntityRef };
  'kai-trigger': { char: string; query: string; rect: DOMRect };
  'kai-trigger-close': Record<string, never>;
  ```

- [ ] **Step 1: Write the failing test** (pure helper, mirrors `prompt-input-slash-command.test.tsx`)

```tsx
import { describe, it, expect } from 'vitest';
import { parseKaiTriggerItemElement } from './composer';

it('maps id/label/icon attrs + textContent', () => {
  const el = document.createElement('kai-trigger-item');
  el.setAttribute('item-id', 'rec');
  el.setAttribute('icon', '/rec.png');
  el.textContent = 'Record & Replay';
  expect(parseKaiTriggerItemElement(el, '/', 'skill')).toEqual({
    id: 'rec', label: 'Record & Replay', icon: '/rec.png', promptText: undefined, data: undefined,
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/elements/composer.test.tsx` → FAIL.
- [ ] **Step 3: Write minimal implementation** — implement `parseKaiTriggerItemElement` + the `defineWebComponent<Props, Events>('kai-composer', defaults, facade)`. Facade: `const [internal, setInternal] = createSignal(props.value)`, controlled fallback, maps `onChange → dispatch('kai-value-change', change)`, `onSubmit → dispatch('kai-submit', change)`, `onEntityAdd/Remove`, `onTrigger/onTriggerClose`. Use `flag('disabled')`/`flag('loading')`/`flag('submitOnEnter')`. Then in `register-impl.ts` add `import './composer';` alongside the other element imports.
- [ ] **Step 4: Run test to verify it passes** — PASS. Also `npm run typecheck`.
- [ ] **Step 5: Commit** — `git add src/elements/composer.* src/elements/register-impl.ts && git commit -m "feat(composer): kai-composer element + registration"`

---

### Task 11: `kai-composer` element stories (browser tests)

**Files:**
- Create: `src/elements/composer.stories.tsx`

**Interfaces:**
- Consumes: the registered `kai-composer` element (import `'./composer'` or `'../elements/register'`). Mirror the `kai-prompt-input` element story pattern (module augmentation for `JSX.IntrinsicElements['kai-composer']`, `onMount` + `ref` to set object props and add event listeners).

- [ ] **Step 1: Write the story file** — `Default`, `Skills` (set `el.triggers = [{char:'/', kind:'skill', items:[{id:'rec', label:'Record & Replay', icon: <data-uri>}]}]`), `Mentions`, `Prefilled` (set `el.value = [{type:'entity',entity:{...}},{type:'text',text:" I'm going to show y"}]` — the reference image), `Highlighted`. Each logs/captures `kai-submit`. Add a `play()` on `Skills` asserting `/` → select → pill present and `kai-submit.detail.doc` contains the entity.
- [ ] **Step 2: Run stories as tests** — `npx vitest run --project=storybook src/elements/composer.stories.tsx`. Expected PASS (+ axe).
- [ ] **Step 3: Fix failures** until green.
- [ ] **Step 4: Commit** — `git add src/elements/composer.stories.tsx && git commit -m "test(composer): kai-composer element stories"`

---

### Task 12: IVP — Playwright proof (screenshot + payload)

**Files:**
- Create: `tests/e2e/composer-ivp.spec.ts`

**Interfaces:**
- Standalone Playwright spec (`npm run test:e2e`), NOT a vitest test (excluded in `vitest.config.ts`). Loads a Storybook story (or a minimal page) with `kai-composer`, drives it, and asserts.

- [ ] **Step 1: Write the spec** — navigate to the built/served `Prefilled` + `Skills` stories; (a) assert a pill renders with icon + label inline (`[data-kai-entity]` visible, text matches the reference), screenshot to `tests/e2e/__screenshots__/composer-prefilled.png`; (b) type `/`, select a skill, press Backspace, assert atomic removal; (c) type text + submit, capture the `kai-submit` event detail via `page.evaluate` + an injected listener, and assert `detail.doc` shape + `detail.text`.
- [ ] **Step 2: Run it** — `npm run test:e2e -- composer-ivp` (start Storybook/preview as the existing e2e setup requires). Expected PASS.
- [ ] **Step 3: Eyeball the screenshot** against the reference image (icon + label reads inline, like `Record & Replay I'm going to show y…`).
- [ ] **Step 4: Commit** — `git add tests/e2e/composer-ivp.spec.ts && git commit -m "test(composer): IVP Playwright proof (screenshot + payload)"`

---

## Final verification (before declaring done)

- [ ] `npm test` (jsdom unit + storybook browser) — all green.
- [ ] `npm run typecheck` — clean (Solid src + Node MCP passes unaffected).
- [ ] `npm run build` then `git checkout -- src/components/component-meta.json`.
- [ ] IVP screenshot reviewed against the reference image.
- [ ] Update `docs/notes.md` (or the spec status) noting the prototype is built + how to demo it in Storybook.

## Self-Review notes

- **Spec coverage:** auto-grow (Task 5) · Enter/Shift-Enter + change/submit events (Task 5) · atomic pills, multiple skills (Tasks 4,6) · `/` and `@` + caret menu + caret rect (Tasks 3,7) · keyword highlighting decoration-only (Task 8) · structured `{doc,text,entities}` emit (Tasks 2,5,10) · value as string|doc (Tasks 1,5,10) · extensible trigger registry (Task 7) · web-component (Task 10) · TDD + Storybook + IVP (Tasks 1–12). React wrapper intentionally omitted (out of v1 scope).
- **Type consistency:** `ComposerChange = {doc,text,entities}` used identically in Composer (Task 5) and the element events (Task 10); `EntityRef`/`Segment`/`ComposerDoc` defined once (Task 1); `TriggerDef`/`TriggerItem` defined in Task 5, reused in 7/10; `detectTrigger`/`activeTriggerFor` in Tasks 3/7.
- **No placeholders:** pure-module tasks (1–4,8) carry complete code; view/menu/element tasks (5–7,9–11) carry complete interfaces + the full skeleton + concrete test assertions, with DOM-event specifics to be filled against the real codebase (selection/Range APIs) — acceptable since those require live DOM the executing agent will read.
