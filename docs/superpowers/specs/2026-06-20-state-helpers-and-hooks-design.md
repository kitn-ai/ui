# Design: consumer state helpers, framework hooks, and a streaming handle

- **Date:** 2026-06-20
- **Status:** Approved (pending spec review)
- **Branch:** `feat/consumer-hardening` (or a fresh `feat/state-helpers` cut from it)
- **Package:** `@kitn.ai/ui`

## Problem

The `kai-*` elements are **purely controlled**: the consumer owns all data (`messages`,
`suggestions`, `models`, …), passes it in as a JS property, and listens for `kai-*`
events. The facade (`src/elements/define.tsx`) takes reactive props in and dispatches
events out — there are **zero imperative methods** on any element today.

That model is correct, but the API it exposes is *low-level*. Every state change is the
consumer's job, done by hand against a raw array:

```ts
el.messages = [...el.messages, msg];                       // append
el.messages = el.messages.map(m => m.id === id ? { ...m, content } : m);  // edit
el.messages = el.messages.filter(m => m.id !== id);        // remove
```

Two costs fall out of this:

1. **Boilerplate.** The new-array-reference dance is repeated everywhere, and it is also
   the kit's #1 footgun — mutating in place silently fails to re-render.
2. **Weak typing at the point of use.** Raw array manipulation forces the consumer to
   know the `ChatMessage` shape and construct valid objects by hand. Nothing stops a
   malformed message (`reasoning: "thinking"` instead of `{ text }`) until runtime.

Streaming is where both costs peak: today a token stream means building a **new array
reference per chunk** by hand.

## Decision

**Stay fully controlled for all application data. Do not make elements own application
state.** Reduce the friction with three things that all keep state in the consumer:

1. A framework-neutral **state core** — pure immutable helpers plus a **streaming
   handle** — published at `@kitn.ai/ui/state`.
2. **Batteries-included framework wrappers** that own the state for you (`useKaiChat` for
   React, `createKaiChat` for Solid, `useKaiChat` for Vue), built on the core.
3. A small set of **stateless imperative element methods** (`focus`, `reset`,
   `scrollToBottom`, `scrollToMessage`, `submit`) for genuine UI actions that own no
   state — the only place element methods are the right tool. (Phase 2.)

### Why controlled, not element-owned state

- **The clobber is universal, not a React quirk.** Any element method that mutates a
  field which is *also* a bound prop is overwritten on the consumer's next render. The
  React wrapper re-applies every prop as a DOM property on **every render**
  (`frameworks/react/runtime.tsx:60-72`, a dep-less `useLayoutEffect`); Vue's `v-bind`,
  Angular's `[prop]`, Svelte's bound props, and Solid's reactive binding all do the
  equivalent. "Same field both prop-bound and method-mutated" is only safe in plain HTML.
- **Real integrations already have a state owner.** A consumer wiring the Vercel AI SDK's
  `useChat()`, LangGraph, or a custom backend already holds `messages`. An uncontrolled
  element that owned its own copy would fight that owner. Controlled is structurally
  correct for an AI chat kit, not merely familiar.
- **Web Awesome agrees.** Its `button`/`combobox` methods (`focus`, `blur`, `show`,
  `hide`, `scrollIntoView`) are all **UI control of the control's own state** — never
  "mutate the application's data." That is exactly the line we draw.
- **Maintainability.** Stateless elements + a handful of small pure functions is far less
  surface to own than a dozen elements each growing an internal store and a
  controlled/uncontrolled branch.

### Why this serves the stated goal (DX)

- **The call site is the type.** `stream.appendText(delta: string)` can only take a
  string; `upsertTool(tool: ToolPart)` enforces the `state` union with autocomplete.
  Malformed-object paths disappear.
- **Illegal states unrepresentable.** `appendReasoning(delta, label?)` guarantees
  `reasoning` ends up `{ text, label? }`. The invariant lives in the method, not in
  consumer discipline.
- **Discoverability.** `stream.` lists every domain operation; a raw `ChatMessage[]` only
  offers `Array.prototype`.
- **A stable seam over internal churn.** Methods keep their signatures even if the
  internal `ChatMessage` shape is later refactored — important for a *published* package
  where the raw object shape would otherwise be a frozen API contract.

Raw access does **not** go away: `messages` stays a prop and the types stay exported. The
helpers/hooks/methods are the guided, hard-to-misuse path layered on top.

## The universal contract: a functional-updater setter

Everything in the state core drives a single setter shape:

```ts
type SetMessages = (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
```

This is the shape of React `setState`, a Solid signal setter, a Svelte `$state`
assignment wrapped one line, and a vanilla `el.messages = …` wrapped one line. Because the
core only ever needs a setter, it is framework-agnostic, every operation produces a new
array reference (the kai contract, satisfied automatically), and state stays wherever the
consumer put it.

Vanilla adapter (explicitly the documented pattern — React/Solid-like):

