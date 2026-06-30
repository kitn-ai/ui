// Sample data for <kai-tooltip>.
//
// kai-tooltip has only scalar props (content, openDelay). The TRIGGER is the
// default slot — a control the user hovers or focuses — so the sample/named sets
// carry `html` (injected as innerHTML BEFORE upgrade so the slotted trigger is
// present on the first paint) plus the `content` prop that supplies the tip text.
//
// `sample` = default content for the Playground + a bare <Example> (no data="")
// `named`  = alternate triggers / placements a focused <Example data="…"> opts into
//
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob, so
// this file is picked up automatically — no shared-file edits needed.

export default {
  // Default playground content: an icon button trigger with a hint.
  sample: {
    content: 'Voice input',
    html: '<kai-button variant="subtle" size="icon" icon="mic" label="Voice input"></kai-button>',
  },

  named: {
    // A plain button trigger — tooltips work over any focusable control.
    button: {
      content: 'Regenerate the last response',
      html: '<kai-button variant="subtle" icon="refresh-cw" label="Regenerate"></kai-button>',
    },
    // A second icon button, for the placement / second-example variant.
    attach: {
      content: 'Attach a file',
      html: '<kai-button variant="subtle" size="icon" icon="paperclip" label="Attach a file"></kai-button>',
    },
  },
};
