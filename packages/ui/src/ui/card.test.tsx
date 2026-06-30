import { describe, it, expect, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { Card } from './card';

afterEach(cleanup);

const card = (c: HTMLElement) => c.querySelector('[part="card"]') as HTMLElement;
// The per-instance responsive rules live in the injected <style>.
const styleOf = (c: HTMLElement) =>
  Array.from(c.querySelectorAll('style')).map((s) => s.textContent ?? '').find((t) => t.includes('kc-layout')) ?? '';

describe('Card (presentational)', () => {
  it('renders the default-slot body only when hasBody is set', () => {
    const filled = render(() => <Card hasBody>Body content</Card>);
    expect(filled.container.querySelector('[part="body"]')).toHaveTextContent('Body content');
    cleanup();
    const empty = render(() => <Card>ignored</Card>);
    expect(empty.container.querySelector('[part="body"]')).toBeNull();
  });

  it('renders only the regions it is given', () => {
    const { container } = render(() => (
      <Card media={<img alt="m" />} header={<h3>Title</h3>} headerActions={<button>a</button>} hasBody footer={<span>f</span>}>
        Body
      </Card>
    ));
    expect(container.querySelector('[part="media"]')).toBeInTheDocument();
    expect(container.querySelector('[part="header"]')).toHaveTextContent('Title');
    expect(container.querySelector('[part="body"]')).toHaveTextContent('Body');
    expect(container.querySelector('[part="footer"]')).toHaveTextContent('f');
  });

  it('omits header/footer/media regions when absent', () => {
    const { container } = render(() => <Card hasBody>Body</Card>);
    expect(container.querySelector('[part="media"]')).toBeNull();
    expect(container.querySelector('[part="header"]')).toBeNull();
    expect(container.querySelector('[part="footer"]')).toBeNull();
  });

  it('applies the appearance surface class', () => {
    const out = render(() => <Card hasBody>x</Card>);
    expect(card(out.container).className).toContain('bg-card');
    cleanup();
    const fill = render(() => <Card appearance="filled" hasBody>x</Card>);
    expect(card(fill.container).className).toContain('bg-surface-strong');
    cleanup();
    const accent = render(() => <Card appearance="accent" hasBody>x</Card>);
    expect(card(accent.container).className).toContain('bg-primary');
  });

  it('lays out horizontally when orientation is horizontal', () => {
    const { container } = render(() => <Card orientation="horizontal" hasBody>x</Card>);
    expect(styleOf(container)).toContain('.kc-layout{display:flex;flex-direction:row}');
  });

  it('is a container query (@container) and reflows for responsive orientation', () => {
    const { container } = render(() => <Card orientation="responsive" hasBody>x</Card>);
    expect(card(container).className).toContain('@container');
    const css = styleOf(container);
    expect(css).toContain('@container (min-width:28rem)');
    expect(css).toContain('.kc-layout{flex-direction:row}');
  });

  it('uses the collapse prop as the container-query breakpoint', () => {
    const { container } = render(() => <Card orientation="responsive" collapse="40rem" hasBody>x</Card>);
    expect(styleOf(container)).toContain('@container (min-width:40rem)');
  });

  it('falls back to the default breakpoint for an invalid collapse value', () => {
    const { container } = render(() => <Card collapse="garbage" hasBody>x</Card>);
    expect(styleOf(container)).toContain('@container (min-width:28rem)');
  });

  it('dismissible renders a dismiss part that hides the card and fires onDismiss', async () => {
    const onDismiss = vi.fn();
    const { container } = render(() => <Card dismissible onDismiss={onDismiss} hasBody>x</Card>);
    const x = container.querySelector('[part="dismiss"]') as HTMLElement;
    expect(x).toBeInTheDocument();
    await fireEvent.click(x);
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(container.querySelector('[part="card"]')).toBeNull();
  });

  it('clickable becomes a role=button that activates on Enter', async () => {
    const onCardClick = vi.fn();
    const { container } = render(() => <Card clickable onCardClick={onCardClick} hasBody>x</Card>);
    const root = card(container);
    expect(root.getAttribute('role')).toBe('button');
    await fireEvent.keyDown(root, { key: 'Enter' });
    expect(onCardClick).toHaveBeenCalledOnce();
  });

  it('href renders the card as an anchor (and wins over clickable)', () => {
    const { container } = render(() => <Card href="/x" clickable hasBody>x</Card>);
    const root = card(container);
    expect(root.tagName).toBe('A');
    expect(root.getAttribute('href')).toBe('/x');
    expect(root.getAttribute('role')).toBeNull();
  });
});
