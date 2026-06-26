import type { ExampleUsage, StoryUsage } from './types';

/** New Chat — a centered greeting (icon + title + description), starter suggestion chips, and a composer. */
const newChat: StoryUsage = {
  intro:
    "The new-chat zero state. `<kai-empty>` renders the centered greeting from two scalar props — `emptyTitle` (DOM attribute `empty-title`, since `title` is a global HTML attribute) and `description`. The icon, the starter suggestion chips, and the composer below aren't part of `<kai-empty>` — compose those with the SolidJS `Empty` + `PromptSuggestion` + `PromptInput` primitives (see the Solid tab).",
  snippets: {
    html: `<!-- Register the elements once (CDN or bundler) -->
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kai.es.js';
</script>

<!-- Scalars are plain attributes. Note the kebab-case empty-title. -->
<kai-empty
  empty-title="How can I help today?"
  description="Ask anything, or start from one of these."
></kai-empty>

<!-- The icon, suggestion chips, and composer are not part of <kai-empty>;
     compose them yourself (see the Solid tab). -->`,

    react: `import { Empty } from '@kitn.ai/ui/react';

export function NewChat() {
  // Icon, suggestion chips, and composer aren't props on <Empty> —
  // compose them yourself (see the Solid tab).
  return (
    <Empty
      emptyTitle="How can I help today?"
      description="Ask anything, or start from one of these."
    />
  );
}`,

    vue: `<script setup>
import '@kitn.ai/ui/elements'; // register once (e.g. in main.ts)
</script>

<template>
  <!-- Scalars as plain attributes; empty-title is kebab-case. -->
  <kai-empty
    empty-title="How can I help today?"
    description="Ask anything, or start from one of these."
  />
  <!-- Icon, suggestions, and composer are composed separately. -->
</template>`,

    svelte: `<script>
  import '@kitn.ai/ui/elements'; // register once
</script>

<!-- Scalars as attributes; empty-title is kebab-case. -->
<kai-empty
  empty-title="How can I help today?"
  description="Ask anything, or start from one of these."
></kai-empty>
<!-- Icon, suggestions, and composer are composed separately. -->`,

    angular: `// main.ts: import '@kitn.ai/ui/elements' before bootstrapApplication,
// and add CUSTOM_ELEMENTS_SCHEMA to the component.
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-new-chat',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  // empty-title is kebab-case; both props are scalar strings.
  template: \`
    <kai-empty
      empty-title="How can I help today?"
      description="Ask anything, or start from one of these."
    ></kai-empty>
  \`,
})
export class NewChatComponent {}`,

    solid: `import { createSignal } from 'solid-js';
import {
  ChatConfig, Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent,
  PromptSuggestion, PromptInput, PromptInputTextarea, PromptInputActions, Button,
} from '@kitn.ai/ui';
import { Sparkles, Plus, Globe, ArrowUp } from 'lucide-solid';

const SUGGESTIONS = [
  'Summarize a document',
  'Draft a product update',
  'Explain a code snippet',
  'Plan my week',
];

export function NewChat() {
  const [input, setInput] = createSignal('');
  return (
    <ChatConfig proseSize="base">
      <Empty class="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon"><Sparkles class="size-6" /></EmptyMedia>
          <EmptyTitle>How can I help today?</EmptyTitle>
          <EmptyDescription>Ask anything, or start from one of these.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div class="flex max-w-md flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <PromptSuggestion onClick={() => setInput(s)}>{s}</PromptSuggestion>
            ))}
          </div>
        </EmptyContent>
      </Empty>

      {/* Composer fills from a clicked suggestion. */}
      <PromptInput value={input()} onValueChange={setInput} onSubmit={() => setInput('')}>
        <PromptInputTextarea placeholder="Ask anything…" />
        <PromptInputActions class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" class="rounded-full" aria-label="Add"><Plus class="size-4" /></Button>
            <Button variant="outline" size="sm" class="rounded-full gap-1" aria-label="Search the web"><Globe class="size-4" />Search</Button>
          </div>
          <Button size="icon-sm" class="rounded-full" disabled={!input().trim()} aria-label="Send message">
            <ArrowUp class="size-4" />
          </Button>
        </PromptInputActions>
      </PromptInput>
    </ChatConfig>
  );
}`,
  },
};

/**
 * Pattern: Empty State — the new-chat zero state. `<kai-empty>` covers the
 * centered greeting (`emptyTitle` + `description`); the icon, starter
 * suggestion chips, and composer are SolidJS primitive composition. Per-story:
 * the Usage tab shows the snippet for the story you're on; the example-level
 * fields below are the fallback.
 */
const emptyState: ExampleUsage = {
  title: 'Patterns/Empty State',
  ...newChat, // example-level fallback = the primary "New Chat" story
  stories: {
    'New Chat': newChat,
  },
};

export default emptyState;
