import '../../src/web-components/chat/chat';
import { localStorageStore } from '../../src/primitives/conversation-store';
import type { ChatMessage } from '../../src/web-components/chat/chat-types';

if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

test('conversations=true forwards; store is a property-only prop that reaches the internal ChatThread', async () => {
  localStorage.clear();
  const store = localStorageStore('acme-support');
  await store.save('c1', [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }] satisfies ChatMessage[]);

  const el = document.createElement('kai-chat') as HTMLElement & { conversations: boolean; store: unknown; messages: ChatMessage[] };
  el.messages = [];
  el.conversations = true;
  el.store = store;
  document.body.appendChild(el);
  await flush();

  // Property reached the internal ChatThread: the toggle renders.
  expect(el.shadowRoot!.querySelector('[data-kai-conversations-toggle]')).toBeTruthy();

  // `store` must never be reflected as an attribute — it is a live object of
  // functions, not scalar data (the kai- contract).
  expect(el.getAttribute('store')).toBeNull();

  // The `conversations` boolean IS attribute-settable, matching every other
  // flag() prop (attach/voice/reasoningOpen).
  const el2 = document.createElement('kai-chat') as HTMLElement & { store: unknown };
  el2.setAttribute('conversations', '');
  el2.store = store;
  document.body.appendChild(el2);
  await flush();
  expect(el2.shadowRoot!.querySelector('[data-kai-conversations-toggle]')).toBeTruthy();

  el.remove();
  el2.remove();
});

