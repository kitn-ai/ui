import { describe, it, expect } from 'vitest';
import { detectTrigger, activeTriggerFor } from './composer-triggers';

const CH = ['/', '@'];
describe('detectTrigger', () => {
  it('detects a slash at start of text', () => {
    expect(detectTrigger('/rec', 4, CH)).toEqual({ char: '/', query: 'rec', start: 0 });
  });
  it('detects an @ after whitespace', () => {
    expect(detectTrigger('hi @ro', 6, CH)).toEqual({ char: '@', query: 'ro', start: 3 });
  });
  it('returns null when a space follows the trigger before the caret', () => {
    expect(detectTrigger('/rec now', 8, CH)).toBeNull();
  });
  it('returns null when the trigger is glued to a word (no boundary)', () => {
    expect(detectTrigger('a/b', 3, CH)).toBeNull();
  });
  it('returns empty query right after typing the char', () => {
    expect(detectTrigger('hello @', 7, CH)).toEqual({ char: '@', query: '', start: 6 });
  });
  it('ignores chars not in the set', () => {
    expect(detectTrigger('#tag', 4, CH)).toBeNull();
  });
});

describe('activeTriggerFor', () => {
  const defs = [{ char: '/', kind: 'skill' }, { char: '@', kind: 'mention' }];

  it('matches a defined trigger and returns its def + query', () => {
    expect(activeTriggerFor('/re', 3, defs)).toEqual({ def: defs[0], query: 're', start: 0 });
  });

  it('matches the @ trigger', () => {
    expect(activeTriggerFor('hi @ro', 6, defs)).toEqual({ def: defs[1], query: 'ro', start: 3 });
  });

  it('returns null when no trigger is active', () => {
    expect(activeTriggerFor('hi', 2, defs)).toBeNull();
  });

  it('returns null when the query has a space (trigger closed)', () => {
    expect(activeTriggerFor('/rec now', 8, defs)).toBeNull();
  });

  it('returns null when defs is empty', () => {
    expect(activeTriggerFor('/foo', 4, [])).toBeNull();
  });

  it('returns empty query right after typing the trigger char', () => {
    const result = activeTriggerFor('/', 1, defs);
    expect(result).toEqual({ def: defs[0], query: '', start: 0 });
  });
});
