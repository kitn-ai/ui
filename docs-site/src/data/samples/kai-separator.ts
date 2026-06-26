// Sample data for <kai-separator>.
//
// kai-separator is just a themed divider line — one scalar prop (orientation),
// no events, no slots. There's no light-DOM content to inject: the element draws
// the rule itself, so the `html` field every other sample uses doesn't apply
// here. The Playground/Example render the bare line and the orientation control
// (or the per-example `config`) is all that drives it.
//
// `sample`        = default for the Playground + a bare <Example> (no data="")
// `named`         = alternate sets a focused <Example data="…"> opts into
// `previewHeight` = gives the demo box a real height so a `vertical` rule (which
//                   stretches to its row) is actually visible — a horizontal rule
//                   needs no height.
//
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob, so
// this file is picked up automatically — no shared-file edits needed.

export default {
  // Default: a plain horizontal rule, no extra content needed.
  sample: {},

  named: {
    // A horizontal rule sits in its own block — no demo height required.
    horizontal: {},

    // A vertical rule stretches to its row's height, so give the box a height
    // for the line to span; the element is set to fill it.
    vertical: {
      previewHeight: '4rem',
    },
  },
};
