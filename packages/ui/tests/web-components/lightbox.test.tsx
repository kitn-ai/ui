/**
 * `<kai-lightbox>` — the standalone click-to-zoom: wrap your own markup, show it in
 * a modal.
 *
 * WHY THIS FILE EXISTS. Two of this element's decisions are invisible when they
 * break, in opposite directions. The occupancy gate: a lightbox rendered WITHOUT a
 * trigger still looks normal, and the only damage is an empty `role="button"` tab
 * stop a keyboard user lands on (nothing renders, nothing throws). And the
 * composed modal: a lightbox whose content never gets assigned looks like a modal
 * that opened onto nothing, while every "it opened" assertion around it still
 * passes. Nothing else in the suite constructs this tag, so without this file both
 * would be pinned by a Storybook canvas nobody clicks.
 *
 * WHAT JSDOM CANNOT DO, and why the assertions are shaped the way they are. The
 * modal's panel lives in the element's own shadow root (the kit portals into the
 * shadow tree, not into `document.body`), so every lookup goes through
 * `shadowRoot`, and "open" is read as "the panel exists" because a closed dialog
 * UNMOUNTS its panel. Click and keydown are dispatched with
 * `bubbles: true, composed: true` because Solid delegates both to `document`: an
 * event that cannot cross the shadow boundary never reaches the handler, which
 * would make every trigger look inert and every Escape look ignored for reasons
 * that are purely the test's.
 */
import { afterEach, expect, test } from 'vitest';
import '../../src/web-components/lightbox/lightbox';

/** A remote image, the shape a consumer actually slots. */
const IMAGE_URL = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&fit=crop';

type Lightbox = HTMLElement & {
  show(): void;
  hide(): void;
  toggle(): void;
  open?: boolean;
  label?: string;
  showClose?: boolean;
};

afterEach(() => {
  document.body.replaceChildren();
});

/** Past a macrotask: the facade mounts its Solid render a task after connect. */
const flush = async (turns = 3) => {
  for (let i = 0; i < turns; i++) await new Promise((r) => setTimeout(r, 0));
};

async function mount(html = ''): Promise<Lightbox> {
  const el = document.createElement('kai-lightbox') as Lightbox;
  if (html) el.innerHTML = html;
  document.body.appendChild(el);
  await flush();
  return el;
}

const shadow = (el: Lightbox) => el.shadowRoot!;
const panel = (el: Lightbox) => shadow(el).querySelector('[part="panel"]') as HTMLElement | null;
/** The trigger this element renders itself, as opposed to any button the consumer
 *  slotted into it. */
const trigger = (el: Lightbox) => shadow(el).querySelector<HTMLElement>('[role="button"]');
/** The element's own answer to "am I open": a closed lightbox unmounts its panel. */
const isOpen = (el: Lightbox) => panel(el) !== null;
/** The close (X) the modal renders itself. `[part="close"]`, not `button`: the
 *  trigger's own button is a `[role="button"]` span, so a bare `button` lookup
 *  would match either. */
const closeButton = (el: Lightbox) => shadow(el).querySelector<HTMLElement>('[part="close"]');

const TRIGGER = '<button id="shutter" type="button">Zoom the photo</button>';
const CONTENT = `<img id="photo" slot="content" alt="A mountain at dusk" src="${IMAGE_URL}" />`;

/** Bubbling + composed: Solid delegates `click` to the document. */
const click = (node: Element) =>
  node.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

/** Bubbling + composed: the modal's Escape handler is Solid-delegated too. */
const key = (node: EventTarget, k: string) =>
  node.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true, cancelable: true }));

test('the `open` attribute opens the modal, and it is named by `label`', async () => {
  const el = await mount(`${TRIGGER}${CONTENT}`);
  expect(isOpen(el), 'closed until asked').toBe(false);

  // The plain HTML spelling, parsed from markup: the ordering inside
  // `wireDisclosure` is what keeps the author's attribute alive long enough to
  // mean something (see its comment).
  el.setAttribute('open', '');
  await flush();
  expect(isOpen(el)).toBe(true);
  expect(el.hasAttribute('open'), 'the state reflects back out').toBe(true);

  el.label = 'A mountain at dusk';
  await flush();
  expect(panel(el)!.getAttribute('role')).toBe('dialog');
  expect(panel(el)!.getAttribute('aria-modal')).toBe('true');
  expect(panel(el)!.getAttribute('aria-label')).toBe('A mountain at dusk');
});

