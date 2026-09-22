/**
 * Unit tests for the Lightbox trio.
 *
 * jsdom has no layout, so every assertion here is DOM or ARIA — never geometry.
 * What the lightbox has to promise: the trigger is a real control (click, Enter,
 * Space) that announces what it opens (`aria-haspopup` / `aria-expanded`),
 * Escape and a backdrop click reach `Dialog`'s own dismiss, the consumer's image
 * lands inside the dialog, and NOTHING renders while closed.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent, screen, within } from '@solidjs/testing-library';
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
} = {}) =>
  render(() => (
    <Lightbox {...props}>
      <LightboxTrigger>
        <img alt="Thumbnail" src={IMAGE} />
      </LightboxTrigger>
      <LightboxContent label="Photo preview">
        <img alt="Full size" src={IMAGE} />
      </LightboxContent>
    </Lightbox>
  ));

/** Named through the child `<img>`'s alt text, which is also how a screen reader
 *  reaches it: if the trigger stopped wrapping the consumer's markup, this query
 *  stops resolving. */
const trigger = () => screen.getByRole('button', { name: 'Thumbnail' });
const backdrop = () => document.querySelector('[part="backdrop"]') as HTMLElement;

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
