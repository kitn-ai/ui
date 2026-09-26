import { createSignal, onCleanup, onMount } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { readSlots, ROW_SLOTS } from '../slots/slots';
import { Row } from '../../components/row/row';

interface Props extends Record<string, unknown> {
  /** Pressable row: renders real button semantics (click, Enter, Space) and
   *  fires `kai-click` on activation. Ignored when `href` is set. */
  interactive?: boolean;
  /** Navigate on press: the row renders as a real anchor opening in a new tab. An unsafe URL scheme renders a plain, non-interactive row. */
  href?: string;
  /** Show a trailing chevron affordance at the row's end. */
  chevron?: boolean;
}

interface Events {
  /** The row was activated (click, Enter or Space) while `interactive` is set
   *  and no `href` is present. Non-bubbling: listen on the element itself. */
  'kai-click': void;
}
// Interaction is one of three: a safe `href` renders a real anchor opening in a new tab;
// `interactive` renders a real `<button>` firing `kai-click`; neither renders a plain display row.
// An unsafe `href` (a scheme outside the kit's URL policy) renders the NON-interactive row with
// the label still visible: no anchor, no event.
/**
 * A generic list row.
 */
defineWebComponent<Props, Events>('kai-row', {
  interactive: undefined,
  href: undefined,
  chevron: undefined,
}, (props, { element, flag, dispatch }) => {
  // Marks the host as a LIST ROW, which is what `RowGroup`'s `::slotted()` rules
  // match on: the geometry cannot be scoped by tag name (a hand-typed roster a
  // third row-shaped element would miss) or by `*` (the sheet is shared, so it
  // would reach every web component's slotted children). Set here, in the facade body,
  // rather than in `onMount`, so the marker is on the host before the first paint
  // and a row in a group never flashes without its hairline. Full reasoning:
  // kit-base.css's row-list block.
  element.setAttribute('data-kai-row', '');

  // Which named regions the consumer has filled; drives the conditional
  // wrappers so an empty region leaves no stray box behind.
  const [slots, setSlots] = createSignal<Record<string, boolean>>({});
  onMount(() => {
    const read = () => setSlots(readSlots(element, ROW_SLOTS));
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true, attributes: true, subtree: true });
    onCleanup(() => observer.disconnect());
  });

  return (
    <>
      {/* Same reason as `<kai-view>`: the base sheet's `:host{display:block}` is an
          author rule, so it outranks the UA's `[hidden]{display:none}` and a hidden
          row still laid out. Live in `support-widget.html`, which drives its
          recent-conversation row with `:hidden`. */}
      <style>{':host([hidden]){display:none}'}</style>
      <Row
        href={props.href as string | undefined}
        chevron={flag('chevron')}
        onActivate={flag('interactive') ? () => dispatch('kai-click') : undefined}
        leading={slots().leading ? <slot name="leading" /> : undefined}
        subtitle={slots().subtitle ? <slot name="subtitle" /> : undefined}
        trailing={slots().trailing ? <slot name="trailing" /> : undefined}
      >
        <slot />
      </Row>
    </>
  );
});
