import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import {
  ChainOfThought,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
  ChainOfThoughtContent,
  ChainOfThoughtItem,
} from './chain-of-thought';

const meta: Meta = {
  title: 'Components/ChainOfThought',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const SingleStep: Story = {
  render: () => (
    <ChainOfThought>
      <ChainOfThoughtStep isLast>
        <ChainOfThoughtTrigger>Analyzing the question</ChainOfThoughtTrigger>
        <ChainOfThoughtContent>
          <ChainOfThoughtItem>
            Breaking down the user's query into key concepts and identifying relevant knowledge areas.
          </ChainOfThoughtItem>
        </ChainOfThoughtContent>
      </ChainOfThoughtStep>
    </ChainOfThought>
  ),
};

export const MultipleSteps: Story = {
  render: () => (
    <ChainOfThought>
      <ChainOfThoughtStep>
        <ChainOfThoughtTrigger>Understanding the question</ChainOfThoughtTrigger>
        <ChainOfThoughtContent>
          <ChainOfThoughtItem>
            The user is asking about reactive programming concepts in SolidJS.
          </ChainOfThoughtItem>
        </ChainOfThoughtContent>
      </ChainOfThoughtStep>
      <ChainOfThoughtStep>
        <ChainOfThoughtTrigger>Searching knowledge base</ChainOfThoughtTrigger>
        <ChainOfThoughtContent>
          <ChainOfThoughtItem>
            Found 3 relevant documents about SolidJS signals and reactivity.
          </ChainOfThoughtItem>
        </ChainOfThoughtContent>
      </ChainOfThoughtStep>
      <ChainOfThoughtStep isLast>
        <ChainOfThoughtTrigger>Formulating response</ChainOfThoughtTrigger>
        <ChainOfThoughtContent>
          <ChainOfThoughtItem>
            Combining insights from documentation and examples to create a comprehensive answer.
          </ChainOfThoughtItem>
        </ChainOfThoughtContent>
      </ChainOfThoughtStep>
    </ChainOfThought>
  ),
};

export const WithCustomIcons: Story = {
  render: () => (
    <ChainOfThought>
      <ChainOfThoughtStep>
        <ChainOfThoughtTrigger
          leftIcon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          }
        >
          Searching documents
        </ChainOfThoughtTrigger>
        <ChainOfThoughtContent>
          <ChainOfThoughtItem>Found 5 relevant results.</ChainOfThoughtItem>
        </ChainOfThoughtContent>
      </ChainOfThoughtStep>
      <ChainOfThoughtStep isLast>
        <ChainOfThoughtTrigger
          leftIcon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
        >
          Analysis complete
        </ChainOfThoughtTrigger>
        <ChainOfThoughtContent>
          <ChainOfThoughtItem>All sources have been analyzed and synthesized.</ChainOfThoughtItem>
        </ChainOfThoughtContent>
      </ChainOfThoughtStep>
    </ChainOfThought>
  ),
};
