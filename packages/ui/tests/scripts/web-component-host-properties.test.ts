/**
 * GUARD — a host property a facade installs with `Object.defineProperty(element, 'x', …)`
 * must be a prop the API generator DECLARES for that element.
 *
 * THE HOLE. `scripts/gen-web-component-api.mjs` derives an element's props from the
 * `Props` interface in its facade (`membersOf(node.typeArguments?.[0])`) and from
 * nothing else, while the facade may install ANOTHER property straight onto the host —
 * `Object.defineProperty(element, …)`, which is how the kit spells the read/write
 * companion for the cases one `value` cannot represent. That name then exists at
 * runtime and appears in NO generated artifact: web-component-meta.json, the generated
 * `.d.ts`, the React wrappers, llms-full.txt, the MCP catalog. Two of them shipped on
 * one day — `values` on <kai-checkbox-group> and <kai-select>, declared at the source
 * in 3a2574f0 — and the measurement that found the class was a throwaway script in
 * /tmp, i.e. a fact with a shelf life.
 *
 * BOTH SIDES ARE DERIVED, AND NEITHER IS A HAND-TYPED LIST.
 *
 *   · runtime — `hostInstalls` below walks the facade's own AST: a facade is a call to
 *     `defineWebComponent` with a literal `kai-` tag, the host is whatever the render
 *     callback bound out of its `ctx` parameter (`const { element } = ctx`,
 *     `const { element: host } = ctx`, `const host = ctx.element`), and an install is
 *     an `Object.defineProperty(<that host>, 'literal-name')` inside that callback.
 *     The tag comes from the same call, so an install is attributed to the element
 *     whose callback contains it.
 *   · declared — the SAME read the generator performs: `membersOfNode` from
 *     `scripts/_ts-helpers.mjs` over `node.typeArguments?.[0]`, the `Props` type
 *     argument of that same call. On top of it, the one props source the generator
 *     adds that is NOT a facade's `Props`: the universal literal
 *     `const defaults = { theme, ...propDefaults }` in `define/define.tsx`
 *     (UNIVERSAL_PROPS there, `universalPropNames` here — see the note on that copy).
 *
 * THE FILES ARE DERIVED TOO. There is no skip list here: every `.ts`/`.tsx` under
 * `src/web-components` except `*.test.*` and `*.stories.*` is parsed, and a file
 * contributes only if it really calls `defineWebComponent` with a tag. That is a
 * deliberate difference from `gen-web-component-api.mjs`'s and
 * tests/web-components/prop-types-exported.test.ts's SKIP sets, which both exist to keep infra
 * files (`define.tsx`, `register.ts`, `chat-types.ts`, …) out of the manifest and have
 * to be re-copied whenever the layer grows a helper; the derived set cannot go stale
 * the same way, and a NEW facade is inside it the moment it calls the API.
 *
 * WHAT IT DOES NOT COVER — named, because the boundary is the point of this guard:
 *
 *   · a property whose NAME is computed (`Object.defineProperty(element, someName, …)`,
 *     or `Object.defineProperty(element, \`kai-${x}\`, …)`) is skipped: nothing static
 *     to compare against. Only the literal form is checked, and that is the form every
 *     install in the layer takes today.
 *   · the receiver must be bound out of the render callback's `ctx` — either spelling,
 *     `(props, ctx) => { const { element } = ctx; }` or `(props, { element }) => {}`.
 *     An install that happens somewhere else — a helper the callback passes the host
 *     to, `Object.defineProperties(element, { … })`, or a direct assignment
 *     `element.foo = …` — is invisible. The callback scope is deliberate: a
 *     `defineProperty` on some inner node is not a host property and must not report.
 *   · a METHOD installed through `ctx.expose({ … })` is not an inline `defineProperty`
 *     at all — `define.tsx` installs it — and the generator reads those off the
 *     `expose` literal into the element's `methods` list. That is a different declared
 *     side, checked by `method-docs-coverage` and `methods-typed`.
 *   · the DEFINE path, not the element. A name the `Props` interface declares but the
 *     facade never installs is not this guard's question — `prop-read-write-split` and
 *     the generator's own artifacts own the declared side.
 *   · a name declared by a path other than the two above reports as a gap here even if
 *     some artifact knows it. The two paths ARE the generator's model, so that is the
 *     intended red, not a false one.
 *
 * NOT THE SNIPPET CHECKER'S QUESTION. tests/scripts/story-snippet-attributes.test.ts
 * validates what a story teaches against `web-component-meta.json` (metadata → snippet);
 * this validates the metadata's own input against what the facades install at runtime
 * (runtime → metadata). They are the two directions of one fact and share NO machinery:
 * that check reads the built surface (`loadSurface`) and the shipped `.d.ts`, both of
 * which are downstream of the declaration this one compares against, so reusing them
 * would make it ask the declared side whether the declared side is right.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { createTsHelpers } from '../../scripts/_ts-helpers.mjs';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const webComponentsDir = resolve(pkgRoot, 'src/web-components');

/** A host property a facade installed at runtime. */
interface HostInstall {
  /** Absolute path of the facade that installs it. */
  file: string;
  /** The `kai-` tag whose render callback installs it. */
  tag: string;
  /** The property name, as written. */
  name: string;
  /** 1-based line of the install. */
  line: number;
}

