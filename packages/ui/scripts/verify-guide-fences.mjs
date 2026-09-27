// COMPILE THE GUIDES' `ts` FENCES AGAINST THE KIT'S PUBLISHED TYPES.
//
//   node packages/ui/scripts/verify-guide-fences.mjs [--keep] [--mock <path>]
//   pnpm --filter @kitn.ai/ui run verify:guide-fences
//
// WHY IT EXISTS
// -------------
// The assistant block ships four seed conversations a developer reads in the
// rail and copies out of. They live in
// `packages/blocks/blocks/assistant/assistant.transport.mock.ts` as
// `GUIDE_SCRIPTS`, prose and fences both inside string literals — so no gate in
// this repo sees them. A renamed prop, a removed export, a signature that moved:
// the guide keeps teaching it, the reader's app stops building, and nothing red
// says which conversation and which line. That is the same failure this repo has
// already paid for four times on this branch (a story documenting a removed prop,
// a docs example rendering a composer with no Globe button, a block comment
// describing a microphone position that had moved, a plan naming a generator that
// writes a different file), and a guide is the worst of the five because the
// reader is a developer who copies the code.
//
// This gate exists because that class of defect is mechanically checkable, in the
// shape `verify-scaffold-compiles.mjs` already proved out: pull the fences out of
// the string literals, write them to real modules, and type-check them against the
// SHIPPED declarations through the shared consumer tsc harness.
//
// WHAT IT FOUND ON ITS FIRST RUN, because that is the argument for the file
// -------------------------------------------------------------------
// `Send a card` taught `cardTools(cards)`. The kit's two-argument form requires
// `{ provider }`, so the fence was a TS2345 AND a runtime throw ("an options
// object with a `provider` is required") in the reader's route. Fixed in the
// block, and the same line corrected in the storyboard it was copied from. No
// other gate in this repo could see it: the fence is a string literal, and the
// docs the fence was written from pass a provider in every example.
//
// A FENCE COMPILES IN ITS GUIDE'S DECLARED CONTEXT, NOT ALONE
// ----------------------------------------------------------
// "Every fence must compile as written" was the first version of this rule and the
// guides disproved it: each one names something from its host (`messages`,
// `transport`, `voice`, `pendingCalls`, `stream`, or a relative import of the
// block's own controller). A rule no fence can meet is an unmet rule, not a strict
// one. So every guide gets a PRELUDE — the block's own names, marked as such in
// the emitted module — and its fences compile on top of it.
//
// The boundary that buys: everything a fence claims about the KIT is verified
// (an export, a prop, an argument, a return type). Nothing is verified about the
// names the prelude declares, which is honest — those are the host's, and the
// guide says so. Two consequences are enforced rather than assumed:
//
//   · a fence that uses a kit function WITHOUT importing it must be a recorded
//     exception (EXCEPTIONS below), because its claim then rests on the prelude's
//     import rather than on the fence's own text;
//   · a name neither the fence nor the prelude declares is a FAILURE (TS2304),
//     not a quiet report: it means the fence was never compiled at all, which is
//     the vacuity this whole file is against.
//
// FRAGMENTS, AND THE ONE ACCEPTED EXCEPTION
// -----------------------------------------
// Some fences are deliberately excerpts of a surrounding file, and the prose says
// so ("These are the two differing lines of that route"). An excerpt is declared
// in EXCERPTS with the reason, and it is checked two ways: it must really be a
// fragment (the compiler must reject it as a whole unit), and the kit API it names
// must be imported by a fence this guide DOES compile. An UNDECLARED fragment is a
// hard failure, which is the point of the gate.
//
// The accepted exception is `createAssistantStream` / `readOpenAIStream` in
// `Get it running`: that fence is the block's own two lines, sitting under the
// controller's imports, so it names both without importing either. Their claims
// are verified by the fence compiling in the prelude's context — and they are
// listed by name here so the exception is a decision rather than an oversight.
//
// KIT ORIGIN IS WHAT GATES; EVERYTHING ELSE IS REPORTED
// ----------------------------------------------------
// A diagnostic is KIT-ORIGIN when its types or specifiers resolve into
// `packages/ui`'s own declarations — the rule `apps/docs`' docs-alignment gate
// already applies (scripts/docs-alignment/compile.mjs, `kitOrigin`), restated here
// because that gate is a docs-app script this package may not import. A diagnostic
// whose types come from TypeScript's libs or the reader's own code is reported and
// does NOT fail the run: that is a kit typing gap, and failing the guides for it
// would punish the wrong artefact. The live example is `Add voice`'s event fence —
// `voice.addEventListener('kai-transcription', (e) => e.detail.text)` is TS2339
// because the kit publishes the payload in `KaiVoiceInputElementEvents` but no
// `HTMLElementEventMap` entry, so no consumer can type that listener without a
// cast. Fixing it is a kit task; the guides stay as approved and this gate says so
// on every run. When the kit grows those entries the fence starts compiling and
// the report disappears — nothing here needs to change for that.
//
// THE TSC TRAP THIS FILE IS BUILT AROUND — do not "simplify" it away
// -----------------------------------------------------------------
// `tsc` on the command line suppresses EVERY semantic diagnostic in the program
// when any file in it has a syntax error. Measured, not assumed: with one fragment
// in a sandbox, a plant of `export const n: number = 'nope'` reported nothing.
// That means a single undeclared fragment would hide every type error in every
// other fence — a gate that goes green on the run where it matters least, and the
// reason this file drives the TypeScript API (`createProgram`) instead of the CLI:
// `getSyntacticDiagnostics()` and `getSemanticDiagnostics()` are separate calls, so
// a fragment cannot silence a type error.
//
// ANTI-VACUITY, the discipline every guard here carries
// -----------------------------------------------------
// A run that compiles nothing is not a pass, so the run refuses rather than reports:
//
//   · zero `ts` fences, or a guide with none, is a hard failure;
//   · the number of decoded fences must equal the number of ```` ```ts ```` openers
//     in the guide region of the source, so a decoder that drops one cannot pass;
//   · every ``` in the decoded text must belong to a fence, so an unclosed fence
//     is named rather than swallowing the rest of a guide;
//   · the consumer sandbox's own anti-theatre controls run first (types resolve
//     for real, `noUnusedLocals` is live);
//   · the ORIGIN CLASSIFIER is self-tested on planted defects that must and must
//     not classify as kit — without it, a broken classifier would report every
//     defect as "not the kit's" and the gate would pass by refusing to judge.
//
// COST. One consumer sandbox, two tsc programs (the fences, the classifier
// self-test) over ~10 tiny modules: seconds, not minutes, on an idle box.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createConsumerTsc } from './lib/consumer-tsc-projects.mjs';

