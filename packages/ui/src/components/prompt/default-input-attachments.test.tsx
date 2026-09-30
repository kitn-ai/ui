/**
 * Attachment regions inside the prompt input's card. The content lives INSIDE the card's
 * own element (which owns the surface, shadow and focus ring), above or below the input row
 * over a hairline divider, and an input with nothing attached carries no region content, no
 * divider and no part at all.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { createSignal, type JSX } from 'solid-js';
import { DefaultPromptInput } from './default-input';
import { PRESENCE_MS } from '../presence/measured-presence';

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const noop = () => {};
const baseProps = { value: '', onValueChange: noop, onSubmit: noop, onSuggestionClick: noop };

const PARTS = ['attachment-above', 'attachment-below', 'divider-above', 'divider-below'];
const part = (c: HTMLElement, name: string) => c.querySelector(`[part~="${name}"]`) as HTMLElement | null;
const card = (c: HTMLElement) => c.querySelector('[data-prompt-input]') as HTMLElement;
const editable = (c: HTMLElement) => c.querySelector('[contenteditable]') as HTMLElement;

describe('DefaultPromptInput with nothing attached', () => {
  it('renders no attachment part and no divider', () => {
    const { container } = render(() => <DefaultPromptInput {...baseProps} />);
    for (const name of PARTS) expect(part(container, name), name).toBeNull();
  });

  it('leaves the regions as empty, closed, inert lines that draw nothing', () => {
    const { container } = render(() => <DefaultPromptInput {...baseProps} />);
    const regions = [...container.querySelectorAll('[data-attachment-region]')] as HTMLElement[];
    expect(regions.map((r) => r.dataset.attachmentRegion)).toEqual(['above', 'below']);
    for (const r of regions) {
      expect(r).toHaveAttribute('data-state', 'closed');
      expect(r.style.height).toBe('0px');
      expect(r).toHaveAttribute('inert');
      expect(r.textContent).toBe('');
      expect(r.querySelector('*:not(div)')).toBeNull();
    }
  });

  it('keeps the card as the one surface element with its own ring and shadow classes', () => {
    const { container } = render(() => <DefaultPromptInput {...baseProps} />);
    const c = card(container);
    expect(c).toHaveClass('bg-surface', 'shadow-xs', 'focus-within:ring-2');
    // The regions are the card's own children, never a wrapper around it.
    expect(c.querySelector('[data-attachment-region="above"]')?.parentElement).toBe(c);
    expect(c.querySelector('[data-attachment-region="below"]')?.parentElement).toBe(c);
  });
});

describe('DefaultPromptInput above', () => {
  it('puts the content inside the card, before the divider, before the input', () => {
    const { container, getByText } = render(() => (
      <DefaultPromptInput {...baseProps} above={<button type="button">Plan</button>} />
    ));
    const content = getByText('Plan');
    expect(card(container)).toContainElement(content);
    const above = part(container, 'attachment-above')!;
    const divider = part(container, 'divider-above')!;
    expect(above).toContainElement(content);
    expect(divider).toBeInTheDocument();
    const rel = (a: Node, b: Node) => a.compareDocumentPosition(b);
    expect(rel(above, divider) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(rel(divider, editable(container)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // And nothing below.
    expect(part(container, 'attachment-below')).toBeNull();
    expect(part(container, 'divider-below')).toBeNull();
  });

  it('carries no surface, border or shadow of its own: the card owns them', () => {
    const { container } = render(() => <DefaultPromptInput {...baseProps} above={<span>Plan</span>} />);
    const wrapper = container.querySelector('[data-attachment-region="above"]') as HTMLElement;
    const cls = [wrapper, part(container, 'attachment-above')!].map((e) => e.className).join(' ');
    expect(cls).not.toMatch(/\b(bg-|shadow|ring|rounded|border(?!-border))/);
    // The divider is the one hairline, in the border colour.
    expect(part(container, 'divider-above')).toHaveClass('border-t', 'border-border');
  });

  it('opens with the content, and content added after first render appears', () => {
    const [above, setAbove] = createSignal<JSX.Element>(undefined);
    const { container, queryByText } = render(() => <DefaultPromptInput {...baseProps} above={above()} />);
    expect(queryByText('Plan')).toBeNull();
    setAbove(<span>Plan</span>);
    expect(queryByText('Plan')).toBeInTheDocument();
    expect(container.querySelector('[data-attachment-region="above"]')).toHaveAttribute('data-state', 'open');
  });

  it('removing it collapses at once and unmounts after the transition', () => {
    vi.useFakeTimers();
    const [above, setAbove] = createSignal<JSX.Element>(<span>Plan</span>);
    const { container, queryByText } = render(() => <DefaultPromptInput {...baseProps} above={above()} />);
    setAbove(undefined);
    const region = container.querySelector('[data-attachment-region="above"]') as HTMLElement;
    expect(region).toHaveAttribute('data-state', 'closed');
    expect(region).toHaveAttribute('inert');
    expect(queryByText('Plan')).toBeInTheDocument();
    vi.advanceTimersByTime(PRESENCE_MS + 100);
    expect(queryByText('Plan')).toBeNull();
  });

  it('aboveOpen=false closes the region while the content stays mounted to fade', () => {
    const [open, setOpen] = createSignal(true);
    const { container, getByText } = render(() => (
      <DefaultPromptInput {...baseProps} above={<span>Plan</span>} aboveOpen={open()} />
    ));
    setOpen(false);
    expect(container.querySelector('[data-attachment-region="above"]')).toHaveAttribute('data-state', 'closed');
    expect(getByText('Plan')).toBeInTheDocument();
  });

  it('a control inside it is a tab stop that comes before the input', () => {
    const { container, getByRole } = render(() => (
      <DefaultPromptInput {...baseProps} above={<button type="button">Open plan</button>} below={<button type="button">Local</button>} />
    ));
    const buttons = [...container.querySelectorAll('button, [contenteditable]')];
    const order = buttons.map((b) => b.getAttribute('aria-label') ?? b.textContent);
    expect(order[0]).toBe('Open plan');
    expect(order.at(-1)).toBe('Local');
    expect(getByRole('button', { name: 'Open plan' })).not.toHaveAttribute('inert');
  });

  it('clicking a control in it does not steal focus into the editor', () => {
    const { getByRole, container } = render(() => (
      <DefaultPromptInput {...baseProps} above={<button type="button">Open plan</button>} />
    ));
    const btn = getByRole('button', { name: 'Open plan' });
    btn.focus();
    fireEvent.click(btn);
    expect(container.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(btn);
  });
});

describe('DefaultPromptInput below', () => {
  it('mirrors above: the input, then the divider, then the content, inside the card', () => {
    const { container, getByText } = render(() => (
      <DefaultPromptInput {...baseProps} below={<span>Local</span>} />
    ));
    const below = part(container, 'attachment-below')!;
    const divider = part(container, 'divider-below')!;
    expect(card(container)).toContainElement(getByText('Local'));
    expect(below).toContainElement(getByText('Local'));
    const rel = (a: Node, b: Node) => a.compareDocumentPosition(b);
    expect(rel(editable(container), divider) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(rel(divider, below) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(part(container, 'attachment-above')).toBeNull();
  });

  it('orders the regions with flex order, so the content sits first and last in the wrapped card', () => {
    const { container } = render(() => (
      <DefaultPromptInput {...baseProps} above={<span>a</span>} below={<span>b</span>} />
    ));
    expect(container.querySelector('[data-attachment-region="above"]')).toHaveClass('order-first', 'basis-full');
    expect(container.querySelector('[data-attachment-region="below"]')).toHaveClass('order-last', 'basis-full');
  });
});