const isTaggedFacadeCall = (node: ts.Node): node is ts.CallExpression =>
  ts.isCallExpression(node) &&
  ts.isIdentifier(node.expression) &&
  node.expression.text === 'defineWebComponent' &&
  !!node.arguments[0] &&
  ts.isStringLiteralLike(node.arguments[0]);

const isObjectDefineProperty = (node: ts.Node): node is ts.CallExpression =>
  ts.isCallExpression(node) &&
  ts.isPropertyAccessExpression(node.expression) &&
  ts.isIdentifier(node.expression.expression) &&
  node.expression.expression.text === 'Object' &&
  node.expression.name.text === 'defineProperty';

/** The host element's binding for a facade render callback: the locals bound to it, and
 *  the name of the `ctx` parameter itself when it was not destructured in place. */
type CtxBinding = {
  /** Locals bound to the host element. */
  hosts: Set<string>;
  /** Names of the whole `ctx` parameter. */
  ctxNames: Set<string>;
};

/**
 * Every local name bound to the render callback's host element, and the name of the
 * `ctx` parameter itself.
 *
 * Derived from the callback's own signature and body, so BOTH spellings in the layer
 * land here: `(props, ctx) => { const { element } = ctx; }` (and the aliases
 * `const { element: host } = ctx` and `const host = ctx.element`), and
 * `(props, { element, dispatch }) => { … }`, which is how `kai-pane-group` binds it and
 * which a body-only reader misses.
 *
 * A receiver nobody bound this way is NOT the host as far as this guard is concerned —
 * which is what keeps a property defined on an inner node out of the report.
 */
