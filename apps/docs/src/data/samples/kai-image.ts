// Sample data for <kai-image>.
//
// `base64`, `alt`, and `mediaType` are scalar props but need to be seeded here
// so the Playground and bare Examples render a meaningful image rather than a
// blank skeleton. This follows the same pattern as kai-code-block's `code` prop.
//
// `bytes` (Uint8Array, non-scalar) cannot be serialised in a static data file —
// set it imperatively: `el.bytes = new Uint8Array([...])`.
//
// `sample`  = default shown by the Playground + bare <Example>
// `named`   = alternate data sets referenced by <Example data="key">

// A purple-star SVG — matches the Storybook Default story.
const STAR_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">' +
  '<rect width="96" height="96" rx="16" fill="#7c3aed"/>' +
  '<text x="48" y="62" font-size="44" text-anchor="middle" fill="white">★</text>' +
  '</svg>';

// A teal-circle SVG — illustrates a second distinct image.
const CIRCLE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">' +
  '<rect width="96" height="96" rx="48" fill="#0d9488"/>' +
  '<circle cx="48" cy="48" r="26" fill="white" fill-opacity="0.25"/>' +
  '<circle cx="48" cy="48" r="14" fill="white"/>' +
  '</svg>';

// A green-checkmark SVG — useful for the alt-text accessibility example.
const CHECK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">' +
  '<rect width="96" height="96" rx="16" fill="#16a34a"/>' +
  '<polyline points="28,50 42,64 68,36" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
  '</svg>';

function toBase64(svg: string): string {
  return btoa(unescape(encodeURIComponent(svg)));
}

export default {
  sample: {
    base64: toBase64(STAR_SVG),
    alt: 'A purple star icon',
    mediaType: 'image/svg+xml',
  },
  named: {
    circle: {
      base64: toBase64(CIRCLE_SVG),
      alt: 'A teal circle icon',
      mediaType: 'image/svg+xml',
    },
    checkmark: {
      base64: toBase64(CHECK_SVG),
      alt: 'A green checkmark confirming success',
      mediaType: 'image/svg+xml',
    },
  },
};
