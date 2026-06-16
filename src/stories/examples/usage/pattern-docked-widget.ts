import type { ExampleUsage, StoryUsage } from './types';

/**
 * Support Assistant — a compact chat bubble docked to the bottom-right corner
 * of the host page, absolutely positioned over any app content.
 */
const supportAssistant: StoryUsage = {
  intro:
    'Use **Docked Widget** for a support or assistant chat that floats over any page — the classic bottom-right widget. The widget is an absolutely-positioned card (`position:absolute; bottom:…; right:…`) layered over a relative-positioned host wrapper. Same `ChatContainer` + `Message` + `PromptInput` building blocks as the other patterns, just smaller (`proseSize="sm"`, compact padding) and sized to ~360 × 460 px. Shadow-DOM isolation means zero CSS bleed onto the host page.',
  snippets: {
    html: `<!-- Register the elements once (CDN or bundler) -->
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/chat/dist/kitn-chat.es.js';
</script>

<!--
  Docked Widget — position this relative wrapper at the page / app root.
  In production the host wrapper is typically <body> or a top-level <div>.
-->
<div class="relative" style="height:100dvh; overflow:hidden">

  <!-- Your page content here -->
  <main><!-- ... --></main>

  <!-- Widget: absolutely docked to the bottom-right corner -->
  <div id="chat-widget"
       class="absolute bottom-5 right-5 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
       style="width:360px; height:460px">

    <!-- Widget header -->
    <header class="flex flex-shrink-0 items-center justify-between border-b border-border px-4 py-3">
      <div class="flex items-center gap-2">
        <span class="size-2 rounded-full bg-green-500"></span>
        <span class="text-sm font-semibold">Support</span>
      </div>
      <button aria-label="Close widget"><!-- × icon --></button>
    </header>

    <!-- Scrollable thread -->
    <div class="relative flex-1 overflow-y-auto">
      <kc-chat-container class="h-full">
        <div class="space-y-3 px-3 py-3">

          <!-- Assistant greeting -->
          <kc-message>
            <kc-message-avatar src="" alt="AI" fallback="AI"></kc-message-avatar>
            <kc-message-content markdown class="bg-transparent p-0 pt-1">
              Hi! 👋 How can I help you today?
            </kc-message-content>
          </kc-message>

          <!-- User message -->
          <kc-message class="flex-col items-end">
            <kc-message-content class="bg-muted text-primary max-w-[85%] rounded-xl px-3.5 py-2">
              How do I reset my password?
            </kc-message-content>
          </kc-message>

          <!-- Assistant reply -->
          <kc-message>
            <kc-message-avatar src="" alt="AI" fallback="AI"></kc-message-avatar>
            <kc-message-content markdown class="bg-transparent p-0 pt-1">
              Head to **Settings → Security** and click **Reset password**.
            </kc-message-content>
          </kc-message>

        </div>
      </kc-chat-container>
    </div>

    <!-- Composer -->
    <div class="flex-shrink-0 px-3 pb-3">
      <kc-prompt-input id="widget-composer">
        <kc-prompt-input-textarea placeholder="Message support…"></kc-prompt-input-textarea>
        <kc-prompt-input-actions class="mt-1.5 flex w-full items-center justify-end gap-2 px-2.5 pb-2.5">
          <button aria-label="Send"><!-- icon --></button>
        </kc-prompt-input-actions>
      </kc-prompt-input>
    </div>
  </div>

</div>

<script type="module">
  document.getElementById('widget-composer').addEventListener('kc-submit', (e) => {
    console.log('send', e.detail.value);
  });
</script>`,

    react: `import { useState } from 'react';
import {
  ChatConfig, ChatContainer, ChatContainerContent, ChatContainerScrollAnchor,
  Message, MessageAvatar, MessageContent,
  PromptInput, PromptInputTextarea, PromptInputActions,
  Button,
} from '@kitn.ai/chat/react';

/**
 * Docked Widget — a compact chat bubble docked to the bottom-right of the page.
 * Render this inside a relative-positioned root wrapper so the absolute
 * positioning stays within your app boundary.
 */
export function DockedWidget() {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <ChatConfig proseSize="sm">
      {/* Widget: docked bottom-right — size to taste */}
      <div
        className="absolute bottom-5 right-5 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
        style={{ width: 360, height: 460 }}
      >
        {/* Header */}
        <header className="flex flex-shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-green-500" />
            <span className="text-sm font-semibold">Support</span>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close">
            {/* × icon */}
          </Button>
        </header>

        {/* Scrollable thread */}
        <div className="relative flex-1 overflow-y-auto">
          <ChatContainer className="h-full">
            <ChatContainerContent className="space-y-3 px-3 py-3">
              <Message>
                <MessageAvatar src="" alt="AI" fallback="AI" />
                <MessageContent markdown className="bg-transparent p-0 pt-1">
                  Hi! 👋 How can I help you today?
                </MessageContent>
              </Message>
              <Message className="flex-col items-end">
                <MessageContent className="bg-muted text-primary max-w-[85%] rounded-xl px-3.5 py-2">
                  How do I reset my password?
                </MessageContent>
              </Message>
              <Message>
                <MessageAvatar src="" alt="AI" fallback="AI" />
                <MessageContent markdown className="bg-transparent p-0 pt-1">
                  Head to **Settings → Security** and click **Reset password**.
                </MessageContent>
              </Message>
              <ChatContainerScrollAnchor />
            </ChatContainerContent>
          </ChatContainer>
        </div>

        {/* Composer */}
        <div className="flex-shrink-0 px-3 pb-3">
          <PromptInput value={input} onValueChange={setInput} onSubmit={() => setInput('')}>
            <PromptInputTextarea placeholder="Message support…" className="min-h-[40px] pt-2.5 pl-3.5" />
            <PromptInputActions className="mt-1.5 flex w-full items-center justify-end gap-2 px-2.5 pb-2.5">
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
import '@kitn.ai/chat/elements';
import { ref } from 'vue';

const input = ref('');
const open = ref(true);

function onSubmit(e) {
  console.log('send', e.detail.value);
  input.value = '';
}
</script>

<!--
  Docked Widget — render inside a relative-positioned root.
  The widget is absolutely positioned to the bottom-right corner.
-->
<template>
  <div v-if="open"
       class="absolute bottom-5 right-5 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
       style="width:360px; height:460px">

    <!-- Header -->
    <header class="flex flex-shrink-0 items-center justify-between border-b border-border px-4 py-3">
      <div class="flex items-center gap-2">
        <span class="size-2 rounded-full bg-green-500"></span>
        <span class="text-sm font-semibold">Support</span>
      </div>
      <button @click="open = false" aria-label="Close"><!-- × --></button>
    </header>

    <!-- Scrollable thread -->
    <div class="relative flex-1 overflow-y-auto">
      <kc-chat-container class="h-full">
        <div class="space-y-3 px-3 py-3">
          <kc-message>
            <kc-message-avatar src="" alt="AI" fallback="AI"></kc-message-avatar>
            <kc-message-content markdown class="bg-transparent p-0 pt-1">
              Hi! 👋 How can I help you today?
            </kc-message-content>
          </kc-message>
          <kc-message class="flex-col items-end">
            <kc-message-content class="bg-muted text-primary max-w-[85%] rounded-xl px-3.5 py-2">
              How do I reset my password?
            </kc-message-content>
          </kc-message>
          <kc-message>
            <kc-message-avatar src="" alt="AI" fallback="AI"></kc-message-avatar>
            <kc-message-content markdown class="bg-transparent p-0 pt-1">
              Head to **Settings → Security** and click **Reset password**.
            </kc-message-content>
          </kc-message>
        </div>
      </kc-chat-container>
    </div>

    <!-- Composer -->
    <div class="flex-shrink-0 px-3 pb-3">
      <kc-prompt-input
        :value="input"
        @kc-value-change="input = $event.detail.value"
        @kc-submit="onSubmit"
      >
        <kc-prompt-input-textarea placeholder="Message support…"></kc-prompt-input-textarea>
        <kc-prompt-input-actions class="mt-1.5 flex w-full items-center justify-end gap-2 px-2.5 pb-2.5">
          <button :disabled="!input.trim()" aria-label="Send"><!-- icon --></button>
        </kc-prompt-input-actions>
      </kc-prompt-input>
    </div>

  </div>
</template>`,

    svelte: `<script>
  import '@kitn.ai/chat/elements';
  let input = '';
  let open = true;
</script>

<!--
  Docked Widget — render inside a relative-positioned root.
  The widget is absolutely positioned to the bottom-right corner.
-->
{#if open}
<div class="absolute bottom-5 right-5 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
     style="width:360px; height:460px">

  <!-- Header -->
  <header class="flex flex-shrink-0 items-center justify-between border-b border-border px-4 py-3">
    <div class="flex items-center gap-2">
      <span class="size-2 rounded-full bg-green-500"></span>
      <span class="text-sm font-semibold">Support</span>
    </div>
    <button on:click={() => (open = false)} aria-label="Close"><!-- × --></button>
  </header>

  <!-- Scrollable thread -->
  <div class="relative flex-1 overflow-y-auto">
    <kc-chat-container class="h-full">
      <div class="space-y-3 px-3 py-3">
        <kc-message>
          <kc-message-avatar src="" alt="AI" fallback="AI"></kc-message-avatar>
          <kc-message-content markdown class="bg-transparent p-0 pt-1">
            Hi! 👋 How can I help you today?
          </kc-message-content>
        </kc-message>
        <kc-message class="flex-col items-end">
          <kc-message-content class="bg-muted text-primary max-w-[85%] rounded-xl px-3.5 py-2">
            How do I reset my password?
          </kc-message-content>
        </kc-message>
        <kc-message>
          <kc-message-avatar src="" alt="AI" fallback="AI"></kc-message-avatar>
          <kc-message-content markdown class="bg-transparent p-0 pt-1">
            Head to **Settings → Security** and click **Reset password**.
          </kc-message-content>
        </kc-message>
      </div>
    </kc-chat-container>
  </div>

  <!-- Composer -->
  <div class="flex-shrink-0 px-3 pb-3">
    <kc-prompt-input
      value={input}
      on:kc-value-change={(e) => (input = e.detail.value)}
      on:kc-submit={() => (input = '')}
    >
      <kc-prompt-input-textarea placeholder="Message support…"></kc-prompt-input-textarea>
      <kc-prompt-input-actions class="mt-1.5 flex w-full items-center justify-end gap-2 px-2.5 pb-2.5">
        <button disabled={!input.trim()} aria-label="Send"><!-- icon --></button>
      </kc-prompt-input-actions>
    </kc-prompt-input>
  </div>

</div>
{/if}`,

    angular: `// main.ts: import '@kitn.ai/chat/elements' before bootstrapApplication,
// and add CUSTOM_ELEMENTS_SCHEMA to the component.
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NgIf } from '@angular/common';

/**
 * Docked Widget — a compact chat bubble docked to the bottom-right.
 * Render inside a relative-positioned host so absolute positioning works.
 */
@Component({
  selector: 'app-docked-widget',
  standalone: true,
  imports: [NgIf],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  styles: [':host { display: contents; }'],
  template: \`
    <div *ngIf="open"
         class="absolute bottom-5 right-5 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
         style="width:360px; height:460px">

      <!-- Header -->
      <header class="flex flex-shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div class="flex items-center gap-2">
          <span class="size-2 rounded-full bg-green-500"></span>
          <span class="text-sm font-semibold">Support</span>
        </div>
        <button (click)="open = false" aria-label="Close"><!-- × --></button>
      </header>

      <!-- Scrollable thread -->
      <div class="relative flex-1 overflow-y-auto">
        <kc-chat-container class="h-full">
          <div class="space-y-3 px-3 py-3">
            <kc-message>
              <kc-message-avatar src="" alt="AI" fallback="AI"></kc-message-avatar>
              <kc-message-content markdown class="bg-transparent p-0 pt-1">
                Hi! How can I help you today?
              </kc-message-content>
            </kc-message>
            <kc-message class="flex-col items-end">
              <kc-message-content class="bg-muted text-primary max-w-[85%] rounded-xl px-3.5 py-2">
                How do I reset my password?
              </kc-message-content>
            </kc-message>
            <kc-message>
              <kc-message-avatar src="" alt="AI" fallback="AI"></kc-message-avatar>
              <kc-message-content markdown class="bg-transparent p-0 pt-1">
                Head to **Settings → Security** and click **Reset password**.
              </kc-message-content>
            </kc-message>
          </div>
        </kc-chat-container>
      </div>

      <!-- Composer -->
      <div class="flex-shrink-0 px-3 pb-3">
        <kc-prompt-input
          [value]="input"
          (kc-value-change)="input = $event.detail.value"
          (kc-submit)="input = ''"
        >
          <kc-prompt-input-textarea placeholder="Message support…"></kc-prompt-input-textarea>
          <kc-prompt-input-actions class="mt-1.5 flex w-full items-center justify-end gap-2 px-2.5 pb-2.5">
            <button [disabled]="!input.trim()" aria-label="Send"><!-- icon --></button>
          </kc-prompt-input-actions>
        </kc-prompt-input>
      </div>

    </div>
  \`,
})
export class DockedWidgetComponent {
  open = true;
  input = '';
}`,

    solid: `import { createSignal } from 'solid-js';
import {
  ChatConfig, ChatContainer, ChatContainerContent, ChatContainerScrollAnchor,
  Message, MessageAvatar, MessageContent,
  PromptInput, PromptInputTextarea, PromptInputActions,
  Button,
} from '@kitn.ai/chat';
import { ArrowUp, X } from 'lucide-solid';

/**
 * Docked Widget — a compact support assistant docked to the bottom-right.
 * Render this inside a relative-positioned host element.
 * proseSize="sm" gives tighter line-heights suitable for the compact size.
 */
export function DockedWidget() {
  const [input, setInput] = createSignal('');
  const [open, setOpen] = createSignal(true);

  return (
    <ChatConfig proseSize="sm">
      {/* Widget: absolutely docked — size to taste */}
      <div
        style={{ width: '360px', height: '460px' }}
        class="absolute bottom-5 right-5 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
      >
        {/* Header */}
        <header class="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <div class="flex items-center gap-2">
            <span class="size-2 rounded-full bg-green-500" />
            <span class="text-sm font-semibold text-foreground">Support</span>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close">
            <X class="size-4" />
          </Button>
        </header>

        {/* Scrollable thread */}
        <div class="relative flex-1 overflow-y-auto">
          <ChatContainer class="h-full">
            <ChatContainerContent class="space-y-3 px-3 py-3">
              <Message>
                <MessageAvatar src="" alt="AI" fallback="AI" />
                <MessageContent markdown class="bg-transparent p-0 pt-1">
                  Hi! 👋 How can I help you today?
                </MessageContent>
              </Message>
              <Message class="flex-col items-end">
                <MessageContent class="bg-muted text-primary max-w-[85%] rounded-xl px-3.5 py-2">
                  How do I reset my password?
                </MessageContent>
              </Message>
              <Message>
                <MessageAvatar src="" alt="AI" fallback="AI" />
                <MessageContent markdown class="bg-transparent p-0 pt-1">
                  Head to **Settings → Security** and click **Reset password**.
                </MessageContent>
              </Message>
              <ChatContainerScrollAnchor />
            </ChatContainerContent>
          </ChatContainer>
        </div>

        {/* Composer */}
        <div class="shrink-0 px-3 pb-3">
          <PromptInput value={input()} onValueChange={setInput} onSubmit={() => setInput('')}>
            <PromptInputTextarea placeholder="Message support…" class="min-h-[40px] pt-2.5 pl-3.5" />
            <PromptInputActions class="mt-1.5 flex w-full items-center justify-end gap-2 px-2.5 pb-2.5">
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
 * Pattern: Docked Widget — a compact floating assistant docked to the
 * bottom-right corner of the host page. Same building blocks as the other
 * patterns (`ChatContainer` + `Message` + `PromptInput`) at compact sizing;
 * absolutely positioned over the host so zero CSS bleed. Per-story: the Usage
 * tab shows the snippet for the story you're on; the example-level fields below
 * are the fallback.
 */
const dockedWidget: ExampleUsage = {
  title: 'Patterns/Docked Widget',
  ...supportAssistant,
  stories: {
    'Support Assistant': supportAssistant,
  },
};

export default dockedWidget;
