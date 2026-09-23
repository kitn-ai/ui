import { createSignal, onMount, onCleanup, Index } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { PaneGrid } from '../../components/pane/pane-grid';

interface Props extends Record<string, unknown> {
  /** Minimum width of every pane, in px, before columns drop / the grid scrolls.
   *  Defaults to `280`. Attribute: `min-pane-width`. */
  minPaneWidth?: number;
  /** Minimum height of every pane, in px, before the grid scrolls vertically.
   *  Defaults to `200`. Attribute: `min-pane-height`. */
  minPaneHeight?: number;
  /** Column cap when the container is wide (default `3`). Attribute: `max-columns`. */
  maxColumns?: number;
  /** Gap between panes, any CSS length. Defaults to the kit gap
   *  (`var(--kai-pane-grid-gap, 0.5rem)`). Attribute: `gap`. */
  gap?: string;
  // A simple maximize hook the consumer drives (pair it with `<kai-pane>`'s
  // `kai-maximize` event).
  /** A valid child index renders ONLY that pane full-bleed; clear it or point out of range for the tiled grid. */
  maximizedIndex?: number | null;
}

/** Attribute values arrive as strings; blank/invalid → undefined (the default). */
function num(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
// Under the shadow root each pane child is projected through its OWN auto-assigned named slot,
// so light children become grid tiles directly; an author-set `slot` attribute on a direct child
// is respected and left alone. The grid never maximizes itself: `maximized-index` is a plain
// hook the consumer drives (pair it with `<kai-pane>`'s `kai-maximize`). No events.
/**
 * A responsive grid of panes that drops columns and eventually scrolls rather than squashing them.
 */
defineWebComponent<Props>('kai-pane-grid', {
  minPaneWidth: undefined,
  minPaneHeight: undefined,
  maxColumns: undefined,
  gap: undefined,
  maximizedIndex: undefined,
}, (props, { element }) => {
  // One named slot per direct light child, in child order. The slot names are
  // written onto the children (`pane-<i>`), the same per-child-slot pattern
  // <kai-resizable> uses (`p0`/`p1`/…): PaneGrid tiles its JSX children, and a
  // single default <slot> would make ALL panes one tile. A child that already
  // carries an author-set slot attribute outside our namespace is left alone
  // (and therefore not tiled) — authoring escape hatch, same as unslotted text.
  const [slotNames, setSlotNames] = createSignal<string[]>([]);

  onMount(() => {
    const read = () => {
      const names: string[] = [];
      let i = 0;
      for (const child of Array.from(element.children)) {
        const existing = child.getAttribute('slot');
        if (existing !== null && !/^pane-\d+$/.test(existing)) continue; // author-owned
        const name = `pane-${i++}`;
        if (existing !== name) child.setAttribute('slot', name);
        names.push(name);
      }
      // Structural equality: our own setAttribute('slot') writes re-fire the
      // observer; an unchanged name list means an unchanged layout, so skip the
      // re-render (mirrors <kai-resizable>'s itemsChanged guard).
      if (names.length !== slotNames().length || names.some((n, j) => n !== slotNames()[j])) {
        setSlotNames(names);
      }
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true });
    onCleanup(() => observer.disconnect());
  });

  return (
    <>
      {/* A tiling grid fills its container — default the host to a stretching
          block, same as <kai-resizable>. Give the element (or a parent) a height. */}
      <style>{':host{display:block;height:100%;min-height:0;min-width:0}'}</style>
      <PaneGrid
        minPaneWidth={num(props.minPaneWidth)}
        minPaneHeight={num(props.minPaneHeight)}
        maxColumns={num(props.maxColumns)}
        gap={props.gap as string | undefined}
        maximizedIndex={num(props.maximizedIndex) ?? null}
      >
        <Index each={slotNames()}>{(name) => <slot name={name()} />}</Index>
      </PaneGrid>
    </>
  );
});
