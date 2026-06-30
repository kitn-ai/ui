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

describe('HoverCard safe-area (transparent-gap bridge + closeDelay default)', () => {
  // No explicit delays -> openDelay defaults to 0, closeDelay defaults to 300.
  function setupDefaults() {
    return render(() => (
      <HoverCardRoot>
        <HoverCardTrigger><button data-testid="trg">trigger</button></HoverCardTrigger>
        <HoverCardContent class="w-80"><div data-testid="content">card</div></HoverCardContent>
      </HoverCardRoot>
    ));
  }

  it('renders an outer shell (data-hovercard-content) wrapping an inner visual card', () => {
    setupDefaults();
    const trg = screen.getByTestId('trg').parentElement!;
    fireEvent.pointerEnter(trg);
    vi.advanceTimersByTime(0); // openDelay default 0
    const shell = document.querySelector('[data-hovercard-content]') as HTMLElement;
    expect(shell).toBeTruthy();
    // Outer shell holds the positioning + transparent background, NOT the card classes.
    expect(shell.style.position).toBe('fixed');
    expect(shell.className).toContain('z-50');
    expect(shell.className).not.toContain('bg-card');
    // The safe-area padding bridges the gap (default placement 'bottom' -> padding-top).
    expect(shell.style.paddingTop).toBe('8px');
    // Inner card carries the visual classes, the consumer class, and presence state.
    const inner = shell.firstElementChild as HTMLElement;
    expect(inner.className).toContain('bg-card');
    expect(inner.className).toContain('rounded-lg');
    expect(inner.className).toContain('w-80'); // consumer-controlled sizing
    expect(inner.hasAttribute('data-expanded')).toBe(true);
    expect(inner.contains(screen.getByTestId('content'))).toBe(true);
  });

  it('stays open across a short advance because closeDelay defaults to 300ms', () => {
    setupDefaults();
    const trg = screen.getByTestId('trg').parentElement!;
    fireEvent.pointerEnter(trg);
    vi.advanceTimersByTime(0);
    expect(screen.queryByTestId('content')).toBeTruthy();
    // Leave the trigger, then advance LESS than the 300ms default close window.
    fireEvent.pointerLeave(trg);
    vi.advanceTimersByTime(100);
    expect(screen.queryByTestId('content')).toBeTruthy(); // still open at 100ms
  });

  it('closes after the 300ms default closeDelay elapses', async () => {
    setupDefaults();
    const trg = screen.getByTestId('trg').parentElement!;
    fireEvent.pointerEnter(trg);
    vi.advanceTimersByTime(0);
    fireEvent.pointerLeave(trg);
    vi.advanceTimersByTime(300);
    await Promise.resolve();
    expect(screen.queryByTestId('content')).toBeNull();
  });
});