const require = createRequire(import.meta.url);
// Loaded through Node's resolver rather than imported: the TypeScript API is used
// synchronously, deep inside the classification below.
const ts = require('typescript');

const HERE = dirname(fileURLToPath(import.meta.url));
const UI_ROOT = resolve(HERE, '..');
const REPO = resolve(UI_ROOT, '../..');

const argv = process.argv.slice(2);
const KEEP = argv.includes('--keep');
const MOCK_ARG = argv.indexOf('--mock');
const MOCK_PATH = MOCK_ARG > -1 ? resolve(argv[MOCK_ARG + 1]) : resolve(REPO, 'packages/blocks/blocks/assistant/assistant.transport.mock.ts');
const CONTROLLER_PATH = resolve(REPO, 'packages/blocks/blocks/assistant/assistant.controller.ts');

const die = (msg) => {
  console.error(`\n✗ verify-guide-fences: ${msg}\n`);
  process.exit(1);
};

// ─────────────────────────────────────────────────────────────────────────────
// The guides' host context, keyed by the question that opens each guide.
//
// THIS HALF IS THE BLOCK'S, NOT THE KIT'S, and the emitted module says so on its
// first line. The types are written as INLINE `import('…')` references on purpose:
// an inline type reference binds no name, so a prelude line can sit above a fence
// that imports or declares the same type without a duplicate-identifier error,
// which is what let the preludes stay one list per guide rather than a table of
// per-fence special cases.
//
// What each line is FOR is recorded at the line, because a name here is a claim
// about the host that the gate deliberately does not verify.
// ─────────────────────────────────────────────────────────────────────────────
const HOST_CONTEXT = {
  'how do i get this talking to my own backend?': [
    // The controller's own imports: the guide's last fence is those two lines.
    "import { createAssistantStream } from '@kitn.ai/ui/state';",
    "import { readOpenAIStream } from '@kitn.ai/ui/wire';",
    // The thread the controller holds, and the setter it wraps (assistant.controller.ts).
    "declare const messages: import('@kitn.ai/ui/state').ChatMessage[];",
    'declare const setMessages: (messages: import(\'@kitn.ai/ui/state\').ChatMessage[]) => void;',
    // The transport the controller imports — the file the guide is about.
    "declare const transport: import('./assistant.controller').AssistantTransport;",
  ],
  'which provider does this use? i want to point it at openrouter.': [
    "declare const messages: import('@kitn.ai/ui/state').ChatMessage[];",
    // The Anthropic route's system prompt: a top-level field, not a message.
    'declare const system: string;',
  ],
  'can users talk to this instead of typing?': [
    // The host page's import of the kit, which is what types the element (and its
    // tag) for `document.querySelector`.
    "import '@kitn.ai/ui/web-components';",
    "declare const voice: import('@kitn.ai/ui/web-components').KaiVoiceInputElement;",
    // The app's own handlers: what each event drives.
    'declare const setRecording: (recording: boolean) => void;',
    'declare const showPartial: (text: string) => void;',
    'declare const insert: (text: string) => void;',
    'declare const keep: (blob: Blob) => void;',
    'declare const report: (message: string) => void;',
  ],
  'can the model send a form instead of another paragraph?': [
    // The thread element the client configures, and the stream the tool loop folds into.
    "declare const chat: import('@kitn.ai/ui/web-components').KaiChatElement;",
    "declare const stream: import('@kitn.ai/ui/state').AssistantStream;",
    // The reader's own tool loop: the calls the stream announced, and their dispatch.
    'declare const pendingCalls: readonly { name: string; id: string; input?: Record<string, unknown> }[];',
    'declare const runTool: (name: string, input: Record<string, unknown>) => Promise<Record<string, unknown>>;',
  ],
};

