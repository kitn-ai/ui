# `<kitn-chat-workspace>` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `<kitn-chat-workspace>` custom element that renders the full chat shell — conversation list + chat + drag-to-resize handle + collapsible sidebar — as one drop-in, fully-controlled element.

**Architecture:** Extract `kitn-chat`'s render body into a shared internal `ChatThread` Solid component, then build the workspace facade as `ResizablePanelGroup[ ConversationList | ResizableHandle | ChatThread ]`. Both `kitn-chat` and `kitn-chat-workspace` render the same `ChatThread`, so they can't drift. State is fully controlled for data; sidebar collapse is internal UI state toggled by the user.

**Tech Stack:** SolidJS, `solid-element` (`defineKitnElement`), Tailwind v4 (shadow-DOM `compiled.css`), Storybook (`storybook-solidjs-vite`), Vitest.

**Branch:** continue on `chore/post-0.4-polish` (no new branch).

**Spec:** `docs/superpowers/specs/2026-06-13-chat-workspace-design.md`.

**Verification reality (read first):** this kit does NOT unit-test every element in isolation; it verifies via (a) the element's Vitest jsdom test where one exists, (b) typecheck, (c) Storybook render + Playwright screenshot, (d) the axe a11y audit. The "tests" below follow that practice. Baseline test failures = the 3 pre-existing Shiki cases in `tests/primitives/highlighter.test.ts`; any OTHER failure is a regression. SolidJS rule: never destructure props.

---

### Task 1: Extract shared `ChatThread`, refactor `kitn-chat` to use it

**Files:**
- Create: `src/components/chat-thread.tsx`
- Modify: `src/elements/chat.tsx` (replace the render body with `<ChatThread/>`)
- Existing test (must keep passing, unchanged): `tests/elements/chat-element.test.tsx`

`ChatThread` is `kitn-chat`'s current body, parameterized: the data props stay the same; every `dispatch('x', d)` becomes an optional callback prop `props.onX?.(d)`. It owns the input-value fallback + attachments signals that `kitn-chat` owns today, and nests the `ChatConfig` (proseSize/codeTheme/codeHighlight) preserving the outer `portalMount`.

- [ ] **Step 1: Create `src/components/chat-thread.tsx`**

