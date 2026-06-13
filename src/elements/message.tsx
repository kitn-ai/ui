import { For, Show, type Component } from 'solid-js';
import { defineKitnElement } from './define';
import { ChatConfig, useChatConfig, type ProseSize } from '../primitives/chat-config';
import { Message, MessageContent, MessageActions } from '../components/message';
import { Reasoning, ReasoningTrigger, ReasoningContent } from '../components/reasoning';
import { Tool } from '../components/tool';
import { Attachments, Attachment, AttachmentPreview, AttachmentInfo } from '../components/attachments';
import { Button } from '../ui/button';
import { Copy, ThumbsUp, ThumbsDown, RefreshCw, Pencil } from 'lucide-solid';
import type { ChatMessage, ChatMessageAction } from './chat-types';

interface Props extends Record<string, unknown> {
  /** The full message object. Set as a JS property. */
  message?: ChatMessage;
  /** Convenience for simple cases when not passing a `message` object. */
  role?: 'user' | 'assistant';
  /** Convenience content (used when `message` is not set). */
  content?: string;
  /** Force markdown on/off. Defaults to on for assistant, off for user. */
  markdown?: boolean;
  /** Text/markdown sizing for the message body. */
  proseSize?: ProseSize;
  /** Shiki theme name used for fenced code blocks in the content. */
  codeTheme?: string;
  /** Disable syntax highlighting for code blocks (no Shiki loads). */
  codeHighlight?: boolean;
}

/** Events fired by `<kc-message>`. */
interface Events {
  /** An action button was clicked. */
  messageaction: { messageId: string; action: ChatMessageAction };
}

const ACTION_LABEL: Record<ChatMessageAction, string> = {
  copy: 'Copy', like: 'Like', dislike: 'Dislike', regenerate: 'Regenerate', edit: 'Edit',
};
const ACTION_ICON: Record<ChatMessageAction, Component<{ class?: string }>> = {
  copy: Copy, like: ThumbsUp, dislike: ThumbsDown, regenerate: RefreshCw, edit: Pencil,
};

/**
 * `<kc-message>` — a single message row: markdown/plain content, reasoning,
 * tool calls, attachments, and action buttons, rendered from one `message`
 * object (the same shape `<kc-chat>` uses per message). The keystone of the
 * "compose your own message list" pattern. Emits `messageaction`.
 */
defineKitnElement<Props, Events>('kc-message', {
  message: undefined,
  role: 'assistant',
  content: undefined,
  markdown: undefined,
  proseSize: 'sm',
  codeTheme: 'github-dark-dimmed',
  codeHighlight: true,
}, (props, { dispatch, flag, element }) => {
  const outer = useChatConfig();
  const msg = (): ChatMessage =>
    props.message ?? { id: 'message', role: props.role ?? 'assistant', content: props.content ?? '' };
  const isUser = () => msg().role === 'user';
  // markdown: explicit prop/attribute wins; otherwise default by role.
  const markdownExplicit = () =>
    element.hasAttribute('markdown') || props.markdown === true || props.markdown === false;
  const useMarkdown = () => (markdownExplicit() ? flag('markdown') : !isUser());

  return (
    <ChatConfig
      proseSize={props.proseSize}
      codeTheme={props.codeTheme}
      codeHighlight={flag('codeHighlight')}
      portalMount={outer.portalMount()}
    >
      <Message class={isUser() ? 'flex-col items-end' : 'flex-col items-start'}>
        <Show when={msg().reasoning}>
          <Reasoning class="mb-2 w-full">
            <ReasoningTrigger>{msg().reasoning!.label ?? 'Reasoning'}</ReasoningTrigger>
            <ReasoningContent markdown>{msg().reasoning!.text}</ReasoningContent>
          </Reasoning>
        </Show>
        <For each={msg().tools ?? []}>
          {(tp) => <Tool toolPart={tp} class="mb-2 w-full" />}
        </For>
        <Show when={msg().attachments?.length}>
          <Attachments variant="inline" class={isUser() ? 'mb-2 justify-end' : 'mb-2'}>
            <For each={msg().attachments!}>
              {(att) => (
                <Attachment data={att}>
                  <AttachmentPreview />
                  <AttachmentInfo />
                </Attachment>
              )}
            </For>
          </Attachments>
        </Show>
        <MessageContent
          markdown={useMarkdown()}
          class={isUser()
            ? 'bg-muted text-primary max-w-[85%] rounded-2xl px-4 py-2'
            : 'bg-transparent p-0'}
        >
          {msg().content}
        </MessageContent>
        <Show when={msg().actions?.length}>
          <MessageActions class="mt-1 flex gap-0">
            <For each={msg().actions!}>
              {(a) => (
                <Button
                  variant="ghost" size="icon-sm" class="rounded-full"
                  data-action={a}
                  aria-label={ACTION_LABEL[a]}
                  onClick={() => dispatch('messageaction', { messageId: msg().id, action: a })}
                >
                  {(() => {
                    const Icon = ACTION_ICON[a];
                    return <Icon class="size-3.5" />;
                  })()}
                </Button>
              )}
            </For>
          </MessageActions>
        </Show>
      </Message>
    </ChatConfig>
  );
});
