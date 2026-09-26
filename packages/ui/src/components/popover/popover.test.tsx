import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent, screen } from '@solidjs/testing-library';
import { ChatConfig } from '../../primitives/chat-config';
import { Popover } from './popover';

afterEach(cleanup);

// createPresence unmounts on a microtask when there is no exit animation (jsdom),
// so flush the queue before asserting a closed popover has left the DOM.
const tick = () => new Promise((r) => setTimeout(r, 0));

// Every query below goes through `screen` (document.body) rather than the render
// container's own queries: the panel is PORTALED, so it is not a descendant of the
// container by design. `getByText('Panel body')` against the container returns null
// precisely BECAUSE the fix is in place — that is the placement the next-to-last test
// asserts, and rebinding the query is what lets these presence tests keep passing
// unchanged in intent.
describe('Popover', () => {
  it('renders the trigger and hides the content until opened', () => {
    render(() => (
      <Popover trigger={<button>Open menu</button>}>
        <div>Panel body</div>
      </Popover>
    ));
    expect(screen.getByText('Open menu')).toBeInTheDocument();
    expect(screen.queryByText('Panel body')).not.toBeInTheDocument();
  });

  it('opens on trigger click and calls onOpenChange(true)', () => {
    const onOpenChange = vi.fn();
    render(() => (
      <Popover trigger={<button>Open menu</button>} onOpenChange={onOpenChange}>
        <div>Panel body</div>
      </Popover>
    ));
    fireEvent.click(screen.getByText('Open menu'));
    expect(screen.queryByText('Panel body')).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('toggles closed on a second trigger click and calls onOpenChange(false)', async () => {
    const onOpenChange = vi.fn();
    render(() => (
      <Popover trigger={<button>Open menu</button>} onOpenChange={onOpenChange}>
        <div>Panel body</div>
      </Popover>
    ));
    const trigger = screen.getByText('Open menu');
    fireEvent.click(trigger);
    expect(screen.queryByText('Panel body')).toBeInTheDocument();
    fireEvent.click(trigger);
    await tick();
    expect(screen.queryByText('Panel body')).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('closes on Escape', async () => {
    render(() => (
      <Popover trigger={<button>Open menu</button>}>
        <div>Panel body</div>
      </Popover>
    ));
    fireEvent.click(screen.getByText('Open menu'));
    expect(screen.queryByText('Panel body')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await tick();
    expect(screen.queryByText('Panel body')).not.toBeInTheDocument();
  });

  it('stays open when clicking inside the panel, closes on an outside pointerdown', async () => {
    render(() => (
      <Popover trigger={<button>Open menu</button>}>
        <div>Panel body</div>
      </Popover>
    ));
    fireEvent.click(screen.getByText('Open menu'));
    fireEvent.pointerDown(screen.getByText('Panel body'));
    expect(screen.queryByText('Panel body')).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    await tick();
    expect(screen.queryByText('Panel body')).not.toBeInTheDocument();
  });

  it('portals the panel out of a clipping ancestor', () => {
    // The bug this guards: `position: fixed` does NOT escape a containing block. The
    // `transform` here makes this div one, so a non-portaled panel would be laid out
    // (and clipped) inside it — `overflow: hidden` cuts the panel off. Placement, not
    // presence, is the assertion: the panel must live outside this subtree.
    let clip!: HTMLDivElement;
    render(() => (
      <div ref={clip} style={{ overflow: 'hidden', transform: 'translateZ(0)' }}>
        <Popover trigger={<button>Open menu</button>}>
          <div>Panel body</div>
        </Popover>
      </div>
    ));
    fireEvent.click(screen.getByText('Open menu'));

    const panel = screen.getByRole('dialog');
    expect(clip.contains(panel)).toBe(false);
    // No provider -> `portalMount()` is undefined -> Solid's `<Portal>` default,
    // `document.body` (inside the wrapper div Solid inserts there), so the panel's
    // ancestor chain reaches body WITHOUT crossing the clipping div. Pinned because
    // body is the fallback every consumer without a provider relies on.
    expect(document.body.contains(panel)).toBe(true);
  });

  it('portals into ChatConfig\'s portalMount when a provider sets one', () => {
    // The other half of the same contract: a web-component facade points
    // `portalMount` at its shadow root, and the panel must land THERE (or it loses
    // the facade's tokens and stylesheet). `undefined` and this are the only two
    // mount targets the kit allows.
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    render(() => (
      <ChatConfig portalMount={mount}>
        <Popover trigger={<button>Open menu</button>}>
          <div>Panel body</div>
        </Popover>
      </ChatConfig>
    ));
    fireEvent.click(screen.getByText('Open menu'));

    expect(mount.contains(screen.getByRole('dialog'))).toBe(true);
    mount.remove();
  });

  it('respects the controlled open prop', () => {
    render(() => (
      <Popover open trigger={<button>Open menu</button>}>
        <div>Panel body</div>
      </Popover>
    ));
    expect(screen.queryByText('Panel body')).toBeInTheDocument();
  });

  it('does not change its own state when controlled — defers to onOpenChange', () => {
    const onOpenChange = vi.fn();
    render(() => (
      <Popover open={false} trigger={<button>Open menu</button>} onOpenChange={onOpenChange}>
        <div>Panel body</div>
      </Popover>
    ));
    fireEvent.click(screen.getByText('Open menu'));
    // controlled: stays closed until the parent flips `open`
    expect(screen.queryByText('Panel body')).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});