```tsx
import { createSignal, For, Show } from 'solid-js';
import { ChatConfig, useChatConfig } from '../primitives/chat-config';
import { ChatContainer, ChatContainerContent, ChatContainerScrollAnchor } from './chat-container';
import { Message, MessageContent, MessageActions } from './message';
import { Reasoning, ReasoningTrigger, ReasoningContent } from './reasoning';
import { Tool } from './tool';
import { Attachments, Attachment, AttachmentPreview, AttachmentInfo, type AttachmentData } from './attachments';
import { ModelSwitcher } from './model-switcher';
import { ScrollButton } from './scroll-button';
import {
  Context, ContextTrigger, ContextContent, ContextContentHeader,
  ContextContentBody, ContextContentFooter, ContextInputUsage, ContextOutputUsage,
} from './context';
import { Button } from '../ui/button';
import { Copy, ThumbsUp, ThumbsDown, RefreshCw, Pencil } from 'lucide-solid';
import type { Component, JSX } from 'solid-js';
import { DefaultPromptInput } from '../elements/default-input';
import type { SlashCommandItem } from './slash-command';
import type { ChatMessage, ChatMessageAction } from '../elements/chat-types';
import type { ProseSize } from '../primitives/chat-config';
import type { ModelOption } from '../types';

export interface ChatThreadContextUsage {
  usedTokens: number; maxTokens: number;
  inputTokens?: number; outputTokens?: number; estimatedCost?: number;
}

export interface ChatThreadProps {
  /** Extra classes for the thread root (e.g. `h-full`). */
  class?: string;
  messages: ChatMessage[];
  value?: string;
  placeholder?: string;
  loading?: boolean;
  suggestions?: string[];
  suggestionMode?: 'submit' | 'fill';
  proseSize?: ProseSize;
  codeTheme?: string;
  codeHighlight?: boolean;
  chatTitle?: string;
  models?: ModelOption[];
  currentModel?: string;
  context?: ChatThreadContextUsage;
  scrollButton?: boolean;
  search?: boolean;
  voice?: boolean;
  slashCommands?: SlashCommandItem[];
  slashActiveIds?: string[];
  slashCompact?: boolean;
  // callbacks (the facade maps these to dispatch())
  onValueChange?: (value: string) => void;
  onSubmit?: (detail: { value: string; attachments: AttachmentData[] }) => void;
  onSuggestionClick?: (value: string) => void;
  onModelChange?: (modelId: string) => void;
  onMessageAction?: (detail: { messageId: string; action: ChatMessageAction }) => void;
  onSearch?: () => void;
  onVoice?: () => void;
  onSlashSelect?: (command: SlashCommandItem) => void;
}

const ACTION_LABEL: Record<ChatMessageAction, string> = {
  copy: 'Copy', like: 'Like', dislike: 'Dislike', regenerate: 'Regenerate', edit: 'Edit',
};
const ACTION_ICON: Record<ChatMessageAction, Component<{ class?: string }>> = {
  copy: Copy, like: ThumbsUp, dislike: ThumbsDown, regenerate: RefreshCw, edit: Pencil,
};

export function ChatThread(props: ChatThreadProps) {
  const outer = useChatConfig();
  const [internal, setInternal] = createSignal(props.value ?? '');
  const [attachments, setAttachments] = createSignal<AttachmentData[]>([]);
  const current = () => props.value ?? internal();
  const handleChange = (v: string) => { setInternal(v); props.onValueChange?.(v); };
  const handleSubmit = () => { props.onSubmit?.({ value: current(), attachments: attachments() }); setAttachments([]); };
  const handleSuggestionClick = (v: string) => {
    if ((props.suggestionMode ?? 'submit') === 'fill') { handleChange(v); props.onSuggestionClick?.(v); }
    else { props.onSubmit?.({ value: v, attachments: attachments() }); setAttachments([]); }
  };
  const showHeader = () => !!(props.chatTitle || props.models || props.context);
  const showScrollButton = () => props.scrollButton !== false;

  return (
    <ChatConfig proseSize={props.proseSize} codeTheme={props.codeTheme} codeHighlight={props.codeHighlight !== false} portalMount={outer.portalMount()}>
      <div class={`flex h-full flex-col bg-background ${props.class ?? ''}`}>
        <Show when={showHeader()}>
          <header class="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
            <div class="text-sm font-semibold text-foreground">{props.chatTitle}</div>
            <div class="flex items-center gap-2">
              <Show when={props.models}>
                <ModelSwitcher
                  models={props.models!}
                  currentModelId={props.currentModel ?? props.models![0]?.id ?? ''}
                  onModelChange={(modelId) => props.onModelChange?.(modelId)}
                />
              </Show>
              <Show when={props.context}>
                <Context
                  usedTokens={props.context!.usedTokens} maxTokens={props.context!.maxTokens}
                  inputTokens={props.context!.inputTokens} outputTokens={props.context!.outputTokens}
                  estimatedCost={props.context!.estimatedCost}
                >
                  <ContextTrigger />
                  <ContextContent>
                    <ContextContentHeader />
                    <ContextContentBody><div class="space-y-1.5"><ContextInputUsage /><ContextOutputUsage /></div></ContextContentBody>
                    <ContextContentFooter />
                  </ContextContent>
                </Context>
              </Show>
            </div>
          </header>
        </Show>
        <div class="relative flex-1 overflow-hidden">
          <ChatContainer class="h-full px-4 py-3">
            <ChatContainerContent class="mx-auto w-full max-w-3xl space-y-4">
              <For each={props.messages}>
                {(m) => (
                  <Message class={m.role === 'user' ? 'flex-col items-end' : 'flex-col items-start'}>
                    <Show when={m.reasoning}>
                      <Reasoning class="mb-2 w-full">
                        <ReasoningTrigger>{m.reasoning!.label ?? 'Reasoning'}</ReasoningTrigger>
                        <ReasoningContent markdown>{m.reasoning!.text}</ReasoningContent>
                      </Reasoning>
                    </Show>
                    <For each={m.tools ?? []}>{(tp) => <Tool toolPart={tp} class="mb-2 w-full" />}</For>
                    <Show when={m.attachments?.length}>
                      <Attachments variant="inline" class={m.role === 'user' ? 'mb-2 justify-end' : 'mb-2'}>
                        <For each={m.attachments!}>
                          {(att) => (<Attachment data={att}><AttachmentPreview /><AttachmentInfo /></Attachment>)}
                        </For>
                      </Attachments>
                    </Show>
                    <MessageContent
                      markdown={m.role === 'assistant'}
                      class={m.role === 'user' ? 'bg-muted text-primary max-w-[85%] rounded-2xl px-4 py-2' : 'bg-transparent p-0'}
                    >
                      {m.content}
                    </MessageContent>
                    <Show when={m.actions?.length}>
                      <MessageActions class="mt-1 flex gap-0">
                        <For each={m.actions!}>
                          {(a) => (
                            <Button
                              variant="ghost" size="icon-sm" class="rounded-full"
                              data-action={a} aria-label={ACTION_LABEL[a]}
                              onClick={() => props.onMessageAction?.({ messageId: m.id, action: a })}
                            >
                              {(() => { const Icon = ACTION_ICON[a]; return <Icon class="size-3.5" />; })()}
                            </Button>
                          )}
                        </For>
                      </MessageActions>
                    </Show>
                  </Message>
                )}
              </For>
              <ChatContainerScrollAnchor />
            </ChatContainerContent>
            <Show when={showScrollButton()}>
              <div class="absolute bottom-4 left-1/2 flex w-full max-w-3xl -translate-x-1/2 justify-center px-5">
                <ScrollButton class="shadow-sm" />
              </div>
            </Show>
          </ChatContainer>
        </div>
        <div class="shrink-0 px-4 pb-4">
          <div class="mx-auto max-w-3xl">
            <DefaultPromptInput
              value={current()} placeholder={props.placeholder} loading={props.loading === true}
              suggestions={props.suggestions} attachments={attachments()}
              search={props.search === true} voice={props.voice === true}
              slashCommands={props.slashCommands} slashActiveIds={props.slashActiveIds} slashCompact={props.slashCompact === true}
              onValueChange={handleChange} onSubmit={handleSubmit} onSuggestionClick={handleSuggestionClick}
              onAttachmentsChange={setAttachments}
              onSearch={() => props.onSearch?.()} onVoice={() => props.onVoice?.()}
              onSlashSelect={(command) => props.onSlashSelect?.(command)}
            />
          </div>
        </div>
      </div>
    </ChatConfig>
  );
}
```

