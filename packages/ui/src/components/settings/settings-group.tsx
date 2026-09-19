import { type JSX, Show } from 'solid-js';
import { cn } from '../../utils/cn';
import { RowGroup } from '../row/row-group';

export interface SettingsGroupProps {
  /** Small section heading shown above the card. */
  heading: string;
  /** Optional muted description under the heading. */
  description?: string;
  /** The stacked `SettingItem` rows. */
  children: JSX.Element;
  class?: string;
}

/**
 * A settings section: a small heading + optional muted description over a bordered,
 * rounded card that stacks `SettingItem` rows with hairline dividers between them.
 * Host-agnostic chrome: the SAME group drops into a modal or a full settings page;
 * only the content (the rows) changes per app.
 *
 * The card and its dividers ARE `RowGroup` — one implementation of that frame for
 * the whole kit, rather than a second copy here. The `body` part name is kept
 * (a settings group documents `header`/`body`, and consumers theme through it), so
 * the frame's own `group` part is replaced rather than added to.
 */
export function SettingsGroup(props: SettingsGroupProps): JSX.Element {
  return (
    <section class={cn('flex flex-col gap-2', props.class)}>
      <div part="header" class="flex flex-col gap-0.5 px-1">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {props.heading}
        </h3>
        <Show when={props.description}>
          <p class="text-xs text-muted-foreground">{props.description}</p>
        </Show>
      </div>
      <RowGroup part="body" class="bg-surface">
        {props.children}
      </RowGroup>
    </section>
  );
}

export interface SettingItemProps {
  /** Row label (primary text). */
  label: string;
  /** Optional secondary description under the label. */
  description?: string;
  /** The control on the right (a `Switch`, `Segmented`, select, ...). Omit for a
   *  plain label row. */
  control?: JSX.Element;
  class?: string;
}

/**
 * One row inside a `SettingsGroup`: a left label/description block and an optional
 * right-aligned `control`, vertically centered with comfortable padding.
 *
 * It draws its own top hairline from `--kai-row-divide-width`, the property a
 * `RowGroup` sets on its children by position. `Row` does the same, and it has to
 * be the CHILD that paints the line: the group cannot reach inside a shadow-root
 * child from the outside, and a direct declaration on the slotted host loses to a
 * document-level preflight. `SettingsGroup` stopped using `divide-y` for exactly
 * this reason — one divider implementation for the whole kit, and it is this one.
 * See the row-list block in `../../kit-base.css`.
 */
export function SettingItem(props: SettingItemProps): JSX.Element {
  return (
    <div
      class={cn(
        'flex items-center justify-between gap-4 px-4 py-3',
        'border-t-[length:var(--kai-row-divide-width,0px)]',
        'border-t-[color:var(--color-border)]',
        props.class,
      )}
    >
      <div part="label" class="flex min-w-0 flex-col gap-0.5">
        <span class="text-sm text-foreground">{props.label}</span>
        <Show when={props.description}>
          <span class="text-xs leading-snug text-muted-foreground">{props.description}</span>
        </Show>
      </div>
      <Show when={props.control}>
        <div part="control" class="shrink-0">{props.control}</div>
      </Show>
    </div>
  );
}
