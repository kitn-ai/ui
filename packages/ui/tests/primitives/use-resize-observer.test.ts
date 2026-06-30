import { test, expect, vi, beforeEach } from 'vitest';
import { observeContentHeight } from '../../src/primitives/use-resize-observer';

beforeEach(() => {
  const cbs: Array<(e: { contentRect: { height: number } }[]) => void> = [];
  vi.stubGlobal('ResizeObserver', class {
    cb: (e: unknown[]) => void;
    constructor(cb: (e: unknown[]) => void) { this.cb = cb; cbs.push(cb as never); }
    observe() {} disconnect() {}
    static emit(h: number) { cbs.forEach((c) => c([{ contentRect: { height: h } } as never])); }
  });
});

test('observeContentHeight reports height changes above the threshold only', () => {
  const el = document.createElement('div');
  const heights: number[] = [];
  const dispose = observeContentHeight(el, (h) => heights.push(h));
  (globalThis.ResizeObserver as unknown as { emit(h: number): void }).emit(100);
  (globalThis.ResizeObserver as unknown as { emit(h: number): void }).emit(100.5);
  (globalThis.ResizeObserver as unknown as { emit(h: number): void }).emit(140);
  dispose();
  expect(heights).toEqual([100, 140]);
});
