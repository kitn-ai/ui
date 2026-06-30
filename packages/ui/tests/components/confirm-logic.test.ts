// tests/components/confirm-logic.test.ts
import { describe, expect, test, vi } from 'vitest';
import {
  buttonVariantForStyle,
  normalizeActions,
  defaultActionId,
} from '../../src/components/confirm-card';

describe('buttonVariantForStyle', () => {
  test('maps styles to Button variants', () => {
    expect(buttonVariantForStyle('primary')).toBe('default');
    expect(buttonVariantForStyle('destructive')).toBe('destructive');
    expect(buttonVariantForStyle('default')).toBe('outline');
    expect(buttonVariantForStyle(undefined)).toBe('outline');
  });
});

describe('normalizeActions', () => {
  test('rejects non-array / empty', () => {
    expect(normalizeActions(undefined).error).toBeTruthy();
    expect(normalizeActions([]).error).toBeTruthy();
  });
  test('de-dupes by id (first wins) with a warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = normalizeActions([
      { id: 'a', label: 'A' },
      { id: 'a', label: 'dup' },
      { id: 'b', label: 'B' },
    ]);
    expect(r.actions.map((a) => a.id)).toEqual(['a', 'b']);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
  test('coerces unknown style to undefined + warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = normalizeActions([{ id: 'a', label: 'A', style: 'huge' }]);
    expect(r.actions[0].style).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
  test('all-invalid → error', () => {
    expect(normalizeActions([{ id: '' }, { label: 'no id' }]).error).toBeTruthy();
  });
});

describe('defaultActionId', () => {
  test('returns the first default action id', () => {
    expect(
      defaultActionId([
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B', default: true },
      ]),
    ).toBe('b');
  });
  test('undefined when none', () => {
    expect(defaultActionId([{ id: 'a', label: 'A' }])).toBeUndefined();
  });
});
