import { defineWebComponent } from './define';
import { Reasoning, ReasoningTrigger, ReasoningContent } from '../components/reasoning';
import { ChatConfig, useChatConfig } from '../primitives/chat-config';

interface Props extends Record<string, unknown> {
  /** The reasoning text to display. */
  text: string;
  /** Trigger label. */
  label?: string;
  /** Controlled open state — set as a property (`el.open = true`). Omit for
   *  uncontrolled (the trigger toggles it). */
  open?: boolean;
  /** While true, auto-expands (and re-collapses when it flips false). */
  streaming?: boolean;
  /** Render `text` as markdown. */
  markdown?: boolean;
}

/** Events fired by `<kai-reasoning>`. */
interface Events {
  /** Open state changed (via the trigger or streaming auto-open). */
  'kai-open-change': { open: boolean };
}

/**
 * `<kai-reasoning>` — a collapsible reasoning/thinking block that auto-expands
 * while `streaming`. Text via the `text` property; `markdown`/`streaming` flags;
 * `open` is a controlled property; emits `kai-open-change`.
 */
defineWebComponent<Props, Events>('kai-reasoning', {
  text: '',
  label: 'Reasoning',
  open: undefined,
  streaming: false,
  markdown: true,
}, (props, { dispatch, flag }) => {
  const outer = useChatConfig();
  return (
    <ChatConfig portalMount={outer.portalMount()}>
      <Reasoning
        open={props.open}
        isStreaming={flag('streaming')}
        onOpenChange={(open) => dispatch('kai-open-change', { open })}
      >
        <ReasoningTrigger>{props.label}</ReasoningTrigger>
        <ReasoningContent markdown={flag('markdown')}>{props.text}</ReasoningContent>
      </Reasoning>
    </ChatConfig>
  );
});
