import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { For } from 'solid-js';
import { Loader, type LoaderVariant, type LoaderSize } from './loader';

const meta = {
  title: 'Components/Loader',
  component: Loader,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: {
        component: [
          'A loading indicator with twelve animated **variants** (spinners, dots, bars, terminal, and text-based) in three **sizes**.',
          '**When to use:** while waiting on an async operation — a streaming response, a tool call, or any pending state.',
          '**How to use:** pick a `variant` and `size`. Text variants (`text-blink`, `text-shimmer`, `loading-dots`) display the `text` prop (defaults to "Thinking").',
          '**Placement:** inside assistant message bubbles, send-button states, empty states, or anywhere an in-progress signal is needed.',
        ].join('\n\n'),
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'circular', 'classic', 'pulse', 'pulse-dot', 'dots', 'typing',
        'wave', 'bars', 'terminal', 'text-blink', 'text-shimmer', 'loading-dots',
      ],
      description: 'Animation style of the loader.',
      table: { defaultValue: { summary: 'circular' } },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Loader size preset.',
      table: { defaultValue: { summary: 'md' } },
    },
    text: {
      control: 'text',
      description: 'Label shown by the text variants (`text-blink`, `text-shimmer`, `loading-dots`).',
      table: { defaultValue: { summary: 'Thinking' } },
    },
    class: {
      control: 'text',
      description: 'Additional CSS classes for the loader element.',
    },
  },
  args: {
    variant: 'circular',
    size: 'md',
    text: 'Thinking',
  },
  render: (args) => <Loader {...args} />,
} satisfies Meta<typeof Loader>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Loader } from '@kitnai/chat';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground — switch variant, size, and text to explore every loader. */
export const Playground: Story = {
  ...src(`<Loader variant="circular" size="md" />`),
};

export const Classic: Story = {
  args: { variant: 'classic' },
  ...src(`<Loader variant="classic" size="md" />`),
};

export const Pulse: Story = {
  args: { variant: 'pulse' },
  ...src(`<Loader variant="pulse" size="md" />`),
};

export const PulseDot: Story = {
  args: { variant: 'pulse-dot' },
  ...src(`<Loader variant="pulse-dot" size="md" />`),
};

export const Dots: Story = {
  args: { variant: 'dots' },
  ...src(`<Loader variant="dots" size="md" />`),
};

export const Typing: Story = {
  args: { variant: 'typing' },
  ...src(`<Loader variant="typing" size="md" />`),
};

export const Wave: Story = {
  args: { variant: 'wave' },
  ...src(`<Loader variant="wave" size="md" />`),
};

export const Bars: Story = {
  args: { variant: 'bars' },
  ...src(`<Loader variant="bars" size="md" />`),
};

export const Terminal: Story = {
  args: { variant: 'terminal' },
  ...src(`<Loader variant="terminal" size="md" />`),
};

export const TextBlink: Story = {
  args: { variant: 'text-blink', text: 'Thinking' },
  ...src(`<Loader variant="text-blink" text="Thinking" size="md" />`),
};

export const TextShimmer: Story = {
  args: { variant: 'text-shimmer', text: 'Analyzing' },
  ...src(`<Loader variant="text-shimmer" text="Analyzing" size="md" />`),
};

export const LoadingDots: Story = {
  args: { variant: 'loading-dots', text: 'Processing' },
  ...src(`<Loader variant="loading-dots" text="Processing" size="md" />`),
};

const allVariants: LoaderVariant[] = [
  'circular', 'classic', 'pulse', 'pulse-dot', 'dots', 'typing',
  'wave', 'bars', 'terminal', 'text-blink', 'text-shimmer', 'loading-dots',
];

const allSizes: LoaderSize[] = ['sm', 'md', 'lg'];

/** Every variant across every size (showcase — not driven by controls). */
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
  ...src(`<Loader variant="circular" size="sm" />
<Loader variant="circular" size="md" />
<Loader variant="circular" size="lg" />`),
};

/** A single variant rendered at all three sizes (showcase). */
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
  ...src(`<Loader variant="circular" size="sm" />
<Loader variant="circular" size="md" />
<Loader variant="circular" size="lg" />`),
};
