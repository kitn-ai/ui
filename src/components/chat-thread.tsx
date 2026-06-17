import { createSignal, For, Show } from 'solid-js';
import { ChatConfig, useChatConfig } from '../primitives/chat-config';
import { ChatContainer, ChatContainerContent, ChatContainerScrollAnchor } from './chat-container';
import { Message, MessageAvatar, MessageContent, MessageActionBar } from './message';
import { Reasoning, ReasoningTrigger, ReasoningContent } from './reasoning';
import { Tool } from './tool';
import { Attachments, Attachment, AttachmentPreview, AttachmentInfo, type AttachmentData } from './attachments';
import { ModelSwitcher } from './model-switcher';
import { ScrollButton } from './scroll-button';
import {
  Context, ContextTrigger, ContextContent, ContextContentHeader,
  ContextContentBody, ContextContentFooter, ContextInputUsage, ContextOutputUsage,
} from './context';
import { DefaultPromptInput } from '../elements/default-input';
import type { SlashCommandItem } from './slash-command';
import type { ChatMessage } from '../elements/chat-types';
import type { ProseSize } from '../primitives/chat-config';
import type { ModelOption } from '../types';

export interface ChatThreadContextUsage {
  usedTokens: number;
  maxTokens: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCost?: number;
}

export interface ChatThreadProps {
  /** Extra classes for the thread root (e.g. `h-full`). */
  class?: string;
  /** The full message thread to render, newest last. Each entry carries its role,
   *  content, and optional reasoning/tools/attachments/actions. Set as a JS
   *  property (`el.messages = [...]`). */
  messages: ChatMessage[];
  /** Controlled value of the input. When set, the host owns the input text and
   *  must update it on `kc-value-change`; leave unset for uncontrolled behavior. */
  value?: string;
  /** Placeholder text shown in the empty input. */
  placeholder?: string;
  /** When true, shows the loading/streaming state and disables submit (use while
   *  awaiting the assistant's reply). */
  loading?: boolean;
  /** Starter prompts shown above the input when the thread is empty. Clicking one
   *  follows `suggestionMode`. Set as a JS property. */
  suggestions?: string[];
  /** What clicking a suggestion does: `'submit'` (default) sends it immediately
   *  as if typed and submitted; `'fill'` just places it in the input. */
  suggestionMode?: 'submit' | 'fill';
  /** Keep suggestions visible after the conversation starts. By default
   *  suggestions are conversation starters and hide once `messages` is
   *  non-empty; set this to keep them always shown. Default false. */
  persistSuggestions?: boolean;
  /** Body/prose font scale for rendered markdown (`'xs' | 'sm' | 'base' | 'lg'`).
   *  Defaults to `'sm'`. */
  proseSize?: ProseSize;
  /** Shiki theme name for syntax-highlighted code blocks (e.g.
   *  `'github-dark-dimmed'`). */
  codeTheme?: string;
  /** Enable Shiki syntax highlighting in code blocks. Turn off to render plain
   *  `<pre>` blocks (lighter, no highlighter load). Default true. */
  codeHighlight?: boolean;
  /** Optional header title shown on the left of the header. */
  chatTitle?: string;
  /** Optional model list. When set (>1 model) a ModelSwitcher is shown in the
   *  header and a `kc-model-change` event fires on selection. */
  models?: ModelOption[];
  /** The currently selected model id (pairs with `models`). */
  currentModel?: string;
  /** Optional context-window token usage. When set, a Context token meter is
   *  shown in the header. */
  context?: ChatThreadContextUsage;
  /** Show the scroll-to-bottom button inside the scroll area. Default true. */
  scrollButton?: boolean;
  /** Whether the host has `slot="header-start"` content (left of the title) —
   *  set by the `<kc-chat>` facade so a custom control forces the header open. */
  headerStart?: boolean;
  /** Whether the host has `slot="header-end"` content (right of the controls). */
  headerEnd?: boolean;
  /** Show a Search (Globe) button in the input toolbar; fires a `search` event. */
  search?: boolean;
  /** Show a Voice (Mic) button in the input toolbar; fires a `voice` event. */
  voice?: boolean;
  /** Slash commands — when set, typing `/` in the input opens the command
   *  palette and fires `kc-slash-select`. Set as a JS property. */
  slashCommands?: SlashCommandItem[];
  /** Command ids to highlight as active in the palette. */
  slashActiveIds?: string[];
  /** Single-line palette rows. */
  slashCompact?: boolean;
  /** Whether each message's action bar is always visible (`'always'`, default)
   *  or only revealed on hover of that message row (`'hover'`). */
  actionsReveal?: 'always' | 'hover';
  // callbacks (the facade maps these to dispatch())
  onValueChange?: (value: string) => void;
  onSubmit?: (detail: { value: string; attachments: AttachmentData[] }) => void;
  onSuggestionClick?: (value: string) => void;
  onModelChange?: (modelId: string) => void;
  onMessageAction?: (detail: { messageId: string; action: string }) => void;
  onSearch?: () => void;
  onVoice?: () => void;
  onSlashSelect?: (command: SlashCommandItem) => void;
}

