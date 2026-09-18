// Regression guard for four STORY-CONVENTION defects, all of which were
// hand-authored per story with nothing enforcing them.
//
// THE FOUR DEFECTS
// (a) A STORY with no usage snippet of its own. The house convention is to
//     author one by hand: either the local
//     `const src = (code) => ({ parameters: { docs: { source: { code, ... } } } })`
//     helper most component `.stories.tsx` files define for themselves (see
//     `src/components/composer.stories.tsx`), or an inline
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
// now stamps the category (see `src/stories/docs/element-controls.ts`).
// (c) is a per-TITLE finding: the meta object's `title` string must not pass
// through `Elements` or `Primitives` immediately under a leading
// `Components`. Scoped to that exact shape -- see `retiredTier`.
// (d) is a per-TITLE finding: no whitespace-separated word in a title segment
// may be a suffix of an EARLIER word in the same segment. See `doubledToken`
// for why the comparison is scoped rather than a generic repeated-word check.
//
// WHAT (c) AND (d) DELIBERATELY DO NOT CHECK: that `title` equals the
// component's directory. The mapping is NOT 1:1 and a strict rule would
// false-positive on legitimate stories -- `src/components/audio-visualizer/labs/`
// is titled `Labs/Audio Visualizers` and `src/components/settings.stories.tsx`
// is titled `Labs/Settings`, both correct. A guard that cries wolf gets
// waived into uselessness, so these two rules assert only shapes that cannot
// be legitimate.
//
// WHY AST, NOT REGEX
// All four rules are about a SHAPE in the code (a property chain, a story's
// `render` key, a title's segment path), not a token that also legitimately
// appears in prose --
// `lint-cdn-pins` justifies regex for exactly that distinction and rejects it
// for shape-matching. A real parse also means renamed variables, multiline
// object literals and reordered keys don't produce false negatives the way a
// line-oriented scan would.
//
// A ZERO-MATCH RUN ON `.stories.tsx` FILES IS A HARD FAILURE. This repo's
// most expensive recurring defect is a scan that silently matches nothing and
// reads as "clean". A clean run on the FINDINGS is fine and is the goal
// state; a clean run because the file walk found no `.stories.tsx` at all is
// this script being broken.
//
// RUNNING IT, without a build:
//
//   node packages/ui/scripts/lint-story-conventions.mjs
//   node packages/ui/scripts/lint-story-conventions.mjs --self-test   # prove it still detects
import { readFileSync, readdirSync } from 'node:fs';
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
  const names = new Set();
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const init = node.initializer;
      if (
        (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) &&
        containsDocsSourceCodeChain(init)
      ) {
        names.add(node.name.text);
      }
    } else if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      node.body &&
      containsDocsSourceCodeChain(node)
    ) {
      names.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return names;
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

/** Every LITERAL `argTypes` property whose key matches /^on[A-Z]/, with
 *  whether it carries `table: { category: 'Events' }` verbatim. Spread
 *  entries (`...argTypesFor(...)`) carry no static key and are skipped. */
function findEventArgTypes(sf) {
  const findings = [];
  const hasEventsCategory = (initializer) => {
    if (!initializer || !ts.isObjectLiteralExpression(initializer)) return false;
    for (const prop of initializer.properties) {
      if (!ts.isPropertyAssignment(prop) || propName(prop) !== 'table') continue;
      if (!ts.isObjectLiteralExpression(prop.initializer)) continue;
      for (const inner of prop.initializer.properties) {
        if (
          ts.isPropertyAssignment(inner) &&
          propName(inner) === 'category' &&
          ts.isStringLiteral(inner.initializer) &&
          inner.initializer.text === 'Events'
        ) {
          return true;
        }
      }
    }
    return false;
  };

  const visit = (node) => {
    if (ts.isPropertyAssignment(node) && propName(node) === 'argTypes' && ts.isObjectLiteralExpression(node.initializer)) {
      for (const prop of node.initializer.properties) {
        if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) continue; // skip spreads
        const name = propName(prop);
        if (!name || !/^on[A-Z]/.test(name)) continue;
        const initializer = ts.isPropertyAssignment(prop) ? prop.initializer : undefined;
        const line = sf.getLineAndCharacterOfPosition(prop.getStart(sf)).line + 1;
        if (!hasEventsCategory(initializer)) {
          findings.push({ key: name, line });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return findings;
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

function analyzeFile(path, text) {
  const sf = parse(path, text);
  const findings = { snippetlessStories: [], eventArgTypes: [] };
  findings.snippetlessStories = findSnippetlessStories(sf);
  findings.eventArgTypes = findEventArgTypes(sf);
  const title = findMetaTitle(sf);
  if (title) {
    if (retiredTier(title.value)) findings.retiredTier = title;
    const doubled = doubledToken(title.value);
    if (doubled) findings.doubledToken = { ...title, ...doubled };
  }
  return findings;
}

// ---------------------------------------------------------------------------
// self-test: proves the analyzer still DETECTS both defect shapes, and lets
// the compliant/waived forms through.
// ---------------------------------------------------------------------------
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
];

function runSelfTest() {
  let failed = 0;
  for (const c of SELF_TEST_CASES) {
    const sf = parse('selftest.tsx', c.code);
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

const snippetOffenders = [];
const eventOffenders = [];
const retiredTierOffenders = [];
const doubledTokenOffenders = [];
for (const path of files) {
  const rel = relative(PKG_ROOT, path);
  const text = readFileSync(path, 'utf8');
  const { snippetlessStories, eventArgTypes, retiredTier: retired, doubledToken: doubled } = analyzeFile(path, text);
  for (const s of snippetlessStories) snippetOffenders.push({ file: rel, ...s });
  for (const f of eventArgTypes) eventOffenders.push({ file: rel, ...f });
  if (retired) retiredTierOffenders.push({ file: rel, ...retired });
  if (doubled) doubledTokenOffenders.push({ file: rel, ...doubled });
}

const total = snippetOffenders.length + eventOffenders.length + retiredTierOffenders.length + doubledTokenOffenders.length;
if (total === 0) {
  console.log(
    `✓ lint-story-conventions: scanned ${files.length} .stories.tsx file(s); every exported story carries a ` +
      `docs.source.code snippet of its own, every onX argType carries table.category 'Events', no title is on a ` +
      `retired tier, and no title segment folds a word into itself.`,
  );
  process.exit(0);
}

console.error(`✗ lint-story-conventions: ${total} finding(s) across ${files.length} scanned .stories.tsx file(s).\n`);

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

process.exit(1);
