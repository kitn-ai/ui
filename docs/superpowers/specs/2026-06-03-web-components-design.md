# Web Components via solid-element — Design

**Date:** 2026-06-03
**Status:** Approved (architecture); pending spec review
**Package:** `@kitnai/chat`

## Goal

Expose a small set of the kit's UI as framework-agnostic **web components** (custom
elements) that can be dropped into any host project — React, Vue, plain HTML —
**without style or DOM conflicts**. The existing SolidJS compositional API stays
unchanged for SolidJS consumers.

Two decisions are locked:

1. **Isolation strategy: Shadow DOM.** True encapsulation; the host's CSS cannot
   leak in and the kit's CSS cannot leak out. No Tailwind `prefix()` renaming
   needed — the shadow boundary does the isolation.
2. **Wrapper: stay in the Solid ecosystem** — `solid-element` (npm, unscoped,
   v1.9.x), with a thin hand-rolled custom-element wrapper as a fallback if portal
   handling fights solid-element. (Stencil/Lit were considered and rejected: they are different
   frameworks requiring a full rewrite, and Kobalte — Solid-only — cannot run in
   them.)

## Background: why a facade layer is required

The existing components are **compositional primitives, not data-driven widgets**:

- **`ConversationList`** is already data-driven (`groups[]`, `conversations[]`,
  `activeId`, `onSelect`, `onNewChat`). Maps to a custom element almost 1:1.
- **`PromptInput`** is a context provider with **slotted** children
  (`<PromptInputTextarea>`, `<PromptInputActions>` + host-supplied buttons). There
  is no single "value in, submit out" surface.
- **`ChatContainer`** is only a **scroll container**. It does not render messages;
  in every story the host hand-composes `<Message><MessageContent>…` per message,
  including reasoning blocks, tool calls, and attachments.

A custom element cannot accept slotted SolidJS composition or callback props the
way these do. So the web-component layer is **not** a 1:1 wrap. It is a thin set of
**data-driven facade components** that compose the existing primitives internally
and expose a flat, serializable surface: array/object **properties** in, **native
CustomEvents** out.

## Scope: three entry points

The three building blocks every story is assembled from:

| Custom element | Wraps | Facade effort |
| --- | --- | --- |
| `<kitn-conversation-list>` | `ConversationList` | Trivial (already data-driven) |
| `<kitn-prompt-input>` | `PromptInput` + default textarea/send | Small |
| `<kitn-chat>` | `ChatContainer` + `Message*` + `PromptInput` | **Large — new message renderer** |

**No other component is wrapped individually.** `Message`, `Markdown`, `Tool`,
`Reasoning`, `Button`, all Kobalte UI, etc. render *inside* these three elements'
shadow roots and are therefore isolated automatically. Isolation follows DOM
containment, not custom-element count.

## Architecture

```
Existing compositional components   (unchanged — SolidJS consumers keep using these)
        │  composed by
        ▼
NEW facade components                src/elements/*.tsx  (data-in, events-out)
  ChatFacade · ConversationListFacade · PromptInputFacade
        │  wrapped by @solidjs/solid-element (Shadow DOM)
        ▼
Custom elements   <kitn-chat>  <kitn-conversation-list>  <kitn-prompt-input>
        │  + compiled Tailwind CSS injected into each shadow root
        │  + Kobalte portals re-homed inside the shadow root
        ▼
Vite library build → dist/  (JS bundles Solid in; CSS inlined; calls customElements.define)
```

### New / changed files

- `src/elements/chat.tsx` — `ChatFacade` (the data-driven message renderer)
- `src/elements/conversation-list.tsx` — `ConversationListFacade`
- `src/elements/prompt-input.tsx` — `PromptInputFacade`
- `src/elements/register.ts` — registers all three custom elements; the build entry
- `src/elements/styles.ts` — compiled CSS string + `adoptedStyleSheets` injection helper
- `src/elements/portal-target.ts` — shadow-root portal mount, exposed via `ChatConfig`
- `vite.config.ts` (new) — library build producing `dist/`
- `src/primitives/chat-config.tsx` — extend `ChatConfigValue` with an optional
  `portalMount` accessor (back-compat: defaults to `document.body`)
- The 6 Kobalte files (`ui/dropdown`, `ui/dialog`, `ui/tooltip`, `ui/hover-card`,
  `ui/collapsible`, `components/context`) — pass `mount={portalMount()}` to
  `Portal`/`*.Portal`

Nothing in existing component logic or story code changes **except** the 6 Kobalte
files gaining a portal-mount prop.

## Element APIs

