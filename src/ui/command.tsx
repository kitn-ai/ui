import { For, Show, type JSX } from 'solid-js';
import { cn } from '../utils/cn';

export interface CommandRow {
  id: string;
  label: string;
  icon?: string;
  description?: string;
}

export interface CommandGroup {
  group?: string;
  items: CommandRow[];
}

export interface CommandListProps {
  groups: CommandGroup[];
  activeId?: string;
  onSelect: (id: string) => void;
  emptyLabel?: string;
}

/** Render an icon: http/data-URI → <img>, otherwise an emoji/text <span>. */
function renderIcon(icon: string): JSX.Element {
  if (/^(https?:|\/|data:)/.test(icon)) {
    return <img src={icon} alt="" class="size-4 shrink-0 rounded object-cover" />;
  }
  return (
    <span class="flex size-4 shrink-0 items-center justify-center text-sm" aria-hidden="true">
      {icon}
    </span>
  );
}

/**
 * `CommandList` — a presentational grouped listbox for command/mention palettes.
 *
 * Renders a `role="listbox"` container. Groups with a `group` name get a muted
 * section header. Each row is a `role="option"` button with icon, label, and
 * optional description. Clicking a row calls `onSelect(id)`. When there are no
 * groups/items it renders `emptyLabel` (default "No results").
 */
export function CommandList(props: CommandListProps): JSX.Element {
  const hasItems = () => props.groups.some((g) => g.items.length > 0);

  return (
    <div role="listbox" aria-label="Command palette">
      <Show
        when={hasItems()}
        fallback={
          <div class="px-3 py-4 text-center text-sm text-muted-foreground select-none">
            {props.emptyLabel ?? 'No results'}
          </div>
        }
      >
        <For each={props.groups}>
          {(group) => (
            <Show when={group.items.length > 0}>
              <>
                <Show when={group.group}>
                  <div class="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground select-none">
                    {group.group}
                  </div>
                </Show>
                <For each={group.items}>
                  {(row) => (
                    <button
                      role="option"
                      aria-selected={row.id === props.activeId}
                      class={cn(
                        'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
                        row.id === props.activeId
                          ? 'bg-muted text-foreground'
                          : 'text-foreground hover:bg-muted',
                      )}
                      // Prevent blur on the search input so keyboard nav keeps working.
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => props.onSelect(row.id)}
                    >
                      <Show when={row.icon}>{(icon) => renderIcon(icon())}</Show>
                      <span class="font-medium whitespace-nowrap shrink-0">{row.label}</span>
                      <Show when={row.description}>
                        <span class="min-w-0 truncate text-muted-foreground">{row.description}</span>
                      </Show>
                    </button>
                  )}
                </For>
              </>
            </Show>
          )}
        </For>
      </Show>
    </div>
  );
}
