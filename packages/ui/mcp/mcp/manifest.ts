/**
 * manifest.ts — reads dist/custom-elements.json (a Custom Elements Manifest)
 * and exposes helpers for the component_reference tool.
 *
 * Resolution strategy -- the manifest is ADDRESSED through the published package, never
 * searched for. See `resolveManifestPath` for why that distinction is the whole point:
 *  1. `@kitn.ai/ui/package.json` is resolved with Node's own package resolution
 *     (`createRequire`), which is what "address this package" means: from SOURCE it
 *     resolves by self-reference (this module lives inside the package), and from the
 *     bundled bin it walks to `node_modules/@kitn.ai/ui`, i.e. the installed dependency.
 *  2. The manifest is then ONE fixed hop from that root, `dist/custom-elements.json`,
 *     checked to exist and to belong to this package rather than assumed.
 *
 * Both contexts give the same answer, and neither can bind to a directory that merely
 * looks like this package. The bundled bin used to find the manifest as a SIBLING of
 * itself (`dist/mcp.es.js` beside `dist/custom-elements.json`), which stopped being
 * true when the server bundle moved to its own package (`@kitn.ai/kai`); the sibling hop
 * is gone, and `manifest.test.ts` fails if it comes back.
 *
 * It also answers "which of these 80 web components has anything to do with cards", for
 * the card contract component_reference serves. That question lives HERE rather than
 * in reference.ts because half of it is a question about the element manifest — the
 * kit's own `type -> tag` map, crossed against the tag list this module already owns
 * — and because both halves of the answer must come off one place. See
 * `cardTagForType` for the rule and for what happens when an eighth card type lands.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
// The package's own public entry, by the same specifier the scaffolder tells a
// consumer's route to use. That is now a CHOICE, and this comment used to say the
// opposite: the barrel re-exports src/schemas/registry.ts, which type-IMPORTED
// `CardComponentMap` from src/primitives/card-registry.TSX, and pulling a .tsx into
// this pass would mean giving tsconfig.mcp.json `jsx` + `jsxImportSource` + the DOM
// lib, dragging the whole Solid component tree into a Node-only project — measured
// as 0 errors -> 1364. Those two types moved to the DOM-free
// src/primitives/card-component-types.ts, so a relative import of the barrel would
// typecheck here today. It stays on the public specifier anyway, because emitting
// and consuming the same string is the point of this module. The built entry
// resolves to dist/schemas/index.d.ts, whose own reference to card-registry is a
// .d.ts that skipLibCheck skips, so the Node/no-DOM guarantee survives intact.
//
// `BUILTIN_CARD_TAGS` is the authoritative `CardEnvelope.type -> kai-* tag` map and
// arrives here as DATA, not a type. It is authored in src/primitives/card-tags.ts,
// which holds that map ALONE — no Solid below it — so it is readable from source by a
// Node/no-DOM project rather than only through this built entry. Before that split it
// shared a module with `BUILTIN_CARD_COMPONENTS` and this module re-derived it by
// convention instead; see `cardTagForType`.
//
// This costs a build before typecheck and before the unit suite. That is not a new
// dependency: resolveManifestPath() below already requires dist/custom-elements.json,
// and CI already runs `nx build ui` ahead of both.
import { BUILTIN_CARD_TAGS, cardSchemaNames } from '@kitn.ai/ui/schemas';

// ── CEM types ────────────────────────────────────────────────────────────────

export interface CemType {
  text: string;
}

export interface CemMember {
  kind: 'field' | 'method';
  privacy?: 'public' | 'private' | 'protected';
  name: string;
  type?: CemType;
  description?: string;
}

export interface CemAttribute {
  name: string;
  fieldName?: string;
  type?: CemType;
  description?: string;
}

export interface CemEvent {
  name: string;
  type?: CemType;
  description?: string;
}

export interface CemCssProperty {
  name: string;
  description?: string;
  default?: string;
  /** Our extension: a copy-paste example, emitted for a consumer-settable knob (a
   *  registry `VarDef`). A theme token carries none. */
  recipe?: string;
}

