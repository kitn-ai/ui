import { type JSX, splitProps } from 'solid-js';
import { cn } from '../utils/cn';

export interface SeparatorProps extends JSX.HTMLAttributes<HTMLDivElement> { orientation?: 'horizontal' | 'vertical'; }

export function Separator(props: SeparatorProps) {
  const [local, rest] = splitProps(props, ['orientation', 'class']);
  const isVertical = () => local.orientation === 'vertical';
  return <div role="separator" class={cn('shrink-0 bg-border', isVertical() ? 'h-full w-px' : 'h-px w-full', local.class)} {...rest} />;
}
