/**
 * GUARD — `el.addEventListener('kai-…', e => e.detail.…)` must type-check with NO
 * cast through the generated types alone.
 *
 * That call is the pattern the kit's own guides teach ("kit events don't bubble —
 * listen on the element itself"), and it did not compile. The generated
 * `web-component-types.d.ts` declared every payload type (`KaiChatElementEvents`,
 * `KaiVoiceInputElementEvents`) for the Vue template layer and nothing
 * `addEventListener` resolves against, so `e` was `Event`:
 *
 *   TS2339  Property 'detail' does not exist on type 'Event'.
 *
 * The generator now emits both halves of the fix (scripts/gen-web-component-types.mjs):
 * a per-element `<ClassName>EventMap` + typed add/removeEventListener overloads, and a
 * global HTMLElementEventMap entry for every name whose payload is the same on every
 * element that fires it. The consumer snippet below is the whole assertion — the
 * ABSENCE of a cast, an `any` and a `@ts-expect-error` IS what is being checked.
 *
 * Three checks, because the snippet alone can pass over a broken surface:
 *   1. the consumer snippets compile against BOTH generated copies,
 *   2. POSITIVE CONTROLS — a misspelled event name still takes a plain `Event`, and a
 *      per-element payload is that ELEMENT's, not a sibling's — so an accidental
 *      `[k: string]: unknown` on the element interfaces cannot make 1 vacuous,
 *   3. coverage, derived from web-component-meta.json rather than restated: every
 *      declared event reaches its element's map, and the global block's key set is
 *      exactly the names whose payload is unique — so a new event cannot skip the
 *      types and a conflicting name cannot silently appear on the global one.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
// The generator's own type normaliser, so this check cannot disagree with the artifact
// about whether two elements gave an event the same payload.
import { cleanEmittedType as clean } from '../../scripts/_ts-helpers.mjs';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SRC_TYPES = resolve(pkgRoot, 'src/web-components/web-component-types.d.ts');
const DIST_TYPES = resolve(pkgRoot, 'dist/web-components.d.ts');

interface WebComponentMeta {
  tag: string;
  className: string;
  events?: { name: string; detail: string | null }[];
}
const meta: WebComponentMeta[] = JSON.parse(
  readFileSync(resolve(pkgRoot, 'src/web-components/web-component-meta.json'), 'utf8'),
);

/** `detail: 'unknown'` means the generator inferred the name from a file-scoped
 *  `dispatch(…)` literal rather than reading a declaration on THIS element (e.g.
 *  kai-resizable-item picks up its parent's events that way). Those are not emitted
 *  onto the element; the element that declared the name is the source. */
const declares = (el: WebComponentMeta) => (el.events ?? []).filter((e) => e.detail !== 'unknown');

/** What a consumer writes. `skipLibCheck: true` on purpose — the setting every
 *  consumer template ships, so this is the compilation THEY get. */
const CONSUMER_SNIPPET = `import './TYPES';

const voice = document.querySelector('kai-voice-input');
voice?.addEventListener('kai-recording-change', (e) => {
  const recording: boolean = e.detail.recording;
  void recording;
});

const chat = document.createElement('kai-chat');
chat.addEventListener('kai-submit', (e) => {
  const text: string = e.detail.value;
  void text;
});

// document.getElementById is a plain HTMLElement — the case the global
// HTMLElementEventMap half exists for, and the shape the guides use.
const byId = document.getElementById('voice');
byId?.addEventListener('kai-recording-change', (e) => {
  const recording: boolean = e.detail.recording;
  void recording;
});

// The DOM's own events must stay typed on an upgraded element: the per-element
// listener overloads shadow HTMLElement's, so this is the regression they risk.
voice?.addEventListener('click', (e) => {
  const x: number = e.clientX;
  void x;
});

// The cross-element maximize protocol. Both entries used to be hand-authored in
// src/web-components/resizable/resizable.globals.d.ts; they are generated now, and the
// state one is declared on kai-resizable but dispatched onto the item, so it has to
// arrive through the global map rather than the item's own.
const panel = document.createElement('kai-resizable');
panel.addEventListener('kai-maximize-intent', (e) => {
  const requested: boolean = e.detail.requested;
  void requested;
});
const item = document.createElement('kai-resizable-item');
item.addEventListener('kai-maximize-state', (e) => {
  const maximized: boolean = e.detail.maximized;
  void maximized;
});
`;

const WRONG_SNIPPET = `import './TYPES';

const voice = document.querySelector('kai-voice-input');

// A name the kit does not fire is not a catch-all: the listener still takes an Event.
voice?.addEventListener('kai-not-a-real-event', (e) => {
  const recording: boolean = e.detail.recording;
  void recording;
});

// Per-element is the point: kai-change on kai-checkbox carries \`checked\`, NOT the
// \`sizes\` payload kai-resizable gives the same name.
const checkbox = document.createElement('kai-checkbox');
checkbox.addEventListener('kai-change', (e) => {
  const sizes: number[] = e.detail.sizes;
  void sizes;
});
`;

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

