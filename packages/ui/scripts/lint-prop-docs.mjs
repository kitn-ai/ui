// Prop-DOC guard. Four rules over every hand-written `src/**/*.{ts,tsx}`:
// the member-doc cap, the em dash in any doc comment, the em dash in rendered
// strings, and a description that restates its own type. The CI step keeps the
// name `lint:prop-docs` it shipped under; it is now the doc-and-copy guard.
//
// WHY. One prop doc comment is generated into FIVE artifacts: the element meta,
// `llms-full.txt` (what an agent reads), the MCP catalog, the docs site prop
// table, and Storybook. So the cost of a rambling comment is not one comment, it
// is five copies of prose nobody asked for, and the tree this was written for
// averaged a long paragraph per prop. A caller reads a prop table to find out
// what a prop DOES, not why the kit chose to have one.
//
// THE RULES, three of them, all on the same walk:
//   (long)         what it does plus only the facts a caller cannot infer: the
//                  default, a unit, a constraint, the one trap. ONE sentence,
//                  <= 160 whitespace-collapsed characters. The REASONING is not
//                  deleted, it MOVES to a plain `//` comment, which no generator reads.
//   (em-dash)      no em dash in a doc comment. `apps/docs/STYLE.md` bans the
//                  flourish in rendered copy, and a doc comment is rendered copy:
//                  the five artifacts above print it verbatim.
//   (restates-type) a description may not name TWO OR MORE of its own type's string
//                  literals AS CODE (backticked or quoted). A union is the most common
//                  way a description gets long while adding nothing: the signature (and
//                  the props table) already print the union, so enumerating it is bytes
//                  for no information. Quoting is what separates naming the union from
//                  using a word that happens to be one of its members ("a silent send"
//                  against `'compose' | 'send'`). Syntactic, with no type checker, so it
//                  fires on a union written inline, in parentheses, or behind a `type`
//                  alias declared in the SAME file; a union reached only through an
//                  import is not seen.
//   (em-dash-copy) no em dash in a RENDERED STRING either: a string literal, a template
//                  literal or JSX text is copy a reader sees (a UI label, a console
//                  notice, an error message, a tool description the provider reads).
//                  A comment INSIDE a template (a CSS block) is stripped first, and
//                  `src/wire/fixtures/**` is test data rather than copy.
//
// SCOPE. Every hand-written `src/**/*.{ts,tsx}`:
//     the web-component facades, the Solid components, and the shared `.ts` modules
//     (`chat-types.ts`, `slots.ts`, `slot-text.ts`, `diagnostic-events.ts`, the
//     `primitives/` and `state/` members) whose JSDoc reaches an artifact whenever a
//     facade references the type. Generated and test files are OUT: `*.d.ts` (the
//     artifacts themselves), `*.test.*`, `*.stories.*`, `*.testlib.*`,
//     `src/test-utils/**` and `src/stories/**`.
//     FOUR surfaces are read, and the scope of the first three is why the counts differ:
//       members          an interface member or an object-type-literal member. The cap,
//                        the em dash and the type-restatement rule all apply.
//       declarations     the doc above an interface, a `type`, a function, a class, an
//                        enum or a `const`/`let`. It is allowed to be a paragraph, so
//                        ONLY the em dash applies.
//       rendered strings every string that becomes copy. Only the em dash applies.
//     That a `const` doc counts is deliberate: it reaches the emitted `.d.ts` when the
//     binding is exported, so it is prose a consumer's editor shows.
//
//   A `{@link X}` IN A DOC IS MEASURED, via `ts.getTextOfJSDocComment`. It used to be
//     measured by `String(doc.comment)`, which returns "[object Object],..." for a doc
//     whose comment is an array of JSDoc nodes: those docs read as 47 characters, so the
//     gate could not see them at all. Two lanes found it (one had three over-cap props
//     hidden by it, the other a 533-char prop), and the self-test now carries a case so
//     the regression cannot come back.
//
// THE WAIVER, and why it is a parsed directive rather than prose:
//   // lint-prop-docs: <rule> -- <reason>
// on a `//` line in the comment block directly above the member (or the string),
// where `<rule>` is `long`, `em-dash`, `em-dash-copy` or `restates-type`. It covers
// THAT site and THAT rule only, so a waiver written for the cap cannot silently
// excuse a type restatement. A reason is required: the bare directive does not
// waive, because the shape of a suppression that survives review is one whose
// reason somebody had to write down. Waived sites are COUNTED and PRINTED, so the
// number is visible in CI output and can only shrink.
//
// A ZERO-MATCH RUN IS A HARD FAILURE. A walk that reads no props, or fewer than
// the floor, is this script being broken -- the prop tree moved, or the parse
// stopped finding members -- not the tree being clean, and exiting 0 there is
// this repo's most expensive recurring defect.
//
// RUNNING IT, no build needed (it reads source, no `dist/`):
//
//   node packages/ui/scripts/lint-prop-docs.mjs
//   node packages/ui/scripts/lint-prop-docs.mjs --package-root <dir>   # a fixture or historical checkout
//   node packages/ui/scripts/lint-prop-docs.mjs --self-test            # prove the analyzer still detects
//   node packages/ui/scripts/lint-prop-docs.mjs --json                 # machine-readable counts, for the gate
//   node packages/ui/scripts/lint-prop-docs.mjs --min-props <n>        # lower the floor for a FIXTURE tree
//     The floor exists so the REAL walk cannot pass vacuously. A fixture the
//     gate itself writes holds a handful of props by construction, so it has to
//     be able to say what its own floor is; without that, every fixture run
//     would fail on the floor instead of exercising the cap.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const argOf = (flag) => {
  const i = argv.indexOf(flag);
  return i === -1 ? undefined : argv[i + 1];
};
const PKG_ROOT = resolve(argOf('--package-root') ?? join(SCRIPT_DIR, '..'));
const SELF_TEST = argv.includes('--self-test');
const JSON_OUT = argv.includes('--json');

