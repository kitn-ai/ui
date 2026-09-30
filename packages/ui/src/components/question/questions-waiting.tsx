import { type JSX } from 'solid-js';
import { cn } from '../../utils/cn';

export interface QuestionsWaitingProps {
  /** Questions still without an answer. */
  count: number;
  /** All the questions of the call. */
  total: number;
  /** The control's text. Default "Reopen". */
  reopenLabel?: string;
  onReopen?: () => void;
  class?: string;
}

/** The quiet "N of M questions waiting · Reopen" line the composer carries after "Let's chat". */
export function QuestionsWaiting(props: QuestionsWaitingProps): JSX.Element {
  const noun = () => (props.total === 1 ? 'question' : 'questions');
  const text = () => (props.total > 1 ? `${props.count} of ${props.total} ${noun()} waiting` : `${props.count} ${noun()} waiting`);
  return (
    <div class={cn('flex items-center gap-2 text-meta text-muted-foreground', props.class)} role="status">
      <span>{text()}</span>
      <button
        type="button"
        onClick={() => props.onReopen?.()}
        class="rounded-md px-1 text-foreground underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {props.reopenLabel ?? 'Reopen'}
      </button>
    </div>
  );
}
