// Regression guard for twelve STORY-CONVENTION defects, all of which were
// hand-authored per story with nothing enforcing them.
//
// THE TWELVE DEFECTS
// (a) A STORY with no usage snippet of its own. The house convention is to
//     author one by hand: either the local
//     `const src = (code) => ({ parameters: { docs: { source: { code, ... } } } })`
//     helper most component `.stories.tsx` files define for themselves (see
//     `src/components/composer/composer.stories.tsx`), or an inline
//     `parameters.docs.source.code`. A story with neither leaves the Code
//     panel to Storybook's auto-source, which for a story that is not
//     reconstructable from `args` is a raw serialized dump of the story
//     OBJECT -- `{ args: {...}, render: [Function] }` -- i.e. the reader gets
//     no example at all (or the honest placeholder the `preview.ts` fallback
//     this guard's sibling change widens swaps in).
//
//     WHY THIS IS PER STORY AND NOT PER FILE. It used to be per FILE: `a file
//     with at least one render: story must also contain at least one snippet
//     SOMEWHERE`. Both halves walked the whole source file, so ONE good
//     snippet anywhere exempted EVERY other story in it -- which is how 78
//     stories drawing their own JSX lacked a snippet without CI going red,
//     and why the 18 args-only stories (a shape the old rule never looked at
//     at all) were invisible to it. The unit of enforcement is the unit the
//     reader sees: one story, one snippet.
// (b) An `argTypes` entry whose key looks like an event (`/^on[A-Z]/`) needs
//     `table: { category: 'Events' }` so it sorts into the Events group in
//     the Controls/Docs panel instead of alongside the props. ~34 files
//     defined an `onX` argType without it.
// (c) A `title` on a RETIRED TIER. `src/ui/` was merged into
//     `src/components/` and the two Storybook tiers collapsed with it, so
//     `Components/Primitives/*` and `Components/Elements/*` both became
//     `Components/*`. One file kept `Components/Elements/MessageSkills` -- it
//     used DOUBLE quotes where the retitle pass matched single ones -- which
//     would have rendered a phantom `Elements` node, resurrecting the exact
//     tier the merge deleted.
// (d) A `title` segment that folds a word into itself, e.g.
//     `Components/CardSurface Surface`. That is the mechanical signature of a
//     blanket SYMBOL rename leaking into a STRING: the file's `Card` became
//     `CardSurface` everywhere including the title, where a human had already
//     written the second word. A title is only ever read by a human, so
//     nothing else in the pipeline -- not tsc, not the story-id guard, not
//     `verify:generated` -- can see it.
// (e) A component EVENT PROP the story's own `component` declares with no
//     `action` + `table: { category: 'Events' }` argTypes entry. This is the
//     defect (b) cannot see: (b) only reads argTypes keys that ARE there, so an
//     event that is missing from argTypes altogether is invisible to it. The
//     cases that shipped: `agent-card.stories.tsx`'s meta `render` passed
//     `onMenu={() => {}}` while nothing declared it, so docgen listed `onMenu`
//     among the properties and the Controls panel never offered it in the
//     Events group. 18 files and 45 prop(s) on today's tree.
// (f) An event of a `kai-*` ELEMENT the story resolves by a literal tag, with
//     no argTypes entry. `web-component-meta.json` carries 136 events across 65
//     of its 97 elements; the element stories pass the tag to `argTypesFor` /
//     `specDescription` and never write down the events. `argTypesFor` cannot -
//     it emits entries for the meta's PROPS, and 136 events are not props: the
//     six function-typed props in the whole meta (`kai-chat.store`,
//     `kai-slider.valueLabel`, ...) are the only ones it stamps 'Events' on,
//     and none of them is an `onX`. 2 files today, 16 prop(s).
// (g) `.storybook/main.ts` dropping the framework's `docgen` options. Storybook
//     picks a control by matching an EXACT string against the docgen type name
//     -- node_modules/storybook/dist/_browser-chunks/chunk-SZQXB3JV.js:975 is
//     `switch (type.name)`, :978 is `case "boolean"`, :991 is `default:
//     return { control: { type: options ? "select" : "object" } }`. An optional
//     boolean arrives from docgen as `boolean | undefined` unless
//     `shouldRemoveUndefinedFromOptional` is on (node_modules/react-docgen-
//     typescript/lib/parser.js:449), and that matches no case, so EVERY optional
//     boolean in the kit silently falls to the object default. `propFilter` is
//     the other half: docgen reads the global `declare module 'solid-js'`
//     directive augmentation as a prop of every component and its generated
//     name carries a ':' (`bool:inert`) -- no such name is addressable as a
//     prop, so it is noise in every arg table. Both were absent until the
//     sibling change landed them; the object form of `framework` exists for no
//     other reason.
// (h) A meta that registers a `component` and carries no `tags: ['autodocs']`.
//     Storybook renders NO Docs tab for such a story, so the hand-authored
//     `docs.description` and the props table docgen builds are unreachable --
//     the one place in this repo where a whole panel of authored prose and the
//     generated table behind it silently disappear. A story with no
//     `component:` is deliberately out of scope (a gallery page has no props
//     table for a Docs tab to hold), so the rule keys on the DECLARATION and
//     not on where the file lives. Measured on today's tree: 86 story files
//     declare a meta `component`, 85 of them carry the tag, and the offender
//     is `src/components/dock/dock.stories.tsx`. The first measurement of this
//     gap said 4 files, because a grep for `component:` also matches
//     `docs: { description: { component: '<prose>' } }` -- three of those four
//     were that description field, which is why this rule reads the AST
//     property and never the text.
// (i) A `docs.source.code` snippet that names something the STORY FILE declares
//     for itself. The snippet is read by somebody who has the snippet and
//     nothing else, so `<PanelBody />` where `PanelBody` is the local helper at
//     `dock.stories.tsx:74`, or `options={MODELS}` where `MODELS` is a local
//     const, is not copy-paste-ready: the reader has no such name. 12 files on
//     today's tree. A name the snippet gets from its own import line is how the
//     reader GETS it, and a name the snippet declares for itself is the same,
//     so both are clean.
// (j) A story hand-rolling a text arrow glyph as a UI affordance. The kit ships
//     the real thing -- `renderIcon('chevron-down', { class: 'size-3.5
//     shrink-0 opacity-60' })` with `gap-1.5` on the container, which is what
//     `src/web-components/dropdown/dropdown.tsx:100` does for the
//     `trigger-icon-trailing` look -- so `Actions ▾` teaches a reader to copy a
//     patch instead of the component. The CHARACTER is the defect and not the
//     pixel: the glyph is a font-dependent shape at whatever size the text
//     happens to run at and it has no accessible name, while the icon is the
//     same chevron every other trigger in the kit draws. Scoped to
//     `.stories.tsx` and to `▾ ▴ ⌄ ▼ ▲`; a story that deliberately SHOWS the
//     character (prose about what a user types) carries a line waiver -- see
//     `GLYPH_WAIVER`.
// (k) A snippet naming a KIT EXPORT that its own import line does not import
//     -- the mirror of (i), and the same failure seen from the reader's side:
//     an example using `buttonVariants(...)` without importing it (the
//     instance a sibling lane found in `dropdown.stories.tsx`, where the name
//     is public and the example simply never imported it) looks plausible and
//     does not compile. 63 sites across 21 files on today's tree. The export
//     names come from PARSING the package's own entry points (`src/index.ts`
//     and `src/solid.ts`), never from a hand-typed list. A lowercase JSX
//     intrinsic (`div`, `span`), a DOM global and another package's component
//     are out of scope BY CONSTRUCTION: no such name is a kit export, so
//     nothing here can demand an import for one.
// (l) A rendered component DESCRIPTION that describes the DOCUMENTATION
//     instead of the component: the strings handed to
//     `componentDescription([...])` / `specDescription(tag, [...])`, and the
//     object `docs.description.component` renders. That string is not a
//     comment -- it is the blurb above the props table, and `llms-full.txt`
//     and the MCP catalog copy it -- so a sentence about the story the reader
//     is in is documentation about documentation. The owner, on the Lightbox
//     story: "we know its solidjs, we don't need to talk about the labs story
//     either. the doc for components should be focus on the component." The
//     same rule caps a description at `DESCRIPTION_PARAGRAPH_LIMIT`
//     paragraphs: past three it is an article, and the detail belongs in the
//     examples and the props table. `sidebar` is deliberately NOT vocabulary
//     -- the kit renders a real sidebar (the conversation list), so `a
//     sidebar conversation list` is component behaviour.
//
// THE INVARIANT
// (a) is a per-STORY finding: every exported story object must have a snippet
// attributable to IT -- the nested `docs -> source -> code` property chain
// inside its own object literal, or a spread of a LOCAL helper that returns
// that shape. The two are detected differently on purpose: an inline chain is
// found by walking the story object, while a helper is found by walking the
// file for a function-valued declaration whose RETURN contains the chain, and
// is attributed to a story only when that story spreads it. Detecting the
// helper by what it returns (never by its name) matters because the roster is
// `const src = ...` in 112 files plus one `const sourceCode = ...`; a rule
// keyed on the name `src` would silently pass any file that named its helper
// something else.
// (b) is a per-KEY finding: every LITERAL `argTypes` property whose name
// matches `/^on[A-Z]/` must carry `table: { category: 'Events' }` verbatim.
// A key introduced only via a spread (`...argTypesFor('kai-x')`) is not
// checked here -- there is no static key to check, and `argTypesFor` itself
// now stamps the category (see `src/stories/docs/web-component-controls.ts`).
// (c) is a per-TITLE finding: the meta object's `title` string must not pass
// through `Elements` or `Primitives` immediately under a leading
// `Components`. Scoped to that exact shape -- see `retiredTier`.
// (d) is a per-TITLE finding: no whitespace-separated word in a title segment
// may be a suffix of an EARLIER word in the same segment. See `doubledToken`
// for why the comparison is scoped rather than a generic repeated-word check.
// (e) is a per-PROP finding: the props type the meta's `component` actually
// declares (resolved through the story's own relative import, then through the
// TS AST of that module) has an `on[A-Z]` member that the file's literal
// argTypes either does not mention or mentions without `action` and
// `table.category 'Events'`. The derivation is the whole point: the first cut of
// this rule keyed on `an on[A-Z] identifier anywhere in a render body`, which
// flagged ~38 showcase pages for passing `onClick={() => {}}` to a `<Button>`
// INSIDE a demo -- a handler on a template element is not a prop of the story's
// component, and requiring an argTypes entry for it is a false positive. What is
// in scope is exactly what the component declares, and nothing else.
// (f) is a per-EVENT finding: for every story that resolves an element by a
// LITERAL tag (`argTypesFor('kai-prompt-input')`, `specDescription('kai-composer',
// [...])`), every event in that element's `events` array must be present as a
// literal argTypes entry carrying `table.category 'Events'` under the prop name
// `on` + the event name minus its `kai-` prefix, camelCased. A tag passed as a
// non-literal (a variable, a computed name) is not resolved -- there is no tag
// to look up -- and is reported as UNVERIFIED rather than skipped quietly.
// (g) is a per-CONFIG finding: `.storybook/main.ts`'s `framework` must be the
// object form with `options.docgen.shouldRemoveUndefinedFromOptional: true` and
// a `propFilter` that drops names containing ':'.
// (h) is a per-META finding: the object `isMetaObject` identifies has a
// `component` property, and its `tags` array does not contain the string
// 'autodocs'. A `tags` this reader cannot read -- not an array literal, or an
// array spread from somewhere it does not follow -- is UNVERIFIED, never a
// quiet pass.
// (i) is a per-SNIPPET finding: every snippet the file hands to its own snippet
// helper (or writes inline as `docs.source.code`) is PARSED, and each name it
// uses where a VALUE is required -- a JSX tag or a bare identifier -- is looked
// up against the names the file declares at its top level. Only those names
// are ever reported, so an import, a JavaScript global and a name the snippet
// declares for itself are outside the set by construction rather than by an
// allow-list that would need maintaining.
// (j) is a per-LINE finding: a glyph of `GLYPH_CHARS` inside RENDERED text -- a
// string literal, a template literal, JSX text -- on a line with no
// `lint-story-conventions: glyph -- <reason>` waiver on it or on the line
// above. Comments are not rendered, so they are not scanned.
// (k) is a per-SNIPPET finding: the same value-position identifier scan (i)
// runs, intersected with the kit's public export names read from
// `src/index.ts` and `src/solid.ts`. A name the snippet's own import line
// brings is clean, and so is a name the snippet declares for itself.
// (l) is a per-DESCRIPTION finding: every paragraph of every RENDERED component
// description -- read from the four authoring shapes the tree writes, all of
// which land on `docs.description.component` -- must be free of `DOCS_TALK`,
// and the description must carry at most `DESCRIPTION_PARAGRAPH_LIMIT`
// paragraphs. A description this reader cannot read statically (a template with
// a hole, an array with a spread) is UNVERIFIED. A
// `// lint-story-conventions: docs-talk -- <reason>` waiver on the site's line or
// the line above covers the whole description.
//
// (i) AND (k) ARE THE TWO DIRECTIONS OF ONE FACT. A docs source snippet is the
// code a reader PASTES, so a name it cannot resolve is broken either way: the
// story file invented it (i), or the snippet simply left it out of its import
// line (k). Both read the snippet AS THE READER SEES IT, which is the COMPOSED
// text -- the helper's template with the argument spliced in -- because 83 of
// the 112 snippet helpers in the tree prepend an `import ...` line that way,
// and reading only the argument would report every story behind one of them.
//
// WHAT (c) AND (d) DELIBERATELY DO NOT CHECK: that `title` equals the
// component's directory. The mapping is NOT 1:1 and a strict rule would
// false-positive on legitimate stories -- `src/components/audio-visualizer/labs/`
// is titled `Labs/Audio Visualizers` and `src/components/settings/settings.stories.tsx`
// is titled `Labs/Settings`, both correct. A guard that cries wolf gets
// waived into uselessness, so these two rules assert only shapes that cannot
// be legitimate.
//
// WHY AST, NOT REGEX
// Every rule here but (l) is about a SHAPE in the code or in a file the code
// names (a property chain, a story's `render` key, a title's segment path, a
// props type declared in the module a story imports, an element's events, the
// docgen options, a meta's `component`/`tags` properties, an identifier in
// expression position), not a token that also legitimately appears in prose --
// `lint-cdn-pins` justifies regex for exactly that distinction and rejects it
// for shape-matching. (l) earns the same exception from the same place: it
// reads a rendered STRING, and the WORDS in it are the defect. The AST is still
// what decides WHICH strings those are -- the argument of the right call, the
// `component` property under `docs.description` -- never a grep for the word.
// A real parse also means renamed variables, multiline
// object literals and reordered keys don't produce false negatives the way a
// line-oriented scan would.
//
// A ZERO-MATCH RUN ON `.stories.tsx` FILES IS A HARD FAILURE. This repo's
// most expensive recurring defect is a scan that silently matches nothing and
// reads as "clean". A clean run on the FINDINGS is fine and is the goal
// state; a clean run because the file walk found no `.stories.tsx` at all is
// this script being broken. The same rule covers every derivation the new
// rules depend on: a run that resolved NO component props type, read NO event
// off the element meta, found NO story meta declaring a `component`, read NO
// snippet text, read NO rendered text node, read NO rendered component
// description string, or parsed NO kit export name exits
// 1 instead of reporting a clean tree.
//
// UNVERIFIED IS A FAILURE, NOT A PASS. Where a new rule cannot read the fact it
// needs -- the component's module or props type does not resolve, a literal tag
// is not in the meta, an event name does not start with `kai-` so the prop name
// cannot be derived -- it names the file and the reason in an UNVERIFIED
// section and exits 1. The alternative (fall back to a broad text rule, or skip
// the file) is the silent widening these rules exist to prevent, and it is the
// same failure (a)'s predecessor shipped: 78 stories with no snippet passed a
// check that had quietly stopped looking at them.
//
// RUNNING IT, without a build:
//
//   node packages/ui/scripts/lint-story-conventions.mjs
//   node packages/ui/scripts/lint-story-conventions.mjs --self-test   # prove it still detects
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { storyRoots } from './story-roots.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const argOf = (flag) => {
  const i = argv.indexOf(flag);
  return i === -1 ? undefined : argv[i + 1];
};
const PKG_ROOT = resolve(argOf('--package-root') ?? join(SCRIPT_DIR, '..'));
const SELF_TEST = argv.includes('--self-test');
// A story can live outside `src/`, so the roots come from `storyRoots`, which
// derives them from `.storybook/main.ts`'s `stories:` globs rather than listing
// them -- see story-roots.mjs's header for why a listed root goes stale.
const STORY_ROOTS = storyRoots(PKG_ROOT);

const parse = (path, text) =>
  ts.createSourceFile(path, text, ts.ScriptTarget.Latest, /* setParentNodes */ true, ts.ScriptKind.TSX);

const propName = (node) => {
  if (!node.name) return undefined;
  if (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) return node.name.text;
  return undefined;
};

/** True if this object literal is `const meta = {...}` -- the file's default
 *  export config, which the house convention (`satisfies Meta<typeof X>`)
 *  gives a SHARED `render:` wrapper applied to every args-driven story
 *  (`render: (args) => <div>...<X {...args} /></div>`, see e.g.
 *  `chat-thread.stories.tsx`). That is not the pattern this rule polices --
 *  a story reachable through `args` is already fully described by the
 *  Controls panel. Matched structurally, by the enclosing variable's name,
 *  because not every meta object uses `satisfies Meta<...>` (some use a type
 *  annotation instead), but every one of them is `const meta = {...}`. */
function isMetaObject(objectLiteral) {
  // `const meta = {...} satisfies Meta<typeof X>` wraps the object literal in
  // a SatisfiesExpression (or `as Meta<...>` an AsExpression) before it
  // reaches the VariableDeclaration, so climb through those first.
  let node = objectLiteral;
  while (node.parent && (ts.isSatisfiesExpression(node.parent) || ts.isAsExpression(node.parent) || ts.isParenthesizedExpression(node.parent))) {
    node = node.parent;
  }
  const decl = node.parent;
  return (
    decl &&
    ts.isVariableDeclaration(decl) &&
    ts.isIdentifier(decl.name) &&
    decl.name.text === 'meta' &&
    decl.initializer === node
  );
}

/** True if `node` CONTAINS the nested `docs -> source -> code` property chain
 *  anywhere beneath it.
 *
 *  One walk serves two structurally identical shapes: an inline
 *  `parameters: { docs: { source: { code: … } } }` inside a story object, and
 *  the object a local snippet helper RETURNS. Which of the two it is gets
 *  decided by WHERE the walk is rooted, not by the walk itself. */
