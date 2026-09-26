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
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon"><slot name="media" /></EmptyMedia>
      <Show when={props.emptyTitle}><EmptyTitle>{props.emptyTitle}</EmptyTitle></Show>
      <Show when={props.description}><EmptyDescription>{props.description}</EmptyDescription></Show>
    </EmptyHeader>
    <EmptyContent><slot /></EmptyContent>
  </Empty>
));
