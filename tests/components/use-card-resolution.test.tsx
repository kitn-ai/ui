import { test, expect, afterEach } from 'vitest';
import { render } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { useCardResolution } from '../../src/components/use-card-resolution';
import type { CardResolution } from '../../src/primitives/card-contract';

afterEach(() => { document.body.innerHTML = ''; });

test('prop resolution takes precedence and is not optimistic', () => {
  let ctl!: ReturnType<typeof useCardResolution>;
  render(() => {
    ctl = useCardResolution({
      prop: () => ({ kind: 'action', action: 'a' }) as CardResolution,
      data: () => ({}),
    });
    return <div />;
  });
  expect(ctl.isResolved()).toBe(true);
  expect(ctl.isOptimistic()).toBe(false);
  expect(ctl.resolution()).toEqual({ kind: 'action', action: 'a' });
});

test('setLocal resolves optimistically when no prop is present', () => {
  let ctl!: ReturnType<typeof useCardResolution>;
  render(() => {
    ctl = useCardResolution({ prop: () => undefined, data: () => ({}) });
    return <div />;
  });
  expect(ctl.isResolved()).toBe(false);
  ctl.setLocal({ kind: 'submit', data: { x: 1 } });
  expect(ctl.isResolved()).toBe(true);
  expect(ctl.isOptimistic()).toBe(true);
});

test('a new data identity clears the local resolution', () => {
  const [data, setData] = createSignal<object>({ v: 1 });
  let ctl!: ReturnType<typeof useCardResolution>;
  render(() => {
    ctl = useCardResolution({ prop: () => undefined, data });
    return <div />;
  });
  ctl.setLocal({ kind: 'action', action: 'a' });
  expect(ctl.isResolved()).toBe(true);
  setData({ v: 2 });
  expect(ctl.isResolved()).toBe(false);
});

test('prop keeps the card resolved across a data change', () => {
  const [data, setData] = createSignal<object>({ v: 1 });
  let ctl!: ReturnType<typeof useCardResolution>;
  render(() => {
    ctl = useCardResolution({
      prop: () => ({ kind: 'action', action: 'a' }) as CardResolution,
      data,
    });
    return <div />;
  });
  setData({ v: 2 });
  expect(ctl.isResolved()).toBe(true);
});
