// tests/primitives/confirm-task-list-schemas.test.ts
// Schema-artifact tests for the confirm + task-list cards (good + bad examples).
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { validateAgainstSchema, type JsonSchema } from '../../src/primitives/card-validate';

const load = (name: string): JsonSchema =>
  JSON.parse(readFileSync(`src/primitives/card-schemas/${name}`, 'utf-8'));

test('confirm schema parses + validates a good/bad payload', () => {
  const s = load('confirm.schema.json');
  expect(
    validateAgainstSchema(s, {
      body: 'Apply 3 migrations?',
      tone: 'warning',
      actions: [
        { id: 'approve', label: 'Run', style: 'primary', default: true },
        { id: 'reject', label: 'Cancel' },
      ],
    }).valid,
  ).toBe(true);
  // missing required `actions`
  expect(validateAgainstSchema(s, { body: 'x' }).valid).toBe(false);
  // empty actions violates minItems
  expect(validateAgainstSchema(s, { actions: [] }).valid).toBe(false);
  // bad tone enum
  expect(validateAgainstSchema(s, { tone: 'spicy', actions: [{ id: 'a', label: 'A' }] }).valid).toBe(false);
  // bad action.style enum
  expect(
    validateAgainstSchema(s, { actions: [{ id: 'a', label: 'A', style: 'huge' }] }).valid,
  ).toBe(false);
  // too many actions (>4)
  expect(
    validateAgainstSchema(s, {
      actions: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
        { id: 'd', label: 'D' },
        { id: 'e', label: 'E' },
      ],
    }).valid,
  ).toBe(false);
});

test('task-list schema parses + validates a good/bad payload', () => {
  const s = load('task-list.schema.json');
  expect(
    validateAgainstSchema(s, {
      mode: 'select',
      selectAll: true,
      confirmLabel: 'Run selected',
      tasks: [
        { id: 'lint', label: 'Run linter', checked: true },
        { id: 'test', label: 'Run unit tests' },
      ],
    }).valid,
  ).toBe(true);
  // missing required `tasks`
  expect(validateAgainstSchema(s, { selectAll: true }).valid).toBe(false);
  // empty tasks violates minItems
  expect(validateAgainstSchema(s, { tasks: [] }).valid).toBe(false);
  // bad mode enum ('progress' is reserved but not valid in v1)
  expect(validateAgainstSchema(s, { mode: 'progress', tasks: [{ id: 'a', label: 'A' }] }).valid).toBe(false);
  // max minimum is 1
  expect(validateAgainstSchema(s, { tasks: [{ id: 'a', label: 'A' }], max: 0 }).valid).toBe(false);
});

test('task-list.result schema parses + validates a good/bad result', () => {
  const s = load('task-list.result.schema.json');
  expect(validateAgainstSchema(s, { selected: ['lint', 'test'] }).valid).toBe(true);
  expect(validateAgainstSchema(s, { selected: [] }).valid).toBe(true);
  // missing required `selected`
  expect(validateAgainstSchema(s, {}).valid).toBe(false);
  // not unique
  expect(validateAgainstSchema(s, { selected: ['a', 'a'] }).valid).toBe(false);
  // wrong item type
  expect(validateAgainstSchema(s, { selected: [1, 2] }).valid).toBe(false);
});
