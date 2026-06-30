import { describe, expect, it } from 'vitest';
import { displayNameFromClass } from '../../scripts/_ts-helpers.mjs';

describe('displayNameFromClass', () => {
  it('strips the Kai prefix and Element suffix', () => {
    expect(displayNameFromClass('KaiArtifactElement')).toBe('Artifact');
  });
  it('preserves interior PascalCase', () => {
    expect(displayNameFromClass('KaiChainOfThoughtElement')).toBe('ChainOfThought');
  });
  it('handles names that collide with globals (caller aliases)', () => {
    expect(displayNameFromClass('KaiImageElement')).toBe('Image');
  });
});
