import { For, Show } from 'solid-js';
import { defineWebComponent } from './define';
import { ChatConfig, useChatConfig, type ProseSize } from '../primitives/chat-config';
import { Message, MessageAvatar, MessageContent, MessageActionBar } from '../components/message';
import { Reasoning, ReasoningTrigger, ReasoningContent } from '../components/reasoning';
import { Tool } from '../components/tool';
import { Attachments, Attachment, AttachmentPreview, AttachmentInfo } from '../components/attachments';
import type { ChatMessage } from './chat-types';

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
  /** Whether the action bar is always visible (`'always'`, default) or only
   *  revealed on hover of the message row (`'hover'`). */
  actionsReveal?: 'always' | 'hover';
  /** Convenience avatar image URL (used when `message.avatar` is not set). */
  avatarSrc?: string;
  /** Convenience avatar fallback text (used when `message.avatar` is not set). */
  avatarFallback?: string;
}

/** Events fired by `<kc-message>`. */
interface Events {
  /** An action button was clicked. `action` is the built-in name or custom id. */
  messageaction: { messageId: string; action: string };
}

/**
 * `<kc-message>` — a single message row: markdown/plain content, reasoning,
 * tool calls, attachments, and action buttons, rendered from one `message`
 * object (the same shape `<kc-chat>` uses per message). The keystone of the
 * "compose your own message list" pattern. Emits `messageaction`.
 */
defineWebComponent<Props, Events>('kc-message', {
  message: undefined,
  role: 'assistant',
  content: undefined,
  markdown: undefined,
  proseSize: 'sm',
  codeTheme: 'github-dark-dimmed',
  codeHighlight: true,
  actionsReveal: 'always',
  avatarSrc: undefined,
  avatarFallback: undefined,
}, (props, { dispatch, flag, element }) => {
  const outer = useChatConfig();
  const msg = (): ChatMessage =>
    props.message ?? { id: 'message', role: props.role ?? 'assistant', content: props.content ?? '' };
  const isUser = () => msg().role === 'user';
  const avatar = () =>
    msg().avatar ??
    (props.avatarSrc || props.avatarFallback
      ? { src: props.avatarSrc as string | undefined, fallback: props.avatarFallback as string | undefined }
      : undefined);
  const reveal = () => (props.actionsReveal === 'hover' ? 'hover' : 'always');
  // markdown: explicit prop/attribute wins; otherwise default by role.
  const markdownExplicit = () =>
    element.hasAttribute('markdown') || props.markdown === true || props.markdown === false;
  const useMarkdown = () => (markdownExplicit() ? flag('markdown') : !isUser());

  const body = () => (
    <>
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
        <MessageActionBar
          actions={msg().actions!}
          reveal={reveal()}
          onAction={(action) => dispatch('messageaction', { messageId: msg().id, action })}
        />
      </Show>
    </>
  );

  // Row carries `group` so a hover-revealed action bar fades in on row hover.
  const rowGroup = () => (reveal() === 'hover' ? 'group ' : '');

  return (
    <ChatConfig
      proseSize={props.proseSize}
      codeTheme={props.codeTheme}
      codeHighlight={flag('codeHighlight')}
      portalMount={outer.portalMount()}
    >
      <Show
        when={avatar()}
        fallback={
          <Message class={`${rowGroup()}${isUser() ? 'flex-col items-end' : 'flex-col items-start'}`}>
            {body()}
          </Message>
        }
      >
        {(av) => (
          <Message class={rowGroup()}>
            <MessageAvatar src={av().src ?? ''} alt={av().alt ?? ''} fallback={av().fallback} />
            <div class={`flex min-w-0 flex-1 flex-col ${isUser() ? 'items-end' : 'items-start'}`}>
              {body()}
            </div>
          </Message>
        )}
      </Show>
    </ChatConfig>
  );
});