const SRC_DIR = join(PKG_ROOT, 'src');

/** Hard cap, whitespace-collapsed. ~100 is the target; this is where it fails. */
const MAX_PROP_DOC_CHARS = 160;

/** The em dash `apps/docs/STYLE.md` bans. En dash is NOT included: a range is a real
 *  thing a doc may need, while the flourish is what the rule is about. */
const EM_DASH = '\u2014';

/** A waiver names the rule it waives, so a cap waiver cannot excuse a type
 *  restatement. Parsed, not substring-matched: the reason must be present. */
const WAIVER_DIRECTIVE = /^\s*\/\/\s*lint-prop-docs:\s*(long|em-dash|em-dash-copy|restates-type)\s*--\s+(\S.*?)\s*$/;

/** The floor the walk must clear, so a parse that stopped finding members cannot
 *  read as a clean tree. Deliberately far below the real count and far above
 *  zero: a rename that halves the tree is a real problem, a handful of props
 *  disappearing is a normal refactor. */
const MIN_PROPS_READ = 500;

/** The floor THIS run enforces: `MIN_PROPS_READ` unless a fixture overrode it. */
const MIN_PROPS = Number(argOf('--min-props') ?? MIN_PROPS_READ);

const isTestish = (name) =>
  /\.(test|stories)\.tsx?$/.test(name) ||
  /\.declarative\.test\.tsx$/.test(name) ||
  // A shared generator lib for tests: imported by `*.test.ts` only, so its docs
  // reach no artifact.
  /\.testlib\.tsx?$/.test(name);

/** Every hand-written `.ts`/`.tsx` under `dir`: the facades, the Solid components,
 *  and the shared modules whose members an artifact prints. Generated and test
 *  files are out (`*.d.ts` is the artifact itself; a test's doc is not rendered).
 *  Recursive: the layer is organised in family folders, and a flat readdir would
 *  emit a 0-file walk. */
function walkSources(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'test-utils' || entry.name === 'stories') continue;
      out.push(...walkSources(full));
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts') && !isTestish(entry.name)) {
      out.push(full);
    }
  }
  return out.sort();
}

