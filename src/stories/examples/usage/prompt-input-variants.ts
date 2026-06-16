import type { ExampleUsage, StoryUsage } from './types';

/** Basic Input — a text box with a send button that enables once you type. */
const basic: StoryUsage = {
  intro:
    'A complete prompt box from one element. `<kc-prompt-input>` renders the textarea and send button; bind `value`, handle `valuechange` on every keystroke, and `submit` (Enter or the send button) gives you `{ value, attachments }`. (The live demo composes the SolidJS `PromptInput` primitives.)',
  snippets: {
    html: `<!-- Register the elements once (CDN or bundler) -->
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/chat/dist/kitn-chat.es.js';
</script>

<kc-prompt-input id="prompt" placeholder="Ask anything..."></kc-prompt-input>

<script type="module">
  const prompt = document.getElementById('prompt');
  let value = '';
  prompt.addEventListener('kc-value-change', (e) => {
    value = e.detail.value; // track on every keystroke
  });
  prompt.addEventListener('kc-submit', (e) => {
    const { value, attachments } = e.detail;
    console.log(value, attachments);
  });
</script>`,

    react: `import { useState } from 'react';
import { PromptInput } from '@kitn.ai/chat/react';

export function Prompt() {
  const [value, setValue] = useState('');

  return (
    <PromptInput
      placeholder="Ask anything..."
      onValueChange={(e) => setValue(e.detail.value)}
      onSubmit={(e) => {
        const { value, attachments } = e.detail;
        console.log(value, attachments);
      }}
    />
  );
}`,

    vue: `<script setup>
import '@kitn.ai/chat/elements'; // register once (e.g. in main.ts)
import { ref } from 'vue';

const value = ref('');
function onValueChange(e) {
  value.value = e.detail.value; // track on every keystroke
}
function onSubmit(e) {
  const { value, attachments } = e.detail;
  console.log(value, attachments);
}
</script>

<template>
  <kc-prompt-input
    placeholder="Ask anything..."
    @kc-value-change="onValueChange"
    @kc-submit="onSubmit"
  />
</template>`,

    svelte: `<script>
  import '@kitn.ai/chat/elements'; // register once

  let value = '';
  function onValueChange(e) {
    value = e.detail.value; // track on every keystroke
  }
  function onSubmit(e) {
    const { value, attachments } = e.detail;
    console.log(value, attachments);
  }
</script>

<kc-prompt-input
  placeholder="Ask anything..."
  on:kc-value-change={onValueChange}
  on:kc-submit={onSubmit}
/>`,

    angular: `// main.ts: import '@kitn.ai/chat/elements' before bootstrapApplication,
// and add CUSTOM_ELEMENTS_SCHEMA to the component/module.
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-prompt',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <kc-prompt-input
      placeholder="Ask anything..."
      (kc-value-change)="onValueChange($event)"
      (kc-submit)="onSubmit($event)"
    ></kc-prompt-input>
  \`,
})
export class PromptComponent {
  value = '';
  onValueChange(e: CustomEvent<{ value: string }>) {
    this.value = e.detail.value; // track on every keystroke
  }
  onSubmit(e: CustomEvent<{ value: string; attachments: unknown[] }>) {
    const { value, attachments } = e.detail;
    console.log(value, attachments);
  }
}`,

    solid: `import { createSignal } from 'solid-js';
import { PromptInput, PromptInputTextarea, PromptInputActions, Button } from '@kitn.ai/chat';
import { ArrowUp } from 'lucide-solid';

export function Prompt() {
  const [value, setValue] = createSignal('');
  return (
    <PromptInput value={value()} onValueChange={setValue} onSubmit={() => setValue('')}>
      <PromptInputTextarea placeholder="Ask anything..." />
      <PromptInputActions class="justify-end">
        <Button variant="default" size="icon-sm" class="rounded-full" disabled={!value()} aria-label="Send message">
          <ArrowUp class="size-4" />
        </Button>
      </PromptInputActions>
    </PromptInput>
  );
}`,
  },
};

