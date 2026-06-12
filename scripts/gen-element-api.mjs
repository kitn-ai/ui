// Extracts the public API of every `defineKitnElement(...)` custom element from
// the facades in src/elements/, using the TypeScript compiler API, and emits:
//   - custom-elements.json          (Custom Elements Manifest, for IDE/tooling)
//   - src/elements/jsx-types.d.ts   (HTMLElementTagNameMap + per-element types)
//   - react/index.tsx               (typed React wrappers)
//
// Source of truth = the `Props`/`Events` interfaces + `dispatch('…')` calls in
// each facade. Run after the facades change.

import ts from 'typescript';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const elementsDir = resolve(root, 'src/elements');

// Facade files only (skip infra/helpers/stories).
const SKIP = new Set(['define.tsx', 'register.ts', 'css.ts', 'chat-types.ts', 'default-input.tsx']);
const facadeFiles = readdirSync(elementsDir)
  .filter((f) => (f.endsWith('.tsx') || f.endsWith('.ts')) && !f.endsWith('.stories.tsx') && !SKIP.has(f))
  .map((f) => resolve(elementsDir, f));

const tsconfig = ts.parseJsonConfigFileContent(
  ts.readConfigFile(resolve(root, 'tsconfig.json'), ts.sys.readFile).config,
  ts.sys,
  root,
);
const program = ts.createProgram(facadeFiles, { ...tsconfig.options, noEmit: true });
const checker = program.getTypeChecker();

const isScalar = (t) => {
  if (t.isUnion?.()) return t.types.every(isScalar);
  const F = ts.TypeFlags;
  return !!(t.flags & (F.String | F.Number | F.Boolean | F.StringLiteral | F.NumberLiteral | F.BooleanLiteral | F.Undefined | F.Any));
};
const toAttr = (name) => name.replace(/([A-Z])/g, '-$1').toLowerCase();
const jsdocOf = (sym) => ts.displayPartsToString(sym.getDocumentationComment(checker)).replace(/\s+/g, ' ').trim();

// The kit's exported object types — kept by name (consumers import them). Other
// named object types (local interfaces like Step/Skill) get expanded inline;
// string-literal-union aliases (ProseSize, Mode…) also expand; lib types
// (Uint8Array, Blob, Promise, AsyncIterable) stay opaque.
const IMPORTS = {
  ModelOption: '../types',
  ConversationSummary: '../types',
  ConversationGroup: '../types',
  AttachmentData: '../components/attachments',
  ToolPart: '../components/tool',
  SlashCommandItem: '../components/slash-command',
  ChatMessage: './chat-types',
  ChatMessageAction: './chat-types',
};
const IMPORTABLE = new Set(Object.keys(IMPORTS));

const isLibSym = (sym) => {
  const d = sym?.declarations?.[0];
  return !!d && program.isSourceFileDefaultLibrary(d.getSourceFile());
};

function renderType(type, decl) {
  if (type.isUnion()) return [...new Set(type.types.map((t) => renderType(t, decl)))].join(' | ');
  if (checker.isArrayType(type)) return `${renderType(checker.getTypeArguments(type)[0], decl)}[]`;
  const sym = type.aliasSymbol || type.getSymbol();
  const name = sym?.getName();
  if (name && IMPORTABLE.has(name)) return name;
  if (
    type.flags & ts.TypeFlags.Object &&
    type.getCallSignatures().length === 0 &&
    !isLibSym(sym) &&
    type.getProperties().length
  ) {
    const props = type.getProperties().map((s) => {
      const t = checker.getTypeOfSymbolAtLocation(s, s.valueDeclaration ?? decl);
      const opt = s.flags & ts.SymbolFlags.Optional ? '?' : '';
      return `${s.name}${opt}: ${renderType(t, decl)}`;
    });
    return `{ ${props.join('; ')} }`;
  }
  return checker.typeToString(type, decl, ts.TypeFormatFlags.NoTruncation);
}