// Fences that are deliberately EXCERPTS rather than whole units, keyed
// `<guide question>#<fence index>`. Each must really be a fragment, and the kit
// API it names must repeat in a fence the same guide compiles.
const EXCERPTS = {
  'which provider does this use? i want to point it at openrouter.#2': {
    why:
      'the prose says so: "These are the two differing lines of that route; the surrounding ' +
      'fetch is identical to the one above". Its kit API (`toAnthropicMessages`) is imported ' +
      'and used by this guide\'s first and second fences.',
  },
};

// Kit names a fence uses WITHOUT importing them, so their claim rests on the
// prelude's import of them rather than on the fence's own text. Named here rather
// than allowed silently: any other fence that does this fails the run.
const EXCEPTIONS = {
  'how do i get this talking to my own backend?#2': {
    createAssistantStream:
      'the block\'s own two lines, sitting under the controller\'s imports; the fence compiles ' +
      'in that context and the prelude\'s import of it is checked, which is the accepted exception.',
    readOpenAIStream: 'the same fence, the same reason: the controller imports it above these lines.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Extraction
// ─────────────────────────────────────────────────────────────────────────────

/** Escapes the guides actually use. An unknown one is a hard failure rather than
 *  a silently dropped character: a decoder that mangles a fence would compile a
 *  fiction and call the guide checked. */
const ESCAPES = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"', '`': '`', $: '$', 0: '\0' };

function decodeLiteral(raw) {
  const body = raw.slice(1, -1);
  let out = '';
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    const esc = body[i + 1];
    if (!(esc in ESCAPES)) die(`the decoder met an escape it does not know (\\${esc}) — teach it rather than dropping it`);
    out += ESCAPES[esc];
    i += 1;
  }
  return out;
}

/** Every guide's key and decoded text, from the `GUIDE_SCRIPTS` literal. */
function readGuides(source) {
  const start = source.indexOf('const GUIDE_SCRIPTS: Record<string, Script> = {');
  if (start === -1) die('`GUIDE_SCRIPTS` is not in the mock transport — did the declaration move?');
  const end = source.indexOf('\n};', start);
  if (end === -1) die('`GUIDE_SCRIPTS` has no closing `};` — the literal was restructured');
  const region = source.slice(start, end);

  const keys = [...region.matchAll(/^ {2}'([^']+)': \[/gm)].map((m) => ({ key: m[1], at: m.index }));
  if (!keys.length) die('no guide keys found inside GUIDE_SCRIPTS');

  return keys.map((entry, i) => {
    const slice = region.slice(entry.at, i + 1 < keys.length ? keys[i + 1].at : region.length);
    // The turns are `{ text: '…' + '…' }`, so the literals concatenate into the
    // turn text in order. Fences are found in that text, exactly as a reader sees
    // them in the rail.
    let text = '';
    for (const m of slice.matchAll(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g)) text += decodeLiteral(m[0]);

    const bodies = [...text.matchAll(/```(\w+)\n([\s\S]*?)```/g)].map((m) => ({ lang: m[1], body: m[2] }));
    const markers = (text.match(/```/g) ?? []).length;
    if (markers !== bodies.length * 2) {
      die(`guide "${entry.key}" has ${markers} fence markers but ${bodies.length} fences — an unclosed fence would swallow the rest of the guide`);
    }
    // The openers in the SOURCE, so a decoder that loses a fence cannot pass.
    const openers = (slice.match(/```ts\\n/g) ?? []).length;
    const tsBodies = bodies.filter((b) => b.lang === 'ts').length;
    if (openers !== tsBodies) {
      die(`guide "${entry.key}": ${openers} \`\`\`ts openers in the source but ${tsBodies} fences decoded — the extraction is dropping one`);
    }
    return { key: entry.key, bodies };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Origin: did this diagnostic come from the kit's own declarations?
// ─────────────────────────────────────────────────────────────────────────────

/** A declaration inside the kit's tree, and NOT inside a dependency installed in
 *  it: `packages/ui/node_modules/@types/node/...` is node's `Event`, not the kit's,
 *  and without this exclusion every `addEventListener` complaint reads as drift. */
const isKitFile = (file) => file.startsWith(UI_ROOT) && !file.includes('/node_modules/');

export function kitOrigin(diag, checker) {  const text = ts.flattenDiagnosticMessageText(diag.messageText, ' ');
  // Import-level drift needs no checker: the specifier IS the claim.
  if (/@kitn\.ai\/ui/.test(text) && [2305, 2306, 2307, 2614, 2694, 2724].includes(diag.code)) return 'import';
  // The expected type's own declaration, which is where an argument mismatch points.
  if (diag.relatedInformation?.some((r) => r.file && isKitFile(r.file.fileName))) return 'related';

  if (!diag.file || typeof diag.start !== 'number') return null;
  const node = nodeAtOrBelow(diag.file, diag.start);
  if (!node) return null;
  // The receiver of a property access, or the callee of a call: the type that
  // REJECTED the code, rather than the type that was rejected.
  const parent = node.parent;
  const candidates = [];
  if (parent && ts.isPropertyAccessExpression(parent) && parent.name === node) candidates.push(parent.expression);
  else if (parent && (ts.isCallExpression(parent) || ts.isNewExpression(parent))) candidates.push(parent.expression);
  else candidates.push(node);

  for (const candidate of candidates) {
    try {
      const files = [];
      const type = checker.getTypeAtLocation(candidate);
      for (const symbol of [type?.getSymbol?.(), type?.aliasSymbol].filter(Boolean)) {
        for (const decl of symbol.getDeclarations?.() ?? []) files.push(decl.getSourceFile().fileName);
      }
      for (const decl of checker.getSymbolAtLocation(candidate)?.getDeclarations?.() ?? []) files.push(decl.getSourceFile().fileName);
      if (files.some(isKitFile)) return 'type';
    } catch {
      // The checker can throw on a node from a file that failed to parse; the
      // diagnostic is then reported without an origin, which is the safe side.
    }
  }
  return null;
}

/** The innermost node containing `pos`. */
function nodeAtOrBelow(file, pos) {
  const visit = (node) => {
    if (pos < node.pos || pos >= node.end) return undefined;
    for (const child of node.getChildren(file)) {
      const found = visit(child);
      if (found) return found;
    }
    return node;
  };
  return visit(file);
}

// ─────────────────────────────────────────────────────────────────────────────
// The run
// ─────────────────────────────────────────────────────────────────────────────

const mockSource = (() => {
  if (!existsSync(MOCK_PATH)) die(`${MOCK_PATH} does not exist — the guides live in the assistant block's mock transport`);
  return readFileSync(MOCK_PATH, 'utf8');
})();const guides = readGuides(mockSource);

if (!guides.length) die('zero guides extracted');
const totalFences = guides.reduce((n, g) => n + g.bodies.filter((b) => b.lang === 'ts').length, 0);
if (totalFences === 0) {
  die(
    'ZERO `ts` fences extracted from the guides. This is a hard failure rather than a pass: a run ' +
      'that compiles nothing is exactly the green this gate exists to prevent.',
  );
}
for (const guide of guides) {
  if (!guide.bodies.some((b) => b.lang === 'ts')) die(`guide "${guide.key}" has no \`ts\` fence — either it teaches nothing checkable or the extraction missed it`);
  if (!HOST_CONTEXT[guide.key]) die(`guide "${guide.key}" has no declared host context — add its prelude to HOST_CONTEXT`);
}
for (const key of Object.keys(HOST_CONTEXT)) {
  if (!guides.some((g) => g.key === key)) die(`HOST_CONTEXT declares a prelude for a guide that is not in the mock: "${key}"`);
}

// The block's own contract type, read from the controller the guide imports it
// from, so the stub the fences resolve is the real interface rather than a copy.
const controllerSource = readFileSync(CONTROLLER_PATH, 'utf8');
const contractAt = controllerSource.indexOf('export interface AssistantTransport {');
if (contractAt === -1) die('`export interface AssistantTransport` is not in assistant.controller.ts — the guide imports this name');
const contractEnd = controllerSource.indexOf('\n}', contractAt);
if (contractEnd === -1) die('the AssistantTransport interface has no closing brace');
const contract = controllerSource.slice(contractAt, contractEnd + 2);

const tsc = createConsumerTsc({ keep: KEEP, fail: die });
const box = tsc.sandbox('default', 'guide-fences');

// The sandbox's own anti-theatre controls, in this directory, before anything is
// trusted: a sandbox whose types resolved to `any` passes every fence below.
const sandboxCheck = box.selfTest();
if (sandboxCheck.missed.length) {
  die(
    `the sandbox self-test did NOT fire (${sandboxCheck.missed.map((p) => p.file).join(', ')}). Every fence under it ` +
      `would pass vacuously. tsc said:\n${sandboxCheck.out || '(nothing)'}`,
  );
}

writeFileSync(
  join(box.dir, 'assistant.controller.ts'),
  `import type { ChatMessage } from '@kitn.ai/ui/state';\nimport type { StreamSource } from '@kitn.ai/ui/wire';\n\n// The block's own contract, extracted from the real controller.\n${contract}\n`,
);

/** The names a fence binds itself, so the prelude may not bind them too. */
function boundNames(code) {
  const names = new Set();
  for (const line of code.split('\n')) {
    let m = /^(?:export\s+)?(?:declare\s+)?(?:async\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)/.exec(line);
    if (!m) m = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/.exec(line);
    if (!m) m = /^(?:export\s+)?(?:interface|type|class|enum)\s+([A-Za-z_$][\w$]*)/.exec(line);
    if (m) names.add(m[1]);
    const destructured = /^(?:export\s+)?(?:const|let|var)\s*\{([^}]*)\}/.exec(line);
    if (destructured) for (const part of destructured[1].split(',')) names.add(part.split(':')[0].trim().replace(/^\.\.\./, ''));
  }
  for (const m of code.matchAll(/^import\s+(?:type\s+)?([^;]*?)\s+from\s+'[^']*';?/gm)) {
    const clause = m[1];
    const braces = /\{([^}]*)\}/.exec(clause);
    if (braces) for (const part of braces[1].split(',')) if (part.trim()) names.add(part.trim().split(/\s+as\s+/).pop().trim());
    const dflt = /^([A-Za-z_$][\w$]*)\s*,?$/.exec(clause.trim());
    if (dflt) names.add(dflt[1]);
  }
  return names;
}

/** Every VALUE binding in the emitted module, for the `void [...]` footer. A
 *  fence's import list is its claim (the kit exports these); its unused locals are
 *  the surrounding paragraph's ("the route hands these to the model"). `noUnusedLocals`
 *  is the consumer's real setting and stays on — the footer is the same technique
 *  the harness uses for lifted `<script>` bodies, never a way to switch it off. */
function footerNames(code) {
  const names = new Set();
  for (const line of code.split('\n')) {
    let m = /^(?:export\s+)?(?:async\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)/.exec(line);
    if (!m) m = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/.exec(line);
    if (!m) m = /^(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/.exec(line);
    if (!m) m = /^declare\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/.exec(line);
    if (m) names.add(m[1]);
  }
  for (const m of code.matchAll(/^import\s+(?!type\b)([^;]*?)\s+from\s+'[^']*';?/gm)) {
    const clause = m[1];
    const braces = /\{([^}]*)\}/.exec(clause);
    if (braces) for (const part of braces[1].split(',')) if (part.trim() && !/^type\s/.test(part.trim())) names.add(part.trim().split(/\s+as\s+/).pop().trim());
    const dflt = /^([A-Za-z_$][\w$]*)\s*,?$/.exec(clause.trim());
    if (dflt) names.add(dflt[1]);
  }
  return [...names];
}

const HEADER = "// ── HOST CONTEXT: the BLOCK's own names, declared to compile the guide's snippet. The kit's API is what the snippet itself names. ──";

// Emit every fence, and keep the line map that turns a tsc line number back into
// "guide, fence, line".
const emitted = [];
for (const guide of guides) {
  guide.bodies.forEach((fence, index) => {
    if (fence.lang !== 'ts') return;
    const id = `${guide.key}#${index}`;
    const binds = boundNames(fence.body);
    const prelude = HOST_CONTEXT[guide.key].filter((line) => {
      const declared = /^declare\s+const\s+([A-Za-z_$][\w$]*)/.exec(line);
      return !(declared && binds.has(declared[1]));
    });
    const file = `guide-${guides.indexOf(guide) + 1}-fence-${index + 1}.ts`;
    const bodyLines = fence.body.split('\n');
    const head = [HEADER, ...prelude, '', `// ── guide "${guide.key}" · fence ${index + 1} — the approved snippet, unchanged ──`, ...bodyLines];
    const names = footerNames(head.join('\n'));
    const footer = names.length ? ['', `void [${names.join(', ')}];`] : [];
    writeFileSync(join(box.dir, file), [...head, ...footer, ''].join('\n'));
    emitted.push({
      id,
      file,
      guide: guide.key,
      index,
      excerpt: EXCERPTS[id],
      body: fence.body,
      prelude,
      firstBodyLine: head.length - bodyLines.length + 1,
      lastBodyLine: head.length,
      footerNames: names,
    });
  });
}

// Every declared excerpt must be a fence this run actually extracted, or the
// marker is pointing at nothing (a fence deleted or renumbered).
for (const id of Object.keys(EXCERPTS)) {
  if (!emitted.some((f) => f.id === id)) die(`EXCERPTS names "${id}", which is not a \`ts\` fence in the guides any more`);
}
for (const id of Object.keys(EXCEPTIONS)) {
  if (!emitted.some((f) => f.id === id)) die(`EXCEPTIONS names "${id}", which is not a \`ts\` fence in the guides any more`);
}

// ── one program over every emitted module ────────────────────────────────────
const configPath = join(box.dir, 'tsconfig.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) die(`cannot read ${configPath}: ${ts.flattenDiagnosticMessageText(config.error.messageText, ' ')}`);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, box.dir);
if (parsed.errors.length) {
  die(`the sandbox tsconfig does not parse: ${parsed.errors.map((e) => ts.flattenDiagnosticMessageText(e.messageText, ' ')).join('; ')}`);
}
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();

const describe = (diag) => ts.flattenDiagnosticMessageText(diag.messageText, ' ');
const position = (diag) => ts.getLineAndCharacterOfPosition(diag.file, diag.start).line + 1;
const fileOf = (diag) => diag.file.fileName.split('/').pop();

/** Where a diagnostic sits in the emitted module: the fence body, or the gate's
 *  own scaffolding (prelude / footer / host stub), which is a gate defect. */
function locate(diag) {
  const entry = emitted.find((f) => f.file === fileOf(diag));
  if (!entry) return { where: 'stub', entry: null, line: position(diag) };
  const line = position(diag);
  if (line < entry.firstBodyLine) return { where: 'prelude', entry, line: line - 1 };
  if (line > entry.lastBodyLine) return { where: 'footer', entry, line };
  return { where: 'fence', entry, line: line - entry.firstBodyLine + 1 };
}

const label = (entry) => `guide "${entry.guide}" · fence ${entry.index + 1}`;
const gating = [];
const reported = [];

// Syntactic first: an undeclared fragment is a failure, and a declared excerpt
// must really be one.
const syntacticByFile = new Map();
for (const diag of program.getSyntacticDiagnostics()) {
  const file = fileOf(diag);
  if (!syntacticByFile.has(file)) syntacticByFile.set(file, []);
  syntacticByFile.get(file).push(diag);
}
for (const entry of emitted) {
  const diags = syntacticByFile.get(entry.file) ?? [];
  if (entry.excerpt && !diags.length) {
    gating.push(
      `${label(entry)} is recorded as an EXCERPT but compiles as a whole unit — the marker is stale. ` +
        `Either the fence became a unit (delete its EXCERPTS entry) or the excerpt marker is on the wrong fence.`,
    );
    continue;
  }
  if (entry.excerpt) continue;
  // One line per fence line: a fragment produces several parse diagnostics at the
  // same line, and repeating the message three times buries the fact that it is
  // one problem.
  const byLine = new Map();
  for (const diag of diags) {
    if (!byLine.has(position(diag))) byLine.set(position(diag), []);
    byLine.get(position(diag)).push(`TS${diag.code} ${describe(diag)}`);
  }
  for (const [line, messages] of byLine) {
    gating.push(
      `${label(entry)} line ${line - entry.firstBodyLine + 1}: does not parse as a unit — ${messages.join(' · ')}\n` +
        `    A fragment must be declared in EXCERPTS with the reason its surrounding sentence gives.`,
    );
  }
}

// Then the types. A declared excerpt is a fragment on purpose, so its own semantic
// noise means nothing; every other diagnostic is judged by where it came from.
for (const diag of program.getSemanticDiagnostics()) {
  const { where, entry, line } = locate(diag);
  if (where === 'stub') {
    gating.push(`the host stub failed to compile: TS${diag.code} ${describe(diag)}`);
    continue;
  }
  if (where !== 'fence') {
    gating.push(`${label(entry)} ${where} line ${line}: TS${diag.code} ${describe(diag)}\n    This is the gate's own scaffolding, not the guide's snippet.`);
    continue;
  }
  if (entry.excerpt) continue;

  const origin = kitOrigin(diag, checker);
  const where_ = `${label(entry)} line ${line}`;
  const named = describe(diag);
  if (origin) {
    gating.push(`${where_}: TS${diag.code} ${named}\n    The ${origin === 'import' ? 'specifier' : 'type'} comes from the kit's own declarations.`);
  } else if (diag.code === 2304 || diag.code === 2552) {
    // Not a kit type — but it means the fence was never compiled, which is the one
    // outcome this gate must never accept quietly.
    gating.push(
      `${where_}: TS${diag.code} ${named}\n` +
        `    The fence names something neither it nor its guide's prelude declares, so its claim was never compiled. ` +
        `Add the host name to HOST_CONTEXT, or import the kit's.`,
    );
  } else {
    reported.push(`${where_}: TS${diag.code} ${named}`);
  }
}

// A fence that uses a kit function without importing it rests on the prelude, so
// the exception is recorded rather than inferred.
for (const entry of emitted) {
  if (entry.excerpt) continue;
  const preludeImports = new Set();
  for (const line of entry.prelude) {
    for (const m of line.matchAll(/^import\s+(?:type\s+)?(?:\{[^}]*\}|([A-Za-z_$][\w$]*))\s+from\s+'@kitn\.ai\/ui\/[^']*'/g)) {
      const clause = /\{([^}]*)\}/.exec(m[0]);
      if (clause) for (const part of clause[1].split(',')) preludeImports.add(part.trim().split(/\s+as\s+/).pop().trim());
      else if (m[1]) preludeImports.add(m[1]);
    }
  }
  for (const name of preludeImports) {
    if (!new RegExp(`\\b${name}\\b`).test(entry.body)) continue;
    if (!EXCEPTIONS[entry.id]?.[name]) {
      gating.push(
        `${label(entry)}: uses \`${name}\` from the prelude without importing it. Import it in the fence, or record the ` +
          `exception in EXCEPTIONS with the reason — its claim otherwise rests on the gate's own scaffolding.`,
      );
    }
  }
}

// A declared excerpt's kit API must repeat in a fence this guide DOES compile.
for (const entry of emitted) {
  if (!entry.excerpt) continue;
  const compiledInGuide = emitted.filter((f) => f.guide === entry.guide && !f.excerpt);
  const kitNames = new Set();
  for (const fence of compiledInGuide) {
    for (const m of fence.body.matchAll(/^import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'@kitn\.ai\/ui\/[^']*'/gm)) {
      for (const part of m[1].split(',')) if (part.trim()) kitNames.add(part.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop().trim());
    }
  }
  const namedInExcerpt = [...kitNames].filter((name) => new RegExp(`\\b${name}\\b`).test(entry.body));
  if (!namedInExcerpt.length) {
    gating.push(
      `${label(entry)} is recorded as an EXCERPT (${entry.excerpt.why}) but the API it names is compiled nowhere in this ` +
        `guide, so nothing checks it. Either the excerpt is not an excerpt, or the fence that carries its API is missing.`,
    );
  }
}

// ── the origin classifier's own control ──────────────────────────────────────
// Two planted defects that MUST classify as kit and one that must not: a
// classifier that answered "not the kit's" to everything would turn the rule above
// into a gate that reports findings and fails on nothing.
const classifierBox = tsc.sandbox('default', 'classifier-probe');
writeFileSync(
  join(classifierBox.dir, 'probe-import.ts'),
  `import { noSuchThingAtAll } from '@kitn.ai/ui/wire';\nexport const x = noSuchThingAtAll;\n`,
);
writeFileSync(
  join(classifierBox.dir, 'probe-prop.ts'),
  `import type { KaiChatElement } from '@kitn.ai/ui/web-components';\ndeclare const chat: KaiChatElement;\nexport const y = chat.thisPropWasRemoved;\n`,
);
writeFileSync(join(classifierBox.dir, 'probe-plain.ts'), `export const z: number = 'not a number';\n`);
const classifierConfig = ts.parseJsonConfigFileContent(
  ts.readConfigFile(join(classifierBox.dir, 'tsconfig.json'), ts.sys.readFile).config,
  ts.sys,
  classifierBox.dir,
);
const classifierProgram = ts.createProgram(classifierConfig.fileNames, classifierConfig.options);
const classifierChecker = classifierProgram.getTypeChecker();
const origins = new Map();
for (const diag of classifierProgram.getSemanticDiagnostics()) {
  if (!fileOf(diag).startsWith('probe-')) continue;
  if (!origins.has(fileOf(diag))) origins.set(fileOf(diag), kitOrigin(diag, classifierChecker));
}
const expectations = [
  ['probe-import.ts', 'import', 'a specifier the kit does not export'],
  ['probe-prop.ts', 'type', 'a prop the kit does not declare'],
  ['probe-plain.ts', null, "the reader's own type error"],
];
for (const [file, expected, why] of expectations) {
  if (!origins.has(file)) {
    die(`the origin classifier's control produced no diagnostic for ${file} (${why}) — the plant is not in the program, so nothing is being tested`);
  }
  const got = origins.get(file);
  if (got !== expected) {
    die(
      `the origin classifier is broken: ${why} in ${file} classified as ${JSON.stringify(got)} instead of ` +
        `${JSON.stringify(expected)}. The kit-origin rule decides what fails, so this control is what keeps it from answering "not the kit's" to everything.`,
    );
  }
}
classifierBox.clear();

// ── report ───────────────────────────────────────────────────────────────────
const excerpts = emitted.filter((f) => f.excerpt).length;
console.log(
  `\n  ${guides.length} guides · ${emitted.length} ts fences · ${excerpts} declared excerpt${excerpts === 1 ? '' : 's'} · ` +
    `${emitted.length - excerpts} compiled against the kit's published types`,
);
for (const guide of guides) {
  const fences = emitted.filter((f) => f.guide === guide.key);
  console.log(`    "${guide.key}" — ${fences.length} fence${fences.length === 1 ? '' : 's'}${fences.some((f) => f.excerpt) ? ' (1 excerpt)' : ''}`);
}
if (reported.length) {
  console.log(`\n  REPORTED, NOT GATING (${reported.length}) — the types here are not the kit's, so this is a kit typing gap rather than a guide defect:`);
  for (const finding of reported) console.log(`    · ${finding}`);
}
if (gating.length) {
  console.error(`\n✗ verify-guide-fences: ${gating.length} finding${gating.length === 1 ? '' : 's'} — the guides teach something the kit does not have.\n`);
  for (const finding of gating) console.error(`  ${finding}\n`);
  tsc.cleanup();
  process.exit(1);
}
console.log(`\n  ✓ every guide's fence compiles against the kit's published types (${emitted.length - excerpts} compiled, ${reported.length} reported)\n`);
tsc.cleanup();
