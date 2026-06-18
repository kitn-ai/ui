import type { ExampleUsage, StoryUsage } from './types';

// Shared streamed reply used across the snippets (trimmed from the demo).
const STREAM =
  'Server-Sent Events (SSE) are a lightweight alternative to WebSockets for one-way server-to-client streaming. Use SSE when you only need server push.';

/** Typewriter Streaming — reveal the reply character by character. */
const typewriter: StoryUsage = {
  intro:
    'Reveal an assistant reply character by character. Set the `text` property to a string (or an `AsyncIterable<string>` assigned as a JS property — async iterables cannot be HTML attributes) with `mode="typewriter"` and handle `kc-complete` to unlock the input once all characters are displayed. **Cancel gotcha:** there is no built-in `stop()` — abort your own fetch with an `AbortController` and then clear your streaming state. **Replay gotcha:** passing the same string value again does not re-run the animation; unmount and remount the element instead.',
  snippets: {
    html: `<!-- Register the elements once (CDN or bundler) -->
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kitn-chat.es.js';
</script>

<kc-response-stream id="stream" mode="typewriter" speed="40"></kc-response-stream>

<script type="module">
  const stream = document.getElementById('stream');
  // A plain string is fine as a property; an AsyncIterable<string> MUST be a property.
  stream.text = '${STREAM}';
  stream.addEventListener('kc-complete', () => console.log('done streaming'));
</script>`,

    react: `import { ResponseStream } from '@kitn.ai/ui/react';

export function StreamedReply() {
  return (
    <ResponseStream
      text="${STREAM}"
      mode="typewriter"
      speed={40}
      onComplete={() => console.log('done streaming')}
    />
  );
}`,

    vue: `<script setup>
import '@kitn.ai/ui/elements'; // register once (e.g. in main.ts)

// A string can be a plain attr; an AsyncIterable must be bound as a property.
const text = '${STREAM}';

function onComplete() {
  console.log('done streaming');
}
</script>

<template>
  <kc-response-stream
    :text.prop="text"
    mode="typewriter"
    :speed="40"
    @kc-complete="onComplete"
  />
</template>`,

    svelte: `<script>
  import '@kitn.ai/ui/elements';

  let el;
  const text = '${STREAM}';
  $: if (el) el.text = text; // AsyncIterable values are set as properties

  function onComplete() {
    console.log('done streaming');
  }
</script>

<kc-response-stream
  bind:this={el}
  mode="typewriter"
  speed="40"
  on:kc-complete={onComplete}
/>`,

    angular: `// main.ts: import '@kitn.ai/ui/elements' before bootstrapApplication,
// and add CUSTOM_ELEMENTS_SCHEMA to the component.
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-stream',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <kc-response-stream
      [text]="text"
      mode="typewriter"
      [speed]="40"
      (kc-complete)="onComplete()"
    ></kc-response-stream>
  \`,
})
export class StreamComponent {
  text = '${STREAM}';
  onComplete() {
    console.log('done streaming');
  }
}`,

    solid: `import { createSignal, Show } from 'solid-js';
import { Message, MessageAvatar, ResponseStream } from '@kitn.ai/ui';

export function StreamedReply() {
  const [streaming, setStreaming] = createSignal(true);
  return (
    <Show when={streaming()}>
      <Message>
        <MessageAvatar fallback="AI" alt="Assistant" />
        <div class="flex-1 rounded-lg p-2 bg-secondary">
          <ResponseStream
            textStream="${STREAM}"
            mode="typewriter"
            speed={40}
            onComplete={() => setStreaming(false)}
            class="prose dark:prose-invert prose-sm max-w-none"
          />
        </div>
      </Message>
    </Show>
  );
}`,
  },
};

/**
 * Waiting for First Token — the "thinking" state before any token arrives.
 * This story does NOT stream: there's nothing for kc-response-stream to do yet,
 * so the snippets show the loading primitives that precede a stream.
 */
