import { onMount, onCleanup } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { KbdGroup } from '../../components/kbd/kbd-group';

type Props = Record<string, unknown>;
// Use it when the caps come from more than one shortcut or from a typed sequence: a `keys` token
// spec is a single shortcut and cannot say where one ends and the next begins. A lone
// `<kai-kbd keys="Mod+K">` already renders its own token row, so it needs no group.
/**
 * A row of keycaps that reads as one shortcut hint.
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
