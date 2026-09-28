import { render } from 'solid-js/web';
import { expect } from 'vitest';
import type { JSX } from 'solid-js';
import { WEB_COMPONENT_CSS } from '../../src/web-components/define/css';

/**
 * THE INVARIANT, AND THE ONE PLACE IT IS SPELLED.
 *
 * These helpers are the dropdown's box-in-window check, extracted from
 * `dropdown-containment.browser.test.tsx` when a SECOND arrangement had to be measured against
 * the same question. They live in a plain `.ts` because a second copy of one invariant is how
 * two answers to one question drift: `expectInsideWindow` below is the only statement of
 * "inside on both axes", and every browser suite that measures a menu calls it.
 *
 * jsdom cannot state this. It has no layout, so every box it reports is zero-sized and a
 * menu hanging past the bottom edge is indistinguishable from one that fits. Only a browser
 * settles a box against a viewport.
 *
 * Both AXES: `shift()` moves a `bottom-*` placement along its MAIN axis, which is X, so the
 * horizontal half is the positioner's and the vertical half is the ceiling's. A check on one
 * axis would have called the 10.5px run green.
 *
 * Both BOUNDARIES. The window is one claim and it is not the only one that cuts a row: a box
 * nearer than the viewport can clip the panel too, and a panel that is comfortably inside the
 * window can still lose its rows to that box. `expectInsideWindow` and
 * `expectInsideContainer` are two statements with two failure messages, so a red run says
 * WHICH boundary was violated, and `clipBoundary` derives the second one from the panel
 * rather than from a constant.
 *
 * THE WIDTH FLOOR. Neither claim is about a box too small to be wrong, so the fixture owes the
 * panel the kit's own stylesheet: `min-w-[15rem]` and `max-w-[var(...)]` are CLASSES, and with no
 * sheet loaded they resolve to nothing and the panel is content-sized (~50px), which makes the
 * horizontal half of both claims vacuous. `installKitStyles` / `adoptKitStyles` below load the
 * same string the kit's shadow roots adopt (`define/css`), and `panelFloorPx` reads the resolved
 * floor back from the engine so a fixture that forgot the sheet fails loudly instead of quietly
 * measuring a box that cannot be wrong.
 */

export type Box = {
  top: number; right: number; bottom: number; left: number; height: number;
  contentHeight: number; boxHeight: number;
};

export type Rect = { top: number; right: number; bottom: number; left: number };

const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { top: r.top, right: r.right, bottom: r.bottom, left: r.left };
};

/**
 * The kit's compiled sheet, at document level: what a light-DOM fixture's panel is styled by
 * when it portals to `<body>` (Storybook and the docs site do the same). Idempotent, and it lives
 * in `<head>`, so `reset()`'s `document.body.replaceChildren()` cannot take it away.
 */
export function installKitStyles(doc: Document = document): void {
  if (doc.head.querySelector('style[data-kai-test-styles]')) return;
  const style = doc.createElement('style');
  style.setAttribute('data-kai-test-styles', '');
  style.textContent = KIT_SHEET;
  doc.head.append(style);
}

/**
 * The one rule the fixture adds to the kit's sheet, and why it is not cheating.
 *
 * `animate-in zoom-in-95` is a real part of the surface, and it SCALES the box by 0.95 for the
 * length of the entrance. A rect read mid-flight is 5% SMALLER than the box that ships, so the
 * containment claim would be easier than the real one — the same shape of defect as a panel too
 * small to be wrong. The resting box is what the invariant is about, so the fixture pins it, and
 * only on the surface that carries the animation.
 */
const GEOMETRY_PIN = '[role="menu"] { animation: none !important; }';
const KIT_SHEET = `${WEB_COMPONENT_CSS}\n${GEOMETRY_PIN}`;

/**
 * The same sheet, ADOPTED into a shadow root -- the mechanism `defineWebComponent` uses, and
 * the only one that reaches a panel portaled into a shadow tree: a document-level rule cannot
 * match a node across a shadow boundary, so a fixture that skips this measures a bare box.
 */
export function adoptKitStyles(root: ShadowRoot): void {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(KIT_SHEET);
  root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
}

