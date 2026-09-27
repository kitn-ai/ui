import { For, Show } from 'solid-js';
import { X } from 'lucide-solid';
import { Button } from '../button/button';
import { renderIcon } from '../icon/icon';
import type { ComposerToolItem } from './default-input';

// A chip's glyph is smaller than a menu row's and carries no trailing margin of its
// own: the chip's own `gap-1` spaces it from the label. `renderIcon`'s defaults are
// sized for a menu row (`mr-2 size-4`), so passing them through would indent the
// label and overflow a 28px pill.
const CHIP_ICON = {
  imgClass: 'size-3.5',
  spanClass: 'flex size-3.5 items-center justify-center',
};

/** The items that are ON and opted in for a chip, in declaration order.
 *
 *  Recurses, because a capability is allowed to live in a submenu. The depth is a
 *  host's organisational choice, not something that changes what a switch means.
 *  `chip` and `checked` are both required: an item without `chip` shows its state in
 *  the menu alone, which is the quiet default the kit ships. */
export function chipItems(tools: ComposerToolItem[] = []): ComposerToolItem[] {
  return tools.flatMap((item) =>
    item.items?.length
      ? chipItems(item.items)
      : item.chip === true && item.checked === true
        ? [item]
        : [],
  );
}

export interface ComposerChipsProps {
  items: ComposerToolItem[];
  disabled?: boolean;
  // The caller turns the id into the same selection event the menu fires, so a chip
  // and a menu row are one code path rather than two that have to agree.
  /** Called with the item's id when a chip is clicked. */
  onRemove: (id: string) => void;
}

/** The composer's active-capability chips: one view of the SAME `checked` field the
 *  menu renders, which is what stops the two from disagreeing about what is on.
 *
 *  Clicking a chip turns that capability off. The label is `"<name>, turn off"`
 *  rather than a bare "Remove" because the accessible name must CONTAIN the visible
 *  text: a chip named only "Remove" is one a speech-input user cannot operate. */
export function ComposerChips(props: ComposerChipsProps) {
  return (
    <For each={props.items}>
      {(item) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          // `h-7` is the row's control height, so a chip does not make the composer's
          // single row taller than the 48px it was measured to be. `size="sm"` alone
          // is `h-8`, which would push the collapsed row to 52px.
          class="rounded-pill h-7 gap-1"
          disabled={props.disabled}
          aria-label={`${item.label}, turn off`}
          onClick={() => item.id && props.onRemove(item.id)}
        >
          <Show when={item.icon}>{renderIcon(item.icon, CHIP_ICON)}</Show>
          {item.label}
          <X class="size-3 opacity-60" aria-hidden="true" />
        </Button>
      )}
    </For>
  );
}
