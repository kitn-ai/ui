import type { ExampleUsage, StoryUsage } from './types';

// Shared assistant reply used across the snippets.
const REPLY =
  'Figma replaced their asm.js pipeline with Wasm and saw a 3x load-time improvement; Google Earth dropped frame render time from 40ms to 12ms.';

/**
 * Multi-turn with Citations — two exchanges with inline citations; first without
 * favicons (numbered labels only), second with `showFavicon`.
 *
 * API notes:
 * - `<kc-sources>` accepts sources via:
 *   (a) `sources` JS property: `el.sources = [{ href, title, description, label?, showFavicon? }]`
 *   (b) Declarative `<kc-source>` children: picked up via MutationObserver and
 *       appended after prop sources. Use `headline` (not `title`) as the attribute
 *       — `title` is a reserved HTML attribute that conflicts with the CE constructor.
 *       Confirmed in src/elements/source.tsx.
 * - `numbered` prop: set `<kc-sources numbered>` / `el.numbered = true` to
 *   auto-label each chip with its 1-based index from the merged source list.
 *   Per-item `label` is ignored when `numbered` is active. For manual control,
 *   omit `numbered` and set `label` per item. Confirmed in src/elements/source.tsx.
 * - `showFavicon` on `<kc-sources>` sets the default for all items; per-item
 *   `showFavicon` on a child `<kc-source>` overrides it.
 */
