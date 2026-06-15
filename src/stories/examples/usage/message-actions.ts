import type { ExampleUsage, StoryUsage } from './types';

// Shared assistant reply used across the snippets.
const REPLY = 'Async functions return Result, and the ? operator propagates errors.';

/** Actions on Hover — the bar reveals on hover (hover itself is CSS). */
const hover: StoryUsage = {
  intro:
    'Render an assistant message with an action bar. `<kc-message>` draws the bar from the message `actions` array and fires one `messageaction` event; revealing it on hover is a touch of CSS. (The live demo composes the SolidJS `MessageActions` + `Button` primitives.)',
  snippets: {
    html: `<!-- Register the elements once (CDN or bundler) -->
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/chat/dist/kitn-chat.es.js';
</script>

<kc-message id="msg"></kc-message>

<script type="module">
  const msg = document.getElementById('msg');
  // Set objects as a PROPERTY, not an attribute.
  msg.message = {
    id: 'm1',
    role: 'assistant',
    content: '${REPLY}',
    actions: ['copy', 'like', 'dislike', 'regenerate'],
  };
  msg.addEventListener('messageaction', (e) => {
    const { messageId, action } = e.detail; // 'copy' | 'like' | 'dislike' | 'regenerate'
    console.log(messageId, action);
  });
</script>

<!-- Reveal-on-hover is styling on the element (e.g. fade the bar in on :hover). -->`,

    react: `import { Message } from '@kitn.ai/chat/react';

export function AssistantReply() {
  return (
    <Message
      message={{
        id: 'm1',
        role: 'assistant',
        content: '${REPLY}',
        actions: ['copy', 'like', 'dislike', 'regenerate'],
      }}
      onMessageaction={(e) => {
        const { messageId, action } = e.detail;
        console.log(messageId, action);
      }}
    />
  );
}`,

    vue: `<script setup>
import '@kitn.ai/chat/elements'; // register once (e.g. in main.ts)

const message = {
  id: 'm1',
  role: 'assistant',
  content: '${REPLY}',
  actions: ['copy', 'like', 'dislike', 'regenerate'],
};

function onAction(e) {
  const { messageId, action } = e.detail;
  console.log(messageId, action);
}
</script>

<template>
  <kc-message :message.prop="message" @messageaction="onAction" />
</template>`,

    svelte: `<script>
  import '@kitn.ai/chat/elements';

  let el;
  const message = {
    id: 'm1',
    role: 'assistant',
    content: '${REPLY}',
    actions: ['copy', 'like', 'dislike', 'regenerate'],
  };
  $: if (el) el.message = message; // objects are set as properties

  function onAction(e) {
    const { messageId, action } = e.detail;
    console.log(messageId, action);
  }
</script>

<kc-message bind:this={el} on:messageaction={onAction} />`,

    angular: `// main.ts: import '@kitn.ai/chat/elements' before bootstrapApplication,
// and add CUSTOM_ELEMENTS_SCHEMA to the component.
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-reply',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`<kc-message [message]="message" (messageaction)="onAction($event)"></kc-message>\`,
})
export class ReplyComponent {
  message = {
    id: 'm1',
    role: 'assistant',
    content: '${REPLY}',
    actions: ['copy', 'like', 'dislike', 'regenerate'],
  };
  onAction(e: CustomEvent<{ messageId: string; action: string }>) {
    const { messageId, action } = e.detail;
    console.log(messageId, action);
  }
}`,

    solid: `import { Message, MessageAvatar, MessageContent, MessageActions, Button } from '@kitn.ai/chat';
import { Copy, ThumbsUp, ThumbsDown, RefreshCw } from 'lucide-solid';

export function AssistantReply() {
  return (
    <Message>
      <MessageAvatar fallback="AI" alt="Assistant" />
      {/* group + group-hover reveals the bar on hover */}
      <div class="group flex-1 space-y-2">
        <MessageContent markdown>${REPLY}</MessageContent>
        <MessageActions class="opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon-sm" aria-label="Copy"><Copy class="size-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Good response"><ThumbsUp class="size-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Bad response"><ThumbsDown class="size-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Regenerate"><RefreshCw class="size-3.5" /></Button>
        </MessageActions>
      </div>
    </Message>
  );
}`,
  },
};

