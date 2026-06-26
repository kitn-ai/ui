import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { action } from 'storybook/actions';
import { Checkpoint, CheckpointIcon, CheckpointTrigger } from './checkpoint';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'Components/Elements/Checkpoint',
  component: Checkpoint,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A thin separator-style row, placed between messages, that lets a user revert the conversation to a saved point (before an edit or a branch). `Checkpoint` wraps a `CheckpointIcon` and a `CheckpointTrigger` button.',
        'Give the trigger an `onClick` and optional `tooltip`; pass SVG children to `CheckpointIcon` to override the default flag.',
      ]),
      controls: { exclude: ['use:eventListener'] },
    },
  },
  argTypes: {
    children: {
      control: false,
      description: 'The `CheckpointIcon` and `CheckpointTrigger` contents.',
    },
    class: {
      control: 'text',
      description: 'Extra classes for the checkpoint row.',
    },
  },
  args: {},
  render: (args) => (
    <div class="max-w-md">
      <Checkpoint {...args}>
        <CheckpointIcon />
        <CheckpointTrigger tooltip="Restore to this point" onClick={() => action('checkpoint-restore')()}>
          Restore
        </CheckpointTrigger>
      </Checkpoint>
    </div>
  ),
} satisfies Meta<typeof Checkpoint>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Checkpoint, CheckpointIcon, CheckpointTrigger } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground: the default flag icon with a restore trigger. */
export const Playground: Story = {
  ...src(`<Checkpoint>
  <CheckpointIcon />
  <CheckpointTrigger tooltip="Restore to this point" onClick={handleRestore}>
    Restore
  </CheckpointTrigger>
</Checkpoint>`),
};

export const WithCustomIcon: Story = {
  render: () => (
    <div class="max-w-md">
      <Checkpoint>
        <CheckpointIcon>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-4">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="M12 6v6l4 2" />
          </svg>
        </CheckpointIcon>
        <CheckpointTrigger tooltip="Go back to this checkpoint" onClick={() => action('checkpoint-revert')()}>
          Revert to checkpoint
        </CheckpointTrigger>
      </Checkpoint>
    </div>
  ),
  ...src(`<Checkpoint>
  <CheckpointIcon>
    <ClockIcon class="size-4" />
  </CheckpointIcon>
  <CheckpointTrigger tooltip="Go back to this checkpoint" onClick={handleRevert}>
    Revert to checkpoint
  </CheckpointTrigger>
</Checkpoint>`),
};

export const NoTooltip: Story = {
  render: () => (
    <div class="max-w-md">
      <Checkpoint>
        <CheckpointIcon />
        <CheckpointTrigger onClick={() => action('checkpoint-restore')()}>Restore</CheckpointTrigger>
      </Checkpoint>
    </div>
  ),
  ...src(`<Checkpoint>
  <CheckpointIcon />
  <CheckpointTrigger onClick={handleRestore}>Restore</CheckpointTrigger>
</Checkpoint>`),
};
