import { afterEach, describe, expect, it } from 'vitest';
import fixture from './token-values.fixture.json';
import { COLOR_TOKENS, mount, resolveTokens } from './token-probe';

/**
 * Every colour token resolves to the value it had BEFORE the light-dark() migration, in both schemes,
 * on each of the three spike elements. The fixture was captured from the old `.dark`-class tokens
 * (commit "capture every colour token's light and dark value before the theme migration") and is
 * never regenerated to make this pass.
 *
 * Eight tokens are ABSENT from the light snapshot (they resolve transparent): Tailwind tree-shakes
 * unused `@theme` variables out of `:root,:host`, while the plain `.dark {}` rule kept them, so the old
 * sheet defined them in dark only, by accident, and no shipped class reads them. `UNDEFINED_IN_LIGHT` is
 * DERIVED from the fixture, not typed. With the `.dark` block gone they are absent in BOTH schemes: that
 * is the one recorded drift, and it is asserted as "equal to the old value OR absent" so it can neither
 * hide a changed value nor grow to a ninth token.
 */
const TRANSPARENT = 'rgba(0, 0, 0, 0)';
const F = fixture as unknown as { light: Record<string, string>; dark: Record<string, string> };
const UNDEFINED_IN_LIGHT = COLOR_TOKENS.filter((t) => F.light[t] === TRANSPARENT);

const live: HTMLElement[] = [];
afterEach(() => { live.splice(0).forEach((e) => e.remove()); });

describe('colour token parity against the pre-migration fixture', () => {
  it('the fixture covers every token theme.css declares, and the derived absent set is the known small one', () => {
    expect(Object.keys(F.light).sort()).toEqual(COLOR_TOKENS);
    expect(Object.keys(F.dark).sort()).toEqual(COLOR_TOKENS);
    expect(UNDEFINED_IN_LIGHT.length).toBeGreaterThan(0);
    expect(UNDEFINED_IN_LIGHT.length).toBeLessThan(15);
  });

  for (const tag of ['kai-button', 'kai-thread', 'kai-prompt-input']) {
    for (const scheme of ['light', 'dark'] as const) {
      it(`${tag} theme="${scheme}": every token equals the fixture`, async () => {
        const el = await mount(tag, { theme: scheme });
        live.push(el);
        const { resolved } = resolveTokens(el);
        const absentOk = new Set(UNDEFINED_IN_LIGHT);
        const shifted = COLOR_TOKENS.filter((t) => resolved[t] !== F[scheme][t] && !(absentOk.has(t) && resolved[t] === TRANSPARENT))
          .map((t) => `${t}: was ${F[scheme][t]} now ${resolved[t]}`);
        expect(shifted).toEqual([]);
        const absentNow = COLOR_TOKENS.filter((t) => resolved[t] === TRANSPARENT);
        expect(absentNow.every((t) => absentOk.has(t))).toBe(true);
        // A vacuity guard: the two schemes must actually differ, or "equal to the fixture" proves nothing.
        expect(COLOR_TOKENS.filter((t) => F.light[t] !== F.dark[t]).length).toBeGreaterThan(30);
      });
    }
  }
});
