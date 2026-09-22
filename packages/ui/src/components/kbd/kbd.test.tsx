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

  it('merges a caller class without dropping the gap', () => {
    const { container } = render(() => (
      <KbdGroup class="mt-2">
        <Kbd keys="Mod+K" platform="mac" />
      </KbdGroup>
    ));
    const group = container.querySelector('[part="group"]');
    expect(group).toHaveClass('gap-1');
    expect(group).toHaveClass('inline-flex');
    expect(group).toHaveClass('mt-2');
  });
});
