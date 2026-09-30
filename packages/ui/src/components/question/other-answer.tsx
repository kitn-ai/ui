import type { JSX } from 'solid-js';
import { Textarea } from '../textarea/textarea';
import { FIELD_BASE } from '../input/input';
import { cn } from '../../utils/cn';

export interface OtherAnswerProps {
  /** The question this belongs to, for the accessible name. Model output, rendered as an attribute value only. */
  question: string;
  value: string;
  onInput: (value: string) => void;
  /** Enter without Shift: move on. Shift+Enter inserts a newline. */
  onEnter: () => void;
  placeholder?: string;
  /** Hook the panel uses to find the field and move focus into it. */
  dataOther: string;
  class?: string;
}

/**
 * The inline "Other" field: an auto-growing textarea for the user's own words. The text is the USER's
 * (or a model placeholder), only ever a value or an attribute, never markup.
 */
export function OtherAnswer(props: OtherAnswerProps): JSX.Element {
  return (
    <Textarea
      data-other={props.dataOther}
      aria-label={`Your own answer to: ${props.question}`}
      placeholder={props.placeholder ?? 'Type your own answer'}
      maxHeight={160}
      value={props.value}
      onInput={(e) => props.onInput(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
          e.preventDefault();
          props.onEnter();
        }
      }}
      class={cn(FIELD_BASE, 'resize-none bg-background text-body', props.class)}
    />
  );
}
