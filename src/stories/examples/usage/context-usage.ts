import type { ExampleUsage, StoryUsage } from './types';

/**
 * Build the web-component snippets. `<kc-context>` takes a single `context`
 * object PROPERTY (`usedTokens`, `maxTokens`, plus optional input/output/
 * reasoning/cache token counts + `estimatedCost`) and renders the trigger,
 * popover, and breakdown for you.
 *
 * Color thresholds are configurable via numeric properties:
 *   - `warnThreshold`   (default 0.7)  — fraction above which the bar turns yellow
 *   - `dangerThreshold` (default 0.9)  — fraction above which the bar turns red
 *
 * When the computed severity level changes (`ok` → `warn` → `danger` or back),
 * `<kc-context>` fires a **`kc-threshold-change`** CustomEvent with
 * `detail.level` set to `'ok'`, `'warn'`, or `'danger'`.
 *
 * Token counts come from the API response `usage` field after each turn:
 *   inputTokens    ← usage.input_tokens
 *   outputTokens   ← usage.output_tokens
 *   cacheTokens    ← usage.cache_read_input_tokens (+ cache_creation_input_tokens)
 *   reasoningTokens← usage.reasoning_tokens (extended thinking models)
 * estimatedCost is calculated by the app; there is no built-in cost computation.
 */
const htmlSnippet = (obj: string) => `<!-- Register the elements once (CDN or bundler) -->
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/chat/dist/kitn-chat.es.js';
</script>

<kc-context id="ctx"></kc-context>

<script type="module">
  const ctx = document.getElementById('ctx');
  // Set the data as a PROPERTY (not an attribute — attributes only take strings).
  ctx.context = ${obj};
</script>`;

const reactSnippet = (obj: string) => `import { Context } from '@kitn.ai/chat/react';

export function UsageIndicator() {
  return (
    <Context context={${obj}} />
  );
}`;

const vueSnippet = (obj: string) => `<script setup>
import '@kitn.ai/chat/elements'; // register once (e.g. in main.ts)

const context = ${obj};
</script>

<template>
  <!-- .prop binds the object as a property (attributes only take strings). -->
  <kc-context :context.prop="context" />
</template>`;

const svelteSnippet = (obj: string) => `<script>
  import '@kitn.ai/chat/elements'; // register once

  let el;
  const context = ${obj};

  // Objects are set as properties via a binding (attributes only take strings).
  $: if (el) el.context = context;
</script>

<kc-context bind:this={el} />`;

const angularSnippet = (obj: string) => `// main.ts: import '@kitn.ai/chat/elements' before bootstrapApplication,
// and add CUSTOM_ELEMENTS_SCHEMA to the component/module.
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-usage',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <kc-context [context]="context"></kc-context>
  \`,
})
export class UsageComponent {
  context = ${obj};
}`;

/**
 * Low Usage (Green) — early in a conversation; input + output rows only.
 * The threshold colour (green/yellow/red) is derived from used/max by the
 * element: green ≤ 70%, yellow > 70%, red > 90%. Thresholds are hardcoded —
 * there is no `warnThreshold`/`dangerThreshold` prop yet (planned gap).
 */
