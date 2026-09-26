import { defineWebComponent } from '../define/define';
import { Reasoning, ReasoningTrigger, ReasoningContent, type ReasoningController } from '../../components/reasoning/reasoning';
import { ChatConfig, useChatConfig } from '../../primitives/chat-config';
import { wireDisclosure } from '../disclosure/disclosure';

interface Props extends Record<string, unknown> {
  /** The reasoning text to display. */
  text: string;
  /** Trigger label. */
  label?: string;
  // Shoelace-style: settable and reflected to the `open` attribute, while the element
  // still self-manages on trigger click and while streaming.
  /** Drive/observe the open state: `el.open = true` or the bare `open` attribute. Listen for `kai-open-change`. */
  open?: boolean;
  /** Initial open state on mount (uncontrolled seed). */
  defaultOpen?: boolean;
  /** While true, auto-expands (and re-collapses when it flips false). */
  streaming?: boolean;
  /** Render `text` as markdown. */
  markdown?: boolean;
  /** Gate the disclosure trigger: programmatic `show()/hide()/toggle()` still
   *  work, but the trigger click no longer toggles. */
  disabled?: boolean;
}

/** Events fired by `<kai-reasoning>`. */
interface Events {
  /** The reasoning block expanded or collapsed (via the trigger, streaming
   *  auto-open, or a method). */
  'kai-open-change': { open: boolean };
}

/**
 * A collapsible block of the model's reasoning text. `kai-chain-of-thought` is the
 * stepped version.
 */
defineWebComponent<Props, Events>('kai-reasoning', {
  text: '',
  label: 'Reasoning',
  open: undefined,
  defaultOpen: undefined,
  streaming: false,
  markdown: true,
  disabled: undefined,
}, (props, ctx) => {
  const { flag } = ctx;
  const outer = useChatConfig();
  let api: ReasoningController | undefined;

  // The standard disclosure surface: settable+reflecting `open`, kai-open-change,
  // show/hide/toggle, disabled-gating. See ./disclosure. This is the SOLE emitter
  // of kai-open-change — we no longer dispatch it from Reasoning's onOpenChange.
  wireDisclosure(ctx, () => api, () => props.open);

  return (
    <ChatConfig portalMount={outer.portalMount()}>
      <Reasoning
        defaultOpen={flag('defaultOpen')}
        isStreaming={flag('streaming')}
        disabled={flag('disabled')}
        controllerRef={(a) => (api = a)}
      >
        <ReasoningTrigger>{props.label}</ReasoningTrigger>
        <ReasoningContent markdown={flag('markdown')}>{props.text}</ReasoningContent>
      </Reasoning>
    </ChatConfig>
  );
});
