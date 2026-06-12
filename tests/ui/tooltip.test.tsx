import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@solidjs/testing-library';
import { Tooltip } from '../../src/ui/tooltip';

describe('Tooltip', () => {
  it('shows on focus and wires aria-describedby', async () => {
    render(() => <Tooltip content="Hello"><button data-testid="b">x</button></Tooltip>);
    const trigger = screen.getByTestId('b').parentElement!; // As span wraps the button
    fireEvent.focusIn(trigger);
    const tip = await screen.findByRole('tooltip');
    expect(tip.textContent).toBe('Hello');
    expect(trigger.getAttribute('aria-describedby')).toBe(tip.id);
  });

  it('hides on Escape', async () => {
    render(() => <Tooltip content="Hello"><button>x</button></Tooltip>);
    const trigger = screen.getByText('x').parentElement!;
    fireEvent.focusIn(trigger);
    await screen.findByRole('tooltip');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  });

  it('applies data-closed (exit animation state) before unmounting', async () => {
    render(() => <Tooltip content="Hello"><button>x</button></Tooltip>);
    const trigger = screen.getByText('x').parentElement!;
    fireEvent.focusIn(trigger);
    const tip = await screen.findByRole('tooltip');
    expect(tip.getAttribute('data-expanded')).toBe('');
    fireEvent.keyDown(document, { key: 'Escape' });
    // still mounted this tick, now in closing state
    expect(tip.getAttribute('data-closed')).toBe('');
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  });
});
