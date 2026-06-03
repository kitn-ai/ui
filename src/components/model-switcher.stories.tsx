import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import { ModelSwitcher } from './model-switcher';

const meta: Meta = {
  title: 'Components/ModelSwitcher',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

const multipleModels = [
  { id: 'claude-sonnet', name: 'Claude Sonnet', provider: 'Anthropic' },
  { id: 'claude-opus', name: 'Claude Opus', provider: 'Anthropic' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google' },
];

export const MultipleModels: Story = {
  render: () => {
    const [model, setModel] = createSignal('claude-sonnet');
    return (
      <ModelSwitcher
        models={multipleModels}
        currentModelId={model()}
        onModelChange={setModel}
      />
    );
  },
};

export const SingleModel: Story = {
  render: () => (
    <div class="text-sm text-muted-foreground">
      <p>When only one model is provided, the switcher is hidden:</p>
      <div class="mt-2 p-4 bg-muted/30 rounded-lg">
        <ModelSwitcher
          models={[{ id: 'claude-sonnet', name: 'Claude Sonnet' }]}
          currentModelId="claude-sonnet"
          onModelChange={() => {}}
        />
        <span class="text-xs text-muted-foreground italic">(nothing renders here)</span>
      </div>
    </div>
  ),
};
