/**
 * `<kai-menu>` — the width of its surface, and the floor under it.
 *
 * WHAT IS ASSERTED HERE, AND WHAT IS NOT: jsdom lays nothing out, so every rect it
 * reports is zero and a pixel assertion would be theatre. This file pins the
 * MECHANISM — `full` makes the surface take its width from the trigger's measured
 * rect, a non-full trigger writes no width at all and keeps the floor, and the floor
 * is declared on the surface rather than at the facade's call site. The real geometry
 * (the assistant block's footer row at a default and a widened rail) is measured in
 * Chromium by `scripts/probe-menu-surface-width.mjs`.
 *
 * Assertions run against the real custom element rather than the Solid component, the
 * convention `tests/web-components/dropdown.test.tsx` documents.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import '../../src/web-components/menu/menu';

/** Past a macrotask: the facade's reflections land in `attributeChangedCallback`. */
const flush = () => new Promise((r) => setTimeout(r, 0));

/**
 * jsdom has no ResizeObserver. This one only records callbacks, so the resize case
 * can be driven without a layout engine.
 */
class ResizeObserverStub {
  static seen: ResizeObserverStub[] = [];
  private cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
    ResizeObserverStub.seen.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  fire() { this.cb([], this as unknown as ResizeObserver); }
}
if (typeof (globalThis as any).ResizeObserver === 'undefined') {
  (globalThis as any).ResizeObserver = ResizeObserverStub;
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

type Menu = HTMLElement & { items?: unknown[]; show(): void; hide(): void; toggle(): void };

const ITEMS = [
  { heading: true, label: 'Account' },
  { id: 'settings', label: 'Account settings', icon: 'settings' },
  { id: 'sign-out', label: 'Sign out' },
];

async function mount(attrs: Record<string, string> = {}, html = ''): Promise<Menu> {
  const el = document.createElement('kai-menu') as Menu;
  el.items = ITEMS;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (html) el.innerHTML = html;
  document.body.appendChild(el);
  await flush();
  return el;
}

const root = (el: Menu) => el.shadowRoot!;
const menuOf = (el: Menu) => root(el).querySelector<HTMLElement>('[role="menu"]');
const triggerOf = (el: Menu) => root(el).querySelector<HTMLElement>('[aria-haspopup="menu"]');

/** The rect field the surface reads, and nothing else. */
const rect = (width: number): DOMRect => ({
  width, height: 32, top: 0, left: 0, right: width, bottom: 32, x: 0, y: 0,
  toJSON: () => ({}),
}) as DOMRect;

describe('kai-menu surface width', () => {
  test('a NON-full trigger writes no width: the surface keeps the kit floor (the Labs menu look)', async () => {
    const el = await mount();
    const trigger = triggerOf(el)!;
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(rect(364));

    el.show();
    await flush();

    const menu = menuOf(el)!;
    expect(menu, 'the surface renders when open').toBeTruthy();
    expect(trigger.classList.contains('w-full'), 'a non-full trigger does not stretch').toBe(false);
    expect(menu.style.width, 'no tracked width: the CSS floor governs').toBe('');
    expect(
      menu.classList.contains('min-w-[15rem]'),
      "the 15rem floor is the surface's own default now, not the facade's class",
    ).toBe(true);
  });

  test('`full` makes the surface as wide as the trigger it came from', async () => {
    // The assistant block's footer shape: a slotted, full-width trigger (avatar +
    // name) in a flex row, so the trigger IS the row's width.
    const el = await mount({ full: '' }, `
      <span slot="trigger" class="flex w-full items-center gap-2">
        <span>Demo User</span>
      </span>
    `);
    const trigger = triggerOf(el)!;
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(rect(364));

    el.show();
    await flush();

    const menu = menuOf(el)!;
    expect(trigger.classList.contains('w-full'), '`full` stretches the trigger to its container').toBe(true);
    expect(menu.style.width).toBe('364px');
  });

  test('a widened rail moves an OPEN surface with it', async () => {
    const el = await mount({ full: '' });
    const trigger = triggerOf(el)!;
    const spy = vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(rect(280));

    ResizeObserverStub.seen = [];
    el.show();
    await flush();
    expect(menuOf(el)!.style.width).toBe('280px');

    expect(
      ResizeObserverStub.seen.length,
      'the surface observed the trigger, or nothing re-measures on a rail drag',
    ).toBeGreaterThan(0);

    spy.mockReturnValue(rect(420));
    for (const ro of ResizeObserverStub.seen) ro.fire();
    await flush();

    expect(menuOf(el)!.style.width).toBe('420px');
  });
});
