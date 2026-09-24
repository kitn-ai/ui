import { createSignal, onCleanup, onMount } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { PromptDock, type PromptDockAppearance, type PromptDockFrame } from '../../components/prompt/prompt-dock';

interface Props extends Record<string, unknown> {
  /** How the tray frames the input, the SPATIAL axis: `inset` (default, recessed on every side), `edge` (top/bottom only), or `none`. */
  frame?: PromptDockFrame;
  /** How the tray surface looks, the VISUAL axis: `soft` (default), `outlined`, `filled`, or `plain`. */
  appearance?: PromptDockAppearance;
}

/** The named slots whose occupancy gates a dock lip. An empty `<slot>` is always
 *  a truthy node, so the facade tracks which are actually filled and only passes
 *  those regions to the primitive (which renders top/bottom only when truthy). */
const SLOT_NAMES = ['top', 'bottom'] as const;
type SlotName = (typeof SLOT_NAMES)[number];

/**
 * A recessed in-flow tray that frames a prompt input, with optional bands above and
 * below it. `kai-dock` is the floating corner launcher instead.
 */
defineWebComponent<Props>('kai-prompt-dock', {
  frame: 'inset',
  appearance: 'soft',
}, (props, { element }) => {
  // Track which named lip slots are filled. Re-read on child mutations so streamed
  // / late content lights up its band. An unfilled lip is never rendered (the
  // primitive gates on a truthy top/bottom, and a bare <slot> is always truthy).
  const [filled, setFilled] = createSignal<Record<SlotName, boolean>>({ top: false, bottom: false });

  onMount(() => {
    const read = () => {
      const next = {} as Record<SlotName, boolean>;
      for (const name of SLOT_NAMES) next[name] = !!element.querySelector(`:scope > [slot="${name}"]`);
      setFilled(next);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true });
    onCleanup(() => observer.disconnect());
  });

  const lip = (name: SlotName) => (filled()[name] ? <slot name={name} /> : undefined);

  return (
    <PromptDock
      frame={props.frame as PromptDockFrame}
      appearance={props.appearance as PromptDockAppearance}
      top={lip('top')}
      bottom={lip('bottom')}
    >
      <slot />
    </PromptDock>
  );
});
