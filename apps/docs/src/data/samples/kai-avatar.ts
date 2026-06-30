// Sample data for <kai-avatar>.
//
// kai-avatar has only scalar props (src, alt, fallback, size) and no light-DOM
// slots — the image and the initials fallback are both props. So unlike most
// samples this file carries the actual prop VALUES (src/fallback) on the
// `sample`/`named` sets rather than an `html` string; Playground/Example apply
// every non-`html` key as a JS property after upgrade.
//
// `sample` = default values for the Playground + a bare <Example> (no data="")
// `named`  = focused sets a <Example data="…"> opts into (image vs initials)
//
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob, so
// this file is picked up automatically — no shared-file edits needed.

// A small rounded portrait as an inline SVG data-URI — avoids depending on a
// real image file in the docs site. Modeled on the data-URI trick in kai-card.ts.
const PORTRAIT_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">' +
      '<rect width="96" height="96" fill="#e4d4f4"/>' +
      '<circle cx="48" cy="38" r="18" fill="#a855f7"/>' +
      '<circle cx="48" cy="92" r="30" fill="#a855f7"/>' +
      '</svg>',
  );

export default {
  // Default playground values: a photo with an initials fallback behind it.
  sample: {
    src: PORTRAIT_SVG,
    fallback: 'JD',
  },

  named: {
    // A loaded image avatar.
    image: {
      src: PORTRAIT_SVG,
      alt: 'John Doe',
      fallback: 'JD',
    },
    // No src → the initials fallback renders instead.
    initials: {
      fallback: 'AI',
    },
  },
};
