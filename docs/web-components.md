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

A complete chat interface: a scrolling message list (with Markdown rendering, reasoning blocks, tool call panels, and message action buttons) plus a prompt input area with a send button.

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `messages` | — | `ChatMessage[]` | `[]` | The full message thread to render, newest last |
| `value` | `value` | `string` | — | Controlled input value; omit for uncontrolled |
| `placeholder` | `placeholder` | `string` | `'Send a message...'` | Textarea placeholder text |
| `loading` | `loading` | `boolean` | `false` | Disables/locks the prompt input while awaiting a reply |
| `suggestions` | — | `string[]` | — | Starter prompts shown above the input when the thread is empty; clicking one follows `suggestionMode` |
| `suggestionMode` | `suggestion-mode` | `'submit' \| 'fill'` | `'submit'` | `'submit'` sends immediately; `'fill'` places the text in the input |
| `theme` | `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | `auto` follows `prefers-color-scheme` |
| `proseSize` | `prose-size` | `'xs' \| 'sm' \| 'base' \| 'lg'` | `'sm'` | Markdown/text sizing |
| `codeTheme` | `code-theme` | `string` | `'github-dark-dimmed'` | Shiki syntax-highlight theme name |
| `codeHighlight` | `code-highlight` | `boolean` | `true` | `false` → plain code blocks, no Shiki loaded |
| `chatTitle` | `chat-title` | `string` | — | Header title (header renders when `chatTitle`, `models`, or `context` is set) |
| `models` | — | `ModelOption[]` | — | Shows a ModelSwitcher in the header; fires `modelchange` |
| `currentModel` | `current-model` | `string` | — | Selected model id (pairs with `models`) |
| `context` | — | `ContextData` | — | Shows the Context token-usage meter in the header |
| `scrollButton` | `scroll-button` | `boolean` | `true` | Built-in scroll-to-bottom button |
| `search` | `search` | `boolean` | `false` | Show a Search button in the input toolbar; fires `search` |
| `voice` | `voice` | `boolean` | `false` | Show a Mic button in the input toolbar; fires `voice` |
| `slashCommands` | — | `SlashCommand[]` | — | When set, typing `/` opens the command palette; fires `slashselect` |
| `slashActiveIds` | — | `string[]` | — | Command ids to highlight as active in the palette |
| `slashCompact` | `slash-compact` | `boolean` | `false` | Single-line palette rows |

**Events:**

| Event | `detail` | Description |
|-------|----------|-------------|
| `submit` | `{ value: string, attachments: AttachmentData[] }` | User submitted a message |
| `valuechange` | `{ value: string }` | Fired on every input change |
| `suggestionclick` | `{ value: string }` | A suggestion chip was clicked |
| `messageaction` | `{ messageId: string, action: ChatMessageAction }` | An action button on a message was clicked |
| `modelchange` | `{ modelId: string }` | Header model switcher changed |
| `slashselect` | `{ command: SlashCommand }` | A slash command was chosen from the palette |
| `search` | — | Search button clicked |
| `voice` | — | Mic button clicked |

---

### `<kitn-chat-workspace>` / `KitnChatWorkspace`

The full app shell in one tag — a collapsible conversation-list sidebar (left), a drag-to-resize handle, and the complete chat thread (right) — all wired together. Drop in a single element and own the data; the workspace handles layout, resize, and collapse state internally.

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `groups` | — | `ConversationGroup[]` | `[]` | Pre-bucketed conversation groups for the sidebar; controls grouping/headers |
| `conversations` | — | `ConversationSummary[]` | `[]` | Flat conversation list; auto-bucketed by recency when `groups` is empty |
| `activeId` | `active-id` | `string` | — | ID of the open conversation; highlighted in the sidebar |
| `messages` | — | `ChatMessage[]` | `[]` | The active conversation's message thread, newest last |
| `value` | `value` | `string` | — | Controlled input value; omit for uncontrolled |
| `placeholder` | `placeholder` | `string` | `'Send a message...'` | Textarea placeholder text |
| `loading` | `loading` | `boolean` | `false` | Disables/locks the prompt input while awaiting a reply |
| `suggestions` | — | `string[]` | — | Starter prompts shown above the input when the thread is empty |
| `suggestionMode` | `suggestion-mode` | `'submit' \| 'fill'` | `'submit'` | `'submit'` sends immediately; `'fill'` places the text in the input |
| `theme` | `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | `auto` follows `prefers-color-scheme` |
| `proseSize` | `prose-size` | `'xs' \| 'sm' \| 'base' \| 'lg'` | `'sm'` | Markdown/text sizing |
| `codeTheme` | `code-theme` | `string` | `'github-dark-dimmed'` | Shiki syntax-highlight theme name |
| `codeHighlight` | `code-highlight` | `boolean` | `true` | `false` → plain code blocks, no Shiki loaded |
| `chatTitle` | `chat-title` | `string` | — | Chat header title (header renders when `chatTitle`, `models`, or `context` is set) |
| `models` | — | `ModelOption[]` | — | Shows a ModelSwitcher in the chat header; fires `modelchange` |
| `currentModel` | `current-model` | `string` | — | Selected model id (pairs with `models`) |
| `context` | — | `ContextData` | — | Shows the Context token-usage meter in the chat header |
| `scrollButton` | `scroll-button` | `boolean` | `true` | Built-in scroll-to-bottom button in the chat thread |
| `search` | `search` | `boolean` | `false` | Show a Search button in the input toolbar; fires `search` |
| `voice` | `voice` | `boolean` | `false` | Show a Mic button in the input toolbar; fires `voice` |
| `slashCommands` | — | `SlashCommand[]` | — | When set, typing `/` opens the command palette; fires `slashselect` |
| `slashActiveIds` | — | `string[]` | — | Command ids to highlight as active in the palette |
| `slashCompact` | `slash-compact` | `boolean` | `false` | Single-line palette rows |
| `sidebarWidth` | `sidebar-width` | `number` | `22` | Sidebar default width as a percent of the workspace |
| `sidebarMinWidth` | `sidebar-min-width` | `number` | `200` | Sidebar minimum width in px |
| `sidebarMaxWidth` | `sidebar-max-width` | `number` | `420` | Sidebar maximum width in px |
| `sidebarCollapsed` | `sidebar-collapsed` | `boolean` | `false` | Initial collapsed state of the sidebar |

