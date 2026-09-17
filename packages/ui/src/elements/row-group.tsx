import { defineWebComponent } from './define';
import { RowGroup } from '../ui/row-group';

type Props = Record<string, unknown>;

/**
 * `<kai-row-group>`: the frame that turns loose `<kai-row>`s into a list — one
 * bordered, rounded card, a hairline between adjacent rows, the first rounded at
 * the top only and the last at the bottom only.
 *
 * COMPOSITION ONLY: put your rows in as light-DOM children (the default slot).
 * There is no data mode — which rows exist, in what order, and what an empty list
 * means are the application's business.
 *
 * ```html
 * <kai-row-group>
 *   <kai-row chevron interactive>Preferences</kai-row>
 *   <kai-row chevron interactive>Connected repos</kai-row>
 * </kai-row-group>
 * ```
 *
 * Two rules it inherits from how the geometry reaches a shadow boundary, both
 * stated because neither is discoverable from the markup:
 *
 * - Rows must be DIRECT CHILDREN. Wrap one in a `<div>` (or any other element) and
 *   the divider and the corners land on that wrapper rather than on the row
 *   inside it.
 * - Rows are added and REMOVED rather than hidden with the `hidden` attribute: a
 *   hidden row still occupies its place in the sibling chain, so the row after it
 *   paints a hairline at the very top of the frame. `::slotted()` cannot express
 *   "preceded by a visible sibling" (it takes a compound selector, never a
 *   combinator), so this is a limit of the platform here rather than a pending
 *   fix.
 *
 * `--kai-row-radius` on the host is the list's corner-radius knob (default: the
 * `--radius-lg` token, the same scale a standalone row rounds on). Set it to `0`
 * for a group that should sit flush inside a panel that is already rounded.
 *
 * ACCESSIBILITY: the frame carries no role of its own, deliberately. When the
 * rows are a meaningful cluster of related things rather than a plain list of
 * links, label it yourself — `<kai-row-group role="group" aria-label="Preferences">`
 * — which is exactly the choice `Row` makes about its own root element. Both
 * attributes pass straight through to the frame.
 */
defineWebComponent<Props>('kai-row-group', {}, () => (
  <>
    {/* Same reason as `<kai-view>`: the shared base sheet sets `:host{display:block}`,
        an author rule that outranks the UA's `[hidden]{display:none}`, so without
        this a hidden group still lays out. */}
    <style>{':host([hidden]){display:none}'}</style>
    <RowGroup>
      <slot />
    </RowGroup>
  </>
));
