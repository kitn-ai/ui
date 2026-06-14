import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, onMount, For, type JSX } from 'solid-js';
import './register'; // side effect: registers the custom elements
import {
  conversations,
  context,
  models,
  slashCommands,
  thread,
} from '../stories/examples/sample-data';
import type { ArtifactFile } from '../components/artifact';

/**
 * Examples / Composed chat shell — THE headline. A real chat assembled from leaf
 * `kc-*` components inside a `<kc-resizable>` layout, wired with sample data +
 * event handlers in the story script. Paired with the `<kc-chat>` drop-in so the
 * "batteries-included vs compose-your-own — when do I use which?" contrast is
 * explicit. Both stories are source-visible (Show code).
 */

type AnyEl = HTMLElement & Record<string, unknown>;
/** Set JS properties (objects/arrays) on an element. */
const setProps = (el: HTMLElement, props: Record<string, unknown>) => {
  for (const k in props) (el as AnyEl)[k] = props[k];
};
/** Set string/boolean attributes on an element. */
const setAttrs = (el: HTMLElement, a: Record<string, string | boolean>) => {
  for (const k in a) {
    const v = a[k];
    if (v === false) el.removeAttribute(k);
    else el.setAttribute(k, v === true ? '' : v);
  }
};

const BASE = '/artifact-fixtures'; // served by .storybook/main.ts staticDirs

const ARTIFACT_FILES: ArtifactFile[] = [
  {
    path: 'index.html',
    url: `${BASE}/index.html`,
    type: 'html',
    language: 'html',
    code: '<!DOCTYPE html>\n<html><head><title>Starboard</title></head>\n<body><h1>Starboard</h1></body></html>',
  },
  { path: 'css/site.css', url: `${BASE}/css/site.css`, type: 'other', language: 'css', code: 'body { font-family: system-ui; }' },
  { path: 'assets/logo.svg', url: `${BASE}/assets/logo.svg`, type: 'image' },
];

/** A bordered frame the shell fills. */
function Frame(props: { children: JSX.Element; height?: string }) {
  return (
    <div
      style={{
        height: props.height ?? '560px',
        width: '100%',
        border: '1px solid var(--color-border, #e4e4e7)',
        'border-radius': '12px',
        overflow: 'hidden',
      }}
    >
      {props.children}
    </div>
  );
}

