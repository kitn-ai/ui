import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import {
  ChatConfig, Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent,
  PromptSuggestion, PromptInput, PromptInputTextarea, PromptInputActions, Button,
} from '../index';
import { Sparkles, Plus, Globe, ArrowUp } from 'lucide-solid';

const meta: Meta = {
  title: 'Patterns/Empty State',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'The new-chat zero state: a centered greeting with starter suggestions above the composer. Composed from `Empty` (+ `EmptyMedia`/`EmptyTitle`/`EmptyDescription`), `PromptSuggestion` chips, and `PromptInput`. Clicking a suggestion fills the composer.',
      },
    },
  },
};
export default meta;
type Story = StoryObj;

const SUGGESTIONS = [
  'Summarize a document',
  'Draft a product update',
  'Explain a code snippet',
  'Plan my week',
];

export const NewChat: Story = {
  render: () => {
    const [input, setInput] = createSignal('');
    return (
      <ChatConfig proseSize="base">
        <div style={{ width: '760px', height: '640px' }} class="flex flex-col overflow-hidden rounded-xl border border-border bg-background">
          <Empty class="flex-1">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Sparkles class="size-6" />
              </EmptyMedia>
              <EmptyTitle>How can I help today?</EmptyTitle>
              <EmptyDescription>
                Ask anything, or start from one of these.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div class="flex max-w-md flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <PromptSuggestion onClick={() => setInput(s)}>{s}</PromptSuggestion>
                ))}
              </div>
            </EmptyContent>
          </Empty>

          <div class="shrink-0 px-4 pb-4">
            <div class="mx-auto max-w-2xl">
              <PromptInput value={input()} onValueChange={setInput} onSubmit={() => setInput('')}>
                <PromptInputTextarea placeholder="Ask anything…" class="min-h-[44px] pt-3 pl-4" />
                <PromptInputActions class="mt-2 flex w-full items-center justify-between gap-2 px-3 pb-3">
                  <div class="flex items-center gap-2">
                    <Button variant="outline" size="icon-sm" class="rounded-full"><Plus class="size-4" /></Button>
                    <Button variant="outline" size="sm" class="rounded-full gap-1"><Globe class="size-4" />Search</Button>
                  </div>
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
