import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import { Message, MessageAvatar, MessageContent, MessageActions } from '../components/message';
import { ChatContainer } from '../components/chat-container';
import { ChatConfig } from '../primitives/chat-config';
import { PromptInput, PromptInputTextarea, PromptInputActions } from '../components/prompt-input';
import { Button } from '../ui/button';
import { ScrollButton } from '../components/scroll-button';
import { Copy, ArrowUp } from 'lucide-solid';

const meta: Meta = {
  title: 'Patterns/Chat Panel Layout',
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj;

const assistantMsg1 = `The document is a transcript of a YouTube video by Cole Medin, where he discusses building a self-evolving memory system for coding agents using Large Language Models (LLMs), inspired by Andre Karpathy's ideas on LLM knowledge bases.`;

const assistantMsg2 = `Short answer: **it has to be a separate browser window** (or tab/iframe), not just a normal component in your application.

Here's why:

- The OAuth flow requires redirecting to the provider's login page
- The callback URL needs to be a real URL the browser can navigate to
- Security policies prevent embedding auth pages in iframes`;

const userMsg1 = 'What is this video about?';
const userMsg2 = 'And from what I understand, does that need to be another browser window pop-up that happens, or can I just have a component that does that in my application?';

function CopyButton(props: { text: string }) {
  return (
    <button onClick={() => navigator.clipboard.writeText(props.text)}>
      <Copy size={14} />
    </button>
  );
}

/**
 * Reference layout — uses variant props, no custom class overrides.
 */
export const ChatGPTStyle: Story = {
  render: () => {
    const [input, setInput] = createSignal('');
    return (
      <ChatConfig proseSize="sm">
        <div
          style={{ width: '420px', height: '700px' }}
          class="flex flex-col overflow-hidden rounded-lg bg-card"
        >
          {/* Header */}
          <div class="px-3 py-2.5 bg-muted/30 text-sm font-semibold text-foreground flex-shrink-0 flex items-center justify-between">
            <span>Chat Panel</span>
            <span class="text-xs text-muted-foreground">GPT-4o Mini</span>
          </div>

          {/* Messages */}
          <ChatContainer class="flex-1 min-w-0 px-4 py-3 space-y-4">
              {/* Assistant message 1 — with avatar */}
              <Message>
                <MessageAvatar src="" alt="AI" fallback="AI" />
                <div class="flex w-full flex-col min-w-0">
                  <MessageContent markdown class="bg-transparent p-0 pt-1.5">
                    {assistantMsg1}
                  </MessageContent>
                  <MessageActions>
                    <CopyButton text={assistantMsg1} />
                  </MessageActions>
                </div>
              </Message>

              {/* User message 1 */}
              <Message class="group flex-col items-end">
                <MessageContent class="bg-muted text-primary max-w-[85%] rounded-xl px-4 py-2 mr-1">
                  {userMsg1}
                </MessageContent>
                <MessageActions class="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <CopyButton text={userMsg1} />
                </MessageActions>
              </Message>

              {/* Assistant message 2 — with avatar, markdown */}
              <Message>
                <MessageAvatar src="" alt="AI" fallback="AI" />
                <div class="flex w-full flex-col min-w-0">
                  <MessageContent markdown class="bg-transparent p-0 pt-1.5">
                    {assistantMsg2}
                  </MessageContent>
                  <MessageActions>
                    <CopyButton text={assistantMsg2} />
                  </MessageActions>
                </div>
              </Message>

              {/* User message 2 — longer */}
              <Message class="group flex-col items-end">
                <MessageContent class="bg-muted text-primary max-w-[85%] rounded-xl px-4 py-2 mr-1">
                  {userMsg2}
                </MessageContent>
                <MessageActions class="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <CopyButton text={userMsg2} />
                </MessageActions>
              </Message>

              {/* Assistant message 3 — with avatar, short */}
              <Message>
                <MessageAvatar src="" alt="AI" fallback="AI" />
                <div class="flex w-full flex-col min-w-0">
                  <MessageContent markdown class="bg-transparent p-0 pt-1.5">
                    Got it — let me know if you have more questions!
                  </MessageContent>
                  <MessageActions>
                    <CopyButton text="Got it — let me know if you have more questions!" />
                  </MessageActions>
                </div>
              </Message>
            <ScrollButton />
          </ChatContainer>

          {/* Input */}
          <div class="px-3 pb-3 pt-1 flex-shrink-0">
            <PromptInput
              value={input()}
              onValueChange={setInput}
              onSubmit={() => setInput('')}
            >
              <PromptInputTextarea placeholder="Ask about this page..." class="min-h-[44px] pt-3 pl-4" />
              <PromptInputActions class="mt-2 flex w-full items-center justify-end gap-2 px-3 pb-3">
                <Button
                  size="icon-sm"
                  class="rounded-full"
                  disabled={!input().trim()}
                >
                  <ArrowUp class="size-4" />
                </Button>
              </PromptInputActions>
            </PromptInput>
          </div>
        </div>
      </ChatConfig>
    );
  },
};