const waiting: StoryUsage = {
  intro:
    'Show a placeholder **before the first token arrives** — `<kc-response-stream>` is not involved yet (there is nothing to stream). Use `<kc-loader variant="dots">` for the thinking spinner and `<kc-text-shimmer>` for the shimmering label. Once the first chunk arrives, swap them out for `<kc-response-stream>`. Use `<kc-loader variant="typing">` in the input bar to signal that tokens are now *flowing* — `dots` means waiting, `typing` means actively generating.',
  snippets: {
    html: `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kitn-chat.es.js';
</script>

<div style="display:flex;align-items:center;gap:0.75rem">
  <kc-loader variant="dots" size="sm"></kc-loader>
  <kc-text-shimmer>Thinking...</kc-text-shimmer>
</div>`,

    react: `import { Loader, TextShimmer } from '@kitn.ai/ui/react';

<div className="flex items-center gap-3">
  <Loader variant="dots" size="sm" />
  <TextShimmer>Thinking...</TextShimmer>
</div>`,

    vue: `<script setup>
import '@kitn.ai/ui/elements';
</script>

<template>
  <div style="display:flex;align-items:center;gap:0.75rem">
    <kc-loader variant="dots" size="sm" />
    <kc-text-shimmer>Thinking...</kc-text-shimmer>
  </div>
</template>`,

    svelte: `<script>
  import '@kitn.ai/ui/elements';
</script>

<div style="display:flex;align-items:center;gap:0.75rem">
  <kc-loader variant="dots" size="sm" />
  <kc-text-shimmer>Thinking...</kc-text-shimmer>
</div>`,

    angular: `import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-waiting',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <div style="display:flex;align-items:center;gap:0.75rem">
      <kc-loader variant="dots" size="sm"></kc-loader>
      <kc-text-shimmer>Thinking...</kc-text-shimmer>
    </div>
  \`,
})
export class WaitingComponent {}`,

    solid: `import { Message, MessageAvatar, Loader, TextShimmer } from '@kitn.ai/ui';

export function Thinking() {
  return (
    <Message>
      <MessageAvatar fallback="AI" alt="Assistant" />
      <div class="flex-1 flex items-center gap-3 rounded-lg p-3 bg-secondary">
        <Loader variant="dots" size="sm" />
        <TextShimmer class="text-sm">Thinking...</TextShimmer>
      </div>
    </Message>
  );
}`,
  },
};

/** Fade-in Streaming — words fade in instead of appearing char by char. */
const fade: StoryUsage = {
  intro:
    'Reveal the reply word-by-word with staggered CSS fade-ins instead of a typewriter. Set `mode="fade"` on `<kc-response-stream>` and tune `speed` to control the stagger cadence. **Important:** when `text` is a plain string, `kc-complete` / `onComplete` is **never fired** in fade mode — all segments are delivered immediately and CSS handles the reveal with no detectable endpoint. If you need a completion callback in fade mode, pass an `AsyncIterable<string>` as a property instead (the callback fires after the iterator is exhausted).',
  snippets: {
    html: `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kitn-chat.es.js';
</script>

<kc-response-stream id="stream" mode="fade" speed="30"></kc-response-stream>

<script type="module">
  const stream = document.getElementById('stream');
  stream.text = '${STREAM}';
  stream.addEventListener('kc-complete', () => console.log('done streaming'));
</script>`,

    react: `import { ResponseStream } from '@kitn.ai/ui/react';

<ResponseStream
  text="${STREAM}"
  mode="fade"
  speed={30}
  onComplete={() => console.log('done streaming')}
/>`,

    vue: `<script setup>
import '@kitn.ai/ui/elements';
const text = '${STREAM}';
</script>

<template>
  <kc-response-stream
    :text.prop="text"
    mode="fade"
    :speed="30"
    @kc-complete="() => console.log('done streaming')"
  />
</template>`,

    svelte: `<script>
  import '@kitn.ai/ui/elements';
  let el;
  const text = '${STREAM}';
  $: if (el) el.text = text;
</script>

<kc-response-stream
  bind:this={el}
  mode="fade"
  speed="30"
  on:kc-complete={() => console.log('done streaming')}
/>`,

    angular: `import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-stream',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <kc-response-stream
      [text]="text"
      mode="fade"
      [speed]="30"
      (kc-complete)="log()"
    ></kc-response-stream>
  \`,
})
export class StreamComponent {
  text = '${STREAM}';
  log() { console.log('done streaming'); }
}`,

    solid: `import { createSignal, Show } from 'solid-js';
import { Message, MessageAvatar, ResponseStream } from '@kitn.ai/ui';

export function FadeReply() {
  const [streaming, setStreaming] = createSignal(true);
  return (
    <Show when={streaming()}>
      <Message>
        <MessageAvatar fallback="AI" alt="Assistant" />
        <div class="flex-1 rounded-lg p-2 bg-secondary">
          <ResponseStream
            textStream="${STREAM}"
            mode="fade"
            speed={30}
            onComplete={() => setStreaming(false)}
            class="prose dark:prose-invert prose-sm max-w-none"
          />
        </div>
      </Message>
    </Show>
  );
}`,
  },
};

