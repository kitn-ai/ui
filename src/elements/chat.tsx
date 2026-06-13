import { defineKitnElement } from './define';
import { ChatThread, type ChatThreadProps, type ChatThreadContextUsage } from '../components/chat-thread';
import type { AttachmentData } from '../components/attachments';
import type { SlashCommandItem } from '../components/slash-command';
import type { ProseSize } from '../primitives/chat-config';
import type { ChatMessageAction } from './chat-types';
import type { ModelOption } from '../types';

type Props = Omit<ChatThreadProps,
  'class' | 'onValueChange' | 'onSubmit' | 'onSuggestionClick' | 'onModelChange'
  | 'onMessageAction' | 'onSearch' | 'onVoice' | 'onSlashSelect'> & Record<string, unknown>;

interface Events {
  /** User submitted a message. */
  submit: { value: string; attachments: AttachmentData[] };
  /** Fired on every input change. */
  valuechange: { value: string };
  /** A suggestion chip was clicked (only in `suggestion-mode="fill"`). */
  suggestionclick: { value: string };
  /** An action button on a message was clicked. */
  messageaction: { messageId: string; action: ChatMessageAction };
  /** The header model switcher changed. */
  modelchange: { modelId: string };
  /** A slash command was chosen from the palette. */
  slashselect: { command: SlashCommandItem };
  /** The Search button was clicked. */
  search: Record<string, never>;
  /** The Mic / voice button was clicked. */
  voice: Record<string, never>;
}

defineKitnElement<Props, Events>('kitn-chat', {
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
