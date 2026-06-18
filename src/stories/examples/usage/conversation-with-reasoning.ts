import type { ExampleUsage, StoryUsage } from './types';

// Shared reasoning steps + reply used across the snippets.
const STEPS = `[
    { label: 'Analyzing data size and sync limits',
      content: 'chrome.storage.sync caps total at 102,400 bytes / 512 items, 8,192 bytes per item. 50KB fits but nested objects need splitting.' },
    { label: 'Evaluating update frequency constraints',
      content: '~20-30 writes/hour, well under the 1,800/hour limit even after chunking to ~7 items per update.' },
    { label: 'Considering conflict resolution',
      content: 'storage.sync is last-write-wins; simultaneous edits from two devices can lose data. A backend could merge with CRDTs.' },
    { label: 'Weighing implementation complexity',
      content: 'A custom backend adds servers, auth, offline + retry logic. storage.sync is free, built-in, and offline-ready.' },
  ]`;

const REPLY =
  "I'd recommend a hybrid approach: use chrome.storage.sync with a chunking + delta-sync strategy, and upgrade to a backend only if data grows past 80KB or you need real-time collaboration.";

/**
 * Reasoning + Answer — a chain-of-thought trace above an assistant reply.
 *
 * `<kai-chain-of-thought>` renders from a flat `steps: { label, content }[]`
 * property. Key gotchas:
 * - Set `steps` as a **property** (el.steps = [...]), never as an attribute.
 * - The `steps` shape has no `icon` field — per-step icons (Search /
 *   Calculator / Lightbulb in this demo) are `ChainOfThoughtTrigger leftIcon`
 *   props, a SolidJS-only touch. Confirmed in src/elements/chain-of-thought.tsx.
 * - The element has no events and cannot be controlled (open/closed state).
 *   For a controlled reasoning block with `streaming` auto-expand + `kai-open-change`,
 *   use `<kai-reasoning>` instead.
 * - The copy/like/dislike bar is a separate `MessageActions` composition; it is
 *   not part of the chain-of-thought model.
 */
