// src/elements/cards.stories.tsx
import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, onMount } from 'solid-js';
import './register'; // registers all kai-* incl. kai-cards
import type { CardEnvelope, CardEvent } from '../primitives/card-contract';

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

const meta = {
  title: 'Generative UI/SDK/kai-cards',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const CardStream: Story = { render: () => <Demo /> };
