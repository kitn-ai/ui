import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@solidjs/testing-library';
import { Kbd } from './kbd';

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
