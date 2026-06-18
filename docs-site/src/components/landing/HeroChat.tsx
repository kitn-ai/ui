/** Landing hero chat — a live <kc-chat> that anchors the hero. Seeded with one
 *  realistic agent exchange (reasoning + streamed markdown answer), a model
 *  switcher, and a context meter, so a visitor sees the real component working
 *  the moment the page loads. Submitting streams a canned reply. Modeled on the
 *  proven ReasoningAssistantDemo: arrays are set as JS PROPERTIES on the host,
 *  messages are reassigned to a fresh array each tick. */
import { createSignal, onMount, onCleanup } from 'solid-js';
import { loadKit } from '../example/kit';

interface Reasoning { text: string; label?: string }
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: Reasoning;
  actions?: string[];
}

const SEED: ChatMessage[] = [
  {
    id: 'u1',
    role: 'user',
    content:
      'Checkout p99 latency jumped from 180 ms to 920 ms after Tuesday’s deploy — but p50 barely moved. Where do I look?',
  },
  {
    id: 'a1',
    role: 'assistant',
    content:
      'A clean p50 with a blown-out p99 is a **tail problem** — something got slow for a *slice* of requests, not all of them.\n\nThe usual cause in a deploy that left p50 alone: a conditional path now doing extra blocking work. Diff Tuesday’s release for a new synchronous call gated behind a branch, then pull a trace on a few slow requests and look for what they share.',
    reasoning: {
      label: 'Thought for 4s',
      text:
        'p50 flat + p99 up ~5× rules out a global slowdown (a smaller pool or slower dependency would lift p50 too). That magnitude points at a new blocking op on a conditional path — fired by a subset of requests. Narrow the slice first: trace the slow ones, find the common attribute.',
    },
    actions: ['copy', 'like', 'dislike'],
  },
];

const REPLY =
  'Good instinct. Pull the span breakdown for the slow requests first — one ~700 ms call means a slow dependency; many small calls means an N+1.\n\nEither way, wrap the call in a tight timeout with a graceful fallback so a bad minute degrades instead of stalling checkout.';

let uid = 0;
const nextId = () => `h${++uid}`;

export default function HeroChat() {
  let host: (HTMLElement & { messages?: ChatMessage[]; [k: string]: unknown }) | undefined;
  const [, setReady] = createSignal(false);
  let timer: number | undefined;
  const theme = () => document.documentElement.dataset.theme || 'dark';

  const onSubmit = (e: Event) => {
    const text = (e as CustomEvent).detail?.value?.trim();
    if (!text || !host) return;
    const aId = nextId();
    host.messages = [
      ...(host.messages ?? []),
      { id: nextId(), role: 'user', content: text },
      { id: aId, role: 'assistant', content: '' },
    ];
    (host as any).loading = true;
    const words = REPLY.split(/(\s+)/);
    let i = 0;
    clearTimeout(timer);
    const tick = () => {
      i += 2;
      const partial = words.slice(0, i).join('');
      const done = i >= words.length;
      host!.messages = (host!.messages ?? []).map((m) =>
        m.id === aId ? { ...m, content: partial, ...(done ? { actions: ['copy', 'like', 'dislike'] } : {}) } : m,
      );
      if (!done) timer = window.setTimeout(tick, 36);
      else (host as any).loading = false;
    };
    timer = window.setTimeout(tick, 280);
  };

  onMount(async () => {
    await loadKit();
    if (!host) return;
    customElements.upgrade(host);
    host.messages = SEED;
    (host as any).chatTitle = 'Support copilot';
    (host as any).placeholder = 'Ask a follow-up…';
    (host as any).suggestions = ['Show me a trace', 'Draft the fix', 'What’s the rollback?'];
    (host as any).models = [
      { id: 'sonnet', name: 'Claude Sonnet', provider: 'Anthropic' },
      { id: 'gpt', name: 'GPT-4o', provider: 'OpenAI' },
      { id: 'llama', name: 'Llama 3.1', provider: 'Meta' },
    ];
    (host as any).currentModel = 'sonnet';
    (host as any).context = { usedTokens: 24500, maxTokens: 200000 };
    host.setAttribute('theme', theme());
    host.addEventListener('kc-submit', onSubmit);
    setReady(true);
    const obs = new MutationObserver(() => host?.setAttribute('theme', theme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    onCleanup(() => { clearTimeout(timer); host?.removeEventListener('kc-submit', onSubmit); obs.disconnect(); });
  });

  return (
    <div class="not-content h-full overflow-hidden rounded-2xl border border-line bg-surface" style={{ display: 'flex', 'flex-direction': 'column' }}>
      {/* @ts-expect-error custom element */}
      <kc-chat ref={(el: HTMLElement) => (host = el as any)} style={{ display: 'block', flex: '1', 'min-height': '0' }} />
    </div>
  );
}
