// Sample data for <kc-card>.
//
// kc-card has no non-scalar (array/object) props — every prop is a plain
// scalar attribute. The `sample` object and named sets only carry `html`,
// which is injected as the element's innerHTML (light-DOM slot content)
// BEFORE upgrade so named slots render.
//
// `sample`  = default content for the Playground + bare <Example> (no data="")
// `named`   = alternate sets a focused <Example data="…"> can opt into
//
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob,
// so this file is picked up automatically — no shared file edits needed.

// A small muted placeholder rectangle as an inline SVG data-URI — avoids any
// dependency on a real image file in the docs site.
const MEDIA_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="420" height="120">' +
      '<rect width="420" height="120" fill="#f4f4f5"/>' +
      '<text x="210" y="66" font-family="sans-serif" font-size="13" fill="#71717a" text-anchor="middle">media slot</text>' +
      '</svg>',
  );

export default {
  // Default playground injection: a short body paragraph in the default slot.
  sample: {
    html: '<p style="margin:0">Your repository has 3 open pull requests and 12 passing checks.</p>',
  },

  named: {
    // Mirrors the WithMedia Storybook story: an image in slot="media" + body.
    withMedia: {
      html: `<img slot="media" src="${MEDIA_SVG}" alt="Report preview" style="width:100%;display:block;" /><p style="margin:0">Your Q2 numbers are ready to review.</p>`,
    },

    // Actions slot: metadata / secondary labels below the body.
    withActions: {
      html: '<p style="margin:0">Q2 financial summary, 4 charts generated.</p><span slot="actions" style="font-size:12px;color:var(--color-muted-foreground,#71717a)">Generated 2 min ago · PDF ready</span>',
    },
  },
};
