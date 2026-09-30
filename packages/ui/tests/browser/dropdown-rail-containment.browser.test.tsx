import { describe, expect, it, afterEach } from 'vitest';
import { page } from 'vitest/browser';
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '../../src/components/dropdown/dropdown';
import { ChatConfig } from '../../src/primitives/chat-config';
import {
  adoptKitStyles, clipBoundary, describeBoundary, describeBox, expectInsideContainer,
  expectInsideWindow, installKitStyles, menuBox, mountInto, outsideContainer, outsideWindow,
  panelFloorPx, reset, settle, type ClipBoundary,
} from './containment-helpers';

/**
 * THE SAME INVARIANT, IN THE ONE ARRANGEMENT THE OWNER ACTUALLY USES.
 *
 * `dropdown-containment.browser.test.tsx` asserts the box-in-window invariant over a menu
 * whose anchor sits in the document flow and whose panel is portaled to `<body>`. It named
 * what it could not reach: a menu opened from inside the assistant rail, where the anchor
 * lives in a scrolling ancestor and the panel is portaled into a SHADOW ROOT. That is where
 * a positioner's assumptions about its container stop holding, and it was the arrangement
 * left unguarded.
 *
 * What is reproduced here, in the rail's own nesting:
 *
 *   shell scroller   the workspace's scrolling region (`overflow-y: auto`), taller content
 *                    than the window, so the rail itself moves as the shell scrolls
 *     top bar        a fixed-height row above the columns, as the workspace has
 *     columns        flex row: the rail column (280px, `flex: 0 0`) beside the thread
 *       rail host    the `kai-conversations` HOST: shadow root, and the kit's portal mount
 *                    is a `<div>` inside that shadow root -- exactly what `defineWebComponent`
 *                    renders (`<div ref={portalNode} />` in the shadow tree, then
 *                    `<ChatConfig portalMount={portalNode}>`), so the panel is portaled into
 *                    the shadow root and NOT into the light DOM
 *         header slot  the rail's header region (a REPLACE seam in the block: the page's own
 *                    title bar), unscrolled
 *         rail scroller `overflow-y: auto; overflow-x: hidden` -- the rail's own list region
 *                    (`ScrollArea`), holding the slotted rows and the section-label trigger
 *
 * The anchor is therefore a light-DOM element PROJECTED into a shadow scroll container, which
 * is the arrangement: `getOverflowAncestors` sees the rail scroller and the shell scroller, and
 * the panel's own clipping-ancestor walk crosses the shadow boundary out of that subtree.
 *
 * WHAT THIS FILE CLAIMS NOW, AND WHAT THE PREVIOUS VERSION COULD NOT. It used to claim
 * box-in-WINDOW only, and that was the wrong boundary for this arrangement: the rail nests the
 * panel inside boxes that can clip it, and the window is looser than the box a row is cut by. Both
 * are asserted now -- `expectInsideWindow` and `expectInsideContainer` -- and the container is
 * DERIVED by `clipBoundary`, not named here. In THIS rail (no `transform` / `contain` / 
 * `container-type` anywhere in the chain) the nearest containing block is the viewport, so no
 * ancestor can clip the panel and the two claims coincide; the arrangement guard says so out loud
 * rather than letting a reader believe two boundaries were measured. The arrangement where they
 * DIVERGE is `a clipping column narrower than the menu's floor` below, which is where the
 * container claim gets its teeth.
 *
 * THE PANEL'S WIDTH IS LOAD-BEARING HERE, as it is in `dropdown-containment.browser.test.tsx`:
 * the kit's stylesheet is adopted into the shadow root (the mechanism `defineWebComponent` uses)
 * and installed at document level for the slotted rows, so `min-w-[15rem]` resolves and the panel
 * is a real 240px box rather than a ~50px content-sized one whose horizontal half cannot fail.
 */

