import { test, expect, afterEach } from 'vitest';
import { render } from '@solidjs/testing-library';
import { Form, type FormDefinition } from '../../src/components/form';
import type { CardEvent, CardHost, CardContext } from '../../src/primitives/card-contract';

afterEach(() => { document.body.innerHTML = ''; });

function makeHost(): { host: CardHost; events: CardEvent[] } {
  const events: CardEvent[] = [];
  const ctx: CardContext = { theme: { mode: 'light' }, locale: 'en' };
  return { events, host: { context: () => ctx, emit: (e) => events.push(e) } };
}

const DEF: FormDefinition = {
  type: 'object',
  title: 'Book a demo',
  properties: { name: { type: 'string', title: 'Full name' }, optIn: { type: 'boolean', title: 'Email me' } },
  'x-kai-order': ['name', 'optIn'],
};

test('re-hydrated form renders a read-only dl summary, no inputs', () => {
  const { host } = makeHost();
  const { getByText, container } = render(() => (
    <Form host={host} cardId="f1" data={DEF} resolution={{ kind: 'submit', data: { name: 'Jane', optIn: true } }} />
  ));
  expect(getByText('Full name')).toBeTruthy();
  expect(getByText('Jane')).toBeTruthy();
  expect(getByText('Email me')).toBeTruthy();
  expect(getByText('Yes')).toBeTruthy();
  expect(container.querySelector('input')).toBeNull();
  expect(container.querySelector('dl')).toBeTruthy();
});
