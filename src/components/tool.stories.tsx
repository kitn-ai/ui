import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Tool } from './tool';
import type { ToolPart } from './tool';
import { componentDescription } from '../stories/docs/element-controls';

const streamingPart: ToolPart = {
  type: 'search_documents',
  state: 'input-streaming',
  input: { query: 'SolidJS reactive primitives' },
  toolCallId: 'call_abc123',
};

const readyPart: ToolPart = {
  type: 'search_documents',
  state: 'input-available',
  input: { query: 'SolidJS reactive primitives', limit: 10 },
  toolCallId: 'call_abc123',
};

const completedPart: ToolPart = {
  type: 'search_documents',
  state: 'output-available',
  input: { query: 'SolidJS reactive primitives', limit: 10 },
  output: { results: [{ title: 'Signals', score: 0.95 }, { title: 'Effects', score: 0.87 }] },
  toolCallId: 'call_abc123',
};

const errorPart: ToolPart = {
  type: 'search_documents',
  state: 'output-error',
  input: { query: 'SolidJS reactive primitives' },
  errorText: 'Connection timeout: unable to reach the search service after 30 seconds.',
  toolCallId: 'call_abc123',
};

const meta = {
  title: 'Solid (Advanced)/Elements/Tool',
  component: Tool,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: componentDescription([
        'A collapsible panel that visualizes a single tool call — its name, state (processing / ready / completed / error), input, output, error, and call ID.',
        '**When to use:** to surface assistant tool/function calls in the conversation, so users can inspect what was run and what came back.',
        '**How to use:** pass a `toolPart` describing the call (`type`, `state`, optional `input`, `output`, `errorText`, `toolCallId`). State drives the icon and badge automatically. Set `defaultOpen` to start expanded.',
        '**Placement:** inline within an assistant message, typically between text segments where the tool was invoked.',
      ]),
    },
  },
  argTypes: {
    toolPart: {
      control: 'object',
      description: 'The tool call to render — `type`, `state`, and optional `input`/`output`/`errorText`/`toolCallId`.',
    },
    defaultOpen: {
      control: 'boolean',
      description: 'Whether the panel starts expanded.',
      table: { defaultValue: { summary: 'false' } },
    },
    class: {
      control: 'text',
      description: 'Additional CSS classes for the container.',
    },
  },
  args: {
    toolPart: completedPart,
    defaultOpen: true,
  },
  render: (args) => <Tool {...args} />,
} satisfies Meta<typeof Tool>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Tool } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground — edit the `toolPart` object to explore every state. */
export const Playground: Story = {
  ...src(`<Tool
  toolPart={{
    type: 'search_documents',
    state: 'output-available',
    input: { query: 'SolidJS reactive primitives', limit: 10 },
    output: { results: [{ title: 'Signals', score: 0.95 }] },
    toolCallId: 'call_abc123',
  }}
  defaultOpen
/>`),
};

export const Processing: Story = {
  args: { toolPart: streamingPart, defaultOpen: true },
  ...src(`<Tool
  toolPart={{
    type: 'search_documents',
    state: 'input-streaming',
    input: { query: 'SolidJS reactive primitives' },
    toolCallId: 'call_abc123',
  }}
  defaultOpen
/>`),
};

export const Ready: Story = {
  args: { toolPart: readyPart, defaultOpen: true },
  ...src(`<Tool
  toolPart={{
    type: 'search_documents',
    state: 'input-available',
    input: { query: 'SolidJS reactive primitives', limit: 10 },
    toolCallId: 'call_abc123',
  }}
  defaultOpen
/>`),
};

export const Completed: Story = {
  args: { toolPart: completedPart, defaultOpen: true },
  ...src(`<Tool
  toolPart={{
    type: 'search_documents',
    state: 'output-available',
    input: { query: 'SolidJS reactive primitives', limit: 10 },
    output: { results: [{ title: 'Signals', score: 0.95 }, { title: 'Effects', score: 0.87 }] },
    toolCallId: 'call_abc123',
  }}
  defaultOpen
/>`),
};

export const Error: Story = {
  args: { toolPart: errorPart, defaultOpen: true },
  ...src(`<Tool
  toolPart={{
    type: 'search_documents',
    state: 'output-error',
    input: { query: 'SolidJS reactive primitives' },
    errorText: 'Connection timeout: unable to reach the search service after 30 seconds.',
    toolCallId: 'call_abc123',
  }}
  defaultOpen
/>`),
};

export const Collapsed: Story = {
  args: { toolPart: completedPart, defaultOpen: false },
  ...src(`<Tool toolPart={toolPart} />`),
};
