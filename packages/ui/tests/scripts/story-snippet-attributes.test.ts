/**
 * GUARD — a `kai-*` ATTRIBUTE written in a story's snippet string must be one a
 * reader can copy and see do something.
 *
 * THE HOLE, AND WHY IT SURVIVED TWO NEIGHBOURING ROUNDS
 * -----------------------------------------------------
 * A story's Code panel shows a string literal (`parameters.docs.source.code`).
 * No compiler reads one: typed `kai-*` JSX checks a wrong literal at the CALL
 * SITE (that is what the `declare module 'solid-js/jsx-runtime'` block in
 * `src/web-components/web-component-types.d.ts` buys), and `story-snippet-imports`
 * checks the snippet's import line — but nothing looked at the attributes inside
 * the markup. So `<kai-badge variant="secondary">` sat in
 * `src/stories/showcase/lovable.stories.tsx` teaching an attribute value that
 * does not exist on that element (`variant` accepts `default | count | citation`).
 * A reader copies it, the element falls back to its default, and every check in
 * the repo stays green. This is the "docs must be true" class, one surface over
 * from the alignment gate that already reads `apps/docs` snippets — and these are
 * the snippets a consumer actually pastes.
 *
 * THERE IS NO SECOND PARSER HERE
 * ------------------------------
 * `apps/docs/scripts/docs-alignment/structural.mjs` already walks `kai-*` markup
 * out of a code string (`checkMarkup`), against a surface read at run time from
 * `web-component-meta.json` + the shipped `.d.ts` (`loadSurface` in
 * `surface.mjs`). That answers "does `<kai-x>` have an attribute called that".
 * What it could NOT answer is the defect above: `variant` DOES exist — the wrong
 * thing is its VALUE. So this file reuses both functions verbatim and adds the
 * one missing fact:
 *
 *   · `checkMarkup` — names, filtered to `via === 'attribute'`, i.e. names
 *     written inside a `<kai-x …>` opening tag. `via` exists so that a finding
 *     about `el.values = […]` (a real runtime property on `<kai-checkbox-group>`
 *     and `<kai-select>` that their Props interfaces never declare, so it is a
 *     defect in web-component-meta.json, not in the snippet) cannot be read as a
 *     snippet defect here.
 *   · `checkAttrValues` — the new half: a quoted attribute value against the
 *     closed string-literal union the element declares for that prop. The unions
 *     come from the `Kai<Name>ElementProps` interfaces in
 *     `web-component-types.d.ts` — the same declarations the Solid augmentation
 *     types its tags from, and the same file `loadSurface` only reads prop NAMES
 *     out of. Nothing is hand-listed.
 *
 * WHICH STRINGS ARE READ
 * ----------------------
 * Every string literal in a `.stories.tsx` (under the roots `story-roots.mjs`
 * derives from `.storybook/main.ts`) whose text contains a `<kai-x` opening tag —
 * NOT only `docs.source.code`. A description that names `<kai-badge
 * variant="secondary">` is telling the reader the same falsehood, so it is caught
 * too. Prose in a real comment is not read (only literals are), and a snippet
 * that teaches by counter-example stays quiet: `counterExampleLines` in the
 * shared parser exempts the lines a `Wrong:` / `Fails` style marker labels.
 *
 * WHAT THIS DOES NOT COVER — see the report beside the round that added this.
 * Short version: attribute values that are not closed unions (`string`, a
 * template-literal type, `(string & {})`) are unchecked; `{…}` expressions,
 * valueless and empty attributes are skipped; TSX/JS/Vue/Svelte snippets are
 * read for ATTRIBUTES only, so `el.prop = …` and `el.method()` inside a snippet
 * are the neighbouring guard's business.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { storyRoots } from '../../scripts/story-roots.mjs';
import {
  camelToKebab,
  kebabToCamel,
  loadSurface,
} from '../../../../apps/docs/scripts/docs-alignment/surface.mjs';
import {
  checkAttrValues,
  checkMarkup,
} from '../../../../apps/docs/scripts/docs-alignment/structural.mjs';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const surface = loadSurface(pkgRoot);

/** A prop's closed string-literal union, or null when it is not closed. */
function closedUnion(type: ts.TypeNode): Set<string> | undefined {
  const members = ts.isUnionTypeNode(type) ? type.types : [type];
  const values = new Set<string>();
  for (const m of members) {
    if (ts.isLiteralTypeNode(m) && ts.isStringLiteral(m.literal)) {
      values.add(m.literal.text);
      continue;
    }
    // `undefined` / `null` narrow an optional prop; anything else means the type
    // is not a closed set of literals and cannot answer "is this value valid".
    if (ts.isLiteralTypeNode(m) && m.literal.kind === ts.SyntaxKind.NullKeyword) continue;
    if (ts.isTypeReferenceNode(m) && (m.typeName as ts.Identifier).text === 'undefined') continue;
    if (m.kind === ts.SyntaxKind.UndefinedKeyword || m.kind === ts.SyntaxKind.NullKeyword) continue;
    return undefined;
  }
  return values.size ? values : undefined;
}