/**
 * The panel's width FLOOR as CSS resolved it, in px, or `NaN` when no sheet carries it.
 *
 * Read from the engine rather than typed, because `15rem` is the kit's number and it lives in the
 * component. `min-width` computes to `auto` (NaN here) with no sheet and to a length with one,
 * which is exactly the difference between a panel that can be wrong and one that cannot.
 */
export function panelFloorPx(root: ParentNode = document): number {
  const el = root.querySelector<HTMLElement>('[role="menu"]');
  if (!el) throw new Error('no [role="menu"] rendered');
  return Number.parseFloat(getComputedStyle(el).minWidth);
}

let dispose: (() => void) | undefined;

/**
 * Render `node` directly into `target`, disposing any previous mount.
 *
 * Directly, with no wrapper element, because a shadow host's LIGHT DOM is a case where a
 * wrapper changes the meaning: `slot=` assignment only considers the host's own CHILDREN, so
 * a wrapper div around slotted content sends every named slot to its fallback and the fixture
 * silently stops reproducing the arrangement it names.
 */
export function mountInto(target: HTMLElement, node: () => JSX.Element): void {
  dispose?.();
  dispose = render(node, target);
}

/** Mount into a fresh root appended to `host` (defaults to `<body>`), disposing any previous mount. */
export function mount(node: () => JSX.Element, host: HTMLElement = document.body): void {
  const root = document.createElement('div');
  host.append(root);
  mountInto(root, node);
}

/** Tear the current mount and the DOM down. Call from `afterEach`. */
export function reset(): void {
  dispose?.();
  dispose = undefined;
  document.body.replaceChildren();
}

/** Two frames: one for the positioner's microtask, one for the ResizeObserver it feeds. */
export const settle = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

/**
 * The surface, in whichever ROOT it was portaled into: `document` for the body portal, or the
 * shadow root when the panel portals into one (`defineWebComponent`'s `portalMount`).
 * `<Portal>`'s node is a real DOM node either way, and `document.querySelector` cannot see
 * through a shadow boundary -- which is a property of the portal, not of this query.
 * `position: fixed`, so its rect is already in viewport coordinates.
 */
