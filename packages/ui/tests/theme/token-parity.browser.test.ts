import { afterEach, describe, expect, it } from 'vitest';
import fixture from './token-values.fixture.json';
import { COLOR_TOKENS, mount, resolveTokens } from './token-probe';

/**
 * Every colour token resolves to the value it had BEFORE the light-dark() migration, in both schemes,
 * on each of the three spike elements. The fixture was captured from the old `.dark`-class tokens
 * (commit "capture every colour token's light and dark value before the theme migration") and is
 * never regenerated to make this pass.
 *
 * NO allowance for absent tokens: eight of them used to vanish from the sheet in light because Tailwind
 * tree-shakes unused `@theme` variables, and the colour group is now `@theme static`, so every one of the
 * tokens is emitted in both schemes. A token that goes missing again resolves transparent and fails here.
 */
const TRANSPARENT = 'rgba(0, 0, 0, 0)';
const F = fixture as unknown as { light: Record<string, string>; dark: Record<string, string> };
// The fixture recorded these as absent in LIGHT (transparent) because the old sheet never emitted them.
// Their light value is therefore not a regression to compare against; every other cell is.
const NOT_IN_OLD_LIGHT = new Set(COLOR_TOKENS.filter((t) => F.light[t] === TRANSPARENT));

const live: HTMLElement[] = [];
afterEach(() => { live.splice(0).forEach((e) => e.remove()); });

describe('colour token parity against the pre-migration fixture', () => {
  it('the fixture covers every token theme.css declares', () => {
    expect(Object.keys(F.light).sort()).toEqual(COLOR_TOKENS);
    expect(Object.keys(F.dark).sort()).toEqual(COLOR_TOKENS);
    expect(NOT_IN_OLD_LIGHT.size).toBe(8);
  });

  for (const tag of ['kai-button', 'kai-thread', 'kai-prompt-input']) {
    for (const scheme of ['light', 'dark'] as const) {
      it(`${tag} theme="${scheme}": every token equals the fixture`, async () => {
        const el = await mount(tag, { theme: scheme });
        live.push(el);
        const { resolved } = resolveTokens(el);
        const shifted = COLOR_TOKENS.filter((t) => !(scheme === 'light' && NOT_IN_OLD_LIGHT.has(t)) && resolved[t] !== F[scheme][t])
          .map((t) => `${t}: was ${F[scheme][t]} now ${resolved[t]}`);
        expect(shifted).toEqual([]);
        // Every token is emitted, in both schemes: nothing resolves transparent any more.
        expect(COLOR_TOKENS.filter((t) => resolved[t] === TRANSPARENT)).toEqual([]);
        // A vacuity guard: the two schemes must actually differ, or "equal to the fixture" proves nothing.
        expect(COLOR_TOKENS.filter((t) => F.light[t] !== F.dark[t]).length).toBeGreaterThan(30);
      });
    }
  }
});
