// tests/primitives/card-schemas.test.ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { validateAgainstSchema, type JsonSchema } from '../../src/primitives/card-validate';

const load = (name: string): JsonSchema =>
  JSON.parse(readFileSync(`src/primitives/card-schemas/${name}`, 'utf-8'));

test('card-envelope schema parses + validates a good/bad envelope', () => {
  const s = load('card-envelope.schema.json');
  expect(validateAgainstSchema(s, { type: 'form', id: 'c1', data: {} }).valid).toBe(true);
  expect(validateAgainstSchema(s, { id: 'c1', data: {} }).valid).toBe(false); // missing type
});

test('card-event schema parses + validates a good/bad event', () => {
  const s = load('card-event.schema.json');
  expect(validateAgainstSchema(s, { kind: 'ready', cardId: 'c1' }).valid).toBe(true);
  expect(validateAgainstSchema(s, { cardId: 'c1' }).valid).toBe(false); // missing kind
});
