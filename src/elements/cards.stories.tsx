// src/elements/cards.stories.tsx
import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, onMount } from 'solid-js';
import './register'; // registers all kai-* incl. kai-cards
import type { CardEnvelope, CardEvent } from '../primitives/card-contract';
import { dismissRecovery } from '../primitives/card-recovery';
import { toast } from '../primitives/toast-store';

declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements { 'kai-cards': JSX.HTMLAttributes<HTMLElement>; }
  }
}

const CARDS: CardEnvelope[] = [
  { type: 'confirm', id: 'deploy', title: 'Deploy to production?',
    data: { body: 'Apply 3 migrations and deploy?', tone: 'warning',
      actions: [{ id: 'go', label: 'Deploy', style: 'primary', default: true }, { id: 'no', label: 'Cancel' }] } },
  { type: 'tasks', id: 'plan', title: 'Pick the steps',
    data: { tasks: [{ id: 'a', label: 'Run tests', checked: true }, { id: 'b', label: 'Tag release' }], confirmLabel: 'Run selected' } },
  { type: 'choice', id: 'plan-pick', title: 'Choose a plan',
    data: { prompt: 'Which plan fits your team?', options: [
      { id: 'free', label: 'Free', meta: '$0' },
      { id: 'pro', label: 'Pro', meta: '$12/seat', recommended: true, payload: { plan: 'pro' } },
    ] } },
  { type: 'link', id: 'doc', data: { url: 'https://kitn.dev', title: 'kitn.dev', description: 'Generative UI cards', domain: 'kitn.dev' } },
];

/** A host renders a stream of envelopes via <kai-cards> and handles events via `.policy`. */
function Demo() {
  let el: HTMLElement | undefined;
  const [log, setLog] = createSignal<string[]>([]);
  onMount(() => {
    if (!el) return;
    (el as unknown as { cards: CardEnvelope[] }).cards = CARDS;
    (el as unknown as { policy: unknown }).policy = {
      onAction: (id: string, action: string) => setLog((l) => [`action: ${id} → ${action}`, ...l]),
      onSubmit: (id: string, data: unknown) => setLog((l) => [`submit: ${id} → ${JSON.stringify(data)}`, ...l]),
      onOpen: (url: string) => setLog((l) => [`open: ${url}`, ...l]),
      onError: (id: string, msg: string) => setLog((l) => [`error: ${id} → ${msg}`, ...l]),
    };
  });
  return (
    <div style={{ display: 'grid', 'grid-template-columns': '1fr 18rem', gap: '1rem', padding: '1rem' }}>
      <kai-cards ref={(e) => (el = e as HTMLElement)} />
      <pre style={{ 'font-size': '12px', background: '#f4f4f5', padding: '8px', 'border-radius': '6px', 'min-height': '6rem' }}>
        {log().join('\n') || 'events appear here…'}
      </pre>
    </div>
  );
}

/** Dismiss + recover: clicking × defers the card to a re-openable stub (not
 *  delete) and shows an Undo toast; Reopen restores the live card. Wired with the
 *  real `dismissRecovery()` host helper. */
function DismissDemo() {
  let el: (HTMLElement & { cards?: CardEnvelope[]; policy?: unknown }) | undefined;
  let current: CardEnvelope[] = [
    {
      type: 'confirm',
      id: 'fix',
      title: 'Ship the fix?',
      data: {
        body: 'Batch the per-item cart lookups into one query and wrap it in a 250 ms timeout.',
        dismissible: true,
        actions: [{ id: 'apply', label: 'Apply & open PR', style: 'primary', default: true }],
      },
    },
  ];
  const apply = () => { if (el) el.cards = current; };
  const toastAdapter = {
    show: (o: { message: string; action?: { label: string; onClick(): void }; durationMs?: number }) => {
      const h = toast(o.message, {
        action: o.action ? { label: o.action.label, onAction: o.action.onClick } : undefined,
        duration: o.durationMs,
      });
      return { dismiss: () => h.dismiss() };
    },
  };
  onMount(() => {
    if (!el) return;
    apply();
    const recovery = dismissRecovery({
      get: () => current,
      set: (next) => { current = next; apply(); },
      toast: toastAdapter,
    });
    el.policy = { onAction: () => {}, onDismiss: recovery.onDismiss, onReopen: recovery.onReopen };
  });
  return (
    <div style={{ padding: '24px', 'max-width': '34rem', 'font-family': 'system-ui, sans-serif' }}>
      <p style={{ margin: '0 0 16px', color: '#666', 'font-size': '14px' }}>
        Click × to dismiss → it collapses to a re-openable stub plus an Undo toast (defer, not
        delete). Undo or Reopen restores it.
      </p>
      <kai-cards ref={(e) => (el = e as typeof el)} />
    </div>
  );
}

const meta = {
  title: 'Generative UI/SDK/kai-cards',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const CardStream: Story = { render: () => <Demo /> };

/** Dismiss a card without losing it — collapses to a re-openable stub + Undo toast. */
export const DismissAndRecover: Story = { render: () => <DismissDemo /> };
