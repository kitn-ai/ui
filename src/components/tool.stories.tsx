import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Tool } from './tool';
import type { ToolPart } from './tool';

const meta: Meta = {
  title: 'Components/Tool',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

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

export const Processing: Story = {
  render: () => <Tool toolPart={streamingPart} defaultOpen />,
};

export const Ready: Story = {
  render: () => <Tool toolPart={readyPart} defaultOpen />,
};

export const Completed: Story = {
  render: () => <Tool toolPart={completedPart} defaultOpen />,
};

export const Error: Story = {
  render: () => <Tool toolPart={errorPart} defaultOpen />,
};

export const Collapsed: Story = {
  render: () => <Tool toolPart={completedPart} />,
};
