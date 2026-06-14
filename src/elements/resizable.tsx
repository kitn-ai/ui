import { createSignal, onMount, onCleanup, For, Show, type JSX } from 'solid-js';
import { defineKitnElement } from './define';
import { ResizableHandle, normalizeSize } from '../ui/resizable';

type Orientation = 'horizontal' | 'vertical';

/** Parsed view of a `<kc-resizable-item>` light child. */
interface ItemInfo {
  el: HTMLElement;
  size?: string;
  min?: string;
  max?: string;
  locked: boolean;
  hidden: boolean;
}

/** Max number of panels a single group lays out (nest for more). */
const MAX_ITEMS = 3;

/** Convert a px-or-% bound to `data-*` attribute values the handle understands. */
function boundAttrs(value: string | undefined): { pxAttr?: string; pctAttr?: string } {
  if (value === undefined || value === '') return {};
  const t = value.trim();
  if (t.endsWith('px')) return { pxAttr: String(parseFloat(t)) };
  if (t.endsWith('%')) return { pctAttr: String(parseFloat(t)) };
  if (Number.isFinite(Number(t))) return { pctAttr: t };
  return {};
}

interface GroupProps extends Record<string, unknown> {
  /** Layout axis: `horizontal` (row, default) or `vertical` (column). */
  orientation?: Orientation;
}

interface GroupEvents extends Record<string, unknown> {
  /** Fired on drag-end / keyboard resize / visibility change. `detail.sizes` = panel sizes in percent. */
  change: { sizes: number[] };
}

/**
 * `<kc-resizable>` — a composable, resizable multi-panel layout (up to 3 panels)
 * with auto-inserted draggable dividers. It lays out its `<kc-resizable-item>`
 * light children along an axis (`orientation`), reading each item's `size`,
 * `min`, `max`, `locked` and `hidden` attributes via a `MutationObserver`. A
 * divider is interactive only between two unlocked, visible panels. Emits a
 * `change` event (`detail.sizes`, percent) on resize / visibility change.
 */
defineKitnElement<GroupProps, GroupEvents>('kc-resizable', {
  orientation: 'horizontal',
}, (props, { element, dispatch }) => {
  const [items, setItems] = createSignal<ItemInfo[]>([]);
  const orientation = (): Orientation => (props.orientation === 'vertical' ? 'vertical' : 'horizontal');

  /** Read the current `<kc-resizable-item>` light children + their attributes. */
  function readItems() {
    const all = Array.from(element.children).filter(
      (c): c is HTMLElement => c.tagName.toLowerCase() === 'kc-resizable-item',
    );
    if (all.length > MAX_ITEMS) {
      // eslint-disable-next-line no-console
      console.warn(
        `<kc-resizable>: only the first ${MAX_ITEMS} <kc-resizable-item> children are laid out ` +
        `(got ${all.length}). Nest <kc-resizable> for more.`,
      );
    }
    const capped = all.slice(0, MAX_ITEMS);
    const parsed: ItemInfo[] = capped.map((el) => ({
      el,
      size: el.getAttribute('size') ?? undefined,
      min: el.getAttribute('min') ?? undefined,
      max: el.getAttribute('max') ?? undefined,
      locked: el.hasAttribute('locked') && el.getAttribute('locked') !== 'false',
      // Honour both the `hidden` boolean attribute and the IDL property — Solid
      // (and direct `el.hidden = true`) set the property, which doesn't reflect
      // to the attribute on a custom element.
      hidden: el.hidden || (el.hasAttribute('hidden') && el.getAttribute('hidden') !== 'false'),
    }));

    // Assign each visible item to its panel slot by visible order; clear the
    // rest so hidden/extra items don't leak into a slot.
    let visIdx = 0;
    for (const info of parsed) {
      if (info.hidden) {
        info.el.removeAttribute('slot');
      } else {
        info.el.setAttribute('slot', `p${visIdx}`);
        visIdx++;
      }
    }
    for (const el of all.slice(MAX_ITEMS)) el.removeAttribute('slot');

    setItems(parsed);
  }

  const visible = () => items().filter((i) => !i.hidden);

  /** Compute current panel sizes (percent of container) from the rendered DOM. */
  function currentSizes(): number[] {
    return visible().map((info) => {
      const panel = info.el.assignedSlot?.closest('[data-panel]') as HTMLElement | null;
      const target = panel ?? info.el;
      const parent = target.parentElement;
      const dim = orientation() === 'horizontal' ? 'width' : 'height';
      const total = parent ? parent.getBoundingClientRect()[dim] : 0;
      const val = target.getBoundingClientRect()[dim];
      return total > 0 ? Math.round((val / total) * 100) : 0;
    });
  }

  function emitChange() {
    dispatch('change', { sizes: currentSizes() });
  }

  onMount(() => {
    readItems();
    const mo = new MutationObserver(() => {
      readItems();
      // A childList / attribute change (e.g. show/hide) re-lays out → emit.
      queueMicrotask(emitChange);
    });
    mo.observe(element, {
      childList: true,
      // Attribute changes happen on the <kc-resizable-item> *children*, so we
      // must observe the subtree (filtered to the config attributes) — not just
      // the host's own attributes.
      subtree: true,
      attributes: true,
      attributeFilter: ['size', 'locked', 'min', 'max', 'hidden'],
    });
    onCleanup(() => mo.disconnect());
  });

  const isHoriz = () => orientation() === 'horizontal';

  return (
    <>
      {/* A resizable layout fills its container — default the host to a block
          that stretches, so consumers only need to give a parent (or the element)
          a height. Override with an explicit height on the element if needed. */}
      <style>{':host{display:block;height:100%}'}</style>
    <div
      data-resizable-root
      data-orientation={orientation()}
      style={{
        display: 'flex',
        'flex-direction': isHoriz() ? 'row' : 'column',
        width: '100%',
        height: '100%',
      }}
    >
      <For each={visible()}>
        {(info, i) => {
          const min = boundAttrs(info.min);
          const max = boundAttrs(info.max);
          const basis = normalizeSize(info.size);
          const prev = () => visible()[i() - 1];
          const isStatic = () => !!(info.locked || prev()?.locked);
          return (
            <>
              <Show when={i() > 0}>
                <ResizableHandle
                  withHandle
                  orientation={orientation()}
                  static={isStatic()}
                  onPanelResize={() => queueMicrotask(emitChange)}
                />
              </Show>
              <div
                data-panel
                data-locked={info.locked ? '' : undefined}
                data-min-size={min.pxAttr}
                data-min-size-pct={min.pctAttr}
                data-max-size={max.pxAttr}
                data-max-size-pct={max.pctAttr}
                style={{
                  // The panel is a flex item of the root: `flex-basis` sizes its
                  // MAIN axis (width when horizontal, height when vertical) and the
                  // drag/keyboard handlers rewrite that basis — so the layout spine
                  // stays a plain flex row/column (drag math unchanged).
                  //
                  // For the FILL, the panel is itself a `display:grid` with a single
                  // `minmax(0,1fr)` cell on BOTH axes. A grid item (the slotted
                  // `<kc-resizable-item>`) stretches to fill its cell on both axes by
                  // default (`place-items:stretch`), and a `1fr` track inside a
                  // definite-sized grid is a *definite* length — so content fills
                  // height AND width whether or not it sets `height:100%`, in both
                  // orientations. A flex panel only stretches the CROSS axis (which is
                  // why the previous `display:flex` panel collapsed the main axis to
                  // content height). This mirrors how Shoelace/Web Awesome
                  // `<sl-split-panel>` lay panels out with grid for guaranteed fill,
                  // adapted here to a per-panel grid cell (our double slot boundary
                  // makes a slot-as-grid-item unusable — a slot with assigned nodes
                  // has a zero box). min:0 on both axes enables shrink-to-scroll;
                  // overflow clips (the item owns the scroll).
                  ...(basis !== undefined
                    ? { 'flex-basis': basis, 'flex-grow': '0', 'flex-shrink': '0' }
                    : { flex: '1 1 0%' }),
                  display: 'grid',
                  'grid-template-rows': 'minmax(0, 1fr)',
                  'grid-template-columns': 'minmax(0, 1fr)',
                  'min-width': '0',
                  'min-height': '0',
                  overflow: 'hidden',
                }}
              >
                <slot name={`p${i()}`} />
              </div>
            </>
          );
        }}
      </For>
    </div>
    </>
  );
});

