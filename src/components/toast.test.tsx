import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent, waitFor } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { Toast, ToastRegion } from './toast';
import type { ToastItem } from '../primitives/toast-store';

afterEach(cleanup);

const base = (over: Partial<ToastItem> = {}): ToastItem => ({
  id: 't1', message: 'Hello', ...over,
});

describe('Toast — rendering', () => {
  it('renders a neutral toast message with no check icon', () => {
    const { getByText, container } = render(() => (
      <Toast item={base({ duration: 0 })} onDismiss={() => {}} />
    ));
    expect(getByText('Hello')).toBeInTheDocument();
    // lucide Check renders an <svg>; the emerald class is the success tell.
    expect(container.querySelector('.text-emerald-500')).toBeNull();
  });

  it('renders a success toast with the emerald check icon', () => {
    const { container } = render(() => (
      <Toast item={base({ variant: 'success', duration: 0 })} onDismiss={() => {}} />
    ));
    expect(container.querySelector('.text-emerald-500')).not.toBeNull();
  });

  it('has role=status for assistive tech', () => {
    const { getByRole } = render(() => (
      <Toast item={base({ duration: 0 })} onDismiss={() => {}} />
    ));
    expect(getByRole('status')).toBeInTheDocument();
  });

  it('renders the × close button when dismissible (default)', () => {
    const { getByLabelText } = render(() => (
      <Toast item={base({ duration: 0 })} onDismiss={() => {}} />
    ));
    expect(getByLabelText('Dismiss')).toBeInTheDocument();
  });

  it('hides the × close button when dismissible is false', () => {
    const { queryByLabelText } = render(() => (
      <Toast item={base({ duration: 0, dismissible: false })} onDismiss={() => {}} />
    ));
    expect(queryByLabelText('Dismiss')).toBeNull();
  });
});

describe('Toast — auto-dismiss', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('auto-dismisses after the duration with reason "timeout"', async () => {
    const onDismiss = vi.fn();
    render(() => <Toast item={base({ duration: 2000 })} onDismiss={onDismiss} />);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    // presence then unmounts on a microtask (no real animation in jsdom)
    await vi.waitFor(() => expect(onDismiss).toHaveBeenCalledWith('timeout'));
  });

  it('does NOT auto-dismiss when duration is 0 (sticky)', () => {
    const onDismiss = vi.fn();
    render(() => <Toast item={base({ duration: 0 })} onDismiss={onDismiss} />);
    vi.advanceTimersByTime(60_000);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('pauses the timer while hovered and resumes on leave', async () => {
    const onDismiss = vi.fn();
    const { getByRole } = render(() => (
      <Toast item={base({ duration: 2000 })} onDismiss={onDismiss} />
    ));
    const pill = getByRole('status');
    vi.advanceTimersByTime(1000);
    fireEvent.pointerEnter(pill);          // pause with ~1000ms left
    vi.advanceTimersByTime(5000);          // time passes, paused → no dismiss
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.pointerLeave(pill);          // resume
    vi.advanceTimersByTime(999);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);             // remaining ~1000ms elapses
    await vi.waitFor(() => expect(onDismiss).toHaveBeenCalledWith('timeout'));
  });
});

describe('Toast — close + action', () => {
  it('× → onDismiss("close")', async () => {
    const onDismiss = vi.fn();
    const { getByLabelText } = render(() => (
      <Toast item={base({ duration: 0 })} onDismiss={onDismiss} />
    ));
    fireEvent.click(getByLabelText('Dismiss'));
    await waitFor(() => expect(onDismiss).toHaveBeenCalledWith('close'));
  });

  it('action button → onAction + onDismiss("action") and runs the handler', async () => {
    const onDismiss = vi.fn();
    const onAction = vi.fn();
    const handler = vi.fn(() => undefined);
    const { getByText } = render(() => (
      <Toast
        item={base({ duration: 0, action: { label: 'Undo', onAction: handler } })}
        onDismiss={onDismiss}
        onAction={onAction}
      />
    ));
    fireEvent.click(getByText('Undo'));
    expect(handler).toHaveBeenCalled();
    expect(onAction).toHaveBeenCalledWith('Undo');
    await waitFor(() => expect(onDismiss).toHaveBeenCalledWith('action'));
  });

  it('action handler returning false keeps the toast open', async () => {
    const onDismiss = vi.fn();
    const handler = vi.fn(() => false as const);
    const { getByText } = render(() => (
      <Toast
        item={base({ duration: 0, action: { label: 'Keep', onAction: handler } })}
        onDismiss={onDismiss}
      />
    ));
    fireEvent.click(getByText('Keep'));
    expect(handler).toHaveBeenCalled();
    // give the microtask queue a chance — it must NOT dismiss
    await Promise.resolve();
    expect(onDismiss).not.toHaveBeenCalled();
    expect(getByText('Keep')).toBeInTheDocument();
  });
});

describe('ToastRegion — stacking + queue + a11y', () => {
  it('exposes role=region with aria-live=polite', () => {
    const { getByRole } = render(() => <ToastRegion toasts={[]} />);
    const region = getByRole('region');
    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('renders at most `max` toasts and queues the overflow', () => {
    const toasts: ToastItem[] = [
      base({ id: 'a', message: 'A', duration: 0 }),
      base({ id: 'b', message: 'B', duration: 0 }),
      base({ id: 'c', message: 'C', duration: 0 }),
      base({ id: 'd', message: 'D', duration: 0 }),
    ];
    const { queryByText } = render(() => <ToastRegion toasts={toasts} max={2} />);
    // newest-on-top → D and C visible, A and B queued (not rendered)
    expect(queryByText('D')).toBeInTheDocument();
    expect(queryByText('C')).toBeInTheDocument();
    expect(queryByText('B')).toBeNull();
    expect(queryByText('A')).toBeNull();
  });

  it('promotes a queued toast when a visible one is removed', async () => {
    const [items, setItems] = createSignal<ToastItem[]>([
      base({ id: 'a', message: 'A', duration: 0 }),
      base({ id: 'b', message: 'B', duration: 0 }),
      base({ id: 'c', message: 'C', duration: 0 }),
    ]);
    const { queryByText } = render(() => (
      <ToastRegion toasts={items()} max={2} onDismiss={(id) => setItems((l) => l.filter((t) => t.id !== id))} />
    ));
    // visible: C, B ; queued: A
    expect(queryByText('A')).toBeNull();
    // remove C → A promotes
    setItems((l) => l.filter((t) => t.id !== 'c'));
    await waitFor(() => expect(queryByText('A')).toBeInTheDocument());
  });

  it('wires onDismiss through with the toast id', async () => {
    const onDismiss = vi.fn();
    const { getByLabelText } = render(() => (
      <ToastRegion toasts={[base({ id: 'x', message: 'X', duration: 0 })]} onDismiss={onDismiss} />
    ));
    fireEvent.click(getByLabelText('Dismiss'));
    await waitFor(() => expect(onDismiss).toHaveBeenCalledWith('x', 'close'));
  });
});
