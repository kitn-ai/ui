// Sample data for <kai-icon>.
//
// kai-icon is scalar-only (name, size) — no light-DOM slots, so the sample set
// only carries scalar props. `name` selects one of the kit's curated icons (the
// NAMED_ICONS map in src/ui/icon.tsx); it also accepts a URL/data-URI or plain
// text, but the curated names are what the docs lean on. We seed a real name so
// the Playground renders a glyph on first paint instead of an empty box.
//
// `sample` = default props for the Playground + a bare <Example> (no data="").
//
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob, so
// this file is picked up automatically — no shared-file edits needed.

export default {
  // Default playground content — a real curated icon name.
  sample: {
    name: 'sparkles',
  },
};