/** With Suggestion Chips — starter prompts above the input. */
const suggestions: StoryUsage = {
  intro:
    'Show starter prompts above the input. Pass a `suggestions` array (as a PROPERTY) and pick `suggestionMode` — `"submit"` (default) sends the prompt immediately, `"fill"` just drops it into the box and fires `kc-suggestion-click`. (The demo groups its chips with the SolidJS `PromptSuggestion` primitive, which the element renders as one flat row.)',
  snippets: {
    html: `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/chat/dist/kitn-chat.es.js';
</script>

<kc-prompt-input
  id="prompt"
  placeholder="Ask about this document..."
  suggestion-mode="fill"
></kc-prompt-input>

<script type="module">
  const prompt = document.getElementById('prompt');
  // Arrays must be set as a PROPERTY (attributes only take strings).
  prompt.suggestions = [
    'Summarize this document',
    'What are the key takeaways?',
    'Create an outline',
  ];
  prompt.addEventListener('kc-suggestion-click', (e) => {
    console.log(e.detail.value); // fires when suggestion-mode="fill"
  });
  prompt.addEventListener('kc-submit', (e) => console.log(e.detail.value));
</script>`,

    react: `import { PromptInput } from '@kitn.ai/chat/react';

const SUGGESTIONS = [
  'Summarize this document',
  'What are the key takeaways?',
  'Create an outline',
];

export function Prompt() {
  return (
    <PromptInput
      placeholder="Ask about this document..."
      // Arrays are passed straight through as a property.
      suggestions={SUGGESTIONS}
      suggestionMode="fill"
      onSuggestionClick={(e) => console.log(e.detail.value)}
      onSubmit={(e) => console.log(e.detail.value)}
    />
  );
}`,

    vue: `<script setup>
import '@kitn.ai/chat/elements';

const suggestions = [
  'Summarize this document',
  'What are the key takeaways?',
  'Create an outline',
];
function onSuggestionClick(e) { console.log(e.detail.value); }
function onSubmit(e) { console.log(e.detail.value); }
</script>

<template>
  <!-- .prop binds the array as a property -->
  <kc-prompt-input
    placeholder="Ask about this document..."
    :suggestions.prop="suggestions"
    suggestion-mode="fill"
    @kc-suggestion-click="onSuggestionClick"
    @kc-submit="onSubmit"
  />
</template>`,

    svelte: `<script>
  import '@kitn.ai/chat/elements';

  let el;
  const suggestions = [
    'Summarize this document',
    'What are the key takeaways?',
    'Create an outline',
  ];
  // Arrays must be set as a property (attributes only take strings).
  $: if (el) el.suggestions = suggestions;

  function onSuggestionClick(e) { console.log(e.detail.value); }
  function onSubmit(e) { console.log(e.detail.value); }
</script>

<kc-prompt-input
  bind:this={el}
  placeholder="Ask about this document..."
  suggestion-mode="fill"
  on:kc-suggestion-click={onSuggestionClick}
  on:kc-submit={onSubmit}
/>`,

    angular: `import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-prompt',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <kc-prompt-input
      placeholder="Ask about this document..."
      [suggestions]="suggestions"
      suggestion-mode="fill"
      (kc-suggestion-click)="onSuggestionClick($event)"
      (kc-submit)="onSubmit($event)"
    ></kc-prompt-input>
  \`,
})
export class PromptComponent {
  // [suggestions] binds the array as a property.
  suggestions = [
    'Summarize this document',
    'What are the key takeaways?',
    'Create an outline',
  ];
  onSuggestionClick(e: CustomEvent<{ value: string }>) { console.log(e.detail.value); }
  onSubmit(e: CustomEvent<{ value: string }>) { console.log(e.detail.value); }
}`,

    solid: `import { createSignal, For } from 'solid-js';
import { PromptInput, PromptInputTextarea, PromptInputActions, PromptSuggestion, Button } from '@kitn.ai/chat';
import { ArrowUp } from 'lucide-solid';

const GROUPS = [
  { label: 'Get started', items: ['Summarize this document', 'What are the key takeaways?', 'Create an outline'] },
  { label: 'Go deeper', items: ['Compare with similar approaches', 'What are the tradeoffs?', 'Find contradictions'] },
];

export function Prompt() {
  const [value, setValue] = createSignal('');
  return (
    <div class="space-y-4">
      <For each={GROUPS}>
        {(group) => (
          <div class="space-y-2">
            <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">{group.label}</span>
            <div class="flex flex-wrap gap-2">
              <For each={group.items}>
                {(item) => <PromptSuggestion onClick={() => setValue(item)}>{item}</PromptSuggestion>}
              </For>
            </div>
          </div>
        )}
      </For>
      <PromptInput value={value()} onValueChange={setValue} onSubmit={() => setValue('')}>
        <PromptInputTextarea placeholder="Ask about this document..." />
        <PromptInputActions class="justify-end">
          <Button variant="default" size="icon-sm" class="rounded-full" disabled={!value()} aria-label="Send message">
            <ArrowUp class="size-4" />
          </Button>
        </PromptInputActions>
      </PromptInput>
    </div>
  );
}`,
  },
};

