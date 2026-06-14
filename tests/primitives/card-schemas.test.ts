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

test('link schema parses + validates a good/bad link payload', () => {
  const s = load('link.schema.json');
  expect(
    validateAgainstSchema(s, {
      url: 'https://example.com/post',
      title: 'A post',
      description: 'Body',
      image: 'https://example.com/og.png',
    }).valid,
  ).toBe(true);
  expect(validateAgainstSchema(s, { title: 'no url' }).valid).toBe(false); // missing required url
  // overlong title is rejected (maxLength 300).
  expect(validateAgainstSchema(s, { url: 'https://x', title: 'a'.repeat(301) }).valid).toBe(false);
});

test('embed schema parses + validates provider payloads', () => {
  const s = load('embed.schema.json');
  expect(validateAgainstSchema(s, { provider: 'youtube', id: 'dQw4w9WgXcQ' }).valid).toBe(true);
  expect(validateAgainstSchema(s, { provider: 'generic', url: 'https://x/y' }).valid).toBe(true);
  expect(validateAgainstSchema(s, { provider: 'tiktok', id: 'x' }).valid).toBe(false); // bad enum
  // id must match the [A-Za-z0-9_-] pattern.
  expect(validateAgainstSchema(s, { provider: 'youtube', id: 'bad id!' }).valid).toBe(false);
  // aspectRatio enum is enforced.
  expect(
    validateAgainstSchema(s, { provider: 'youtube', id: 'abc', aspectRatio: '21:9' }).valid,
  ).toBe(false);
});
