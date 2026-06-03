import { Collapsible as KCollapsible } from '@kobalte/core/collapsible';
import { type JSX } from 'solid-js';
import { cn } from '../utils/cn';

export const Collapsible = KCollapsible;
export const CollapsibleTrigger = KCollapsible.Trigger;

export function CollapsibleContent(props: { children: JSX.Element; class?: string }) {
  return (
    <KCollapsible.Content class={cn('overflow-hidden', props.class)}>
      {props.children}
    </KCollapsible.Content>
  );
}