const lowUsage: StoryUsage = {
  intro:
    "Show how much of the model's context window is used. Pass a `context` object with `usedTokens` / `maxTokens` (plus optional `inputTokens` / `outputTokens` / `estimatedCost`) to `<kc-context>` as a JS **property** — the trigger colour shifts green → yellow → red as usage climbs. Override the thresholds with `warnThreshold` (default `0.7`) and `dangerThreshold` (default `0.9`) numeric properties. Listen for `kc-threshold-change` to react when severity shifts. (The live demo composes the SolidJS `Context` primitives.)",
  snippets: {
    html: htmlSnippet(`{
    usedTokens: 4200,
    maxTokens: 200000,
    inputTokens: 2800,
    outputTokens: 1400,
    estimatedCost: 0.012,
  }`),
    react: reactSnippet(`{
        usedTokens: 4200,
        maxTokens: 200000,
        inputTokens: 2800,
        outputTokens: 1400,
        estimatedCost: 0.012,
      }`),
    vue: vueSnippet(`{
  usedTokens: 4200,
  maxTokens: 200000,
  inputTokens: 2800,
  outputTokens: 1400,
  estimatedCost: 0.012,
}`),
    svelte: svelteSnippet(`{
    usedTokens: 4200,
    maxTokens: 200000,
    inputTokens: 2800,
    outputTokens: 1400,
    estimatedCost: 0.012,
  }`),
    angular: angularSnippet(`{
    usedTokens: 4200,
    maxTokens: 200000,
    inputTokens: 2800,
    outputTokens: 1400,
    estimatedCost: 0.012,
  }`),
    solid: `import {
  Context, ContextTrigger, ContextContent,
  ContextContentHeader, ContextContentBody, ContextContentFooter,
  ContextInputUsage, ContextOutputUsage,
} from '@kitn.ai/chat';

export function UsageIndicator() {
  return (
    // Low usage -> green trigger. Pass the counts as individual props.
    <Context usedTokens={4200} maxTokens={200000} inputTokens={2800} outputTokens={1400} estimatedCost={0.012}>
      <ContextTrigger />
      <ContextContent>
        <ContextContentHeader />
        <ContextContentBody>
          <div class="space-y-1.5">
            <ContextInputUsage />
            <ContextOutputUsage />
          </div>
        </ContextContentBody>
        <ContextContentFooter />
      </ContextContent>
    </Context>
  );
}`,
  },
};

/**
 * Medium Usage (Yellow) — extended conversation with reasoning; adds the
 * reasoning row and crosses the 70% warning threshold.
 */
const mediumUsage: StoryUsage = {
  intro:
    "Same element, higher numbers. As `usedTokens / maxTokens` crosses `warnThreshold` (default 70%) the trigger turns yellow. Pass `warnThreshold` as a numeric property to override. Include `reasoningTokens` to surface a reasoning row in the breakdown — comes from `usage.reasoning_tokens` on extended-thinking models. (The live demo composes the SolidJS `Context` primitives.)",
  snippets: {
    html: htmlSnippet(`{
    usedTokens: 150000,
    maxTokens: 200000,
    inputTokens: 85000,
    outputTokens: 42000,
    reasoningTokens: 23000,
    estimatedCost: 0.89,
  }`),
    react: reactSnippet(`{
        usedTokens: 150000,
        maxTokens: 200000,
        inputTokens: 85000,
        outputTokens: 42000,
        reasoningTokens: 23000,
        estimatedCost: 0.89,
      }`),
    vue: vueSnippet(`{
  usedTokens: 150000,
  maxTokens: 200000,
  inputTokens: 85000,
  outputTokens: 42000,
  reasoningTokens: 23000,
  estimatedCost: 0.89,
}`),
    svelte: svelteSnippet(`{
    usedTokens: 150000,
    maxTokens: 200000,
    inputTokens: 85000,
    outputTokens: 42000,
    reasoningTokens: 23000,
    estimatedCost: 0.89,
  }`),
    angular: angularSnippet(`{
    usedTokens: 150000,
    maxTokens: 200000,
    inputTokens: 85000,
    outputTokens: 42000,
    reasoningTokens: 23000,
    estimatedCost: 0.89,
  }`),
    solid: `import {
  Context, ContextTrigger, ContextContent,
  ContextContentHeader, ContextContentBody, ContextContentFooter,
  ContextInputUsage, ContextOutputUsage, ContextReasoningUsage,
} from '@kitn.ai/chat';

export function UsageIndicator() {
  return (
    // ~75% used -> yellow trigger. reasoningTokens adds the reasoning row.
    <Context usedTokens={150000} maxTokens={200000} inputTokens={85000} outputTokens={42000} reasoningTokens={23000} estimatedCost={0.89}>
      <ContextTrigger />
      <ContextContent>
        <ContextContentHeader />
        <ContextContentBody>
          <div class="space-y-1.5">
            <ContextInputUsage />
            <ContextOutputUsage />
            <ContextReasoningUsage />
          </div>
        </ContextContentBody>
        <ContextContentFooter />
      </ContextContent>
    </Context>
  );
}`,
  },
};

/**
 * High Usage (Red) — near the context limit; numbers pushed past the 90%
 * danger threshold so the trigger goes red.
 */
