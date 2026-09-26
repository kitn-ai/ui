import { defineWebComponent } from '../define/define';
import { Kbd, type KbdPlatform } from '../../components/kbd/kbd';

interface Props extends Record<string, unknown> {
  /** Shortcut spec: tokens joined by `+` (e.g. `Mod+Shift+K`). Omit it to show
   *  default-slot content instead. Display only; the element does not bind keys. */
  keys?: string;
  /** `mac` uses ⌘/⌥, `other` uses Ctrl. `auto` (default) sniffs the OS. */
  platform?: KbdPlatform;
  /** Cap size. Defaults to `md`. */
  size?: 'sm' | 'md';
}

/**
 * A keyboard-shortcut display: one inset cap per key, in the platform's own glyphs.
 */
defineWebComponent<Props>('kai-kbd', {
  keys: undefined,
  platform: 'auto',
  size: 'md',
}, (props) => (
  <>
    {/* Base sets `:host{display:block}`; a shortcut hint flows inline like a chip. */}
    <style>{':host{display:inline-flex}'}</style>
    {/* The weld, mirroring `KbdGroup` in src/components/kbd/kbd-group.tsx (the Solid
        layer can weld with child selectors because its caps are in the same tree).
        Here the group's marker is the gate: it is the one fact a group can put on a
        slotted child, since styles cannot cross a shadow boundary and `::slotted()`
        cannot express a sibling relation. Five facts, in the order they read:
          1. zero the chord gap (Kbd's own class reads this variable);
          2. a marked element after the first is pulled left 1px so the two facing 1px
             borders collapse into ONE hairline instead of a 2px seam;
          3. caps inside one element: not the last child loses its right corners, not
             the first loses its left corners, and not the first also shifts 1px;
          4. the first cap of a marked element that is not the group's first child
             loses its left corners, and the last cap of one that is not the last child
             loses its right corners. 3 cannot see these: they are the seams BETWEEN
             elements, where the neighbours are not siblings of the cap.
        A lone marked child (a one-child group) has neither 4 rule fire and keeps both
        ends rounded, which is why a one-child group welds nothing. */}
    <style>{':host([data-kai-join]){--kai-kbd-cap-gap:0px}'
      + ':host([data-kai-join]:not(:first-child)){margin-left:-1px}'
      + ':host([data-kai-join]) [part="key"]:not(:first-child){margin-left:-1px;border-start-start-radius:0;border-end-start-radius:0}'
      + ':host([data-kai-join]) [part="key"]:not(:last-child){border-start-end-radius:0;border-end-end-radius:0}'
      + ':host([data-kai-join]:not(:first-child)) [part="key"]:first-child{border-start-start-radius:0;border-end-start-radius:0}'
      + ':host([data-kai-join]:not(:last-child)) [part="key"]:last-child{border-start-end-radius:0;border-end-end-radius:0}'}</style>
    <Kbd
      keys={props.keys as string | undefined}
      platform={(props.platform as KbdPlatform) ?? 'auto'}
      size={(props.size as 'sm' | 'md') ?? 'md'}
    >
      <slot />
    </Kbd>
  </>
));