**Events:**

| Event | `detail` | Description |
|-------|----------|-------------|
| `conversationselect` | `{ id: string }` | User clicked a conversation in the sidebar |
| `newchat` | — | User clicked "New chat" |
| `sidebartoggle` | `{ collapsed: boolean }` | Sidebar collapse state changed |
| `submit` | `{ value: string, attachments: AttachmentData[] }` | User submitted a message |
| `valuechange` | `{ value: string }` | Fired on every input change |
| `modelchange` | `{ modelId: string }` | Header model switcher changed |
| `messageaction` | `{ messageId: string, action: ChatMessageAction }` | An action button on a message was clicked |
| `search` | — | Search button clicked |
| `voice` | — | Mic button clicked |
| `slashselect` | `{ command: SlashCommand }` | A slash command was chosen from the palette |
| `suggestionclick` | `{ value: string }` | A suggestion chip was clicked |

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

Sidebar panel listing conversations, optionally grouped. Emits events for navigation; does not manage its own state.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `conversations` | — | `ConversationSummary[]` | Flat list; the component buckets by recency. Ignored when `groups` is provided |
| `groups` | — | `ConversationGroup[]` | Pre-bucketed groups with their own conversations; controls the grouping/headers |
| `activeId` | `active-id` | `string` | ID of the currently selected conversation |

**Events:**

| Event | `detail` | Description |
|-------|----------|-------------|
| `select` | `{ id: string }` | User clicked a conversation |
| `newchat` | — | User clicked "New chat" |
| `togglesidebar` | — | User clicked the sidebar toggle |

---

### `<kitn-prompt-input>` / `KitnPromptInput`

