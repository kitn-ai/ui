import { describe, expect, it, afterEach } from 'vitest';
import { createSignal, type Accessor, type JSX } from 'solid-js';
import { page } from 'vitest/browser';
import {
  Dropdown, DropdownContent, DropdownItem, DropdownTrigger,
} from '../../src/components/dropdown/dropdown';
import {
  describeBox, expectInsideWindow, installKitStyles, menuBox, mount, outsideWindow,
  panelFloorPx, reset, settle, type Box,
} from './containment-helpers';

/**
 * THE INVARIANT, MEASURED IN A BROWSER: a menu's box never exceeds the viewport.
 *
 * jsdom cannot state this. It has no layout, so every box it reports is zero-sized and a
 * menu hanging past the bottom edge is indistinguishable from one that fits — which is
 * how a height cap shipped with its own residual ("532px tall with its bottom 10.5px
 * past the viewport edge, a 33-row menu in a 560px window") attached to it instead of a
 * failing test. Here the surface's real border box is compared with the real window:
 * `expectInsideWindow` in ./containment-helpers, the one statement of the invariant.
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
 *
 * AND THE WIDTH. The panel's horizontal half is only a claim if the panel has width, so the
 * fixture installs the kit's compiled sheet at document level (the portal's root here is
 * `<body>`, so a document-level sheet is the one that reaches it): `min-w-[15rem]` is a class, and
 * with no sheet the panel was content-sized at ~50px and `left`/`right` were trivially inside a
 * 900px window. `panelFloorPx` reads the resolved floor back from the engine in `openMenu` below,
 * so a fixture that loses the sheet fails instead of measuring a box too small to be wrong.
 */

const WIDTH = 900;
/** Taller than every window below, so the ceiling binds rather than the content. */
const ROWS = 80;
/** A menu that fits anywhere: the "nothing changed for a short menu" half. */
const SHORT_ROWS = 2;

afterEach(reset);

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
  installKitStyles();
  mount(() => <Harness rows={rows} anchorTop={anchorTop} />);
  await settle();
  const floor = panelFloorPx();
  expect(
    Number.isNaN(floor),
    `the panel has no width floor: the kit's compiled sheet is not installed, so the panel is ` +
      `content-sized and the horizontal half of the invariant cannot fail`,
  ).toBe(false);
  const box = menuBox();
  expect(
    box.right - box.left,
    `the panel is narrower than the floor CSS resolved (${floor}px)`,
  ).toBeGreaterThanOrEqual(floor);
  return box;
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
    // The sheet, once for the whole loop: every mount below needs it for the reason `openMenu`
    // does, and a bare panel would make every position trivially inside.
    installKitStyles();
    const failures: string[] = [];
    for (let anchorTop = 40; anchorTop <= height - 20; anchorTop += 4) {
      await page.viewport(WIDTH, height);
      mount(() => <Harness rows={fixedRows(ROWS)} anchorTop={anchorTop} />);
      await settle();
      const floor = panelFloorPx();
      const box = menuBox();
      const where = `anchor ${anchorTop}px from the top`;
      // Read the floor inside the sweep too: this loop mounts its own trees (it does not go
      // through `openMenu`), so the sheet has to be there for the SAME reason, and a bare box
      // would make every position trivially inside.
      expect(
        Number.isNaN(floor) ? -1 : box.right - box.left,
        `${where}: the panel is content-sized or narrower than the floor CSS resolved ` +
          `(${floor}px), so the horizontal half cannot fail`,
      ).toBeGreaterThanOrEqual(Math.max(floor, 1));
      if (outsideWindow(box, WIDTH, height)) {
        failures.push(describeBox(box, WIDTH, height, where));
      }
      reset();
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