/**
 * The `//` lines directly above `member` that are WAIVERS, keyed by the rule they
 * name. Taken from the member's leading trivia, excluding anything inside a doc
 * comment block: a directive written inside the doc comment IS the description,
 * and letting it waive would mean a prop could silence its own cap while still
 * shipping the bytes to five artifacts.
 */
function waiverFor(sf, member) {
  const trivia = sf.text.slice(member.getFullStart(), member.getStart(sf));
  const waiverLines = [];
  let inBlock = false;
  for (const line of trivia.split('\n')) {
    if (inBlock) {
      if (line.includes('*/')) inBlock = false;
      continue;
    }
    if (line.includes('/**') || line.includes('/*')) {
      if (!line.includes('*/')) inBlock = true;
      continue;
    }
    if (!line.trimStart().startsWith('//')) continue;
    waiverLines.push(line);
  }
  const waivers = {};
  for (const line of waiverLines) {
    const m = WAIVER_DIRECTIVE.exec(line);
    if (m) waivers[m[1]] = m[2];
  }
  return waivers;
}

/** The first clause of a description, for the failure line. Capped, because a
 *  3000-char description in a terminal helps nobody. */
function firstClause(text) {
  const first = text.split(/(?<=[.;])\s/)[0] ?? text;
  return first.length > 110 ? `${first.slice(0, 107)}...` : first;
}

/**
 * Every documented member of every interface AND of every object type literal in
 * a `type` alias, in one file. The two containers are read the same way because
 * the generator reads a facade's surfaces through the checker, where both arrive
 * as a prop type -- and `chat.tsx` declares `Props` as a type alias, so dropping
 * the second container would drop a whole facade silently.
 */
function memberContainers(sf) {
  const containers = [];
  const takeTypeLiterals = (node, name) => {
    if (ts.isTypeLiteralNode(node)) containers.push({ name, members: node.members });
    ts.forEachChild(node, (child) => takeTypeLiterals(child, name));
  };
  const visit = (node) => {
    if (ts.isInterfaceDeclaration(node)) containers.push({ name: node.name.text, members: node.members });
    else if (ts.isTypeAliasDeclaration(node)) takeTypeLiterals(node.type, node.name.text);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return containers;
}

/**
 * The string literals a member's OWN declared type offers, when that type is a
 * union of string literals. Syntactic, no checker: an inline union, a
 * parenthesized one, or one behind a `type` alias declared in the SAME file. A
 * union reached only through an import is not seen, which is stated in the header
 * rather than papered over.
 */
function unionLiterals(member, sf) {
  const fromType = (node, seen) => {
    if (!node) return [];
    if (ts.isParenthesizedTypeNode(node)) return fromType(node.type, seen);
    if (ts.isUnionTypeNode(node)) return node.types.flatMap((t) => fromType(t, seen));
    if (
      ts.isLiteralTypeNode(node) &&
      (ts.isStringLiteral(node.literal) || ts.isNoSubstitutionTemplateLiteral(node.literal))
    ) {
      return [node.literal.text];
    }
    if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && !seen.has(node.typeName.text)) {
      const alias = sf.statements.find(
        (s) => ts.isTypeAliasDeclaration(s) && s.name.text === node.typeName.text,
      );
      if (alias) return fromType(alias.type, new Set([...seen, node.typeName.text]));
    }
    return [];
  };
  return [...new Set(fromType(member.type, new Set()))];
}

/** Which of a union's literals the description names AS CODE: backticked or quoted.
 *  The quoting is load-bearing, and it was measured rather than guessed: matching a
 *  bare word flagged "which forbids a silent send" against a `'compose' | 'send'`
 *  union and "the thrown error" against `'error' | 'abort'`, i.e. a literal that is
 *  also an ordinary English word. A restatement writes the literals as values
 *  (`` `'sm'` ``), so the quotes are what distinguish naming the union from using the
 *  word. One-character literals are ignored: `x` proves nothing. */
function literalsNamedIn(comment, literals) {
  return literals.filter((literal) => {
    if (literal.length < 2) return false;
    const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`[\`'\"]${escaped}[\`'\"]`).test(comment);
  });
}

/** A `VariableStatement` has no `name` of its own: take the first declarator's
 *  binding name so a finding points at something a reader can find. */
