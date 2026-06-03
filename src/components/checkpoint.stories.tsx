import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Checkpoint, CheckpointIcon, CheckpointTrigger } from './checkpoint';

const meta: Meta = {
  title: 'Components/Checkpoint',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <div class="max-w-md">
      <Checkpoint>
        <CheckpointIcon />
        <CheckpointTrigger tooltip="Restore to this point">
          Restore
        </CheckpointTrigger>
      </Checkpoint>
    </div>
  ),
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
        <CheckpointTrigger tooltip="Go back to this checkpoint">
          Revert to checkpoint
        </CheckpointTrigger>
      </Checkpoint>
    </div>
  ),
};

export const NoTooltip: Story = {
  render: () => (
    <div class="max-w-md">
      <Checkpoint>
        <CheckpointIcon />
        <CheckpointTrigger>Restore</CheckpointTrigger>
      </Checkpoint>
    </div>
  ),
};
