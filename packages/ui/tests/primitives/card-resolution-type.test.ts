// Construction/shape test for the additive resolution channel. Pure types have no
// runtime, so this asserts the values are assignable and the union discriminates.
import { test, expect } from 'vitest';
import type { CardEnvelope, CardResolution } from '../../src/primitives/card-contract';
import { CARD_CONTRACT_VERSION } from '../../src/primitives/card-contract';

test('resolution is an optional, additive field (version unchanged)', () => {
  expect(CARD_CONTRACT_VERSION).toBe('1');
});

test('CardEnvelope accepts an action resolution', () => {
  const env: CardEnvelope = {
    type: 'confirm',
    id: 'c1',
    data: {},
    resolution: { kind: 'action', action: 'approve', payload: { n: 1 }, at: '2026-06-14T00:00:00Z' },
  };
  const r = env.resolution as Extract<CardResolution, { kind: 'action' }>;
  expect(r.action).toBe('approve');
});

test('CardEnvelope accepts a submit resolution', () => {
  const env: CardEnvelope = {
    type: 'form',
    id: 'f1',
    data: {},
    resolution: { kind: 'submit', data: { email: 'a@b.c' } },
  };
  const r = env.resolution as Extract<CardResolution, { kind: 'submit' }>;
  expect((r.data as { email: string }).email).toBe('a@b.c');
});

test('an envelope without resolution is still valid', () => {
  const env: CardEnvelope = { type: 'confirm', id: 'c2', data: {} };
  expect(env.resolution).toBeUndefined();
});
