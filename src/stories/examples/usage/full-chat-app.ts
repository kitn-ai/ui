import type { ExampleUsage, StoryUsage } from './types';

// A small thread reused across the snippets — user + assistant, with actions,
// reasoning, and a tool call on the second assistant message.
const MESSAGES = `[
    { id: 'u1', role: 'user', content: 'Can you explain how SolidJS reactivity differs from React hooks?' },
    {
      id: 'a1',
      role: 'assistant',
      content: 'SolidJS uses fine-grained signals: components run once and only the DOM nodes that read a signal update.',
      actions: ['copy', 'like', 'dislike', 'regenerate'],
    },
    { id: 'u2', role: 'user', content: 'Can you benchmark SolidJS vs React for 10,000 items?' },
    {
      id: 'a2',
      role: 'assistant',
      content: 'Here are the benchmark results — SolidJS renders ~7x faster and updates ~42x faster.',
      actions: ['copy', 'like', 'dislike', 'regenerate'],
      reasoning: { label: 'Thought for 4 seconds', text: 'Render the same 10,000 items in both frameworks for a fair comparison.' },
      tools: [
        {
          type: 'run_benchmark',
          state: 'output-available',
          input: { framework: ['solid', 'react'], itemCount: 10000 },
          output: { solid: { avgRenderMs: 12.4 }, react: { avgRenderMs: 89.2 } },
          toolCallId: 'call_abc123',
        },
      ],
    },
  ]`;

const MODELS = `[
    { id: 'claude-4', name: 'Claude 4 Opus', provider: 'Anthropic' },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  ]`;

const CONTEXT = `{ usedTokens: 12400, maxTokens: 200000, inputTokens: 8200, outputTokens: 4200, estimatedCost: 0.042 }`;

const SUGGESTIONS = `['How does SolidJS handle context?', 'Show me a store example']`;

/**
 * Default — the entire chat experience in one element. `<kc-chat>` renders the
 * message thread (markdown, reasoning, tool calls, per-message action bars), a
 * header with the `models` switcher + `context` token meter, the `suggestions`
 * chips, and the prompt input. The demo's resizable sidebar + conversation list
 * are separate chrome that lives *outside* the element.
 */