const highUsage: StoryUsage = {
  intro:
    "Near the limit. Push `usedTokens` past `dangerThreshold` (default 90%) of `maxTokens` and the trigger goes red — a cue for the user to start a new conversation. Pass `dangerThreshold` as a numeric property to override. Same markup as Medium — only the counts differ. (The live demo composes the SolidJS `Context` primitives.)",
  snippets: {
    html: htmlSnippet(`{
    usedTokens: 189000,
    maxTokens: 200000,
    inputTokens: 110000,
    outputTokens: 54000,
    reasoningTokens: 25000,
    estimatedCost: 1.42,
  }`),
    react: reactSnippet(`{
        usedTokens: 189000,
        maxTokens: 200000,
        inputTokens: 110000,
        outputTokens: 54000,
        reasoningTokens: 25000,
        estimatedCost: 1.42,
      }`),
    vue: vueSnippet(`{
  usedTokens: 189000,
  maxTokens: 200000,
  inputTokens: 110000,
  outputTokens: 54000,
  reasoningTokens: 25000,
  estimatedCost: 1.42,
}`),
    svelte: svelteSnippet(`{
    usedTokens: 189000,
    maxTokens: 200000,
    inputTokens: 110000,
    outputTokens: 54000,
    reasoningTokens: 25000,
    estimatedCost: 1.42,
  }`),
    angular: angularSnippet(`{
    usedTokens: 189000,
    maxTokens: 200000,
    inputTokens: 110000,
    outputTokens: 54000,
    reasoningTokens: 25000,
    estimatedCost: 1.42,
  }`),
    solid: `import {
  Context, ContextTrigger, ContextContent,
  ContextContentHeader, ContextContentBody, ContextContentFooter,
  ContextInputUsage, ContextOutputUsage, ContextReasoningUsage,
} from '@kitn.ai/chat';

export function UsageIndicator() {
  return (
    // ~95% used -> red trigger; time to start a new conversation.
    <Context usedTokens={189000} maxTokens={200000} inputTokens={110000} outputTokens={54000} reasoningTokens={25000} estimatedCost={1.42}>
      <ContextTrigger />
      <ContextContent>
        <ContextContentHeader />
        <ContextContentBody>
          <div class="space-y-1.5">
            <ContextInputUsage />
            <ContextOutputUsage />
            <ContextReasoningUsage />
          </div>
        </ContextContentBody>
        <ContextContentFooter />
      </ContextContent>
    </Context>
  );
}`,
  },
};

/**
 * Full Breakdown with Cache — detailed usage including cache-hit tokens; adds
 * `cacheTokens` (and the cache row in the Solid composition).
 *
 * From the API: `cacheTokens` = `usage.cache_read_input_tokens` from the
 * response (tokens served from prompt cache). Cache-write tokens
 * (`usage.cache_creation_input_tokens`) are also counted toward `usedTokens`
 * but shown under the same row here for simplicity.
 */
