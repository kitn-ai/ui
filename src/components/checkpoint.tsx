import { type JSX, Show, splitProps } from 'solid-js';
import { cn } from '../utils/cn';
import { Button } from '../ui/button';
import { Tooltip } from '../ui/tooltip';
import { Separator } from '../ui/separator';

export interface CheckpointProps extends JSX.HTMLAttributes<HTMLDivElement> {}

export function Checkpoint(props: CheckpointProps) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <div
      class={cn(
        'flex items-center gap-0.5 overflow-hidden text-muted-foreground',
        local.class
      )}
      {...rest}
    >
      {local.children}
      <Separator />
    </div>
  );
}

export interface CheckpointIconProps {
  class?: string;
  children?: JSX.Element;
}

export function CheckpointIcon(props: CheckpointIconProps) {
  return (
    <Show
      when={!props.children}
      fallback={props.children}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class={cn('size-4 shrink-0', props.class)}
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
      </svg>
    </Show>
  );
}

export interface CheckpointTriggerProps {
  tooltip?: string;
  onClick?: () => void;
  children?: JSX.Element;
  class?: string;
  variant?: 'ghost' | 'default' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';
}

export function CheckpointTrigger(props: CheckpointTriggerProps) {
  const variant = () => props.variant ?? 'ghost';
  const size = () => props.size ?? 'sm';

  const button = (
    <Button
      variant={variant()}
      size={size()}
      type="button"
      onClick={props.onClick}
      class={props.class}
    >
      {props.children}
    </Button>
  );

  return (
    <Show when={props.tooltip} fallback={button}>
      <Tooltip content={props.tooltip!}>{button}</Tooltip>
    </Show>
  );
}
