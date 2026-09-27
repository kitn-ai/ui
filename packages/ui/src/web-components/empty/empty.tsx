import { Show } from 'solid-js';
import { defineWebComponent } from '../define/define';
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
}, (props) => (
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
        <EmptyMedia variant="icon"><slot name="media" /></EmptyMedia>
        <Show when={props.emptyTitle}><EmptyTitle>{props.emptyTitle}</EmptyTitle></Show>
        <Show when={props.description}><EmptyDescription>{props.description}</EmptyDescription></Show>
      </EmptyHeader>
      <EmptyContent><slot /></EmptyContent>
    </Empty>
  </>
));
