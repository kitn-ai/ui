import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Message, MessageAvatar, MessageContent } from './message';
import { ChatContainer } from './chat-container';
import { ChatConfig } from '../primitives/chat-config';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../ui/resizable';

const meta = {
  title: 'Components/Message/Narrow Panel',
  component: Message,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: {
        component: [
          'Layout stress-tests for `Message` inside narrow chat panels (300–380px) and resizable side panels, verifying text wraps and the 32px avatar stays fixed.',
          '**When to use:** as a reference when embedding the chat in a constrained column — a browser-extension side panel, a docked drawer, or a resizable split view.',
          '**How to use:** wrap messages in a fixed/min-width container (and usually `ChatConfig proseSize="sm"`), keeping `min-w-0` on flex children so long text wraps instead of overflowing.',
          '**Placement:** these are full-composition showcases, not control-driven; use them to copy the surrounding panel structure.',
        ].join('\n\n'),
      },
    },
  },
  argTypes: {
    class: {
      control: 'text',
      description: 'Layout classes for the message row.',
    },
  },
  render: (args) => (
    <ChatConfig proseSize="sm">
      <div
        style={{ width: '380px', background: 'var(--color-card, #202127)' }}
        class="p-3 rounded-lg"
      >
        <Message {...args}>
          <MessageAvatar src="" alt="AI" fallback="AI" />
          <MessageContent>{longText}</MessageContent>
        </Message>
      </div>
    </ChatConfig>
  ),
} satisfies Meta<typeof Message>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Message, MessageAvatar, MessageContent, ChatContainer, ChatConfig } from '@kitn-ai/chat';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

const longText =
  'The document is a transcript of a YouTube video where Andre Karpathy discusses building AI agents using large language models. He explains how he structures his personal knowledge base and shares techniques for prompt engineering that maximize output quality.';

/** Default render — a single message inside a 380px card; tweak `class` via controls. */
export const Playground: Story = {
  ...src(`<ChatConfig proseSize="sm">
  <div style={{ width: '380px' }} class="p-3 rounded-lg">
    <Message>
      <MessageAvatar src="" alt="AI" fallback="AI" />
      <MessageContent>{longText}</MessageContent>
    </Message>
  </div>
</ChatConfig>`),
};

/** Simulates the chat panel at 380px — the default width in the detail page. */
export const NarrowPanel380: Story = {
  render: () => (
    <ChatConfig proseSize="sm">
      <div
        style={{ width: '380px', height: '500px', background: 'var(--color-card, #202127)' }}
        class="flex flex-col overflow-hidden rounded-lg"
      >
        <div class="px-3 py-2.5 bg-muted/30 text-sm font-semibold text-foreground flex-shrink-0">
          New Thread
        </div>
        <ChatContainer class="flex-1 min-w-0 px-3 py-3">
          <div class="space-y-3 min-w-0">
            <Message>
              <MessageAvatar src="" alt="AI" fallback="AI" />
              <MessageContent>{longText}</MessageContent>
            </Message>
          </div>
        </ChatContainer>
      </div>
    </ChatConfig>
  ),
  ...src(`<ChatConfig proseSize="sm">
  <div style={{ width: '380px', height: '500px' }} class="flex flex-col rounded-lg">
    <ChatContainer class="flex-1 min-w-0 px-3 py-3">
      <Message>
        <MessageAvatar src="" alt="AI" fallback="AI" />
        <MessageContent>{longText}</MessageContent>
      </Message>
    </ChatContainer>
  </div>
</ChatConfig>`),
};

