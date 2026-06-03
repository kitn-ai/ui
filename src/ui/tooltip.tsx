import { Tooltip as KTooltip } from '@kobalte/core/tooltip';
import { type JSX, splitProps } from 'solid-js';
import { cn } from '../utils/cn';

export interface TooltipProps { content: string; children: JSX.Element; class?: string; }

export function Tooltip(props: TooltipProps) {
  const [local] = splitProps(props, ['content', 'children', 'class']);
  return (
    <KTooltip>
      <KTooltip.Trigger as="span">{local.children}</KTooltip.Trigger>
      <KTooltip.Portal>
        <KTooltip.Content class={cn('z-50 rounded-md bg-foreground px-2.5 py-1 text-xs text-background shadow-md animate-in fade-in-0 zoom-in-95', local.class)}>
          <KTooltip.Arrow />
          {local.content}
        </KTooltip.Content>
      </KTooltip.Portal>
    </KTooltip>
  );
}