const fullChat: StoryUsage = {
  intro:
    'Drop in the whole chat experience with one element. `<kc-chat>` renders the thread (markdown, reasoning, tool calls, action bars), an optional header model switcher + `context` token meter, `suggestions` chips, and the prompt input — set `messages` as a property and handle `submit` / `messageaction` / `modelchange`. The resizable conversation sidebar in the demo is separate chrome `<kc-chat>` does not include. (The live demo composes the SolidJS `ChatContainer`, `Message`, `PromptInput`, and `ConversationList` primitives directly.)',
  snippets: {
    html: `<!-- Register the elements once (CDN or bundler) -->
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kitn-chat.es.js';
</script>

<kc-chat
  id="chat"
  chat-title="SolidJS reactivity vs React hooks"
  current-model="claude-4"
  prose-size="base"
  placeholder="Ask anything..."
></kc-chat>

<script type="module">
  const chat = document.getElementById('chat');

  // Object/array props are set as PROPERTIES, not attributes.
  chat.messages = ${MESSAGES};
  chat.models = ${MODELS};
  chat.context = ${CONTEXT};
  chat.suggestions = ${SUGGESTIONS};

  chat.addEventListener('kc-submit', (e) => {
    const { value, attachments } = e.detail; // append the user message / call your backend
    console.log('send', value, attachments);
  });
  chat.addEventListener('kc-message-action', (e) => {
    const { messageId, action } = e.detail; // 'copy' | 'like' | 'dislike' | 'regenerate' | 'edit'
    console.log(messageId, action);
  });
  chat.addEventListener('kc-model-change', (e) => console.log(e.detail.modelId));
</script>`,

    react: `import { Chat } from '@kitn.ai/ui/react';

export function ChatApp() {
  return (
    <Chat
      chatTitle="SolidJS reactivity vs React hooks"
      proseSize="base"
      placeholder="Ask anything..."
      currentModel="claude-4"
      models={${MODELS}}
      context={${CONTEXT}}
      suggestions={${SUGGESTIONS}}
      messages={${MESSAGES}}
      onSubmit={(e) => console.log('send', e.detail.value, e.detail.attachments)}
      onMessageAction={(e) => console.log(e.detail.messageId, e.detail.action)}
      onModelChange={(e) => console.log(e.detail.modelId)}
    />
  );
}`,

    vue: `<script setup>
import '@kitn.ai/ui/elements'; // register once (e.g. in main.ts)

// Object/array props use the .prop modifier in the template.
const messages = ${MESSAGES};
const models = ${MODELS};
const context = ${CONTEXT};
const suggestions = ${SUGGESTIONS};

function onSubmit(e) { console.log('send', e.detail.value, e.detail.attachments); }
function onAction(e) { console.log(e.detail.messageId, e.detail.action); }
</script>

<template>
  <kc-chat
    chat-title="SolidJS reactivity vs React hooks"
    prose-size="base"
    placeholder="Ask anything..."
    current-model="claude-4"
    :messages.prop="messages"
    :models.prop="models"
    :context.prop="context"
    :suggestions.prop="suggestions"
    @kc-submit="onSubmit"
    @kc-message-action="onAction"
    @kc-model-change="(e) => console.log(e.detail.modelId)"
  />
</template>`,

    svelte: `<script>
  import '@kitn.ai/ui/elements';

  let el;
  // Object/array props are set as properties via bind:this.
  const messages = ${MESSAGES};
  const models = ${MODELS};
  const context = ${CONTEXT};
  const suggestions = ${SUGGESTIONS};
  $: if (el) {
    el.messages = messages;
    el.models = models;
    el.context = context;
    el.suggestions = suggestions;
  }

  function onSubmit(e) { console.log('send', e.detail.value, e.detail.attachments); }
  function onAction(e) { console.log(e.detail.messageId, e.detail.action); }
</script>

<kc-chat
  bind:this={el}
  chat-title="SolidJS reactivity vs React hooks"
  prose-size="base"
  placeholder="Ask anything..."
  current-model="claude-4"
  on:kc-submit={onSubmit}
  on:kc-message-action={onAction}
  on:kc-model-change={(e) => console.log(e.detail.modelId)}
/>`,

    angular: `// main.ts: import '@kitn.ai/ui/elements' before bootstrapApplication,
// and add CUSTOM_ELEMENTS_SCHEMA to the component.
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-chat',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <kc-chat
      chat-title="SolidJS reactivity vs React hooks"
      prose-size="base"
      placeholder="Ask anything..."
      current-model="claude-4"
      [messages]="messages"
      [models]="models"
      [context]="context"
      [suggestions]="suggestions"
      (kc-submit)="onSubmit($event)"
      (kc-message-action)="onAction($event)"
      (kc-model-change)="onModel($event)"
    ></kc-chat>
  \`,
})
export class ChatComponent {
  messages = ${MESSAGES};
  models = ${MODELS};
  context = ${CONTEXT};
  suggestions = ${SUGGESTIONS};
  onSubmit(e: CustomEvent<{ value: string; attachments: unknown[] }>) {
    console.log('send', e.detail.value, e.detail.attachments);
  }
  onAction(e: CustomEvent<{ messageId: string; action: string }>) {
    console.log(e.detail.messageId, e.detail.action);
  }
  onModel(e: CustomEvent<{ modelId: string }>) { console.log(e.detail.modelId); }
}`,

    solid: `import { createSignal, For } from 'solid-js';
import {
  ChatContainer, ChatContainerContent, ChatContainerScrollAnchor,
  Message, MessageContent, MessageActions,
  PromptInput, PromptInputTextarea, PromptInputActions,
  ConversationList, ModelSwitcher, PromptSuggestion, ScrollButton, Button,
} from '@kitn.ai/ui';
import { Copy, ThumbsUp, ThumbsDown, RefreshCw, ArrowUp } from 'lucide-solid';

export function ChatApp() {
  const [value, setValue] = createSignal('');
  const [modelId, setModelId] = createSignal('claude-4');

  return (
    <div class="flex h-screen w-full bg-background">
      {/* Sidebar — separate chrome from the thread */}
      <ConversationList groups={groups} conversations={conversations} activeId="1" onSelect={() => {}} onNewChat={() => {}} />

      <main class="flex flex-1 flex-col overflow-hidden">
        <header class="flex h-14 items-center justify-between border-b border-border px-5">
          <div class="text-sm font-semibold">SolidJS reactivity vs React hooks</div>
          <ModelSwitcher models={models} currentModelId={modelId()} onModelChange={setModelId} />
        </header>

        <ChatContainer class="flex-1">
          <ChatContainerContent class="px-5 pt-4">
            <Message class="group items-start">
              <MessageContent markdown class="prose">{assistantReply}</MessageContent>
              <MessageActions class="opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon-sm" aria-label="Copy"><Copy class="size-3.5" /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Good response"><ThumbsUp class="size-3.5" /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Bad response"><ThumbsDown class="size-3.5" /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Regenerate"><RefreshCw class="size-3.5" /></Button>
              </MessageActions>
            </Message>
            <ChatContainerScrollAnchor />
          </ChatContainerContent>
          <ScrollButton />
        </ChatContainer>

        <div class="px-5 pb-5">
          <div class="flex gap-2 pb-3">
            <For each={['How does SolidJS handle context?', 'Show me a store example']}>
              {(s) => <PromptSuggestion onClick={() => setValue(s)}>{s}</PromptSuggestion>}
            </For>
          </div>
          <PromptInput value={value()} onValueChange={setValue} onSubmit={() => setValue('')}>
            <PromptInputTextarea placeholder="Ask anything..." />
            <PromptInputActions class="justify-end">
              <Button size="icon-sm" disabled={!value().trim()} aria-label="Send message"><ArrowUp class="size-4" /></Button>
            </PromptInputActions>
          </PromptInput>
        </div>
      </main>
    </div>
  );
}`,
  },
};

/**
 * Example: Full Chat App — the complete experience. As an embedder you reach for
 * the single `<kc-chat>` element; the live demo composes the granular SolidJS
 * primitives for full control. Per-story: the Usage tab shows the snippet for the
 * story you're on; the example-level fields below are the fallback.
 */
const fullChatApp: ExampleUsage = {
  title: 'Examples/Full Chat App',
  ...fullChat, // example-level fallback = the "Default" story
  stories: {
    Default: fullChat,
  },
};

export default fullChatApp;
