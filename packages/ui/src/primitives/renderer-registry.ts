// The tag registry: one vocabulary for "render this data through the consumer's element".
// No Solid, no DOM, so it is safe to export from the server-safe schemas entry.

/** Maps a renderer key (`tool`, `tool:web_search`, a card type, ...) to a custom-element tag. */
export type RendererMap = Record<string, string>;

const CE_NAME = /^[a-z][a-z0-9._]*-[a-z0-9._-]*$/;

/** Whether `tag` is a syntactically valid custom-element name (lowercase, contains a hyphen). */
export function isValidCustomElementName(tag: string): boolean {
  return CE_NAME.test(tag);
}

/** Returns the tag for the first key in `keys` (most specific first) that the map holds. */
export function resolveRenderer(map: RendererMap | undefined, keys: readonly string[]): string | undefined {
  if (!map) return undefined;
  for (const k of keys) if (Object.prototype.hasOwnProperty.call(map, k)) return map[k];
  return undefined;
}
