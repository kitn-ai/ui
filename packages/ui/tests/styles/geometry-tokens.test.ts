import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The shape/geometry/elevation token surface at the sheet level: each family reads a
 * `--kai-*` token, is declared so it crosses a shadow boundary, and falls back to
 * TAILWIND'S OWN default (a different fallback would move every consumer's layout on
 * upgrade). Real-cascade proof: tests/e2e/geometry-token.spec.ts.
 */
const ROOT = join(__dirname, '..', '..');
const THEME_CSS = readFileSync(join(ROOT, 'theme.css'), 'utf8');
const COMPILED = readFileSync(join(ROOT, 'src', 'elements', 'compiled.css'), 'utf8');
/** Tailwind's own theme source — fallbacks compare against it, not against numbers
 *  typed here. */
const TW_THEME = readFileSync(join(ROOT, '..', '..', 'node_modules', 'tailwindcss', 'theme.css'), 'utf8');
const twDecl = (name: string): string | undefined =>
  TW_THEME.match(new RegExp(`^\\s*${name}:\\s*([^;]+);`, 'm'))?.[1]?.replace(/\s+/g, ' ').trim();

/** Files whose classes ship in the bundle (stories/tests never reach a consumer). */
function shippingSources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (/\.tsx?$/.test(entry.name) && !/\.(stories|test)\.tsx?$/.test(entry.name)) out.push(abs);
    }
  };
  for (const d of ['components', 'elements', 'primitives']) walk(join(ROOT, 'src', d));
  return out;
}

/** The compiled rule for exactly this class, or null when the sheet has none. */
function compiledRule(cls: string): string | null {
  const esc = cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = COMPILED.match(new RegExp(`\\.${esc}\\{[^}]*\\}`));
  return m ? m[0] : null;
}

interface Family {
  /** The token a consumer sets. */
  kai: string;
  /** The Tailwind variable the kit re-points at it. */
  tw: string;
  /** Tailwind v4's own default for `tw` — the fallback, so nothing moves by default. */
  fallback: string;
}

