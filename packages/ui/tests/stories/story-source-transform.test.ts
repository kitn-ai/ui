/**
 * Guard for the Docs/Code panel's dump discriminator.
 *
 * `.storybook/preview.ts` swaps Storybook's auto-derived `docs.source` for a
 * placeholder when it is a serialized STORY OBJECT rather than an authored
 * snippet. The first cut of that check was `sourceCode.trimStart().startsWith('{')`,
 * which is wrong in the expensive direction: 15 snippet literals in the tree open
 * with `{`, and 14 of them are legitimate snippets opening with a JSX comment
 * (plus a package.json snippet and a JSX expression). That version would have
 * replaced authored documentation with "no usage snippet authored" -- silently.
 *
 * So this table pins BOTH directions against the shapes that actually exist:
 * every dump form must be caught, and every real snippet opening must be left
 * alone. Sourced from the corpus (the snippets were enumerated by walking
 * `code:` and `src(...)` literals across all 150 story files), not invented.
 */
import { describe, expect, it } from 'vitest';
import {
  isStoryObjectDump,
  STORY_OBJECT_DUMP_PLACEHOLDER,
} from '../../src/stories/docs/source-transform';

/** Auto-derived dumps: the story OBJECT, serialized. */
const DUMPS: Array<[string, string]> = [
  ['args-only story (the shape the old check missed)', `{ args: { label: 'Temporary chat' } }`],
  ['render-drawing story (the shape the old check caught)', `{ render: [Function], parameters: { layout: 'padded' } }`],
  ['a story with a display name first', `{ name: 'In a settings row', render: [Function] }`],
  ['parameters first', `{ parameters: { docs: {} }, args: {} }`],
  ['leading whitespace and a newline', `\n  {\n  render: [Function],\n}`],
  ['a play-only story', `{ play: [Function] }`],
  ['tags first', `{ tags: ['!dev'], render: [Function] }`],
];

/** Authored snippets: real opening shapes taken from the tree. */
const SNIPPETS: Array<[string, string]> = [
  ['JSX comment, then the component (row-group, resizable, dock, panel, textarea)', `{/* one row: a framed card, rounded on all four corners */}\n<RowGroup class="w-64">`],
  ['JSX comment with a newline inside it', `{/* the frame takes no role of its own: this one IS a cluster of related\n    settings, so it takes role=group */}\n<RowGroup>`],
  ['a brace-wrapped JSX expression (builder-build-wait)', `{BUILDER_TEMPLATES.map((template) => (\n  <BuildWait templateId={template.id} current="generate" />\n))}`],
  ['a package.json snippet (v0)', `{\n  "name": "vesper",\n  "dependencies": { "next": "15.0.0" }\n}`],
  ['a TSX snippet with an import line', `import { Switch } from '@kitn.ai/ui/solid';\n\n<Switch label="Temporary chat" />`],
  ['a plain HTML snippet', `<kai-input label="Workspace name"></kai-input>\n\n<script type="module">\n  import '@kitn.ai/ui/web-components';\n</script>`],
  ['a snippet opening with a const', `const [on, setOn] = createSignal(false);\n\n<Switch checked={on()} onChange={setOn} />`],
  ['a snippet opening with an elided-argument call', `<Select options={MODELS} value="sonnet" />`],
];

describe('isStoryObjectDump', () => {
  it.each(DUMPS)('treats %s as a dump', (_label, code) => {
    expect(isStoryObjectDump(code)).toBe(true);
  });

  it.each(SNIPPETS)('leaves %s alone', (_label, code) => {
    expect(isStoryObjectDump(code)).toBe(false);
  });

  it('is not fooled by a JSX comment that names a story key', () => {
    // The brace-plus-comment opener must win over the key test: a comment is
    // free text and could well contain the word `render:` or `args:`.
    expect(isStoryObjectDump(`{/* render: [Function] is what a dump looks like */}\n<Widget />`)).toBe(false);
  });

  it('is biased against false positives, because those delete documentation', () => {
    // An empty or unparseable source is left alone: showing a dump is
    // recoverable, hiding an authored snippet is not.
    expect(isStoryObjectDump('')).toBe(false);
    expect(isStoryObjectDump('   ')).toBe(false);
  });

  it('names the placeholder a reader can act on', () => {
    expect(STORY_OBJECT_DUMP_PLACEHOLDER).toContain('lint:story-conventions');
  });
});
