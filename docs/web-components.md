# Kitn Web Components

## Overview

`@kitnai/chat` ships three framework-agnostic custom elements built on the SolidJS kit:

| Tag | Purpose |
|-----|---------|
| `<kitn-chat>` | Full chat UI — message list plus prompt input |
| `<kitn-conversation-list>` | Sidebar conversation browser with group support |
| `<kitn-prompt-input>` | Standalone text-input area with send button |

Each element renders into its own **Shadow DOM** so the host page's CSS cannot leak in, and the kit's Tailwind classes cannot leak out. SolidJS and all kit dependencies are bundled inside the element bundle — the host does not need SolidJS.

---

## How the elements work (read this first)

- **Controlled, not stateful.** The host owns the data. You push it in via JS **properties** (`el.messages = …`, `el.conversations = …`), the element pushes interactions out via **events**, and you update the properties in response. The element keeps no message store of its own — to stream a reply you keep reassigning `el.messages`.
- **Data in = properties, config = attributes, data out = events.** Object/array data (messages, models, context) must be set as properties; simple config (`theme`, `prose-size`, `search`) also works as attributes.
- **Opt-in by data/flags.** Features appear when you give them data: pass `models` → a model switcher; pass `context` → a token meter; set `search`/`voice` → those buttons. Omit them → they don't render. Re-theme with `--color-*` tokens.

### What `<kitn-chat>` includes vs. the primitive layer

`<kitn-chat>` is the **drop-in** layer. Per message it renders: Markdown + code highlighting, **reasoning** blocks, **tool-call** panels, **attachments**, and **action buttons** (copy/like/dislike/regenerate). It also offers the header (title + model switcher + context meter), a scroll-to-bottom button, suggestions, and the input toolbar.

Some kit features are **primitive-only** — not surfaced by the web component: **ChainOfThought**, **FeedbackBar**, **ThinkingBar / TextShimmer** (animated "thinking"), **VoiceInput**, **FileUpload**, **SlashCommand**. If you need those, custom layout/placement, or anything the props don't cover, **compose the SolidJS primitives directly** (`import { … } from '@kitnai/chat'` — everything is exported; see the Solid example). No forking required: tune via props/tokens, or drop to the primitive layer.

---

## Install / Build

### Build the bundle

```bash
npm run build
```

Internally this runs `build:css` (compiles Tailwind to `src/elements/compiled.css`) then `vite build`, producing:

| File | Format | Notes |
|------|--------|-------|
| `dist/kitn-chat.es.js` | ES module | The entry. ~280 KB; loads on-demand chunks (code highlighting, etc.) lazily |

The build is **ES-module only** by design. A UMD/IIFE build cannot code-split, so it would have to inline every lazy chunk (all the Shiki syntax-highlighting languages) into one multi-MB file. The ES build keeps those chunks lazy and is loadable directly via `<script type="module">` in every modern browser.

### Register the elements

Import the ES module as a side-effect. It registers all three custom elements via `customElements.define`:

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

---

## `<kitn-chat>`

A complete chat interface: a scrolling message list (with Markdown rendering, reasoning blocks, tool call panels, and message action buttons) plus a prompt input area with a send button.

### Properties

All are set as JS **properties** (objects/arrays can't go through HTML attributes). Several are presence-based: provide the data and the feature appears; omit it and it doesn't.

| Property | Attribute | Type | Default | Notes |
|----------|-----------|------|---------|-------|
| `messages` | — | `ChatMessage[]` | `[]` | The full list of messages to display |
| `value` | `value` | `string` | `undefined` | Controlled input value; omit for uncontrolled |
| `placeholder` | `placeholder` | `string` | `'Send a message...'` | Textarea placeholder text |
| `loading` | `loading` | `boolean` | `false` | Disables/locks the prompt input. **Does not render a thinking animation** — convey progress by streaming `messages` |
| `suggestions` | — | `string[]` | `undefined` | Suggestion chips above the input; clicking one fills the input + fires `suggestionclick` |
| `theme` | `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | `auto` follows the OS `prefers-color-scheme` |
| `proseSize` | `prose-size` | `ProseSize` | `'base'` | Markdown/text sizing (`'xs'`, `'sm'`, `'base'`, `'lg'`) |
| `codeTheme` | `code-theme` | `string` | `'github-dark-dimmed'` | Shiki syntax-highlight theme name |
| `codeHighlight` | `code-highlight` | `boolean` | `true` | `false` → plain code blocks, no Shiki loaded |
| `chatTitle` | `chat-title` | `string` | `undefined` | Header title. The header appears when `chatTitle`, `models`, or `context` is set |
| `models` | — | `ModelOption[]` | `undefined` | Shows a **ModelSwitcher** in the header; fires `modelchange` |
| `currentModel` | `current-model` | `string` | `undefined` | Selected model id |
| `context` | — | `{ usedTokens; maxTokens; inputTokens; outputTokens; estimatedCost }` | `undefined` | Shows the **Context** token-usage meter in the header |
| `scrollButton` | `scroll-button` | `boolean` | `true` | Built-in scroll-to-bottom button |
| `search` | `search` | `boolean` | `false` | Show a Search button in the input toolbar; fires `search` |
| `voice` | `voice` | `boolean` | `false` | Show a Mic button in the input toolbar; fires `voice` |

The input always has a **📎 attach** button: picked files are staged as removable previews (images show a thumbnail, other files an icon) and arrive on the `submit` event as `attachments`.

### Events

Events are non-bubbling `CustomEvent`s — listen directly on the element.

| Event | `detail` shape | Description |
|-------|---------------|-------------|
| `submit` | `{ value: string, attachments: AttachmentData[] }` | User submitted a message (with any staged attachments) |
| `valuechange` | `{ value: string }` | Fired on every input change |
| `suggestionclick` | `{ value: string }` | A suggestion chip was clicked (the input is also filled) |
| `messageaction` | `{ messageId: string, action: ChatMessageAction }` | An action button on a message was clicked |
| `modelchange` | `{ modelId: string }` | The header model switcher changed (only when `models` is set) |
| `search` | _(none)_ | The Search button was clicked (only when `search` is set) — you implement the behavior |
| `voice` | _(none)_ | The Mic button was clicked (only when `voice` is set) — you implement the behavior |

### `ChatMessage` schema

```ts
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: { text: string; label?: string };
  tools?: ToolPart[];
  attachments?: AttachmentData[];
  actions?: ChatMessageAction[];
}

