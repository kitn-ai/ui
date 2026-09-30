import { defineWebComponent } from '../define/define';
import { QuestionsWaiting } from '../../components/question/questions-waiting';

interface Props extends Record<string, unknown> {
  /** How many questions still have no answer. */
  count?: number;
  /** How many questions the call asked in all. */
  total?: number;
  /** Text of the reopen control. */
  reopenLabel?: string;
}

interface Events extends Record<string, unknown> {
  /** The reopen control was pressed. The host brings the panel back and calls its `focus()`. */
  'kai-reopen': Record<string, never>;
}
// Meant for the prompt input's `above` region, after the panel was dismissed with questions unanswered.
/**
 * The quiet "N of M questions waiting" line with a Reopen control.
 */
defineWebComponent<Props, Events>('kai-questions-waiting', {
  count: 0,
  total: 0,
  reopenLabel: undefined,
}, (props, { dispatch }) => (
  <>
    <style>{':host{display:block}:host([hidden]){display:none}'}</style>
    <QuestionsWaiting
      count={Number(props.count) || 0}
      total={Number(props.total) || 0}
      reopenLabel={props.reopenLabel as string | undefined}
      onReopen={() => dispatch('kai-reopen', {})}
    />
  </>
));
