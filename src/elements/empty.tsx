import { Show } from 'solid-js';
import { defineKitnElement } from './define';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '../components/empty';

interface Props extends Record<string, unknown> {
  /** Title text. Attribute: `empty-title` (`title` is a global HTML attribute). */
  emptyTitle?: string;
  /** Description text. */
  description?: string;
}

/**
 * `<kc-empty>` — an empty-state block. `empty-title`/`description` via
 * attributes; slot your own icon into `slot="media"` and actions into the
 * default slot (Route 2 slots).
 */
defineKitnElement<Props>('kc-empty', {
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
