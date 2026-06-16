import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, Show } from 'solid-js';
import {
  ChatContainer, ChatContainerContent, ChatContainerScrollAnchor,
  Message, MessageAvatar, MessageContent, MessageActions,
  PromptInput, PromptInputTextarea, PromptInputActions,
  ResponseStream, Loader, TextShimmer, Button, Separator,
} from '../index';
import { Square, ArrowUp, Copy, RefreshCw } from 'lucide-solid';

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
  parameters: {
    docs: {
      description: {
        story: [
          'Feed `textStream` a plain string and `ResponseStream` will reveal it character by character at `speed` chars/tick. When the last character is displayed, `onComplete` fires — use it to unlock the input and show the action bar.',
          '**Gotcha — string vs AsyncIterable:** a plain string is pre-buffered and the typewriter timer drives the reveal locally. An `AsyncIterable<string>` must be assigned as a JS *property* (not an HTML attribute); the primitive consumes chunks as they arrive and the same timer reveals them. Both paths fire `onComplete` identically.',
          '**Gotcha — no built-in cancel:** there is no `abort()` or `stop()` method on `ResponseStream` or `kc-response-stream`. To cancel mid-stream, abort your fetch/stream with an `AbortController`, then clear your own streaming state (`setIsStreaming(false)`). The element will stop receiving new characters but will not reset its display automatically.',
          '**Gotcha — replay requires remount:** because `startStreaming` is triggered by the `textStream` prop changing, passing the *same* string value again will not re-run the animation. Unmount the component (toggle a `Show`) and remount it on the next tick to replay.',
        ].join('\n\n'),
      },
    },
  },
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
                  <Button variant="default" size="icon-sm" class="rounded-full" onClick={startStream} aria-label="Send message">
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
  parameters: {
    docs: {
      description: {
        story: [
          'The gap between the user pressing Send and the first token arriving is a distinct UX phase. `ResponseStream` has nothing to render yet — show a `Loader` (variant `dots`) and a `TextShimmer` label in the message bubble instead.',
          '**"Waiting" vs "typing":** use `Loader variant="dots"` here (pulsing dots = thinking/waiting), and switch to `Loader variant="typing"` in the input bar once tokens are flowing (moving bars = actively generating). They signal different things.',
          '**Swap on first token:** as soon as the first chunk arrives, unmount the `Loader`+`TextShimmer` bubble and mount a `ResponseStream` with the accumulated text so far. The typewriter timer will catch up quickly on short leading text.',
        ].join('\n\n'),
      },
    },
  },
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
            <span class="text-xs text-foreground">Waiting for response...</span>
            <Button variant="outline" size="icon-sm" class="rounded-full" aria-label="Stop">
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
  parameters: {
    docs: {
      description: {
        story: [
          'Set `mode="fade"` and words appear by fading in with staggered `animation-delay` instead of a character-by-character typewriter. Tune `speed` to control stagger cadence (higher = faster).',
          '**Gotcha — `onComplete` never fires for string + fade:** when you pass a plain string with `mode="fade"`, the primitive delivers all segments immediately and CSS handles the reveal. There is no timer or promise to detect "all animations finished", so `onComplete` / `kc-complete` is never called. This is a known limitation — if you need a completion callback in fade mode, pass an `AsyncIterable<string>` instead (the callback fires after the iterator is exhausted).',
          '**Replay:** to re-run the fade animation on the same text, unmount the component (`Show` toggle) and remount it on the next tick — see the "Start Fade Stream" button logic.',
        ].join('\n\n'),
      },
    },
  },
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

// ---------------------------------------------------------------------------
// Full Streaming Lifecycle — every phase in one interactive story
// ---------------------------------------------------------------------------

const lifecycleText = `**Streaming responses** involve three distinct phases that each need different UI treatment.

### Phase 1 — Waiting

The request is in-flight but no tokens have arrived. Show a \`Loader\` and shimmer text. The input is disabled, and a stop button lets the user abort their fetch.

### Phase 2 — Streaming

Tokens are arriving. Swap the loader bubble for a \`ResponseStream\`. The input stays disabled; the stop button now cancels *your* stream (there's no cancel built into the element).

### Phase 3 — Complete

\`onComplete\` fires once all characters are displayed. Unlock the input and reveal the action bar (Copy, Regenerate). The response stays fully rendered — the element never unmounts itself.`;

type Phase = 'idle' | 'waiting' | 'streaming' | 'complete';

