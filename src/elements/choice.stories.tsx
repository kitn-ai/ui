import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, onMount, type JSX } from 'solid-js';
import './choice';
import { argTypesFor, specDescription } from '../stories/docs/element-controls';
import type { ChoiceCardData } from '../components/choice-card';
import type { CardEvent } from '../primitives/card-contract';

declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-choice': JSX.HTMLAttributes<HTMLElement> & {
        heading?: string;
        'card-id'?: string;
        ref?: (el: HTMLElement) => void;
      };
    }
  }
}

type ChoiceEl = HTMLElement & { data?: ChoiceCardData; resolution?: Record<string, unknown> };

function Frame(props: { children: JSX.Element }) {
  return <div style={{ 'max-width': '460px' }}>{props.children}</div>;
}

/** Mounts a <kc-choice>, sets `.data`, logs the emitted CardEvent under the render. */
function ChoiceDemo(props: { def: ChoiceCardData; cardId: string; heading?: string }) {
  const [log, setLog] = createSignal<CardEvent[]>([]);
  let el: ChoiceEl | undefined;
  onMount(() => {
    if (!el) return;
    el.data = props.def;
    el.addEventListener('kc-card', (e) => {
      const detail = (e as CustomEvent<CardEvent>).detail;
      setLog((prev) => [...prev, detail]);
    });
  });
  return (
    <Frame>
      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
        <kc-choice ref={(e) => (el = e as ChoiceEl)} card-id={props.cardId} heading={props.heading} />
        <pre
          style={{
            margin: 0,
            'max-height': '180px',
            overflow: 'auto',
            background: 'var(--color-muted, #f4f4f5)',
            'border-radius': '8px',
            padding: '8px',
            'font-size': '12px',
          }}
        >
          {log().length === 0 ? '// emitted CardEvents appear here' : JSON.stringify(log(), null, 2)}
        </pre>
      </div>
    </Frame>
  );
}

const PLANS: ChoiceCardData = {
  prompt: 'Which plan fits your team?',
  options: [
    { id: 'free', label: 'Free', description: 'For trying things out', meta: '$0' },
    {
      id: 'pro',
      label: 'Pro',
      description: 'For growing teams',
      meta: '$12/seat',
      recommended: true,
      payload: { plan: 'pro' },
    },
    { id: 'enterprise', label: 'Enterprise', description: 'SSO, audit log, SLA', meta: 'Contact us' },
    { id: 'legacy', label: 'Legacy', description: 'No longer available', disabled: true },
  ],
};

const TEMPLATES: ChoiceCardData = {
  prompt: 'Pick a workspace template.',
  submitLabel: 'Create workspace',
  options: [
    {
      id: 'blank',
      label: 'Blank',
      description: 'Start from scratch',
      media: { image: 'https://placehold.co/80x80/png?text=Blank', imageAlt: 'A blank canvas' },
    },
    {
      id: 'kanban',
      label: 'Kanban',
      description: 'Board with columns',
      recommended: true,
      media: { image: 'https://placehold.co/80x80/png?text=Kanban', imageAlt: 'A kanban board' },
      payload: { template: 'kanban' },
    },
    {
      id: 'docs',
      label: 'Docs',
      description: 'Wiki-style pages',
      media: { image: 'https://placehold.co/80x80/png?text=Docs', imageAlt: 'A document page' },
    },
  ],
};

const QUICK_REPLIES: ChoiceCardData = {
  prompt: 'How did this answer land?',
  options: [
    { id: 'great', label: 'That solved it', payload: { sentiment: 'positive' } },
    { id: 'partly', label: 'Partly — needs more', payload: { sentiment: 'neutral' } },
    { id: 'no', label: 'Not what I meant', payload: { sentiment: 'negative' } },
  ],
  allowOther: { label: 'Something else…', placeholder: 'Tell me what you expected' },
};

const HEADING_MAP: Record<string, string | undefined> = {
  'card-plans': 'Choose a plan',
  'card-templates': 'New workspace',
  'card-replies': undefined,
};

const HTML_SNIPPET = (def: ChoiceCardData, cardId: string) => {
  const heading = HEADING_MAP[cardId];
  return `<kc-choice${heading ? ` heading="${heading}"` : ''}></kc-choice>
<script type="module">
  import '@kitn.ai/chat/elements'; // registers the custom elements

  const el = document.querySelector('kc-choice');
  // \`data\` is the CardEnvelope.data (set as a property).
  el.data = ${JSON.stringify(def, null, 2)};

  // Cards bubble ONE \`kc-card\` CustomEvent carrying a typed CardEvent.
  el.addEventListener('kc-card', (e) => {
    const ev = e.detail; // { kind:'action', cardId, action, payload? } | { kind:'ready', ... } | ...
    if (ev.kind === 'action') console.log('chose', ev.action, ev.payload);
  });
</script>`;
};

