import type { ExampleUsage, StoryUsage } from './types';

// Shared assistant reply used across the snippets.
const REPLY = 'Async functions return Result, and the ? operator propagates errors.';

/** Actions on Hover — the bar reveals on hover via the actions-reveal prop. */
const hover: StoryUsage = {
  intro:
    'Render an assistant message with an action bar that reveals on hover. Declare each button as a `<kc-action id icon tooltip>` child of `<kc-message>` and set `actions-reveal="hover"` — the element owns the fade (no consumer CSS). React passes the `actions` array instead; the Solid demo uses the primitives with `group`/`group-hover`.',
  snippets: {
    html: `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kitn-chat.es.js';
</script>

<kc-message id="msg" role="assistant" avatar-fallback="AI" content="${REPLY}" actions-reveal="hover">
  <kc-action id="copy" icon="copy" tooltip="Copy"></kc-action>
  <kc-action id="like" icon="like" tooltip="Good response"></kc-action>
  <kc-action id="dislike" icon="dislike" tooltip="Bad response"></kc-action>
  <kc-action id="regenerate" icon="regenerate" tooltip="Regenerate"></kc-action>
</kc-message>

<script type="module">
  document.getElementById('msg').addEventListener('kc-message-action', (e) => {
    const { messageId, action } = e.detail;
    console.log(messageId, action);
  });
</script>`,

    react: `import { Message } from '@kitn.ai/ui/react';

export function AssistantReply() {
  return (
    <Message
      actionsReveal="hover"
      message={{
        id: 'm1',
        role: 'assistant',
        content: '${REPLY}',
        actions: ['copy', 'like', 'dislike', 'regenerate'],
      }}
      onMessageAction={(e) => {
        const { messageId, action } = e.detail;
        console.log(messageId, action);
      }}
    />
  );
}`,

    vue: `<script setup>
import '@kitn.ai/ui/elements';

function onAction(e) {
  const { messageId, action } = e.detail;
  console.log(messageId, action);
}
</script>

<template>
  <kc-message role="assistant" avatar-fallback="AI" content="${REPLY}" actions-reveal="hover" @kc-message-action="onAction">
    <kc-action id="copy" icon="copy" tooltip="Copy"></kc-action>
    <kc-action id="like" icon="like" tooltip="Good response"></kc-action>
    <kc-action id="dislike" icon="dislike" tooltip="Bad response"></kc-action>
    <kc-action id="regenerate" icon="regenerate" tooltip="Regenerate"></kc-action>
  </kc-message>
</template>`,

    svelte: `<script>
  import '@kitn.ai/ui/elements';

  function onAction(e) {
    const { messageId, action } = e.detail;
    console.log(messageId, action);
  }
</script>

<kc-message role="assistant" avatar-fallback="AI" content="${REPLY}" actions-reveal="hover" on:kc-message-action={onAction}>
  <kc-action id="copy" icon="copy" tooltip="Copy"></kc-action>
  <kc-action id="like" icon="like" tooltip="Good response"></kc-action>
  <kc-action id="dislike" icon="dislike" tooltip="Bad response"></kc-action>
  <kc-action id="regenerate" icon="regenerate" tooltip="Regenerate"></kc-action>
</kc-message>`,

    angular: `import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-reply',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <kc-message role="assistant" avatar-fallback="AI" content="${REPLY}" actions-reveal="hover" (kc-message-action)="onAction($event)">
      <kc-action id="copy" icon="copy" tooltip="Copy"></kc-action>
      <kc-action id="like" icon="like" tooltip="Good response"></kc-action>
      <kc-action id="dislike" icon="dislike" tooltip="Bad response"></kc-action>
      <kc-action id="regenerate" icon="regenerate" tooltip="Regenerate"></kc-action>
    </kc-message>
  \`,
})
export class ReplyComponent {
  onAction(e: CustomEvent<{ messageId: string; action: string }>) {
    console.log(e.detail.messageId, e.detail.action);
  }
}`,

    solid: `import { Message, MessageAvatar, MessageContent, MessageActions, Button, Tooltip } from '@kitn.ai/ui';
import { Copy, ThumbsUp, ThumbsDown, RefreshCw } from 'lucide-solid';

export function AssistantReply() {
  return (
    <Message>
      <MessageAvatar src="" fallback="AI" alt="Assistant" />
      {/* group + group-hover reveals the bar on row hover */}
      <div class="group flex-1 space-y-2">
        <MessageContent markdown>${REPLY}</MessageContent>
        <MessageActions class="opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip content="Copy"><Button variant="ghost" size="icon-sm" aria-label="Copy"><Copy class="size-3.5" /></Button></Tooltip>
          <Tooltip content="Good response"><Button variant="ghost" size="icon-sm" aria-label="Good response"><ThumbsUp class="size-3.5" /></Button></Tooltip>
          <Tooltip content="Bad response"><Button variant="ghost" size="icon-sm" aria-label="Bad response"><ThumbsDown class="size-3.5" /></Button></Tooltip>
          <Tooltip content="Regenerate"><Button variant="ghost" size="icon-sm" aria-label="Regenerate"><RefreshCw class="size-3.5" /></Button></Tooltip>
        </MessageActions>
      </div>
    </Message>
  );
}`,
  },
};

