# @kitn-ai/ai-elements

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
npm install @kitn-ai/ai-elements
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
    import '@kitn-ai/ai-elements/elements';

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
} from '@kitn-ai/ai-elements';
import '@kitn-ai/ai-elements/theme.css';

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

## Integrations

The components are deliberately **transport-agnostic**: `<kitn-chat>` just renders the `messages` array you give it and emits a `submit` event when the user sends. You own the request, the streaming, and any extras like text-to-speech. The patterns below use the web component, but the same wiring applies to the SolidJS API.

### Streaming responses from OpenRouter

[OpenRouter](https://openrouter.ai) exposes an OpenAI-compatible streaming API (Server-Sent Events). On `submit`, append the user message + an empty assistant message, then grow the assistant message as tokens arrive.

> **Security:** never ship your API key to the browser. In production, point `fetch` at your own backend endpoint that proxies to OpenRouter and injects the key. The parsing below is identical either way.

```html
<kitn-chat id="chat" style="display:block; height:100vh;"></kitn-chat>

<script type="module">
  import '@kitn-ai/ai-elements/elements';

  const chat = document.getElementById('chat');
  chat.messages = [];

  chat.addEventListener('submit', async (e) => {
    const text = e.detail.value.trim();
    if (!text) return;

    // 1. Show the user message immediately
    const history = [...chat.messages, { id: crypto.randomUUID(), role: 'user', content: text }];
    chat.messages = history;
    chat.value = '';        // clear the input
    chat.loading = true;

    // 2. Add an empty assistant message we'll stream into
    const assistantId = crypto.randomUUID();
    chat.messages = [...history, { id: assistantId, role: 'assistant', content: '' }];

    try {
      // In production, replace this URL with your own proxy endpoint.
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`, // server-side in production!
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-sonnet-4',
          stream: true,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let answer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by newlines; each data line is JSON
        const lines = buffer.split('\n');
        buffer = lines.pop();               // keep the partial last line
        for (const line of lines) {
          const s = line.trim();
          if (!s.startsWith('data:')) continue;  // skip ": keep-alive" comments
          const payload = s.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const delta = JSON.parse(payload).choices?.[0]?.delta?.content;
            if (!delta) continue;
            answer += delta;
            // Replace the assistant message with a NEW object so the row re-renders
            chat.messages = chat.messages.map((m) =>
              m.id === assistantId ? { ...m, content: answer } : m
            );
          } catch { /* ignore non-JSON keep-alive lines */ }
        }
      }
    } catch (err) {
      chat.messages = chat.messages.map((m) =>
        m.id === assistantId ? { ...m, content: '⚠️ ' + err.message } : m
      );
    } finally {
      chat.loading = false;
    }
  });
</script>
```

Key point: reassign `chat.messages` with a **new array containing a new object** for the streaming message on each chunk — that's what triggers the re-render. Mutating the existing object in place won't update the view.

### Text-to-speech (TTS)

#### Option 1 — Browser-native (zero dependencies)

The Web Speech API speaks text with no network call. Speak each assistant reply once it finishes streaming — call `speak(answer)` right before `chat.loading = false` in the example above:

```js
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'en-US';
  utter.rate = 1;
  speechSynthesis.cancel();   // stop anything already playing
  speechSynthesis.speak(utter);
}
```

To speak *as it streams*, flush complete sentences instead of waiting for the end:

```js
let spokenUpTo = 0;
function speakIncremental(fullText) {
  const lastBreak = fullText.lastIndexOf('. ', fullText.length);
  if (lastBreak > spokenUpTo) {
    speak(fullText.slice(spokenUpTo, lastBreak + 1));
    spokenUpTo = lastBreak + 1;
  }
}
// call speakIncremental(answer) inside the streaming loop
```

#### Option 2 — Cloud TTS (OpenAI, ElevenLabs, …)

For higher-quality voices, have your backend call a TTS API and return audio, then play it. Keep the provider key on the server.

```js
async function speakCloud(text) {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice: 'alloy' }),
  });
  const audio = new Audio(URL.createObjectURL(await res.blob()));
  audio.play();
}
```

```js
// Example backend (Node) — /api/tts proxying OpenAI's speech endpoint
// const r = await openai.audio.speech.create({ model: 'gpt-4o-mini-tts', voice, input: text });
// res.setHeader('Content-Type', 'audio/mpeg');
// Readable.fromWeb(r.body).pipe(res);
```

You can trigger either option from the streaming completion (auto-read replies) or from a button you render alongside each message.

> **Speech-to-text** (the other direction) is already built in — the kit ships a `VoiceInput` component for capturing microphone input. See Storybook (`npm run dev`).

## Code highlighting (optional, on-demand)

Syntax highlighting uses [Shiki](https://shiki.style) and is wired to be as light as possible:

- Nothing loads until a fenced code block actually renders.
- Only the core, the **JavaScript regex engine (no WASM)**, the one theme, and the one language grammar needed are fetched — each a small lazy chunk.
- Default languages: `javascript`/`js`, `typescript`/`ts`, `tsx`, `json`, `bash`/`sh`. Add more or turn it off:

```js
import { configureCodeHighlighting } from '@kitn-ai/ai-elements/elements'; // or '@kitn-ai/ai-elements'

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

For SolidJS usage, import `@kitn-ai/ai-elements/theme.css` once. For web components the kit's CSS is injected into each shadow root automatically; only `theme.css` (design tokens) is optional to include.

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
