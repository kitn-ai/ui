import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import { TaskListCard, type TaskListCardData } from './task-list-card';
import { componentDescription } from '../stories/docs/element-controls';
import type { CardEvent, CardHost, CardContext } from '../primitives/card-contract';

const ctx: CardContext = { theme: { mode: 'light' }, locale: 'en' };

/** Renders the Solid <TaskListCard> with a capturing `host`, logging emitted events. */
function Demo(props: { def: TaskListCardData; heading?: string; cardId: string }) {
  const [log, setLog] = createSignal<CardEvent[]>([]);
  const host: CardHost = { context: () => ctx, emit: (e) => setLog((p) => [...p, e]) };
  return (
    <div style={{ 'max-width': '460px', display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
      <TaskListCard host={host} data={props.def} heading={props.heading} cardId={props.cardId} />
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

const PLAN: TaskListCardData = {
  selectAll: true,
  confirmLabel: 'Run selected',
  tasks: [
    { id: 'lint', label: 'Run linter', checked: true },
    { id: 'test', label: 'Run unit tests', checked: true },
    { id: 'build', label: 'Build production bundle' },
    { id: 'deploy', label: 'Deploy to staging', description: 'Reversible; staging only' },
  ],
};

const BOUNDED: TaskListCardData = {
  confirmLabel: 'Request review',
  min: 1,
  max: 2,
  tasks: [
    { id: 'ana', label: 'Ana' },
    { id: 'ben', label: 'Ben' },
    { id: 'cat', label: 'Cat' },
  ],
};

const meta = {
  title: 'Components/TaskListCard',
  component: TaskListCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'The SolidJS layer behind `<kc-task-list>`. Pass a `host` (a `CardHost`) to receive the emitted `CardEvent`s directly (the native-host path), or wrap in a `CardProvider`. Toggling rows is local; only confirm emits `submit-data` with `{ selected }` in input order.',
      ]),
    },
  },
} satisfies Meta<typeof TaskListCard>;

export default meta;
type Story = StoryObj<typeof TaskListCard>;

export const SelectAPlan: Story = {
  render: () => <Demo def={PLAN} heading="Approve the plan steps" cardId="card-plan" />,
};

export const Bounded: Story = {
  render: () => <Demo def={BOUNDED} heading="Pick up to 2 reviewers" cardId="card-bounded" />,
};