Properties are set as JS properties (rich data: arrays/objects). Attributes are
supported only for primitive/string props. All outputs are native `CustomEvent`s
(composed: true so they cross the shadow boundary).

### `<kitn-conversation-list>`
- **Properties:** `groups: ConversationGroup[]`, `conversations: ConversationSummary[]`, `activeId?: string`
- **Events:** `select` (`{ id }`), `newchat`, `togglesidebar`

### `<kitn-prompt-input>`
- **Properties:** `value?: string`, `placeholder?: string`, `disabled?: boolean`, `loading?: boolean`, `suggestions?: string[]`
- **Events:** `submit` (`{ value }`), `valuechange` (`{ value }`), `suggestionclick` (`{ value }`)
- Facade supplies a default textarea + send button (and renders suggestions if provided).

### `<kitn-chat>` — the data-driven message renderer
- **Properties:** `messages: ChatMessage[]`, `value?: string`, `placeholder?: string`,
  `loading?: boolean`, `suggestions?: string[]`, `proseSize?: ProseSize`, `codeTheme?: string`
- **Events:** `submit` (`{ value }`), `messageaction` (`{ messageId, action }`),
  `valuechange` (`{ value }`)
- **Message schema** (derived from what the stories actually render):

```ts
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;                  // markdown for assistant messages
  reasoning?: { text: string; label?: string };
  tools?: ToolPart[];               // existing Tool schema
  attachments?: AttachmentData[];   // existing Attachment schema
  actions?: Array<'copy' | 'like' | 'dislike' | 'regenerate' | 'edit'>;
}

type MessageAction = 'copy' | 'like' | 'dislike' | 'regenerate' | 'edit';
```

`<kitn-chat>` includes its own integrated prompt input. `<kitn-prompt-input>` exists
separately for hosts that build their own message area.

## Styling & Shadow DOM mechanics

- **CSS injection:** a build step compiles `tailwindcss` + `theme.css` + the kit's
  used utilities into one CSS string. The wrapper injects it into each element's
  shadow root via `adoptedStyleSheets` (one shared `CSSStyleSheet`, adopted by every
  instance — no per-instance duplication). No `prefix()` needed.
- **Portals (the hardest task):** Kobalte overlays render via `<Portal>` to
  `document.body` by default, which escapes the shadow root and loses the injected
  styles. Fix: each element creates a mount node *inside* its shadow root, publishes
  it through `ChatConfig.portalMount`, and all 6 Kobalte components pass it to their
  `Portal mount` prop. Verified by a browser test asserting an opened dropdown lives
  inside the shadow root.
- **Inherited CSS:** font-family etc. are inheritable and cross the boundary from the
  host; `@font-face` (if ever needed) must be defined globally. Shiki uses inline
  styles — fine inside shadow DOM.

## Build & packaging

- Add dependencies: `solid-element` (runtime), `@tailwindcss/cli` (dev, CSS compile).
- Add `vite.config.ts` with **library mode**: entry `src/elements/register.ts`,
  output ESM (+ optional IIFE for `<script>` drop-in). **Solid is bundled in** (hosts
  won't have it). CSS inlined as a string import.
- `package.json`: add `build` script; add an `./elements` export pointing at the built
  bundle. Keep `.` → `src/index.ts` (raw source) for SolidJS consumers unchanged.
- Registration is idempotent (guard `customElements.get(tag)` before `define`).

## Testing

- **jsdom (unit):** mount each `<kitn-*>`, set properties, assert rendered output and
  that interactions dispatch the correct CustomEvents with correct `detail`.
- **Playwright/browser project:** assert a Kobalte dropdown/tooltip opens **inside**
  the shadow root (the portal-rehoming guarantee) and that host page styles do not
  affect the element (isolation guarantee).
- Existing 200 tests must continue to pass unchanged.

## Out of scope

- Wrapping the other ~47 components as individual custom elements.
- Tailwind `prefix()` namespacing (unnecessary with Shadow DOM).
- React/Vue/Angular typed binding generation (possible later from the custom elements
  manifest; not part of this work).
- SSR/hydration of the custom elements.

## Open questions / decisions deferred to implementation

1. **solid-element vs. hand-rolled wrapper** — prototype the portal-in-shadow-root
   behavior first; whichever makes portal mounting cleaner wins. Spec assumes
   solid-element unless the prototype shows friction.
2. **`<kitn-chat>` ↔ `<kitn-prompt-input>` overlap** — `<kitn-chat>` ships an
   integrated input; the standalone element is for custom layouts. Confirm no host
   needs `<kitn-chat>` *without* an input.
3. **Controlled vs. uncontrolled `value`** — facades support both (internal signal
   with optional `value` property override), mirroring existing `PromptInput`.
```
