import { describe, it, expect } from 'vitest';
import { cn } from './cn';

// Locks the cn() / tailwind-merge behavior the kit relies on. Guards the
// tailwind-merge v2→v3 upgrade (v3 = Tailwind v4 class groups).
describe('cn (clsx + extendTailwindMerge)', () => {
  it('resolves genuine conflicts last-wins', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-left', 'text-right')).toBe('text-right');
  });

  it('keeps custom font-size utilities separate from text COLORS (the TextShimmer fix)', () => {
    // text-body is a custom @theme font-size utility; text-transparent is a color.
    // They must NOT be treated as conflicting — both must survive.
    const out = cn('text-transparent', 'text-body');
    expect(out).toContain('text-transparent');
    expect(out).toContain('text-body');
  });

  it('still merges two custom font sizes against each other (last wins)', () => {
    expect(cn('text-body', 'text-title')).toBe('text-title');
  });

  it('merges custom font size against a standard one', () => {
    expect(cn('text-sm', 'text-body')).toBe('text-body');
  });
});
