import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@solidjs/testing-library';
import { CommandList, type CommandGroup } from './command';

afterEach(cleanup);

const groups = (items: CommandGroup['items']): CommandGroup[] => [{ items }];

describe('CommandList shortcut', () => {
  it('renders a row shortcut as kai-kbd key caps inside part="shortcut"', () => {
    const { container } = render(() => (
      <CommandList
        groups={groups([{ id: 'palette', label: 'Command palette', shortcut: 'Mod+K' }])}
        onSelect={() => {}}
      />
    ));

    const shortcut = container.querySelector('[part="shortcut"]');
    expect(shortcut).toBeInTheDocument();
    // The Kbd primitive splits the spec into one part="key" cap per token.
    const caps = Array.from(shortcut!.querySelectorAll('[part="key"]')).map((c) => c.textContent);
    // Default platform is "other", so Mod maps to Ctrl.
    expect(caps).toEqual(['Ctrl', 'K']);
  });

  it('omits the shortcut cap when a row has no shortcut', () => {
    const { container } = render(() => (
      <CommandList groups={groups([{ id: 'x', label: 'No shortcut' }])} onSelect={() => {}} />
    ));
    expect(container.querySelector('[part="shortcut"]')).toBeNull();
    expect(container.querySelector('[part="key"]')).toBeNull();
  });
});
