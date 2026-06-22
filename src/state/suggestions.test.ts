import { describe, it, expect } from 'vitest';
import { addSuggestion, removeSuggestion } from './suggestions';

describe('suggestion helpers', () => {
  it('addSuggestion appends and returns a new array', () => {
    const a = ['x'];
    const out = addSuggestion(a, 'y');
    expect(out).toEqual(['x', 'y']);
    expect(out).not.toBe(a);
  });

  it('addSuggestion is idempotent (no duplicates)', () => {
    expect(addSuggestion(['x'], 'x')).toEqual(['x']);
  });

  it('removeSuggestion drops the value', () => {
    expect(removeSuggestion(['x', 'y'], 'x')).toEqual(['y']);
  });
});