/** Always Visible Actions — bar always shown; custom actions via descriptor objects. */
const alwaysVisible: StoryUsage = {
  intro:
    "Keep the bar always visible (the default). Declare each button as a `<kc-action id icon tooltip>` child — built-in-style (copy/like/…) and custom (share/bookmark) are all just `<kc-action>` elements, and `<kc-message>` fires `messageaction` with the id. (React passes them as the `actions` array.)",
  snippets: {
    html: `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kitn-chat.es.js';
</script>

<kc-message id="msg" role="assistant" avatar-fallback="AI" content="${REPLY}">
  <kc-action id="copy" icon="copy" tooltip="Copy"></kc-action>
  <kc-action id="like" icon="like" tooltip="Good response"></kc-action>
  <kc-action id="dislike" icon="dislike" tooltip="Bad response"></kc-action>
  <kc-action id="regenerate" icon="regenerate" tooltip="Regenerate"></kc-action>
  <kc-action id="share" icon="share" tooltip="Share"></kc-action>
  <kc-action id="bookmark" icon="bookmark" tooltip="Bookmark"></kc-action>
</kc-message>

<script type="module">
  document.getElementById('msg').addEventListener('kc-message-action', (e) => console.log(e.detail));
</script>`,

    react: `import { Message } from '@kitn.ai/ui/react';

export function AssistantReply() {
  return (
    <Message
      message={{
        id: 'm1',
        role: 'assistant',
        content: '${REPLY}',
        actions: [
          'copy', 'like', 'dislike', 'regenerate',
          { id: 'share', label: 'Share', icon: 'share' },
          { id: 'bookmark', label: 'Bookmark', icon: 'bookmark' },
        ],
      }}
      onMessageAction={(e) => console.log(e.detail)}
    />
  );
}`,

    vue: `<script setup>
import '@kitn.ai/ui/elements';
</script>

<template>
  <kc-message role="assistant" avatar-fallback="AI" content="${REPLY}" @kc-message-action="(e) => console.log(e.detail)">
    <kc-action id="copy" icon="copy" tooltip="Copy"></kc-action>
    <kc-action id="like" icon="like" tooltip="Good response"></kc-action>
    <kc-action id="dislike" icon="dislike" tooltip="Bad response"></kc-action>
    <kc-action id="regenerate" icon="regenerate" tooltip="Regenerate"></kc-action>
    <kc-action id="share" icon="share" tooltip="Share"></kc-action>
    <kc-action id="bookmark" icon="bookmark" tooltip="Bookmark"></kc-action>
  </kc-message>
</template>`,

    svelte: `<script>
  import '@kitn.ai/ui/elements';
</script>

<kc-message role="assistant" avatar-fallback="AI" content="${REPLY}" on:kc-message-action={(e) => console.log(e.detail)}>
  <kc-action id="copy" icon="copy" tooltip="Copy"></kc-action>
  <kc-action id="like" icon="like" tooltip="Good response"></kc-action>
  <kc-action id="dislike" icon="dislike" tooltip="Bad response"></kc-action>
  <kc-action id="regenerate" icon="regenerate" tooltip="Regenerate"></kc-action>
  <kc-action id="share" icon="share" tooltip="Share"></kc-action>
  <kc-action id="bookmark" icon="bookmark" tooltip="Bookmark"></kc-action>
</kc-message>`,

    angular: `import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-reply',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <kc-message role="assistant" avatar-fallback="AI" content="${REPLY}" (kc-message-action)="log($event)">
      <kc-action id="copy" icon="copy" tooltip="Copy"></kc-action>
      <kc-action id="like" icon="like" tooltip="Good response"></kc-action>
      <kc-action id="dislike" icon="dislike" tooltip="Bad response"></kc-action>
      <kc-action id="regenerate" icon="regenerate" tooltip="Regenerate"></kc-action>
      <kc-action id="share" icon="share" tooltip="Share"></kc-action>
      <kc-action id="bookmark" icon="bookmark" tooltip="Bookmark"></kc-action>
    </kc-message>
  \`,
})
export class ReplyComponent {
  log(e: CustomEvent) { console.log(e.detail); }
}`,

    solid: `import { Message, MessageAvatar, MessageContent, MessageActions, Button, Tooltip } from '@kitn.ai/ui';
import { Copy, ThumbsUp, ThumbsDown, RefreshCw, Share, Bookmark } from 'lucide-solid';

export function AssistantReply() {
  return (
    <Message>
      <MessageAvatar src="" fallback="AI" alt="Assistant" />
      <div class="flex-1 space-y-2">
        <MessageContent markdown>${REPLY}</MessageContent>
        <MessageActions>
          <Tooltip content="Copy"><Button variant="ghost" size="icon-sm" aria-label="Copy"><Copy class="size-3.5" /></Button></Tooltip>
          <Tooltip content="Good response"><Button variant="ghost" size="icon-sm" aria-label="Good response"><ThumbsUp class="size-3.5" /></Button></Tooltip>
          <Tooltip content="Bad response"><Button variant="ghost" size="icon-sm" aria-label="Bad response"><ThumbsDown class="size-3.5" /></Button></Tooltip>
          <Tooltip content="Regenerate"><Button variant="ghost" size="icon-sm" aria-label="Regenerate"><RefreshCw class="size-3.5" /></Button></Tooltip>
          <Tooltip content="Share"><Button variant="ghost" size="icon-sm" aria-label="Share"><Share class="size-3.5" /></Button></Tooltip>
          <Tooltip content="Bookmark"><Button variant="ghost" size="icon-sm" aria-label="Bookmark"><Bookmark class="size-3.5" /></Button></Tooltip>
        </MessageActions>
      </div>
    </Message>
  );
}`,
  },
};

