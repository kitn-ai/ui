/** Empty / first-run state demo. Showcases a *composed* empty state:
 *  a <kc-empty> block (icon + headline + subtext) with <kc-suggestions>
 *  rendered INSIDE it (the default slot). Clicking a chip swaps the empty
 *  block for a live <kc-chat> and streams a canned assistant reply — the
 *  same streaming loop as the other Patterns/Examples islands. */
import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import { loadKit } from './example/kit';
import IconSparkles from '~icons/lucide/sparkles';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: string[];
}

const SUGGESTIONS = [
  'How do I add kitn-chat to a React app?',
  'Theme the components to match my brand',
  'Stream tokens from my own backend',
  'Render tool calls and citations',
];

const REPLIES: Record<string, string> = {
  'How do I add kitn-chat to a React app?':
    'Install the package, then import the React adapter:\n\n```bash\nnpm i @kitn.ai/chat\n```\n\n```tsx\nimport { Chat } from \'@kitn.ai/chat/react\';\n\nexport default function App() {\n  return <Chat messages={messages} onSubmit={send} />;\n}\n```\n\nThe adapter wraps the same `kc-*` web components, so every prop and event maps straight through.',
  'Theme the components to match my brand':
    'Every component reads from design tokens, so one block of CSS custom properties restyles the whole kit:\n\n```css\n:root {\n  --color-brand: oklch(0.62 0.21 13);\n  --color-surface: oklch(0.99 0 0);\n  --radius: 0.75rem;\n}\n```\n\nNo shadow-piercing and no per-component overrides — set the tokens once and every `kc-*` element follows.',
  'Stream tokens from my own backend':
    'Listen for `kc-submit`, append a placeholder assistant message, then patch its `content` as chunks arrive:\n\n```js\nchat.addEventListener(\'kc-submit\', async (e) => {\n  const id = crypto.randomUUID();\n  chat.messages = [...chat.messages, { id, role: \'assistant\', content: \'\' }];\n  for await (const token of stream(e.detail.value)) {\n    chat.messages = chat.messages.map((m) =>\n      m.id === id ? { ...m, content: m.content + token } : m,\n    );\n  }\n});\n```\n\nReassigning the `messages` array is what triggers the re-render — mutate-and-reassign, never mutate in place.',
  'Render tool calls and citations':
    'Messages carry structured fields beyond `content`. Set `reasoning` for chain-of-thought, `tools` for tool invocations, and pair `<kc-chat>` with `<kc-sources>` for numbered citations:\n\n```js\nmsg.tools = [{ name: \'search\', state: \'done\', result: \'…\' }];\nsources.numbered = true;\nsources.sources = [{ href, title }];\n```\n\nEach renders in its own collapsible, theme-aware block — no extra wiring.',
};

const DEFAULT_REPLY =
  "Here's the short version: kitn-chat is a set of framework-agnostic web components, each isolated in its own Shadow DOM so styles never leak. You bring the model; the UI — streaming, markdown, tool calls — is handled for you.";

let uid = 0;
const nextId = () => `e${++uid}`;

export default function EmptyStateDemo() {
  let host: (HTMLElement & { messages?: ChatMessage[]; [k: string]: unknown }) | undefined;
  let suggestionsEl: (HTMLElement & { suggestions?: string[]; [k: string]: unknown }) | undefined;
  const [started, setStarted] = createSignal(false);
  let timer: number | undefined;

  const theme = () => document.documentElement.dataset.theme || 'light';

  const stream = (prompt: string) => {
    if (!host) return;
    const reply = REPLIES[prompt] ?? DEFAULT_REPLY;
    const aId = nextId();
    host.messages = [
      ...(host.messages ?? []),
      { id: nextId(), role: 'user', content: prompt },
      { id: aId, role: 'assistant', content: '' },
    ];
    (host as any).loading = true;
    const words = reply.split(/(\s+)/);
    let i = 0;
    clearTimeout(timer);
    const tick = () => {
      i += 2;
      const partial = words.slice(0, i).join('');
      const done = i >= words.length;
      host!.messages = (host!.messages ?? []).map((m) =>
        m.id === aId ? { ...m, content: partial, ...(done ? { actions: ['copy', 'like', 'dislike'] } : {}) } : m,
      );
      if (!done) timer = window.setTimeout(tick, 38);
      else (host as any).loading = false;
    };
    timer = window.setTimeout(tick, 240);
  };

  // Start the conversation from a suggestion clicked inside the empty block.
  const start = (prompt: string) => {
    if (!prompt || started()) return;
    setStarted(true);
    // Wait for <kc-chat> to mount, then seed + stream.
    queueMicrotask(() => {
      if (!host) return;
      customElements.upgrade(host);
      host.messages = [];
      host.setAttribute('theme', theme());
      stream(prompt);
    });
  };

  const onSuggestionSelect = (e: Event) => start((e as CustomEvent).detail?.value?.trim());
  const onChatSubmit = (e: Event) => {
    const text = (e as CustomEvent).detail?.value?.trim();
    if (text) stream(text);
  };

  onMount(async () => {
    await loadKit();
    if (suggestionsEl) {
      customElements.upgrade(suggestionsEl);
      suggestionsEl.suggestions = SUGGESTIONS;
    }
    const obs = new MutationObserver(() => host?.setAttribute('theme', theme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    onCleanup(() => {
      clearTimeout(timer);
      suggestionsEl?.removeEventListener('kc-select', onSuggestionSelect);
      host?.removeEventListener('kc-submit', onChatSubmit);
      obs.disconnect();
    });
  });

  return (
    <div class="not-content my-5 overflow-hidden rounded-xl border border-line bg-surface" style={{ height: '560px' }}>
      <Show
        when={started()}
        fallback={
          <div style={{ height: '100%', display: 'flex', 'align-items': 'center', 'justify-content': 'center', padding: '24px' }}>
            {/* @ts-expect-error custom element */}
            <kc-empty
              empty-title="Hi, I'm your assistant"
              description="Ask me anything about kitn-chat — or pick a starter below to begin."
              style={{ display: 'block', width: '100%', 'max-width': '34rem' }}
            >
              <IconSparkles slot="media" style={{ width: '1.5rem', height: '1.5rem' }} />
              {/* Suggestions live in the empty block's default slot (EmptyContent),
                  so the chips are part of the first-run composition itself. */}
              {/* @ts-expect-error custom element */}
              <kc-suggestions
                ref={(el: HTMLElement) => {
                  suggestionsEl = el as any;
                  el.addEventListener('kc-select', onSuggestionSelect);
                }}
                variant="outline"
                style={{ display: 'block', 'margin-top': '0.5rem' }}
              />
            </kc-empty>
          </div>
        }
      >
        {/* @ts-expect-error custom element */}
        <kc-chat
          ref={(el: HTMLElement) => {
            host = el as any;
            el.addEventListener('kc-submit', onChatSubmit);
          }}
          chat-title="Assistant"
          placeholder="Ask a follow-up…"
          style={{ display: 'block', height: '100%' }}
        />
      </Show>
    </div>
  );
}