/** With Action Buttons — toolbar buttons beside the input. */
const actionButtons: StoryUsage = {
  intro:
    'Add toolbar buttons beside the input. `<kc-prompt-input>` has built-in Search and Voice buttons — enable `search` and `voice`, then handle the `search` / `voice` events; attaching files is built in (the paperclip, emitted on `submit` as `attachments`). The demo also shows a custom Sparkles button, which the element doesn\'t expose — for arbitrary extra buttons, compose the SolidJS primitives (see the Solid tab).',
  snippets: {
    html: `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/chat/dist/kitn-chat.es.js';
</script>

<kc-prompt-input id="prompt" placeholder="Message..." search voice></kc-prompt-input>

<script type="module">
  const prompt = document.getElementById('prompt');
  prompt.addEventListener('kc-search', () => console.log('search clicked'));
  prompt.addEventListener('kc-voice', () => console.log('voice clicked'));
  prompt.addEventListener('kc-submit', (e) => {
    const { value, attachments } = e.detail; // attachments from the paperclip
    console.log(value, attachments);
  });
</script>`,

    react: `import { PromptInput } from '@kitn.ai/chat/react';

export function Prompt() {
  return (
    <PromptInput
      placeholder="Message..."
      search
      voice
      onSearch={() => console.log('search clicked')}
      onVoice={() => console.log('voice clicked')}
      onSubmit={(e) => {
        const { value, attachments } = e.detail; // attachments from the paperclip
        console.log(value, attachments);
      }}
    />
  );
}`,

    vue: `<script setup>
import '@kitn.ai/chat/elements';
function onSearch() { console.log('search clicked'); }
function onVoice() { console.log('voice clicked'); }
function onSubmit(e) {
  const { value, attachments } = e.detail; // attachments from the paperclip
  console.log(value, attachments);
}
</script>

<template>
  <kc-prompt-input
    placeholder="Message..."
    search
    voice
    @kc-search="onSearch"
    @kc-voice="onVoice"
    @kc-submit="onSubmit"
  />
</template>`,

    svelte: `<script>
  import '@kitn.ai/chat/elements';
  function onSearch() { console.log('search clicked'); }
  function onVoice() { console.log('voice clicked'); }
  function onSubmit(e) {
    const { value, attachments } = e.detail; // attachments from the paperclip
    console.log(value, attachments);
  }
</script>

<kc-prompt-input
  placeholder="Message..."
  search
  voice
  on:kc-search={onSearch}
  on:kc-voice={onVoice}
  on:kc-submit={onSubmit}
/>`,

    angular: `import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-prompt',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <kc-prompt-input
      placeholder="Message..."
      [search]="true"
      [voice]="true"
      (kc-search)="onSearch()"
      (kc-voice)="onVoice()"
      (kc-submit)="onSubmit($event)"
    ></kc-prompt-input>
  \`,
})
export class PromptComponent {
  onSearch() { console.log('search clicked'); }
  onVoice() { console.log('voice clicked'); }
  onSubmit(e: CustomEvent<{ value: string; attachments: unknown[] }>) {
    const { value, attachments } = e.detail; // attachments from the paperclip
    console.log(value, attachments);
  }
}`,

    solid: `import { createSignal } from 'solid-js';
import { PromptInput, PromptInputTextarea, PromptInputActions, Button } from '@kitn.ai/chat';
import { ArrowUp, Paperclip, Globe, Mic, Sparkles } from 'lucide-solid';

export function Prompt() {
  const [value, setValue] = createSignal('');
  return (
    <PromptInput value={value()} onValueChange={setValue} onSubmit={() => setValue('')}>
      <PromptInputTextarea placeholder="Message..." />
      <PromptInputActions class="justify-between">
        <div class="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Attach file"><Paperclip class="size-4 text-muted-foreground" /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Search the web"><Globe class="size-4 text-muted-foreground" /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Voice input"><Mic class="size-4 text-muted-foreground" /></Button>
          {/* Sparkles is a custom button — not exposed by kc-prompt-input */}
          <Button variant="ghost" size="icon-sm" aria-label="AI suggestions"><Sparkles class="size-4 text-muted-foreground" /></Button>
        </div>
        <Button variant="default" size="icon-sm" class="rounded-full" disabled={!value()} aria-label="Send message">
          <ArrowUp class="size-4" />
        </Button>
      </PromptInputActions>
    </PromptInput>
  );
}`,
  },
};