/** Copy with Confirmation — the copy action swaps to a check for 2s. */
const copyConfirm: StoryUsage = {
  intro:
    'Listen for `messageaction` with `action: "copy"` and write to the clipboard yourself — `<kc-message>` only emits the event; it does not touch the clipboard. In SolidJS you can also swap the icon to a check for 2 seconds as a visual confirmation (see the Solid tab).',
  snippets: {
    html: `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kitn-chat.es.js';
</script>

<kc-message id="msg" role="assistant" avatar-fallback="AI" content="${REPLY}">
  <kc-action id="copy" icon="copy" tooltip="Copy"></kc-action>
  <kc-action id="like" icon="like" tooltip="Good response"></kc-action>
  <kc-action id="dislike" icon="dislike" tooltip="Bad response"></kc-action>
</kc-message>

<script type="module">
  const msg = document.getElementById('msg');
  msg.addEventListener('kc-message-action', (e) => {
    if (e.detail.action === 'copy') navigator.clipboard.writeText(msg.content);
  });
</script>`,

    react: `import { Message } from '@kitn.ai/ui/react';

const content = '${REPLY}';

export function AssistantReply() {
  return (
    <Message
      message={{ id: 'm1', role: 'assistant', content, actions: ['copy', 'like', 'dislike'] }}
      onMessageAction={(e) => {
        if (e.detail.action === 'copy') navigator.clipboard.writeText(content);
      }}
    />
  );
}`,

    vue: `<script setup>
import '@kitn.ai/ui/elements';

const content = '${REPLY}';

function onAction(e) {
  if (e.detail.action === 'copy') navigator.clipboard.writeText(content);
}
</script>

<template>
  <kc-message role="assistant" avatar-fallback="AI" :content="content" @kc-message-action="onAction">
    <kc-action id="copy" icon="copy" tooltip="Copy"></kc-action>
    <kc-action id="like" icon="like" tooltip="Good response"></kc-action>
    <kc-action id="dislike" icon="dislike" tooltip="Bad response"></kc-action>
  </kc-message>
</template>`,

    svelte: `<script>
  import '@kitn.ai/ui/elements';

  const content = '${REPLY}';

  function onAction(e) {
    if (e.detail.action === 'copy') navigator.clipboard.writeText(content);
  }
</script>

<kc-message role="assistant" avatar-fallback="AI" {content} on:kc-message-action={onAction}>
  <kc-action id="copy" icon="copy" tooltip="Copy"></kc-action>
  <kc-action id="like" icon="like" tooltip="Good response"></kc-action>
  <kc-action id="dislike" icon="dislike" tooltip="Bad response"></kc-action>
</kc-message>`,

    angular: `import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-reply',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <kc-message role="assistant" avatar-fallback="AI" [content]="content" (kc-message-action)="onAction($event)">
      <kc-action id="copy" icon="copy" tooltip="Copy"></kc-action>
      <kc-action id="like" icon="like" tooltip="Good response"></kc-action>
      <kc-action id="dislike" icon="dislike" tooltip="Bad response"></kc-action>
    </kc-message>
  \`,
})
export class ReplyComponent {
  content = '${REPLY}';
  onAction(e: CustomEvent<{ messageId: string; action: string }>) {
    if (e.detail.action === 'copy') navigator.clipboard.writeText(this.content);
  }
}`,

    solid: `import { createSignal } from 'solid-js';
import { Message, MessageAvatar, MessageContent, MessageActions, Button, Tooltip } from '@kitn.ai/ui';
import { Copy, Check, ThumbsUp, ThumbsDown } from 'lucide-solid';

export function AssistantReply() {
  const [copied, setCopied] = createSignal(false);
  const copy = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <Message>
      <MessageAvatar src="" fallback="AI" alt="Assistant" />
      <div class="flex-1 space-y-2">
        <MessageContent>${REPLY}</MessageContent>
        <MessageActions>
          <Tooltip content={copied() ? 'Copied!' : 'Copy'}>
            <Button variant="ghost" size="icon-sm" aria-label={copied() ? 'Copied' : 'Copy'} onClick={copy}>
              {copied() ? <Check class="size-3.5 text-green-500" /> : <Copy class="size-3.5" />}
            </Button>
          </Tooltip>
          <Tooltip content="Good response">
            <Button variant="ghost" size="icon-sm" aria-label="Good response"><ThumbsUp class="size-3.5" /></Button>
          </Tooltip>
          <Tooltip content="Bad response">
            <Button variant="ghost" size="icon-sm" aria-label="Bad response"><ThumbsDown class="size-3.5" /></Button>
          </Tooltip>
        </MessageActions>
      </div>
    </Message>
  );
}`,
  },
};

