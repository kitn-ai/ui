import { onMount, onCleanup } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { KbdGroup } from '../../components/kbd/kbd-group';

type Props = Record<string, unknown>;

/**
 * `<kai-kbd-group>` — welds several `<kai-kbd>`s into ONE key strip: no gap between
 * the caps, one hairline at each seam, corners only at the strip's ends. Use it when
 * one shortcut is spelled with caps from more than one element or as a typed
 * sequence. Two DIFFERENT shortcuts are two elements (or two groups): the weld is
 * what says they are one key, and a group that merely spaced its children out looked
 * identical to a row of separate `<kai-kbd>`s.
 *
 * Slot your `<kai-kbd>`s in as light-DOM children (the default slot). No props.
 *
 * ```html
 * <kai-kbd-group>
 *   <kai-kbd keys="Mod+B"></kai-kbd>
 *   <kai-kbd keys="Mod+K"></kai-kbd>
 * </kai-kbd-group>
 * <kai-kbd-group>
 *   <kai-kbd>G</kai-kbd>
 *   <kai-kbd>D</kai-kbd>
 * </kai-kbd-group>
 * ```
 *
 * Restyle each cap via `::part(key)` on the `<kai-kbd>` itself; the group adds no
 * part of its own beyond its host (the gap is gone, so there is no frame to style).
 */
defineWebComponent<Props>('kai-kbd-group', {}, (_props, { element }) => {
  // The weld itself lives in `<kai-kbd>`'s own shadow stylesheet, because a group
  // cannot style the caps inside a slotted child's shadow root and `::slotted()`
  // cannot express a sibling relation. So the group's entire contribution is the
  // `data-kai-join` marker on each DIRECT `<kai-kbd>` child, which the child reads
  // for its position among the others. Same per-child marker pattern as
  // `<kai-pane-grid>` (its `pane-<i>` slots) and `<kai-resizable>`.
  //
  // A child that is not a `<kai-kbd>` is left alone, and a marker left behind on a
  // child that stops being one is removed, so moving an element out of a group
  // cannot leave it half-welded.
  onMount(() => {
    const read = () => {
      for (const child of Array.from(element.children)) {
        const isKbd = child.localName === 'kai-kbd';
        if (isKbd) {
          if (!child.hasAttribute('data-kai-join')) child.setAttribute('data-kai-join', '');
        } else if (child.hasAttribute('data-kai-join')) {
          child.removeAttribute('data-kai-join');
        }
      }
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true });
    onCleanup(() => observer.disconnect());
  });

  return (
    <>
      {/* Base sets `:host{display:block}`; a strip of caps flows inline like one chip,
          so the group can sit in a sentence. The children carry the weld. */}
      <style>{':host{display:inline-flex}'}</style>
      <KbdGroup>
        <slot />
      </KbdGroup>
    </>
  );
});
