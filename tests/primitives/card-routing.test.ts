// tests/primitives/card-routing.test.ts
import { afterEach, expect, test, vi } from 'vitest';
import {
  CARD_EVENT_NAME,
  emitCardEvent,
  routeCardEvent,
  listenForCardEvents,
} from '../../src/primitives/card-routing';
import type { CardPolicy } from '../../src/primitives/card-contract';

afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });

test('emitCardEvent dispatches a bubbling, composed kc-card event', () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const seen = vi.fn();
  document.addEventListener(CARD_EVENT_NAME, (e) => seen((e as CustomEvent).detail));
  emitCardEvent(el, { kind: 'ready', cardId: 'c1' });
  expect(seen).toHaveBeenCalledWith({ kind: 'ready', cardId: 'c1' });
});

test('routeCardEvent dispatches verbs to handlers', () => {
  const policy: CardPolicy = { onSubmitData: vi.fn(), onAction: vi.fn() };
  routeCardEvent(policy, { kind: 'submit-data', cardId: 'c1', data: { a: 1 } });
  expect(policy.onSubmitData).toHaveBeenCalledWith('c1', { a: 1 });
  routeCardEvent(policy, { kind: 'action', cardId: 'c1', action: 'approve', payload: 7 });
  expect(policy.onAction).toHaveBeenCalledWith('c1', 'approve', 7);
});

test('send-prompt downgrades send→compose unless opted in', () => {
  const onSendPrompt = vi.fn();
  routeCardEvent({ onSendPrompt }, { kind: 'send-prompt', cardId: 'c1', text: 'hi', mode: 'send' });
  expect(onSendPrompt).toHaveBeenCalledWith('hi', { mode: 'compose', context: undefined });
  onSendPrompt.mockClear();
  routeCardEvent({ onSendPrompt, maxSendPromptMode: 'send' }, { kind: 'send-prompt', cardId: 'c1', text: 'hi', mode: 'send' });
  expect(onSendPrompt).toHaveBeenCalledWith('hi', { mode: 'send', context: undefined });
});

test('open rejects unsafe schemes and surfaces an error', () => {
  const onOpen = vi.fn(); const onError = vi.fn();
  routeCardEvent({ onOpen, onError }, { kind: 'open', cardId: 'c1', url: 'javascript:alert(1)' });
  expect(onOpen).not.toHaveBeenCalled();
  expect(onError).toHaveBeenCalled();
  routeCardEvent({ onOpen, onError }, { kind: 'open', cardId: 'c1', url: 'https://x.com', target: 'tab' });
  expect(onOpen).toHaveBeenCalledWith('https://x.com', 'tab');
});

test('missing handler is a no-op + warns, never throws', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  expect(() => routeCardEvent({}, { kind: 'dismiss', cardId: 'c1' })).not.toThrow();
  expect(warn).toHaveBeenCalled();
});

test('listenForCardEvents routes bubbling events through policy + unsubscribes', () => {
  const onAction = vi.fn();
  const off = listenForCardEvents(document, { onAction });
  const el = document.createElement('div'); document.body.appendChild(el);
  emitCardEvent(el, { kind: 'action', cardId: 'c1', action: 'go' });
  expect(onAction).toHaveBeenCalledWith('c1', 'go', undefined);
  off();
  emitCardEvent(el, { kind: 'action', cardId: 'c1', action: 'again' });
  expect(onAction).toHaveBeenCalledTimes(1);
});
