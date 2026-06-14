// tests/components/tasks-logic.test.ts
// The load-bearing selection logic, tested as pure functions.
import { describe, expect, test, vi } from 'vitest';
import {
  normalizeTasks,
  initialSelected,
  selectedInOrder,
  toggleableIds,
  selectAllState,
  showSelectAll,
  canConfirm,
  isMaxReached,
  confirmReason,
  type TasksTask,
  type TasksCardData,
} from '../../src/components/tasks-card';

const T = (id: string, extra: Partial<TasksTask> = {}): TasksTask => ({ id, label: id, ...extra });

describe('normalizeTasks', () => {
  test('rejects non-array / empty', () => {
    expect(normalizeTasks(undefined).error).toBeTruthy();
    expect(normalizeTasks([]).error).toBeTruthy();
  });
  test('de-dupes by id (first wins) with a warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = normalizeTasks([T('a'), { id: 'a', label: 'dup' }, T('b')]);
    expect(r.tasks.map((t) => t.id)).toEqual(['a', 'b']);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
  test('drops structurally invalid rows; all-invalid → error', () => {
    expect(normalizeTasks([{ id: '' }, { label: 'no id' }]).error).toBeTruthy();
  });
});

describe('selection helpers', () => {
  const tasks = [T('a', { checked: true }), T('b'), T('c', { disabled: true })];
  test('initialSelected reads checked', () => {
    expect(initialSelected(tasks)).toEqual(['a']);
  });
  test('selectedInOrder preserves input order', () => {
    expect(selectedInOrder(tasks, new Set(['c', 'a']))).toEqual(['a', 'c']);
  });
  test('toggleableIds excludes disabled', () => {
    expect(toggleableIds(tasks)).toEqual(['a', 'b']);
  });
});

describe('selectAllState', () => {
  const tasks = [T('a'), T('b'), T('c', { disabled: true })];
  test('none → unchecked', () => {
    expect(selectAllState(tasks, new Set())).toBe('unchecked');
  });
  test('some → indeterminate', () => {
    expect(selectAllState(tasks, new Set(['a']))).toBe('indeterminate');
  });
  test('all toggleable → checked (disabled not counted)', () => {
    expect(selectAllState(tasks, new Set(['a', 'b']))).toBe('checked');
  });
});

describe('showSelectAll', () => {
  const tasks = [T('a'), T('b'), T('c')];
  test('hidden when not requested', () => {
    expect(showSelectAll({ tasks, selectAll: false }, tasks)).toBe(false);
  });
  test('shown when requested', () => {
    expect(showSelectAll({ tasks, selectAll: true }, tasks)).toBe(true);
  });
  test('hidden when max < toggleable count (all would violate max)', () => {
    expect(showSelectAll({ tasks, selectAll: true, max: 2 }, tasks)).toBe(false);
  });
});

describe('canConfirm', () => {
  const tasks = [T('a'), T('b'), T('c')];
  test('default requires >=1', () => {
    expect(canConfirm({ tasks }, 0)).toBe(false);
    expect(canConfirm({ tasks }, 1)).toBe(true);
  });
  test('allowEmpty enables zero', () => {
    expect(canConfirm({ tasks, allowEmpty: true }, 0)).toBe(true);
  });
  test('min gates', () => {
    expect(canConfirm({ tasks, min: 2 }, 1)).toBe(false);
    expect(canConfirm({ tasks, min: 2 }, 2)).toBe(true);
  });
  test('max gates', () => {
    expect(canConfirm({ tasks, max: 2 }, 3)).toBe(false);
    expect(canConfirm({ tasks, max: 2 }, 2)).toBe(true);
  });
});

describe('isMaxReached', () => {
  const data: TasksCardData = { tasks: [T('a')], max: 2 };
  test('true at/over max', () => {
    expect(isMaxReached(data, 2)).toBe(true);
    expect(isMaxReached(data, 1)).toBe(false);
  });
  test('false when no max', () => {
    expect(isMaxReached({ tasks: [T('a')] }, 99)).toBe(false);
  });
});

describe('confirmReason', () => {
  const tasks = [T('a'), T('b')];
  test('undefined when confirmable', () => {
    expect(confirmReason({ tasks }, 1)).toBeUndefined();
  });
  test('explains min shortfall', () => {
    expect(confirmReason({ tasks, min: 2 }, 1)).toContain('at least 2');
  });
  test('default min of 1', () => {
    expect(confirmReason({ tasks }, 0)).toContain('at least 1');
  });
});
