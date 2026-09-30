/**
 * GUARD: every type llms-full.txt names instead of expanding is DEFINED in its
 * "Shared types" section, and nothing the tables used to print inline was lost.
 *
 * The generator swaps a recurring structural type for its exported name and prints the
 * shape once. The failure that matters is a reference with no definition: a row says
 * `ChatMessage[]` and the section lacks `ChatMessage`, so an agent is told a type exists
 * and given no way to learn it. Nothing else would notice, because the row still reads
 * as plausible prose.
 *
 * The committed-file case reads the names the checker expanded from
 * dist/custom-elements.json (`kaiNamedTypes`, written by build:api), so "what counts as
 * a reference" is derived from the types, not listed here. It needs a build, and throws
 * naming the path when there is none rather than passing vacuously.
 *
 * Watched failing: planting a dangling `Ghost` reference (both cases below do exactly
 * that) turns `findDanglingNames` non-empty, and deleting one definition line from the
 * committed section turns the committed-file case red.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findDanglingNames, planSharedTypes, renderSharedTypes } from '../../scripts/lib/llms-shared-types.mjs';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const CHAT_MESSAGE = '{ id: string; role: "user" | "assistant"; parts: ({ type: "text"; text: string } | { type: "tool"; tool: string })[]; note?: undefined | string }';
const MESSAGE_PART = '{ type: "text"; text: string } | { type: "tool"; tool: string }';

describe('planSharedTypes', () => {
  const namedTypes = { ChatMessage: [CHAT_MESSAGE], MessagePart: [MESSAGE_PART], Ghost: ['{ ghost: string; padding: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }'] };
  const cells = [`undefined | ${CHAT_MESSAGE}[]`, `undefined | ${CHAT_MESSAGE}`, `undefined | (${MESSAGE_PART})[]`];
  const plan = planSharedTypes(namedTypes, cells);
  const section = renderSharedTypes(plan.definitions) as string;
  const defined = plan.definitions.map((d: { name: string }) => d.name);

  it('names the recurring types and defines each one', () => {
    expect(defined).toEqual(['ChatMessage', 'MessagePart']);
    expect(plan.rewrite(cells[0])).toBe('undefined | ChatMessage[]');
    expect(plan.rewrite(cells[2])).toBe('undefined | MessagePart[]');
    // nested: MessagePart is reached through ChatMessage's own definition
    expect(section).toContain('parts: MessagePart[]');
  });

  it('leaves no reference without a definition', () => {
    const text = [...cells.map(plan.rewrite), section].join('\n');
    expect(findDanglingNames(text, Object.keys(namedTypes), defined)).toEqual([]);
  });

  it('catches a planted dangling reference', () => {
    const text = [...cells.map(plan.rewrite), section, '| `x` | — | `Ghost[]` | planted |'].join('\n');
    expect(findDanglingNames(text, Object.keys(namedTypes), defined)).toEqual(['Ghost']);
  });

  it('keeps a type inline when two exported names expand identically', () => {
    const twin = { A: [MESSAGE_PART], B: [MESSAGE_PART] };
    const p = planSharedTypes(twin, [MESSAGE_PART, MESSAGE_PART]);
    expect(p.definitions).toEqual([]);
    expect(p.rewrite(MESSAGE_PART)).toBe(MESSAGE_PART);
  });
});

describe('committed llms-full.txt', () => {
  const cemPath = resolve(pkgRoot, 'dist/custom-elements.json');
  if (!existsSync(cemPath)) {
    throw new Error(`${cemPath} is missing: run \`nx build ui\` (or build:api) first; this guard reads the checker's named types from it.`);
  }
  const cem = JSON.parse(readFileSync(cemPath, 'utf8')) as { kaiNamedTypes?: Record<string, string[]> };
  const full = readFileSync(resolve(pkgRoot, 'llms-full.txt'), 'utf8');
  const [, sharedBody = ''] = full.split(/^## Shared types/m);
  // Type cells only (Property table col 3): descriptions are prose and legitimately
  // mention type names that are printed inline.
  const rows = full
    .slice(0, full.indexOf('## Shared types'))
    .split('\n')
    .flatMap((l) => {
      const m = l.match(/^\| `[^`]+` \| (?:—|`[^`]*`) \| `([^`]*)` \| /);
      return m ? [m[1]] : [];
    })
    .join('\n');
  const defs = [...sharedBody.matchAll(/^- `(\w+)` = `(.*)`$/gm)].map((m) => m[1]);

  it('carries the named types build:api recorded', () => {
    expect(Object.keys(cem.kaiNamedTypes ?? {}).length).toBeGreaterThan(0);
    expect(defs.length).toBeGreaterThan(0);
  });

  it('defines every shared type the rows and definitions name', () => {
    const known = Object.keys(cem.kaiNamedTypes ?? {});
    expect(findDanglingNames(rows, known, defs)).toEqual([]);
    expect(findDanglingNames(sharedBody, known, defs)).toEqual([]);
  });

  it('would notice a planted dangling reference', () => {
    const known = [...Object.keys(cem.kaiNamedTypes ?? {}), 'Ghost'];
    expect(findDanglingNames(`${rows}\nGhost[]`, known, defs)).toEqual(['Ghost']);
  });
});
