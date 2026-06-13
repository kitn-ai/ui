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
  title: 'Components/ModelSwitcher',
  component: ModelSwitcher,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: componentDescription([
        'A compact dropdown that shows the active model and lets the user switch between the available **models** (grouped by optional `provider` label).',
        '**When to use:** when a chat surface offers more than one model. It renders nothing when fewer than two models are provided, so it is safe to mount unconditionally.',
        '**How to use:** pass the `models` list and the `currentModelId`, then handle `onModelChange` to update your selected-model state.',
        '**Placement:** the prompt input action bar, a chat header, or a settings/toolbar row near the composer.',
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

const IMPORT = `import { ModelSwitcher } from '@kitnai/chat';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground — tweak the controls to explore the switcher. */
export const Playground: Story = {
  ...src(`<ModelSwitcher
  models={models}
  currentModelId={modelId()}
  onModelChange={setModelId}
/>`),
};

/** Several models across providers — the dropdown lists them with provider labels. */
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

/** A single model — the switcher renders nothing (needs 2+ models). */
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
