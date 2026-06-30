import { test, expect, afterEach } from 'vitest';
import { render } from '@solidjs/testing-library';
import { ChoiceCard } from '../../src/components/choice-card';
import type { CardEvent, CardHost, CardContext } from '../../src/primitives/card-contract';

afterEach(() => { document.body.innerHTML = ''; });

function makeHost(): { host: CardHost; events: CardEvent[] } {
  const events: CardEvent[] = [];
  const ctx: CardContext = { theme: { mode: 'light' }, locale: 'en' };
  return { events, host: { context: () => ctx, emit: (e) => events.push(e) } };
}

const DATA = {
  prompt: 'Which plan?',
  options: [
    { id: 'free', label: 'Free' },
    { id: 'pro', label: 'Pro', meta: '$20/mo' },
  ],
};

test('re-hydrated resolution shows only the chosen option, no radiogroup', () => {
  const { host } = makeHost();
  const { getByText, queryByText, queryByRole } = render(() => (
    <ChoiceCard host={host} cardId="c1" data={DATA} resolution={{ kind: 'action', action: 'pro' }} />
  ));
  expect(getByText('Pro')).toBeTruthy();
  expect(queryByText('Free')).toBeNull();
  expect(queryByRole('radiogroup')).toBeNull();
});

test('__other__ resolution shows the typed free text', () => {
  const { host } = makeHost();
  const { getByText } = render(() => (
    <ChoiceCard
      host={host}
      cardId="c1"
      data={DATA}
      resolution={{ kind: 'action', action: '__other__', payload: { text: 'A la carte' } }}
    />
  ));
  expect(getByText(/A la carte/)).toBeTruthy();
});
