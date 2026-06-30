// tests/primitives/card-contract.test.ts
import { expect, test } from 'vitest';
import {
  CARD_CONTRACT_VERSION,
  type CardEnvelope,
  type CardContext,
  type CardEvent,
  type CardHost,
  type CardPolicy,
} from '../../src/primitives/card-contract';

test('contract version is the frozen value', () => {
  expect(CARD_CONTRACT_VERSION).toBe('1');
});

test('envelope + event shapes are usable as typed values', () => {
  const env: CardEnvelope<'form', { x: number }> = { type: 'form', id: 'c1', data: { x: 1 }, title: 'T' };
  expect(env.type).toBe('form');
  const ev: CardEvent = { kind: 'submit', cardId: 'c1', data: { ok: true } };
  expect(ev.kind).toBe('submit');
  const ctx: CardContext = { theme: { mode: 'dark' }, locale: 'en', a11y: { reducedMotion: true } };
  expect(ctx.a11y?.reducedMotion).toBe(true);
  const host: CardHost = { context: () => ctx, emit: () => {} };
  expect(host.context().theme.mode).toBe('dark');
  const policy: CardPolicy = { maxSendPromptMode: 'compose' };
  expect(policy.maxSendPromptMode).toBe('compose');
});