Standalone prompt input with a send button. Use when you want just the input area without the message list.

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `value` | `value` | `string` | — | Controlled input value; omit for uncontrolled |
| `placeholder` | `placeholder` | `string` | `'Send a message...'` | Textarea placeholder |
| `disabled` | `disabled` | `boolean` | `false` | Disables the textarea and send button |
| `loading` | `loading` | `boolean` | `false` | Shows loading state (submit disabled) |
| `suggestions` | — | `string[]` | — | Suggestion chips shown above the input |
| `suggestionMode` | `suggestion-mode` | `'submit' \| 'fill'` | `'submit'` | What clicking a suggestion does |
| `slashCommands` | — | `SlashCommand[]` | — | When set, typing `/` opens the command palette |
| `slashActiveIds` | — | `string[]` | — | Command ids to highlight as active |
| `slashCompact` | `slash-compact` | `boolean` | `false` | Single-line palette rows |

**Events:**

| Event | `detail` | Description |
|-------|----------|-------------|
| `submit` | `{ value: string, attachments: AttachmentData[] }` | User submitted |
| `valuechange` | `{ value: string }` | Fired on every input change |
| `suggestionclick` | `{ value: string }` | Suggestion chip clicked (with `suggestion-mode="fill"`) |
| `slashselect` | `{ command: SlashCommand }` | A slash command was chosen |

---

### `<kitn-message>` / `KitnMessage`

A single message row: renders markdown/plain content, reasoning, tool calls, attachments, and action buttons from one message object.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `message` | — | `ChatMessage` | The full message object (preferred) |
| `role` | `role` | `'user' \| 'assistant'` | Convenience when not passing a `message` object |
| `content` | `content` | `string` | Convenience content (used when `message` is not set) |
| `markdown` | `markdown` | `boolean` | Force markdown on/off (default on for assistant, off for user) |
| `proseSize` | `prose-size` | `'xs' \| 'sm' \| 'base' \| 'lg'` | Text sizing |
| `codeTheme` | `code-theme` | `string` | Shiki theme for code blocks |
| `codeHighlight` | `code-highlight` | `boolean` | Disable syntax highlighting |

**Events:**

| Event | `detail` | Description |
|-------|----------|-------------|
| `messageaction` | `{ messageId: string, action: ChatMessageAction }` | An action button was clicked |

---

### `<kitn-markdown>` / `KitnMarkdown`

Renders a markdown string with code highlighting.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `content` | `content` | `string` | The markdown source |
| `proseSize` | `prose-size` | `'xs' \| 'sm' \| 'base' \| 'lg'` | Text sizing |
| `codeTheme` | `code-theme` | `string` | Shiki theme for fenced code blocks |
| `codeHighlight` | `code-highlight` | `boolean` | Disable syntax highlighting |

No events.

---

### `<kitn-code-block>` / `KitnCodeBlock`

A single syntax-highlighted code block with a copy button.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `code` | `code` | `string` | The source code to render |
| `language` | `language` | `string` | Language grammar (e.g. `js`, `python`). Defaults to `tsx` |
| `codeTheme` | `code-theme` | `string` | Shiki theme name |
| `codeHighlight` | `code-highlight` | `boolean` | Disable syntax highlighting |
| `proseSize` | `prose-size` | `'xs' \| 'sm' \| 'base' \| 'lg'` | Code text sizing |

No events.

---

### `<kitn-reasoning>` / `KitnReasoning`

Collapsible reasoning/thinking block with optional streaming auto-expand.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `text` | `text` | `string` | The reasoning text |
| `label` | `label` | `string` | Trigger label |
| `open` | `open` | `boolean` | Controlled open state |
| `streaming` | `streaming` | `boolean` | While true, auto-expands; re-collapses when it flips false |
| `markdown` | `markdown` | `boolean` | Render `text` as markdown |

**Events:**

| Event | `detail` | Description |
|-------|----------|-------------|
| `openchange` | `{ open: boolean }` | Open state changed |

---

### `<kitn-tool>` / `KitnTool`

Tool-call panel showing a function call's type, state, input, and output.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `tool` | — | `ToolPart` | The tool-call to display |
| `open` | `open` | `boolean` | Start expanded |

No events.

---

### `<kitn-attachments>` / `KitnAttachments`

Renders a list of file/document attachments in grid, inline, or list layouts.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `items` | — | `AttachmentData[]` | The attachments to render |
| `variant` | `variant` | `'grid' \| 'inline' \| 'list'` | Layout style |
| `hoverCard` | `hover-card` | `boolean` | Wrap each item in a hover card |
| `removable` | `removable` | `boolean` | Show a remove button per item |
| `showMediaType` | `show-media-type` | `boolean` | Show media type beneath the filename |
| `emptyText` | `empty-text` | `string` | Text shown when `items` is empty |

