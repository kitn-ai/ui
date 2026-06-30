import { ScrollArea, type ScrollOrientation } from '../ui/scroll-area';
import { defineWebComponent } from './define';

interface Props extends Record<string, unknown> {
  /** Which axis scrolls. `vertical` (default) · `horizontal` · `both`. The cross
   *  axis is clamped so content can't overflow it. */
  orientation?: ScrollOrientation;
}

/**
 * `<kai-scroll-area>` — a scroll container with a themed, thin, cross-browser
 * scrollbar and a keyboard-reachable region. Project the scrollable content as
 * light-DOM children and give the element a bounded size in your layout; the
 * content then scrolls inside. Use `orientation` to pick the axis. Restyle the
 * container via `::part(viewport)`; the scrollbar follows the
 * `--color-scrollbar-thumb` token.
 *
 * ```html
 * <kai-scroll-area style="height: 16rem">…long content…</kai-scroll-area>
 * <kai-scroll-area orientation="horizontal" style="max-width: 24rem">…wide row…</kai-scroll-area>
 * ```
 */
defineWebComponent<Props>('kai-scroll-area', {
  orientation: 'vertical',
}, (props) => (
  <>
    {/* The element is a block box; the consumer sets its size, the viewport fills it. */}
    <style>{':host{display:block;min-height:0}'}</style>
    <ScrollArea class="h-full max-h-full w-full max-w-full" part="viewport" orientation={props.orientation as ScrollOrientation}>
      <slot />
    </ScrollArea>
  </>
));