// CRITICAL-1 (2026-08-26 final review): the facade used to forward
// `conversations`/`store` but never wire `onConversationLoad` onto the
// internal `<ChatThread>`, so a row tap / "new conversation" / mount
// auto-restore all updated ChatThread's own internal state while a WC
// consumer had no way at all to receive the loaded messages back — row-tap,
// new, and restore were all inert. Fixed by dispatching a non-bubbling
// `kai-conversation-load` CustomEvent (detail: { id, messages }) off the
// element; the facade's own internal wiring (always present) also satisfies
// the ChatThread-level "no onConversationLoad" guard, so the toggle keeps
// rendering even for a consumer who never listens for the event.
test('a row tap fires kai-conversation-load with the messages, and a consumer setting el.messages from it renders the thread', async () => {
  localStorage.clear();
  const store = localStorageStore('acme-support');
  await store.save('c1', [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hi from c1' }] }] satisfies ChatMessage[]);

  const el = document.createElement('kai-chat') as HTMLElement & { conversations: boolean; store: unknown; messages: ChatMessage[] };
  el.messages = [];
  el.conversations = true;
  el.store = store;

  let received: { id: string | undefined; messages: ChatMessage[] } | undefined;
  el.addEventListener('kai-conversation-load', (e) => {
    received = (e as CustomEvent<{ id: string | undefined; messages: ChatMessage[] }>).detail;
    el.messages = [...received.messages]; // real consumer wiring: fresh array back onto the element
  });

  document.body.appendChild(el);
  await flush();

  // Non-bubbling, matching the kai- contract's event idiom.
  let bubbledToDocument = false;
  document.addEventListener('kai-conversation-load', () => { bubbledToDocument = true; }, { once: true });

  const toggle = el.shadowRoot!.querySelector<HTMLButtonElement>('[data-kai-conversations-toggle]')!;
  toggle.click();
  await flush();
  const row = el.shadowRoot!.querySelector<HTMLElement>('[data-conversation-id="c1"]')!;
  expect(row).toBeTruthy();
  row.click();
  await flush();

  expect(received).toEqual({ id: 'c1', messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hi from c1' }] }] });
  expect(bubbledToDocument).toBe(false);
  // The consumer's own listener set `el.messages` from the event — the thread
  // now actually renders that conversation's history (back in chat view).
  expect(el.shadowRoot!.textContent).toContain('hi from c1');

  el.remove();
});

// The other half of CRITICAL-1: `conversations` on with a `store` but no
// `onConversationLoad` handler ANYWHERE (i.e. exercised at the ChatThread
// level directly — the facade always supplies its own internal handler, so
// this guard cannot trip through `<kai-chat>` itself; see chat-thread.test.tsx
// for that direct case). Documented here so the two guard halves — missing
// `store` and missing `onConversationLoad` — are easy to find side by side.
test('missing store (element level): decides loudly, toggle stays absent', async () => {
  const err = vi.spyOn(console, 'error').mockImplementation(() => {});
  const el = document.createElement('kai-chat') as HTMLElement & { conversations: boolean; messages: ChatMessage[] };
  el.messages = [];
  el.conversations = true;
  document.body.appendChild(el);
  await flush();

  expect(err).toHaveBeenCalled();
  expect(el.shadowRoot!.querySelector('[data-kai-conversations-toggle]')).toBeNull();

  err.mockRestore();
  el.remove();
});

// ── the derived trailing edge reaches the element (showTrailing) ────────────
// `ConversationPanel` and the home recent card (`HomePanel`) each derive a
// relative time of their own for the trailing edge, and `<kai-chat>` is the only
// handle an element consumer has on either. One option, both surfaces: the point
// of a single name is that a consumer who owns that edge turns it off once.
//
// Default ON, so both tests below have a companion that shows the edge the
// default state paints — an empty edge with nothing rendered beside it would
// pass just as well if the surface had failed to render at all.

type TrailChat = HTMLElement & {
  conversations?: boolean;
  store?: unknown;
  home?: unknown;
  showTrailing?: boolean;
  messages: ChatMessage[];
};

/** Every shape `relativeTimeShort` can return for a real timestamp. */
const derivedTime = /just now|\d+m ago|\d+h ago|\d+d ago/;

const mountTrailChat = async (attr?: string) => {
  localStorage.clear();
  const store = localStorageStore('acme-trailing');
  await store.save('c1', [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }] satisfies ChatMessage[]);
  const el = document.createElement('kai-chat') as TrailChat;
  if (attr) el.setAttribute('show-trailing', attr);
  el.conversations = true;
  el.store = store;
  el.messages = [];
  document.body.appendChild(el);
  await flush();
  return { el, store };
};

test('the panel row derives a relative time by default; show-trailing="false" leaves it empty', async () => {
  const { el } = await mountTrailChat();
  expect(el.showTrailing, 'absent means ON').toBe(true);

  el.shadowRoot!.querySelector<HTMLButtonElement>('[data-kai-conversations-toggle]')!.click();
  await flush();
  const row = el.shadowRoot!.querySelector<HTMLElement>('[data-conversation-id="c1"]')!;
  expect(row.textContent).toMatch(derivedTime);

  const off = await mountTrailChat('false');
  off.el.shadowRoot!.querySelector<HTMLButtonElement>('[data-kai-conversations-toggle]')!.click();
  await flush();
  // Non-vacuity: the row rendered, so an empty edge means the option worked
  // rather than the panel having failed to render.
  const offRow = off.el.shadowRoot!.querySelector<HTMLElement>('[data-conversation-id="c1"]')!;
  expect(offRow).toBeTruthy();
  expect(offRow.textContent).not.toMatch(derivedTime);
  // The preview line is not the trailing edge and stays.
  expect(offRow.textContent).toContain('hi');

  el.remove();
  off.el.remove();
});

test('the home recent card derives a relative time by default; show-trailing="false" leaves it empty', async () => {
  localStorage.clear();
  const store = localStorageStore('acme-trailing-home');
  await store.save('c1', [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }] satisfies ChatMessage[]);

  const home = async (attr?: string) => {
    const el = document.createElement('kai-chat') as TrailChat;
    if (attr) el.setAttribute('show-trailing', attr);
    el.conversations = true;
    el.store = store;
    el.home = { recentConversation: true };
    el.messages = [];
    document.body.appendChild(el);
    await flush();
    return el;
  };

  const on = await home();
  const onCard = on.shadowRoot!.querySelector<HTMLElement>('[data-kai-home-recent]')!;
  expect(onCard.textContent).toMatch(derivedTime);

  const off = await home('false');
  const offCard = off.shadowRoot!.querySelector<HTMLElement>('[data-kai-home-recent]')!;
  expect(offCard).toBeTruthy();
  expect(offCard.textContent).not.toMatch(derivedTime);
  // The card's own content is untouched: the store titles a conversation from its
  // first message, so the title (and the summary's `trailing` preview, which is the
  // card's SUBTITLE rather than this edge) both stay.
  expect(offCard.textContent).toContain('hi');

  on.remove();
  off.remove();
});
