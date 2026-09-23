import { defineWebComponent } from '../define/define';
import { FeedbackBar, type FeedbackValue, type FeedbackDetail } from '../../components/feedback/feedback-bar';

interface Props extends Record<string, unknown> {
  /** The banner label (e.g. "Was this helpful?"). Attribute: `bar-title`
   *  (`title` is avoided because it is a global HTML attribute). */
  barTitle?: string;
  /** When set, a not-helpful vote opens an optional detail form before the
   *  thank-you confirmation. Attribute: `collect-detail`. */
  collectDetail?: boolean;
  /** Optional category chips for the detail form. Set as a JS property (array). */
  categories?: string[];
  /** Heading for the detail form. Attribute: `detail-title`. */
  detailTitle?: string;
  /** Placeholder for the detail comment box. Attribute: `detail-placeholder`. */
  detailPlaceholder?: string;
  /** Submit button label in the detail form. Attribute: `submit-label`. */
  submitLabel?: string;
  /** Confirmation copy shown after a vote/submit. Attribute: `thanks-message`. */
  thanksMessage?: string;
}

/** Events fired by `<kai-feedback-bar>`. */
interface Events {
  /** The user rated the response. `value` is `'helpful'` or `'not-helpful'`. */
  'kai-feedback': { value: FeedbackValue };
  /** The user submitted the optional detail form (`collect-detail`). */
  'kai-feedback-detail': FeedbackDetail;
  /** The user dismissed the banner. */
  'kai-close': void;
}

// Thread-level, not per-message: no event detail carries a message id, and when to show it is the host's call.
/**
 * An inline thumbs up / thumbs down bar that asks for feedback and thanks the user.
 */
defineWebComponent<Props, Events>('kai-feedback-bar', {
  barTitle: 'Was this helpful?',
  collectDetail: undefined,
  categories: undefined,
  detailTitle: undefined,
  detailPlaceholder: undefined,
  submitLabel: undefined,
  thanksMessage: undefined,
}, (props, { dispatch, flag }) => (
  <FeedbackBar
    title={props.barTitle}
    collectDetail={flag('collectDetail')}
    categories={props.categories}
    detailTitle={props.detailTitle}
    detailPlaceholder={props.detailPlaceholder}
    submitLabel={props.submitLabel}
    thanksMessage={props.thanksMessage}
    onFeedback={(value) => dispatch('kai-feedback', { value })}
    onSubmitDetail={(detail) => dispatch('kai-feedback-detail', detail)}
    onClose={() => dispatch('kai-close')}
  />
));
