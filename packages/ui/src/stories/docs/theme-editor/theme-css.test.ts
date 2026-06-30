import { describe, it, expect } from 'vitest';
import { buildThemeCss } from './theme-css';

describe('buildThemeCss', () => {
  it('emits sorted :root and .dark blocks', () => {
    const css = buildThemeCss(
      { '--color-primary': '#ffffff', '--radius': '0.6rem' },
      { '--color-primary': '#000000' },
    );
    expect(css).toBe(
      ':root {\n  --color-primary: #ffffff;\n  --radius: 0.6rem;\n}\n\n.dark {\n  --color-primary: #000000;\n}',
    );
  });

  it('keys are sorted within each block', () => {
    const css = buildThemeCss({ '--b': '2', '--a': '1' }, {});
    expect(css).toBe(':root {\n  --a: 1;\n  --b: 2;\n}\n\n.dark {\n\n}');
  });
});
