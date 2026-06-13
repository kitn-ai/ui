import { defineKitnElement } from './define';
import { FeedbackBar } from '../components/feedback-bar';

interface Props extends Record<string, unknown> {
  /** The banner label (e.g. "Was this helpful?"). Attribute: `bar-title`
   *  (`title` is avoided — it's a global HTML attribute). */
  barTitle?: string;
}

/** Events fired by `<kitn-feedback-bar>`. */
interface Events {
  /** The user clicked thumbs-up. */
  helpful: void;
  /** The user clicked thumbs-down. */
  nothelpful: void;
  /** The user dismissed the banner. */
  close: void;
}

/**
 * `<kitn-feedback-bar>` — an inline thumbs up/down feedback banner. Emits
 * `helpful` / `nothelpful` / `close`.
 */
defineKitnElement<Props, Events>('kitn-feedback-bar', {
  barTitle: 'Was this helpful?',
}, (props, { dispatch }) => (
  <FeedbackBar
    title={props.barTitle}
    onHelpful={() => dispatch('helpful')}
    onNotHelpful={() => dispatch('nothelpful')}
    onClose={() => dispatch('close')}
  />
));
