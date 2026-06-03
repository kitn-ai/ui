import { createSignal } from 'solid-js';
import { defineKitnElement } from './define';
import { PromptInput, PromptInputTextarea, PromptInputActions } from '../components/prompt-input';
import { Button } from '../ui/button';

interface Props extends Record<string, unknown> {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

defineKitnElement<Props>('kitn-prompt-input', {
  value: undefined,
  placeholder: 'Send a message...',
  disabled: false,
  loading: false,
}, (props, { dispatch }) => {
  const [internal, setInternal] = createSignal(props.value ?? '');
  const current = () => props.value ?? internal();

  const handleChange = (v: string) => { setInternal(v); dispatch('valuechange', { value: v }); };
  const handleSubmit = () => dispatch('submit', { value: current() });

  return (
    <PromptInput
      value={current()}
      onValueChange={handleChange}
      onSubmit={handleSubmit}
      isLoading={props.loading}
      disabled={props.disabled}
    >
      <PromptInputTextarea placeholder={props.placeholder} class="min-h-[44px] pt-3 pl-4" />
      <PromptInputActions class="mt-2 flex w-full items-center justify-end gap-2 px-3 pb-3">
        <Button size="icon-sm" class="rounded-full" disabled={!current().trim()} onClick={handleSubmit}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
          </svg>
        </Button>
      </PromptInputActions>
    </PromptInput>
  );
});
