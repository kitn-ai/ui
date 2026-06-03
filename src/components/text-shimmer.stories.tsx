import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { TextShimmer } from './text-shimmer';

const meta: Meta = {
  title: 'Components/TextShimmer',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => <TextShimmer>Shimmering text effect</TextShimmer>,
};

export const FastShimmer: Story = {
  render: () => <TextShimmer duration={1.5}>Fast shimmer animation</TextShimmer>,
};

export const SlowShimmer: Story = {
  render: () => <TextShimmer duration={8}>Slow shimmer animation</TextShimmer>,
};

export const WideSpread: Story = {
  render: () => <TextShimmer spread={40}>Wide spread shimmer</TextShimmer>,
};

export const NarrowSpread: Story = {
  render: () => <TextShimmer spread={5}>Narrow spread shimmer</TextShimmer>,
};

export const AsHeading: Story = {
  render: () => <TextShimmer as="h2" class="text-2xl">Shimmer Heading</TextShimmer>,
};