const withCache: StoryUsage = {
  intro:
    "Show the full breakdown including cache-hit tokens. Add `cacheTokens` to the `context` object (sourced from `usage.cache_read_input_tokens` in the API response) and `<kc-context>` includes it in the popover breakdown. (The live demo composes the SolidJS `Context` primitives, adding a `ContextCacheUsage` row.)",
  snippets: {
    html: htmlSnippet(`{
    usedTokens: 82000,
    maxTokens: 200000,
    inputTokens: 45000,
    outputTokens: 22000,
    reasoningTokens: 15000,
    cacheTokens: 32000,
    estimatedCost: 0.38,
  }`),
    react: reactSnippet(`{
        usedTokens: 82000,
        maxTokens: 200000,
        inputTokens: 45000,
        outputTokens: 22000,
        reasoningTokens: 15000,
        cacheTokens: 32000,
        estimatedCost: 0.38,
      }`),
    vue: vueSnippet(`{
  usedTokens: 82000,
  maxTokens: 200000,
  inputTokens: 45000,
  outputTokens: 22000,
  reasoningTokens: 15000,
  cacheTokens: 32000,
  estimatedCost: 0.38,
}`),
    svelte: svelteSnippet(`{
    usedTokens: 82000,
    maxTokens: 200000,
    inputTokens: 45000,
    outputTokens: 22000,
    reasoningTokens: 15000,
    cacheTokens: 32000,
    estimatedCost: 0.38,
  }`),
    angular: angularSnippet(`{
    usedTokens: 82000,
    maxTokens: 200000,
    inputTokens: 45000,
    outputTokens: 22000,
    reasoningTokens: 15000,
    cacheTokens: 32000,
    estimatedCost: 0.38,
  }`),
    solid: `import {
  Context, ContextTrigger, ContextContent,
  ContextContentHeader, ContextContentBody, ContextContentFooter,
  ContextInputUsage, ContextOutputUsage, ContextReasoningUsage, ContextCacheUsage,
} from '@kitn.ai/chat';

export function UsageIndicator() {
  return (
    // cacheTokens lights up the ContextCacheUsage row.
    <Context usedTokens={82000} maxTokens={200000} inputTokens={45000} outputTokens={22000} reasoningTokens={15000} cacheTokens={32000} estimatedCost={0.38}>
      <ContextTrigger />
      <ContextContent>
        <ContextContentHeader />
        <ContextContentBody>
          <div class="space-y-1.5">
            <ContextInputUsage />
            <ContextOutputUsage />
            <ContextReasoningUsage />
            <ContextCacheUsage />
          </div>
        </ContextContentBody>
        <ContextContentFooter />
      </ContextContent>
    </Context>
  );
}`,
  },
};

/**
 * In a Header Bar — `<kc-context>` sitting next to a model switcher in an app
 * header. The header chrome and `<kc-model-switcher>` are siblings; the usage
 * indicator itself is the same `context` object as the other stories.
 */