/** Even narrower — 300px minimum width with two messages. */
export const NarrowPanel300: Story = {
  render: () => (
    <ChatConfig proseSize="sm">
      <div
        style={{ width: '300px', height: '500px', background: 'var(--color-card, #202127)' }}
        class="flex flex-col overflow-hidden rounded-lg"
      >
        <div class="px-3 py-2.5 bg-muted/30 text-sm font-semibold text-foreground flex-shrink-0">
          New Thread
        </div>
        <ChatContainer class="flex-1 min-w-0 px-3 py-3">
          <div class="space-y-3 min-w-0">
            <Message>
              <MessageAvatar src="" alt="AI" fallback="AI" />
              <MessageContent>{longText}</MessageContent>
            </Message>

            <Message>
              <MessageAvatar src="" alt="AI" fallback="AI" />
              <MessageContent>A shorter reply.</MessageContent>
            </Message>
          </div>
        </ChatContainer>
      </div>
    </ChatConfig>
  ),
  ...src(`<ChatConfig proseSize="sm">
  <div style={{ width: '300px', height: '500px' }} class="flex flex-col rounded-lg">
    <ChatContainer class="flex-1 min-w-0 px-3 py-3">
      <Message>
        <MessageAvatar src="" alt="AI" fallback="AI" />
        <MessageContent>{longText}</MessageContent>
      </Message>
    </ChatContainer>
  </div>
</ChatConfig>`),
};

/** Without ChatContainer — isolates the Message component's own wrapping. */
export const NarrowDivOnly: Story = {
  render: () => (
    <ChatConfig proseSize="sm">
      <div
        style={{ width: '380px', background: 'var(--color-card, #202127)' }}
        class="p-3 rounded-lg"
      >
        <Message>
          <MessageAvatar src="" alt="AI" fallback="AI" />
          <MessageContent>{longText}</MessageContent>
        </Message>
      </div>
    </ChatConfig>
  ),
  ...src(`<ChatConfig proseSize="sm">
  <div style={{ width: '380px' }} class="p-3 rounded-lg">
    <Message>
      <MessageAvatar src="" alt="AI" fallback="AI" />
      <MessageContent>{longText}</MessageContent>
    </Message>
  </div>
</ChatConfig>`),
};

/** The avatar in isolation — verifies it stays a fixed 32px. */
export const AvatarIsolation: Story = {
  render: () => (
    <div
      style={{ width: '380px', background: 'var(--color-card, #202127)' }}
      class="p-3 rounded-lg"
    >
      <div class="flex items-start gap-3">
        <MessageAvatar src="" alt="AI" fallback="AI" />
        <div class="min-w-0 rounded-lg p-2 bg-secondary text-sm text-foreground break-words">
          {longText}
        </div>
      </div>
    </div>
  ),
  ...src(`<div class="flex items-start gap-3">
  <MessageAvatar src="" alt="AI" fallback="AI" />
  <div class="min-w-0 rounded-lg p-2 bg-secondary break-words">{longText}</div>
</div>`),
};

