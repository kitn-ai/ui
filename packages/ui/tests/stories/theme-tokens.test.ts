/**
 * The Token Reference story (src/stories/token-reference.stories.tsx ->
 * src/stories/docs/theme-tokens.tsx) claims to list "the complete, current set"
 * of overridable tokens. Its VALUES are read live from the loaded CSS, but its
 * NAME lists were hand-typed, and they had gone stale: the Radius table stopped
 * at --radius-xl, so --radius-2xl/3xl, --radius-pill and --code-radius were
 * invisible, and the elevation, weight and density knobs had no rows at all. The
 * Colours table was 17 tokens behind the same way, which is why it is derived
 * here too.
 *
 * The names are now derived (cornerTokens / knobTokens / colorTokens /
 * textTokens) and this is the guard over the derivation. Both sides reach their
 * set a DIFFERENT way on purpose: the component walks the loaded CSSOM at render
 * time, and these tests read theme.css's own declarations off disk -- so a token
 * whose declaration shape the derivation stops recognising fails here instead of
 * silently leaving the page.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { colorTokens, cornerTokens, knobTokens, PURPOSE, textTokens } from '../../src/stories/docs/theme-tokens';
import { declaredKitTokens } from '../../src/themes/theme-tokens';

const THEME_CSS = readFileSync(join(__dirname, '..', '..', 'theme.css'), 'utf8');

/** theme.css's own custom-property declarations, name -> raw value. Independent
 *  of the component's reader (a CSSOM walk in the browser): two readers, one
 *  derivation, or the guard would only be comparing the derivation with itself. */
function declaredIn(css: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of css.matchAll(/^\s*(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/gm)) out[m[1]] ??= m[2].trim();
  return out;
}