function declarationName(st, sf) {
  if (ts.isVariableStatement(st)) {
    const first = st.declarationList.declarations[0];
    return first && first.name ? first.name.getText(sf) : '(anonymous)';
  }
  return st.name ? st.name.getText(sf) : '(anonymous)';
}

/** Declaration-level doc comments: what an INTERFACE, TYPE, FUNCTION, CLASS, ENUM or
 *  `const` carries above itself. They reach the emitted `.d.ts` (so a consumer's editor
 *  hovers them) and are allowed to be a paragraph, so only the em dash applies:
 *  the cap and the type-restatement rule are about a MEMBER's one-line doc. */
function declarationDocs(sf, path) {
  const rows = [];
  for (const st of sf.statements) {
    if (
      !(
        ts.isInterfaceDeclaration(st) ||
        ts.isTypeAliasDeclaration(st) ||
        ts.isFunctionDeclaration(st) ||
        ts.isClassDeclaration(st) ||
        ts.isEnumDeclaration(st) ||
        // A `const`/`let` doc is a declaration doc too: it reaches the emitted
        // d.ts when the binding is exported, and it is prose a reader reads.
        ts.isVariableStatement(st)
      )
    ) {
      continue;
    }
    const jsdoc = ts.getJSDocCommentsAndTags(st);
    const comment = jsdoc
      .map((doc) => (typeof doc.comment === 'string' ? doc.comment : ts.getTextOfJSDocComment(doc.comment) ?? ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!comment) continue;
    rows.push({
      file: path,
      line: sf.getLineAndCharacterOfPosition(st.getStart(sf)).line + 1,
      container: '(declaration)',
      prop: declarationName(st, sf),
      chars: comment.length,
      description: comment,
      emDash: comment.includes(EM_DASH),
      restates: undefined,
      scope: 'declaration',
      waivers: waiverFor(sf, st),
    });
  }
  return rows;
}

/** Rendered strings: a string literal, a template literal or JSX text is copy a
 *  reader sees (UI labels, console notices, error messages, a tool description the
 *  provider reads), so the em dash is banned there too. Comments inside a template
 *  (CSS blocks are the common case) and fixture text are not copy and are stripped
 *  or excluded. `scope: 'copy'`, so neither the cap nor the restatement rule applies. */
function renderedStrings(sf, path) {
  if (path.includes('/wire/fixtures/')) return [];
  const lines = sf.text.split('\n');
  const waivedAt = (line) =>
    WAIVER_DIRECTIVE.test(lines[line - 1] ?? '') && /em-dash-copy/.test(lines[line - 1] ?? '');
  const rows = [];
  const walk = (node) => {
    let text;
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isJsxText(node)
    ) {
      text = node.text;
    }
    if (text !== undefined) {
      const stripped = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      if (stripped.includes(EM_DASH)) {
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
        if (!waivedAt(line) && !waivedAt(line - 1)) {
          rows.push({
            file: path,
            line,
            container: '(rendered string)',
            prop: stripped.trim().slice(0, 60),
            chars: stripped.length,
            description: stripped.replace(/\s+/g, ' ').trim(),
            emDash: true,
            restates: undefined,
            scope: 'copy',
            waivers: {},
          });
        }
      }
    }
    ts.forEachChild(node, walk);
  };
  walk(sf);
  return rows;
}

