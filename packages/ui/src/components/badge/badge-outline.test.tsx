import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@solidjs/testing-library';
import { Badge } from './badge';

afterEach(cleanup);

describe('Badge outline', () => {
  it('renders a bordered, transparent badge with foreground text', () => {
    const { container } = render(() => <Badge variant="outline">Needs you</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveTextContent('Needs you');
    for (const c of ['border', 'border-input', 'bg-transparent', 'text-foreground']) {
      expect(el.classList.contains(c)).toBe(true);
    }
    expect(el.classList.contains('bg-muted')).toBe(false);
  });
  it('leaves the default variant alone', () => {
    const { container } = render(() => <Badge>Plain</Badge>);
    expect((container.firstChild as HTMLElement).className).toContain('bg-muted text-muted-foreground');
  });
});
