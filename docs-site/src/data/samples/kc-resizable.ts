// Sample data for <kc-resizable>.
//
// `maximizedIndex` is scalar:false (it's a number | null property, not an
// array/object) so there is no meaningful object/array data to seed here.
// The Playground and Examples rely solely on the scalar `orientation` control
// and `<kc-resizable-item>` light children; those are injected as light DOM
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
    html: `<kc-resizable-item size="28%" min="140px" style="display:block;height:100%"><div style="${MUTED_BG}">Sidebar</div></kc-resizable-item><kc-resizable-item style="display:block;height:100%"><div style="${PANE_STYLE}">Chat</div></kc-resizable-item>`,
  },

  named: {
    // Vertical orientation Example: a top/bottom code-editor + output split.
    vertical: {
      html: `<kc-resizable-item size="55%" min="80px" style="display:block;height:100%"><div style="${MUTED_BG}">Editor</div></kc-resizable-item><kc-resizable-item style="display:block;height:100%"><div style="${PANE_STYLE}">Output</div></kc-resizable-item>`,
    },

    // Three-panel Example: list + chat + preview.
    threePanel: {
      html: `<kc-resizable-item size="22%" min="120px" style="display:block;height:100%"><div style="${MUTED_BG}">List</div></kc-resizable-item><kc-resizable-item style="display:block;height:100%"><div style="${PANE_STYLE}">Chat</div></kc-resizable-item><kc-resizable-item size="30%" min="160px" style="display:block;height:100%"><div style="${MUTED_BG}">Preview</div></kc-resizable-item>`,
    },
  },
};
