import { render } from 'solid-js/web';
import { expect } from 'vitest';
import type { JSX } from 'solid-js';

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
 */

export type Box = {
  top: number; right: number; bottom: number; left: number; height: number;
  contentHeight: number; boxHeight: number;
};

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
