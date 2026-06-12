import { createSignal } from 'solid-js';
import { defineKitnElement } from './define';
import { DefaultPromptInput } from './default-input';
import type { AttachmentData } from '../components/attachments';
import type { SlashCommandItem } from '../components/slash-command';

interface Props extends Record<string, unknown> {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  suggestions?: string[];
  /** Slash commands — when set, typing `/` opens the command palette. Set as a
   *  JS property. */
  slashCommands?: SlashCommandItem[];
  /** Command ids to highlight as active. */
  slashActiveIds?: string[];
  /** Single-line palette rows. */
  slashCompact?: boolean;
}

/** Events fired by `<kitn-prompt-input>`. */
interface Events {
  submit: { value: string; attachments: AttachmentData[] };
  valuechange: { value: string };
  suggestionclick: { value: string };
  /** A slash command was chosen from the palette. */
  slashselect: { command: SlashCommandItem };
}

defineKitnElement<Props, Events>('kitn-prompt-input', {
  value: undefined,
  placeholder: 'Send a message...',
  disabled: false,
  loading: false,
  suggestions: undefined,
  slashCommands: undefined,
  slashActiveIds: undefined,
  slashCompact: false,
}, (props, { dispatch, flag }) => {
  const [internal, setInternal] = createSignal(props.value ?? '');
  const [attachments, setAttachments] = createSignal<AttachmentData[]>([]);
  const current = () => props.value ?? internal();

  const handleChange = (v: string) => { setInternal(v); dispatch('valuechange', { value: v }); };
  const handleSubmit = () => {
    dispatch('submit', { value: current(), attachments: attachments() });
    setAttachments([]);
  };
  const handleSuggestionClick = (v: string) => { handleChange(v); dispatch('suggestionclick', { value: v }); };

  return (
    <DefaultPromptInput
      value={current()}
      placeholder={props.placeholder}
      disabled={flag('disabled')}
      loading={flag('loading')}
      suggestions={props.suggestions}
      attachments={attachments()}
      slashCommands={props.slashCommands}
      slashActiveIds={props.slashActiveIds}
      slashCompact={flag('slashCompact')}
      onValueChange={handleChange}
      onSubmit={handleSubmit}
      onSuggestionClick={handleSuggestionClick}
      onAttachmentsChange={setAttachments}
      onSlashSelect={(command) => dispatch('slashselect', { command })}
    />
  );
});
