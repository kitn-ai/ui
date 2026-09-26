/**
 * GUARD: every kit component that positions a floating panel with
 * `position: 'fixed'` renders that panel through `<Portal>`.
 *
 * WHY: `position: fixed` does NOT escape a containing block. Any ancestor with
 * `transform`, `filter`, `perspective`, `contain` or `will-change` becomes one, and
 * from that point on the panel is laid out inside it and clipped by its `overflow` —
 * so a floating layer inside an `overflow: hidden` card or a scroll container gets
 * cut off. The portal is what moves the panel out of that subtree; the fixed
 * coordinates stay, because with no containing-block ancestor left above the panel
 * they are viewport coordinates, which is what the overlay primitives computed.
 *
 * This is the difference the owner reported as "the dropdown shows up on top, the
 * popover shows up inside the example frame": same visual layer, different DOM
 * answer. Dropdown, tooltip, hover-card and coachmark all portaled; the popover and
 * the composer's suggestion menu did not, and nothing in the tree said so.
 *
 * DERIVED ROSTER, not a hand-typed list: the files are walked from `src/components`
 * and matched on their own source. The pattern is deliberately narrow — a QUOTED
 * `position: 'fixed'` in a style object — so the unquoted `position: fixed;` of a
 * stylesheet string (`src/components/dock/dock.tsx` documents the containing-block
 * rule that way) and prose that merely names it are not matched. Lines that are
 * comment bodies are skipped for the same reason: a docblock quoting the pattern
 * must not make its file look like a floating layer.
 *
 * What it does NOT catch: a panel rendered with a CSS class that is fixed from a
 * stylesheet rather than inline, and a fixed panel that legitimately stays in place
 * (the dock documents why it cannot portal from inside a facade, and is a CSS string
 * here, not an inline style). Both are outside this rule's reach on purpose —
 * claiming them would make the roster dishonest.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const COMPONENTS = resolve(pkgRoot, 'src/components');

/** A quoted `position: 'fixed'` / `position: "fixed"` — an inline style value. */
const FIXED_PANEL = /position:\s*['"]fixed['"]/;
const PORTAL_IMPORT = /import\s*\{[^}]*\bPortal\b[^}]*\}\s*from\s*['"]solid-js\/web['"]/;
const PORTAL_USE = /<Portal[\s>]/;

/** Every component `.tsx`, minus the two files that are not shipped source. */
function componentFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...componentFiles(full));
    else if (entry.name.endsWith('.tsx') && !/\.(test|stories)\.tsx$/.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * Line numbers of the fixed-position style values in `source`, skipping lines that
 * are comment bodies (`//`, `/*` and the `*`-led continuation lines of a docblock) so
 * a comment naming the pattern is not read as a floating layer.
 */
function fixedPanelLines(source: string): number[] {
  return source.split('\n').flatMap((line, i) => {
    const trimmed = line.trim();
    const commentBody = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
    return !commentBody && FIXED_PANEL.test(line) ? [i + 1] : [];
  });
}

/**
 * The rule itself, as a pure function of `(name, source)` so it can be proven against
 * fixture strings rather than only exercised against the tree.
 */
function portalViolations(name: string, source: string): string[] {
  const lines = fixedPanelLines(source);
  if (lines.length === 0) return [];
  const violations: string[] = [];
  if (!PORTAL_IMPORT.test(source)) {
    violations.push(`${name}:${lines[0]} sets position: 'fixed' but never imports { Portal } from 'solid-js/web'`);
  }
  if (!PORTAL_USE.test(source)) {
    violations.push(`${name}:${lines[0]} sets position: 'fixed' but never renders <Portal>`);
  }
  return violations;
}

const WALKED = componentFiles(COMPONENTS);
const ROSTER = WALKED.filter((file) => fixedPanelLines(readFileSync(file, 'utf-8')).length > 0);

describe('floating layers portal', () => {
  it('every component with a position: fixed panel renders it through <Portal>', () => {
    const violations = ROSTER.flatMap((file) =>
      portalViolations(relative(pkgRoot, file), readFileSync(file, 'utf-8')),
    );
    // The message names the file and the missing import so the fix is a lookup, not
    // an investigation. A panel whose absence of a portal is INTENTIONAL does not
    // belong on this list with a waiver — it needs its own reason at the site, which
    // means this assertion has to be read before adding one.
    expect(violations).toEqual([]);
  });

  it('the walk resolves the components it claims to (anti-vacuity)', () => {
    // A walk that resolves nothing is indistinguishable from a clean tree, and this
    // suite's whole value is that it fails when a fixed layer appears without a
    // portal. Both floors are floor-values, so registering components only raises
    // them.
    expect(WALKED.length).toBeGreaterThan(50);
    expect(ROSTER.length).toBeGreaterThanOrEqual(5);
    // The roster is a set of FILES, so a file with two panels (dropdown's menu and
    // its submenu) counts once — and a matched file must really be readable source.
    for (const file of ROSTER) expect(readFileSync(file, 'utf-8')).toContain('position');
  });

  it('the rule fires on a fixed panel with no portal', () => {
    const fixture = [
      "import { Show } from 'solid-js';",
      'export function Panel() {',
      '  return <Show when>',
      "    <div style={{ position: 'fixed', left: '0px', top: '0px' }} />",
      '  </Show>;',
      '}',
    ].join('\n');
    const violations = portalViolations('fixture.tsx', fixture);
    expect(violations).toHaveLength(2);
    expect(violations[0]).toContain('fixture.tsx:4');
    expect(violations[0]).toContain("never imports { Portal } from 'solid-js/web'");
    expect(violations[1]).toContain('never renders <Portal>');
  });

  it('the rule passes the same panel once it portals', () => {
    const fixture = [
      "import { Show } from 'solid-js';",
      "import { Portal } from 'solid-js/web';",
      'export function Panel() {',
      '  return <Show when>',
      '    <Portal mount={config.portalMount()}>',
      "      <div style={{ position: 'fixed', left: '0px', top: '0px' }} />",
      '    </Portal>',
      '  </Show>;',
      '}',
    ].join('\n');
    expect(portalViolations('fixture.tsx', fixture)).toEqual([]);
  });

  it('does not read a comment or a stylesheet as a floating panel', () => {
    // The control for the narrowing above: the same words in a docblock or an
    // unquoted CSS declaration are not a fixed inline style, so neither file is in
    // the roster and neither is asked to portal.
    const fixture = [
      '/* Layout note: `position: fixed` resolves against a transformed ancestor,',
      " * and a `position: 'fixed'` panel there is clipped. */",
      'const DOCK_CSS = `[data-dock] { position: fixed; inset: 0; }`;',
      'export const x = 1;',
    ].join('\n');
    expect(fixedPanelLines(fixture)).toEqual([]);
    expect(portalViolations('fixture.tsx', fixture)).toEqual([]);
  });
});