Note: `flag('x')` (attribute/property boolean coercion) lives in the FACADE; inside `ChatThread` the facade passes already-resolved booleans, so `ChatThread` reads plain `=== true` / `!== false`.

- [ ] **Step 2: Replace the body of `src/elements/chat.tsx` with `<ChatThread/>`**

Replace the whole file with the thin facade below (the `Props` interface and `ContextUsage` shape are unchanged from today, re-exported via `ChatThread`):

```tsx
import { defineKitnElement } from './define';
import { ChatThread, type ChatThreadProps, type ChatThreadContextUsage } from '../components/chat-thread';
import type { SlashCommandItem } from '../components/slash-command';
import type { ChatMessage } from './chat-types';
import type { ProseSize } from '../primitives/chat-config';
import type { ModelOption } from '../types';

type Props = Omit<ChatThreadProps,
  'class' | 'onValueChange' | 'onSubmit' | 'onSuggestionClick' | 'onModelChange'
  | 'onMessageAction' | 'onSearch' | 'onVoice' | 'onSlashSelect'> & Record<string, unknown>;

defineKitnElement<Props>('kitn-chat', {
  messages: [], value: undefined, placeholder: 'Send a message...', loading: false,
  suggestions: undefined, suggestionMode: 'submit', proseSize: 'sm',
  codeTheme: 'github-dark-dimmed', codeHighlight: true, chatTitle: undefined,
  models: undefined, currentModel: undefined, context: undefined, scrollButton: true,
  search: false, voice: false, slashCommands: undefined, slashActiveIds: undefined, slashCompact: false,
}, (props, { dispatch, flag }) => (
  <ChatThread
    messages={props.messages} value={props.value as string | undefined} placeholder={props.placeholder as string}
    loading={flag('loading')} suggestions={props.suggestions as string[] | undefined}
    suggestionMode={props.suggestionMode as 'submit' | 'fill'} proseSize={props.proseSize as ProseSize}
    codeTheme={props.codeTheme as string} codeHighlight={flag('codeHighlight')}
    chatTitle={props.chatTitle as string | undefined} models={props.models as ModelOption[] | undefined}
    currentModel={props.currentModel as string | undefined} context={props.context as ChatThreadContextUsage | undefined}
    scrollButton={props.scrollButton !== false} search={flag('search')} voice={flag('voice')}
    slashCommands={props.slashCommands as SlashCommandItem[] | undefined}
    slashActiveIds={props.slashActiveIds as string[] | undefined} slashCompact={flag('slashCompact')}
    onValueChange={(value) => dispatch('valuechange', { value })}
    onSubmit={(detail) => dispatch('submit', detail)}
    onSuggestionClick={(value) => dispatch('suggestionclick', { value })}
    onModelChange={(modelId) => dispatch('modelchange', { modelId })}
    onMessageAction={(detail) => dispatch('messageaction', detail)}
    onSearch={() => dispatch('search', {})}
    onVoice={() => dispatch('voice', {})}
    onSlashSelect={(command) => dispatch('slashselect', { command })}
  />
));
```