export interface CemSlot {
  name: string;
  description?: string;
}

export interface CemCssPart {
  name: string;
  description?: string;
  /** Our extension: a copy-paste styling example. */
  recipe?: string;
}

export interface Declaration {
  tagName?: string;
  name: string;
  kind: string;
  description?: string;
  members?: CemMember[];
  attributes?: CemAttribute[];
  events?: CemEvent[];
  cssProperties?: CemCssProperty[];
  slots?: CemSlot[];
  cssParts?: CemCssPart[];
}

interface CemModule {
  path?: string;
  declarations?: Declaration[];
}

interface CustomElementsManifest {
  modules: CemModule[];
}

// ── Manifest resolution ───────────────────────────────────────────────────────
//
// THE MANIFEST IS THIS PACKAGE'S OWN BUILD ARTIFACT, SO IT IS ADDRESSED, NOT SEARCHED
// FOR. This used to walk up ten parent directories taking the first
// `<dir>/dist/custom-elements.json` it found, and that is a categorically weaker
// thing than it looks: "a custom-elements.json exists somewhere above me" and "THIS
// package's custom-elements.json exists" are different facts, and a walk-up cannot
// tell them apart. It reports success for both.
//
// It was not hypothetical. Measured from an agent git worktree at
// `<repo>/.claude/worktrees/<agent>/packages/ui/mcp/mcp`, the loop
// climbed past the worktree's own (unbuilt) `packages/ui/dist`, out of the worktree
// entirely, and bound on iteration 8 to `<repo>/dist/custom-elements.json` -- a
// leftover from the pre-monorepo layout, six weeks stale, 78 tags, and zero web
// components declaring `cardSchemas`. The consequence is this repo's dominant failure mode in
// its purest form: on an unbuilt tree the MCP manifest tests did not error, they
// PASSED, 16 of 17, against an artifact from a tree nobody was working in. Two
// checkouts could disagree about what they had tested and nothing said so.
//
// So the rule here is now: a missing manifest is a HARD FAILURE that names the path
// it expected. Never a fallback, never a wider search. If this throws, the answer is
// to build -- not to let it find someone else's build.

const PACKAGE_NAME = '@kitn.ai/ui';
const MANIFEST_FILE = 'custom-elements.json';

/**
 * The specifier that ADDRESSES this package. Node resolves it to the package's own
 * `package.json`, whose directory IS the package root.
 *
 * Not `@kitn.ai/ui/custom-elements.json`: the manifest is not an `exports` key (the
 * exported JSON keys are `./web-component-meta.json`, `./icon-names.json` and
 * `./package.json`), and adding one would let a consumer deep-import a build artifact
 * whose only reader is this module. Addressing the package is enough, and the hop below
 * is one fixed segment from a root that is itself verified.
 */
const PACKAGE_ROOT_SPECIFIER = `${PACKAGE_NAME}/package.json`;

/** Package root -> the artifact. One exact hop, checked below rather than trusted. */
const MANIFEST_FROM_PACKAGE_ROOT = ['dist', MANIFEST_FILE] as const;

/** Is `root` the root of THIS package -- not merely *a* directory holding a dist/?
 *
 * Node resolves the specifier by DIRECTORY, so `node_modules/@kitn.ai/ui` holding a
 * package.json that calls itself something else still resolves. This is the check that
 * rejects it: "found a file" and "found the right file" are different facts. */
function isThisPackage(root: string): boolean {
  const manifest = join(root, 'package.json');
  if (!existsSync(manifest)) return false;
  try {
    return (JSON.parse(readFileSync(manifest, 'utf-8')) as { name?: string }).name === PACKAGE_NAME;
  } catch {
    return false;
  }
}

/**
 * Absolute path to this package's Custom Elements Manifest, or a throw naming what it
 * looked for.
 *
 * `fromDir` exists for the tests and defaults to this module's own directory. It is the
 * anchor Node resolves FROM, so it is the only thing a caller can vary -- and the tests
 * are what make the guarantee meaningful: not "a manifest was found", but "THIS
 * package's manifest was found, from this anchor".
 */
