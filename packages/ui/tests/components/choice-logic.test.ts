// tests/components/choice-logic.test.ts
// Pure-helper unit tests for the choice card (normalizeOptions + resolveOtherConfig),
// mirroring the confirm/tasks helper tests.
import { expect, test, vi } from 'vitest';
import {
  normalizeOptions,
  resolveOtherConfig,
  OTHER_ACTION,
  type ChoiceOption,
} from '../../src/components/choice-card';

test('normalizeOptions keeps valid options in order', () => {
  const r = normalizeOptions([
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B', description: 'second', recommended: true },
  ]);
  expect(r.error).toBeUndefined();
  expect(r.options.map((o) => o.id)).toEqual(['a', 'b']);
  expect(r.options[1].recommended).toBe(true);
});

test('normalizeOptions drops entries missing id or label', () => {
  const r = normalizeOptions([
    { id: 'a', label: 'A' },
    { id: '', label: 'no id' },
    { id: 'c' }, // no label
    { label: 'no id key' },
    null,
    'nope',
  ] as unknown[]);
  expect(r.options.map((o) => o.id)).toEqual(['a']);
});

test('normalizeOptions de-dupes by id (first wins) + warns', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const r = normalizeOptions([
    { id: 'a', label: 'First' },
    { id: 'a', label: 'Dup' },
    { id: 'b', label: 'B' },
  ]);
  expect(r.options.map((o) => o.label)).toEqual(['First', 'B']);
  expect(warn).toHaveBeenCalled();
  warn.mockRestore();
});

test('normalizeOptions on empty/non-array → error + empty list', () => {
  expect(normalizeOptions([]).error).toBeDefined();
  expect(normalizeOptions(undefined).error).toBeDefined();
  expect(normalizeOptions('x' as unknown).options).toEqual([]);
});

test('normalizeOptions carries optional fields through', () => {
  const r = normalizeOptions([
    {
      id: 'a',
      label: 'A',
      meta: '$10',
      disabled: true,
      payload: { plan: 'a' },
      media: { image: 'x.png', imageAlt: 'alt', icon: 'star' },
    },
  ]);
  const o = r.options[0] as ChoiceOption;
  expect(o.meta).toBe('$10');
  expect(o.disabled).toBe(true);
  expect(o.payload).toEqual({ plan: 'a' });
  expect(o.media).toEqual({ image: 'x.png', imageAlt: 'alt', icon: 'star' });
});

test('resolveOtherConfig: falsy → null; true → defaults; object → merged', () => {
  expect(resolveOtherConfig(undefined)).toBeNull();
  expect(resolveOtherConfig(false)).toBeNull();
  expect(resolveOtherConfig(true)).toEqual({ label: 'Other…', placeholder: undefined });
  expect(resolveOtherConfig({ label: 'Something else', placeholder: 'Type it' })).toEqual({
    label: 'Something else',
    placeholder: 'Type it',
  });
  // partial object falls back to default label
  expect(resolveOtherConfig({ placeholder: 'p' })).toEqual({ label: 'Other…', placeholder: 'p' });
});

test('OTHER_ACTION sentinel is the documented value', () => {
  expect(OTHER_ACTION).toBe('__other__');
});
