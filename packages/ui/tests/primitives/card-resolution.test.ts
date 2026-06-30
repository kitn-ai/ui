import { test, expect } from 'vitest';
import { applyResolution, resolutionFromEvent } from '../../src/primitives/card-resolution';
import type { CardEnvelope, CardEvent } from '../../src/primitives/card-contract';

const cards: CardEnvelope[] = [
  { type: 'confirm', id: 'c1', data: {} },
  { type: 'form', id: 'f1', data: {} },
];

test('resolutionFromEvent maps the two terminal verbs, ignores the rest', () => {
  expect(resolutionFromEvent({ kind: 'action', cardId: 'c1', action: 'yes', payload: { n: 1 } }))
    .toEqual({ kind: 'action', action: 'yes', payload: { n: 1 } });
  expect(resolutionFromEvent({ kind: 'submit', cardId: 'f1', data: { a: 1 } }))
    .toEqual({ kind: 'submit', data: { a: 1 } });
  expect(resolutionFromEvent({ kind: 'ready', cardId: 'c1' })).toBeUndefined();
  expect(resolutionFromEvent({ kind: 'error', cardId: 'c1', message: 'x' })).toBeUndefined();
});

test('resolutionFromEvent omits payload when undefined', () => {
  expect(resolutionFromEvent({ kind: 'action', cardId: 'c1', action: 'yes' }))
    .toEqual({ kind: 'action', action: 'yes' });
  expect('payload' in (resolutionFromEvent({ kind: 'action', cardId: 'c1', action: 'yes' }) as object))
    .toBe(false);
});

test('applyResolution stamps the matching envelope (new array, no mutation)', () => {
  const next = applyResolution(cards, { kind: 'action', cardId: 'c1', action: 'yes' });
  expect(next).not.toBe(cards);
  expect(next[0].resolution).toEqual({ kind: 'action', action: 'yes' });
  expect(next[1].resolution).toBeUndefined();
  expect(cards[0].resolution).toBeUndefined(); // original untouched
});

test('applyResolution returns the SAME reference for non-terminal events', () => {
  const e: CardEvent = { kind: 'ready', cardId: 'c1' };
  expect(applyResolution(cards, e)).toBe(cards);
});

test('applyResolution returns the SAME reference when cardId is unknown', () => {
  const e: CardEvent = { kind: 'action', cardId: 'nope', action: 'x' };
  expect(applyResolution(cards, e)).toBe(cards);
});