export function resolveManifestPath(
  fromDir: string = dirname(fileURLToPath(import.meta.url)),
): string {
  // A synthetic filename inside `fromDir`, so Node resolves from that directory without
  // this needing a real file there.
  const requireFrom = createRequire(join(fromDir, 'resolve-manifest.js'));

  let packageJson: string;
  try {
    packageJson = requireFrom.resolve(PACKAGE_ROOT_SPECIFIER);
  } catch (cause) {
    throw new Error(
      `[${PACKAGE_NAME}] Cannot locate the Custom Elements Manifest: the specifier ` +
        `\`${PACKAGE_ROOT_SPECIFIER}\` did not resolve from ${fromDir}.\n` +
        `The package has to be INSTALLED: as this module's own package when running from ` +
        `source, or as a dependency of whichever package carries the server bundle ` +
        `(\`@kitn.ai/kai\` makes it one).\n` +
        `Cause: ${cause instanceof Error ? cause.message : String(cause)}\n` +
        `Resolution deliberately does NOT search directories for a ${MANIFEST_FILE}: ` +
        `finding some other checkout's manifest is worse than failing.`,
    );
  }

  const packageRoot = dirname(packageJson);

  if (!isThisPackage(packageRoot)) {
    throw new Error(
      `[${PACKAGE_NAME}] Cannot locate the Custom Elements Manifest: ` +
        `\`${PACKAGE_ROOT_SPECIFIER}\` resolved to ${packageRoot}, and that package.json is ` +
        `not ${PACKAGE_NAME}, so its manifest would be a different build's.\n` +
        `Resolved from: ${fromDir}\n` +
        `Resolution deliberately does NOT search directories for a ${MANIFEST_FILE}.`,
    );
  }

  const expected = join(packageRoot, ...MANIFEST_FROM_PACKAGE_ROOT);

  if (!existsSync(expected)) {
    throw new Error(
      `[${PACKAGE_NAME}] Missing build artifact: ${expected}\n` +
        `Resolved from: ${fromDir}\n` +
        `The Custom Elements Manifest is generated by the build. Run \`nx build ui\` ` +
        `(or \`npm run build:api\` in packages/ui) and try again.\n` +
        `Resolution deliberately does NOT search parent directories: binding to a ` +
        `neighbouring checkout's manifest would make this succeed against stale data.`,
    );
  }

  return expected;
}

// ── Parsed manifest (module-level cache) ─────────────────────────────────────

let _manifest: CustomElementsManifest | undefined;

function getManifest(): CustomElementsManifest {
  if (!_manifest) {
    const path = resolveManifestPath();
    const raw = readFileSync(path, 'utf-8');
    _manifest = JSON.parse(raw) as CustomElementsManifest;
  }
  return _manifest;
}

