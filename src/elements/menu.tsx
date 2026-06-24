import { For, Show } from 'solid-js';
import {
  Dropdown, DropdownTrigger, DropdownContent, DropdownItem,
  DropdownSeparator, DropdownLabel, DropdownCheckboxItem,
  DropdownSub, DropdownSubTrigger, DropdownSubContent,
} from '../ui/dropdown';
import { defineWebComponent } from './define';

export interface KaiMenuItem {
  /** Emitted in `kai-select` for actionable items. */
  id?: string;
  label?: string;
  /** Emoji/text OR an image URL / data-URI. */
  icon?: string;
  /** e.g. '⌘U' — shown right-aligned, muted. */
  shortcut?: string;
  /** Presence ⇒ a checkbox item (role=menuitemcheckbox). */
  checked?: boolean;
  disabled?: boolean;
  /** A divider (ignores other fields). */
  separator?: boolean;
  /** A non-interactive section label (uses `label`). */
  heading?: boolean;
  /** ⇒ a submenu. */
  items?: KaiMenuItem[];
}

interface Props extends Record<string, unknown> {
  /** Tree of menu items. Set as a JS property — not an HTML attribute. */
  items?: KaiMenuItem[];
  /** Optional placement hint (unused by the underlying Dropdown which always
   *  positions bottom-start, kept for future extension). */
  placement?: string;
}

interface Events {
  /**
   * Fired when the user selects a leaf item.
   * - Plain items: `{ id }`.
   * - Checkbox items: `{ id, checked }` where `checked` is the NEW state.
   */
  'kai-select': { id: string; checked?: boolean };
}

/** Render an icon: URL/data-URI → <img>, otherwise a text/emoji <span>. */
function renderIcon(icon: string) {
  if (/^(https?:|\/|data:)/.test(icon)) {
    return <img src={icon} class="mr-2 size-4 shrink-0" alt="" />;
  }
  return <span class="mr-2 flex h-4 w-4 shrink-0 items-center justify-center text-sm">{icon}</span>;
}

/**
 * `<kai-menu>` — a cascading action menu driven by a JSON items-tree.
 *
 * Set the `items` property in JavaScript (array, not attribute). The trigger
 * is slotted — put your icon/button content in `slot="trigger"`:
 *
 * ```html
 * <kai-menu>
 *   <span slot="trigger">＋</span>
 * </kai-menu>
 * <script type="module">
 *   import '@kitn.ai/ui/elements';
 *   const menu = document.querySelector('kai-menu');
 *   menu.items = [
 *     { heading: true, label: 'Actions' },
 *     { id: 'attach', label: 'Add files', icon: '📎', shortcut: '⌘U' },
 *   ];
 *   menu.addEventListener('kai-select', (e) => console.log(e.detail));
 * </script>
 * ```
 */
defineWebComponent<Props, Events>('kai-menu', {
  items: undefined,
  placement: undefined,
}, (props, { dispatch }) => {
  function renderItems(items: KaiMenuItem[]) {
    return (
      <For each={items}>
        {(item) => {
          if (item.separator) {
            return <DropdownSeparator />;
          }
          if (item.heading) {
            return <DropdownLabel>{item.label}</DropdownLabel>;
          }
          if (item.items && item.items.length > 0) {
            return (
              <DropdownSub>
                <DropdownSubTrigger>
                  <Show when={item.icon}>{renderIcon(item.icon!)}</Show>
                  {item.label}
                </DropdownSubTrigger>
                <DropdownSubContent>
                  {renderItems(item.items)}
                </DropdownSubContent>
              </DropdownSub>
            );
          }
          if (item.checked !== undefined) {
            return (
              <DropdownCheckboxItem
                checked={item.checked}
                onSelect={() =>
                  dispatch('kai-select', { id: item.id ?? '', checked: !item.checked })
                }
              >
                <Show when={item.icon}>{renderIcon(item.icon!)}</Show>
                {item.label}
              </DropdownCheckboxItem>
            );
          }
          return (
            <DropdownItem
              onSelect={() => dispatch('kai-select', { id: item.id ?? '' })}
            >
              <Show when={item.icon}>{renderIcon(item.icon!)}</Show>
              {item.label}
              <Show when={item.shortcut}>
                <span class="ml-auto pl-4 text-xs tracking-widest text-muted-foreground">
                  {item.shortcut}
                </span>
              </Show>
            </DropdownItem>
          );
        }}
      </For>
    );
  }

  return (
    <Dropdown>
      <DropdownTrigger
        class="inline-flex items-center justify-center rounded-md p-1.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open menu"
      >
        <slot name="trigger">⋯</slot>
      </DropdownTrigger>
      <DropdownContent class="min-w-[15rem]">
        {renderItems((props.items as KaiMenuItem[] | undefined) ?? [])}
      </DropdownContent>
    </Dropdown>
  );
});