/** Always Visible Actions — bar always shown; the demo adds Share/Bookmark. */
const alwaysVisible: StoryUsage = {
  intro:
    "Keep the bar always visible. `<kc-message>`'s built-in actions are a fixed set — `copy`, `like`, `dislike`, `regenerate`, `edit`. Custom buttons like Share/Bookmark aren't built in; compose those with the SolidJS primitives (see the Solid tab).",
  snippets: {
    html: `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/chat/dist/kitn-chat.es.js';
</script>

<kc-message id="msg"></kc-message>

<script type="module">
  const msg = document.getElementById('msg');
  msg.message = {
    id: 'm1',
    role: 'assistant',
    content: '${REPLY}',
    actions: ['copy', 'like', 'dislike', 'regenerate'],
  };
  msg.addEventListener('messageaction', (e) => console.log(e.detail));
</script>`,

    react: `import { Message } from '@kitn.ai/chat/react';

<Message
  message={{
    id: 'm1', role: 'assistant', content: '${REPLY}',
    actions: ['copy', 'like', 'dislike', 'regenerate'],
  }}
  onMessageaction={(e) => console.log(e.detail)}
/>`,

    vue: `<script setup>
import '@kitn.ai/chat/elements';
const message = {
  id: 'm1', role: 'assistant', content: '${REPLY}',
  actions: ['copy', 'like', 'dislike', 'regenerate'],
};
</script>

<template>
  <kc-message :message.prop="message" @messageaction="(e) => console.log(e.detail)" />
</template>`,

    svelte: `<script>
  import '@kitn.ai/chat/elements';
  let el;
  const message = {
    id: 'm1', role: 'assistant', content: '${REPLY}',
    actions: ['copy', 'like', 'dislike', 'regenerate'],
  };
  $: if (el) el.message = message;
</script>

<kc-message bind:this={el} on:messageaction={(e) => console.log(e.detail)} />`,

    angular: `import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-reply',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`<kc-message [message]="message" (messageaction)="log($event)"></kc-message>\`,
})
export class ReplyComponent {
  message = {
    id: 'm1', role: 'assistant', content: '${REPLY}',
    actions: ['copy', 'like', 'dislike', 'regenerate'],
  };
  log(e: CustomEvent) { console.log(e.detail); }
}`,

    solid: `import { Message, MessageAvatar, MessageContent, MessageActions, Button } from '@kitn.ai/chat';
import { Copy, ThumbsUp, ThumbsDown, RefreshCw, Share, Bookmark } from 'lucide-solid';

<Message>
  <MessageAvatar fallback="AI" alt="Assistant" />
  <div class="flex-1 space-y-2">
    <MessageContent markdown>${REPLY}</MessageContent>
    {/* always visible — no group-hover; Share/Bookmark are custom buttons */}
    <MessageActions>
      <Button variant="ghost" size="icon-sm" aria-label="Copy"><Copy class="size-3.5" /></Button>
      <Button variant="ghost" size="icon-sm" aria-label="Good response"><ThumbsUp class="size-3.5" /></Button>
      <Button variant="ghost" size="icon-sm" aria-label="Bad response"><ThumbsDown class="size-3.5" /></Button>
      <Button variant="ghost" size="icon-sm" aria-label="Regenerate"><RefreshCw class="size-3.5" /></Button>
      <Button variant="ghost" size="icon-sm" aria-label="Share"><Share class="size-3.5" /></Button>
      <Button variant="ghost" size="icon-sm" aria-label="Bookmark"><Bookmark class="size-3.5" /></Button>
    </MessageActions>
  </div>
</Message>`,
  },
};

/** Copy with Confirmation — the copy action swaps to a check for 2s. */
const copyConfirm: StoryUsage = {
  intro:
    '`<kc-message>` handles the copy interaction for you — declare `copy` in `actions` and it copies the content to the clipboard. Handle `messageaction` for the rest. (The demo shows the equivalent Solid composition with a 2-second confirmation.)',
  snippets: {
    html: `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/chat/dist/kitn-chat.es.js';
</script>

<kc-message id="msg"></kc-message>

<script type="module">
  const msg = document.getElementById('msg');
  msg.message = {
    id: 'm1', role: 'assistant', content: '${REPLY}',
    actions: ['copy', 'like', 'dislike'],
  };
  msg.addEventListener('messageaction', (e) => console.log(e.detail));
</script>`,

    react: `import { Message } from '@kitn.ai/chat/react';

<Message
  message={{
    id: 'm1', role: 'assistant', content: '${REPLY}',
    actions: ['copy', 'like', 'dislike'],
  }}
  onMessageaction={(e) => console.log(e.detail)}
/>`,

    vue: `<script setup>
import '@kitn.ai/chat/elements';
const message = {
  id: 'm1', role: 'assistant', content: '${REPLY}',
  actions: ['copy', 'like', 'dislike'],
};
</script>

<template>
  <kc-message :message.prop="message" @messageaction="(e) => console.log(e.detail)" />
</template>`,

    svelte: `<script>
  import '@kitn.ai/chat/elements';
  let el;
  const message = {
    id: 'm1', role: 'assistant', content: '${REPLY}',
    actions: ['copy', 'like', 'dislike'],
  };
  $: if (el) el.message = message;
</script>

<kc-message bind:this={el} on:messageaction={(e) => console.log(e.detail)} />`,

    angular: `import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-reply',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`<kc-message [message]="message" (messageaction)="log($event)"></kc-message>\`,
})
export class ReplyComponent {
  message = {
    id: 'm1', role: 'assistant', content: '${REPLY}',
    actions: ['copy', 'like', 'dislike'],
  };
  log(e: CustomEvent) { console.log(e.detail); }
}`,

    solid: `import { createSignal } from 'solid-js';
import { Message, MessageAvatar, MessageContent, MessageActions, Button } from '@kitn.ai/chat';
import { Copy, Check, ThumbsUp, ThumbsDown } from 'lucide-solid';

export function AssistantReply() {
  const [copied, setCopied] = createSignal(false);
  const copy = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <Message>
      <MessageAvatar fallback="AI" alt="Assistant" />
      <div class="flex-1 space-y-2">
        <MessageContent>${REPLY}</MessageContent>
        <MessageActions>
          <Button variant="ghost" size="icon-sm" aria-label={copied() ? 'Copied' : 'Copy'} onClick={copy}>
            {copied() ? <Check class="size-3.5 text-green-500" /> : <Copy class="size-3.5" />}
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Good response"><ThumbsUp class="size-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Bad response"><ThumbsDown class="size-3.5" /></Button>
        </MessageActions>
      </div>
    </Message>
  );
}`,
  },
};

