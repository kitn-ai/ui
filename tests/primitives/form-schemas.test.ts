// tests/primitives/form-schemas.test.ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { validateAgainstSchema, type JsonSchema } from '../../src/primitives/card-validate';

const load = (name: string): JsonSchema =>
  JSON.parse(readFileSync(`src/primitives/card-schemas/${name}`, 'utf-8'));

test('form.schema.json parses + validates a known-good form definition', () => {
  const s = load('form.schema.json');
  const good = {
    type: 'object',
    title: 'How did we do?',
    required: ['rating'],
    properties: {
      rating: { type: 'integer', minimum: 1, maximum: 5 },
    },
  };
  expect(validateAgainstSchema(s, good).valid).toBe(true);
});

test('form.schema.json rejects a malformed form definition', () => {
  const s = load('form.schema.json');
  // wrong root type (not the object meta-shape)
  expect(validateAgainstSchema(s, { type: 'array', properties: {} }).valid).toBe(false);
  // missing required `properties`
  expect(validateAgainstSchema(s, { type: 'object' }).valid).toBe(false);
  // missing required `type`
  expect(validateAgainstSchema(s, { properties: {} }).valid).toBe(false);
});

test('form.result.schema.json parses + requires an object', () => {
  const s = load('form.result.schema.json');
  expect(validateAgainstSchema(s, { rating: 4, plan: 'pro' }).valid).toBe(true);
  expect(validateAgainstSchema(s, 'not an object').valid).toBe(false);
});
