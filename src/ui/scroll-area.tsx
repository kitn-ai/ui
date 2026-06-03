import { type JSX, splitProps } from 'solid-js';
import { cn } from '../utils/cn';

export interface ScrollAreaProps extends JSX.HTMLAttributes<HTMLDivElement> { children: JSX.Element; }

export function ScrollArea(props: ScrollAreaProps) {
  const [local, rest] = splitProps(props, ['children', 'class']);
  return (
    <div class={cn('overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent', local.class)} {...rest}>
      {local.children}
    </div>
  );
}