/** Full Streaming Lifecycle — idle → waiting → streaming → complete in one interactive story. */
const fullLifecycle: StoryUsage = {
  intro:
    'All three phases in one interactive story: **waiting** (dots loader + shimmer before first token), **streaming** (typewriter reveal with a stop button), and **complete** (action bar appears; input unlocks). This is the pattern to follow in production. **Phase ownership:** `ResponseStream` / `kc-response-stream` knows nothing about waiting or cancellation — your app owns a `phase` signal and drives the UI from it. **No built-in cancel:** to stop mid-stream, call `abortController.abort()` on your own fetch and then reset your phase state; the element will stop receiving characters but does not reset its display.',
  snippets: {
    html: `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kitn-chat.es.js';
</script>

<!-- Phase 1: Waiting -->
<div id="waiting" style="display:flex;align-items:center;gap:0.75rem">
  <kc-loader variant="dots" size="sm"></kc-loader>
  <kc-text-shimmer>Thinking...</kc-text-shimmer>
</div>

<!-- Phase 2+3: Streaming → Complete (hidden initially) -->
<div id="reply" hidden>
  <kc-response-stream id="stream" mode="typewriter" speed="35"></kc-response-stream>
  <!-- Action bar, shown after complete -->
  <div id="actions" hidden>
    <button id="copy-btn">Copy</button>
    <button id="regen-btn">Regenerate</button>
  </div>
</div>

<script type="module">
  const controller = new AbortController();

  // Simulate: after ~1.2 s first token arrives
  setTimeout(() => {
    document.getElementById('waiting').hidden = true;
    document.getElementById('reply').hidden = false;

    const stream = document.getElementById('stream');
    // Pass a plain string; or assign an AsyncIterable<string> as a property.
    stream.text = '${STREAM}';
    stream.addEventListener('kc-complete', () => {
      document.getElementById('actions').hidden = false;
    });
  }, 1200);

  document.getElementById('stop-btn')?.addEventListener('click', () => {
    controller.abort();          // cancel the real fetch
    document.getElementById('waiting').hidden = true; // or reset your phase
  });
</script>`,

    react: `import { useState, useEffect, useRef } from 'react';
import { ResponseStream, Loader, TextShimmer } from '@kitn.ai/ui/react';

type Phase = 'idle' | 'waiting' | 'streaming' | 'complete';

export function StreamingChat() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [mounted, setMounted] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const handleSend = () => {
    controllerRef.current = new AbortController();
    setMounted(false);
    setPhase('waiting');
    // Simulate latency before first token
    setTimeout(() => { setMounted(true); setPhase('streaming'); }, 1200);
  };

  const handleStop = () => {
    controllerRef.current?.abort();
    setMounted(false);
    setPhase('idle');
  };

  return (
    <div>
      {phase === 'waiting' && (
        <div className="flex items-center gap-3">
          <Loader variant="dots" size="sm" />
          <TextShimmer>Thinking...</TextShimmer>
        </div>
      )}
      {mounted && (
        <ResponseStream
          text="${STREAM}"
          mode="typewriter"
          speed={35}
          onComplete={() => setPhase('complete')}
        />
      )}
      {phase === 'complete' && <div>✓ Action bar here</div>}
      <button onClick={phase === 'idle' || phase === 'complete' ? handleSend : handleStop}>
        {phase === 'idle' || phase === 'complete' ? 'Send' : 'Stop'}
      </button>
    </div>
  );
}`,

    vue: `<script setup>
import { ref } from 'vue';
import '@kitn.ai/ui/elements';

const REPLY = '${STREAM}';
const phase = ref('idle'); // 'idle' | 'waiting' | 'streaming' | 'complete'
const mounted = ref(false);
let controller = null;

function send() {
  controller = new AbortController();
  mounted.value = false;
  phase.value = 'waiting';
  setTimeout(() => { mounted.value = true; phase.value = 'streaming'; }, 1200);
}

function stop() {
  controller?.abort();
  mounted.value = false;
  phase.value = 'idle';
}

function onComplete() { phase.value = 'complete'; }
</script>

<template>
  <div>
    <div v-if="phase === 'waiting'" style="display:flex;align-items:center;gap:0.75rem">
      <kc-loader variant="dots" size="sm" />
      <kc-text-shimmer>Thinking...</kc-text-shimmer>
    </div>

    <kc-response-stream
      v-if="mounted"
      :text.prop="REPLY"
      mode="typewriter"
      :speed="35"
      @kc-complete="onComplete"
    />

    <div v-if="phase === 'complete'">✓ Action bar here</div>

    <button @click="phase === 'idle' || phase === 'complete' ? send() : stop()">
      {{ phase === 'idle' || phase === 'complete' ? 'Send' : 'Stop' }}
    </button>
  </div>
</template>`,

    svelte: `<script>
  import '@kitn.ai/ui/elements';

  const REPLY = '${STREAM}';
  let phase = 'idle'; // 'idle' | 'waiting' | 'streaming' | 'complete'
  let mounted = false;
  let el;
  let controller;

  $: if (el && mounted) el.text = REPLY;

  function send() {
    controller = new AbortController();
    mounted = false;
    phase = 'waiting';
    setTimeout(() => { mounted = true; phase = 'streaming'; }, 1200);
  }

  function stop() {
    controller?.abort();
    mounted = false;
    phase = 'idle';
  }

  function onComplete() { phase = 'complete'; }
</script>

{#if phase === 'waiting'}
  <div style="display:flex;align-items:center;gap:0.75rem">
    <kc-loader variant="dots" size="sm" />
    <kc-text-shimmer>Thinking...</kc-text-shimmer>
  </div>
{/if}

{#if mounted}
  <kc-response-stream
    bind:this={el}
    mode="typewriter"
    speed="35"
    on:kc-complete={onComplete}
  />
{/if}

{#if phase === 'complete'}<div>✓ Action bar here</div>{/if}

<button on:click={phase === 'idle' || phase === 'complete' ? send : stop}>
  {phase === 'idle' || phase === 'complete' ? 'Send' : 'Stop'}
</button>`,

    angular: `import { Component, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

type Phase = 'idle' | 'waiting' | 'streaming' | 'complete';

@Component({
  selector: 'app-streaming-chat',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <div *ngIf="phase() === 'waiting'" style="display:flex;align-items:center;gap:0.75rem">
      <kc-loader variant="dots" size="sm"></kc-loader>
      <kc-text-shimmer>Thinking...</kc-text-shimmer>
    </div>

    <kc-response-stream
      *ngIf="mounted()"
      [text]="reply"
      mode="typewriter"
      [speed]="35"
      (kc-complete)="onComplete()">
    </kc-response-stream>

    <div *ngIf="phase() === 'complete'">✓ Action bar here</div>

    <button (click)="toggle()">
      {{ phase() === 'idle' || phase() === 'complete' ? 'Send' : 'Stop' }}
    </button>
  \`,
})
export class StreamingChatComponent {
  reply = '${STREAM}';
  phase = signal<Phase>('idle');
  mounted = signal(false);
  private controller: AbortController | null = null;

  toggle() {
    if (this.phase() === 'idle' || this.phase() === 'complete') this.send();
    else this.stop();
  }

  send() {
    this.controller = new AbortController();
    this.mounted.set(false);
    this.phase.set('waiting');
    setTimeout(() => { this.mounted.set(true); this.phase.set('streaming'); }, 1200);
  }

  stop() {
    this.controller?.abort();
    this.mounted.set(false);
    this.phase.set('idle');
  }

  onComplete() { this.phase.set('complete'); }
}`,

    solid: `import { createSignal, Show } from 'solid-js';
import {
  ChatContainer, ChatContainerContent, ChatContainerScrollAnchor,
  Message, MessageAvatar, MessageContent, MessageActions,
  PromptInput, PromptInputTextarea, PromptInputActions,
  ResponseStream, Loader, TextShimmer, Button,
} from '@kitn.ai/ui';
import { Square, ArrowUp, Copy, RefreshCw } from 'lucide-solid';

type Phase = 'idle' | 'waiting' | 'streaming' | 'complete';

const REPLY = '${STREAM}';

export function StreamingLifecycle() {
  const [phase, setPhase] = createSignal<Phase>('idle');
  const [showStream, setShowStream] = createSignal(false);
  let controller: AbortController | undefined;

  const handleSend = () => {
    controller = new AbortController();
    setShowStream(false);
    setPhase('waiting');
    // Simulate latency; in production replace with a real fetch:
    // const res = await fetch('/api/chat', { signal: controller.signal });
    setTimeout(() => { setShowStream(true); setPhase('streaming'); }, 1200);
  };

  const handleStop = () => {
    controller?.abort();   // cancel the real fetch
    setShowStream(false);  // unmounts ResponseStream, stopping character reveals
    setPhase('idle');
  };

  return (
    <div class="flex flex-col h-[640px] w-full max-w-2xl bg-background rounded-xl shadow-lg overflow-hidden">
      <ChatContainer class="flex-1 p-4">
        <ChatContainerContent class="space-y-6 py-4">

          {/* Phase 1 — Waiting */}
          <Show when={phase() === 'waiting'}>
            <Message>
              <MessageAvatar fallback="AI" alt="Assistant" />
              <div class="flex-1 flex items-center gap-3 rounded-lg p-3 bg-secondary">
                <Loader variant="dots" size="sm" />
                <TextShimmer class="text-sm">Thinking...</TextShimmer>
              </div>
            </Message>
          </Show>

          {/* Phase 2+3 — Streaming → Complete */}
          <Show when={showStream()}>
            <Message>
              <MessageAvatar fallback="AI" alt="Assistant" />
              <div class="flex-1 space-y-2">
                <div class="rounded-lg p-2 bg-secondary">
                  <ResponseStream
                    textStream={REPLY}
                    mode="typewriter"
                    speed={35}
                    onComplete={() => setPhase('complete')}
                    class="prose dark:prose-invert prose-sm max-w-none"
                  />
                </div>
                {/* Action bar only after onComplete fires */}
                <Show when={phase() === 'complete'}>
                  <MessageActions>
                    <Button variant="ghost" size="icon-sm" aria-label="Copy message">
                      <Copy class="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Regenerate" onClick={handleSend}>
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

      <div class="px-4 pb-4">
        <Show
          when={phase() === 'idle' || phase() === 'complete'}
          fallback={
            <PromptInput disabled isLoading>
              <PromptInputTextarea placeholder={phase() === 'waiting' ? 'Waiting for first token...' : 'Generating...'} />
              <PromptInputActions class="justify-between">
                <div class="flex items-center gap-2">
                  <Show when={phase() === 'streaming'} fallback={<Loader variant="dots" size="sm" />}>
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
            <PromptInputTextarea placeholder="Send to start the lifecycle..." />
            <PromptInputActions class="justify-end">
              <Button variant="default" size="icon-sm" class="rounded-full" onClick={handleSend} aria-label="Send">
                <ArrowUp class="size-4" />
              </Button>
            </PromptInputActions>
          </PromptInput>
        </Show>
      </div>
    </div>
  );
}`,
  },
};

/**
 * Example: Streaming Response — a typewriter / fade reveal of an assistant
 * reply, plus the "thinking" state before the first token. Per-story: the
 * Usage tab shows the snippet for the story you're on; the example-level fields
 * below are the fallback.
 */
const streamingResponse: ExampleUsage = {
  title: 'Examples/Streaming Response',
  ...typewriter, // example-level fallback = the headline "Typewriter Streaming"
  stories: {
    'Typewriter Streaming': typewriter,
    'Waiting for First Token': waiting,
    'Fade-in Streaming': fade,
    'Full Streaming Lifecycle': fullLifecycle,
  },
};

export default streamingResponse;
