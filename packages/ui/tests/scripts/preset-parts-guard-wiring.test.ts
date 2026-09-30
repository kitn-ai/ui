import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const ui = resolve(__dirname, '../..');
describe('lint:preset-parts wiring', () => {
  it('self-test passes (fires on the private import, passes the clean one)', () => {
    execFileSync('node', ['scripts/lint-preset-parts.mjs', '--self-test'], { cwd: ui });
  }, 60_000); // builds a TypeScript program: seconds, and far more on a loaded box
  it('has no hand-kept facade list', () => {
    expect(existsSync(resolve(ui, 'scripts/preset-facades.json'))).toBe(false);
  });
  it('the real scan runs and its discovered tags cover the manifest', () => {
    // main() exits 1 when discovery finds fewer tags than web-component-manifest.json registers.
    const out = execFileSync('node', ['scripts/lint-preset-parts.mjs'], { cwd: ui, encoding: 'utf8' });
    expect(out).toMatch(/lint-preset-parts OK: \d+ facade files/);
  }, 120_000);
  it('is invoked by CI', () => {
    const ci = readFileSync(resolve(ui, '../../.github/workflows/test.yml'), 'utf8');
    expect(ci).toMatch(/lint:preset-parts/);
  });
});
