import { test, expect, afterEach } from 'vitest';
import { render } from '@solidjs/testing-library';
import { TasksCard } from '../../src/components/tasks-card';
import type { CardEvent, CardHost, CardContext } from '../../src/primitives/card-contract';

afterEach(() => { document.body.innerHTML = ''; });

function makeHost(): { host: CardHost; events: CardEvent[] } {
  const events: CardEvent[] = [];
  const ctx: CardContext = { theme: { mode: 'light' }, locale: 'en' };
  return { events, host: { context: () => ctx, emit: (e) => events.push(e) } };
}

const DATA = {
  tasks: [
    { id: 'sum', label: 'Executive summary' },
    { id: 'data', label: 'Raw data' },
    { id: 'charts', label: 'Charts' },
  ],
};

test('re-hydrated resolution shows N-of-M and the chosen labels, no controls', () => {
  const { host } = makeHost();
  const { getByText, queryByRole } = render(() => (
    <TasksCard host={host} cardId="t1" data={DATA}
      resolution={{ kind: 'submit', data: { selected: ['sum', 'charts'] } }} />
  ));
  expect(getByText(/Selected 2 of 3/)).toBeTruthy();
  expect(getByText('Executive summary')).toBeTruthy();
  expect(getByText('Charts')).toBeTruthy();
  expect(queryByRole('button')).toBeNull();
  expect(queryByRole('checkbox')).toBeNull();
});

test('empty selection reads "None selected"', () => {
  const { host } = makeHost();
  const { getByText } = render(() => (
    <TasksCard host={host} cardId="t1" data={DATA}
      resolution={{ kind: 'submit', data: { selected: [] } }} />
  ));
  expect(getByText(/None selected/)).toBeTruthy();
});

test('re-hydrated render does not emit a submit event', () => {
  const { host, events } = makeHost();
  render(() => (
    <TasksCard host={host} cardId="t1" data={DATA}
      resolution={{ kind: 'submit', data: { selected: ['sum'] } }} />
  ));
  expect(events.some((e) => e.kind === 'submit')).toBe(false);
});