Keep the JSDoc prop comments from the old `chat.tsx` on the `ChatThreadProps` fields (the doc generator reads them for `element-types.d.ts`/llms). Move each `/** … */` comment from old `chat.tsx`'s `Props` onto the matching `ChatThreadProps` field.

- [ ] **Step 3: Run the existing element test — must pass unchanged**

Run: `npx vitest run tests/elements/chat-element.test.tsx`
Expected: 3 passed (renders+submit, messageaction, codeHighlight=false). This is the proof the refactor preserved behavior.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors (3 tsconfigs).

- [ ] **Step 5: Screenshot kitn-chat unchanged**

Start Storybook (`npm run storybook`), then with an ephemeral `.mjs` in repo root screenshot `iframe.html?id=web-components-kitn-chat--default&viewMode=story` (the existing kitn-chat story id; confirm via `curl -s localhost:6006/index.json`). Confirm the rendered chat looks identical to before. Delete the `.mjs`.

- [ ] **Step 6: Commit**

```bash
git add src/components/chat-thread.tsx src/elements/chat.tsx
git commit -m "refactor(elements): extract shared ChatThread from kitn-chat

No behavior change (kitn-chat element test + screenshot unchanged); ChatThread
will be reused by kitn-chat-workspace."
```

---

### Task 2: `kitn-chat-workspace` facade + registration + element test

**Files:**
- Create: `src/elements/chat-workspace.tsx`
- Modify: `src/elements/register.ts` (add one import line)
- Create: `tests/elements/workspace-element.test.tsx`

- [ ] **Step 1: Write the failing element test**

