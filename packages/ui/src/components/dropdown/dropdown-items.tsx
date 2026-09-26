import { For, Show, type JSX } from 'solid-js';
import {
  DropdownItem, DropdownSeparator, DropdownLabel, DropdownCheckboxItem, DropdownRadioItem,
  DropdownSub, DropdownSubTrigger, DropdownSubContent, DropdownNote,
} from './dropdown';
import { renderIcon } from '../icon/icon';
import { Kbd } from '../kbd/kbd';
import type { KaiMenuItem } from '../../web-components/web-component/web-component-data-types';

export interface DropdownItemsProps {
  items: KaiMenuItem[];
  /** Called for every actionable item. `checked` is present when the item is a
   *  toggle and carries the NEW state; the consumer owns it. */
  onSelect: (detail: { id: string; checked?: boolean; radioGroup?: string }) => void;
}

/** One icon treatment for every item kind, so a row with an icon and a row without
 *  start their labels on the same edge. */
const ICON_OPTS = {
  imgClass: 'mr-2 size-4 shrink-0',
  spanClass: 'mr-2 flex h-4 w-4 shrink-0 items-center justify-center text-sm',
};

/**
 * Renders a `KaiMenuItem` tree into dropdown parts.
 *
 * Lives here, shared by `<kai-menu>` and the composer's tools menu, because the
 * alternative is the same ~60-line item ladder typed twice and then drifting: the
 * kind of a row is a fact about the item shape, and there is one item shape.
 *
 * The ladder's ORDER is load-bearing. `separator` and `heading` are structural;
 * `note` is checked before `items` so a note can never be mistaken for a submenu;
 * `items` before `radioGroup`/`checked` so a parent renders as the submenu it is,
 * rather than as a toggle that happens to carry children.
 */
export function DropdownItems(props: DropdownItemsProps): JSX.Element {
  const renderItems = (items: KaiMenuItem[]): JSX.Element => (
    <For each={items}>
      {(item) => {
        if (item.separator) {
          return <DropdownSeparator />;
        }
        if (item.heading) {
          return <DropdownLabel>{item.label}</DropdownLabel>;
        }
        if (item.note) {
          return <DropdownNote>{item.label}</DropdownNote>;
        }
        if (item.items && item.items.length > 0) {
          return (
            <DropdownSub>
              <DropdownSubTrigger>
                <Show when={item.icon}>{renderIcon(item.icon, ICON_OPTS)}</Show>
                {item.label}
              </DropdownSubTrigger>
              <DropdownSubContent>{renderItems(item.items!)}</DropdownSubContent>
            </DropdownSub>
          );
        }
        if (item.radioGroup !== undefined) {
          return (
            <DropdownRadioItem
              checked={item.checked}
              description={item.description}
              disabled={item.disabled}
              onSelect={() => {
                if (item.id) props.onSelect({ id: item.id, radioGroup: item.radioGroup });
              }}
            >
              <Show when={item.icon}>{renderIcon(item.icon, ICON_OPTS)}</Show>
              {item.label}
            </DropdownRadioItem>
          );
        }
        if (item.checked !== undefined) {
          return (
            <DropdownCheckboxItem
              checked={item.checked}
              control={item.control}
              description={item.description}
              disabled={item.disabled}
              onSelect={() => {
                if (item.id) props.onSelect({ id: item.id, checked: !item.checked });
              }}
            >
              <Show when={item.icon}>{renderIcon(item.icon, ICON_OPTS)}</Show>
              {item.label}
            </DropdownCheckboxItem>
          );
        }
        return (
          <DropdownItem
            description={item.description}
            disabled={item.disabled}
            onSelect={() => {
              if (item.id) props.onSelect({ id: item.id });
            }}
          >
            <Show when={item.icon}>{renderIcon(item.icon, ICON_OPTS)}</Show>
            {item.label}
            <Show when={item.shortcut}>
              <span part="shortcut" class="ml-auto pl-4 text-muted-foreground">
                <Kbd keys={item.shortcut!} platform="auto" size="sm" />
              </span>
            </Show>
          </DropdownItem>
        );
      }}
    </For>
  );

  return <>{renderItems(props.items)}</>;
}
