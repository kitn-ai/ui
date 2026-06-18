import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { PromptSuggestion } from './prompt-suggestion';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'Solid (Advanced)/Elements/PromptSuggestion',
  component: PromptSuggestion,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A clickable suggestion chip built on `Button` — renders as a rounded pill, a full-width list row (`block`), or a search-style row that highlights a matching substring (`highlight`).',
        '**When to use:** offer the user ready-made prompts to send — empty-state starter questions, follow-up suggestions, or a filtered list of matching prompts as they type.',
        '**How to use:** pass the prompt text as children and wire `onClick` to submit it. Use `block` for stacked, left-aligned list rows; pass `highlight` to emphasize a matched substring (forces list-row layout). Override `variant`/`size` to restyle.',
        '**Placement:** chat empty states, below the prompt input as follow-ups, or in a suggestion dropdown.',
      ]),
      controls: { exclude: ['use:eventListener'] },
    },
  },
  argTypes: {
    children: {
      control: 'text',
      description: 'Suggestion content — the prompt text (or an element).',
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

/** Interactive playground — tweak the controls to explore every mode. */
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

/** A row of pill suggestions (showcase — not driven by controls). */
export const MultipleSuggestions: Story = {
  render: () => (
    <div class="flex flex-wrap gap-2">
      <PromptSuggestion>What is SolidJS?</PromptSuggestion>
      <PromptSuggestion>Explain reactive signals</PromptSuggestion>
      <PromptSuggestion>Compare SolidJS vs React</PromptSuggestion>
      <PromptSuggestion>Best practices for state management</PromptSuggestion>
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
  render: () => (
    <div class="w-72 space-y-1">
      <PromptSuggestion highlight="solid">How does SolidJS handle reactivity?</PromptSuggestion>
      <PromptSuggestion highlight="solid">What makes SolidJS fast?</PromptSuggestion>
      <PromptSuggestion highlight="solid">SolidJS vs Svelte comparison</PromptSuggestion>
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
  render: () => (
    <div class="w-72 flex flex-col gap-1">
      <PromptSuggestion block>What does being a Catalyst mean for how I work with others?</PromptSuggestion>
      <PromptSuggestion block>How do my Dominance and Influence styles play off each other?</PromptSuggestion>
      <PromptSuggestion block>Where might my lower Conscientiousness trip me up?</PromptSuggestion>
    </div>
  ),
  ...src(`<div class="w-72 flex flex-col gap-1">
  <PromptSuggestion block>What does being a Catalyst mean for how I work with others?</PromptSuggestion>
  <PromptSuggestion block>How do my Dominance and Influence styles play off each other?</PromptSuggestion>
  <PromptSuggestion block>Where might my lower Conscientiousness trip me up?</PromptSuggestion>
</div>`),
};