```tsx
// tests/elements/workspace-element.test.tsx
import '../../src/elements/chat-workspace';
import type { ChatMessage } from '../../src/elements/chat-types';
import type { ConversationSummary } from '../../src/types';

if (!Element.prototype.scrollTo) { Element.prototype.scrollTo = () => {}; }

const conversations: ConversationSummary[] = [
  { id: 'c1', title: 'First chat', scope: { type: 'document' }, messageCount: 2, lastMessageAt: '2026-06-13T10:00:00Z', updatedAt: '2026-06-13T10:00:00Z' },
];
const messages: ChatMessage[] = [
  { id: 'm1', role: 'user', content: 'Hi there' },
  { id: 'm2', role: 'assistant', content: 'Hello!' },
];

test('renders the list + thread and emits conversationselect and submit', async () => {
  const el = document.createElement('kitn-chat-workspace') as HTMLElement & { conversations: ConversationSummary[]; messages: ChatMessage[] };
  el.conversations = conversations;
  el.messages = messages;
  document.body.appendChild(el);
  await Promise.resolve();

  expect(el.shadowRoot!.textContent).toContain('First chat'); // sidebar
  expect(el.shadowRoot!.textContent).toContain('Hi there');    // thread

  let selected: string | null = null;
  el.addEventListener('conversationselect', (e) => (selected = (e as CustomEvent).detail.id));
  // the conversation row is a button containing the title
  const row = [...el.shadowRoot!.querySelectorAll('button')].find((b) => b.textContent?.includes('First chat'))!;
  row.click();
  expect(selected).toBe('c1');

  let submitted: string | null = null;
  el.addEventListener('submit', (e) => (submitted = (e as CustomEvent).detail.value));
  const textarea = el.shadowRoot!.querySelector('textarea')!;
  textarea.value = 'q';
  textarea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
  expect(submitted).toBe('q');

  el.remove();
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run tests/elements/workspace-element.test.tsx`
Expected: FAIL — `kitn-chat-workspace` is not defined (element import resolves but tag unregistered until the facade exists).

- [ ] **Step 3: Create `src/elements/chat-workspace.tsx`**

