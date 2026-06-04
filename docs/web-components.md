# Kitn Web Components

## Overview

`@kitn-ai/chat` ships three framework-agnostic custom elements built on the SolidJS kit:

| Tag | Purpose |
|-----|---------|
| `<kitn-chat>` | Full chat UI — message list plus prompt input |
| `<kitn-conversation-list>` | Sidebar conversation browser with group support |
| `<kitn-prompt-input>` | Standalone text-input area with send button |

Each element renders into its own **Shadow DOM** so the host page's CSS cannot leak in, and the kit's Tailwind classes cannot leak out. SolidJS and all kit dependencies are bundled inside the element bundle — the host does not need SolidJS.

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
import '@kitn-ai/chat/elements';
```

The `./elements` export in `package.json` resolves to `dist/kitn-chat.es.js`.

For plain HTML pages:

```html
<script type="module" src="./dist/kitn-chat.es.js"></script>
```

---

## Usage Pattern

All rich props (arrays, objects) must be set as **JavaScript properties**, not HTML attributes. Events are standard DOM `CustomEvent`s dispatched on the host element. They do **not** bubble and are **not** composed — listen directly on the element (`el.addEventListener(...)`).

```html
<script type="module">
  import '@kitn-ai/chat/elements';

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

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| `messages` | `ChatMessage[]` | `[]` | The full list of messages to display |
| `value` | `string` | `undefined` | Controlled input value; omit for uncontrolled |
| `placeholder` | `string` | `'Send a message...'` | Textarea placeholder text |
| `loading` | `boolean` | `false` | Shows loading state in the prompt input |
| `suggestions` | `string[]` | `undefined` | Suggestion chips shown above the input; clicking one fills the input and fires `suggestionclick` |
| `proseSize` | `ProseSize` | `'sm'` | Tailwind Typography prose size (`'xs'`, `'sm'`, `'base'`, `'lg'`) |
| `codeTheme` | `string` | `'github-dark-dimmed'` | Shiki syntax-highlight theme name |
| `codeHighlight` | `boolean` | `true` | Set `false` to render code blocks as plain text — no Shiki is loaded at all |

### Events

| Event | `detail` shape | Description |
|-------|---------------|-------------|
| `submit` | `{ value: string }` | Fired when the user submits a message |
| `valuechange` | `{ value: string }` | Fired on every input change |
| `suggestionclick` | `{ value: string }` | Fired when a suggestion chip is clicked (the input is also filled with the value) |
| `messageaction` | `{ messageId: string, action: ChatMessageAction }` | Fired when an action button on a message is clicked |

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
    import '@kitn-ai/chat/elements';

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
  import '@kitn-ai/chat/elements';

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
  import '@kitn-ai/chat/elements';

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

The kit's visual appearance is controlled by CSS custom properties defined in `theme.css`. Import it in your page to apply the default colour palette:

```html
<link rel="stylesheet" href="node_modules/@kitn-ai/chat/theme.css" />
```

Override any `--color-*` token on `:root` (or a parent element) to rebrand the components. Because Shadow DOM inherits inherited CSS properties, custom properties pierce the shadow boundary automatically:

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

A curated default set loads on demand: `javascript`/`js`, `jsx`, `typescript`/`ts`, `tsx`, `json`, `html`, `css`, `python`/`py`, `bash`/`sh`, `shellscript`/`shell`, `markdown`/`md`, `yaml`/`yml`, `sql`, `diff`, `go`, `rust`/`rs`. Languages outside this set render as plain text unless you register them.

### Configure or disable

`configureCodeHighlighting()` is exported from both `@kitn-ai/chat` and `@kitn-ai/chat/elements`. Call it once before rendering.

```js
import { configureCodeHighlighting } from '@kitn-ai/chat/elements';

// Add languages (each becomes its own lazy chunk, loaded on demand)
configureCodeHighlighting({
  languages: {
    ruby: () => import('@shikijs/langs/ruby'),
    swift: () => import('@shikijs/langs/swift'),
  },
  aliases: { rb: 'ruby' },
});

// Add a theme
configureCodeHighlighting({
  themes: { dracula: () => import('@shikijs/themes/dracula') },
});

// Or turn highlighting off entirely (no Shiki ever loads) — code renders as plain text
configureCodeHighlighting({ enabled: false });
```

Per-element, set `codeHighlight={false}` (e.g. on `<kitn-chat>`) to disable highlighting for just that element.