```ts
const set: SetMessages = fn => { el.messages = fn(el.messages ?? []); };
```

## Architecture

Four layers; 1–3 are Phase 1, layer 4 is Phase 2.

### Layer 1 — pure immutable helpers (`@kitn.ai/ui/state`)

Framework-agnostic functions over arrays. They take the current array, return a new one.
Types reused verbatim from `src/elements/chat-types.ts` (`ChatMessage`, `CustomAction`,
`AvatarData`) and `src/components/tool.tsx` (`ToolPart`).

```ts
// messages
appendMessage(messages: ChatMessage[], msg: ChatMessage): ChatMessage[];
upsertMessage(messages: ChatMessage[], msg: ChatMessage): ChatMessage[];       // add or replace by id
updateMessage(
  messages: ChatMessage[],
  id: string,
  patch: Partial<ChatMessage> | ((m: ChatMessage) => ChatMessage),
): ChatMessage[];
removeMessage(messages: ChatMessage[], id: string): ChatMessage[];
appendContent(messages: ChatMessage[], id: string, delta: string): ChatMessage[]; // streaming primitive

// suggestions (string[] — thin, included for symmetry)
addSuggestion(suggestions: string[], s: string): string[];
removeSuggestion(suggestions: string[], s: string): string[];
```

Guarantees: never mutate inputs; always return a new top-level array; `updateMessage`/
`appendContent` return new message objects for the touched id and reuse references for the
rest (so fine-grained renderers only re-render what changed).

### Layer 2 — the streaming handle (`createAssistantStream`)

A fluent builder for one in-flight assistant message. Owns no state — drives the
consumer's setter.

```ts
function createAssistantStream(
  set: SetMessages,
  init?: Partial<ChatMessage>,   // defaults { id: crypto.randomUUID(), role: 'assistant', content: '' }
): AssistantStream;

interface AssistantStream {
  readonly id: string;
  appendText(delta: string): this;                         // content += delta
  setText(content: string): this;
  appendReasoning(delta: string, label?: string): this;    // reasoning.text += delta
  setReasoning(text: string, label?: string): this;
  upsertTool(tool: ToolPart): this;                        // add/replace by toolCallId, fallback type
  updateTool(toolCallId: string, patch: Partial<ToolPart>): this;
  patch(patch: Partial<ChatMessage>): this;                // escape hatch (attachments/actions/avatar)
  done(final?: Partial<ChatMessage>): void;                // settle the message
  abort(reason?: string): void;                            // drop it, or mark its tools output-error
}
```

Construction appends the initial (empty) assistant message via `set`. Each mutator does an
immutable write targeting `id`, e.g.:

```ts
set(prev => prev.map(m => m.id === id ? { ...m, content: m.content + delta } : m));
```

Mutators return `this` for chaining. Canonical loop (framework-independent):

```ts
const s = createAssistantStream(setMessages);
for await (const chunk of backend(prompt)) {
  if (chunk.type === 'text')        s.appendText(chunk.delta);
  if (chunk.type === 'reasoning')   s.appendReasoning(chunk.delta);
  if (chunk.type === 'tool-start')  s.upsertTool({ type: chunk.name, state: 'input-streaming', toolCallId: chunk.id, input: chunk.input });
  if (chunk.type === 'tool-result') s.updateTool(chunk.id, { state: 'output-available', output: chunk.output });
}
s.done();
```

### Layer 3 — framework wrappers

Same surface, three idioms. Each *is* the state owner, so there is zero clobber risk.

**React (`@kitn.ai/ui/react` — new `useKaiChat` export):**

```ts
const chat = useKaiChat({ initialMessages?, initialSuggestions?, onSubmit? });

chat.messages; chat.setMessages;
chat.append(msg); chat.update(id, patch); chat.remove(id);
chat.suggestions; chat.setSuggestions; chat.clearSuggestions();
chat.loading;                                   // auto-true between submit and stream.done()
chat.streamAssistant(init?): AssistantStream;
chat.bind;                                       // { messages, loading, suggestions, onSubmit } to spread
```

```tsx
function App() {
  const chat = useKaiChat({
    async onSubmit({ value }) {
      chat.append({ id: id(), role: 'user', content: value });
      const s = chat.streamAssistant();
      for await (const part of backend(value)) s.appendText(part);
      s.done();
    },
  });
  return <Chat {...chat.bind} />;
}
```

**Solid (`@kitn.ai/ui` core — `createKaiChat`):** a store with the same fields/operations,
returning a `bind` object of accessors. Authored in the kit's native runtime.

**Vue (`@kitn.ai/ui/vue` — `useKaiChat` composable):** same shape backed by `ref`s, with a
`bind` of reactive refs.

Svelte and Angular get the **full** Layer 1 + 2 experience immediately via the one-line
setter adapter; dedicated composables/services are a follow-on if there is demand. This is
called out in docs rather than left implicit.

### Layer 4 — stateless element methods (Phase 2)

