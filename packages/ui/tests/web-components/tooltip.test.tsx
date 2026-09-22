/**
 * `<kai-tooltip>` — the tip body has two channels, and the reason is the layer,
 * not the feature.
 *
 * The Solid `Tooltip` takes `content` as a string, but a web-component consumer
 * cannot pass JSX at all, so a tip that has to carry markup (a `<kai-kbd>` key cap,
 * a label with emphasis) has no way in through a prop. The facade therefore mounts
 * its tip body as a named slot with the string as the slot's FALLBACK, which is the
 * same single node every consumer already goes through: slotted content replaces the
 * text, and the plain-string path is byte-for-byte what it was before the slot
 * existed. That regression is what the third test below pins.
 *
 * WHAT JSDOM CANNOT SHOW, stated rather than papered over. Which nodes a slot
 * RENDERS is a layout-time decision; the DOM hands the fallback to the slot as a
 * real child either way, so `bubble.textContent` reads "Voice input" even while a
 * slotted child is replacing it. The assertion has to be on the assignment itself
 * (`assignedElements()`), which is the input that decision takes, and it is paired
 * with the fallback still being present on the same node so "the slot rendered
 * nothing at all" cannot pass as a replacement.
 */
import { afterEach, expect, test } from 'vitest';
import '../../src/web-components/tooltip/tooltip';

afterEach(() => {
  document.body.replaceChildren();
});

/**
 * Two microtasks: component-register attaches the shadow root and renders the
 * facade lazily on connect, then Solid's own effects (the tooltip's presence gate
 * and the portal into the shadow root) run in the following flush.
 */
async function mount(content: string, html: string): Promise<HTMLElement> {
  const el = document.createElement('kai-tooltip');
  el.setAttribute('content', content);
  // `open` is the documented way to show the tip without a pointer: the body only
  // renders while the tooltip is open.
  el.setAttribute('open', '');
  el.innerHTML = html;
  document.body.appendChild(el);
  await Promise.resolve();
  await Promise.resolve();
  return el;
}

const bubbleOf = (el: HTMLElement): Element => {
  const bubble = el.shadowRoot?.querySelector('[role="tooltip"]');
  expect(bubble, 'the tip body did not render while open').not.toBeNull();
  return bubble!;
};

const triggerSlotOf = (el: HTMLElement): HTMLSlotElement => {
  const slot = el.shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])');
  expect(slot, 'the facade no longer renders a default slot for the trigger').not.toBeNull();
  return slot!;
};

test('the content attribute renders the text tip', async () => {
  const el = await mount('Voice input', '<span>trigger</span>');

  const bubble = bubbleOf(el);
  expect(bubble.textContent).toBe('Voice input');
  // The string is the slot's fallback, not a separate text node beside it.
  const contentSlot = bubble.querySelector<HTMLSlotElement>('slot[name="content"]');
  expect(contentSlot).not.toBeNull();
  expect(contentSlot!.assignedElements()).toEqual([]);

  // The trigger still goes to the default slot, and the slotted-content child would
  // not have been one.
  expect(triggerSlotOf(el).assignedElements().map((n) => n.textContent)).toEqual(['trigger']);

  el.remove();
});

test('a slot="content" child replaces the text and carries markup into the bubble', async () => {
  const el = await mount(
    'Voice input',
    '<span>trigger</span><span slot="content">Hold to talk <kai-kbd keys="Mod+Shift+M"></kai-kbd></span>',
  );

  const bubble = bubbleOf(el);
  const contentSlot = bubble.querySelector<HTMLSlotElement>('slot[name="content"]');
  expect(contentSlot).not.toBeNull();

  const assigned = contentSlot!.assignedElements();
  expect(assigned).toHaveLength(1);
  expect(assigned[0].getAttribute('slot')).toBe('content');
  expect(assigned[0].textContent).toContain('Hold to talk');
  // The whole point of the slot: the tip can hold another element, and here that
  // element is the kit's own key-cap display. It is left unupgraded on purpose
  // (kai-kbd is not imported) because placement is what this test proves; its
  // rendering is kbd.test.tsx's job.
  expect(assigned[0].querySelector('kai-kbd')).not.toBeNull();

  // The fallback is still the slot's child, which is what makes it a fallback
  // rather than something that had to be unmounted to get out of the way.
  expect(contentSlot!.textContent).toBe('Voice input');

  // And it did not leak into the trigger slot.
  expect(triggerSlotOf(el).assignedElements().map((n) => n.textContent)).toEqual(['trigger']);

  el.remove();
});

test('the plain-string tip is unchanged: text in the bubble, no assigned content', async () => {
  const el = await mount('Copy to clipboard', '<kai-button label="Copy"></kai-button>');

  const bubble = bubbleOf(el);
  expect(bubble.textContent).toBe('Copy to clipboard');
  const contentSlot = bubble.querySelector<HTMLSlotElement>('slot[name="content"]');
  expect(contentSlot!.assignedNodes()).toHaveLength(0);

  el.remove();
});
