import { type JSX, splitProps } from 'solid-js';
import { cn } from '../utils/cn';
import { useAutoResize } from '../primitives/use-auto-resize';

export interface TextareaProps extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxHeight?: number;
  autoResize?: boolean;
}

export function Textarea(props: TextareaProps) {
  const [local, rest] = splitProps(props, ['class', 'maxHeight', 'autoResize']);
  const { ref } = useAutoResize({ maxHeight: local.maxHeight });
  return (
    <textarea
      ref={local.autoResize !== false ? ref : undefined}
      class={cn('w-full resize-none rounded-md bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', local.class)}
      rows={1}
      {...rest}
    />
  );
}