The only place element methods are correct: actions that own no application state. Added
to the host element via a new `expose` affordance on `WebComponentContext` in
`define.tsx`, so the facade can attach typed methods that close over internal refs.

Initial set on `kai-chat`:

```ts
focus(): void;            // focus the prompt input
reset(): void;            // clear the input draft (NOT the messages — those are the consumer's)
submit(): void;           // submit the current draft, firing kai-submit
scrollToBottom(opts?: { behavior?: 'auto' | 'smooth' }): void;
scrollToMessage(id: string, opts?: ScrollIntoViewOptions): void;
```

`reset`/`submit`/`focus` need the underlying components to expose those affordances
(input ref, scroll container ref); `scrollToBottom`/`scrollToMessage` reuse the existing
scroll container. These are reflected into the generated React/Vue wrappers by typing the
forwarded ref to an element interface that lists the methods (the React wrapper already
forwards the host element via `useImperativeHandle`).

## Multiplicity: N chats per page (guaranteed, by construction)

Because state is consumer-owned and the core only closes over a per-call setter, every
instance is independent. `createAssistantStream(set)` closes over one setter; each
`useKaiChat()` owns one `useState`; each `<kai-chat>` is its own custom-element instance
(own shadow root, own per-render portal mount). The only cross-instance shared state is
the idempotent tag registration and the read-only adopted stylesheet (`sharedSheet`) —
neither couples instances. Auto-generated ids use `crypto.randomUUID()`, so they never
collide across instances. Ten chats stream concurrently with zero interference. This is a
direct dividend of choosing controlled over element-owned state.

## Packaging / build

- **New subpath `@kitn.ai/ui/state`.** Source `src/state/index.ts`. New
  `vite.config.state.ts` (mirrors `vite.config.barrel.ts`: single ES entry → `dist/state.js`
  + flat `.d.ts`). Added to the `build` script chain and to `exports` in `package.json`.
- **React hook** lives in `frameworks/react` (existing `react.js` build), importing the
  state core. The core must be reachable from that build (import from `src/state` and let
  the react build bundle it, or mark `@kitn.ai/ui/state` external and rely on the subpath).
  Decided in the plan; default is to bundle the small core into `react.js` to avoid a
  load-order/peer hazard.
- **Vue wrapper** `frameworks/vue` + `vite.config.vue.ts` + `./vue` export. Optional in
  Phase 1; can land in Phase 1.5.
- **No runtime deps added.** The core is plain functions; `crypto.randomUUID` is ambient
  in browsers and Node 18+.

## Testing

- **Core (Vitest unit):** every helper is pure — assert new-reference semantics
  (input untouched, output `!==` input), id targeting, and that untouched messages keep
  their references. The streaming handle: drive a fake `set` capturing each array, assert
  the message accretes correctly, that every emission is a new array + new touched object,
  `done`/`abort` behavior, and `upsertTool` add-vs-replace.
- **React hook (`vitest.react.config.ts`):** render a host with `useKaiChat`, exercise
  `append`/`update`/`streamAssistant`, assert `bind` drives the element and `loading`
  toggles around a stream.
- **Multiplicity:** a test mounting two hooks/streams asserting no cross-talk.
- **Consumer regression:** add a scenario to the `/consumer-regression` matrix that builds
  a real app using `@kitn.ai/ui/state` + `useKaiChat` against the packed tarball, across
  frameworks, to catch packaging/export/SSR regressions the unit suite cannot.
- **typecheck:** the new core and react hook must pass the existing 4-pass `typecheck`.

## Non-goals / out of scope

- **Element-owned (uncontrolled) data state.** No element will own `messages`/
  `suggestions`. The optional opt-in uncontrolled mode discussed earlier is explicitly
  deferred — revisit only on real demand.
- **Shadow-piercing or CSS-driven behavior.** Unchanged: behaviors stay prop/JSON-driven.
- **Angular/Svelte dedicated composables** in Phase 1 (the setter adapter covers them).
- **Generalizing the handle to every element** (artifacts, tool panels) up front — the
  pattern generalizes, but Phase 1 ships messages + suggestions only.

## Phasing

- **Phase 1 (this spec's core):** Layer 1 helpers + Layer 2 streaming handle
  (`@kitn.ai/ui/state`) + Layer 3 React `useKaiChat` + Solid `createKaiChat`. Docs +
  tests + consumer-regression scenario.
- **Phase 1.5:** Vue `useKaiChat`.
- **Phase 2:** Layer 4 stateless element methods + the `expose` affordance in
  `define.tsx` + typed refs in the generated wrappers.

## Resolved design questions

1. **Setter signature:** setter-only (`(prev) => next`). Vanilla uses the documented
   one-line adapter. No element-detecting overload.
2. **Where the handle lives:** framework-neutral `@kitn.ai/ui/state`; React/Solid/Vue wrap
   it. Clean separation of concerns.
3. **Controlled vs uncontrolled:** controlled throughout; element-owned state is a
   non-goal.
