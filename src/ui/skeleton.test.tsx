import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@solidjs/testing-library';
import { Skeleton } from './skeleton';

afterEach(cleanup);

describe('Skeleton', () => {
  it('legacy: a bare class-driven block, with no forced inline width (backward compatible)', () => {
    const { container } = render(() => <Skeleton class="h-4 w-64" />);
    const els = container.querySelectorAll('.animate-pulse');
    expect(els).toHaveLength(1);
    const el = els[0] as HTMLElement;
    expect(el).toHaveClass('bg-muted', 'h-4', 'w-64');
    expect(el.style.width).toBe(''); // class drives the size; nothing inlined over it
  });

  it('variant="text" with lines renders one block per line', () => {
    const { container } = render(() => <Skeleton variant="text" lines={3} />);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3);
  });

  it('variant="text" is responsive by default (fills its container width)', () => {
    const { container } = render(() => <Skeleton variant="text" />);
    expect(container.querySelector('.animate-pulse')).toHaveClass('w-full');
  });

  it('variant="circle" is a round, square block sized by width', () => {
    const { container } = render(() => <Skeleton variant="circle" width="2.5rem" />);
    const el = container.querySelector('.animate-pulse') as HTMLElement;
    expect(el).toHaveClass('rounded-full');
    expect(el.style.width).toBe('2.5rem');
    expect(el.style.height).toBe('2.5rem');
  });

  it('variant="rect" honours an explicit width/height', () => {
    const { container } = render(() => <Skeleton variant="rect" width="10rem" height="6rem" />);
    const el = container.querySelector('.animate-pulse') as HTMLElement;
    expect(el).toHaveClass('rounded-md');
    expect(el.style.width).toBe('10rem');
    expect(el.style.height).toBe('6rem');
  });
});
