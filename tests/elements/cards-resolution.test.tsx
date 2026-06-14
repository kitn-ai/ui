import { test, expect, afterEach } from 'vitest';
import '../../src/elements/cards';
import type { CardEnvelope } from '../../src/primitives/card-contract';

const flush = () => new Promise((r) => setTimeout(r, 0));
afterEach(() => { document.querySelectorAll('kc-cards').forEach((e) => e.remove()); });

test('<kc-cards> renders a re-hydrated confirm card read-only', async () => {
  const el = document.createElement('kc-cards') as HTMLElement & { cards: CardEnvelope[] };
  el.cards = [
    {
      type: 'confirm',
      id: 'c1',
      title: 'Delete?',
      data: { body: 'Delete it?', actions: [{ id: 'yes', label: 'Delete' }, { id: 'no', label: 'Cancel' }] },
      resolution: { kind: 'action', action: 'yes' },
    },
  ];
  document.body.appendChild(el);
  await flush();
  // Navigate through kc-cards shadow root → kc-confirm → kc-confirm shadow root
  const confirmEl = el.shadowRoot!.querySelector('kc-confirm')!;
  const confirmRoot = confirmEl.shadowRoot!;
  expect(confirmRoot.textContent).toContain('Delete');
  const buttons = confirmRoot.querySelectorAll('button');
  expect(Array.from(buttons).some((b) => b.textContent?.trim() === 'Cancel')).toBe(false);
});

test('<kc-cards> renders a re-hydrated tasks card read-only', async () => {
  const el = document.createElement('kc-cards') as HTMLElement & { cards: CardEnvelope[] };
  el.cards = [
    {
      type: 'tasks',
      id: 't1',
      title: 'Pick',
      data: { tasks: [{ id: 'a', label: 'Apple' }, { id: 'b', label: 'Banana' }] },
      resolution: { kind: 'submit', data: { selected: ['a'] } },
    },
  ];
  document.body.appendChild(el);
  await flush();
  // Navigate through kc-cards shadow root → kc-tasks → kc-tasks shadow root
  const tasksEl = el.shadowRoot!.querySelector('kc-tasks')!;
  const tasksRoot = tasksEl.shadowRoot!;
  // The resolved summary renders "Selected N of M" in a <span> inside a <p>
  const summaryText = Array.from(tasksRoot.querySelectorAll('span'))
    .map((s) => s.textContent ?? '')
    .join(' ');
  expect(summaryText).toContain('Selected 1 of 2');
  expect(tasksRoot.querySelector('input[type="checkbox"]')).toBeNull();
});
