import { type JSX, Show } from 'solid-js';
import { cn } from '../utils/cn';
import { ThumbsUp, ThumbsDown, X } from 'lucide-solid';

export interface FeedbackBarProps {
  class?: string;
  title?: string;
  icon?: JSX.Element;
  onHelpful?: () => void;
  onNotHelpful?: () => void;
  onClose?: () => void;
}

export function FeedbackBar(props: FeedbackBarProps) {
  return (
    <div
      class={cn(
        'bg-background border-border inline-flex rounded-[12px] border text-sm',
        props.class
      )}
    >
      <div class="flex w-full items-center justify-between">
        <div class="flex flex-1 items-center justify-start gap-4 py-3 pl-4">
          <Show when={props.icon}>{props.icon}</Show>
          <span class="text-foreground font-medium">{props.title}</span>
        </div>
        <div class="flex items-center justify-center gap-0.5 px-3 py-0">
          <button
            type="button"
            class="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors"
            aria-label="Helpful"
            onClick={props.onHelpful}
          >
            <ThumbsUp class="size-4" />
          </button>
          <button
            type="button"
            class="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors"
            aria-label="Not helpful"
            onClick={props.onNotHelpful}
          >
            <ThumbsDown class="size-4" />
          </button>
        </div>
        <div class="border-border flex items-center justify-center border-l">
          <button
            type="button"
            onClick={props.onClose}
            class="text-muted-foreground hover:text-foreground flex items-center justify-center rounded-md p-3"
            aria-label="Close"
          >
            <X class="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
