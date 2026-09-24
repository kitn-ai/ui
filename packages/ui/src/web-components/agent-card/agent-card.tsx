import { defineWebComponent } from '../define/define';
import { AgentCard, type AgentStatus } from '../../components/agent-card/agent-card';

interface Props extends Record<string, unknown> {
  /** The agent's name, the primary label. Attribute: `name`. */
  name?: string;
  /** Selected / focused state: highlighted border + surface. Attribute: `active`. */
  active?: boolean;
  /** Raise a prominent "Needs you" pill plus a glowing amber edge. This
   *  is the attention-routing signal that pulls focus to this agent.
   *  Attribute: `needs-attention`. */
  needsAttention?: boolean;
  // Shape: `{ tone, label?, pulse? }`, where `tone` is one of `working` | `idle` |
  // `done` | `error` | `blocked` (mapped to the kit's tool hues), `label` is an
  // optional short string beside the dot, and `pulse` animates the dot. Set it with
  // `el.status = { tone: 'working', label: 'Working', pulse: true }`.
  /** Run status: `{ tone, label?, pulse? }`. JS property, not an attribute. */
  status?: AgentStatus;
}

/** Events fired by `<kai-agent-card>`. */
interface Events {
  /** The card was activated by a click, or by Enter / Space while focused.
   *  Promote this agent back to focus. */
  'kai-activate': void;
  /** The trailing "..." kebab was clicked. The consumer opens its own menu; the
   *  card only surfaces the affordance (the click does not also activate the card). */
  'kai-menu': void;
}

/**
 * One agent's state at a glance in a multi-agent workspace; the focused agent belongs
 * in the thread or the panel.
 */
defineWebComponent<Props, Events>('kai-agent-card', {
  name: undefined,
  active: undefined,
  needsAttention: undefined,
  status: undefined,
}, (props, { dispatch, flag }) => (
  <AgentCard
    name={(props.name as string) ?? ''}
    active={flag('active')}
    needsAttention={flag('needsAttention')}
    status={(props.status as AgentStatus) ?? { tone: 'idle' }}
    onActivate={() => dispatch('kai-activate')}
    onMenu={() => dispatch('kai-menu')}
  />
));
