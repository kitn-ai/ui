/**
 * `<kai-thread>` item mode: app-rendered `<kai-message>` children.
 *
 * The thread keeps the scroller, the live region, the pending indicator and the empty
 * state; the CONSUMER owns the loop over the messages. Children win over `messages`,
 * loudly (one warning per element), because ignoring one of two competing sources
 * silently is a decision made while withholding that it happened.
 *
 * jsdom has no layout, so stick-to-bottom over these children is settled in real
 * Chromium by tests/browser/thread-composed-scroll.browser.test.tsx, not here.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import './thread';
import '../message/message';
import type { KaiThreadElement } from '../web-component-types';

if (!Element.prototype.scrollTo) (Element.prototype as unknown as { scrollTo: () => void }).scrollTo = () => {};

afterEach(() => {
  document.querySelectorAll('kai-thread').forEach((el) => el.remove());
  vi.restoreAllMocks();
});

const tick = () => new Promise((r) => setTimeout(r, 0));

async function mount(html: string, set?: (el: KaiThreadElement) => void) {
  const host = document.createElement('div');
  host.innerHTML = `<kai-thread>${html}</kai-thread>`; // test-authored markup, not model output
  const el = host.firstElementChild as KaiThreadElement;
  set?.(el);
  document.body.append(el);
  await customElements.whenDefined('kai-thread');
  await tick();
  await tick();
  const root = el.shadowRoot!;
  return {
    el,
    root,
    log: () => root.querySelector('[role="log"]') as HTMLElement,
    defaultSlot: () => root.querySelector('slot:not([name])') as HTMLSlotElement | null,
    rows: () => [...root.querySelectorAll('[part="row"]')],
    text: () => root.textContent ?? '',
  };
}

const TWO = `<kai-message role="user"><kai-markdown content="hello"></kai-markdown></kai-message>
  <kai-message role="assistant"><kai-markdown content="hi there"></kai-markdown></kai-message>`;

describe('<kai-thread> item mode', () => {
  it('projects its kai-message children through a default slot inside the scroll viewport', async () => {
    const t = await mount(TWO);
    const slot = t.defaultSlot();
    expect(slot).not.toBeNull();
    // The slot lives INSIDE the scroller, so the scroll region owns the children.
    expect(t.log().contains(slot)).toBe(true);
    expect(slot!.assignedElements().map((e) => e.tagName.toLowerCase())).toEqual(['kai-message', 'kai-message']);
    // ...and the thread rendered no rows of its own.
    expect(t.rows()).toHaveLength(0);
  });

  it('ignores `messages` when children are present, and warns once', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const t = await mount(TWO, (el) => {
      el.messages = [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'FROM DATA' }] }];
    });
    expect(t.text()).not.toContain('FROM DATA');
    expect(t.rows()).toHaveLength(0);
    // A new array per chunk is the streaming shape: it must not re-warn.
    t.el.messages = [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'FROM DATA 2' }] }];
    await tick();
    const ours = warn.mock.calls.filter((c) => String(c[0]).includes('<kai-thread>'));
    expect(ours).toHaveLength(1);
    expect(String(ours[0][0])).toMatch(/children/i);
    expect(String(ours[0][0])).toMatch(/messages/);
  });

  it('does not warn for data mode, nor for children with an empty messages array', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await mount(TWO, (el) => { el.messages = []; });
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('<kai-thread>'))).toHaveLength(0);
  });

  it('shows the pending indicator after the last child when loading', async () => {
    const t = await mount(TWO, (el) => { el.loading = true; });
    const slot = t.defaultSlot()!;
    const loader = [...t.log().querySelectorAll('*')].find((n) => /loading/i.test(n.textContent ?? '') && n.closest('[part="row"]'));
    expect(loader).toBeTruthy();
    // Document order: the slot (the app's messages) comes BEFORE the pending row.
    const pendingRow = loader!.closest('[part="row"]')!;
    expect(slot.compareDocumentPosition(pendingRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows the empty slot when there are no children and no messages, and stops once one arrives', async () => {
    const t = await mount('<div slot="empty" id="mine">Nothing yet</div>');
    expect(t.root.querySelector('slot[name="empty"]')).not.toBeNull();
    expect(t.defaultSlot()).toBeNull();
    const msg = document.createElement('kai-message');
    msg.innerHTML = '<kai-markdown content="first"></kai-markdown>';
    t.el.append(msg);
    await tick();
    await tick();
    expect(t.root.querySelector('slot[name="empty"]')).toBeNull();
    expect(t.defaultSlot()!.assignedElements()).toEqual([msg]);
    msg.remove();
    await tick();
    await tick();
    expect(t.root.querySelector('slot[name="empty"]')).not.toBeNull();
  });

  it('shows the built-in empty state for an empty thread with no slot', async () => {
    const t = await mount('');
    expect(t.text()).toContain('No messages yet');
  });

  it('does not treat a hidden or slot-named child as a message', async () => {
    const t = await mount('<kai-message hidden></kai-message><div slot="empty">E</div>');
    expect(t.defaultSlot()).toBeNull();
    expect(t.text()).not.toContain('No messages yet');
  });

  it('scrollToBottom scrolls the viewport that holds the children', async () => {
    const t = await mount(TWO);
    const spy = vi.fn();
    t.log().scrollTo = spy as never;
    t.el.scrollToBottom('instant');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toMatchObject({ behavior: 'instant' });
  });
});