function hostNamesIn(render: ts.SignatureDeclaration): CtxBinding {
  const hosts = new Set<string>();
  const ctxNames = new Set<string>();
  const ctx = render.parameters[1];
  if (!ctx) return { hosts, ctxNames };

  const addFromBinding = (pattern: ts.ObjectBindingPattern) => {
    for (const el of pattern.elements) {
      const bound = el.name;
      if (!ts.isIdentifier(bound)) continue;
      const prop = el.propertyName ?? bound;
      if (ts.isIdentifier(prop) && prop.text === 'element') hosts.add(bound.text);
    }
  };

  const ctxBinding = ctx.name;
  // `(props, { element, flag }) => …` — the destructure IS the parameter.
  if (ts.isObjectBindingPattern(ctxBinding)) {
    addFromBinding(ctxBinding);
    return { hosts, ctxNames };
  }
  if (!ts.isIdentifier(ctxBinding)) return { hosts, ctxNames };
  const ctxName = ctxBinding.text;
  ctxNames.add(ctxName);

  const fromCtxElement = (node: ts.Node | undefined) =>
    !!node &&
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === ctxName &&
    node.name.text === 'element';

  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node)) {
      const init = node.initializer;
      const bound = node.name;
      if (init) {
        if (ts.isIdentifier(bound) && fromCtxElement(init)) hosts.add(bound.text);
        if (ts.isObjectBindingPattern(bound) && ts.isIdentifier(init) && init.text === ctxName) {
          addFromBinding(bound);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(render);
  return { hosts, ctxNames };
}

/**
 * The host properties one facade module installs at runtime, by walking its AST.
 *
 * Syntax only — no checker, no program — so a fixture source string can be run through
 * the same detector the tree-level assertions use.
 */
function hostInstalls(sourceFile: ts.SourceFile): HostInstall[] {
  const out: HostInstall[] = [];
  const line = (node: ts.Node) =>
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

  const visit = (node: ts.Node) => {
    if (isTaggedFacadeCall(node)) {
      const tag = (node.arguments[0] as ts.StringLiteralLike).text;
      const render = node.arguments[2];
      if (render && (ts.isArrowFunction(render) || ts.isFunctionExpression(render))) {
        const { hosts, ctxNames } = hostNamesIn(render);
        const isHost = (expr: ts.Expression | undefined) =>
          !!expr &&
          ((ts.isIdentifier(expr) && hosts.has(expr.text)) ||
            (ts.isPropertyAccessExpression(expr) &&
              ts.isIdentifier(expr.expression) &&
              ctxNames.has(expr.expression.text) &&
              expr.name.text === 'element'));
        const inner = (n: ts.Node) => {
          if (isObjectDefineProperty(n)) {
            const [target, key] = n.arguments;
            if (isHost(target) && key && ts.isStringLiteralLike(key)) {
              out.push({ file: sourceFile.fileName, tag, name: key.text, line: line(n) });
            }
          }
          ts.forEachChild(n, inner);
        };
        inner(render);
      }
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return out;
}

/** Installed names the declared set for that tag does not contain. */
const gapsIn = (installs: HostInstall[], declared: (tag: string) => ReadonlySet<string>) =>
  installs.filter((i) => !declared(i.tag).has(i.name));

// ---- the tree ---------------------------------------------------------------

const walkTsFiles = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) { walkTsFiles(full, out); continue; }
    if (!/\.[cm]?tsx?$/.test(entry.name)) continue;
    if (/\.(test|stories)\.[cm]?tsx?$/.test(entry.name)) continue;
    out.push(full);
  }
  return out;
};
const sourceFiles = walkTsFiles(webComponentsDir);

const tsconfig = ts.parseJsonConfigFileContent(
  ts.readConfigFile(resolve(pkgRoot, 'tsconfig.json'), ts.sys.readFile).config,
  ts.sys,
  pkgRoot,
);
const program = ts.createProgram(sourceFiles, { ...tsconfig.options, noEmit: true });
const checker = program.getTypeChecker();
const { membersOfNode } = createTsHelpers(program, checker, { importable: new Set<string>() });

/**
 * The one props source the generator adds that is not a facade's `Props`: the literal
 * `const defaults = { theme, ...propDefaults }` in `define/define.tsx`, which the
 * generator reads as UNIVERSAL_PROPS and prepends to every element's props. Every
 * element really carries these, so a facade installing one (a `theme` install would be
 * legitimate) must not report as a gap.
 *
 * THIS IS A COPY of that derivation, deliberately: it reaches the same literal by the
 * same marker (`...propDefaults`), and the alternative — importing
 * `scripts/gen-web-component-api.mjs` — would run the whole generator (a second full
 * parse, and a write to `dist/custom-elements.json`) inside the unit suite.
 */
function universalPropNames(): Set<string> {
  const sf = program.getSourceFile(resolve(webComponentsDir, 'define/define.tsx'));
  const names = new Set<string>();
  if (!sf) return names;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'defaults') {
      const init = node.initializer;
      if (init && ts.isObjectLiteralExpression(init)) {
        const props = init.properties;
        if (
          props.some((p) => ts.isSpreadAssignment(p) && p.expression.getText() === 'propDefaults')
        ) {
          for (const p of props) {
            if (ts.isSpreadAssignment(p)) continue;
            if ((ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && ts.isPropertyAssignment(p)) {
              names.add(p.name.text);
            }
          }
          return;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  expect(names.size, 'define/define.tsx holds no universal-props literal').toBeGreaterThan(0);
  return names;
}
const universalProps = universalPropNames();

/** tag -> the prop names the generator declares for it, read the way the generator reads them. */
const declaredByTag = new Map<string, Set<string>>();
for (const file of sourceFiles) {
  const sf = program.getSourceFile(file);
  if (!sf) continue;
  const visit = (node: ts.Node) => {
    if (isTaggedFacadeCall(node)) {
      const tag = (node.arguments[0] as ts.StringLiteralLike).text;
      const props: { name: string }[] = membersOfNode(node.typeArguments?.[0]);
      declaredByTag.set(tag, new Set([...universalProps, ...props.map((p) => p.name)]));
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

const installs = sourceFiles.flatMap((file) => {
  const sf = program.getSourceFile(file);
  return sf ? hostInstalls(sf) : [];
});

const describeGap = (i: HostInstall) =>
  `${i.tag} installs \`${i.name}\` with Object.defineProperty at ${i.file.slice(pkgRoot.length + 1)}:${i.line}, ` +
  `but its Props interface (what scripts/gen-web-component-api.mjs reads) does not declare it`;

describe('a host property installed by a facade is a prop the generator declares', () => {
  it('finds the runtime installs, not an empty set (the scan is not vacuous)', () => {
    // A wrong glob or a broken tag match finds zero installs and then EVERY assertion
    // below passes while checking nothing.
    expect(installs.length, 'no Object.defineProperty host install found in any facade').toBeGreaterThan(0);
    expect(declaredByTag.size, 'no tagged defineWebComponent call found').toBeGreaterThan(0);
    expect(universalProps.size).toBeGreaterThan(0);
  });

  it('reports no gap on today’s tree', () => {
    expect(gapsIn(installs, (tag) => declaredByTag.get(tag) ?? new Set()).map(describeGap)).toEqual([]);
  });

  it('finds the installs a literal walk is meant to find, and only those (fixture)', () => {
    // The last two fixture lines are the negative half, and they are why this runs the
    // detector rather than only the comparator: `node` is not the host (a property
    // defined on an inner node must stay out), and `dynamicName` has no static name to
    // compare. The first three are the spellings that DO name the host — bare, aliased,
    // and `ctx.element`.
    const sf = ts.createSourceFile(
      'fixture.tsx',
      [
        "defineWebComponent<Props, Events>('kai-fixture', {}, (props, ctx) => {",
        '  const { element, dispatch } = ctx;',
        '  const { element: host } = ctx;',
        "  Object.defineProperty(element, 'declared', { get: () => 1 });",
        "  Object.defineProperty(host, 'aliased', { get: () => 1 });",
        "  Object.defineProperty(ctx.element, 'viaCtx', { get: () => 1 });",
        "  Object.defineProperty(node, 'notTheHost', { get: () => 1 });",
        '  Object.defineProperty(element, dynamicName, { get: () => 1 });',
        '});',
        "defineWebComponent<Props, Events>('kai-destructured', {}, (props, { element }) => {",
        "  Object.defineProperty(element, 'paramBound', { get: () => 1 });",
        '});',
      ].join('\n'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    expect(hostInstalls(sf).map((i) => `${i.tag}:${i.name}`)).toEqual([
      'kai-fixture:declared',
      'kai-fixture:aliased',
      'kai-fixture:viaCtx',
      'kai-destructured:paramBound',
    ]);
  });

  it('flags an installed name the declared set lacks (fixture)', () => {
    const fixture: HostInstall[] = [
      { file: 'fixture.tsx', tag: 'kai-fixture', name: 'declared', line: 1 },
      { file: 'fixture.tsx', tag: 'kai-fixture', name: 'undeclared', line: 2 },
    ];
    const declared = (tag: string) =>
      new Set(tag === 'kai-fixture' ? ['declared'] : []);
    expect(gapsIn(fixture, declared).map((g) => g.name)).toEqual(['undeclared']);
  });
});
