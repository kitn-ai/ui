import { type Placement } from '@floating-ui/dom';
import { HoverCard } from '../ui/hover-card';
import { defineWebComponent } from './define';

interface Props extends Record<string, unknown> {
  /** Delay (ms) before the card opens on hover. Defaults to 0 (focus opens it
   *  immediately too). */
  openDelay?: number;
  /** Delay (ms) before it closes after the pointer leaves. Defaults to 300. */
  closeDelay?: number;
  /** Preferred placement: `'top' | 'bottom' | 'left' | 'right'` (+ optional
   *  `-start`/`-end`). Defaults to `'bottom'`; flips to stay in view. */
  placement?: string;
}

/**
 * `<kai-hover-card>` — reveals RICH content on hover/focus of a trigger (the
 * markup-carrying sibling of the text-only `<kai-tooltip>`). Put the trigger as
 * default light-DOM content and the card body in `slot="card"`. The card is
 * portaled + positioned inside the shadow root, with a transparent hover bridge
 * so the pointer can travel into it.
 *
 * ```html
 * <kai-hover-card>
 *   <a href="#">@acme</a>
 *   <div slot="card">
 *     <strong>Acme Corp</strong>
 *     <p>Workspace · 24 members</p>
 *   </div>
 * </kai-hover-card>
 * ```
 */
defineWebComponent<Props>('kai-hover-card', {
  openDelay: undefined,
  closeDelay: undefined,
  placement: undefined,
}, (props) => (
  <>
    <style>{':host{display:inline-block}'}</style>
    <HoverCard
      trigger={<slot />}
      openDelay={props.openDelay != null ? Number(props.openDelay) : undefined}
      closeDelay={props.closeDelay != null ? Number(props.closeDelay) : undefined}
      placement={(props.placement as Placement | undefined) ?? undefined}
    >
      <slot name="card" />
    </HoverCard>
  </>
));
