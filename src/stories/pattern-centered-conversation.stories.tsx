import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import {
  ChatConfig, ChatContainer, ChatContainerContent, ChatContainerScrollAnchor,
  Message, MessageContent, MessageActions,
  PromptInput, PromptInputTextarea, PromptInputActions,
  ModelSwitcher, Button,
} from '../index';
import type { ModelOption } from '../types';
import { Copy, ThumbsUp, ArrowUp } from 'lucide-solid';

const meta: Meta = {
  title: 'Patterns/Centered Conversation',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A single, centered reading column with no sidebar (Claude.ai-style). The messages and composer share one `max-w` measure centered in the viewport — ideal for a focused, full-window chat. Contrast with **Chat Panel Layout** (a compact embedded panel) and the **Full Chat App** example (a resizable workspace).',
      },
    },
  },
};
export default meta;
type Story = StoryObj;

const models: ModelOption[] = [
  { id: 'claude-4', name: 'Claude 4 Opus', provider: 'Anthropic' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
];

const answer = `Sure — here's the gist:

- **Signals** are fine-grained, so only the DOM that reads a signal updates.
- **No re-renders** — components run once; reactive expressions do the work.
- **No dependency arrays** — effects auto-track what they read.

Want a code example next?`;

export const Focused: Story = {
  render: () => {
    const [input, setInput] = createSignal('');
    const [model, setModel] = createSignal('claude-4');
    return (
      <ChatConfig proseSize="base">
        <div style={{ width: '860px', height: '680px' }} class="flex flex-col overflow-hidden rounded-xl border border-border bg-background">
          <header class="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
            <span class="text-sm font-semibold text-foreground">New conversation</span>
            <ModelSwitcher models={models} currentModelId={model()} onModelChange={setModel} />
          </header>

          <div class="relative flex-1 overflow-y-auto">
            <ChatContainer class="h-full">
              <ChatContainerContent class="space-y-6 px-5 py-6">
                <Message class="mx-auto flex w-full max-w-2xl flex-col items-end">
                  <MessageContent class="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5">
                    In one paragraph, why is SolidJS reactivity fast?
                  </MessageContent>
                </Message>

                <Message class="mx-auto flex w-full max-w-2xl flex-col items-start">
                  <div class="group flex w-full flex-col">
                    <MessageContent markdown class="bg-transparent p-0 text-foreground">
                      {answer}
                    </MessageContent>
                    <MessageActions class="-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                      <Button variant="ghost" size="icon-sm" class="rounded-full"><Copy class="size-3.5" /></Button>
                      <Button variant="ghost" size="icon-sm" class="rounded-full"><ThumbsUp class="size-3.5" /></Button>
                    </MessageActions>
                  </div>
                </Message>
                <ChatContainerScrollAnchor />
              </ChatContainerContent>
            </ChatContainer>
          </div>

          <div class="shrink-0 px-5 pb-5">
            <div class="mx-auto max-w-2xl">
              <PromptInput value={input()} onValueChange={setInput} onSubmit={() => setInput('')}>
                <PromptInputTextarea placeholder="Reply…" class="min-h-[44px] pt-3 pl-4" />
                <PromptInputActions class="mt-2 flex w-full items-center justify-end gap-2 px-3 pb-3">
                  <Button size="icon-sm" class="rounded-full" disabled={!input().trim()}>
                    <ArrowUp class="size-4" />
                  </Button>
                </PromptInputActions>
              </PromptInput>
            </div>
          </div>
        </div>
      </ChatConfig>
    );
  },
};
