import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import { ConfirmCard, type ConfirmCardData } from './confirm-card';
import { componentDescription } from '../stories/docs/element-controls';
import type { CardEvent, CardHost, CardContext } from '../primitives/card-contract';

const ctx: CardContext = { theme: { mode: 'light' }, locale: 'en' };

/** Renders the Solid <ConfirmCard> with a capturing `host`, logging emitted events. */
function Demo(props: { def: ConfirmCardData; heading?: string; cardId: string }) {
  const [log, setLog] = createSignal<CardEvent[]>([]);
  const host: CardHost = { context: () => ctx, emit: (e) => setLog((p) => [...p, e]) };
  return (
    <div style={{ 'max-width': '460px', display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
      <ConfirmCard host={host} data={props.def} heading={props.heading} cardId={props.cardId} />
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
  body: 'Permanently delete 12 files? This cannot be undone.',
  tone: 'danger',
  actions: [
    { id: 'delete', label: 'Delete files', style: 'destructive', default: true },
    { id: 'cancel', label: 'Keep them' },
  ],
};

const meta = {
  title: 'SolidJS (advanced)/Components/ConfirmCard',
  component: ConfirmCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'The SolidJS layer behind `<kc-confirm>`. Pass a `host` (a `CardHost`) to receive the emitted `CardEvent`s directly (the native-host path), or wrap in a `CardProvider`. Activating an action emits the `action` verb and resolves the card.',
      ]),
    },
  },
} satisfies Meta<typeof ConfirmCard>;

export default meta;
type Story = StoryObj<typeof ConfirmCard>;

export const ApproveReject: Story = {
  render: () => <Demo def={APPROVE} heading="Run database migration?" cardId="card-approve" />,
};

export const Destructive: Story = {
  render: () => <Demo def={DESTRUCTIVE} heading="Delete files?" cardId="card-delete" />,
};
