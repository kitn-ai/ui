import { describe, it, expect } from 'vitest';
import { normalizeValue, type ComposerDoc } from './composer-model';

describe('normalizeValue', () => {
  it('returns [] for nullish/empty', () => {
    expect(normalizeValue(undefined)).toEqual([]);
    expect(normalizeValue(null)).toEqual([]);
    expect(normalizeValue('')).toEqual([]);
  });
  it('wraps a non-empty string in a single text segment', () => {
    expect(normalizeValue('hello')).toEqual([{ type: 'text', text: 'hello' }]);
  });
  it('merges adjacent text segments and drops empties', () => {
    const input: ComposerDoc = [
      { type: 'text', text: 'a' }, { type: 'text', text: '' }, { type: 'text', text: 'b' },
    ];
    expect(normalizeValue(input)).toEqual([{ type: 'text', text: 'ab' }]);
  });
  it('keeps entities in order and merges text around them', () => {
    const e = { kind: 'skill', id: 'rec', label: 'Record & Replay' };
    const input: ComposerDoc = [
      { type: 'text', text: '' }, { type: 'entity', entity: e },
      { type: 'text', text: ' ' }, { type: 'text', text: 'go' },
    ];
    expect(normalizeValue(input)).toEqual([
      { type: 'entity', entity: e }, { type: 'text', text: ' go' },
    ]);
  });
  it('does not mutate the input array', () => {
    const input: ComposerDoc = [{ type: 'text', text: 'x' }];
    normalizeValue(input);
    expect(input).toEqual([{ type: 'text', text: 'x' }]);
  });
});
