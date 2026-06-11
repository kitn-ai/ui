import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, For } from 'solid-js';
import {
  PromptInput, PromptInputTextarea, PromptInputActions,
  PromptSuggestion, ModelSwitcher, Loader, Button,
} from '../index';
import type { ModelOption } from '../types';
import { ArrowUp, Paperclip, Globe, Mic, Square, Sparkles } from 'lucide-solid';

const meta: Meta = {
  title: 'Examples/Prompt Input Variants',
  parameters: { layout: 'padded', options: { showPanel: false } },
};

export default meta;
type Story = StoryObj;

export const BasicInput: Story = {
  name: 'Basic Input',
  render: () => {
    const [value, setValue] = createSignal('');
    return (
      <div class="w-full max-w-2xl p-4">
        <PromptInput value={value()} onValueChange={setValue} onSubmit={() => setValue('')}>
          <PromptInputTextarea placeholder="Ask anything..." />
          <PromptInputActions class="justify-end">
            <Button variant="default" size="icon-sm" class="rounded-full" disabled={!value()}>
              <ArrowUp class="size-4" />
            </Button>
          </PromptInputActions>
        </PromptInput>
      </div>
    );
  },
};

export const WithSuggestions: Story = {
  name: 'With Suggestion Chips',
  render: () => {
    const [value, setValue] = createSignal('');

    const suggestionGroups = [
      {
        label: 'Get started',
        items: ['Summarize this document', 'What are the key takeaways?', 'Create an outline'],
      },
      {
        label: 'Go deeper',
        items: ['Compare with similar approaches', 'What are the tradeoffs?', 'Find contradictions'],
      },
    ];

    return (
      <div class="w-full max-w-2xl p-4 space-y-4">
        <For each={suggestionGroups}>
          {(group) => (
            <div class="space-y-2">
              <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">{group.label}</span>
              <div class="flex flex-wrap gap-2">
                <For each={group.items}>
                  {(item) => (
                    <PromptSuggestion onClick={() => setValue(item)}>
                      {item}
                    </PromptSuggestion>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>

        <PromptInput value={value()} onValueChange={setValue} onSubmit={() => setValue('')}>
          <PromptInputTextarea placeholder="Ask about this document..." />
          <PromptInputActions class="justify-end">
            <Button variant="default" size="icon-sm" class="rounded-full" disabled={!value()}>
              <ArrowUp class="size-4" />
            </Button>
          </PromptInputActions>
        </PromptInput>
      </div>
    );
  },
};

export const WithActionButtons: Story = {
  name: 'With Action Buttons',
  render: () => {
    const [value, setValue] = createSignal('');

    return (
      <div class="w-full max-w-2xl p-4">
        <PromptInput value={value()} onValueChange={setValue} onSubmit={() => setValue('')}>
          <PromptInputTextarea placeholder="Message..." />
          <PromptInputActions class="justify-between">
            <div class="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm"><Paperclip class="size-4 text-muted-foreground" /></Button>
              <Button variant="ghost" size="icon-sm"><Globe class="size-4 text-muted-foreground" /></Button>
              <Button variant="ghost" size="icon-sm"><Mic class="size-4 text-muted-foreground" /></Button>
              <Button variant="ghost" size="icon-sm"><Sparkles class="size-4 text-muted-foreground" /></Button>
            </div>
            <Button variant="default" size="icon-sm" class="rounded-full" disabled={!value()}>
              <ArrowUp class="size-4" />
            </Button>
          </PromptInputActions>
        </PromptInput>
      </div>
    );
  },
};

export const StreamingState: Story = {
  name: 'Streaming / Loading State',
  render: () => (
    <div class="w-full max-w-2xl p-4 space-y-6">
      <div>
        <p class="text-sm text-muted-foreground mb-2">Disabled while streaming (with stop button)</p>
        <PromptInput disabled isLoading>
          <PromptInputTextarea placeholder="Generating response..." />
          <PromptInputActions class="justify-between">
            <div class="flex items-center gap-2">
              <Loader variant="typing" size="sm" />
              <span class="text-xs text-muted-foreground">Generating...</span>
            </div>
            <Button variant="outline" size="icon-sm" class="rounded-full">
              <Square class="size-3" />
            </Button>
          </PromptInputActions>
        </PromptInput>
      </div>

      <div>
        <p class="text-sm text-muted-foreground mb-2">Disabled while waiting for first token</p>
        <PromptInput disabled isLoading>
          <PromptInputTextarea placeholder="Waiting for response..." />
          <PromptInputActions class="justify-between">
            <div class="flex items-center gap-2">
              <Loader variant="dots" size="sm" />
              <span class="text-xs text-muted-foreground">Thinking...</span>
            </div>
            <Button variant="outline" size="icon-sm" class="rounded-full">
              <Square class="size-3" />
            </Button>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  ),
};

export const WithModelSelector: Story = {
  name: 'With Model Selector',
  render: () => {
    const [value, setValue] = createSignal('');
    const [modelId, setModelId] = createSignal('claude-4');

    const models: ModelOption[] = [
      { id: 'claude-4', name: 'Claude 4 Opus', provider: 'Anthropic' },
      { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic' },
      { id: 'gemini-2', name: 'Gemini 2.5 Pro', provider: 'Google' },
    ];

    return (
      <div class="w-full max-w-2xl p-4">
        <PromptInput value={value()} onValueChange={setValue} onSubmit={() => setValue('')}>
          <PromptInputTextarea placeholder="Ask anything..." />
          <PromptInputActions class="justify-between">
            <ModelSwitcher models={models} currentModelId={modelId()} onModelChange={setModelId} />
            <div class="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm"><Paperclip class="size-4 text-muted-foreground" /></Button>
              <Button variant="default" size="icon-sm" class="rounded-full" disabled={!value()}>
                <ArrowUp class="size-4" />
              </Button>
            </div>
          </PromptInputActions>
        </PromptInput>
      </div>
    );
  },
};
