import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, For, onCleanup, onMount } from 'solid-js';
import '../../web-components/register/register'; // side effect: registers the kai-* elements
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent,
} from './empty';
import { Button } from '../button/button';
import { Avatar } from '../avatar/avatar';
import { PromptSuggestion } from '../prompt/prompt-suggestion';
import { PromptInput, PromptInputTextarea, PromptInputActions } from '../prompt/prompt-input';
import {
  FolderPlus, MessageCircleQuestion, Inbox, Search, Sparkles, FileText, ArrowUp, Plus, Upload,
} from 'lucide-solid';
import { componentDescription } from '../../stories/docs/web-component-controls';

// The `kai-thread` and `kai-empty` elements below are registered by `register.ts` and
// typed by `web-component-types.d.ts`, which augments React's JSX rather than Solid's.
// Declared here the way `chat-slots.stories.tsx` does it. `slot` rides along so the
// projection reads as the platform attribute it is.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-thread': JSX.HTMLAttributes<HTMLElement> & { messages?: unknown };
      'kai-empty': JSX.HTMLAttributes<HTMLElement> & { 'empty-title'?: string; description?: string };
    }
  }
}

// `EmptyMedia`'s `variant` is the only enum prop, so the controls cover the composition
// and the variation stories are compositional.
const meta = {
  title: 'Components/Empty',
  component: Empty,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A placeholder block for a region with nothing to show yet.',
      ]),
      controls: { exclude: ['use:eventListener'] },
    },
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Demo control: the `EmptyTitle` text.',
    },
    description: {
      control: 'text',
      description: 'Demo control: the `EmptyDescription` text.',
    },
    mediaVariant: {
      control: 'select',
      options: ['default', 'icon'],
      description: '`EmptyMedia` variant: `icon` is a muted rounded tile; `default` is a bare slot.',
      table: { defaultValue: { summary: 'default' } },
    },
    actionLabel: {
      control: 'text',
      description: 'Demo control: label of the primary action button.',
    },
  },
  render: (args: {
    title?: string;
    description?: string;
    mediaVariant?: 'default' | 'icon';
    actionLabel?: string;
  }) => (
    <div class="w-[420px]">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant={args.mediaVariant ?? 'icon'}><FolderPlus /></EmptyMedia>
          <EmptyTitle>{args.title}</EmptyTitle>
          <EmptyDescription>{args.description}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button><Plus class="size-4" /> {args.actionLabel}</Button>
        </EmptyContent>
      </Empty>
    </div>
  ),
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent,
  Button, Avatar, PromptSuggestion, PromptInput, PromptInputTextarea, PromptInputActions,
} from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground: edit the title, description, media variant, and action label. */
export const Playground: Story = {
  args: {
    title: 'No projects yet',
    description: 'Get started by creating your first project.',
    mediaVariant: 'icon',
    actionLabel: 'Create project',
  },
  ...src(`<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon"><FolderPlus /></EmptyMedia>
    <EmptyTitle>No projects yet</EmptyTitle>
    <EmptyDescription>Get started by creating your first project.</EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <Button><Plus class="size-4" /> Create project</Button>
  </EmptyContent>
</Empty>`),
};

/** A single primary action: the canonical empty state. */
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
  ...src(`<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon"><FolderPlus /></EmptyMedia>
    <EmptyTitle>No projects yet</EmptyTitle>
    <EmptyDescription>Get started by creating your first project.</EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <Button><Plus class="size-4" /> Create project</Button>
  </EmptyContent>
</Empty>`),
};

/** The content-width seam. `EmptyContent` caps what you slot into it at a prose
 *  measure (24rem) by default. Content that is not prose - a two-up card grid -
 *  declares the width it needs with `--kai-empty-content-width`, and it is the
 *  BOX that widens, so the slotted content stays inside the box it was slotted
 *  into: no width on the children, no `min-width`, nothing painting past its
 *  parent. Set the variable anywhere above the content (here on the `Empty`
 *  root); it inherits. */
