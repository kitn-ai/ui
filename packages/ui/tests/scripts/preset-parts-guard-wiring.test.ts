import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const ui = resolve(__dirname, '../..');
describe('lint:preset-parts wiring', () => {
  it('self-test passes (fires on the private import, passes the clean one)', () => {
    execFileSync('node', ['scripts/lint-preset-parts.mjs', '--self-test'], { cwd: ui });
  }, 60_000); // builds a TypeScript program: seconds, and far more on a loaded box
  it('every listed facade exists and its tag is registered', () => {
    const list = JSON.parse(readFileSync(resolve(ui, 'scripts/preset-facades.json'), 'utf8')) as { tag: string; facade: string }[];
    const manifest = readFileSync(resolve(ui, 'src/web-components/web-component-manifest.json'), 'utf8');
    for (const { tag, facade } of list) {
      expect(existsSync(resolve(ui, facade)), facade).toBe(true);
      expect(manifest.includes(`"${tag}"`), tag).toBe(true);
    }
  });
  it('is invoked by CI', () => {
    const ci = readFileSync(resolve(ui, '../../.github/workflows/test.yml'), 'utf8');
    expect(ci).toMatch(/lint:preset-parts/);
  });
});