type ChatMessageAction = 'copy' | 'like' | 'dislike' | 'regenerate' | 'edit';

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
```

### Example

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="./theme.css" />
</head>
<body style="height: 100vh; margin: 0;">
  <kitn-chat style="display: block; height: 100%;"></kitn-chat>

  <script type="module">
    import '@kitnai/chat/elements';

    const chat = document.querySelector('kitn-chat');

    chat.messages = [
      {
        id: '1',
        role: 'assistant',
        content: 'Hello! How can I help you today?',
        actions: ['copy', 'like', 'dislike']
      }
    ];

    chat.addEventListener('submit', async (e) => {
      const userText = e.detail.value;

      // Append user message
      chat.messages = [
        ...chat.messages,
        { id: Date.now().toString(), role: 'user', content: userText }
      ];
      chat.loading = true;

      // ... fetch assistant reply, then:
      // chat.messages = [...chat.messages, { id: ..., role: 'assistant', content: reply }];
      // chat.loading = false;
    });

    chat.addEventListener('messageaction', (e) => {
      console.log('action:', e.detail.action, 'on message:', e.detail.messageId);
    });
  </script>
</body>
</html>
```

---

## `<kitn-conversation-list>`

A sidebar panel that lists conversations, optionally grouped. Emits events for navigation and UI actions but does not manage its own state — the host is responsible for filtering and updating the lists.

### Properties

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| `groups` | `ConversationGroup[]` | `[]` | Named groups for organising conversations |
| `conversations` | `ConversationSummary[]` | `[]` | Flat list of all conversations |
| `activeId` | `string` | `undefined` | ID of the currently selected conversation |

### Events

| Event | `detail` shape | Description |
|-------|---------------|-------------|
| `select` | `{ id: string }` | Fired when the user clicks a conversation |
| `newchat` | _(none)_ | Fired when the user clicks the "New chat" button |
| `togglesidebar` | _(none)_ | Fired when the user clicks the sidebar toggle button |

### `ConversationGroup` and `ConversationSummary` schemas

```ts
interface ConversationGroup {
  id: string;
  userId?: string;
  teamId?: string;
  name: string;
  sortOrder: number;
  createdAt: string;  // ISO 8601
}

interface ConversationSummary {
  id: string;
  title: string;
  groupId?: string;         // links to ConversationGroup.id
  scope: ConversationScope;
  messageCount: number;
  lastMessageAt: string;    // ISO 8601
  updatedAt: string;        // ISO 8601
}

// ConversationScope (referenced by ConversationSummary)
interface ConversationScope {
  type: 'document' | 'collection';
  documentId?: string;
  filters?: {
    tags?: string[];
    authors?: string[];
    contentType?: 'transcript' | 'markdown';
    dateRange?: { from: string; to: string };
  };
}
```

### Example

```html
<kitn-conversation-list style="width: 260px; height: 100vh; display: block;"></kitn-conversation-list>

<script type="module">
  import '@kitnai/chat/elements';

  const list = document.querySelector('kitn-conversation-list');

  list.groups = [
    { id: 'g1', name: 'Projects', sortOrder: 0, createdAt: '2024-01-01T00:00:00Z' }
  ];

  list.conversations = [
    {
      id: 'c1',
      title: 'My first chat',
      groupId: 'g1',
      scope: { type: 'document' },
      messageCount: 4,
      lastMessageAt: '2024-06-01T12:00:00Z',
      updatedAt: '2024-06-01T12:00:00Z',
    }
  ];

  list.activeId = 'c1';

  list.addEventListener('select', (e) => {
    list.activeId = e.detail.id;
    console.log('navigate to conversation:', e.detail.id);
  });

  list.addEventListener('newchat', () => {
    console.log('user wants a new conversation');
  });

  list.addEventListener('togglesidebar', () => {
    console.log('user toggled sidebar');
  });
</script>
```

