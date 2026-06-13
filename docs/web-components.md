# Kitn Web Components

## Overview

`@kitnai/chat` ships 27 framework-agnostic custom elements built on the SolidJS kit.

| Tag | Purpose |
|-----|---------|
| `<kitn-chat>` | Full chat UI — message list plus prompt input |
| `<kitn-conversation-list>` | Sidebar conversation browser with group support |
| `<kitn-prompt-input>` | Standalone text-input area with send button |
| + 24 composable primitives | See the full roster below |

Each element renders into its own **Shadow DOM** so the host page's CSS cannot leak in, and the kit's Tailwind classes cannot leak out. SolidJS and all kit dependencies are bundled inside the element bundle — the host does not need SolidJS.

The authoritative machine-readable API is the **Custom Elements Manifest** at `dist/custom-elements.json` (`customElements` field in `package.json`). The human- and agent-readable summary files are `llms.txt` (orientation) and `llms-full.txt` (full per-element reference, generated from the manifest — do not edit by hand).

---

## How the elements work (read this first)

- **Controlled, not stateful.** The host owns the data. You push it in via JS **properties** (`el.messages = …`, `el.conversations = …`), the element pushes interactions out via **events**, and you update the properties in response. The element keeps no message store of its own — to stream a reply you keep reassigning `el.messages`.
- **Data in = properties, config = attributes, data out = events.** Object/array data (messages, models, context) must be set as properties; simple config (`theme`, `prose-size`, `search`) also works as attributes.
- **Opt-in by data/flags.** Features appear when you give them data: pass `models` → a model switcher; pass `context` → a token meter; set `search`/`voice` → those buttons. Omit them → they don't render. Re-theme with `--kitn-*` tokens.

### What `<kitn-chat>` includes vs. the primitive layer

`<kitn-chat>` is the **drop-in** layer. Per message it renders: Markdown + code highlighting, **reasoning** blocks, **tool-call** panels, **attachments**, and **action buttons** (copy/like/dislike/regenerate). It also offers the header (title + model switcher + context meter), a scroll-to-bottom button, suggestions, and the input toolbar.

Some kit features are **primitive-only** — not surfaced by the web component: **ChainOfThought**, **FeedbackBar**, **ThinkingBar / TextShimmer** (animated "thinking"), **VoiceInput**, **FileUpload**, **SlashCommand**. If you need those, custom layout/placement, or anything the props don't cover, **compose the SolidJS primitives directly** (`import { … } from '@kitnai/chat'` — everything is exported). No forking required: tune via props/tokens, or drop to the primitive layer.

---

## Install / Build

### Build the bundle

```bash
npm run build
```

Internally this runs `build:css` (compiles Tailwind to `src/elements/compiled.css`) then `vite build`, producing:

| File | Format | Notes |
|------|--------|-------|
| `dist/kitn-chat.es.js` | ES module | Main entry. ~80 KB gzip; lazy chunks for code highlighting load on demand |

The build is **ES-module only** by design. A UMD/IIFE build cannot code-split, so it would have to inline every lazy chunk (all the Shiki syntax-highlighting languages) into one multi-MB file. The ES build keeps those chunks lazy and is loadable directly via `<script type="module">` in every modern browser.

### Register the elements

Import the ES module as a side-effect. It registers all 27 custom elements via `customElements.define`:

```js
import '@kitnai/chat/elements';
```

The `./elements` export in `package.json` resolves to `dist/kitn-chat.es.js`.

For plain HTML pages:

```html
<script type="module" src="./dist/kitn-chat.es.js"></script>
```

---

## Usage Pattern

All rich props (arrays, objects) must be set as **JavaScript properties**, not HTML attributes. Events are standard DOM `CustomEvent`s dispatched on the host element. They do **not** bubble and are **not** composed — listen directly on the element (`el.addEventListener(...)`).

**Boolean attributes** behave like normal HTML: a bare attribute turns the flag on, and `="false"` (or omitting it) turns it off. All of these are equivalent — `<kitn-chat loading>`, `<kitn-chat loading="true">`, and `el.loading = true`; `<kitn-chat loading="false">`, omitting it, and `el.loading = false` all leave it off.

```html
<script type="module">
  import '@kitnai/chat/elements';

  const chat = document.querySelector('kitn-chat');

  // Set rich props as JS properties
  chat.messages = [
    { id: '1', role: 'assistant', content: 'Hello! How can I help?' }
  ];

  // Listen for events via addEventListener
  chat.addEventListener('submit', (e) => {
    console.log('user sent:', e.detail.value);
  });
</script>

<kitn-chat></kitn-chat>
```

### TypeScript

Importing the elements entry augments `HTMLElementTagNameMap`, so DOM lookups are typed (props autocompleted, wrong assignments rejected):

```ts
import '@kitnai/chat/elements';
const chat = document.querySelector('kitn-chat'); // : KitnChatElement | null
chat!.messages = [/* … */];                        // typed
```

