import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import { action } from 'storybook/actions';
import { TasksCard, type TasksCardData } from '../components/tasks-card';

/**
 * `mode: 'progress'` is the onboarding-checklist look on `kai-tasks` (the same
 * element behind the approval list). A heading, a right-aligned `done / total`
 * count, and circular rows with a title + muted description. There's no confirm
 * button: checking a row IS the action, so the live `onValueChange` (the
 * element's `kai-value-change`) is the signal, and the header count updates as
 * rows are checked.
 */
const meta: Meta = {
  title: 'Labs/Onboarding checklist',
};
export default meta;

// Hand-written HTML for the "Show code" panel (real consumer markup, not JSX).
// Consumers reach for the <kai-tasks> element; data is set as a JS property.
const src = (code: string) => ({ docs: { source: { language: 'html', code } } });

const ONBOARDING: TasksCardData = {
  mode: 'progress',
  heading: 'Get started with Claude',
  tasks: [
    {
      id: 'role',
      label: 'Customize Claude to your role',
      description: 'Tune tone, defaults, and the projects you work in.',
    },
    {
      id: 'tools',
      label: 'Add ready-made tools and workflows',
      description: 'Connect skills and MCP servers in a couple of clicks.',
    },
  ],
};

export const GetStarted: StoryObj = {
  render: () => {
    const [selected, setSelected] = createSignal<string[]>([]);
    return (
      <div style={{ 'max-width': '460px' }}>
        <TasksCard
          data={ONBOARDING}
          cardId="onboarding"
          onValueChange={(p) => {
            setSelected(p.value);
            action('onValueChange')(p);
          }}
        />
        <p style={{ 'margin-top': '0.75rem', 'font-size': '0.8125rem', color: 'var(--color-muted-foreground)' }}>
          done {selected().length} / {ONBOARDING.tasks.length}. Check a row to advance the count.
        </p>
      </div>
    );
  },
  parameters: src(`<kai-tasks card-id="onboarding"></kai-tasks>

<script type="module">
  const el = document.querySelector('kai-tasks');
  // Array/object props are set as JS properties, never attributes.
  el.data = {
    mode: 'progress',
    heading: 'Get started with Claude',
    tasks: [
      { id: 'role', label: 'Customize Claude to your role', description: '...' },
      { id: 'tools', label: 'Add ready-made tools and workflows', description: '...' },
    ],
  };
  // No confirm in progress mode: checking a row IS the action, so the live
  // kai-value-change is the signal.
  el.addEventListener('kai-value-change', (e) => console.log(e.detail.value));
</script>`),
};

const PARTIAL: TasksCardData = {
  mode: 'progress',
  heading: 'Get started with Claude',
  tasks: [
    {
      id: 'role',
      label: 'Customize Claude to your role',
      description: 'Tune tone, defaults, and the projects you work in.',
      checked: true,
    },
    {
      id: 'tools',
      label: 'Add ready-made tools and workflows',
      description: 'Connect skills and MCP servers in a couple of clicks.',
    },
  ],
};

export const PartiallyComplete: StoryObj = {
  render: () => (
    <div style={{ 'max-width': '460px' }}>
      <TasksCard data={PARTIAL} cardId="onboarding-partial" onValueChange={action('onValueChange')} />
    </div>
  ),
  parameters: src(`<kai-tasks card-id="onboarding-partial"></kai-tasks>

<script type="module">
  const el = document.querySelector('kai-tasks');
  // Per-task \`checked: true\` seeds a row as already complete.
  el.data = {
    mode: 'progress',
    heading: 'Get started with Claude',
    tasks: [
      { id: 'role', label: 'Customize Claude to your role', description: '...', checked: true },
      { id: 'tools', label: 'Add ready-made tools and workflows', description: '...' },
    ],
  };
  el.addEventListener('kai-value-change', (e) => console.log(e.detail.value));
</script>`),
};
