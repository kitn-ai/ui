import { createEffect, untrack, type Accessor } from 'solid-js';
import type { WebComponentContext } from './define';

/** The open controller a primitive hands up via `controllerRef` so a facade can
 *  drive + observe its open/closed state. */
export interface OpenController {
  open: Accessor<boolean>;
  setOpen: (v: boolean) => void;
}

/**
 * Wire the standard Shoelace/WebAwesome-style overlay surface onto an internal
 * open controller — the kit's convention for every open/close element (hover-card,
 * tooltip, popover, menu, model-switcher, scope-picker, collapsibles, …). NOT
 * React-controlled: the element keeps self-managing; this layers the host-facing
 * conveniences on top.
 *
 * Given the primitive's `{ open, setOpen }` controller, it provides:
 *  - **`open` reflects** to the host `[open]` attribute (for `:host([open])` CSS),
 *    and is **settable** — `el.open = true` / `<el open>` drives it;
 *  - **`kai-open-change` `{ open }`** fires once per change (a guarded reflect
 *    avoids the attribute⇄prop feedback loop);
 *  - **`show()` / `hide()` / `toggle()`** instance methods, gated by `disabled`.
 *
 * The facade still:
 *  - declares the `open` / `defaultOpen` / `disabled` props (defaults `undefined`),
 *  - seeds the primitive from `defaultOpen` (e.g. via the primitive's own prop),
 *  - includes `'kai-open-change': { open: boolean }` in its `Events` map.
 *
 * @param ctx      the facade's WebComponentContext (its Events must include kai-open-change).
 * @param getApi   returns the open controller once the primitive has handed it up (may be undefined early).
 * @param openProp reads the raw reactive `open` prop (e.g. `() => props.open`) — used to tell
 *                 "consumer explicitly set open" from "unset" so a `defaultOpen` seed isn't clobbered.
 */
export function wireDisclosure<E extends { 'kai-open-change': { open: boolean } }>(
  ctx: WebComponentContext<E>,
  getApi: () => OpenController | undefined,
  openProp: () => unknown,
): void {
  const { element, dispatch, flag, expose } = ctx;
  let prev: boolean | undefined;

  // Reflect internal open → the `[open]` host attribute + fire kai-open-change.
  createEffect(() => {
    const api = getApi();
    if (!api) return;
    const o = api.open();
    element.toggleAttribute('open', o);
    if (prev !== undefined && prev !== o) dispatch('kai-open-change', { open: o } as E['kai-open-change']);
    prev = o;
  });

  // External `open` prop/attr → drive internal state. Only when the consumer has
  // EXPLICITLY set it (so a defaultOpen seed survives mount); the equality guard
  // keeps the reflect above from looping back through the prop.
  createEffect(() => {
    const api = getApi();
    if (!api) return;
    const explicit = openProp() !== undefined || element.hasAttribute('open');
    if (!explicit) return;
    const desired = flag('open');
    if (desired !== untrack(api.open)) api.setOpen(desired);
  });

  expose({
    /** Open it programmatically (no-op while disabled). */
    show: () => { if (!flag('disabled')) getApi()?.setOpen(true); },
    /** Close it programmatically. */
    hide: () => getApi()?.setOpen(false),
    /** Flip the open state (closes while disabled). */
    toggle: () => { const api = getApi(); if (api) api.setOpen(flag('disabled') ? false : !api.open()); },
  });
}