/** Feedback Bar — a thumbs up/down prompt instead of the action buttons. */
const feedbackBar: StoryUsage = {
  intro:
    'Ask for thumbs-up/down feedback under a reply. `<kc-feedback-bar>` shows the prompt and fires `feedback` with `{ value: "helpful" | "not-helpful" }` (and `close` when dismissed). (The demo composes the SolidJS `FeedbackBar` primitive.)',
  snippets: {
    html: `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/chat/dist/kitn-chat.es.js';
</script>

<kc-feedback-bar bar-title="Was this response helpful?"></kc-feedback-bar>

<script type="module">
  const bar = document.querySelector('kc-feedback-bar');
  bar.addEventListener('feedback', (e) => console.log(e.detail.value)); // 'helpful' | 'not-helpful'
  bar.addEventListener('close', () => bar.remove());
</script>`,

    react: `import { FeedbackBar } from '@kitn.ai/chat/react';

<FeedbackBar
  barTitle="Was this response helpful?"
  onFeedback={(e) => console.log(e.detail.value)}
  onClose={() => {/* dismiss */}}
/>`,

    vue: `<script setup>
import '@kitn.ai/chat/elements';
function onFeedback(e) { console.log(e.detail.value); }
</script>

<template>
  <kc-feedback-bar bar-title="Was this response helpful?" @feedback="onFeedback" @close="/* dismiss */" />
</template>`,

    svelte: `<script>
  import '@kitn.ai/chat/elements';
  function onFeedback(e) { console.log(e.detail.value); }
</script>

<kc-feedback-bar bar-title="Was this response helpful?" on:feedback={onFeedback} on:close={() => {}} />`,

    angular: `import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-feedback',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <kc-feedback-bar bar-title="Was this response helpful?"
      (feedback)="onFeedback($event)" (close)="dismiss()"></kc-feedback-bar>
  \`,
})
export class FeedbackComponent {
  onFeedback(e: CustomEvent<{ value: 'helpful' | 'not-helpful' }>) { console.log(e.detail.value); }
  dismiss() {}
}`,

    solid: `import { createSignal, Show } from 'solid-js';
import { Message, MessageAvatar, MessageContent, FeedbackBar } from '@kitn.ai/chat';

export function AssistantReply() {
  const [show, setShow] = createSignal(true);
  return (
    <Message>
      <MessageAvatar fallback="AI" alt="Assistant" />
      <div class="flex-1 space-y-3">
        <MessageContent markdown>${REPLY}</MessageContent>
        <Show when={show()}>
          <FeedbackBar
            title="Was this response helpful?"
            onFeedback={() => setShow(false)}
            onClose={() => setShow(false)}
          />
        </Show>
      </div>
    </Message>
  );
}`,
  },
};

/**
 * Example: Message Actions — copy / like / dislike / regenerate (and a feedback
 * bar) on an assistant message. Per-story: the Usage tab shows the snippet for
 * the story you're on; the example-level fields below are the fallback.
 */
const messageActions: ExampleUsage = {
  title: 'Examples/Message Actions',
  ...hover, // example-level fallback = the headline "Actions on Hover"
  stories: {
    'Actions on Hover': hover,
    'Always Visible Actions': alwaysVisible,
    'Copy with Confirmation': copyConfirm,
    'Feedback Bar': feedbackBar,
  },
};

export default messageActions;
