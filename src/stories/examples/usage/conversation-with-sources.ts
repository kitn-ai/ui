import type { ExampleUsage, StoryUsage } from './types';

// Shared assistant reply used across the snippets.
const REPLY =
  'Figma replaced their asm.js pipeline with Wasm and saw a 3x load-time improvement; Google Earth dropped frame render time from 40ms to 12ms.';

/**
 * Default — an assistant reply with inline citations and copy/like/dislike
 * actions. `<kc-message>` draws the reply + its action bar (from the `actions`
 * array, firing one `messageaction` event) and `<kc-sources>` renders the
 * citation list from a `sources` array (each item is a hover-card with title,
 * description, href, and an optional favicon).
 */
const def: StoryUsage = {
  intro:
    'Answer with cited sources. `<kc-message>` draws the reply + its action bar (`actions: ["copy","like","dislike"]` → one `messageaction` event); `<kc-sources>` renders the citations from a `sources` array — each entry a hover-card with `title`, `description`, `href`, and optional `showFavicon`. (The live demo composes the SolidJS `Message` + `Source`/`SourceList` primitives inside a `ChatContainer`.)',
  snippets: {
    html: `<!-- Register the elements once (CDN or bundler) -->
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/chat/dist/kitn-chat.es.js';
</script>

<kc-message id="msg"></kc-message>
<kc-sources id="src" show-favicon></kc-sources>

<script type="module">
  const msg = document.getElementById('msg');
  const src = document.getElementById('src');
  // Set objects/arrays as PROPERTIES (not attributes).
  msg.message = {
    id: 'm1',
    role: 'assistant',
    content: '${REPLY}',
    actions: ['copy', 'like', 'dislike'],
  };
  msg.addEventListener('kc-message-action', (e) => {
    const { messageId, action } = e.detail; // 'copy' | 'like' | 'dislike'
    console.log(messageId, action);
  });
  src.sources = [
    {
      href: 'https://www.figma.com/blog/webassembly-cut-figmas-load-time-by-3x/',
      title: "WebAssembly cut Figma's load time by 3x",
      description: 'How Figma leveraged WebAssembly to improve their design tool.',
    },
    {
      href: 'https://web.dev/case-studies/earth-webassembly',
      title: 'Google Earth and WebAssembly',
      description: "Porting Google Earth's C++ rendering engine to WebAssembly.",
    },
  ];
</script>`,

    react: `import { Message, Sources } from '@kitn.ai/chat/react';

export function AnswerWithSources() {
  return (
    <>
      <Message
        message={{
          id: 'm1',
          role: 'assistant',
          content: '${REPLY}',
          actions: ['copy', 'like', 'dislike'],
        }}
        onMessageAction={(e) => {
          const { messageId, action } = e.detail;
          console.log(messageId, action);
        }}
      />
      <Sources
        showFavicon
        sources={[
          {
            href: 'https://www.figma.com/blog/webassembly-cut-figmas-load-time-by-3x/',
            title: "WebAssembly cut Figma's load time by 3x",
            description: 'How Figma leveraged WebAssembly to improve their design tool.',
          },
          {
            href: 'https://web.dev/case-studies/earth-webassembly',
            title: 'Google Earth and WebAssembly',
            description: "Porting Google Earth's C++ rendering engine to WebAssembly.",
          },
        ]}
      />
    </>
  );
}`,

    vue: `<script setup>
import '@kitn.ai/chat/elements'; // register once (e.g. in main.ts)

const message = {
  id: 'm1',
  role: 'assistant',
  content: '${REPLY}',
  actions: ['copy', 'like', 'dislike'],
};

const sources = [
  {
    href: 'https://www.figma.com/blog/webassembly-cut-figmas-load-time-by-3x/',
    title: "WebAssembly cut Figma's load time by 3x",
    description: 'How Figma leveraged WebAssembly to improve their design tool.',
  },
  {
    href: 'https://web.dev/case-studies/earth-webassembly',
    title: 'Google Earth and WebAssembly',
    description: "Porting Google Earth's C++ rendering engine to WebAssembly.",
  },
];

function onAction(e) {
  const { messageId, action } = e.detail;
  console.log(messageId, action);
}
</script>

<template>
  <!-- .prop binds the object/array as a property (attributes only take strings) -->
  <kc-message :message.prop="message" @kc-message-action="onAction" />
  <kc-sources :sources.prop="sources" show-favicon />
</template>`,

    svelte: `<script>
  import '@kitn.ai/chat/elements'; // register once

  let msgEl;
  let srcEl;

  const message = {
    id: 'm1',
    role: 'assistant',
    content: '${REPLY}',
    actions: ['copy', 'like', 'dislike'],
  };

  const sources = [
    {
      href: 'https://www.figma.com/blog/webassembly-cut-figmas-load-time-by-3x/',
      title: "WebAssembly cut Figma's load time by 3x",
      description: 'How Figma leveraged WebAssembly to improve their design tool.',
    },
    {
      href: 'https://web.dev/case-studies/earth-webassembly',
      title: 'Google Earth and WebAssembly',
      description: "Porting Google Earth's C++ rendering engine to WebAssembly.",
    },
  ];

  // Set objects/arrays as properties via a binding (attributes only take strings).
  $: if (msgEl) msgEl.message = message;
  $: if (srcEl) srcEl.sources = sources;

  function onAction(e) {
    const { messageId, action } = e.detail;
    console.log(messageId, action);
  }
</script>

<kc-message bind:this={msgEl} on:kc-message-action={onAction} />
<kc-sources bind:this={srcEl} show-favicon />`,

    angular: `// main.ts: import '@kitn.ai/chat/elements' before bootstrapApplication,
// and add CUSTOM_ELEMENTS_SCHEMA to the component/module.
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-answer',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <kc-message [message]="message" (kc-message-action)="onAction($event)"></kc-message>
    <kc-sources [sources]="sources" [showFavicon]="true"></kc-sources>
  \`,
})
export class AnswerComponent {
  message = {
    id: 'm1',
    role: 'assistant',
    content: '${REPLY}',
    actions: ['copy', 'like', 'dislike'],
  };

  sources = [
    {
      href: 'https://www.figma.com/blog/webassembly-cut-figmas-load-time-by-3x/',
      title: "WebAssembly cut Figma's load time by 3x",
      description: 'How Figma leveraged WebAssembly to improve their design tool.',
    },
    {
      href: 'https://web.dev/case-studies/earth-webassembly',
      title: 'Google Earth and WebAssembly',
      description: "Porting Google Earth's C++ rendering engine to WebAssembly.",
    },
  ];

  onAction(e: CustomEvent<{ messageId: string; action: string }>) {
    const { messageId, action } = e.detail;
    console.log(messageId, action);
  }
}`,

    solid: `import { ChatContainer, ChatContainerContent } from '@kitn.ai/chat';
import {
  Message, MessageAvatar, MessageContent, MessageActions,
  Source, SourceTrigger, SourceContent, SourceList,
  Button,
} from '@kitn.ai/chat';
import { Copy, ThumbsUp, ThumbsDown } from 'lucide-solid';

export function AnswerWithSources() {
  return (
    <ChatContainer>
      <ChatContainerContent class="space-y-6 py-4">
        <Message>
          <MessageAvatar fallback="AI" alt="Assistant" />
          <div class="flex-1 space-y-2">
            <MessageContent markdown>${REPLY}</MessageContent>

            {/* Inline citations: each Source is a hover-card with a numbered trigger */}
            <SourceList>
              <Source href="https://www.figma.com/blog/webassembly-cut-figmas-load-time-by-3x/">
                <SourceTrigger label={1} showFavicon />
                <SourceContent
                  title="WebAssembly cut Figma's load time by 3x"
                  description="How Figma leveraged WebAssembly to improve their design tool."
                />
              </Source>
              <Source href="https://web.dev/case-studies/earth-webassembly">
                <SourceTrigger label={2} showFavicon />
                <SourceContent
                  title="Google Earth and WebAssembly"
                  description="Porting Google Earth's C++ rendering engine to WebAssembly."
                />
              </Source>
            </SourceList>

            <MessageActions>
              <Button variant="ghost" size="icon-sm" aria-label="Copy message"><Copy class="size-3.5" /></Button>
              <Button variant="ghost" size="icon-sm" aria-label="Good response"><ThumbsUp class="size-3.5" /></Button>
              <Button variant="ghost" size="icon-sm" aria-label="Bad response"><ThumbsDown class="size-3.5" /></Button>
            </MessageActions>
          </div>
        </Message>
      </ChatContainerContent>
    </ChatContainer>
  );
}`,
  },
};

/**
 * Example: Conversation with Sources — an assistant reply with inline citations
 * (`<kc-sources>`) and copy/like/dislike actions (`<kc-message>`). Per-story:
 * the Usage tab shows the snippet for the story you're on; the example-level
 * fields below are the fallback.
 */
const conversationWithSources: ExampleUsage = {
  title: 'Examples/Conversation with Sources',
  ...def, // example-level fallback = the single "Default" story
  stories: {
    Default: def,
  },
};

export default conversationWithSources;
