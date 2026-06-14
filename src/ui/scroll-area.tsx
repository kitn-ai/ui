import { type JSX, splitProps } from 'solid-js';
import { cn } from '../utils/cn';

export interface ScrollAreaProps extends JSX.HTMLAttributes<HTMLDivElement> { children: JSX.Element; }

export function ScrollArea(props: ScrollAreaProps) {
  const [local, rest] = splitProps(props, ['children', 'class']);
  return (
    // tabindex=0 keeps the scroll region reachable by keyboard when it has no
    // focusable descendants (WCAG 2.1.1 — axe `scrollable-region-focusable`).
    <div tabindex={0} class={cn('overflow-y-auto scrollbar-thin', local.class)} {...rest}>
      {local.children}
    </div>
  );
}