const membersOf = (typeNode) => {
  if (!typeNode) return [];
  const type = checker.getTypeFromTypeNode(typeNode);
  return type.getProperties().map((sym) => {
    const decl = sym.valueDeclaration ?? sym.declarations?.[0] ?? typeNode;
    const t = checker.getTypeOfSymbolAtLocation(sym, decl);
    return {
      name: sym.name,
      type: renderType(t, decl),
      optional: !!(sym.flags & ts.SymbolFlags.Optional),
      scalar: isScalar(t),
      description: jsdocOf(sym),
    };
  });
};

// collect dispatch('name') literals per source file
const dispatchNames = (sourceFile) => {
  const names = new Set();
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'dispatch') {
      const arg = node.arguments[0];
      if (arg && ts.isStringLiteralLike(arg)) names.add(arg.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return names;
};

const elements = [];
for (const file of facadeFiles) {
  const sf = program.getSourceFile(file);
  if (!sf) continue;
  const fileDispatch = dispatchNames(sf);
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'defineKitnElement'
    ) {
      const tagArg = node.arguments[0];
      if (!tagArg || !ts.isStringLiteralLike(tagArg)) return;
      const tag = tagArg.text;
      const props = membersOf(node.typeArguments?.[0]);
      const typedEvents = membersOf(node.typeArguments?.[1]);
      const detailByName = new Map(typedEvents.map((e) => [e.name, e]));
      // union of typed events and dispatch() literals seen in the file
      const eventNames = new Set([...typedEvents.map((e) => e.name), ...fileDispatch]);
      const events = [...eventNames].sort().map((name) => {
        const ev = detailByName.get(name);
        const detail = ev ? ev.type : 'unknown';
        return { name, detail: detail === 'void' ? null : detail, description: ev?.description ?? '' };
      });
      elements.push({ tag, className: tagToClass(tag), props, events });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}
elements.sort((a, b) => a.tag.localeCompare(b.tag));

function tagToClass(tag) {
  return tag.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join('') + 'Element';
}

// ---- emit custom-elements.json ----
const cem = {
  schemaVersion: '1.0.0',
  readme: '',
  modules: [{
    kind: 'javascript-module',
    path: 'dist/kitn-chat.es.js',
    declarations: elements.map((el) => ({
      kind: 'class',
      customElement: true,
      tagName: el.tag,
      name: el.className,
      description: '',
      members: el.props.map((p) => ({
        kind: 'field',
        name: p.name,
        type: { text: p.type },
        description: p.description,
        privacy: 'public',
      })),
      attributes: [
        { name: 'theme', type: { text: "'light' | 'dark' | 'auto'" }, description: 'Color mode (auto follows prefers-color-scheme).' },
        ...el.props.filter((p) => p.scalar).map((p) => ({
          name: toAttr(p.name), fieldName: p.name, type: { text: p.type }, description: p.description,
        })),
      ],
      events: el.events.map((e) => ({
        name: e.name,
        type: { text: e.detail ? `CustomEvent<${e.detail}>` : 'CustomEvent' },
        description: e.description,
      })),
    })),
  }],
};
mkdirSync(resolve(root, 'dist'), { recursive: true });
writeFileSync(resolve(root, 'dist/custom-elements.json'), JSON.stringify(cem, null, 2) + '\n');
console.log(`✓ dist/custom-elements.json — ${elements.length} elements`);

export { elements, toAttr, tagToClass, IMPORTS };

// run the sibling generators if present (types + react)
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.env.DUMP) {
    writeFileSync(resolve(root, '.element-meta.json'), JSON.stringify(elements, null, 2));
    console.log('✓ dumped .element-meta.json');
  }
  for (const mod of ['./gen-element-types.mjs', './gen-element-react.mjs']) {
    try {
      const m = await import(mod);
      if (m.writeTypes) m.writeTypes(root, elements, toAttr);
      if (m.writeReact) m.writeReact(root, elements);
    } catch (e) {
      if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
    }
  }
}