```tsx
import { createSignal, Show } from 'solid-js';
import { defineKitnElement } from './define';
import { ChatThread, type ChatThreadContextUsage } from '../components/chat-thread';
import { ConversationList } from '../components/conversation-list';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../ui/resizable';
import { Button } from '../ui/button';
import { PanelLeftOpen } from 'lucide-solid';
import type { SlashCommandItem } from '../components/slash-command';
import type { ChatMessage } from './chat-types';
import type { ProseSize } from '../primitives/chat-config';
import type { ModelOption, ConversationGroup, ConversationSummary } from '../types';

interface Props extends Record<string, unknown> {
  /** Pre-bucketed conversation groups for the sidebar. Set as a JS property. */
  groups: ConversationGroup[];
  /** Flat conversation list (auto-bucketed if `groups` is empty). Set as a JS property. */
  conversations: ConversationSummary[];
  /** Id of the open conversation, highlighted in the sidebar. */
  activeId?: string;
  /** The active conversation's message thread, newest last. Set as a JS property. */
  messages: ChatMessage[];
  value?: string;
  placeholder?: string;
  loading?: boolean;
  suggestions?: string[];
  suggestionMode?: 'submit' | 'fill';
  proseSize?: ProseSize;
  codeTheme?: string;
  codeHighlight?: boolean;
  chatTitle?: string;
  models?: ModelOption[];
  currentModel?: string;
  context?: ChatThreadContextUsage;
  scrollButton?: boolean;
  search?: boolean;
  voice?: boolean;
  slashCommands?: SlashCommandItem[];
  slashActiveIds?: string[];
  slashCompact?: boolean;
  /** Sidebar default width as a percent of the workspace (default 22). */
  sidebarWidth?: number;
  /** Sidebar min width in px (default 200). */
  sidebarMinWidth?: number;
  /** Sidebar max width in px (default 420). */
  sidebarMaxWidth?: number;
  /** Initial collapsed state of the sidebar (default false). */
  sidebarCollapsed?: boolean;
}

defineKitnElement<Props>('kitn-chat-workspace', {
  groups: [], conversations: [], activeId: undefined, messages: [],
  value: undefined, placeholder: 'Send a message...', loading: false,
  suggestions: undefined, suggestionMode: 'submit', proseSize: 'sm',
  codeTheme: 'github-dark-dimmed', codeHighlight: true, chatTitle: undefined,
  models: undefined, currentModel: undefined, context: undefined, scrollButton: true,
  search: false, voice: false, slashCommands: undefined, slashActiveIds: undefined, slashCompact: false,
  sidebarWidth: 22, sidebarMinWidth: 200, sidebarMaxWidth: 420, sidebarCollapsed: false,
}, (props, { dispatch, flag }) => {
  const [collapsed, setCollapsed] = createSignal(props.sidebarCollapsed === true);
  const toggle = () => { const next = !collapsed(); setCollapsed(next); dispatch('sidebartoggle', { collapsed: next }); };

  const thread = (extraClass: string) => (
    <ChatThread
      class={extraClass}
      messages={props.messages} value={props.value as string | undefined} placeholder={props.placeholder as string}
      loading={flag('loading')} suggestions={props.suggestions as string[] | undefined}
      suggestionMode={props.suggestionMode as 'submit' | 'fill'} proseSize={props.proseSize as ProseSize}
      codeTheme={props.codeTheme as string} codeHighlight={flag('codeHighlight')}
      chatTitle={props.chatTitle as string | undefined} models={props.models as ModelOption[] | undefined}
      currentModel={props.currentModel as string | undefined} context={props.context as ChatThreadContextUsage | undefined}
      scrollButton={props.scrollButton !== false} search={flag('search')} voice={flag('voice')}
      slashCommands={props.slashCommands as SlashCommandItem[] | undefined}
      slashActiveIds={props.slashActiveIds as string[] | undefined} slashCompact={flag('slashCompact')}
      onValueChange={(value) => dispatch('valuechange', { value })}
      onSubmit={(detail) => dispatch('submit', detail)}
      onSuggestionClick={(value) => dispatch('suggestionclick', { value })}
      onModelChange={(modelId) => dispatch('modelchange', { modelId })}
      onMessageAction={(detail) => dispatch('messageaction', detail)}
      onSearch={() => dispatch('search', {})}
      onVoice={() => dispatch('voice', {})}
      onSlashSelect={(command) => dispatch('slashselect', { command })}
    />
  );

  return (
    <div class="h-full w-full overflow-hidden bg-background">
      <Show
        when={!collapsed()}
        fallback={
          <div class="relative h-full">
            <Button
              variant="ghost" size="icon-sm" aria-label="Open sidebar"
              class="absolute left-2 top-2 z-10 rounded-full bg-card/80 shadow-sm backdrop-blur"
              onClick={toggle}
            >
              <PanelLeftOpen class="size-4" />
            </Button>
            {thread('')}
          </div>
        }
      >
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize={props.sidebarWidth as number} data-min-size={String(props.sidebarMinWidth)} data-max-size={String(props.sidebarMaxWidth)}>
            <ConversationList
              groups={props.groups} conversations={props.conversations} activeId={props.activeId as string | undefined}
              onSelect={(id) => dispatch('conversationselect', { id })}
              onNewChat={() => dispatch('newchat')}
              onToggleSidebar={toggle}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel>{thread('')}</ResizablePanel>
        </ResizablePanelGroup>
      </Show>
    </div>
  );
});
```

- [ ] **Step 4: Register the element** — add to `src/elements/register.ts` after the `import './chat';` line:

```ts
import './chat-workspace';
```

- [ ] **Step 5: Run the workspace test — expect PASS**

Run: `npx vitest run tests/elements/workspace-element.test.tsx`
Expected: PASS (renders list + thread, emits conversationselect + submit).

