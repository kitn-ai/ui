import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { ThinkingBar } from './thinking-bar';

const meta: Meta = {
  title: 'Components/ThinkingBar',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => <ThinkingBar />,
};

export const WithStopButton: Story = {
  render: () => (
    <ThinkingBar
      onStop={() => console.log('Stop clicked')}
    />
  ),
};

export const CustomText: Story = {
  render: () => (
    <ThinkingBar
      text="Analyzing documents"
      onStop={() => console.log('Stop clicked')}
      stopLabel="Cancel"
    />
  ),
};

export const Clickable: Story = {
  render: () => (
    <ThinkingBar
      text="Reasoning"
      onClick={() => console.log('Clicked thinking bar')}
      onStop={() => console.log('Stop clicked')}
    />
  ),
};
