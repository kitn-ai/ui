import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { ComposerChips, chipItems } from './composer-chips';

describe('chipItems', () => {
  it('takes only items that are checked AND opted in', () => {
    const tools = [
      { id: 'web', label: 'Web search', checked: true, chip: true },
      { id: 'img', label: 'Create image', checked: true },
      { id: 'sketch', label: 'Sketch', checked: false, chip: true },
    ];
    expect(chipItems(tools).map((i) => i.id)).toEqual(['web']);
  });

  it('finds a chip one level down, because capabilities live in submenus too', () => {
    const tools = [{ id: 'plugins', label: 'Plugins', items: [{ id: 'web', label: 'Web search', checked: true, chip: true }] }];
    expect(chipItems(tools).map((i) => i.id)).toEqual(['web']);
  });
});

describe('ComposerChips', () => {
  it('names the action, not just the thing', () => {
    const onRemove = vi.fn();
    const { getByRole } = render(() => (
      <ComposerChips items={[{ id: 'web', label: 'Web search', checked: true, chip: true }]} onRemove={onRemove} />
    ));
    // The name CONTAINS the visible text: a bare "Remove" is a chip a speech-input
    // user cannot operate (WCAG 2.5.3).
    const chip = getByRole('button', { name: 'Web search, turn off' });
    expect(chip).toHaveTextContent('Web search');
    fireEvent.click(chip);
    expect(onRemove).toHaveBeenCalledWith('web');
  });
});
