/**
 * `<kai-attachments>` IMAGE PREVIEW — the hover card or the lightbox.
 *
 * WHY THIS FILE EXISTS. `image-preview` is a NEW prop whose whole job is to
 * choose between two interaction models on the same tile, and the failure it can
 * have is silent in both directions: a tile that lost its hover card looks
 * exactly like a tile whose hover card has not been hovered yet, and a tile whose
 * lightbox never opens looks exactly like a closed one. Nothing else in the suite
 * clicks a tile, so without this file the only evidence either path works would
 * be a Storybook canvas.
 *
 * WHAT JSDOM CANNOT DO, and why the assertions are shaped the way they are. The
 * lightbox content is a modal, so the interesting state is post-interaction: this
 * file drives focus (`focusin` on a node INSIDE the trigger, which is how the
 * hover-card trigger escalates a focusable child to the card) and click, then
 * asserts what appeared. `[data-hovercard-content]` is the hover card's own
 * published marker and exists only while the card is mounted, so "null" means
 * "no card", not "not yet painted". Click and focus are dispatched with
 * `bubbles: true, composed: true` because Solid delegates `click` to the
 * document — an event that cannot cross the shadow boundary never reaches the
 * handler and would make every trigger look inert.
 *
 * The facade composes the lightbox itself (the trio is the Solid `Lightbox` in
 * src/components/lightbox, and `<kai-lightbox>` is the standalone element for
 * consumers who wrap their own markup), so these assertions run against a real
 * `<kai-attachments>` element rather than a Solid fixture.
 */
import { afterEach, expect, test } from 'vitest';
import '../../src/web-components/attachments/attachments';
import type { AttachmentData } from '../../src/components/attachments/attachments';

type AttachmentsElement = HTMLElement & { items: AttachmentData[] };

const IMAGE_URL = 'data:image/png;base64,iVBORw0KGgo=';
const IMAGE: AttachmentData[] = [
  { id: 'a1', type: 'file', filename: 'cat.png', mediaType: 'image/png', url: IMAGE_URL },
];
/** A PDF: allowed by the media policy, `document` category, so the hover card's
 *  details fallback renders and no lightbox is possible. */
const PDF: AttachmentData[] = [
  { id: 'd1', type: 'file', filename: 'spec.pdf', mediaType: 'application/pdf', url: 'https://example.com/spec.pdf' },
];

afterEach(() => {
  document.body.replaceChildren();
});

/**
 * Past a macrotask, several times: the facade mounts its Solid render a task
 * after connect, and the hover card opens through its own `openDelay` timer plus
 * a presence transition.
 */
const flush = async (turns = 3) => {
  for (let i = 0; i < turns; i++) await new Promise((r) => setTimeout(r, 0));
};

async function mount(attrs: Record<string, string>, items: AttachmentData[]): Promise<AttachmentsElement> {
  const el = document.createElement('kai-attachments') as AttachmentsElement;
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  el.items = items;
  document.body.appendChild(el);
  await flush();
  return el;
}

const shadow = (el: AttachmentsElement) => el.shadowRoot!;
/** The hover card's published marker. Rendered only while the card is mounted. */
const hoverCard = (el: AttachmentsElement) => shadow(el).querySelector('[data-hovercard-content]');
const dialog = (el: AttachmentsElement) => shadow(el).querySelector('[role="dialog"]');
/** The tile's OWN image: the hover card's and the lightbox content's copies both
 *  carry `part="preview"`, so the trigger's copy is the one with no part. */
const thumb = (el: AttachmentsElement) =>
  shadow(el).querySelector<HTMLImageElement>('[part="attachment"] img:not([part])');
const name = (el: AttachmentsElement) => shadow(el).querySelector('[part="attachment-name"]');

/** `focusin` bubbles, which is how a trigger with an inert child (a div, an img)
 *  learns the tile was reached by keyboard. */
const focusIn = (node: Element) =>
  node.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }));
/** Bubbling + composed: Solid delegates `click` to the document. */
const click = (node: Element) =>
  node.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

test('an image keeps the hover card by default and opens no dialog', async () => {
  const el = await mount({ 'hover-card': '' }, IMAGE);
  expect(hoverCard(el), 'a closed card is unmounted').toBeNull();

  focusIn(thumb(el)!);
  await flush();
  expect(hoverCard(el), 'the hover card is still the image surface').not.toBeNull();

  click(thumb(el)!);
  await flush();
  expect(dialog(el), 'a hover card is not a modal').toBeNull();
});

test('image-preview="lightbox" replaces the hover card and opens the image in a dialog', async () => {
  const el = await mount({ 'image-preview': 'lightbox' }, IMAGE);
  focusIn(thumb(el)!);
  await flush();
  expect(hoverCard(el), 'the lightbox replaced the trio, it did not stack beside it').toBeNull();

  expect(dialog(el), 'closed until the trigger is clicked').toBeNull();
  click(thumb(el)!);
  await flush();

  const panel = dialog(el);
  expect(panel, 'the trigger opened a dialog').not.toBeNull();
  expect(panel!.getAttribute('aria-label'), 'named by the attachment label').toBe('cat.png');

  const preview = panel!.querySelector<HTMLImageElement>('img[part="preview"]');
  expect(preview?.getAttribute('src'), 'the dialog shows the same image the hover card would').toBe(IMAGE_URL);
  // The size clamp lives on the dialog panel, not on the consumer's image: one
  // spelling, so a tile whose own classes say `max-h-64` cannot leave the modal
  // with a thumbnail inside it. jsdom has no layout, so the class is the assertion.
  expect(panel!.className, 'the panel clamps the image to the viewport').toContain('[&_img]:max-h-[85vh]');
});

test('hover-card and image-preview="lightbox" together still give the image the lightbox', async () => {
  const el = await mount({ 'hover-card': '', 'image-preview': 'lightbox' }, IMAGE);
  focusIn(thumb(el)!);
  await flush();
  expect(hoverCard(el), 'the lightbox wins for the one item it can present').toBeNull();

  click(thumb(el)!);
  await flush();
  expect(dialog(el)).not.toBeNull();
});

test('a non-image item keeps the hover card under image-preview="lightbox"', async () => {
  const el = await mount({ 'hover-card': '', 'image-preview': 'lightbox' }, PDF);
  focusIn(name(el)!);
  await flush();
  expect(hoverCard(el), 'a PDF has no image for a dialog to show').not.toBeNull();
  expect(hoverCard(el)!.textContent, 'and the card keeps its details fallback').toContain('spec.pdf');

  click(name(el)!);
  await flush();
  expect(dialog(el), 'no lightbox exists for this item').toBeNull();
});
