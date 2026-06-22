import { describe, it, expect } from 'vitest';
import { detectTrigger } from './composer-triggers';

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
