import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import {
  ChatConfig, ChatContainer, ChatContainerContent, ChatContainerScrollAnchor,
  Message, MessageAvatar, MessageContent,
  PromptInput, PromptInputTextarea, PromptInputActions, Button,
} from '../index';
import { ArrowUp, X } from 'lucide-solid';

const meta: Meta = {
  title: 'Patterns/Docked Widget',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A support-assistant widget docked to the bottom-right corner of a host page. The same building blocks (`ChatContainer` + `Message` + `PromptInput`) shrink into a compact floating card — the kit\'s Shadow-DOM isolation means it can sit over any app without CSS bleed.',
      },
    },
  },
};
export default meta;
type Story = StoryObj;

export const SupportAssistant: Story = {
  render: () => {
    const [input, setInput] = createSignal('');
    return (
      <ChatConfig proseSize="sm">
        {/* Faux host page */}
        <div style={{ width: '920px', height: '680px' }} class="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-muted/40 to-background">
          <div class="space-y-3 p-8">
            <div class="h-7 w-48 rounded-md bg-muted" />
            <div class="h-4 w-2/3 rounded bg-muted/70" />
            <div class="h-4 w-1/2 rounded bg-muted/70" />
            <div class="mt-6 grid grid-cols-3 gap-4">
              <div class="h-28 rounded-lg bg-muted/60" />
              <div class="h-28 rounded-lg bg-muted/60" />
              <div class="h-28 rounded-lg bg-muted/60" />
            </div>
          </div>

          {/* Docked chat widget */}
          <div style={{ width: '360px', height: '460px' }} class="absolute bottom-5 right-5 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <header class="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <div class="flex items-center gap-2">
                <span class="size-2 rounded-full bg-tool-green" />
                <span class="text-sm font-semibold text-foreground">Support</span>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Close"><X class="size-4" /></Button>
            </header>

            <div class="relative flex-1 overflow-y-auto">
              <ChatContainer class="h-full">
                <ChatContainerContent class="space-y-3 px-3 py-3">
                  <Message>
                    <MessageAvatar src="" alt="AI" fallback="AI" />
                    <MessageContent markdown class="bg-transparent p-0 pt-1">
                      Hi! 👋 How can I help you today?
                    </MessageContent>
                  </Message>
                  <Message class="flex-col items-end">
                    <MessageContent class="bg-muted text-primary max-w-[85%] rounded-xl px-3.5 py-2">
                      How do I reset my password?
                    </MessageContent>
                  </Message>
                  <Message>
                    <MessageAvatar src="" alt="AI" fallback="AI" />
                    <MessageContent markdown class="bg-transparent p-0 pt-1">
                      Head to **Settings → Security** and click **Reset password** — you'll get an email link.
                    </MessageContent>
                  </Message>
                  <ChatContainerScrollAnchor />
                </ChatContainerContent>
              </ChatContainer>
            </div>

            <div class="shrink-0 px-3 pb-3">
              <PromptInput value={input()} onValueChange={setInput} onSubmit={() => setInput('')}>
                <PromptInputTextarea placeholder="Message support…" class="min-h-[40px] pt-2.5 pl-3.5" />
                <PromptInputActions class="mt-1.5 flex w-full items-center justify-end gap-2 px-2.5 pb-2.5">
                  <Button size="icon-sm" class="rounded-full" disabled={!input().trim()} aria-label="Send message">
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
