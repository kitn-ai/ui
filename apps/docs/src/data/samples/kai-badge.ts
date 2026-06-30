// Sample data for <kai-badge>.
//
// kai-badge has one scalar prop (variant). Its content is light-DOM default-slot
// text — a short label or a number — so the sample/named sets only ever carry
// `html` (injected as innerHTML BEFORE upgrade so the slot renders on first paint).
//
// `sample` = default content for the Playground + a bare <Example> (no data="")
// `named`  = per-variant content a focused <Example data="…"> opts into
//
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob, so
// this file is picked up automatically — no shared-file edits needed.

export default {
  // Default (label) playground content.
  sample: {
    html: 'Beta',
  },

  named: {
    // A short status/label for the default pill.
    label: {
      html: 'New',
    },
    // A compact number for the count variant.
    count: {
      html: '3',
    },
    // An inline citation marker for the citation variant.
    citation: {
      html: '1',
    },
  },
};
