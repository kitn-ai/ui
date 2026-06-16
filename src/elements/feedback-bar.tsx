import { defineWebComponent } from './define';
import { FeedbackBar, type FeedbackValue, type FeedbackDetail } from '../components/feedback-bar';

interface Props extends Record<string, unknown> {
  /** The banner label (e.g. "Was this helpful?"). Attribute: `bar-title`
   *  (`title` is avoided — it's a global HTML attribute). */
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

/** Events fired by `<kc-feedback-bar>`. */
interface Events {
  /** The user rated the response. `value` is `'helpful'` or `'not-helpful'`. */
  'kc-feedback': { value: FeedbackValue };
  /** The user submitted the optional detail form (`collect-detail`). */
  'kc-feedback-detail': FeedbackDetail;
  /** The user dismissed the banner. */
  'kc-close': void;
}

/**
 * `<kc-feedback-bar>` — an inline thumbs up/down feedback banner that owns its
 * own flow: it asks, optionally collects a category + comment on a not-helpful
 * vote (`collect-detail`), then confirms with a thank-you — all in place. Emits
 * `kc-feedback` (`{ value }`), `kc-feedback-detail` (`{ value, category?, comment? }`),
 * and `kc-close`.
 */
defineWebComponent<Props, Events>('kc-feedback-bar', {
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
    onFeedback={(value) => dispatch('kc-feedback', { value })}
    onSubmitDetail={(detail) => dispatch('kc-feedback-detail', detail)}
    onClose={() => dispatch('kc-close')}
  />
));