---

## `<kitn-prompt-input>`

A standalone prompt input with a send button. Use this when you want just the input area without the message list.

### Properties

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| `value` | `string` | `undefined` | Controlled input value; omit for uncontrolled |
| `placeholder` | `string` | `'Send a message...'` | Textarea placeholder text |
| `disabled` | `boolean` | `false` | Disables the textarea and send button |
| `loading` | `boolean` | `false` | Shows loading state (send button disabled) |
| `suggestions` | `string[]` | `undefined` | Suggestion chips shown above the input; clicking one fills the input and fires `suggestionclick` |

### Events

| Event | `detail` shape | Description |
|-------|---------------|-------------|
| `submit` | `{ value: string }` | Fired when the user submits (button click or Enter) |
| `valuechange` | `{ value: string }` | Fired on every input change |
| `suggestionclick` | `{ value: string }` | Fired when a suggestion chip is clicked (the input is also filled with the value) |

### Example

```html
<kitn-prompt-input placeholder="Ask anything..."></kitn-prompt-input>

<script type="module">
  import '@kitnai/chat/elements';

  const input = document.querySelector('kitn-prompt-input');

  input.addEventListener('submit', (e) => {
    console.log('submitted:', e.detail.value);
    input.loading = true;
    // ... do async work, then:
    // input.loading = false;
    // input.value = '';  // clear after send
  });

  input.addEventListener('valuechange', (e) => {
    console.log('current value:', e.detail.value);
  });
</script>
```

---

## Styling and Theming

Each element renders into its own Shadow DOM. This provides **full CSS isolation**:

- Tailwind classes used by the kit do not affect the host page.
- The host page's stylesheets do not bleed into the components.

### Design tokens

**The elements are self-themed.** Each element's Shadow DOM already contains the full compiled token set, so the components render correctly with **no host-side stylesheet required** — including light/dark via the `theme` attribute.

To **rebrand**, override any `--color-*` token on `:root` (or a parent element). Because inherited custom properties pierce the Shadow DOM boundary automatically, your overrides reach the components:

> **Note:** `@kitnai/chat/theme.css` is a **Tailwind v4 source file** (it uses `@theme`/`@custom-variant`), intended for `@import` inside a Tailwind build — *not* for loading directly via `<link>` (the browser ignores `@theme {}`, so no tokens would apply). For a plain HTML / CDN page you don't need it: the elements carry their own tokens; just set your `--color-*` overrides on `:root` directly. (A browser-ready compiled token stylesheet for `<link>` consumers is a planned addition.)

```css
:root {
  --color-background: #0f0f0f;
  --color-primary: #7c3aed;
  --color-muted: #1e1e1e;
}
```

No other host-side CSS configuration is required or supported — all layout and typography are encapsulated inside the shadow root.

---

## Code highlighting (on-demand, optional)

Syntax highlighting is powered by [Shiki](https://shiki.style), wired to be **as lightweight as possible**:

- **Nothing loads until a code block actually renders.** A chat with no code never fetches Shiki — zero bytes.
- **On-demand, per-language.** When a code block appears, only the Shiki core, the JavaScript regex engine (no WASM), the one theme, and the one language grammar it needs are fetched as small lazy chunks.
- **No WASM.** Uses Shiki's JavaScript engine, avoiding the ~620 KB Oniguruma WASM blob.

### Built-in languages

A deliberately small default set loads on demand: `bash`/`sh`, `javascript`/`js`, `html`, `css`, `json`. Anything else renders as plain text until you register it with `configureCodeHighlighting({ languages })` (below).

### Configure or disable

`configureCodeHighlighting()` is exported from both `@kitnai/chat` and `@kitnai/chat/elements`. Call it once before a code block of that language renders — the loader is consulted lazily, so it applies to the running app with **no rebuild**.

```js
import { configureCodeHighlighting } from '@kitnai/chat/elements';

// Bundler / npm consumers — your bundler resolves the import:
configureCodeHighlighting({
  languages: {
    ruby: () => import('@shikijs/langs/ruby'),
    swift: () => import('@shikijs/langs/swift'),
  },
  aliases: { rb: 'ruby' },
});
```

```js
// No-build / CDN consumers — point the loader at a CDN ESM URL so the grammar
// is fetched at runtime (no bundler needed):
import { configureCodeHighlighting } from 'https://unpkg.com/@kitnai/chat';
configureCodeHighlighting({
  languages: { python: () => import('https://esm.sh/@shikijs/langs@4/python') },
  aliases: { py: 'python' },
});

// Add a theme
configureCodeHighlighting({
  themes: { dracula: () => import('@shikijs/themes/dracula') },
});

// Or turn highlighting off entirely (no Shiki ever loads) — code renders as plain text
configureCodeHighlighting({ enabled: false });
```

Per-element, set `codeHighlight={false}` (e.g. on `<kitn-chat>`) to disable highlighting for just that element.
