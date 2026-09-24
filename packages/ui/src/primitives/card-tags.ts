// `CardEnvelope.type` -> the `kai-*` element that renders it. The authoritative map,
// and the ONLY place it is written down.
//
// WHY IT IS ALONE IN A `.ts`. It used to share card-registry.tsx with
// `BUILTIN_CARD_COMPONENTS`, which is nothing but Solid. The map has no Solid in it
// (`Record<string, string>`), but sharing a module with JSX meant no Node/no-DOM project
// could import it AS SOURCE, and the `kai` MCP server is exactly that (tsconfig.mcp.json:
// Node-only, no `jsx`), so it RE-DERIVED each tag by convention (`kai-<type>`, else the
// single `kai-<type>-*`), a second copy of a fact this repo already held. Relaxing that
// tsconfig is not the fix and was measured: giving the project `jsx` drags the Solid tree
// into a Node-only pass and takes it from 0 errors to 1364. It does not change
// dist/schemas.js: the alternative bundle is byte-identical, so no runtime guard tells the
// two apart. What changes is the dependency graph.
//
// `@kitn.ai/ui/schemas` (the server-safe entry a backend route imports) re-exports it, and
// card-registry.tsx re-exports it in turn, so every existing importer of
// `BUILTIN_CARD_TAGS` / `mergeCardTags` / `CardTagMap` is unaffected.
//
// Built-ins cover the 7 contract card types; consumers extend or override them through a
// `types` prop (merged OVER the built-ins). kai-card (bare shell) is not a target.

/** Web-component layer: envelope type → kai-* tag name. */
export type CardTagMap = Record<string, string>;

/**
 * The seven built-in card types and the element that draws each one.
 *
 * Note `link` → `kai-link-preview`: the one entry that is NOT `kai-<type>`, and the
 * reason inferring these from the tag list is a guess rather than a lookup.
 */
export const BUILTIN_CARD_TAGS: CardTagMap = {
  form: 'kai-form',
  confirm: 'kai-confirm',
  'tasks': 'kai-tasks',
  choice: 'kai-choice',
  link: 'kai-link-preview',
  embed: 'kai-embed',
  artifact: 'kai-artifact',
};

/** Built-ins with the consumer's overrides merged on top (consumer wins). */
export function mergeCardTags(types?: CardTagMap): CardTagMap {
  return types ? { ...BUILTIN_CARD_TAGS, ...types } : { ...BUILTIN_CARD_TAGS };
}
