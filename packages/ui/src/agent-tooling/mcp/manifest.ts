/**
 * manifest.ts — reads dist/custom-elements.json (a Custom Elements Manifest)
 * and exposes helpers for the component_reference tool.
 *
 * Resolution strategy (dual-context):
 *  1. Bundled bin: dist/mcp.es.js lives in dist/, so custom-elements.json is
 *     a sibling → try ./custom-elements.json relative to import.meta.url.
 *  2. Vitest (source): manifest.ts lives in src/agent-tooling/mcp/, so we walk
 *     up parent directories looking for <dir>/dist/custom-elements.json.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

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

function resolveManifestPath(): string {
  const thisFile = fileURLToPath(import.meta.url);
  const thisDir = dirname(thisFile);

  // 1. Bundled bin: sibling in the same directory
  const sibling = join(thisDir, 'custom-elements.json');
  if (existsSync(sibling)) {
    return sibling;
  }

  // 2. Source/Vitest: walk up parent directories looking for dist/custom-elements.json
  let dir = thisDir;
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, 'dist', 'custom-elements.json');
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }

  throw new Error(
    `Could not find custom-elements.json. Searched from: ${thisDir}`,
  );
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
export function listElements(): string[] {
  return getDeclarations()
    .filter((d) => d.tagName)
    .map((d) => d.tagName!)
    .sort();
}
