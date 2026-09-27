import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { readSlots, EMPTY_SLOTS } from '../slots/slots';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '../../components/empty/empty';

interface Props extends Record<string, unknown> {
  /** Title text. Attribute: `empty-title` (`title` is a global HTML attribute). */
  emptyTitle?: string;
  /** Line of copy under the title. */
  description?: string;
}

/**
 * The empty state of a list or panel: a heading, a line of copy, and room for an action.
 */
defineWebComponent<Props>('kai-empty', {
  emptyTitle: '',
  description: '',
}, (props, { element }) => {
  // THE MEDIA TILE IS ONLY DRAWN WHEN SOMETHING IS IN IT. `media` is an OPTIONAL
  // seam — this element's own props are a title and a line of copy — and an
  // unfilled `EmptyMedia variant="icon"` is a 40px muted rounded square floating
  // above the title with nothing in it. Measured in the assistant block's empty
  // state, both schemes, and it is the same defect in every host that projects no
  // media. The construct codegen already omits `EmptyMedia` when a construct has
  // no icon (`mcp/construct/codegen.ts`), so this is the element agreeing with it
  // rather than a new rule.
  //
  // READ THE HOST, NOT THE SLOT, and that is the whole reason for this shape: a
  // shadow `<slot>` that is not rendered assigns nothing and never fires
  // `slotchange`, so a slot-only read could never report the first media in. This
  // is `<kai-thread>`'s own pattern for its `empty` seam (`readSlots` + a
  // MutationObserver), and the observer is required rather than tidy: a consumer
  // that assigns media after mount changes no attribute of the host itself.
  const [hasMedia, setHasMedia] = createSignal(false);
  onMount(() => {
    const read = () => setHasMedia(readSlots(element, EMPTY_SLOTS).media);
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true, attributes: true, subtree: true });
    onCleanup(() => observer.disconnect());
  });
  return (
    <>
      {/* The host box mirrors the component's own (`Empty` is `flex-1` + a flex column),
          because the host is what stands in the layout the consumer puts it in: the
          thread's empty region is a flex column, the projected element IS the flex item,
          and `display:block` there left the surface at its content height inside a much
          taller region — measured, a 180px surface in 600px of room, sitting at the top.
          `flex: 1 1 auto` is inert wherever the host is not a flex item, so this only
          states what the component already assumes. The `min-*` pair is the component's
          own `min-w-0`, plus the block-axis twin a column needs to be allowed to shrink. */}
      <style>{':host{display:flex;flex:1 1 auto;flex-direction:column;min-width:0;min-height:0}'}</style>
      <Empty>
        <EmptyHeader>
          <Show when={hasMedia()}>
            <EmptyMedia variant="icon"><slot name="media" /></EmptyMedia>
          </Show>
          <Show when={props.emptyTitle}><EmptyTitle>{props.emptyTitle}</EmptyTitle></Show>
          <Show when={props.description}><EmptyDescription>{props.description}</EmptyDescription></Show>
        </EmptyHeader>
        <EmptyContent><slot /></EmptyContent>
      </Empty>
    </>
  );
});
