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
};
