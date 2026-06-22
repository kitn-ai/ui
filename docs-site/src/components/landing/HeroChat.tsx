/** Landing hero chat — a live <kai-chat> that AUTO-PLAYS a believable agent flow:
 *  reasoning → a tool call (lifecycle states) → a streamed markdown answer → an
 *  interactive generative-UI confirm card (a separate <kai-cards> composed into the
 *  frame, resolved back into the thread). So a visitor immediately sees a working
 *  component doing more than emit text — not a screenshot.
 *
 *  Plays once when the hero scrolls into view, replays on re-entry, then settles;
 *  prefers-reduced-motion renders the finished state. Arrays/objects are set as JS
 *  PROPERTIES on the host; messages are reassigned to a fresh array each tick. */
import { createSignal, onMount, onCleanup } from 'solid-js';
import { loadKit } from '../example/kit';

interface Reasoning { text: string; label?: string }
interface ToolPart {
  type: string;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  toolCallId: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: Reasoning;
  tools?: ToolPart[];
  actions?: string[];
}

const QUESTION =
  'Checkout p99 latency jumped from 180 ms to 920 ms after Tuesday’s deploy — but p50 barely moved. Where do I look?';

const REASONING =
  'p50 flat + p99 up ~5× rules out a global slowdown — a smaller pool or a slower dependency would lift p50 too. That points at a new blocking op on a conditional path, fired by a subset of requests. Pull traces for the slow ones and find what they share.';

const TOOL_INPUT = { service: 'checkout', window: '1h', sort_by: 'p99' };
const TOOL_OUTPUT = {
  slowest_spans: [
    { span: 'db.query checkout_items', ms: 680, calls: 47, note: 'N+1' },
    { span: 'auth.verify', ms: 40, calls: 1 },
    { span: 'serialize', ms: 22, calls: 1 },
  ],
};

const ANSWER =
  'There it is — `db.query checkout_items` ran **47 times** on the slow path: a classic **N+1** from Tuesday’s per-item lookup in the cart loop.';

const FIX_CARD = {
  type: 'confirm',
  id: 'fix-1',
  data: {
    heading: 'Ship the fix?',
    body: 'Batch the per-item lookups into one query, and wrap it in a 250 ms timeout with a cached fallback.',
    actions: [
      { id: 'apply', label: 'Apply & open PR', style: 'primary', default: true },
      { id: 'diff', label: 'Show the diff', style: 'default' },
    ],
  },
};

const FOLLOWUP =
  'Good instinct. The batched query collapses it to a single round-trip; the timeout just keeps one bad minute from stalling checkout while the cache warms.';

let uid = 0;
const nextId = () => `h${++uid}`;

