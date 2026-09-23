import { createSignal, onCleanup, onMount } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { Pane, type PaneStatus } from '../../components/pane/pane';

interface Props extends Record<string, unknown> {
  /** The pane title (the agent / window name). Named `headline` because `title` collides with the global `HTMLElement.title`. */
  headline?: string;
  /** A role / label shown under the title (e.g. "Reviewer", "claude-sonnet").
   *  Attribute: `subtitle`. */
  subtitle?: string;
  /** Show the restore glyph instead of maximize, and signal the maximized
   *  view-state. Drive it yourself in response to `kai-maximize`. Attribute:
   *  `maximized`. */
  maximized?: boolean;
  /** Highlight the frame with a ring/border to mark the ACTIVE pane. Attribute:
   *  `focused`. */
  focused?: boolean;
  /** Show a split-pane window control that fires `kai-split`. Off by default.
   *  Attribute: `show-split`. */
  showSplit?: boolean;
  /** Show a dock-to-side window control that fires `kai-dock`. Off by default.
   *  Attribute: `show-dock`. */
  showDock?: boolean;
  /** A tone-colored status dot (+ optional label) in the header. An object
   *  `{ tone, label?, pulse? }` set as a JS PROPERTY (not an attribute). */
  status?: PaneStatus;
}

/** Events fired by `<kai-pane>`. All non-bubbling — listen on the element. */
interface Events {
  /** The maximize/restore control was clicked. `detail.maximized` is the
   *  intended NEXT state. Drive the `maximized` prop yourself from it. */
  'kai-maximize': { maximized: boolean };
  /** The close (×) control was clicked. */
  'kai-close': void;
  /** The split control was clicked (only present when `show-split`). */
  'kai-split': void;
  /** The dock control was clicked (only present when `show-dock`). */
  'kai-dock': void;
}

/** Named slots whose occupancy gates a header/footer region. An empty `<slot>`
 *  is always a truthy node, so the facade tracks which are actually filled and
 *  only passes those regions to the primitive (no stray glyph slot / footer
 *  divider when unfilled). */
const SLOT_NAMES = ['leading', 'actions', 'footer'] as const;
type SlotName = (typeof SLOT_NAMES)[number];
// Window controls fire events and hold no state: `kai-maximize` reports the intended NEXT state
// and the consumer drives `maximized` from it, so the element stays uncontrolled-friendly.
// Slots `leading`/`actions`/`footer` are occupancy-gated (an empty `<slot>` is always a truthy
// node, so the facade tracks which are filled and only passes those regions to the primitive).
/**
 * A framed window for one agent or task in a workspace.
 */
defineWebComponent<Props, Events>('kai-pane', {
  headline: '',
  subtitle: undefined,
  maximized: false,
  focused: false,
  showSplit: false,
  showDock: false,
  status: undefined,
}, (props, { element, dispatch, flag }) => {
  // Track which named slots are filled. Re-read on child mutations so streamed/
  // late content lights up its region. An unfilled region is never rendered.
  const [filled, setFilled] = createSignal<Record<SlotName, boolean>>({
    leading: false, actions: false, footer: false,
  });

  onMount(() => {
    const read = () => {
      const next = {} as Record<SlotName, boolean>;
      for (const name of SLOT_NAMES) next[name] = !!element.querySelector(`:scope > [slot="${name}"]`);
      setFilled(next);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true, subtree: true, attributes: true, attributeFilter: ['slot'] });
    onCleanup(() => observer.disconnect());
  });

  const region = (name: SlotName) => (filled()[name] ? <slot name={name} /> : undefined);

  return (
    <Pane
      title={props.headline as string}
      subtitle={props.subtitle as string | undefined}
      status={props.status as PaneStatus | undefined}
      focused={flag('focused')}
      maximized={flag('maximized')}
      leading={region('leading')}
      actions={region('actions')}
      footer={region('footer')}
      onMaximize={() => dispatch('kai-maximize', { maximized: !flag('maximized') })}
      onClose={() => dispatch('kai-close')}
      onSplit={flag('showSplit') ? () => dispatch('kai-split') : undefined}
      onDock={flag('showDock') ? () => dispatch('kai-dock') : undefined}
    >
      <slot />
    </Pane>
  );
});