/** Streaming / Loading State — disabled while a reply streams in. */
const streaming: StoryUsage = {
  intro:
    'Block input while a reply streams. Set `loading` to show the streaming state and stop accepting submits, and `disabled` to make the box fully non-interactive. (The demo composes the SolidJS `PromptInput` + `Loader` primitives to show the typing/dots indicators and a stop button.)',
  snippets: {
    html: `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/chat/dist/kitn-chat.es.js';
</script>

<kc-prompt-input id="prompt" placeholder="Generating response..." loading disabled></kc-prompt-input>

<script type="module">
  const prompt = document.getElementById('prompt');
  // When the reply finishes, clear the flags to re-enable.
  function onDone() {
    prompt.loading = false;
    prompt.disabled = false;
  }
</script>`,

    react: `import { PromptInput } from '@kitn.ai/chat/react';

export function Prompt({ isStreaming }: { isStreaming: boolean }) {
  return (
    <PromptInput
      placeholder={isStreaming ? 'Generating response...' : 'Ask anything...'}
      loading={isStreaming}
      disabled={isStreaming}
    />
  );
}`,

    vue: `<script setup>
import '@kitn.ai/chat/elements';
import { ref } from 'vue';
const isStreaming = ref(true);
</script>

<template>
  <kc-prompt-input
    placeholder="Generating response..."
    :loading="isStreaming"
    :disabled="isStreaming"
  />
</template>`,

    svelte: `<script>
  import '@kitn.ai/chat/elements';
  let isStreaming = true;
</script>

<kc-prompt-input
  placeholder="Generating response..."
  loading={isStreaming}
  disabled={isStreaming}
/>`,

    angular: `import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-prompt',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <kc-prompt-input
      placeholder="Generating response..."
      [loading]="isStreaming"
      [disabled]="isStreaming"
    ></kc-prompt-input>
  \`,
})
export class PromptComponent {
  isStreaming = true;
}`,

    solid: `import { PromptInput, PromptInputTextarea, PromptInputActions, Loader, Button } from '@kitn.ai/chat';
import { Square } from 'lucide-solid';

export function Prompt() {
  return (
    <PromptInput disabled isLoading>
      <PromptInputTextarea placeholder="Generating response..." />
      <PromptInputActions class="justify-between">
        <div class="flex items-center gap-2">
          <Loader variant="typing" size="sm" />
          <span class="text-xs text-foreground">Generating...</span>
        </div>
        <Button variant="outline" size="icon-sm" class="rounded-full" aria-label="Stop">
          <Square class="size-3" />
        </Button>
      </PromptInputActions>
    </PromptInput>
  );
}`,
  },
};

