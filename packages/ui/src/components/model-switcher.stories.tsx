import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { ModelSwitcher } from './model-switcher';
import { componentDescription } from '../stories/docs/element-controls';

const multipleModels = [
  { id: 'claude-sonnet', name: 'Claude Sonnet', provider: 'Anthropic' },
  { id: 'claude-opus', name: 'Claude Opus', provider: 'Anthropic' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google' },
];

const meta = {
  title: 'Components/Elements/ModelSwitcher',
  component: ModelSwitcher,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: componentDescription([
        'A compact dropdown that shows the active model and switches between the available `models` (each `{ id, name }` with optional `provider`, `description`, or `group`).',
        'Pass `models` and `currentModelId`, then handle `onModelChange`. Renders nothing with fewer than two models, so it is safe to mount unconditionally.',
      ]),
    },
  },
  argTypes: {
    models: {
      control: 'object',
      description: 'Selectable models. Each has `id`, `name`, and an optional `provider` label.',
    },
    currentModelId: {
      control: 'text',
      description: 'The `id` of the currently selected model.',
    },
    onModelChange: {
      action: 'modelChange',
      description: 'Fired with the chosen model `id` when the user picks a model.',
      table: { category: 'Events' },
    },
    class: {
      control: 'text',
      description: 'Extra classes applied to the trigger button.',
    },
  },
  args: {
    models: multipleModels,
    currentModelId: 'claude-sonnet',
    onModelChange: fn(),
  },
  render: (args) => <ModelSwitcher {...args} />,
} satisfies Meta<typeof ModelSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { ModelSwitcher } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground: tweak the controls to explore the switcher. */
export const Playground: Story = {
  ...src(`// Each model: { id, name, optional provider | description | group }.
const models = [
  { id: 'claude-sonnet', name: 'Claude Sonnet', provider: 'Anthropic' },
  { id: 'claude-opus', name: 'Claude Opus', provider: 'Anthropic' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
];

const [modelId, setModelId] = createSignal('claude-sonnet');

<ModelSwitcher
  models={models}
  currentModelId={modelId()}
  onModelChange={setModelId}
/>`),
};

/** Several models across providers: the dropdown lists them with provider labels. */
export const MultipleModels: Story = {
  args: { models: multipleModels, currentModelId: 'claude-sonnet' },
  ...src(`<ModelSwitcher
  models={[
    { id: 'claude-sonnet', name: 'Claude Sonnet', provider: 'Anthropic' },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  ]}
  currentModelId={modelId()}
  onModelChange={setModelId}
/>`),
};

/**
 * Rich rows + a collapsible group. `description` renders as the row subtitle
 * (preferred over `provider`), and models sharing a `group` collect under a
 * collapsible section (the ChatGPT-style "Legacy models" pattern).
 */
export const GroupedAndDescribed: Story = {
  args: {
    models: [
      { id: 'gpt-5.5', name: 'GPT-5.5', description: 'Flagship model' },
      { id: 'gpt-5.5-mini', name: 'GPT-5.5 mini', description: 'Faster, lighter' },
      { id: 'gpt-4o', name: 'GPT-4o', group: 'Legacy models' },
      { id: 'gpt-4.1', name: 'GPT-4.1', group: 'Legacy models' },
    ],
    currentModelId: 'gpt-5.5',
  },
  ...src(`<ModelSwitcher
  models={[
    { id: 'gpt-5.5', name: 'GPT-5.5', description: 'Flagship model' },
    { id: 'gpt-4o', name: 'GPT-4o', group: 'Legacy models' },
    { id: 'gpt-4.1', name: 'GPT-4.1', group: 'Legacy models' },
  ]}
  currentModelId={modelId()}
  onModelChange={setModelId}
/>`),
};

/** A single model: the switcher renders nothing (needs 2+ models). */
export const SingleModel: Story = {
  args: {
    models: [{ id: 'claude-sonnet', name: 'Claude Sonnet' }],
    currentModelId: 'claude-sonnet',
  },
  ...src(`<ModelSwitcher
  models={[{ id: 'claude-sonnet', name: 'Claude Sonnet' }]}
  currentModelId="claude-sonnet"
  onModelChange={setModelId}
/>`),
};