const inHeaderBar: StoryUsage = {
  intro:
    "Drop the usage indicator into your app header next to the model switcher. `<kc-context>` is just an inline element — lay it out with your own header markup. The `<kc-model-switcher>` beside it takes a `models` array property and fires `modelchange`. (The live demo composes the SolidJS `Context` + `ModelSwitcher` primitives.)",
  snippets: {
    html: `<!-- Register the elements once (CDN or bundler) -->
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/chat/dist/kitn-chat.es.js';
</script>

<header style="display:flex;align-items:center;gap:0.5rem">
  <kc-model-switcher id="models"></kc-model-switcher>
  <kc-context id="ctx"></kc-context>
</header>

<script type="module">
  // Set object/array data as PROPERTIES (not attributes).
  const ctx = document.getElementById('ctx');
  ctx.context = {
    usedTokens: 67000,
    maxTokens: 200000,
    inputTokens: 38000,
    outputTokens: 29000,
    estimatedCost: 0.31,
  };

  const models = document.getElementById('models');
  models.models = [
    { id: 'claude-4', name: 'Claude 4 Opus', provider: 'Anthropic' },
    { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic' },
  ];
  models.currentModel = 'claude-4';
  models.addEventListener('kc-model-change', (e) => console.log(e.detail));
</script>`,
    react: `import { Context, ModelSwitcher } from '@kitn.ai/chat/react';

export function ChatHeader() {
  const models = [
    { id: 'claude-4', name: 'Claude 4 Opus', provider: 'Anthropic' },
    { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic' },
  ];
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <ModelSwitcher models={models} currentModel="claude-4" onModelChange={(e) => console.log(e.detail)} />
      <Context
        context={{
          usedTokens: 67000,
          maxTokens: 200000,
          inputTokens: 38000,
          outputTokens: 29000,
          estimatedCost: 0.31,
        }}
      />
    </header>
  );
}`,
    vue: `<script setup>
import '@kitn.ai/chat/elements'; // register once (e.g. in main.ts)

const context = {
  usedTokens: 67000,
  maxTokens: 200000,
  inputTokens: 38000,
  outputTokens: 29000,
  estimatedCost: 0.31,
};
const models = [
  { id: 'claude-4', name: 'Claude 4 Opus', provider: 'Anthropic' },
  { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic' },
];
</script>

<template>
  <header style="display:flex;align-items:center;gap:0.5rem">
    <kc-model-switcher :models.prop="models" current-model="claude-4" @kc-model-change="(e) => console.log(e.detail)" />
    <kc-context :context.prop="context" />
  </header>
</template>`,
    svelte: `<script>
  import '@kitn.ai/chat/elements'; // register once

  let ctxEl, modelsEl;
  const context = {
    usedTokens: 67000,
    maxTokens: 200000,
    inputTokens: 38000,
    outputTokens: 29000,
    estimatedCost: 0.31,
  };
  const models = [
    { id: 'claude-4', name: 'Claude 4 Opus', provider: 'Anthropic' },
    { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic' },
  ];
  // Objects/arrays are set as properties (attributes only take strings).
  $: if (ctxEl) ctxEl.context = context;
  $: if (modelsEl) modelsEl.models = models;
</script>

<header style="display:flex;align-items:center;gap:0.5rem">
  <kc-model-switcher bind:this={modelsEl} current-model="claude-4" on:kc-model-change={(e) => console.log(e.detail)} />
  <kc-context bind:this={ctxEl} />
</header>`,
    angular: `// main.ts: import '@kitn.ai/chat/elements' before bootstrapApplication,
// and add CUSTOM_ELEMENTS_SCHEMA to the component/module.
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <header style="display:flex;align-items:center;gap:0.5rem">
      <kc-model-switcher [models]="models" current-model="claude-4" (kc-model-change)="onModelChange($event)"></kc-model-switcher>
      <kc-context [context]="context"></kc-context>
    </header>
  \`,
})
export class HeaderComponent {
  context = {
    usedTokens: 67000,
    maxTokens: 200000,
    inputTokens: 38000,
    outputTokens: 29000,
    estimatedCost: 0.31,
  };
  models = [
    { id: 'claude-4', name: 'Claude 4 Opus', provider: 'Anthropic' },
    { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic' },
  ];
  onModelChange(e: CustomEvent) { console.log(e.detail); }
}`,
    solid: `import { createSignal } from 'solid-js';
import {
  Context, ContextTrigger, ContextContent,
  ContextContentHeader, ContextContentBody, ContextContentFooter,
  ContextInputUsage, ContextOutputUsage,
  ModelSwitcher,
} from '@kitn.ai/chat';
import type { ModelOption } from '@kitn.ai/chat';

export function ChatHeader() {
  const [modelId, setModelId] = createSignal('claude-4');
  const models: ModelOption[] = [
    { id: 'claude-4', name: 'Claude 4 Opus', provider: 'Anthropic' },
    { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic' },
  ];

  return (
    <div class="flex items-center gap-2">
      <ModelSwitcher models={models} currentModelId={modelId()} onModelChange={setModelId} />
      <Context usedTokens={67000} maxTokens={200000} inputTokens={38000} outputTokens={29000} estimatedCost={0.31}>
        <ContextTrigger />
        <ContextContent>
          <ContextContentHeader />
          <ContextContentBody>
            <div class="space-y-1.5">
              <ContextInputUsage />
              <ContextOutputUsage />
            </div>
          </ContextContentBody>
          <ContextContentFooter />
        </ContextContent>
      </Context>
    </div>
  );
}`,
  },
};

/**
 * Example: Context & Token Usage — show how much of the model's context window
 * is consumed by the conversation. `<kc-context>` takes a single `context`
 * object property (`usedTokens`, `maxTokens`, plus optional input/output/
 * reasoning/cache token counts + `estimatedCost`); it renders the trigger,
 * popover, and breakdown and has no events. SolidJS composes the `Context`
 * primitives for full control over the popover.
 *
 * Per-story: the Usage tab shows the snippet for the story you're on; the
 * example-level fields below (spread from the primary story) are the fallback.
 */
const contextUsage: ExampleUsage = {
  title: 'Examples/Context & Token Usage',
  ...lowUsage, // example-level fallback = the primary "Low Usage (Green)" story
  stories: {
    'Low Usage (Green)': lowUsage,
    'Medium Usage (Yellow)': mediumUsage,
    'High Usage (Red)': highUsage,
    'Full Breakdown with Cache': withCache,
    'In a Header Bar': inHeaderBar,
  },
};

export default contextUsage;