const meta = {
  title: 'Examples/Composed chat shell',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: [
          '# Build your own chat',
          'Two ways to ship a chat, side by side:',
          '- **Compose your own** (`Composed shell`) — a `<kc-resizable>` laying out `<kc-conversations>` │ a chat column (`<kc-message>` list + `<kc-context>` meter + `<kc-prompt-input>` + `<kc-suggestions>`) │ `<kc-artifact>`. You own the data flow and event wiring; you control every panel. **Reach for this when the flagship doesn\'t fit** — custom layout, an inspector/canvas panel, bespoke header.',
          '- **Batteries-included** (`Drop-in <kc-chat>`) — the whole chat surface in one tag. Set `messages`, listen for `submit`. **Reach for this for the 90% path** — a working chat in minutes.',
          'Same leaf components underneath; the flagship just pre-wires them. See **Examples / Choosing components** for the full decision guide.',
          'Both stories are source-visible — open **Show code** to read the exact composition + wiring.',
        ].join('\n\n'),
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// ── B1 · Composed shell ──────────────────────────────────────────────────────

const SHELL_SNIPPET = `<!-- Compose-your-own chat: a resizable shell built from leaf components -->
<kc-resizable orientation="horizontal" style="display:block;height:560px">
  <!-- start: conversation list -->
  <kc-resizable-item size="22%" min="180px" max="40%">
    <kc-conversations id="list" style="display:block;height:100%"></kc-conversations>
  </kc-resizable-item>

  <!-- main: the chat column (scrolling messages + meter + composer) -->
  <kc-resizable-item>
    <div class="chat-col">
      <div class="messages" id="messages"></div>     <!-- <kc-message> per turn -->
      <kc-context id="ctx"></kc-context>
      <kc-suggestions id="suggs"></kc-suggestions>
      <kc-prompt-input id="input" search voice></kc-prompt-input>
    </div>
  </kc-resizable-item>

  <!-- end: artifact/preview panel (toggle with the 'hidden' attribute) -->
  <kc-resizable-item size="32%" min="240px">
    <kc-artifact id="artifact" style="display:block;height:100%"></kc-artifact>
  </kc-resizable-item>
</kc-resizable>

<script type="module">
  import '@kitn.ai/chat/elements';

  // — data in via properties —
  const list = document.getElementById('list');
  list.conversations = [/* … */];
  list.activeId = 'c1';

  const ctx = document.getElementById('ctx');
  ctx.context = { usedTokens: 48200, maxTokens: 200000 };

  const suggs = document.getElementById('suggs');
  suggs.suggestions = ['Summarize this thread', 'What changed in v0.3?'];

  const input = document.getElementById('input');
  input.slashCommands = [{ id: 'summarize', label: '/summarize', category: 'Actions' }];

  const artifact = document.getElementById('artifact');
  artifact.src = 'https://your-backend.example/artifacts/abc/index.html';
  artifact.files = [{ path: 'index.html', url: '…', type: 'html', code: '…' }];

  // render the message list yourself (you own the thread state)
  const messages = document.getElementById('messages');
  let thread = [/* { id, role, content, … } */];
  const render = () => {
    messages.innerHTML = '';
    for (const m of thread) {
      const el = document.createElement('kc-message');
      el.message = m;
      messages.append(el);
    }
  };
  render();

  // — interactions out via events —
  list.addEventListener('select', (e) => (list.activeId = e.detail.id));
  suggs.addEventListener('select', (e) => (input.value = e.detail.value));
  input.addEventListener('submit', (e) => {
    thread = [...thread, { id: Date.now() + '', role: 'user', content: e.detail.value }];
    render();
    // …call your backend, append the assistant reply, re-render…
  });
</script>`;

export const ComposedShell: Story = {
  name: 'Composed shell',
  render: () => {
    const [messages, setMessages] = createSignal<Record<string, unknown>[]>(thread);
    let list!: HTMLElement, ctx!: HTMLElement, suggs!: HTMLElement, input!: HTMLElement, artifact!: HTMLElement;
    const msgRefs: HTMLElement[] = [];

    onMount(() => {
      setProps(list, { conversations, activeId: 'c1' });
      list.addEventListener('select', (e) => ((list as AnyEl).activeId = (e as CustomEvent).detail.id));
      setProps(ctx, { context });
      setProps(suggs, { suggestions: ['Summarize this thread', 'What changed in v0.3?', 'Show me the layout code'] });
      suggs.addEventListener('select', (e) => ((input as AnyEl).value = (e as CustomEvent).detail.value));
      setProps(input, { slashCommands });
      setAttrs(input, { search: true, voice: true, placeholder: 'Message the assistant…' });
      input.addEventListener('submit', (e) => {
        const value = (e as unknown as CustomEvent).detail.value as string;
        if (!value) return;
        setMessages((m) => [...m, { id: Date.now() + '', role: 'user', content: value }]);
        (input as AnyEl).value = '';
        setTimeout(() => {
          setMessages((m) => [
            ...m,
            { id: Date.now() + 'a', role: 'assistant', content: 'Echo: ' + value, actions: ['copy'] },
          ]);
        }, 500);
      });
      setProps(artifact, { src: `${BASE}/index.html`, files: ARTIFACT_FILES });
      setAttrs(artifact, { 'iframe-title': 'Artifact preview' });
    });

    // Keep each <kc-message>'s `message` property in sync as the thread grows.
    const syncMessages = () => {
      const list = messages();
      list.forEach((m, i) => {
        if (msgRefs[i]) (msgRefs[i] as AnyEl).message = m;
      });
    };

    return (
      <Frame>
        <kc-resizable orientation="horizontal">
          <kc-resizable-item size="22%" min="180px" max="40%">
            <kc-conversations ref={(e) => (list = e)} style={{ display: 'block', height: '100%' }} />
          </kc-resizable-item>

          <kc-resizable-item>
            <div style={{ height: '100%', display: 'flex', 'flex-direction': 'column', 'min-height': '0' }}>
              <div
                style={{
                  flex: '1',
                  'min-height': '0',
                  'overflow-y': 'auto',
                  padding: '16px',
                  display: 'flex',
                  'flex-direction': 'column',
                  gap: '12px',
                }}
              >
                <For each={messages()}>
                  {(m, i) => (
                    <kc-message
                      ref={(e) => {
                        msgRefs[i()] = e;
                        (e as AnyEl).message = m;
                        queueMicrotask(syncMessages);
                      }}
                    />
                  )}
                </For>
              </div>
              <div
                style={{
                  'border-top': '1px solid var(--color-border, #e4e4e7)',
                  padding: '12px 16px',
                  display: 'flex',
                  'flex-direction': 'column',
                  gap: '8px',
                }}
              >
                <kc-context ref={(e) => (ctx = e)} />
                <kc-suggestions ref={(e) => (suggs = e)} />
                <kc-prompt-input ref={(e) => (input = e)} />
              </div>
            </div>
          </kc-resizable-item>

          <kc-resizable-item size="32%" min="240px">
            <kc-artifact ref={(e) => (artifact = e)} style={{ display: 'block', height: '100%' }} />
          </kc-resizable-item>
        </kc-resizable>
      </Frame>
    );
  },
  parameters: { docs: { source: { code: SHELL_SNIPPET, language: 'html' } } },
};

// ── B2 · Drop-in <kc-chat> ───────────────────────────────────────────────────

const DROPIN_SNIPPET = `<!-- Batteries-included: the whole chat surface in one tag -->
<kc-chat id="chat" chat-title="Assistant" search voice
  style="display:block;height:560px"></kc-chat>

<script type="module">
  import '@kitn.ai/chat/elements';

  const chat = document.getElementById('chat');
  chat.models = [{ id: 'opus', name: 'Claude Opus', provider: 'Anthropic' }];
  chat.currentModel = 'opus';
  chat.context = { usedTokens: 48200, maxTokens: 200000 };
  chat.suggestions = ['Summarize this thread', 'What changed in v0.3?'];
  chat.messages = [
    { id: '1', role: 'assistant', content: "Hi! I'm the drop-in <kc-chat>. Ask me anything.",
      actions: ['copy', 'like', 'dislike'] },
  ];

  chat.addEventListener('submit', (e) => {
    chat.messages = [...chat.messages, { id: Date.now() + '', role: 'user', content: e.detail.value }];
    chat.loading = true;
    // …call your backend, then append the reply and clear loading…
  });
  chat.addEventListener('modelchange', (e) => (chat.currentModel = e.detail.modelId));
</script>`;

export const DropInChat: Story = {
  name: 'Drop-in <kc-chat>',
  render: () => {
    let chat!: HTMLElement;
    onMount(() => {
      setProps(chat, {
        models,
        currentModel: 'opus',
        context,
        suggestions: ['Summarize this thread', 'What changed in v0.3?'],
        messages: [
          { id: '1', role: 'assistant', content: "Hi! I'm the **drop-in** `<kc-chat>`. Ask me anything.", actions: ['copy', 'like', 'dislike'] },
        ],
      });
      setAttrs(chat, { 'chat-title': 'Assistant', search: true, voice: true });
      chat.addEventListener('submit', (e) => {
        const value = (e as unknown as CustomEvent).detail.value as string;
        const cur = (chat as AnyEl).messages as unknown[];
        (chat as AnyEl).messages = [...cur, { id: Date.now() + '', role: 'user', content: value }];
        (chat as AnyEl).loading = true;
        setTimeout(() => {
          const cur2 = (chat as AnyEl).messages as unknown[];
          (chat as AnyEl).messages = [...cur2, { id: Date.now() + 'a', role: 'assistant', content: 'Echo: ' + value, actions: ['copy'] }];
          (chat as AnyEl).loading = false;
        }, 600);
      });
      chat.addEventListener('modelchange', (e) => ((chat as AnyEl).currentModel = (e as CustomEvent).detail.modelId));
    });
    return (
      <Frame>
        <kc-chat ref={(e) => (chat = e)} style={{ display: 'block', height: '100%' }} />
      </Frame>
    );
  },
  parameters: { docs: { source: { code: DROPIN_SNIPPET, language: 'html' } } },
};
