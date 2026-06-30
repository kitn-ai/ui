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
    const a = ['x'];
    const out = addSuggestion(a, 'x');
    expect(out).toEqual(['x']);
    expect(out).not.toBe(a);   // new array even when nothing was added
  });

  it('removeSuggestion drops the value', () => {
    const a = ['x', 'y'];
    const out = removeSuggestion(a, 'x');
    expect(out).toEqual(['y']);
    expect(out).not.toBe(a);
    expect(a).toEqual(['x', 'y']);  // input untouched
  });
});
