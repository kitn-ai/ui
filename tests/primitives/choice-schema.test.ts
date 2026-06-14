// tests/primitives/choice-schema.test.ts
// Schema-artifact tests for the choice card (good + bad examples), modeled on
// confirm-tasks-schemas.test.ts.
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { validateAgainstSchema, type JsonSchema } from '../../src/primitives/card-validate';

const load = (name: string): JsonSchema =>
  JSON.parse(readFileSync(`src/primitives/card-schemas/${name}`, 'utf-8'));

test('choice schema parses + validates a good/bad payload', () => {
  const s = load('choice.schema.json');
  // good: list of rich options, one recommended
  expect(
    validateAgainstSchema(s, {
      prompt: 'Which plan fits you?',
      layout: 'list',
      options: [
        { id: 'free', label: 'Free', description: 'For trying it out', meta: '$0' },
        { id: 'pro', label: 'Pro', recommended: true, meta: '$12/mo', payload: { plan: 'pro' } },
      ],
    }).valid,
  ).toBe(true);
  // good: grid layout with media + allowOther boolean
  expect(
    validateAgainstSchema(s, {
      layout: 'grid',
      allowOther: true,
      options: [{ id: 'a', label: 'A', media: { image: 'x.png', imageAlt: 'A photo' } }],
    }).valid,
  ).toBe(true);
  // good: allowOther as an object
  expect(
    validateAgainstSchema(s, {
      allowOther: { label: 'Something else', placeholder: 'Tell me' },
      options: [{ id: 'a', label: 'A' }],
    }).valid,
  ).toBe(true);
  // missing required `options`
  expect(validateAgainstSchema(s, { prompt: 'x' }).valid).toBe(false);
  // empty options violates minItems
  expect(validateAgainstSchema(s, { options: [] }).valid).toBe(false);
  // option missing required label
  expect(validateAgainstSchema(s, { options: [{ id: 'a' }] }).valid).toBe(false);
  // option missing required id
  expect(validateAgainstSchema(s, { options: [{ label: 'A' }] }).valid).toBe(false);
  // bad layout enum
  expect(
    validateAgainstSchema(s, { layout: 'carousel', options: [{ id: 'a', label: 'A' }] }).valid,
  ).toBe(false);
});