/** With Model Selector — a model picker alongside the input. */
const modelSelector: StoryUsage = {
  intro:
    'Put a model picker beside the input. `<kc-prompt-input>` doesn\'t expose a model-switcher prop — pair it with the standalone `<kc-model-switcher>` element (bind `models` and `currentModel`, handle `modelchange`) and lay them out side by side. (The demo composes the SolidJS `PromptInput` + `ModelSwitcher` primitives in the actions row.)',
  snippets: {
    html: `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/chat/dist/kitn-chat.es.js';
</script>

<div style="display:flex; flex-direction:column; gap:0.5rem">
  <kc-model-switcher id="models"></kc-model-switcher>
  <kc-prompt-input id="prompt" placeholder="Ask anything..."></kc-prompt-input>
</div>

<script type="module">
  const models = document.getElementById('models');
  // Arrays must be set as a PROPERTY.
  models.models = [
    { id: 'claude-4', name: 'Claude 4 Opus', provider: 'Anthropic' },
    { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic' },
    { id: 'gemini-2', name: 'Gemini 2.5 Pro', provider: 'Google' },
  ];
  models.currentModel = 'claude-4';
  models.addEventListener('kc-model-change', (e) => console.log(e.detail));

  const prompt = document.getElementById('prompt');
  prompt.addEventListener('kc-submit', (e) => console.log(e.detail.value));
</script>`,

    react: `import { useState } from 'react';
import { PromptInput, ModelSwitcher } from '@kitn.ai/chat/react';

const MODELS = [
  { id: 'claude-4', name: 'Claude 4 Opus', provider: 'Anthropic' },
  { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic' },
  { id: 'gemini-2', name: 'Gemini 2.5 Pro', provider: 'Google' },
];

export function Prompt() {
  const [modelId, setModelId] = useState('claude-4');
  return (
    <div className="flex flex-col gap-2">
      <ModelSwitcher models={MODELS} currentModel={modelId} onModelChange={(e) => setModelId(e.detail.modelId)} />
      <PromptInput placeholder="Ask anything..." onSubmit={(e) => console.log(e.detail.value)} />
    </div>
  );
}`,

    vue: `<script setup>
import '@kitn.ai/chat/elements';
import { ref } from 'vue';

const modelId = ref('claude-4');
const models = [
  { id: 'claude-4', name: 'Claude 4 Opus', provider: 'Anthropic' },
  { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic' },
  { id: 'gemini-2', name: 'Gemini 2.5 Pro', provider: 'Google' },
];
function onModelChange(e) { modelId.value = e.detail.modelId; }
</script>

<template>
  <div style="display:flex; flex-direction:column; gap:0.5rem">
    <kc-model-switcher :models.prop="models" :current-model="modelId" @kc-model-change="onModelChange" />
    <kc-prompt-input placeholder="Ask anything..." @kc-submit="(e) => console.log(e.detail.value)" />
  </div>
</template>`,

    svelte: `<script>
  import '@kitn.ai/chat/elements';

  let el;
  let modelId = 'claude-4';
  const models = [
    { id: 'claude-4', name: 'Claude 4 Opus', provider: 'Anthropic' },
    { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic' },
    { id: 'gemini-2', name: 'Gemini 2.5 Pro', provider: 'Google' },
  ];
  // Arrays must be set as a property.
  $: if (el) el.models = models;
  function onModelChange(e) { modelId = e.detail.modelId; }
</script>

<div style="display:flex; flex-direction:column; gap:0.5rem">
  <kc-model-switcher bind:this={el} current-model={modelId} on:kc-model-change={onModelChange} />
  <kc-prompt-input placeholder="Ask anything..." on:kc-submit={(e) => console.log(e.detail.value)} />
</div>`,

    angular: `import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-prompt',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <div style="display:flex; flex-direction:column; gap:0.5rem">
      <kc-model-switcher [models]="models" [currentModel]="modelId" (kc-model-change)="onModelChange($event)"></kc-model-switcher>
      <kc-prompt-input placeholder="Ask anything..." (kc-submit)="onSubmit($event)"></kc-prompt-input>
    </div>
  \`,
})
export class PromptComponent {
  modelId = 'claude-4';
  // [models] binds the array as a property.
  models = [
    { id: 'claude-4', name: 'Claude 4 Opus', provider: 'Anthropic' },
    { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic' },
    { id: 'gemini-2', name: 'Gemini 2.5 Pro', provider: 'Google' },
  ];
  onModelChange(e: CustomEvent<{ modelId: string }>) { this.modelId = e.detail.modelId; }
  onSubmit(e: CustomEvent<{ value: string }>) { console.log(e.detail.value); }
}`,

    solid: `import { createSignal } from 'solid-js';
import { PromptInput, PromptInputTextarea, PromptInputActions, ModelSwitcher, Button } from '@kitn.ai/chat';
import type { ModelOption } from '@kitn.ai/chat';
import { ArrowUp, Paperclip } from 'lucide-solid';

const MODELS: ModelOption[] = [
  { id: 'claude-4', name: 'Claude 4 Opus', provider: 'Anthropic' },
  { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic' },
  { id: 'gemini-2', name: 'Gemini 2.5 Pro', provider: 'Google' },
];

export function Prompt() {
  const [value, setValue] = createSignal('');
  const [modelId, setModelId] = createSignal('claude-4');
  return (
    <PromptInput value={value()} onValueChange={setValue} onSubmit={() => setValue('')}>
      <PromptInputTextarea placeholder="Ask anything..." />
      <PromptInputActions class="justify-between">
        <ModelSwitcher models={MODELS} currentModelId={modelId()} onModelChange={setModelId} />
        <div class="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Attach file"><Paperclip class="size-4 text-muted-foreground" /></Button>
          <Button variant="default" size="icon-sm" class="rounded-full" disabled={!value()} aria-label="Send message">
            <ArrowUp class="size-4" />
          </Button>
        </div>
      </PromptInputActions>
    </PromptInput>
  );
}`,
  },
};

/**
 * Example: Prompt Input Variants — a complete prompt box (text, suggestions,
 * action buttons, streaming, model selector) built from the `kc-prompt-input`
 * element. Per-story: the Usage tab shows the snippet for the story you're on;
 * the example-level fields below are the fallback.
 */
const promptInputVariants: ExampleUsage = {
  title: 'Examples/Prompt Input Variants',
  ...basic, // example-level fallback = the headline "Basic Input"
  stories: {
    'Basic Input': basic,
    'With Suggestion Chips': suggestions,
    'With Action Buttons': actionButtons,
    'Streaming / Loading State': streaming,
    'With Model Selector': modelSelector,
  },
};

export default promptInputVariants;