**Events:**

| Event | `detail` | Description |
|-------|----------|-------------|
| `remove` | `{ id: string }` | A remove button was clicked |

---

### `<kitn-model-switcher>` / `KitnModelSwitcher`

A dropdown that lets the user switch between available models.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `models` | — | `ModelOption[]` | The selectable models |
| `currentModel` | `current-model` | `string` | Currently-selected model id (defaults to first model) |

**Events:**

| Event | `detail` | Description |
|-------|----------|-------------|
| `modelchange` | `{ modelId: string }` | A model was selected |

---

### `<kitn-context-meter>` / `KitnContextMeter`

Token-usage meter showing used/max tokens and estimated cost.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `context` | — | `ContextData` | Token-usage data |

No events.

---

### `<kitn-chain-of-thought>` / `KitnChainOfThought`

Displays a list of reasoning steps as a collapsible chain-of-thought.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `steps` | — | `{ label: string; content?: string }[]` | The reasoning steps |

No events.

---

### `<kitn-prompt-suggestions>` / `KitnPromptSuggestions`

Suggestion chips or full-width rows. Can render plain strings or `{ label, value }` pairs.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `suggestions` | — | `string[] \| { label: string; value?: string }[]` | The suggestions |
| `variant` | `variant` | `'outline' \| 'ghost' \| 'default'` | Chip style |
| `block` | `block` | `boolean` | Full-width left-aligned rows |
| `highlight` | `highlight` | `string` | Substring to highlight within each suggestion |

**Events:**

| Event | `detail` | Description |
|-------|----------|-------------|
| `select` | `{ value: string }` | A suggestion was clicked |

---

### `<kitn-source>` / `KitnSource`

An inline citation link that opens a hover card with source details.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `href` | `href` | `string` | The URL this citation links to |
| `label` | `label` | `string` | Trigger label (defaults to the domain) |
| `headline` | `headline` | `string` | Hover-card headline |
| `description` | `description` | `string` | Hover-card body text |
| `showFavicon` | `show-favicon` | `boolean` | Show the source's favicon |

No events.

---

### `<kitn-source-list>` / `KitnSourceList`

Renders a list of sources using `<kitn-source>` internally.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `sources` | — | `SourceItem[]` | The sources to render |
| `showFavicon` | `show-favicon` | `boolean` | Show favicons on all items |

No events.

---

### `<kitn-feedback-bar>` / `KitnFeedbackBar`

A thumbs-up / thumbs-down banner (e.g. "Was this helpful?").

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `barTitle` | `bar-title` | `string` | The banner label |

**Events:**

| Event | `detail` | Description |
|-------|----------|-------------|
| `helpful` | — | User clicked thumbs-up |
| `nothelpful` | — | User clicked thumbs-down |
| `close` | — | User dismissed the banner |

---

### `<kitn-file-upload>` / `KitnFileUpload`

A drag-and-drop / click-to-pick file upload dropzone.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `multiple` | `multiple` | `boolean` | Allow multiple files (default true) |
| `accept` | `accept` | `string` | `accept` attribute for the file picker (e.g. `image/*`) |
| `disabled` | `disabled` | `boolean` | Disable the dropzone |
| `label` | `label` | `string` | Default dropzone label |

**Events:**

| Event | `detail` | Description |
|-------|----------|-------------|
| `filesadded` | `{ files: File[] }` | Files were picked or dropped |

---

### `<kitn-voice-input>` / `KitnVoiceInput`

A mic button that records audio and optionally transcribes it via a host-supplied function.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `transcribe` | — | `(audio: Blob) => Promise<string>` | Function-valued property: the host supplies a transcriber |
| `disabled` | `disabled` | `boolean` | Disable the mic button |

**Events:**

| Event | `detail` | Description |
|-------|----------|-------------|
| `audiocaptured` | `{ blob: Blob }` | Raw audio captured (before transcription) |
| `transcription` | `{ text: string }` | Transcription completed |

---