/** Compile `snippet` against `typesFile` in memory (no temp files on disk). */
function diagnose(typesFile: string, snippet: string): string[] {
  const dir = dirname(typesFile);
  const base = typesFile.slice(dir.length + 1).replace(/\.d\.ts$/, '');
  const probePath = join(dir, '__event-map-probe.ts');
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
  return ts.getPreEmitDiagnostics(program).map((d) => {
    const where =
      d.file && d.start !== undefined
        ? `${d.file.fileName.replace(`${pkgRoot}/`, '')}(${
            ts.getLineAndCharacterOfPosition(d.file, d.start).line + 1
          })`
        : '<no file>';
    return `TS${d.code} ${where}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ').split('\n')[0]}`;
  });
}

/** The member list of one generated `export interface … { … }`, by its opening line. */
function interfaceBody(source: string, opening: string): string | null {
  const start = source.indexOf(opening);
  if (start === -1) return null;
  const end = source.indexOf('\n}', start);
  return source.slice(start + opening.length, end);
}

/** Every key of the generated global HTMLElementEventMap block. */
function globalEventNames(source: string): string[] {
  const marker = 'declare global {\n  interface HTMLElementEventMap {';
  const body = interfaceBody(source, marker);
  expect(body, 'no HTMLElementEventMap augmentation in the generated types').not.toBeNull();
  return [...body!.matchAll(/^ {4}'([^']+)':/gm)].map((m) => m[1]);
}

/** Names whose DECLARED payload is the same on every element that declares them. */
function namesWithOnePayload(): { global: string[]; perElementOnly: string[] } {
  const payloads = new Map<string, Set<string>>();
  for (const el of meta) {
    for (const e of declares(el)) {
      if (!payloads.has(e.name)) payloads.set(e.name, new Set());
      payloads.get(e.name)!.add(e.detail ? clean(e.detail, false) : '');
    }
  }
  const names = [...payloads.keys()].sort();
  return {
    global: names.filter((n) => payloads.get(n)!.size === 1),
    perElementOnly: names.filter((n) => payloads.get(n)!.size > 1),
  };
}

describe('kit events are typed for addEventListener through the generated types', () => {
  for (const [label, file] of [
    ['src/web-components/web-component-types.d.ts', SRC_TYPES],
    ['dist/web-components.d.ts', DIST_TYPES],
  ] as const) {
    describe(label, () => {
      it('a consumer reading e.detail with no cast compiles', () => {
        if (file === DIST_TYPES && !existsSync(file)) return; // build-only artifact
        expect(diagnose(file, CONSUMER_SNIPPET)).toEqual([]);
      });

      it('POSITIVE CONTROL: an unknown name and a sibling element payload are still rejected', () => {
        if (file === DIST_TYPES && !existsSync(file)) return;
        const errors = diagnose(file, WRONG_SNIPPET).join('\n');
        // `e.detail` on the Event the string overload hands back, and the payload of a
        // DIFFERENT element's kai-change: neither is a catch-all.
        expect(errors).toMatch(/detail/);
        expect(errors).toMatch(/sizes/);
        expect(errors).toMatch(/TS2339/);
      });
    });
  }

  it('every declared event reaches its element’s event map, and its interface listens through it', () => {
    const source = readFileSync(SRC_TYPES, 'utf8');
    const withEvents = meta.filter((el) => declares(el).length);
    // The gap this guards is the whole event surface; a model that suddenly reported a
    // handful would make the loop below pass while covering almost nothing.
    expect(withEvents.length).toBeGreaterThan(50);

    const missing: string[] = [];
    for (const el of withEvents) {
      const map = interfaceBody(source, `export interface ${el.className}EventMap extends HTMLElementEventMap {`);
      if (map === null) {
        missing.push(`${el.tag} (no ${el.className}EventMap)`);
        continue;
      }
      for (const e of declares(el)) {
        if (!new RegExp(`^ {2}'${e.name}':`, 'm').test(map)) missing.push(`${el.tag} ${e.name}`);
      }
      const element = interfaceBody(source, `export interface ${el.className} extends HTMLElement {`);
      if (element === null || !element.includes(`keyof ${el.className}EventMap`)) {
        missing.push(`${el.tag} (no listener overload naming ${el.className}EventMap)`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('the global HTMLElementEventMap holds exactly the names whose payload is unique', () => {
    const source = readFileSync(SRC_TYPES, 'utf8');
    const { global, perElementOnly } = namesWithOnePayload();
    // The per-element half is what covers a name with more than one payload; it must be
    // a real population, or the global block is standing in for the whole feature.
    expect(perElementOnly.length).toBeGreaterThan(0);
    expect(globalEventNames(source)).toEqual(global);
    expect(global).toContain('kai-recording-change');
    for (const name of perElementOnly) expect(global).not.toContain(name);
  });
});