/** Feedback Bar — the self-contained ask → optional detail → thanks flow. */
const feedbackBar: StoryUsage = {
  intro:
    'Ask for feedback under a reply. `<kc-feedback-bar>` owns the whole flow — it asks, optionally collects a category + comment on a not-helpful vote (`collect-detail`), then confirms with a thank-you **in place** (it does not disappear on a vote; only `close` removes it). It fires `feedback` (`{ value }`), `feedbackdetail` (`{ value, category?, comment? }`), and `close`.',
  snippets: {
    html: `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kitn-chat.es.js';
</script>

<kc-feedback-bar id="fb" bar-title="Was this response helpful?" collect-detail></kc-feedback-bar>

<script type="module">
  const fb = document.getElementById('fb');
  fb.categories = ['Inaccurate', 'Not helpful', 'Unsafe', 'Other']; // chips (a JS property)
  fb.addEventListener('kc-feedback', (e) => console.log(e.detail.value));       // 'helpful' | 'not-helpful'
  fb.addEventListener('kc-feedback-detail', (e) => console.log(e.detail));       // { value, category?, comment? }
  fb.addEventListener('kc-close', () => fb.remove());
</script>`,

    react: `import { FeedbackBar } from '@kitn.ai/ui/react';

<FeedbackBar
  barTitle="Was this response helpful?"
  collectDetail
  categories={['Inaccurate', 'Not helpful', 'Unsafe', 'Other']}
  onFeedback={(e) => console.log(e.detail.value)}
  onFeedbackDetail={(e) => console.log(e.detail)} // { value, category?, comment? }
  onClose={() => {/* dismiss */}}
/>`,

    vue: `<script setup>
import '@kitn.ai/ui/elements';
function onFeedback(e) { console.log(e.detail.value); }
function onDetail(e) { console.log(e.detail); }
</script>

<template>
  <kc-feedback-bar
    bar-title="Was this response helpful?"
    collect-detail
    :categories.prop="['Inaccurate', 'Not helpful', 'Unsafe', 'Other']"
    @kc-feedback="onFeedback"
    @kc-feedback-detail="onDetail"
  />
</template>`,

    svelte: `<script>
  import '@kitn.ai/ui/elements';
  let fb;
  $: if (fb) fb.categories = ['Inaccurate', 'Not helpful', 'Unsafe', 'Other'];
  function onFeedback(e) { console.log(e.detail.value); }
  function onDetail(e) { console.log(e.detail); }
</script>

<kc-feedback-bar
  bind:this={fb}
  bar-title="Was this response helpful?"
  collect-detail
  on:kc-feedback={onFeedback}
  on:kc-feedback-detail={onDetail}
/>`,

    angular: `import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-feedback',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <kc-feedback-bar
      bar-title="Was this response helpful?"
      collect-detail
      [categories]="categories"
      (kc-feedback)="onFeedback($event)"
      (kc-feedback-detail)="onDetail($event)">
    </kc-feedback-bar>
  \`,
})
export class FeedbackComponent {
  categories = ['Inaccurate', 'Not helpful', 'Unsafe', 'Other'];
  onFeedback(e: CustomEvent<{ value: 'helpful' | 'not-helpful' }>) { console.log(e.detail.value); }
  onDetail(e: CustomEvent<{ value: 'helpful' | 'not-helpful'; category?: string; comment?: string }>) { console.log(e.detail); }
}`,

    solid: `import { createSignal, Show } from 'solid-js';
import { Message, MessageAvatar, MessageContent, FeedbackBar } from '@kitn.ai/ui';

export function AssistantReply() {
  const [show, setShow] = createSignal(true);
  return (
    <Message>
      <MessageAvatar src="" fallback="AI" alt="Assistant" />
      <div class="flex-1 space-y-3">
        <MessageContent markdown>${REPLY}</MessageContent>
        <Show when={show()}>
          <FeedbackBar
            title="Was this response helpful?"
            collectDetail
            categories={['Inaccurate', 'Not helpful', 'Unsafe', 'Other']}
            onFeedback={(value) => console.log(value)}
            onSubmitDetail={(d) => console.log(d)}
            onClose={() => setShow(false)}
          />
        </Show>
      </div>
    </Message>
  );
}`,
  },
};

