// tests/elements/cards-element.test.tsx
// <kc-cards>: renders the right child kc-* per envelope, sets data/cardId/heading/theme,
// routes child events through .policy, bubbles the raw kc-card event, and shows a
// fallback (+ error) for unknown types.
import '../../src/elements/cards';
import { CARD_EVENT_NAME } from '../../src/primitives/card-routing';
import type { CardEnvelope, CardEvent, CardPolicy } from '../../src/primitives/card-contract';

const flush = () => new Promise((r) => setTimeout(r, 0));
afterEach(() => { document.querySelectorAll('kc-cards').forEach((e) => e.remove()); });

type CardsEl = HTMLElement & { cards: CardEnvelope[]; policy?: CardPolicy; types?: Record<string, string> };

async function mount(cards: CardEnvelope[], setup?: (el: CardsEl) => void): Promise<CardsEl> {
  const el = document.createElement('kc-cards') as CardsEl;
  el.cards = cards;
  setup?.(el);
  document.body.appendChild(el);
  await flush();
  await flush();
  await flush();
  return el;
}

const CONFIRM: CardEnvelope = {
  type: 'confirm', id: 'c1', title: 'Deploy?',
  data: { body: 'Ship it?', actions: [{ id: 'go', label: 'Go', default: true }] },
};

test('kc-cards registers', () => {
  expect(customElements.get('kc-cards')).toBeTruthy();
});

test('renders one child element per envelope, in order', async () => {
  const el = await mount([
    CONFIRM,
    { type: 'link', id: 'l1', data: { url: 'https://example.com', title: 'Ex' } },
  ]);
  const tags = Array.from(el.shadowRoot!.querySelectorAll('kc-confirm, kc-link-card')).map((n) => n.tagName.toLowerCase());
  expect(tags).toEqual(['kc-confirm', 'kc-link-card']);
});

test('sets data + card-id + heading on a child', async () => {
  const el = await mount([CONFIRM]);
  const child = el.shadowRoot!.querySelector('kc-confirm') as HTMLElement & { data: unknown; cardId: string; heading: string };
  expect(child.data).toEqual(CONFIRM.data);
  expect(child.cardId).toBe('c1');
  expect(child.heading).toBe('Deploy?');
});

test('.policy receives a child action', async () => {
  const actions: string[] = [];
  const el = await mount([CONFIRM], (e) => { e.policy = { onAction: (_id, action) => actions.push(action) }; });
  const btn = el.shadowRoot!.querySelector('kc-confirm')!.shadowRoot!.querySelector<HTMLButtonElement>('[data-action-id="go"]')!;
  btn.click();
  await flush();
  expect(actions).toEqual(['go']);
});

test('raw kc-card events bubble past kc-cards to the document', async () => {
  const seen: CardEvent[] = [];
  const handler = (e: Event) => seen.push((e as CustomEvent<CardEvent>).detail);
  document.addEventListener(CARD_EVENT_NAME, handler);
  const el = await mount([CONFIRM]);
  const btn = el.shadowRoot!.querySelector('kc-confirm')!.shadowRoot!.querySelector<HTMLButtonElement>('[data-action-id="go"]')!;
  btn.click();
  await flush();
  expect(seen.some((e) => e.kind === 'action' && (e as any).action === 'go')).toBe(true);
  document.removeEventListener(CARD_EVENT_NAME, handler);
});

test('unknown type → fallback alert + an error routed to .policy', async () => {
  const errors: string[] = [];
  const el = await mount([{ type: 'mystery', id: 'm1', data: {} }], (e) => { e.policy = { onError: (_id, msg) => errors.push(msg) }; });
  expect(el.shadowRoot!.querySelector('[role="alert"]')!.textContent).toContain('mystery');
  expect(errors).toHaveLength(1);
});

test('.types maps a custom type to a registered tag', async () => {
  const el = await mount(
    [{ type: 'note', id: 'n1', data: { body: 'hi' } }],
    (e) => { e.types = { note: 'kc-confirm' }; },
  );
  // 'note' now resolves to kc-confirm (data lacks actions → its own inline error, but the TAG is chosen)
  expect(el.shadowRoot!.querySelector('kc-confirm')).toBeTruthy();
});
