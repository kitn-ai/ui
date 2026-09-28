import { describe, expect, it, afterEach } from 'vitest';
import { render } from 'solid-js/web';
import { createSignal, type Accessor, type JSX } from 'solid-js';
import { page } from 'vitest/browser';
import {
  Dropdown, DropdownContent, DropdownItem, DropdownTrigger,
} from '../../src/components/dropdown/dropdown';

/**
 * THE INVARIANT, MEASURED IN A BROWSER: a menu's box never exceeds the viewport.
 *
 * jsdom cannot state this. It has no layout, so every box it reports is zero-sized and a
 * menu hanging past the bottom edge is indistinguishable from one that fits — which is
 * how a height cap shipped with its own residual ("532px tall with its bottom 10.5px
 * past the viewport edge, a 33-row menu in a 560px window") attached to it instead of a
 * failing test. Here the surface's real border box is compared with the real window.
 *
 * Both AXES: `shift()` moves a `bottom-*` placement along its MAIN axis, which is X, so
 * the horizontal half is the positioner's and the vertical half is the ceiling's. A
 * check on one axis would have called the 10.5px run green.
 *
 * WHY A SWEEP AND NOT A CHOSEN ANCHOR. The cap's vertical half is the room beside the
 * anchor, and the positioner keeps the surface where it is while the surface still fits
 * by ITS OWN measure — so the positions where the two disagree are a BAND, as wide as
 * the gutter, not a spot. An anchor picked by hand lands in that band only while the
 * constants it was picked from stay put, and a guard that goes quietly vacuous when they
 * move is the defect class this repo keeps paying for. Sweeping the anchor instead makes
 * the failing positions the sweep's own output: the heights and the placements below are
 * the named cases, and the sweep is the exhaustive one.
 *
 * `page.viewport` sizes the test iframe, and it is the same `innerHeight`/`dvh` the
 * surface is bounded by — so a height change here is a window change there.
 */

const WIDTH = 900;
/** Taller than every window below, so the ceiling binds rather than the content. */
const ROWS = 80;
/** A menu that fits anywhere: the "nothing changed for a short menu" half. */
const SHORT_ROWS = 2;

type Box = {
  top: number; right: number; bottom: number; left: number; height: number;
  contentHeight: number; boxHeight: number;
};

let dispose: (() => void) | undefined;

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.replaceChildren();
});

function mount(node: () => JSX.Element): void {
  const root = document.createElement('div');
  document.body.append(root);
  dispose = render(node, root);
}

/** Two frames: one for the positioner's microtask, one for the ResizeObserver it feeds. */
const settle = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

/**
 * The surface, whichever root it was portaled into. `position: fixed`, so its rect is
 * already in viewport coordinates.
 */
function menuBox(): Box {
  const el = document.querySelector<HTMLElement>('[role="menu"]');
  if (!el) throw new Error('no [role="menu"] rendered');
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    height: rect.height,
    contentHeight: el.scrollHeight,
    boxHeight: el.clientHeight,
  };
}

const describeBox = (box: Box, width: number, height: number, where: string): string =>
  `${where}: menu box top=${box.top.toFixed(1)} bottom=${box.bottom.toFixed(1)} ` +
  `left=${box.left.toFixed(1)} right=${box.right.toFixed(1)} (height ${box.height.toFixed(1)}) ` +
  `in a ${width}x${height} window`;

/** The named invariant: inside on BOTH axes, which is the whole claim. */
function expectInsideWindow(box: Box, width: number, height: number, where: string): void {
  const at = describeBox(box, width, height, where);
  expect(box.top, `top edge above the window -- ${at}`).toBeGreaterThanOrEqual(0);
  expect(box.bottom, `bottom edge past the window -- ${at}`).toBeLessThanOrEqual(height);
  expect(box.left, `left edge outside the window -- ${at}`).toBeGreaterThanOrEqual(0);
  expect(box.right, `right edge outside the window -- ${at}`).toBeLessThanOrEqual(width);
}

/**
 * A menu whose trigger sits at a chosen distance from the top, so the placement is a
 * property of the test rather than of the page's own flow: near the top the positioner
 * keeps `bottom-start`, near the bottom it must flip.
 */
