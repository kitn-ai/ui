import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@solidjs/testing-library';
import { Kbd } from './kbd';
import { KbdGroup } from './kbd-group';

afterEach(cleanup);

/** The glyphs rendered in each `part="key"` cap, in order. */
const caps = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[part="key"]')).map((el) => el.textContent);

describe('Kbd', () => {
  it('renders Mod as ⌘ on mac, one part="key" cap per token', () => {
    const { container } = render(() => <Kbd keys="Mod+K" platform="mac" />);
    expect(caps(container)).toEqual(['⌘', 'K']);
  });

  it('renders Mod as Ctrl off mac', () => {
    const { container } = render(() => <Kbd keys="Mod+K" platform="other" />);
    expect(caps(container)).toEqual(['Ctrl', 'K']);
  });

  it('renders children verbatim when keys is omitted', () => {
    const { container } = render(() => (
      <Kbd>
        <span class="raw">press slash</span>
      </Kbd>
    ));
    expect(container.querySelector('[part="key"]')).toBeNull();
    expect(container.querySelector('.raw')).toHaveTextContent('press slash');
  });

  it('maps modifiers and arrows (Mod+Shift+ArrowUp on mac → ⌘ ⇧ ↑)', () => {
    const { container } = render(() => <Kbd keys="Mod+Shift+ArrowUp" platform="mac" />);
    expect(caps(container)).toEqual(['⌘', '⇧', '↑']);
  });
});

describe('KbdGroup', () => {
  it('renders its children', () => {
    const { container } = render(() => (
      <KbdGroup>
        <span class="raw">press slash</span>
      </KbdGroup>
    ));
    expect(container.querySelector('[part="group"] .raw')).toHaveTextContent('press slash');
  });

  it('renders both caps when it composes two Kbds', () => {
    const { container } = render(() => (
      <KbdGroup>
        <Kbd keys="Mod+K" platform="mac" />
        <Kbd keys="Mod+S" platform="mac" />
      </KbdGroup>
    ));
    expect(caps(container)).toEqual(['⌘', 'K', '⌘', 'S']);
  });

  it('merges a caller class without dropping the weld', () => {
    const { container } = render(() => (
      <KbdGroup class="mt-2">
        <Kbd keys="Mod+K" platform="mac" />
      </KbdGroup>
    ));
    const group = container.querySelector('[part="group"]');
    expect(group).toHaveClass('inline-flex');
    expect(group).toHaveClass('mt-2');
    // The strip has no gap of its own, and it zeroes the chord gap INSIDE a child
    // through the inherited variable Kbd's own class reads. jsdom computes no layout,
    // so the geometry these two facts produce is asserted where it is written: the
    // class list. `gap-1` here was the defect the owner reported: a group that only
    // spaced its children looked identical to separate Kbd elements.
    expect(group).not.toHaveClass('gap-1');
    expect(group).toHaveClass('[--kai-kbd-cap-gap:0px]');
  });

  it('welds the seams: overlap, and corners only at the strip ends', () => {
    const { container } = render(() => (
      <KbdGroup>
        <Kbd keys="Mod+K" platform="mac" />
        <Kbd keys="Mod+S" platform="mac" />
      </KbdGroup>
    ));
    const group = container.querySelector('[part="group"]')!;
    const classes = group.className;
    // A child after the first shifts 1px so the two facing borders collapse to one
    // hairline, caps after the first inside a child do the same, and the four facing
    // corners are squared. Each is one seam in the strip; `rounded-sm` stays only on
    // the two end caps, which is what makes the caps read as ONE key.
    expect(classes).toContain('[&>*+*]:-ml-px');
    expect(classes).toContain('[&_[part=key]:not(:first-child)]:-ml-px');
    expect(classes).toContain('[&>*:not(:first-child)>[part=key]:first-child]:rounded-l-none');
    expect(classes).toContain('[&>*:not(:last-child)>[part=key]:last-child]:rounded-r-none');
    expect(classes).toContain('[&_[part=key]:not(:last-child)]:rounded-r-none');
    expect(classes).toContain('[&_[part=key]:not(:first-child)]:rounded-l-none');
  });

  it('keeps the chord gap of a lone Kbd outside a group', () => {
    // The variable the group sets is what zeroes it, so a Kbd on its own must still
    // fall back to its 2px gap. This is the other direction of the weld: without the
    // fallback, EVERY Kbd would weld its own caps and a chord would lose its
    // separator spacing.
    const { container } = render(() => <Kbd keys="Mod+Shift+K" platform="mac" />);
    expect(container.querySelector('kbd')).toHaveClass('gap-[var(--kai-kbd-cap-gap,0.125rem)]');
  });
});
