import { test, expect, afterEach } from 'vitest';
import '../../src/elements/cards';
import type { CardEnvelope } from '../../src/primitives/card-contract';

const flush = () => new Promise((r) => setTimeout(r, 0));
afterEach(() => { document.querySelectorAll('kai-cards').forEach((e) => e.remove()); });

test('<kai-cards> renders a re-hydrated confirm card read-only', async () => {
  const el = document.createElement('kai-cards') as HTMLElement & { cards: CardEnvelope[] };
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
  // Navigate through kai-cards shadow root → kai-confirm → kai-confirm shadow root
  const confirmEl = el.shadowRoot!.querySelector('kai-confirm')!;
  const confirmRoot = confirmEl.shadowRoot!;
  expect(confirmRoot.textContent).toContain('Delete');
  const buttons = confirmRoot.querySelectorAll('button');
  expect(Array.from(buttons).some((b) => b.textContent?.trim() === 'Cancel')).toBe(false);
});

test('<kai-cards> renders a re-hydrated tasks card read-only', async () => {
  const el = document.createElement('kai-cards') as HTMLElement & { cards: CardEnvelope[] };
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
  // Navigate through kai-cards shadow root → kai-tasks → kai-tasks shadow root
  const tasksEl = el.shadowRoot!.querySelector('kai-tasks')!;
  const tasksRoot = tasksEl.shadowRoot!;
  // The resolved summary renders "Selected N of M" in a <span> inside a <p>
  const summaryText = Array.from(tasksRoot.querySelectorAll('span'))
    .map((s) => s.textContent ?? '')
    .join(' ');
  expect(summaryText).toContain('Selected 1 of 2');
  expect(tasksRoot.querySelector('input[type="checkbox"]')).toBeNull();
});

test('<kai-cards> renders a `dismissed` confirm envelope as a re-openable stub', async () => {
  const el = document.createElement('kai-cards') as HTMLElement & { cards: CardEnvelope[] };
  el.cards = [
    {
      type: 'confirm',
      id: 'c1',
      title: 'Delete?',
      data: { body: 'Delete it?', dismissible: true, actions: [{ id: 'yes', label: 'Delete' }] },
      resolution: { kind: 'dismissed' },
    },
  ];
  document.body.appendChild(el);
  await flush();
  const confirmRoot = el.shadowRoot!.querySelector('kai-confirm')!.shadowRoot!;
  // Stub shows the intent + dismissed text + a Reopen button; no action buttons.
  expect(confirmRoot.textContent).toContain('dismissed');
  expect(confirmRoot.querySelector('[role="group"]')).toBeTruthy();
  const buttons = Array.from(confirmRoot.querySelectorAll('button'));
  expect(buttons.some((b) => /Reopen/.test(b.textContent ?? ''))).toBe(true);
  expect(buttons.some((b) => b.textContent?.trim() === 'Delete')).toBe(false);
});

test('<kai-cards> renders an `expired` confirm envelope as historical (no action buttons, no Reopen)', async () => {
  const el = document.createElement('kai-cards') as HTMLElement & { cards: CardEnvelope[] };
  el.cards = [
    {
      type: 'confirm',
      id: 'c2',
      title: 'Delete?',
      data: { body: 'Delete it?', dismissible: true, actions: [{ id: 'yes', label: 'Delete' }] },
      resolution: { kind: 'expired' },
    },
  ];
  document.body.appendChild(el);
  await flush();
  const confirmRoot = el.shadowRoot!.querySelector('kai-confirm')!.shadowRoot!;
  const buttons = Array.from(confirmRoot.querySelectorAll('button'));
  // Terminal: no live action buttons, and NOT a re-openable stub.
  expect(buttons.some((b) => b.textContent?.trim() === 'Delete')).toBe(false);
  expect(buttons.some((b) => /Reopen/.test(b.textContent ?? ''))).toBe(false);
});
