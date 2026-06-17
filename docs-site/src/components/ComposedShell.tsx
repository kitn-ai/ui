/** Live demo for "Compose your own shell" — assembles kc-resizable / kc-resizable-item /
 *  kc-conversations / kc-message / kc-prompt-input without <kc-chat>. Uses an imperative
 *  render loop for the message thread (same approach as the Storybook composed-shell story).
 *  Props are set as JS properties; events wired in onMount. */
import { onMount, onCleanup } from 'solid-js';
import { loadKit } from './example/kit';

type AnyEl = HTMLElement & Record<string, unknown>;

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: string[];
}

const CONVERSATIONS = [
  {
    id: 'c1',
    title: 'Web component architecture',
    scope: { type: 'document' as const },
    messageCount: 12,
    lastMessageAt: '2026-06-16T10:00:00Z',
    updatedAt: '2026-06-16T10:00:00Z',
  },
  {
    id: 'c2',
    title: 'Theming and design tokens',
    scope: { type: 'document' as const },
    messageCount: 5,
    lastMessageAt: '2026-06-15T09:00:00Z',
    updatedAt: '2026-06-15T09:00:00Z',
  },
  {
    id: 'c3',
    title: 'Streaming response patterns',
    scope: { type: 'document' as const },
    messageCount: 8,
    lastMessageAt: '2026-06-14T14:30:00Z',
    updatedAt: '2026-06-14T14:30:00Z',
  },
];

const SEED_MESSAGES: ChatMessage[] = [
  { id: 'u1', role: 'user', content: 'How does this shell differ from using `<kc-chat>`?' },
  {
    id: 'a1',
    role: 'assistant',
    content:
      '`<kc-chat>` is the 90% path — one element gives you the full thread, composer, and header chrome. **This shell** steps down one layer:\n\n- `<kc-resizable>` owns the layout (sidebar | main | any extra panels).\n- `<kc-conversations>` renders the list.\n- Each `<kc-message>` is a separate element you create and wire.\n- `<kc-prompt-input>` is the standalone composer.\n\nYou control the data flow and can slot in anything — a canvas, an artifact viewer, a debug inspector.',
    actions: ['copy', 'like', 'dislike'],
  },
];

const DEFAULT_REPLY =
  "Because you're composing the shell yourself, you can rearrange panels, hide the sidebar, add a third column for previews, or wire each component to a different data source — none of which `<kc-chat>` exposes directly. The tradeoff is more wiring; the payoff is complete layout control.";

let uid = 0;
const nextId = () => `cs${++uid}`;

