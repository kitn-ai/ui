import { createSignal, onCleanup, onMount } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { PromptDock, type PromptDockAppearance, type PromptDockFrame } from '../../components/prompt/prompt-dock';

interface Props extends Record<string, unknown> {
  /** How the tray frames the input, the SPATIAL axis: `inset` (default, recessed on every side), `edge` (top/bottom only), or `none`. */
  frame?: PromptDockFrame;
  /** How the tray surface looks, the VISUAL axis: `soft` (default), `outlined`, `filled`, or `plain`. */
  appearance?: PromptDockAppearance;
  // Unset (or the attribute removed), the band is open while a child is slotted into `top`.
  // A bare `top-open` means open, even with no child. To animate a band out, keep the child
  // slotted, set this to `false`, and remove the child after the transition (about 200ms).
  /** Drives the `top` band directly: `false` fades it out, and unset returns to slot occupancy. */
  topOpen?: boolean;
  /** Drives the `bottom` band directly, the same way as `topOpen`. */
  bottomOpen?: boolean;
}

/** Whether a band is driven by its prop rather than by slot occupancy. `flagOn` is the
 *  element's `flag()`: a bare attribute parses to an `undefined` prop, so presence has to
 *  count as set too. Removing the attribute resets the prop to `undefined` (the declared
 *  default), which returns the band to occupancy. */
export function isBandControlled(value: unknown, flagOn: boolean): boolean {
  return value !== undefined || flagOn;
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
  topOpen: undefined,
  bottomOpen: undefined,
}, (props, { element, flag }) => {
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

  // A controlled band keeps its slot rendered whether open or closing, so the slotted
  // child can fade out instead of vanishing the moment the prop flips.
  const controlled = (name: SlotName) =>
    isBandControlled(props[name === 'top' ? 'topOpen' : 'bottomOpen'], flag(name === 'top' ? 'topOpen' : 'bottomOpen'));
  const lip = (name: SlotName) => (controlled(name) || filled()[name] ? <slot name={name} /> : undefined);
  const openOf = (name: SlotName) => (controlled(name) ? flag(name === 'top' ? 'topOpen' : 'bottomOpen') : undefined);

  return (
    <PromptDock
      frame={props.frame as PromptDockFrame}
      appearance={props.appearance as PromptDockAppearance}
      top={lip('top')}
      bottom={lip('bottom')}
      topOpen={openOf('top')}
      bottomOpen={openOf('bottom')}
    >
      <slot />
    </PromptDock>
  );
});
