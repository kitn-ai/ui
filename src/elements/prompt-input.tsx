import { createEffect, createSignal } from 'solid-js';
import { defineWebComponent } from './define';
import { DefaultPromptInput } from './default-input';
import type { AttachmentData } from '../components/attachments';
import type { SlashCommandItem } from '../components/slash-command';

interface Props extends Record<string, unknown> {
  /** Controlled value of the input. When set, the host owns the text and must
   *  update it on `kc-value-change`; leave unset for uncontrolled behavior. */
  value?: string;
  /** Placeholder text shown in the empty input. */
  placeholder?: string;
  /** Disable the input and submit button entirely (non-interactive). */
  disabled?: boolean;
  /** Show the loading/streaming state and block submit (use while awaiting a
   *  reply). */
  loading?: boolean;
  /** Starter prompts shown above the input. Clicking one follows
   *  `suggestionMode`. Set as a JS property. */
  suggestions?: string[];
  /** What clicking a suggestion does: `'submit'` (default) sends it immediately
   *  as if typed and submitted; `'fill'` just places it in the input. */
  suggestionMode?: 'submit' | 'fill';
  /** Slash commands — when set, typing `/` opens the command palette. Set as a
   *  JS property. */
  slashCommands?: SlashCommandItem[];
  /** Command ids to highlight as active. */
  slashActiveIds?: string[];
  /** Single-line palette rows. */
  slashCompact?: boolean;
  /** Show a Search (Globe) button in the left toolbar; clicking it fires a
   *  `search` event. */
  search?: boolean;
  /** Show a Voice (Mic) button in the left toolbar; clicking it fires a `voice`
   *  event. */
  voice?: boolean;
  /** When set and `loading` is true, the send button is replaced by a Stop
   *  button (square icon, "Stop" aria-label). Clicking it fires `kc-stop`. */
  stoppable?: boolean;
  /** Attachments to seed the input with (so a consumer can pre-populate staged
   *  files without an upload). Set as a JS property; the element then manages its
   *  own attachment state from there (add via the paperclip, remove per chip). */
  attachments?: AttachmentData[];
}

/** Events fired by `<kc-prompt-input>`. */
interface Events {
  /** The user submitted the prompt (Enter or send button) with its attachments. */
  'kc-submit': { value: string; attachments: AttachmentData[] };
  /** The input text changed (fires on every keystroke). */
  'kc-value-change': { value: string };
  /** A suggestion was clicked while `suggestion-mode="fill"`. */
  'kc-suggestion-click': { value: string };
  /** A slash command was chosen from the palette. */
  'kc-slash-select': { command: SlashCommandItem };
  /** The Search (Globe) toolbar button was clicked. */
  'kc-search': Record<string, never>;
  /** The Voice (Mic) toolbar button was clicked. */
  'kc-voice': Record<string, never>;
  /** The Stop button was clicked while `stoppable` and `loading` are both true. */
  'kc-stop': Record<string, never>;
}

defineWebComponent<Props, Events>('kc-prompt-input', {
  value: undefined,
  placeholder: 'Send a message...',
  disabled: false,
  loading: false,
  suggestions: undefined,
  suggestionMode: 'submit',
  slashCommands: undefined,
  slashActiveIds: undefined,
  slashCompact: false,
  search: false,
  voice: false,
  stoppable: false,
  attachments: undefined,
}, (props, { dispatch, flag }) => {
  const [internal, setInternal] = createSignal(props.value ?? '');
  // Seed staged attachments from the `attachments` property; the element manages
  // its own state from there (paperclip adds, per-chip remove deletes).
  const [attachments, setAttachments] = createSignal<AttachmentData[]>(props.attachments ?? []);
  // Re-seed when the `attachments` property is (re)assigned by the consumer
  // (e.g. set via a `ref` after mount). Subsequent in-element edits stay local.
  createEffect(() => {
    if (props.attachments) setAttachments(props.attachments);
  });
  const current = () => props.value ?? internal();

  const handleChange = (v: string) => { setInternal(v); dispatch('kc-value-change', { value: v }); };
  const handleSubmit = () => {
    dispatch('kc-submit', { value: current(), attachments: attachments() });
    setAttachments([]);
  };
  const handleSuggestionClick = (v: string) => {
    if ((props.suggestionMode ?? 'submit') === 'fill') {
      handleChange(v);
      dispatch('kc-suggestion-click', { value: v });
    } else {
      // Default: behave as if the user typed the suggestion and pressed submit.
      dispatch('kc-submit', { value: v, attachments: attachments() });
      setAttachments([]);
    }
  };

  return (
    <DefaultPromptInput
      value={current()}
      placeholder={props.placeholder}
      disabled={flag('disabled')}
      loading={flag('loading')}
      stoppable={flag('stoppable')}
      suggestions={props.suggestions}
      attachments={attachments()}
      slashCommands={props.slashCommands}
      slashActiveIds={props.slashActiveIds}
      slashCompact={flag('slashCompact')}
      search={flag('search')}
      voice={flag('voice')}
      onValueChange={handleChange}
      onSubmit={handleSubmit}
      onSuggestionClick={handleSuggestionClick}
      onAttachmentsChange={setAttachments}
      onSearch={() => dispatch('kc-search')}
      onVoice={() => dispatch('kc-voice')}
      onStop={() => dispatch('kc-stop')}
      onSlashSelect={(command) => dispatch('kc-slash-select', { command })}
    />
  );
});
