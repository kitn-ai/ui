# @kitn-ai/chat

A SolidJS component kit for building AI chat interfaces — message threads, prompt inputs, streaming responses, markdown + code rendering, reasoning/tool panels, attachments, and a conversation sidebar.

It can be consumed two ways:

1. **As SolidJS components** — import the components directly into a SolidJS app for full compositional control.
2. **As framework-agnostic web components** — drop `<kitn-chat>`, `<kitn-conversation-list>`, and `<kitn-prompt-input>` into any project (React, Vue, plain HTML). Each is fully style-isolated via Shadow DOM; SolidJS is bundled in, so the host needs nothing.

## Highlights

- **~50 composable components** across three layers: headless primitives → UI primitives (built on [Kobalte](https://kobalte.dev)) → AI feature components.
- **Shadow-DOM web components** — zero CSS conflicts in any host. The host's styles can't leak in; the kit's Tailwind can't leak out.
- **Lightweight by design** — a markdown-only `<kitn-chat>` is **~61 KB gzip** (one file). Syntax highlighting (Shiki) is loaded **on demand, per-language, with no WASM** — and never loads at all if you don't render code.
- **Tailwind v4** design tokens — rebrand by overriding `--color-*` custom properties.

## Install

```bash
npm install @kitn-ai/chat
```

SolidJS consumers also need `solid-js` (a peer dependency):

```bash
npm install solid-js
```

## Quick start

### Option A — Web components (any framework / plain HTML)

Build the bundle, then import it as a side-effect (it registers the custom elements):

```bash
npm run build   # emits dist/kitn-chat.es.js
```

```html
<body style="height: 100vh; margin: 0;">
  <kitn-chat style="display:block; height:100%;"></kitn-chat>

  <script type="module">
    import '@kitn-ai/chat/elements';

    const chat = document.querySelector('kitn-chat');

    // Rich data is set as JS properties (not HTML attributes)
    chat.messages = [
      { id: '1', role: 'assistant', content: 'Hello! How can I help?' },
    ];

    // Events are CustomEvents dispatched on the element (they do not bubble)
    chat.addEventListener('submit', (e) => {
      console.log('user sent:', e.detail.value);
    });
  </script>
</body>
```

The element bundle is **ES-module only** and loads via `<script type="module">` in every modern browser. See **[docs/web-components.md](docs/web-components.md)** for the full element API (every property, event, and the `ChatMessage` schema).

### Option B — SolidJS components

```tsx
import {
  ChatConfig, ChatContainer, ChatContainerContent,
  Message, MessageContent,
  PromptInput, PromptInputTextarea, PromptInputActions,
} from '@kitn-ai/chat';
import '@kitn-ai/chat/theme.css';

function App() {
  const [input, setInput] = createSignal('');
  return (
    <ChatConfig proseSize="sm">
      <ChatContainer class="h-full">
        <ChatContainerContent class="space-y-4 p-4">
          <Message>
            <MessageContent markdown>{`## Hi\n\nAsk me anything.`}</MessageContent>
          </Message>
        </ChatContainerContent>
      </ChatContainer>
      <PromptInput value={input()} onValueChange={setInput} onSubmit={() => setInput('')}>
        <PromptInputTextarea placeholder="Ask anything..." />
        <PromptInputActions>{/* your buttons */}</PromptInputActions>
      </PromptInput>
    </ChatConfig>
  );
}
```

The SolidJS entry (`.`) is the kit's raw source (`src/index.ts`) — your bundler compiles it, so it tree-shakes to just what you import.

## Code highlighting (optional, on-demand)

Syntax highlighting uses [Shiki](https://shiki.style) and is wired to be as light as possible:

- Nothing loads until a fenced code block actually renders.
- Only the core, the **JavaScript regex engine (no WASM)**, the one theme, and the one language grammar needed are fetched — each a small lazy chunk.
- Default languages: `javascript`/`js`, `typescript`/`ts`, `tsx`, `json`, `bash`/`sh`. Add more or turn it off:

```js
import { configureCodeHighlighting } from '@kitn-ai/chat/elements'; // or '@kitn-ai/chat'

configureCodeHighlighting({
  languages: { python: () => import('@shikijs/langs/python') },
});

// or disable entirely — no Shiki ever loads:
configureCodeHighlighting({ enabled: false });
```

Per element: `<kitn-chat codeHighlight={false}>` renders code as plain text.

## Theming

Visual appearance is driven by `--color-*` CSS custom properties in `theme.css`. Because inherited CSS pierces the Shadow DOM boundary, overriding tokens on `:root` rebrands the components — even the web-component ones:

```css
:root {
  --color-background: #0f0f0f;
  --color-primary: #7c3aed;
  --color-muted: #1e1e1e;
}
```

For SolidJS usage, import `@kitn-ai/chat/theme.css` once. For web components the kit's CSS is injected into each shadow root automatically; only `theme.css` (design tokens) is optional to include.

## Development

```bash
npm install          # install dependencies
npm run dev          # Storybook dev server at http://localhost:6006 (component playground)
npm test             # run the test suite (Vitest: jsdom unit tests + Storybook browser tests)
npm run build        # build the web-component bundle into dist/
npm run build-storybook   # static Storybook build
```

Storybook is the primary way to explore and develop components in isolation.

### Project structure

```
src/
  primitives/    Headless logic hooks + ChatConfig + on-demand highlighter
  ui/            UI primitives (Button, Dialog, Tooltip, … built on Kobalte)
  components/    AI feature components (Message, PromptInput, Markdown, Tool, …)
  elements/      Web-component facades + defineKitnElement wrapper + Vite lib entry
  stories/       Composed example stories (full chat app, layouts)
theme.css        Design tokens (--color-*), animations, markdown styles
docs/
  web-components.md   Full web-component API reference
```

The web-component layer wraps a few coarse facades over the SolidJS components; the SolidJS API stays the source of truth and is unchanged by it.

## Bundle size

| Scenario | Loaded |
|---|--:|
| `<kitn-chat>`, markdown only (no code blocks) | **~61 KB gzip** (~276 KB raw), one file |
| + a code block | adds Shiki core + JS engine + that language + theme, lazily |
| Highlighting disabled | Shiki never loads |

The build is ES-module only — a UMD/IIFE build can't code-split and would inline every lazy chunk into one multi-MB file, so it's intentionally omitted.
