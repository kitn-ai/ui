# kai-thread: decompose the message list into a public element (phase 1)

Date: 2026-07-01
Status: design approved (Rob), ready to build.
Context: the composition-first direction — see `2026-07-01-composition-first-architecture-proposal.md`.

## Why

`kai-chat` wraps the internal `ChatThread` (`components/chat-thread.tsx`), which FUSES the
message list + composer + header + suggestions. To make `kai-chat` a thin preset later, the
parts must be separable. Phase 1: expose the message-list slice as a public **`kai-thread`**
element, **additively** — do NOT rewire `kai-chat` (that is the later "chat optimization").

## Scope

`kai-thread` OWNS (the message area):
- The message list: one `Message` per entry from a `messages` prop (JS property; a new array
  ref per streaming chunk, per the kit's streaming contract).
- Per-message rendering that rides with the data: markdown, code highlight (`proseSize` /
  `codeTheme` / `codeHighlight`), reasoning + tool panels, avatars, and the action row
  (`actionsReveal`, emits `kai-message-action`).
- Stick-to-bottom scroll + the scroll-to-bottom button (`use-stick-to-bottom` +
  `ScrollButton`). Fills the height its parent gives it and scrolls internally
  (`:host { display:block; height:100% }`, like `kai-resizable`).
- An `empty` slot for the zero-state.
- Optional `loading` for a typing indicator on the pending assistant turn.
- Imperative escape hatch: `scrollToBottom()`.

`kai-thread` does NOT own (siblings / preset concerns):
- Composer → stays `kai-prompt-input`. Suggestions → belong on the composer. Header
  (title/model/context) and sidebar → the preset / the consumer's layout.

## Implementation

- Build a Solid thread component by composing the EXISTING internal pieces
  (`ChatContainer` / `ChatContainerContent` / `ChatContainerScrollAnchor`, `Message`,
  `ScrollButton`, `use-stick-to-bottom`) to mirror how `ChatThread` renders its message
  list. Extract a shared piece if there's a clean seam, but do NOT change `ChatThread`'s
  public behavior and do NOT touch `kai-chat`.
- Element facade (`elements/thread.tsx`): `defineWebComponent('kai-thread', …)`. The
  `Props`/`Events` interfaces here drive the generated React `Thread` wrapper.
  - Props: `messages`, `loading?`, `proseSize?`, `codeTheme?`, `codeHighlight?`,
    `actionsReveal?`, `scrollButton?`, `class?`.
  - Events: `kai-message-action`.
  - Slot: `empty`. Method: `scrollToBottom()`.
- Registration is automatic via the elements manifest (`gen-elements-manifest.mjs`);
  `build:api` regenerates the React wrapper + `element-meta.json`.
- Stories: a SolidJS `Components/*` story (canonical surface, per convention) plus an
  optional Labs `kai-*` facade story.
- Tests: message rendering, empty state, `kai-message-action`, stick-to-bottom behavior.

## Verify

`pnpm nx build ui` (confirm `kai-thread` is in the elements bundle and a `Thread` React
wrapper was generated), `pnpm nx typecheck ui` (4/4), unit suite green, then
`git checkout -- packages/ui/src/components/component-meta.json`.

## Out of scope (phase 1)

- Rewiring `kai-chat` onto `kai-thread` (the chat optimization phase).
- The React example rewrite to consume `<kai-thread>` — done at integration, as the live
  proof that the decomposition works.

## Success

`<kai-thread messages={…}>` renders the message list with scroll + actions + empty state,
exposed from `@kitn.ai/ui/elements` and `@kitn.ai/ui/react` (`Thread`), with zero change to
`kai-chat` and no regression in the existing suite.
