/**
 * The discriminator behind the Docs/Code panel's placeholder.
 *
 * Storybook derives `docs.source` from the STORY OBJECT when a story authors no
 * `parameters.docs.source.code`. For a story whose render cannot be serialized
 * that derivation is a dump -- `{ render: [Function], parameters: {...} }` --
 * which is noise, not a usage example. `.storybook/preview.ts` swaps it for
 * `STORY_OBJECT_DUMP_PLACEHOLDER`; this module decides what counts as a dump.
 *
 * Lives under `src/` rather than beside `preview.ts` for one reason: `.storybook/**`
 * is deliberately excluded from `tsconfig.tests.json` (preview.ts imports the
 * gitignored `../dist/kai.es.js`, so it cannot typecheck before a build), so a
 * predicate living there would be untypechecked and untested. This file is in the
 * Solid `src` program and has a table test in `tests/stories/`.
 *
 * WHY NOT "IT STARTS WITH A BRACE". That was the first cut, and it is wrong.
 * Measured over the tree: 658 snippet literals, of which 15 open with `{` --
 * and 14 of those 15 are legitimate, paste-ready snippets that open with a JSX
 * comment, e.g. a brace, a slash-star comment, then the component:
 *
 *     row-group.stories.tsx      "one row: a framed card, rounded on all four corners"
 *     resizable.stories.tsx      "line is the default; pass handle to opt into grip/none"
 *     dock.stories.tsx           (three stories, each opening with a comment)
 *
 * The remaining one is a package.json snippet, and one more is a JSX expression.
 * So the brace alone would have swapped 15 authored snippets for the placeholder
 * -- replacing documentation with "no snippet authored", which is the exact
 * failure this transform exists to prevent, inverted.
 *
 * WHAT ACTUALLY SEPARATES THEM: the FIRST KEY. A dump is an object literal whose
 * opening key is a story-definition key -- `args`, `render`, `name`, `parameters`,
 * `play`, `tags`, the lifecycle hooks. No authored snippet in the tree opens that
 * way: one that starts with a brace starts with a JSX comment, a JSX expression,
 * or a QUOTED JSON key. The quotes are load-bearing rather than incidental -- the
 * regex admits no quotes, which is what keeps `{\n  "name": "vesper",` (a real
 * package.json snippet in `v0.stories.tsx`) out while still matching `{ name: … }`
 * on a dump.
 *
 * The bias is deliberate: a false negative shows a dump, a false positive hides a
 * real snippet. When in doubt this predicate returns false.
 */

/** Shown in place of a story-object dump. Kept honest rather than synthesizing
 *  usage code: there is no way to reconstruct a hand-drawn `render:` body from
 *  its compiled function. */
export const STORY_OBJECT_DUMP_PLACEHOLDER =
  '// no usage snippet authored for this story yet — see lint:story-conventions';

/** A story object's opening key, unquoted. */
const STORY_DUMP_HEAD =
  /^\{\s*(?:args|render|parameters|play|name|tags|decorators|globals|loaders|storyName|beforeEach|mount|component|children)\s*:/;

/** True when Storybook's auto-derived source is a serialized story OBJECT rather
 *  than an authored snippet. See the module docblock for why the opening brace
 *  alone is not enough and why the first key is. */
export function isStoryObjectDump(sourceCode: string): boolean {
  return STORY_DUMP_HEAD.test(sourceCode.trimStart());
}
