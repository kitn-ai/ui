import { For, Show, type JSX, splitProps } from 'solid-js';
import { cn } from '../utils/cn';
import { renderIcon } from './icon';
import { Badge } from './badge';

export interface KaiNavItem {
  id: string;
  label?: string;
  /** Leading icon: a named icon, an image URL / data-URI, or plain text. */
  icon?: string;
  /** Trailing text pill (e.g. "Beta"). */
  badge?: string;
  /** Trailing icon (a named icon), e.g. an edit/compose affordance. */
  trailing?: string;
  disabled?: boolean;
}

export interface NavProps extends JSX.HTMLAttributes<HTMLElement> {
  items?: KaiNavItem[];
  /** Active item id (drives aria-current + the selected look). */
  value?: string;
  onItemSelect?: (id: string) => void;
}

export function Nav(props: NavProps) {
  const [local, rest] = splitProps(props, ['items', 'value', 'onItemSelect', 'class']);
  return (
    <nav {...rest} class={cn('flex flex-col gap-0.5', local.class)}>
      <For each={local.items ?? []}>
        {(item) => (
          <button
            part="item"
            type="button"
            disabled={item.disabled}
            aria-current={local.value === item.id ? 'page' : undefined}
            onClick={() => { if (!item.disabled) local.onItemSelect?.(item.id); }}
            class={cn(
              'group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
              'text-muted-foreground hover:bg-accent hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:pointer-events-none disabled:opacity-50',
              local.value === item.id && 'bg-accent font-medium text-foreground',
            )}
          >
            <Show when={item.icon}>{renderIcon(item.icon, { class: 'size-4 shrink-0' })}</Show>
            <span class="min-w-0 flex-1 truncate">{item.label}</span>
            <Show when={item.badge}>
              <Badge variant="default" class="px-1.5 py-0 text-[0.625rem] font-medium uppercase tracking-wide">{item.badge}</Badge>
            </Show>
            <Show when={item.trailing}>{renderIcon(item.trailing, { class: 'size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-60' })}</Show>
          </button>
        )}
      </For>
    </nav>
  );
}
