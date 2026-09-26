import { ScrollArea, type ScrollOrientation } from '../../components/scroll/scroll-area';
import { defineWebComponent } from '../define/define';

interface Props extends Record<string, unknown> {
  /** Which axis scrolls. `vertical` (default) · `horizontal` · `both`. The cross
   *  axis is clamped so content can't overflow it. */
  orientation?: ScrollOrientation;
}
// Give the element a bounded size in your layout; it is a block host with no intrinsic height, so
// an unbounded parent means nothing scrolls. The cross axis is clamped so content cannot overflow
// it.
/**
 * A scroll container with a themed, thin, cross-browser scrollbar.
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
