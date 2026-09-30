/**
 * GUARD: every read-only member a facade installs with `exposeState({ ... })` must be
 * TYPED through the shipped types, and typed as read-only.
 *
 * `ctx.exposeState` puts getter-only accessors on the host (`el.canGoBack`). The type is
 * derived by `scripts/gen-web-component-api.mjs` from each getter's return type, so
 * there is no table to keep in step. Without the generator half, the member exists at
 * runtime and is `TS2339 Property 'canGoBack' does not exist on type 'KaiArtifactElement'`
 * for every consumer: the same shape of hole `methods-typed.test.ts` closed for methods.
 *
 * The expected list is READ FROM THE FACADE SOURCES (a TypeScript AST walk for
 * `exposeState({...})` literals), not from the model under test, so a key the generator
 * silently drops still fails here.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const WC_DIR = resolve(pkgRoot, 'src/web-components');
const SRC_TYPES = resolve(WC_DIR, 'web-component-types.d.ts');
const DIST_TYPES = resolve(pkgRoot, 'dist/web-components.d.ts');

interface Meta {
  tag: string;
  className: string;
  state?: { name: string; type: string; readonly?: boolean; description: string }[];
}
const meta: Meta[] = JSON.parse(readFileSync(resolve(WC_DIR, 'web-component-meta.json'), 'utf8'));

function* facadeFiles(dir: string): Generator<string> {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* facadeFiles(p);
    else if (/\.tsx?$/.test(f) && !/\.(test|stories)\./.test(f) && !f.endsWith('.d.ts')) yield p;
  }
}

/** tag -> the keys of every `exposeState({...})` literal inside that `defineWebComponent(tag, …)`. */
function declaredState(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const file of facadeFiles(WC_DIR)) {
    const text = readFileSync(file, 'utf8');
    if (!text.includes('exposeState(')) continue;
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node, tag?: string) => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'defineWebComponent' &&
        node.arguments[0] &&
        ts.isStringLiteralLike(node.arguments[0])
      ) {
        tag = node.arguments[0].text;
      }
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'exposeState' &&
        node.arguments[0] &&
        ts.isObjectLiteralExpression(node.arguments[0]) &&
        tag
      ) {
        const keys = node.arguments[0].properties.map((p) => (p.name as ts.Identifier).text);
        out.set(tag, [...(out.get(tag) ?? []), ...keys]);
      }
      ts.forEachChild(node, (c) => visit(c, tag));
    };
    visit(sf);
  }
  return out;
}

function interfaceBody(source: string, className: string): string {
  const marker = `export interface ${className} extends HTMLElement {`;
  const start = source.indexOf(marker);
  expect(start, `${className} not found in the generated types`).toBeGreaterThan(-1);
  return source.slice(start + marker.length, source.indexOf('\n}', start));
}

const OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: ['lib.esnext.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
  strict: true,
  skipLibCheck: true,
  noEmit: true,
  types: [],
};

function diagnose(typesFile: string, snippet: string): string[] {
  const dir = dirname(typesFile);
  const base = typesFile.slice(dir.length + 1).replace(/\.d\.ts$/, '');
  const probePath = join(dir, '__state-probe.ts');
  const text = snippet.replace('./TYPES', `./${base}`);
  const host = ts.createCompilerHost(OPTIONS, true);
  const readFile = host.readFile.bind(host);
  const fileExists = host.fileExists.bind(host);
  const getSourceFile = host.getSourceFile.bind(host);
  host.readFile = (f) => (f === probePath ? text : readFile(f));
  host.fileExists = (f) => (f === probePath ? true : fileExists(f));
  host.getSourceFile = (f, v, e, s) =>
    f === probePath ? ts.createSourceFile(f, text, v, true, ts.ScriptKind.TS) : getSourceFile(f, v, e, s);
  const program = ts.createProgram([probePath], OPTIONS, host);
  return ts
    .getPreEmitDiagnostics(program)
    .map((d) => `TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ').split('\n')[0]}`);
}

const CONSUMER = `import './TYPES';
const el = document.createElement('kai-artifact');
const back: boolean = el.canGoBack;
const fwd: boolean = el.canGoForward;
const safe: boolean = el.urlSafe;
const url: string = el.url;
void [back, fwd, safe, url];
`;
const WRITES = `import './TYPES';
const el = document.createElement('kai-artifact');
el.canGoBack = true;
el.url = 'x';
el.definitelyNotState;
`;

describe('exposeState members are typed, read-only, and derived', () => {
  const declared = declaredState();

  it('finds the facades that use exposeState (a walk that finds none proves nothing)', () => {
    expect(declared.get('kai-artifact')).toEqual(
      expect.arrayContaining(['url', 'urlSafe', 'canGoBack', 'canGoForward']),
    );
  });

  it('every exposeState key reaches the meta and the generated element interface as `readonly`', () => {
    const source = readFileSync(SRC_TYPES, 'utf8');
    const missing: string[] = [];
    for (const [tag, keys] of declared) {
      const el = meta.find((e) => e.tag === tag);
      if (!el) {
        missing.push(`${tag} (no element in the meta)`);
        continue;
      }
      const body = interfaceBody(source, el.className);
      for (const key of keys) {
        const m = el.state?.find((s) => s.name === key);
        if (!m || !m.readonly) missing.push(`${tag}.${key} (meta)`);
        if (!new RegExp(`^\\s{2}readonly ${key}: `, 'm').test(body)) missing.push(`${tag}.${key} (types)`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('a state member is never emitted as a prop (not settable, not an attribute)', () => {
    for (const [tag, keys] of declared) {
      const el = meta.find((e) => e.tag === tag) as unknown as { props: { name: string }[] };
      for (const key of keys) expect(el.props.map((p) => p.name)).not.toContain(key);
    }
  });

  for (const [label, file] of [
    ['src/web-components/web-component-types.d.ts', SRC_TYPES],
    ['dist/web-components.d.ts', DIST_TYPES],
  ] as const) {
    it(`${label}: a consumer reads the members typed; writing one is rejected`, () => {
      if (file === DIST_TYPES && !existsSync(file)) return; // build-only artifact
      expect(diagnose(file, CONSUMER)).toEqual([]);
      const errors = diagnose(file, WRITES).join('\n');
      expect(errors).toMatch(/TS2540/); // read-only property
      expect(errors).toMatch(/definitelyNotState|TS2339/); // no catch-all index signature
    });
  }
});
