import { defineWebComponent } from '../define/define';
import { RowGroup } from '../../components/row/row-group';

type Props = Record<string, unknown>;
// Rows must be DIRECT CHILDREN: wrap one in a `<div>` and the divider and the corners land on
// that wrapper instead. Rows are added and removed rather than hidden with `hidden` (a hidden
// row still occupies its place in the sibling chain, so the row after it paints a hairline at
// the very top of the frame); `::slotted()` takes a compound selector, never a combinator, so
// "preceded by a visible sibling" is not expressible here. `--kai-row-radius` on the host is the
// list's corner-radius knob (default the `--radius-lg` token); set it to `0` for a group already
// inside a rounded panel. The frame carries no role of its own on purpose: label it with
// `role="group" aria-label="…"` when the rows are a meaningful cluster, which is the same choice
// `Row` makes about its own root.
/**
 * A bordered frame that presents a run of rows as one grouped list.
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
