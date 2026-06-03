import { HoverCard as KHoverCard } from '@kobalte/core/hover-card';
import { type JSX, splitProps } from 'solid-js';
import { cn } from '../utils/cn';

export interface HoverCardProps { trigger: JSX.Element; children: JSX.Element; class?: string; openDelay?: number; closeDelay?: number; }

export function HoverCard(props: HoverCardProps) {
  const [local] = splitProps(props, ['trigger', 'children', 'class', 'openDelay', 'closeDelay']);
  return (
    <KHoverCard openDelay={local.openDelay} closeDelay={local.closeDelay}>
      <KHoverCard.Trigger as="span">{local.trigger}</KHoverCard.Trigger>
      <KHoverCard.Portal>
        <KHoverCard.Content class={cn('z-50 w-64 rounded-lg bg-card p-4 shadow-lg animate-in fade-in-0 zoom-in-95', local.class)}>
          <KHoverCard.Arrow />
          {local.children}
        </KHoverCard.Content>
      </KHoverCard.Portal>
    </KHoverCard>
  );
}

// Compound primitives for custom layouts (e.g. Source component)
export interface HoverCardRootProps { children: JSX.Element; openDelay?: number; closeDelay?: number; }

export function HoverCardRoot(props: HoverCardRootProps) {
  return <KHoverCard openDelay={props.openDelay} closeDelay={props.closeDelay}>{props.children}</KHoverCard>;
}

export interface HoverCardTriggerProps { children: JSX.Element; }

export function HoverCardTrigger(props: HoverCardTriggerProps) {
  return <KHoverCard.Trigger as="span">{props.children}</KHoverCard.Trigger>;
}

export interface HoverCardContentProps { children: JSX.Element; class?: string; }

export function HoverCardContent(props: HoverCardContentProps) {
  return (
    <KHoverCard.Portal>
      <KHoverCard.Content class={cn('z-50 rounded-lg bg-card shadow-lg animate-in fade-in-0 zoom-in-95', props.class)}>
        {props.children}
      </KHoverCard.Content>
    </KHoverCard.Portal>
  );
}