/** Reproduces the full extension layout — left nav, content column, resizable chat. */
export const FullExtensionLayout: Story = {
  render: () => (
    <ChatConfig proseSize="sm">
      <div class="flex h-screen bg-background relative" style={{ height: '600px' }}>
        <div class="flex-shrink-0 w-[300px] bg-[#161618] p-4 overflow-y-auto">
          <div class="text-sm text-muted-foreground">Left Nav</div>
          <div class="mt-2 space-y-1">
            <div class="text-sky-400 text-sm px-2 py-1 bg-sky-400/10 rounded">Content</div>
            <div class="text-muted-foreground text-sm px-2 py-1">Summary</div>
            <div class="text-muted-foreground text-sm px-2 py-1">Key Points</div>
          </div>
        </div>

        <div class="flex-1 min-w-0 flex flex-col">
          <div class="px-4 py-2 bg-muted/30 text-sm font-medium text-foreground flex-shrink-0">
            Header Bar
          </div>

          <ResizablePanelGroup orientation="horizontal" class="flex-1 min-w-0 overflow-hidden">
            <ResizablePanel class="min-w-0 overflow-hidden">
              <div class="flex-1 overflow-y-auto">
                <div class="flex gap-16 mx-auto" style={{ "max-width": "calc(768px + 256px + 64px + 32px)" }}>
                  <div class="flex-1 min-w-0 max-w-[768px] px-4">
                    <h2 class="text-lg font-semibold text-foreground mt-4">Article Title</h2>
                    <p class="text-sm text-muted-foreground mt-2">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                      incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                      exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                    </p>
                  </div>
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel class="overflow-hidden" defaultSize={35}>
              <div class="h-full flex flex-col overflow-hidden">
                <div class="flex flex-col h-full min-w-0 overflow-hidden bg-card">
                  <div class="px-3 py-2.5 bg-muted/30 text-sm font-semibold text-foreground flex-shrink-0">
                    New Thread
                  </div>
                  <ChatContainer class="flex-1 min-w-0 px-3 py-3">
                    <div class="space-y-3 min-w-0">
                      <Message>
                        <MessageAvatar src="" alt="AI" fallback="AI" />
                        <MessageContent>{longText}</MessageContent>
                      </Message>
                      <Message>
                        <MessageAvatar src="" alt="AI" fallback="AI" />
                        <MessageContent>{longText + ' ' + longText}</MessageContent>
                      </Message>
                    </div>
                  </ChatContainer>
                  <div class="px-3 pb-3 pt-1 flex-shrink-0">
                    <div class="bg-muted/40 rounded-lg px-3 py-2.5 text-sm text-muted-foreground/40">
                      Ask about this page...
                    </div>
                  </div>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </ChatConfig>
  ),
  ...src(`<ResizablePanelGroup orientation="horizontal" class="flex-1 min-w-0 overflow-hidden">
  <ResizablePanel class="min-w-0 overflow-hidden">{/* article */}</ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel defaultSize={35}>
    <ChatContainer class="flex-1 min-w-0 px-3 py-3">
      <Message>
        <MessageAvatar src="" alt="AI" fallback="AI" />
        <MessageContent>{longText}</MessageContent>
      </Message>
    </ChatContainer>
  </ResizablePanel>
</ResizablePanelGroup>`),
};

/** A simpler resizable split — main content beside a chat panel. */
export const InsideResizablePanel: Story = {
  render: () => (
    <ChatConfig proseSize="sm">
      <div style={{ width: '900px', height: '500px' }} class="flex">
        <ResizablePanelGroup orientation="horizontal" class="flex-1 min-w-0 overflow-hidden">
          <ResizablePanel class="min-w-0 overflow-hidden">
            <div class="h-full p-4 bg-background overflow-y-auto">
              <p class="text-foreground text-sm">Main content area — this simulates the article/transcript view</p>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel class="overflow-hidden" defaultSize={40}>
            <div class="h-full flex flex-col overflow-hidden">
              <div class="flex flex-col h-full min-w-0 overflow-hidden bg-card">
                <div class="px-3 py-2.5 bg-muted/30 text-sm font-semibold text-foreground flex-shrink-0">
                  New Thread
                </div>

                <ChatContainer class="flex-1 min-w-0 px-3 py-3">
                  <div class="space-y-3 min-w-0">
                    <Message>
                      <MessageAvatar src="" alt="AI" fallback="AI" />
                      <MessageContent>{longText}</MessageContent>
                    </Message>

                    <Message>
                      <MessageAvatar src="" alt="AI" fallback="AI" />
                      <MessageContent>A short reply to test mixed lengths.</MessageContent>
                    </Message>

                    <Message>
                      <MessageAvatar src="" alt="AI" fallback="AI" />
                      <MessageContent>{longText + ' ' + longText}</MessageContent>
                    </Message>
                  </div>
                </ChatContainer>

                <div class="px-3 pb-3 pt-1 flex-shrink-0">
                  <div class="bg-muted/40 rounded-lg px-3 py-2.5 text-sm text-muted-foreground/40">
                    Ask about this page...
                  </div>
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </ChatConfig>
  ),
  ...src(`<ResizablePanelGroup orientation="horizontal" class="flex-1 min-w-0 overflow-hidden">
  <ResizablePanel class="min-w-0 overflow-hidden">{/* main content */}</ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel defaultSize={40}>
    <ChatContainer class="flex-1 min-w-0 px-3 py-3">
      <Message>
        <MessageAvatar src="" alt="AI" fallback="AI" />
        <MessageContent>{longText}</MessageContent>
      </Message>
    </ChatContainer>
  </ResizablePanel>
</ResizablePanelGroup>`),
};
