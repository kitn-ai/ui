// tests/elements/choice-element.test.tsx
// Contract integration for <kc-choice>: the bubbling `kc-card` CustomEvent reaches
// a document listener with the right `action` payload + resolved single-shot state,
// plus the allowOther two-step. Modeled on confirm-card-element.test.tsx.
import '../../src/elements/choice';
import { CARD_EVENT_NAME } from '../../src/primitives/card-routing';
import type { CardEvent } from '../../src/primitives/card-contract';
import type { ChoiceCardData } from '../../src/components/choice-card';

const flush = () => new Promise((r) => setTimeout(r, 0));

function listen(): { events: CardEvent[]; off: () => void } {
  const events: CardEvent[] = [];
  const handler = (e: Event) => events.push((e as CustomEvent<CardEvent>).detail);
  document.addEventListener(CARD_EVENT_NAME, handler);
  return { events, off: () => document.removeEventListener(CARD_EVENT_NAME, handler) };
}

afterEach(() => {
  document.querySelectorAll('kc-choice').forEach((e) => e.remove());
});

const PLANS: ChoiceCardData = {
  prompt: 'Which plan fits you?',
  options: [
    { id: 'free', label: 'Free', meta: '$0' },
    { id: 'pro', label: 'Pro', recommended: true, meta: '$12/mo', payload: { plan: 'pro' } },
  ],
};

async function mount(data: ChoiceCardData, cardId = 'card-choice-1') {
  const el = document.createElement('kc-choice') as HTMLElement & { data: ChoiceCardData };
  el.setAttribute('card-id', cardId);
  el.data = data;
  document.body.appendChild(el);
  await flush();
  return el;
}

const radios = (el: HTMLElement) =>
  Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>('[role="radio"]'));

test('kc-choice registers', () => {
  expect(customElements.get('kc-choice')).toBeTruthy();
});

test('mount emits a bubbling `ready` reaching the document', async () => {
  const { events, off } = listen();
  await mount(PLANS);
  expect(events.some((e) => e.kind === 'ready' && e.cardId === 'card-choice-1')).toBe(true);
  off();
});

test('group is a radiogroup; options are radios with aria-checked', async () => {
  const { off } = listen();
  const el = await mount(PLANS);
  expect(el.shadowRoot!.querySelector('[role="radiogroup"]')).toBeTruthy();
  const rs = radios(el);
  expect(rs.length).toBe(2);
  expect(rs.every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true);
  off();
});

test('picking an option emits `action` with id + echoed payload; bubbling+composed', async () => {
  const { events, off } = listen();
  const el = await mount(PLANS);
  const pro = radios(el).find((r) => r.dataset.optionId === 'pro')!;
  pro.click();
  await flush();
  const action = events.find((e) => e.kind === 'action') as
    | Extract<CardEvent, { kind: 'action' }>
    | undefined;
  expect(action?.cardId).toBe('card-choice-1');
  expect(action?.action).toBe('pro');
  expect(action?.payload).toEqual({ plan: 'pro' });
  off();
});

test('resolved state marks the chosen radio + sets data-kc-resolved', async () => {
  const { off } = listen();
  const el = await mount(PLANS);
  const pro = radios(el).find((r) => r.dataset.optionId === 'pro')!;
  pro.click();
  await flush();
  expect(pro.getAttribute('aria-checked')).toBe('true');
  expect(el.getAttribute('data-kc-resolved')).toBe('pro');
  off();
});

test('single-shot: a second click does not emit again', async () => {
  const { events, off } = listen();
  const el = await mount(PLANS);
  const free = radios(el).find((r) => r.dataset.optionId === 'free')!;
  free.click();
  free.click();
  await flush();
  expect(events.filter((e) => e.kind === 'action').length).toBe(1);
  off();
});

test('disabled option is aria-disabled + not focusable + inert', async () => {
  const { events, off } = listen();
  const el = await mount({ options: [{ id: 'a', label: 'A', disabled: true }, { id: 'b', label: 'B' }] });
  const a = radios(el).find((r) => r.dataset.optionId === 'a')!;
  expect(a.getAttribute('aria-disabled')).toBe('true');
  expect(a.getAttribute('tabindex')).toBe('-1');
  a.click();
  await flush();
  expect(events.some((e) => e.kind === 'action')).toBe(false);
  off();
});

test('roving tabindex: exactly one radio is a tab stop', async () => {
  const { off } = listen();
  const el = await mount(PLANS);
  const tabbable = radios(el).filter((r) => r.getAttribute('tabindex') === '0');
  expect(tabbable.length).toBe(1);
  off();
});

test('Arrow keys move selection skipping disabled; Enter selects', async () => {
  const { events, off } = listen();
  const el = await mount({
    options: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B', disabled: true },
      { id: 'c', label: 'C' },
    ],
  });
  const group = el.shadowRoot!.querySelector('[role="radiogroup"]') as HTMLElement;
  const a = radios(el).find((r) => r.dataset.optionId === 'a')!;
  a.focus();
  // ArrowDown from A should skip disabled B and land on C.
  group.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }));
  await flush();
  const c = radios(el).find((r) => r.dataset.optionId === 'c')!;
  c.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
  await flush();
  const action = events.find((e) => e.kind === 'action') as
    | Extract<CardEvent, { kind: 'action' }>
    | undefined;
  expect(action?.action).toBe('c');
  off();
});

test('empty options → inline error + `error` event; no radios', async () => {
  const { events, off } = listen();
  const el = await mount({ options: [] } as unknown as ChoiceCardData, 'card-bad');
  const root = el.shadowRoot!;
  expect(root.querySelector('[role="alert"]')).toBeTruthy();
  expect(root.querySelector('[role="radio"]')).toBeNull();
  expect(events.some((e) => e.kind === 'error' && e.cardId === 'card-bad')).toBe(true);
  off();
});

test('allowOther two-step: select Other reveals input + Submit; submit emits __other__', async () => {
  const { events, off } = listen();
  const el = await mount({
    options: [{ id: 'a', label: 'A' }],
    allowOther: { label: 'Other…', placeholder: 'Tell me' },
  });
  const other = radios(el).find((r) => r.dataset.optionId === '__other__')!;
  other.click();
  await flush();
  // No emit yet (two-step).
  expect(events.some((e) => e.kind === 'action')).toBe(false);
  const input = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="text"]')!;
  const submit = Array.from(el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button')).find(
    (b) => b.textContent?.trim() === 'Submit',
  )!;
  expect(submit.disabled).toBe(true);
  input.value = 'custom';
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  await flush();
  expect(submit.disabled).toBe(false);
  submit.click();
  await flush();
  const action = events.find((e) => e.kind === 'action') as
    | Extract<CardEvent, { kind: 'action' }>
    | undefined;
  expect(action?.action).toBe('__other__');
  expect(action?.payload).toEqual({ text: 'custom' });
  off();
});
