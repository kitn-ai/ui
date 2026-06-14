import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, onMount, type JSX } from 'solid-js';
import './confirm-card';
import { argTypesFor, specDescription } from '../stories/docs/element-controls';
import type { ConfirmCardData } from '../components/confirm-card';
import type { CardEvent } from '../primitives/card-contract';

declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-confirm': JSX.HTMLAttributes<HTMLElement> & {
        heading?: string;
        'card-id'?: string;
        ref?: (el: HTMLElement) => void;
      };
    }
  }
}

type ConfirmEl = HTMLElement & { data?: ConfirmCardData };

function Frame(props: { children: JSX.Element }) {
  return <div style={{ 'max-width': '460px' }}>{props.children}</div>;
}

/** Mounts a <kc-confirm>, sets `.data`, logs the emitted CardEvent under the render. */
function ConfirmDemo(props: { def: ConfirmCardData; cardId: string; heading?: string }) {
  const [log, setLog] = createSignal<CardEvent[]>([]);
  let el: ConfirmEl | undefined;
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
        <kc-confirm ref={(e) => (el = e as ConfirmEl)} card-id={props.cardId} heading={props.heading} />
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

const APPROVE: ConfirmCardData = {
  body: 'This will apply 3 pending migrations to production. This cannot be undone.',
  tone: 'warning',
  actions: [
    { id: 'approve', label: 'Run migration', style: 'primary', default: true },
    { id: 'reject', label: 'Cancel' },
  ],
};

const DESTRUCTIVE: ConfirmCardData = {
  body: 'Permanently delete 12 files from the workspace? This cannot be undone.',
  tone: 'danger',
  actions: [
    { id: 'delete', label: 'Delete files', style: 'destructive', default: true },
    { id: 'cancel', label: 'Keep them' },
  ],
};

const CHOICES: ConfirmCardData = {
  heading: 'Where should I deploy?',
  body: 'Pick a target environment for this build.',
  actions: [
    { id: 'staging', label: 'Staging', default: true },
    { id: 'preview', label: 'Preview' },
    { id: 'prod', label: 'Production', style: 'primary' },
  ],
};

const DISMISSIBLE: ConfirmCardData = {
  body: 'Send the drafted email to the customer?',
  dismissible: true,
  actions: [
    { id: 'send', label: 'Send', style: 'primary', default: true },
    { id: 'edit', label: 'Edit first' },
  ],
};

const HEADING_MAP: Record<string, string | undefined> = {
  'card-approve': 'Run database migration?',
  'card-delete': 'Delete files?',
  'card-deploy': undefined,
  'card-send': 'Send email?',
};

const HTML_SNIPPET = (def: ConfirmCardData, cardId: string) => {
  const heading = HEADING_MAP[cardId];
  return `<kc-confirm${heading ? ` heading="${heading}"` : ''}></kc-confirm>
<script type="module">
  import '@kitnai/chat/elements'; // registers the custom elements

  const el = document.querySelector('kc-confirm');
  // \`data\` is the CardEnvelope.data (set as a property).
  el.data = ${JSON.stringify(def, null, 2)};

  // Cards bubble ONE \`kc-card\` CustomEvent carrying a typed CardEvent.
  el.addEventListener('kc-card', (e) => {
    const ev = e.detail; // { kind:'action', cardId, action, payload? } | { kind:'dismiss', ... } | ...
    if (ev.kind === 'action') console.log('chose', ev.action);
  });
</script>`;
};

const meta = {
  title: 'Generative UI/Cards/kc-confirm',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-confirm'),
  parameters: {
    layout: 'padded',
    docs: {
      description: specDescription('kc-confirm', [
        "`<kc-confirm>` is a **named-intent approval** card (set via the `data` **property**): a title + body + a small set of action buttons. Activating an action emits the Card contract's **`action`** verb up a bubbling **`kc-card`** CustomEvent of `{ kind: 'action', cardId, action, payload? }`, then **resolves** the card (other actions disabled, the chosen one marked) so the same approval can't double-fire.",
        '**Action styles:** `primary` (filled accent), `default` (outline), `destructive` (red/danger). A `tone:\'danger\'` and any destructive action add a warning icon + danger accent — never color alone. At most one action can be `default:true` (the keyboard default; gets focus only when `autofocus` is set, which is **off** by default to avoid focus-stealing mid-stream).',
        '**Events** (all frozen Card-contract verbs): `ready` on mount, `action` on choice, `dismiss` for the optional close affordance (`dismissible:true`), `error` for a malformed definition (renders the inline `kc-card` error). It **never invents events**. The same shapes flow over the remote iframe transport unchanged.',
      ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** The canonical two-action approval (Approve / Reject). */
export const ApproveReject: Story = {
  render: () => <ConfirmDemo def={APPROVE} cardId="card-approve" heading="Run database migration?" />,
  parameters: { docs: { source: { code: HTML_SNIPPET(APPROVE, 'card-approve'), language: 'html' } } },
};

/** A destructive action (`tone:'danger'` + `style:'destructive'`) — danger styling, no color-only cue. */
export const Destructive: Story = {
  render: () => <ConfirmDemo def={DESTRUCTIVE} cardId="card-delete" heading="Delete files?" />,
  parameters: { docs: { source: { code: HTML_SNIPPET(DESTRUCTIVE, 'card-delete'), language: 'html' } } },
};

/** A small choice set (3 actions, one `default:true`). */
export const ChoiceSet: Story = {
  render: () => <ConfirmDemo def={CHOICES} cardId="card-deploy" />,
  parameters: { docs: { source: { code: HTML_SNIPPET(CHOICES, 'card-deploy'), language: 'html' } } },
};

/** A dismissible approval (a close affordance emits the `dismiss` verb). */
export const Dismissible: Story = {
  render: () => <ConfirmDemo def={DISMISSIBLE} cardId="card-send" heading="Send email?" />,
  parameters: { docs: { source: { code: HTML_SNIPPET(DISMISSIBLE, 'card-send'), language: 'html' } } },
};

/** A malformed `data` (empty `actions`) → the inline error state + an `error` event. */
export const ErrorState: Story = {
  render: () => <ConfirmDemo def={{ actions: [] } as unknown as ConfirmCardData} cardId="card-bad" />,
  parameters: {
    docs: {
      source: {
        code: `<kc-confirm></kc-confirm>
<script type="module">
  import '@kitnai/chat/elements';
  const el = document.querySelector('kc-confirm');
  // No actions → inline error state + an \`error\` event.
  el.data = { actions: [] };
  el.addEventListener('kc-card', (e) => {
    if (e.detail.kind === 'error') console.warn('confirm error:', e.detail.message);
  });
</script>`,
        language: 'html',
      },
    },
  },
};
