import { Show, createSignal, onMount, onCleanup } from 'solid-js';
import { defineWebComponent } from './define';
import { ChatConfig, useChatConfig, type ProseSize } from '../primitives/chat-config';
import { Message, MessageAvatar, MessageBody } from '../components/message';
import { createMessageFeedback } from '../primitives/message-feedback';
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

/** Events fired by `<kai-message>`. */
interface Events {
  /** An action button was clicked. `action` is the built-in name or custom id.
   *  `state` is present only for the toggleable feedback votes: `'on'` when a
   *  like/dislike is set, `'off'` when re-tapped to clear. */
  'kai-message-action': { messageId: string; action: string; state?: 'on' | 'off' };
}

/**
 * `<kai-message>` — a single message row: markdown/plain content, reasoning,
 * tool calls, attachments, and action buttons, rendered from one `message`
 * object (the same shape `<kai-chat>` uses per message). The keystone of the
 * "compose your own message list" pattern. Emits `kai-message-action`.
 */
defineWebComponent<Props, Events>('kai-message', {
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
  // Copy + vote state lives here (above the rendered body) so it survives a
  // re-render when the host swaps in a fresh `message` object during streaming.
  const feedback = createMessageFeedback({
    emit: (detail) => dispatch('kai-message-action', detail),
    target: () => element,
  });

  // Read declarative <kai-action> children from light DOM.
  // Shadow DOM with no <slot> suppresses them visually — they're invisible data carriers.
  const [slottedActions, setSlottedActions] = createSignal<import('../elements/chat-types').CustomAction[]>([]);
  onMount(() => {
    const read = () => {
      const nodes = [...element.querySelectorAll('kai-action')];
      setSlottedActions(nodes.map(n => ({
        id: n.id || n.getAttribute('action') || '',
        label: n.textContent?.trim() || n.getAttribute('label') || n.id || '',
        icon: n.getAttribute('icon') ?? undefined,
        tooltip: n.getAttribute('tooltip') ?? undefined,
      })));
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true, attributes: true, subtree: true });
    onCleanup(() => observer.disconnect());
  });
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

  const mergedActions = () => [...(msg().actions ?? []), ...slottedActions()];
  const body = () => (
    <MessageBody
      content={msg().content}
      reasoning={msg().reasoning}
      tools={msg().tools}
      attachments={msg().attachments}
      isUser={isUser()}
      markdown={useMarkdown()}
      actions={mergedActions()}
      actionsReveal={reveal()}
      activeFeedback={feedback.resolveFeedback(msg())}
      copied={feedback.isCopied(msg().id)}
      onAction={(action) => feedback.handleAction(msg(), action)}
    />
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
