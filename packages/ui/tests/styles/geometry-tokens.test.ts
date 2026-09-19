import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Geometry tokens: the half of the theme surface that was NOT tokenized.
 *
 * Colour and type (and `--kai-radius`) each reach a shadow root because
 * theme.css declares the Tailwind variable as `var(--kai-<name>, <default>)`, and
 * Tailwind emits that @theme block as `:root,:host{...}`. A consumer's
 * `:root{--kai-color-primary: ...}` therefore WINS: the shadow sheet reads the
 * token rather than stating the value.
 *
 * Geometry was left out of that arrangement, so `:root{--spacing: 1rem}` reaches
 * a shadow root and is then overridden by the sheet's own hard declaration of
 * Tailwind's default — the consumer pays for a file that themes nothing, which is
 * the failure mode this file exists to make loud. Every family added below has to
 * satisfy the same two properties, and each has a real-browser counterpart in
 * `tests/e2e/geometry-token.spec.ts` because a custom property's resolution can
 * only be settled by the real cascade.
 *
 * THE FALLBACK IS NOT A STYLE CHOICE. It must equal Tailwind's own default for
 * that variable, or every consumer's geometry moves the moment they install a
 * version of the kit they did not change anything in — a silent, kit-wide visual
 * regression on upgrade. Each family states the default it re-points, and the
 * first test compares it against the value Tailwind would have used.
 */
const ROOT = join(__dirname, '..', '..');
const THEME_CSS = readFileSync(join(ROOT, 'theme.css'), 'utf8');
const COMPILED = readFileSync(join(ROOT, 'src', 'elements', 'compiled.css'), 'utf8');

/** Every file whose class strings ship in the element bundle. Stories and tests are
 *  excluded for the same reason `src/elements/styles.css` excludes them from
 *  Tailwind's `@source`: their classes never reach a consumer. */
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

describe('the radius ladder is complete, so `rounded-*` is never a dead knob', () => {
  /**
   * Derived from what components actually SPELL, not from the ladder theme.css
   * declares — because that is the direction the defect arrived in. Tailwind's
   * `--radius-2xl`/`-3xl` are their own stock values, so a component using
   * `rounded-2xl` ignored `--kai-radius` completely: the knob visibly worked on the
   * cards tab and did nothing to a message bubble. The set below cannot notice a
   * rung nobody uses, and does not need to; it notices every rung somebody DOES.
   */
  const used = new Set<string>();
  for (const file of shippingSources()) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/\brounded(?:-[trblxy])?(?:-(sm|md|lg|xl|2xl|3xl|4xl|full|none|pill))?\b/g)) {
      // Normalise sides away: `.rounded-t-lg` reads the same `--radius-lg` rung.
      used.add(m[0].replace(/-[trblxy](?=-|$)/, ''));
    }
  }

  /** Genuinely circular, and Tailwind hardcodes it to `3.40282e38px`: no custom
   *  property can reach it, so it is out of scope by construction rather than by
   *  choice. A pill/badge that SHOULD follow the knob has to be re-authored. */
  const CIRCLE = new Set(['rounded-full']);
  /** Zero, deliberately not the knob. */
  const LITERAL = new Set(['rounded-none']);
  /**
   * Not derived from `--radius`, and that is the design rather than a gap: a pill
   * is its own shape family (badges, chips, tags, switch tracks) and a consumer
   * may want round pills over square cards. Its rung therefore reads its OWN token
   * — checked separately below, because "derived from --radius" is the assertion
   * that makes every OTHER rung follow the knob.
   */
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
    // Two things at once, both required for the knob to exist at all: the rung
    // must read a `--kai-*` token (so a consumer can set it) and the fallback must
    // be a rem LITERAL, because the theme editor's `remValue` cannot parse
    // `calc()` and a 3.4e38 sentinel has no usable slider range. 4rem is the rem
    // expression of "fully round on any box up to 8rem tall", which covers the
    // consumer-sized pills (`builder-skeleton`'s caller-chosen height, the
    // amplitude-driven audio bars) and not only the kit's own badges.
    expect(THEME_CSS, 'the pill rung must read --kai-radius-pill with a rem fallback').toMatch(
      /--radius-pill\s*:\s*var\(\s*--kai-radius-pill\s*,\s*[\d.]+rem\s*\)/,
    );
    expect(compiledRule('rounded-pill'), 'rounded-pill must exist and read the rung').toMatch(/var\(--radius-pill\)/);
  });
});
