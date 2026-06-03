import { For, Show } from 'solid-js';
import { PromptInput, PromptInputTextarea, PromptInputActions } from '../components/prompt-input';
import { PromptSuggestion } from '../components/prompt-suggestion';
import { Button } from '../ui/button';

export interface DefaultPromptInputProps {
  value: string;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  suggestions?: string[];
  onValueChange: (v: string) => void;
  onSubmit: () => void;
  onSuggestionClick: (v: string) => void;
}

export function DefaultPromptInput(props: DefaultPromptInputProps) {
  return (
    <>
      <Show when={props.suggestions?.length}>
        <div class="mb-2 flex flex-wrap gap-2">
          <For each={props.suggestions}>
            {(s) => (
              <PromptSuggestion onClick={() => props.onSuggestionClick(s)}>{s}</PromptSuggestion>
            )}
          </For>
        </div>
      </Show>
      <PromptInput
        value={props.value}
        onValueChange={props.onValueChange}
        onSubmit={props.onSubmit}
        isLoading={props.loading}
        disabled={props.disabled}
      >
        <PromptInputTextarea placeholder={props.placeholder} class="min-h-[44px] pt-3 pl-4" />
        <PromptInputActions class="mt-2 flex w-full items-center justify-end gap-2 px-3 pb-3">
          <Button
            size="icon-sm"
            class="rounded-full"
            data-testid="send"
            disabled={props.disabled || props.loading || !props.value.trim()}
            onClick={props.onSubmit}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
            </svg>
          </Button>
        </PromptInputActions>
      </PromptInput>
    </>
  );
}
