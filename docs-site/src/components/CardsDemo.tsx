/** Live demo for "Generative UI cards" — mounts a <kc-cards> element seeded with three
 *  CardEnvelopes (confirm, choice, form) and a CardPolicy that logs each response. */
import { createSignal, onMount, onCleanup } from 'solid-js';
import { loadKit } from './example/kit';

type AnyEl = HTMLElement & Record<string, unknown>;

interface CardEnvelope {
  type: string;
  id: string;
  data: unknown;
  title?: string;
  resolution?: unknown;
}

interface CardPolicy {
  onAction?: (cardId: string, action: string, payload?: unknown) => void;
  onSubmit?: (cardId: string, data: unknown) => void;
  onDismiss?: (cardId: string) => void;
  onError?: (cardId: string, message: string) => void;
}

const CARDS: CardEnvelope[] = [
  {
    type: 'confirm',
    id: 'confirm-deploy',
    title: 'Deploy to production?',
    data: {
      body: 'This will apply 2 pending migrations and restart 3 services. Estimated downtime: ~30 s.',
      tone: 'warning',
      actions: [
        { id: 'deploy', label: 'Deploy now', style: 'primary', default: true },
        { id: 'cancel', label: 'Cancel' },
      ],
    },
  },
  {
    type: 'choice',
    id: 'choice-notify',
    title: 'How should we notify users?',
    data: {
      prompt: 'Pick the notification channel for the maintenance window.',
      options: [
        { id: 'email', label: 'Email', description: 'Sent to all active accounts', meta: '~4 200 users' },
        { id: 'banner', label: 'In-app banner', description: 'Shown on next page load', recommended: true },
        { id: 'none', label: 'No notification', description: 'Skip — internal deploy only' },
      ],
      submitLabel: 'Confirm channel',
    },
  },
  {
    type: 'form',
    id: 'form-contact',
    title: 'Rollback contact',
    data: {
      type: 'object',
      description: 'Who should we page if the deploy needs a rollback?',
      required: ['name', 'channel'],
      'x-kc-submitLabel': 'Save contact',
      properties: {
        name: {
          type: 'string',
          title: 'Name',
          'x-kc-placeholder': 'e.g. Jane Smith',
        },
        channel: {
          type: 'string',
          title: 'Pager channel',
          enum: ['PagerDuty', 'Slack #oncall', 'SMS'],
          'x-kc-widget': 'select',
        },
        notes: {
          type: 'string',
          title: 'Notes (optional)',
          'x-kc-widget': 'textarea',
          'x-kc-placeholder': 'Any extra context…',
        },
      },
    },
  },
];

export default function CardsDemo() {
  let host: AnyEl | undefined;
  const [log, setLog] = createSignal<string[]>([]);
  const theme = () => document.documentElement.dataset.theme ?? 'light';

  const push = (msg: string) => setLog((prev) => [msg, ...prev].slice(0, 8));

  onMount(async () => {
    await loadKit();
    if (!host) return;
    customElements.upgrade(host);

    host.cards = CARDS;

    const policy: CardPolicy = {
      onAction: (cardId, action, payload) => {
        const extra = payload !== undefined ? ` (${JSON.stringify(payload)})` : '';
        push(`action  •  ${cardId}  →  ${action}${extra}`);
      },
      onSubmit: (cardId, data) => {
        push(`submit  •  ${cardId}  →  ${JSON.stringify(data)}`);
      },
      onDismiss: (cardId) => {
        push(`dismiss  •  ${cardId}`);
      },
      onError: (cardId, message) => {
        push(`error  •  ${cardId}  →  ${message}`);
      },
    };
    host.policy = policy;

    host.setAttribute('theme', theme());

    const obs = new MutationObserver(() => host?.setAttribute('theme', theme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    onCleanup(() => obs.disconnect());
  });

  return (
    <div class="not-content my-5 grid gap-4 rounded-xl border border-line bg-surface p-5"
         style={{ 'grid-template-columns': '1fr 1fr', 'align-items': 'start' } as any}>
      {/* Left: card stream */}
      <div>
        {/* @ts-expect-error custom element */}
        <kc-cards ref={(el: HTMLElement) => (host = el as AnyEl)} style={{ display: 'block' }} />
      </div>

      {/* Right: event log */}
      <div class="flex flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-ink/50">
          Policy events
        </p>
        <pre
          class="min-h-[6rem] rounded-lg border border-line bg-surface p-3 font-mono text-xs text-ink"
          style={{ 'white-space': 'pre-wrap', 'word-break': 'break-all' } as any}
        >
          {log().length ? log().join('\n') : 'Interact with a card — events appear here.'}
        </pre>
      </div>
    </div>
  );
}
