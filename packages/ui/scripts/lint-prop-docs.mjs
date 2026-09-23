// Prop-DOC LENGTH guard, for the web-component facades.
//
// WHY. One prop doc comment is generated into FIVE artifacts: the element meta,
// `llms-full.txt` (what an agent reads), the MCP catalog, the docs site prop
// table, and Storybook. So the cost of a rambling comment is not one comment, it
// is five copies of prose nobody asked for, and the tree this was written for
// averaged a long paragraph per prop. A caller reads a prop table to find out
// what a prop DOES, not why the kit chose to have one.
//
// THE RULE
// A prop doc comment says WHAT IT DOES plus only the facts a caller cannot
// infer: the default, a unit, a constraint, or the one trap that would bite.
// ONE sentence, <= 160 whitespace-collapsed characters. The REASONING is not
// deleted -- it MOVES to a plain `//` comment directly above the prop, which no
// generator reads, so the next engineer keeps the same facts while the five
// artifacts lose the essay.
//
// Restating the type is the most common way a description gets long and adds
// nothing: the signature already prints the union, so a description enumerating
// it is bytes in five artifacts for no information. That is a REVIEW rule, not
// an enforced one -- see the note on `--self-test` below for why it is not
// machine-checked here.
//
// SCOPE, and the hole stated rather than discovered:
//   COVERED: `src/web-components/**/*.tsx` AND `src/components/**/*.tsx`. Every
//     documented member of an interface, plus every documented member of an object
//     type literal carried by a `type` alias -- `chat.tsx` declares its `Props` that
//     way (`type Props = Omit<...> & { ... }`), so an interface-only walk would have
//     silently skipped the whole facade, and a walk that skips a file reads exactly
//     like a clean file.
//     The two roots were split for one release so the web-component artifacts could
//     be regenerated on their own; the Solid half is now covered too, because its
//     long tail was the larger one (200 of 823 descriptions over the cap, the worst
//     at 1196 chars) and it reaches Storybook on every story AND the element meta
//     through every prop a facade inherits from a shared Solid type. That inheritance
//     is why the facade-side pass alone measured 11 offenders: the text is not in the
//     facade, it is in the Solid interface the facade spreads.
//
//   A `{@link X}` IN A DOC IS MEASURED, via `ts.getTextOfJSDocComment`. It used to be
//     measured by `String(doc.comment)`, which returns "[object Object],..." for a doc
//     whose comment is an array of JSDoc nodes: those docs read as 47 characters, so the
//     gate could not see them at all. Two lanes found it (one had three over-cap props
//     hidden by it, the other a 533-char prop), and the self-test now carries a case so
//     the regression cannot come back.
//
//   WHICH `.ts` FILES ARE OUT, and why this walk is `.tsx`-only: every facade is a
//     `.tsx`, and a hand-written `.ts` member's JSDoc reaches the five artifacts only
//     when a facade references its type. What a reference pulls in is the GENERATED
//     `web-component-types.d.ts`, an artifact -- walking it would enforce the cap on
//     generated text (and on the generator) instead of on the source anyone edits, so
//     it is excluded here and the generated output follows the facades. That leaves a
//     small third slice: `chat/chat-types.ts`, `slots/slots.ts`, `define/slot-text.ts`
//     and `web-component/diagnostic-events.ts` carry long member docs today.
//
// THE WAIVER, and why it is a parsed directive rather than prose:
//   // lint-prop-docs: long -- <reason>
// on a `//` line in the comment block directly above the prop. It covers THAT
// prop only. A reason is required: `lint-prop-docs: long` alone does not waive,
// because the shape of a suppression that survives review is one whose reason
// somebody had to write down. Waived props are COUNTED and PRINTED, so the number
// is visible in CI output and can only shrink.
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

const WEB_COMPONENTS_DIR = join(PKG_ROOT, 'src/web-components');

/** The Solid components. Both roots are walked: a prop's doc comment has ONE
 *  source, and for a facade that inherits its props that source is here. */
const COMPONENTS_DIR = join(PKG_ROOT, 'src/components');

/** Hard cap, whitespace-collapsed. ~100 is the target; this is where it fails. */
const MAX_PROP_DOC_CHARS = 160;

/** The floor the walk must clear, so a parse that stopped finding members cannot
 *  read as a clean tree. Deliberately far below the real count and far above
 *  zero: a rename that halves the tree is a real problem, a handful of props
 *  disappearing is a normal refactor. */
const MIN_PROPS_READ = 500;

/** The floor THIS run enforces: `MIN_PROPS_READ` unless a fixture overrode it. */
const MIN_PROPS = Number(argOf('--min-props') ?? MIN_PROPS_READ);

/** `// lint-prop-docs: long -- <reason>`. Parsed, not substring-matched: the
 *  reason must be present and non-empty. A line that is INSIDE the doc comment
 *  block is not a waiver line (see `waiverFor`). */
const WAIVER_DIRECTIVE = /^\s*\/\/\s*lint-prop-docs:\s*long\s*--\s+(\S.*?)\s*$/;

const isTestish = (name) => /\.(test|stories)\.tsx$/.test(name) || /\.declarative\.test\.tsx$/.test(name);

/** Every `*.tsx` under `dir`, tests and stories excluded. Recursive: the layer is
 *  organised in family folders, and a flat readdir would emit a 0-file walk. */
