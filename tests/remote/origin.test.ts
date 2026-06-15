import { test, expect } from 'vitest';
import { assertOrigin, assertCrossOrigin, redactFrame } from '../../src/remote/origin';

test('assertOrigin: exact match only', () => {
  expect(assertOrigin('https://p.example', 'https://p.example')).toBe(true);
  expect(assertOrigin('https://p.example/', 'https://p.example')).toBe(false);
  expect(assertOrigin('http://p.example', 'https://p.example')).toBe(false);
  expect(assertOrigin('', 'https://p.example')).toBe(false);
  expect(assertOrigin(null as unknown as string, 'https://p.example')).toBe(false);
});

test('assertCrossOrigin: throws when provider equals host or src origin mismatches', () => {
  expect(() => assertCrossOrigin('https://p.example/card', 'https://p.example', 'https://host.example')).not.toThrow();
  expect(() => assertCrossOrigin('https://other.example/card', 'https://p.example', 'https://host.example')).toThrow();
  expect(() => assertCrossOrigin('https://host.example/card', 'https://host.example', 'https://host.example')).toThrow();
});

test('redactFrame: allowlists known-safe fields, redacts authToken + nonce + everything else', () => {
  const f = {
    protocol: 'kitn-card', version: '1', nonce: 'secret-nonce',
    message: { dir: 'down', kind: 'context', context: { theme: { mode: 'light' }, locale: 'en', authToken: 'SECRET' } },
  };
  const r = JSON.stringify(redactFrame(f));
  expect(r).not.toContain('SECRET');
  expect(r).not.toContain('secret-nonce');
  expect(r).toContain('context');
});
