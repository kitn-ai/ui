import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@solidjs/testing-library';
import { ResizableHandle } from './resizable';

afterEach(cleanup);

const grip = (c: HTMLElement) => c.querySelector('svg');
const line = (c: HTMLElement) => c.querySelector('[data-handle-line]');

describe('ResizableHandle (handle affordance)', () => {
  it('renders the dotted grip svg for handle="grip" (and no hairline)', () => {
    const { container } = render(() => <ResizableHandle handle="grip" />);
    expect(grip(container)).toBeInTheDocument();
    expect(grip(container)!.querySelectorAll('circle').length).toBe(6);
    expect(line(container)).toBeNull();
  });

  it('renders the hairline strip for handle="line" (and no grip svg)', () => {
    const { container } = render(() => <ResizableHandle handle="line" />);
    expect(line(container)).toBeInTheDocument();
    expect(grip(container)).toBeNull();
  });

  it('defaults to the hairline strip when handle is omitted', () => {
    const { container } = render(() => <ResizableHandle />);
    expect(line(container)).toBeInTheDocument();
    expect(grip(container)).toBeNull();
  });

  it('renders neither for handle="none"', () => {
    const { container } = render(() => <ResizableHandle handle="none" />);
    expect(line(container)).toBeNull();
    expect(grip(container)).toBeNull();
  });
});
