import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { PromptSuggestion } from './prompt-suggestion';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'Components/Elements/PromptSuggestion',
  component: PromptSuggestion,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A clickable starter/follow-up prompt. Text goes in children; `onClick` submits it. Renders as a rounded pill by default; `block` makes a full-width list row, and `highlight` emphasizes a matched substring (forcing the list-row layout) for type-ahead filtering.',
      ]),
      controls: { exclude: ['use:eventListener'] },
    },
  },
  argTypes: {
    children: {
      control: 'text',
      description: 'Suggestion content: the prompt text (or an element).',
    },
    variant: {
      control: 'select',
      options: ['default', 'ghost', 'outline'],
      description: 'Button visual emphasis. Defaults vary by mode (`outline` pill, `ghost` highlight).',
      table: { defaultValue: { summary: 'outline' } },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'icon', 'icon-sm'],
      description: 'Button size preset. Defaults vary by mode.',
      table: { defaultValue: { summary: 'lg' } },
    },
    highlight: {
      control: 'text',
      description: 'Substring to emphasize within the text. When set, renders as a list row with the match highlighted.',
    },
    block: {
      control: 'boolean',
      description: 'Render as a full-width, left-aligned list row that wraps long text instead of a pill. Ignored in highlight mode.',
      table: { defaultValue: { summary: 'false' } },
    },
    onClick: {
      action: 'click',
      description: 'Fired when the suggestion is clicked.',
      table: { category: 'Events' },
    },
  },
  args: {
    children: 'Tell me about TypeScript',
    variant: 'outline',
    block: false,
    onClick: fn(),
  },
  render: (args) => <PromptSuggestion {...args} />,
} satisfies Meta<typeof PromptSuggestion>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { PromptSuggestion } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground: tweak the controls to explore every mode. */
export const Playground: Story = {
  ...src(`<PromptSuggestion onClick={() => send('Tell me about TypeScript')}>
  Tell me about TypeScript
</PromptSuggestion>`),
};

export const WithHighlight: Story = {
  args: { highlight: 'TypeScript', children: 'Tell me about TypeScript generics' },
  ...src(`<PromptSuggestion highlight="TypeScript">
  Tell me about TypeScript generics
</PromptSuggestion>`),
};

export const Block: Story = {
  name: 'Block (list idiom)',
  args: { block: true, children: 'What does being a Catalyst mean for how I work with others?' },
  ...src(`<PromptSuggestion block>
  What does being a Catalyst mean for how I work with others?
</PromptSuggestion>`),
};

/** A row of pill suggestions (showcase, not driven by controls). */
export const MultipleSuggestions: Story = {
  render: (args: { onClick?: (e: MouseEvent) => void }) => (
    <div class="flex flex-wrap gap-2">
      <PromptSuggestion onClick={args.onClick}>What is SolidJS?</PromptSuggestion>
      <PromptSuggestion onClick={args.onClick}>Explain reactive signals</PromptSuggestion>
      <PromptSuggestion onClick={args.onClick}>Compare SolidJS vs React</PromptSuggestion>
      <PromptSuggestion onClick={args.onClick}>Best practices for state management</PromptSuggestion>
    </div>
  ),
  ...src(`<div class="flex flex-wrap gap-2">
  <PromptSuggestion>What is SolidJS?</PromptSuggestion>
  <PromptSuggestion>Explain reactive signals</PromptSuggestion>
  <PromptSuggestion>Compare SolidJS vs React</PromptSuggestion>
  <PromptSuggestion>Best practices for state management</PromptSuggestion>
</div>`),
};

/** Filtered list with a highlighted match (showcase). */
export const WithHighlightedSearch: Story = {
  render: (args: { onClick?: (e: MouseEvent) => void }) => (
    <div class="w-72 space-y-1">
      <PromptSuggestion highlight="solid" onClick={args.onClick}>How does SolidJS handle reactivity?</PromptSuggestion>
      <PromptSuggestion highlight="solid" onClick={args.onClick}>What makes SolidJS fast?</PromptSuggestion>
      <PromptSuggestion highlight="solid" onClick={args.onClick}>SolidJS vs Svelte comparison</PromptSuggestion>
    </div>
  ),
  ...src(`<div class="w-72 space-y-1">
  <PromptSuggestion highlight="solid">How does SolidJS handle reactivity?</PromptSuggestion>
  <PromptSuggestion highlight="solid">What makes SolidJS fast?</PromptSuggestion>
  <PromptSuggestion highlight="solid">SolidJS vs Svelte comparison</PromptSuggestion>
</div>`),
};

/** Stacked, full-width list rows (showcase). */
export const BlockList: Story = {
  name: 'Block list',
  render: (args: { onClick?: (e: MouseEvent) => void }) => (
    <div class="w-72 flex flex-col gap-1">
      <PromptSuggestion block onClick={args.onClick}>What does being a Catalyst mean for how I work with others?</PromptSuggestion>
      <PromptSuggestion block onClick={args.onClick}>How do my Dominance and Influence styles play off each other?</PromptSuggestion>
      <PromptSuggestion block onClick={args.onClick}>Where might my lower Conscientiousness trip me up?</PromptSuggestion>
    </div>
  ),
  ...src(`<div class="w-72 flex flex-col gap-1">
  <PromptSuggestion block>What does being a Catalyst mean for how I work with others?</PromptSuggestion>
  <PromptSuggestion block>How do my Dominance and Influence styles play off each other?</PromptSuggestion>
  <PromptSuggestion block>Where might my lower Conscientiousness trip me up?</PromptSuggestion>
</div>`),
};
