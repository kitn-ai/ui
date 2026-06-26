import type { ExampleUsage, StoryUsage } from './types';

/**
 * ChatGPT Style — compact vertical panel with avatar-led assistant rows
 * and right-aligned user bubbles, scaled to embed inside a larger page.
 */
const chatGptStyle: StoryUsage = {
  intro:
    'Use **Chat Panel Layout** when the chat lives *inside* a larger page — a sidebar, a drawer, or a companion panel (e.g. ChatGPT-style). The panel is a fixed-size flex column: a header strip, a scrollable `ChatContainer` for the thread, and a `PromptInput` footer. Assistant messages lead with an avatar and use transparent-background markdown prose; user messages are right-aligned pills. Contrast with **Centered Conversation** (the chat *is* the page) and **Docked Widget** (a floating overlay).',
  snippets: {
    html: `<!-- Register the elements once (CDN or bundler) -->
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kai.es.js';
</script>

<!--
  Chat Panel Layout — compact vertical panel sized to embed inside a page.
  Typical sizing: 360-480 px wide, full container height.
-->
<div class="flex flex-col overflow-hidden rounded-lg bg-card" style="width:420px; height:700px">

  <!-- Panel header -->
  <div class="flex flex-shrink-0 items-center justify-between bg-muted/30 px-3 py-2.5 text-sm font-semibold">
    <span>Chat Panel</span>
    <span class="text-xs text-muted-foreground">GPT-4o Mini</span>
  </div>

  <!-- Scrollable thread -->
  <kai-chat-container class="min-w-0 flex-1 space-y-4 px-4 py-3">

    <!-- Assistant message — avatar + transparent prose -->
    <kai-message>
      <kai-message-avatar src="" alt="AI" fallback="AI"></kai-message-avatar>
      <div class="flex min-w-0 w-full flex-col">
        <kai-message-content markdown class="bg-transparent p-0 pt-1.5">
          Hi there! How can I help?
        </kai-message-content>
        <kai-message-actions>
          <button aria-label="Copy"><!-- icon --></button>
        </kai-message-actions>
      </div>
    </kai-message>

    <!-- User message — right-aligned pill -->
    <kai-message class="group flex-col items-end">
      <kai-message-content class="bg-muted text-primary mr-1 max-w-[85%] rounded-xl px-4 py-2">
        What is this about?
      </kai-message-content>
      <kai-message-actions class="opacity-0 transition-opacity group-hover:opacity-100">
        <button aria-label="Copy"><!-- icon --></button>
      </kai-message-actions>
    </kai-message>

  </kai-chat-container>

  <!-- Composer footer -->
  <div class="flex-shrink-0 px-3 pb-3 pt-1">
    <kai-prompt-input id="composer">
      <kai-prompt-input-textarea placeholder="Ask about this page…"></kai-prompt-input-textarea>
      <kai-prompt-input-actions class="mt-2 flex w-full items-center justify-end gap-2 px-3 pb-3">
        <button aria-label="Send"><!-- icon --></button>
      </kai-prompt-input-actions>
    </kai-prompt-input>
  </div>

</div>

<script type="module">
  document.getElementById('composer').addEventListener('kai-submit', (e) => {
    console.log('send', e.detail.value);
  });
</script>`,

    react: `import { useState } from 'react';
import {
  ChatConfig, ChatContainer,
  Message, MessageAvatar, MessageContent, MessageActions,
  PromptInput, PromptInputTextarea, PromptInputActions,
  Button,
} from '@kitn.ai/ui/react';

/**
 * Chat Panel Layout — compact vertical panel for embedding inside a page.
 * Avatar-led assistant rows, right-aligned user bubbles, composer footer.
 */
export function ChatPanel() {
  const [input, setInput] = useState('');

  return (
    <ChatConfig proseSize="base">
      <div
        className="flex flex-col overflow-hidden rounded-lg bg-card"
        style={{ width: 420, height: 700 }}
      >
        {/* Panel header */}
        <div className="flex flex-shrink-0 items-center justify-between bg-muted/30 px-3 py-2.5 text-sm font-semibold">
          <span>Chat Panel</span>
          <span className="text-xs text-muted-foreground">GPT-4o Mini</span>
        </div>

        {/* Scrollable thread */}
        <ChatContainer className="min-w-0 flex-1 space-y-4 px-4 py-3">
          {/* Assistant message — avatar + transparent prose */}
          <Message>
            <MessageAvatar src="" alt="AI" fallback="AI" />
            <div className="flex min-w-0 w-full flex-col">
              <MessageContent markdown className="bg-transparent p-0 pt-1.5">
                Hi there! How can I help?
              </MessageContent>
              <MessageActions>
                <Button variant="ghost" size="icon-sm" aria-label="Copy">{/* icon */}</Button>
              </MessageActions>
            </div>
          </Message>

          {/* User message — right-aligned pill */}
          <Message className="group flex-col items-end">
            <MessageContent className="bg-muted text-primary mr-1 max-w-[85%] rounded-xl px-4 py-2">
              What is this about?
            </MessageContent>
            <MessageActions className="opacity-0 transition-opacity group-hover:opacity-100">
              <Button variant="ghost" size="icon-sm" aria-label="Copy">{/* icon */}</Button>
            </MessageActions>
          </Message>
        </ChatContainer>

        {/* Composer footer */}
        <div className="flex-shrink-0 px-3 pb-3 pt-1">
          <PromptInput value={input} onValueChange={setInput} onSubmit={() => setInput('')}>
            <PromptInputTextarea placeholder="Ask about this page…" className="min-h-[44px] pt-3 pl-4" />
            <PromptInputActions className="mt-2 flex w-full items-center justify-end gap-2 px-3 pb-3">
              <Button size="icon-sm" className="rounded-full" disabled={!input.trim()} aria-label="Send">
                {/* icon */}
              </Button>
            </PromptInputActions>
          </PromptInput>
        </div>
      </div>
    </ChatConfig>
  );
}`,

    vue: `<script setup>
import '@kitn.ai/ui/elements';
import { ref } from 'vue';

const input = ref('');

function onSubmit(e) {
  console.log('send', e.detail.value);
  input.value = '';
}
</script>

<!--
  Chat Panel Layout — compact vertical panel for embedding inside a page.
  Avatar-led assistant rows, right-aligned user bubbles, composer footer.
  Typical sizing: 360-480 px wide, full container height.
-->
<template>
  <div class="flex flex-col overflow-hidden rounded-lg bg-card" style="width:420px; height:700px">

    <!-- Panel header -->
    <div class="flex flex-shrink-0 items-center justify-between bg-muted/30 px-3 py-2.5 text-sm font-semibold">
      <span>Chat Panel</span>
      <span class="text-xs text-muted-foreground">GPT-4o Mini</span>
    </div>

    <!-- Scrollable thread -->
    <kai-chat-container class="min-w-0 flex-1 space-y-4 px-4 py-3">

      <!-- Assistant message — avatar + transparent prose -->
      <kai-message>
        <kai-message-avatar src="" alt="AI" fallback="AI"></kai-message-avatar>
        <div class="flex min-w-0 w-full flex-col">
          <kai-message-content markdown class="bg-transparent p-0 pt-1.5">
            Hi there! How can I help?
          </kai-message-content>
          <kai-message-actions>
            <button aria-label="Copy"><!-- icon --></button>
          </kai-message-actions>
        </div>
      </kai-message>

      <!-- User message — right-aligned pill -->
      <kai-message class="group flex-col items-end">
        <kai-message-content class="bg-muted text-primary mr-1 max-w-[85%] rounded-xl px-4 py-2">
          What is this about?
        </kai-message-content>
        <kai-message-actions class="opacity-0 transition-opacity group-hover:opacity-100">
          <button aria-label="Copy"><!-- icon --></button>
        </kai-message-actions>
      </kai-message>

    </kai-chat-container>

    <!-- Composer footer -->
    <div class="flex-shrink-0 px-3 pb-3 pt-1">
      <kai-prompt-input
        :value="input"
        @kai-value-change="input = $event.detail.value"
        @kai-submit="onSubmit"
      >
        <kai-prompt-input-textarea placeholder="Ask about this page…"></kai-prompt-input-textarea>
        <kai-prompt-input-actions class="mt-2 flex w-full items-center justify-end gap-2 px-3 pb-3">
          <button :disabled="!input.trim()" aria-label="Send"><!-- icon --></button>
        </kai-prompt-input-actions>
      </kai-prompt-input>
    </div>

  </div>
</template>`,

    svelte: `<script>
  import '@kitn.ai/ui/elements';
  let input = '';
</script>

<!--
  Chat Panel Layout — compact vertical panel for embedding inside a page.
  Avatar-led assistant rows, right-aligned user bubbles, composer footer.
  Typical sizing: 360-480 px wide, full container height.
-->
<div class="flex flex-col overflow-hidden rounded-lg bg-card" style="width:420px; height:700px">

  <!-- Panel header -->
  <div class="flex flex-shrink-0 items-center justify-between bg-muted/30 px-3 py-2.5 text-sm font-semibold">
    <span>Chat Panel</span>
    <span class="text-xs text-muted-foreground">GPT-4o Mini</span>
  </div>

  <!-- Scrollable thread -->
  <kai-chat-container class="min-w-0 flex-1 space-y-4 px-4 py-3">

    <!-- Assistant message — avatar + transparent prose -->
    <kai-message>
      <kai-message-avatar src="" alt="AI" fallback="AI"></kai-message-avatar>
      <div class="flex min-w-0 w-full flex-col">
        <kai-message-content markdown class="bg-transparent p-0 pt-1.5">
          Hi there! How can I help?
        </kai-message-content>
        <kai-message-actions>
          <button aria-label="Copy"><!-- icon --></button>
        </kai-message-actions>
      </div>
    </kai-message>

    <!-- User message — right-aligned pill -->
    <kai-message class="group flex-col items-end">
      <kai-message-content class="bg-muted text-primary mr-1 max-w-[85%] rounded-xl px-4 py-2">
        What is this about?
      </kai-message-content>
      <kai-message-actions class="opacity-0 transition-opacity group-hover:opacity-100">
        <button aria-label="Copy"><!-- icon --></button>
      </kai-message-actions>
    </kai-message>

  </kai-chat-container>

  <!-- Composer footer -->
  <div class="flex-shrink-0 px-3 pb-3 pt-1">
    <kai-prompt-input
      value={input}
      on:kai-value-change={(e) => (input = e.detail.value)}
      on:kai-submit={() => (input = '')}
    >
      <kai-prompt-input-textarea placeholder="Ask about this page…"></kai-prompt-input-textarea>
      <kai-prompt-input-actions class="mt-2 flex w-full items-center justify-end gap-2 px-3 pb-3">
        <button disabled={!input.trim()} aria-label="Send"><!-- icon --></button>
      </kai-prompt-input-actions>
    </kai-prompt-input>
  </div>

</div>`,

    angular: `// main.ts: import '@kitn.ai/ui/elements' before bootstrapApplication,
// and add CUSTOM_ELEMENTS_SCHEMA to the component.
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

/**
 * Chat Panel Layout — compact vertical panel for embedding inside a page.
 * Avatar-led assistant rows, right-aligned user bubbles, composer footer.
 */
@Component({
  selector: 'app-chat-panel',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  styles: [':host { display: contents; }'],
  template: \`
    <div class="flex flex-col overflow-hidden rounded-lg bg-card"
         style="width:420px; height:700px">

      <!-- Panel header -->
      <div class="flex flex-shrink-0 items-center justify-between bg-muted/30 px-3 py-2.5 text-sm font-semibold">
        <span>Chat Panel</span>
        <span class="text-xs text-muted-foreground">GPT-4o Mini</span>
      </div>

      <!-- Scrollable thread -->
      <kai-chat-container class="min-w-0 flex-1 space-y-4 px-4 py-3">

        <!-- Assistant message — avatar + transparent prose -->
        <kai-message>
          <kai-message-avatar src="" alt="AI" fallback="AI"></kai-message-avatar>
          <div class="flex min-w-0 w-full flex-col">
            <kai-message-content markdown class="bg-transparent p-0 pt-1.5">
              Hi there! How can I help?
            </kai-message-content>
            <kai-message-actions>
              <button aria-label="Copy"><!-- icon --></button>
            </kai-message-actions>
          </div>
        </kai-message>

        <!-- User message — right-aligned pill -->
        <kai-message class="group flex-col items-end">
          <kai-message-content class="bg-muted text-primary mr-1 max-w-[85%] rounded-xl px-4 py-2">
            What is this about?
          </kai-message-content>
          <kai-message-actions class="opacity-0 transition-opacity group-hover:opacity-100">
            <button aria-label="Copy"><!-- icon --></button>
          </kai-message-actions>
        </kai-message>

      </kai-chat-container>

      <!-- Composer footer -->
      <div class="flex-shrink-0 px-3 pb-3 pt-1">
        <kai-prompt-input
          [value]="input"
          (kai-value-change)="input = $event.detail.value"
          (kai-submit)="input = ''"
        >
          <kai-prompt-input-textarea placeholder="Ask about this page…"></kai-prompt-input-textarea>
          <kai-prompt-input-actions class="mt-2 flex w-full items-center justify-end gap-2 px-3 pb-3">
            <button [disabled]="!input.trim()" aria-label="Send"><!-- icon --></button>
          </kai-prompt-input-actions>
        </kai-prompt-input>
      </div>

    </div>
  \`,
})
export class ChatPanelComponent {
  input = '';
}`,

    solid: `import { createSignal } from 'solid-js';
import {
  ChatConfig, ChatContainer,
  Message, MessageAvatar, MessageContent, MessageActions,
  PromptInput, PromptInputTextarea, PromptInputActions,
  ScrollButton, Button,
} from '@kitn.ai/ui';
import { Copy, ArrowUp } from 'lucide-solid';

/**
 * Chat Panel Layout — compact vertical panel for embedding inside a page.
 * Avatar-led assistant rows, right-aligned user bubbles, composer footer.
 * Typical sizing: 360-480 px wide, full container height.
 */
export function ChatPanel() {
  const [input, setInput] = createSignal('');

  return (
    <ChatConfig proseSize="base">
      <div
        style={{ width: '420px', height: '700px' }}
        class="flex flex-col overflow-hidden rounded-lg bg-card"
      >
        {/* Panel header */}
        <div class="flex flex-shrink-0 items-center justify-between bg-muted/30 px-3 py-2.5 text-sm font-semibold text-foreground">
          <span>Chat Panel</span>
          <span class="text-xs text-muted-foreground">GPT-4o Mini</span>
        </div>

        {/* Scrollable thread */}
        <ChatContainer class="min-w-0 flex-1 space-y-4 px-4 py-3">
          {/* Assistant message — avatar + transparent prose */}
          <Message>
            <MessageAvatar src="" alt="AI" fallback="AI" />
            <div class="flex min-w-0 w-full flex-col">
              <MessageContent markdown class="bg-transparent p-0 pt-1.5">
                Hi there! How can I help?
              </MessageContent>
              <MessageActions>
                <Button variant="ghost" size="icon-sm" aria-label="Copy">
                  <Copy size={14} />
                </Button>
              </MessageActions>
            </div>
          </Message>

          {/* User message — right-aligned pill */}
          <Message class="group flex-col items-end">
            <MessageContent class="bg-muted text-primary mr-1 max-w-[85%] rounded-xl px-4 py-2">
              What is this about?
            </MessageContent>
            <MessageActions class="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <Button variant="ghost" size="icon-sm" aria-label="Copy">
                <Copy size={14} />
              </Button>
            </MessageActions>
          </Message>

          <ScrollButton />
        </ChatContainer>

        {/* Composer footer */}
        <div class="flex-shrink-0 px-3 pb-3 pt-1">
          <PromptInput value={input()} onValueChange={setInput} onSubmit={() => setInput('')}>
            <PromptInputTextarea placeholder="Ask about this page…" class="min-h-[44px] pt-3 pl-4" />
            <PromptInputActions class="mt-2 flex w-full items-center justify-end gap-2 px-3 pb-3">
              <Button size="icon-sm" class="rounded-full" disabled={!input().trim()} aria-label="Send message">
                <ArrowUp class="size-4" />
              </Button>
            </PromptInputActions>
          </PromptInput>
        </div>
      </div>
    </ChatConfig>
  );
}`,
  },
};

/**
 * Pattern: Chat Panel Layout — compact vertical panel intended to embed inside
 * a larger page. `ChatContainer` handles scroll; `MessageAvatar` leads each
 * assistant row; user messages right-align as pill bubbles; `PromptInput` pins
 * to the bottom. Per-story: the Usage tab shows the snippet for the story you're
 * on; the example-level fields below are the fallback.
 */
const chatPanelLayout: ExampleUsage = {
  title: 'Patterns/Chat Panel Layout',
  ...chatGptStyle,
  stories: {
    'ChatGPT Style': chatGptStyle,
  },
};

export default chatPanelLayout;
