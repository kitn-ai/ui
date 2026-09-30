/**
 * The /patterns index renders what the derived index says, and nothing typed.
 * The kai-* elements are not involved (plain markup), so jsdom is enough.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { render, screen } from '@solidjs/testing-library';
import { PatternCards } from '../src/components/blocks/PatternsList';
import { addPatternCommandFor, patternInstallDir, patternsUrl } from '../src/lib/blocks-source';
import type { PatternItem } from '../src/lib/blocks-source';

const item = (name: string): PatternItem => ({
  name,
  kind: 'pattern',
  title: `Title ${name}`,
  description: `About ${name}.`,
  files: [{ path: `${name}.html`, type: 'html' }],
});

describe('PatternCards', () => {
  it('renders one card per index item with its derived command and install dir', () => {
    render(() => <PatternCards items={[item('alpha'), item('beta')]} />);
    for (const name of ['alpha', 'beta']) {
      const card = screen.getByTestId(`pattern-${name}`);
      expect(card.textContent).toContain(`Title ${name}`);
      expect(card.textContent).toContain(addPatternCommandFor(name));
      expect(card.textContent).toContain(patternInstallDir(name));
    }
    expect(screen.getByTestId('pattern-list').children).toHaveLength(2);
  });

  it('renders no cards for an empty index (nothing hand-typed fills the gap)', () => {
    render(() => <PatternCards items={[]} />);
    expect(screen.getByTestId('pattern-list').children).toHaveLength(0);
  });

  it('reads the derived index and installs under src/patterns', () => {
    expect(patternsUrl()).toBe('/blocks/patterns.json');
    expect(patternInstallDir('x')).toBe('src/patterns/x/');
    expect(addPatternCommandFor('x')).toBe('npx -y @kitn.ai/cli add x');
  });
});

describe('the install command the page shows is one the CLI answers', () => {
  const cliRoot = resolve(__dirname, '../../../packages/cli');
  const pkg = JSON.parse(readFileSync(join(cliRoot, 'package.json'), 'utf8')) as { name: string; bin: Record<string, string> };

  it('names the CLI package, whose only bin is the one npx runs', () => {
    expect(addPatternCommandFor('x')).toContain(pkg.name);
    expect(Object.keys(pkg.bin), 'npx picks the bin by package name, or the only bin; more than one makes the command ambiguous').toHaveLength(1);
  });

  it('that bin forwards `add` to create-kai, which is where patterns install', () => {
    const bin = readFileSync(join(cliRoot, Object.values(pkg.bin)[0]), 'utf8');
    expect(bin).toMatch(/kai add <block>/);
    expect(bin).toMatch(/create-kai/);
  });
});
