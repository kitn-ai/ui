/**
 * Drift guard: the Playwright e2e/IVP specs load Storybook stories by id
 * (`?id=<story>`). Those stories are TEST FIXTURES — if one is deleted or
 * retitled (e.g. during a Storybook reshuffle), the spec silently 404s. This
 * test fails loudly instead: it cross-checks every story id the specs reference
 * against the titles actually declared in the story files.
 *
 * If this fails, either (a) restore/retitle the fixture, or (b) update the spec
 * to point at the new story id. The web-component fixtures live under the
 * "Test Fixtures/…" section (see .storybook/preview.ts storySort).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');

// Mirror Storybook's title → id kebab (for the section/title prefix before `--`).
const kebab = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function walk(dir: string, hit: (file: string) => void) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (entry === 'node_modules' || entry === 'dist') continue;
    if (statSync(p).isDirectory()) walk(p, hit);
    else hit(p);
  }
}

/** All story-title id prefixes declared across the kit's story files. */
function declaredTitlePrefixes(): Set<string> {
  const out = new Set<string>();
  walk(join(ROOT, 'src'), (file) => {
    if (!/\.stories\.tsx?$/.test(file) && !file.endsWith('.mdx')) return;
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/title:\s*['"]([^'"]+)['"]/g)) out.add(kebab(m[1]));
    for (const m of src.matchAll(/<Meta\s+title="([^"]+)"/g)) out.add(kebab(m[1]));
  });
  return out;
}

/** Story id prefixes the e2e specs load (the part before `--`). */
function referencedPrefixes(): Map<string, string> {
  const out = new Map<string, string>(); // prefix -> first spec file that uses it
  const e2e = join(ROOT, 'tests/e2e');
  for (const entry of readdirSync(e2e)) {
    if (!entry.endsWith('.spec.ts')) continue;
    const src = readFileSync(join(e2e, entry), 'utf8');
    for (const m of src.matchAll(/id=([a-z0-9-]+)--[a-z0-9-]+/g)) {
      if (!out.has(m[1])) out.set(m[1], entry);
    }
  }
  return out;
}

describe('e2e story fixtures (drift guard)', () => {
  it('every story id the e2e specs load is declared by a story file', () => {
    const declared = declaredTitlePrefixes();
    const referenced = referencedPrefixes();
    expect(referenced.size).toBeGreaterThan(0); // sanity: we actually found refs
    const missing = [...referenced.entries()]
      .filter(([prefix]) => !declared.has(prefix))
      .map(([prefix, spec]) => `${prefix} (referenced by ${spec})`)
      .sort();
    expect(missing).toEqual([]);
  });
});
