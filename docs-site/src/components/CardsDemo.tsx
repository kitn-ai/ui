/** Live demos for "Generative UI cards" — one self-contained segment per card type
 *  (confirm, choice, form). Each segment mounts its own <kc-cards> seeded with a single
 *  CardEnvelope and a CardPolicy that logs that card's events into a Console strip BELOW
 *  the preview (mirroring the Playground preview→Console convention). Realistic
 *  deploy / notify / rollback scenario. Exported per type so the MDX can place each
 *  segment next to its own narrative. */
import { createSignal, onMount, onCleanup, For, Show } from 'solid-js';
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

const CONFIRM: CardEnvelope = {
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
};

const CHOICE: CardEnvelope = {
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
};

const FORM: CardEnvelope = {
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
};

/** A single card type: its own <kc-cards> preview + a Console strip below logging
 *  this card's CardPolicy events. Mirrors Playground.tsx's preview→Console layout. */
function CardSegment(props: { envelope: CardEnvelope }) {
  let host: AnyEl | undefined;
  const [log, setLog] = createSignal<string[]>([]);
  const theme = () => document.documentElement.dataset.theme ?? 'light';

  const push = (msg: string) => setLog((prev) => [...prev.slice(-5), msg]);

  onMount(async () => {
    await loadKit();
    if (!host) return;
    customElements.upgrade(host);

    host.cards = [props.envelope];

    const policy: CardPolicy = {
      onAction: (cardId, action, payload) => {
        const extra = payload !== undefined ? `  (${JSON.stringify(payload)})` : '';
        push(`onAction  •  ${cardId}  →  ${action}${extra}`);
      },
      onSubmit: (cardId, data) => {
        push(`onSubmit  •  ${cardId}  →  ${JSON.stringify(data)}`);
      },
      onDismiss: (cardId) => {
        push(`onDismiss  •  ${cardId}`);
      },
      onError: (cardId, message) => {
        push(`onError  •  ${cardId}  →  ${message}`);
      },
    };
    host.policy = policy;

    host.setAttribute('theme', theme());

    const obs = new MutationObserver(() => host?.setAttribute('theme', theme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    onCleanup(() => obs.disconnect());
  });

  return (
    <div class="not-content my-5 overflow-hidden rounded-xl border border-line bg-surface">
      {/* Preview */}
      <div class="p-5">
        {/* @ts-expect-error custom element */}
        <kc-cards ref={(el: HTMLElement) => (host = el as AnyEl)} style={{ display: 'block' }} />
      </div>

      {/* Console — below the preview, mirroring the Playground convention */}
      <div class="border-t border-line bg-surface-2 px-4 py-3">
        <div class="mb-1.5 flex items-center justify-between">
          <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-3">
            <span class="size-1.5 rounded-full bg-brand"></span> Console
          </div>
          <button type="button" onClick={() => setLog([])} disabled={!log().length}
            class="cursor-pointer appearance-none border-0 bg-transparent text-xs font-medium text-ink-3 transition-colors hover:text-ink disabled:opacity-40">Clear</button>
        </div>
        <div class="min-h-[1.75rem] font-mono text-sm leading-relaxed text-ink-2">
          <Show when={log().length} fallback={<span class="font-sans text-ink-3">Interact with the card — policy events appear here.</span>}>
            <For each={log()}>{(line) => <div class="whitespace-pre-wrap break-words">{line}</div>}</For>
          </Show>
        </div>
      </div>
    </div>
  );
}

export function ConfirmCardDemo() {
  return <CardSegment envelope={CONFIRM} />;
}

export function ChoiceCardDemo() {
  return <CardSegment envelope={CHOICE} />;
}

export function FormCardDemo() {
  return <CardSegment envelope={FORM} />;
}

/** Default export kept for convenience — all three segments stacked. */
export default function CardsDemo() {
  return (
    <>
      <CardSegment envelope={CONFIRM} />
      <CardSegment envelope={CHOICE} />
      <CardSegment envelope={FORM} />
    </>
  );
}
