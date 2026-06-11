import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, Show } from 'solid-js';
import {
  ChatContainer, ChatContainerContent, ChatContainerScrollAnchor,
  Message, MessageAvatar, MessageContent, MessageActions,
  PromptInput, PromptInputTextarea, PromptInputActions,
  ResponseStream, Loader, TextShimmer, Button, Separator,
} from '../index';
import { Square, ArrowUp } from 'lucide-solid';

const meta: Meta = {
  title: 'Examples/Streaming Response',
};

export default meta;
type Story = StoryObj;

const streamedText = `**Server-Sent Events (SSE)** are a lightweight alternative to WebSockets for one-way server-to-client streaming.

### How SSE Works

The server sends a continuous stream of text data over a single HTTP connection. The browser's \`EventSource\` API handles reconnection automatically.

\`\`\`typescript
// Server (Node.js/Express)
app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const interval = setInterval(() => {
    res.write(\`data: \${JSON.stringify({ time: Date.now() })}\\n\\n\`);
  }, 1000);

  req.on('close', () => clearInterval(interval));
});
\`\`\`

\`\`\`typescript
// Client
const source = new EventSource('/stream');
source.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
\`\`\`

### SSE vs WebSocket

| Feature | SSE | WebSocket |
|---------|-----|-----------|
| Direction | Server to client only | Bidirectional |
| Protocol | HTTP | WS |
| Reconnection | Automatic | Manual |
| Binary data | No | Yes |

Use SSE when you only need server push -- it's simpler to implement, works through proxies, and the browser handles reconnection for you.`;

export const TypewriterStream: Story = {
  name: 'Typewriter Streaming',
  render: () => {
    const [isStreaming, setIsStreaming] = createSignal(false);

    const startStream = () => {
      setIsStreaming(true);
    };

    return (
      <div class="flex flex-col h-[600px] w-full max-w-2xl bg-background rounded-xl shadow-lg overflow-hidden">
        <div class="flex items-center px-4 py-3">
          <h2 class="text-sm font-semibold text-foreground">Streaming Demo</h2>
        </div>
        <Separator />

        <ChatContainer class="flex-1 p-4">
          <ChatContainerContent class="space-y-6 py-4">
            <Message>
              <MessageAvatar src="" fallback="U" alt="User" />
              <MessageContent>
                Explain Server-Sent Events and when to use them over WebSockets.
              </MessageContent>
            </Message>

            <Show when={isStreaming()}>
              <Message>
                <MessageAvatar src="" fallback="AI" alt="Assistant" />
                <div class="flex-1 rounded-lg p-2 bg-secondary">
                  <ResponseStream
                    textStream={streamedText}
                    mode="typewriter"
                    speed={40}
                    onComplete={() => setIsStreaming(false)}
                    class="prose dark:prose-invert prose-sm max-w-none"
                  />
                </div>
              </Message>
            </Show>

            <ChatContainerScrollAnchor />
          </ChatContainerContent>
        </ChatContainer>

        <div class="px-4 pb-4">
          <Show
            when={isStreaming()}
            fallback={
              <PromptInput onSubmit={startStream}>
                <PromptInputTextarea placeholder="Click send to start streaming..." />
                <PromptInputActions class="justify-end">
                  <Button variant="default" size="icon-sm" class="rounded-full" onClick={startStream}>
                    <ArrowUp class="size-4" />
                  </Button>
                </PromptInputActions>
              </PromptInput>
            }
          >
            <PromptInput disabled isLoading>
              <PromptInputTextarea placeholder="Generating..." />
              <PromptInputActions class="justify-between">
                <div class="flex items-center gap-2">
                  <Loader variant="typing" size="sm" />
                  <span class="text-xs text-muted-foreground">Streaming response...</span>
                </div>
                <Button variant="outline" size="icon-sm" class="rounded-full" onClick={() => setIsStreaming(false)}>
                  <Square class="size-3" />
                </Button>
              </PromptInputActions>
            </PromptInput>
          </Show>
        </div>
      </div>
    );
  },
};

export const WaitingForFirstToken: Story = {
  name: 'Waiting for First Token',
  render: () => (
    <div class="flex flex-col h-[400px] w-full max-w-2xl bg-background rounded-xl shadow-lg overflow-hidden">
      <div class="flex items-center px-4 py-3">
        <h2 class="text-sm font-semibold text-foreground">Processing Query</h2>
      </div>
      <Separator />

      <ChatContainer class="flex-1 p-4">
        <ChatContainerContent class="space-y-6 py-4">
          <Message>
            <MessageAvatar src="" fallback="U" alt="User" />
            <MessageContent>
              Analyze the performance characteristics of B-tree vs LSM-tree storage engines for write-heavy workloads.
            </MessageContent>
          </Message>

          <Message>
            <MessageAvatar src="" fallback="AI" alt="Assistant" />
            <div class="flex-1 flex items-center gap-3 rounded-lg p-3 bg-secondary">
              <Loader variant="dots" size="sm" />
              <TextShimmer class="text-sm">Thinking...</TextShimmer>
            </div>
          </Message>

          <ChatContainerScrollAnchor />
        </ChatContainerContent>
      </ChatContainer>

      <div class="px-4 pb-4">
        <PromptInput disabled isLoading>
          <PromptInputTextarea placeholder="Waiting..." />
          <PromptInputActions class="justify-between">
            <span class="text-xs text-muted-foreground">Waiting for response...</span>
            <Button variant="outline" size="icon-sm" class="rounded-full">
              <Square class="size-3" />
            </Button>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  ),
};

export const FadeStream: Story = {
  name: 'Fade-in Streaming',
  render: () => {
    const [isStreaming, setIsStreaming] = createSignal(false);

    const startStream = () => {
      setIsStreaming(true);
    };

    const shortText = `The **event loop** in JavaScript processes tasks in phases:

1. **Microtasks** (Promise callbacks, queueMicrotask) run first
2. **Macrotasks** (setTimeout, setInterval, I/O) run one per iteration
3. **Render steps** (requestAnimationFrame, layout, paint) happen between macrotasks

This is why \`Promise.resolve().then()\` always runs before \`setTimeout(cb, 0)\`.`;

    const [showMessage, setShowMessage] = createSignal(false);

    const handleStart = () => {
      setShowMessage(false);
      // Reset then show to remount the component
      setTimeout(() => {
        setShowMessage(true);
        setIsStreaming(true);
      }, 50);
    };

    return (
      <div class="w-full max-w-2xl p-4 space-y-4">
        <p class="text-sm text-muted-foreground">Words fade in instead of appearing character by character.</p>

        <Show when={showMessage()}>
          <Message>
            <MessageAvatar src="" fallback="AI" alt="Assistant" />
            <div class="flex-1 rounded-lg p-2 bg-secondary">
              <ResponseStream
                textStream={shortText}
                mode="fade"
                speed={30}
                onComplete={() => setIsStreaming(false)}
                class="prose dark:prose-invert prose-sm max-w-none"
              />
            </div>
          </Message>
        </Show>

        <Button onClick={handleStart} disabled={isStreaming()}>
          {isStreaming() ? 'Streaming...' : 'Start Fade Stream'}
        </Button>
      </div>
    );
  },
};
