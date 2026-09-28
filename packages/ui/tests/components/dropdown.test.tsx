import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem, DropdownRadioItem, DropdownCheckboxItem, DropdownNote, DropdownLabel, DropdownSub, DropdownSubTrigger, DropdownSubContent } from '../../src/components/dropdown/dropdown';

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

describe('DropdownRadioItem (single-select group)', () => {
  function setupRadio(onSelect = vi.fn()) {
    const [selected, setSelected] = createSignal('all');
    const utils = render(() => (
      <Dropdown>
        <DropdownTrigger as={(p: any) => <button {...p} data-testid="trg">Menu</button>} />
        <DropdownContent>
          <DropdownRadioItem checked={selected() === 'all'} onSelect={() => { setSelected('all'); onSelect('all'); }}>All</DropdownRadioItem>
          <DropdownRadioItem checked={selected() === 'chat'} onSelect={() => { setSelected('chat'); onSelect('chat'); }}>Chat</DropdownRadioItem>
          <DropdownRadioItem checked={selected() === 'task'} onSelect={() => { setSelected('task'); onSelect('task'); }}>Task</DropdownRadioItem>
        </DropdownContent>
      </Dropdown>
    ));
    return { ...utils, onSelect, selected, trg: screen.getByTestId('trg') };
  }

  it('renders role=menuitemradio with aria-checked reflecting the selected one', () => {
    const { trg } = setupRadio();
    fireEvent.click(trg);
    const items = screen.getAllByRole('menuitemradio');
    expect(items).toHaveLength(3);
    expect(items[0].getAttribute('aria-checked')).toBe('true');
    expect(items[1].getAttribute('aria-checked')).toBe('false');
    expect(items[2].getAttribute('aria-checked')).toBe('false');
  });

  it('radio items participate in roving focus alongside menuitems', () => {
    const { trg } = setupRadio();
    fireEvent.keyDown(trg, { key: 'ArrowDown' });
    const items = screen.getAllByRole('menuitemradio');
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
  });

  it('selecting moves the checkmark and KEEPS THE MENU OPEN (consumer owns the group)', () => {
    const { trg, onSelect } = setupRadio();
    fireEvent.click(trg);
    let items = screen.getAllByRole('menuitemradio');
    fireEvent.click(items[1]);
    expect(onSelect).toHaveBeenCalledWith('chat');
    // menu stays open
    expect(screen.getByRole('menu')).toBeTruthy();
    // checkmark moved
    items = screen.getAllByRole('menuitemradio');
    expect(items[0].getAttribute('aria-checked')).toBe('false');
    expect(items[1].getAttribute('aria-checked')).toBe('true');
  });

  it('disabled radio item does not fire onSelect', () => {
    const onSelect = vi.fn();
    render(() => (
      <Dropdown defaultOpen>
        <DropdownTrigger as={(p: any) => <button {...p}>Menu</button>} />
        <DropdownContent>
          <DropdownRadioItem checked disabled onSelect={onSelect}>None</DropdownRadioItem>
        </DropdownContent>
      </Dropdown>
    ));
    const item = screen.getByRole('menuitemradio');
    fireEvent.click(item);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

/**
 * The surface's WIDTH, and the trailing column that depends on it.
 *
 * STRUCTURAL, NOT PIXEL-BASED, on purpose: jsdom lays nothing out, so
 * `getBoundingClientRect()` answers all zeros and a pixel assertion here would be
 * theatre. What jsdom CAN pin is the mechanism — the surface takes its inline width
 * FROM the trigger's measured rect, a missing or zero measurement falls back to the
 * CSS floor instead of writing `0px`, and a trigger resize re-measures while the
 * surface is open. The real geometry is measured in a browser by
 * `scripts/probe-menu-surface-width.mjs`.
 *
 * WHY THE FLOOR AND THE TRAILING COLUMN ARE THE SAME SUBJECT: a menu is
 * content-sized, so both defects are the same defect — something that needs slack
 * (the checkmark's separation) or a floor (any trailing separation at all) was left
 * to a width no surface guaranteed. A width that arrives at open time from the
 * trigger can be narrow, so the reserved separation has to hold on its own.
 */

/** A rect with only the field the surface reads. jsdom's own is all zeros. */
const rect = (width: number): DOMRect => ({
  width, height: 32, top: 0, left: 0, right: width, bottom: 32, x: 0, y: 0,
  toJSON: () => ({}),
}) as DOMRect;

/** Records the callbacks so a test can fire a resize without a layout engine. */
class FakeResizeObserver {
  static seen: FakeResizeObserver[] = [];
  private cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
    FakeResizeObserver.seen.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  fire() { this.cb([], this as unknown as ResizeObserver); }
}

function setupSurface(props: { matchTriggerWidth?: boolean; class?: string } = {}) {
  const utils = render(() => (
    <Dropdown>
      <DropdownTrigger as={(p: any) => <button {...p} data-testid="trg">Menu</button>} />
      <DropdownContent matchTriggerWidth={props.matchTriggerWidth} class={props.class}>
        <DropdownItem>Alpha</DropdownItem>
      </DropdownContent>
    </Dropdown>
  ));
  return { ...utils, trg: screen.getByTestId('trg'), menu: () => screen.getByRole('menu') };
}

describe('DropdownContent width', () => {
  it('tracks the trigger: matchTriggerWidth writes the measured rect as the surface width', () => {
    const { trg, menu } = setupSurface({ matchTriggerWidth: true });
    vi.spyOn(trg, 'getBoundingClientRect').mockReturnValue(rect(364));

    fireEvent.click(trg);

    expect(menu().style.width).toBe('364px');
  });

  it('and writes NOTHING without it — the same harness, so "no width" cannot pass vacuously', () => {
    const { trg, menu } = setupSurface();
    vi.spyOn(trg, 'getBoundingClientRect').mockReturnValue(rect(364));

    fireEvent.click(trg);

    expect(
      menu().style.width,
      'the surface is content-sized unless it is asked to track; that is what left it '
      + 'narrow for a direct consumer of <DropdownContent>',
    ).toBe('');
  });

  it('a zero measurement (jsdom, a display:none trigger) falls back to the CSS floor, never `0px`', () => {
    const { trg, menu } = setupSurface({ matchTriggerWidth: true });
    vi.spyOn(trg, 'getBoundingClientRect').mockReturnValue(rect(0));

    fireEvent.click(trg);

    expect(menu().style.width).toBe('');
    expect(menu().classList.contains('min-w-[15rem]'), 'the floor is still declared on the surface').toBe(true);
  });

  it('a trigger resize while the surface is OPEN re-measures (the rail the user drags wider)', () => {
    const original = (globalThis as any).ResizeObserver;
    (globalThis as any).ResizeObserver = FakeResizeObserver;
    FakeResizeObserver.seen = [];
    try {
      const { trg, menu } = setupSurface({ matchTriggerWidth: true });
      const spy = vi.spyOn(trg, 'getBoundingClientRect').mockReturnValue(rect(280));
      fireEvent.click(trg);
      expect(menu().style.width).toBe('280px');

      expect(
        FakeResizeObserver.seen.length,
        'the effect must have observed the trigger, or nothing re-measures',
      ).toBeGreaterThan(0);

      spy.mockReturnValue(rect(420));
      for (const ro of FakeResizeObserver.seen) ro.fire();

      expect(menu().style.width).toBe('420px');
    } finally {
      (globalThis as any).ResizeObserver = original;
      FakeResizeObserver.seen = [];
    }
  });

  it('ships a usable floor of its own, so a direct consumer needs no class to get one', () => {
    // The model switcher is the live consumer: <DropdownContent> with no class and
    // DropdownRadioItem rows. Its floor has to come from the component or the rows
    // have nowhere for the trailing check to sit.
    const { trg, menu } = setupSurface();
    fireEvent.click(trg);

    expect(menu().classList.contains('min-w-[15rem]')).toBe(true);
    expect(menu().classList.contains('min-w-[8rem]'), 'one floor, not two').toBe(false);
  });

  it("a caller's own min-width REPLACES the default floor rather than adding to it", () => {
    const { trg, menu } = setupSurface({ class: 'min-w-[10rem]' });
    fireEvent.click(trg);

    expect(menu().classList.contains('min-w-[10rem]')).toBe(true);
    expect(menu().classList.contains('min-w-[15rem]')).toBe(false);
  });

  it('also ships a CEILING, because a floor with no ceiling is an unbounded box', () => {
    // jsdom has no layout, so this pins the DECLARATION the surface carries, not the
    // used width: the surface is `position: fixed` with no `width`, so it shrink-wraps
    // and its widest row decides the width of EVERY row (measured in Chromium at
    // 1216.9 x 401px, rows 1208.9px, inside a 280px rail). The cap is what turns that
    // shrinking-to-fit box into `min(max-content, max-width)`.
    const { trg, menu } = setupSurface();
    fireEvent.click(trg);

    expect(menu().classList.contains('max-w-[var(--kai-dropdown-max-width,24rem)]')).toBe(true);
  });

  it('takes the ceiling from a custom property, so a consumer can set it without a new class', () => {
    // The var carries the DEFAULT in its own class (`var(--x,24rem)`), which is the
    // whole seam: a consumer sets `--kai-dropdown-max-width` on `kai-menu` / the
    // element that renders the surface and needs no reach into the shadow root.
    const { trg, menu } = setupSurface();
    fireEvent.click(trg);

    const cls = menu().className;
    expect(cls).toContain('max-w-[var(--kai-dropdown-max-width,24rem)]');
    expect(cls, 'the ceiling is not a second floor').toContain('min-w-[15rem]');
  });

  it('caps the SUBMENU surface with the same property, one ceiling for the family', () => {
    render(() => (
      <Dropdown defaultOpen>
        <DropdownTrigger as={(p: any) => <button {...p}>Menu</button>} />
        <DropdownContent>
          <DropdownSub>
            <DropdownSubTrigger>Skills</DropdownSubTrigger>
            <DropdownSubContent>
              <DropdownItem>skill-creator</DropdownItem>
            </DropdownSubContent>
          </DropdownSub>
        </DropdownContent>
      </Dropdown>
    ));
    // A submenu opens on pointerenter (see DropdownSubTrigger), so hover the row rather
    // than passing an open flag the primitive does not have.
    fireEvent.pointerEnter(screen.getByRole('menuitem'));
    // Two menus are mounted: the parent and the sub. The sub is the one with the 8rem floor.
    const sub = screen.getAllByRole('menu').find((m) => m.classList.contains('min-w-[8rem]'));
    expect(sub, 'the submenu surface rendered').toBeTruthy();
    expect(sub!.classList.contains('max-w-[var(--kai-dropdown-max-width,24rem)]')).toBe(true);
  });

  it('lets a long label WRAP: the rows that can overflow carry break-words', () => {
    render(() => (
      <Dropdown defaultOpen>
        <DropdownTrigger as={(p: any) => <button {...p}>Menu</button>} />
        <DropdownContent>
          <DropdownItem>Alpha</DropdownItem>
          <DropdownItem description="Group the rail by the project each chat is filed under">Beta</DropdownItem>
          <DropdownNote>Because of that it is not a menu item.</DropdownNote>
          <DropdownLabel>Organizer</DropdownLabel>
        </DropdownContent>
      </Dropdown>
    ));
    for (const row of screen.getAllByRole('menuitem')) {
      expect(row.classList.contains('break-words'), 'row wraps rather than clipping').toBe(true);
    }
    expect(screen.getByText(/not a menu item/).classList.contains('break-words')).toBe(true);
    expect(screen.getByText('Organizer').classList.contains('break-words')).toBe(true);
  });
});

describe('DropdownContent height', () => {
  // The ceiling is `min(<themeable default>, <the room off the anchor>)`, so the assertion
  // is on the SHAPE of that value rather than a number: jsdom has no layout, so a typed
  // pixel expectation here would be a promise about jsdom, not about the surface. The
  // numbers the shape produces are measured in Chromium (911px -> 513.5px on a 33-row
  // menu in a 560px window, scrollHeight 911 vs clientHeight 514).
  const CEILING = 'var(--kai-dropdown-max-height,calc(100dvh - 2rem))';

  it('caps the height at the viewport, and never above the room its own anchor leaves', () => {
    const { trg, menu } = setupSurface();
    fireEvent.click(trg);

    const value = (menu() as HTMLElement).style.maxHeight;
    expect(value.startsWith(`min(${CEILING}, `), `unexpected ceiling: ${value}`).toBe(true);
    expect(value.endsWith('px)'), 'the anchor room is measured in px, at open time').toBe(true);
    // The viewport is the ceiling, never a typed pixel count: `100dvh` is the window the
    // user actually has, so the same declaration covers a laptop and a short window.
    expect(value).toContain('100dvh');
  });

  it('keeps the ceiling themeable from outside the shadow root the panel is portaled into', () => {
    // Same seam as the width's, and one var per axis: the inline value names the custom
    // property, so a consumer page-level rule on the host moves the ceiling without a
    // `part` and without piercing. `min()` means a consumer can lower it and can never
    // raise it above the room beside the trigger, which is the part that keeps a long menu
    // on screen.
    const { trg, menu } = setupSurface();
    fireEvent.click(trg);

    expect((menu() as HTMLElement).style.maxHeight).toContain('--kai-dropdown-max-height');
  });

  it('SCROLLS the surface rather than clipping it, so the last row stays reachable', () => {
    // A menu whose last row is unreachable is worse than a tall one. `overflow-y: auto`
    // shows no bar over content that does not overflow, so a menu that fits is unchanged.
    const { trg, menu } = setupSurface();
    fireEvent.click(trg);

    expect(menu().classList.contains('overflow-y-auto')).toBe(true);
  });

  it('leaves the height ceiling to the anchor, not to a class, on a SHORT menu either', () => {
    // Additive in the only way that can be checked without layout: the surface carries no
    // typed max-height class, so nothing clamps a menu that already fits.
    const { trg, menu } = setupSurface();
    fireEvent.click(trg);

    expect([...menu().classList].some((c) => c.startsWith('max-h-')), 'no class-level height cap').toBe(false);
  });

  it('caps the SUBMENU surface too, from the room below its own row', () => {
    render(() => (
      <Dropdown defaultOpen>
        <DropdownTrigger as={(p: any) => <button {...p}>Menu</button>} />
        <DropdownContent>
          <DropdownSub>
            <DropdownSubTrigger>Skills</DropdownSubTrigger>
            <DropdownSubContent>
              <DropdownItem>skill-creator</DropdownItem>
            </DropdownSubContent>
          </DropdownSub>
        </DropdownContent>
      </Dropdown>
    ));
    fireEvent.pointerEnter(screen.getByRole('menuitem'));
    const sub = screen.getAllByRole('menu').find((m) => m.classList.contains('min-w-[8rem]'));
    expect(sub, 'the submenu surface rendered').toBeTruthy();

    expect(sub!.classList.contains('overflow-y-auto')).toBe(true);
    expect((sub as HTMLElement).style.maxHeight.startsWith(`min(${CEILING}, `)).toBe(true);
  });
});

describe('the trailing check column', () => {
  /** A freshly opened menu with one checked and one unchecked row of each kind. */
  function setupTrailing() {
    render(() => (
      <Dropdown defaultOpen>
        <DropdownTrigger as={(p: any) => <button {...p}>Menu</button>} />
        <DropdownContent>
          <DropdownRadioItem checked onSelect={() => {}}>Checked radio</DropdownRadioItem>
          <DropdownRadioItem onSelect={() => {}}>Unchecked radio</DropdownRadioItem>
          <DropdownCheckboxItem checked onSelect={() => {}}>Checked box</DropdownCheckboxItem>
          <DropdownCheckboxItem onSelect={() => {}}>Unchecked box</DropdownCheckboxItem>
        </DropdownContent>
      </Dropdown>
    ));
  }

  /** The trailing column is the item's LAST child, whatever is checked. */
  const trailing = (item: HTMLElement) => item.lastElementChild as HTMLElement;

  it('a checked item RESERVES the separation, so the check cannot touch its label', () => {
    setupTrailing();
    const [checkedRadio, checkedBox] = [
      screen.getAllByRole('menuitemradio')[0],
      screen.getAllByRole('menuitemcheckbox')[0],
    ];

    for (const [item, label] of [[checkedRadio, 'radio'], [checkedBox, 'checkbox']] as const) {
      const box = trailing(item);
      expect(
        box.classList.contains('pl-4'),
        `${label}: 16px of reserved separation — the same pl-4 the menu facade's shortcut slot uses`,
      ).toBe(true);
      expect(
        box.classList.contains('w-8'),
        `${label}: a fixed 32px column (16px gap + the 16px icon), so the gap is not left to whatever width the surface happens to have`,
      ).toBe(true);
      expect(item.querySelector('svg'), `${label}: the check really is rendered`).toBeTruthy();
    }
  });

  it('an unchecked item keeps the IDENTICAL column, so rows do not shift as the check moves', () => {
    setupTrailing();
    const items = [
      ...screen.getAllByRole('menuitemradio'),
      ...screen.getAllByRole('menuitemcheckbox'),
    ];
    const classes = items.map((item) => trailing(item).className);

    expect(new Set(classes).size, `all four columns share one class list: ${classes[0]}`).toBe(1);
    expect(trailing(items[1]).querySelector('svg'), 'unchecked renders no check').toBe(null);
  });
});

/**
 * A row's LENGTH, and the trailing glyph's identity.
 *
 * The second line and the switch are both additions to an item that already has a
 * leading icon, a label and a trailing column, and both are opt-in: an item without
 * a `description` renders its children UNWRAPPED, which is what keeps every existing
 * menu's DOM (and therefore its layout) exactly as it was. That is asserted here
 * rather than assumed, because "the new field is off by default" is the kind of
 * claim that quietly stops being true.
 */
describe('Dropdown item length and state', () => {
  it('renders a muted second line when an item has a description', () => {
    render(() => (
      <Dropdown>
        <DropdownTrigger as={(p: any) => <button {...p} data-testid="trg">Menu</button>} />
        <DropdownContent>
          <DropdownItem description="Visualize anything">Create image</DropdownItem>
        </DropdownContent>
      </Dropdown>
    ));
    fireEvent.click(screen.getByTestId('trg'));
    expect(screen.getByText('Visualize anything')).toBeInTheDocument();
  });

  it('leaves the DOM unwrapped when an item has no description', () => {
    render(() => (
      <Dropdown>
        <DropdownTrigger as={(p: any) => <button {...p} data-testid="trg">Menu</button>} />
        <DropdownContent>
          <DropdownItem>Plain</DropdownItem>
        </DropdownContent>
      </Dropdown>
    ));
    fireEvent.click(screen.getByTestId('trg'));
    // The label is the item's own text node: no wrapper element was introduced for
    // a description that does not exist. This is what keeps every existing menu
    // byte-identical.
    expect(screen.getByText('Plain').tagName).toBe('DIV');
  });

  it('draws a check by default and a switch when asked', () => {
    render(() => (
      <Dropdown>
        <DropdownTrigger as={(p: any) => <button {...p} data-testid="trg">Menu</button>} />
        <DropdownContent>
          <DropdownCheckboxItem checked>Web search</DropdownCheckboxItem>
          <DropdownCheckboxItem checked control="switch">Google Drive</DropdownCheckboxItem>
          <DropdownCheckboxItem checked={false} control="switch">Figma</DropdownCheckboxItem>
        </DropdownContent>
      </Dropdown>
    ));
    fireEvent.click(screen.getByTestId('trg'));

    const rows = screen.getAllByRole('menuitemcheckbox');
    // The ROW is the control in both cases; the glyph is what differs.
    expect(rows[0]).toHaveAttribute('aria-checked', 'true');
    expect(rows[1]).toHaveAttribute('aria-checked', 'true');
    // Nothing focusable is nested in a menu item: the switch is decoration. It is
    // found by a raw query because aria-hidden keeps it out of the a11y tree, which
    // is the point — AT sees the row's aria-checked, not a second control.
    const knob = rows[1].querySelector('[role="switch"]');
    expect(knob).toHaveAttribute('aria-hidden', 'true');
    expect(knob).toHaveAttribute('tabindex', '-1');

    // The column's geometry belongs to the CONTROL. The themed Switch is 36x20 and
    // `shrink-0`, so a column sized for the 16px checkmark has it overflow by ~20px
    // across and 2px above and below. jsdom measures nothing, so this is the honest
    // unit-level guard — the class list — and NOT proof of fit: the measurement is in
    // a real browser, scripts/probe-composer-states.mjs check 9.
    const columnOf = (row: HTMLElement) => row.lastElementChild as HTMLElement;
    expect(columnOf(rows[0]).className).toContain('w-8');
    expect(columnOf(rows[0]).className).toContain('pl-4');
    expect(columnOf(rows[1]).className).toContain('w-11');
    expect(columnOf(rows[1]).className).toContain('pl-2');
    expect(columnOf(rows[1]).className).toContain('h-5');
    // A checked switch and an unchecked one reserve the SAME column, so the column
    // does not move when the state flips.
    expect(columnOf(rows[2]).className).toBe(columnOf(rows[1]).className);
  });

  it('renders a description on a submenu trigger instead of dropping it', () => {
    render(() => (
      <Dropdown>
        <DropdownTrigger as={(p: any) => <button {...p} data-testid="trg">Menu</button>} />
        <DropdownContent>
          <DropdownSub>
            <DropdownSubTrigger description="Where your tools live">Skills</DropdownSubTrigger>
            <DropdownSubContent>
              <DropdownItem>skill-creator</DropdownItem>
            </DropdownSubContent>
          </DropdownSub>
        </DropdownContent>
      </Dropdown>
    ));
    fireEvent.click(screen.getByTestId('trg'));
    // `description` promises a muted second line with no exception, so an item that
    // carries children renders it rather than swallowing it.
    expect(screen.getByText('Where your tools live')).toBeInTheDocument();
    // And the row is still a submenu, not a leaf that happens to have text under it.
    expect(screen.getByRole('menuitem')).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('a note is not a menu item', () => {
    render(() => (
      <Dropdown>
        <DropdownTrigger as={(p: any) => <button {...p} data-testid="trg">Menu</button>} />
        <DropdownContent>
          <DropdownNote>Design systems aren't available on your plan.</DropdownNote>
          <DropdownItem>New design system</DropdownItem>
        </DropdownContent>
      </Dropdown>
    ));
    fireEvent.click(screen.getByTestId('trg'));
    expect(screen.getByText(/aren't available/)).not.toHaveAttribute('role');
    expect(screen.getAllByRole('menuitem')).toHaveLength(1);
  });
});
