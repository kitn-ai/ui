import type { ExampleUsage, StoryUsage } from './types';

/**
 * Focused — full-window, single-column reading layout (Claude.ai-style).
 * A `max-w` measure centered in the viewport; user messages right-aligned,
 * assistant messages left-aligned, composer pinned below.
 */
const focused: StoryUsage = {
  intro:
    'Use **Centered Conversation** for a full-window, distraction-free chat — the Claude.ai layout. A `max-w` reading column is centered in the viewport: user messages align right inside pill bubbles, assistant responses align left with markdown + hover action bar, and the `PromptInput` composer is pinned to the bottom, also constrained to the same max-width. Prefer this over the Chat Panel Layout when the chat *is* the page, not a widget embedded inside one.',
  snippets: {
    html: `<!-- Register the elements once (CDN or bundler) -->
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kitn-chat.es.js';
</script>

<!-- Outer shell: full-height flex column, rounded card for demo; in
     production this is typically the <body> / a top-level <main>. -->
<div class="flex flex-col overflow-hidden bg-background" style="height:100dvh">

  <!-- Optional header (model switcher, title, etc.) -->
  <header class="flex h-14 shrink-0 items-center justify-between border-b px-5">
    <span class="text-sm font-semibold">New conversation</span>
  </header>

  <!-- Scrollable message area -->
  <kai-chat-container id="thread" class="relative flex-1 overflow-y-auto">
    <div class="space-y-6 px-5 py-6">

      <!-- User message: right-aligned pill bubble -->
      <kai-message class="mx-auto flex w-full max-w-2xl flex-col items-end">
        <kai-message-content
          class="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5"
        >Why is SolidJS reactivity fast?</kai-message-content>
      </kai-message>

      <!-- Assistant message: left-aligned, markdown prose + hover actions -->
      <kai-message class="mx-auto flex w-full max-w-2xl flex-col items-start">
        <div class="group flex w-full flex-col">
          <kai-message-content markdown class="bg-transparent p-0 text-foreground">
            Signals are fine-grained — only the DOM nodes that read a signal update.
          </kai-message-content>
          <kai-message-actions class="-ml-2.5 flex gap-0 opacity-0 transition-opacity group-hover:opacity-100">
            <button aria-label="Copy message"><!-- icon --></button>
            <button aria-label="Good response"><!-- icon --></button>
          </kai-message-actions>
        </div>
      </kai-message>

    </div>
  </kai-chat-container>

  <!-- Composer: same max-width as messages, pinned to bottom -->
  <div class="shrink-0 px-5 pb-5">
    <div class="mx-auto max-w-2xl">
      <kai-prompt-input id="composer">
        <kai-prompt-input-textarea placeholder="Reply…"></kai-prompt-input-textarea>
        <kai-prompt-input-actions class="mt-2 flex w-full items-center justify-end gap-2 px-3 pb-3">
          <button aria-label="Send message"><!-- icon --></button>
        </kai-prompt-input-actions>
      </kai-prompt-input>
    </div>
  </div>
</div>

<script type="module">
  document.getElementById('composer').addEventListener('kai-submit', (e) => {
    console.log('send', e.detail.value);
  });
</script>`,

    react: `import { useState } from 'react';
import {
  ChatConfig, ChatContainer, ChatContainerContent, ChatContainerScrollAnchor,
  Message, MessageContent, MessageActions,
  PromptInput, PromptInputTextarea, PromptInputActions,
  Button,
} from '@kitn.ai/ui/react';

/**
 * Centered Conversation — full-window single reading column.
 * User messages right-aligned; assistant messages left-aligned with
 * markdown + hover actions. Composer constrained to the same max-width.
 */
export function CenteredConversation() {
  const [input, setInput] = useState('');

  return (
    <ChatConfig proseSize="base">
      <div className="flex h-dvh flex-col overflow-hidden bg-background">
        {/* Optional header */}
        <header className="flex h-14 shrink-0 items-center border-b px-5">
          <span className="text-sm font-semibold">New conversation</span>
        </header>

        {/* Scrollable thread */}
        <div className="relative flex-1 overflow-y-auto">
          <ChatContainer className="h-full">
            <ChatContainerContent className="space-y-6 px-5 py-6">
              {/* User message — right-aligned bubble */}
              <Message className="mx-auto flex w-full max-w-2xl flex-col items-end">
                <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5">
                  Why is SolidJS reactivity fast?
                </MessageContent>
              </Message>

              {/* Assistant message — left-aligned with hover actions */}
              <Message className="mx-auto flex w-full max-w-2xl flex-col items-start">
                <div className="group flex w-full flex-col">
                  <MessageContent markdown className="bg-transparent p-0 text-foreground">
                    Signals are fine-grained — only the DOM nodes that read a signal update.
                  </MessageContent>
                  <MessageActions className="-ml-2.5 flex gap-0 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="icon-sm" className="rounded-full" aria-label="Copy">
                      {/* icon */}
                    </Button>
                  </MessageActions>
                </div>
              </Message>
              <ChatContainerScrollAnchor />
            </ChatContainerContent>
          </ChatContainer>
        </div>

        {/* Composer — same max-width as messages */}
        <div className="shrink-0 px-5 pb-5">
          <div className="mx-auto max-w-2xl">
            <PromptInput value={input} onValueChange={setInput} onSubmit={() => setInput('')}>
              <PromptInputTextarea placeholder="Reply…" className="min-h-[44px] pt-3 pl-4" />
              <PromptInputActions className="mt-2 flex w-full items-center justify-end gap-2 px-3 pb-3">
                <Button size="icon-sm" className="rounded-full" disabled={!input.trim()} aria-label="Send">
                  {/* icon */}
                </Button>
              </PromptInputActions>
            </PromptInput>
          </div>
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
  Centered Conversation — full-window single reading column.
  User messages right-aligned; assistant messages left-aligned with
  markdown + hover actions. Composer constrained to the same max-width.
-->
<template>
  <div class="flex h-dvh flex-col overflow-hidden bg-background">

    <!-- Optional header -->
    <header class="flex h-14 shrink-0 items-center border-b px-5">
      <span class="text-sm font-semibold">New conversation</span>
    </header>

    <!-- Scrollable thread -->
    <kai-chat-container class="relative flex-1 overflow-y-auto">
      <div class="space-y-6 px-5 py-6">

        <!-- User message — right-aligned bubble -->
        <kai-message class="mx-auto flex w-full max-w-2xl flex-col items-end">
          <kai-message-content class="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5">
            Why is SolidJS reactivity fast?
          </kai-message-content>
        </kai-message>

        <!-- Assistant message — left-aligned, markdown, hover actions -->
        <kai-message class="mx-auto flex w-full max-w-2xl flex-col items-start">
          <div class="group flex w-full flex-col">
            <kai-message-content markdown class="bg-transparent p-0 text-foreground">
              Signals are fine-grained — only the DOM nodes that read a signal update.
            </kai-message-content>
            <kai-message-actions class="-ml-2.5 flex gap-0 opacity-0 transition-opacity group-hover:opacity-100">
              <button aria-label="Copy"><!-- icon --></button>
            </kai-message-actions>
          </div>
        </kai-message>

      </div>
    </kai-chat-container>

    <!-- Composer — same max-width as messages -->
    <div class="shrink-0 px-5 pb-5">
      <div class="mx-auto max-w-2xl">
        <kai-prompt-input
          :value="input"
          @kai-value-change="input = $event.detail.value"
          @kai-submit="onSubmit"
        >
          <kai-prompt-input-textarea placeholder="Reply…"></kai-prompt-input-textarea>
          <kai-prompt-input-actions class="mt-2 flex w-full items-center justify-end gap-2 px-3 pb-3">
            <button :disabled="!input.trim()" aria-label="Send"><!-- icon --></button>
          </kai-prompt-input-actions>
        </kai-prompt-input>
      </div>
    </div>
  </div>
</template>`,

    svelte: `<script>
  import '@kitn.ai/ui/elements';
  let input = '';
</script>

<!--
  Centered Conversation — full-window single reading column.
  User messages right-aligned; assistant messages left-aligned with
  markdown + hover actions. Composer constrained to the same max-width.
-->
<div class="flex h-dvh flex-col overflow-hidden bg-background">

  <!-- Optional header -->
  <header class="flex h-14 shrink-0 items-center border-b px-5">
    <span class="text-sm font-semibold">New conversation</span>
  </header>

  <!-- Scrollable thread -->
  <kai-chat-container class="relative flex-1 overflow-y-auto">
    <div class="space-y-6 px-5 py-6">

      <!-- User message — right-aligned bubble -->
      <kai-message class="mx-auto flex w-full max-w-2xl flex-col items-end">
        <kai-message-content class="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5">
          Why is SolidJS reactivity fast?
        </kai-message-content>
      </kai-message>

      <!-- Assistant message — left-aligned, markdown, hover actions -->
      <kai-message class="mx-auto flex w-full max-w-2xl flex-col items-start">
        <div class="group flex w-full flex-col">
          <kai-message-content markdown class="bg-transparent p-0 text-foreground">
            Signals are fine-grained — only the DOM nodes that read a signal update.
          </kai-message-content>
          <kai-message-actions class="-ml-2.5 flex gap-0 opacity-0 transition-opacity group-hover:opacity-100">
            <button aria-label="Copy"><!-- icon --></button>
          </kai-message-actions>
        </div>
      </kai-message>

    </div>
  </kai-chat-container>

  <!-- Composer — same max-width as messages -->
  <div class="shrink-0 px-5 pb-5">
    <div class="mx-auto max-w-2xl">
      <kai-prompt-input
        value={input}
        on:kai-value-change={(e) => (input = e.detail.value)}
        on:kai-submit={() => (input = '')}
      >
        <kai-prompt-input-textarea placeholder="Reply…"></kai-prompt-input-textarea>
        <kai-prompt-input-actions class="mt-2 flex w-full items-center justify-end gap-2 px-3 pb-3">
          <button disabled={!input.trim()} aria-label="Send"><!-- icon --></button>
        </kai-prompt-input-actions>
      </kai-prompt-input>
    </div>
  </div>
</div>`,

    angular: `// main.ts: import '@kitn.ai/ui/elements' before bootstrapApplication,
// and add CUSTOM_ELEMENTS_SCHEMA to the component.
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Centered Conversation — full-window single reading column.
 * User messages right-aligned; assistant messages left-aligned with
 * markdown + hover actions. Composer constrained to the same max-width.
 */
@Component({
  selector: 'app-centered-conversation',
  standalone: true,
  imports: [FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <div class="flex h-dvh flex-col overflow-hidden bg-background">

      <!-- Optional header -->
      <header class="flex h-14 shrink-0 items-center border-b px-5">
        <span class="text-sm font-semibold">New conversation</span>
      </header>

      <!-- Scrollable thread -->
      <kai-chat-container class="relative flex-1 overflow-y-auto">
        <div class="space-y-6 px-5 py-6">

          <!-- User message — right-aligned bubble -->
          <kai-message class="mx-auto flex w-full max-w-2xl flex-col items-end">
            <kai-message-content class="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5">
              Why is SolidJS reactivity fast?
            </kai-message-content>
          </kai-message>

          <!-- Assistant message — left-aligned, markdown, hover actions -->
          <kai-message class="mx-auto flex w-full max-w-2xl flex-col items-start">
            <div class="group flex w-full flex-col">
              <kai-message-content markdown class="bg-transparent p-0 text-foreground">
                Signals are fine-grained — only the DOM nodes that read a signal update.
              </kai-message-content>
              <kai-message-actions class="-ml-2.5 flex gap-0 opacity-0 transition-opacity group-hover:opacity-100">
                <button aria-label="Copy"><!-- icon --></button>
              </kai-message-actions>
            </div>
          </kai-message>

        </div>
      </kai-chat-container>

      <!-- Composer — same max-width as messages -->
      <div class="shrink-0 px-5 pb-5">
        <div class="mx-auto max-w-2xl">
          <kai-prompt-input
            [value]="input"
            (kai-value-change)="input = $event.detail.value"
            (kai-submit)="input = ''"
          >
            <kai-prompt-input-textarea placeholder="Reply…"></kai-prompt-input-textarea>
            <kai-prompt-input-actions class="mt-2 flex w-full items-center justify-end gap-2 px-3 pb-3">
              <button [disabled]="!input.trim()" aria-label="Send"><!-- icon --></button>
            </kai-prompt-input-actions>
          </kai-prompt-input>
        </div>
      </div>
    </div>
  \`,
})
export class CenteredConversationComponent {
  input = '';
}`,

    solid: `import { createSignal } from 'solid-js';
import {
  ChatConfig, ChatContainer, ChatContainerContent, ChatContainerScrollAnchor,
  Message, MessageContent, MessageActions,
  PromptInput, PromptInputTextarea, PromptInputActions,
  ModelSwitcher, Button,
} from '@kitn.ai/ui';
import type { ModelOption } from '@kitn.ai/ui';
import { Copy, ThumbsUp, ArrowUp } from 'lucide-solid';

const models: ModelOption[] = [
  { id: 'claude-4', name: 'Claude 4 Opus', provider: 'Anthropic' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
];

/**
 * Centered Conversation — full-window single reading column.
 * User messages right-aligned; assistant messages left-aligned with
 * markdown + hover actions. Composer constrained to the same max-width.
 */
export function CenteredConversation() {
  const [input, setInput] = createSignal('');
  const [model, setModel] = createSignal('claude-4');

  return (
    <ChatConfig proseSize="base">
      <div class="flex h-dvh flex-col overflow-hidden bg-background">

        {/* Optional header */}
        <header class="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
          <span class="text-sm font-semibold text-foreground">New conversation</span>
          <ModelSwitcher models={models} currentModelId={model()} onModelChange={setModel} />
        </header>

        {/* Scrollable thread */}
        <div class="relative flex-1 overflow-y-auto">
          <ChatContainer class="h-full">
            <ChatContainerContent class="space-y-6 px-5 py-6">

              {/* User message — right-aligned bubble */}
              <Message class="mx-auto flex w-full max-w-2xl flex-col items-end">
                <MessageContent class="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5">
                  Why is SolidJS reactivity fast?
                </MessageContent>
              </Message>

              {/* Assistant message — left-aligned, markdown, hover actions */}
              <Message class="mx-auto flex w-full max-w-2xl flex-col items-start">
                <div class="group flex w-full flex-col">
                  <MessageContent markdown class="bg-transparent p-0 text-foreground">
                    Signals are fine-grained — only the DOM nodes that read a signal update.
                  </MessageContent>
                  <MessageActions class="-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <Button variant="ghost" size="icon-sm" class="rounded-full" aria-label="Copy message">
                      <Copy class="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" class="rounded-full" aria-label="Good response">
                      <ThumbsUp class="size-3.5" />
                    </Button>
                  </MessageActions>
                </div>
              </Message>

              <ChatContainerScrollAnchor />
            </ChatContainerContent>
          </ChatContainer>
        </div>

        {/* Composer — constrained to the same max-width as messages */}
        <div class="shrink-0 px-5 pb-5">
          <div class="mx-auto max-w-2xl">
            <PromptInput value={input()} onValueChange={setInput} onSubmit={() => setInput('')}>
              <PromptInputTextarea placeholder="Reply…" class="min-h-[44px] pt-3 pl-4" />
              <PromptInputActions class="mt-2 flex w-full items-center justify-end gap-2 px-3 pb-3">
                <Button size="icon-sm" class="rounded-full" disabled={!input().trim()} aria-label="Send message">
                  <ArrowUp class="size-4" />
                </Button>
              </PromptInputActions>
            </PromptInput>
          </div>
        </div>
      </div>
    </ChatConfig>
  );
}`,
  },
};

/**
 * Pattern: Centered Conversation — full-window, single-column reading layout
 * (Claude.ai-style). `max-w` measure centered in the viewport; user bubbles
 * right-aligned, assistant prose left-aligned with hover action bar, composer
 * pinned to the bottom. Per-story: the Usage tab shows the snippet for the
 * story you're on; the example-level fields below are the fallback.
 */
const centeredConversation: ExampleUsage = {
  title: 'Patterns/Centered Conversation',
  ...focused,
  stories: {
    Focused: focused,
  },
};

export default centeredConversation;