function getDeclarations(): Declaration[] {
  return getManifest().modules.flatMap((m) => m.declarations ?? []);
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns the Declaration for a given custom-element tag, or undefined. */
export function getElement(tag: string): Declaration | undefined {
  return getDeclarations().find((d) => d.tagName === tag);
}

/** Returns all custom-element tagNames, sorted alphabetically. */
export function listWebComponents(): string[] {
  return getDeclarations()
    .filter((d) => d.tagName)
    .map((d) => d.tagName!)
    .sort();
}

// ── Per-web-component entry map ───────────────────────────────────────────────
//
// A STATIC import, not an fs read off resolveManifestPath's dual-context pattern:
// web-component-manifest.json (unlike custom-elements.json) is never copied into dist/,
// so an fs read relative to this module's own URL would resolve in the vitest/source
// context and 404 in the bundled dist/mcp.es.js. A static import sidesteps the gap
// entirely — Rollup inlines the JSON at build time, so the bundled bin carries the
// data with no runtime file dependency. NAMED import (not the whole module), matching
// the same tradeoff web-component-diagnostics.ts already made for this file: a default
// import would pull `files` in too for 0 benefit here.
import { tags as WEB_COMPONENT_ENTRY_TAGS } from '../../src/web-components/web-component-manifest.json';

/**
 * The per-web-component entry basename for a tag, e.g. 'kai-chat' -> 'chat'.
 *
 * Read from web-component-manifest.json's `tags` map rather than derived by stripping
 * the `kai-` prefix: TEN of the eighty web components do not match that derivation
 * (`kai-conversations` -> `conversation-list`), so a derived path would emit a
 * broken import for them.
 */
export function entryForTag(tag: string): string | undefined {
  return (WEB_COMPONENT_ENTRY_TAGS as Record<string, string>)[tag];
}

/**
 * The per-web-component entry basename for a tag the register-all bundle does
 * NOT carry, e.g. 'kai-remote' -> 'remote'. `undefined` for every tag `entryForTag`
 * already answers, and for a tag no built module registers.
 *
 * WHY THIS EXISTS. `entryForTag` reads web-component-manifest.json, which is generated
 * from the import list in register-impl.ts — so an opt-in web component is absent
 * from it by construction, and the reference had nothing to name. It said "find the
 * entry point in the package's published exports", which is the one place in the
 * reference where "how to make this web component exist" does not answer itself.
 *
 * WHY IT IS READ AND NOT DERIVED. Stripping `kai-` is wrong for ten of the eighty
 * web components, so guessing here risks exactly the broken import this tool exists
 * to catch. The fact is stated in config/vite/web-components.ts, which adds an
 * explicit entry for each opt-in web component precisely "so `@kitn.ai/ui/web-components/remote`
 * resolves to a real dist file" — but a vite config is not shipped in the
 * package, so the runtime reads that intent where it LANDS: dist/web-components/. A
 * candidate is a built module that web-component-manifest.json does not already claim
 * (plus the two non-web-component entries the same build emits), and it is matched to a
 * tag by the tag literal it registers. So the answer is the built artifact's,
 * confirmed against the tag rather than assumed from a filename.
 *
 * dist/web-components/ is a sibling of the manifest in both contexts — the bundled bin
 * (dist/mcp.es.js) and vitest-over-source, which resolveManifestPath already
 * normalises — so this needs no second resolution strategy. A missing or
 * unreadable directory yields `undefined` rather than throwing: the caller's
 * fallback is the honest "this is opt-in" paragraph it already prints.
 */
export function optInEntryForTag(tag: string): string | undefined {
  if (entryForTag(tag)) return undefined;
  return optInEntries().get(tag);
}

/** Not web-component entries: the register-all barrel and the DOM autoloader,
 *  both emitted into dist/web-components/ by the same per-web-component build. */
const NON_ELEMENT_ENTRIES = new Set(['index', 'autoloader']);

let _optInEntries: Map<string, string> | undefined;

function optInEntries(): Map<string, string> {
  if (_optInEntries) return _optInEntries;
  _optInEntries = new Map();

  const dir = join(dirname(resolveManifestPath()), 'web-components');
  let candidates: string[];
  try {
    const registered = new Set(Object.values(WEB_COMPONENT_ENTRY_TAGS as Record<string, string>));
    candidates = readdirSync(dir)
      .filter((f) => f.endsWith('.js'))
      .map((f) => f.slice(0, -'.js'.length))
      .filter((base) => !registered.has(base) && !NON_ELEMENT_ENTRIES.has(base));
  } catch {
    return _optInEntries;
  }

  // Only the tags web-component-manifest.json does not already answer for. Narrow on
  // purpose: a web-component module may mention a tag it merely renders, and matching
  // against the whole tag list would let that be read as a registration.
  const unclaimed = listWebComponents().filter((t) => !entryForTag(t));

  for (const base of candidates) {
    let code: string;
    try {
      code = readFileSync(join(dir, `${base}.js`), 'utf-8');
    } catch {
      continue;
    }
    for (const tag of unclaimed) {
      if (!_optInEntries.has(tag) && code.includes(`"${tag}"`)) _optInEntries.set(tag, base);
    }
  }

  return _optInEntries;
}

// ── Which web components have anything to do with cards ──────────────────────
//
// Two different populations, and conflating them would be the "attaches card
// material to everything" failure:
//
//   CARD-BACKED   kai-confirm, kai-choice, …  — one web component per CardEnvelope.type.
//                 These get a schema and a generated tool definition.
//   CARD HOST     kai-chat, kai-message, …    — the web components that RENDER a thread of
//                 cards and therefore carry the `cardTypes` / `cardSchemas` props.
//                 These get the wiring note, not a schema.
//
// Neither list is written down here. The host list is derived from the manifest; the
// card-backed one is the kit's own map, read rather than guessed at. Either way an
// eighth card type is covered the day it lands rather than the day someone remembers
// this file.

/** Cached derivations. Same lifetime as the parsed manifest above. */
let _cardTags: Map<string, string> | undefined;
let _cardHosts: string[] | undefined;

/**
 * `CardEnvelope.type` -> the `kai-*` web component that renders it.
 *
 * THE MAP IS IMPORTED, NOT INFERRED. `BUILTIN_CARD_TAGS` is the same object
 * `<kai-cards>` dispatches on in the browser, reached here through
 * `@kitn.ai/ui/schemas`. This function used to RE-DERIVE it by convention — the tag
 * is `kai-<t>` when that web component exists, else the single web component whose tag starts
 * `kai-<t>-` — which was correct against all 80 tags on this tree, `link` ->
 * `kai-link-preview` included, and was still a second copy of a fact the repo already
 * held. The eighth card type is the one that would have broken it: any type whose tag
 * is neither `kai-<t>` nor the sole `kai-<t>-*` had to be noticed by a human, and a
 * future `kai-form-field` would have made `form` ambiguous on its own. A lookup has
 * neither failure mode.
 *
 * WHY IT IS STILL CROSSED AGAINST THE MANIFEST. The map is authoritative for the
 * ASSOCIATION; only the manifest knows what actually got registered. A tag in the map
 * with no web component behind it (a rename that missed this file) would otherwise have
 * `component_reference` send a harness to a web component that does not exist. Entries
 * with no registered web component are dropped, so the answer is a real tag or nothing.
 *
 * WHEN IT BREAKS, IT BREAKS LOUDLY. reference.test.ts asserts every member of
 * `cardSchemaNames` resolves AND that what it resolves to is in `listWebComponents()`, so a
 * card type missing from the map, or pointed at a tag nobody registered, fails a test
 * instead of silently losing its schema in the reference.
 */
export function cardTagForType(type: string): string | undefined {
  if (!_cardTags) {
    const present = new Set(listWebComponents());
    _cardTags = new Map(Object.entries(BUILTIN_CARD_TAGS).filter(([, tag]) => present.has(tag)));
  }
  return _cardTags.get(type);
}

/** The inverse: which card type does this web component render, if any. */
export function cardTypeForTag(tag: string): string | undefined {
  for (const name of cardSchemaNames) {
    if (cardTagForType(name) === tag) return name;
  }
  return undefined;
}

/**
 * The web components that host a thread of cards, derived from the manifest: a web
 * component is a card host exactly when it declares the `cardSchemas` prop.
 *
 * That prop is the one that carries a developer's own card schemas into the browser
 * validator, so "declares it" and "hosts cards" are the same fact rather than two
 * facts that can disagree. Today it selects kai-chat / kai-message / kai-thread /
 * kai-workspace; a web component that grows the prop tomorrow joins without an edit here.
 */
export function cardHostTags(): string[] {
  if (!_cardHosts) {
    _cardHosts = getDeclarations()
      .filter(
        (d) =>
          d.tagName !== undefined &&
          (d.members ?? []).some(
            (m) => m.kind === 'field' && m.privacy === 'public' && m.name === 'cardSchemas',
          ),
      )
      .map((d) => d.tagName!)
      .sort();
  }
  return _cardHosts;
}
