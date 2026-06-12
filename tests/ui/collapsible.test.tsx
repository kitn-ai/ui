import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../../src/ui/collapsible';

describe('Collapsible', () => {
  it('trigger has aria-expanded reflecting controlled open + toggles via onOpenChange', () => {
    const [open, setOpen] = createSignal(false);
    render(() => (
      <Collapsible open={open()} onOpenChange={setOpen}>
        <CollapsibleTrigger data-testid="trg">Toggle</CollapsibleTrigger>
        <CollapsibleContent><p>Body</p></CollapsibleContent>
      </Collapsible>
    ));
    const trg = screen.getByTestId('trg');
    expect(trg.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trg);
    expect(open()).toBe(true);
    expect(trg.getAttribute('aria-expanded')).toBe('true');
  });

  it('content links to trigger via aria-controls', () => {
    const [open] = createSignal(true);
    render(() => (
      <Collapsible open={open()} onOpenChange={() => {}}>
        <CollapsibleTrigger data-testid="trg">Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="body">Body</CollapsibleContent>
      </Collapsible>
    ));
    const id = screen.getByTestId('trg').getAttribute('aria-controls');
    expect(id).toBeTruthy();
    expect(screen.getByTestId('body').id).toBe(id);
  });

  it('uncontrolled defaultOpen toggles internally', () => {
    render(() => (
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger data-testid="trg">Toggle</CollapsibleTrigger>
        <CollapsibleContent>Body</CollapsibleContent>
      </Collapsible>
    ));
    const trg = screen.getByTestId('trg');
    expect(trg.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trg);
    expect(trg.getAttribute('aria-expanded')).toBe('true');
  });

  it('trigger exposes data-state reflecting open', () => {
    const [open, setOpen] = createSignal(false);
    render(() => (
      <Collapsible open={open()} onOpenChange={setOpen}>
        <CollapsibleTrigger data-testid="trg">Toggle</CollapsibleTrigger>
        <CollapsibleContent>Body</CollapsibleContent>
      </Collapsible>
    ));
    const trg = screen.getByTestId('trg');
    expect(trg.getAttribute('data-state')).toBe('closed');
    fireEvent.click(trg);
    expect(trg.getAttribute('data-state')).toBe('open');
  });
});
