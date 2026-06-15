import type { ExampleUsage, StoryUsage } from './types';

// Shared streamed reply used across the snippets (trimmed from the demo).
const STREAM =
  'Server-Sent Events (SSE) are a lightweight alternative to WebSockets for one-way server-to-client streaming. Use SSE when you only need server push.';

/** Typewriter Streaming — reveal the reply character by character. */
const typewriter: StoryUsage = {
  intro:
    'Stream an assistant reply character by character. `<kc-response-stream>` takes the `text` (a string or, set as a property, an `AsyncIterable<string>`), `mode="typewriter"`, and a `speed`, and fires `complete` when it finishes. (The live demo composes the SolidJS `ResponseStream` primitive inside a `Message`.)',
  snippets: {
    html: `<!-- Register the elements once (CDN or bundler) -->
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/chat/dist/kitn-chat.es.js';
</script>

<kc-response-stream id="stream" mode="typewriter" speed="40"></kc-response-stream>

<script type="module">
  const stream = document.getElementById('stream');
  // A plain string is fine as a property; an AsyncIterable<string> MUST be a property.
  stream.text = '${STREAM}';
  stream.addEventListener('complete', () => console.log('done streaming'));
</script>`,

    react: `import { ResponseStream } from '@kitn.ai/chat/react';

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
import '@kitn.ai/chat/elements'; // register once (e.g. in main.ts)

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
    @complete="onComplete"
  />
</template>`,

    svelte: `<script>
  import '@kitn.ai/chat/elements';

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
  on:complete={onComplete}
/>`,

    angular: `// main.ts: import '@kitn.ai/chat/elements' before bootstrapApplication,
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
      (complete)="onComplete()"
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
import { Message, MessageAvatar, ResponseStream } from '@kitn.ai/chat';

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
    'Show a "thinking" placeholder before the first token arrives — `<kc-response-stream>` is not involved yet (there is nothing to stream). Use `<kc-loader>` for the spinner and `<kc-text-shimmer>` for the shimmering label, then swap in `<kc-response-stream>` once tokens start. (The live demo composes the SolidJS `Loader` + `TextShimmer` primitives.)',
  snippets: {
    html: `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/chat/dist/kitn-chat.es.js';
</script>

<div style="display:flex;align-items:center;gap:0.75rem">
  <kc-loader variant="dots" size="sm"></kc-loader>
  <kc-text-shimmer>Thinking...</kc-text-shimmer>
</div>`,

    react: `import { Loader, TextShimmer } from '@kitn.ai/chat/react';

<div className="flex items-center gap-3">
  <Loader variant="dots" size="sm" />
  <TextShimmer>Thinking...</TextShimmer>
</div>`,

    vue: `<script setup>
import '@kitn.ai/chat/elements';
</script>

<template>
  <div style="display:flex;align-items:center;gap:0.75rem">
    <kc-loader variant="dots" size="sm" />
    <kc-text-shimmer>Thinking...</kc-text-shimmer>
  </div>
</template>`,

    svelte: `<script>
  import '@kitn.ai/chat/elements';
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

    solid: `import { Message, MessageAvatar, Loader, TextShimmer } from '@kitn.ai/chat';

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
    'Reveal the reply with a word fade-in instead of a typewriter. Same `<kc-response-stream>`, just `mode="fade"`; tune `speed` to control the cadence, and handle `complete` when it finishes. (The live demo composes the SolidJS `ResponseStream` primitive inside a `Message`.)',
  snippets: {
    html: `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/chat/dist/kitn-chat.es.js';
</script>

<kc-response-stream id="stream" mode="fade" speed="30"></kc-response-stream>

<script type="module">
  const stream = document.getElementById('stream');
  stream.text = '${STREAM}';
  stream.addEventListener('complete', () => console.log('done streaming'));
</script>`,

    react: `import { ResponseStream } from '@kitn.ai/chat/react';

<ResponseStream
  text="${STREAM}"
  mode="fade"
  speed={30}
  onComplete={() => console.log('done streaming')}
/>`,

    vue: `<script setup>
import '@kitn.ai/chat/elements';
const text = '${STREAM}';
</script>

<template>
  <kc-response-stream
    :text.prop="text"
    mode="fade"
    :speed="30"
    @complete="() => console.log('done streaming')"
  />
</template>`,

    svelte: `<script>
  import '@kitn.ai/chat/elements';
  let el;
  const text = '${STREAM}';
  $: if (el) el.text = text;
</script>

<kc-response-stream
  bind:this={el}
  mode="fade"
  speed="30"
  on:complete={() => console.log('done streaming')}
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
      (complete)="log()"
    ></kc-response-stream>
  \`,
})
export class StreamComponent {
  text = '${STREAM}';
  log() { console.log('done streaming'); }
}`,

    solid: `import { createSignal, Show } from 'solid-js';
import { Message, MessageAvatar, ResponseStream } from '@kitn.ai/chat';

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
  },
};

export default streamingResponse;
