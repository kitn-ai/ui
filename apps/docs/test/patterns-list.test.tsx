/**
 * The /patterns index renders what the derived index says, and nothing typed.
 * The kai-* elements are not involved (plain markup), so jsdom is enough.
 */
import { describe, it, expect } from 'vitest';
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
    expect(addPatternCommandFor('x')).toBe('npx @kitn.ai/cli add x');
  });
});
