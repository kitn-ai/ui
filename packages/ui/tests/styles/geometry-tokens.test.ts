import { readFileSync } from 'node:fs';
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
    // `solid.css` is the Tailwind SOURCE sheet a light-DOM Solid consumer builds
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
