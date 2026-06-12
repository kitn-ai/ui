import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { HoverCardRoot, HoverCardTrigger, HoverCardContent } from '../../src/ui/hover-card';

// jsdom (v24) does not implement the PointerEvent constructor. fireEvent.pointerEnter/Leave
// need it. Real browsers implement PointerEvent, so this is a jsdom-only shim. We extend
// MouseEvent so .target / bubbling behave like a real pointer event.
if (typeof (globalThis as any).PointerEvent === 'undefined') {
  (globalThis as any).PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type: string, params?: PointerEventInit) {
      super(type, params);
    }
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup() {
  return render(() => (
    <HoverCardRoot openDelay={100} closeDelay={100}>
      <HoverCardTrigger><button data-testid="trg">trigger</button></HoverCardTrigger>
      <HoverCardContent><div data-testid="content">card</div></HoverCardContent>
    </HoverCardRoot>
  ));
}

describe('HoverCard determinism (HC-1)', () => {
  it('opens after openDelay on enter and stays deterministic across repeated cycles', async () => {
    setup();
    const trg = screen.getByTestId('trg').parentElement!;
    for (let i = 0; i < 5; i++) {
      fireEvent.pointerEnter(trg);
      vi.advanceTimersByTime(100);
      expect(screen.queryByTestId('content')).toBeTruthy();
      fireEvent.pointerLeave(trg);
      vi.advanceTimersByTime(100);
      // createPresence unmounts on the next microtask in jsdom — flush it.
      await Promise.resolve();
      expect(screen.queryByTestId('content')).toBeNull();
    }
  });

  it('pointer transit trigger -> content keeps it open', () => {
    setup();
    const trg = screen.getByTestId('trg').parentElement!;
    fireEvent.pointerEnter(trg);
    vi.advanceTimersByTime(100);
    const content = screen.getByTestId('content').closest('[data-hovercard-content]')!;
    fireEvent.pointerLeave(trg);
    fireEvent.pointerEnter(content); // enters before closeDelay elapses
    vi.advanceTimersByTime(100);
    expect(screen.queryByTestId('content')).toBeTruthy();
  });

  it('opens on focus (keyboard)', () => {
    setup();
    const trg = screen.getByTestId('trg').parentElement!;
    fireEvent.focusIn(trg);
    vi.advanceTimersByTime(100);
    expect(screen.queryByTestId('content')).toBeTruthy();
  });

  it('focus transit trigger -> content keeps it open', async () => {
    setup();
    const trg = screen.getByTestId('trg').parentElement!;
    fireEvent.focusIn(trg);
    vi.advanceTimersByTime(100);
    const content = screen.getByTestId('content').closest('[data-hovercard-content]')!;
    fireEvent.focusOut(trg, { relatedTarget: content });
    fireEvent.focusIn(content);
    vi.advanceTimersByTime(100);
    expect(screen.queryByTestId('content')).toBeTruthy();
  });

  it('Escape closes immediately (no closeDelay wait)', async () => {
    setup();
    const trg = screen.getByTestId('trg').parentElement!;
    fireEvent.pointerEnter(trg);
    vi.advanceTimersByTime(100);
    expect(screen.queryByTestId('content')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    await Promise.resolve(); // microtask unmount
    expect(screen.queryByTestId('content')).toBeNull();
  });
});