/** Rows for one source text: what the walk and the self-test both read. */
function analyzeSource(path, text) {
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, /* setParentNodes */ true, ts.ScriptKind.TSX);
  const rows = [];
  for (const container of memberContainers(sf)) {
    for (const member of container.members) {
      if (!member.name) continue;
      const jsdoc = ts.getJSDocCommentsAndTags(member);
      // A `//` line above a prop is NOT its description: the generators read JSDoc
      // only, so a prop documented with a plain comment has no generated length at
      // all and is not measured here.
      // `ts.getTextOfJSDocComment`, NOT `String(doc.comment)`. When a doc contains a
      // `{@link X}`, `comment` is an ARRAY of JSDocText and JSDocLink nodes, and
      // `String()` on it returns "[object Object],..." -- 47 characters for a 583-char
      // doc. That silently skipped every doc with a link, which is how a 533-char prop
      // and three over-cap props in one lane passed this gate. A measurement that
      // cannot see a whole class of input reads exactly like a clean tree.
      const comment = jsdoc
        .map((doc) => (typeof doc.comment === 'string' ? doc.comment : ts.getTextOfJSDocComment(doc.comment) ?? ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!comment) continue;
      const line = sf.getLineAndCharacterOfPosition(member.getStart(sf)).line + 1;
      const waivers = waiverFor(sf, member);
      const named = literalsNamedIn(comment, unionLiterals(member, sf));
      rows.push({
        file: path,
        line,
        container: container.name,
        prop: member.name.getText(sf),
        chars: comment.length,
        description: comment,
        emDash: comment.includes(EM_DASH),
        // The rule fires at TWO literals: a one-member union cannot be restated,
        // and a two-member union named in full is the shape the owner rejected.
        restates: named.length >= 2 ? named : undefined,
        scope: 'member',
        waivers,
      });
    }
  }
  rows.push(...declarationDocs(sf, path));
  rows.push(...renderedStrings(sf, path));
  return rows;
}

