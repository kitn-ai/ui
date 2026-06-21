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
  'kai-submit': { value: string; attachments: AttachmentData[] };
  /** Fired on every input change. */
  'kai-value-change': { value: string };
  /** A suggestion chip was clicked (only in `suggestion-mode="fill"`). */
  'kai-suggestion-click': { value: string };
  /** An action button on a message was clicked. `action` is the built-in name or
   *  custom id. `state` is present only for the toggleable feedback votes:
   *  `'on'` when a like/dislike is set, `'off'` when re-tapped to clear. */
  'kai-message-action': { messageId: string; action: string; state?: 'on' | 'off' };
  /** The header model switcher changed. */
  'kai-model-change': { modelId: string };
  /** A slash command was chosen from the palette. */
  'kai-slash-select': { command: SlashCommandItem };
  /** The Search button was clicked. */
  'kai-search': Record<string, never>;
  /** The Mic / voice button was clicked. */
  'kai-voice': Record<string, never>;
}

defineWebComponent<Props, Events>('kai-chat', {
  messages: [], value: undefined, placeholder: 'Send a message...', loading: false,
  suggestions: undefined, suggestionMode: 'submit', persistSuggestions: false, proseSize: 'sm',
  codeTheme: 'github-dark-dimmed', codeHighlight: true, chatTitle: undefined,
  models: undefined, currentModel: undefined, context: undefined, scrollButton: true,
  search: false, voice: false, slashCommands: undefined, slashActiveIds: undefined, slashCompact: false,
  actionsReveal: 'always',
}, (props, { dispatch, flag, element }) => {
  // Detect consumer-projected header controls so the header opens for them even
  // without a title/models/context. Mirrors the <kai-model> light-DOM read pattern.
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
    suggestionMode={props.suggestionMode as 'submit' | 'fill'} persistSuggestions={flag('persistSuggestions')}
    proseSize={props.proseSize as ProseSize}
    codeTheme={props.codeTheme as string} codeHighlight={flag('codeHighlight')}
    chatTitle={props.chatTitle as string | undefined} models={props.models as ModelOption[] | undefined}
    currentModel={props.currentModel as string | undefined} context={props.context as ChatThreadContextUsage | undefined}
    scrollButton={props.scrollButton !== false} search={flag('search')} voice={flag('voice')}
    slashCommands={props.slashCommands as SlashCommandItem[] | undefined}
    slashActiveIds={props.slashActiveIds as string[] | undefined} slashCompact={flag('slashCompact')}
    actionsReveal={props.actionsReveal as 'always' | 'hover'}
    onValueChange={(value) => dispatch('kai-value-change', { value })}
    onSubmit={(detail) => dispatch('kai-submit', detail)}
    onSuggestionClick={(value) => dispatch('kai-suggestion-click', { value })}
    onModelChange={(modelId) => dispatch('kai-model-change', { modelId })}
    onMessageAction={(detail) => dispatch('kai-message-action', detail)}
    onSearch={() => dispatch('kai-search', {})}
    onVoice={() => dispatch('kai-voice', {})}
    onSlashSelect={(command) => dispatch('kai-slash-select', { command })}
    headerStart={hasHeaderStart()}
    headerEnd={hasHeaderEnd()}
  />
  );
});
