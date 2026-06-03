import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { For } from 'solid-js';
import { Loader, type LoaderVariant, type LoaderSize } from './loader';

const meta: Meta = {
  title: 'Components/Loader',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => <Loader variant="circular" size="md" />,
};

export const Classic: Story = {
  render: () => <Loader variant="classic" size="md" />,
};

export const Pulse: Story = {
  render: () => <Loader variant="pulse" size="md" />,
};

export const PulseDot: Story = {
  render: () => <Loader variant="pulse-dot" size="md" />,
};

export const Dots: Story = {
  render: () => <Loader variant="dots" size="md" />,
};

export const Typing: Story = {
  render: () => <Loader variant="typing" size="md" />,
};

export const Wave: Story = {
  render: () => <Loader variant="wave" size="md" />,
};

export const Bars: Story = {
  render: () => <Loader variant="bars" size="md" />,
};

export const Terminal: Story = {
  render: () => <Loader variant="terminal" size="md" />,
};

export const TextBlink: Story = {
  render: () => <Loader variant="text-blink" text="Thinking" size="md" />,
};

export const TextShimmer: Story = {
  render: () => <Loader variant="text-shimmer" text="Analyzing" size="md" />,
};

export const LoadingDots: Story = {
  render: () => <Loader variant="loading-dots" text="Processing" size="md" />,
};

const allVariants: LoaderVariant[] = [
  'circular', 'classic', 'pulse', 'pulse-dot', 'dots', 'typing',
  'wave', 'bars', 'terminal', 'text-blink', 'text-shimmer', 'loading-dots',
];

const allSizes: LoaderSize[] = ['sm', 'md', 'lg'];

export const AllVariantsGrid: Story = {
  render: () => (
    <div class="space-y-6">
      <For each={allVariants}>
        {(variant) => (
          <div class="flex items-center gap-6">
            <span class="w-28 text-sm text-muted-foreground font-mono">{variant}</span>
            <For each={allSizes}>
              {(size) => (
                <div class="flex items-center justify-center w-24 h-10">
                  <Loader
                    variant={variant}
                    size={size}
                    text={['text-blink', 'text-shimmer', 'loading-dots'].includes(variant) ? 'Loading' : undefined}
                  />
                </div>
              )}
            </For>
          </div>
        )}
      </For>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div class="flex items-end gap-6">
      <div class="text-center space-y-2">
        <Loader variant="circular" size="sm" />
        <p class="text-xs text-muted-foreground">Small</p>
      </div>
      <div class="text-center space-y-2">
        <Loader variant="circular" size="md" />
        <p class="text-xs text-muted-foreground">Medium</p>
      </div>
      <div class="text-center space-y-2">
        <Loader variant="circular" size="lg" />
        <p class="text-xs text-muted-foreground">Large</p>
      </div>
    </div>
  ),
};
