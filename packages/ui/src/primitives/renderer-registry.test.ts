import { describe, it, expect } from 'vitest';
import { resolveRenderer, isValidCustomElementName } from './renderer-registry';

describe('resolveRenderer', () => {
  it('returns the most specific key present', () => {
    const map = { tool: 'my-tool', 'tool:web_search': 'my-search' };
    expect(resolveRenderer(map, ['tool:web_search', 'tool'])).toBe('my-search');
    expect(resolveRenderer(map, ['tool:other', 'tool'])).toBe('my-tool');
  });
  it('returns undefined for no map or no match', () => {
    expect(resolveRenderer(undefined, ['tool'])).toBeUndefined();
    expect(resolveRenderer({}, ['tool'])).toBeUndefined();
  });
});
describe('isValidCustomElementName', () => {
  it('accepts hyphenated lowercase names and rejects others', () => {
    expect(isValidCustomElementName('my-step')).toBe(true);
    expect(isValidCustomElementName('mystep')).toBe(false);
    expect(isValidCustomElementName('My-Step')).toBe(false);
    expect(isValidCustomElementName('<img>')).toBe(false);
  });
});