test('<kai-lightbox open> and <kai-lightbox default-open> are open when parsed from HTML', async () => {
  // The parser path, where the attribute is already on the element before it
  // upgrades. This is the ordering the `open`-attribute defect lived in, and it is
  // the spelling a docs page or an SSR shell ships.
  const one = '<kai-lightbox open><button type="button">Zoom</button></kai-lightbox>';
  const other = '<kai-lightbox default-open><button type="button">Zoom</button></kai-lightbox>';
  const bare = '<kai-lightbox><button type="button">Zoom</button></kai-lightbox>';
  document.body.innerHTML = one + other + bare;

  const [a, b, c] = [...document.querySelectorAll('kai-lightbox')] as Lightbox[];
  await flush();
  expect(isOpen(a), 'a bare `open` attribute').toBe(true);
  expect(isOpen(b), 'the uncontrolled seed').toBe(true);
  expect(isOpen(c), 'and a bare element stays shut').toBe(false);
});

test('a click on the slotted trigger opens it, firing exactly one kai-open-change', async () => {
  const el = await mount(`${TRIGGER}${CONTENT}`);
  const seen: unknown[] = [];
  el.addEventListener('kai-open-change', (e) => seen.push((e as CustomEvent).detail));

  click(el.querySelector('#shutter')!);
  await flush();

  expect(isOpen(el)).toBe(true);
  // EXACTLY one: a second dispatch would make a consumer's own state machine flap.
  expect(seen).toEqual([{ open: true }]);

  // The trigger is a real button, so it carries the ARIA that promises activation.
  expect(trigger(el)!.getAttribute('aria-haspopup')).toBe('dialog');
  expect(trigger(el)!.getAttribute('aria-expanded')).toBe('true');
});

test('show(), hide() and toggle() drive it, and each change is announced once', async () => {
  const el = await mount(`${TRIGGER}${CONTENT}`);
  expect(typeof el.show).toBe('function');
  expect(typeof el.hide).toBe('function');
  expect(typeof el.toggle).toBe('function');

  const seen: unknown[] = [];
  el.addEventListener('kai-open-change', (e) => seen.push((e as CustomEvent).detail));

  el.show();
  await flush();
  expect(isOpen(el)).toBe(true);

  el.hide();
  await flush();
  expect(isOpen(el)).toBe(false);

  el.toggle();
  await flush();
  expect(isOpen(el)).toBe(true);

  expect(seen).toEqual([{ open: true }, { open: false }, { open: true }]);
});

test('an empty default slot renders NO role="button" tab stop, and the modal still opens', async () => {
  // The keyboard-trap case: a consumer who drives the modal from their own button,
  // or from show(), gets an element with nothing focusable of its own. Paired below
  // with the same harness once a trigger IS projected, so "no button" cannot be
  // passing because the element never renders one.
  const el = await mount(CONTENT);
  expect(trigger(el), 'no trigger content, no button').toBeNull();

  el.setAttribute('open', '');
  await flush();
  expect(isOpen(el), 'the modal is reachable by attribute alone').toBe(true);
  expect(shadow(el).querySelector('slot:not([name])'), 'the trigger slot was never rendered').toBeNull();
  expect(shadow(el).querySelector('slot[name="content"]'), 'the content slot is unconditional').not.toBeNull();

  const withTrigger = await mount(`${TRIGGER}${CONTENT}`);
  expect(trigger(withTrigger)).not.toBeNull();
});

test('a trigger added LATER lights up its button, and removing it takes the button away', async () => {
  // The occupancy gate re-reads on child mutations, which is what makes the element
  // usable with markup that arrives after mount.
  const el = await mount(CONTENT);
  expect(trigger(el)).toBeNull();

  const button = document.createElement('button');
  button.textContent = 'Zoom the photo';
  el.append(button);
  await flush();
  expect(trigger(el), 'the late trigger was picked up').not.toBeNull();

  button.remove();
  await flush();
  expect(trigger(el), 'and its removal takes the button with it').toBeNull();
});

