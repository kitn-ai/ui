import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * `dist/theme.tokens.css` is the plain-CSS twin of theme.css for <link>/CDN pages. theme.css has TWO
 * `@theme` rules now (the colour group is `static`), and the generator once took only the first and
 * matched the word `@theme` inside comments, which pulled `.light { }` and an `@utility` body into
 * `:root`. This runs the real script and reads what it wrote.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('build-theme-tokens over a theme.css with two @theme blocks', () => {
  execFileSync('node', [join(root, 'scripts/build-theme-tokens.mjs')], { cwd: root, stdio: 'pipe' });
  const css = readFileSync(join(root, 'dist/theme.tokens.css'), 'utf8');
  const rootBlock = /^:root \{\n([\s\S]*?)\n\}$/m.exec(css)?.[1] ?? '';

  it('leaves no Tailwind at-rule behind', () => {
    expect(css).not.toMatch(/^@theme\b/m);
    expect(css).not.toMatch(/^@utility\b/m);
  });
  it('merges both blocks into the one :root: static colours AND the ordinary theme', () => {
    expect(rootBlock).toContain('--color-info-foreground: var(--kai-color-info-foreground, light-dark(');
    expect(rootBlock).toContain('--shadow-2xs:');
    expect(rootBlock).toContain('--radius:');
  });
  it('keeps the scheme rules as their own top-level rules, not inside :root', () => {
    expect(css).toMatch(/^\.dark \{\n {2}--kai-color-scheme: dark;\n {2}color-scheme: dark;/m);
    expect(css).toMatch(/^\.light \{\n {2}--kai-color-scheme: light;\n {2}color-scheme: light;\n\}/m);
    expect(rootBlock).not.toContain('color-scheme: light');
    expect(rootBlock).not.toMatch(/^\s*background-color:/m);
  });
});