interface ItemProps extends Record<string, unknown> {
  /** Initial main-axis size: `"280px"` (fixed) or `"25%"`/`25` (percent). Omitted → flexible. */
  size?: string;
  /** Minimum size during resize (px or %). */
  min?: string;
  /** Maximum size during resize (px or %). */
  max?: string;
  /** Fix this panel's size; adjacent dividers become non-draggable. */
  locked?: boolean;
  /** Hide this panel; its divider is dropped and the rest reflow. */
  hidden?: boolean;
}

/**
 * `<kc-resizable-item>` — a passive config-carrier inside `<kc-resizable>`. It
 * renders its own slotted light content (`<slot/>`); the parent `<kc-resizable>`
 * reads its `size`/`min`/`max`/`locked`/`hidden` attributes to lay it out.
 */
defineKitnElement<ItemProps>('kc-resizable-item', {
  size: undefined,
  min: undefined,
  max: undefined,
  locked: false,
  hidden: false,
}, () => (
  <>
    {/* The item host fills the panel's single grid cell (the panel stretches it on
        both axes) and OWNS the scroll: `display:block; width/height:100%;
        overflow:auto`. min:0 enables shrink-to-scroll.

        The FILL of the *slotted* content happens one level in: a `display:grid`
        wrapper with a single `minmax(0,1fr)` cell whose ONLY child is the `<slot>`.
        A grid item stretches to fill its cell on BOTH axes by default
        (`place-items:stretch`) into a *definite* `1fr` track, so slotted content
        fills width AND height whether or not it sets `height:100%`. The grid MUST
        be its own element wrapping the slot — NOT the host — because the element
        facade renders an empty portal-mount `<div>` (for overlays) as a sibling of
        the facade output; if the host itself were the grid, that portal div would
        become a second grid item and steal a track (collapsing content to the auto
        row). Scoping the grid to a wrapper whose sole child is the slot keeps
        exactly one grid item and is robust to the facade's portal sibling.
        Mirrors how Shoelace/Web Awesome `<sl-split-panel>` use grid for fill. */}
    <style>{':host{display:block;width:100%;height:100%;min-width:0;min-height:0;overflow:auto}'}</style>
    <div style={{ display: 'grid', 'grid-template-rows': 'minmax(0, 1fr)', 'grid-template-columns': 'minmax(0, 1fr)', width: '100%', height: '100%', 'min-width': '0', 'min-height': '0' }}>
      <slot />
    </div>
  </>
) as unknown as JSX.Element);
