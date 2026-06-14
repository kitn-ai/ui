import { defineWebComponent } from './define';
import { FeedbackBar, type FeedbackValue } from '../components/feedback-bar';

interface Props extends Record<string, unknown> {
  /** The banner label (e.g. "Was this helpful?"). Attribute: `bar-title`
   *  (`title` is avoided — it's a global HTML attribute). */
  barTitle?: string;
}

/** Events fired by `<kc-feedback-bar>`. */
interface Events {
  /** The user rated the response. `value` is `'helpful'` or `'not-helpful'`. */
  feedback: { value: FeedbackValue };
  /** The user dismissed the banner. */
  close: void;
}

/**
 * `<kc-feedback-bar>` — an inline thumbs up/down feedback banner. Emits
 * `feedback` (with `value: 'helpful' | 'not-helpful'`) / `close`.
 */
defineWebComponent<Props, Events>('kc-feedback-bar', {
  barTitle: 'Was this helpful?',
}, (props, { dispatch }) => (
  <FeedbackBar
    title={props.barTitle}
    onFeedback={(value) => dispatch('feedback', { value })}
    onClose={() => dispatch('close')}
  />
));
