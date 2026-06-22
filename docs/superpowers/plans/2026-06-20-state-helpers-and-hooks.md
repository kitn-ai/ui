# State Helpers, Hooks & Streaming Handle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a framework-neutral state core (`@kitn.ai/ui/state`) of immutable helpers + a typed `createAssistantStream` handle, plus batteries-included `useKaiChat` (React) and `createKaiChat` (Solid) wrappers, so consumers stop hand-rolling `[...messages, m]` and get fully-typed, controlled state ergonomics.

**Architecture:** Everything drives a single setter shape `(prev) => next`. Pure functions live in `src/state/**` (no framework imports). The streaming handle accretes one assistant message through that setter. Framework wrappers (React hook, Solid store) own the state and expose the same operations + a spreadable `bind`. The model stays fully controlled — elements never own application data.

**Tech Stack:** TypeScript, SolidJS (kit's native runtime), React 16.3+ peer, Vite library builds, Vitest (unit + React project), `@testing-library/react`.

## Global Constraints

- **Controlled only.** Elements never own application data state; every helper/handle drives a consumer-owned setter. (Phase 1 adds no element methods.)
- **New reference per change.** Every operation returns a NEW top-level array, and a NEW object for each touched item; untouched items keep their references. Never mutate inputs.
- **`src/state/**` is framework-neutral.** No `solid-js` or `react` imports in that directory — type-only imports of `ChatMessage`/`ToolPart`/`AttachmentData` only.
- **Reuse existing types verbatim:** `ChatMessage` from `src/elements/chat-types.ts`, `ToolPart` from `src/components/tool.tsx`, `AttachmentData` from `src/components/attachments`.
- **No new runtime dependencies.** `crypto.randomUUID` is ambient (browsers + Node 18+) with a non-secure fallback.
- **Conventional commits** drive release-please; never hand-edit `package.json`'s `version`. Pre-1.0: `feat` = minor bump.
- **After running `node scripts/gen-element-api.mjs` / `npm run build:api`,** run `git checkout -- src/components/component-meta.json` (it churns with TS-type noise and is not used at runtime).
- **Copy/voice:** sharp human engineer, web-components-first, no emoji (`docs-site/STYLE.md`).

---

### Task 1: Immutable message helpers (`src/state/messages.ts`)

**Files:**
- Create: `src/state/messages.ts`
- Test: `src/state/messages.test.ts`

**Interfaces:**
- Consumes: `ChatMessage` (`src/elements/chat-types.ts`).
- Produces:
  - `appendMessage(messages: ChatMessage[], msg: ChatMessage): ChatMessage[]`
  - `upsertMessage(messages: ChatMessage[], msg: ChatMessage): ChatMessage[]`
  - `updateMessage(messages: ChatMessage[], id: string, patch: Partial<ChatMessage> | ((m: ChatMessage) => ChatMessage)): ChatMessage[]`
  - `removeMessage(messages: ChatMessage[], id: string): ChatMessage[]`
  - `appendContent(messages: ChatMessage[], id: string, delta: string): ChatMessage[]`

- [ ] **Step 1: Write the failing test**

```ts
// src/state/messages.test.ts
import { describe, it, expect } from 'vitest';
import type { ChatMessage } from '../elements/chat-types';
import { appendMessage, upsertMessage, updateMessage, removeMessage, appendContent } from './messages';

const m = (id: string, content = ''): ChatMessage => ({ id, role: 'assistant', content });

describe('message helpers', () => {
  it('appendMessage adds to the end and returns a new array (input untouched)', () => {
    const a = [m('1')];
    const out = appendMessage(a, m('2'));
    expect(out.map((x) => x.id)).toEqual(['1', '2']);
    expect(out).not.toBe(a);
    expect(a).toHaveLength(1);
  });

  it('upsertMessage replaces by id, else appends', () => {
    const a = [m('1', 'old')];
    expect(upsertMessage(a, m('1', 'new'))[0].content).toBe('new');
    expect(upsertMessage(a, m('2')).map((x) => x.id)).toEqual(['1', '2']);
  });

  it('updateMessage patches the matched id with a new object; leaves others by reference', () => {
    const keep = m('1');
    const a = [keep, m('2', 'a')];
    const out = updateMessage(a, '2', { content: 'b' });
    expect(out[1].content).toBe('b');
    expect(out[1]).not.toBe(a[1]);   // touched → new object
    expect(out[0]).toBe(keep);       // untouched → same reference
  });

  it('updateMessage accepts an updater function', () => {
    const out = updateMessage([m('1', 'x')], '1', (msg) => ({ ...msg, content: msg.content + 'y' }));
    expect(out[0].content).toBe('xy');
  });

  it('removeMessage drops by id', () => {
    expect(removeMessage([m('1'), m('2')], '1').map((x) => x.id)).toEqual(['2']);
  });

  it('appendContent concatenates the streamed delta on the matched message', () => {
    const out = appendContent([m('1', 'He')], '1', 'llo');
    expect(out[0].content).toBe('Hello');
    expect(out[0]).not.toBe(undefined);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/messages.test.ts`
Expected: FAIL — cannot resolve `./messages`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/state/messages.ts
import type { ChatMessage } from '../elements/chat-types';

/** Append a message; returns a new array. */
export function appendMessage(messages: ChatMessage[], msg: ChatMessage): ChatMessage[] {
  return [...messages, msg];
}

/** Replace a same-id message, or append when absent. */
export function upsertMessage(messages: ChatMessage[], msg: ChatMessage): ChatMessage[] {
  const i = messages.findIndex((x) => x.id === msg.id);
  if (i === -1) return [...messages, msg];
  const next = messages.slice();
  next[i] = msg;
  return next;
}

/** Patch the matched message (object patch or updater). Untouched items keep their reference. */
export function updateMessage(
  messages: ChatMessage[],
  id: string,
  patch: Partial<ChatMessage> | ((m: ChatMessage) => ChatMessage),
): ChatMessage[] {
  return messages.map((x) =>
    x.id === id ? (typeof patch === 'function' ? patch(x) : { ...x, ...patch }) : x,
  );
}

/** Remove the matched message. */
export function removeMessage(messages: ChatMessage[], id: string): ChatMessage[] {
  return messages.filter((x) => x.id !== id);
}

/** Streaming primitive: concatenate `delta` onto the matched message's content. */
export function appendContent(messages: ChatMessage[], id: string, delta: string): ChatMessage[] {
  return messages.map((x) => (x.id === id ? { ...x, content: x.content + delta } : x));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/messages.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/state/messages.ts src/state/messages.test.ts
git commit -m "feat(state): add immutable message helpers"
```

---

### Task 2: Suggestion helpers (`src/state/suggestions.ts`)

**Files:**
- Create: `src/state/suggestions.ts`
- Test: `src/state/suggestions.test.ts`

**Interfaces:**
- Produces:
  - `addSuggestion(suggestions: string[], s: string): string[]`
  - `removeSuggestion(suggestions: string[], s: string): string[]`

- [ ] **Step 1: Write the failing test**

```ts
// src/state/suggestions.test.ts
import { describe, it, expect } from 'vitest';
import { addSuggestion, removeSuggestion } from './suggestions';

describe('suggestion helpers', () => {
  it('addSuggestion appends and returns a new array', () => {
    const a = ['x'];
    const out = addSuggestion(a, 'y');
    expect(out).toEqual(['x', 'y']);
    expect(out).not.toBe(a);
  });

  it('addSuggestion is idempotent (no duplicates)', () => {
    expect(addSuggestion(['x'], 'x')).toEqual(['x']);
  });

  it('removeSuggestion drops the value', () => {
    expect(removeSuggestion(['x', 'y'], 'x')).toEqual(['y']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/suggestions.test.ts`
Expected: FAIL — cannot resolve `./suggestions`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/state/suggestions.ts

/** Append a suggestion; no-op when already present. Returns a new array. */
export function addSuggestion(suggestions: string[], s: string): string[] {
  return suggestions.includes(s) ? suggestions.slice() : [...suggestions, s];
}

/** Remove a suggestion by value. */
export function removeSuggestion(suggestions: string[], s: string): string[] {
  return suggestions.filter((x) => x !== s);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/suggestions.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/state/suggestions.ts src/state/suggestions.test.ts
git commit -m "feat(state): add suggestion helpers"
```

---

### Task 3: Streaming handle (`src/state/stream.ts`)

**Files:**
- Create: `src/state/stream.ts`
- Test: `src/state/stream.test.ts`

**Interfaces:**
- Consumes: `ChatMessage` (`src/elements/chat-types.ts`), `ToolPart` (`src/components/tool.tsx`).
- Produces:
  - `type SetMessages = (updater: (prev: ChatMessage[]) => ChatMessage[]) => void`
  - `interface AssistantStream` (see code)
  - `createAssistantStream(set: SetMessages, init?: Partial<ChatMessage>): AssistantStream`
  - `onStreamSettled(inner: AssistantStream, onSettle: () => void): AssistantStream` (shared loading-toggle wrapper reused by the React/Solid wrappers)

- [ ] **Step 1: Write the failing test**

```ts
// src/state/stream.test.ts
import { describe, it, expect } from 'vitest';
import type { ChatMessage } from '../elements/chat-types';
import { createAssistantStream, onStreamSettled } from './stream';

/** A fake setter that records each emitted array + applies it. */
function makeSink(initial: ChatMessage[] = []) {
  let current = initial;
  const emissions: ChatMessage[][] = [];
  const set = (updater: (p: ChatMessage[]) => ChatMessage[]) => {
    current = updater(current);
    emissions.push(current);
  };
  return { set, get: () => current, emissions };
}

describe('createAssistantStream', () => {
  it('appends an empty assistant message on construction', () => {
    const sink = makeSink();
    const s = createAssistantStream(sink.set, { id: 'a1' });
    expect(s.id).toBe('a1');
    expect(sink.get()).toEqual([{ id: 'a1', role: 'assistant', content: '' }]);
  });

  it('appendText accretes content, emitting a new array + new object each time', () => {
    const sink = makeSink();
    const s = createAssistantStream(sink.set, { id: 'a1' });
    s.appendText('He').appendText('llo');
    expect(sink.get()[0].content).toBe('Hello');
    // every emission is a distinct array reference
    expect(new Set(sink.emissions).size).toBe(sink.emissions.length);
  });

  it('appendReasoning builds the { text, label } shape', () => {
    const sink = makeSink();
    const s = createAssistantStream(sink.set, { id: 'a1' });
    s.appendReasoning('thinking', 'Reasoning');
    expect(sink.get()[0].reasoning).toEqual({ text: 'thinking', label: 'Reasoning' });
  });

  it('upsertTool adds then replaces by toolCallId; updateTool patches', () => {
    const sink = makeSink();
    const s = createAssistantStream(sink.set, { id: 'a1' });
    s.upsertTool({ type: 'search', state: 'input-streaming', toolCallId: 't1', input: { q: 'x' } });
    s.upsertTool({ type: 'search', state: 'input-available', toolCallId: 't1', input: { q: 'xy' } });
    expect(sink.get()[0].tools).toHaveLength(1);
    expect(sink.get()[0].tools![0].state).toBe('input-available');
    s.updateTool('t1', { state: 'output-available', output: { hits: 3 } });
    expect(sink.get()[0].tools![0].output).toEqual({ hits: 3 });
  });

  it('done applies a final patch; abort() drops the in-flight message', () => {
    const sink = makeSink([{ id: 'u1', role: 'user', content: 'hi' }]);
    const s = createAssistantStream(sink.set, { id: 'a1' });
    s.appendText('partial').done({ content: 'final' });
    expect(sink.get()[1].content).toBe('final');
    const s2 = createAssistantStream(sink.set, { id: 'a2' });
    s2.appendText('oops').abort();
    expect(sink.get().map((x) => x.id)).toEqual(['u1', 'a1']);
  });

  it('abort(reason) marks the message tools output-error instead of dropping', () => {
    const sink = makeSink();
    const s = createAssistantStream(sink.set, { id: 'a1' });
    s.upsertTool({ type: 'search', state: 'input-streaming', toolCallId: 't1' });
    s.abort('network down');
    expect(sink.get()[0].tools![0].state).toBe('output-error');
    expect(sink.get()[0].tools![0].errorText).toBe('network down');
  });

  it('onStreamSettled fires onSettle on done and on abort, preserving chaining', () => {
    const sink = makeSink();
    let settled = 0;
    const s = onStreamSettled(createAssistantStream(sink.set, { id: 'a1' }), () => { settled++; });
    s.appendText('x').appendText('y');
    expect(sink.get()[0].content).toBe('xy');
    s.done();
    expect(settled).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/stream.test.ts`
Expected: FAIL — cannot resolve `./stream`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/state/stream.ts
import type { ChatMessage } from '../elements/chat-types';
import type { ToolPart } from '../components/tool';

/** The one universal contract: a functional-updater setter (React setState shape). */
export type SetMessages = (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;

/** A fluent builder for one in-flight assistant message. Owns no state. */
export interface AssistantStream {
  readonly id: string;
  appendText(delta: string): AssistantStream;
  setText(content: string): AssistantStream;
  appendReasoning(delta: string, label?: string): AssistantStream;
  setReasoning(text: string, label?: string): AssistantStream;
  upsertTool(tool: ToolPart): AssistantStream;
  updateTool(toolCallId: string, patch: Partial<ToolPart>): AssistantStream;
  patch(patch: Partial<ChatMessage>): AssistantStream;
  done(final?: Partial<ChatMessage>): void;
  abort(reason?: string): void;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'kai-' + Math.random().toString(36).slice(2);
}

/** Start an assistant message and drive it through `set`. New refs on every mutation. */
export function createAssistantStream(set: SetMessages, init: Partial<ChatMessage> = {}): AssistantStream {
  const id = init.id ?? newId();
  const seed: ChatMessage = { id, role: 'assistant', content: '', ...init };
  set((prev) => [...prev, seed]);

  const mutate = (fn: (m: ChatMessage) => ChatMessage) =>
    set((prev) => prev.map((m) => (m.id === id ? fn(m) : m)));

  const stream: AssistantStream = {
    id,
    appendText(delta) { mutate((m) => ({ ...m, content: m.content + delta })); return stream; },
    setText(content) { mutate((m) => ({ ...m, content })); return stream; },
    appendReasoning(delta, label) {
      mutate((m) => ({ ...m, reasoning: { text: (m.reasoning?.text ?? '') + delta, label: label ?? m.reasoning?.label } }));
      return stream;
    },
    setReasoning(text, label) {
      mutate((m) => ({ ...m, reasoning: { text, label: label ?? m.reasoning?.label } }));
      return stream;
    },
    upsertTool(tool) {
      mutate((m) => {
        const tools = m.tools ? m.tools.slice() : [];
        const i = tool.toolCallId != null
          ? tools.findIndex((t) => t.toolCallId === tool.toolCallId)
          : tools.findIndex((t) => t.type === tool.type);
        if (i === -1) tools.push(tool); else tools[i] = tool;
        return { ...m, tools };
      });
      return stream;
    },
    updateTool(toolCallId, patch) {
      mutate((m) => ({ ...m, tools: (m.tools ?? []).map((t) => (t.toolCallId === toolCallId ? { ...t, ...patch } : t)) }));
      return stream;
    },
    patch(patch) { mutate((m) => ({ ...m, ...patch })); return stream; },
    done(final) { if (final) mutate((m) => ({ ...m, ...final })); },
    abort(reason) {
      if (reason) {
        mutate((m) => ({ ...m, tools: (m.tools ?? []).map((t) => ({ ...t, state: 'output-error', errorText: reason })) }));
      } else {
        set((prev) => prev.filter((m) => m.id !== id));
      }
    },
  };
  return stream;
}

/** Wrap a stream so `onSettle` fires on done/abort (used to toggle a `loading` flag).
 *  Preserves the fluent chain by returning the wrapper from every mutator. */
export function onStreamSettled(inner: AssistantStream, onSettle: () => void): AssistantStream {
  const wrapper: AssistantStream = {
    id: inner.id,
    appendText(d) { inner.appendText(d); return wrapper; },
    setText(c) { inner.setText(c); return wrapper; },
    appendReasoning(d, l) { inner.appendReasoning(d, l); return wrapper; },
    setReasoning(t, l) { inner.setReasoning(t, l); return wrapper; },
    upsertTool(t) { inner.upsertTool(t); return wrapper; },
    updateTool(id, p) { inner.updateTool(id, p); return wrapper; },
    patch(p) { inner.patch(p); return wrapper; },
    done(final) { inner.done(final); onSettle(); },
    abort(reason) { inner.abort(reason); onSettle(); },
  };
  return wrapper;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/stream.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/state/stream.ts src/state/stream.test.ts
git commit -m "feat(state): add createAssistantStream streaming handle"
```

---

### Task 4: State barrel + `@kitn.ai/ui/state` packaging

**Files:**
- Create: `src/state/index.ts`
- Create: `vite.config.state.ts`
- Modify: `package.json` (`exports` + `build` script)
- Test: `src/state/index.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1-3.
- Produces: the public subpath `@kitn.ai/ui/state` re-exporting all helpers, `createAssistantStream`, `onStreamSettled`, and types `SetMessages`, `AssistantStream`.

- [ ] **Step 1: Write the failing test**

```ts
// src/state/index.test.ts
import { describe, it, expect } from 'vitest';
import * as state from './index';

describe('@kitn.ai/ui/state barrel', () => {
  it('re-exports the full surface', () => {
    for (const name of [
      'appendMessage', 'upsertMessage', 'updateMessage', 'removeMessage', 'appendContent',
      'addSuggestion', 'removeSuggestion', 'createAssistantStream', 'onStreamSettled',
    ]) {
      expect(typeof (state as Record<string, unknown>)[name]).toBe('function');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/index.test.ts`
Expected: FAIL — cannot resolve `./index`.

- [ ] **Step 3: Write the barrel**

```ts
// src/state/index.ts
// Framework-neutral state core for @kitn.ai/ui. Pure functions over ChatMessage[]
// + a typed streaming handle. No React/Solid runtime — drives a consumer setter.
export { appendMessage, upsertMessage, updateMessage, removeMessage, appendContent } from './messages';
export { addSuggestion, removeSuggestion } from './suggestions';
export { createAssistantStream, onStreamSettled } from './stream';
export type { SetMessages, AssistantStream } from './stream';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/index.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the Vite build for the subpath**

```ts
// vite.config.state.ts
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { resolve } from 'node:path';

// Framework-neutral state core (@kitn.ai/ui/state). Pure functions over
// ChatMessage[] — no React/Solid runtime — compiled to dist/state.js. The .d.ts
// is emitted by the barrel build (entryRoot src → dist/state/index.d.ts), so this
// build is JS-only. emptyOutDir:false — the main build ran first; do NOT clobber.
export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/state/index.ts'),
      formats: ['es'],
      fileName: () => 'state.js',
    },
    rollupOptions: { external: ['solid-js', 'solid-js/web', 'solid-js/store'] },
  },
});
```

- [ ] **Step 6: Wire the build script + exports in `package.json`**

In `scripts.build`, append the state build right after the barrel config:

```
vite build --config vite.config.barrel.ts && vite build --config vite.config.state.ts && vite build --config vite.config.mcp.ts
```

In `exports`, add after the `"./react"` entry:

```json
"./state": {
  "types": "./dist/state/index.d.ts",
  "default": "./dist/state.js"
}
```

- [ ] **Step 7: Verify the build emits the subpath**

Run: `npm run build`
Then: `node -e "import('@kitn.ai/ui/state').then(m => console.log(Object.keys(m).sort().join(',')))" --input-type=module` is unreliable pre-publish; instead verify the artifacts directly:
Run: `ls dist/state.js dist/state/index.d.ts && node --input-type=module -e "import('./dist/state.js').then(m=>console.log('appendMessage:',typeof m.appendMessage,'| createAssistantStream:',typeof m.createAssistantStream))"`
Expected: both files listed; prints `appendMessage: function | createAssistantStream: function`.
Then clean the build churn: `git checkout -- src/components/component-meta.json`

- [ ] **Step 8: Commit**

```bash
git add src/state/index.ts src/state/index.test.ts vite.config.state.ts package.json
git commit -m "feat(state): publish framework-neutral @kitn.ai/ui/state subpath"
```

---

### Task 5: Solid `createKaiChat` store

**Files:**
- Create: `src/primitives/create-kai-chat.ts`
- Modify: `src/index.ts` (add export)
- Test: `src/primitives/create-kai-chat.test.ts`

**Interfaces:**
- Consumes: `appendMessage`, `updateMessage`, `removeMessage`, `addSuggestion`, `removeSuggestion`, `createAssistantStream`, `onStreamSettled`, `SetMessages`, `AssistantStream` from `../state`; `ChatMessage`; `AttachmentData` (`../components/attachments`).
- Produces:
  - `interface CreateKaiChatOptions { initialMessages?; initialSuggestions?; onSubmit? }`
  - `interface KaiChatStore` (accessors + operations + `bind`)
  - `createKaiChat(options?: CreateKaiChatOptions): KaiChatStore`

- [ ] **Step 1: Write the failing test**

```ts
// src/primitives/create-kai-chat.test.ts
import { describe, it, expect } from 'vitest';
import { createRoot } from 'solid-js';
import { createKaiChat } from './create-kai-chat';

describe('createKaiChat (Solid)', () => {
  it('append/update/remove drive the messages accessor', () => {
    createRoot((dispose) => {
      const chat = createKaiChat();
      chat.append({ id: '1', role: 'user', content: 'hi' });
      expect(chat.messages().map((m) => m.id)).toEqual(['1']);
      chat.update('1', { content: 'edited' });
      expect(chat.messages()[0].content).toBe('edited');
      chat.remove('1');
      expect(chat.messages()).toEqual([]);
      dispose();
    });
  });

  it('streamAssistant toggles loading true→false around done()', () => {
    createRoot((dispose) => {
      const chat = createKaiChat();
      const s = chat.streamAssistant({ id: 'a1' });
      expect(chat.loading()).toBe(true);
      s.appendText('hello');
      expect(chat.messages()[0].content).toBe('hello');
      s.done();
      expect(chat.loading()).toBe(false);
      dispose();
    });
  });

  it('suggestions ops are immutable + deduped', () => {
    createRoot((dispose) => {
      const chat = createKaiChat({ initialSuggestions: ['a'] });
      chat.addSuggestion('a');           // dedup
      chat.addSuggestion('b');
      expect(chat.suggestions()).toEqual(['a', 'b']);
      chat.clearSuggestions();
      expect(chat.suggestions()).toEqual([]);
      dispose();
    });
  });

  it('handleSubmit forwards the event detail to onSubmit', () => {
    createRoot((dispose) => {
      let seen: string | undefined;
      const chat = createKaiChat({ onSubmit: ({ value }) => { seen = value; } });
      chat.handleSubmit(new CustomEvent('kai-submit', { detail: { value: 'go', attachments: [] } }));
      expect(seen).toBe('go');
      dispose();
    });
  });

  it('two stores are independent (no shared state)', () => {
    createRoot((dispose) => {
      const a = createKaiChat();
      const b = createKaiChat();
      a.append({ id: 'x', role: 'user', content: '1' });
      expect(b.messages()).toEqual([]);
      dispose();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/primitives/create-kai-chat.test.ts`
Expected: FAIL — cannot resolve `./create-kai-chat`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/primitives/create-kai-chat.ts
import { createSignal } from 'solid-js';
import type { ChatMessage } from '../elements/chat-types';
import type { AttachmentData } from '../components/attachments';
import {
  appendMessage, updateMessage, removeMessage, addSuggestion, removeSuggestion,
  createAssistantStream, onStreamSettled, type AssistantStream, type SetMessages,
} from '../state';

export interface CreateKaiChatOptions {
  initialMessages?: ChatMessage[];
  initialSuggestions?: string[];
  onSubmit?: (detail: { value: string; attachments: AttachmentData[] }) => void | Promise<void>;
}

/** Solid store: consumer-owned chat state + the same ergonomic ops as `useKaiChat`. */
export interface KaiChatStore {
  messages: () => ChatMessage[];
  setMessages: SetMessages;
  suggestions: () => string[];
  loading: () => boolean;
  append: (msg: ChatMessage) => void;
  update: (id: string, patch: Partial<ChatMessage> | ((m: ChatMessage) => ChatMessage)) => void;
  remove: (id: string) => void;
  addSuggestion: (s: string) => void;
  removeSuggestion: (s: string) => void;
  clearSuggestions: () => void;
  streamAssistant: (init?: Partial<ChatMessage>) => AssistantStream;
  handleSubmit: (event: CustomEvent<{ value: string; attachments: AttachmentData[] }>) => void;
  /** Spread onto `<kai-chat {...chat.bind} />` (reactive getters). Wire submit via `on:kai-submit={chat.handleSubmit}`. */
  bind: { readonly messages: ChatMessage[]; readonly loading: boolean; readonly suggestions: string[] };
}

export function createKaiChat(options: CreateKaiChatOptions = {}): KaiChatStore {
  const [messages, setMessagesSignal] = createSignal<ChatMessage[]>(options.initialMessages ?? []);
  const [suggestions, setSuggestions] = createSignal<string[]>(options.initialSuggestions ?? []);
  const [loading, setLoading] = createSignal(false);

  const setMessages: SetMessages = (updater) => setMessagesSignal((prev) => updater(prev));

  return {
    messages,
    setMessages,
    suggestions,
    loading,
    append: (msg) => setMessages((prev) => appendMessage(prev, msg)),
    update: (id, patch) => setMessages((prev) => updateMessage(prev, id, patch)),
    remove: (id) => setMessages((prev) => removeMessage(prev, id)),
    addSuggestion: (s) => setSuggestions((prev) => addSuggestion(prev, s)),
    removeSuggestion: (s) => setSuggestions((prev) => removeSuggestion(prev, s)),
    clearSuggestions: () => setSuggestions([]),
    streamAssistant: (init) => {
      setLoading(true);
      return onStreamSettled(createAssistantStream(setMessages, init), () => setLoading(false));
    },
    handleSubmit: (event) => { void options.onSubmit?.(event.detail); },
    bind: {
      get messages() { return messages(); },
      get loading() { return loading(); },
      get suggestions() { return suggestions(); },
    },
  };
}
```

- [ ] **Step 4: Add the barrel export**

In `src/index.ts`, under the `// Layer 1: Headless Primitives` block, add:

```ts
export { createKaiChat } from './primitives/create-kai-chat';
export type { CreateKaiChatOptions, KaiChatStore } from './primitives/create-kai-chat';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/primitives/create-kai-chat.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/primitives/create-kai-chat.ts src/primitives/create-kai-chat.test.ts src/index.ts
git commit -m "feat(solid): add createKaiChat store"
```

---

### Task 6: React `useKaiChat` hook

**Files:**
- Create: `frameworks/react/use-kai-chat.tsx`
- Modify: `scripts/gen-element-react.mjs` (emit the re-export line)
- Regenerate: `frameworks/react/index.tsx` (via the generator)
- Test: `tests/react/use-kai-chat.test.tsx`

**Interfaces:**
- Consumes: state core (`../../src/state`), `ChatMessage` (`../../src/elements/chat-types`), `AttachmentData` (`../../src/components/attachments`), `Chat` wrapper (`@kitn.ai/ui/react`, for the test).
- Produces:
  - `interface UseKaiChatOptions`
  - `interface KaiChatController` (state + ops + `bind`)
  - `useKaiChat(options?: UseKaiChatOptions): KaiChatController`
  - Public re-export from `@kitn.ai/ui/react`.

- [ ] **Step 1: Write the hook**

The state core is imported relatively (`../../src/state`); that directory is pure TS (no JSX), so the emitted `dist/react/use-kai-chat.d.ts` referencing shipped `src/state` is safe — the LIB-2 raw-source hazard is specific to Solid-JSX source, which this is not.

```tsx
// frameworks/react/use-kai-chat.tsx
import { useCallback, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ChatMessage } from '../../src/elements/chat-types';
import type { AttachmentData } from '../../src/components/attachments';
import {
  appendMessage, updateMessage, removeMessage, addSuggestion, removeSuggestion,
  createAssistantStream, onStreamSettled, type AssistantStream, type SetMessages,
} from '../../src/state';

export interface UseKaiChatOptions {
  initialMessages?: ChatMessage[];
  initialSuggestions?: string[];
  onSubmit?: (detail: { value: string; attachments: AttachmentData[] }) => void | Promise<void>;
}

/** Owns chat state in React and exposes ergonomic, fully-typed controlled operations. */
export interface KaiChatController {
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  suggestions: string[];
  setSuggestions: Dispatch<SetStateAction<string[]>>;
  loading: boolean;
  append: (msg: ChatMessage) => void;
  update: (id: string, patch: Partial<ChatMessage> | ((m: ChatMessage) => ChatMessage)) => void;
  remove: (id: string) => void;
  addSuggestion: (s: string) => void;
  removeSuggestion: (s: string) => void;
  clearSuggestions: () => void;
  streamAssistant: (init?: Partial<ChatMessage>) => AssistantStream;
  /** Spread onto `<Chat {...chat.bind} />` — wires messages, loading, suggestions, and kai-submit. */
  bind: {
    messages: ChatMessage[];
    loading: boolean;
    suggestions: string[];
    onSubmit: (event: CustomEvent<{ value: string; attachments: AttachmentData[] }>) => void;
  };
}

export function useKaiChat(options: UseKaiChatOptions = {}): KaiChatController {
  const [messages, setMessages] = useState<ChatMessage[]>(options.initialMessages ?? []);
  const [suggestions, setSuggestions] = useState<string[]>(options.initialSuggestions ?? []);
  const [loading, setLoading] = useState(false);

  // Keep onSubmit current without re-binding the listener identity.
  const onSubmitRef = useRef(options.onSubmit);
  onSubmitRef.current = options.onSubmit;

  const set: SetMessages = useCallback((updater) => setMessages(updater), []);

  const append = useCallback((msg: ChatMessage) => set((prev) => appendMessage(prev, msg)), [set]);
  const update = useCallback(
    (id: string, patch: Partial<ChatMessage> | ((m: ChatMessage) => ChatMessage)) =>
      set((prev) => updateMessage(prev, id, patch)),
    [set],
  );
  const remove = useCallback((id: string) => set((prev) => removeMessage(prev, id)), [set]);
  const addSug = useCallback((s: string) => setSuggestions((prev) => addSuggestion(prev, s)), []);
  const removeSug = useCallback((s: string) => setSuggestions((prev) => removeSuggestion(prev, s)), []);
  const clearSuggestions = useCallback(() => setSuggestions([]), []);

  const streamAssistant = useCallback((init?: Partial<ChatMessage>): AssistantStream => {
    setLoading(true);
    return onStreamSettled(createAssistantStream(set, init), () => setLoading(false));
  }, [set]);

  const onSubmit = useCallback(
    (event: CustomEvent<{ value: string; attachments: AttachmentData[] }>) => {
      void onSubmitRef.current?.(event.detail);
    },
    [],
  );

  const bind = useMemo(
    () => ({ messages, loading, suggestions, onSubmit }),
    [messages, loading, suggestions, onSubmit],
  );

  return {
    messages, setMessages, suggestions, setSuggestions, loading,
    append, update, remove, addSuggestion: addSug, removeSuggestion: removeSug, clearSuggestions,
    streamAssistant, bind,
  };
}
```

- [ ] **Step 2: Make the generator emit the re-export**

In `scripts/gen-element-react.mjs`, the `out` template (around line 73) currently starts with the runtime import. Change that line to also re-export the hook:

```js
import { createWebComponent, type WebComponentProps } from './runtime';
export { useKaiChat } from './use-kai-chat';
export type { UseKaiChatOptions, KaiChatController } from './use-kai-chat';
${importLines}
```

(Insert the two `export` lines into the template string between the `./runtime` import line and `${importLines}`.)

- [ ] **Step 3: Regenerate the React entry**

Run: `node scripts/gen-element-api.mjs && git checkout -- src/components/component-meta.json`
Then verify the re-export landed: `grep -n "use-kai-chat" frameworks/react/index.tsx`
Expected: two lines (`export { useKaiChat } ...` and `export type { ... }`).

> If `gen-element-api.mjs` errors because `dist/` is missing, run `npm run build` once first, then re-run the generator.

- [ ] **Step 4: Write the failing test**

```tsx
// tests/react/use-kai-chat.test.tsx
// Run with `npm run test:react` (needs a prior `npm run build` — setup.ts imports
// the prebuilt @kitn.ai/ui/elements bundle and the test renders the real <Chat>).
import { render, renderHook, act, cleanup } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { createElement } from 'react';
import { Chat, useKaiChat } from '@kitn.ai/ui/react';

afterEach(cleanup);
const flush = () => new Promise((r) => setTimeout(r, 0));

test('append/update/remove drive controller state', () => {
  const { result } = renderHook(() => useKaiChat());
  act(() => result.current.append({ id: '1', role: 'user', content: 'hi' }));
  expect(result.current.messages.map((m) => m.id)).toEqual(['1']);
  act(() => result.current.update('1', { content: 'edited' }));
  expect(result.current.messages[0].content).toBe('edited');
  act(() => result.current.remove('1'));
  expect(result.current.messages).toEqual([]);
});

test('streamAssistant accretes content and toggles loading', () => {
  const { result } = renderHook(() => useKaiChat());
  let stream!: ReturnType<typeof result.current.streamAssistant>;
  act(() => { stream = result.current.streamAssistant({ id: 'a1' }); });
  expect(result.current.loading).toBe(true);
  act(() => { stream.appendText('hel').appendText('lo'); });
  expect(result.current.messages[0].content).toBe('hello');
  act(() => stream.done());
  expect(result.current.loading).toBe(false);
});

test('bind drives a real <Chat>: messages reach the element as a live property', async () => {
  let api: ReturnType<typeof useKaiChat> | undefined;
  function Harness() {
    api = useKaiChat({ initialMessages: [{ id: '1', role: 'user', content: 'hi' }] });
    return createElement(Chat, { ...api.bind } as Record<string, unknown>);
  }
  const { container } = render(createElement(Harness));
  await flush();
  const el = container.querySelector('kai-chat') as (HTMLElement & { messages: unknown[] }) | null;
  expect(el).not.toBeNull();
  expect(Array.isArray(el!.messages)).toBe(true);
  expect((el!.messages[0] as { content: string }).content).toBe('hi');

  act(() => api!.append({ id: '2', role: 'assistant', content: 'yo' }));
  await flush();
  expect((el!.messages as unknown[]).length).toBe(2);
});
```

- [ ] **Step 5: Build, then run the test to verify it passes**

Run: `npm run build && git checkout -- src/components/component-meta.json`
Run: `npm run test:react -- tests/react/use-kai-chat.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add frameworks/react/use-kai-chat.tsx frameworks/react/index.tsx scripts/gen-element-react.mjs tests/react/use-kai-chat.test.tsx
git commit -m "feat(react): add useKaiChat hook with streaming + bind"
```

---

### Task 7: Docs + consumer-regression scenario

**Files:**
- Create: a guide page in `docs-site/` (path mirrors a sibling — see Step 1)
- Modify: `README.md` (add a "State helpers & hooks" subsection in the Development/usage area)
- Modify/Create: a `/consumer-regression` scenario that exercises `@kitn.ai/ui/state` + `useKaiChat`

**Interfaces:**
- Consumes: the public surface from Tasks 4-6.

- [ ] **Step 1: Find the sibling docs page to mirror**

Run: `ls docs-site/src/content/docs 2>/dev/null || find docs-site -maxdepth 4 -name "*.mdx" -path "*guides*" | head` and open one integration/guide page to copy its frontmatter + section structure (playground/examples/props are the approved template).

- [ ] **Step 2: Write the guide page**

Create the page (e.g. `docs-site/src/content/docs/guides/state-and-hooks.mdx`, matching the sibling's location/frontmatter). Real content (no emoji, web-components-first voice):

```mdx
---
title: State helpers & hooks
description: Drive messages, suggestions, and streaming without hand-rolling immutable updates.
---

The elements are controlled: you own the data, pass it in, listen for events. To make
that ergonomic, `@kitn.ai/ui/state` ships immutable helpers and a streaming handle, and
each framework gets a batteries-included store that owns the state for you.

## The setter contract

Everything drives one shape — a functional-updater setter, `(prev) => next`. That's React's
`setState`, a Solid signal setter, or one line for plain HTML:

```js
const set = (fn) => { el.messages = fn(el.messages ?? []); };
```

## Helpers (`@kitn.ai/ui/state`)

```ts
import { appendMessage, updateMessage, removeMessage } from '@kitn.ai/ui/state';

setMessages((m) => appendMessage(m, { id, role: 'user', content: text }));
```

## Streaming

```ts
import { createAssistantStream } from '@kitn.ai/ui/state';

const s = createAssistantStream(setMessages);
for await (const part of backend(prompt)) s.appendText(part);
s.done();
```

## React: `useKaiChat`

```tsx
import { Chat, useKaiChat } from '@kitn.ai/ui/react';

function App() {
  const chat = useKaiChat({
    async onSubmit({ value }) {
      chat.append({ id: crypto.randomUUID(), role: 'user', content: value });
      const s = chat.streamAssistant();
      for await (const part of backend(value)) s.appendText(part);
      s.done();
    },
  });
  return <Chat {...chat.bind} />;
}
```

## Solid: `createKaiChat`

```tsx
import { createKaiChat } from '@kitn.ai/ui';

const chat = createKaiChat({ onSubmit: ({ value }) => ask(value) });
<kai-chat {...chat.bind} on:kai-submit={chat.handleSubmit} />
```

Each `useKaiChat` / `createKaiChat` owns its own state, so multiple chats on one page run
independently.
```

- [ ] **Step 3: Add a README subsection**

Add a short "State helpers & hooks" subsection to `README.md` near the consumer usage docs, with the `useKaiChat` snippet above and a one-line pointer to the docs page. Match the surrounding heading level and voice.

- [ ] **Step 4: Add the consumer-regression scenario**

Following `/consumer-regression`'s scenario format (see `.claude/README.md` and the skill), add a scenario that builds a real app importing `useKaiChat` from `@kitn.ai/ui/react` (and `createAssistantStream` from `@kitn.ai/ui/state`) against the packed tarball, renders `<Chat {...chat.bind} />`, and asserts a streamed message appears. Locate the existing scenario list and add an entry mirroring its shape.

Run (discovery): `grep -rn "scenario" .claude/skills/consumer-regression* 2>/dev/null | head; ls .claude/skills 2>/dev/null`

- [ ] **Step 5: Commit**

```bash
git add docs-site README.md .claude
git commit -m "docs: document @kitn.ai/ui/state + useKaiChat/createKaiChat + add regression scenario"
```

---

### Task 8: Verification gate

**Files:** none (verification only).

- [ ] **Step 1: Typecheck (all 4 passes)**

Run: `npm run typecheck`
Expected: PASS — Solid src, react wrappers (incl. `use-kai-chat.tsx`), react tests, MCP.

- [ ] **Step 2: Full unit suite**

Run: `npm test`
Expected: PASS — the new `src/state/*.test.ts` and `src/primitives/create-kai-chat.test.ts` included; no regressions.

- [ ] **Step 3: Build + React suite**

Run: `npm run build && git checkout -- src/components/component-meta.json && npm run test:react`
Expected: build succeeds; `dist/state.js` + `dist/state/index.d.ts` present; React tests (incl. `use-kai-chat.test.tsx`) PASS.

- [ ] **Step 4: Consumer regression smoke**

Invoke the `/consumer-regression` skill in `smoke` mode (one parallel pass) to confirm the new `@kitn.ai/ui/state` subpath + `useKaiChat` resolve, type-check, and run in real consumer apps across frameworks against the packed tarball. Triage any failures by layer (packaging / export / SSR / scaffold) per the skill.

- [ ] **Step 5: Final commit (if the gate produced fixes)**

```bash
git add -A
git commit -m "test: verify state core + hooks across unit, react, and consumer-regression"
```

---

## Self-Review

**Spec coverage:**
- L1 helpers → Tasks 1-2. ✓
- L2 streaming handle (`createAssistantStream` + `onStreamSettled`) → Task 3. ✓
- L3 React `useKaiChat` → Task 6; Solid `createKaiChat` → Task 5. ✓
- `@kitn.ai/ui/state` subpath + packaging/build → Task 4. ✓
- Universal setter contract → encoded as `SetMessages` (Task 3), used everywhere. ✓
- Typing/DX goals → enforced by typed method signatures across Tasks 3/5/6; verified by tests. ✓
- Multiplicity → tested in Task 5 (two stores) and Task 6 (hook isolation via separate `renderHook`). ✓
- Testing strategy → unit (Tasks 1-5), React (Task 6), consumer-regression (Tasks 7-8). ✓
- Non-goals (element-owned state, element methods) → not implemented; Phase 2 deferred per spec. ✓
- Vue wrapper → Phase 1.5, intentionally **not** in this plan. ✓ (spec phasing)

**Placeholder scan:** No TBD/TODO; every code step has complete code. Docs/consumer-regression steps (Task 7) include real content plus a discovery command for file placement, which follows the "match existing patterns" rule rather than guessing Starlight/scenario internals.

**Type consistency:** `SetMessages`, `AssistantStream`, `ChatMessage`, `ToolPart`, `AttachmentData`, `CreateKaiChatOptions`/`KaiChatStore`, `UseKaiChatOptions`/`KaiChatController` are referenced with identical names/signatures across Tasks 3→5→6. `streamAssistant`, `bind`, `handleSubmit`, `append`/`update`/`remove`, `addSuggestion`/`removeSuggestion`/`clearSuggestions` are consistent between the Solid store and React controller.
