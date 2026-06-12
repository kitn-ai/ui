import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
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
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
