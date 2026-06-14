// tests/elements/task-list-card-element.test.tsx
// Contract integration for <kc-task-list>: row toggles are quiet; only confirm emits
// `submit-data` with ids in input order; select-all + min/max/allowEmpty gating.
import '../../src/elements/task-list-card';
import { CARD_EVENT_NAME } from '../../src/primitives/card-routing';
import type { CardEvent } from '../../src/primitives/card-contract';
import type { TaskListCardData } from '../../src/components/task-list-card';

const flush = () => new Promise((r) => setTimeout(r, 0));

function listen(): { events: CardEvent[]; off: () => void } {
  const events: CardEvent[] = [];
  const handler = (e: Event) => events.push((e as CustomEvent<CardEvent>).detail);
  document.addEventListener(CARD_EVENT_NAME, handler);
  return { events, off: () => document.removeEventListener(CARD_EVENT_NAME, handler) };
}

afterEach(() => {
  document.querySelectorAll('kc-task-list').forEach((e) => e.remove());
});

const PLAN: TaskListCardData = {
  selectAll: true,
  confirmLabel: 'Run selected',
  tasks: [
    { id: 'lint', label: 'Run linter', checked: true },
    { id: 'test', label: 'Run unit tests', checked: true },
    { id: 'build', label: 'Build bundle' },
    { id: 'deploy', label: 'Deploy', description: 'Reversible; staging only' },
  ],
};

async function mount(data: TaskListCardData, cardId = 'card-plan-42') {
  const el = document.createElement('kc-task-list') as HTMLElement & { data: TaskListCardData };
  el.setAttribute('card-id', cardId);
  el.data = data;
  document.body.appendChild(el);
  await flush();
  return el;
}

const rowCheckbox = (root: ShadowRoot, id: string): HTMLInputElement =>
  root.querySelector<HTMLInputElement>(`[data-task-id="${id}"] input[type="checkbox"]`)!;

const setChecked = (cb: HTMLInputElement, on: boolean): void => {
  cb.checked = on;
  cb.dispatchEvent(new Event('change', { bubbles: true }));
};

const confirmBtn = (root: ShadowRoot): HTMLButtonElement =>
  Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
    (b) => b.textContent?.includes('Run selected') || b.textContent?.includes('Confirm'),
  )!;

test('kc-task-list registers', () => {
  expect(customElements.get('kc-task-list')).toBeTruthy();
});

test('mount emits a bubbling `ready`', async () => {
  const { events, off } = listen();
  await mount(PLAN);
  expect(events.some((e) => e.kind === 'ready' && e.cardId === 'card-plan-42')).toBe(true);
  off();
});

test('toggling rows emits NO event; only confirm does', async () => {
  const { events, off } = listen();
  const el = await mount(PLAN);
  const root = el.shadowRoot!;
  setChecked(rowCheckbox(root, 'build'), true);
  await flush();
  expect(events.some((e) => e.kind === 'submit-data')).toBe(false);
  off();
});

test('confirm emits submit-data with selected ids in INPUT order', async () => {
  const { events, off } = listen();
  const el = await mount(PLAN); // lint + test pre-checked
  const root = el.shadowRoot!;
  // also check deploy (after build in input order)
  setChecked(rowCheckbox(root, 'deploy'), true);
  await flush();
  confirmBtn(root).click();
  await flush();
  const submit = events.find((e) => e.kind === 'submit-data') as
    | Extract<CardEvent, { kind: 'submit-data' }>
    | undefined;
  expect(submit?.cardId).toBe('card-plan-42');
  expect(submit?.data).toEqual({ selected: ['lint', 'test', 'deploy'] });
  off();
});

test('select-all checks all toggleable rows + computes indeterminate', async () => {
  const { off } = listen();
  const el = await mount({
    selectAll: true,
    tasks: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C', disabled: true },
    ],
  });
  const root = el.shadowRoot!;
  const master = root.querySelector<HTMLInputElement>('input[aria-checked]')!;
  // none checked → unchecked
  expect(master.indeterminate).toBe(false);
  expect(master.checked).toBe(false);
  // check one → indeterminate
  setChecked(rowCheckbox(root, 'a'), true);
  await flush();
  expect(master.indeterminate).toBe(true);
  expect(master.getAttribute('aria-checked')).toBe('mixed');
  // select-all → all toggleable checked, disabled excluded
  setChecked(master, true);
  await flush();
  expect(rowCheckbox(root, 'a').checked).toBe(true);
  expect(rowCheckbox(root, 'b').checked).toBe(true);
  expect(rowCheckbox(root, 'c').checked).toBe(false); // disabled never affected
  expect(master.checked).toBe(true);
  off();
});

test('allowEmpty:false disables confirm at zero; >=1 enables', async () => {
  const { off } = listen();
  const el = await mount({ tasks: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] });
  const root = el.shadowRoot!;
  expect(confirmBtn(root).disabled).toBe(true);
  setChecked(rowCheckbox(root, 'a'), true);
  await flush();
  expect(confirmBtn(root).disabled).toBe(false);
  off();
});

test('allowEmpty:true confirms with zero → { selected: [] }', async () => {
  const { events, off } = listen();
  const el = await mount({ allowEmpty: true, tasks: [{ id: 'a', label: 'A' }] });
  const root = el.shadowRoot!;
  expect(confirmBtn(root).disabled).toBe(false);
  confirmBtn(root).click();
  await flush();
  const submit = events.find((e) => e.kind === 'submit-data') as
    | Extract<CardEvent, { kind: 'submit-data' }>
    | undefined;
  expect(submit?.data).toEqual({ selected: [] });
  off();
});

test('min gates confirm', async () => {
  const { off } = listen();
  const el = await mount({ min: 2, tasks: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] });
  const root = el.shadowRoot!;
  setChecked(rowCheckbox(root, 'a'), true);
  await flush();
  expect(confirmBtn(root).disabled).toBe(true); // 1 < min 2
  setChecked(rowCheckbox(root, 'b'), true);
  await flush();
  expect(confirmBtn(root).disabled).toBe(false);
  off();
});

test('max blocks toggling unchecked rows past the cap', async () => {
  const { off } = listen();
  const el = await mount({
    max: 1,
    tasks: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
  });
  const root = el.shadowRoot!;
  setChecked(rowCheckbox(root, 'a'), true);
  await flush();
  // b should now be disabled (max reached)
  expect(rowCheckbox(root, 'b').disabled).toBe(true);
  off();
});

test('invalid envelope → inline error + `error` event; no checkboxes', async () => {
  const { events, off } = listen();
  const el = await mount({ tasks: [] } as unknown as TaskListCardData, 'card-bad');
  const root = el.shadowRoot!;
  expect(root.querySelector('[role="alert"]')).toBeTruthy();
  expect(root.querySelector('input[type="checkbox"]')).toBeNull();
  expect(events.some((e) => e.kind === 'error' && e.cardId === 'card-bad')).toBe(true);
  off();
});

test('resolved state after submit: rows + confirm disabled, Submitted shown', async () => {
  const { off } = listen();
  const el = await mount({ tasks: [{ id: 'a', label: 'A', checked: true }] });
  const root = el.shadowRoot!;
  confirmBtn(root).click();
  await flush();
  expect(confirmBtn(root).disabled).toBe(true);
  expect(rowCheckbox(root, 'a').disabled).toBe(true);
  expect(root.querySelector('[role="status"]')?.textContent).toContain('Submitted');
  off();
});
