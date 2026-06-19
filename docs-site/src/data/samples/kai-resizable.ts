// Sample data for <kai-resizable>.
//
// `maximizedIndex` is scalar:false (it's a number | null property, not an
// array/object) so there is no meaningful object/array data to seed here.
// The Playground and Examples rely solely on the scalar `orientation` control
// and `<kai-resizable-item>` light children; those are injected as light DOM
// via the `html` field — the element reads them via MutationObserver.
//
// `sample`  = default non-scalar prop data (the playground + bare examples)
// `named`   = alternate sets a focused <Example data="…"> can opt into

const PANE_STYLE =
  'height:100%;display:flex;align-items:center;justify-content:center;padding:1rem;font-size:13px;color:#71717a;';
const MUTED_BG = `background:#f4f4f5;${PANE_STYLE}`;

export default {
  // Default playground + horizontal Example: a sidebar + chat split.
  sample: {
    html: `<kai-resizable-item size="28%" min="140px" style="display:block;height:100%"><div style="${MUTED_BG}">Sidebar</div></kai-resizable-item><kai-resizable-item style="display:block;height:100%"><div style="${PANE_STYLE}">Chat</div></kai-resizable-item>`,
    // A resizable layout fills its container, so give the preview real height —
    // the default min-height box is too short to see panels (especially vertical).
    previewHeight: '340px',
  },

  named: {
    // Vertical orientation Example: a top/bottom code-editor + output split. Taller
    // still, so the stacked top/bottom panels and the divider are clearly visible.
    vertical: {
      html: `<kai-resizable-item size="55%" min="80px" style="display:block;height:100%"><div style="${MUTED_BG}">Editor</div></kai-resizable-item><kai-resizable-item style="display:block;height:100%"><div style="${PANE_STYLE}">Output</div></kai-resizable-item>`,
      previewHeight: '460px',
    },

    // Three-panel Example: list + chat + preview.
    threePanel: {
      html: `<kai-resizable-item size="22%" min="120px" style="display:block;height:100%"><div style="${MUTED_BG}">List</div></kai-resizable-item><kai-resizable-item style="display:block;height:100%"><div style="${PANE_STYLE}">Chat</div></kai-resizable-item><kai-resizable-item size="30%" min="160px" style="display:block;height:100%"><div style="${MUTED_BG}">Preview</div></kai-resizable-item>`,
    },
  },
};