const FAMILIES: Family[] = [{ kai: '--kai-density', tw: '--spacing', fallback: '0.25rem' }];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('geometry tokens are overridable by a consumer', () => {
  it('theme.css re-points each family at its --kai-* token with Tailwind default as the fallback', () => {
    expect(FAMILIES.length, 'a vacuous run asserts nothing').toBeGreaterThan(0);
    for (const f of FAMILIES) {
      const re = new RegExp(`${escapeRe(f.tw)}\\s*:\\s*var\\(\\s*${escapeRe(f.kai)}\\s*,\\s*${escapeRe(f.fallback)}\\s*\\)`);
      expect(THEME_CSS, `${f.tw} must read var(${f.kai}, ${f.fallback})`).toMatch(re);
    }
  });

  it('the COMPILED shadow sheet carries the declaration on :host, which is what makes it overridable', () => {
    // Tailwind emits the @theme block as `:root,:host{...}`. Without the `:host`
    // half the declaration never reaches a shadow root at all; with `:root` alone
    // a consumer's own `:root` value would still lose to the sheet's literal
    // default. Both halves are the point, so the selector is read out of the
    // compiled sheet rather than assumed from Tailwind's documented behaviour.
    for (const f of FAMILIES) {
      const decl = `${f.tw}:var(${f.kai},`;
      const at = COMPILED.indexOf(decl);
      expect(at, `${decl} is missing from src/elements/compiled.css — run \`npm run build:css\``).toBeGreaterThan(-1);
      const braceOpen = COMPILED.lastIndexOf('{', at);
      const selector = COMPILED.slice(COMPILED.lastIndexOf('}', braceOpen) + 1, braceOpen);
      expect(selector, `the ${f.tw} declaration must sit on a selector that includes :host`).toContain(':host');
    }
  });

  it('the light-DOM path reaches the same declarations through the import, not a second copy', () => {
    // from. It carries no tokens of its own: it IMPORTS theme.css, which stays the
    // one place a family is declared. Copies are forbidden in both directions here,
    // and the kit has been bitten by each of them (see the header of
    // src/elements/styles.css), so the assertion is the import rather than a
    // restatement that would be free to drift.
    const solid = readFileSync(join(ROOT, 'solid.css'), 'utf8');
    expect(solid, 'solid.css must keep importing the sheet that declares the tokens').toMatch(
      /@import\s+['"]\.\/theme\.css['"]/,
    );
  });
});

describe('elevation and the weight ladder are routed through kit tokens too', () => {
  const shadowDecls = [...THEME_CSS.matchAll(/^\s*(--shadow[a-z0-9-]*):\s*([^;]+);/gm)].map(
    (m) => [m[1], m[2].replace(/\s+/g, ' ').trim()] as const,
  );

  it('every shadow rung theme.css declares scales by --kai-shadow-strength', () => {
    // Derived from what theme.css declares, so a rung added later without the
    // multiplier is red here — a rung that escapes the knob is exactly how
    // `rounded-2xl` escaped the radius knob.
    expect(shadowDecls.length, 'no shadow rungs declared — the derivation broke').toBeGreaterThan(5);
    const escaped = shadowDecls
      .filter(([, v]) => !v.includes('var(--kai-shadow-strength, 1)'))
      .map(([k]) => k);
    expect(escaped, `these rungs ignore the elevation knob: ${escaped.join(', ')}`).toEqual([]);
    expect(
      shadowDecls.map(([k]) => k),
      "bare `shadow` is 82 of the kit's call sites and reads its own key — it must be declared",
    ).toContain('--shadow');
  });

  it("un-scaled, every rung is exactly Tailwind's own value — so the default moves nothing", () => {
    for (const [name, value] of shadowDecls) {
      const unscaled = value.replace(/calc\(([^()]*?)\s*\*\s*var\(--kai-shadow-strength,\s*1\)\)/g, '$1').trim();
      expect(unscaled, `${name} must reproduce Tailwind's value for the same rung`).toBe(twDecl(name));
    }
  });

  it('the compiled sheet proves the plumbing rather than the declaration', () => {
    // The declaration could be right while the utility reads something else; the
    // sheet is what a shadow root actually resolves.
    expect(compiledRule('shadow') ?? '', 'bare .shadow must read the multiplier').toContain('--kai-shadow-strength');
    expect(compiledRule('shadow-md') ?? '', '.shadow-md too').toContain('--kai-shadow-strength');
  });

  it("each weight rung reads its own --kai-weight-* token, defaulting to Tailwind's number", () => {
    for (const rung of ['normal', 'medium', 'semibold', 'bold']) {
      const declared = twDecl(`--font-weight-${rung}`);
      expect(declared, `Tailwind declares no --font-weight-${rung}`).toBeDefined();
      expect(THEME_CSS, `--font-weight-${rung} must read --kai-weight-${rung}`).toMatch(
        new RegExp(`--font-weight-${rung}\\s*:\\s*var\\(\\s*--kai-weight-${rung}\\s*,\\s*${declared}\\s*\\)`),
      );
    }
    expect(compiledRule('font-medium') ?? '', 'and the utility must read the rung').toContain('var(--font-weight-medium)');
  });
});

describe('elevation and the weight ladder', () => {
  const shadowDecls = [...THEME_CSS.matchAll(/^\s*(--shadow[a-z0-9-]*):\s*([^;]+);/gm)].map(
    (m) => [m[1], m[2].replace(/\s+/g, ' ').trim()] as const,
  );

  it('every shadow rung theme.css declares scales by --kai-shadow-strength', () => {
    expect(shadowDecls.length, 'no shadow rungs declared — the derivation broke').toBeGreaterThan(5);
    const escaped = shadowDecls.filter(([, v]) => !v.includes('var(--kai-shadow-strength, 1)')).map(([k]) => k);
    expect(escaped, `these rungs ignore the elevation knob: ${escaped.join(', ')}`).toEqual([]);
    expect(shadowDecls.map(([k]) => k), 'bare `shadow` is most of the call sites').toContain('--shadow');
  });

  it("un-scaled, every rung is Tailwind's own value, so the default moves nothing", () => {
    for (const [name, value] of shadowDecls) {
      const unscaled = value.replace(/calc\(([^()]*?)\s*\*\s*var\(--kai-shadow-strength,\s*1\)\)/g, '$1').trim();
      expect(unscaled, name).toBe(twDecl(name));
    }
  });

  it('every shadow reading the elevation TINT also reads the SCALE', () => {
    // Hand-written elevation rules (.kai-elevation*) escaped the rung re-pointing once:
    // the tint knob moved the cards and the Elevation knob did nothing to them.
    const offenders: string[] = [];
    let tinted = 0;
    for (const sheet of ['theme.css', 'kit-base.css']) {
      const css = readFileSync(join(ROOT, sheet), 'utf8');
      for (const m of css.matchAll(/box-shadow\s*:([^;]+);/g)) {
        const decl = m[1];
        if (!decl.includes('var(--kai-shadow-color')) continue;
        tinted++;
        if (!decl.includes('var(--kai-shadow-strength')) offenders.push(`${sheet}:${decl.replace(/\s+/g, ' ').trim().slice(0, 80)}`);
      }
    }
    expect(tinted, 'no shadow reads the elevation tint — the derivation broke').toBeGreaterThan(1);
    expect(offenders, `tinted but not scaled, so a flat theme leaves them raised:\n  ${offenders.join('\n  ')}`).toEqual([]);
  });

  it("each weight rung reads its own token, defaulting to Tailwind's number", () => {
    for (const rung of ['normal', 'medium', 'semibold', 'bold']) {
      const declared = twDecl(`--font-weight-${rung}`);
      expect(declared, `Tailwind declares no --font-weight-${rung}`).toBeDefined();
      expect(THEME_CSS).toMatch(
        new RegExp(`--font-weight-${rung}\\s*:\\s*var\\(\\s*--kai-weight-${rung}\\s*,\\s*${declared}\\s*\\)`),
      );
    }
    expect(compiledRule('font-medium') ?? '').toContain('var(--font-weight-medium)');
  });
});

describe('the radius ladder is complete, so `rounded-*` is never a dead knob', () => {
  /** Derived from what components SPELL: a rung used with no theme.css line is red. */
  const used = new Set<string>();
  for (const file of shippingSources()) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/\brounded(?:-[trblxy])?(?:-(sm|md|lg|xl|2xl|3xl|4xl|full|none|pill))?\b/g)) {
      // Normalise sides away: `.rounded-t-lg` reads the same `--radius-lg` rung.
      used.add(m[0].replace(/-[trblxy](?=-|$)/, ''));
    }
  }

  /** Tailwind hardcodes rounded-full; a pill that should follow must be re-authored. */
  const CIRCLE = new Set(['rounded-full']);
  /** Zero, deliberately not the knob. */
  const LITERAL = new Set(['rounded-none']);
  /** Its own knob by design: round pills over square cards is a valid choice. */
  const INDEPENDENT = new Set(['rounded-pill']);

  it('the derivation is not vacuous', () => {
    expect(used.size, 'no rounded-* class found in shipping source — the walk broke').toBeGreaterThan(4);
    expect(used.has('rounded-lg')).toBe(true);
    expect(used.has('rounded-full')).toBe(true);
  });

  it('every rung a component uses compiles to a rule that reads a --radius variable', () => {
    const dead: string[] = [];
    for (const cls of [...used].sort()) {
      if (CIRCLE.has(cls) || LITERAL.has(cls)) continue;
      const rule = compiledRule(cls);
      if (rule === null) continue; // unused in the shipped sheet (see the vacuity case)
      if (!/var\(--radius/.test(rule)) dead.push(`${cls} -> ${rule}`);
    }
    expect(
      dead,
      `these rounded-* classes do not resolve through --radius, so --kai-radius silently ignores every surface that spells them:\n  ${dead.join('\n  ')}`,
    ).toEqual([]);
  });

  it('every rung it reads is derived from --radius in theme.css, not a stock value', () => {
    const rungs = new Set<string>();
    for (const cls of used) {
      if (CIRCLE.has(cls) || LITERAL.has(cls)) continue;
      const rule = compiledRule(cls);
      if (!rule) continue;
      for (const m of rule.matchAll(/var\(--radius(?:-([a-z0-9]+))?\)/g)) rungs.add(m[1] ?? '');
    }
    expect(rungs.size, 'no rung resolved — the check above would be vacuous').toBeGreaterThan(1);
    for (const rung of rungs) {
      const tw = rung ? `--radius-${rung}` : '--radius';
      if (tw === '--radius') continue; // the ladder's root, asserted by the family case
      if (INDEPENDENT.has(`rounded-${rung}`)) continue; // see INDEPENDENT above
      expect(THEME_CSS, `${tw} must be derived from --radius in theme.css, not left at Tailwind's stock value`).toMatch(
        new RegExp(`${tw}\\s*:\\s*(?:calc\\(\\s*)?var\\(--radius`),
      );
    }
  });

  it('the pill rung is overridable — its own token, with a rem fallback the editor can drag', () => {
    // Must read a --kai token AND fall back to a rem literal the editor can drag;
    // 4rem is "fully round up to 8rem tall", which covers caller-sized pills.
    expect(THEME_CSS, 'the pill rung must read --kai-radius-pill with a rem fallback').toMatch(
      /--radius-pill\s*:\s*var\(\s*--kai-radius-pill\s*,\s*[\d.]+rem\s*\)/,
    );
    expect(compiledRule('rounded-pill'), 'rounded-pill must exist and read the rung').toMatch(/var\(--radius-pill\)/);
  });
});