function walkFacades(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFacades(full));
    else if (entry.name.endsWith('.tsx') && !isTestish(entry.name)) out.push(full);
  }
  return out.sort();
}

/**
 * The `//` lines directly above `member` that are WAIVERS. Taken from the
 * member's leading trivia, excluding anything inside a doc comment block: a
 * directive written inside the doc comment IS the description, and letting it
 * waive would mean a prop could silence its own cap while still shipping the
 * bytes to five artifacts.
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
  for (const line of waiverLines) {
    const m = WAIVER_DIRECTIVE.exec(line);
    if (m) return m[1];
  }
  return undefined;
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
      rows.push({
        file: path,
        line,
        container: container.name,
        prop: member.name.getText(sf),
        chars: comment.length,
        description: comment,
        waiver: waiverFor(sf, member),
      });
    }
  }
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
];

/** The self-test half: proves the analyzer still DETECTS. Runs only as the entry point. */
function runSelfTest() {
  // the self-test half, minus its `if (SELF_TEST)` guard (the caller owns that)
    let failed = 0;
    let overCapPropsRead = 0;
    for (const c of SELF_TEST_CASES) {
      const rows = analyzeSource('selftest.tsx', c.code);
      const findings = rows.filter((r) => r.chars > MAX_PROP_DOC_CHARS && !r.waiver);
      // A case that expects a finding must also prove the member was READ, otherwise
      // "fires" and "reads nothing" are the same shape from in here.
      const ok = findings.length === c.expect;
      if (!ok) failed++;
      overCapPropsRead += rows.length;
      console.log(
        `${ok ? '✓' : '✗'} ${c.name} (expected ${c.expect} finding(s), got ${findings.length}, ` +
          `${rows.length} documented member(s) read)`,
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

/** The real run: the walk over the facades, reported to stderr (or `--json` to stdout). */
function runScan() {
  const files = [...walkFacades(WEB_COMPONENTS_DIR), ...walkFacades(COMPONENTS_DIR)];
  if (files.length === 0) {
    console.error(
      `✗ lint-prop-docs: no \`*.tsx\` facade found under ${relative(PKG_ROOT, WEB_COMPONENTS_DIR)}.\n` +
        `  The tree moved or the walk is broken, so NOTHING was checked. This exits non-zero on purpose.`,
    );
    process.exit(1);
  }

  const rows = files.flatMap((file) => analyzeSource(file, readFileSync(file, 'utf8')));
  if (rows.length < MIN_PROPS) {
    console.error(
      `✗ lint-prop-docs: read only ${rows.length} documented prop(s) across ${files.length} facade(s), ` +
        `below the floor of ${MIN_PROPS}.\n` +
        `  The parse stopped finding prop members (or the tree shrank). A walk that reads almost ` +
        `nothing passes every cap trivially, so this exits non-zero.`,
    );
    process.exit(1);
  }

  const over = rows.filter((r) => r.chars > MAX_PROP_DOC_CHARS && !r.waiver);
  const waived = rows.filter((r) => r.chars > MAX_PROP_DOC_CHARS && r.waiver);
  const longest = rows.reduce((a, b) => (b.chars > a.chars ? b : a));

  if (JSON_OUT) {
    console.log(
      JSON.stringify({
        files: files.length,
        propsRead: rows.length,
        overCap: over.length,
        waived: waived.length,
        maxChars: longest.chars,
        cap: MAX_PROP_DOC_CHARS,
        floor: MIN_PROPS,
        findings: over.map((r) => ({
          file: relative(PKG_ROOT, r.file),
          line: r.line,
          prop: r.prop,
          chars: r.chars,
          firstClause: firstClause(r.description),
        })),
        waivedProps: waived.map((r) => ({
          file: relative(PKG_ROOT, r.file),
          line: r.line,
          prop: r.prop,
          chars: r.chars,
          reason: r.waiver,
        })),
      }),
    );
    process.exit(over.length > 0 ? 1 : 0);
  }

  if (over.length > 0) {
    console.error(
      `✗ lint-prop-docs: ${over.length} prop description(s) over ${MAX_PROP_DOC_CHARS} chars ` +
        `(${rows.length} read, ${waived.length} waived).\n` +
        `  A prop doc says WHAT IT DOES plus the default/unit/constraint worth knowing: ONE sentence.\n` +
        `  Move the reasoning to a plain \`//\` comment above the prop -- no generator reads it.\n`,
    );
    for (const r of over) {
      console.error(`  ${relative(PKG_ROOT, r.file)}:${r.line} ${r.prop} (${r.chars} chars) -- ${firstClause(r.description)}`);
    }
    console.error(
      `\n  Longest remaining: ${relative(PKG_ROOT, longest.file)}:${longest.line} ${longest.prop} (${longest.chars}).`,
    );
    process.exit(1);
  }

  console.log(
    `✓ lint-prop-docs: ${rows.length} prop description(s) across ${files.length} facade(s) within ` +
      `${MAX_PROP_DOC_CHARS} chars (longest ${longest.chars}: ${longest.prop}), ${waived.length} waived.`,
  );
  for (const r of waived) {
    console.log(`  waived: ${relative(PKG_ROOT, r.file)}:${r.line} ${r.prop} (${r.chars}) -- ${r.waiver}`);
  }
}

if (SELF_TEST) runSelfTest();
else runScan();