function Harness(props: { rows: Accessor<number>; anchorTop: number }) {
  return (
    <div style={{ position: 'absolute', top: `${props.anchorTop}px`, left: '0' }}>
      <Dropdown defaultOpen>
        <DropdownTrigger as={(p: Record<string, unknown>) => <button {...p}>Menu</button>} />
        <DropdownContent>
          {Array.from({ length: props.rows() }, (_, i) => <DropdownItem>Row {i + 1}</DropdownItem>)}
        </DropdownContent>
      </Dropdown>
    </div>
  );
}

const openMenu = async (rows: Accessor<number>, anchorTop: number, height: number): Promise<Box> => {
  await page.viewport(WIDTH, height);
  mount(() => <Harness rows={rows} anchorTop={anchorTop} />);
  await settle();
  return menuBox();
};

const fixedRows = (n: number): Accessor<number> => () => n;

describe('a menu never exceeds the window', () => {
  for (const height of [560, 1200]) {
    it(`stays inside a ${height}px window, opened BELOW its trigger`, async () => {
      const box = await openMenu(fixedRows(ROWS), 8, height);

      expectInsideWindow(box, WIDTH, height, `anchor 8px from the top of a ${height}px window`);
      // The ceiling is what keeps it inside, so the content is taller than the box:
      // capped-and-scrollable, not clipped and not short.
      expect(box.contentHeight, describeBox(box, WIDTH, height, 'below')).toBeGreaterThan(box.boxHeight);
    });

    it(`stays inside a ${height}px window, opened ABOVE its trigger`, async () => {
      // The trigger sits 40px off the bottom, so `bottom-start` cannot hold a 33-row
      // menu and the positioner has to flip. The other placement is a different room.
      const box = await openMenu(fixedRows(ROWS), height - 40, height);

      expectInsideWindow(box, WIDTH, height, `anchor 40px off the bottom of a ${height}px window`);
      expect(box.contentHeight, describeBox(box, WIDTH, height, 'above')).toBeGreaterThan(box.boxHeight);
    });
  }

  it('stays inside at EVERY anchor position down a 560px window, on both placements', async () => {
    // 4px apart, because the band where the two rooms disagree is as wide as the gutter:
    // a coarser sweep can step over the failing positions, which is how the 10.5px
    // survived a round that measured everything else.
    const height = 560;
    const failures: string[] = [];
    for (let anchorTop = 40; anchorTop <= height - 20; anchorTop += 4) {
      await page.viewport(WIDTH, height);
      mount(() => <Harness rows={fixedRows(ROWS)} anchorTop={anchorTop} />);
      await settle();
      const box = menuBox();
      const where = `anchor ${anchorTop}px from the top`;
      if (box.bottom > height || box.top < 0 || box.right > WIDTH || box.left < 0) {
        failures.push(describeBox(box, WIDTH, height, where));
      }
      dispose?.();
      dispose = undefined;
      document.body.replaceChildren();
    }
    expect(failures, `${failures.length} anchor positions opened a menu outside the window`).toEqual([]);
  });

  it('stays inside after the menu GROWS, on the placement it already chose', async () => {
    // The reported shape: the menu opens short, then the consumer's own data arrives
    // (a rail listing conversations). The placement is decided against the height the
    // surface had THEN, so the surface can only be relied on to be inside the room on
    // the side it was placed on.
    const height = 560;
    const [rows, setRows] = createSignal(SHORT_ROWS);
    const box0 = await openMenu(rows, 300, height);
    expectInsideWindow(box0, WIDTH, height, 'short menu after opening');

    setRows(ROWS);
    await settle();

    expectInsideWindow(menuBox(), WIDTH, height, 'same menu after it grew');
  });

  it('leaves a short menu alone: no cap binds, so nothing about it changes', async () => {
    const height = 560;
    const box = await openMenu(fixedRows(SHORT_ROWS), 8, height);

    expectInsideWindow(box, WIDTH, height, 'a 2-row menu');
    // Capped surfaces scroll (`scrollHeight > clientHeight`); a menu that fits does not,
    // which is what keeps this additive for every menu that was already fine.
    expect(box.contentHeight, describeBox(box, WIDTH, height, 'a 2-row menu')).toBe(box.boxHeight);
  });
});