export default function ComposedShell() {
  let listEl: AnyEl | undefined;
  let threadEl: HTMLElement | undefined;
  let inputEl: AnyEl | undefined;
  let timer: number | undefined;

  // The authoritative thread — plain array, imperatively synced to the DOM.
  let thread: ChatMessage[] = [...SEED_MESSAGES];

  const theme = () => document.documentElement.dataset.theme ?? 'light';

  /** Rebuild the <kc-message> list inside the thread container. */
  const renderThread = () => {
    if (!threadEl) return;
    // Reuse existing elements where possible, create new ones as needed.
    const existing = Array.from(threadEl.children) as (HTMLElement & AnyEl)[];
    thread.forEach((m, i) => {
      let el = existing[i] as AnyEl | undefined;
      if (!el) {
        el = document.createElement('kc-message') as unknown as AnyEl;
        el.setAttribute('theme', theme());
        threadEl!.append(el as unknown as HTMLElement);
      }
      el.message = m;
    });
    // Remove extra elements if the thread shrank (shouldn't happen in practice).
    while (threadEl.children.length > thread.length) {
      threadEl.removeChild(threadEl.lastChild!);
    }
    // Scroll to the bottom.
    const scroll = threadEl.parentElement;
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
  };

  const onSubmit = (e: Event) => {
    const text = (e as CustomEvent).detail?.value?.trim() as string | undefined;
    if (!text) return;

    const aId = nextId();
    thread = [
      ...thread,
      { id: nextId(), role: 'user', content: text },
      { id: aId, role: 'assistant', content: '' },
    ];
    renderThread();
    if (inputEl) inputEl.loading = true;

    const words = DEFAULT_REPLY.split(/(\s+)/);
    let i = 0;
    clearTimeout(timer);
    const tick = () => {
      i += 2;
      const partial = words.slice(0, i).join('');
      const done = i >= words.length;
      thread = thread.map((m) =>
        m.id === aId
          ? { ...m, content: partial, ...(done ? { actions: ['copy', 'like', 'dislike'] } : {}) }
          : m,
      );
      renderThread();
      if (!done) {
        timer = window.setTimeout(tick, 38);
      } else {
        if (inputEl) inputEl.loading = false;
      }
    };
    timer = window.setTimeout(tick, 260);
  };

  const onConversationSelect = (e: Event) => {
    const id = (e as CustomEvent).detail?.id as string | undefined;
    if (id && listEl) listEl.activeId = id;
  };

  onMount(async () => {
    await loadKit();

    if (listEl) {
      customElements.upgrade(listEl as HTMLElement);
      listEl.conversations = CONVERSATIONS;
      listEl.activeId = 'c1';
      listEl.setAttribute('theme', theme());
      listEl.addEventListener('kc-conversation-select', onConversationSelect);
    }

    if (inputEl) {
      customElements.upgrade(inputEl as HTMLElement);
      inputEl.setAttribute('placeholder', 'Message the assistant…');
      inputEl.setAttribute('theme', theme());
      inputEl.addEventListener('kc-submit', onSubmit);
    }

    // Seed initial messages.
    renderThread();

    const obs = new MutationObserver(() => {
      const t = theme();
      listEl?.setAttribute('theme', t);
      inputEl?.setAttribute('theme', t);
      if (threadEl) {
        for (const child of Array.from(threadEl.children)) {
          (child as HTMLElement).setAttribute('theme', t);
        }
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    onCleanup(() => {
      clearTimeout(timer);
      listEl?.removeEventListener('kc-conversation-select', onConversationSelect);
      inputEl?.removeEventListener('kc-submit', onSubmit);
      obs.disconnect();
    });
  });

  return (
    <div
      class="not-content my-5 overflow-hidden rounded-xl border border-line bg-surface"
      style={{ height: '560px' }}
    >
      {/* @ts-expect-error custom element */}
      <kc-resizable
        orientation="horizontal"
        style={{ display: 'block', height: '100%' }}
      >
        {/* Sidebar — conversation list */}
        {/* @ts-expect-error custom element */}
        <kc-resizable-item size="22%" min="160px" max="40%">
          {/* @ts-expect-error custom element */}
          <kc-conversations
            ref={(el: HTMLElement) => (listEl = el as AnyEl)}
            style={{ display: 'block', height: '100%' }}
          />
        </kc-resizable-item>

        {/* Main — scrolling thread + composer */}
        {/* @ts-expect-error custom element */}
        <kc-resizable-item>
          <div
            style={{
              height: '100%',
              display: 'flex',
              'flex-direction': 'column',
              'min-height': '0',
            } as any}
          >
            {/* Scrollable thread area */}
            <div
              style={{
                flex: '1',
                'min-height': '0',
                'overflow-y': 'auto',
                padding: '16px',
                display: 'flex',
                'flex-direction': 'column',
                gap: '12px',
              } as any}
            >
              {/* <kc-message> elements are created imperatively inside renderThread() */}
              <div
                ref={(el: HTMLElement) => (threadEl = el)}
                style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' } as any}
              />
            </div>

            {/* Composer */}
            <div
              style={{
                'border-top': '1px solid var(--kc-line, rgba(0,0,0,0.09))',
                padding: '12px 16px',
              } as any}
            >
              {/* @ts-expect-error custom element */}
              <kc-prompt-input
                ref={(el: HTMLElement) => (inputEl = el as AnyEl)}
                style={{ display: 'block' }}
              />
            </div>
          </div>
        </kc-resizable-item>
      </kc-resizable>
    </div>
  );
}