### `<kitn-loader>` / `KitnLoader`

An animated loading indicator with 12 style variants.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `variant` | `variant` | `'circular' \| 'classic' \| 'pulse' \| 'pulse-dot' \| 'dots' \| 'typing' \| 'wave' \| 'bars' \| 'terminal' \| 'text-blink' \| 'text-shimmer' \| 'loading-dots'` | Animation style |
| `size` | `size` | `'sm' \| 'md' \| 'lg'` | Loader size |
| `text` | `text` | `string` | Label for text-based variants |

No events.

---

### `<kitn-thinking-bar>` / `KitnThinkingBar`

An animated "thinking" shimmer bar with an optional stop affordance.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `text` | `text` | `string` | The shimmering label (e.g. "Thinking…") |
| `stoppable` | `stoppable` | `boolean` | Show a stop affordance |
| `stopLabel` | `stop-label` | `string` | Label for the stop affordance |

**Events:**

| Event | `detail` | Description |
|-------|----------|-------------|
| `stop` | — | The stop affordance was clicked |

---

### `<kitn-text-shimmer>` / `KitnTextShimmer`

Text with a shimmer animation — useful for "thinking" indicators.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `text` | `text` | `string` | The text to shimmer |
| `as` | `as` | `string` | Element tag to render as (default `span`) |
| `duration` | `duration` | `number` | Animation duration in seconds |
| `spread` | `spread` | `number` | Gradient spread (5–45) |

No events.

---

### `<kitn-response-stream>` / `KitnResponseStream`

Renders a string or an `AsyncIterable<string>` with a reveal animation.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `text` | — | `string \| AsyncIterable<string>` | Text to stream (async iterables must be set as a JS property) |
| `mode` | `mode` | `'typewriter' \| 'fade'` | Reveal animation |
| `speed` | `speed` | `number` | Characters/segments per tick |
| `as` | `as` | `string` | Element tag to render as |

**Events:**

| Event | `detail` | Description |
|-------|----------|-------------|
| `complete` | — | Streaming finished |

---

### `<kitn-image>` / `KitnImage`

Renders a base64-encoded or raw-bytes image.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `base64` | `base64` | `string` | Base64-encoded image data (pair with `media-type`) |
| `bytes` | — | `Uint8Array` | Raw image bytes (must be set as a JS property) |
| `alt` | `alt` | `string` | Alt text |
| `mediaType` | `media-type` | `string` | MIME type (default `image/png`) |

No events.

---

### `<kitn-checkpoint>` / `KitnCheckpoint`

A small button used to mark or navigate to a conversation checkpoint.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `label` | `label` | `string` | Optional text beside the icon |
| `tooltip` | `tooltip` | `string` | Tooltip on hover |
| `variant` | `variant` | `'default' \| 'outline' \| 'ghost'` | Visual button style |
| `size` | `size` | `'sm' \| 'md' \| 'lg' \| 'icon' \| 'icon-sm'` | Button size |

**Events:**

| Event | `detail` | Description |
|-------|----------|-------------|
| `select` | — | The checkpoint was clicked |

---

### `<kitn-chat-scope-picker>` / `KitnChatScopePicker`

A dropdown for filtering the chat to specific authors, tags, content type, or date range.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `availableAuthors` | — | `string[]` | Authors to offer as scope filters |
| `availableTags` | — | `string[]` | Tags to offer as scope filters |
| `currentLabel` | `current-label` | `string` | Label shown on the trigger for the active scope |

**Events:**

| Event | `detail` | Description |
|-------|----------|-------------|
| `scopechange` | `{ filters: SearchFilters \| undefined }` | A scope was chosen (`undefined` filters = "All Content") |

---

### `<kitn-message-skills>` / `KitnMessageSkills`

Displays active skills as badges on a message.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `skills` | — | `{ id: string; name: string }[]` | The active skills to badge |

No events.

---

### `<kitn-empty>` / `KitnEmpty`

Empty-state placeholder with a title and description.

| Property | Attribute | Type | Notes |
|----------|-----------|------|-------|
| `emptyTitle` | `empty-title` | `string` | Title text (attribute is `empty-title` to avoid collision with the global `title` attribute) |
| `description` | `description` | `string` | Description text |

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