const typesFile = resolve(pkgRoot, 'src/web-components/web-component-types.d.ts');
const typesSource = ts.createSourceFile(typesFile, readFileSync(typesFile, 'utf8'), ts.ScriptTarget.Latest, true);

/** `Kai<Name>ElementProps` -> prop -> { name, values }, for closed unions only. */
const unionsByPropsName = new Map<string, Map<string, { name: string; values: Set<string> }>>();
/** `kai-x` -> `Kai<Name>ElementProps`, read off the Solid augmentation. */
const propsNameByTag = new Map<string, string>();

for (const stmt of typesSource.statements) {
  if (ts.isInterfaceDeclaration(stmt)) {
    const props = new Map<string, { name: string; values: Set<string> }>();
    for (const member of stmt.members) {
      if (!ts.isPropertySignature(member) || !member.name || !ts.isIdentifier(member.name) || !member.type) continue;
      const values = closedUnion(member.type);
      if (values) props.set(member.name.text, { name: member.name.text, values });
    }
    if (props.size) unionsByPropsName.set(stmt.name.text, props);
    continue;
  }
  // `declare module 'solid-js/jsx-runtime' { namespace JSX { interface
  // IntrinsicElements { 'kai-badge': KaiSolidElement<KaiBadgeElementProps, …> } } }`
  // — tagged names are NOT re-typed per framework: react, vue, svelte and solid
  // all point at these same `Kai<Name>ElementProps` interfaces, so reading the
  // tag->interface map off any one of them is reading all of them.
  if (!ts.isModuleDeclaration(stmt) || stmt.name.getText(typesSource) !== "'solid-js/jsx-runtime'") continue;
  const namespace = stmt.body;
  if (!namespace || !ts.isModuleBlock(namespace)) continue;
  for (const inner of namespace.statements) {
    if (!ts.isModuleDeclaration(inner) || !inner.body || !ts.isModuleBlock(inner.body)) continue;
    for (const el of inner.body.statements) {
      if (!ts.isInterfaceDeclaration(el) || el.name.text !== 'IntrinsicElements') continue;
      for (const member of el.members) {
        if (!ts.isPropertySignature(member) || !member.name || !ts.isStringLiteral(member.name) || !member.type) continue;
        const ref = member.type;
        if (!ts.isTypeReferenceNode(ref) || ref.typeArguments?.length !== 2) continue;
        const props = ref.typeArguments[0];
        if (ts.isTypeReferenceNode(props)) propsNameByTag.set(member.name.text, (props.typeName as ts.Identifier).text);
      }
    }
  }
}

const unionByTag = new Map<string, Map<string, { name: string; values: Set<string> }>>();
for (const [tag, propsName] of propsNameByTag) {
  const props = unionsByPropsName.get(propsName);
  if (props) unionByTag.set(tag, props);
}

function storyFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) storyFiles(p, out);
    else if (p.endsWith('.stories.tsx')) out.push(p);
  }
  return out;
}

interface Snippet {
  file: string;
  line: number;
  text: string;
}

/** Every string literal in a story file whose text contains a `kai-*` tag. */
const snippets: Snippet[] = [];
for (const file of storyRoots(pkgRoot).flatMap((dir) => storyFiles(dir)).sort()) {
  const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (node: ts.Node) => {
    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      /<kai-[a-z0-9-]+[\s/>]/.test(node.text)
    ) {
      snippets.push({
        file: file.replace(`${pkgRoot}/`, ''),
        line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
        text: node.text,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

interface Finding {
  kind: string;
  tag: string | null;
  detail: string;
  line: number;
  severity: string;
  file: string;
}

const findings: Finding[] = [];
for (const { file, line, text } of snippets) {
  // `lang: 'html'` is the strict reading — it is also what makes the
  // scalars-only-attributes contract checkable, and a snippet that writes
  // `messages="[…]">` is wrong in a TSX snippet too.
  for (const finding of checkMarkup({ code: text, startLine: line, surface, lang: 'html' })) {
    if (finding.via !== 'attribute') continue;
    // advisory = the element/prop is real but web-component-meta.json omits it.
    // That names a defect in the DECLARATION (generated from source), and the
    // only honest fix is there — see the file header.
    if (finding.severity === 'advisory') continue;
    findings.push({ ...finding, file });
  }
  for (const finding of checkAttrValues({ code: text, startLine: line, unionByTag })) {
    findings.push({ ...finding, file });
  }
}

describe('kai-* attributes inside Storybook snippets exist and take a declared value', () => {
  it('finds the snippets and the declarations at all (the rule is not vacuous)', () => {
    expect(snippets.length, 'no story string contained a kai-* tag').toBeGreaterThan(50);
    expect(new Set(snippets.map((s) => s.file)).size, 'snippets came from too few files').toBeGreaterThan(20);
    expect(unionByTag.size, 'no kai-* tag mapped to a Kai<Name>ElementProps interface').toBeGreaterThan(50);
    expect([...unionByTag.values()].some((props) => props.size > 0), 'no prop had a closed union').toBe(true);
  });

  it('every attribute name and every closed-union value is one the element declares', () => {
    const lines = findings
      .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
      .map((f) => `${f.severity} ${f.kind} ${f.file}:${f.line} ${f.detail}`);
    expect(lines).toEqual([]);
  });
});
