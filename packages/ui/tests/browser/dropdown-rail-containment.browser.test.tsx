import { describe, expect, it, afterEach } from 'vitest';
import { page } from 'vitest/browser';
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '../../src/components/dropdown/dropdown';
import { ChatConfig } from '../../src/primitives/chat-config';
import {
  describeBox, expectInsideWindow, menuBox, mountInto, outsideWindow, reset, settle,
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
 * WHAT THIS FILE DOES NOT CLAIM. The invariant is box-in-WINDOW, which is what the guard in
 * `dropdown-containment.browser.test.tsx` states; the rail adds a CONTAINER boundary that the
 * window is not, and a passing measurement here is not evidence about that boundary. The
 * arrangement guards below say out loud which structure was measured; they are not a second
 * invariant, they are what keeps this fixture from measuring nothing.
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

interface Rail {
  shellScroller: HTMLElement;
  railScroller: HTMLElement;
  host: HTMLElement;
  shadow: ShadowRoot;
  portal: HTMLElement;
}

/**
 * The shell + rail skeleton, built imperatively because the portal mount has to EXIST before
 * the tree that portals into it is rendered.
 */
function buildRail(): Rail {
  const shellScroller = document.createElement('div');
  shellScroller.style.cssText = `width:${WINDOW.width}px;height:${WINDOW.height}px;overflow-y:auto`;
  const topBar = document.createElement('div');
  topBar.style.cssText = `height:${TOP_BAR_HEIGHT}px`;
  const columns = document.createElement('div');
  columns.style.cssText = 'display:flex;align-items:flex-start';
  const railColumn = document.createElement('div');
  railColumn.style.cssText = `flex:0 0 ${RAIL_WIDTH}px;width:${RAIL_WIDTH}px`;
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
  return { shellScroller, railScroller, host, shadow, portal };
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

const setup = async (): Promise<Rail> => {
  await page.viewport(WINDOW.width, WINDOW.height);
  const rail = buildRail();
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
}

describe('a menu opened from inside the assistant rail', () => {
  it('holds the box-in-window invariant across both scrollers', async () => {
    const rail = await setup();
    expectArrangement(rail, 'opened');

    const measured: string[] = [];
    const skipped: string[] = [];
    let failures: string[] = [];

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
        failures.push(`${describeBox(box, WINDOW.width, WINDOW.height, position.where)} ` +
          `-- anchor at y=${anchor.top.toFixed(1)}..${anchor.bottom.toFixed(1)}`);
      }
    }

    // A sweep that measured nothing is the failure mode this guard exists to prevent, so the
    // count it actually measured is asserted, not assumed.
    expect(measured.length, `no sweep position measured a visible anchor`).toBeGreaterThan(0);
    expect(
      failures,
      `${failures.length} of ${measured.length} sweep positions opened a menu outside the window ` +
        `(${skipped.length} positions skipped: anchor out of the window)\n${failures.join('\n')}`,
    ).toEqual([]);

    // Close on the whole arrangement rather than on one position of it: the panel is the last
    // thing measured above, and the invariant is the assertion.
    rail.shellScroller.scrollTop = 0;
    rail.railScroller.scrollTop = 0;
    await settle();
    expectInsideWindow(menuBox(rail.shadow), WINDOW.width, WINDOW.height, 'rail at its resting scroll, both placements reachable');
  });
});
