import { createSignal } from 'solid-js';
import { defineKitnElement } from './define';
import { DefaultPromptInput } from './default-input';
import type { AttachmentData } from '../components/attachments';

interface Props extends Record<string, unknown> {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  suggestions?: string[];
}

defineKitnElement<Props>('kitn-prompt-input', {
  value: undefined,
  placeholder: 'Send a message...',
  disabled: false,
  loading: false,
  suggestions: undefined,
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
      onValueChange={handleChange}
      onSubmit={handleSubmit}
      onSuggestionClick={handleSuggestionClick}
      onAttachmentsChange={setAttachments}
    />
  );
});
