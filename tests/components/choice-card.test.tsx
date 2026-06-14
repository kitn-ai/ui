// tests/components/choice-card.test.tsx
// Native Solid host path for ChoiceCard: a `host` prop's emit is called (not the
// CustomEvent). Pick emits `action` (id + payload), single-shot, empty → error,
// and the allowOther two-step emits `__other__` with the typed text.
import { render, fireEvent } from '@solidjs/testing-library';
import { ChoiceCard } from '../../src/components/choice-card';
import type { CardEvent, CardHost, CardContext } from '../../src/primitives/card-contract';

afterEach(() => {
  document.body.innerHTML = '';
});

function makeHost(): { host: CardHost; events: CardEvent[] } {
  const events: CardEvent[] = [];
  const ctx: CardContext = { theme: { mode: 'light' }, locale: 'en' };
  return {
    events,
    host: { context: () => ctx, emit: (e) => events.push(e) },
  };
}

const action = (events: CardEvent[]) =>
  events.find((e) => e.kind === 'action') as Extract<CardEvent, { kind: 'action' }> | undefined;

test('ChoiceCard emits `ready` on mount', () => {
  const { host, events } = makeHost();
  render(() => (
    <ChoiceCard host={host} cardId="c1" data={{ options: [{ id: 'a', label: 'A' }] }} />
  ));
  expect(events.some((e) => e.kind === 'ready' && e.cardId === 'c1')).toBe(true);
});

test('picking an option emits `action` with id + echoed payload', () => {
  const { host, events } = makeHost();
  const { getByText } = render(() => (
    <ChoiceCard
      host={host}
      cardId="c1"
      data={{
        options: [
          { id: 'free', label: 'Free' },
          { id: 'pro', label: 'Pro', payload: { plan: 'pro' } },
        ],
      }}
    />
  ));
  fireEvent.click(getByText('Pro'));
  const a = action(events);
  expect(a?.action).toBe('pro');
  expect(a?.payload).toEqual({ plan: 'pro' });
});

test('single-shot: a second pick does not emit again', () => {
  const { host, events } = makeHost();
  const { getByText } = render(() => (
    <ChoiceCard
      host={host}
      cardId="c1"
      data={{ options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] }}
    />
  ));
  fireEvent.click(getByText('A'));
  fireEvent.click(getByText('B'));
  expect(events.filter((e) => e.kind === 'action').length).toBe(1);
  expect(action(events)?.action).toBe('a');
});

test('disabled option does not emit', () => {
  const { host, events } = makeHost();
  const { getByText } = render(() => (
    <ChoiceCard
      host={host}
      cardId="c1"
      data={{ options: [{ id: 'a', label: 'A', disabled: true }, { id: 'b', label: 'B' }] }}
    />
  ));
  fireEvent.click(getByText('A'));
  expect(action(events)).toBeUndefined();
});

test('empty options → inline error state + `error` event; no radios', () => {
  const { host, events } = makeHost();
  const { container } = render(() => (
    <ChoiceCard host={host} cardId="bad" data={{ options: [] }} />
  ));
  expect(container.querySelector('[role="alert"]')).toBeTruthy();
  expect(container.querySelector('[role="radio"]')).toBeNull();
  expect(events.some((e) => e.kind === 'error' && e.cardId === 'bad')).toBe(true);
});

test('allowOther two-step: select Other → reveals input + Submit; submit emits __other__ with text', () => {
  const { host, events } = makeHost();
  const { getByText, getByLabelText, queryByText } = render(() => (
    <ChoiceCard
      host={host}
      cardId="c1"
      data={{ options: [{ id: 'a', label: 'A' }], allowOther: { label: 'Other…' } }}
    />
  ));
  // No emit on selecting Other (two-step).
  fireEvent.click(getByText('Other…'));
  expect(action(events)).toBeUndefined();

  const input = getByLabelText('Other…') as HTMLInputElement;
  const submit = getByText('Submit') as HTMLButtonElement;
  // Submit disabled while empty.
  expect(submit.disabled).toBe(true);
  expect(queryByText('Submit')).toBeTruthy();

  fireEvent.input(input, { target: { value: 'My custom answer' } });
  expect(submit.disabled).toBe(false);
  fireEvent.click(submit);

  const a = action(events);
  expect(a?.action).toBe('__other__');
  expect(a?.payload).toEqual({ text: 'My custom answer' });
});
