import { createSignal, onCleanup, onMount } from 'solid-js';
import { defineWebComponent } from './define';
import { ChatThread, type ChatThreadProps, type ChatThreadContextUsage } from '../components/chat-thread';
import type { AttachmentData } from '../components/attachments';
import type { SlashCommandItem } from '../components/slash-command';
import type { ProseSize } from '../primitives/chat-config';
import type { ModelOption } from '../types';

type Props = Omit<ChatThreadProps,
  'class' | 'onValueChange' | 'onSubmit' | 'onSuggestionClick' | 'onModelChange'
  | 'onMessageAction' | 'onSearch' | 'onVoice' | 'onSlashSelect'> & Record<string, unknown>;

interface Events {
  /** User submitted a message. */
  'kc-submit': { value: string; attachments: AttachmentData[] };
  /** Fired on every input change. */
  'kc-value-change': { value: string };
  /** A suggestion chip was clicked (only in `suggestion-mode="fill"`). */
  'kc-suggestion-click': { value: string };
  /** An action button on a message was clicked. `action` is the built-in name or custom id. */
  'kc-message-action': { messageId: string; action: string };
  /** The header model switcher changed. */
  'kc-model-change': { modelId: string };
  /** A slash command was chosen from the palette. */
  'kc-slash-select': { command: SlashCommandItem };
  /** The Search button was clicked. */
  'kc-search': Record<string, never>;
  /** The Mic / voice button was clicked. */
  'kc-voice': Record<string, never>;
}

defineWebComponent<Props, Events>('kc-chat', {
  messages: [], value: undefined, placeholder: 'Send a message...', loading: false,
  suggestions: undefined, suggestionMode: 'submit', proseSize: 'sm',
  codeTheme: 'github-dark-dimmed', codeHighlight: true, chatTitle: undefined,
  models: undefined, currentModel: undefined, context: undefined, scrollButton: true,
  search: false, voice: false, slashCommands: undefined, slashActiveIds: undefined, slashCompact: false,
  actionsReveal: 'always',
}, (props, { dispatch, flag, element }) => {
  // Detect consumer-projected header controls so the header opens for them even
  // without a title/models/context. Mirrors the <kc-model> light-DOM read pattern.
  const [hasHeaderStart, setHasHeaderStart] = createSignal(false);
  const [hasHeaderEnd, setHasHeaderEnd] = createSignal(false);
  onMount(() => {
    const read = () => {
      setHasHeaderStart(!!element.querySelector(':scope > [slot="header-start"]'));
      setHasHeaderEnd(!!element.querySelector(':scope > [slot="header-end"]'));
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true });
    onCleanup(() => observer.disconnect());
  });

  return (
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
    actionsReveal={props.actionsReveal as 'always' | 'hover'}
    onValueChange={(value) => dispatch('kc-value-change', { value })}
    onSubmit={(detail) => dispatch('kc-submit', detail)}
    onSuggestionClick={(value) => dispatch('kc-suggestion-click', { value })}
    onModelChange={(modelId) => dispatch('kc-model-change', { modelId })}
    onMessageAction={(detail) => dispatch('kc-message-action', detail)}
    onSearch={() => dispatch('kc-search', {})}
    onVoice={() => dispatch('kc-voice', {})}
    onSlashSelect={(command) => dispatch('kc-slash-select', { command })}
    headerStart={hasHeaderStart()}
    headerEnd={hasHeaderEnd()}
  />
  );
});
