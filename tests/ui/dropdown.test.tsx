import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from '../../src/ui/dropdown';

// jsdom (v24) does not implement the PointerEvent constructor. useDismiss
// listens for `pointerdown`; copy the shim from overlay.test.tsx.
if (typeof (globalThis as any).PointerEvent === 'undefined') {
  (globalThis as any).PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type: string, params?: PointerEventInit) {
      super(type, params);
    }
  };
}

function setup(onSelect = vi.fn()) {
  const utils = render(() => (
    <Dropdown>
      <DropdownTrigger as={(p: any) => <button {...p} data-testid="trg">Menu</button>} />
      <DropdownContent>
        <DropdownItem onSelect={() => onSelect('a')}>Alpha</DropdownItem>
        <DropdownItem onSelect={() => onSelect('b')}>Beta</DropdownItem>
        <DropdownItem onSelect={() => onSelect('c')}>Gamma</DropdownItem>
      </DropdownContent>
    </Dropdown>
  ));
  return { ...utils, onSelect, trg: screen.getByTestId('trg') };
}

describe('Dropdown', () => {
  it('trigger exposes menu button semantics', () => {
    const { trg } = setup();
    expect(trg.getAttribute('aria-haspopup')).toBe('menu');
    expect(trg.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens on click and renders role=menu with menuitems', () => {
    const { trg } = setup();
    fireEvent.click(trg);
    expect(trg.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
  });

  it('ArrowDown from trigger opens and focuses first item; Arrow keys move roving focus', () => {
    const { trg } = setup();
    fireEvent.keyDown(trg, { key: 'ArrowDown' });
    const items = screen.getAllByRole('menuitem');
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(items[1], { key: 'Home' });
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: 'End' });
    expect(document.activeElement).toBe(items[2]);
  });

  it('Enter on a focused item fires onSelect and closes, returning focus to trigger', async () => {
    const { trg, onSelect } = setup();
    fireEvent.keyDown(trg, { key: 'ArrowDown' });
    const items = screen.getAllByRole('menuitem');
    fireEvent.keyDown(items[0], { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('a');
    await Promise.resolve();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trg);
  });

  it('Escape closes and returns focus to the trigger', async () => {
    const { trg } = setup();
    fireEvent.click(trg);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    await Promise.resolve();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trg);
  });

  it('typeahead focuses the first item starting with the typed character', () => {
    const { trg } = setup();
    fireEvent.keyDown(trg, { key: 'ArrowDown' });
    const items = screen.getAllByRole('menuitem');
    fireEvent.keyDown(items[0], { key: 'g' });
    expect(document.activeElement).toBe(items[2]); // Gamma
  });

  it('Tab closes the menu without forcing focus back to the trigger', async () => {
    const { trg } = setup();
    fireEvent.keyDown(trg, { key: 'ArrowDown' });
    const items = screen.getAllByRole('menuitem');
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: 'Tab' });
    await Promise.resolve(); // async unmount
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).not.toBe(trg); // focus NOT yanked back to trigger
  });
});
