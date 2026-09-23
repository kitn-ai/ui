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
  closeOnContentClick?: boolean;
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
/** A trigger with nothing focusable in it, so the element must supply the control
 *  itself. The other shape — the consumer's own `<button>` — is `TRIGGER`. */
const INERT_TRIGGER = `<img id="thumb" alt="A mountain at dusk" src="${IMAGE_URL}" />`;
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

  // The consumer's button is the control here, so the wrapper must NOT be a
  // second one. Both shapes are pinned in the delegation group below.
  expect(trigger(el), 'no role="button" wrapper around a real button').toBeNull();
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

  const withTrigger = await mount(`${INERT_TRIGGER}${CONTENT}`);
  expect(trigger(withTrigger), 'an inert trigger does get the stop').not.toBeNull();
});

test('a trigger added LATER lights up its button, and removing it takes the button away', async () => {
  // The occupancy gate re-reads on child mutations, which is what makes the element
  // usable with markup that arrives after mount. The late child here is INERT, so
  // the wrapper is the control: the late-arriving-<button> shape is the delegation
  // group's swap case, where the role moves to the child instead.
  const el = await mount(CONTENT);
  expect(trigger(el)).toBeNull();

  const image = document.createElement('img');
  image.id = 'thumb';
  image.alt = 'A mountain at dusk';
  el.append(image);
  await flush();
  expect(trigger(el), 'the late trigger was picked up').not.toBeNull();

  image.remove();
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
  // The attribute, parsed from markup — the docs spelling. Mounted on the inert
  // trigger, whose wrapper is the control, so the assertion below still says
  // something about the trigger rather than about the consumer's button.
  const byAttribute = await mount(`${INERT_TRIGGER}${CONTENT}`);
  byAttribute.setAttribute('show-close', 'false');
  await flush();
  byAttribute.show();
  await flush();
  expect(closeButton(byAttribute), 'the attribute turned it off').toBeNull();
  // The rest of the modal is untouched: only the affordance is gone.
  expect(isOpen(byAttribute)).toBe(true);
  expect(trigger(byAttribute), 'and the trigger still works').not.toBeNull();

  // The property, set from script.
  const byProperty = await mount(`${INERT_TRIGGER}${CONTENT}`);
  byProperty.showClose = false;
  await flush();
  byProperty.show();
  await flush();
  expect(closeButton(byProperty), 'the property turned it off').toBeNull();
});

/**
 * Click-on-the-picture dismissal, ON with no attribute asked for. Both directions
 * need pinning, and on THIS layer the interesting half is the slotted content: the
 * image is light DOM assigned to `slot="content"`, so a containment check that walks
 * the node tree sees no link between the image and the wrapper at all — a link inside
 * it would read as "not interactive" and close the modal it should not touch.
 */
test('a click on the slotted image closes the modal and reports it', async () => {
  const el = await mount(`${TRIGGER}${CONTENT}`);
  el.show();
  await flush();

  const seen: unknown[] = [];
  el.addEventListener('kai-open-change', (e) => seen.push((e as CustomEvent).detail));
  click(el.querySelector('#photo')!);
  await flush();

  expect(isOpen(el)).toBe(false);
  expect(el.hasAttribute('open')).toBe(false);
  // The same path as the X, Escape and a backdrop click: one kai-open-change.
  expect(seen).toEqual([{ open: false }]);
});

test('a link or a button slotted into the content keeps its own click', async () => {
  const el = await mount(
    `${TRIGGER}${CONTENT}`
    + '<a id="original" slot="content" href="#original">Original</a>'
    + '<button id="download" slot="content" type="button">Download</button>',
  );
  el.show();
  await flush();

  const seen: unknown[] = [];
  el.addEventListener('kai-open-change', (e) => seen.push((e as CustomEvent).detail));

  click(el.querySelector('#original')!);
  await flush();
  click(el.querySelector('#download')!);
  await flush();

  expect(isOpen(el), 'the modal stays open for both').toBe(true);
  expect(seen, 'and nothing was reported').toEqual([]);
});

test('a bare `close-on-content-click` attribute keeps closing, because absent means ON', async () => {
  // The PARSER path, where the attribute is already on the element before it
  // upgrades and component-register parses a bare boolean to `undefined` — the
  // reason this flag is read as `undefined ? true : flag(…)` and not as `flag(…)`.
  document.body.innerHTML =
    `<kai-lightbox close-on-content-click open>${TRIGGER}${CONTENT}</kai-lightbox>`;
  const el = document.querySelector('kai-lightbox') as Lightbox;
  await flush();

  click(el.querySelector('#photo')!);
  await flush();

  expect(isOpen(el)).toBe(false);
});

