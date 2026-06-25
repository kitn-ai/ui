import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, onMount, For, type JSX } from 'solid-js';
import './register'; // side effect: registers the custom elements
import {
  conversations,
  context,
  models,
  entityTriggers,
  thread,
} from '../stories/examples/sample-data';
import type { ArtifactFile } from '../components/artifact';

/**
 * Examples / Composed chat shell — THE headline. A real chat assembled from leaf
 * `kai-*` components inside a `<kai-resizable>` layout, wired with sample data +
 * event handlers in the story script. Paired with the `<kai-chat>` drop-in so the
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

const BASE = new URL('artifact-fixtures', document.baseURI).href; // served by .storybook/main.ts staticDirs

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
          '- **Compose your own** (`Composed shell`) — a `<kai-resizable>` laying out `<kai-conversations>` │ a chat column (`<kai-message>` list + `<kai-context>` meter + `<kai-prompt-input>` + `<kai-suggestions>`) │ `<kai-artifact>`. You own the data flow and event wiring; you control every panel. **Reach for this when the flagship doesn\'t fit** — custom layout, an inspector/canvas panel, bespoke header.',
          '- **Batteries-included** (`Drop-in <kai-chat>`) — the whole chat surface in one tag. Set `messages`, listen for `submit`. **Reach for this for the 90% path** — a working chat in minutes.',
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
<kai-resizable orientation="horizontal" style="display:block;height:560px">
  <!-- start: conversation list -->
  <kai-resizable-item size="22%" min="180px" max="40%">
    <kai-conversations id="list" style="display:block;height:100%"></kai-conversations>
  </kai-resizable-item>

  <!-- main: the chat column (scrolling messages + meter + composer) -->
  <kai-resizable-item>
    <div class="chat-col">
      <div class="messages" id="messages"></div>     <!-- <kai-message> per turn -->
      <kai-context id="ctx"></kai-context>
      <kai-suggestions id="suggs"></kai-suggestions>
      <kai-prompt-input id="input" search voice></kai-prompt-input>
    </div>
  </kai-resizable-item>

  <!-- end: artifact/preview panel (toggle with the 'hidden' attribute) -->
  <kai-resizable-item size="32%" min="240px">
    <kai-artifact id="artifact" style="display:block;height:100%"></kai-artifact>
  </kai-resizable-item>
</kai-resizable>

<script type="module">
  import '@kitn.ai/ui/elements';

  // — data in via properties —
  const list = document.getElementById('list');
  list.conversations = [/* … */];
  list.activeId = 'c1';

  const ctx = document.getElementById('ctx');
  ctx.context = { usedTokens: 48200, maxTokens: 200000 };

  const suggs = document.getElementById('suggs');
  suggs.suggestions = ['Summarize this thread', 'What changed in v0.3?'];

  const input = document.getElementById('input');
  // entity-pill triggers: / inserts a skill, @ inserts an agent
  input.triggers = [
    { char: '/', kind: 'skill', items: [{ id: 'summarize', label: 'Summarize', description: 'Summarize the thread' }] },
    { char: '@', kind: 'agent', items: [{ id: 'code-reviewer', label: 'Code Reviewer', group: 'Agents' }] },
  ];

  const artifact = document.getElementById('artifact');
  artifact.src = 'https://your-backend.example/artifacts/abc/index.html';
  artifact.files = [{ path: 'index.html', url: '…', type: 'html', code: '…' }];

  // render the message list yourself (you own the thread state)
  const messages = document.getElementById('messages');
  let thread = [/* { id, role, content, … } */];
  const render = () => {
    messages.innerHTML = '';
    for (const m of thread) {
      const el = document.createElement('kai-message');
      el.message = m;
      messages.append(el);
    }
  };
  render();

  // — interactions out via events —
  list.addEventListener('kai-conversation-select', (e) => (list.activeId = e.detail.id));
  suggs.addEventListener('kai-select', (e) => (input.value = e.detail.value));
  input.addEventListener('kai-submit', (e) => {
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
      list.addEventListener('kai-conversation-select', (e) => ((list as AnyEl).activeId = (e as CustomEvent).detail.id));
      setProps(ctx, { context });
      setProps(suggs, { suggestions: ['Summarize this thread', 'What changed in v0.3?', 'Show me the layout code'] });
      suggs.addEventListener('kai-select', (e) => ((input as AnyEl).value = (e as CustomEvent).detail.value));
      setProps(input, { triggers: entityTriggers });
      setAttrs(input, { search: true, voice: true, placeholder: 'Message the assistant…' });
      input.addEventListener('kai-submit', (e) => {
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

    // Keep each <kai-message>'s `message` property in sync as the thread grows.
    const syncMessages = () => {
      const list = messages();
      list.forEach((m, i) => {
        if (msgRefs[i]) (msgRefs[i] as AnyEl).message = m;
      });
    };

    return (
      <Frame>
        <kai-resizable orientation="horizontal">
          <kai-resizable-item size="22%" min="180px" max="40%">
            <kai-conversations ref={(e) => (list = e)} style={{ display: 'block', height: '100%' }} />
          </kai-resizable-item>

          <kai-resizable-item>
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
                    <kai-message
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
                <kai-context ref={(e) => (ctx = e)} />
                <kai-suggestions ref={(e) => (suggs = e)} />
                <kai-prompt-input ref={(e) => (input = e)} />
              </div>
            </div>
          </kai-resizable-item>

          <kai-resizable-item size="32%" min="240px">
            <kai-artifact ref={(e) => (artifact = e)} style={{ display: 'block', height: '100%' }} />
          </kai-resizable-item>
        </kai-resizable>
      </Frame>
    );
  },
  parameters: { docs: { source: { code: SHELL_SNIPPET, language: 'html' } } },
};

// ── B2 · Drop-in <kai-chat> ───────────────────────────────────────────────────

const DROPIN_SNIPPET = `<!-- Batteries-included: the whole chat surface in one tag -->
<kai-chat id="chat" chat-title="Assistant" search voice
  style="display:block;height:560px"></kai-chat>

<script type="module">
  import '@kitn.ai/ui/elements';

  const chat = document.getElementById('chat');
  chat.models = [{ id: 'opus', name: 'Claude Opus', provider: 'Anthropic' }];
  chat.currentModel = 'opus';
  chat.context = { usedTokens: 48200, maxTokens: 200000 };
  chat.suggestions = ['Summarize this thread', 'What changed in v0.3?'];
  chat.messages = [
    { id: '1', role: 'assistant', content: "Hi! I'm the drop-in <kai-chat>. Ask me anything.",
      actions: ['copy', 'like', 'dislike'] },
  ];

  chat.addEventListener('kai-submit', (e) => {
    chat.messages = [...chat.messages, { id: Date.now() + '', role: 'user', content: e.detail.value }];
    chat.loading = true;
    // …call your backend, then append the reply and clear loading…
  });
  chat.addEventListener('kai-model-change', (e) => (chat.currentModel = e.detail.modelId));
</script>`;

export const DropInChat: Story = {
  name: 'Drop-in <kai-chat>',
  render: () => {
    let chat!: HTMLElement;
    onMount(() => {
      setProps(chat, {
        models,
        currentModel: 'opus',
        context,
        suggestions: ['Summarize this thread', 'What changed in v0.3?'],
        messages: [
          { id: '1', role: 'assistant', content: "Hi! I'm the **drop-in** `<kai-chat>`. Ask me anything.", actions: ['copy', 'like', 'dislike'] },
        ],
      });
      setAttrs(chat, { 'chat-title': 'Assistant', search: true, voice: true });
      chat.addEventListener('kai-submit', (e) => {
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
      chat.addEventListener('kai-model-change', (e) => ((chat as AnyEl).currentModel = (e as CustomEvent).detail.modelId));
    });
    return (
      <Frame>
        <kai-chat ref={(e) => (chat = e)} style={{ display: 'block', height: '100%' }} />
      </Frame>
    );
  },
  parameters: { docs: { source: { code: DROPIN_SNIPPET, language: 'html' } } },
};