export const ContentWidth: Story = {
  name: 'Content Width (a grid takes the column)',
  render: () => (
    <div class="w-[640px]">
      <Empty class="[--kai-empty-content-width:100%]">
        <EmptyHeader>
          <EmptyMedia variant="icon"><FolderPlus /></EmptyMedia>
          <EmptyTitle>No projects yet</EmptyTitle>
          <EmptyDescription>Start from one of these, or create your own.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent class="grid grid-cols-2 gap-2">
          <For each={['Starter', 'Docs site', 'CLI tool', 'API service']}>{(name) => (
            <Button variant="outline" class="w-full justify-start">{name}</Button>
          )}</For>
        </EmptyContent>
      </Empty>
    </div>
  ),
  ...src(`<Empty style="--kai-empty-content-width: 100%">
  <EmptyHeader>
    <EmptyMedia variant="icon"><FolderPlus /></EmptyMedia>
    <EmptyTitle>No projects yet</EmptyTitle>
    <EmptyDescription>Start from one of these, or create your own.</EmptyDescription>
  </EmptyHeader>
  <!-- the grid may be as wide as the box it is slotted into -->
  <EmptyContent class="grid grid-cols-2 gap-2">
    <Button variant="outline" class="w-full justify-start">Starter</Button>
    <Button variant="outline" class="w-full justify-start">Docs site</Button>
  </EmptyContent>
</Empty>`),
};

/** Two actions: a primary plus a secondary (outline). */
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
  ...src(`<Empty>
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
</Empty>`),
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
  ...src(`<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon"><Search /></EmptyMedia>
    <EmptyTitle>Icon tile</EmptyTitle>
  </EmptyHeader>
</Empty>

<Empty>
  <EmptyHeader>
    <EmptyMedia variant="default"><Avatar fallback="JA" size="lg" /></EmptyMedia>
    <EmptyTitle>Bare slot</EmptyTitle>
  </EmptyHeader>
</Empty>`),
};

/** Suggestions as pills (PromptSuggestion default) in a centered wrap,
 *  best for a handful of short prompts. */
export const SuggestionPills: Story = {
  name: 'Suggestions: Pills',
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
  ...src(`<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon"><Sparkles /></EmptyMedia>
    <EmptyTitle>Start a conversation</EmptyTitle>
    <EmptyDescription>Pick a prompt or type your own.</EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <div class="flex flex-wrap justify-center gap-2">
      <For each={prompts}>{(s) => <PromptSuggestion>{s}</PromptSuggestion>}</For>
    </div>
  </EmptyContent>
</Empty>`),
};

/** Suggestions as full-width, left-aligned list rows (`PromptSuggestion block`),
 *  stacked in a single column. Sentence-length questions read better this way than
 *  as wrapped pills, and a row wraps its own long text down the row instead of
 *  clipping it. */
export const SuggestionList: Story = {
  name: 'Suggestions: List (block)',
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
            'Summarize the last quarter',
            'What changed in the release notes?',
            'Draft a short brief from these threads',
          ]}>
            {(s) => <PromptSuggestion block class="w-full">{s}</PromptSuggestion>}
          </For>
        </EmptyContent>
      </Empty>
    </div>
  ),
  ...src(`<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon"><MessageCircleQuestion /></EmptyMedia>
    <EmptyTitle>Hi Jordan</EmptyTitle>
    <EmptyDescription>Ask me anything about your report.</EmptyDescription>
  </EmptyHeader>
  <EmptyContent class="max-w-none">
    <For each={questions}>{(q) => <PromptSuggestion block class="w-full">{q}</PromptSuggestion>}</For>
  </EmptyContent>
</Empty>`),
};

/** The `empty` slot replaced. Two `kai-thread` elements render the same
 *  `slot="empty"` projection: the kit's default (an icon tile, a title, a
 *  description, a primary action) and a host's own empty state built from a
 *  different icon, its own title copy, and a form below instead of a button.
 *  Only the content inside the slot changes, so the centring, the token-driven
 *  colors, and the degrading behaviour under a short or a tall parent all stay
 *  the component's. */
