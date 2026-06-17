// Per-element sample data for NON-scalar props (arrays/objects like `items`,
// `messages`, `sources`, `files`) — the one thing element-meta can't provide.
// The generic Playground/Example read this to populate the live preview.
//
// One entry per kc-* element. `SAMPLE[tag]` is the default prop data; `NAMED`
// holds alternate sets a focused example can opt into (e.g. image-only galleries).
// The Phase-2 fan-out extends these maps — no per-element code files.

const thumb = (c: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="${c}"/></svg>`);

export const IMAGE_ITEMS = [
  { id: '1', type: 'file', filename: 'mountain-landscape.jpg', mediaType: 'image/jpeg', url: thumb('#3b6ea5') },
  { id: '2', type: 'file', filename: 'sunset-beach.png', mediaType: 'image/png', url: thumb('#e8915b') },
  { id: '3', type: 'file', filename: 'forest-trail.jpg', mediaType: 'image/jpeg', url: thumb('#3f7d5b') },
];

export const MIXED_ITEMS = [
  { id: '1', type: 'file', filename: 'mountain-landscape.jpg', mediaType: 'image/jpeg', url: thumb('#3b6ea5') },
  { id: '2', type: 'file', filename: 'architecture.pdf', mediaType: 'application/pdf' },
  { id: '3', type: 'file', filename: 'podcast.mp3', mediaType: 'audio/mpeg' },
  { id: '4', type: 'file', filename: 'demo.mp4', mediaType: 'video/mp4' },
  { id: '5', type: 'source-document', title: 'kitn.dev', filename: 'kitn.dev' },
  { id: '6', type: 'file', filename: 'data.bin', mediaType: 'application/octet-stream' },
];

/** Default non-scalar prop data, per element tag. */
export const SAMPLE: Record<string, Record<string, unknown>> = {
  'kc-attachments': { items: MIXED_ITEMS },
};

/** Named alternate data sets a focused example can select by key. */
export const NAMED: Record<string, Record<string, Record<string, unknown>>> = {
  'kc-attachments': {
    images: { items: IMAGE_ITEMS },
  },
};

/** Resolve the sample data for a tag, optionally a named set, merged with overrides. */
export function sampleFor(tag: string, named?: string, overrides?: Record<string, unknown>): Record<string, unknown> {
  const base = SAMPLE[tag] ?? {};
  const namedSet = named ? NAMED[tag]?.[named] ?? {} : {};
  return { ...base, ...namedSet, ...(overrides ?? {}) };
}
