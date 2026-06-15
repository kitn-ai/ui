import { test, expect } from 'vitest';
import { negotiateVersion, isValidVersion } from '../../src/remote/version';

test('isValidVersion accepts decimal-int strings only', () => {
  expect(isValidVersion('1')).toBe(true);
  expect(isValidVersion('12')).toBe(true);
  expect(isValidVersion('1e3')).toBe(false);
  expect(isValidVersion('0x2')).toBe(false);
  expect(isValidVersion(' 2 ')).toBe(false);
  expect(isValidVersion('')).toBe(false);
});

test('negotiateVersion picks the highest common, null when disjoint or invalid', () => {
  expect(negotiateVersion(['1'], ['1'])).toBe('1');
  expect(negotiateVersion(['1', '2'], ['1', '2', '3'])).toBe('2');
  expect(negotiateVersion(['1'], ['2'])).toBeNull();
  expect(negotiateVersion(['1e3'], ['1e3'])).toBeNull();
  expect(negotiateVersion([], ['1'])).toBeNull();
});
