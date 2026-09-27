import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { ComposerChips, chipItems } from './composer-chips';
import { buildComposerTools } from './default-input';

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

  it('needs something to say AND something to turn off', () => {
    // `id` and `label` are not optional on the type, so this is the untyped-JS or JSON
    // path. A chip without a label reads "undefined, turn off" to a screen reader; one
    // without an id does nothing when clicked. Neither is a chip worth drawing. A label
    // of WHITESPACE is the same defect wearing a disguise: it is truthy, so `!!item.label`
    // let it through and the chip drew with no visible text and the name "   , turn off".
    const tools = [
      { checked: true, chip: true },
      { id: '', label: 'Blank id', checked: true, chip: true },
      { id: 'no-label', checked: true, chip: true },
      { id: 'blank-label', label: '   ', checked: true, chip: true },
      { label: 'No id', checked: true, chip: true },
      { id: 'ok', label: 'Web search', checked: true, chip: true },
    ];
    expect(chipItems(tools).map((i) => i.id)).toEqual(['ok']);
  });

  it('rejects for eligibility without dropping the item from the menu', () => {
    // The difference between an eligibility rule and a silent drop: the item a host
    // declared is still in the tree the menu renders, so nothing disappears from the
    // UI — the chip row's contract is simply stricter than a menu row's.
    const tools = [
      { id: 'no-label', checked: true, chip: true },
      { id: 'ok', label: 'Web search', checked: true, chip: true },
    ];
    expect(chipItems(tools).map((i) => i.id)).toEqual(['ok']);

    const built = buildComposerTools({ attach: false, tools });
    expect(built.map((i) => i.id)).toEqual(['no-label', 'ok']);
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
