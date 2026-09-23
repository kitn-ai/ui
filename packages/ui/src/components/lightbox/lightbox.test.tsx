/**
 * Unit tests for the Lightbox trio.
 *
 * jsdom has no layout, so every assertion here is DOM or ARIA — never geometry.
 * What the lightbox has to promise: the trigger is a real control (click, Enter,
 * Space) that announces what it opens (`aria-haspopup` / `aria-expanded`) when it
 * has to be one, and leaves those to a consumer's own control when it does not,
 * Escape and a backdrop click reach `Dialog`'s own dismiss, the consumer's image
 * lands inside the dialog, a click on that image dismisses the modal while a click
 * on a link or button INSIDE it does not, and NOTHING renders while closed.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, createEvent, fireEvent, screen, within } from '@solidjs/testing-library';
import {
  Lightbox,
  LightboxTrigger,
  LightboxContent,
} from './lightbox';
import { MessageBody } from '../message/message';
import type { AttachmentData } from '../attachments/attachments';

afterEach(cleanup);

// Dialog drops its portaled panel on a microtask when there is no exit animation
// to wait for (always, in jsdom), so a closed assertion has to flush the queue
// first — the same tick `popover.test.tsx` takes for the same reason.
const tick = () => new Promise((r) => setTimeout(r, 0));

const IMAGE = 'https://example.com/photo-full.jpg';

const renderLightbox = (props: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  showClose?: boolean;
  closeOnContentClick?: boolean;
} = {}) =>
  render(() => (
    <Lightbox open={props.open} defaultOpen={props.defaultOpen} onOpenChange={props.onOpenChange}>
      <LightboxTrigger>
        <img alt="Thumbnail" src={IMAGE} />
      </LightboxTrigger>
      <LightboxContent
        label="Photo preview"
        showClose={props.showClose}
        closeOnContentClick={props.closeOnContentClick}
      >
        <img alt="Full size" src={IMAGE} />
      </LightboxContent>
    </Lightbox>
  ));

/** Named through the child `<img>`'s alt text, which is also how a screen reader
 *  reaches it: if the trigger stopped wrapping the consumer's markup, this query
 *  stops resolving. */
const trigger = () => screen.getByRole('button', { name: 'Thumbnail' });
const backdrop = () => document.querySelector('[part="backdrop"]') as HTMLElement;
/** The panel's own close control, scoped to the dialog: the trigger is also a
 *  `role="button"`, and it sits outside the portaled panel. */
const closeButton = () => within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' });