const WINDOW = { width: 900, height: 560 };
/** The rail's column, on the shell's start side as `slot="start"` puts it. */
const RAIL_WIDTH = 280;
/** The rail's own list region: short enough that the rail scroller really scrolls. */
const RAIL_SCROLLER_HEIGHT = 200;
/** The rail's unscrolled header region, above the list. */
const RAIL_HEADER_HEIGHT = 60;
const ROW_HEIGHT = 32;
/** The rail's list: 384px of content in a 200px scroller. */
const RAIL_ROWS = 12;
/** The section label whose kebab menu opens: one row down the scrolled list. */
const ANCHOR_ROW = 4;
/** The row above the columns, as the workspace's own top bar. */
const TOP_BAR_HEIGHT = 300;
/** The thread column, exactly one window tall, so the shell's scroll range is the top bar. */
const THREAD_HEIGHT = WINDOW.height;
/** Taller than any window below, so the ceiling binds rather than the content. */
const MENU_ROWS = 80;
/** The sweep step. The band where the cap's room and the true room disagree is as wide as
 *  the gutter (6px), so a coarser step can step over the failing positions. */
const STEP = 4;
/**
 * The clipping column's width, in the arrangement where one clips. 200px is not a number chosen
 * to make a test fail: it is the shell's own minimum aside width (`workspace-shell`'s
 * `startMinWidth`/`endMinWidth` default), so it is a rail the block's own shell will hand a
 * consumer, and the menu's 15rem floor is wider than it. See the describe at the foot of this
 * file -- that mismatch, not the plant, is the finding.
 */
const CLIPPED_COLUMN_WIDTH = 200;

interface Rail {
  shellScroller: HTMLElement;
  railColumn: HTMLElement;
  railScroller: HTMLElement;
  host: HTMLElement;
  shadow: ShadowRoot;
  portal: HTMLElement;
}

/**
 * The shell + rail skeleton, built imperatively because the portal mount has to EXIST before
 * the tree that portals into it is rendered.
 *
 * `clipped` narrows the rail's column to `CLIPPED_COLUMN_WIDTH` and gives it `contain: paint`,
 * which does two things at once and both are needed: it makes the COLUMN the panel's containing
 * block (so the panel's coordinates are the column's), and it clips it. That is the only way a box
 * nearer than the viewport can cut a `position: fixed` panel's rows -- `overflow` alone on an
 * ancestor above the containing block cannot, which is why the ordinary rail has no container
 * boundary to assert.
 */