export default function HeroChat() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let host: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cardsEl: any;
  let frameEl: HTMLDivElement | undefined;
  const [cardOpen, setCardOpen] = createSignal(false);
  let runToken = 0;
  let playing = false;
  let timer: number | undefined;
  const theme = () => document.documentElement.dataset.theme || 'dark';

  const wait = (ms: number) => new Promise<void>((r) => { timer = window.setTimeout(r, ms); });

  const assistantFinal = (): ChatMessage => ({
    id: 'a1', role: 'assistant', content: ANSWER,
    reasoning: { label: 'Thought for 4s', text: REASONING },
    tools: [{ type: 'query_traces', state: 'output-available', toolCallId: 't1', input: TOOL_INPUT, output: TOOL_OUTPUT }],
    actions: ['copy', 'like', 'dislike'],
  });

  function showCard() {
    if (!cardsEl) return;
    cardsEl.cards = [FIX_CARD];
    cardsEl.setAttribute('theme', theme());
    setCardOpen(true);
  }
  function clearCard() {
    setCardOpen(false);
    window.setTimeout(() => { if (cardsEl) cardsEl.cards = []; }, 360);
  }

  async function play() {
    if (!host) return;
    const my = ++runToken;
    const alive = () => my === runToken;
    const stop = () => { playing = false; };
    playing = true;
    clearCard();
    host.loading = false;
    host.messages = [];

    await wait(450); if (!alive()) return stop();
    const user: ChatMessage = { id: 'u1', role: 'user', content: QUESTION };
    host.messages = [user];

    // Thinking — the reasoning trigger reads "Thinking…", then resolves.
    await wait(650); if (!alive()) return stop();
    host.loading = true;
    let a: ChatMessage = { id: 'a1', role: 'assistant', content: '', reasoning: { label: 'Thinking…', text: REASONING } };
    host.messages = [user, { ...a }];

    await wait(1500); if (!alive()) return stop();
    a = { ...a, reasoning: { label: 'Thought for 4s', text: REASONING } };
    host.messages = [user, { ...a }];

    // Tool call — running.
    await wait(520); if (!alive()) return stop();
    a = { ...a, tools: [{ type: 'query_traces', state: 'input-available', toolCallId: 't1', input: TOOL_INPUT }] };
    host.messages = [user, { ...a }];

    // Tool call — structured result.
    await wait(1300); if (!alive()) return stop();
    a = { ...a, tools: [{ type: 'query_traces', state: 'output-available', toolCallId: 't1', input: TOOL_INPUT, output: TOOL_OUTPUT }] };
    host.messages = [user, { ...a }];

    // Stream the answer.
    await wait(560); if (!alive()) return stop();
    const words = ANSWER.split(/(\s+)/);
    for (let i = 2; i <= words.length; i += 2) {
      if (!alive()) return stop();
      a = { ...a, content: words.slice(0, i).join('') };
      host.messages = [user, { ...a }];
      await wait(34);
    }
    if (!alive()) return stop();
    a = { ...a, content: ANSWER }; // ensure the final word lands (odd word count)
    host.messages = [user, { ...a }];
    host.loading = false;

    await wait(160); if (!alive()) return stop();
    a = { ...a, actions: ['copy', 'like', 'dislike'] };
    host.messages = [user, { ...a }];

    // The generative-UI card rises.
    await wait(520); if (!alive()) return stop();
    showCard();
    playing = false;
  }

  function renderFinal() {
    host.messages = [{ id: 'u1', role: 'user', content: QUESTION }, assistantFinal()];
    showCard();
  }

  function applyCardAction(action: string) {
    clearCard();
    const cont: ChatMessage = action === 'apply'
      ? { id: nextId(), role: 'assistant', content: 'Opened **PR #4827** — `fix(checkout): batch cart lookups + 250 ms timeout`. CI is green; p99 is back to **190 ms** in staging.', actions: ['copy', 'like', 'dislike'] }
      : { id: nextId(), role: 'assistant', content: 'Here’s the change:\n\n```diff\n- for (const item of cart) {\n-   item.detail = await db.query(itemSql, item.id);   // N+1\n- }\n+ const rows = await db.query(batchSql, cart.map((i) => i.id));\n+ hydrate(cart, rows);\n```', actions: ['copy', 'like', 'dislike'] };
    host.messages = [...(host.messages ?? []), cont];
  }

  const onSubmit = (e: Event) => {
    const text = (e as CustomEvent).detail?.value?.trim();
    if (!text || !host) return;
    runToken++; // stop any autoplay in flight
    clearCard();
    const aId = nextId();
    host.messages = [...(host.messages ?? []), { id: nextId(), role: 'user', content: text }, { id: aId, role: 'assistant', content: '' }];
    host.loading = true;
    const words = FOLLOWUP.split(/(\s+)/);
    let i = 0;
    clearTimeout(timer);
    const tick = () => {
      i += 2;
      const partial = words.slice(0, i).join('');
      const done = i >= words.length;
      host.messages = (host.messages ?? []).map((m: ChatMessage) =>
        m.id === aId ? { ...m, content: partial, ...(done ? { actions: ['copy', 'like', 'dislike'] } : {}) } : m,
      );
      if (!done) timer = window.setTimeout(tick, 36);
      else host.loading = false;
    };
    timer = window.setTimeout(tick, 280);
  };

  onMount(async () => {
    await loadKit();
    if (!host) return;
    customElements.upgrade(host);
    if (cardsEl) customElements.upgrade(cardsEl);

    host.chatTitle = 'Support Agent';
    host.placeholder = 'Ask a follow-up…';
    host.suggestions = ['Show me the trace', 'Draft the migration', 'What’s the rollback?'];
    host.models = [
      { id: 'sonnet', name: 'Claude Sonnet', provider: 'Anthropic' },
      { id: 'gpt', name: 'GPT-4o', provider: 'OpenAI' },
      { id: 'llama', name: 'Llama 3.1', provider: 'Meta' },
    ];
    host.currentModel = 'sonnet';
    host.context = { usedTokens: 24500, maxTokens: 200000 };
    host.setAttribute('theme', theme());
    host.addEventListener('kai-submit', onSubmit);

    if (cardsEl) {
      cardsEl.setAttribute('theme', theme());
      cardsEl.policy = { onAction: (_cardId: string, action: string) => applyCardAction(action) };
    }

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduce) {
      renderFinal();
    } else if (frameEl) {
      // Play once per visibility session. Only reset (to a clean slate) once the
      // frame has FULLY left the viewport — so re-entry replays from scratch and we
      // never flash a stale card or an empty thread while the demo is on screen
      // (which a naive "replay on every re-entry" does when mobile layout shifts).
      let done = false;
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.4) {
            if (!playing && !done) { done = true; void play(); }
          } else if (!e.isIntersecting) {
            runToken++; // cancel any run in flight
            playing = false;
            done = false;
            clearCard();
            if (host) host.messages = [];
          }
        }
      }, { threshold: [0, 0.4, 1] });
      io.observe(frameEl);
      onCleanup(() => io.disconnect());
    }

    const obs = new MutationObserver(() => {
      host?.setAttribute('theme', theme());
      cardsEl?.setAttribute('theme', theme());
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    onCleanup(() => {
      clearTimeout(timer);
      host?.removeEventListener('kai-submit', onSubmit);
      obs.disconnect();
    });
  });

  return (
    <div
      ref={(el) => (frameEl = el as HTMLDivElement)}
      class="not-content relative h-full overflow-hidden rounded-2xl border border-line bg-surface"
      style={{ display: 'flex', 'flex-direction': 'column' }}
    >
      {/* @ts-expect-error custom element */}
      <kai-chat ref={(el: HTMLElement) => (host = el)} style={{ display: 'block', flex: '1', 'min-height': '0' }} />
      {/* generative-UI card — floats at the bottom OVER the input at the climax (the
          answer is kept short so the conversation sits clear above it). The agent's
          proposed action replaces the input until it's resolved. */}
      <div
        style={{
          position: 'absolute', left: '10px', right: '10px', bottom: '10px', 'z-index': '5',
          opacity: cardOpen() ? '1' : '0',
          transform: cardOpen() ? 'translateY(0)' : 'translateY(14px)',
          transition: 'opacity .3s ease, transform .42s cubic-bezier(.22,1,.36,1)',
          'pointer-events': cardOpen() ? 'auto' : 'none',
          filter: 'drop-shadow(0 14px 32px rgb(0 0 0 / 0.20))',
        }}
      >
        {/* @ts-expect-error custom element */}
        <kai-cards ref={(el: HTMLElement) => (cardsEl = el)} />
      </div>
    </div>
  );
}