describe('Lightbox', () => {
  it('renders the trigger and nothing else while closed', () => {
    renderLightbox();

    expect(trigger()).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByAltText('Full size')).not.toBeInTheDocument();
  });

  it('makes the trigger a control that announces the dialog and its state', () => {
    renderLightbox();

    const t = trigger();
    expect(t).toHaveAttribute('tabindex', '0');
    expect(t).toHaveAttribute('aria-haspopup', 'dialog');
    expect(t).toHaveAttribute('aria-expanded', 'false');
    expect(t.className).toContain('cursor-zoom-in');
  });

  it('opens on click, labels the dialog and puts the consumer image inside it', () => {
    renderLightbox();

    fireEvent.click(trigger());

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-label', 'Photo preview');
    expect(within(dialog).getByAltText('Full size')).toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
  });

  it.each(['Enter', ' '])('opens from the keyboard on %s', (key) => {
    renderLightbox();

    fireEvent.keyDown(trigger(), { key });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes on Escape and reports it', async () => {
    const onOpenChange = vi.fn();
    renderLightbox({ onOpenChange });
    fireEvent.click(trigger());

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await tick();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('closes on a backdrop click', async () => {
    renderLightbox();
    fireEvent.click(trigger());

    fireEvent.pointerDown(backdrop());
    fireEvent.click(backdrop());
    await tick();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mounts open from defaultOpen alone, with no interaction', () => {
    renderLightbox({ defaultOpen: true });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders for a controlled open and leaves the change to the caller', () => {
    const onOpenChange = vi.fn();
    renderLightbox({ open: true, onOpenChange });

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    // Controlled: the component reports the request and does NOT act on it.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('stays shut when controlled closed and reports the open request', () => {
    const onOpenChange = vi.fn();
    renderLightbox({ open: false, onOpenChange });

    fireEvent.click(trigger());

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clamps the image to the viewport through the dialog panel', () => {
    renderLightbox({ defaultOpen: true });

    // jsdom computes no layout, so this pins the PLUMBING — the clamp is
    // published on the panel for the consumer's own `<img>`, and the body's 2rem
    // of padding is dropped so the 85vh clamp is the image's height in the
    // viewport. Whether it measures right needs a browser.
    const className = screen.getByRole('dialog').className;
    expect(className).toContain('[&_img]:max-h-[85vh]');
    expect(className).toContain('[&_img]:max-w-[90vw]');
    expect(className).toContain('[&_img]:object-contain');
    expect(className).toContain('[&>[part=body]]:p-0');
  });

  it('forwards a consumer class to the trigger', () => {
    render(() => (
      <Lightbox>
        <LightboxTrigger class="block size-full">
          <img alt="Thumbnail" src={IMAGE} />
        </LightboxTrigger>
        <LightboxContent label="Photo preview">
          <img alt="Full size" src={IMAGE} />
        </LightboxContent>
      </Lightbox>
    ));

    expect(trigger().className).toContain('block');
  });
});

/**
 * Click-on-the-picture dismissal, the default that needs pinning in BOTH directions:
 * a handler that never fires leaves the modal shut by Escape alone, and one that
 * fires on a link in a caption makes that link unclickable — and neither shows up in
 * any assertion above.
 */
describe('Lightbox content click to close', () => {
  it('closes when the content is clicked, and reports the change', async () => {
    const onOpenChange = vi.fn();
    renderLightbox({ defaultOpen: true, onOpenChange });

    fireEvent.click(screen.getByAltText('Full size'));
    await tick();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // The same controller as the trigger, the X and Escape: one path to onOpenChange.
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('stays open when the click lands on a link or a button inside the content', async () => {
    const onOpenChange = vi.fn();
    render(() => (
      <Lightbox defaultOpen onOpenChange={onOpenChange}>
        <LightboxTrigger>
          <img alt="Thumbnail" src={IMAGE} />
        </LightboxTrigger>
        <LightboxContent label="Photo preview">
          <img alt="Full size" src={IMAGE} />
          <a href="#original">Original</a>
          <button type="button">Download</button>
        </LightboxContent>
      </Lightbox>
    ));

    fireEvent.click(screen.getByRole('link', { name: 'Original' }));
    await tick();
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    await tick();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('keeps the modal open for closeOnContentClick={false}', async () => {
    renderLightbox({ defaultOpen: true, closeOnContentClick: false });

    fireEvent.click(screen.getByAltText('Full size'));
    await tick();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('leaves the panel around the content inert', async () => {
    // The handler is scoped to the content REGION, not to the panel: the wrapper is
    // `display: contents` and carries the click, so the panel's own padding stays
    // inert. Bound to the panel instead, a click on the media's margin would dismiss
    // a modal the reader was reaching into.
    renderLightbox({ defaultOpen: true });

    fireEvent.click(screen.getByRole('dialog').querySelector('[part="body"]')!);
    await tick();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('wraps the content in a display:contents region, so the panel layout is untouched', () => {
    renderLightbox({ defaultOpen: true });

    const wrapper = screen.getByAltText('Full size').parentElement!;
    expect(wrapper.className).toContain('contents');
    // A direct child of the body region, which is what keeps `[&>[part=body]]:p-0`
    // and the `[&_img]` clamp on the panel reaching what they reached before.
    expect(wrapper.parentElement).toHaveAttribute('part', 'body');
  });

  it('leaves the trigger, Escape and the X working alongside it', async () => {
    const onOpenChange = vi.fn();
    renderLightbox({ onOpenChange });

    fireEvent.click(trigger());
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await tick();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    fireEvent.click(trigger());
    fireEvent.click(closeButton());
    await tick();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});

/**
 * The optional close control. Escape, the backdrop and a host control all dismiss
 * this modal, so the X is a convenience — which is exactly why it needs pinning in
 * BOTH directions: one that never renders, and one that renders when it was turned
 * off, are both invisible to every assertion above.
 */
describe('Lightbox close control', () => {
  it('renders an X inside the panel by default and closes through it', async () => {
    const onOpenChange = vi.fn();
    renderLightbox({ defaultOpen: true, onOpenChange });

    const dialog = screen.getByRole('dialog');
    const close = closeButton();
    // Published for consumers, positioned against the PANEL it closes.
    expect(close).toHaveAttribute('part', 'close');
    expect(close.className).toContain('absolute');
    expect(dialog.className).toContain('relative');

    fireEvent.click(close);
    await tick();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('stays out of the dialog accessible name, which is the label', () => {
    renderLightbox({ defaultOpen: true });

    expect(screen.getByRole('dialog', { name: 'Photo preview' })).toBeInTheDocument();
  });

  it('renders no close control at all for showClose={false}', () => {
    renderLightbox({ defaultOpen: true, showClose: false });

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByRole('button')).not.toBeInTheDocument();
    // The modal is still the modal: only the affordance is gone.
    expect(within(dialog).getByAltText('Full size')).toBeInTheDocument();
  });

  it('leaves the trigger working with the close control off', () => {
    renderLightbox({ showClose: false });

    fireEvent.click(trigger());

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(within(screen.getByRole('dialog')).queryByRole('button')).not.toBeInTheDocument();
  });
});

/**
 * The in-thread tile is the consumer this component was added for, and its
 * selection goes through `AttachmentsContext.imagePreview` — a read that only
 * works if the tile sits BELOW the container's provider. Asserted here rather
 * than in `message.test.tsx` because the failure worth catching is the lightbox
 * never opening in a real message, which is exactly what a context read in the
 * wrong scope looks like.
 */
describe('MessageBody attachment tiles', () => {
  const image: AttachmentData = {
    id: 'f1',
    type: 'file',
    filename: 'mountain.jpg',
    mediaType: 'image/jpeg',
    url: IMAGE,
  };
  const parts = [{ type: 'file' as const, attachment: image }];

  it('opens a lightbox for an image tile when the body asks for one', () => {
    render(() => (
      <MessageBody parts={parts} isUser={false} markdown={false} imagePreview="lightbox" />
    ));

    const tile = screen.getByRole('button', { name: 'mountain.jpg' });
    expect(tile).toHaveAttribute('aria-haspopup', 'dialog');

    fireEvent.click(tile);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByAltText('mountain.jpg')).toBeInTheDocument();
  });

  it('keeps the hover card for an image tile by default', () => {
    render(() => <MessageBody parts={parts} isUser={false} markdown={false} />);

    expect(screen.getByAltText('mountain.jpg')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

/**
 * ★ THE TRIGGER IS A BUTTON WHEN, AND ONLY WHEN, ITS CHILDREN ARE NOT ONE.
 *
 * `role="button"` is a children-presentational role, so wrapping a consumer's own
 * focusable control in one is `nested-interactive` (WCAG 4.1.2, axe: "Element has
 * focusable descendants"). Both shapes are pinned here because only the second
 * one is the failure: an inert child (a div, an `<img>`, an svg tile) has no
 * keyboard way in without a stop of the wrapper's own, so removing the role
 * unconditionally would trade an axe violation for an unreachable control.
 */
describe('Lightbox trigger delegation', () => {
  const renderWithButtonTrigger = () =>
    render(() => (
      <Lightbox>
        <LightboxTrigger>
          <button type="button">Zoom the photo</button>
        </LightboxTrigger>
        <LightboxContent label="Photo preview">
          <img alt="Full size" src={IMAGE} />
        </LightboxContent>
      </Lightbox>
    ));

  it('leaves the role, the stop and the ARIA to a slotted control', () => {
    renderWithButtonTrigger();

    const control = screen.getByRole('button', { name: 'Zoom the photo' });
    const wrapper = control.parentElement!;
    expect(wrapper).not.toHaveAttribute('role');
    expect(wrapper).not.toHaveAttribute('tabindex');
    expect(wrapper).not.toHaveAttribute('aria-haspopup');
    expect(wrapper).not.toHaveAttribute('aria-expanded');

    // The click still opens through the wrapper's handler.
    fireEvent.click(control);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('keeps the wrapper as the control when nothing inside is focusable', () => {
    renderLightbox();

    const wrapper = trigger();
    expect(wrapper).toHaveAttribute('role', 'button');
    expect(wrapper).toHaveAttribute('tabindex', '0');
    expect(wrapper).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('consumes the keystroke only when the wrapper is the control', () => {
    // An inert child: the wrapper is the control, so Space must not also scroll
    // the thread behind the modal.
    renderLightbox();
    const owned = createEvent.keyDown(trigger(), { key: ' ' });
    fireEvent(trigger(), owned);
    expect(owned.defaultPrevented).toBe(true);

    cleanup();

    // A slotted control: the keystroke is the BUTTON's, and a preventDefault here
    // would cancel its own activation.
    renderWithButtonTrigger();
    const control = screen.getByRole('button', { name: 'Zoom the photo' });
    const delegated = createEvent.keyDown(control, { key: ' ' });
    fireEvent(control, delegated);
    expect(delegated.defaultPrevented).toBe(false);
  });
});
