import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import {
  ChainOfThought,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
  ChainOfThoughtContent,
  ChainOfThoughtItem,
} from './chain-of-thought';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'SolidJS (advanced)/Components/ChainOfThought',
  component: ChainOfThought,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A vertical, collapsible timeline that reveals an agent\'s reasoning as a series of connected steps. Composed of `ChainOfThought` (root) wrapping `ChainOfThoughtStep` items, each with a `ChainOfThoughtTrigger`, `ChainOfThoughtContent`, and one or more `ChainOfThoughtItem`s.',
        '**When to use:** to surface multi-step reasoning, tool calls, or research progress behind an assistant response, letting users expand each step on demand.',
        '**How to use:** map each reasoning step to a `ChainOfThoughtStep` (mark the final one with `isLast`); put the summary in `ChainOfThoughtTrigger` and the detail inside `ChainOfThoughtContent` / `ChainOfThoughtItem`.',
        '**Placement:** above or within an assistant message, typically before the final answer.',
      ]),
      controls: { exclude: ['use:eventListener'] },
    },
  },
  argTypes: {
    children: {
      control: false,
      description: 'The `ChainOfThoughtStep` items that make up the timeline.',
    },
    class: {
      control: 'text',
      description: 'Extra classes for the root wrapper.',
    },
  },
  args: {},
  render: (args) => (
    <ChainOfThought {...args}>
      <ChainOfThoughtStep>
        <ChainOfThoughtTrigger>Understanding the question</ChainOfThoughtTrigger>
        <ChainOfThoughtContent>
          <ChainOfThoughtItem>
            The user is asking about reactive programming concepts in SolidJS.
          </ChainOfThoughtItem>
        </ChainOfThoughtContent>
      </ChainOfThoughtStep>
      <ChainOfThoughtStep isLast>
        <ChainOfThoughtTrigger>Formulating response</ChainOfThoughtTrigger>
        <ChainOfThoughtContent>
          <ChainOfThoughtItem>
            Combining insights from documentation and examples into a clear answer.
          </ChainOfThoughtItem>
        </ChainOfThoughtContent>
      </ChainOfThoughtStep>
    </ChainOfThought>
  ),
} satisfies Meta<typeof ChainOfThought>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import {
  ChainOfThought, ChainOfThoughtStep, ChainOfThoughtTrigger,
  ChainOfThoughtContent, ChainOfThoughtItem,
} from '@kitn.ai/chat';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground — expand the steps to reveal each reasoning item. */
export const Playground: Story = {
  ...src(`<ChainOfThought>
  <ChainOfThoughtStep>
    <ChainOfThoughtTrigger>Understanding the question</ChainOfThoughtTrigger>
    <ChainOfThoughtContent>
      <ChainOfThoughtItem>The user is asking about SolidJS reactivity.</ChainOfThoughtItem>
    </ChainOfThoughtContent>
  </ChainOfThoughtStep>
  <ChainOfThoughtStep isLast>
    <ChainOfThoughtTrigger>Formulating response</ChainOfThoughtTrigger>
    <ChainOfThoughtContent>
      <ChainOfThoughtItem>Combining insights into a clear answer.</ChainOfThoughtItem>
    </ChainOfThoughtContent>
  </ChainOfThoughtStep>
</ChainOfThought>`),
};

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
  ...src(`<ChainOfThought>
  <ChainOfThoughtStep isLast>
    <ChainOfThoughtTrigger>Analyzing the question</ChainOfThoughtTrigger>
    <ChainOfThoughtContent>
      <ChainOfThoughtItem>Breaking down the query into key concepts.</ChainOfThoughtItem>
    </ChainOfThoughtContent>
  </ChainOfThoughtStep>
</ChainOfThought>`),
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
  ...src(`<ChainOfThought>
  <ChainOfThoughtStep>
    <ChainOfThoughtTrigger>Understanding the question</ChainOfThoughtTrigger>
    <ChainOfThoughtContent>
      <ChainOfThoughtItem>The user is asking about SolidJS reactivity.</ChainOfThoughtItem>
    </ChainOfThoughtContent>
  </ChainOfThoughtStep>
  <ChainOfThoughtStep>
    <ChainOfThoughtTrigger>Searching knowledge base</ChainOfThoughtTrigger>
    <ChainOfThoughtContent>
      <ChainOfThoughtItem>Found 3 relevant documents.</ChainOfThoughtItem>
    </ChainOfThoughtContent>
  </ChainOfThoughtStep>
  <ChainOfThoughtStep isLast>
    <ChainOfThoughtTrigger>Formulating response</ChainOfThoughtTrigger>
    <ChainOfThoughtContent>
      <ChainOfThoughtItem>Combining insights into a clear answer.</ChainOfThoughtItem>
    </ChainOfThoughtContent>
  </ChainOfThoughtStep>
</ChainOfThought>`),
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
  ...src(`<ChainOfThought>
  <ChainOfThoughtStep>
    <ChainOfThoughtTrigger leftIcon={<SearchIcon />}>Searching documents</ChainOfThoughtTrigger>
    <ChainOfThoughtContent>
      <ChainOfThoughtItem>Found 5 relevant results.</ChainOfThoughtItem>
    </ChainOfThoughtContent>
  </ChainOfThoughtStep>
  <ChainOfThoughtStep isLast>
    <ChainOfThoughtTrigger leftIcon={<CheckIcon />}>Analysis complete</ChainOfThoughtTrigger>
    <ChainOfThoughtContent>
      <ChainOfThoughtItem>All sources analyzed and synthesized.</ChainOfThoughtItem>
    </ChainOfThoughtContent>
  </ChainOfThoughtStep>
</ChainOfThought>`),
};