- [ ] **Step 6: Confirm registration test still passes**

Run: `npx vitest run tests/elements/register.test.ts`
Expected: PASS (the existing 3-element assertion is unaffected).

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/elements/chat-workspace.tsx src/elements/register.ts tests/elements/workspace-element.test.tsx
git commit -m "feat(elements): add <kitn-chat-workspace> (list + chat + resize)"
```

---

### Task 3: Storybook story under `Web Components/kitn-chat-workspace`

**Files:**
- Create: `src/elements/kitn-chat-workspace.stories.tsx`

Model it on the existing `src/elements/kitn-chat.stories.tsx` (read it first for the element-story conventions: importing `./register`, setting properties via `ref`, listening for events via `on:`). The story renders the element at a fixed size so resize/collapse are visible.

- [ ] **Step 1: Read the existing element-story pattern**

Run: `sed -n '1,60p' src/elements/kitn-chat.stories.tsx`
Use the same `title: 'Web Components/...'`, `register` import, and `ref`-set-properties pattern.

- [ ] **Step 2: Write `src/elements/kitn-chat-workspace.stories.tsx`**

```tsx
import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import './register';
import type { ConversationGroup, ConversationSummary, ModelOption } from '../types';
import type { ChatMessage } from './chat-types';

const groups: ConversationGroup[] = [
  { id: 'today', name: 'Today', sortOrder: 0, createdAt: '2026-06-13' },
];
const conversations: ConversationSummary[] = [
  { id: '1', title: 'Web component architecture', groupId: 'today', scope: { type: 'document' }, messageCount: 12, lastMessageAt: '2026-06-13T15:30:00Z', updatedAt: '2026-06-13T15:30:00Z' },
  { id: '2', title: 'Theming & tokens', groupId: 'today', scope: { type: 'document' }, messageCount: 5, lastMessageAt: '2026-06-13T11:20:00Z', updatedAt: '2026-06-13T11:20:00Z' },
];
const models: ModelOption[] = [
  { id: 'claude-4', name: 'Claude 4 Opus', provider: 'Anthropic' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
];
const messages: ChatMessage[] = [
  { id: 'm1', role: 'user', content: 'How do I drop the whole chat app in with one tag?' },
  { id: 'm2', role: 'assistant', content: 'Use `<kitn-chat-workspace>` — set `conversations`, `messages`, and `models` as properties and listen for `conversationselect` + `submit`.', actions: ['copy', 'like'] },
];

const meta: Meta = {
  title: 'Web Components/kitn-chat-workspace',
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <div style={{ height: '720px', width: '100%' }}>
      <kitn-chat-workspace
        prop:groups={groups}
        prop:conversations={conversations}
        prop:activeId={'1'}
        prop:messages={messages}
        prop:models={models}
        prop:currentModel={'claude-4'}
        prop:chatTitle={'Web component architecture'}
        on:conversationselect={(e: CustomEvent) => console.log('select', e.detail)}
        on:submit={(e: CustomEvent) => console.log('submit', e.detail)}
        on:sidebartoggle={(e: CustomEvent) => console.log('sidebartoggle', e.detail)}
        style={{ display: 'block', height: '100%' }}
      />
    </div>
  ),
};
```

(If TS flags the intrinsic element/`prop:`/`on:` usage, mirror exactly what `kitn-chat.stories.tsx` does — it already resolves these via the generated element types + solid-js JSX namespace.)

- [ ] **Step 3: Verify it registers + screenshot (light + dark, resize + collapse)**

Start Storybook; confirm `web-components-kitn-chat-workspace--default` appears in `localhost:6006/index.json`. With an ephemeral repo-root `.mjs`: screenshot the story; then click the sidebar collapse toggle and screenshot again (sidebar gone, expand button visible); toggle dark via `document.documentElement.classList.add('dark')` and screenshot. Confirm: list left, chat right, drag handle between, collapse works, blue focus ring on tab. Delete the `.mjs`.

- [ ] **Step 4: Commit**

```bash
git add src/elements/kitn-chat-workspace.stories.tsx
git commit -m "docs(storybook): add kitn-chat-workspace story"
```

---

### Task 4: Docs (`web-components.md` + Integrations) + regen

**Files:**
- Modify: `docs/web-components.md`
- Modify: `src/stories/docs/Integrations.mdx`

- [ ] **Step 1: Document the element in `docs/web-components.md`**

Find where `kitn-chat` is documented (`grep -n "kitn-chat" docs/web-components.md`) and add a `kitn-chat-workspace` section after it: a one-paragraph intro ("the full app shell in one tag — list + chat + resize"), the property table (groups, conversations, activeId, messages, models, currentModel, context, sidebarWidth/MinWidth/MaxWidth, sidebarCollapsed, plus the shared chat props), the event table (conversationselect, newchat, sidebartoggle, submit, valuechange, modelchange, messageaction, search, voice, slashselect, suggestionclick), and a minimal HTML snippet setting `conversations`/`messages`/`models` as properties and listening for `conversationselect` + `submit`.

- [ ] **Step 2: Add a short mention in `src/stories/docs/Integrations.mdx`**

Where the docs describe dropping in `<kitn-chat>`, add a note that `<kitn-chat-workspace>` bundles the list+chat+resize layout for apps that want the whole shell in one tag.

- [ ] **Step 3: Rebuild to regenerate element types + llms**

Run: `npm run build`
Expected: BUILD OK. This regenerates `src/elements/element-types.d.ts`, `dist/custom-elements.json`, `llms.txt`, `llms-full.txt` to include `kitn-chat-workspace` (verify: `grep -c kitn-chat-workspace llms-full.txt` ≥ 1).

- [ ] **Step 4: Commit**

```bash
git add docs/web-components.md src/stories/docs/Integrations.mdx llms.txt llms-full.txt
git commit -m "docs: document <kitn-chat-workspace> (web-components.md + integrations + llms)"
```

---

### Task 5: Full validation gate

- [ ] **Step 1: Build**  — Run: `npm run build` → BUILD OK.
- [ ] **Step 2: Typecheck** — Run: `npm run typecheck` → no errors.
- [ ] **Step 3: Unit tests** — Run: `npm test` → only the 3 baseline Shiki failures in `tests/primitives/highlighter.test.ts`; `chat-element`, `workspace-element`, and `register` tests all pass.
- [ ] **Step 4: React wrappers** — Run: `npm run test:react` → 5/5 pass (unaffected, but confirm).
- [ ] **Step 5: a11y audit** — Serve the showcase (`npm run examples`, :8000) and run `node scripts/audit-a11y.mjs` → 0 kit violations (light + dark). (The workspace isn't in the showcase page; the audit confirms no regression to the existing elements. The element-level a11y is covered by the Storybook screenshot + keyboard-focus check in Task 3.)
- [ ] **Step 6: Final commit if anything regenerated**

```bash
git add -A
git commit -m "chore: rebuild artifacts for kitn-chat-workspace" || echo "nothing to commit"
```

---

## Self-review notes (author)

- **Spec coverage:** name (Task 2), fully-controlled data (Task 2 props), resizable + manual collapse + `sidebartoggle` + `sidebarCollapsed` initial (Task 2), shared ChatThread extraction + kitn-chat unchanged (Task 1), registration (Task 2), story (Task 3), docs + llms (Task 4), validation gate (Task 5). Auto-collapse is explicitly out of scope — no task, by design.
- **Types:** `ChatThreadProps` defined in Task 1 is consumed verbatim in Tasks 1–3; `Props` in Task 2 mirrors it plus the four sidebar* fields and the list fields. Event names match the spec's event table exactly.
- **No unit test for collapse toggle interaction** beyond render+events — collapse is verified visually in Task 3 (screenshot before/after toggle), which is the kit's practice for layout behavior.
