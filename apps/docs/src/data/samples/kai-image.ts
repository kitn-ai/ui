// Sample data for <kai-image> — the RESOURCE renderer (a src, not a payload).
//
// `src` and `alt` are scalar props, but they need seeding here so the Playground
// and bare Examples render a real image rather than nothing. Same pattern as
// kai-code-block's `code`.
//
// A reference image, so the samples are URLs: two remote ones (a photo and a
// portrait) and one inline `data:` URI, which is the case worth showing because
// it proves this component takes any image URL and not only a hosted one. The
// AI-payload counterpart lives in kai-image-artifact.ts.
//
// `sample` = default shown by the Playground + bare <Example>
// `named`  = alternate sets referenced by <Example data="key">

const INLINE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">' +
  '<rect width="96" height="96" rx="16" fill="#7c3aed"/>' +
  '<text x="48" y="62" font-size="44" text-anchor="middle" fill="white">★</text>' +
  '</svg>';

export default {
  sample: {
    src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
    alt: 'A mountain landscape at dusk',
  },
  named: {
    portrait: {
      src: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=400&fit=crop',
      alt: 'A beach at sunset',
    },
    inline: {
      // `unescape(encodeURIComponent(...))` first: the star is outside Latin-1 and a bare `btoa`
    // throws InvalidCharacterError, which fails the whole docs build while prerendering a page
    // that imports this module.
    src: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(INLINE_SVG)))}`,
      alt: 'A purple star icon, inlined as a data URI',
    },
  },
};
