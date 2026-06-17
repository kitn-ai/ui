// Sample data for <kc-resizable-item>.
//
// All five props on this element are scalar:true (size, min, max, locked,
// hidden), so there are no arrays or objects to seed here. The element is a
// passive config-carrier — it reads its attributes and renders slotted
// content; the parent <kc-resizable> does the layout maths.
//
// `sample`  = default non-scalar prop data (playground + bare examples)
// `named`   = alternate sets a focused <Example data="…"> can opt into
//
// The `html` key is light-DOM slot content injected as innerHTML BEFORE
// upgrade, so slotted children render immediately. Here it gives each example
// a visible placeholder pane so the item is not an empty box.

const PANE_STYLE =
  'height:100%;display:flex;align-items:center;justify-content:center;' +
  'padding:16px;background:var(--color-muted,#f4f4f5);' +
  'color:var(--color-muted-foreground,#71717a);font-size:13px;font-family:sans-serif';

export default {
  // Default sample: a content pane label so the item renders visibly.
  sample: {
    html: `<div style="${PANE_STYLE}">Panel content</div>`,
  },

  named: {
    // A panel with an explicit px size (sidebar-style).
    sized: {
      html: `<div style="${PANE_STYLE}">Sidebar (260 px)</div>`,
    },

    // A panel that is locked at a fixed size.
    locked: {
      html: `<div style="${PANE_STYLE}">Locked nav panel</div>`,
    },

    // A flexible panel that fills remaining space.
    flexible: {
      html: `<div style="${PANE_STYLE}">Main content (flexible)</div>`,
    },
  },
};
