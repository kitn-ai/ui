import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { hasHoverBackground, SCAN_FILE, SCAN_ROOTS, SCAN_SKIP } from '../hover/hover-scan';

/**
 * Every component file that paints a hover background must be measured by the hover-contrast
 * probe (tests/hover/hover-contrast.browser.test.tsx) or carry an explicit, reasoned waiver.
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
    else if (SCAN_FILE.test(name) && !SCAN_SKIP.test(name)) out.push(p);
  }
  return out;
};

const sites = SCAN_ROOTS.flatMap((r) => walk(join(ROOT, r)))
  .filter((f) => hasHoverBackground(readFileSync(f, 'utf8')))
  .map((f) => relative(ROOT, f))
  .sort();

const registry = readFileSync(join(ROOT, 'tests/hover/hover-fixtures.tsx'), 'utf8');
const covered = new Set([...registry.matchAll(/covers:\s*\[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])));
const waiverBlock = registry.match(/export const WAIVERS[^=]*=\s*\{([\s\S]*?)\n\};/)?.[1] ?? '';
const waivers = new Map([...waiverBlock.matchAll(/'([^']+)':\s*'([^']*)'/g)].map((m) => [m[1], m[2]] as const));

describe('hover-contrast coverage is derived from the source', () => {
  it('finds the hover sites (a zero-match scan would pass vacuously)', () => {
    expect(sites.length).toBeGreaterThan(20);
  });
  it('every file with a hover:bg- class has a fixture or a reasoned waiver', () => {
    const missing = sites.filter((f) => !covered.has(f) && !waivers.has(f));
    expect(missing, `add a fixture (covers: ['<file>']) or a WAIVERS entry with a reason in tests/hover/hover-fixtures.tsx`).toEqual([]);
  });
  it('every waiver states a reason', () => {
    expect([...waivers].filter(([, why]) => why.trim().length < 15)).toEqual([]);
  });
  it('no fixture or waiver names a file that is gone or has no hover background', () => {
    const stale = [...covered, ...waivers.keys()].filter((f) => !existsSync(join(ROOT, f)) || !sites.includes(f));
    expect(stale).toEqual([]);
  });
});

describe('the scan recognises every spelling of a hover background', () => {
  const positives: Record<string, string> = {
    plain: 'class="hover:bg-muted"',
    'group-hover': 'class="group-hover:bg-muted"',
    'named group-hover': 'class="group-hover/tab:bg-muted"',
    'peer-hover': 'class="peer-hover:bg-muted"',
    'arbitrary &:hover': 'class="[&:hover]:bg-muted"',
    'arbitrary descendant': 'class="[&_button:hover]:bg-muted"',
    'v4 paren form': 'class="hover:bg-(--x)"',
    'important prefix': 'class="!hover:bg-muted"',
    'important on utility': 'class="hover:!bg-muted"',
    'important suffix': 'class="hover:bg-muted!"',
    'chained variant': 'class="hover:not-disabled:bg-muted"',
    'data variant': 'class="hover:data-[open]:bg-muted"',
    'opacity modifier': 'class="hover:bg-muted/50"',
    'arbitrary value': 'class="hover:bg-[color:var(--x)]"',
    'after an open paren': "cn(cond && 'a', (hover:bg-muted))",
    'after a template hole': 'class={`${base}hover:bg-muted`}',
    'after a quote': "cn('hover:bg-muted')",
  };
  for (const [name, src] of Object.entries(positives)) {
    it(`finds: ${name}`, () => expect(hasHoverBackground(src)).toBe(true));
  }

  const negatives: Record<string, string> = {
    'hover text only': 'class="hover:text-foreground"',
    'hover border only': 'class="hover:border-ring hover:opacity-100"',
    'bg without hover': 'class="bg-muted focus:bg-accent"',
    'hover and bg in separate tokens': 'class="hover:text-foreground bg-muted"',
  };
  for (const [name, src] of Object.entries(negatives)) {
    it(`ignores: ${name}`, () => expect(hasHoverBackground(src)).toBe(false));
  }
});
