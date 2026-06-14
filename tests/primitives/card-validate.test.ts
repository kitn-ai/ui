// tests/primitives/card-validate.test.ts
import { expect, test } from 'vitest';
import { validateAgainstSchema, type JsonSchema } from '../../src/primitives/card-validate';

const ok = (s: JsonSchema, v: unknown) => validateAgainstSchema(s, v).valid;

test('type checks', () => {
  expect(ok({ type: 'string' }, 'x')).toBe(true);
  expect(ok({ type: 'string' }, 1)).toBe(false);
  expect(ok({ type: 'integer' }, 2)).toBe(true);
  expect(ok({ type: 'integer' }, 2.5)).toBe(false);
  expect(ok({ type: 'number' }, 2.5)).toBe(true);
  expect(ok({ type: 'boolean' }, true)).toBe(true);
  expect(ok({ type: 'array' }, [])).toBe(true);
  expect(ok({ type: 'object' }, {})).toBe(true);
});

test('enum + const', () => {
  expect(ok({ enum: ['a', 'b'] }, 'a')).toBe(true);
  expect(ok({ enum: ['a', 'b'] }, 'c')).toBe(false);
  expect(ok({ const: true }, true)).toBe(true);
  expect(ok({ const: true }, false)).toBe(false);
});

test('object required + properties', () => {
  const s: JsonSchema = { type: 'object', required: ['a'], properties: { a: { type: 'string' }, n: { type: 'integer' } } };
  expect(ok(s, { a: 'x' })).toBe(true);
  expect(ok(s, { n: 1 })).toBe(false);          // missing required a
  expect(ok(s, { a: 'x', n: 1.5 })).toBe(false); // n not integer
});

test('number bounds + string length + pattern', () => {
  expect(ok({ type: 'number', minimum: 1, maximum: 5 }, 5)).toBe(true);
  expect(ok({ type: 'number', minimum: 1, maximum: 5 }, 6)).toBe(false);
  expect(ok({ type: 'number', exclusiveMaximum: 5 }, 5)).toBe(false);
  expect(ok({ type: 'string', minLength: 2, maxLength: 3 }, 'ab')).toBe(true);
  expect(ok({ type: 'string', minLength: 2 }, 'a')).toBe(false);
  expect(ok({ type: 'string', pattern: '^[a-z]+$' }, 'abc')).toBe(true);
  expect(ok({ type: 'string', pattern: '^[a-z]+$' }, 'AB')).toBe(false);
});

test('array items + minItems + uniqueItems', () => {
  expect(ok({ type: 'array', items: { type: 'string' } }, ['a', 'b'])).toBe(true);
  expect(ok({ type: 'array', items: { type: 'string' } }, ['a', 1])).toBe(false);
  expect(ok({ type: 'array', minItems: 1 }, [])).toBe(false);
  expect(ok({ type: 'array', uniqueItems: true }, ['a', 'a'])).toBe(false);
});

test('x-kitn-* keywords are ignored (not treated as constraints)', () => {
  expect(ok({ type: 'string', 'x-kitn-widget': 'rating' } as JsonSchema, 'x')).toBe(true);
});

test('errors are reported with paths', () => {
  const r = validateAgainstSchema(
    { type: 'object', required: ['a'], properties: { a: { type: 'string' } } },
    { a: 1 },
  );
  expect(r.valid).toBe(false);
  expect(r.errors.some((e) => e.includes('a'))).toBe(true);
});
