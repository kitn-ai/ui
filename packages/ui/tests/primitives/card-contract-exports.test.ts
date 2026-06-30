// tests/primitives/card-contract-exports.test.ts
import { expect, test } from 'vitest';
import {
  CARD_CONTRACT_VERSION,
  CARD_EVENT_NAME,
  CardProvider,
  useCardHost,
  emitCardEvent,
  routeCardEvent,
  listenForCardEvents,
  validateAgainstSchema,
} from '../../src/index';

test('contract foundation is exported from the public barrel', () => {
  expect(CARD_CONTRACT_VERSION).toBe('1');
  expect(CARD_EVENT_NAME).toBe('kai-card');
  expect(typeof CardProvider).toBe('function');
  expect(typeof useCardHost).toBe('function');
  expect(typeof emitCardEvent).toBe('function');
  expect(typeof routeCardEvent).toBe('function');
  expect(typeof listenForCardEvents).toBe('function');
  expect(typeof validateAgainstSchema).toBe('function');
});
