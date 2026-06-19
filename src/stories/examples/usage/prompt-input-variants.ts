import type { ExampleUsage, StoryUsage } from './types';

/** Basic Input — a text box with a send button that enables once you type. */
const basic: StoryUsage = {
  intro:
    'A complete prompt box from one element. `<kai-prompt-input>` renders the textarea and send button; bind `value`, handle `valuechange` on every keystroke, and `submit` (Enter or the send button) gives you `{ value, attachments }`. (The live demo composes the SolidJS `PromptInput` primitives.)',
  snippets: {
    html: `<!-- Register the elements once (CDN or bundler) -->
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kitn-chat.es.js';
</script>

<kai-prompt-input id="prompt" placeholder="Ask anything..."></kai-prompt-input>

<script type="module">
  const prompt = document.getElementById('prompt');
  let value = '';
  prompt.addEventListener('kai-value-change', (e) => {
    value = e.detail.value; // track on every keystroke
  });
  prompt.addEventListener('kai-submit', (e) => {
    const { value, attachments } = e.detail;
    console.log(value, attachments);
  });
</script>`,

    react: `import { useState } from 'react';
import { PromptInput } from '@kitn.ai/ui/react';

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
import '@kitn.ai/ui/elements'; // register once (e.g. in main.ts)
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
  <kai-prompt-input
    placeholder="Ask anything..."
    @kai-value-change="onValueChange"
    @kai-submit="onSubmit"
  />
</template>`,

    svelte: `<script>
  import '@kitn.ai/ui/elements'; // register once

  let value = '';
  function onValueChange(e) {
    value = e.detail.value; // track on every keystroke
  }
  function onSubmit(e) {
    const { value, attachments } = e.detail;
    console.log(value, attachments);
  }
</script>

<kai-prompt-input
  placeholder="Ask anything..."
  on:kai-value-change={onValueChange}
  on:kai-submit={onSubmit}
/>`,

    angular: `// main.ts: import '@kitn.ai/ui/elements' before bootstrapApplication,
// and add CUSTOM_ELEMENTS_SCHEMA to the component/module.
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-prompt',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <kai-prompt-input
      placeholder="Ask anything..."
      (kai-value-change)="onValueChange($event)"
      (kai-submit)="onSubmit($event)"
    ></kai-prompt-input>
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
import { PromptInput, PromptInputTextarea, PromptInputActions, Button } from '@kitn.ai/ui';
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
    'Show starter prompts above the input. Pass a `suggestions` array (as a PROPERTY) and pick `suggestionMode` — `"submit"` (default) sends the prompt immediately, `"fill"` just drops it into the box and fires `kai-suggestion-click`. (The demo groups its chips with the SolidJS `PromptSuggestion` primitive, which the element renders as one flat row.)',
  snippets: {
    html: `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kitn-chat.es.js';
</script>

<kai-prompt-input
  id="prompt"
  placeholder="Ask about this document..."
  suggestion-mode="fill"
></kai-prompt-input>

<script type="module">
  const prompt = document.getElementById('prompt');
  // Arrays must be set as a PROPERTY (attributes only take strings).
  prompt.suggestions = [
    'Summarize this document',
    'What are the key takeaways?',
    'Create an outline',
  ];
  prompt.addEventListener('kai-suggestion-click', (e) => {
    console.log(e.detail.value); // fires when suggestion-mode="fill"
  });
  prompt.addEventListener('kai-submit', (e) => console.log(e.detail.value));
</script>`,

    react: `import { PromptInput } from '@kitn.ai/ui/react';

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
import '@kitn.ai/ui/elements';

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
  <kai-prompt-input
    placeholder="Ask about this document..."
    :suggestions.prop="suggestions"
    suggestion-mode="fill"
    @kai-suggestion-click="onSuggestionClick"
    @kai-submit="onSubmit"
  />
</template>`,

    svelte: `<script>
  import '@kitn.ai/ui/elements';

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

<kai-prompt-input
  bind:this={el}
  placeholder="Ask about this document..."
  suggestion-mode="fill"
  on:kai-suggestion-click={onSuggestionClick}
  on:kai-submit={onSubmit}
/>`,

    angular: `import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-prompt',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <kai-prompt-input
      placeholder="Ask about this document..."
      [suggestions]="suggestions"
      suggestion-mode="fill"
      (kai-suggestion-click)="onSuggestionClick($event)"
      (kai-submit)="onSubmit($event)"
    ></kai-prompt-input>
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
import { PromptInput, PromptInputTextarea, PromptInputActions, PromptSuggestion, Button } from '@kitn.ai/ui';
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
    'Add toolbar buttons beside the input. `<kai-prompt-input>` has built-in Search and Voice buttons — enable `search` and `voice`, then handle the `search` / `voice` events; attaching files is built in (the paperclip, emitted on `submit` as `attachments`). For extra custom buttons, place `<kai-action id icon tooltip>` children inside `<kai-prompt-input>` — the element reads them as invisible data carriers and renders a ghost icon button per entry in the left toolbar; clicking fires a `kai-toolbar-action` CustomEvent with `detail.action` = the action id. This is the same `<kai-action>` descriptor element that `<kai-message>` uses (composition symmetry). The Solid tab shows a custom Sparkles button composed directly with the `PromptInput` primitives (the full-control equivalent).',
  snippets: {
    html: `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kitn-chat.es.js';
</script>

<!-- Built-in buttons: search (Globe) and voice (Mic). -->
<!-- Custom toolbar buttons: compose <kai-action> children. -->
<kai-prompt-input id="prompt" placeholder="Message..." search voice>
  <kai-action id="attach" icon="paperclip" tooltip="Attach"></kai-action>
  <kai-action id="sparkles" icon="star" tooltip="AI suggestions"></kai-action>
</kai-prompt-input>

<script type="module">
  const prompt = document.getElementById('prompt');
  prompt.addEventListener('kai-search', () => console.log('search clicked'));
  prompt.addEventListener('kai-voice', () => console.log('voice clicked'));
  // kai-toolbar-action fires when any <kai-action> toolbar button is clicked.
  prompt.addEventListener('kai-toolbar-action', (e) => console.log('toolbar action:', e.detail.action));
  prompt.addEventListener('kai-submit', (e) => {
    const { value, attachments } = e.detail; // attachments from the paperclip
    console.log(value, attachments);
  });
</script>`,

    react: `import { PromptInput } from '@kitn.ai/ui/react';

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
import '@kitn.ai/ui/elements';
function onSearch() { console.log('search clicked'); }
function onVoice() { console.log('voice clicked'); }
function onSubmit(e) {
  const { value, attachments } = e.detail; // attachments from the paperclip
  console.log(value, attachments);
}
</script>

<template>
  <kai-prompt-input
    placeholder="Message..."
    search
    voice
    @kai-search="onSearch"
    @kai-voice="onVoice"
    @kai-submit="onSubmit"
  />
</template>`,

    svelte: `<script>
  import '@kitn.ai/ui/elements';
  function onSearch() { console.log('search clicked'); }
  function onVoice() { console.log('voice clicked'); }
  function onSubmit(e) {
    const { value, attachments } = e.detail; // attachments from the paperclip
    console.log(value, attachments);
  }
</script>

<kai-prompt-input
  placeholder="Message..."
  search
  voice
  on:kai-search={onSearch}
  on:kai-voice={onVoice}
  on:kai-submit={onSubmit}
/>`,

    angular: `import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-prompt',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <kai-prompt-input
      placeholder="Message..."
      [search]="true"
      [voice]="true"
      (kai-search)="onSearch()"
      (kai-voice)="onVoice()"
      (kai-submit)="onSubmit($event)"
    ></kai-prompt-input>
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
import { PromptInput, PromptInputTextarea, PromptInputActions, Button } from '@kitn.ai/ui';
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
          {/* Sparkles: a custom button composed directly. For the element, use
              <kai-action id="sparkles" icon="star" tooltip="AI suggestions"> instead. */}
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
    'Block input while a reply streams. Set `loading` to show the streaming state and stop accepting submits, and `disabled` to make the box fully non-interactive. Add `stoppable` to get a built-in Stop button that fires `kai-stop` — listen for that event and call `controller.abort()` on your fetch/SSE. (The demo composes the SolidJS `PromptInput` + `Loader` primitives to show the typing/dots indicators and a stop button.)',
  snippets: {
    html: `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kitn-chat.es.js';
</script>

<kai-prompt-input id="prompt" placeholder="Generating response..." loading disabled></kai-prompt-input>

<script type="module">
  const prompt = document.getElementById('prompt');
  // When the reply finishes, clear the flags to re-enable.
  function onDone() {
    prompt.loading = false;
    prompt.disabled = false;
  }
</script>`,

    react: `import { PromptInput } from '@kitn.ai/ui/react';

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
import '@kitn.ai/ui/elements';
import { ref } from 'vue';
const isStreaming = ref(true);
</script>

<template>
  <kai-prompt-input
    placeholder="Generating response..."
    :loading="isStreaming"
    :disabled="isStreaming"
  />
</template>`,

    svelte: `<script>
  import '@kitn.ai/ui/elements';
  let isStreaming = true;
</script>

<kai-prompt-input
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
    <kai-prompt-input
      placeholder="Generating response..."
      [loading]="isStreaming"
      [disabled]="isStreaming"
    ></kai-prompt-input>
  \`,
})
export class PromptComponent {
  isStreaming = true;
}`,

    solid: `import { PromptInput, PromptInputTextarea, PromptInputActions, Loader, Button } from '@kitn.ai/ui';
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

/** With Model Selector — a model picker alongside the input.
 *
 * INSIGHT: `ModelSwitcher` only renders when `models.length > 1`. Passing a
 * single-item array hides it entirely — so the render path for free/pro tiers
 * (single model) is already handled without conditional code.
 */
const modelSelector: StoryUsage = {
  intro:
    'Put a model picker beside the input. `<kai-prompt-input>` doesn\'t expose a model-switcher prop — pair it with the standalone `<kai-model-switcher>` element (bind `models` and `currentModel`, handle `modelchange`) and lay them out side by side. (The demo composes the SolidJS `PromptInput` + `ModelSwitcher` primitives in the actions row.)',
  snippets: {
    html: `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kitn-chat.es.js';
</script>

<div style="display:flex; flex-direction:column; gap:0.5rem">
  <kai-model-switcher id="models"></kai-model-switcher>
  <kai-prompt-input id="prompt" placeholder="Ask anything..."></kai-prompt-input>
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
  models.addEventListener('kai-model-change', (e) => console.log(e.detail));

  const prompt = document.getElementById('prompt');
  prompt.addEventListener('kai-submit', (e) => console.log(e.detail.value));
</script>`,

    react: `import { useState } from 'react';
import { PromptInput, ModelSwitcher } from '@kitn.ai/ui/react';

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
import '@kitn.ai/ui/elements';
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
    <kai-model-switcher :models.prop="models" :current-model="modelId" @kai-model-change="onModelChange" />
    <kai-prompt-input placeholder="Ask anything..." @kai-submit="(e) => console.log(e.detail.value)" />
  </div>
</template>`,

    svelte: `<script>
  import '@kitn.ai/ui/elements';

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
  <kai-model-switcher bind:this={el} current-model={modelId} on:kai-model-change={onModelChange} />
  <kai-prompt-input placeholder="Ask anything..." on:kai-submit={(e) => console.log(e.detail.value)} />
</div>`,

    angular: `import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-prompt',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <div style="display:flex; flex-direction:column; gap:0.5rem">
      <kai-model-switcher [models]="models" [currentModel]="modelId" (kai-model-change)="onModelChange($event)"></kai-model-switcher>
      <kai-prompt-input placeholder="Ask anything..." (kai-submit)="onSubmit($event)"></kai-prompt-input>
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
import { PromptInput, PromptInputTextarea, PromptInputActions, ModelSwitcher, Button } from '@kitn.ai/ui';
import type { ModelOption } from '@kitn.ai/ui';
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

/** With File Attachments — staged files rendered above the textarea. */
const withFileAttachments: StoryUsage = {
  intro:
    'The `kai-prompt-input` element has a built-in paperclip: clicking it opens a file picker, previews appear above the textarea (removable chips), and `kai-submit` always carries `{ value, attachments: AttachmentData[] }` — even when the array is empty. To pre-populate staged files, set `prompt.attachments = [...]` as a JS **property** after mount; the element then manages its own attachment state from there. The Solid demo wires the `Attachments`/`Attachment`/`AttachmentPreview`/`AttachmentInfo`/`AttachmentRemove` primitives manually for full control — use the element if you want the paperclip UX for free.',
  snippets: {
    html: `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kitn-chat.es.js';
</script>

<!-- The element renders the paperclip, file picker, and removable chips automatically. -->
<kai-prompt-input id="prompt" placeholder="Describe or ask about the attached files..."></kai-prompt-input>

<script type="module">
  const prompt = document.getElementById('prompt');
  // Pre-populate staged files (must be a JS property, not an attribute).
  prompt.attachments = [
    { id: 'a1', type: 'file', filename: 'architecture.pdf', mediaType: 'application/pdf' },
    { id: 'a2', type: 'file', filename: 'screenshot.png', mediaType: 'image/png' },
  ];
  // kai-submit always includes the current staged attachments.
  prompt.addEventListener('kai-submit', (e) => {
    const { value, attachments } = e.detail;
    // attachments is always AttachmentData[] — empty array when no files staged.
    console.log(value, attachments);
  });
</script>`,

    react: `import { useRef } from 'react';
import { PromptInput } from '@kitn.ai/ui/react';

const SEED = [
  { id: 'a1', type: 'file', filename: 'architecture.pdf', mediaType: 'application/pdf' },
  { id: 'a2', type: 'file', filename: 'screenshot.png', mediaType: 'image/png' },
];

export function Prompt() {
  const ref = useRef(null);

  // Set the attachments property after mount.
  // useEffect(() => { if (ref.current) ref.current.attachments = SEED; }, []);

  return (
    <PromptInput
      ref={ref}
      placeholder="Describe or ask about the attached files..."
      onSubmit={(e) => {
        // attachments is always AttachmentData[] — may be empty
        const { value, attachments } = e.detail;
        console.log(value, attachments);
      }}
    />
  );
}`,

    vue: `<script setup>
import '@kitn.ai/ui/elements';
import { ref, onMounted } from 'vue';

const promptEl = ref(null);

// Set the attachments property after mount.
onMounted(() => {
  if (promptEl.value) {
    promptEl.value.attachments = [
      { id: 'a1', type: 'file', filename: 'architecture.pdf', mediaType: 'application/pdf' },
    ];
  }
});

function onSubmit(e) {
  const { value, attachments } = e.detail; // attachments always present
  console.log(value, attachments);
}
</script>

<template>
  <kai-prompt-input
    ref="promptEl"
    placeholder="Describe or ask about the attached files..."
    @kai-submit="onSubmit"
  />
</template>`,

    svelte: `<script>
  import '@kitn.ai/ui/elements';
  import { onMount } from 'svelte';

  let promptEl;
  // Set the attachments property after mount.
  onMount(() => {
    promptEl.attachments = [
      { id: 'a1', type: 'file', filename: 'architecture.pdf', mediaType: 'application/pdf' },
    ];
  });

  function onSubmit(e) {
    const { value, attachments } = e.detail; // attachments always present
    console.log(value, attachments);
  }
</script>

<kai-prompt-input
  bind:this={promptEl}
  placeholder="Describe or ask about the attached files..."
  on:kai-submit={onSubmit}
/>`,

    angular: `import { Component, CUSTOM_ELEMENTS_SCHEMA, AfterViewInit, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-prompt',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <kai-prompt-input
      #prompt
      placeholder="Describe or ask about the attached files..."
      (kai-submit)="onSubmit($event)"
    ></kai-prompt-input>
  \`,
})
export class PromptComponent implements AfterViewInit {
  @ViewChild('prompt') promptRef!: ElementRef;

  // Set attachments as a property after mount.
  ngAfterViewInit() {
    this.promptRef.nativeElement.attachments = [
      { id: 'a1', type: 'file', filename: 'architecture.pdf', mediaType: 'application/pdf' },
    ];
  }

  onSubmit(e: CustomEvent<{ value: string; attachments: unknown[] }>) {
    const { value, attachments } = e.detail; // attachments always present
    console.log(value, attachments);
  }
}`,

    solid: `import { createSignal, For, Show } from 'solid-js';
import {
  PromptInput, PromptInputTextarea, PromptInputActions, Button,
  Attachments, Attachment, AttachmentPreview, AttachmentInfo, AttachmentRemove,
} from '@kitn.ai/ui';
import type { AttachmentData } from '@kitn.ai/ui';
import { ArrowUp, Paperclip } from 'lucide-solid';

// The Solid PromptInput primitives don't wire the paperclip for you — that's
// done by DefaultPromptInput (used internally by the kai-prompt-input element).
// Compose the Attachments primitives manually when you need full control.
export function Prompt() {
  const [value, setValue] = createSignal('');
  const [attachments, setAttachments] = createSignal<AttachmentData[]>([
    { id: 'a1', type: 'file', filename: 'architecture.pdf', mediaType: 'application/pdf' },
    { id: 'a2', type: 'file', filename: 'screenshot.png', mediaType: 'image/png' },
  ]);
  let fileInput: HTMLInputElement | undefined;

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    setAttachments((prev) => [
      ...prev,
      ...Array.from(files).map((f) => ({
        id: crypto.randomUUID(),
        type: 'file' as const,
        filename: f.name,
        mediaType: f.type || undefined,
        url: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
      })),
    ]);
  };

  const removeAttachment = (id: string) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  const handleSubmit = () => {
    // kai-submit emits { value, attachments } — mirror that shape here
    console.log('submit', { value: value(), attachments: attachments() });
    setValue('');
    setAttachments([]);
  };

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        multiple
        class="hidden"
        onChange={(e) => { addFiles(e.currentTarget.files); e.currentTarget.value = ''; }}
      />
      <PromptInput value={value()} onValueChange={setValue} onSubmit={handleSubmit}>
        <Show when={attachments().length > 0}>
          <div class="px-3 pt-3">
            <Attachments variant="inline">
              <For each={attachments()}>
                {(att) => (
                  <Attachment data={att} onRemove={() => removeAttachment(att.id)}>
                    <AttachmentPreview />
                    <AttachmentInfo />
                    <AttachmentRemove />
                  </Attachment>
                )}
              </For>
            </Attachments>
          </div>
        </Show>
        <PromptInputTextarea placeholder="Describe or ask about the attached files..." class="pt-3 pl-4" />
        <PromptInputActions class="justify-between">
          <Button variant="ghost" size="icon-sm" aria-label="Attach file" onClick={() => fileInput?.click()}>
            <Paperclip class="size-4 text-muted-foreground" />
          </Button>
          {/* send enabled when there's text OR staged attachments */}
          <Button
            variant="default"
            size="icon-sm"
            class="rounded-full"
            disabled={!value() && attachments().length === 0}
            aria-label="Send message"
          >
            <ArrowUp class="size-4" />
          </Button>
        </PromptInputActions>
      </PromptInput>
    </>
  );
}`,
  },
};

/** Full Example — everything combined: model switcher, grouped suggestions,
 *  streaming state with a Stop button, and a send button that enables on input.
 *
 *  GOTCHAS compiled from the source:
 *  - Submit payload: `kai-submit` always emits `{ value: string; attachments: AttachmentData[] }`.
 *    Even when no files are staged, `attachments` is an empty array — never `undefined`.
 *  - Enter vs Shift+Enter: `PromptInputTextarea` intercepts `Enter` (no Shift) and calls
 *    `onSubmit`; `Shift+Enter` inserts a newline. This is wired at the primitive level
 *    (`handleKeyDown` in prompt-input.tsx line 147), not configurable.
 *  - `loading` vs `disabled` on the element: `loading` alone blocks submit but keeps the
 *    box visually interactive; `disabled` makes it fully non-interactive (opacity + no focus).
 *    Use both together for the streaming state.
 *  - `isLoading` on the Solid primitive vs `loading` on the element: the Solid
 *    `PromptInput` prop is `isLoading`; the web component attribute is `loading` (kebab).
 *  - Stop button: add `stoppable` to `kai-prompt-input` and listen for `kai-stop` — the element
 *    fires it when the Stop button is clicked. Call `controller.abort()` in your handler to
 *    cancel the fetch/SSE. When composing Solid primitives, wire the Square button yourself
 *    (see FullExample). The element does the toggling for you; the consumer still owns the abort.
 *  - `ModelSwitcher` only renders when `models.length > 1` — a single-model list hides it.
 *  - `suggestions` is a JS property, not an attribute — arrays must be set on the element
 *    reference (not via an HTML attribute string). In the web-component tab note the
 *    `.prop` binding for Vue, `$:` for Svelte, `[prop]` for Angular.
 *  - `suggestionMode="submit"` (default) immediately dispatches `kai-submit` when a chip
 *    is clicked; `suggestionMode="fill"` drops the text into the box and fires
 *    `kai-suggestion-click` instead (so the user can edit before sending).
 */
const fullExample: StoryUsage = {
  intro:
    'Everything combined: model switcher, grouped suggestion chips, streaming state (with a Stop button), and a send button that enables once you type. Simulates the idle → streaming → idle loop you\'d wire to a real fetch/SSE call. Key gotchas: `kai-submit` always emits `{ value, attachments }` (attachments may be empty); Enter submits, Shift+Enter newlines; `loading` blocks submit while `disabled` kills focus too — use both while streaming; add `stoppable` to enable the built-in Stop button — it fires `kai-stop` when clicked; call `controller.abort()` in your handler to cancel the stream. When composing Solid primitives (the `PromptInput` + `PromptInputActions` pattern), wire the Square button yourself as shown in the Full Example story.',
  snippets: {
    html: `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kitn-chat.es.js';
</script>

<div style="max-width:42rem; padding:1rem; display:flex; flex-direction:column; gap:1rem">
  <kai-model-switcher id="models"></kai-model-switcher>
  <kai-prompt-input id="prompt" placeholder="Ask anything..." suggestion-mode="fill"></kai-prompt-input>
  <button id="stop" style="display:none">Stop</button>
</div>

<script type="module">
  const models = document.getElementById('models');
  const prompt = document.getElementById('prompt');
  const stopBtn = document.getElementById('stop');
  let controller;

  // Arrays must be set as JS properties, not attributes.
  models.models = [
    { id: 'claude-4-opus', name: 'Claude 4 Opus', provider: 'Anthropic' },
    { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic' },
  ];
  models.currentModel = 'claude-4-opus';
  models.addEventListener('kai-model-change', (e) => { models.currentModel = e.detail.modelId; });

  prompt.suggestions = ['Summarize this document', 'What are the key takeaways?'];
  // suggestion-mode="fill" lets the user edit before submitting.
  prompt.addEventListener('kai-suggestion-click', (e) => {
    // User clicked a chip: value is now in the box; wait for them to hit Enter.
  });

  prompt.addEventListener('kai-submit', async (e) => {
    const { value, attachments } = e.detail; // attachments always present (may be [])
    prompt.loading = true;
    prompt.disabled = true;
    stopBtn.style.display = 'inline';

    controller = new AbortController();
    try {
      // Replace with your real streaming fetch:
      await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ value }), signal: controller.signal });
    } catch (err) {
      if (err.name !== 'AbortError') throw err;
    } finally {
      prompt.loading = false;
      prompt.disabled = false;
      stopBtn.style.display = 'none';
    }
  });

  // With stoppable set, kai-stop fires when the built-in Stop button is clicked.
  // prompt.addEventListener('kai-stop', () => controller?.abort());
  // OR compose your own stop button outside the element:
  stopBtn.addEventListener('click', () => controller?.abort());
</script>`,

    react: `import { useState, useRef } from 'react';
import { PromptInput, ModelSwitcher } from '@kitn.ai/ui/react';

const MODELS = [
  { id: 'claude-4-opus', name: 'Claude 4 Opus', provider: 'Anthropic' },
  { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic' },
];
const SUGGESTIONS = ['Summarize this document', 'What are the key takeaways?'];

export function Prompt() {
  const [modelId, setModelId] = useState('claude-4-opus');
  const [streaming, setStreaming] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const handleSubmit = async (e: CustomEvent<{ value: string; attachments: unknown[] }>) => {
    // attachments always present, may be empty array
    const { value, attachments } = e.detail;
    setStreaming(true);
    controllerRef.current = new AbortController();
    try {
      await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ value, modelId, attachments }),
        signal: controllerRef.current.signal,
      });
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') throw err;
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '42rem' }}>
      <ModelSwitcher
        models={MODELS}
        currentModel={modelId}
        onModelChange={(e) => setModelId(e.detail.modelId)}
      />
      {/* suggestions passed as array property; suggestionMode="fill" lets user edit first */}
      <PromptInput
        suggestions={SUGGESTIONS}
        suggestionMode="fill"
        loading={streaming}
        disabled={streaming}
        placeholder={streaming ? 'Generating...' : 'Ask anything...'}
        onSubmit={handleSubmit}
      />
      {streaming && (
        {/* With stoppable + onStop, kai-prompt-input renders the Stop button for you.
            Here we compose it manually for illustration. */}
        <button onClick={() => controllerRef.current?.abort()}>Stop</button>
      )}
    </div>
  );
}`,

    vue: `<script setup>
import '@kitn.ai/ui/elements';
import { ref } from 'vue';

const MODELS = [
  { id: 'claude-4-opus', name: 'Claude 4 Opus', provider: 'Anthropic' },
  { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic' },
];
const SUGGESTIONS = ['Summarize this document', 'What are the key takeaways?'];

const modelId = ref('claude-4-opus');
const streaming = ref(false);
let controller = null;

function onModelChange(e) { modelId.value = e.detail.modelId; }

async function onSubmit(e) {
  const { value, attachments } = e.detail; // attachments always present
  streaming.value = true;
  controller = new AbortController();
  try {
    await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ value, modelId: modelId.value, attachments }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name !== 'AbortError') throw err;
  } finally {
    streaming.value = false;
  }
}

function stop() { controller?.abort(); }
</script>

<template>
  <div style="display:flex; flex-direction:column; gap:1rem; max-width:42rem">
    <kai-model-switcher
      :models.prop="MODELS"
      :current-model="modelId"
      @kai-model-change="onModelChange"
    />
    <!-- suggestion-mode="fill" lets the user edit before sending -->
    <kai-prompt-input
      :suggestions.prop="SUGGESTIONS"
      suggestion-mode="fill"
      :loading="streaming"
      :disabled="streaming"
      :placeholder="streaming ? 'Generating...' : 'Ask anything...'"
      @kai-submit="onSubmit"
    />
    <!-- Add stoppable + listen for kai-stop to use the built-in Stop button.
         Here we compose it manually outside the element for illustration. -->
    <button v-if="streaming" @click="stop">Stop</button>
  </div>
</template>`,

    svelte: `<script>
  import '@kitn.ai/ui/elements';

  const MODELS = [
    { id: 'claude-4-opus', name: 'Claude 4 Opus', provider: 'Anthropic' },
    { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic' },
  ];
  const SUGGESTIONS = ['Summarize this document', 'What are the key takeaways?'];

  let modelEl;
  let modelId = 'claude-4-opus';
  let streaming = false;
  let controller;

  // Arrays must be set as properties (not attributes).
  $: if (modelEl) { modelEl.models = MODELS; modelEl.currentModel = modelId; }

  function onModelChange(e) { modelId = e.detail.modelId; }

  async function onSubmit(e) {
    const { value, attachments } = e.detail; // attachments always present
    streaming = true;
    controller = new AbortController();
    try {
      await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ value, modelId, attachments }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err.name !== 'AbortError') throw err;
    } finally {
      streaming = false;
    }
  }

  function stop() { controller?.abort(); }
</script>

<div style="display:flex; flex-direction:column; gap:1rem; max-width:42rem">
  <kai-model-switcher bind:this={modelEl} on:kai-model-change={onModelChange} />
  <!-- suggestion-mode="fill" lets the user edit before sending -->
  <kai-prompt-input
    suggestions={SUGGESTIONS}
    suggestion-mode="fill"
    loading={streaming}
    disabled={streaming}
    placeholder={streaming ? 'Generating...' : 'Ask anything...'}
    on:kai-submit={onSubmit}
  />
  <!-- Add stoppable + listen for kai-stop to use the built-in Stop button.
       Here we compose it manually outside the element for illustration. -->
  {#if streaming}
    <button on:click={stop}>Stop</button>
  {/if}
</div>`,

    angular: `import { Component, CUSTOM_ELEMENTS_SCHEMA, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';

const MODELS = [
  { id: 'claude-4-opus', name: 'Claude 4 Opus', provider: 'Anthropic' },
  { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic' },
];
const SUGGESTIONS = ['Summarize this document', 'What are the key takeaways?'];

@Component({
  selector: 'app-prompt',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <div style="display:flex; flex-direction:column; gap:1rem; max-width:42rem">
      <kai-model-switcher
        #models
        [models]="MODELS"
        [currentModel]="modelId()"
        (kai-model-change)="onModelChange($event)"
      ></kai-model-switcher>
      <!-- suggestion-mode="fill" lets the user edit before sending -->
      <kai-prompt-input
        #prompt
        [suggestions]="SUGGESTIONS"
        suggestion-mode="fill"
        [loading]="streaming()"
        [disabled]="streaming()"
        [placeholder]="streaming() ? 'Generating...' : 'Ask anything...'"
        (kai-submit)="onSubmit($event)"
      ></kai-prompt-input>
      <!-- Stop is NOT built in — compose it yourself -->
      @if (streaming()) {
        <button (click)="stop()">Stop</button>
      }
    </div>
  \`,
})
export class PromptComponent {
  MODELS = MODELS;
  SUGGESTIONS = SUGGESTIONS;
  modelId = signal('claude-4-opus');
  streaming = signal(false);
  private controller: AbortController | null = null;

  onModelChange(e: CustomEvent<{ modelId: string }>) { this.modelId.set(e.detail.modelId); }

  async onSubmit(e: CustomEvent<{ value: string; attachments: unknown[] }>) {
    const { value, attachments } = e.detail; // attachments always present
    this.streaming.set(true);
    this.controller = new AbortController();
    try {
      await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ value, modelId: this.modelId(), attachments }),
        signal: this.controller.signal,
      });
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') throw err;
    } finally {
      this.streaming.set(false);
    }
  }

  stop() { this.controller?.abort(); }
}`,

    solid: `import { createSignal, For, Show } from 'solid-js';
import { PromptInput, PromptInputTextarea, PromptInputActions, PromptSuggestion, ModelSwitcher, Loader, Button } from '@kitn.ai/ui';
import type { ModelOption } from '@kitn.ai/ui';
import { ArrowUp, Square } from 'lucide-solid';

const MODELS: ModelOption[] = [
  { id: 'claude-4-opus', name: 'Claude 4 Opus', provider: 'Anthropic' },
  { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic' },
];
const SUGGESTION_GROUPS = [
  { label: 'Get started', items: ['Summarize this document', 'What are the key takeaways?'] },
  { label: 'Go deeper', items: ['Compare with similar approaches', 'Find contradictions'] },
];

export function Prompt() {
  const [value, setValue] = createSignal('');
  const [modelId, setModelId] = createSignal('claude-4-opus');
  const [streaming, setStreaming] = createSignal(false);
  let controller: AbortController | undefined;

  const handleSubmit = async () => {
    if (!value().trim()) return;
    setStreaming(true);
    setValue('');
    controller = new AbortController();
    try {
      // Replace with your real SSE / streaming fetch.
      await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ value: value(), modelId: modelId() }),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') throw err;
    } finally {
      setStreaming(false);
    }
  };

  const handleStop = () => controller?.abort();

  return (
    <div class="flex flex-col gap-4 max-w-2xl">
      <Show when={!streaming()}>
        <For each={SUGGESTION_GROUPS}>
          {(group) => (
            <div class="space-y-2">
              <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">{group.label}</span>
              <div class="flex flex-wrap gap-2">
                <For each={group.items}>
                  {/* suggestionMode="fill" (default "submit") — here we fill manually */}
                  {(item) => <PromptSuggestion onClick={() => setValue(item)}>{item}</PromptSuggestion>}
                </For>
              </div>
            </div>
          )}
        </For>
      </Show>
      <PromptInput
        value={value()}
        onValueChange={setValue}
        onSubmit={handleSubmit}
        disabled={streaming()}
        isLoading={streaming()} // Note: Solid prop is isLoading; element attribute is loading
      >
        <PromptInputTextarea placeholder={streaming() ? 'Generating...' : 'Ask anything...'} />
        <PromptInputActions class="justify-between">
          <Show
            when={streaming()}
            fallback={
              // ModelSwitcher renders nothing when models.length <= 1
              <ModelSwitcher models={MODELS} currentModelId={modelId()} onModelChange={setModelId} />
            }
          >
            <div class="flex items-center gap-2">
              <Loader variant="typing" size="sm" />
              <span class="text-xs text-foreground">Generating…</span>
            </div>
          </Show>
          <Show
            when={streaming()}
            fallback={
              // Enter (no Shift) also submits — the send button is a redundant affordance
              <Button variant="default" size="icon-sm" class="rounded-full" disabled={!value()} aria-label="Send message" onClick={handleSubmit}>
                <ArrowUp class="size-4" />
              </Button>
            }
          >
            {/* Solid primitive: wire the Stop button yourself inside PromptInputActions.
                With the kai-prompt-input element, add stoppable and listen for kai-stop instead. */}
            <Button variant="outline" size="icon-sm" class="rounded-full" aria-label="Stop generation" onClick={handleStop}>
              <Square class="size-3" />
            </Button>
          </Show>
        </PromptInputActions>
      </PromptInput>
    </div>
  );
}`,
  },
};

/**
 * Example: Prompt Input Variants — a complete prompt box (text, suggestions,
 * action buttons, streaming, model selector, file attachments) built from the
 * `kai-prompt-input` element. Per-story: the Usage tab shows the snippet for
 * the story you're on; the example-level fields below are the fallback.
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
    'With File Attachments': withFileAttachments,
    'Full Example': fullExample,
  },
};

export default promptInputVariants;