test('the slotted content node is really assigned into the modal', async () => {
  // Otherwise "it opened" above is satisfied by an empty modal.
  const el = await mount(`${TRIGGER}${CONTENT}`);
  el.show();
  await flush();

  const slot = panel(el)!.querySelector('[part="body"] slot[name="content"]') as HTMLSlotElement | null;
  expect(slot, 'the content slot renders inside the dialog body').not.toBeNull();
  expect(slot!.assignedElements()).toEqual([el.querySelector('#photo')]);
});

test('Escape closes it, and reports the close', async () => {
  const el = await mount(`${TRIGGER}${CONTENT}`);
  el.show();
  await flush();
  const seen: unknown[] = [];
  el.addEventListener('kai-open-change', (e) => seen.push((e as CustomEvent).detail));

  // From a node inside the panel, which is where focus lands on open.
  key(el.querySelector('#photo')!, 'Escape');
  await flush();

  expect(isOpen(el)).toBe(false);
  expect(el.hasAttribute('open')).toBe(false);
  expect(seen).toEqual([{ open: false }]);
});

test('kai-open-change is non-bubbling and non-composed, like every other kai-* event', async () => {
  const el = await mount(`${TRIGGER}${CONTENT}`);
  let event: Event | undefined;
  el.addEventListener('kai-open-change', (e) => { event = e; });
  el.show();
  await flush();

  expect(event).toBeInstanceOf(CustomEvent);
  expect(event!.bubbles).toBe(false);
  expect(event!.composed).toBe(false);
});

/**
 * The close (X) control, which is ON by default — the one spelling where an ABSENT
 * attribute means ON. Both directions need pinning: a button that never appears
 * still leaves every assertion above green, and a button that ignores
 * `show-close="false"` is invisible to them too.
 */
test('the modal carries a close button with no attribute asked for, and it closes through it', async () => {
  const el = await mount(`${TRIGGER}${CONTENT}`);
  el.show();
  await flush();

  const close = closeButton(el);
  expect(close, 'absent `show-close` means the X is there').not.toBeNull();
  expect(close!.tagName).toBe('BUTTON');
  expect(close!.getAttribute('aria-label')).toBe('Close');

  const seen: unknown[] = [];
  el.addEventListener('kai-open-change', (e) => seen.push((e as CustomEvent).detail));
  click(close!);
  await flush();

  expect(isOpen(el)).toBe(false);
  expect(el.hasAttribute('open')).toBe(false);
  expect(seen).toEqual([{ open: false }]);
});

test('a bare `show-close` attribute keeps the X, because absent means ON', async () => {
  // The PARSER path, where the attribute is already on the element before it
  // upgrades: that is where component-register parses a bare boolean to
  // `undefined`, which is the whole reason this flag is read as
  // `undefined ? true : flag(…)` and not as `flag(…)` alone.
  document.body.innerHTML = `<kai-lightbox show-close open>${TRIGGER}${CONTENT}</kai-lightbox>`;
  const el = document.querySelector('kai-lightbox') as Lightbox;
  await flush();

  expect(isOpen(el)).toBe(true);
  expect(closeButton(el)).not.toBeNull();
});

test('`show-close="false"` and `el.showClose = false` both take the X away', async () => {
  // The attribute, parsed from markup — the docs spelling.
  const byAttribute = await mount(`${TRIGGER}${CONTENT}`);
  byAttribute.setAttribute('show-close', 'false');
  await flush();
  byAttribute.show();
  await flush();
  expect(closeButton(byAttribute), 'the attribute turned it off').toBeNull();
  // The rest of the modal is untouched: only the affordance is gone.
  expect(isOpen(byAttribute)).toBe(true);
  expect(trigger(byAttribute), 'and the trigger still works').not.toBeNull();

  // The property, set from script.
  const byProperty = await mount(`${TRIGGER}${CONTENT}`);
  byProperty.showClose = false;
  await flush();
  byProperty.show();
  await flush();
  expect(closeButton(byProperty), 'the property turned it off').toBeNull();
});
