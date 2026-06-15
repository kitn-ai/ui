import { describe, expect, it } from 'vitest';
import { displayNameFromClass } from '../../scripts/_ts-helpers.mjs';

describe('displayNameFromClass', () => {
  it('strips the Kc prefix and Element suffix', () => {
    expect(displayNameFromClass('KcArtifactElement')).toBe('Artifact');
  });
  it('preserves interior PascalCase', () => {
    expect(displayNameFromClass('KcChainOfThoughtElement')).toBe('ChainOfThought');
  });
  it('handles names that collide with globals (caller aliases)', () => {
    expect(displayNameFromClass('KcImageElement')).toBe('Image');
  });
});
