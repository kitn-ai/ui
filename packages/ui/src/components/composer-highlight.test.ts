import { describe, it, expect } from 'vitest';
import { findHighlightMatches } from './composer-highlight';

describe('findHighlightMatches', () => {
  it('finds literal keyword ranges (case-insensitive)', () => {
    expect(findHighlightMatches('Deploy the deploy now', ['deploy'])).toEqual([
      { start: 0, end: 6, class: undefined },
      { start: 11, end: 17, class: undefined },
    ]);
  });
  it('supports regex rules with a class', () => {
    expect(findHighlightMatches('id-123 ok', [{ pattern: 'id-\\d+', class: 'tok' }])).toEqual([
      { start: 0, end: 6, class: 'tok' },
    ]);
  });
  it('returns [] when nothing matches', () => {
    expect(findHighlightMatches('nothing', ['zzz'])).toEqual([]);
  });
});
