import { type JSX, splitProps } from 'solid-js';
import { cn } from '../utils/cn';

export interface SkeletonProps extends JSX.HTMLAttributes<HTMLDivElement> {}

function Skeleton(props: SkeletonProps) {
  const [local, rest] = splitProps(props, ['class']);
  return (
    <div
      class={cn('animate-pulse rounded-md bg-muted', local.class)}
      {...rest}
    />
  );
}

export { Skeleton };