export function ChatThread(props: ChatThreadProps) {
  const outer = useChatConfig();
  const reveal = () => (props.actionsReveal === 'hover' ? 'hover' : 'always');
  const [internal, setInternal] = createSignal(props.value ?? '');
  const [attachments, setAttachments] = createSignal<AttachmentData[]>([]);
  const current = () => props.value ?? internal();
  const handleChange = (v: string) => { setInternal(v); props.onValueChange?.(v); };
  const handleSubmit = () => { props.onSubmit?.({ value: current(), attachments: attachments() }); setAttachments([]); };
  const handleSuggestionClick = (v: string) => {
    if ((props.suggestionMode ?? 'submit') === 'fill') { handleChange(v); props.onSuggestionClick?.(v); }
    else { props.onSubmit?.({ value: v, attachments: attachments() }); setAttachments([]); }
  };
  const showHeader = () => !!(props.chatTitle || props.models || props.context || props.headerStart || props.headerEnd);
  // Suggestions are conversation starters: show only on an empty thread unless
  // the host opts into persisting them.
  const visibleSuggestions = () =>
    props.persistSuggestions || props.messages.length === 0 ? props.suggestions : undefined;
  const showScrollButton = () => props.scrollButton !== false;

  return (
    <ChatConfig proseSize={props.proseSize} codeTheme={props.codeTheme} codeHighlight={props.codeHighlight !== false} portalMount={outer.portalMount()}>
      <div class={`flex h-full flex-col bg-background ${props.class ?? ''}`}>
        <Show when={showHeader()}>
          <header class="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
            <div class="flex items-center gap-2">
              {/* Consumer-injected leading controls (sidebar-toggle, compose, a
                  popover title-button). Projects light-DOM `slot="header-start"`
                  children of <kc-chat>; inert outside a shadow root. */}
              <slot name="header-start" />
              <Show when={props.chatTitle}>
                <div class="text-sm font-semibold text-foreground">{props.chatTitle}</div>
              </Show>
            </div>
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
              {/* Consumer-injected trailing controls (share, settings, …).
                  Projects light-DOM `slot="header-end"` children of <kc-chat>. */}
              <slot name="header-end" />
            </div>
          </header>
        </Show>
        <div class="relative flex-1 overflow-hidden">
          <ChatContainer class="h-full px-4 py-3">
            <ChatContainerContent class="mx-auto w-full max-w-3xl space-y-4">
              <For each={props.messages}>
                {(m) => {
                  const body = (
                    <>
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
                        <MessageActionBar
                          actions={m.actions!}
                          reveal={reveal()}
                          onAction={(action) => props.onMessageAction?.({ messageId: m.id, action })}
                        />
                      </Show>
                    </>
                  );
                  const rowGroup = reveal() === 'hover' ? 'group ' : '';
                  return (
                    <Show
                      when={m.avatar}
                      fallback={
                        <Message class={`${rowGroup}${m.role === 'user' ? 'flex-col items-end' : 'flex-col items-start'}`}>
                          {body}
                        </Message>
                      }
                    >
                      {(av) => (
                        <Message class={rowGroup}>
                          <MessageAvatar src={av().src ?? ''} alt={av().alt ?? ''} fallback={av().fallback} />
                          <div class={`flex min-w-0 flex-1 flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                            {body}
                          </div>
                        </Message>
                      )}
                    </Show>
                  );
                }}
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
              suggestions={visibleSuggestions()} attachments={attachments()}
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