const reasoning: StoryUsage = {
  intro:
    "Show the model's reasoning above its answer. `<kai-chain-of-thought>` renders a collapsible trace from a `steps` array of `{ label, content }` — set it as a JS **property** (not an attribute). The element has no events and the `steps` shape has no icon field: per-step icons are a SolidJS-only touch via `ChainOfThoughtTrigger leftIcon` (see the Solid tab). For a single streaming reasoning block with `kai-open-change`, use `<kai-reasoning>` instead.",
  snippets: {
    html: `<!-- Register the elements once (CDN or bundler) -->
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kitn-chat.es.js';
</script>

<kai-chain-of-thought id="cot"></kai-chain-of-thought>
<kai-message id="msg"></kai-message>

<script type="module">
  const cot = document.getElementById('cot');
  // Array props are set as a PROPERTY, not an attribute.
  cot.steps = ${STEPS};

  const msg = document.getElementById('msg');
  msg.message = {
    id: 'm1',
    role: 'assistant',
    content: '${REPLY}',
    actions: ['copy', 'like', 'dislike'],
  };
  msg.addEventListener('kai-message-action', (e) => console.log(e.detail));
</script>`,

    react: `import { ChainOfThought, Message } from '@kitn.ai/ui/react';

export function ReasonedReply() {
  const steps = ${STEPS};
  return (
    <>
      <ChainOfThought steps={steps} />
      <Message
        message={{
          id: 'm1',
          role: 'assistant',
          content: '${REPLY}',
          actions: ['copy', 'like', 'dislike'],
        }}
        onMessageAction={(e) => console.log(e.detail)}
      />
    </>
  );
}`,

    vue: `<script setup>
import '@kitn.ai/ui/elements'; // register once (e.g. in main.ts)

const steps = ${STEPS};

const message = {
  id: 'm1',
  role: 'assistant',
  content: '${REPLY}',
  actions: ['copy', 'like', 'dislike'],
};
</script>

<template>
  <!-- arrays/objects bind as a property -->
  <kai-chain-of-thought :steps.prop="steps" />
  <kai-message :message.prop="message" @kai-message-action="(e) => console.log(e.detail)" />
</template>`,

    svelte: `<script>
  import '@kitn.ai/ui/elements';

  let cotEl;
  let msgEl;
  const steps = ${STEPS};
  const message = {
    id: 'm1',
    role: 'assistant',
    content: '${REPLY}',
    actions: ['copy', 'like', 'dislike'],
  };
  // arrays/objects are set as properties
  $: if (cotEl) cotEl.steps = steps;
  $: if (msgEl) msgEl.message = message;
</script>

<kai-chain-of-thought bind:this={cotEl} />
<kai-message bind:this={msgEl} on:kai-message-action={(e) => console.log(e.detail)} />`,

    angular: `// main.ts: import '@kitn.ai/ui/elements' before bootstrapApplication,
// and add CUSTOM_ELEMENTS_SCHEMA to the component.
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-reasoned-reply',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <kai-chain-of-thought [steps]="steps"></kai-chain-of-thought>
    <kai-message [message]="message" (kai-message-action)="log($event)"></kai-message>
  \`,
})
export class ReasonedReplyComponent {
  steps = ${STEPS};
  message = {
    id: 'm1',
    role: 'assistant',
    content: '${REPLY}',
    actions: ['copy', 'like', 'dislike'],
  };
  log(e: CustomEvent) { console.log(e.detail); }
}`,

    solid: `import {
  Message, MessageAvatar, MessageContent, MessageActions,
  ChainOfThought, ChainOfThoughtStep, ChainOfThoughtTrigger, ChainOfThoughtContent, ChainOfThoughtItem,
  Button,
} from '@kitn.ai/ui';
import { Search, Calculator, Lightbulb, Copy, ThumbsUp, ThumbsDown } from 'lucide-solid';

export function ReasonedReply() {
  return (
    <Message>
      <MessageAvatar fallback="AI" alt="Assistant" />
      <div class="flex-1 space-y-3">
        {/* Reasoning trace — per-step leftIcon is a Solid-only touch */}
        <ChainOfThought>
          <ChainOfThoughtStep>
            <ChainOfThoughtTrigger leftIcon={<Search class="size-3.5" />}>
              Analyzing data size and sync limits
            </ChainOfThoughtTrigger>
            <ChainOfThoughtContent>
              <ChainOfThoughtItem>
                chrome.storage.sync caps total at 102,400 bytes / 512 items, 8,192 bytes per item.
              </ChainOfThoughtItem>
            </ChainOfThoughtContent>
          </ChainOfThoughtStep>

          <ChainOfThoughtStep>
            <ChainOfThoughtTrigger leftIcon={<Calculator class="size-3.5" />}>
              Evaluating update frequency constraints
            </ChainOfThoughtTrigger>
            <ChainOfThoughtContent>
              <ChainOfThoughtItem>
                ~20-30 writes/hour, well under the 1,800/hour limit even after chunking.
              </ChainOfThoughtItem>
            </ChainOfThoughtContent>
          </ChainOfThoughtStep>

          <ChainOfThoughtStep isLast>
            <ChainOfThoughtTrigger leftIcon={<Lightbulb class="size-3.5" />}>
              Weighing implementation complexity
            </ChainOfThoughtTrigger>
            <ChainOfThoughtContent>
              <ChainOfThoughtItem>
                A custom backend adds servers and auth; storage.sync is free and offline-ready.
              </ChainOfThoughtItem>
            </ChainOfThoughtContent>
          </ChainOfThoughtStep>
        </ChainOfThought>

        <MessageContent markdown>${REPLY}</MessageContent>

        {/* Custom action bar — not part of the kai-chain-of-thought model */}
        <MessageActions>
          <Button variant="ghost" size="icon-sm" aria-label="Copy message"><Copy class="size-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Good response"><ThumbsUp class="size-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Bad response"><ThumbsDown class="size-3.5" /></Button>
        </MessageActions>
      </div>
    </Message>
  );
}`,
  },
};

/**
 * Example: Conversation with Reasoning — a chain-of-thought trace above an
 * assistant reply. Per-story: the Usage tab shows the snippet for the story
 * you're on; the example-level fields below are the fallback.
 *
 * Two elements are available:
 * - `<kai-chain-of-thought>` — multi-step trace from a `steps` array; no events.
 * - `<kai-reasoning>` — single collapsible block; `streaming` auto-expands it;
 *   fires `kai-open-change: { open }`.
 */
const conversationWithReasoning: ExampleUsage = {
  title: 'Examples/Conversation with Reasoning',
  ...reasoning, // example-level fallback = the only story, "Reasoning + Answer"
  stories: {
    'Reasoning + Answer': reasoning,
  },
};

export default conversationWithReasoning;
