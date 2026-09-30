import { type JSX, Show, splitProps } from 'solid-js';
import { cn } from '../../utils/cn';

/** Presence kinds (`new`..`offline`) plus the agent run tones (`working`..`blocked`). */
export type StatusKind =
  | 'new' | 'online' | 'busy' | 'away' | 'offline'
  | 'working' | 'idle' | 'done' | 'error' | 'blocked';

/** status → background hue utility (backed by the kit's tool-* / muted tokens). */
export const STATUS_BG: Record<StatusKind, string> = {
  new: 'bg-tool-blue',
  online: 'bg-tool-green',
  busy: 'bg-tool-red',
  away: 'bg-tool-amber',
  offline: 'bg-muted-foreground',
  // Agent run tones, the hues the agent-card pattern uses.
  working: 'bg-tool-blue',
  idle: 'bg-muted-foreground',
  done: 'bg-tool-green',
  error: 'bg-tool-red',
  blocked: 'bg-tool-amber',
};

/** Agent tones announce themselves by default; presence kinds stay decorative
 *  unless a `label` is given. */
const TONE_LABEL: Partial<Record<StatusKind, string>> = {
  working: 'Working',
  idle: 'Idle',
  done: 'Done',
  error: 'Error',
  blocked: 'Blocked',
};

const SIZE: Record<'sm' | 'md', string> = { sm: 'size-2', md: 'size-2.5' };

export interface StatusProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  status?: StatusKind;
  size?: 'sm' | 'md';
  /** Add an animated ping ring (disabled under prefers-reduced-motion). */
  pulse?: boolean;
  /** Accessible name. With it, the dot is announced; without it, it is decorative (agent tones default to their word). */
  label?: string;
}

export function Status(props: StatusProps) {
  const [local, rest] = splitProps(props, ['status', 'size', 'pulse', 'label', 'class']);
  const kind = () => local.status ?? 'new';
  const name = () => local.label ?? TONE_LABEL[kind()];
  return (
    <span
      class={cn('relative inline-flex', local.class)}
      role={name() ? 'status' : undefined}
      aria-label={name()}
      aria-hidden={name() ? undefined : 'true'}
    >
      <Show when={local.pulse}>
        <span
          aria-hidden="true"
          class={cn(
            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 motion-reduce:hidden',
            STATUS_BG[kind()],
          )}
        />
      </Show>
      <span {...rest} class={cn('relative inline-block rounded-full', STATUS_BG[kind()], SIZE[local.size ?? 'sm'])} />
    </span>
  );
}
