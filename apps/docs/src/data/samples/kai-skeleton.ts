// Sample data for <kai-skeleton>.
//
// kai-skeleton has only scalar props (variant, width, height, lines) — there's
// no light-DOM slot content. The `sample` set seeds the Playground + a bare
// <Example> with a small multi-line text placeholder so the preview reads as a
// real loading state; focused <Example> blocks override variant/width/height
// through config={} on the element itself.
//
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob, so
// this file is picked up automatically — no shared-file edits needed.

export default {
  // Default playground content: a three-line text placeholder.
  sample: {
    variant: 'text',
    lines: 3,
  },
};