test('`close-on-content-click="false"` and `el.closeOnContentClick = false` both keep it open', async () => {
  const byAttribute = await mount(`${TRIGGER}${CONTENT}`);
  byAttribute.setAttribute('close-on-content-click', 'false');
  await flush();
  byAttribute.show();
  await flush();
  click(byAttribute.querySelector('#photo')!);
  await flush();
  expect(isOpen(byAttribute), 'the attribute turned it off').toBe(true);
  // The rest of the modal is untouched: only this dismissal is gone.
  key(byAttribute.querySelector('#photo')!, 'Escape');
  await flush();
  expect(isOpen(byAttribute), 'and Escape still closes').toBe(false);

  const byProperty = await mount(`${TRIGGER}${CONTENT}`);
  byProperty.closeOnContentClick = false;
  await flush();
  byProperty.show();
  await flush();
  click(byProperty.querySelector('#photo')!);
  await flush();
  expect(isOpen(byProperty), 'the property turned it off').toBe(true);
});

/**
 * ★ BOTH TRIGGER SHAPES. The element must supply the control for one and must NOT
 * for the other, and only the second half is a WCAG failure when it goes wrong:
 * `role="button"` is a children-presentational role, so a `role="button"` wrapper
 * around the consumer's own focusable control is `nested-interactive` (axe:
 * "Element has focusable descendants"), which reddened the Storybook a11y leg on
 * every commit of PR #409. The rule is `hasFocusableChild` — the same delegation
 * `HoverCardTrigger` already uses for its tab stop.
 */
test('an inert trigger gets the role, the stop and the ARIA from the wrapper', async () => {
  const el = await mount(`${INERT_TRIGGER}${CONTENT}`);
  const wrapper = trigger(el);
  expect(wrapper, 'the wrapper is the control').not.toBeNull();
  expect(wrapper!.tagName).toBe('SPAN');
  expect(wrapper!.getAttribute('tabindex'), 'and it owns the tab stop').toBe('0');
  expect(wrapper!.getAttribute('aria-haspopup')).toBe('dialog');
  expect(wrapper!.getAttribute('aria-expanded'), 'bound to the shared open state').toBe('false');

  el.show();
  await flush();
  expect(wrapper!.getAttribute('aria-expanded')).toBe('true');
});

test('the wrapper that owns the control consumes Enter and Space', async () => {
  // `preventDefault` is what keeps the keystroke from ALSO scrolling the thread
  // behind the modal; on this shape the wrapper is the only thing that can open it.
  const el = await mount(`${INERT_TRIGGER}${CONTENT}`);
  const thumb = el.querySelector('#thumb')!;

  const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true, cancelable: true });
  thumb.dispatchEvent(enter);
  await flush();
  expect(enter.defaultPrevented, 'the keystroke was consumed').toBe(true);
  expect(isOpen(el)).toBe(true);

  const other = await mount(`${INERT_TRIGGER}${CONTENT}`);
  const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, composed: true, cancelable: true });
  other.querySelector('#thumb')!.dispatchEvent(space);
  await flush();
  expect(space.defaultPrevented).toBe(true);
  expect(isOpen(other)).toBe(true);
});

test("a slotted control keeps its own role, stop and keystroke — the wrapper gets none", async () => {
  const el = await mount(`${TRIGGER}${CONTENT}`);
  expect(trigger(el), 'no role="button" around the consumer\'s button').toBeNull();

  const wrapper = shadow(el).querySelector('slot:not([name])')!.parentElement!;
  expect(wrapper.getAttribute('tabindex'), 'and no tab stop of its own').toBeNull();
  expect(wrapper.getAttribute('aria-haspopup')).toBeNull();
  expect(wrapper.getAttribute('aria-expanded')).toBeNull();

  // The keystroke belongs to the BUTTON: a `preventDefault` here would cancel the
  // control's own activation (and, for a slotted `<a href>`, its navigation).
  const shutter = el.querySelector('#shutter')!;
  const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, composed: true, cancelable: true });
  shutter.dispatchEvent(space);
  await flush();
  expect(space.defaultPrevented, 'the control keeps its activation').toBe(false);

  // The click still opens it exactly once: it bubbles from the child to the
  // wrapper's handler, which is what makes the delegation safe.
  const seen: unknown[] = [];
  el.addEventListener('kai-open-change', (e) => seen.push((e as CustomEvent).detail));
  click(shutter);
  await flush();
  expect(isOpen(el)).toBe(true);
  expect(seen).toEqual([{ open: true }]);
});

test('a slot that swaps an inert child for a control moves the role with it', async () => {
  // The occupancy gate stays true across the swap, so only the focusable-child
  // re-evaluation on `slotchange` can notice this.
  const el = await mount(`${INERT_TRIGGER}${CONTENT}`);
  expect(trigger(el), 'an inert trigger is the control').not.toBeNull();

  const button = document.createElement('button');
  button.id = 'shutter';
  button.textContent = 'Zoom the photo';
  el.querySelector('#thumb')!.replaceWith(button);
  await flush();
  expect(trigger(el), 'the consumer control took the role').toBeNull();

  const img = document.createElement('img');
  img.id = 'thumb';
  img.alt = 'A mountain at dusk';
  img.src = IMAGE_URL;
  button.replaceWith(img);
  await flush();
  expect(trigger(el), 'and the wrapper took it back').not.toBeNull();
});