const def: StoryUsage = {
  intro:
    'Answer with cited sources. `<kc-sources>` supports two authoring approaches: **data array** — set `el.sources = [{ href, title, description, label?, showFavicon? }]` as a JS property (ideal for dynamic/streamed citations); **composition** — place `<kc-source href=… headline=… description=…>` elements as children (ideal for static/authored citations, no JS wiring needed). The two approaches can be mixed: prop sources render first, then children are appended. Add the `numbered` boolean (`<kc-sources numbered>` / `el.numbered = true`) to auto-label each chip with its 1-based index. Use `headline` (not `title`) as the `<kc-source>` attribute — `title` is a reserved HTML attribute. (The live demo composes the SolidJS `Source`/`SourceList` primitives.)',
  snippets: {
    html: `<!-- Register the elements once (CDN or bundler) -->
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/chat/dist/kitn-chat.es.js';
</script>

<!-- Composition approach: declarative children, no JS wiring needed for sources -->
<kc-message id="msg"></kc-message>
<kc-sources numbered>
  <kc-source
    href="https://www.figma.com/blog/webassembly-cut-figmas-load-time-by-3x/"
    headline="WebAssembly cut Figma's load time by 3x"
    description="How Figma leveraged WebAssembly to improve their design tool."
  ></kc-source>
  <kc-source
    href="https://web.dev/case-studies/earth-webassembly"
    headline="Google Earth and WebAssembly"
    description="Porting Google Earth's C++ rendering engine to WebAssembly."
  ></kc-source>
</kc-sources>

<script type="module">
  const msg = document.getElementById('msg');
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
  // Data-array approach (for dynamic/streamed citations):
  // const src = document.querySelector('kc-sources');
  // src.sources = [{ href, title, description, label?, showFavicon? }, …];
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

function onAction(e) {
  const { messageId, action } = e.detail;
  console.log(messageId, action);
}
</script>

<template>
  <!-- Composition approach: <kc-source> children, no sources property needed -->
  <!-- .prop binds the message object as a property (attributes only take strings) -->
  <kc-message :message.prop="message" @kc-message-action="onAction" />
  <kc-sources numbered>
    <kc-source
      href="https://www.figma.com/blog/webassembly-cut-figmas-load-time-by-3x/"
      headline="WebAssembly cut Figma's load time by 3x"
      description="How Figma leveraged WebAssembly to improve their design tool."
    />
    <kc-source
      href="https://web.dev/case-studies/earth-webassembly"
      headline="Google Earth and WebAssembly"
      description="Porting Google Earth's C++ rendering engine to WebAssembly."
    />
  </kc-sources>
  <!-- Data-array approach (for dynamic/streamed citations): -->
  <!-- <kc-sources :sources.prop="sources" show-favicon /> -->
</template>`,

    svelte: `<script>
  import '@kitn.ai/chat/elements'; // register once

  let msgEl;

  const message = {
    id: 'm1',
    role: 'assistant',
    content: '${REPLY}',
    actions: ['copy', 'like', 'dislike'],
  };

  // Set message as a property (attributes only take strings).
  $: if (msgEl) msgEl.message = message;

  function onAction(e) {
    const { messageId, action } = e.detail;
    console.log(messageId, action);
  }
</script>

<!-- Composition approach: <kc-source> children, no JS wiring needed for sources -->
<kc-message bind:this={msgEl} on:kc-message-action={onAction} />
<kc-sources numbered>
  <kc-source
    href="https://www.figma.com/blog/webassembly-cut-figmas-load-time-by-3x/"
    headline="WebAssembly cut Figma's load time by 3x"
    description="How Figma leveraged WebAssembly to improve their design tool."
  ></kc-source>
  <kc-source
    href="https://web.dev/case-studies/earth-webassembly"
    headline="Google Earth and WebAssembly"
    description="Porting Google Earth's C++ rendering engine to WebAssembly."
  ></kc-source>
</kc-sources>
<!-- Data-array approach (for dynamic/streamed citations):
<kc-sources bind:this={srcEl} show-favicon />
$: if (srcEl) srcEl.sources = sources; -->`,

    angular: `// main.ts: import '@kitn.ai/chat/elements' before bootstrapApplication,
// and add CUSTOM_ELEMENTS_SCHEMA to the component/module.
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-answer',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  // Composition approach: <kc-source> children, no [sources] binding needed.
  template: \`
    <kc-message [message]="message" (kc-message-action)="onAction($event)"></kc-message>
    <kc-sources numbered>
      <kc-source
        href="https://www.figma.com/blog/webassembly-cut-figmas-load-time-by-3x/"
        headline="WebAssembly cut Figma's load time by 3x"
        description="How Figma leveraged WebAssembly to improve their design tool."
      ></kc-source>
      <kc-source
        href="https://web.dev/case-studies/earth-webassembly"
        headline="Google Earth and WebAssembly"
        description="Porting Google Earth's C++ rendering engine to WebAssembly."
      ></kc-source>
    </kc-sources>
    <!-- Data-array approach (for dynamic/streamed citations): -->
    <!-- <kc-sources [sources]="sources" [showFavicon]="true"></kc-sources> -->
  \`,
})
export class AnswerComponent {
  message = {
    id: 'm1',
    role: 'assistant',
    content: '${REPLY}',
    actions: ['copy', 'like', 'dislike'],
  };

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
 *
 * Key notes:
 * - `numbered` prop on `<kc-sources>` auto-labels chips 1, 2, 3… from the merged list.
 * - `<kc-source>` children use `headline` not `title` (reserved HTML attr).
 * - `<kc-sources>` accepts both a `sources` property AND declarative children.
 */
/**
 * "Numbered Citations (composition)" — same citation list as the data-driven
 * "Numbered Citations" story, but built from <kc-sources numbered> + <kc-source>
 * children with no JS sources property. HTML/Vue/Svelte/Angular show the composition
 * form; React/Solid keep the data-array form (framework components, not web elements).
 */
const compositionStory: StoryUsage = {
  intro:
    'Build the same numbered-citation strip using `<kc-source>` children instead of a `sources` JS property — ideal for static/authored citations where markup beats data wiring. Place `<kc-source href=… headline=… description=…>` elements inside `<kc-sources numbered>`: the element picks them up via `MutationObserver` and auto-labels each chip 1, 2, 3…. No JS wiring needed for sources (only for message events). Use `headline` — **not** `title` — as the attribute; `title` is a reserved HTML attribute.',
  snippets: {
    html: `<!-- Register the elements once (CDN or bundler) -->
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/chat/dist/kitn-chat.es.js';
</script>

<!-- Composition: no JS needed for sources — just declare children -->
<kc-message id="msg"></kc-message>
<kc-sources numbered>
  <kc-source
    href="https://www.figma.com/blog/webassembly-cut-figmas-load-time-by-3x/"
    headline="WebAssembly cut Figma's load time by 3x"
    description="How Figma leveraged WebAssembly to improve their design tool."
  ></kc-source>
  <kc-source
    href="https://web.dev/case-studies/earth-webassembly"
    headline="Google Earth and WebAssembly"
    description="Porting Google Earth's C++ rendering engine to WebAssembly."
  ></kc-source>
  <kc-source
    href="https://shopify.engineering/shopify-webassembly"
    headline="How Shopify Uses WebAssembly"
    description="Shopify's journey using WebAssembly for Liquid template parsing."
  ></kc-source>
  <kc-source
    href="https://surma.dev/things/js-to-asc/"
    headline="JavaScript to AssemblyScript"
    description="Performance comparison of JS vs AssemblyScript/Wasm for various workloads."
  ></kc-source>
</kc-sources>

<script type="module">
  const msg = document.getElementById('msg');
  msg.message = {
    id: 'm1',
    role: 'assistant',
    content: '${REPLY}',
    actions: ['copy', 'like', 'dislike'],
  };
  msg.addEventListener('kc-message-action', (e) => {
    const { messageId, action } = e.detail;
    console.log(messageId, action);
  });
</script>`,

    vue: `<script setup>
import '@kitn.ai/chat/elements'; // register once (e.g. in main.ts)

const message = {
  id: 'm1',
  role: 'assistant',
  content: '${REPLY}',
  actions: ['copy', 'like', 'dislike'],
};

function onAction(e) {
  const { messageId, action } = e.detail;
  console.log(messageId, action);
}
</script>

<template>
  <!-- Composition: <kc-source> children, no :sources.prop binding needed -->
  <kc-message :message.prop="message" @kc-message-action="onAction" />
  <kc-sources numbered>
    <kc-source
      href="https://www.figma.com/blog/webassembly-cut-figmas-load-time-by-3x/"
      headline="WebAssembly cut Figma's load time by 3x"
      description="How Figma leveraged WebAssembly to improve their design tool."
    />
    <kc-source
      href="https://web.dev/case-studies/earth-webassembly"
      headline="Google Earth and WebAssembly"
      description="Porting Google Earth's C++ rendering engine to WebAssembly."
    />
    <kc-source
      href="https://shopify.engineering/shopify-webassembly"
      headline="How Shopify Uses WebAssembly"
      description="Shopify's journey using WebAssembly for Liquid template parsing."
    />
    <kc-source
      href="https://surma.dev/things/js-to-asc/"
      headline="JavaScript to AssemblyScript"
      description="Performance comparison of JS vs AssemblyScript/Wasm for various workloads."
    />
  </kc-sources>
</template>`,

    svelte: `<script>
  import '@kitn.ai/chat/elements'; // register once

  let msgEl;

  const message = {
    id: 'm1',
    role: 'assistant',
    content: '${REPLY}',
    actions: ['copy', 'like', 'dislike'],
  };

  $: if (msgEl) msgEl.message = message;

  function onAction(e) {
    const { messageId, action } = e.detail;
    console.log(messageId, action);
  }
</script>

<!-- Composition: <kc-source> children, no srcEl.sources binding needed -->
<kc-message bind:this={msgEl} on:kc-message-action={onAction} />
<kc-sources numbered>
  <kc-source
    href="https://www.figma.com/blog/webassembly-cut-figmas-load-time-by-3x/"
    headline="WebAssembly cut Figma's load time by 3x"
    description="How Figma leveraged WebAssembly to improve their design tool."
  ></kc-source>
  <kc-source
    href="https://web.dev/case-studies/earth-webassembly"
    headline="Google Earth and WebAssembly"
    description="Porting Google Earth's C++ rendering engine to WebAssembly."
  ></kc-source>
  <kc-source
    href="https://shopify.engineering/shopify-webassembly"
    headline="How Shopify Uses WebAssembly"
    description="Shopify's journey using WebAssembly for Liquid template parsing."
  ></kc-source>
  <kc-source
    href="https://surma.dev/things/js-to-asc/"
    headline="JavaScript to AssemblyScript"
    description="Performance comparison of JS vs AssemblyScript/Wasm for various workloads."
  ></kc-source>
</kc-sources>`,

    angular: `// main.ts: import '@kitn.ai/chat/elements' before bootstrapApplication,
// and add CUSTOM_ELEMENTS_SCHEMA to the component/module.
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-numbered-citations',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  // Composition: <kc-source> children, no [sources] binding needed.
  template: \`
    <kc-message [message]="message" (kc-message-action)="onAction($event)"></kc-message>
    <kc-sources numbered>
      <kc-source
        href="https://www.figma.com/blog/webassembly-cut-figmas-load-time-by-3x/"
        headline="WebAssembly cut Figma's load time by 3x"
        description="How Figma leveraged WebAssembly to improve their design tool."
      ></kc-source>
      <kc-source
        href="https://web.dev/case-studies/earth-webassembly"
        headline="Google Earth and WebAssembly"
        description="Porting Google Earth's C++ rendering engine to WebAssembly."
      ></kc-source>
      <kc-source
        href="https://shopify.engineering/shopify-webassembly"
        headline="How Shopify Uses WebAssembly"
        description="Shopify's journey using WebAssembly for Liquid template parsing."
      ></kc-source>
      <kc-source
        href="https://surma.dev/things/js-to-asc/"
        headline="JavaScript to AssemblyScript"
        description="Performance comparison of JS vs AssemblyScript/Wasm for various workloads."
      ></kc-source>
    </kc-sources>
  \`,
})
export class NumberedCitationsComponent {
  message = {
    id: 'm1',
    role: 'assistant',
    content: '${REPLY}',
    actions: ['copy', 'like', 'dislike'],
  };

  onAction(e: CustomEvent<{ messageId: string; action: string }>) {
    const { messageId, action } = e.detail;
    console.log(messageId, action);
  }
}`,

    react: `import { Message, Sources } from '@kitn.ai/chat/react';

// React uses the data-array approach (the Sources component wraps kc-sources).
export function NumberedCitations() {
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
        numbered
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
          {
            href: 'https://shopify.engineering/shopify-webassembly',
            title: 'How Shopify Uses WebAssembly',
            description: "Shopify's journey using WebAssembly for Liquid template parsing.",
          },
          {
            href: 'https://surma.dev/things/js-to-asc/',
            title: 'JavaScript to AssemblyScript',
            description: 'Performance comparison of JS vs AssemblyScript/Wasm.',
          },
        ]}
      />
    </>
  );
}`,

    solid: `import { ChatContainer, ChatContainerContent } from '@kitn.ai/chat';
import {
  Message, MessageAvatar, MessageContent, MessageActions,
  Source, SourceTrigger, SourceContent, SourceList,
  Button,
} from '@kitn.ai/chat';
import { Copy, ThumbsUp, ThumbsDown } from 'lucide-solid';

// Solid uses the primitive components; numbered chips via label={index}.
export function NumberedCitations() {
  return (
    <ChatContainer>
      <ChatContainerContent class="space-y-6 py-4">
        <Message>
          <MessageAvatar fallback="AI" alt="Assistant" />
          <div class="flex-1 space-y-2">
            <MessageContent markdown>${REPLY}</MessageContent>

            <SourceList>
              <Source href="https://www.figma.com/blog/webassembly-cut-figmas-load-time-by-3x/">
                <SourceTrigger label={1} />
                <SourceContent
                  title="WebAssembly cut Figma's load time by 3x"
                  description="How Figma leveraged WebAssembly to improve their design tool."
                />
              </Source>
              <Source href="https://web.dev/case-studies/earth-webassembly">
                <SourceTrigger label={2} />
                <SourceContent
                  title="Google Earth and WebAssembly"
                  description="Porting Google Earth's C++ rendering engine to WebAssembly."
                />
              </Source>
              <Source href="https://shopify.engineering/shopify-webassembly">
                <SourceTrigger label={3} />
                <SourceContent
                  title="How Shopify Uses WebAssembly"
                  description="Shopify's journey using WebAssembly for Liquid template parsing."
                />
              </Source>
              <Source href="https://surma.dev/things/js-to-asc/">
                <SourceTrigger label={4} />
                <SourceContent
                  title="JavaScript to AssemblyScript"
                  description="Performance comparison of JS vs AssemblyScript/Wasm."
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

const conversationWithSources: ExampleUsage = {
  title: 'Examples/Conversation with Sources',
  ...def, // example-level fallback = the "Multi-turn with Citations" story
  stories: {
    'Multi-turn with Citations': def,
    'Numbered Citations (composition)': compositionStory,
  },
};

export default conversationWithSources;
