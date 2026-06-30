import { test, expect } from 'vitest';
import { summarizeForm, formatFieldValue } from '../../src/components/form';
import type { FormDefinition } from '../../src/components/form';

const DEF: FormDefinition = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Full name' },
    optIn: { type: 'boolean', title: 'Email me' },
    tags: { type: 'array', title: 'Tags' },
    secret: { type: 'string', title: 'Password', 'x-kai-widget': 'password' },
    notes: { type: 'string', title: 'Notes' },
  },
  'x-kai-order': ['name', 'optIn', 'tags', 'secret', 'notes'],
};

test('formatFieldValue handles booleans, arrays, password, and empties', () => {
  expect(formatFieldValue({ type: 'boolean' }, true)).toBe('Yes');
  expect(formatFieldValue({ type: 'boolean' }, false)).toBe('No');
  expect(formatFieldValue({ type: 'array' }, ['a', 'b'])).toBe('a, b');
  expect(formatFieldValue({ type: 'array' }, [])).toBe('—');
  expect(formatFieldValue({ type: 'string', 'x-kai-widget': 'password' }, 'hunter2')).toBe('••••');
  expect(formatFieldValue({ type: 'string' }, '')).toBe('—');
  expect(formatFieldValue({ type: 'string' }, 'hi')).toBe('hi');
});

test('summarizeForm follows x-kai-order and resolves labels', () => {
  const rows = summarizeForm(DEF, { name: 'Jane', optIn: false, tags: ['x'], secret: 'p', notes: '' });
  expect(rows.map((r) => r.label)).toEqual(['Full name', 'Email me', 'Tags', 'Password', 'Notes']);
  expect(rows.map((r) => r.value)).toEqual(['Jane', 'No', 'x', '••••', '—']);
});

test('summarizeForm falls back to declaration order and key labels', () => {
  const rows = summarizeForm({ type: 'object', properties: { a: { type: 'string' } } }, { a: '1' });
  expect(rows).toEqual([{ key: 'a', label: 'a', value: '1' }]);
});
