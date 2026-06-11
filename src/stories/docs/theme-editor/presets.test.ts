import { describe, it, expect } from 'vitest';
import { buildPresets, BRAND_OVERRIDES } from './presets';

const base = {
  light: { '--color-primary': 'hsl(240 5.9% 10%)', '--color-border': 'hsl(240 5.9% 90%)', '--radius': '0.6rem' },
  dark: { '--color-primary': 'hsl(0 0% 98%)', '--color-border': 'hsl(240 3.7% 15.9%)' },
};

describe('buildPresets', () => {
  it('orders Default first, then the brand presets', () => {
    expect(buildPresets(base).map((p) => p.name)).toEqual(['Default', 'Violet', 'Emerald', 'Mono']);
  });

  it('Default preset equals the base palette (no drift)', () => {
    const def = buildPresets(base).find((p) => p.name === 'Default')!;
    expect(def.light).toEqual(base.light);
    expect(def.dark).toEqual(base.dark);
  });

  it('brand presets override primary but preserve base neutrals', () => {
    const violet = buildPresets(base).find((p) => p.name === 'Violet')!;
    expect(violet.light['--color-primary']).toBe(BRAND_OVERRIDES.Violet.light['--color-primary']);
    expect(violet.light['--color-border']).toBe(base.light['--color-border']);
    expect(violet.light['--radius']).toBe(base.light['--radius']);
  });

  it('does not mutate the base palette', () => {
    const snapshot = JSON.stringify(base);
    buildPresets(base);
    expect(JSON.stringify(base)).toBe(snapshot);
  });
});
