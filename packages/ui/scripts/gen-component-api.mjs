// Extracts the public API of every SolidJS component (src/components/*) and UI
// primitive (src/ui/*) re-exported from src/index.ts, using the TypeScript
// compiler API, and emits src/components/component-meta.json.
//
// Phase 2 of the spec system (the web-component sibling is gen-element-api.mjs).
// Unlike the facades, plain Solid components aren't a uniform marker:
//   - inputs are PROPS (some are callbacks: function-typed `onX` → the outputs);
//   - slots are `children`;
//   - components routinely `extends JSX.HTMLAttributes`, which floods the props
//     type with ~450 inherited DOM attributes — we keep only members DECLARED in
//     the project's own source and flag the HTML passthrough as a note.
//
// Source of truth for "which components are public" = the named exports of
// src/index.ts whose symbol resolves to a PascalCase component function under
// ./components/ or ./ui/.

import ts from 'typescript';
import { writeFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTsHelpers } from './_ts-helpers.mjs';
import { shorten } from './gen-web-components-md.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Component-specific design tokens (everything else is themed by the global
// --color-* set; see the Theming → Token Reference story). Keyed by export name.
const COMPONENT_TOKENS = {
  Tool: ['--color-tool-blue', '--color-tool-amber', '--color-tool-green', '--color-tool-red'],
  CodeBlock: ['--color-code-foreground'],
  CodeBlockCode: ['--color-code-foreground'],
  ConversationList: ['--color-sidebar', '--color-scrollbar-thumb', '--color-scrollbar-thumb-hover'],
  ConversationItem: ['--color-sidebar'],
};

// Styling escape-hatches documented globally (Theming), not per-prop.
const STYLING_PROPS = new Set(['class', 'classList', 'style']);

// A callback prop = a function-typed input (the component's "outputs").
const isCallbackType = (type) => /=>/.test(type) && !type.trim().startsWith('{');

// Normalize a `?? <default>` right-hand side (or a @default tag) to a short
// display string, mirroring gen-element-api's defaultText.
function normalizeDefault(raw) {
  if (!raw) return undefined;
  const s = raw.trim();
  if (s === 'undefined' || s === 'null') return undefined;
  if (/^\[\s*\]$/.test(s)) return '[]';
  if (/^\{\s*\}$/.test(s)) return '{}';
  if (/^\[/.test(s)) return '[…]';
  if (/^\{/.test(s)) return '{…}';
  return s; // string/number/boolean literal as written
}

// Scan a function body's source text for best-effort defaults: `props.x ?? lit`
// or `local.x ?? lit` (components default via ?? / splitProps, not a defaults
// object literal). Literals only — skips `?? someCall()`.
function defaultsFromBody(bodyText) {
  const out = {};
  const re = /(?:props|local)\.(\w+)\s*\?\?\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|true|false|-?\d[\d_.]*|\[[^\]]*\]|\{[^}]*\})/g;
  let m;
  while ((m = re.exec(bodyText))) {
    if (out[m[1]] === undefined) out[m[1]] = normalizeDefault(m[2]);
  }
  return out;
}

// Does the body pull `children` out via splitProps(props, [..., 'children'])?
function splitPropsHasChildren(bodyText) {
  const m = bodyText.match(/splitProps\s*\(\s*props\s*,\s*\[([^\]]*)\]/);
  return !!m && /['"]children['"]/.test(m[1]);
}

// Find a function-like declaration (and its first param) for a component symbol.
function fnDeclOf(sym) {
  for (const d of sym.declarations ?? []) {
    if (ts.isFunctionDeclaration(d) && d.parameters.length) return d;
    if (ts.isVariableDeclaration(d) && d.initializer &&
        (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)) &&
        d.initializer.parameters.length) return d.initializer;
  }
  return null;
}

export function generate() {
  const indexFile = resolve(root, 'src/index.ts');
  const tsconfig = ts.parseJsonConfigFileContent(
    ts.readConfigFile(resolve(root, 'tsconfig.json'), ts.sys.readFile).config,
    ts.sys, root,
  );
  const program = ts.createProgram([indexFile], { ...tsconfig.options, noEmit: true });
  const checker = program.getTypeChecker();
  const { membersOfType, jsdocOf } = createTsHelpers(program, checker);

  const sf = program.getSourceFile(indexFile);
  const moduleSym = checker.getSymbolAtLocation(sf);
  const exports = checker.getExportsOfModule(moduleSym);

  // A member is "own" (documented) if declared in the project's own source —
  // this drops the inherited DOM/JSX attribute flood from `extends JSX.*`.
  const ownDecl = (sym) => {
    const d = sym.valueDeclaration ?? sym.declarations?.[0];
    if (!d) return false;
    const file = d.getSourceFile();
    return !program.isSourceFileDefaultLibrary(file) && !file.fileName.includes('/node_modules/');
  };

  const components = [];
  for (const ex of exports) {
    const name = ex.getName();
    if (!/^[A-Z]/.test(name)) continue; // components are PascalCase (skips hooks, cn, *Variants, get*)
    let sym = ex;
    if (sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
    const decl = sym.declarations?.[0];
    if (!decl) continue;
    const srcRel = relative(root, decl.getSourceFile().fileName);
    const group = srcRel.startsWith('src/components/') ? 'Components'
                : srcRel.startsWith('src/ui/') ? 'UI' : null;
    if (!group) continue;
    const fn = fnDeclOf(sym);
    if (!fn) continue; // type-only / non-function export

    const param = fn.parameters[0];
    const propsType = checker.getTypeAtLocation(param);
    const allProps = propsType.getProperties();
    const own = membersOfType(propsType, param, ownDecl);
    const htmlAttrCount = allProps.length - own.length;
    const extendsHtmlAttributes = htmlAttrCount > 30; // the ~450-member DOM flood

    const bodyText = fn.body ? fn.body.getText() : '';
    const defaults = defaultsFromBody(bodyText);

    const props = [];
    const callbacks = [];
    const slots = [];
    let hasOwnChildren = false;

    for (const m of own) {
      if (m.name === 'children') {
        hasOwnChildren = true;
        slots.push({ name: 'children', description: m.description });
        continue;
      }
      if (STYLING_PROPS.has(m.name)) continue; // documented globally (Theming)
      const displayType = shorten(m.type);
      if (isCallbackType(m.type)) {
        callbacks.push({ name: m.name, type: m.type, displayType, description: m.description });
      } else {
        const entry = { name: m.name, type: m.type, displayType, optional: m.optional, scalar: m.scalar, description: m.description };
        if (defaults[m.name] !== undefined) entry.default = defaults[m.name];
        props.push(entry);
      }
    }

    // children slot can also arrive via splitProps without an own member.
    if (!hasOwnChildren && splitPropsHasChildren(bodyText)) {
      slots.push({ name: 'children', description: '' });
    }

    components.push({
      name, group, sourceFile: srcRel,
      props, callbacks, slots,
      tokens: COMPONENT_TOKENS[name] ?? [],
      extendsHtmlAttributes,
      description: jsdocOf(sym),
    });
  }

  components.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));

  const outPath = resolve(root, 'src/components/component-meta.json');
  writeFileSync(outPath, JSON.stringify(components, null, 2) + '\n');
  console.log(`✓ src/components/component-meta.json — ${components.length} components`);
  return components;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generate();
}
