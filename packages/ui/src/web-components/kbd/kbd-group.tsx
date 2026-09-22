import { defineWebComponent } from '../define/define';
import { KbdGroup } from '../../components/kbd/kbd-group';

type Props = Record<string, unknown>;

/**
 * `<kai-kbd-group>` — lays several separate `<kai-kbd>`s out as one shortcut hint.
 * Use it when the caps come from more than one shortcut or from a typed sequence;
 * a `keys` token spec is a single shortcut and cannot say where one ends and the
 * next begins. A lone `<kai-kbd keys="Mod+K">` already renders its own token row,
 * so it needs no group.
 *
 * Slot your `<kai-kbd>`s in as light-DOM children (the default slot). No props.
 *
 * ```html
 * <kai-kbd-group>
 *   <kai-kbd keys="Mod+K"></kai-kbd>
 *   <kai-kbd keys="Mod+S"></kai-kbd>
 * </kai-kbd-group>
 * <kai-kbd-group>
 *   <kai-kbd>G</kai-kbd>
 *   <kai-kbd>D</kai-kbd>
 * </kai-kbd-group>
 * ```
 *
 * Restyle the flex frame (it owns the gap between the kbd elements) via
 * `::part(group)`, and each cap via `::part(key)` on the `<kai-kbd>` itself.
 */
defineWebComponent<Props>('kai-kbd-group', {}, () => (
  <>
    {/* Base sets `:host{display:block}`; a shortcut hint flows inline like a chip,
        matching `<kai-kbd>`'s own host rule, so the group can sit in a sentence. */}
    <style>{':host{display:inline-flex}'}</style>
    <KbdGroup>
      <slot />
    </KbdGroup>
  </>
));