function buildRail(clipped = false): Rail {
  const shellScroller = document.createElement('div');
  shellScroller.style.cssText = `width:${WINDOW.width}px;height:${WINDOW.height}px;overflow-y:auto`;
  const topBar = document.createElement('div');
  topBar.style.cssText = `height:${TOP_BAR_HEIGHT}px`;
  const columns = document.createElement('div');
  columns.style.cssText = 'display:flex;align-items:flex-start';
  const railColumn = document.createElement('div');
  const railWidth = clipped ? CLIPPED_COLUMN_WIDTH : RAIL_WIDTH;
  // The clipped column is given the window's HEIGHT in the same edit that narrows it: an aside in
  // the real shell is one window tall (`kai-workspace.app { height: 100dvh }`), and a column that
  // shrink-wrapped its contents would make every parked panel escape it vertically -- a failure
  // about the fixture's own height rather than about the boundary under test.
  railColumn.style.cssText = `flex:0 0 ${railWidth}px;width:${railWidth}px`
    + (clipped ? `;height:${WINDOW.height}px;contain:paint` : '');
  const thread = document.createElement('div');
  thread.style.cssText = `flex:1 1 auto;height:${THREAD_HEIGHT}px`;
  columns.append(railColumn, thread);
  shellScroller.append(topBar, columns);
  document.body.append(shellScroller);

  const host = document.createElement('div');
  railColumn.append(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const portal = document.createElement('div');
  const header = document.createElement('div');
  const headerSlot = document.createElement('slot');
  headerSlot.name = 'header';
  header.append(headerSlot);
  const railScroller = document.createElement('div');
  railScroller.style.cssText =
    `overflow-y:auto;overflow-x:hidden;height:${RAIL_SCROLLER_HEIGHT}px`;
  railScroller.append(document.createElement('slot'));
  // `display: contents`, the wrapper `defineWebComponent` uses: no layout box of its own, so
  // the portal node and the two regions keep the boxes they declare.
  const wrapper = document.createElement('div');
  wrapper.style.display = 'contents';
  wrapper.append(portal, header, railScroller);
  shadow.append(wrapper);
  return { shellScroller, railColumn, railScroller, host, shadow, portal };
}

/** The rail's light DOM: the header region, and the scrolled rows the trigger lives among. */
function RailContents() {
  return (
    <>
      <div slot="header" style={{ height: `${RAIL_HEADER_HEIGHT}px` }}>Assistant</div>
      {Array.from({ length: RAIL_ROWS }, (_, i) => (
        <div style={{ height: `${ROW_HEIGHT}px` }}>
          {i === ANCHOR_ROW
            ? (
              <Dropdown defaultOpen>
                <DropdownTrigger as={(p: Record<string, unknown>) => <button {...p}>Section</button>} />
                <DropdownContent>
                  {Array.from({ length: MENU_ROWS }, (_, r) => <DropdownItem>Row {r + 1}</DropdownItem>)}
                </DropdownContent>
              </Dropdown>
            )
            : `Row ${i + 1}`}
        </div>
      ))}
    </>
  );
}

const triggerEl = (): HTMLElement => {
  const el = document.querySelector<HTMLElement>('[aria-haspopup="menu"]');
  if (!el) throw new Error('no menu trigger rendered');
  return el;
};

const setup = async (opts: { clipped?: boolean } = {}): Promise<Rail> => {
  await page.viewport(WINDOW.width, WINDOW.height);
  // The two sheets a consumer has, in the two places they land: the document for the slotted rows
  // (light DOM) and the shadow root for the panel portaled into it. Without them the panel is
  // content-sized and the horizontal half of both claims is vacuous.
  installKitStyles();
  const rail = buildRail(opts.clipped);
  adoptKitStyles(rail.shadow);
  // Into the HOST's light DOM directly: `slot=` is a property of the host's own children.
  mountInto(rail.host, () => (
    <ChatConfig portalMount={rail.portal}>
      <RailContents />
    </ChatConfig>
  ));
  await settle();
  return rail;
};

afterEach(reset);

/**
 * The arrangement, said out loud. Without these the sweep below would pass over a fixture that
 * had quietly stopped being the rail: an unslotted trigger, a portal that fell back to
 * `<body>`, or a container with no overflow to scroll.
 */
function expectArrangement(rail: Rail, where: string): void {
  const panel = rail.shadow.querySelector<HTMLElement>('[role="menu"]');
  if (!panel) throw new Error('no [role="menu"] rendered');

  expect(
    panel.getRootNode(),
    `${where}: the panel is portaled into the SHADOW ROOT, not into the light DOM or <body>`,
  ).toBe(rail.shadow);

  expect(
    rail.railScroller.scrollHeight,
    `${where}: the rail's list region really overflows, so it is a scrolling ancestor`,
  ).toBeGreaterThan(rail.railScroller.clientHeight);

  expect(
    rail.shellScroller.scrollHeight,
    `${where}: the shell really overflows, so the rail moves as it scrolls`,
  ).toBeGreaterThan(rail.shellScroller.clientHeight);

  // The anchor is IN the rail's scrolled content, across the shadow boundary: scrolling that
  // container has to move the trigger. `contains` cannot say this (it walks the light tree and
  // a slotted node is never a shadow descendant), so it is measured.
  const before = triggerEl().getBoundingClientRect().top;
  rail.railScroller.scrollTop += ROW_HEIGHT * 2;
  const after = triggerEl().getBoundingClientRect().top;
  rail.railScroller.scrollTop -= ROW_HEIGHT * 2;
  expect(
    after,
    `${where}: the trigger is projected INTO the rail's scroller -- scrolling it must move the anchor`,
  ).toBeLessThan(before);

  // The panel is a real box, not a content-sized one: the floor is read from the engine, so a
  // fixture that lost the kit's stylesheet fails HERE (floor is NaN) rather than passing over a
  // ~50px panel whose horizontal half cannot be wrong.
  const floor = panelFloorPx(rail.shadow);
  expect(
    Number.isNaN(floor),
    `${where}: the panel has no width floor -- the kit's compiled sheet is not adopted in the ` +
      `shadow root, so the panel is content-sized and the horizontal half is vacuous`,
  ).toBe(false);
  expect(
    panel.getBoundingClientRect().width,
    `${where}: the panel is narrower than the floor CSS resolved (${floor}px)`,
  ).toBeGreaterThanOrEqual(floor);
}

describe('a menu opened from inside the assistant rail', () => {
  it('holds the box-in-window invariant across both scrollers', async () => {
    const rail = await setup();
    expectArrangement(rail, 'opened');

    // ONE boundary for the whole sweep, derived from the panel and named in every failure below:
    // in this arrangement that is the viewport, and the assertion says so rather than leaving a
    // reader to assume a container was measured. If a later fixture change puts a `transform` or
    // `contain` in the chain, this fires and asks for the container claim to be stated for it.
    const panel = rail.shadow.querySelector<HTMLElement>('[role="menu"]');
    if (!panel) throw new Error('no [role="menu"] rendered');
    const boundary: ClipBoundary = clipBoundary(panel);
    expect(
      boundary.el,
      `this rail has no containing-block ancestor, so no box nearer than the viewport clips the ` +
        `panel and the two boundaries coincide -- state the container claim for it in the ` +
        `'clipping column narrower than the menu's floor' arrangement below, which is where they ` +
        `diverge (found ${describeBoundary(boundary)})`,
    ).toBeNull();

    const measured: string[] = [];
    const skipped: string[] = [];
    let windowFailures: string[] = [];
    let containerFailures: string[] = [];

    // Both scrollers are swept, and both ranges are MEASURED off the elements rather than
    // typed. A position whose anchor has scrolled out of the window is skipped: the invariant
    // is about a menu the user can see, and a hidden panel keeps the last position it had.
    const positions: Array<{ where: string; apply: () => void }> = [];
    const shellRange = rail.shellScroller.scrollHeight - rail.shellScroller.clientHeight;
    const railRange = rail.railScroller.scrollHeight - rail.railScroller.clientHeight;
    for (let top = 0; top <= shellRange; top += STEP) {
      positions.push({ where: `shell scrolled ${top}px`, apply: () => { rail.shellScroller.scrollTop = top; } });
    }
    for (let top = 0; top <= railRange; top += STEP) {
      positions.push({ where: `rail scrolled ${top}px`, apply: () => { rail.railScroller.scrollTop = top; } });
    }

    for (const position of positions) {
      position.apply();
      await settle();
      const anchor = triggerEl().getBoundingClientRect();
      if (anchor.bottom < 0 || anchor.top > WINDOW.height) {
        skipped.push(`${position.where}: anchor at ${anchor.top.toFixed(1)}px is outside the window`);
        continue;
      }
      const box = menuBox(rail.shadow);
      measured.push(describeBox(box, WINDOW.width, WINDOW.height, position.where));
      if (outsideWindow(box, WINDOW.width, WINDOW.height)) {
        windowFailures.push(`${describeBox(box, WINDOW.width, WINDOW.height, position.where)} ` +
          `-- anchor at y=${anchor.top.toFixed(1)}..${anchor.bottom.toFixed(1)}`);
      }
      if (outsideContainer(box, boundary)) {
        containerFailures.push(`${position.where}: menu box top=${box.top.toFixed(1)} ` +
          `bottom=${box.bottom.toFixed(1)} left=${box.left.toFixed(1)} right=${box.right.toFixed(1)} ` +
          `escapes ${describeBoundary(boundary)}`);
      }
    }

    // A sweep that measured nothing is the failure mode this guard exists to prevent, so the
    // count it actually measured is asserted, not assumed.
    expect(measured.length, `no sweep position measured a visible anchor`).toBeGreaterThan(0);
    expect(
      windowFailures,
      `${windowFailures.length} of ${measured.length} sweep positions opened a menu outside the ` +
        `WINDOW (${skipped.length} positions skipped: anchor out of the window)\n${windowFailures.join('\n')}`,
    ).toEqual([]);
    // The other boundary, reported separately so a red run names which one broke.
    expect(
      containerFailures,
      `${containerFailures.length} of ${measured.length} sweep positions opened a menu outside ` +
        `the box that CLIPS it, ${describeBoundary(boundary)}\n${containerFailures.join('\n')}`,
    ).toEqual([]);

    // Close on the whole arrangement rather than on one position of it: the panel is the last
    // thing measured above, and both claims are asserted, one after the other.
    rail.shellScroller.scrollTop = 0;
    rail.railScroller.scrollTop = 0;
    await settle();
    const rest = menuBox(rail.shadow);
    expectInsideWindow(rest, WINDOW.width, WINDOW.height, 'rail at its resting scroll, both placements reachable');
    expectInsideContainer(rest, boundary, 'rail at its resting scroll, both placements reachable');
  });
});

/**
 * THE BOUNDARY THAT IS NOT THE WINDOW, AND THE PLANT THAT PROVES IT IS CHECKED.
 *
 * A fixed panel is clipped only by an ancestor at or below its containing block, so the rail needs
 * a clipping COLUMN to have a second boundary at all: `contain: paint` makes the column the panel's
 * containing block and clips it, and 200px is the shell's own minimum aside width. The menu's own
 * floor (15rem, resolved by the sheet the fixture now loads) is wider than that, so a panel that
 * cannot fit cannot be shifted into fitting -- the failure a window-only assertion is blind to,
 * because 200px of column inside a 900px window leaves 700px of window to spare.
 *
 * The plant parks the panel at the column's own top-left corner, which is the regression shape the
 * previous round named: a panel back inside the rail's box. Both claims are then made against the
 * SAME box, and they must disagree -- the window assertion green, the container assertion red --
 * because a guard that cannot fail is the defect this round exists to remove.
 *
 * MEASURED, and it is the finding rather than the plant: UNPARKED, this column opens the panel at
 * left=8.0 right=248.0 -- 48px past the column's right edge, with 652px of window to spare. The
 * kit's 15rem floor is wider than a 200px aside, so `shift()` cannot fit it and no amount of
 * positioning can: the plant only makes the report deterministic. Not asserted as a pass, because
 * it is not one.
 */
describe('a clipping column narrower than the menu\'s floor', () => {
  it('passes the window claim and fails the container claim on the same box', async () => {
    const rail = await setup({ clipped: true });
    const panel = rail.shadow.querySelector<HTMLElement>('[role="menu"]');
    if (!panel) throw new Error('no [role="menu"] rendered');
    const boundary = clipBoundary(panel);
    expect(
      boundary.el,
      `the column is not the panel's clipping boundary, so this plant measures nothing ` +
        `(found ${describeBoundary(boundary)})`,
    ).toBe(rail.railColumn);

    // The shell is scrolled first so the column's top edge sits at the window's top: the parking
    // spot has to be INSIDE the window for the window claim to be green, or the contrast below
    // would be about the fixture's own offsets rather than about the boundary.
    rail.shellScroller.scrollTop += rail.railColumn.getBoundingClientRect().top
      - rail.shellScroller.getBoundingClientRect().top;
    // Re-derived AFTER the scroll: `clipBoundary` returns a rect, and that rect moved.
    const parked = clipBoundary(panel);
    expect(parked.el, `the column is not the clipping boundary after the scroll`).toBe(rail.railColumn);

    // Park it: the panel placed at the clipping column's own origin, which is inside the rail's box
    // and inside the window. No `settle()` afterwards -- floating-ui's autoUpdate would put it
    // back, and this box is a deliberate one, not a measured one.
    panel.style.left = `${parked.rect.left}px`;
    panel.style.top = `${parked.rect.top}px`;
    const box = menuBox(rail.shadow);

    // The precondition of the plant, asserted rather than assumed: a panel no wider than the
    // column WOULD fit it, and then the two claims could not disagree.
    expect(
      box.right - box.left,
      `the planted panel must be wider than the ${CLIPPED_COLUMN_WIDTH}px column for this plant to ` +
        `have anything to show (floor is ${panelFloorPx(rail.shadow)}px, measured ` +
        `${(box.right - box.left).toFixed(1)}px)`,
    ).toBeGreaterThan(CLIPPED_COLUMN_WIDTH);

    const where = `panel parked at the clipping column's origin, ${CLIPPED_COLUMN_WIDTH}px column in a ${WINDOW.width}px window`;
    // Green: the window has 700px of room to the right of that column.
    expectInsideWindow(box, WINDOW.width, WINDOW.height, where);
    // Red: the panel is wider than the box that cuts it, and shift() may not resize it.
    expect(
      () => expectInsideContainer(box, parked, where),
      `the box that clips the panel must report the escape -- ${where}`,
    ).toThrow(/clipping container/);
  });
});