function containsDocsSourceCodeChain(node) {
  let found = false;
  const isNamed = (n, name) =>
    (ts.isPropertyAssignment(n) || ts.isShorthandPropertyAssignment(n)) && propName(n) === name;
  const visit = (n) => {
    if (found) return;
    if (isNamed(n, 'code')) {
      const sourceObj = n.parent; // ObjectLiteralExpression
      const sourceProp = sourceObj?.parent; // PropertyAssignment 'source'
      if (sourceProp && isNamed(sourceProp, 'source')) {
        const docsObj = sourceProp.parent;
        const docsProp = docsObj?.parent;
        if (docsProp && isNamed(docsProp, 'docs')) {
          found = true;
          return;
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return found;
}

/** Names of FILE-LOCAL helpers that supply a snippet -- a function-valued
 *  declaration whose body contains the `docs -> source -> code` chain.
 *
 *  Detected by what it RETURNS, never by its name. The roster today is
 *  `const src = (code) => ({ parameters: { docs: { source: { code, language:
 *  'tsx' } } } })` in 112 files plus one `const sourceCode = (code) => …`; a
 *  rule keyed on the identifier `src` would silently pass any file that named
 *  its helper anything else, which is the same class of hand-typed restatement
 *  this whole script exists to catch. */
function findSnippetHelpers(sf) {
  // One walk, two readers: `snippetProducers` keeps the nodes (the composed
  // text rules (i) and (k) need), and this keeps only the names rule (a) asks
  // about. Two copies of the detection would be a list to keep in step.
  return new Set(snippetHelperTable(sf).keys());
}

/** The exported STORY objects in a file: an exported `const` whose initializer
 *  is an object literal, with its name and line.
 *
 *  An ABSENT type annotation is accepted (the self-test cases below are written
 *  in the short form, and `const meta` is not a named export at all), while a
 *  PRESENT one must start with `Story` -- so a `export const rows: Row[] = […]`
 *  or a future `export const fixture: SomeShape = {…}` is not mistaken for a
 *  story. All 606 stories in the tree carry `: Story` / `: StoryObj`, so the
 *  check is currently doing real work only in the negative direction. */
function findStories(sf) {
  const stories = [];
  const visit = (node) => {
    if (ts.isVariableStatement(node)) {
      const exported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      if (exported) {
        for (const decl of node.declarationList.declarations) {
          if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
          if (decl.type && !decl.type.getText(sf).startsWith('Story')) continue;
          let init = decl.initializer;
          while (
            ts.isSatisfiesExpression(init) ||
            ts.isAsExpression(init) ||
            ts.isParenthesizedExpression(init)
          ) {
            init = init.expression;
          }
          if (!ts.isObjectLiteralExpression(init)) continue;
          stories.push({
            name: decl.name.text,
            object: init,
            line: sf.getLineAndCharacterOfPosition(decl.getStart(sf)).line + 1,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return stories;
}

/** Local consts that HOLD a snippet rather than being one: `const S = src('…')`,
 *  i.e. the helper's RESULT. Such a const gets reached into -- one real site,
 *  `builder-build-wait.stories.tsx`, which reuses the snippet but overrides the
 *  story's `layout`:
 *
 *    const ALL_TEMPLATES_SRC = src(`…`);
 *    export const AllTemplates = { …, parameters: { layout: 'padded', docs: ALL_TEMPLATES_SRC.parameters.docs } };
 *
 *  That story is fully documented, so a rule blind to this shape would report it
 *  as missing a snippet -- a false positive, and this script's own header says
 *  why those are expensive: a guard that cries wolf gets waived into uselessness. */
function findSnippetValuedNames(sf, helpers) {
  const names = new Set();
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      let init = node.initializer;
      while (
        ts.isSatisfiesExpression(init) ||
        ts.isAsExpression(init) ||
        ts.isParenthesizedExpression(init)
      ) {
        init = init.expression;
      }
      if (ts.isCallExpression(init) && ts.isIdentifier(init.expression) && helpers.has(init.expression.text)) {
        names.add(node.name.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return names;
}

/** The leftmost identifier of a (possibly chained) property access --
 *  `S.parameters.docs` -> `S`. */
function rootIdentifier(node) {
  let cur = node;
  while (
    ts.isPropertyAccessExpression(cur) ||
    ts.isElementAccessExpression(cur) ||
    ts.isNonNullExpression(cur) ||
    ts.isParenthesizedExpression(cur)
  ) {
    cur = cur.expression;
  }
  return ts.isIdentifier(cur) ? cur.text : undefined;
}

/** The STORIES in this file with no snippet attributable to them.
 *
 *  A story is clean when the chain is inside its OWN object literal, or when it
 *  routes a snippet into its own object. The tree has THREE routes, and all of
 *  them are in real use -- the first cut of this rule understood only the first
 *  and reported 77 documented stories as undocumented:
 *
 *    `...src('<Widget />')`          the helper returns the WHOLE parameters
 *                                    object, so it is spread. 448 sites.
 *    `parameters: src('<kai-x />')`  the helper returns the `{ docs: { source } }`
 *                                    HALF, so it is assigned to `parameters`.
 *                                    63 sites -- the element-story form.
 *    `docs: S.parameters.docs`       `S` is a local const holding a helper's
 *                                    RESULT, reached into for its `docs`. 1 site.
 *
 *  What is NOT enough: routing some OTHER local helper
 *  (`...resolveAccentWrapperStyle('accent')`), which supplies args, not code. */
function findSnippetlessStories(sf, helpers = findSnippetHelpers(sf)) {
  const snippetNames = new Set([...helpers, ...findSnippetValuedNames(sf, helpers)]);
  const fromSnippetSource = (node) => {
    if (ts.isCallExpression(node)) return rootIdentifier(node.expression) && snippetNames.has(rootIdentifier(node.expression));
    const root = rootIdentifier(node);
    return root !== undefined && snippetNames.has(root);
  };
  const routesSnippet = (object) => {
    for (const prop of object.properties) {
      if (ts.isSpreadAssignment(prop)) {
        if (fromSnippetSource(prop.expression)) return true;
        continue;
      }
      if (!ts.isPropertyAssignment(prop)) continue;
      const name = propName(prop);
      // `parameters: src(…)` / `parameters: S`
      if (name === 'parameters' && fromSnippetSource(prop.initializer)) return true;
      // `docs: S.parameters.docs` -- a `docs` key fed by a snippet-valued const,
      // at the story's own level or one nested inside its `parameters`.
      if (
        name === 'docs' &&
        ts.isObjectLiteralExpression(object) &&
        fromSnippetSource(prop.initializer)
      ) {
        return true;
      }
    }
    return false;
  };
  const routesNestedDocs = (object) => {
    for (const prop of object.properties) {
      if (ts.isPropertyAssignment(prop) && propName(prop) === 'parameters') {
        const value = prop.initializer;
        if (ts.isObjectLiteralExpression(value)) {
          for (const inner of value.properties) {
            if (ts.isPropertyAssignment(inner) && propName(inner) === 'docs' && fromSnippetSource(inner.initializer)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  };
  return findStories(sf)
    .filter(
      (s) =>
        !containsDocsSourceCodeChain(s.object) &&
        !routesSnippet(s.object) &&
        !routesNestedDocs(s.object),
    )
    .map(({ name, line }) => ({ name, line }));
}

/** The two properties of one `argTypes` entry that the event rules assert:
 *  `category` is `table: { category: 'Events' }`, which is what sorts the key
 *  into the Events group instead of alongside the props, and `action` is the
 *  Actions panel readout that makes the event visible when it fires. They are
 *  read independently because rules (b) and (f) require only the category
 *  while (e) requires both, and a single boolean would have forced (e) to be
 *  satisfied by half an entry. */
function argTypesEntryShape(initializer) {
  const shape = { category: false, action: false };
  if (!initializer || !ts.isObjectLiteralExpression(initializer)) return shape;
  for (const prop of initializer.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const name = propName(prop);
    if (name === 'action') shape.action = true;
    if (name !== 'table' || !ts.isObjectLiteralExpression(prop.initializer)) continue;
    for (const inner of prop.initializer.properties) {
      if (
        ts.isPropertyAssignment(inner) &&
        propName(inner) === 'category' &&
        ts.isStringLiteral(inner.initializer) &&
        inner.initializer.text === 'Events'
      ) {
        shape.category = true;
      }
    }
  }
  return shape;
}

/** Every LITERAL `argTypes` property whose key matches /^on[A-Z]/, with
 *  whether it carries `table: { category: 'Events' }` verbatim. Spread
 *  entries (`...argTypesFor(...)`) carry no static key and are skipped. */
function findEventArgTypes(sf) {
  const findings = [];
  const visit = (node) => {
    if (ts.isPropertyAssignment(node) && propName(node) === 'argTypes' && ts.isObjectLiteralExpression(node.initializer)) {
      for (const prop of node.initializer.properties) {
        if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) continue; // skip spreads
        const name = propName(prop);
        if (!name || !/^on[A-Z]/.test(name)) continue;
        const initializer = ts.isPropertyAssignment(prop) ? prop.initializer : undefined;
        const line = sf.getLineAndCharacterOfPosition(prop.getStart(sf)).line + 1;
        if (!argTypesEntryShape(initializer).category) {
          findings.push({ key: name, line });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return findings;
}

/** The same set of keys as `findEventArgTypes`, keyed by NAME rather than
 *  listed, because rules (e) and (f) ask a per-name question (`is there an
 *  Events entry for onMenu?`) and never need the offending occurrences that
 *  (b) reports. `argTypesLine` is the line of the first `argTypes:` in the
 *  file: a prop with no entry at all has no line of its own, and the argTypes
 *  object is where the missing entry has to be written, so that is what a
 *  finding points at. Flags are OR-ed across occurrences -- one good entry
 *  declares the prop, and a bad copy of it is still (b)'s finding. */
function literalEventArgTypes(sf) {
  const entries = new Map();
  let argTypesLine;
  const visit = (node) => {
    if (ts.isPropertyAssignment(node) && propName(node) === 'argTypes') {
      if (argTypesLine === undefined) {
        argTypesLine = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
      }
      if (ts.isObjectLiteralExpression(node.initializer)) {
        for (const prop of node.initializer.properties) {
          if (!ts.isPropertyAssignment(prop)) continue; // skips spreads: no static key
          const name = propName(prop);
          if (!name || !/^on[A-Z]/.test(name)) continue;
          const shape = argTypesEntryShape(prop.initializer);
          const line = sf.getLineAndCharacterOfPosition(prop.getStart(sf)).line + 1;
          const prev = entries.get(name);
          entries.set(name, {
            line: prev ? prev.line : line,
            category: (prev?.category ?? false) || shape.category,
            action: (prev?.action ?? false) || shape.action,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { entries, argTypesLine };
}

/** The identifier the meta binds as Storybook's `component`, or undefined when
 *  the meta has no `component` key at all -- 64 of the 150 story files, the
 *  showcase pages and the `kai-*` element stories, which describe a DOM tag
 *  rather than a Solid component and have no props type to derive.
 *
 *  Matched through `isMetaObject` for the same reason `findMetaTitle` is: a
 *  `component:` in a fixture object is not the registration. */
function findMetaComponent(sf) {
  let found;
  const visit = (node) => {
    if (found) return;
    if (ts.isPropertyAssignment(node) && propName(node) === 'component' && isMetaObject(node.parent)) {
      const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
      const init = node.initializer;
      found = ts.isIdentifier(init)
        ? { name: init.text, line }
        : { notAnIdentifier: init.getText(sf), line };
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/** The import declaration in this file that binds `name`, whether it is
 *  relative (a module this guard can read) or not.
 *
 *  Matched by BINDING NAME, never by "the first relative import": every one of
 *  the 86 component stories imports from `storybook-solidjs-vite` first, so a
 *  first-match reader resolves the wrong module for all of them -- measured
 *  while writing this rule. `import * as ns` binds no single name and is
 *  skipped, so an `ns.Widget` component identifier reports UNVERIFIED rather
 *  than reading something wrong. */
function findBindingImport(sf, name) {
  let found;
  const binds = (clause) => {
    if (!clause) return false;
    if (clause.name && clause.name.text === name) return true;
    const named = clause.namedBindings;
    return Boolean(named && ts.isNamedImports(named) && named.elements.some((el) => el.name.text === name));
  };
  const visit = (node) => {
    if (found) return;
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && binds(node.importClause)) {
      const spec = node.moduleSpecifier.text;
      found = {
        spec,
        external: !spec.startsWith('.'),
        line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
      };
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/** The extensions a module in this package can have. */
const MODULE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

/** Resolve a relative specifier from a story file to the module that really
 *  holds it: `./agent-card` -> `agent-card.tsx`. Only the extensions a module
 *  in this package uses, plus the directory-index form. A specifier that
 *  resolves to nothing returns undefined so the caller reports UNVERIFIED --
 *  guessing a path is how a rule starts reading the wrong file and passing. */
function resolveModuleFile(fromPath, spec) {
  const base = resolve(dirname(fromPath), spec);
  const candidates = [base, ...MODULE_EXTENSIONS.map((e) => base + e), ...MODULE_EXTENSIONS.map((e) => join(base, 'index' + e))];
  for (const candidate of candidates) {
    if (existsSync(candidate) && readFileSync(candidate, 'utf8')) return candidate;
  }
  return undefined;
}

/** The props-type names a component's declaration in `modSf` points at.
 *
 *  Three shapes, all in the tree's vocabulary:
 *    `export function AgentCard(props: AgentCardProps)`   the only one in use, 86 of 86
 *    `const X = (props: XProps) => ...`                   arrow component
 *    `const X: Component<XProps> = ...`                   the web-component harness
 *
 *  The type NAME is always added, and the first TYPE ARGUMENT is added only for
 *  the harness: `props: CheckboxGroupProps<T>` is a GENERIC props type whose
 *  argument is the component's own type parameter, not a props type, and taking
 *  it (the obvious reading of "the type argument") sent checkbox-group, radio
 *  and select after a declaration named `T` and reported all three UNVERIFIED. */
function propsTypeNames(modSf, componentName) {
  const names = new Set();
  const addFromType = (type) => {
    if (!type || !ts.isTypeReferenceNode(type)) return;
    names.add(type.typeName.getText(modSf));
    const args = type.typeArguments;
    if (
      type.typeName.getText(modSf) === 'Component' &&
      args &&
      args.length > 0 &&
      ts.isTypeReferenceNode(args[0])
    ) {
      names.add(args[0].typeName.getText(modSf));
    }
  };
  const addFromDeclaration = (decl) => {
    let init = decl.initializer;
    while (init && (ts.isSatisfiesExpression(init) || ts.isAsExpression(init) || ts.isParenthesizedExpression(init))) {
      init = init.expression;
    }
    if (decl.type) addFromType(decl.type);
    if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) addFromType(init.parameters[0]?.type);
  };
  modSf.forEachChild(function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name && node.name.text === componentName) {
      addFromType(node.parameters[0]?.type);
    }
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === componentName) addFromDeclaration(decl);
      }
    }
    ts.forEachChild(node, visit);
  });
  return names;
}

/** The `on[A-Z]` members DECLARED in one of those props types, plus whether
 *  each of those type names has a declaration in this module.
 *
 *  OWN members only: `extends` is deliberately not followed. 40 of the 86
 *  props interfaces extend `JSX.HTMLAttributes<...>` (or an `Omit` of one, which
 *  exists precisely to REMOVE a single handler -- `FileTreeProps extends
 *  Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onSelect'>`, measured). Following
 *  the heritage clause would demand an argTypes entry for every inherited DOM
 *  handler on every component, which is the broad rule this derivation exists
 *  to replace. `extends` and `type X = A & {...}` are the same judgement. */
function declaredEventProps(modSf, typeNames) {
  const props = new Set();
  const declared = new Set();
  modSf.forEachChild(function visit(node) {
    const name = node.name?.text;
    if (name && typeNames.has(name)) {
      if (ts.isInterfaceDeclaration(node)) {
        declared.add(name);
        for (const member of node.members) {
          const prop = propName(member);
          if (prop && /^on[A-Z]/.test(prop)) props.add(prop);
        }
      }
      if (ts.isTypeAliasDeclaration(node)) {
        declared.add(name);
        const type = node.type;
        const literals = ts.isIntersectionTypeNode(type)
          ? type.types.filter((t) => ts.isTypeLiteralNode(t))
          : ts.isTypeLiteralNode(type)
            ? [type]
            : [];
        for (const literal of literals) {
          for (const member of literal.members) {
            const prop = propName(member);
            if (prop && /^on[A-Z]/.test(prop)) props.add(prop);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  });
  return { props, declared };
}

/** Component event props with no usable argTypes entry.
 *
 *  `readModule(spec)` returns the imported module's source text or undefined.
 *  Injected rather than read here so the self-test can drive the rule over
 *  fixtures that never touch the disk; the real run passes a closure over
 *  `resolveModuleFile`.
 *
 *  Every way this can fail to read the facts ends in `unverified`, never in a
 *  quiet pass: a component that is not a plain identifier, one whose import is
 *  not relative, a module that does not resolve, and a props type that is named
 *  but not declared in the module (which is what an `import type { XProps }`
 *  looks like -- resolving that hop is not implemented, so it is reported). */
function findComponentEventProps(sf, readModule) {
  const component = findMetaComponent(sf);
  if (!component) return { findings: [], unverified: [], required: 0, resolved: false };
  if (!component.name) {
    return {
      findings: [],
      required: 0,
      resolved: false,
      unverified: [{ line: component.line, what: `meta.component is not a plain identifier (${component.notAnIdentifier})` }],
    };
  }
  const unread = (what, line = component.line) => ({ findings: [], unverified: [{ line, what }], required: 0, resolved: false });
  const imported = findBindingImport(sf, component.name);
  if (!imported) return unread(`'${component.name}' is not imported in this file`);
  if (imported.external) {
    return unread(`'${component.name}' is imported from '${imported.spec}', not a relative module`, imported.line);
  }
  const text = readModule(imported.spec);
  if (!text) return unread(`'${imported.spec}' does not resolve to a file on disk`, imported.line);
  const modSf = parse(imported.spec, text);
  const typeNames = propsTypeNames(modSf, component.name);
  const { props, declared } = declaredEventProps(modSf, typeNames);
  if (typeNames.size === 0) return unread(`no props type on '${component.name}' in ${imported.spec}`);
  if (declared.size === 0) {
    return unread(
      `the props type '${[...typeNames].join(', ')}' is named but not declared in ${imported.spec}`,
      imported.line,
    );
  }
  const { entries, argTypesLine } = literalEventArgTypes(sf);
  const anchor = argTypesLine ?? component.line;
  const findings = [];
  for (const key of props) {
    const entry = entries.get(key);
    if (!entry) {
      findings.push({ key, line: anchor, reason: 'no argTypes entry' });
      continue;
    }
    if (!entry.category) {
      findings.push({ key, line: entry.line, reason: "entry has no table.category 'Events'" });
      continue;
    }
    if (!entry.action) findings.push({ key, line: entry.line, reason: 'entry has no action' });
  }
  return { findings, unverified: [], required: props.size, resolved: true };
}

/** `kai-attachments-change` -> `onAttachmentsChange`: the ONE mapping from a
 *  DOM event name to the Solid prop that listens for it.
 *
 *  The two strings are not the same and the transform is mechanical in one
 *  direction only: the `kai-` prefix is the kit's namespace, and what follows is
 *  a hyphenated lowercase name that camelCases into the prop. A name without
 *  that prefix is NOT mappable -- treating `menu` as `onMenu` would invent an
 *  argTypes entry nothing listens for -- so this returns undefined and the
 *  caller counts it as UNVERIFIED instead of guessing. (The meta's 136 events
 *  all carry the prefix today, so the count is 0; the branch is what makes a
 *  future `custom-event` name loud instead of silently unchecked.) */
function eventPropName(eventName) {
  if (!eventName.startsWith('kai-')) return undefined;
  const rest = eventName.slice('kai-'.length);
  if (!rest) return undefined;
  const [head, ...tail] = rest.split('-');
  if (!head) return undefined;
  const camel = [head, ...tail].map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  return 'on' + camel;
}

/** tag -> its event names, from the meta the element stories describe.
 *
 *  Derived from `web-component-meta.json` rather than listed: 136 events over
 *  65 of 97 elements, and a hand-typed copy of that would be wrong the first
 *  time an element gains an event. Returns undefined when the file is missing
 *  or holds nothing, and the caller treats that as this script being broken
 *  (a clean run off an empty meta is the exact false green this guard is for). */
function loadWebComponentEvents(pkgRoot) {
  const file = join(pkgRoot, 'src', 'web-components', 'web-component-meta.json');
  if (!existsSync(file)) return undefined;
  const elements = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(elements) || elements.length === 0) return undefined;
  const byTag = new Map();
  let eventCount = 0;
  for (const el of elements) {
    if (!el || typeof el.tag !== 'string' || !Array.isArray(el.events) || el.events.length === 0) continue;
    const names = el.events.map((e) => e?.name).filter((n) => typeof n === 'string');
    if (names.length === 0) continue;
    byTag.set(el.tag, names);
    eventCount += names.length;
  }
  return { byTag, elementCount: elements.length, eventCount };
}

/** Event props missing for every element this file resolves by a LITERAL tag
 *  passed to `argTypesFor(...)` or `specDescription(...)`.
 *
 *  Literal only, and that limitation is the rule: a spread of a call carries no
 *  static key, which is why (b) documents the same hole. Here it costs nothing,
 *  because the generator cannot cover these events in the first place --
 *  `argTypesFor` walks the meta's PROPS, and the only function-typed props in
 *  the whole meta are six non-event ones (`kai-chat.store`, `kai-slider.
 *  valueLabel`, `kai-voice-input.transcribe`, ...). So the events really are
 *  undeclared, and a literal entry is the only thing that can declare them.
 *
 *  A tag that appears twice in one file (prompt-input.stories.tsx passes
 *  'kai-prompt-input' to BOTH helpers) is resolved once, or every event would be
 *  reported twice.
 *
 *  An event name with no derivable prop is reported here AND in the run's own
 *  sweep of the meta, at the two granularities that matter: the file line says
 *  which story cannot be checked, the sweep says which element's event is
 *  unmappable even where no story resolves it. No such name exists in the meta
 *  today, so the two never both fire on one fact. */
function findElementEventProps(sf, eventsByTag) {
  const findings = [];
  const unverified = [];
  const tagLines = new Map();
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      (node.expression.text === 'argTypesFor' || node.expression.text === 'specDescription')
    ) {
      const arg = node.arguments[0];
      if (arg && ts.isStringLiteral(arg)) {
        const tag = arg.text;
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
        if (!tag.startsWith('kai-')) {
          unverified.push({ line, what: `${node.expression.text}('${tag}') is not a kai-* tag, so no element was resolved` });
        } else if (!tagLines.has(tag)) {
          tagLines.set(tag, line);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  const { entries } = literalEventArgTypes(sf);
  const required = [];
  for (const [tag, callLine] of tagLines) {
    const events = eventsByTag.get(tag);
    if (!events) {
      unverified.push({ line: callLine, what: `'${tag}' is not an element in web-component-meta.json` });
      continue;
    }
    for (const event of events) {
      const prop = eventPropName(event);
      if (!prop) {
        unverified.push({ line: callLine, what: `event '${event}' of '${tag}' does not start with 'kai-', so no prop name can be derived` });
        continue;
      }
      required.push({ tag, event, prop });
      const entry = entries.get(prop);
      if (!entry || !entry.category) {
        findings.push({ key: prop, tag, event, line: entry ? entry.line : callLine });
      }
    }
  }
  return { findings, unverified, required: required.length, tags: [...tagLines.keys()] };
}

/** The framework's docgen settings, or the reason they are absent.
 *
 *  Read structurally rather than as text, so a comment describing the options
 *  cannot satisfy the check. Cited at each site in the header: Storybook's
 *  control inference switches on the EXACT type name, the docgen plugin types an
 *  optional boolean as `boolean | undefined`, and the global `solid-js`
 *  directive-namespace augmentation leaks a `bool:inert` prop into every
 *  component's table unless the propFilter drops ':' names. */
function findDocgenOptionsIssue(mainSf) {
  const lineOf = (node) => mainSf.getLineAndCharacterOfPosition(node.getStart(mainSf)).line + 1;
  const childProp = (object, name) =>
    object.properties.find((p) => ts.isPropertyAssignment(p) && propName(p) === name);
  const dropsColonNames = (fn) => {
    let found = false;
    const visit = (node) => {
      if (found) return;
      if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken) {
        const operand = node.operand.getText(mainSf);
        if (/\.includes\(\s*(['"]):\1\s*\)/.test(operand) || /\/:\/\.test\(/.test(operand)) found = true;
      }
      ts.forEachChild(node, visit);
    };
    visit(fn);
    return found;
  };

  let framework;
  const visit = (node) => {
    if (framework) return;
    if (ts.isPropertyAssignment(node) && propName(node) === 'framework') {
      framework = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(mainSf);
  if (!framework) return { line: 1, what: 'no `framework` key at all' };
  const value = framework.initializer;
  if (ts.isStringLiteral(value)) {
    return { line: lineOf(framework), what: `framework is the bare string ${value.getText(mainSf)}` };
  }
  if (!ts.isObjectLiteralExpression(value)) {
    return { line: lineOf(framework), what: 'framework is neither the object form nor a string' };
  }
  const options = childProp(value, 'options');
  if (!options || !ts.isObjectLiteralExpression(options.initializer)) {
    return { line: lineOf(framework), what: 'framework has no `options` object' };
  }
  const docgen = childProp(options.initializer, 'docgen');
  if (!docgen || !ts.isObjectLiteralExpression(docgen.initializer)) {
    return { line: lineOf(options), what: 'framework.options has no `docgen` object' };
  }
  const shouldRemove = childProp(docgen.initializer, 'shouldRemoveUndefinedFromOptional');
  if (!shouldRemove || shouldRemove.initializer.kind !== ts.SyntaxKind.TrueKeyword) {
    return { line: lineOf(docgen), what: 'docgen.shouldRemoveUndefinedFromOptional is not `true`' };
  }
  const propFilter = childProp(docgen.initializer, 'propFilter');
  if (!propFilter || !(ts.isArrowFunction(propFilter.initializer) || ts.isFunctionExpression(propFilter.initializer))) {
    return { line: lineOf(docgen), what: 'docgen.propFilter is missing' };
  }
  if (!dropsColonNames(propFilter.initializer)) {
    return { line: lineOf(propFilter), what: `docgen.propFilter does not drop prop names containing ':'` };
  }
  return undefined;
}

/** The meta object's `title` string literal, or undefined.
 *
 *  Reuses `isMetaObject` rather than grabbing the first `title:` in the file,
 *  because that is a trap this repo has already sprung: a mock-data fixture
 *  carries `title: 'Q3 forecast'` BEFORE the real registration, so a naive
 *  first-match reads the fixture (see `tests/stories/e2e-story-fixtures.test.ts`,
 *  whose own header records the same bug in its first draft). */
function findMetaTitle(sf) {
  let found;
  const visit = (node) => {
    if (found) return;
    if (
      ts.isPropertyAssignment(node) &&
      propName(node) === 'title' &&
      isMetaObject(node.parent) &&
      ts.isStringLiteral(node.initializer)
    ) {
      found = {
        value: node.initializer.text,
        line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
      };
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/** The two tiers the `src/ui/` -> `src/components/` merge removed. */
const RETIRED_TIERS = ['Elements', 'Primitives'];

/** True when a leading `Components` is followed immediately by a retired tier
 *  -- `Components/Elements/X`, `Components/Primitives/X`, or the two-segment
 *  `Components/Elements` itself.
 *
 *  Scoped to that exact shape deliberately. `Elements` and `Primitives` are
 *  ordinary words: `Labs/Elements/Thing` never existed as a tier and a
 *  component genuinely called `Elements` would be a standalone node, not a
 *  path segment under `Components`. Matching the word anywhere in a title
 *  would flag titles this rule has nothing to say about. */
function retiredTier(title) {
  const segments = title.split('/');
  return segments[0] === 'Components' && RETIRED_TIERS.includes(segments[1]);
}

/** A title segment that folds a word into itself, e.g. `CardSurface Surface`.
 *
 *  The comparison is word-to-EARLIER-word within ONE segment, and the later
 *  word must be no longer than the earlier one. Both scopes are load-bearing:
 *
 *  - Across words, so ordinary multi-word segments are untouched. `Card
 *    Surface`, `Narrow Panel`, `Pane Grid`, `Settings Group` and
 *    `In-app assistant` are all legitimate names whose first word is neither
 *    a suffix of nor identical to their last; `CardSurface Surface` is the
 *    shape where the later word is already contained in the earlier one.
 *  - Not longer than, so the fold (`FooBar Bar`) and the stutter (`Foo Foo`)
 *    are both caught, while the reverse order (`Card CardSurface`, a name then
 *    its qualifier) is not. A title segment is read by humans only, and no
 *    legitimate Storybook title repeats a word: both orders are free detection
 *    with no case to defend against.
 *
 *  What this does NOT claim to be is a general "does this title contain a
 *  rename artifact" check. It catches the one mechanical signature a blanket
 *  find-and-replace leaves behind in a string, which is the defect that
 *  actually shipped (`Components/CardSurface Surface`). */
function doubledToken(title) {
  for (const segment of title.split('/')) {
    const words = segment.split(' ').filter(Boolean);
    if (words.length < 2) continue;
    for (let i = 1; i < words.length; i++) {
      for (let j = 0; j < i; j++) {
        const earlier = words[j].toLowerCase();
        const later = words[i].toLowerCase();
        if (earlier.length >= later.length && earlier.endsWith(later)) {
          return { segment, word: words[i], earlier: words[j] };
        }
      }
    }
  }
  return undefined;
}

/** `node` is a property whose name is `name` -- `parameters:`, `docs:`,
 *  `source:`, `code:`. Three of the readers below walk that same chain (from a
 *  story object, from a helper's return value, from an inline `code:`), so the
 *  test lives in one place. */
const isNamedProp = (node, name) =>
  Boolean(node) &&
  (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) &&
  propName(node) === name;

/** The 1-based line of a node's first character. */
const lineAt = (sf, node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

// ---------------------------------------------------------------------------
// (h) the meta's autodocs tag
// ---------------------------------------------------------------------------

/** The meta object's `tags` array, or why it could not be read.
 *
 *  Read as the AST property of the object `isMetaObject` identifies, never as
 *  the text `tags:`. Two files already carry a `tags:` that is not this one:
 *  `form.stories.tsx` declares a prop NAMED `tags` in its argTypes, and the
 *  first measurement of this rule -- a grep for `component:` -- counted three
 *  `docs: { description: { component: '<prose>' } }` fields as component
 *  registrations and reported four offenders where the AST finds one. */
function findMetaTags(sf) {
  let found;
  const visit = (node) => {
    if (found) return;
    if (isNamedProp(node, 'tags') && isMetaObject(node.parent)) {
      const line = lineAt(sf, node);
      const init = ts.isPropertyAssignment(node) ? node.initializer : undefined;
      if (!init || !ts.isArrayLiteralExpression(init)) {
        found = { line, values: [], spread: true, readable: false, text: init ? init.getText(sf) : 'code' };
        return;
      }
      const values = [];
      let spread = false;
      for (const el of init.elements) {
        if (ts.isStringLiteral(el)) values.push(el.text);
        // A spread, or an entry this reader does not evaluate: the element set
        // is then not statically known, which is UNVERIFIED and not a pass.
        else spread = true;
      }
      found = { line, values, spread, readable: true, text: init.getText(sf) };
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/** The autodocs defect: a meta that registers a `component` and carries no
 *  'autodocs' tag.
 *
 *  A story with no `component:` is deliberately out of scope -- a gallery page
 *  has no props table for a Docs tab to hold -- so the rule keys on the
 *  DECLARATION and not on the file's directory. Without the tag Storybook
 *  renders no Docs tab at all, which makes the hand-authored
 *  `docs.description` and docgen's props table unreachable. */
function findAutodocsTagIssue(sf) {
  const component = findMetaComponent(sf);
  if (!component) return { findings: [], unverified: [], declaresComponent: false };
  const tags = findMetaTags(sf);
  const base = { unverified: [], declaresComponent: true };
  if (!tags) {
    return { ...base, findings: [{ line: component.line, reason: 'the meta has no `tags` key' }] };
  }
  if (!tags.readable) {
    return {
      ...base,
      findings: [],
      unverified: [{ line: tags.line, what: `the meta's \`tags\` is \`${tags.text}\`, not an array literal, so its entries cannot be read` }],
    };
  }
  if (tags.values.includes('autodocs')) return { ...base, findings: [] };
  if (tags.spread) {
    return {
      ...base,
      findings: [],
      unverified: [{
        line: tags.line,
        what: `the meta's \`tags\` (${tags.text}) carries an entry this reader does not evaluate, and its literal entries do not include 'autodocs'`,
      }],
    };
  }
  return {
    ...base,
    findings: [{ line: tags.line, reason: `tags ${tags.text} does not contain 'autodocs'` }],
  };
}

// ---------------------------------------------------------------------------
// (i) and (k): the snippet as the reader copies it
// ---------------------------------------------------------------------------

/** The `docs -> source -> code` property inside a snippet-producing function,
 *  or undefined when the function has none. */
function snippetCodeProperty(fn) {
  let found;
  const visit = (node) => {
    if (found) return;
    if (
      isNamedProp(node, 'code') &&
      isNamedProp(node.parent?.parent, 'source') &&
      isNamedProp(node.parent?.parent?.parent?.parent, 'docs')
    ) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(fn);
  return found;
}

/** The expression a function RETURNS: an arrow body with no braces, or the
 *  first `return` in a block body. A snippet producer that composes its text
 *  itself --
 *
 *    const sourceCode = (code: string) => `${IMPORT}\n\n${code}`;
 *
 *  -- has no `code` property to read, and `audio-visualizer.stories.tsx`
 *  writes ten snippets through exactly that shape, INSIDE the `code:` property
 *  (`source: { code: sourceCode(`...`), language: 'tsx' }`). */
function returnedExpression(fn) {
  if (fn.body && !ts.isBlock(fn.body)) return fn.body;
  let found;
  const visit = (node) => {
    if (found) return;
    if (ts.isReturnStatement(node) && node.expression) {
      found = node.expression;
      return;
    }
    ts.forEachChild(node, visit);
  };
  if (fn.body) visit(fn.body);
  return found;
}

/** Every locally declared function that PRODUCES a snippet's text, by name, in
 *  the two shapes this tree writes. Both are found by what they RETURN and
 *  never by their name -- a rule keyed on `src` would silently pass any file
 *  that named its helper something else, which is the class of hand-typed
 *  restatement this whole script exists to catch.
 *
 *  `helpers` return an object carrying `docs -> source -> code`, so a call is
 *  spliced into the `code` template (83 of the 112 helpers in the tree prepend
 *  an `import ...` line that way; reading only the argument would find no
 *  import line anywhere and report every story behind one of them).
 *
 *  `builders` return the snippet TEXT itself, and are called INSIDE a `code:`
 *  property. They are kept apart from `helpers` because `findSnippetHelpers`
 *  -- rule (a)'s roster -- means the first shape only, and widening it would
 *  change what "this story has a snippet" means. */
function snippetProducers(sf) {
  const helpers = new Map();
  const builders = new Map();
  const record = (name, fn) => {
    if (containsDocsSourceCodeChain(fn)) {
      const code = snippetCodeProperty(fn);
      helpers.set(
        name,
        ts.isShorthandPropertyAssignment(code)
          ? { fn, fromParameter: propName(code) }
          : { fn, template: code ? code.initializer : undefined },
      );
      return;
    }
    let returned = returnedExpression(fn);
    while (
      returned &&
      (ts.isSatisfiesExpression(returned) || ts.isAsExpression(returned) || ts.isParenthesizedExpression(returned))
    ) {
      returned = returned.expression;
    }
    if (
      returned &&
      (ts.isStringLiteral(returned) || ts.isNoSubstitutionTemplateLiteral(returned) || ts.isTemplateExpression(returned))
    ) {
      builders.set(name, { fn, template: returned });
    }
  };
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      record(node.name.text, node.initializer);
    } else if (ts.isFunctionDeclaration(node) && node.name && node.body) {
      record(node.name.text, node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { helpers, builders };
}

/** The snippet helpers in this file, by name: the `docs -> source -> code`
 *  producers, which is what rule (a) means by "this story has a snippet". */
function snippetHelperTable(sf) {
  return snippetProducers(sf).helpers;
}

/** The text a snippet-shaped expression holds, and whether every piece of it
 *  could be read: a string literal, a template literal composing its
 *  SUBSTITUTIONS (a `${...}` is filled in with the story file's own value, so
 *  the reader sees the substituted text and not the expression -- and an
 *  interpolated `IMPORT` const is an import line the snippet really carries),
 *  and one hop through an identifier to the const that holds it (the tree
 *  writes 9 call sites as `const usage = \`...\`; ... src(usage)`).
 *
 *  A substitution this reader cannot resolve is DROPPED and the text stays
 *  readable, because such a hole is a value the story file interpolates at
 *  build time (`builder-build-wait.stories.tsx` writes one from a story
 *  factory's parameter, and the reader sees the substituted id), not missing
 *  code: the literal text around it -- which is where a statement, and an
 *  import line, would be -- is read in full. A NODE that resolves to no text at
 *  all is the other case, and it leaves `text: undefined` so the caller reports
 *  the snippet as UNVERIFIED rather than checking nothing quietly. */
function snippetText(node, sf) {
  const unreadable = { text: undefined, complete: false };
  if (!node) return unreadable;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return { text: node.text, complete: true };
  }
  if (ts.isTemplateExpression(node)) {
    let text = node.head.text;
    for (const span of node.templateSpans) {
      const piece = snippetText(span.expression, sf);
      if (piece.text !== undefined) text += piece.text;
      text += span.literal.text;
    }
    return { text, complete: true };
  }
  if (ts.isIdentifier(node)) {
    let declared;
    const visit = (n) => {
      if (declared) return;
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === node.text) declared = n;
      ts.forEachChild(n, visit);
    };
    visit(sf);
    return declared ? snippetText(declared.initializer, sf) : unreadable;
  }
  return unreadable;
}

/** The text a locally declared producer emits for one call, with the call's
 *  arguments spliced in, plus whether every piece could be read.
 *
 *  A piece that is one of the producer's own parameters takes the call's
 *  argument -- or the DEFAULT on the parameter, which is how
 *  `prompt-input-variants.stories.tsx` writes `imports: string = IMPORT`. Any
 *  other identifier resolves through `snippetText`. */
function composeCallText(sf, entry, call) {
  const params = entry.fn.parameters;
  const paramIndex = (name) => params.findIndex((p) => ts.isIdentifier(p.name) && p.name.text === name);
  const fromParameter = (i) =>
    call.arguments[i] ? snippetText(call.arguments[i], sf) : snippetText(params[i]?.initializer, sf);
  if (entry.fromParameter) {
    // `source: { code }` -- the parameter itself, 29 helpers in the tree.
    const i = paramIndex(entry.fromParameter);
    return i < 0 ? { text: undefined, complete: false } : fromParameter(i);
  }
  let init = entry.template;
  while (init && (ts.isSatisfiesExpression(init) || ts.isAsExpression(init) || ts.isParenthesizedExpression(init))) {
    init = init.expression;
  }
  if (!init) return { text: undefined, complete: false };
  if (ts.isNoSubstitutionTemplateLiteral(init) || ts.isStringLiteral(init)) {
    return { text: init.text, complete: true };
  }
  if (!ts.isTemplateExpression(init)) return snippetText(init, sf);
  let text = init.head.text;
  let complete = true;
  for (const span of init.templateSpans) {
    const param = ts.isIdentifier(span.expression) ? paramIndex(span.expression.text) : -1;
    // A parameter takes the call's argument, or the DEFAULT on the parameter,
    // which is how `prompt-input-variants.stories.tsx` writes
    // `imports: string = IMPORT`. Any other expression resolves through
    // `snippetText`, and one that resolves to NO text at all -- a call, a
    // computed value -- leaves the composition incomplete.
    const piece = param >= 0 ? fromParameter(param) : snippetText(span.expression, sf);
    if (piece.text === undefined) complete = false;
    else text += piece.text;
    text += span.literal.text;
  }
  return { text, complete };
}

/** Every docs-source snippet in the file, AS THE READER COPIES IT.
 *
 *  Two shapes, both attributed to the node that carries the text so the
 *  finding points at a line a human can open:
 *
 *    `...src('...')`            the first argument of a call to one of the
 *                              file's own `docs -> source -> code` helpers,
 *                              composed through the helper;
 *    `code: '...'` inline       a `parameters: { docs: { source: { code } } }`
 *                              value, composed through its own substitutions
 *                              -- `code: \`${IMPORT}\n\n...\`` is how
 *                              `pane-grid.stories.tsx` writes an inline
 *                              snippet that DOES carry an import line -- and
 *                              through a local string builder when the value
 *                              is `sourceCode(...)`.
 *
 *  Both exclusions below are load-bearing: a helper's OWN `code` template is a
 *  `code` chain too, and reading it as an inline snippet reports the helper at
 *  its own definition line with its parameter still in it; and
 *  `code: src('...')` reaches here as a call whose argument the call walk
 *  already collected, so it is read once and not twice. */
function findSnippetTexts(sf, producers = snippetProducers(sf)) {
  const { helpers, builders } = producers;
  const out = [];
  const seen = new Set();
  const producerFns = new Set([...helpers.values(), ...builders.values()].map((p) => p.fn));
  const insideProducer = (node) => {
    for (let n = node.parent; n; n = n.parent) if (producerFns.has(n)) return true;
    return false;
  };
  const builderCall = (node) =>
    ts.isCallExpression(node) && ts.isIdentifier(node.expression) ? builders.get(node.expression.text) : undefined;
  const push = (node, piece) => {
    const key = `${node.getStart(sf)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ code: piece.text, complete: piece.complete, line: lineAt(sf, node), raw: node.getText(sf) });
  };
  const visitCall = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && helpers.has(node.expression.text)) {
      const arg = node.arguments[0];
      if (arg) {
        const composed = composeCallText(sf, helpers.get(node.expression.text), node);
        push(arg, composed.text === undefined ? snippetText(arg, sf) : composed);
      }
    }
    ts.forEachChild(node, visitCall);
  };
  visitCall(sf);
  const visitInline = (node) => {
    if (
      isNamedProp(node, 'code') &&
      !insideProducer(node) &&
      isNamedProp(node.parent?.parent, 'source') &&
      isNamedProp(node.parent?.parent?.parent?.parent, 'docs')
    ) {
      const init = ts.isPropertyAssignment(node) ? node.initializer : undefined;
      const builder = init ? builderCall(init) : undefined;
      const helperCall =
        init && ts.isCallExpression(init) && ts.isIdentifier(init.expression) && helpers.has(init.expression.text);
      if (helperCall) {
        // `code: src('...')` -- the call walk above already collected this
        // call's ARGUMENT, which is the snippet.
      } else if (builder) {
        // `code: sourceCode('...')` -- the builder composes the text.
        push(init, composeCallText(sf, builder, init));
      } else if (init) {
        push(init, snippetText(init, sf));
      }
    }
    ts.forEachChild(node, visitInline);
  };
  visitInline(sf);
  return out;
}

/** Every name this story file DECLARES at its top level, split by whether it
 *  can hold a value.
 *
 *  `values` are what a JSX tag or a bare identifier in a snippet can resolve
 *  to. `types` are the `interface`/`type` names, kept apart because a TYPE is
 *  not a value: a snippet that mentions one in a type position
 *  (`const rows: Row[] = [...]`) is describing its own shape, not reaching for
 *  something the reader lacks, so only a type name used where a VALUE is
 *  required is ever reported (see `snippetValueReferences`).
 *
 *  `imports` is kept because a name the file imports is a name the snippet can
 *  get: its own import line is how the reader arrives at it. */
function fileLocalNames(sf) {
  const values = new Set();
  const types = new Set();
  const imports = new Set();
  const addBinding = (name, into) => {
    if (ts.isIdentifier(name)) into.add(name.text);
    else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
      for (const el of name.elements) if (ts.isBindingElement(el)) addBinding(el.name, into);
    }
  };
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st)) {
      const clause = st.importClause;
      if (!clause) continue;
      if (clause.name) imports.add(clause.name.text);
      const bindings = clause.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) for (const el of bindings.elements) imports.add(el.name.text);
      if (bindings && ts.isNamespaceImport(bindings)) imports.add(bindings.name.text);
      continue;
    }
    if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.name) values.add(st.name.text);
    else if (ts.isEnumDeclaration(st)) values.add(st.name.text);
    else if (ts.isVariableStatement(st)) {
      for (const decl of st.declarationList.declarations) addBinding(decl.name, values);
    } else if (ts.isTypeAliasDeclaration(st) || ts.isInterfaceDeclaration(st)) types.add(st.name.text);
  }
  return { values, types, imports };
}

/** The names a snippet DECLARES for itself -- its own imports, its own consts,
 *  its own parameters. A snippet that carries `const PanelBody = ...` next to
 *  `<PanelBody />` is copy-paste-ready, so it must not be reported for the name
 *  it brought with it. */
function snippetDeclaredNames(sf) {
  const names = new Set();
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) names.add(node.name.text);
    else if (ts.isBindingElement(node) && ts.isIdentifier(node.name)) names.add(node.name.text);
    else if (
      (ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node)) &&
      node.name &&
      ts.isIdentifier(node.name)
    ) {
      names.add(node.name.text);
    } else if (ts.isParameter(node) && ts.isIdentifier(node.name)) names.add(node.name.text);
    else if (ts.isImportClause(node) && node.name) names.add(node.name.text);
    else if (ts.isNamedImports(node)) for (const el of node.elements) names.add(el.name.text);
    else if (ts.isNamespaceImport(node) && node.name) names.add(node.name.text);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return names;
}

/** The identifiers a snippet uses where a VALUE is required: a JSX tag
 *  (`<PanelBody />`) or a plain expression (`options={MODELS}`, `{longText}`),
 *  along with the names the snippet declares for itself.
 *
 *  PARSED, not regex-matched, and that is the difference between this rule and
 *  a text scan over the same snippets: a text scan cannot tell
 *  `<Artifact src={url} />`'s ATTRIBUTE NAME from the expression `src={src}`,
 *  nor `<Button>Ghost</Button>`'s rendered word from the story export it
 *  collides with, nor prose in a `//` comment from code. Every one of those is
 *  a false positive over a real file in this tree, and this script's own header
 *  says why those are expensive.
 *
 *  `<!-- ... -->` is stripped before the parse: TypeScript only accepts the
 *  HTML comment opener at the start of a LINE, so a snippet whose first line is
 *  one (`voice-output.stories.tsx`) otherwise lexes as a less-than against a
 *  `--` prefix and leaves its prose behind as bare identifiers. */
function snippetValueReferences(code) {
  const sf = parse('snippet.tsx', code.replace(/<!--[\s\S]*?-->/g, ''));
  const declared = snippetDeclaredNames(sf);
  const imports = new Set();
  const hits = [];
  const isTypePosition = (node) => {
    for (let n = node.parent; n; n = n.parent) if (ts.isTypeNode(n)) return true;
    return false;
  };
  const isMemberName = (node) => {
    const p = node.parent;
    if (!p) return false;
    if (ts.isPropertyAccessExpression(p) || ts.isQualifiedName(p)) return p.name === node;
    if (
      ts.isPropertyAssignment(p) ||
      ts.isPropertySignature(p) ||
      ts.isMethodDeclaration(p) ||
      ts.isMethodSignature(p) ||
      ts.isPropertyDeclaration(p) ||
      ts.isEnumMember(p)
    ) {
      return p.name === node;
    }
    return ts.isJsxAttribute(p) && p.name === node;
  };
  const isBindingName = (node) => {
    const p = node.parent;
    if (!p) return false;
    if (ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isBindingElement(p)) return p.name === node;
    if (
      (ts.isFunctionDeclaration(p) ||
        ts.isClassDeclaration(p) ||
        ts.isInterfaceDeclaration(p) ||
        ts.isTypeAliasDeclaration(p) ||
        ts.isEnumDeclaration(p)) &&
      p.name === node
    ) {
      return true;
    }
    return (
      ts.isImportClause(p) || ts.isNamespaceImport(p) || ts.isImportSpecifier(p) || ts.isExportSpecifier(p)
    );
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      if (clause) {
        if (clause.name) imports.add(clause.name.text);
        const bindings = clause.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) for (const el of bindings.elements) imports.add(el.name.text);
        if (bindings && ts.isNamespaceImport(bindings)) imports.add(bindings.name.text);
      }
    }
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node) || ts.isJsxClosingElement(node)) {
      // A namespaced tag (`ns.X`) names no single local binding, so it has
      // nothing to resolve.
      if (ts.isIdentifier(node.tagName)) hits.push({ name: node.tagName.text, how: 'JSX tag' });
    } else if (ts.isIdentifier(node) && !isBindingName(node) && !isMemberName(node) && !isTypePosition(node)) {
      hits.push({ name: node.text, how: 'bare identifier' });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { hits, declared, imports };
}

/** One snippet's text for the UNVERIFIED line, on a single line. */
const oneLine = (text, max = 48) => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}...` : flat;
};

/** Snippets that reference a name the STORY FILE declares for itself.
 *
 *  Only names the file declares are looked up, which is what puts JavaScript
 *  and DOM globals out of scope: nothing here can flag `document`, `Math` or
 *  `fetch`, because none of them is in the set this rule reads. */
function findSnippetLocalNames(sf, producers = snippetProducers(sf)) {
  const { values, types, imports } = fileLocalNames(sf);
  const local = new Set([...values, ...types]);
  const findings = [];
  const unverified = [];
  let scanned = 0;
  for (const snippet of findSnippetTexts(sf, producers)) {
    if (snippet.code === undefined) {
      unverified.push({
        line: snippet.line,
        what: `the snippet text ${oneLine(snippet.raw)} is not something this reader can resolve, so no name in it could be checked`,
      });
      continue;
    }
    if (!snippet.complete) {
      unverified.push({
        line: snippet.line,
        what: `the snippet's own text could not be composed in full (${oneLine(snippet.raw)}), so a name in the missing part could not be checked and its import line may be incomplete`,
      });
    }
    scanned++;
    const { hits, declared } = snippetValueReferences(snippet.code);
    const seen = new Set();
    for (const hit of hits) {
      if (seen.has(hit.name)) continue;
      seen.add(hit.name);
      if (declared.has(hit.name)) continue; // the snippet brings its own copy
      if (imports.has(hit.name)) continue; // the file imports it; the snippet's line is (k)'s question
      if (!local.has(hit.name)) continue;
      findings.push({ name: hit.name, how: hit.how, line: snippet.line });
    }
  }
  return { findings, unverified, scanned };
}

/** The package's own entry points, parsed for the export names (k) requires a
 *  snippet to import. Listed rather than globbed from `package.json`, because
 *  these two ARE the public surface: `.` and `./solid`, with `./solid` a strict
 *  superset (see `src/solid.ts`'s header). */
const KIT_ENTRY_FILES = ['src/index.ts', 'src/solid.ts'];

/** Every public export name the entry points declare.
 *
 *  DERIVED, never hand-typed: 702 names today, and a written-out copy would be
 *  wrong the first time a component lands. `export * from './x'` is followed
 *  only to another entry file this loader already reads, because the names
 *  behind any other star are not in this set -- see `starUnfollowed`. */
function loadKitExports(pkgRoot) {
  const names = new Set();
  const starUnfollowed = [];
  let files = 0;
  let statements = 0;
  let starCovered = 0;
  const entryPaths = KIT_ENTRY_FILES.map((rel) => resolve(pkgRoot, rel));
  for (const rel of KIT_ENTRY_FILES) {
    const file = join(pkgRoot, rel);
    if (!existsSync(file)) continue;
    files++;
    const sf = parse(rel, readFileSync(file, 'utf8'));
    for (const st of sf.statements) {
      if (ts.isExportDeclaration(st)) {
        if (!st.exportClause) {
          const spec = st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier) ? st.moduleSpecifier.text : undefined;
          const target = spec ? resolveModuleFile(file, spec) : undefined;
          if (target && entryPaths.includes(target)) starCovered++;
          else starUnfollowed.push(`${rel}  export * from ${spec ?? '<no specifier>'}`);
          continue;
        }
        statements++;
        if (ts.isNamedExports(st.exportClause)) for (const el of st.exportClause.elements) names.add(el.name.text);
        continue;
      }
      const exported = st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      if (!exported) continue;
      statements++;
      if (st.name && ts.isIdentifier(st.name)) names.add(st.name.text);
      else if (ts.isVariableStatement(st)) {
        for (const decl of st.declarationList.declarations) if (ts.isIdentifier(decl.name)) names.add(decl.name.text);
      }
    }
  }
  return { names, files, statements, starCovered, starUnfollowed };
}

/** Snippets that use a kit export their own import line does not import -- the
 *  mirror of `findSnippetLocalNames`, and the same broken example from the
 *  reader's side: `buttonVariants(...)` with no import looks plausible and does
 *  not compile.
 *
 *  A snippet that DECLARES the name for itself is clean here too (it brought
 *  it), and so is a name the snippet's import brings: both are in
 *  `snippetValueReferences`'s `declared`/`imports`. */
function findSnippetUnimportedExports(sf, kitExports, producers = snippetProducers(sf)) {
  const findings = [];
  let scanned = 0;
  for (const snippet of findSnippetTexts(sf, producers)) {
    if (snippet.code === undefined) continue; // (i) reports the unreadable snippet
    // A text with a hole in it may be missing its import line, so demanding an
    // import off it would be a guess: (i) already reports it as UNVERIFIED.
    if (!snippet.complete) continue;
    scanned++;
    const { hits, declared, imports } = snippetValueReferences(snippet.code);
    const seen = new Set();
    for (const hit of hits) {
      if (seen.has(hit.name)) continue;
      seen.add(hit.name);
      if (!kitExports.has(hit.name)) continue; // `div`, `document`, another package's component
      if (declared.has(hit.name) || imports.has(hit.name)) continue;
      findings.push({ name: hit.name, how: hit.how, line: snippet.line });
    }
  }
  return { findings, scanned };
}

// ---------------------------------------------------------------------------
// (j) hand-rolled arrow glyphs
// ---------------------------------------------------------------------------

/** The glyph characters a story must not hand-roll as a UI affordance. */
const GLYPH_CHARS = ['▾', '▴', '⌄', '▼', '▲'];

/** A line waiver for a story that deliberately SHOWS one of those characters --
 *  prose about what a user types, or a glyph that is the subject rather than an
 *  affordance.
 *
 *  Same shape as `lint-cdn-pins: historical` and `lint-silent-drops: drops ...`,
 *  and a parsed directive for the same reason: the character sits in authored
 *  text that already reads as deliberate, so a rule honouring prose would pass
 *  the defect unchanged. Covers only the line it sits on, or the line above,
 *  which is where a JSX comment inside an element has to go. */
const GLYPH_WAIVER = /lint-story-conventions:\s*glyph\s*--\s*(.{15,})/;

/** Glyphs inside RENDERED text: string literals, template literals and JSX
 *  text. Comments are not rendered and are not scanned, so a comment about the
 *  character is not a finding; a string that prints it is. */
function findGlyphAffordances(sf, text) {
  const lines = text.split('\n');
  const findings = [];
  let textRegions = 0;
  const waived = (line) => GLYPH_WAIVER.test(lines[line - 1] ?? '') || GLYPH_WAIVER.test(lines[line - 2] ?? '');
  const record = (raw, startLine) => {
    textRegions++;
    for (const char of GLYPH_CHARS) {
      for (let at = raw.indexOf(char); at !== -1; at = raw.indexOf(char, at + 1)) {
        const line = startLine + (raw.slice(0, at).match(/\n/g)?.length ?? 0);
        if (!waived(line)) findings.push({ char, line });
      }
    }
  };
  const visit = (node) => {
    if (ts.isJsxText(node)) {
      record(sf.text.slice(node.getStart(sf), node.getEnd(sf)), lineAt(sf, node));
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      // A module specifier is not rendered text, and it is where most of a
      // story file's string literals live: counting them would make the run's
      // own "text regions scanned" figure meaningless.
      const isModuleSpecifier =
        ts.isImportDeclaration(node.parent) || ts.isExportDeclaration(node.parent) || ts.isModuleDeclaration(node.parent);
      if (!isModuleSpecifier) record(sf.text.slice(node.getStart(sf) + 1, node.getEnd(sf) - 1), lineAt(sf, node));
    } else if (ts.isTemplateExpression(node)) {
      record(sf.text.slice(node.getStart(sf) + 1, node.head.getEnd()), lineAt(sf, node));
      for (const span of node.templateSpans) {
        record(sf.text.slice(span.literal.getStart(sf) + 1, span.literal.getEnd() - 1), lineAt(sf, span.literal));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { findings, textRegions };
}

// ---------------------------------------------------------------------------
// (l) a rendered component description that describes the DOCUMENTATION
// ---------------------------------------------------------------------------

/** The words that make a description talk about the DOCUMENTATION around the
 *  component instead of the component: Storybook's own name, the story the
 *  reader is in, the Labs tier, the page or demo around it. The description is
 *  rendered ABOVE the props table and copied into `llms-full.txt`, so a reader
 *  meeting `the story` there learns about Storybook and not about the component.
 *
 *  `story` AND `Labs` ARE BARE WORDS, and that is the point: a rendered
 *  description of a component has no legitimate use for either. An enumeration
 *  of phrases is always incomplete -- it missed `its own story`, which is what
 *  `audio-visualizer.stories.tsx` shipped -- while the bare word cannot be.
 *
 *  `sidebar` is deliberately NOT here, and do not "complete" this list with
 *  that word: the kit renders a real sidebar (the conversation list), so `a
 *  sidebar conversation list` is component behaviour, not docs talk. */
const DOCS_TALK = /\b(Storybook|story|Labs|this page|this demo|the demo|docs page)\b/i;

/** The most paragraphs a description may carry. Past three it has stopped being
 *  a description of the component and become an article: the detail belongs in
 *  the examples and the props table. */
const DESCRIPTION_PARAGRAPH_LIMIT = 3;

/** The two helpers a story hands its description paragraphs to. */
const DESCRIPTION_HELPERS = ['componentDescription', 'specDescription'];

/** A line waiver for a description that has to name the documentation -- prose
 *  quoting the vocabulary, or a component whose own subject IS its docs.
 *
 *  A parsed directive for the same reason `GLYPH_WAIVER` is: the text already
 *  reads as deliberate prose, so a rule honouring a written reason would pass
 *  the defect it was written about. Covers the line it sits on and the line
 *  above. */
const DOCS_TALK_WAIVER = /lint-story-conventions:\s*docs-talk\s*--\s*(.{15,})/;

/** The docs-talk defect in the RENDERED component descriptions: a description
 *  that names Storybook, the story or the page, or one long enough to be an
 *  article.
 *
 *  Four authoring shapes, one rendered string each:
 *    componentDescription([p1, p2])        -- `src/components/**`
 *    specDescription('kai-x', [p1, p2])    -- `src/web-components/**`
 *    description: { component: <string> }  -- either root, including the `+`
 *                                             row of literals
 *                                             (`web-components/lightbox/`) and
 *                                             the `[...].join('\n\n')`
 *                                             (`overlay.stories.tsx`)
 *  All of them land on `docs.description.component`, which is what Storybook
 *  renders and what the docs page, `llms-full.txt` and the MCP catalog copy. */
function findDescriptionDocsTalk(sf, text) {
  const lines = text.split('\n');
  const findings = [];
  const unverified = [];
  let descriptions = 0;

  /** Is the site at `anchor` waived? The waiver sits on that line or the line
   *  above it, the same window `GLYPH_WAIVER` covers. */
  const waivedAt = (anchor) =>
    DOCS_TALK_WAIVER.test(lines[anchor - 1] ?? '') || DOCS_TALK_WAIVER.test(lines[anchor - 2] ?? '');

  /** A string literal -- or the row of literals a `+` joins, which are ONE
   *  paragraph -- as `{ text, line }` segments. Anything else (a template with
   *  a hole, an identifier, a call) is not statically readable. */
  const stringSegments = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      return [{ text: node.text, line: lineAt(sf, node) }];
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = stringSegments(node.left);
      const right = stringSegments(node.right);
      if (left && right) return [...left, ...right];
    }
    return undefined;
  };

  /** The paragraph list an expression renders: one paragraph per array entry,
   *  each entry itself possibly a `+` row. A single string is a one-paragraph
   *  list. `undefined` is a description this reader cannot read, which the
   *  caller reports as UNVERIFIED rather than skipping quietly. */
  const paragraphsOf = (node) => {
    const single = stringSegments(node);
    if (single) return [single];
    if (ts.isArrayLiteralExpression(node)) return arrayParagraphs(node);
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && DESCRIPTION_HELPERS.includes(node.expression.text)) {
        const arg = node.arguments[node.arguments.length - 1];
        return arg && ts.isArrayLiteralExpression(arg) ? arrayParagraphs(arg) : undefined;
      }
      const callee = node.expression;
      if (
        ts.isPropertyAccessExpression(callee) &&
        callee.name.text === 'join' &&
        ts.isArrayLiteralExpression(callee.expression)
      ) {
        return arrayParagraphs(callee.expression);
      }
    }
    return undefined;
  };

  // A function declaration, so `paragraphsOf` can call it above its definition.
  function arrayParagraphs(array) {
    const out = [];
    for (const element of array.elements) {
      const paragraph = stringSegments(element);
      if (!paragraph) return undefined;
      out.push(paragraph);
    }
    return out;
  }

  /** The line a match at `index` of a paragraph's JOINED text sits on -- a
   *  `+`-split paragraph starts each segment on its own line. */
  const lineOf = (paragraph, index) => {
    let at = 0;
    for (const segment of paragraph) {
      if (index < at + segment.text.length) {
        return segment.line + (segment.text.slice(0, index - at).match(/\n/g)?.length ?? 0);
      }
      at += segment.text.length;
    }
    return paragraph[paragraph.length - 1].line;
  };

  const record = (paragraphs, anchor, unreadable) => {
    if (!paragraphs) {
      unverified.push({ line: anchor, what: unreadable });
      return;
    }
    const waived = waivedAt(anchor);
    for (const paragraph of paragraphs) {
      descriptions++;
      if (waived) continue;
      const match = paragraph
        .map((segment) => segment.text)
        .join('')
        .match(DOCS_TALK);
      if (match) {
        findings.push({
          word: match[0],
          line: lineOf(paragraph, match.index),
          reason: `the description talks about the documentation ('${match[0]}'), not the component`,
        });
      }
    }
    if (!waived && paragraphs.length > DESCRIPTION_PARAGRAPH_LIMIT) {
      findings.push({
        word: `${paragraphs.length} paragraphs`,
        line: anchor,
        reason:
          `${paragraphs.length} paragraphs in one description (the limit is ${DESCRIPTION_PARAGRAPH_LIMIT}): ` +
          `the detail belongs in the examples and the props table`,
      });
    }
  };

  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      DESCRIPTION_HELPERS.includes(node.expression.text) &&
      // Read by the `component` property below, which handles the same call --
      // counting it in both places would report one description twice.
      !isNamedProp(node.parent, 'component')
    ) {
      const anchor = lineAt(sf, node);
      const arg = node.arguments[node.arguments.length - 1];
      record(paragraphsOf(arg), anchor, `the ${node.expression.text}(...) argument is not statically readable`);
    } else if (
      ts.isPropertyAssignment(node) &&
      propName(node) === 'component' &&
      isNamedProp(node.parent?.parent, 'description') &&
      isNamedProp(node.parent?.parent?.parent?.parent, 'docs')
    ) {
      const anchor = lineAt(sf, node);
      record(
        paragraphsOf(node.initializer),
        anchor,
        'the docs.description.component value is not statically readable',
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { findings, unverified, descriptions };
}

function analyzeFile(path, text, ctx) {
  const sf = parse(path, text);
  const findings = {
    snippetlessStories: [],
    eventArgTypes: [],
    componentEventProps: [],
    elementEventProps: [],
    unverified: [],
  };
  findings.snippetlessStories = findSnippetlessStories(sf);
  findings.eventArgTypes = findEventArgTypes(sf);
  const component = findComponentEventProps(sf, (spec) => ctx.readModule(path, spec));
  findings.componentEventProps = component.findings;
  findings.componentEventsRequired = component.required;
  findings.componentResolved = component.resolved;
  findings.unverified.push(...component.unverified);
  const element = findElementEventProps(sf, ctx.eventsByTag);
  findings.elementEventProps = element.findings;
  findings.elementEventsRequired = element.required;
  findings.elementTags = element.tags;
  findings.unverified.push(...element.unverified);
  const autodocs = findAutodocsTagIssue(sf);
  findings.autodocs = autodocs.findings;
  findings.declaresComponent = autodocs.declaresComponent;
  findings.unverified.push(...autodocs.unverified);
  const producers = snippetProducers(sf);
  const localNames = findSnippetLocalNames(sf, producers);
  findings.snippetLocalNames = localNames.findings;
  findings.snippetsScanned = localNames.scanned;
  findings.unverified.push(...localNames.unverified);
  const unimported = findSnippetUnimportedExports(sf, ctx.kitExports, producers);
  findings.snippetUnimportedExports = unimported.findings;
  const glyphs = findGlyphAffordances(sf, text);
  findings.glyphs = glyphs.findings;
  findings.renderedTextRegions = glyphs.textRegions;
  const descriptions = findDescriptionDocsTalk(sf, text);
  findings.descriptionDocsTalk = descriptions.findings;
  findings.descriptionStrings = descriptions.descriptions;
  findings.unverified.push(...descriptions.unverified);
  const title = findMetaTitle(sf);
  if (title) {
    if (retiredTier(title.value)) findings.retiredTier = title;
    const doubled = doubledToken(title.value);
    if (doubled) findings.doubledToken = { ...title, ...doubled };
  }
  return findings;
}

// ---------------------------------------------------------------------------
// self-test: proves the analyzer still DETECTS every defect shape, and lets
// the compliant/waived forms through.
// ---------------------------------------------------------------------------

/** A component module fixture for the (e) probes. `readModule` is injected, so
 *  the probes exercise the real rule over real TS ASTs without touching disk. */
const WIDGET_MODULE = `
export interface WidgetProps extends JSX.HTMLAttributes<HTMLDivElement> {
  label: string;
  onSelect?: (value: string) => void;
}
export function Widget(props: WidgetProps) { return null; }
`;

/** The (e) probe for `Component<XProps>`: the props type is the TYPE ARGUMENT. */
const HARNESS_MODULE = `
export interface HarnessProps {
  onCommit?: () => void;
}
export const Harness: Component<HarnessProps> = () => null;
`;

/** The (e) probe for the `type XProps = {...}` alias form. */
const ALIAS_MODULE = `
export type AliasProps = { onPick?: () => void; label?: string };
export function Alias(props: AliasProps) { return null; }
`;

/** The (e) probe for a component that declares NO event prop of its own, so
 *  the demo handlers a render passes to something else have nothing to match. */
const PLAIN_MODULE = `
export interface PlainProps { label: string }
export function Plain(props: PlainProps) { return null; }
`;

/** The (e) probe for a props type that is named but lives in another module. */
const BORROWED_MODULE = `
import type { WidgetProps } from './types';
export function Borrowed(props: WidgetProps) { return null; }
`;

/** The (e) probe for a GENERIC props type. `props: GenericProps<T>` is the
 *  shape checkbox-group, radio and select all have, and reading its type
 *  argument as the props type is what reported those three as unverified. */
const GENERIC_MODULE = `
export interface GenericProps<T> {
  items: T[];
  onAdd?: (item: T) => void;
}
export function Generic<T>(props: GenericProps<T>) { return null; }
`;

/** The module map every (e) probe resolves against. Injected into the rule, so
 *  the probes never touch the disk and no fixture file exists to go stale. */
const SELF_TEST_MODULES = {
  './widget': WIDGET_MODULE,
  './harness': HARNESS_MODULE,
  './alias': ALIAS_MODULE,
  './plain': PLAIN_MODULE,
  './borrowed': BORROWED_MODULE,
  './generic': GENERIC_MODULE,
};

/** The element events every (f) probe resolves against unless it names its own. */
const SELF_TEST_EVENTS = { 'kai-widget': ['kai-menu', 'kai-focus'] };

/** The kit export names the (k) probes resolve against, unless a case names its
 *  own set. Injected for the same reason SELF_TEST_MODULES is: the probes then
 *  exercise the rule without reading the package's entry points, and the one
 *  probe that reads the REAL files is the explicit "the parser still finds the
 *  exports" case. */
const SELF_TEST_KIT_EXPORTS = new Set([
  'Artifact',
  'Button',
  'Dock',
  'Dropdown',
  'Pill',
  'Select',
  // Also a solid-js export, and that collision is the case the import-line
  // requirement has to get right: the name has to be in the snippet's import
  // line, and WHICH package owns it is the snippet's business, not this rule's.
  'Switch',
  'buttonVariants',
  'renderIcon',
]);

/** The snippet helper every (i), (j) and (k) probe declares for itself. */
const SELF_TEST_SRC = `const src = (code: string) => ({ parameters: { docs: { source: { code, language: 'tsx' } } } });`;

const SELF_TEST_CASES = [
  {
    name: '(a) a story drawing its own JSX with no snippet is flagged (the view-stack/pane-group shape)',
    code: `export const Playground = { render: () => <Widget /> };`,
    expectSnippetless: ['Playground'],
  },
  {
    name: '(a) an inline parameters.docs.source.code makes a story clean',
    code: `export const Playground = {
      render: () => <Widget />,
      parameters: { docs: { source: { code: '<kai-widget />', language: 'html' } } },
    };`,
    expectSnippetless: [],
  },
  {
    name: "(a) a story documented via the local src() helper is clean",
    code: `const src = (code: string) => ({ parameters: { docs: { source: { code, language: 'tsx' } } } });
    export const Playground = { render: () => <Widget />, ...src('<Widget />') };`,
    expectSnippetless: [],
  },
  {
    // THIS CASE USED TO ASSERT THE OPPOSITE (`expectRenderFlag: false`) under
    // the old per-FILE rule, whose unit was `a file that ships a render:
    // story`. An args-only story was outside that unit entirely -- it was not
    // looked at, which is how 18 of them reached the Code panel showing
    // `{ args: {...} }`. Under the per-story rule the same code IS a finding,
    // so this case is the change, not a casualty of it.
    name: '(a) an args-only story with no snippet IS flagged (the rule is per story now; this case asserted the opposite before)',
    code: `export const Playground = { args: { label: 'hi' } };`,
    expectSnippetless: ['Playground'],
  },
  {
    name: '(a) render: Widget (identifier form) still counts as a story needing a snippet',
    code: `function Widget() { return null; }
    export const Playground = { render: Widget };`,
    expectSnippetless: ['Playground'],
  },
  {
    name: '(a) a SHARED render: on `const meta = {...}` is the args-driven wrapper; `Default` still needs its own snippet (the chat-thread.stories.tsx shape)',
    code: `const meta = {
      title: 'X',
      render: (args) => <X {...args} />,
    } satisfies Meta<typeof X>;
    export default meta;
    export const Default = { args: { label: 'hi' } };`,
    expectSnippetless: ['Default'],
  },
  {
    // THE case this whole change exists for. A file-level check passed this
    // file because it found a snippet SOMEWHERE in it; the reader got no
    // example for `Second`.
    name: '(a) a story with no snippet in a file that HAS one elsewhere is flagged (the per-file rule missed exactly this)',
    code: `const src = (code: string) => ({ parameters: { docs: { source: { code } } } });
    export const First = { render: () => <Widget />, ...src('<Widget />') };
    export const Second = { render: () => <Other /> };`,
    expectSnippetless: ['Second'],
  },
  {
    name: '(a) a helper detected by what it RETURNS, not by its name (a `sourceCode` helper counts)',
    code: `const sourceCode = (code: string) => ({ parameters: { docs: { source: { code, language: 'tsx' } } } });
    export const Playground = { render: () => <Widget />, ...sourceCode('<Widget />') };`,
    expectSnippetless: [],
  },
  {
    // The OTHER routing form, and the one a detector written for `...src()`
    // alone gets wrong: the helper returns the `{ docs: { source } }` half, so
    // it is assigned to `parameters` rather than spread. 63 real sites.
    name: '(a) a helper routed via `parameters: src(…)` is clean (the element-story form)',
    code: `const src = (code: string) => ({ docs: { source: { language: 'html', code } } });
    export const Default: StoryObj = { render: () => <div />, parameters: src('<kai-input />') };`,
    expectSnippetless: [],
  },
  {
    name: '(a) `parameters: other(…)` where the helper does NOT return a snippet is not enough',
    code: `const other = (code: string) => ({ layout: 'padded' });
    export const Default: StoryObj = { render: () => <div />, parameters: other('x') };`,
    expectSnippetless: ['Default'],
  },
  {
    name: '(a) spreading a local helper that does NOT return a snippet is not enough',
    code: `const wrapper = (name: string) => ({ args: { name } });
    export const Playground = { ...wrapper('x') };`,
    expectSnippetless: ['Playground'],
  },
  {
    name: '(a) a non-story export (a non-Story annotation) is never treated as a story',
    code: `export const rows: Row[] = [{ label: 'x' }];
    export const fixture: SomeShape = { label: 'y' };`,
    expectSnippetless: [],
  },
  {
    name: '(a) every exported story is checked, not just the first',
    code: `export const One = { args: { a: 1 } };
    export const Two = { args: { b: 2 } };
    export const Three = { args: { c: 3 } };`,
    expectSnippetless: ['One', 'Two', 'Three'],
  },
  {
    name: "(b) an onX argType with no table.category is flagged",
    code: `const meta = { argTypes: { onSubmit: { action: 'submit' } } };`,
    expectEventKeys: ['onSubmit'],
  },
  {
    name: "(b) an onX argType WITH table.category: 'Events' is clean",
    code: `const meta = { argTypes: { onSubmit: { action: 'submit', table: { category: 'Events' } } } };`,
    expectEventKeys: [],
  },
  {
    name: "(b) table.category set to something other than 'Events' still fires",
    code: `const meta = { argTypes: { onSubmit: { table: { category: 'Props' } } } };`,
    expectEventKeys: ['onSubmit'],
  },
  {
    name: '(b) a non-event key (does not match /^on[A-Z]/) is never flagged',
    code: `const meta = { argTypes: { online: { control: 'boolean' } } };`,
    expectEventKeys: [],
  },
  {
    name: '(b) a spread entry has no static key and is skipped',
    code: `const meta = { argTypes: { ...argTypesFor('kai-x'), onSubmit: { table: { category: 'Events' } } } };`,
    expectEventKeys: [],
  },
  {
    name: '(b) two offending keys in one argTypes are both reported',
    code: `const meta = { argTypes: { onSubmit: {}, onCancel: { table: {} } } };`,
    expectEventKeys: ['onSubmit', 'onCancel'],
  },
  {
    name: '(c) a title on the retired Components/Elements tier is flagged',
    code: `const meta = { title: 'Components/Elements/MessageSkills', component: X } satisfies Meta<typeof X>;`,
    expectRetiredTier: true,
  },
  {
    name: '(c) a title on the retired Components/Primitives tier is flagged',
    code: `const meta = { title: 'Components/Primitives/Input', component: X };`,
    expectRetiredTier: true,
  },
  {
    name: '(c) the collapsed Components/<Name> title is clean',
    code: `const meta = { title: 'Components/Input', component: X };`,
    expectRetiredTier: false,
  },
  {
    name: '(c) a bare two-segment Components/Elements is flagged',
    code: `const meta = { title: 'Components/Elements', component: X };`,
    expectRetiredTier: true,
  },
  {
    name: '(c) the word at any other depth is not a retired tier',
    code: `const meta = { title: 'Labs/Elements/Thing', component: X };`,
    expectRetiredTier: false,
  },
  {
    name: '(c) a mock-data `title:` BEFORE the registration is never read (the chat-slots fixture shape)',
    code: `const rows = [{ title: 'Components/Elements/NotAStory' }];
    const meta = { title: 'Components/Input', component: X };`,
    expectRetiredTier: false,
  },
  {
    name: '(d) a segment folding a word into itself (CardSurface Surface) is flagged',
    code: `const meta = { title: 'Components/CardSurface Surface', component: X };`,
    expectDoubledToken: true,
  },
  {
    name: '(d) the corrected title (Card Surface) is clean',
    code: `const meta = { title: 'Components/Card Surface', component: X };`,
    expectDoubledToken: false,
  },
  {
    name: '(d) ordinary multi-word segments are clean',
    code: `const meta = { title: 'Components/Message/Narrow Panel', component: X };`,
    expectDoubledToken: false,
  },
  {
    name: '(d) a single-word segment is never compared',
    code: `const meta = { title: 'Components/RowGroup', component: X };`,
    expectDoubledToken: false,
  },
  {
    name: '(d) an identical repeated word is also caught (a title segment never legitimately stutters)',
    code: `const meta = { title: 'Components/Foo Foo', component: X };`,
    expectDoubledToken: true,
  },
  {
    name: '(d) a later word LONGER than the earlier one is clean (full name, then qualifier)',
    code: `const meta = { title: 'Components/Card CardSurface', component: X };`,
    expectDoubledToken: false,
  },
  {
    // THE shape that shipped in agent-card.stories.tsx: the component declares
    // the event prop and NOTHING in the file declares an argTypes key for it,
    // which is the case rule (b) cannot see at all. `extends` is not followed,
    // so this expectation also pins that the inherited JSX handlers
    // (`onClick`, `onKeyDown`, ...) are NOT demanded.
    name: '(e) a component event prop with no argTypes entry at all is flagged',
    code: `import { Widget } from './widget';
    const meta = { title: 'X', component: Widget } satisfies Meta<typeof Widget>;
    export default meta;`,
    expectComponentEvents: ['onSelect'],
  },
  {
    name: '(e) the same prop WITH an action and table.category Events is clean',
    code: `import { Widget } from './widget';
    const meta = { title: 'X', component: Widget, argTypes: { onSelect: { action: 'select', table: { category: 'Events' } } } } satisfies Meta<typeof Widget>;
    export default meta;`,
    expectComponentEvents: [],
  },
  {
    // The action half of "BOTH an action and table.category": an entry that
    // carries only the category is a slot in the Events group with nothing
    // wired to the Actions panel.
    name: '(e) an entry with table.category Events but NO action still fires',
    code: `import { Widget } from './widget';
    const meta = { title: 'X', component: Widget, argTypes: { onSelect: { table: { category: 'Events' } } } } satisfies Meta<typeof Widget>;`,
    expectComponentEvents: ['onSelect'],
  },
  {
    // THE refinement, pinned. Keyed on `an on[A-Z] identifier anywhere in the
    // file`, this fixture is what made the first cut report ~38 showcase pages:
    // a handler on a template element inside a demo is not a prop of the
    // story's component. Same for an args key the component does not declare.
    name: '(e) a demo-only handler on a template element is NOT a component prop',
    code: `import { Plain } from './plain';
    const meta = {
      title: 'X',
      component: Plain,
      args: { onClick: () => {}, onExtra: () => {} },
      render: () => <Button onClick={() => {}} onMouseEnter={() => {}} />,
    } satisfies Meta<typeof Plain>;`,
    expectComponentEvents: [],
  },
  {
    name: '(e) the `type XProps = {...}` alias form resolves too',
    code: `import { Alias } from './alias';
    const meta = { title: 'X', component: Alias } satisfies Meta<typeof Alias>;`,
    expectComponentEvents: ['onPick'],
  },
  {
    name: '(e) the `Component<XProps>` harness form takes the type ARGUMENT as the props type',
    code: `import { Harness } from './harness';
    const meta = { title: 'X', component: Harness } satisfies Meta<typeof Harness>;`,
    expectComponentEvents: ['onCommit'],
  },
  {
    name: '(e) a GENERIC props type resolves to itself, not to its type parameter',
    code: `import { Generic } from './generic';
    const meta = { title: 'X', component: Generic } satisfies Meta<typeof Generic>;`,
    expectComponentEvents: ['onAdd'],
    expectComponentUnverified: 0,
  },
  {
    name: '(e) a module that does not resolve is UNVERIFIED, never silently clean',
    code: `import { Gone } from './gone';
    const meta = { title: 'X', component: Gone } satisfies Meta<typeof Gone>;`,
    expectComponentEvents: [],
    expectComponentUnverified: 1,
  },
  {
    name: '(e) a props type that is NAMED but not declared in the module is UNVERIFIED',
    code: `import { Borrowed } from './borrowed';
    const meta = { title: 'X', component: Borrowed } satisfies Meta<typeof Borrowed>;`,
    expectComponentEvents: [],
    expectComponentUnverified: 1,
  },
  {
    name: '(e) a meta with no `component` key is out of scope, and is NOT reported unverified',
    code: `const meta = { title: 'X' };`,
    expectComponentEvents: [],
  },
  {
    name: "(f) an element event with no argTypes entry is flagged, under the camelCased prop name",
    code: `const meta = { title: 'X', parameters: { docs: { description: specDescription('kai-widget', ['x']) } } };`,
    expectElementEvents: ['onMenu', 'onFocus'],
  },
  {
    name: '(f) the same events declared with table.category Events are clean',
    code: `const meta = {
      title: 'X',
      argTypes: { onMenu: { action: 'menu', table: { category: 'Events' } }, onFocus: { action: 'focus', table: { category: 'Events' } } },
      parameters: { docs: { description: specDescription('kai-widget', ['x']) } },
    };`,
    expectElementEvents: [],
  },
  {
    name: '(f) a hyphenated event name camelCases (kai-attachments-change -> onAttachmentsChange)',
    code: `const meta = { title: 'X', argTypes: argTypesFor('kai-widget') };`,
    events: { 'kai-widget': ['kai-attachments-change', 'kai-web-search'] },
    expectElementEvents: ['onAttachmentsChange', 'onWebSearch'],
  },
  {
    // The generator covers PROPS, and the only function-typed props in the meta
    // are non-events, so `argTypesFor` leaves every event undeclared and there is
    // no static key for the rule to credit.
    name: '(f) `argTypes: argTypesFor("kai-widget")` credits nothing, so every event fires',
    code: `const meta = { title: 'X', argTypes: argTypesFor('kai-widget') };`,
    expectElementEvents: ['onMenu', 'onFocus'],
  },
  {
    name: '(f) the same tag resolved twice in one file reports each event once',
    code: `const meta = {
      title: 'X',
      argTypes: argTypesFor('kai-widget'),
      parameters: { docs: { description: specDescription('kai-widget', ['x']) } },
    };`,
    expectElementEvents: ['onMenu', 'onFocus'],
  },
  {
    name: '(f) a tag that is not in the meta is UNVERIFIED, not silently clean',
    code: `const meta = { title: 'X', parameters: { docs: { description: specDescription('kai-nope', ['x']) } } };`,
    expectElementEvents: [],
    expectElementUnverified: 1,
  },
  {
    name: "(f) a literal tag that is not a kai-* tag is UNVERIFIED",
    code: `const meta = { title: 'X', parameters: { docs: { description: specDescription('composer', ['x']) } } };`,
    expectElementEvents: [],
    expectElementUnverified: 1,
  },
  {
    name: "(f) an event name without the 'kai-' prefix is skipped as UNVERIFIED rather than guessed",
    code: `const meta = { title: 'X', argTypes: argTypesFor('kai-widget') };`,
    events: { 'kai-widget': ['custom-event'] },
    expectElementEvents: [],
    expectElementUnverified: 1,
  },
  {
    // Reads the REAL meta, so a misrooted path or a regenerated meta that lost
    // its events fails here rather than making every (f) assertion vacuous.
    name: '(f) the real web-component-meta.json still maps kai-agent-card events onto prop names',
    expectMetaEvents: { 'kai-agent-card': ['onActivate', 'onMenu'] },
  },
  {
    // The options the sibling change landed. Every other (g) case is a way of
    // dropping one of the two, which is the defect this rule is for.
    name: '(g) the framework object form with both docgen settings is clean',
    code: `const config = {
      framework: {
        name: 'storybook-solidjs-vite',
        options: {
          docgen: {
            shouldRemoveUndefinedFromOptional: true,
            propFilter: (prop) =>
              (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true) &&
              !prop.name.includes(':'),
          },
        },
      },
    };`,
    expectDocgenIssue: false,
  },
  {
    name: '(g) the bare string framework (the shape that shipped) is flagged',
    code: `const config = { framework: 'storybook-solidjs-vite' };`,
    expectDocgenIssue: true,
  },
  {
    name: '(g) a framework object with no options.docgen is flagged',
    code: `const config = { framework: { name: 'storybook-solidjs-vite', options: {} } };`,
    expectDocgenIssue: true,
  },
  {
    name: '(g) shouldRemoveUndefinedFromOptional: false is flagged (every optional boolean falls to the object default)',
    code: `const config = { framework: { name: 'x', options: { docgen: { shouldRemoveUndefinedFromOptional: false, propFilter: (prop) => !prop.name.includes(':') } } } };`,
    expectDocgenIssue: true,
  },
  {
    name: '(g) a missing shouldRemoveUndefinedFromOptional is flagged',
    code: `const config = { framework: { name: 'x', options: { docgen: { propFilter: (prop) => !prop.name.includes(':') } } } };`,
    expectDocgenIssue: true,
  },
  {
    name: '(g) a missing propFilter is flagged (the solid-js directive key leaks back into every table)',
    code: `const config = { framework: { name: 'x', options: { docgen: { shouldRemoveUndefinedFromOptional: true } } } };`,
    expectDocgenIssue: true,
  },
  {
    name: "(g) a propFilter that does not drop ':' names is flagged",
    code: `const config = { framework: { name: 'x', options: { docgen: { shouldRemoveUndefinedFromOptional: true, propFilter: (prop) => !prop.name.includes('-') } } } };`,
    expectDocgenIssue: true,
  },
  {
    name: "(g) the regex form of the ':' filter is accepted as well as the includes() form",
    code: `const config = { framework: { name: 'x', options: { docgen: { shouldRemoveUndefinedFromOptional: true, propFilter: (prop) => !/:/.test(prop.name) } } } };`,
    expectDocgenIssue: false,
  },
  {
    name: '(g) a comment naming the options does not pass the check',
    code: `// docgen: { shouldRemoveUndefinedFromOptional: true, propFilter: (prop) => !prop.name.includes(':') }
    const config = { framework: 'storybook-solidjs-vite' };`,
    expectDocgenIssue: true,
  },
  {
    // Storybook renders no Docs tab at all without this tag, so the meta's
    // hand-authored description and docgen's props table are unreachable. THE
    // shape: dock.stories.tsx, today's only offender.
    name: '(h) a meta declaring a `component` with no `tags` is flagged (the dock.stories.tsx shape)',
    code: `import { Dock } from './dock';
    const meta = { title: 'Components/Dock', component: Dock } satisfies Meta<typeof Dock>;`,
    expectAutodocs: true,
  },
  {
    name: "(h) the corrected meta (tags: ['autodocs']) is clean",
    code: `import { Dock } from './dock';
    const meta = { title: 'Components/Dock', component: Dock, tags: ['autodocs'] } satisfies Meta<typeof Dock>;`,
    expectAutodocs: false,
  },
  {
    name: "(h) 'autodocs' anywhere in the array is enough (tags: ['dev', 'autodocs'])",
    code: `import { Dock } from './dock';
    const meta = { title: 'X', component: Dock, tags: ['dev', 'autodocs'] };`,
    expectAutodocs: false,
  },
  {
    name: '(h) a meta with no `component` is out of scope, tags or not (a gallery page has no props table)',
    code: `const meta = { title: 'Showcase/Builder' };`,
    expectAutodocs: false,
  },
  {
    // THE false positive a text match produces, and the reason this rule reads
    // the AST: `docs.description.component` is a description FOR the component,
    // not a component registration. Three of the four files the first
    // measurement named were this field.
    name: "(h) the docs DESCRIPTION field (`docs: { description: { component: '<prose>' } }`) is not a component declaration",
    code: `const meta = {
      title: 'Labs/Audio Visualizers',
      parameters: { docs: { description: { component: 'Experimental looks on the shipped ShaderCanvas.' } } },
    };`,
    expectAutodocs: false,
  },
  {
    // `form.stories.tsx` declares a prop NAMED `tags`, and
    // `conversation-item.stories.tsx` tags a STORY `['!dev', '!autodocs']`.
    // Neither is the meta's tag list.
    name: '(h) a `tags:` somewhere else in the file does not satisfy it (an argTypes prop, a story-level !autodocs tag)',
    code: `import { Dock } from './dock';
    const meta = { title: 'X', component: Dock, argTypes: { tags: { control: 'object' } } };
    export const Hidden = { render: () => <Dock />, tags: ['!dev', '!autodocs'] };`,
    expectAutodocs: true,
  },
  {
    name: "(h) tags present without 'autodocs' is flagged",
    code: `import { Dock } from './dock';
    const meta = { title: 'X', component: Dock, tags: ['dev'] };`,
    expectAutodocs: true,
  },
  {
    name: '(h) a `tags` that is not an array literal is UNVERIFIED, never silently clean',
    code: `import { Dock } from './dock';
    const meta = { title: 'X', component: Dock, tags: SHARED_TAGS };`,
    expectAutodocs: false,
    expectAutodocsUnverified: 1,
  },
  {
    name: "(h) an array spread without a literal 'autodocs' is UNVERIFIED (the set is not statically known)",
    code: `import { Dock } from './dock';
    const meta = { title: 'X', component: Dock, tags: [...SHARED] };`,
    expectAutodocs: false,
    expectAutodocsUnverified: 1,
  },
  {
    name: "(h) an array spread WITH the literal 'autodocs' is clean",
    code: `import { Dock } from './dock';
    const meta = { title: 'X', component: Dock, tags: ['autodocs', ...MORE] };`,
    expectAutodocs: false,
  },
  {
    // THE shape: `PanelBody` is a local helper at dock.stories.tsx:74 and the
    // snippets say `<PanelBody />`.
    name: '(i) a snippet naming a locally declared helper is flagged (the dock.stories.tsx PanelBody shape)',
    code: `${SELF_TEST_SRC}
    function PanelBody() { return <div />; }
    export const Default: Story = { render: () => <PanelBody />, ...src(\`<Dock><PanelBody /></Dock>\`) };`,
    expectSnippetNames: ['PanelBody'],
  },
  {
    name: "(i) the corrected snippet (the helper's markup inlined) is clean",
    code: `${SELF_TEST_SRC}
    function PanelBody() { return <div />; }
    export const Default: Story = { render: () => <PanelBody />, ...src(\`<Dock><div class="panel" /></Dock>\`) };`,
    expectSnippetNames: [],
  },
  {
    name: '(i) a locally declared const used as a prop expression is flagged (the select.stories.tsx MODELS shape)',
    code: `${SELF_TEST_SRC}
    const MODELS = [{ value: 'opus' }];
    export const Default: Story = { render: () => <Select />, ...src(\`<Select options={MODELS} />\`) };`,
    expectSnippetNames: ['MODELS'],
  },
  {
    name: '(i) the corrected twin (the data inlined) is clean',
    code: `${SELF_TEST_SRC}
    const MODELS = [{ value: 'opus' }];
    export const Default: Story = { render: () => <Select />, ...src(\`<Select options={[{ value: 'opus' }]} />\`) };`,
    expectSnippetNames: [],
  },
  {
    name: '(i) a name used twice in one snippet is reported once',
    code: `${SELF_TEST_SRC}
    function PanelBody() { return <div />; }
    export const Default: Story = { render: () => <PanelBody />, ...src(\`<Dock><PanelBody /><PanelBody /></Dock>\`) };`,
    expectSnippetNames: ['PanelBody'],
  },
  {
    name: '(i) a name the FILE imports is clean (its import line is how the reader gets it)',
    code: `import { Dock } from './dock';
    ${SELF_TEST_SRC}
    export const Default: Story = { render: () => <Dock />, ...src(\`<Dock />\`) };`,
    expectSnippetNames: [],
  },
  {
    name: '(i) a name the SNIPPET declares for itself is clean (it brought its own copy)',
    code: `${SELF_TEST_SRC}
    function PanelBody() { return <div />; }
    export const Default: Story = { render: () => <PanelBody />, ...src(\`const PanelBody = () => <div />;\n<Dock><PanelBody /></Dock>\`) };`,
    expectSnippetNames: [],
  },
  {
    // Both halves of one distinction, pinned together because a text scan gets
    // exactly one of them wrong: `src={url}` is an attribute NAME and names
    // nothing, while `src={src}` is an expression.
    name: "(i) a JSX attribute NAME is not a reference (the file's own `src` helper next to `<Artifact src={url} />`)",
    code: `${SELF_TEST_SRC}
    export const Default: Story = { render: () => null, ...src(\`<Artifact src={url} />\`) };`,
    expectSnippetNames: [],
  },
  {
    name: '(i) the same name in expression position IS a reference (the artifact.stories.tsx `src={src}` shape)',
    code: `${SELF_TEST_SRC}
    export const Default: Story = { render: () => null, ...src(\`<Artifact src={src} />\`) };`,
    expectSnippetNames: ['src'],
  },
  {
    name: '(i) a rendered word in JSX text is not a reference (the button.stories.tsx `>Ghost<` collision)',
    code: `${SELF_TEST_SRC}
    export const Ghost: Story = { render: () => null, ...src(\`<Button variant="ghost">Ghost</Button>\`) };`,
    expectSnippetNames: [],
  },
  {
    // voice-output.stories.tsx opens a snippet with an HTML comment, which the
    // TS scanner only accepts at the start of a line: unhandled, its prose
    // lexes as identifiers and `Native` (a story name here) is reported.
    name: '(i) prose inside an HTML comment in the snippet is not a reference (the voice-output.stories.tsx shape)',
    code: `${SELF_TEST_SRC}
    export const Native: Story = { render: () => null, ...src(\`<!-- Native: reads text aloud via speechSynthesis. -->\n<kai-voice-output text="hi" />\`) };`,
    expectSnippetNames: [],
  },
  {
    name: '(i) prose in a `//` comment inside the snippet is not a reference',
    code: `${SELF_TEST_SRC}
    export const Native: Story = { render: () => null, ...src(\`// Native: reads text aloud\n<kai-voice-output text="hi" />\`) };`,
    expectSnippetNames: [],
  },
  {
    name: '(i) a locally declared TYPE used in a type position is not a reference (the snippet describes its own shape)',
    code: `${SELF_TEST_SRC}
    interface Row { label: string }
    export const Default: Story = { render: () => null, ...src(\`const rows: Row[] = [];\n<Table rows={rows} />\`) };`,
    expectSnippetNames: [],
  },
  {
    name: '(i) a locally declared TYPE used where a VALUE is required IS a reference',
    code: `${SELF_TEST_SRC}
    interface Row { label: string }
    export const Default: Story = { render: () => null, ...src(\`<Row />\`) };`,
    expectSnippetNames: ['Row'],
  },
  {
    name: '(i) an inline parameters.docs.source.code snippet is inspected too',
    code: `function PanelBody() { return <div />; }
    export const Default: Story = {
      render: () => null,
      parameters: { docs: { source: { code: \`<PanelBody />\` } } },
    };`,
    expectSnippetNames: ['PanelBody'],
  },
  {
    name: '(i) a snippet held in a local const is resolved before inspection (the conversation-list.stories.tsx usage shape)',
    code: `${SELF_TEST_SRC}
    function PanelBody() { return <div />; }
    const usage = \`<PanelBody />\`;
    export const Default: Story = { render: () => null, ...src(usage) };`,
    expectSnippetNames: ['PanelBody'],
  },
  {
    name: '(j) a hand-rolled caret in rendered text is flagged (the popover.stories.tsx `GPT-5.5 ▾` shape)',
    code: `export const Default: Story = { render: () => <Button variant="ghost">GPT-5.5 ▾</Button> };`,
    expectGlyphs: ['▾'],
  },
  {
    name: '(j) the corrected story (the icon and gap the kit ships) is clean',
    code: `export const Default: Story = {
      render: () => <Button class="gap-1.5">{renderIcon('chevron-down', { class: 'size-3.5 shrink-0 opacity-60' })}</Button>,
    };`,
    expectGlyphs: [],
  },
  {
    name: '(j) every glyph in GLYPH_CHARS is caught: ▾ ▴ ⌄ ▼ ▲',
    code: `export const Default: Story = { render: () => <div>{'▾▴⌄▼▲'}</div> };`,
    expectGlyphs: ['▾', '▴', '⌄', '▼', '▲'],
  },
  {
    name: '(j) a glyph in a docs snippet string is flagged too (the snippet is what the reader copies)',
    code: `${SELF_TEST_SRC}
    export const Default: Story = { render: () => null, ...src(\`<Pill>Project or folder ▾</Pill>\`) };`,
    expectGlyphs: ['▾'],
  },
  {
    name: '(j) a glyph in a COMMENT is not rendered, so it is not scanned',
    code: `// The ▾ character is what a user types to open the menu.
    const meta = { title: 'X' };`,
    expectGlyphs: [],
  },
  {
    name: '(j) the commented-out form of the same character is not scanned either',
    code: `export const Default: Story = {
      // <Pill>Project or folder ▾</Pill> used to be here
      render: () => <Pill>Project</Pill>,
    };`,
    expectGlyphs: [],
  },
  {
    name: '(j) a line waiver clears a story that deliberately shows the character',
    code: `// lint-story-conventions: glyph -- quotes the character a user types\nconst CAPTION = 'Type ▾ to open the menu';`,
    expectGlyphs: [],
  },
  {
    name: '(j) a waiver on the line above works the same way (where a JSX comment inside an element has to go)',
    code: `export const Default: Story = {
      render: () => (
        // lint-story-conventions: glyph -- prose about what a user types
        <span>{'Type ▾ to open the menu'}</span>
      ),
    };`,
    expectGlyphs: [],
  },
  {
    name: '(j) a waiver reason shorter than 15 characters is not a waiver',
    code: `// lint-story-conventions: glyph -- short\nconst CAPTION = 'Type ▾ to open the menu';`,
    expectGlyphs: ['▾'],
  },
  {
    // The instance a sibling lane found: `buttonVariants` is public
    // (src/index.ts) and the snippet's import line never imported it, so the
    // example looks plausible and does not compile.
    name: "(k) an export the snippet's own import line does not import is flagged (the missing buttonVariants)",
    code: `${SELF_TEST_SRC}
    export const Default: Story = {
      render: () => null,
      ...src(\`import { Dropdown } from '@kitn.ai/ui';\n\n<button class={buttonVariants({ variant: 'ghost' })}>Open</button>\`),
    };`,
    expectUnimportedExports: ['buttonVariants'],
  },
  {
    name: '(k) the corrected snippet (the name added to its import line) is clean',
    code: `${SELF_TEST_SRC}
    export const Default: Story = {
      render: () => null,
      ...src(\`import { Dropdown, buttonVariants } from '@kitn.ai/ui';\n\n<button class={buttonVariants({ variant: 'ghost' })}>Open</button>\`),
    };`,
    expectUnimportedExports: [],
  },
  {
    // Composition, which is the only reason this rule is not 849 findings: the
    // reader's snippet is the helper's template with the argument spliced in.
    name: '(k) the import line the helper PREPENDS is the snippet\'s import line (the dropdown.stories.tsx shape)',
    code: `const IMPORT = "import { Dropdown } from '@kitn.ai/ui';";
    const src = (code: string) => ({ parameters: { docs: { source: { code: \`\${IMPORT}\n\n\${code}\`, language: 'tsx' } } } });
    export const Default: Story = { render: () => null, ...src(\`<Dropdown />\`) };`,
    expectUnimportedExports: [],
  },
  {
    name: '(k) an export the PREPENDED import line does not carry is still flagged',
    code: `const IMPORT = "import { Dropdown } from '@kitn.ai/ui';";
    const src = (code: string) => ({ parameters: { docs: { source: { code: \`\${IMPORT}\n\n\${code}\`, language: 'tsx' } } } });
    export const Default: Story = { render: () => null, ...src(\`<button class={buttonVariants({ variant: 'ghost' })}>Open</button>\`) };`,
    expectUnimportedExports: ['buttonVariants'],
  },
  {
    name: '(k) a helper that composes no import line leaves the snippet with none, so a kit export in it is flagged (the 29 shorthand helpers)',
    code: `const src = (code: string) => ({ docs: { source: { code } } });
    export const Default: Story = { render: () => null, parameters: src(\`<Button variant="ghost">Open</Button>\`) };`,
    expectUnimportedExports: ['Button'],
  },
  {
    name: '(k) a lowercase JSX intrinsic or a DOM global is not a kit export, so nothing can demand an import for it',
    code: `${SELF_TEST_SRC}
    export const Default: Story = { render: () => null, ...src(\`<div onClick={() => document.title = 'x'}>hi</div>\`) };`,
    expectUnimportedExports: [],
  },
  {
    name: '(k) a name the snippet declares for itself is clean (it brought its own Button)',
    code: `${SELF_TEST_SRC}
    export const Default: Story = { render: () => null, ...src(\`const Button = (props) => <button {...props} />;\n<Button>hi</Button>\`) };`,
    expectUnimportedExports: [],
  },
  {
    name: "(k) a name that is not a kit export is never demanded (an icon the snippet imports from elsewhere)",
    code: `${SELF_TEST_SRC}
    export const Default: Story = { render: () => null, ...src(\`import { FolderPlus } from 'lucide-solid';\n<FolderPlus />\`) };`,
    expectUnimportedExports: [],
  },
  {
    // `Switch` IS a kit export (src/solid.ts) and IS a solid-js export, and
    // `split-workspace.stories.tsx` uses solid-js's. The requirement is the
    // import line, whichever package owns the name.
    name: '(k) a name the snippet imports from ANOTHER package is satisfied (the solid-js `Switch` collision)',
    code: `${SELF_TEST_SRC}\n    export const Default: Story = { render: () => null, ...src(\`import { Switch } from 'solid-js';\n\n<Switch>x</Switch>\`) };`,
    expectUnimportedExports: [],
  },
  {
    name: '(k) the same name with no import line at all is flagged (the import line is the requirement, not the specifier)',
    code: `${SELF_TEST_SRC}\n    export const Default: Story = { render: () => null, ...src(\`<Switch>x</Switch>\`) };`,
    expectUnimportedExports: ['Switch'],
  },
  {
    name: "(l) a description naming the story it renders in is flagged (the Solid story for X shape)",
    code: `const meta = { parameters: { docs: { description: componentDescription([
      'Renders live audio as bars, a grid, a ring, a wave, or a glowing aurora.',
      'The Solid story for X is where the shader canvas is driven.',
    ]) } } };`,
    expectDocsTalk: ['story'],
  },
  {
    name: "(l) a description naming its own story is flagged (the audio-visualizer sentence worth flagging)",
    code: `const meta = { parameters: { docs: { description: componentDescription([
      'Each look gets its own story across all six states, embedded below.',
    ]) } } };`,
    expectDocsTalk: ['story'],
  },
  {
    name: '(l) a four-paragraph description is flagged (the blog-article shape)',
    code: `const meta = { parameters: { docs: { description: componentDescription([
      'One thing.', 'Two things.', 'Three things.', 'Four things.',
    ]) } } };`,
    expectDocsTalk: ['4 paragraphs'],
  },
  {
    name: '(l) a clean two-paragraph description about the component is not flagged',
    code: `const meta = { parameters: { docs: { description: componentDescription([
      'A small floating label on hover/focus of its trigger.',
      'Wrap one interactive child and set content to the hint text.',
    ]) } } };`,
    expectDocsTalk: [],
  },
  {
    name: '(l) a docs-talk line waiver on the line above the call silences the finding',
    code: `const meta = { parameters: { docs: {
      // lint-story-conventions: docs-talk -- quotes the vocabulary the component copies
      description: componentDescription(['The story for X is what this mirrors.']),
    } } };`,
    expectDocsTalk: [],
  },
  {
    name: '(l) a waiver carrying no reason is not a waiver',
    code: `const meta = { parameters: { docs: {
      // lint-story-conventions: docs-talk -- short
      description: componentDescription(['The story for X is what this mirrors.']),
    } } };`,
    expectDocsTalk: ['story'],
  },
  {
    name: "(l) a `+` row of literals is ONE paragraph, and `Labs` is a bare word (the element-story form)",
    code: `const meta = { parameters: { docs: { description: {
      component: 'Shows your markup bigger, centered over a dimmed page. '
        + 'The trigger lives on a Labs/Foundations page.',
    } } } };`,
    expectDocsTalk: ['Labs'],
  },
  {
    name: '(l) an array joined into the description is read as paragraphs (the overlay.stories.tsx shape)',
    code: `const meta = { parameters: { docs: { description: {
      component: ['First paragraph.', 'Second paragraph.', 'Third.', 'Fourth.'].join('\n\n'),
    } } } };`,
    expectDocsTalk: ['4 paragraphs'],
  },
  {
    name: '(l) a file with no rendered component description reads nothing (what makes the run vacuous)',
    code: `export const Playground = { render: () => <Widget /> };`,
    expectDescriptions: 0,
  },
  {
    // Reads the REAL entry points, so a misrooted path or a parser that stopped
    // finding exports fails here rather than making every (k) assertion vacuous.
    name: "(k) the real entry points still parse to the kit's export names",
    expectKitExports: ['buttonVariants', 'renderIcon', 'Dock'],
  },
];

function runSelfTest() {
  let failed = 0;
  for (const c of SELF_TEST_CASES) {
    const sf = parse('selftest.tsx', c.code ?? '');
    let ok = true;
    const notes = [];
    if ('expectSnippetless' in c) {
      const got = findSnippetlessStories(sf).map((s) => s.name);
      const same =
        got.length === c.expectSnippetless.length && got.every((k, i) => k === c.expectSnippetless[i]);
      if (!same) {
        ok = false;
        notes.push(`snippetless: expected [${c.expectSnippetless.join(', ')}], got [${got.join(', ')}]`);
      }
    }
    if ('expectEventKeys' in c) {
      const got = findEventArgTypes(sf).map((f) => f.key);
      const same = got.length === c.expectEventKeys.length && got.every((k, i) => k === c.expectEventKeys[i]);
      if (!same) {
        ok = false;
        notes.push(`event-keys: expected [${c.expectEventKeys.join(', ')}], got [${got.join(', ')}]`);
      }
    }
    if ('expectComponentEvents' in c || 'expectComponentUnverified' in c) {
      const modules = { ...SELF_TEST_MODULES, ...(c.modules ?? {}) };
      const got = findComponentEventProps(sf, (spec) => modules[spec]);
      const keys = got.findings.map((f) => f.key);
      const expected = c.expectComponentEvents ?? [];
      const same = keys.length === expected.length && keys.every((k, i) => k === expected[i]);
      if (!same) {
        ok = false;
        notes.push(`component-events: expected [${expected.join(', ')}], got [${keys.join(', ')}]`);
      }
      if ('expectComponentUnverified' in c) {
        const unverified = got.unverified.length;
        if (unverified !== c.expectComponentUnverified) {
          ok = false;
          notes.push(
            `component-unverified: expected ${c.expectComponentUnverified}, got ${unverified}` +
              (got.unverified.length ? ` (${got.unverified.map((u) => u.what).join('; ')})` : ''),
          );
        }
      }
    }
    if ('expectElementEvents' in c || 'expectElementUnverified' in c) {
      const events = new Map(Object.entries(c.events ?? SELF_TEST_EVENTS));
      const got = findElementEventProps(sf, events);
      const keys = got.findings.map((f) => f.key);
      const expected = c.expectElementEvents ?? [];
      const same = keys.length === expected.length && keys.every((k, i) => k === expected[i]);
      if (!same) {
        ok = false;
        notes.push(`element-events: expected [${expected.join(', ')}], got [${keys.join(', ')}]`);
      }
      if ('expectElementUnverified' in c) {
        const unverified = got.unverified.length;
        if (unverified !== c.expectElementUnverified) {
          ok = false;
          notes.push(
            `element-unverified: expected ${c.expectElementUnverified}, got ${unverified}` +
              (got.unverified.length ? ` (${got.unverified.map((u) => u.what).join('; ')})` : ''),
          );
        }
      }
    }
    if ('expectDocgenIssue' in c) {
      const issue = findDocgenOptionsIssue(sf);
      const got = Boolean(issue);
      if (got !== c.expectDocgenIssue) {
        ok = false;
        notes.push(`docgen-issue: expected ${c.expectDocgenIssue}, got ${got} (${issue ? issue.what : 'no issue'})`);
      }
    }
    if ('expectMetaEvents' in c) {
      const meta = loadWebComponentEvents(PKG_ROOT);
      if (!meta) {
        ok = false;
        notes.push('meta-events: web-component-meta.json did not load');
      } else {
        for (const [tag, expected] of Object.entries(c.expectMetaEvents)) {
          const got = (meta.byTag.get(tag) ?? []).map((n) => eventPropName(n)).filter(Boolean);
          const same = got.length === expected.length && got.every((k, i) => k === expected[i]);
          if (!same) {
            ok = false;
            notes.push(`meta-events ${tag}: expected [${expected.join(', ')}], got [${got.join(', ')}]`);
          }
        }
      }
    }
    if ('expectRetiredTier' in c) {
      const title = findMetaTitle(sf);
      const got = title ? retiredTier(title.value) : false;
      if (got !== c.expectRetiredTier) {
        ok = false;
        notes.push(`retired-tier: expected ${c.expectRetiredTier}, got ${got} (title ${title ? `'${title.value}'` : 'not found'})`);
      }
    }
    if ('expectDoubledToken' in c) {
      const title = findMetaTitle(sf);
      const got = title ? Boolean(doubledToken(title.value)) : false;
      if (got !== c.expectDoubledToken) {
        ok = false;
        notes.push(`doubled-token: expected ${c.expectDoubledToken}, got ${got} (title ${title ? `'${title.value}'` : 'not found'})`);
      }
    }
    if ('expectAutodocs' in c || 'expectAutodocsUnverified' in c) {
      const got = findAutodocsTagIssue(sf);
      const flagged = got.findings.length > 0;
      const expected = c.expectAutodocs ?? false;
      if (flagged !== expected) {
        ok = false;
        notes.push(
          `autodocs: expected ${expected}, got ${flagged}` +
            ` (${got.findings.map((f) => f.reason).join('; ') || 'no finding'})`,
        );
      }
      if ('expectAutodocsUnverified' in c) {
        const unverified = got.unverified.length;
        if (unverified !== c.expectAutodocsUnverified) {
          ok = false;
          notes.push(
            `autodocs-unverified: expected ${c.expectAutodocsUnverified}, got ${unverified}` +
              (got.unverified.length ? ` (${got.unverified.map((u) => u.what).join('; ')})` : ''),
          );
        }
      }
    }
    if ('expectSnippetNames' in c) {
      const got = findSnippetLocalNames(sf).findings.map((f) => f.name);
      const same = got.length === c.expectSnippetNames.length && got.every((k, i) => k === c.expectSnippetNames[i]);
      if (!same) {
        ok = false;
        notes.push(`snippet-names: expected [${c.expectSnippetNames.join(', ')}], got [${got.join(', ')}]`);
      }
    }
    if ('expectUnimportedExports' in c) {
      const kit = c.kitExports ?? SELF_TEST_KIT_EXPORTS;
      const got = findSnippetUnimportedExports(sf, kit).findings.map((f) => f.name);
      const expected = c.expectUnimportedExports;
      const same = got.length === expected.length && got.every((k, i) => k === expected[i]);
      if (!same) {
        ok = false;
        notes.push(`unimported-exports: expected [${expected.join(', ')}], got [${got.join(', ')}]`);
      }
    }
    if ('expectGlyphs' in c) {
      const got = findGlyphAffordances(sf, c.code ?? '').findings.map((f) => f.char);
      const same = got.length === c.expectGlyphs.length && got.every((k, i) => k === c.expectGlyphs[i]);
      if (!same) {
        ok = false;
        notes.push(`glyphs: expected [${c.expectGlyphs.join(', ')}], got [${got.join(', ')}]`);
      }
    }
    if ('expectDocsTalk' in c || 'expectDescriptions' in c) {
      const got = findDescriptionDocsTalk(sf, c.code ?? '');
      if ('expectDocsTalk' in c) {
        const words = got.findings.map((f) => f.word);
        const expected = c.expectDocsTalk;
        const same = words.length === expected.length && words.every((k, i) => k === expected[i]);
        if (!same) {
          ok = false;
          notes.push(`docs-talk: expected [${expected.join(', ')}], got [${words.join(', ')}]`);
        }
      }
      if ('expectDescriptions' in c && got.descriptions !== c.expectDescriptions) {
        ok = false;
        notes.push(`descriptions: expected ${c.expectDescriptions}, got ${got.descriptions}`);
      }
    }
    if ('expectKitExports' in c) {
      const kit = loadKitExports(PKG_ROOT);
      if (kit.names.size === 0) {
        ok = false;
        notes.push(`kit-exports: the ${KIT_ENTRY_FILES.join(' + ')} parsed to NO export name at all`);
      } else {
        const missing = c.expectKitExports.filter((name) => !kit.names.has(name));
        if (missing.length > 0) {
          ok = false;
          notes.push(
            `kit-exports: ${missing.join(', ')} missing from the ${kit.names.size} name(s) parsed out of ` +
              `${kit.files} entry file(s)`,
          );
        }
      }
    }
    if (!ok) failed++;
    console.log(`${ok ? '✓' : '✗'} ${c.name}${notes.length ? `  (${notes.join('; ')})` : ''}`);
  }
  if (failed > 0) {
    console.error(`\n✗ lint-story-conventions self-test: ${failed}/${SELF_TEST_CASES.length} case(s) failed.`);
    process.exit(1);
  }
  console.log(`\n✓ lint-story-conventions self-test: ${SELF_TEST_CASES.length}/${SELF_TEST_CASES.length} cases behave as specified.`);
  process.exit(0);
}

if (SELF_TEST) runSelfTest();

// ---------------------------------------------------------------------------
// the real run
// ---------------------------------------------------------------------------
function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      walk(full, out);
    } else if (e.isFile() && e.name.endsWith('.stories.tsx')) {
      out.push(full);
    }
  }
  return out;
}

if (STORY_ROOTS.length === 0) {
  console.error(`✗ lint-story-conventions: no story roots (src/, apps/) found under ${PKG_ROOT}. This script is misrooted.`);
  process.exit(1);
}
const files = STORY_ROOTS.flatMap((dir) => walk(dir, [])).sort();
if (files.length === 0) {
  console.error(
    `✗ lint-story-conventions: walked ${STORY_ROOTS.map((d) => relative(PKG_ROOT, d)).join(', ')} and found NO .stories.tsx file.\n` +
      `  That is this script being broken, not the tree being clean.`,
  );
  process.exit(1);
}

const events = loadWebComponentEvents(PKG_ROOT);
if (!events || events.byTag.size === 0) {
  console.error(
    `✗ lint-story-conventions: read NO events from src/web-components/web-component-meta.json under ${PKG_ROOT}.\n` +
      `  Rule (f) derives every element event from that file; with nothing read it would report a clean\n` +
      `  tree while checking none of it, which is how this script's predecessor passed 78 stories that\n` +
      `  had no snippet. Check the path, and the generator behind the file.`,
  );
  process.exit(1);
}
// Event names the prop-name mapping cannot derive. Counted and reported rather
// than skipped: a silent skip is an event nothing checks.
const eventsSkipped = [];
for (const [tag, names] of events.byTag) {
  for (const name of names) {
    if (!eventPropName(name)) eventsSkipped.push(`${tag}: ${name}`);
  }
}

const kit = loadKitExports(PKG_ROOT);
if (kit.files === 0 || kit.names.size === 0) {
  console.error(
    `✗ lint-story-conventions: read NO export name from ${KIT_ENTRY_FILES.join(' + ')} under ${PKG_ROOT}.\n` +
      `  Rule (k) derives the kit's public surface from those two files. With nothing read it would\n` +
      `  require an import for nothing and report a clean tree while checking none of it -- the false\n` +
      `  green every derivation in this script is written to fail on. Check the paths, and the export\n` +
      `  statements behind them.`,
  );
  process.exit(1);
}

const mainPath = join(PKG_ROOT, '.storybook', 'main.ts');
const docgenIssue = existsSync(mainPath)
  ? findDocgenOptionsIssue(parse(relative(PKG_ROOT, mainPath), readFileSync(mainPath, 'utf8')))
  : { line: 1, what: 'the file does not exist' };

const readModule = (storyPath, spec) => {
  const file = resolveModuleFile(storyPath, spec);
  return file ? readFileSync(file, 'utf8') : undefined;
};
const ctx = { eventsByTag: events.byTag, readModule, kitExports: kit.names };

const snippetOffenders = [];
const eventOffenders = [];
const retiredTierOffenders = [];
const doubledTokenOffenders = [];
const componentEventOffenders = [];
const elementEventOffenders = [];
const autodocsOffenders = [];
const snippetLocalNameOffenders = [];
const glyphOffenders = [];
const docsTalkOffenders = [];
const unimportedExportOffenders = [];
const unverified = [];
let resolvedComponents = 0;
let requiredComponentEvents = 0;
let elementTagFiles = 0;
let elementTags = 0;
let requiredElementEvents = 0;
let componentMetas = 0;
let snippetsScanned = 0;
let renderedTextRegions = 0;
let descriptionStrings = 0;
for (const path of files) {
  const rel = relative(PKG_ROOT, path);
  const text = readFileSync(path, 'utf8');
  const findings = analyzeFile(path, text, ctx);
  for (const s of findings.snippetlessStories) snippetOffenders.push({ file: rel, ...s });
  for (const f of findings.eventArgTypes) eventOffenders.push({ file: rel, ...f });
  for (const f of findings.componentEventProps) componentEventOffenders.push({ file: rel, ...f });
  for (const f of findings.elementEventProps) elementEventOffenders.push({ file: rel, ...f });
  for (const f of findings.autodocs) autodocsOffenders.push({ file: rel, ...f });
  for (const f of findings.snippetLocalNames) snippetLocalNameOffenders.push({ file: rel, ...f });
  for (const f of findings.snippetUnimportedExports) unimportedExportOffenders.push({ file: rel, ...f });
  for (const g of findings.glyphs) glyphOffenders.push({ file: rel, ...g });
  for (const d of findings.descriptionDocsTalk) docsTalkOffenders.push({ file: rel, ...d });
  for (const u of findings.unverified) unverified.push({ file: rel, ...u });
  if (findings.retiredTier) retiredTierOffenders.push({ file: rel, ...findings.retiredTier });
  if (findings.doubledToken) doubledTokenOffenders.push({ file: rel, ...findings.doubledToken });
  if (findings.componentResolved) resolvedComponents++;
  if (findings.declaresComponent) componentMetas++;
  requiredComponentEvents += findings.componentEventsRequired;
  snippetsScanned += findings.snippetsScanned;
  renderedTextRegions += findings.renderedTextRegions;
  descriptionStrings += findings.descriptionStrings;
  if (findings.elementTags.length > 0) {
    elementTagFiles++;
    elementTags += findings.elementTags.length;
  }
  requiredElementEvents += findings.elementEventsRequired;
}

// A derivation that read nothing is this script being broken, not a clean tree:
// the rules would report zero findings while having checked zero facts.
const vacuous = [];
if (resolvedComponents === 0) {
  vacuous.push('(e) resolved no story component down to its props type, so no event prop could be required');
}
if (elementTagFiles === 0) {
  vacuous.push('(f) found no story file resolving an element by a literal kai-* tag');
}
if (componentMetas === 0) {
  vacuous.push('(h) found no story meta declaring a `component`, so no autodocs tag could be required');
}
if (snippetsScanned === 0) {
  vacuous.push('(i)/(k) read no docs-source snippet text, so no snippet could be checked');
}
if (renderedTextRegions === 0) {
  vacuous.push('(j) read no rendered string/template/JSX-text region, so no glyph could be found');
}
if (descriptionStrings === 0) {
  vacuous.push('(l) read no rendered component description string, so no docs-talk or over-long description could be found');
}

const total =
  snippetOffenders.length +
  eventOffenders.length +
  retiredTierOffenders.length +
  doubledTokenOffenders.length +
  componentEventOffenders.length +
  elementEventOffenders.length +
  autodocsOffenders.length +
  snippetLocalNameOffenders.length +
  unimportedExportOffenders.length +
  glyphOffenders.length +
  docsTalkOffenders.length +
  (docgenIssue ? 1 : 0);
const unverifiedTotal = unverified.length + eventsSkipped.length + kit.starUnfollowed.length;
if (total === 0 && unverifiedTotal === 0 && vacuous.length === 0) {
  console.log(
    `✓ lint-story-conventions: scanned ${files.length} .stories.tsx file(s); every exported story carries a ` +
      `docs.source.code snippet of its own, every onX argType carries table.category 'Events', every event prop ` +
      `declared by a story's component carries an action + an Events argType (${resolvedComponents} component(s) ` +
      `resolved, ${requiredComponentEvents} prop(s)), every event of the ${elementTags} element(s) resolved by a ` +
      `literal kai-* tag is declared (${elementTagFiles} file(s), ${requiredElementEvents} prop(s) over ` +
      `${events.eventCount} event(s) in ${events.byTag.size} element(s)), .storybook/main.ts passes the framework's ` +
      `docgen options, no title is on a retired tier, and no title segment folds a word into itself. ` +
      `Every one of the ${componentMetas} meta(s) declaring a \`component\` carries tags: ['autodocs']; every ` +
      `snippet read (${snippetsScanned}) names only what it brings with it or imports, and imports every ` +
      `kit export it uses (${kit.names.size} public name(s) parsed out of ${KIT_ENTRY_FILES.join(' + ')}); and ` +
      `no story hand-rolls one of ${GLYPH_CHARS.join(' ')} across ${renderedTextRegions} rendered text region(s); and ` +
      `every one of the ${descriptionStrings} rendered component description string(s) in those stories describes the ` +
      `component -- not Storybook, the story or the page -- in ${DESCRIPTION_PARAGRAPH_LIMIT} paragraph(s) or fewer.`,
  );
  process.exit(0);
}

console.error(`✗ lint-story-conventions: ${total} finding(s) across ${files.length} scanned .stories.tsx file(s).\n`);
const elementDerivation =
  elementTagFiles > 0
    ? `${elementTagFiles} file(s) resolve ${elementTags} literal kai-* tag(s) (${requiredElementEvents} event prop(s) over ` +
      `${events.eventCount} events in ${events.byTag.size} of ${events.elementCount} element(s))`
    : 'no story file resolves a literal kai-* tag (rule (f) cannot check anything)';
console.error(
  `  derived: ${resolvedComponents}/${files.length} file(s) resolved a component + props type ` +
    `(${requiredComponentEvents} event prop(s) declared); ${elementDerivation}; ` +
    `${componentMetas} meta(s) declare a component, ${snippetsScanned} docs-source snippet(s) were read, ` +
    `${kit.names.size} kit export name(s) were parsed out of ${KIT_ENTRY_FILES.join(' + ')}, ` +
    `${renderedTextRegions} rendered text region(s) were scanned for glyphs; ` +
    `${descriptionStrings} rendered component description string(s) were read for docs talk and for over-long descriptions; ` +
    `${relative(PKG_ROOT, mainPath)} read for the framework docgen options.\n`,
);

if (vacuous.length > 0) {
  console.error(`  (!) THIS SCRIPT READ NOTHING for ${vacuous.length} derivation(s), so its evidence is empty:`);
  for (const v of vacuous) console.error(`    ${v}`);
  console.error(
    `    A rule that derived nothing reports no findings while checking nothing -- the failure this\n` +
      `    guard exists to prevent. Fix the derivation, not the finding.\n`,
  );
}

if (snippetOffenders.length > 0) {
  const filesAffected = new Set(snippetOffenders.map((f) => f.file)).size;
  console.error(
    `  (a) ${snippetOffenders.length} story/stories across ${filesAffected} file(s) with no docs.source.code snippet of their own:`,
  );
  for (const f of snippetOffenders) console.error(`    ${f.file}:${f.line}  ${f.name}`);
  console.error(
    `    Add a usage snippet per STORY: parameters.docs.source.code (inline), or spread
` +
      `    the local const src = (code) => ({ parameters: { docs: { source: { code, language: ... } } } })
` +
      `    helper. One snippet elsewhere in the file does not cover this story -- the reader
` +
      `    of the Code panel sees one story at a time.\n`,
  );
}

if (eventOffenders.length > 0) {
  console.error(`  (b) ${eventOffenders.length} argType key(s) matching /^on[A-Z]/ with no table.category 'Events':`);
  for (const f of eventOffenders) console.error(`    ${f.file}:${f.line}  ${f.key}`);
  console.error(`    Add table: { category: 'Events' } to each of these argTypes entries.\n`);
}

if (retiredTierOffenders.length > 0) {
  console.error(`  (c) ${retiredTierOffenders.length} title(s) on a RETIRED tier (the tiers removed when src/ui/ merged into src/components/):`);
  for (const f of retiredTierOffenders) console.error(`    ${f.file}:${f.line}  '${f.value}'`);
  console.error(
    `    Collapse to 'Components/<Name>' -- e.g. 'Components/Elements/MessageSkills' is\n` +
      `    'Components/MessageSkills'. A title on a retired tier renders a phantom sidebar\n` +
      `    node and resurrects the vocabulary the merge deleted.\n`,
  );
}

if (doubledTokenOffenders.length > 0) {
  console.error(`  (d) ${doubledTokenOffenders.length} title segment(s) folding a word into itself:`);
  for (const f of doubledTokenOffenders) console.error(`    ${f.file}:${f.line}  '${f.value}'  (segment '${f.segment}': '${f.word}' is already the tail of '${f.earlier}')`);
  console.error(
    `    This is the signature of a blanket SYMBOL rename leaking into the title STRING.\n` +
      `    Fix the title -- the component rename is almost certainly correct and the title is not.\n`,
  );
}

if (componentEventOffenders.length > 0) {
  const filesAffected = new Set(componentEventOffenders.map((f) => f.file)).size;
  console.error(
    `  (e) ${componentEventOffenders.length} component event prop(s) with no action + table.category 'Events' argTypes entry (${filesAffected} file(s)):`,
  );
  for (const f of componentEventOffenders) console.error(`    ${f.file}:${f.line}  ${f.key}  (${f.reason})`);
  console.error(
    `    Declare each one in the meta's argTypes as { action: '<name>', table: { category: 'Events' } }.\n` +
      `    These are props the story's own \`component\` DECLARES, so docgen lists them whether or not\n` +
      `    any story uses them: without the entry the prop never appears in the Events group.\n`,
  );
}

if (elementEventOffenders.length > 0) {
  const filesAffected = new Set(elementEventOffenders.map((f) => f.file)).size;
  console.error(
    `  (f) ${elementEventOffenders.length} event prop(s) of a kai-* element with no table.category 'Events' argTypes entry (${filesAffected} file(s)):`,
  );
  for (const f of elementEventOffenders) console.error(`    ${f.file}:${f.line}  ${f.key}  ('${f.tag}' emits '${f.event}')`);
  console.error(
    `    Add each as an argTypes key: { action: '<name>', table: { category: 'Events' } }. The prop\n` +
      `    name is 'on' + the event name without its 'kai-' prefix, camelCased ('kai-menu' ->\n` +
      `    'onMenu', 'kai-attachments-change' -> 'onAttachmentsChange').\n` +
      `    A spread of argTypesFor(...) cannot declare these: it walks the meta's PROPS, and none of the\n` +
      `    events is a prop.\n`,
  );
}

if (docgenIssue) {
  console.error(`  (g) the .storybook framework options do not carry the docgen settings:`);
  console.error(`    ${relative(PKG_ROOT, mainPath)}:${docgenIssue.line}  ${docgenIssue.what}`);
  console.error(
    `    Storybook picks a control by matching an EXACT string against the docgen type name\n` +
      `    (node_modules/storybook/dist/_browser-chunks/chunk-SZQXB3JV.js:975). An OPTIONAL boolean arrives as\n` +
      `    'boolean | undefined' unless shouldRemoveUndefinedFromOptional is true, matches no case, and falls\n` +
      `    to the object default -- every optional boolean in the kit silently loses its checkbox. And without\n` +
      `    the propFilter, the global 'declare module solid-js' directive augmentation comes back as a\n` +
      `    'bool:inert' prop on every component's table.\n\n`,
  );
}

if (autodocsOffenders.length > 0) {
  const filesAffected = new Set(autodocsOffenders.map((f) => f.file)).size;
  console.error(
    `  (h) ${autodocsOffenders.length} meta(s) declaring a \`component\` with no 'autodocs' tag (${filesAffected} file(s)):`,
  );
  for (const f of autodocsOffenders) console.error(`    ${f.file}:${f.line}  ${f.reason}`);
  console.error(
    `    Add tags: ['autodocs'] to the meta. Storybook renders no Docs tab without it, so the\n` +
      `    hand-authored docs.description and docgen's props table are unreachable. The rule reads the\n` +
      `    meta's own \`component\` property: a text match on \`component:\` also matches\n` +
      `    docs: { description: { component: '<prose>' } }, which is a description, not a registration.\n`,
  );
}

if (snippetLocalNameOffenders.length > 0) {
  const filesAffected = new Set(snippetLocalNameOffenders.map((f) => f.file)).size;
  console.error(
    `  (i) ${snippetLocalNameOffenders.length} snippet reference(s) to a name the story file declares for itself (${filesAffected} file(s)):`,
  );
  for (const f of snippetLocalNameOffenders) console.error(`    ${f.file}:${f.line}  ${f.name}  (as a ${f.how})`);
  console.error(
    `    The reader of the Code panel has the snippet and nothing else, so a name the FILE declares\n` +
      `    (a local helper like PanelBody, a local const like MODELS) does not exist for them: inline\n` +
      `    what it renders, or show the data. A name the snippet imports, or declares for itself, is\n` +
      `    how the reader GETS it and is clean.\n`,
  );
}

if (glyphOffenders.length > 0) {
  const filesAffected = new Set(glyphOffenders.map((f) => f.file)).size;
  console.error(
    `  (j) ${glyphOffenders.length} hand-rolled arrow glyph(s) in rendered text (${filesAffected} file(s)):`,
  );
  for (const f of glyphOffenders) console.error(`    ${f.file}:${f.line}  '${f.char}'`);
  console.error(
    `    The kit ships the affordance: renderIcon('chevron-down', { class: 'size-3.5 shrink-0 opacity-60' })\n` +
      `    with gap-1.5 on the container, which is what src/web-components/dropdown/dropdown.tsx:100 does\n` +
      `    for the trigger-icon-trailing look. A glyph is a font-dependent shape drawn at whatever size\n` +
      `    the text runs at, and it carries no accessible name.\n` +
      `    A story that deliberately SHOWS the character waives the line:\n` +
      `      // lint-story-conventions: glyph -- <why it is deliberate, 15+ chars>\n`,
  );
}

if (docsTalkOffenders.length > 0) {
  const filesAffected = new Set(docsTalkOffenders.map((f) => f.file)).size;
  console.error(
    `  (l) ${docsTalkOffenders.length} problem(s) in the rendered component descriptions (${filesAffected} file(s)):`,
  );
  for (const f of docsTalkOffenders) console.error(`    ${f.file}:${f.line}  ${f.word}  (${f.reason})`);
  console.error(
    `    A description renders ABOVE the props table, and the same string is copied into llms-full.txt and\n` +
      `    the MCP catalog, so it has to describe the COMPONENT. Drop the words about the documentation\n` +
      `    (Storybook, the story, the page) and, past ${DESCRIPTION_PARAGRAPH_LIMIT} paragraphs, move the detail into\n` +
      `    the examples and the props table.\n` +
      `    A description that has to name the documentation waives its site:\n` +
      `      // lint-story-conventions: docs-talk -- <why it is deliberate, 15+ chars>\n` +
      `    on the line of the componentDescription(...) call / the \`component:\` key, or the line above.\n`,
  );
}

if (unimportedExportOffenders.length > 0) {
  const filesAffected = new Set(unimportedExportOffenders.map((f) => f.file)).size;
  console.error(
    `  (k) ${unimportedExportOffenders.length} snippet reference(s) to a kit export its own import line does not import (${filesAffected} file(s)):`,
  );
  for (const f of unimportedExportOffenders) console.error(`    ${f.file}:${f.line}  ${f.name}  (as a ${f.how})`);
  console.error(
    `    Add each name to the SNIPPET's own import line, e.g.\n` +
      `      import { Dropdown, DropdownTrigger, buttonVariants } from '@kitn.ai/ui';\n` +
      `    A docs example is the code a reader PASTES, and the story file's imports do not reach it --\n` +
      `    only the snippet's own import line does. The export list is parsed from\n` +
      `    ${KIT_ENTRY_FILES.join(' + ')}, so a lowercase JSX tag or a DOM global can never be asked for.\n` +
      `    A name the kit shares with another package (\`Switch\` is also a solid-js export) is satisfied by\n` +
      `    an import from that package: what this asks for is the import line, not the specifier.\n`,
  );
}

if (unverifiedTotal > 0) {
  console.error(`  (!) ${unverifiedTotal} UNVERIFIED fact(s). A rule that cannot read what it needs says so:`);
  for (const u of unverified) console.error(`    ${u.file}:${u.line}  ${u.what}`);
  for (const s of eventsSkipped) {
    console.error(`    web-component-meta.json  event '${s}' does not start with 'kai-', so no prop name can be derived`);
  }
  for (const s of kit.starUnfollowed) {
    console.error(`    ${s}  -- the names behind that star are not in the export set rule (k) checks against`);
  }
  console.error(
    `    Extend the derivation to cover these, or record why the file is out of scope. Silently\n` +
      `    skipping one is how a rule stops checking something without anyone noticing.\n`,
  );
}

process.exit(1);