export const CustomEmptyState: Story = {
  name: 'Your own empty state (slot replaced)',
  render: () => {
    let def: (HTMLElement & { messages?: unknown }) | undefined;
    let own: (HTMLElement & { messages?: unknown }) | undefined;
    onMount(() => {
      // An empty thread renders the zero-state: the built-in one on the left, the
      // projected `slot="empty"` content on the right.
      if (def) def.messages = [];
      if (own) own.messages = [];
    });
    return (
      <div class="grid w-full max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
        <div class="flex flex-col gap-2">
          <span class="text-xs font-medium text-muted-foreground">The kit's default empty state</span>
          <div class="flex min-h-[320px] flex-col overflow-hidden rounded-lg border border-border">
            <kai-thread ref={(e) => (def = e as HTMLElement & { messages?: unknown })} />
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <span class="text-xs font-medium text-muted-foreground">Your own, via slot=&quot;empty&quot;</span>
          <div class="flex min-h-[320px] flex-col overflow-hidden rounded-lg border border-border">
            <kai-thread ref={(e) => (own = e as HTMLElement & { messages?: unknown })}>
              <div slot="empty" class="flex h-full w-full">
                <kai-empty
                  empty-title="Sign in to your workspace"
                  description="We'll email a one-time link. No password to remember."
                >
                  <svg slot="media" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-6"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="m10 17 5-5-5-5" /><path d="M15 12H3" /></svg>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <button
                    type="button"
                    class="h-9 w-full rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
                  >Email me a link</button>
                </kai-empty>
              </div>
            </kai-thread>
          </div>
        </div>
      </div>
    );
  },
  ...src(`<!-- the thread's built-in empty state, shown while messages is empty -->
<kai-thread id="thread"></kai-thread>

<!-- replace it: your own markup, projected into slot="empty" -->
<kai-thread id="thread">
  <div slot="empty" style="display:flex;height:100%">
    <div style="
      display:flex; flex-direction:column; align-items:center; gap:1.5rem;
      padding:1.5rem; margin:auto; text-align:center;
    ">
      <svg style="width:1.5rem;height:1.5rem"><!-- your icon --></svg>
      <h2 style="margin:0; font-weight:500">Sign in to your workspace</h2>
      <p style="margin:0; color:var(--color-muted-foreground)">
        We'll email a one-time link. No password to remember.
      </p>
      <input type="email" placeholder="you@example.com" style="width:100%" />
      <button style="width:100%">Email me a link</button>
    </div>
  </div>
</kai-thread>

<script type="module">
  import '@kitn.ai/ui/web-components';
  document.querySelectorAll('kai-thread').forEach((t) => { t.messages = []; });
</script>`),
};

/** Suggestions organized into labeled groups (mirrors the Prompt Input
 *  Variants → WithSuggestions pattern), inside an empty block. */
export const GroupedSuggestions: Story = {
  name: 'Suggestions: Grouped',
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
  ...src(`<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon"><FileText /></EmptyMedia>
    <EmptyTitle>Ask about this document</EmptyTitle>
    <EmptyDescription>Choose a starting point.</EmptyDescription>
  </EmptyHeader>
  <EmptyContent class="max-w-none gap-4">
    <For each={groups}>{(group) => (/* label + wrapped PromptSuggestions */)}</For>
  </EmptyContent>
</Empty>`),
};

/** An empty block whose content is an input: the "blank chat" launch state. */
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
                <Button size="icon-sm" class="rounded-full" aria-label="Send message" disabled={!value().trim()}>
                  <ArrowUp class="size-4" />
                </Button>
              </PromptInputActions>
            </PromptInput>
          </EmptyContent>
        </Empty>
      </div>
    );
  },
  ...src(`<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon"><Sparkles /></EmptyMedia>
    <EmptyTitle>How can I help?</EmptyTitle>
    <EmptyDescription>Ask anything to get started.</EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <PromptInput value={value()} onValueChange={setValue} onSubmit={() => setValue('')}>
      <PromptInputTextarea placeholder="Ask anything..." />
      <PromptInputActions class="justify-end">
        <Button size="icon-sm" disabled={!value().trim()}><ArrowUp class="size-4" /></Button>
      </PromptInputActions>
    </PromptInput>
  </EmptyContent>
</Empty>`),
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
  ...src(`<Empty>
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
</Empty>`),
};

/** A bordered (dashed) card treatment: add `border border-dashed` via class. */
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
  ...src(`<Empty class="border border-dashed">
  <EmptyHeader>
    <EmptyMedia variant="icon"><FolderPlus /></EmptyMedia>
    <EmptyTitle>Drop files here</EmptyTitle>
    <EmptyDescription>Or click to browse from your computer.</EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <Button variant="outline"><Upload class="size-4" /> Choose files</Button>
  </EmptyContent>
</Empty>`),
};