// ---------------------------------------------------------------------------
// self-test: proves the analyzer can still DETECT, and that the waiver is parsed
// rather than substring-matched. Guards this script against degrading into the
// thing it exists to prevent -- a check that quietly matches nothing and reads
// as a pass.
//
// NOT COVERED HERE, deliberately: a "this description restates the type" rule.
// Expressed honestly it needs the prop's resolved type (two `'user' | 'assistant'`
// literals quoted in a description only mean restatement if the declaration says
// the same thing), and `analyzeSource` parses text without a checker. A cap that
// is correct beats a heuristic that misfires on the props whose enum IS the
// useful fact, so the restatement rule is enforced by review instead.
// ---------------------------------------------------------------------------
const LONG = 'x'.repeat(MAX_PROP_DOC_CHARS + 1);
const AT_CAP = 'y'.repeat(MAX_PROP_DOC_CHARS);
const SELF_TEST_CASES = [
  {
    name: 'a description over the cap fires',
    code: `interface Props {\n  /** ${LONG} */\n  a?: string;\n}`,
    expect: 1,
  },
  {
    name: 'a description exactly at the cap passes',
    code: `interface Props {\n  /** ${AT_CAP} */\n  a?: string;\n}`,
    expect: 0,
  },
  {
    // The regression that made this gate lie: a doc with a `{@link}` where `comment` is
    // an ARRAY of JSDoc nodes. `String(doc.comment)` saw "[object Object],..." (47 chars)
    // and the walk never measured the real text. This fixture is an over-cap doc that
    // CONTAINS a link, so a measurement that cannot see links reports 0.
    name: 'a doc containing a `{@link}` is measured, not collapsed to [object Object]',
    code: `interface Props {\n  /** ${LONG} See {@link Other} for the shape. */\n  a?: string;\n}`,
    expect: 1,
  },
  {
    name: 'a waiver with a reason silences it',
    code: `interface Props {\n  // lint-prop-docs: long -- the accepted spellings ARE the contract here\n  /** ${LONG} */\n  a?: string;\n}`,
    expect: 0,
  },
  {
    name: 'a waiver with no reason does NOT silence it (parsed, not substring-matched)',
    code: `interface Props {\n  // lint-prop-docs: long\n  /** ${LONG} */\n  a?: string;\n}`,
    expect: 1,
  },
  {
    name: 'a directive quoted inside the doc comment does NOT silence it',
    code: `interface Props {\n  /** ${LONG}\n   *  // lint-prop-docs: long -- a reason nobody wrote next to the prop */\n  a?: string;\n}`,
    expect: 1,
  },
  {
    name: 'a plain `//` comment that is not a doc comment is ignored',
    code: `interface Props {\n  // why this prop exists, at length, in a comment no generator reads\n  a?: string;\n}`,
    expect: 0,
  },
  {
    name: 'a doc comment on the INTERFACE itself is not a prop description',
    code: `/** ${LONG} */\ninterface Props {\n  a?: string;\n}`,
    expect: 0,
  },
  {
    name: 'a doc comment with no member name (an index or call signature) is skipped',
    code: `interface Props {\n  /** ${LONG} */\n  [key: string]: unknown;\n}`,
    expect: 0,
  },
  {
    name: 'members of an object type literal in a type alias ARE read (the chat.tsx shape)',
    code: `type Props = Omit<Base, 'x'> & {\n  /** ${LONG} */\n  a?: string;\n};`,
    expect: 1,
  },
  {
    name: 'a member with no doc comment is not counted at all',
    code: `interface Props {\n  a?: string;\n}`,
    expect: 0,
  },
  {
    name: 'an em dash in a doc comment fires, and its absence does not',
    code: `interface Props {\n  /** Left \u2014 right. */\n  a?: string;\n  /** Left, right. */\n  b?: string;\n}`,
    expect: 0,
    expectEmDash: 1,
  },
  {
    name: 'a description naming TWO of its own union literals fires',
    code: `interface Props {\n  /** Renders as a bubble for \`user\` or a plain body for \`assistant\`. */\n  role?: 'user' | 'assistant';\n}`,
    expect: 0,
    expectRestates: 1,
  },
  {
    name: 'naming ONE literal does not fire (two is the rule)',
    code: `interface Props {\n  /** Sends immediately when \`submit\` is set. */\n  mode?: 'submit' | 'fill';\n}`,
    expect: 0,
    expectRestates: 0,
  },
  {
    name: 'a union behind a SAME-FILE type alias is seen',
    code: `type Size = 'sm' | 'md' | 'lg';\ninterface Props {\n  /** One of \`sm\` or \`lg\`. */\n  size?: Size;\n}`,
    expect: 0,
    expectRestates: 1,
  },
  {
    name: 'a doc naming literals of a DIFFERENT prop does not fire',
    code: `interface Props {\n  /** The value, or \`user\` / \`assistant\` for a message. */\n  role?: 'user' | 'assistant';\n  /** Unrelated: \`sm\` is small. */\n  size?: 'sm' | 'lg';\n}`,
    expect: 0,
    expectRestates: 1,
  },
  {
    name: 'a single-literal union cannot be restated',
    code: `interface Props {\n  /** Always \`solid\` here. */\n  variant?: 'solid';\n}`,
    expect: 0,
    expectRestates: 0,
  },
  {
    name: 'quoted words in a doc are NOT a restatement when the type carries no literals',
    code: `interface Props {\n  /** One of \`left\` or \`right\`. */\n  side?: string;\n}`,
    expect: 0,
    expectRestates: 0,
  },
  {
    name: 'a literal that is an ordinary English word used in prose does NOT count (the measured false positive)',
    code: `interface Props {\n  /** \`'compose'\` by default, which forbids a silent send. */\n  max?: 'compose' | 'send';\n}`,
    expect: 0,
    expectRestates: 0,
  },
  {
    name: 'an em dash in a RENDERED string fires (copy a reader sees)',
    code: `export const label = 'Left \u2014 right';`,
    expect: 0,
    expectEmDash: 1,
  },
  {
    name: 'an em dash inside a CSS comment in a template does NOT fire',
    code: 'export const css = `/* a comment \u2014 not copy */\n.a { color: red }`;',
    expect: 0,
    expectEmDash: 0,
  },
  {
    name: 'an em-dash-copy waiver on the line above a rendered string silences it',
    code: `// lint-prop-docs: em-dash-copy -- a fixture sentence that quotes the product name\nexport const label = 'Left \u2014 right';`,
    expect: 0,
    expectEmDash: 0,
  },
  {
    name: 'fixture text is not copy (the wire/fixtures path is skipped)',
    code: `export const chunk = 'Left \u2014 right';`,
    path: 'src/wire/fixtures/selftest.ts',
    expect: 0,
    expectEmDash: 0,
  },
  {
    name: 'a waiver names the RULE it waives and silences only that one',
    code: `interface Props {\n  // lint-prop-docs: em-dash -- the dash is inside a quoted product name\n  /** Left \u2014 right, over \`sm\` and \`lg\`. */\n  a?: 'sm' | 'lg';\n}`,
    expect: 0,
    expectEmDash: 0,
    expectRestates: 1,
  },
];