A [Custom Elements Manifest](https://github.com/webcomponents/custom-elements-manifest) (`customElements` in `package.json`) ships too, for editor autocomplete in HTML.

### React

Typed wrappers are generated for every element under `@kitnai/chat/react` (React is an optional peer dependency). They set rich data as DOM **properties** (so arrays/objects pass through correctly) and expose CustomEvents as `on<Event>` props:

```tsx
import { KitnChat } from '@kitnai/chat/react';

<KitnChat
  messages={messages}
  models={models}
  onSubmit={(e) => send(e.detail.value)}
  onMessageaction={(e) => handle(e.detail)}
/>;
```

Component names are the PascalCase of the tag (`kitn-chat` → `KitnChat`); event props are `on` + the event name (`messageaction` → `onMessageaction`).

---

## Full Element Reference (27 elements)

Every element also accepts a `theme` attribute (`'light' | 'dark' | 'auto'`, default `'auto'`). Array/object properties are marked with a `—` in the Attribute column — they **must** be set as JS properties.

---

### `<kitn-chat>` / `KitnChat`

<!-- spec:kitn-chat -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `messages` | — | `ChatMessage[]` | `[]` | The full message thread to render, newest last. Each entry carries its role, content, and optional reasoning/tools/attachments/actions. Set as a JS property (`el.messages = [...]`). |
| `value` | `value` | `undefined | string` | — | Controlled value of the input. When set, the host owns the input text and must update it on `valuechange`; leave unset for uncontrolled behavior. |
| `placeholder` | `placeholder` | `undefined | string` | `'Send a message...'` | Placeholder text shown in the empty input. |
| `loading` | `loading` | `undefined | false | true` | `false` | When true, shows the loading/streaming state and disables submit (use while awaiting the assistant's reply). |
| `suggestions` | — | `undefined | string[]` | — | Starter prompts shown above the input when the thread is empty. Clicking one follows `suggestionMode`. Set as a JS property. |
| `suggestionMode` | `suggestion-mode` | `undefined | "submit" | "fill"` | `'submit'` | What clicking a suggestion does: `'submit'` (default) sends it immediately as if typed and submitted; `'fill'` just places it in the input. |
| `proseSize` | `prose-size` | `undefined | "xs" | "sm" | "base" | "lg"` | `'sm'` | Body/prose font scale for rendered markdown (`'xs' | 'sm' | 'base' | 'lg'`). Defaults to `'sm'`. |
| `codeTheme` | `code-theme` | `undefined | string` | `'github-dark-dimmed'` | Shiki theme name for syntax-highlighted code blocks (e.g. `'github-dark-dimmed'`). |
| `codeHighlight` | `code-highlight` | `undefined | false | true` | `true` | Enable Shiki syntax highlighting in code blocks. Turn off to render plain `<pre>` blocks (lighter, no highlighter load). Default true. |
| `chatTitle` | `chat-title` | `undefined | string` | — | Optional header title shown on the left of the header. |
| `models` | — | `ModelOption[] | undefined` | — | Optional model list. When set (>1 model) a ModelSwitcher is shown in the header and a `modelchange` event fires on selection. |
| `currentModel` | `current-model` | `undefined | string` | — | The currently selected model id (pairs with `models`). |
| `context` | — | `ContextData | undefined` | — | Optional context-window token usage. When set, a Context token meter is shown in the header. |
| `scrollButton` | `scroll-button` | `undefined | false | true` | `true` | Show the scroll-to-bottom button inside the scroll area. Default true. |
| `search` | `search` | `undefined | false | true` | `false` | Show a Search (Globe) button in the input toolbar; fires a `search` event. |
| `voice` | `voice` | `undefined | false | true` | `false` | Show a Voice (Mic) button in the input toolbar; fires a `voice` event. |
| `slashCommands` | — | `SlashCommandItem[] | undefined` | — | Slash commands — when set, typing `/` in the input opens the command palette and fires `slashselect`. Set as a JS property. |
| `slashActiveIds` | — | `undefined | string[]` | — | Command ids to highlight as active in the palette. |
| `slashCompact` | `slash-compact` | `undefined | false | true` | `false` | Single-line palette rows. |

#### Events

| Event | `detail` | Description |
|-------|-----------|-------------|
| `messageaction` | `{ messageId: string; action: ChatMessageAction }` | An action button on a message was clicked. |
| `modelchange` | `{ modelId: string }` | The header model switcher changed. |
| `search` | `Record<string, never>` | The Search button was clicked. |
| `slashselect` | `{ command: SlashCommandItem }` | A slash command was chosen from the palette. |
| `submit` | `{ value: string; attachments: AttachmentData[] }` | User submitted a message. |
| `suggestionclick` | `{ value: string }` | A suggestion chip was clicked (only in `suggestion-mode="fill"`). |
| `valuechange` | `{ value: string }` | Fired on every input change. |
| `voice` | `Record<string, never>` | The Mic / voice button was clicked. |

#### Composed from

`Components/ChatThread`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-chat -->

A complete chat interface: a scrolling message list (with Markdown rendering, reasoning blocks, tool call panels, and message action buttons) plus a prompt input area with a send button.

---

### `<kitn-chat-workspace>` / `KitnChatWorkspace`

<!-- spec:kitn-chat-workspace -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `groups` | — | `ConversationGroup[]` | `[]` | Pre-bucketed conversation groups for the sidebar. Set as a JS property. |
| `conversations` | — | `ConversationSummary[]` | `[]` | Flat conversation list (auto-bucketed if `groups` is empty). Set as a JS property. |
| `activeId` | `active-id` | `undefined | string` | — | Id of the open conversation, highlighted in the sidebar. |
| `messages` | — | `ChatMessage[]` | `[]` | The active conversation's message thread, newest last. Set as a JS property. |
| `value` | `value` | `undefined | string` | — |  |
| `placeholder` | `placeholder` | `undefined | string` | `'Send a message...'` |  |
| `loading` | `loading` | `undefined | false | true` | `false` |  |
| `suggestions` | — | `undefined | string[]` | — |  |
| `suggestionMode` | `suggestion-mode` | `undefined | "submit" | "fill"` | `'submit'` |  |
| `proseSize` | `prose-size` | `undefined | "xs" | "sm" | "base" | "lg"` | `'sm'` |  |
| `codeTheme` | `code-theme` | `undefined | string` | `'github-dark-dimmed'` |  |
| `codeHighlight` | `code-highlight` | `undefined | false | true` | `true` |  |
| `chatTitle` | `chat-title` | `undefined | string` | — |  |
| `models` | — | `ModelOption[] | undefined` | — |  |
| `currentModel` | `current-model` | `undefined | string` | — |  |
| `context` | — | `ContextData | undefined` | — |  |
| `scrollButton` | `scroll-button` | `undefined | false | true` | `true` |  |
| `search` | `search` | `undefined | false | true` | `false` |  |
| `voice` | `voice` | `undefined | false | true` | `false` |  |
| `slashCommands` | — | `SlashCommandItem[] | undefined` | — |  |
| `slashActiveIds` | — | `undefined | string[]` | — |  |
| `slashCompact` | `slash-compact` | `undefined | false | true` | `false` |  |
| `sidebarWidth` | `sidebar-width` | `undefined | number` | `22` | Sidebar default width as a percent of the workspace (default 22). |
| `sidebarMinWidth` | `sidebar-min-width` | `undefined | number` | `200` | Sidebar min width in px (default 200). |
| `sidebarMaxWidth` | `sidebar-max-width` | `undefined | number` | `420` | Sidebar max width in px (default 420). |
| `sidebarCollapsed` | `sidebar-collapsed` | `undefined | false | true` | `false` | Initial collapsed state of the sidebar (default false). |

#### Events

| Event | `detail` | Description |
|-------|-----------|-------------|
| `conversationselect` | `{ id: string }` | A conversation was selected in the sidebar. |
| `messageaction` | `{ messageId: string; action: ChatMessageAction }` | An action button on a message was clicked. |
| `modelchange` | `{ modelId: string }` | The header model switcher changed. |
| `newchat` | `Record<string, never>` | The "New chat" button was clicked. |
| `search` | `Record<string, never>` | The Search button was clicked. |
| `sidebartoggle` | `{ collapsed: false | true }` | The sidebar was collapsed or expanded. |
| `slashselect` | `{ command: SlashCommandItem }` | A slash command was chosen from the palette. |
| `submit` | `{ value: string; attachments: AttachmentData[] }` | User submitted a message. |
| `suggestionclick` | `{ value: string }` | A suggestion chip was clicked (only in `suggestion-mode="fill"`). |
| `valuechange` | `{ value: string }` | Fired on every input change. |
| `voice` | `Record<string, never>` | The Mic / voice button was clicked. |

#### Composed from

`Components/ChatThread`, `Components/ConversationList`, `UI/ResizablePanelGroup`, `UI/ResizablePanel`, `UI/ResizableHandle`, `UI/Button`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-chat-workspace -->

The full app shell in one tag — a collapsible conversation-list sidebar (left), a drag-to-resize handle, and the complete chat thread (right) — all wired together. Drop in a single element and own the data; the workspace handles layout, resize, and collapse state internally.

**Example:**

```html
<script type="module">
  import '@kitnai/chat/elements';

  const workspace = document.getElementById('workspace');

  // Arrays and objects → JS properties
  workspace.conversations = [
    { id: 'c1', title: 'First chat', scope: { type: 'document' },
      messageCount: 5, lastMessageAt: '2026-06-13T10:00:00Z', updatedAt: '2026-06-13T10:00:00Z' },
  ];
  workspace.messages = [
    { id: 'm1', role: 'assistant', content: 'Hello! How can I help?', actions: ['copy', 'like'] },
  ];
  workspace.models = [
    { id: 'claude-4', name: 'Claude 4 Opus', provider: 'Anthropic' },
  ];

  workspace.addEventListener('conversationselect', (e) => {
    // load messages for e.detail.id, then reassign workspace.messages
    console.log('selected', e.detail.id);
  });

  workspace.addEventListener('submit', async (e) => {
    const text = e.detail.value;
    const history = [...workspace.messages, { id: crypto.randomUUID(), role: 'user', content: text }];
    workspace.messages = history;
    workspace.loading = true;
    // …stream reply, reassign workspace.messages each chunk
    workspace.loading = false;
  });
</script>

<kitn-chat-workspace id="workspace" style="display: block; height: 100vh;"></kitn-chat-workspace>
```

---

### `<kitn-conversation-list>` / `KitnConversationList`

<!-- spec:kitn-conversation-list -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `groups` | — | `ConversationGroup[]` | `[]` | Pre-bucketed conversation groups (e.g. "Today", "Yesterday"), each with its own conversations. Use this when you want to control the grouping/headers yourself; otherwise pass a flat `conversations` array. Set as a JS property. |
| `conversations` | — | `ConversationSummary[]` | `[]` | A flat list of conversation summaries; the component buckets them by recency for you. Ignored when `groups` is provided. Set as a JS property. |
| `activeId` | `active-id` | `undefined | string` | — | The id of the currently-open conversation, highlighted in the list. |

#### Events

| Event | `detail` | Description |
|-------|-----------|-------------|
| `newchat` | `Record<string, never>` | The "New chat" button was clicked. |
| `select` | `{ id: string }` | A conversation was selected. |
| `togglesidebar` | `Record<string, never>` | The sidebar toggle was clicked. |

#### Composed from

`Components/ConversationList`

#### Theming

Themed by the global design tokens (override any `--color-*`). Element-specific tokens: `--color-sidebar`, `--color-scrollbar-thumb`.
<!-- /spec:kitn-conversation-list -->

Sidebar panel listing conversations, optionally grouped. Emits events for navigation; does not manage its own state.

---

### `<kitn-prompt-input>` / `KitnPromptInput`

<!-- spec:kitn-prompt-input -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `value` | `value` | `undefined | string` | — | Controlled value of the input. When set, the host owns the text and must update it on `valuechange`; leave unset for uncontrolled behavior. |
| `placeholder` | `placeholder` | `undefined | string` | `'Send a message...'` | Placeholder text shown in the empty input. |
| `disabled` | `disabled` | `undefined | false | true` | `false` | Disable the input and submit button entirely (non-interactive). |
| `loading` | `loading` | `undefined | false | true` | `false` | Show the loading/streaming state and block submit (use while awaiting a reply). |
| `suggestions` | — | `undefined | string[]` | — | Starter prompts shown above the input. Clicking one follows `suggestionMode`. Set as a JS property. |
| `suggestionMode` | `suggestion-mode` | `undefined | "submit" | "fill"` | `'submit'` | What clicking a suggestion does: `'submit'` (default) sends it immediately as if typed and submitted; `'fill'` just places it in the input. |
| `slashCommands` | — | `SlashCommandItem[] | undefined` | — | Slash commands — when set, typing `/` opens the command palette. Set as a JS property. |
| `slashActiveIds` | — | `undefined | string[]` | — | Command ids to highlight as active. |
| `slashCompact` | `slash-compact` | `undefined | false | true` | `false` | Single-line palette rows. |
| `search` | `search` | `undefined | false | true` | `false` | Show a Search (Globe) button in the left toolbar; clicking it fires a `search` event. |
| `voice` | `voice` | `undefined | false | true` | `false` | Show a Voice (Mic) button in the left toolbar; clicking it fires a `voice` event. |
| `attachments` | — | `AttachmentData[] | undefined` | — | Attachments to seed the input with (so a consumer can pre-populate staged files without an upload). Set as a JS property; the element then manages its own attachment state from there (add via the paperclip, remove per chip). |

#### Events

| Event | `detail` | Description |
|-------|-----------|-------------|
| `search` | `Record<string, never>` | The Search (Globe) toolbar button was clicked. |
| `slashselect` | `{ command: SlashCommandItem }` | A slash command was chosen from the palette. |
| `submit` | `{ value: string; attachments: AttachmentData[] }` | The user submitted the prompt (Enter or send button) with its attachments. |
| `suggestionclick` | `{ value: string }` | A suggestion was clicked while `suggestion-mode="fill"`. |
| `valuechange` | `{ value: string }` | The input text changed (fires on every keystroke). |
| `voice` | `Record<string, never>` | The Voice (Mic) toolbar button was clicked. |

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-prompt-input -->

Standalone prompt input with a send button. Use when you want just the input area without the message list.

---

### `<kitn-message>` / `KitnMessage`

<!-- spec:kitn-message -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `message` | — | `ChatMessage | undefined` | — | The full message object. Set as a JS property. |
| `role` | `role` | `undefined | "user" | "assistant"` | `'assistant'` | Convenience for simple cases when not passing a `message` object. |
| `content` | `content` | `undefined | string` | — | Convenience content (used when `message` is not set). |
| `markdown` | `markdown` | `undefined | false | true` | — | Force markdown on/off. Defaults to on for assistant, off for user. |
| `proseSize` | `prose-size` | `undefined | "xs" | "sm" | "base" | "lg"` | `'sm'` | Text/markdown sizing for the message body. |
| `codeTheme` | `code-theme` | `undefined | string` | `'github-dark-dimmed'` | Shiki theme name used for fenced code blocks in the content. |
| `codeHighlight` | `code-highlight` | `undefined | false | true` | `true` | Disable syntax highlighting for code blocks (no Shiki loads). |

#### Events

| Event | `detail` | Description |
|-------|-----------|-------------|
| `messageaction` | `{ messageId: string; action: ChatMessageAction }` | An action button was clicked. |

#### Composed from

`Components/Message`, `Components/MessageContent`, `Components/MessageActions`, `Components/Reasoning`, `Components/ReasoningTrigger`, `Components/ReasoningContent`, `Components/Tool`, `Components/Attachments`, `Components/Attachment`, `Components/AttachmentPreview`, `Components/AttachmentInfo`, `UI/Button`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-message -->

A single message row: renders markdown/plain content, reasoning, tool calls, attachments, and action buttons from one message object.

---

### `<kitn-markdown>` / `KitnMarkdown`

<!-- spec:kitn-markdown -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `content` | `content` | `string` | `''` | The markdown source to render. |
| `proseSize` | `prose-size` | `undefined | "xs" | "sm" | "base" | "lg"` | `'sm'` | Text/markdown sizing. |
| `codeTheme` | `code-theme` | `undefined | string` | `'github-dark-dimmed'` | Shiki theme for fenced code blocks. |
| `codeHighlight` | `code-highlight` | `undefined | false | true` | `true` | Disable syntax highlighting (no Shiki loads). |

#### Composed from

`Components/Markdown`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-markdown -->

Renders a markdown string with code highlighting.

No events.

---

### `<kitn-code-block>` / `KitnCodeBlock`

<!-- spec:kitn-code-block -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `code` | `code` | `string` | `''` | The source code to render. |
| `language` | `language` | `undefined | string` | — | Language grammar (e.g. `js`, `python`). Defaults to `tsx`. |
| `codeTheme` | `code-theme` | `undefined | string` | `'github-dark-dimmed'` | Shiki theme name. |
| `codeHighlight` | `code-highlight` | `undefined | false | true` | `true` | Disable syntax highlighting (renders plain text, no Shiki). |
| `proseSize` | `prose-size` | `undefined | "xs" | "sm" | "base" | "lg"` | `'sm'` | Code text sizing. |

#### Composed from

`Components/CodeBlock`, `Components/CodeBlockCode`

#### Theming

Themed by the global design tokens (override any `--color-*`). Element-specific tokens: `--color-code-foreground`.
<!-- /spec:kitn-code-block -->

A single syntax-highlighted code block with a copy button.

No events.

---

### `<kitn-reasoning>` / `KitnReasoning`

<!-- spec:kitn-reasoning -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `text` | `text` | `string` | `''` | The reasoning text to display. |
| `label` | `label` | `undefined | string` | `'Reasoning'` | Trigger label. |
| `open` | `open` | `undefined | false | true` | — | Controlled open state — set as a property (`el.open = true`). Omit for uncontrolled (the trigger toggles it). |
| `streaming` | `streaming` | `undefined | false | true` | `false` | While true, auto-expands (and re-collapses when it flips false). |
| `markdown` | `markdown` | `undefined | false | true` | `true` | Render `text` as markdown. |

#### Events

| Event | `detail` | Description |
|-------|-----------|-------------|
| `openchange` | `{ open: false | true }` | Open state changed (via the trigger or streaming auto-open). |

#### Composed from

`Components/Reasoning`, `Components/ReasoningTrigger`, `Components/ReasoningContent`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-reasoning -->

Collapsible reasoning/thinking block with optional streaming auto-expand.

---

### `<kitn-tool>` / `KitnTool`

<!-- spec:kitn-tool -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `tool` | — | `ToolPart | undefined` | — | The tool-call to display. Set as a JS property. |
| `open` | `open` | `undefined | false | true` | `false` | Start expanded. |

#### Composed from

`Components/Tool`

#### Theming

Themed by the global design tokens (override any `--color-*`). Element-specific tokens: `--color-tool-blue`, `--color-tool-amber`, `--color-tool-green`, `--color-tool-red`.
<!-- /spec:kitn-tool -->

Tool-call panel showing a function call's type, state, input, and output.

No events.

---

### `<kitn-attachments>` / `KitnAttachments`

<!-- spec:kitn-attachments -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `items` | — | `AttachmentData[]` | `[]` | The attachments to render. Set as a JS property (array). |
| `variant` | `variant` | `undefined | "grid" | "inline" | "list"` | `'grid'` | Layout: `grid` = visual tiles, `inline` = icon + label chips, `list` = rows. |
| `hoverCard` | `hover-card` | `undefined | false | true` | `false` | Wrap each item in a hover card that previews its details. |
| `removable` | `removable` | `undefined | false | true` | `false` | Show a remove button per item; clicking it fires a `remove` event. |
| `showMediaType` | `show-media-type` | `undefined | false | true` | `false` | Also show the media type beneath the filename (non-grid variants). |
| `emptyText` | `empty-text` | `undefined | string` | — | Text shown when `items` is empty. |

#### Events

| Event | `detail` | Description |
|-------|-----------|-------------|
| `remove` | `{ id: string }` | A remove button was clicked. |

#### Composed from

`Components/Attachments`, `Components/Attachment`, `Components/AttachmentPreview`, `Components/AttachmentInfo`, `Components/AttachmentRemove`, `Components/AttachmentHoverCard`, `Components/AttachmentHoverCardTrigger`, `Components/AttachmentHoverCardContent`, `Components/AttachmentEmpty`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-attachments -->

Renders a list of file/document attachments in grid, inline, or list layouts.

---

### `<kitn-model-switcher>` / `KitnModelSwitcher`

<!-- spec:kitn-model-switcher -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `models` | — | `{ id: string; name: string; provider?: undefined | string }[]` | `[]` | The selectable models. Set as a JS property (array). |
| `currentModel` | `current-model` | `undefined | string` | — | The currently-selected model id. Defaults to the first model. |

#### Events

| Event | `detail` | Description |
|-------|-----------|-------------|
| `modelchange` | `{ modelId: string }` | A model was selected. |

#### Composed from

`Components/ModelSwitcher`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-model-switcher -->

A dropdown that lets the user switch between available models.

---

### `<kitn-context-meter>` / `KitnContextMeter`

<!-- spec:kitn-context-meter -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `context` | — | `ContextData | undefined` | — | Token-usage data. Set as a JS property. |

#### Composed from

`Components/Context`, `Components/ContextTrigger`, `Components/ContextContent`, `Components/ContextContentHeader`, `Components/ContextContentBody`, `Components/ContextContentFooter`, `Components/ContextInputUsage`, `Components/ContextOutputUsage`, `Components/ContextReasoningUsage`, `Components/ContextCacheUsage`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-context-meter -->

Token-usage meter showing used/max tokens and estimated cost.

No events.

---

### `<kitn-chain-of-thought>` / `KitnChainOfThought`

<!-- spec:kitn-chain-of-thought -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `steps` | — | `{ label: string; content?: undefined | string }[]` | `[]` | The reasoning steps. Set as a JS property. Compound sub-parts collapse to this one data model (Route 1). |

#### Composed from

`Components/ChainOfThought`, `Components/ChainOfThoughtStep`, `Components/ChainOfThoughtTrigger`, `Components/ChainOfThoughtContent`, `Components/ChainOfThoughtItem`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-chain-of-thought -->

Displays a list of reasoning steps as a collapsible chain-of-thought.

No events.

---

### `<kitn-prompt-suggestions>` / `KitnPromptSuggestions`

<!-- spec:kitn-prompt-suggestions -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `suggestions` | — | `(string | { label: string; value?: undefined | string })[]` | `[]` | The suggestions. Strings, or `{ label, value }` when the displayed text and the emitted value differ. Set as a JS property. |
| `variant` | `variant` | `undefined | "ghost" | "default" | "outline"` | `'outline'` | Chip style: `'outline'` (default), `'ghost'`, or `'default'` (filled). |
| `size` | `size` | `undefined | "sm" | "lg" | "md" | "icon" | "icon-sm"` | — | Size preset for each chip. Defaults to the pill default (`'lg'`); pass `'sm'` for smaller pills (or `'md'`). |
| `block` | `block` | `undefined | false | true` | `false` | Full-width left-aligned rows instead of pills. |
| `highlight` | `highlight` | `undefined | string` | — | Substring to highlight within each suggestion. |

#### Events

| Event | `detail` | Description |
|-------|-----------|-------------|
| `select` | `{ value: string }` | A suggestion was clicked. |

#### Composed from

`Components/PromptSuggestion`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-prompt-suggestions -->

Suggestion chips or full-width rows. Can render plain strings or `{ label, value }` pairs.

---

### `<kitn-source>` / `KitnSource`

<!-- spec:kitn-source -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `href` | `href` | `undefined | string` | `''` | The URL this citation links to (the domain also seeds the default label/favicon). |
| `label` | `label` | `undefined | string` | — | Trigger label (defaults to the domain). |
| `headline` | `headline` | `undefined | string` | `''` | Hover-card headline. Attribute: `headline` (`title` is avoided — it's a global HTML attribute that reflects in a CE constructor and breaks it). |
| `description` | `description` | `undefined | string` | `''` | Hover-card body text describing the source. |
| `showFavicon` | `show-favicon` | `undefined | false | true` | `false` | Show the source's favicon next to the trigger label. |

#### Composed from

`Components/Source`, `Components/SourceTrigger`, `Components/SourceContent`, `Components/SourceList`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-source -->

An inline citation link that opens a hover card with source details.

No events.

---

### `<kitn-source-list>` / `KitnSourceList`

<!-- spec:kitn-source-list -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `sources` | — | `SourceItem[]` | `[]` | The sources to render. Set as a JS property. |
| `showFavicon` | `show-favicon` | `undefined | false | true` | `false` | Show favicons on all items (per-item `showFavicon` overrides). |

#### Composed from

`Components/Source`, `Components/SourceTrigger`, `Components/SourceContent`, `Components/SourceList`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-source-list -->

Renders a list of sources using `<kitn-source>` internally.

No events.

---

### `<kitn-feedback-bar>` / `KitnFeedbackBar`

<!-- spec:kitn-feedback-bar -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `barTitle` | `bar-title` | `undefined | string` | `'Was this helpful?'` | The banner label (e.g. "Was this helpful?"). Attribute: `bar-title` (`title` is avoided — it's a global HTML attribute). |

#### Events

| Event | `detail` | Description |
|-------|-----------|-------------|
| `close` | — | The user dismissed the banner. |
| `helpful` | — | The user clicked thumbs-up. |
| `nothelpful` | — | The user clicked thumbs-down. |

#### Composed from

`Components/FeedbackBar`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-feedback-bar -->

A thumbs-up / thumbs-down banner (e.g. "Was this helpful?").

---

### `<kitn-file-upload>` / `KitnFileUpload`

<!-- spec:kitn-file-upload -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `multiple` | `multiple` | `undefined | false | true` | `true` | Allow selecting multiple files (default true). |
| `accept` | `accept` | `undefined | string` | — | `accept` attribute for the file picker (e.g. `image/*`). |
| `disabled` | `disabled` | `undefined | false | true` | `false` | Disable the dropzone — no clicking, no drag-and-drop. |
| `label` | `label` | `undefined | string` | `'Click or drop files to upload'` | Default dropzone label (overridable via the default slot). |

#### Events

| Event | `detail` | Description |
|-------|-----------|-------------|
| `filesadded` | `{ files: File[] }` | Files were picked or dropped. |

#### Composed from

`Components/FileUpload`, `Components/FileUploadTrigger`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-file-upload -->

A drag-and-drop / click-to-pick file upload dropzone.

---

### `<kitn-voice-input>` / `KitnVoiceInput`

<!-- spec:kitn-voice-input -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `transcribe` | — | `undefined | (audio: Blob) => Promise<string>` | — | Transcriber the host supplies — records audio, returns the text. This is a **function-valued property** (`el.transcribe = async blob => '...'`) because a value-returning callback can't be modelled as a fire-and-forget event. |
| `disabled` | `disabled` | `undefined | false | true` | `false` | Disable the mic button (non-interactive). |

#### Events

| Event | `detail` | Description |
|-------|-----------|-------------|
| `audiocaptured` | `{ blob: Blob }` | Raw audio captured (before transcription) — for hosts that prefer to handle transcription themselves instead of via the `transcribe` property. |
| `transcription` | `{ text: string }` | Transcription completed (the `transcribe` property resolved). |

#### Composed from

`Components/VoiceInput`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-voice-input -->

A mic button that records audio and optionally transcribes it via a host-supplied function.

---

### `<kitn-loader>` / `KitnLoader`

<!-- spec:kitn-loader -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `variant` | `variant` | `LoaderVariant | undefined` | `'circular'` | The animation style: `'circular' | 'classic' | 'pulse' | 'pulse-dot' | 'dots' | 'typing' | 'wave' | 'bars' | 'terminal' | 'text-blink' | 'text-shimmer' | 'loading-dots'`. Defaults to `'circular'`. |
| `size` | `size` | `undefined | "sm" | "lg" | "md"` | `'md'` | Loader size: `'sm' | 'md' | 'lg'`. Defaults to `'md'`. |
| `text` | `text` | `undefined | string` | — | Label for the text-based variants. |

#### Composed from

`Components/Loader`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-loader -->

An animated loading indicator with 12 style variants.

No events.

---

### `<kitn-thinking-bar>` / `KitnThinkingBar`

<!-- spec:kitn-thinking-bar -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `text` | `text` | `undefined | string` | `'Thinking'` | The shimmering label, e.g. "Thinking…". |
| `stoppable` | `stoppable` | `undefined | false | true` | `false` | When true, show a "stop" affordance that fires a `stop` event. |
| `stopLabel` | `stop-label` | `undefined | string` | `'Answer now'` | Label for the stop affordance. |

#### Events

| Event | `detail` | Description |
|-------|-----------|-------------|
| `stop` | — | The "stop / answer now" affordance was clicked. |

#### Composed from

`Components/ThinkingBar`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-thinking-bar -->

An animated "thinking" shimmer bar with an optional stop affordance.

---

### `<kitn-text-shimmer>` / `KitnTextShimmer`

<!-- spec:kitn-text-shimmer -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `text` | `text` | `undefined | string` | `''` | The text to shimmer. |
| `as` | `as` | `undefined | string` | `'span'` | Element tag to render as (default `span`). |
| `duration` | `duration` | `undefined | number` | `4` | Animation duration in seconds. |
| `spread` | `spread` | `undefined | number` | `20` | Gradient spread (5–45). |

#### Composed from

`Components/TextShimmer`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-text-shimmer -->

Text with a shimmer animation — useful for "thinking" indicators.

No events.

---

### `<kitn-response-stream>` / `KitnResponseStream`

<!-- spec:kitn-response-stream -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `text` | — | `undefined | string | AsyncIterable<string>` | `''` | Text to stream. A string, or an `AsyncIterable<string>` (set as a JS property — async iterables can't be HTML attributes). |
| `mode` | `mode` | `undefined | "typewriter" | "fade"` | `'typewriter'` | Reveal animation. |
| `speed` | `speed` | `undefined | number` | `20` | Characters/segments per tick. |
| `as` | `as` | `undefined | string` | — | Element tag to render as. |

#### Events

| Event | `detail` | Description |
|-------|-----------|-------------|
| `complete` | — | Streaming finished. |

#### Composed from

`Components/ResponseStream`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-response-stream -->

Renders a string or an `AsyncIterable<string>` with a reveal animation.

---

### `<kitn-image>` / `KitnImage`

<!-- spec:kitn-image -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `base64` | `base64` | `undefined | string` | — | Base64-encoded image data (pair with `media-type`). |
| `bytes` | — | `undefined | Uint8Array<ArrayBufferLike>` | — | Raw image bytes (set as a JS property). |
| `alt` | `alt` | `undefined | string` | `''` | Alt text. |
| `mediaType` | `media-type` | `undefined | string` | — | MIME type (default `image/png`). |

#### Composed from

`Components/Image`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-image -->

Renders a base64-encoded or raw-bytes image.

No events.

---

### `<kitn-checkpoint>` / `KitnCheckpoint`

<!-- spec:kitn-checkpoint -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `label` | `label` | `undefined | string` | — | Optional text beside the icon. |
| `tooltip` | `tooltip` | `undefined | string` | — | Tooltip on hover. |
| `variant` | `variant` | `undefined | "ghost" | "default" | "outline"` | `'ghost'` | Visual button style. |
| `size` | `size` | `undefined | "sm" | "lg" | "md" | "icon" | "icon-sm"` | `'sm'` | Button size (use an `icon*` size for an icon-only checkpoint). |

#### Events

| Event | `detail` | Description |
|-------|-----------|-------------|
| `select` | — | The checkpoint was clicked. |

#### Composed from

`Components/Checkpoint`, `Components/CheckpointIcon`, `Components/CheckpointTrigger`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-checkpoint -->

A small button used to mark or navigate to a conversation checkpoint.

---

### `<kitn-chat-scope-picker>` / `KitnChatScopePicker`

<!-- spec:kitn-chat-scope-picker -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `availableAuthors` | — | `string[]` | `[]` | Authors to offer as scope filters. Set as a JS property. |
| `availableTags` | — | `string[]` | `[]` | Tags to offer as scope filters. Set as a JS property. |
| `currentLabel` | `current-label` | `undefined | string` | `'All Content'` | The label shown on the trigger for the active scope. |

#### Events

| Event | `detail` | Description |
|-------|-----------|-------------|
| `scopechange` | `{ filters: SearchFilters | undefined }` | A scope was chosen (`undefined` filters = "All Content"). |

#### Composed from

`Components/ChatScopePicker`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-chat-scope-picker -->

A dropdown for filtering the chat to specific authors, tags, content type, or date range.

---

### `<kitn-message-skills>` / `KitnMessageSkills`

<!-- spec:kitn-message-skills -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `skills` | — | `{ id: string; name: string }[]` | `[]` | The active skills to badge. Set as a JS property. |

#### Composed from

`Components/MessageSkills`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-message-skills -->

Displays active skills as badges on a message.

No events.

---

### `<kitn-empty>` / `KitnEmpty`

<!-- spec:kitn-empty -->
#### Properties

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `emptyTitle` | `empty-title` | `undefined | string` | `''` | Title text. Attribute: `empty-title` (`title` is a global HTML attribute). |
| `description` | `description` | `undefined | string` | `''` | Description text. |

#### Composed from

`Components/Empty`, `Components/EmptyHeader`, `Components/EmptyMedia`, `Components/EmptyTitle`, `Components/EmptyDescription`, `Components/EmptyContent`

#### Theming

Themed by the global design tokens (override any `--color-*`).
<!-- /spec:kitn-empty -->

Empty-state placeholder with a title and description.

No events.

---

## ChatMessage schema

```ts
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: { text: string; label?: string };
  tools?: ToolPart[];
  attachments?: AttachmentData[];
  actions?: ('copy' | 'like' | 'dislike' | 'regenerate' | 'edit')[];
}

interface ToolPart {
  type: string;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  toolCallId?: string;
  errorText?: string;
}

interface AttachmentData {
  id: string;
  type: 'file' | 'source-document';
  filename?: string;
  mediaType?: string;
  url?: string;
  title?: string;
}

interface ModelOption {
  id: string;
  name: string;
  provider?: string;
}

interface ContextData {
  usedTokens: number;
  maxTokens: number;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cacheTokens?: number;
  estimatedCost?: number;
}

interface SlashCommand {
  id: string;
  label: string;
  description?: string;
  category?: string;
}
```

---

## Styling and Theming

Each element renders into its own Shadow DOM. This provides **full CSS isolation**:

- Tailwind classes used by the kit do not affect the host page.
- The host page's stylesheets do not bleed into the components.

### Design tokens

**The elements are self-themed.** Each element's Shadow DOM already contains the full compiled token set, so the components render correctly with **no host-side stylesheet required** — including light/dark via the `theme` attribute.

To **rebrand**, override the kit's **namespaced** tokens — `--kitn-color-*` (and `--kitn-text-*`, `--kitn-radius`) — on `:root` or a parent. The components read these via a `var(--kitn-…, default)` fallback that pierces the Shadow DOM, so your overrides reach them.

```css
:root {
  --kitn-color-background: #0f0f0f;
  --kitn-color-primary: #7c3aed;
  --kitn-color-muted: #1e1e1e;
  --kitn-text-body: 0.9375rem;
}
```

> **Two stylesheets — pick by how you consume the kit:**
> - **Tailwind builds** (composing the SolidJS primitives): `@import "@kitnai/chat/theme.css"` in your CSS.
> - **Plain HTML / CDN** (web components): `<link rel="stylesheet" href="…/@kitnai/chat/theme.tokens.css">` — only needed to theme your own host-page markup; the elements carry their own tokens.

### Theme attribute

Every element accepts `theme="light"`, `theme="dark"`, or `theme="auto"` (default). `auto` follows the OS `prefers-color-scheme` media query.

```html
<kitn-chat theme="dark"></kitn-chat>
```

---

## Code highlighting (on-demand, optional)

Syntax highlighting is powered by [Shiki](https://shiki.style), wired to be as lightweight as possible:

- **Nothing loads until a code block actually renders.** A chat with no code never fetches Shiki.
- **On-demand, per-language.** Only the Shiki core, the JS regex engine, the one theme, and the one language grammar are fetched as small lazy chunks.
- **No WASM.** Uses Shiki's JavaScript engine.

### Built-in languages

A small default set loads on demand: `bash`/`sh`, `javascript`/`js`, `html`, `css`, `json`. Anything else renders as plain text until registered.

### Configure or disable

```js
import { configureCodeHighlighting } from '@kitnai/chat/elements';

configureCodeHighlighting({
  languages: {
    ruby: () => import('@shikijs/langs/ruby'),
    python: () => import('@shikijs/langs/python'),
  },
  aliases: { rb: 'ruby', py: 'python' },
});

// Or turn off entirely (no Shiki ever loads):
configureCodeHighlighting({ enabled: false });
```

---

## Machine-readable API

The authoritative source for all element APIs is `dist/custom-elements.json` (generated by `@custom-elements-manifest/analyzer` as part of `npm run build`). Do not edit it by hand.

Two human/agent-readable files are generated from the manifest by `scripts/gen-llms.mjs`:

- **`llms.txt`** (~4 KB) — orientation: install, the property-vs-attribute rule, architecture, theming, and framework wiring.
- **`llms-full.txt`** (~32 KB) — everything in `llms.txt` plus a generated props/events table for each element, a streaming recipe, and a build-a-chat-app runbook.

Both files are at the repo root, the npm package root (`node_modules/@kitnai/chat/llms.txt`), and https://kitn.dev/llms.txt.