const meta = {
  title: 'Generative UI/Cards/kc-choice',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-choice'),
  parameters: {
    layout: 'padded',
    docs: {
      description: specDescription('kc-choice', [
        "`<kc-choice>` is a **single-select** 'pick one of N rich options' card (set via the `data` **property**): an optional prompt + a radiogroup of list rows + a **Submit** button. Clicking a row (or Space/Enter on the focused row) **selects** it locally — nothing is emitted. Submit then emits the Card contract's **`action`** verb up a bubbling **`kc-card`** CustomEvent of `{ kind:'action', cardId, action: option.id, payload? }`, then **resolves** the card (the chosen option shown read-only) so the same pick can't double-fire. The Submit label is `submitLabel` (default 'Submit').",
        '**Rich-but-bounded options:** every field except `id`/`label` is optional — `description`, `media` (image + `imageAlt`, or a named `icon`), `meta` (trailing price/badge), `recommended` (a pill), `disabled` (inert + skipped in keyboard nav), and an opaque `payload` echoed back. A weaker model can just omit them.',
        "**`allowOther`** (opt-in) appends a final 'Other…' row: selecting it reveals an inline text input. The single shared **Submit** stays disabled until the text is non-empty; submitting emits `{ kind:'action', action:'__other__', payload:{ text } }`.",
        '**Accessibility:** the options are a WAI-ARIA `radiogroup` (`role="radio"` + `aria-checked`) with **roving tabindex** — one tab stop in, Arrow keys move focus (skipping disabled), Enter/Space select the focused row. Disabled options are `aria-disabled` and not focusable; option images carry alt text; the Other input has a label. **0 axe violations** (light + dark).',
        '**Events** (all frozen Card-contract verbs): `ready` on mount, `action` on Submit, `error` for a malformed definition (renders the inline `kc-card` error). It **never invents events**, and — because it carries a registry entry — `<kc-cards>` / `renderCard` dispatch it automatically.',
      ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** A list of plans with a `recommended` pill, `meta` prices, and a disabled legacy row.
 *  Select a row, then click Submit to emit the `action`. */
export const Plans: Story = {
  render: () => <ChoiceDemo def={PLANS} cardId="card-plans" heading="Choose a plan" />,
  parameters: { docs: { source: { code: HTML_SNIPPET(PLANS, 'card-plans'), language: 'html' } } },
};

/** Rows with leading images (each `media.image` carries `imageAlt`) and a custom `submitLabel`. */
export const WithMedia: Story = {
  render: () => <ChoiceDemo def={TEMPLATES} cardId="card-templates" heading="New workspace" />,
  parameters: { docs: { source: { code: HTML_SNIPPET(TEMPLATES, 'card-templates'), language: 'html' } } },
};

/** Quick replies with the `allowOther` free-text escape: select Other, type, then Submit. */
export const AllowOther: Story = {
  render: () => <ChoiceDemo def={QUICK_REPLIES} cardId="card-replies" />,
  parameters: { docs: { source: { code: HTML_SNIPPET(QUICK_REPLIES, 'card-replies'), language: 'html' } } },
};

const RESOLVED_CHOICE: ChoiceCardData = {
  prompt: 'Which plan?',
  options: [
    { id: 'free', label: 'Free', meta: '$0' },
    { id: 'pro', label: 'Pro', meta: '$20/mo' },
  ],
};

/** The card after the user chose **Pro** — only the chosen option shown, no radiogroup or Submit. */
export const Resolved: Story = {
  name: 'Resolved (read-only)',
  render: () => {
    let el: ChoiceEl | undefined;
    onMount(() => {
      if (!el) return;
      el.data = RESOLVED_CHOICE;
      el.resolution = { kind: 'action', action: 'pro' };
    });
    return (
      <Frame>
        <kc-choice ref={(e) => (el = e as ChoiceEl)} card-id="card-resolved-choice" heading="Choose a plan" />
      </Frame>
    );
  },
  parameters: {
    docs: {
      source: {
        code: `<kc-choice heading="Choose a plan"></kc-choice>
<script type="module">
  import '@kitn.ai/chat/elements';
  const el = document.querySelector('kc-choice');
  el.data = ${JSON.stringify(RESOLVED_CHOICE, null, 2)};
  // Setting .resolution renders the chromed read-only view — no radiogroup or Submit.
  el.resolution = { kind: 'action', action: 'pro' };
</script>`,
        language: 'html',
      },
    },
  },
};

/** A malformed `data` (empty `options`) → the inline error state + an `error` event. */
export const ErrorState: Story = {
  render: () => <ChoiceDemo def={{ options: [] } as unknown as ChoiceCardData} cardId="card-bad" />,
  parameters: {
    docs: {
      source: {
        code: `<kc-choice></kc-choice>
<script type="module">
  import '@kitn.ai/chat/elements';
  const el = document.querySelector('kc-choice');
  // No options → inline error state + an \`error\` event.
  el.data = { options: [] };
  el.addEventListener('kc-card', (e) => {
    if (e.detail.kind === 'error') console.warn('choice error:', e.detail.message);
  });
</script>`,
        language: 'html',
      },
    },
  },
};
