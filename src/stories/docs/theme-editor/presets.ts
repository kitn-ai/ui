import type { Palette } from './theme-css';

export type Preset = { name: string; light: Palette; dark: Palette };
export type BrandOverride = { light: Palette; dark: Palette };

/** Per-preset brand-token overrides (light + dark). Neutrals come from the live base. */
export const BRAND_OVERRIDES: Record<string, BrandOverride> = {
  Violet: {
    light: {
      '--color-primary': 'hsl(262 83% 58%)',
      '--color-primary-foreground': 'hsl(0 0% 100%)',
      '--color-ring': 'hsl(262 83% 58%)',
      '--color-code-foreground': 'hsl(262 83% 58%)',
    },
    dark: {
      '--color-primary': 'hsl(263 70% 65%)',
      '--color-primary-foreground': 'hsl(0 0% 100%)',
      '--color-ring': 'hsl(263 70% 65%)',
      '--color-code-foreground': 'hsl(263 90% 80%)',
    },
  },
  Emerald: {
    light: {
      '--color-primary': 'hsl(160 84% 39%)',
      '--color-primary-foreground': 'hsl(0 0% 100%)',
      '--color-ring': 'hsl(160 84% 39%)',
      '--color-code-foreground': 'hsl(160 84% 32%)',
    },
    dark: {
      '--color-primary': 'hsl(158 64% 52%)',
      '--color-primary-foreground': 'hsl(160 30% 8%)',
      '--color-ring': 'hsl(158 64% 52%)',
      '--color-code-foreground': 'hsl(158 70% 65%)',
    },
  },
  Mono: {
    light: {
      '--color-primary': 'hsl(0 0% 20%)',
      '--color-primary-foreground': 'hsl(0 0% 98%)',
      '--color-ring': 'hsl(0 0% 40%)',
      '--color-code-foreground': 'hsl(0 0% 30%)',
    },
    dark: {
      '--color-primary': 'hsl(0 0% 92%)',
      '--color-primary-foreground': 'hsl(0 0% 12%)',
      '--color-ring': 'hsl(0 0% 70%)',
      '--color-code-foreground': 'hsl(0 0% 75%)',
    },
  },
};

const ORDER = ['Default', 'Violet', 'Emerald', 'Mono'];

/** Build full presets by layering brand overrides onto the live-discovered base palette. */
export function buildPresets(base: { light: Palette; dark: Palette }): Preset[] {
  return ORDER.map((name) => {
    const ov = BRAND_OVERRIDES[name];
    return {
      name,
      light: ov ? { ...base.light, ...ov.light } : { ...base.light },
      dark: ov ? { ...base.dark, ...ov.dark } : { ...base.dark },
    };
  });
}