export const FullStreamingLifecycle: Story = {
  name: 'Full Streaming Lifecycle',
  parameters: {
    docs: {
      description: {
        story: [
          'The complete lifecycle in one interactive story: **idle → waiting → streaming → complete**. Hit "Send" to step through each phase.',
          '**Phase transitions driven by consumer state:** `ResponseStream` knows nothing about waiting or completion beyond emitting `onComplete`. Your app drives the phase signal; the element just reveals text.',
          '**No built-in cancel:** clicking Stop sets `phase` to `idle` which unmounts the `ResponseStream`. In production you would also call `abortController.abort()` before that.',
          '**Content persists after complete:** the element never unmounts itself on completion — it stays rendered. You control visibility.',
        ].join('\n\n'),
      },
    },
  },
  render: () => {
    const [phase, setPhase] = createSignal<Phase>('idle');
    const [showStream, setShowStream] = createSignal(false);

    const handleSend = () => {
      setShowStream(false);
      setPhase('waiting');
      // Simulate network latency before first token
      setTimeout(() => {
        setShowStream(true);
        setPhase('streaming');
      }, 1200);
    };

    const handleStop = () => {
      // In production: abortController.abort() here
      setShowStream(false);
      setPhase('idle');
    };

    const handleComplete = () => {
      setPhase('complete');
    };

    const handleReset = () => {
      setShowStream(false);
      setPhase('idle');
    };

    return (
      <div class="flex flex-col h-[680px] w-full max-w-2xl bg-background rounded-xl shadow-lg overflow-hidden">
        <div class="flex items-center px-4 py-3">
          <h2 class="text-sm font-semibold text-foreground">Full Streaming Lifecycle</h2>
          <span class="ml-auto text-xs text-muted-foreground font-mono">
            phase: {phase()}
          </span>
        </div>
        <Separator />

        <ChatContainer class="flex-1 p-4">
          <ChatContainerContent class="space-y-6 py-4">
            {/* User message — only shown once a round trip has started */}
            <Show when={phase() !== 'idle'}>
              <Message>
                <MessageAvatar src="" fallback="U" alt="User" />
                <MessageContent>
                  Explain the three phases of a streaming LLM response.
                </MessageContent>
              </Message>
            </Show>

            {/* Phase 1 — Waiting: loader + shimmer before first token */}
            <Show when={phase() === 'waiting'}>
              <Message>
                <MessageAvatar src="" fallback="AI" alt="Assistant" />
                <div class="flex-1 flex items-center gap-3 rounded-lg p-3 bg-secondary">
                  <Loader variant="dots" size="sm" />
                  <TextShimmer class="text-sm">Thinking...</TextShimmer>
                </div>
              </Message>
            </Show>

            {/* Phase 2+3 — Streaming then Complete: ResponseStream stays mounted */}
            <Show when={showStream()}>
              <Message>
                <MessageAvatar src="" fallback="AI" alt="Assistant" />
                <div class="flex-1 space-y-2">
                  <div class="rounded-lg p-2 bg-secondary">
                    <ResponseStream
                      textStream={lifecycleText}
                      mode="typewriter"
                      speed={35}
                      onComplete={handleComplete}
                      class="prose dark:prose-invert prose-sm max-w-none"
                    />
                  </div>
                  {/* Action bar appears only after complete */}
                  <Show when={phase() === 'complete'}>
                    <MessageActions>
                      <Button variant="ghost" size="icon-sm" aria-label="Copy message">
                        <Copy class="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Regenerate response" onClick={handleReset}>
                        <RefreshCw class="size-3.5" />
                      </Button>
                    </MessageActions>
                  </Show>
                </div>
              </Message>
            </Show>

            <ChatContainerScrollAnchor />
          </ChatContainerContent>
        </ChatContainer>

        {/* Input bar */}
        <div class="px-4 pb-4">
          <Show
            when={phase() === 'idle' || phase() === 'complete'}
            fallback={
              <PromptInput disabled isLoading>
                <PromptInputTextarea placeholder={phase() === 'waiting' ? 'Waiting for first token...' : 'Generating...'} />
                <PromptInputActions class="justify-between">
                  <div class="flex items-center gap-2">
                    <Show
                      when={phase() === 'streaming'}
                      fallback={<Loader variant="dots" size="sm" />}
                    >
                      <Loader variant="typing" size="sm" />
                    </Show>
                    <span class="text-xs text-muted-foreground">
                      {phase() === 'waiting' ? 'Waiting for response...' : 'Streaming response...'}
                    </span>
                  </div>
                  <Button variant="outline" size="icon-sm" class="rounded-full" onClick={handleStop} aria-label="Stop generation">
                    <Square class="size-3" />
                  </Button>
                </PromptInputActions>
              </PromptInput>
            }
          >
            <PromptInput onSubmit={handleSend}>
              <PromptInputTextarea placeholder={phase() === 'complete' ? 'Ask a follow-up...' : 'Ask about streaming responses...'} />
              <PromptInputActions class="justify-end">
                <Button variant="default" size="icon-sm" class="rounded-full" onClick={handleSend} aria-label="Send message">
                  <ArrowUp class="size-4" />
                </Button>
              </PromptInputActions>
            </PromptInput>
          </Show>
        </div>
      </div>
    );
  },
};