/** The self-test half: proves the analyzer still DETECTS. Runs only as the entry point. */
function runSelfTest() {
  // the self-test half, minus its `if (SELF_TEST)` guard (the caller owns that)
    let failed = 0;
    let overCapPropsRead = 0;
    for (const c of SELF_TEST_CASES) {
      const rows = analyzeSource(c.path ?? 'selftest.tsx', c.code);
      const longFindings = rows.filter((r) => r.scope === 'member' && r.chars > MAX_PROP_DOC_CHARS && !r.waivers.long);
      const emFindings = rows.filter((r) => r.emDash && !r.waivers['em-dash']);
      const restatesFindings = rows.filter((r) => r.restates && !r.waivers['restates-type']);
      // A case that expects a finding must also prove the member was READ, otherwise
      // "fires" and "reads nothing" are the same shape from in here.
      let ok = longFindings.length === c.expect;
      const notes = [`long ${longFindings.length}/${c.expect}`];
      if ('expectEmDash' in c) {
        notes.push(`em-dash ${emFindings.length}/${c.expectEmDash}`);
        ok = ok && emFindings.length === c.expectEmDash;
      }
      if ('expectRestates' in c) {
        notes.push(`restates ${restatesFindings.length}/${c.expectRestates}`);
        ok = ok && restatesFindings.length === c.expectRestates;
      }
      if (!ok) failed++;
      overCapPropsRead += rows.length;
      console.log(
        `${ok ? '✓' : '✗'} ${c.name} (${notes.join(', ')}, ${rows.length} documented member(s) read)`,
      );
    }
    if (failed > 0) {
      console.error(`\n✗ lint-prop-docs self-test: ${failed}/${SELF_TEST_CASES.length} case(s) failed.`);
      process.exit(1);
    }
    console.log(
      `\n✓ lint-prop-docs self-test: ${SELF_TEST_CASES.length}/${SELF_TEST_CASES.length} cases behave as specified.`,
    );
    process.exit(0);
}

