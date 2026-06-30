import { test, expect } from 'vitest';
import { hasPollutionKey, isKnownEventKind } from '../../src/remote/validate';

test('hasPollutionKey walks nested objects', () => {
  expect(hasPollutionKey({ a: { b: { ['__proto__']: 1 } } })).toBe(true);
  expect(hasPollutionKey({ a: { constructor: 1 } })).toBe(true);
  expect(hasPollutionKey({ a: { b: 1 } })).toBe(false);
  expect(hasPollutionKey([{ ok: 1 }, { prototype: 2 }])).toBe(true);
});

test('isKnownEventKind accepts contract verbs only', () => {
  expect(isKnownEventKind('submit')).toBe(true);
  expect(isKnownEventKind('action')).toBe(true);
  expect(isKnownEventKind('open')).toBe(true);
  expect(isKnownEventKind('nope')).toBe(false);
});