describe('token reference derives every corner rung theme.css declares', () => {
  const declared = declaredIn(THEME_CSS);
  const declaredCorners = Object.keys(declared)
    .filter((n) => /^--(code-)?radius/.test(n))
    .sort();
  const shown = cornerTokens(declared);

  it('theme.css declares a corner set worth guarding (the derivation is not vacuous)', () => {
    expect(declaredCorners.length).toBeGreaterThanOrEqual(9);
    for (const rung of ['--radius', '--radius-sm', '--radius-2xl', '--radius-3xl', '--radius-pill', '--code-radius']) {
      expect(declaredCorners, `${rung} is missing from theme.css`).toContain(rung);
    }
  });

  it('every corner theme.css declares has a row', () => {
    const missing = declaredCorners.filter((n) => !shown.includes(n));
    expect(
      missing,
      `declared in packages/ui/theme.css but absent from the Token Reference's Radius table: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('it shows no corner theme.css does not declare', () => {
    expect(shown.filter((n) => !declaredCorners.includes(n))).toEqual([]);
  });

  it('orders the ladder by the size each rung declares, not by sheet order', () => {
    expect(shown).toEqual([
      '--radius',
      '--radius-sm',
      '--radius-md',
      '--radius-lg',
      '--radius-xl',
      '--radius-2xl',
      '--radius-3xl',
      '--radius-pill',
      '--code-radius',
    ]);
    // Measured in a browser: Tailwind re-emits @theme with the root AFTER its rungs, so
    // an order inherited from the sheet puts --radius in the middle of the ladder.
    const reversed = Object.fromEntries(Object.entries(declared).reverse());
    expect(cornerTokens(reversed).slice(0, 7)).toEqual(shown.slice(0, 7));
    expect(cornerTokens(reversed)[0]).toBe('--radius');
  });

  it('drops Tailwind stock rungs, which read no kit token', () => {
    const withStock = { '--radius-xs': '0.125rem', '--radius-4xl': '2rem', ...declared };
    expect(cornerTokens(withStock)).toEqual(shown);
  });
});

describe('token reference derives every non-colour, non-type option theme.css wires', () => {
  const declared = declaredKitTokens(THEME_CSS);
  const expected = [...declared]
    .filter((n) => !n.startsWith('--kai-color-') && !n.startsWith('--kai-text-'))
    .sort();
  const shown = knobTokens([THEME_CSS]);

  it('theme.css wires a non-trivial option set (the derivation is not vacuous)', () => {
    for (const option of ['--kai-radius', '--kai-shadow-strength', '--kai-weight-semibold', '--kai-density']) {
      expect(expected, `${option} is missing from theme.css`).toContain(option);
    }
    expect(expected.length).toBeGreaterThanOrEqual(9);
  });

  it('the derivation returns exactly the options theme.css wires (colour and type excluded)', () => {
    expect(shown.map((k) => k.name).sort()).toEqual(expected);
  });

  it('reads each default whole -- a font stack and a color-mix() carry their own commas', () => {
    const fallback = (name: string) => shown.find((k) => k.name === name)?.fallback;
    expect(fallback('--kai-font-code')).toBe('ui-monospace, "SF Mono", Menlo, monospace');
    expect(fallback('--kai-shadow-color')).toBe('oklch(0 0 0)');
    expect(fallback('--kai-shadow-strength')).toBe('1');
    expect(fallback('--kai-density')).toBe('0.25rem');
    expect(fallback('--kai-weight-bold')).toBe('700');
  });
});

/** The colour table claimed to be the complete palette while its name list sat 17 tokens
 *  behind theme.css. Its expected set is derived a second way here -- from the `--kai-color-*`
 *  knobs theme.css wires, read by src/themes/theme-tokens.ts (which has its own coverage
 *  test) and stripped back to the token each knob drives -- so the derivation cannot vouch
 *  for itself. */
describe('token reference derives every colour row theme.css declares', () => {
  const declared = declaredIn(THEME_CSS);
  const expected = [...declaredKitTokens(THEME_CSS)]
    .map((n) => n.replace(/^--kai-/, '--'))
    .filter((n) => n.startsWith('--color-'))
    .sort();
  const declaredColors = Object.keys(declared)
    .filter((n) => n.startsWith('--color-'))
    .sort();
  const shown = colorTokens(declared);

  it('theme.css declares a palette worth guarding (the derivation is not vacuous)', () => {
    expect(declaredColors.length).toBeGreaterThanOrEqual(40);
    for (const token of ['--color-background', '--color-destructive-text', '--color-unread', '--color-selection-foreground']) {
      expect(declaredColors, `${token} is missing from theme.css`).toContain(token);
    }
  });

  it('shows exactly the colours theme.css wires a --kai-color-* knob into', () => {
    expect([...shown].sort()).toEqual(expected);
  });

  it('shows every --color-* theme.css declares -- a bare literal would leave the page', () => {
    const missing = declaredColors.filter((n) => !shown.includes(n));
    expect(
      missing,
      `declared in packages/ui/theme.css but absent from the Token Reference's Colors table: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('gives a row to a colour PURPOSE does not label, after the labelled ones', () => {
    const synthetic = { ...declared, '--color-brand-new': 'var(--kai-color-brand-new, hsl(1 2% 3%))' };
    expect(PURPOSE['--color-brand-new']).toBeUndefined();
    const rows = colorTokens(synthetic);
    expect(rows).toContain('--color-brand-new');
    expect(rows[rows.length - 1]).toBe('--color-brand-new');
  });

  it('drops stock Tailwind colours, which read no kit knob', () => {
    const withStock = { '--color-red-500': 'oklch(0.637 0.237 25.331)', ...declared };
    expect(colorTokens(withStock)).toEqual(shown);
  });

  it('orders rows by PURPOSE, not by the sheet', () => {
    // Every colour is labelled, so reversing the sheet must not move a single row (the
    // browser re-emits @theme in its own grouping -- declaration order cannot drive this).
    const reversed = Object.fromEntries(Object.entries(declared).reverse());
    expect(colorTokens(reversed)).toEqual(shown);
    expect(shown[0]).toBe('--color-background');
  });
});

/** The `--text-*` family carries Tailwind aliases (`--text-xs|sm|base` resolve a kit rung),
 *  so a derived set could have listed one token twice. It cannot: the derivation admits a
 *  token only when the knob it wires is named after the token itself, and an alias is by
 *  definition the case where it is not. */
describe('token reference derives every type rung theme.css declares', () => {
  const declared = declaredIn(THEME_CSS);
  const expected = [...declaredKitTokens(THEME_CSS)]
    .map((n) => n.replace(/^--kai-/, '--'))
    .filter((n) => n.startsWith('--text-'))
    .sort();
  const shown = textTokens(declared);

  it('shows exactly the rungs theme.css wires a --kai-text-* knob into', () => {
    expect(expected.length).toBeGreaterThanOrEqual(7);
    expect([...shown].sort()).toEqual(expected);
  });

  it('keeps the Tailwind alias rungs out -- each wires the rung above it', () => {
    for (const alias of ['--text-xs', '--text-sm', '--text-base']) {
      const rung = declared[alias]?.match(/var\(\s*(--kai-[a-zA-Z0-9-]+)/)?.[1]?.replace(/^--kai-/, '--');
      expect(rung, `${alias} is no longer an alias of a kit rung in theme.css`).toBeTruthy();
      expect(shown, `${alias} is a rung of the scale, not an alias`).not.toContain(alias);
      expect(shown, `${alias} aliases ${rung}, which the Typography table does not list`).toContain(rung);
    }
  });

  it('shows the scale ascending, and neither stock rungs nor --line-height properties', () => {
    expect(shown).toEqual([
      '--text-micro',
      '--text-caption',
      '--text-meta',
      '--text-compact',
      '--text-body',
      '--text-title',
      '--text-lg',
    ]);
    const withNoise = { '--text-4xl': '2.25rem', '--text-meta--line-height': 'calc(1 / 0.75)', ...declared };
    expect(textTokens(withNoise)).toEqual(shown);
  });
});
