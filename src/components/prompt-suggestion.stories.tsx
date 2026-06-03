import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { PromptSuggestion } from './prompt-suggestion';

const meta: Meta = {
  title: 'Components/PromptSuggestion',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => <PromptSuggestion>Tell me about TypeScript</PromptSuggestion>,
};

export const WithHighlight: Story = {
  render: () => (
    <PromptSuggestion highlight="TypeScript">Tell me about TypeScript generics</PromptSuggestion>
  ),
};

export const MultipleSuggestions: Story = {
  render: () => (
    <div class="flex flex-wrap gap-2">
      <PromptSuggestion>What is SolidJS?</PromptSuggestion>
      <PromptSuggestion>Explain reactive signals</PromptSuggestion>
      <PromptSuggestion>Compare SolidJS vs React</PromptSuggestion>
      <PromptSuggestion>Best practices for state management</PromptSuggestion>
    </div>
  ),
};

export const WithHighlightedSearch: Story = {
  render: () => (
    <div class="w-72 space-y-1">
      <PromptSuggestion highlight="solid">How does SolidJS handle reactivity?</PromptSuggestion>
      <PromptSuggestion highlight="solid">What makes SolidJS fast?</PromptSuggestion>
      <PromptSuggestion highlight="solid">SolidJS vs Svelte comparison</PromptSuggestion>
    </div>
  ),
};

export const BlockList: Story = {
  name: 'Block (list idiom, no highlight)',
  render: () => (
    <div class="w-72 flex flex-col gap-1">
      <PromptSuggestion block>What does being a Catalyst mean for how I work with others?</PromptSuggestion>
      <PromptSuggestion block>How do my Dominance and Influence styles play off each other?</PromptSuggestion>
      <PromptSuggestion block>Where might my lower Conscientiousness trip me up?</PromptSuggestion>
    </div>
  ),
};
