import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import { action } from 'storybook/actions';
import { TasksCard, type TasksCardData } from './tasks-card';
import { componentDescription } from '../stories/docs/element-controls';
import type { CardEvent, CardHost, CardContext } from '../primitives/card-contract';

const ctx: CardContext = { theme: { mode: 'light' }, locale: 'en' };

/** Renders the Solid <TasksCard> with a capturing `host`. Every emitted
 *  `CardEvent` is shown in the inline log AND routed to the Actions panel
 *  (keyed by `kind`, e.g. `card:submit`); `onValueChange` fires on every
 *  selection change (distinct from the terminal submit). */
function Demo(props: { def: TasksCardData; heading?: string; cardId: string }) {
  const [log, setLog] = createSignal<CardEvent[]>([]);
  const host: CardHost = {
    context: () => ctx,
    emit: (e) => {
      action(`card:${e.kind}`)(e);
      setLog((p) => [...p, e]);
    },
  };
  return (
    <div style={{ 'max-width': '460px', display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
      <TasksCard
        host={host}
        data={props.def}
        heading={props.heading}
        cardId={props.cardId}
        onValueChange={action('onValueChange')}
      />
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

const PLAN: TasksCardData = {
  selectAll: true,
  confirmLabel: 'Run selected',
  tasks: [
    { id: 'lint', label: 'Run linter', checked: true },
    { id: 'test', label: 'Run unit tests', checked: true },
    { id: 'build', label: 'Build production bundle' },
    { id: 'deploy', label: 'Deploy to staging', description: 'Reversible; staging only' },
  ],
};

const BOUNDED: TasksCardData = {
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
  title: 'Components/Elements/TasksCard',
  component: TasksCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'The SolidJS layer behind `<kai-tasks>`: a checklist card the assistant can put up for plan approval or multi-select. Pass a `host` (a `CardHost`) to receive emitted `CardEvent`s directly, or wrap in a `CardProvider`. Toggling rows is local; only confirm emits `submit` with `{ selected }` in input order.',
      ]),
    },
  },
} satisfies Meta<typeof TasksCard>;

export default meta;
type Story = StoryObj<typeof TasksCard>;

const IMPORT = `import { TasksCard, type TasksCardData } from '@kitn.ai/ui';
import type { CardHost } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

export const SelectAPlan: Story = {
  render: () => <Demo def={PLAN} heading="Approve the plan steps" cardId="card-plan" />,
  ...src(`const data: TasksCardData = {
  selectAll: true,
  confirmLabel: 'Run selected',
  tasks: [
    { id: 'lint', label: 'Run linter', checked: true },
    { id: 'test', label: 'Run unit tests', checked: true },
    { id: 'build', label: 'Build production bundle' },
    { id: 'deploy', label: 'Deploy to staging', description: 'Reversible; staging only' },
  ],
};

// Toggling rows is local; only confirm emits \`submit\` with the checked ids
// in input order. A CardHost receives those events directly.
const host: CardHost = {
  context: () => ({ theme: { mode: 'light' }, locale: 'en' }),
  emit: (e) => {
    // { kind: 'submit', cardId, data: { selected: string[] } }
    if (e.kind === 'submit') console.log('run', e.data);
  },
};

<TasksCard
  host={host}
  data={data}
  heading="Approve the plan steps"
  cardId="card-plan"
  onValueChange={({ value }) => console.log('selection', value)}
/>`),
};

export const Bounded: Story = {
  render: () => <Demo def={BOUNDED} heading="Pick up to 2 reviewers" cardId="card-bounded" />,
  ...src(`// \`min\`/\`max\` gate the confirm button; rows past \`max\` are blocked.
const data: TasksCardData = {
  confirmLabel: 'Request review',
  min: 1,
  max: 2,
  tasks: [
    { id: 'ana', label: 'Ana' },
    { id: 'ben', label: 'Ben' },
    { id: 'cat', label: 'Cat' },
  ],
};

<TasksCard host={host} data={data} heading="Pick up to 2 reviewers" cardId="card-bounded" />`),
};
