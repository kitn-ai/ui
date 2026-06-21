import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  toast, getToasts, ensureMounted, isToastRegionMounted,
  resolveDuration, DEFAULT_TOAST_DURATION, ACTION_TOAST_FLOOR,
  type ToastItem,
} from './toast-store';

function find(id: string): ToastItem | undefined {
  return getToasts().find((t) => t.id === id);
}

beforeEach(() => {
  toast.clear();
  // remove any region the previous test mounted
  document.querySelectorAll('kai-toast-region').forEach((el) => el.remove());
});
afterEach(() => {
  toast.clear();
  document.querySelectorAll('kai-toast-region').forEach((el) => el.remove());
});

describe('toast() — basics', () => {
  it('returns a handle with an id and pushes the toast', () => {
    const handle = toast('Hello');
    expect(handle.id).toBeTruthy();
    expect(find(handle.id)?.message).toBe('Hello');
    expect(find(handle.id)?.variant).toBe('neutral');
  });

  it('toast.success raises a success-variant toast', () => {
    const handle = toast.success('Saved');
    expect(find(handle.id)?.variant).toBe('success');
  });

  it('reuses an id to update the toast in place (no duplicate)', () => {
    const a = toast('First', { id: 'fixed' });
    const before = getToasts().length;
    toast('Second', { id: 'fixed' });
    expect(getToasts().length).toBe(before); // same count
    expect(find('fixed')?.message).toBe('Second');
    expect(a.id).toBe('fixed');
  });

  it('handle.update patches the toast in place', () => {
    const handle = toast('Working');
    handle.update({ message: 'Done', variant: 'success' });
    expect(find(handle.id)?.message).toBe('Done');
    expect(find(handle.id)?.variant).toBe('success');
  });

  it('handle.dismiss removes the toast', () => {
    const handle = toast('Bye');
    expect(find(handle.id)).toBeTruthy();
    handle.dismiss();
    expect(find(handle.id)).toBeUndefined();
  });

  it('toast.dismiss(id) removes by id', () => {
    const handle = toast('Bye');
    toast.dismiss(handle.id);
    expect(find(handle.id)).toBeUndefined();
  });

  it('newly raised toasts are appended after existing ones', () => {
    const a = toast('A');
    const b = toast('B');
    const ids = getToasts().map((t) => t.id);
    expect(ids.indexOf(a.id)).toBeLessThan(ids.indexOf(b.id));
  });
});

describe('resolveDuration — action floor', () => {
  it('defaults to DEFAULT_TOAST_DURATION', () => {
    expect(resolveDuration({})).toBe(DEFAULT_TOAST_DURATION);
  });

  it('floors duration to ACTION_TOAST_FLOOR when an action is present', () => {
    expect(resolveDuration({ duration: 2000, action: { label: 'x', onAction: () => {} } }))
      .toBe(ACTION_TOAST_FLOOR);
  });

  it('keeps a longer-than-floor duration when an action is present', () => {
    expect(resolveDuration({ duration: 8000, action: { label: 'x', onAction: () => {} } }))
      .toBe(8000);
  });

  it('honours an explicit 0 (sticky) even with an action', () => {
    expect(resolveDuration({ duration: 0, action: { label: 'x', onAction: () => {} } })).toBe(0);
  });
});

describe('ensureMounted', () => {
  it('creates exactly one <kai-toast-region> on document.body', () => {
    ensureMounted();
    ensureMounted();
    ensureMounted();
    expect(document.querySelectorAll('kai-toast-region')).toHaveLength(1);
    expect(isToastRegionMounted()).toBe(true);
  });

  it('binds the reactive store to the region\'s toasts property', () => {
    toast('Bound');
    const el = document.querySelector('kai-toast-region') as HTMLElement & { toasts: ToastItem[] };
    expect(el).toBeTruthy();
    expect(el.toasts.some((t) => t.message === 'Bound')).toBe(true);
  });

  it('is created lazily on the first toast() call', () => {
    expect(document.querySelector('kai-toast-region')).toBeNull();
    toast('First');
    expect(document.querySelector('kai-toast-region')).not.toBeNull();
  });
});
