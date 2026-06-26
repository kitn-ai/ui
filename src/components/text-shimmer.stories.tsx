import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { TextShimmer } from './text-shimmer';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'Components/Elements/TextShimmer',
  component: TextShimmer,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: componentDescription([
        'An animated text effect that sweeps a light gradient across its content, rendered into any element tag via `as`.',
        '**When to use:** to signal an in-progress / loading state with a label — e.g. "Thinking", "Generating", "Searching" — or to draw subtle attention to a transient status line.',
        '**How to use:** wrap text in `<TextShimmer>`; tune `duration` (seconds per sweep) and `spread` (gradient width, clamped 5–45). Use `as` to change the wrapping tag (e.g. `"h2"`) and pass any standard HTML attributes.',
        '**Placement:** loading indicators, streaming status lines, thinking bars, and placeholder labels.',
      ]),
    },
  },
  argTypes: {
    as: {
      control: 'text',
      description: 'HTML tag to render the shimmer into.',
      table: { defaultValue: { summary: 'span' } },
    },
    duration: {
      control: 'number',
      description: 'Seconds for one full shimmer sweep.',
      table: { defaultValue: { summary: '4' } },
    },
    spread: {
      control: 'number',
      description: 'Width of the gradient highlight (clamped to 5–45).',
      table: { defaultValue: { summary: '20' } },
    },
    children: {
      control: 'text',
      description: 'Text to apply the shimmer effect to.',
    },
  },
  args: {
    as: 'span',
    duration: 4,
    spread: 20,
    children: 'Shimmering text effect',
  },
  render: (args) => <TextShimmer {...args} />,
} satisfies Meta<typeof TextShimmer>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { TextShimmer } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground — tweak the controls to explore the shimmer effect. */
export const Playground: Story = {
  ...src(`<TextShimmer duration={4} spread={20}>Shimmering text effect</TextShimmer>`),
};

export const FastShimmer: Story = {
  args: { duration: 1.5, children: 'Fast shimmer animation' },
  ...src(`<TextShimmer duration={1.5}>Fast shimmer animation</TextShimmer>`),
};

export const SlowShimmer: Story = {
  args: { duration: 8, children: 'Slow shimmer animation' },
  ...src(`<TextShimmer duration={8}>Slow shimmer animation</TextShimmer>`),
};

export const WideSpread: Story = {
  args: { spread: 40, children: 'Wide spread shimmer' },
  ...src(`<TextShimmer spread={40}>Wide spread shimmer</TextShimmer>`),
};

export const NarrowSpread: Story = {
  args: { spread: 5, children: 'Narrow spread shimmer' },
  ...src(`<TextShimmer spread={5}>Narrow spread shimmer</TextShimmer>`),
};

export const AsHeading: Story = {
  args: { as: 'h2', class: 'text-2xl', children: 'Shimmer Heading' } as never,
  ...src(`<TextShimmer as="h2" class="text-2xl">Shimmer Heading</TextShimmer>`),
};
