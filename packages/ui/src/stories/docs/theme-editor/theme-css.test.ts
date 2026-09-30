import { describe, it, expect } from 'vitest';
import { buildThemeCss } from './theme-css';

describe('buildThemeCss', () => {
  it('emits ONE sorted :root block, light-dark() where the schemes differ', () => {
    const css = buildThemeCss(
      { '--color-primary': '#ffffff', '--color-border': '#eee', '--radius': '0.6rem' },
      { '--color-primary': '#000000', '--color-border': '#eee' },
    );
    expect(css).toBe(
      ':root {\n  --color-border: #eee;\n  --color-primary: light-dark(#ffffff, #000000);\n  --radius: 0.6rem;\n}',
    );
    expect(css).not.toContain('.dark');
  });

  it('keeps a dark-only key rather than dropping it, and sorts keys', () => {
    expect(buildThemeCss({ '--b': '2' }, { '--a': '1' })).toBe(':root {\n  --a: 1;\n  --b: 2;\n}');
  });
});
