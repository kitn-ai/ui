// Sample data for <kai-button>.
//
// kai-button is all scalar props (variant, size, icon, iconTrailing, label,
// disabled, type). Its visible text is light-DOM default-slot content, so the
// sample/named sets carry `html` — injected as innerHTML BEFORE upgrade so the
// label renders on the first paint. Icon-only buttons carry no `html`; their
// accessible name comes from the `label` prop set via the Example `config`.
//
// `sample` = default content for the Playground + a bare <Example> (no data="")
// `named`  = focused content a <Example data="…"> opts into
//
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob, so
// this file is picked up automatically — no shared-file edits needed.

// A small inline SVG (paper-plane / send glyph) used by the slot="icon" escape
// hatch — inherits currentColor, so it tracks the button's text color.
const SEND_SVG =
  '<svg slot="icon" viewBox="0 0 24 24" width="16" height="16" fill="none" ' +
  'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>';

export default {
  // Default playground content: a plain text label in the default slot.
  sample: {
    html: 'Send',
  },

  named: {
    // Text label for variant / size examples.
    send: {
      html: 'Send',
    },
    // A secondary, lower-emphasis action.
    cancel: {
      html: 'Cancel',
    },
    // A label paired with a trailing chevron (set iconTrailing in config).
    model: {
      html: 'Claude Opus 4.8',
    },
    // Icon-only: no visible label. Empty html clears the default-slot text so
    // only the `icon` prop renders; name it with `label` in the Example config.
    iconOnly: {
      html: '',
    },
    // slot="icon" escape hatch — a custom inline SVG that wins over the `icon`
    // prop. Pair with label="…" in config to name the icon-only button.
    slottedIcon: {
      html: SEND_SVG,
    },
  },
};
