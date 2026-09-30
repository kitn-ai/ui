import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Every component file that paints a `hover:bg-*` background must be measured by the hover-contrast
 * probe (tests/browser/hover-contrast.browser.test.tsx) or carry an explicit, reasoned waiver.
 *
 * The site list is DERIVED from src/components, never typed, so a new hover state cannot ship without
 * a fixture. The registry is read as text because it imports the facades (a DOM, real-Chromium
 * concern); the browser project runs the fixtures, this jsdom-safe test only proves they exist.
 * Coverage is per file, which is the grain a scan can know.
 */
const ROOT = join(__dirname, '..', '..');
const walk = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(name) && !/\.(stories|test)\.tsx$/.test(name)) out.push(p);
  }
  return out;
};
const HOVER_BG = /(^|[\s'"`:])hover:bg-[a-z0-9[\]/.-]+/;

const sites = walk(join(ROOT, 'src/components'))
  .filter((f) => HOVER_BG.test(readFileSync(f, 'utf8')))
  .map((f) => relative(ROOT, f))
  .sort();

const registry = readFileSync(join(ROOT, 'tests/browser/hover-fixtures.tsx'), 'utf8');
const covered = new Set([...registry.matchAll(/covers:\s*\[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])));
const waiverBlock = registry.match(/export const WAIVERS[^=]*=\s*\{([\s\S]*?)\n\};/)?.[1] ?? '';
const waivers = new Map([...waiverBlock.matchAll(/'([^']+)':\s*'([^']*)'/g)].map((m) => [m[1], m[2]] as const));

describe('hover-contrast coverage is derived from the source', () => {
  it('finds the hover sites (a zero-match scan would pass vacuously)', () => {
    expect(sites.length).toBeGreaterThan(20);
  });
  it('every file with a hover:bg- class has a fixture or a reasoned waiver', () => {
    const missing = sites.filter((f) => !covered.has(f) && !waivers.has(f));
    expect(missing, `add a fixture (covers: ['<file>']) or a WAIVERS entry with a reason in tests/browser/hover-fixtures.tsx`).toEqual([]);
  });
  it('every waiver states a reason', () => {
    expect([...waivers].filter(([, why]) => why.trim().length < 15)).toEqual([]);
  });
  it('no fixture or waiver names a file that is gone or has no hover:bg- class', () => {
    const stale = [...covered, ...waivers.keys()].filter((f) => !existsSync(join(ROOT, f)) || !sites.includes(f));
    expect(stale).toEqual([]);
  });
});
