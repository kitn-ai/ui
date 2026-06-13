# Design — `<kitn-chat-workspace>` web component

Date: 2026-06-13
Status: approved (brainstorm), pending implementation

## Goal

Ship one custom element that renders the full chat app shell — conversation
list on the left, chat on the right, with a drag-to-resize handle and a
collapsible sidebar — the same layout as the **Full Chat App** example, but as a
single drop-in `<kitn-chat-workspace>`. Consumers wiring a complete chat UI
shouldn't have to compose `kitn-conversation-list` + `kitn-chat` + a resizable
layout by hand.

## Decisions (from brainstorm)

- **Name:** `kitn-chat-workspace`.
- **State:** fully controlled for all *data* (conversations + messages), matching
  `kitn-chat` / `kitn-conversation-list`. The host owns state and reacts to events.
- **Layout:** resizable sidebar + manual collapse toggle. No responsive
  auto-collapse in v1 (see Out of scope — it's a clean additive follow-up).
- **Collapse:** internal UI state (not data). The user toggles it via the
  ConversationList header button (or an expand button when collapsed).
  `sidebarCollapsed` sets the initial state only; a `sidebartoggle` event fires
  on every change so hosts can observe.
- **Implementation:** extract `kitn-chat`'s body into a shared internal
  `ChatThread` component reused by both elements (no duplication/drift).

## Architecture

```
<kitn-chat-workspace>  (src/elements/chat-workspace.tsx, defineKitnElement)
  ChatConfig (proseSize / codeTheme / codeHighlight / portalMount)
  └── ResizablePanelGroup orientation="horizontal"
      ├── Show when={!collapsed}
      │   └── ResizablePanel defaultSize={sidebarWidth}
      │         data-min-size={sidebarMinWidth} data-max-size={sidebarMaxWidth}
      │       └── ConversationList groups/conversations/activeId
      │             onSelect→conversationselect  onNewChat→newchat
      │             onToggleSidebar→(collapse + sidebartoggle)
      ├── Show when={!collapsed}: ResizableHandle withHandle
      └── ResizablePanel
          └── <ChatThread ...all chat props/handlers... />
                (+ an expand button when collapsed, to reopen the sidebar)
```

### Shared `ChatThread` (the one refactor)

`kitn-chat`'s render body — header (title / ModelSwitcher / Context) + message
loop (reasoning / tools / attachments / content / actions) + `DefaultPromptInput`
— moves into a new internal Solid component:

- **File:** `src/components/chat-thread.tsx` (internal; not a public export).
- **Props:** every current `kitn-chat` prop plus callback props
  (`onValueChange`, `onSubmit`, `onSuggestionClick`, `onModelChange`,
  `onMessageAction`, `onSearch`, `onVoice`, `onSlashSelect`). It owns the input
  value fallback + attachments signals it currently owns inside `kitn-chat`.
- `kitn-chat.tsx` becomes a thin facade: wire `dispatch(...)` to the callbacks
  and render `<ChatThread {...} />`. **Public behavior unchanged** — verified by
  the existing `kitn-chat` stories and unit tests + a screenshot diff.

This keeps `kitn-chat` and `kitn-chat-workspace` rendering the identical thread.

## Public API

### Properties (all set as JS properties; arrays/objects never as attributes)

List:
- `groups: ConversationGroup[]` (default `[]`)
- `conversations: ConversationSummary[]` (default `[]`)
- `activeId?: string`

Chat (passthrough to `ChatThread`, same semantics/defaults as `kitn-chat`):
- `messages`, `value?`, `placeholder`, `loading`, `suggestions?`,
  `suggestionMode`, `proseSize`, `codeTheme`, `codeHighlight`, `chatTitle?`,
  `models?`, `currentModel?`, `context?`, `scrollButton`, `search`, `voice`,
  `slashCommands?`, `slashActiveIds?`, `slashCompact`

Layout:
- `sidebarWidth: number` — sidebar panel default size, percent (default `22`)
- `sidebarMinWidth: number` — px (default `200`)
- `sidebarMaxWidth: number` — px (default `420`)
- `sidebarCollapsed: boolean` — initial collapsed state only (default `false`)

### Events (non-bubbling CustomEvents, `detail` payloads)

- `conversationselect` → `{ id: string }` (from ConversationList select)
- `newchat` → `{}`
- `sidebartoggle` → `{ collapsed: boolean }`
- Re-dispatched from the thread: `submit` `{ value, attachments }`,
  `valuechange` `{ value }`, `modelchange` `{ modelId }`,
  `messageaction` `{ messageId, action }`, `search` `{}`, `voice` `{}`,
  `slashselect` `{ command }`, `suggestionclick` `{ value }`

## Behavior

- **Resize:** drag the `ResizableHandle` to resize the sidebar within
  min/max px. (Same mechanism as the Full Chat App example.)
- **Collapse:** the ConversationList header toggle (or the expand button shown
  in the chat panel header when collapsed) flips internal `collapsed`; the
  sidebar panel + handle unmount and the chat fills the width. `sidebartoggle`
  fires each time.
- **Theming / shadow DOM / portals:** identical to other elements — the
  facade nests `ChatConfig` and preserves the outer `portalMount` so overlays
  (ModelSwitcher, Context, slash palette) stay in the shadow root.

## Out of scope (v1)

- **Responsive auto-collapse.** A future `sidebarMode: 'auto' | 'manual'` prop
  (default `'manual'`) can add element-driven collapse on narrow widths via a
  `ResizeObserver`. It's purely additive — the default stays today's manual
  behavior — so deferring it costs nothing. Skipped now to avoid the
  responsive override edge-cases.
- Mobile drawer / overlay sidebar.
- Controlled (host-owned) collapse state.
- Per-conversation message caching/virtualization (host supplies the active
  thread's `messages`, as with `kitn-chat`).

## Deliverables & validation

- `src/components/chat-thread.tsx` (new), `src/elements/chat-workspace.tsx`
  (new), `kitn-chat.tsx` refactor to use `ChatThread`, register in
  `src/elements/register.ts`.
- Story: `Web Components/kitn-chat-workspace` (+ a showcase entry optional).
- Docs: a `kitn-chat-workspace` section in `docs/web-components.md` and the
  Integrations doc; `llms*.txt` regenerate on build.
- Element types: `src/elements/element-types.d.ts` / `custom-elements.json`
  pick it up via the build.
- Gate: `npm run build` + `npm run typecheck` + `npm test` (baseline 3 Shiki) +
  `npm run test:react`; a11y audit 0 kit violations; screenshot the element in
  Storybook (light + dark), confirm resize + collapse work.
