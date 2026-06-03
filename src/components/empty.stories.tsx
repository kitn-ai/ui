import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, For } from 'solid-js';
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent,
} from './empty';
import { Button } from '../ui/button';
import { Avatar } from '../ui/avatar';
import { PromptSuggestion } from './prompt-suggestion';
import { PromptInput, PromptInputTextarea, PromptInputActions } from './prompt-input';
import {
  FolderPlus, MessageCircleQuestion, Inbox, Search, Sparkles, FileText, ArrowUp, Plus, Upload,
} from 'lucide-solid';

const meta: Meta = {
  title: 'Components/Empty',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

/** A single primary action — the canonical empty state. */
export const Default: Story = {
  render: () => (
    <div class="w-[420px]">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><FolderPlus /></EmptyMedia>
          <EmptyTitle>No projects yet</EmptyTitle>
          <EmptyDescription>Get started by creating your first project.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button><Plus class="size-4" /> Create project</Button>
        </EmptyContent>
      </Empty>
    </div>
  ),
};

/** Two actions — a primary plus a secondary (outline). */
export const WithActions: Story = {
  name: 'With Multiple Actions',
  render: () => (
    <div class="w-[420px]">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Inbox /></EmptyMedia>
          <EmptyTitle>Your inbox is empty</EmptyTitle>
          <EmptyDescription>Import existing items or start from scratch.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div class="flex gap-2">
            <Button><Plus class="size-4" /> New item</Button>
            <Button variant="outline"><Upload class="size-4" /> Import</Button>
          </div>
        </EmptyContent>
      </Empty>
    </div>
  ),
};

/** The two `EmptyMedia` variants: an icon tile vs. a default (bare) slot
 *  holding an avatar or larger illustration. */
export const MediaVariants: Story = {
  name: 'Media Variants (icon / default)',
  render: () => (
    <div class="flex gap-8">
      <div class="w-[280px]">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Search /></EmptyMedia>
            <EmptyTitle>variant="icon"</EmptyTitle>
            <EmptyDescription>Icon sits in a muted rounded tile.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
      <div class="w-[280px]">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="default"><Avatar fallback="JA" size="lg" /></EmptyMedia>
            <EmptyTitle>variant="default"</EmptyTitle>
            <EmptyDescription>Bare slot for an avatar or illustration.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    </div>
  ),
};

/** Suggestions as pills (PromptSuggestion default) in a centered wrap —
 *  best for a handful of short prompts. */
export const SuggestionPills: Story = {
  name: 'Suggestions — Pills',
  render: () => (
    <div class="w-[460px]">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Sparkles /></EmptyMedia>
          <EmptyTitle>Start a conversation</EmptyTitle>
          <EmptyDescription>Pick a prompt or type your own.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div class="flex flex-wrap justify-center gap-2">
            <For each={['Summarize this', 'Key takeaways', 'Create an outline', 'Find risks']}>
              {(s) => <PromptSuggestion>{s}</PromptSuggestion>}
            </For>
          </div>
        </EmptyContent>
      </Empty>
    </div>
  ),
};

/** Suggestions as a full-width list (PromptSuggestion `block`) — best for
 *  longer, sentence-length prompts. This is the report chat dock's pattern. */
export const SuggestionList: Story = {
  name: 'Suggestions — List (block)',
  render: () => (
    <div class="w-[360px]">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><MessageCircleQuestion /></EmptyMedia>
          <EmptyTitle>Hi Jordan</EmptyTitle>
          <EmptyDescription>Ask me anything about your report.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent class="max-w-none">
          <For each={[
            'What does being a Catalyst mean for how I work with others?',
            'How do my Dominance and Influence styles play off each other?',
            'Where might my lower Conscientiousness trip me up?',
          ]}>
            {(s) => <PromptSuggestion block>{s}</PromptSuggestion>}
          </For>
        </EmptyContent>
      </Empty>
    </div>
  ),
};

/** Suggestions organized into labeled groups (mirrors the Prompt Input
 *  Variants → WithSuggestions pattern), inside an empty block. */
export const GroupedSuggestions: Story = {
  name: 'Suggestions — Grouped',
  render: () => {
    const groups = [
      { label: 'Get started', items: ['Summarize this document', 'What are the key takeaways?'] },
      { label: 'Go deeper', items: ['Compare with similar approaches', 'What are the tradeoffs?'] },
    ];
    return (
      <div class="w-[460px]">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><FileText /></EmptyMedia>
            <EmptyTitle>Ask about this document</EmptyTitle>
            <EmptyDescription>Choose a starting point.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent class="max-w-none gap-4">
            <For each={groups}>
              {(group) => (
                <div class="w-full space-y-2 text-center">
                  <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </span>
                  <div class="flex flex-wrap justify-center gap-2">
                    <For each={group.items}>{(item) => <PromptSuggestion>{item}</PromptSuggestion>}</For>
                  </div>
                </div>
              )}
            </For>
          </EmptyContent>
        </Empty>
      </div>
    );
  },
};

/** An empty block whose content is an input — the "blank chat" launch state. */
export const WithInput: Story = {
  name: 'With Prompt Input',
  render: () => {
    const [value, setValue] = createSignal('');
    return (
      <div class="w-[460px]">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Sparkles /></EmptyMedia>
            <EmptyTitle>How can I help?</EmptyTitle>
            <EmptyDescription>Ask anything to get started.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <PromptInput value={value()} onValueChange={setValue} onSubmit={() => setValue('')} class="w-full">
              <PromptInputTextarea placeholder="Ask anything..." class="min-h-[44px] px-3 pt-2.5" />
              <PromptInputActions class="justify-end px-2 pb-2">
                <Button size="icon-sm" class="rounded-full" disabled={!value().trim()}>
                  <ArrowUp class="size-4" />
                </Button>
              </PromptInputActions>
            </PromptInput>
          </EmptyContent>
        </Empty>
      </div>
    );
  },
};

/** A description can carry a link; styled underline + primary-on-hover. */
export const WithLink: Story = {
  name: 'With Link in Description',
  render: () => (
    <div class="w-[420px]">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Search /></EmptyMedia>
          <EmptyTitle>No results found</EmptyTitle>
          <EmptyDescription>
            Try a different search, or <a href="#">browse all items</a> instead.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline">Clear filters</Button>
        </EmptyContent>
      </Empty>
    </div>
  ),
};

/** A bordered (dashed) card treatment — add `border border-dashed` via class. */
export const Bordered: Story = {
  render: () => (
    <div class="w-[420px]">
      <Empty class="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon"><FolderPlus /></EmptyMedia>
          <EmptyTitle>Drop files here</EmptyTitle>
          <EmptyDescription>Or click to browse from your computer.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline"><Upload class="size-4" /> Choose files</Button>
        </EmptyContent>
      </Empty>
    </div>
  ),
};
