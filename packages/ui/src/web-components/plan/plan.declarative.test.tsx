import { describe, it, expect, afterEach, vi } from 'vitest';
import './plan';
import './plan-item';
import '../chat/chat';
import type { ChatMessage } from '../chat/chat-types';

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
}
if (!Element.prototype.scrollTo) (Element.prototype as unknown as { scrollTo: () => void }).scrollTo = () => {};
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));
type El = HTMLElement & Record<string, unknown>;

const ITEMS = [
  { id: 'a', label: 'Read the brief', status: 'completed' },
  { id: 'b', label: 'Write the intro', status: 'in_progress' },
  { id: 'c', label: 'Review', status: 'pending' },
];

const button = (el: El) => el.shadowRoot!.querySelector('[data-kai-plan] > button') as HTMLButtonElement;
const rowInfo = (el: El) =>
  [...el.shadowRoot!.querySelectorAll('[data-kai-plan-item]')].map((r) => [
    r.textContent,
    r.querySelector('[role="img"]')?.getAttribute('aria-label'),
  ]);

async function mountData(items: unknown[], attrs = ''): Promise<El> {
  document.body.innerHTML = `<kai-plan ${attrs}></kai-plan>`; // test-authored markup
  await customElements.whenDefined('kai-plan');
  const el = document.querySelector('kai-plan') as unknown as El;
  el.items = items;
  await tick();
  return el;
}

describe('kai-plan, data mode', () => {
  it('renders the collapsed line and opens by property, firing kai-open-change', async () => {
    const el = await mountData(ITEMS);
    expect(button(el).textContent).toBe('1 of 3 done · Write the intro');
    const onOpen = vi.fn();
    el.addEventListener('kai-open-change', (e) => onOpen((e as CustomEvent).detail));
    button(el).click();
    await tick();
    expect(button(el).getAttribute('aria-expanded')).toBe('true');
    expect(onOpen).toHaveBeenCalledWith({ open: true });
    expect(el.hasAttribute('open')).toBe(true);
    expect(rowInfo(el)).toHaveLength(3);
  });

  it('the bare `open` attribute opens it; `default-open` seeds it', async () => {
    expect(button(await mountData(ITEMS, 'open')).getAttribute('aria-expanded')).toBe('true');
    document.body.replaceChildren();
    expect(button(await mountData(ITEMS, 'default-open')).getAttribute('aria-expanded')).toBe('true');
  });

  it('a new items array updates the line', async () => {
    const el = await mountData(ITEMS);
    el.items = ITEMS.map((i, n) => ({ ...i, status: n < 2 ? 'completed' : 'in_progress' }));
    await tick();
    expect(button(el).textContent).toBe('2 of 3 done · Review');
  });
});

describe('kai-plan, item mode', () => {
  it('<kai-plan-item> children give the same rows and summary as items', async () => {
    const data = await mountData(ITEMS, 'open');
    const dataRows = rowInfo(data);
    const dataLine = button(data).textContent;
    document.body.replaceChildren();

    document.body.innerHTML = `<kai-plan open>${ITEMS.map((i) => `<kai-plan-item status="${i.status}">${i.label}</kai-plan-item>`).join('')}</kai-plan>`; // test-authored markup
    await customElements.whenDefined('kai-plan');
    await tick(80);
    const composed = document.querySelector('kai-plan') as unknown as El;
    expect(button(composed).textContent).toBe(dataLine);
    const items = [...composed.children] as El[];
    expect(items).toHaveLength(3);
    expect(items.map((h) => [h.textContent, h.shadowRoot!.querySelector('[role="img"]')?.getAttribute('aria-label')])).toEqual(dataRows);
    expect(items.every((h) => h.getAttribute('role') === 'listitem')).toBe(true);
  });

  it('a status change on a child updates the summary', async () => {
    document.body.innerHTML = `<kai-plan><kai-plan-item status="in_progress">One</kai-plan-item><kai-plan-item status="pending">Two</kai-plan-item></kai-plan>`; // test-authored markup
    await customElements.whenDefined('kai-plan');
    await tick(80);
    const plan = document.querySelector('kai-plan') as unknown as El;
    expect(button(plan).textContent).toBe('0 of 2 done · One');
    (plan.children[0] as El).status = 'completed';
    (plan.children[1] as El).status = 'in_progress';
    await tick(80);
    expect(button(plan).textContent).toBe('1 of 2 done · Two');
  });
});

// ── kai-chat flow-through ─────────────────────────────────────────────────────────────

const planCall = (id: string, items: unknown[]): ChatMessage => ({
  id: `m-${id}`,
  role: 'assistant',
  parts: [{ type: 'tool', tool: { type: 'kai_plan', state: 'output-available', toolCallId: id, input: { items } as Record<string, unknown> } }],
});

async function mountChat(messages: ChatMessage[], attrs = ''): Promise<El> {
  document.body.innerHTML = `<kai-chat ${attrs}></kai-chat>`; // test-authored markup
  await customElements.whenDefined('kai-chat');
  const el = document.querySelector('kai-chat') as unknown as El;
  el.messages = messages;
  await tick(80);
  return el;
}
// `kai-chat` renders the Solid `Plan` directly (as it does every internal part), so the plan is in
// its shadow root, inside the prompt input's `above` region.
const chatPlan = (el: El) => el.shadowRoot!.querySelector('[part="attachment-above"] [data-kai-plan]') as HTMLElement | null;
const chatLine = (el: El) => chatPlan(el)!.querySelector(':scope > button')!.textContent;

describe('kai-chat plan', () => {
  it('shows the latest valid plan in the prompt input above region', async () => {
    const el = await mountChat([planCall('p1', ITEMS)]);
    expect(chatPlan(el)).not.toBeNull();
    expect(chatLine(el)).toBe('1 of 3 done · Write the intro');
  });

  it('updates when a later kai_plan arrives in a new messages array', async () => {
    const first = [planCall('p1', ITEMS)];
    const el = await mountChat(first);
    el.messages = [...first, planCall('p2', ITEMS.map((i) => ({ ...i, status: 'completed' })))];
    await tick(80);
    expect(chatLine(el)).toBe('3 of 3 done');
  });

  it('shows nothing without a plan, and plan="off" hides it', async () => {
    const none = await mountChat([{ id: 'u', role: 'user', parts: [{ type: 'text', text: 'hi' }] }]);
    expect(chatPlan(none)).toBeNull();
    document.body.replaceChildren();
    const off = await mountChat([planCall('p1', ITEMS)], 'plan="off"');
    expect(chatPlan(off)).toBeNull();
    (off as El).plan = 'auto';
    await tick(80);
    expect(chatPlan(off)).not.toBeNull();
  });

  it('an empty plan clears it', async () => {
    const el = await mountChat([planCall('p1', ITEMS)]);
    el.messages = [planCall('p1', ITEMS), planCall('p2', [])];
    // The region slides shut first and drops its content after the closing transition.
    await tick(400);
    expect(chatPlan(el)).toBeNull();
  });
});