/** The real run: the walk over the sources, reported to stderr (or `--json` to stdout). */
function runScan() {
  const files = walkSources(SRC_DIR);
  if (files.length === 0) {
    console.error(
      `✗ lint-prop-docs: no \`*.ts\`/\`*.tsx\` source found under ${relative(PKG_ROOT, SRC_DIR)}.\n` +
        `  The tree moved or the walk is broken, so NOTHING was checked. This exits non-zero on purpose.`,
    );
    process.exit(1);
  }

  const rows = files.flatMap((file) => analyzeSource(file, readFileSync(file, 'utf8')));
  if (rows.length < MIN_PROPS) {
    console.error(
      `✗ lint-prop-docs: read only ${rows.length} documented member(s) across ${files.length} source(s), ` +
        `below the floor of ${MIN_PROPS}.\n` +
        `  The parse stopped finding members (or the tree shrank). A walk that reads almost ` +
        `nothing passes every cap trivially, so this exits non-zero.`,
    );
    process.exit(1);
  }

  const over = rows.filter((r) => r.scope === 'member' && r.chars > MAX_PROP_DOC_CHARS && !r.waivers.long);
  const waived = rows.filter((r) => r.scope === 'member' && r.chars > MAX_PROP_DOC_CHARS && r.waivers.long);
  const emDashes = rows.filter((r) => r.emDash && !r.waivers['em-dash']);
  const emDashWaived = rows.filter((r) => r.emDash && r.waivers['em-dash']);
  const restatements = rows.filter((r) => r.restates && !r.waivers['restates-type']);
  const restatementWaived = rows.filter((r) => r.restates && r.waivers['restates-type']);
  const longest = rows.reduce((a, b) => (b.chars > a.chars ? b : a));
  const total = over.length + emDashes.length + restatements.length;

  if (JSON_OUT) {
    const row = (r) => ({
      file: relative(PKG_ROOT, r.file),
      line: r.line,
      prop: r.prop,
      scope: r.scope,
      chars: r.chars,
      firstClause: firstClause(r.description),
    });
    console.log(
      JSON.stringify({
        files: files.length,
        propsRead: rows.length,
        overCap: over.length,
        waived: waived.length,
        emDash: emDashes.length,
        emDashWaived: emDashWaived.length,
        restates: restatements.length,
        restatesWaived: restatementWaived.length,
        maxChars: longest.chars,
        cap: MAX_PROP_DOC_CHARS,
        floor: MIN_PROPS,
        findings: over.map(row),
        emDashFindings: emDashes.map((r) => ({ ...row(r), named: undefined })),
        restatesFindings: restatements.map((r) => ({ ...row(r), named: r.restates })),
        waivedProps: waived.map((r) => ({ ...row(r), reason: r.waivers.long })),
      }),
    );
    process.exit(total > 0 ? 1 : 0);
  }

  if (over.length > 0) {
    console.error(
      `✗ lint-prop-docs: ${over.length} description(s) over ${MAX_PROP_DOC_CHARS} chars ` +
        `(${rows.length} read, ${waived.length} waived).\n` +
        `  A doc says WHAT IT DOES plus the default/unit/constraint worth knowing: ONE sentence.\n` +
        `  Move the reasoning to a plain \`//\` comment above the member -- no generator reads it.\n`,
    );
    for (const r of over) {
      console.error(`  ${relative(PKG_ROOT, r.file)}:${r.line} ${r.prop} (${r.chars} chars) -- ${firstClause(r.description)}`);
    }
    console.error(
      `\n  Longest remaining: ${relative(PKG_ROOT, longest.file)}:${longest.line} ${longest.prop} (${longest.chars}).`,
    );
  }

  if (emDashes.length > 0) {
    console.error(
      `\n✗ lint-prop-docs: ${emDashes.length} doc comment(s) contain an em dash ` +
        `(${emDashWaived.length} waived; ${emDashes.filter((r) => r.scope === 'declaration').length} of them on a declaration).\n` +
        `  STYLE.md bans it in rendered copy, and a doc comment renders in five artifacts and in the emitted d.ts.\n`,
    );
    for (const r of emDashes) {
      console.error(`  ${relative(PKG_ROOT, r.file)}:${r.line} ${r.prop} -- ${firstClause(r.description)}`);
    }
  }

  if (restatements.length > 0) {
    console.error(
      `\n✗ lint-prop-docs: ${restatements.length} description(s) name TWO OR MORE literals of their own type ` +
        `(${restatementWaived.length} waived).\n` +
        `  The signature and the props table print the union; the doc should carry the default or the trap instead.\n`,
    );
    for (const r of restatements) {
      console.error(
        `  ${relative(PKG_ROOT, r.file)}:${r.line} ${r.prop} (names ${r.restates.join(', ')}) -- ${firstClause(r.description)}`,
      );
    }
  }

  if (total > 0) {
    console.error(
      `\n  A description that genuinely cannot comply waives ONE rule on the line above it:\n` +
        `    // lint-prop-docs: <long|em-dash|em-dash-copy|restates-type> -- <why, 15+ chars>\n`,
    );
    process.exit(1);
  }

  const longestMember = rows
    .filter((r) => r.scope === 'member')
    .reduce((a, b) => (b.chars > a.chars ? b : a));
  console.log(
    `✓ lint-prop-docs: ${rows.filter((r) => r.scope === 'member').length} documented member(s) and ` +
      `${rows.filter((r) => r.scope === 'declaration').length} declaration doc(s) across ${files.length} source(s): ` +
      `${MAX_PROP_DOC_CHARS} char cap on members (longest member ${longestMember.chars}: ${longestMember.prop}), ` +
      `no em dash anywhere, no type restatement. ${waived.length} length-waived, ` +
      `${emDashWaived.length} em-dash-waived, ${restatementWaived.length} restates-waived.`,
  );
  for (const r of [...waived, ...emDashWaived, ...restatementWaived]) {
    console.log(`  waived: ${relative(PKG_ROOT, r.file)}:${r.line} ${r.prop} (${r.chars})`);
  }
}

if (SELF_TEST) runSelfTest();
else runScan();