/** Full Example — all stories combined: avatar + markdown + built-in/custom actions
 *  + copy-to-clipboard with confirmation + a Feedback Bar. */
const fullExample: StoryUsage = {
  intro:
    'Every feature combined: avatar, markdown content, the action bar (copy/regenerate plus custom **Share**/**Bookmark** with tooltips), a copy→clipboard handler with visual confirmation, and a **Feedback Bar** below. Like/dislike are omitted since the Feedback Bar covers that. Icon-only buttons get tooltips automatically; override the text with a `tooltip` field on custom actions. In SolidJS wrap each button with `<Tooltip>` (see the Solid tab).',
  snippets: {
    html: `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kitn-chat.es.js';
</script>

<div style="max-width:42rem; padding:1rem; display:flex; flex-direction:column; gap:0.5rem">
  <kc-message
    id="msg"
    role="assistant"
    avatar-fallback="AI"
    content="Use anyhow::Result for apps and thiserror for libraries."
  >
    <kc-action id="copy" icon="copy" tooltip="Copy to clipboard"></kc-action>
    <kc-action id="regenerate" icon="regenerate" tooltip="Regenerate"></kc-action>
    <kc-action id="share" icon="share" tooltip="Share this response">Share</kc-action>
    <kc-action id="bookmark" icon="bookmark" tooltip="Save for later">Bookmark</kc-action>
  </kc-message>
  <kc-feedback-bar id="fb" bar-title="Was this response helpful?"></kc-feedback-bar>
</div>

<script type="module">
  const msg = document.getElementById('msg');
  const fb = document.getElementById('fb');

  msg.addEventListener('kc-message-action', (e) => {
    const { action } = e.detail;
    if (action === 'copy') navigator.clipboard.writeText(msg.content);
    console.log(e.detail);
  });

  // The bar confirms in place on a vote; only close removes it.
  fb.addEventListener('kc-feedback', (e) => console.log('feedback:', e.detail.value));
  fb.addEventListener('kc-close', () => fb.remove());
</script>`,

    react: `import { useState } from 'react';
import { Message, FeedbackBar } from '@kitn.ai/ui/react';

export function AssistantReply() {
  const [showFeedback, setShowFeedback] = useState(true);
  const content = 'Use anyhow::Result for apps and thiserror for libraries.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '42rem' }}>
      <Message
        message={{
          id: 'm1',
          role: 'assistant',
          content,
          avatar: { fallback: 'AI', alt: 'Assistant' },
          actions: [
            'copy', 'regenerate',
            { id: 'share', label: 'Share', icon: 'share', tooltip: 'Share this response' },
            { id: 'bookmark', label: 'Bookmark', icon: 'bookmark', tooltip: 'Save for later' },
          ],
        }}
        onMessageAction={(e) => {
          if (e.detail.action === 'copy') navigator.clipboard.writeText(content);
        }}
      />
      {showFeedback && (
        <FeedbackBar
          barTitle="Was this response helpful?"
          onClose={() => setShowFeedback(false)}
        />
      )}
    </div>
  );
}`,

    vue: `<script setup>
import { ref } from 'vue';
import '@kitn.ai/ui/elements';

const content = 'Use anyhow::Result for apps and thiserror for libraries.';
const showFeedback = ref(true);

function onAction(e) {
  if (e.detail.action === 'copy') navigator.clipboard.writeText(content);
}
</script>

<template>
  <div style="display:flex; flex-direction:column; gap:0.5rem; max-width:42rem">
    <kc-message role="assistant" avatar-fallback="AI" :content="content" @kc-message-action="onAction">
      <kc-action id="copy" icon="copy" tooltip="Copy to clipboard"></kc-action>
      <kc-action id="regenerate" icon="regenerate" tooltip="Regenerate"></kc-action>
      <kc-action id="share" icon="share" tooltip="Share this response">Share</kc-action>
      <kc-action id="bookmark" icon="bookmark" tooltip="Save for later">Bookmark</kc-action>
    </kc-message>
    <kc-feedback-bar
      v-if="showFeedback"
      bar-title="Was this response helpful?"
      @kc-close="showFeedback = false"
    />
  </div>
</template>`,

    svelte: `<script>
  import '@kitn.ai/ui/elements';

  const content = 'Use anyhow::Result for apps and thiserror for libraries.';
  let showFeedback = true;

  function onAction(e) {
    if (e.detail.action === 'copy') navigator.clipboard.writeText(content);
  }
</script>

<div style="display:flex; flex-direction:column; gap:0.5rem; max-width:42rem">
  <kc-message role="assistant" avatar-fallback="AI" {content} on:kc-message-action={onAction}>
    <kc-action id="copy" icon="copy" tooltip="Copy to clipboard"></kc-action>
    <kc-action id="regenerate" icon="regenerate" tooltip="Regenerate"></kc-action>
    <kc-action id="share" icon="share" tooltip="Share this response">Share</kc-action>
    <kc-action id="bookmark" icon="bookmark" tooltip="Save for later">Bookmark</kc-action>
  </kc-message>
  {#if showFeedback}
    <kc-feedback-bar
      bar-title="Was this response helpful?"
      on:kc-close={() => (showFeedback = false)}
    />
  {/if}
</div>`,

    angular: `import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';

@Component({
  selector: 'app-reply',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <div style="display:flex; flex-direction:column; gap:0.5rem; max-width:42rem">
      <kc-message role="assistant" avatar-fallback="AI" [content]="content" (kc-message-action)="onAction($event)">
        <kc-action id="copy" icon="copy" tooltip="Copy to clipboard"></kc-action>
        <kc-action id="regenerate" icon="regenerate" tooltip="Regenerate"></kc-action>
        <kc-action id="share" icon="share" tooltip="Share this response">Share</kc-action>
        <kc-action id="bookmark" icon="bookmark" tooltip="Save for later">Bookmark</kc-action>
      </kc-message>
      @if (showFeedback()) {
        <kc-feedback-bar
          bar-title="Was this response helpful?"
          (kc-close)="showFeedback.set(false)">
        </kc-feedback-bar>
      }
    </div>
  \`,
})
export class ReplyComponent {
  showFeedback = signal(true);
  content = 'Use anyhow::Result for apps and thiserror for libraries.';
  onAction(e: CustomEvent<{ messageId: string; action: string }>) {
    if (e.detail.action === 'copy') navigator.clipboard.writeText(this.content);
  }
}`,

    solid: `import { createSignal, Show } from 'solid-js';
import { Message, MessageAvatar, MessageContent, MessageActions, FeedbackBar, Button, Tooltip } from '@kitn.ai/ui';
import { Copy, Check, RefreshCw, Share, Bookmark } from 'lucide-solid';

export function AssistantReply() {
  const content = 'Use anyhow::Result for apps and thiserror for libraries.';
  const [copied, setCopied] = createSignal(false);
  const [showFeedback, setShowFeedback] = createSignal(true);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Message>
      <MessageAvatar src="" fallback="AI" alt="Assistant" />
      <div class="flex-1 space-y-2">
        <MessageContent markdown>{content}</MessageContent>
        <MessageActions>
          <Tooltip content={copied() ? 'Copied!' : 'Copy'}>
            <Button variant="ghost" size="icon-sm" aria-label={copied() ? 'Copied' : 'Copy'} onClick={handleCopy}>
              {copied() ? <Check class="size-3.5 text-green-500" /> : <Copy class="size-3.5" />}
            </Button>
          </Tooltip>
          <Tooltip content="Regenerate">
            <Button variant="ghost" size="icon-sm" aria-label="Regenerate"><RefreshCw class="size-3.5" /></Button>
          </Tooltip>
          <Tooltip content="Share this response">
            <Button variant="ghost" size="icon-sm" aria-label="Share"><Share class="size-3.5" /></Button>
          </Tooltip>
          <Tooltip content="Save for later">
            <Button variant="ghost" size="icon-sm" aria-label="Bookmark"><Bookmark class="size-3.5" /></Button>
          </Tooltip>
        </MessageActions>
        <Show when={showFeedback()}>
          <FeedbackBar
            title="Was this response helpful?"
            onClose={() => setShowFeedback(false)}
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
    'Full Example': fullExample,
  },
};

export default messageActions;
