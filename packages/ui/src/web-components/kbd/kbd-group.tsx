import { defineWebComponent } from '../define/define';
import { KbdGroup } from '../../components/kbd/kbd-group';

type Props = Record<string, unknown>;
// Use it when the caps come from more than one shortcut or from a typed sequence: a `keys` token
// spec is a single shortcut and cannot say where one ends and the next begins. A lone
// `<kai-kbd keys="Mod+K">` already renders its own token row, so it needs no group.
/**
 * A row of keycaps that reads as one shortcut hint.
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
