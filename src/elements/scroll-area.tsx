import { ScrollArea } from '../ui/scroll-area';
import { defineWebComponent } from './define';

interface Props extends Record<string, unknown> {}

/**
 * `<kai-scroll-area>` — a scroll container with a themed, thin, cross-browser
 * scrollbar and a keyboard-reachable region. Project the scrollable content as
 * light-DOM children and give the element a bounded height in your layout; the
 * content then scrolls inside. Restyle the container via `::part(viewport)`; the
 * scrollbar follows the `--color-scrollbar-thumb` token.
 *
 * ```html
 * <kai-scroll-area style="height: 16rem">…long content…</kai-scroll-area>
 * ```
 */
defineWebComponent<Props>('kai-scroll-area', {}, () => (
  <>
    {/* The element is a block box; the consumer sets its height, the viewport fills it. */}
    <style>{':host{display:block;min-height:0}'}</style>
    <ScrollArea class="h-full max-h-full" part="viewport">
      <slot />
    </ScrollArea>
  </>
));