export function menuBox(root: ParentNode = document): Box {
  const el = root.querySelector<HTMLElement>('[role="menu"]');
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

export const describeBox = (box: Box, width: number, height: number, where: string): string =>
  `${where}: menu box top=${box.top.toFixed(1)} bottom=${box.bottom.toFixed(1)} ` +
  `left=${box.left.toFixed(1)} right=${box.right.toFixed(1)} (height ${box.height.toFixed(1)}) ` +
  `in a ${width}x${height} window`;

/** The named invariant: inside on BOTH axes, which is the whole claim. */
export function expectInsideWindow(box: Box, width: number, height: number, where: string): void {
  const at = describeBox(box, width, height, where);
  expect(box.top, `top edge above the window -- ${at}`).toBeGreaterThanOrEqual(0);
  expect(box.bottom, `bottom edge past the window -- ${at}`).toBeLessThanOrEqual(height);
  expect(box.left, `left edge outside the window -- ${at}`).toBeGreaterThanOrEqual(0);
  expect(box.right, `right edge outside the window -- ${at}`).toBeLessThanOrEqual(width);
}

/** True when the box escapes the window on any edge — the sweep's own predicate. */
export const outsideWindow = (box: Box, width: number, height: number): boolean =>
  box.bottom > height || box.top < 0 || box.right > width || box.left < 0;

/**
 * WHICH BOX CUTS A ROW: the nearest ancestor that clips the panel, or the viewport.
 *
 * Derived, never typed, because the answer is a property of the DOM the fixture built: `null`
 * `el` means "the viewport is the only thing that clips this panel", which is the ordinary case
 * and the one a fixture must say out loud rather than assume.
 *
 * The walk follows the rule that decides it for a `position: fixed` box: overflow on an ancestor
 * ABOVE the containing block does not clip it (this is why a fixed header survives
 * `body { overflow: hidden }`), so only ancestors at or below the containing block can. A nearer
 * containing block is established by `transform` / `filter` / `perspective` / `will-change` /
 * `contain` / `container-type` -- the list is read off the computed style rather than restated
 * from a document. With no such ancestor the containing block IS the viewport, no ancestor can
 * clip, and the boundary is the viewport -- the two claims then coincide, and the fixture says so
 * (`expect(...).toBeNull()`) instead of pretending it measured two.
 *
 * Not asserted: a clipping ancestor strictly BETWEEN the panel and its containing block. The
 * nearest clipper wins here, and both arrangements this suite measures land on the unambiguous
 * answer; the middle case is worth a measurement of its own before anything asserts it.
 */
export type ClipBoundary = { el: Element | null; rect: Rect; why: string };

/** Every flat-tree ancestor, across shadow boundaries: a slotted panel's clipper may be outside. */
function* ancestors(el: Element): Generator<Element> {
  let node: Element | null = el.parentElement;
  while (node) {
    yield node;
    node = node.parentElement
      ?? ((node.getRootNode() as ShadowRoot).host as Element | undefined)
      ?? null;
  }
}

/** Does this ancestor establish the containing block for a `position: fixed` box? */
function isContainingBlock(el: Element): boolean {
  const cs = getComputedStyle(el);
  if (cs.transform !== 'none') return true;
  if (cs.perspective !== 'none') return true;
  if (cs.filter && cs.filter !== 'none') return true;
  if (cs.backdropFilter && cs.backdropFilter !== 'none') return true;
  if (/transform|filter|perspective|contain/.test(cs.willChange ?? '')) return true;
  if (/paint|layout|strict|content/.test(cs.contain ?? '')) return true;
  if (cs.containerType && cs.containerType !== 'normal') return true;
  return false;
}

/** Does this ancestor clip what is laid out inside it? `contain: paint` clips with no `overflow`. */
function clips(el: Element): boolean {
  const cs = getComputedStyle(el);
  if (/paint|strict|content/.test(cs.contain ?? '')) return true;
  return cs.overflowX !== 'visible' || cs.overflowY !== 'visible';
}

export function clipBoundary(panel: HTMLElement): ClipBoundary {
  let containingBlock: Element | null = null;
  for (const a of ancestors(panel)) {
    if (isContainingBlock(a)) { containingBlock = a; break; }
  }
  if (containingBlock) {
    for (const a of ancestors(panel)) {
      if (clips(a)) return { el: a, rect: rectOf(a), why: describeElement(a) };
      if (a === containingBlock) break;
    }
  }
  return {
    el: null,
    rect: { top: 0, right: window.innerWidth, bottom: window.innerHeight, left: 0 },
    why: 'the viewport',
  };
}

/** Tag plus the first two classes: enough to recognise the box in a failure message. */
export function describeElement(el: Element): string {
  const cls = Array.from(el.classList).slice(0, 2).join('.');
  return `<${el.localName}${cls ? `.${cls}` : ''}>`;
}

export const describeBoundary = (b: ClipBoundary): string =>
  `${b.why} (${b.rect.left.toFixed(1)},${b.rect.top.toFixed(1)}..${b.rect.right.toFixed(1)},${b.rect.bottom.toFixed(1)})`;

/** True when the box escapes the CLIPPING ancestor on any edge — the container sweep's predicate. */
export const outsideContainer = (box: Box, boundary: ClipBoundary): boolean =>
  box.bottom > boundary.rect.bottom || box.top < boundary.rect.top
  || box.right > boundary.rect.right || box.left < boundary.rect.left;

/**
 * The second claim: inside the box that actually clips it, on both axes.
 *
 * Separate from `expectInsideWindow` on purpose — the window is not what cuts a row when a
 * nearer box clips the panel, and a single assertion cannot report which of the two was broken.
 */
export function expectInsideContainer(box: Box, boundary: ClipBoundary, where: string): void {
  const at =
    `${where}: menu box top=${box.top.toFixed(1)} bottom=${box.bottom.toFixed(1)} ` +
    `left=${box.left.toFixed(1)} right=${box.right.toFixed(1)} in the box that clips it: ` +
    describeBoundary(boundary);
  expect(box.top, `top edge above the clipping container -- ${at}`).toBeGreaterThanOrEqual(boundary.rect.top);
  expect(box.bottom, `bottom edge past the clipping container -- ${at}`).toBeLessThanOrEqual(boundary.rect.bottom);
  expect(box.left, `left edge outside the clipping container -- ${at}`).toBeGreaterThanOrEqual(boundary.rect.left);
  expect(box.right, `right edge outside the clipping container -- ${at}`).toBeLessThanOrEqual(boundary.rect.right);
}
