import {
  createContext, useContext, createSignal, createEffect, createUniqueId, Show, onCleanup, splitProps,
  type JSX, type Accessor,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import { ChevronRight, Check } from 'lucide-solid';
import { cn } from '../../utils/cn';
import { useChatConfig } from '../../primitives/chat-config';
import { createPresence, usePosition, useDismiss, As, type AsTag } from '../overlay/overlay';
import { Switch } from '../switch/switch';

interface DropdownCtx {
  open: Accessor<boolean>;
  setOpen: (v: boolean, opts?: { viaKeyboard?: boolean; returnFocus?: boolean }) => void;
  triggerId: string;
  menuId: string;
  setTrigger: (el: HTMLElement) => void;
  setMenu: (el: HTMLElement) => void;
  trigger: Accessor<HTMLElement | undefined>;
  menu: Accessor<HTMLElement | undefined>;
  openedViaKeyboard: Accessor<boolean>;
  /** Register a portaled submenu surface so outside-click dismissal treats it as
   *  "inside" the menu tree (sub content lives in a sibling portal, not the menu DOM). */
  registerSubMenu: (el: HTMLElement) => () => void;
  /** Currently-mounted submenu surfaces, for the dismiss "inside" test. */
  subMenus: Accessor<HTMLElement[]>;
}
const Ctx = createContext<DropdownCtx>();
const useDropdown = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('Dropdown parts must be used within <Dropdown>');
  return c;
};

// The roving-focus set: real menuitems AND checkbox/radio items, minus disabled.
// A DropdownSubTrigger is a menuitem too, so it participates. Labels/separators
// are intentionally excluded. Submenu content is portaled to a SIBLING node, so
// a parent's querySelectorAll scoped to its own menu never reaches sub items.
const ITEM_SELECTOR = '[role="menuitem"]:not([aria-disabled="true"]), [role="menuitemcheckbox"]:not([aria-disabled="true"]), [role="menuitemradio"]:not([aria-disabled="true"])';

// The two placement gaps, named once: the positioner's `offset(gutter)` and the room
// maths below are the SAME gap seen twice, and a second literal is how they drift.
const SURFACE_GUTTER = 6;
const SUB_GUTTER = 2;
/** The breathing gap kept at the viewport edge, so a capped surface is not flush against
 *  the window and still reads as a floating panel. */
const VIEWPORT_MARGIN = 8;

/**
 * The surface's height ceiling, in CSS, spelled once.
 *
 * `min(...)` in an inline style cannot hold a class, so this is the one place the
 * expression lives and both surfaces and the docs entry name it by its value. The VAR
 * carries the DEFAULT inside itself (`var(--x, <default>)`), which is what makes it a
 * seam: a consumer sets `--kai-dropdown-max-height` on `kai-menu`/`kai-dropdown` and needs
 * no reach into the shadow root the panel is portaled into. `100dvh` is the window the
 * user actually has, mobile URL bars included -- never a typed pixel count.
 */
const MENU_MAX_HEIGHT = 'var(--kai-dropdown-max-height,calc(100dvh - 2rem))';

/**
 * How many px tall a surface may be before it would leave the window.
 *
 * `pin` is the surface's edge that does NOT depend on its own height, in viewport
 * coordinates, and `grows` is which way the box extends from it. Which edge that is follows
 * from the placement the positioner RESOLVED, and the room is that side's ALONE -- never the
 * larger of the two: a cap taken from the roomier side describes a placement the surface may
 * not be on, and the panel is then free to hang past the edge it actually opened toward.
 *
 * Where the pin can be read off the POSITIONER'S OWN OFFSET it is, because that half cannot
 * drift: the surface's top IS `y`, so `pin + room` is `innerHeight - VIEWPORT_MARGIN` by
 * construction. Measuring from the anchor instead restates the gutter in a second place.
 *
 * A `top*` placement is the one side where `y` cannot be read back -- there it is the TOP,
 * which the positioner computed BY SUBTRACTING the surface's own height, so a cap from it
 * comes from the box it constrains and can oscillate. Its height-independent edge is its
 * BOTTOM, `anchor.top - offset(gutter)`; so is an `end`-aligned side placement's. And the
 * floor is 0, never negative: `min()` with a negative argument is INVALID, CSS drops it, and
 * the ceiling vanishes silently. JavaScript because CSS cannot know where the anchor is.
 */
function viewportRoom(grows: 'down' | 'up', pin: number): number {
  const room = grows === 'down' ? window.innerHeight - pin - VIEWPORT_MARGIN : pin - VIEWPORT_MARGIN;
  return Math.max(0, room);
}

/**
 * The roving-focus set, in FLAT-TREE order.
 *
 * ★ NOT `querySelectorAll`, and the difference is the whole point: a `<slot>` in the
 * shadow tree contains NONE of the light-DOM nodes it projects, so a plain query
 * returns zero items for any facade whose rows are SLOTTED (`<kai-dropdown>`) and
 * ArrowUp/Down, Home/End and typeahead all reach nothing. The items-tree facades
 * (`kai-menu`, `kai-model-switcher`, `kai-scope-picker`) render their rows INTO the
 * shadow tree, so both spellings agree for them, which is exactly why this went
 * unnoticed until a slotted menu body existed.
 *
 * Same class as `hasFocusableChild` in ./hover-card.tsx, which asks the boolean
 * version of this question. This one needs the ORDER as well, so it walks the tree
 * and splices each slot's assigned elements in AT THE SLOT'S POSITION rather than
 * appending them; a menu may mix rendered and slotted rows. `flatten: true` follows
 * a slot assigned to another slot.
 *
 * Scope is unchanged: submenu content is portaled to a SIBLING node, so a parent's
 * walk still never reaches sub items.
 */
function menuItems(root: HTMLElement | undefined): HTMLElement[] {
  if (!root) return [];
  const out: HTMLElement[] = [];
  const collect = (el: Element): void => {
    if (el.matches(ITEM_SELECTOR)) out.push(el as HTMLElement);
    for (const child of Array.from(el.children)) visit(child);
  };
  const visit = (el: Element): void => {
    if (el.localName === 'slot') {
      for (const assigned of (el as HTMLSlotElement).assignedElements({ flatten: true })) collect(assigned);
      return;
    }
    collect(el);
  };
  for (const child of Array.from(root.children)) visit(child);
  return out;
}

/** The first roving-focus item, in flat-tree order. Replaces
 *  `querySelector(ITEM_SELECTOR)` for the reason `menuItems` replaces the `All`. */
const firstMenuItem = (root: HTMLElement | undefined): HTMLElement | undefined => menuItems(root)[0];

/**
 * The focused item, resolved across BOTH trees.
 *
 * Inside a Shadow DOM `document.activeElement` returns the HOST rather than the
 * focused menu item, so the menu's own root node is asked first. But a SLOTTED row
 * lives in the LIGHT DOM: focus is then outside the shadow tree, that root reports
 * null, and the document's answer is the real one. Asking only the shadow root would
 * leave `currentIndex()` at -1 for every slotted row, so ArrowDown would restart at
 * the top instead of advancing.
 */
function activeMenuItem(root: HTMLElement | undefined): Element | null {
  const tree = root?.getRootNode() as Document | ShadowRoot | undefined;
  return (tree?.activeElement ?? document.activeElement) as Element | null;
}

/** Imperative open controller, handed to a parent (e.g. the kai-menu facade) via
 *  `controllerRef` so it can drive/observe the Dropdown's open state. */
export interface DropdownController { open: Accessor<boolean>; setOpen: (v: boolean) => void; }

export interface DropdownProps {
  children: JSX.Element;
  /** Initial open state (uncontrolled seed). */
  defaultOpen?: boolean;
  /** When true, the trigger never opens the menu. */
  disabled?: boolean;
  /** Receive the open controller (open accessor + setOpen) once mounted. */
  controllerRef?: (api: DropdownController) => void;
}

export interface DropdownTriggerProps {
  /** Render as a different tag/component; defaults to a button. */
  as?: AsTag;
  children?: JSX.Element;
  class?: string;
  /** Remaining attributes are spread onto the rendered trigger. */
  [k: string]: unknown;
}

export interface DropdownContentProps {
  children: JSX.Element;
  class?: string;
  // The width comes from the TRIGGER, never from a container the caller names: the
  // trigger is what the surface is anchored to, so any other box could silently
  // disagree with it. Measured when the surface opens, and re-measured on every
  // trigger resize — the surface is PORTALED out of the trigger's container (the
  // mount is the element's shadow root), so a width set on that container cannot
  // inherit down to it; it has to cross in JS.
  //
  // The surface's own CSS `min-width` is the FLOOR, and CSS resolves it (a used width
  // is `max(width, min-width)`), which is why this is a boolean and not a number: a
  // narrow trigger must not shrink a menu below usable, and the floor stays declared
  // once, where the surface is built.
  /** Match the surface width to the trigger's measured width, above the surface's own `min-width` floor. */
  matchTriggerWidth?: boolean;
}

export interface DropdownItemProps {
  children: JSX.Element;
  class?: string;
  onSelect?: () => void;
  disabled?: boolean;
  // A second line under the label, muted. Present only when the caller passes one:
  // with no description the children render UNWRAPPED, so every menu that does not
  // use this is byte-identical to before it existed.
  /** Muted second line under the label. */
  description?: string;
}

export interface DropdownSeparatorProps { class?: string }

export interface DropdownLabelProps { children: JSX.Element; class?: string }

export interface DropdownCheckboxItemProps extends DropdownItemProps {
  checked?: boolean;
  // The GLYPH only. The row stays role="menuitemcheckbox" + aria-checked either way,
  // so a switch is how a toggle looks and never a second control for one state.
  /** Trailing glyph for a togglable item: a checkmark (default) or a switch. */
  control?: 'check' | 'switch';
}

export interface DropdownRadioItemProps extends DropdownItemProps { checked?: boolean }

export interface DropdownSubProps { children: JSX.Element }

export interface DropdownSubTriggerProps {
  children: JSX.Element;
  /** A muted second line under the label, stacked exactly as the leaf items stack
   *  theirs. A submenu parent renders its description; it is not dropped. */
  description?: string;
  class?: string;
}

export interface DropdownSubContentProps { children: JSX.Element; class?: string }

export function Dropdown(props: DropdownProps) {
  const [open, setOpenSig] = createSignal(props.defaultOpen ?? false);
  const [viaKb, setViaKb] = createSignal(false);
  const [trigger, setTrigger] = createSignal<HTMLElement>();
  const [menu, setMenu] = createSignal<HTMLElement>();
  const [subMenus, setSubMenus] = createSignal<HTMLElement[]>([]);
  const registerSubMenu = (el: HTMLElement) => {
    setSubMenus((prev) => [...prev, el]);
    return () => setSubMenus((prev) => prev.filter((m) => m !== el));
  };
  const setOpen = (v: boolean, opts?: { viaKeyboard?: boolean; returnFocus?: boolean }) => {
    // Gate opening while disabled; closing always works.
    if (v && props.disabled) return;
    setViaKb(!!opts?.viaKeyboard);
    setOpenSig(v);
    if (v) {
      // Focus the first item on keyboard-open. The menu mounts via <Show>; we
      // attempt focus now and re-assert in the menu ref's microtask so it lands
      // once the node exists. Skip disabled items (roving-focus contract).
      if (opts?.viaKeyboard) {
        queueMicrotask(() => firstMenuItem(menu())?.focus());
        firstMenuItem(menu())?.focus();
      }
    } else if (opts?.returnFocus !== false) {
      // Closing via keyboard/select: return focus to the trigger. The menu
      // unmounts on a microtask (createPresence) and that teardown blurs
      // whatever is focused, so re-assert focus AFTER unmount too.
      const el = trigger();
      el?.focus();
      queueMicrotask(() => el?.focus());
    }
  };
  // Hand the open controller up to a facade (e.g. kai-menu) so it can drive +
  // observe open state via wireDisclosure. Mirrors HoverCardRoot.controllerRef.
  props.controllerRef?.({ open, setOpen: (v: boolean) => setOpen(v) });
  return (
    <Ctx.Provider value={{
      open, setOpen, triggerId: createUniqueId(), menuId: createUniqueId(),
      setTrigger, setMenu, trigger, menu, openedViaKeyboard: viaKb,
      registerSubMenu, subMenus,
    }}>
      {props.children}
    </Ctx.Provider>
  );
}

export function DropdownTrigger(props: DropdownTriggerProps) {
  const ctx = useDropdown();
  // Forward extra attributes (e.g. aria-label for an icon-only trigger). The
  // controlled wiring below (id/aria-*/onClick/onKeyDown/class/type) is applied
  // AFTER the spread so it always wins over a caller-supplied duplicate.
  const [, rest] = splitProps(props, ['as', 'children', 'class']);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      ctx.setOpen(true, { viaKeyboard: true });
    }
  };
  return (
    <As
      as={props.as ?? 'button'}
      {...rest}
      ref={ctx.setTrigger}
      id={ctx.triggerId}
      aria-haspopup="menu"
      aria-expanded={ctx.open()}
      aria-controls={ctx.open() ? ctx.menuId : undefined}
      onClick={() => ctx.setOpen(!ctx.open())}
      onKeyDown={onKeyDown}
      class={props.class}
      {...(props.as ? {} : { type: 'button' })}
    >
      {props.children}
    </As>
  );
}

export function DropdownContent(props: DropdownContentProps) {
  const ctx = useDropdown();
  const config = useChatConfig();
  const presence = createPresence(ctx.open);
  const position = usePosition(ctx.trigger, ctx.menu, {
    placement: 'bottom-start',
    gutter: SURFACE_GUTTER,
    // Trigger removed from the DOM -> close (no focus return; it's gone) so the
    // menu portal doesn't orphan.
    onDisconnect: () => ctx.setOpen(false, { returnFocus: false }),
  });
  useDismiss({
    enabled: ctx.open,
    onDismiss: (reason) => ctx.setOpen(false, { returnFocus: reason === 'escape' }),
    // Open submenus portal to a sibling node, so include them as "inside" — a
    // click on a sub item must not be treated as an outside dismiss.
    refs: () => [ctx.trigger(), ctx.menu(), ...ctx.subMenus()],
  });

  // `matchTriggerWidth`: the surface is PORTALED out of the trigger's container
  // (the mount is the element's shadow root itself), so a width set on that
  // container — a custom property, a `width: 100%` — cannot reach it. The width
  // crosses in JS, measured off the trigger when the surface opens and again
  // whenever the trigger resizes; that re-measure is what carries an OPEN menu
  // along when the user drags a rail wider.
  const [triggerWidth, setTriggerWidth] = createSignal<number>();

  createEffect(() => {
    const ref = props.matchTriggerWidth && presence.present() ? ctx.trigger() : undefined;
    if (!ref) { setTriggerWidth(undefined); return; }
    const measure = () => {
      const w = ref.getBoundingClientRect().width;
      // 0 means "no layout" (jsdom, `display: none`), never a 0px-wide menu: leave
      // the width unset so the surface falls back to its own `min-width` floor.
      setTriggerWidth(w > 0 ? w : undefined);
    };
    measure();
    // Guarded: jsdom has no ResizeObserver, and there the open-time measurement IS
    // the mechanism. In a browser the observer is what tracks the resize.
    if (typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(measure);
    ro.observe(ref);
    onCleanup(() => ro.disconnect());
  });

  const items = () => menuItems(ctx.menu());
  // The surface's height ceiling, in two parts: the viewport-derived one the consumer can
  // theme (`MENU_MAX_HEIGHT`) and the room the surface has on the side the positioner put
  // it. Both, so the panel can neither exceed the window nor hang off the edge it opened
  // toward. See `viewportRoom` for which half is CSS's and which is not.
  const maxHeight = () => {
    // Read the resolved position so the room follows a FLIP (the cap belongs to the side
    // the surface ended up on) and is re-measured whenever the positioner recomputes —
    // scroll, window resize, anchor resize — which is the only time it moves.
    const { y, placement } = position.pos();
    const rect = ctx.trigger()?.getBoundingClientRect();
    if (!rect) return MENU_MAX_HEIGHT;
    const room = placement.startsWith('top')
      ? viewportRoom('up', rect.top - SURFACE_GUTTER)
      : viewportRoom('down', y);
    return `min(${MENU_MAX_HEIGHT}, ${room}px)`;
  };
  const focusIndex = (i: number) => {
    const list = items();
    if (!list.length) return;
    const idx = ((i % list.length) + list.length) % list.length;
    list[idx].focus();
  };
  const currentIndex = () => items().findIndex((el) => el === activeMenuItem(ctx.menu()));

  const onKeyDown = (e: KeyboardEvent) => {
    const list = items();
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); focusIndex(currentIndex() + 1); break;
      case 'ArrowUp': e.preventDefault(); focusIndex(currentIndex() - 1); break;
      case 'Home': e.preventDefault(); focusIndex(0); break;
      case 'End': e.preventDefault(); focusIndex(list.length - 1); break;
      case 'Tab': ctx.setOpen(false, { returnFocus: false }); break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const start = currentIndex() + 1;
          const lower = e.key.toLowerCase();
          const match = list.findIndex((el, i) => i >= start && (el.textContent ?? '').trim().toLowerCase().startsWith(lower));
          const found = match >= 0 ? match : list.findIndex((el) => (el.textContent ?? '').trim().toLowerCase().startsWith(lower));
          if (found >= 0) { e.preventDefault(); focusIndex(found); }
        }
    }
  };

  return (
    <Show when={presence.present()}>
      <Portal mount={config.portalMount()}>
        <div
          ref={(el) => {
            ctx.setMenu(el); presence.setRef(el);
            // Keyboard-open focuses the first item. setOpen() also attempts this
            // synchronously; this ref-time microtask re-asserts focus once the
            // menu node exists. Skip disabled items.
            if (ctx.openedViaKeyboard()) {
              queueMicrotask(() => firstMenuItem(el)?.focus());
            }
          }}
          id={ctx.menuId}
          role="menu"
          aria-labelledby={ctx.triggerId}
          tabindex={-1}
          data-expanded={presence.state() === 'open' ? '' : undefined}
          data-closed={presence.state() === 'closed' ? '' : undefined}
          onKeyDown={onKeyDown}
          style={{
            position: 'fixed', left: `${position.pos().x}px`, top: `${position.pos().y}px`,
            // The trigger's measured width, when tracking is on; the caller's
            // `min-w-*` class still floors it (used width = max(width, min-width)).
            width: triggerWidth() === undefined ? undefined : `${triggerWidth()}px`,
            // hide (without unmounting) when the trigger scrolls out of view
            visibility: position.hidden() ? 'hidden' : 'visible',
            'pointer-events': position.hidden() ? 'none' : undefined,
            // Inline rather than a class because the ceiling is the MINIMUM of the
            // themeable default and the room measured off the anchor; a class can only
            // hold one of the two. See `MENU_MAX_HEIGHT` and `viewportRoom`.
            'max-height': maxHeight(),
          }}
          class={cn(
            // A usable floor belongs HERE, not at each call site: a menu is content-sized,
            // so without a floor a consumer that renders <DropdownContent> directly (the
            // model switcher is the live case) gets rows with no slack — the trailing
            // check collapses onto its label. 15rem is the kit's menu width, the value
            // kai-menu used to declare at its own call site, now declared once, here. A
            // caller can still OVERRIDE it with its own `min-w-*` class; `cn` resolves the
            // conflict last-wins, so exactly one floor survives on any surface.
            //
            // And the CEILING beside it, because a floor with no ceiling is not
            // "content-sized", it is UNBOUNDED. This box is `position: fixed` with no
            // `width`, so it is shrink-to-fit: its used width is its content's
            // max-content, and max-content of a menu is the widest row's longest
            // unwrapped line. One long `note` row therefore sizes the WHOLE surface, and
            // every other row — block-level flex boxes — stretches to it. Measured on the
            // assistant block's section-label menu inside a 280px rail: a note row's
            // sentence hit 1208.9px of max-content, so the panel opened 1216.9 x 401px
            // with 1208.9px rows, 4.3x the rail it came from, with no `part` and no
            // custom property — the portaled box is in the element's shadow root, so a
            // consumer's stylesheet could not reach it at all.
            //
            // The cap binds THIS box and not the rows, because the rows are not the
            // driver in the direction that matters: they stretch to the panel, and what
            // set the panel was one row's max-content. Capping the rows would leave the
            // panel free to keep growing with the next long row.
            //
            // 24rem is 1.6x the floor: room for a label and its description line, the
            // same measure the empty-state content seam uses, and short of the width at
            // which a menu stops reading as a menu. It is a DEFAULT, not a policy — a
            // consumer with a different surface sets `--kai-dropdown-max-width` (a custom
            // property inherits, and the panel is portaled INTO the element's shadow root,
            // so setting it on `kai-menu` / `kai-dropdown` reaches the panel; a consumer
            // who overrode `portalMount` to `document.body` sets it on `:root` instead).
            // A caller can also override it per surface with its own `max-w-*` class.
            //
            // THE HEIGHT, the axis that was left unbounded. A width cap on a shrink-to-fit
            // box does not remove the box's freedom, it moves it: a wrapped row makes the
            // panel TALLER, and the panel was still free to be taller than the window. A
            // menu of the consumer's own data (the rail's chat list is one per conversation)
            // then runs off the bottom of the viewport with its own last rows below the
            // fold and no way to reach them — measured at 911px on a 33-row menu in a 560px
            // window, with the last row 386px past the bottom edge and nothing to scroll.
            //
            // So the ceiling is the VIEWPORT, never a typed pixel count: `100dvh` is the
            // window as the user actually has it (mobile URL bars included), so the same
            // declaration behaves on a laptop and on a short window. 2rem is the breathing
            // gap at the two edges, and it is a DEFAULT the consumer replaces whole —
            // `--kai-dropdown-max-height` takes any length or `calc()`, so a surface that
            // wants 60vh says so, and one that wants the old unbounded behavior sets
            // `none`. The custom property is the SAME seam as the width's for the same
            // reason (the panel is portaled into the element's shadow root and has no
            // `part`, so a consumer stylesheet cannot reach it any other way) — but NOT the
            // same property: a `max-width` in rem and a `max-height` derived from the
            // viewport are two different measurements, and one number for both axes would
            // mean a square surface.
            //
            // And it SCROLLS rather than clips: a menu whose last row is unreachable is
            // worse than a tall one, so the overflow is the surface's own, the same rows at
            // the same widths, reached by scrolling the box. A menu that fits is untouched —
            // `overflow-y: auto` shows no bar over content that does not overflow. The
            // ceiling itself is the inline `max-height` (see `MENU_MAX_HEIGHT`), not a class.
            'z-50 max-w-[var(--kai-dropdown-max-width,24rem)] min-w-[15rem] overflow-y-auto rounded-lg bg-card p-1 kai-elevation',
            'animate-in fade-in-0 zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95',
            props.class,
          )}
        >
          {props.children}
        </div>
      </Portal>
    </Show>
  );
}

export function DropdownItem(props: DropdownItemProps) {
  const ctx = useDropdown();
  const activate = () => {
    if (props.disabled) return;
    props.onSelect?.();
    ctx.setOpen(false);
  };
  return (
    <div
      role="menuitem"
      tabindex={-1}
      aria-disabled={props.disabled ? 'true' : undefined}
      onClick={activate}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } }}
      onPointerMove={(e) => { if (!props.disabled) (e.currentTarget as HTMLElement).focus(); }}
      class={cn(
        'flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors break-words',
        'hover:bg-muted focus:bg-muted',
        props.disabled && 'opacity-50 pointer-events-none',
        props.class,
      )}
    >
      <ItemLabel description={props.description}>{props.children}</ItemLabel>
    </div>
  );
}

/**
 * A thin, non-interactive divider between groups of items.
 * a11y: `role="separator"`, exposed to AT as a group boundary; not in the
 * roving-focus tab order (the `[role="menuitem"]` query skips it).
 */
export function DropdownSeparator(props: DropdownSeparatorProps) {
  return <div role="separator" class={cn('-mx-1 my-1 h-px bg-border', props.class)} />;
}

/**
 * A non-interactive section header.
 * a11y: a plain muted label: NOT a menuitem and NOT focusable, so roving focus
 * skips it; it labels the items that follow visually only (`select-none`).
 */
export function DropdownLabel(props: DropdownLabelProps) {
  return (
    <div class={cn('select-none px-2 py-1.5 text-xs font-medium text-muted-foreground break-words', props.class)}>
      {props.children}
    </div>
  );
}

/**
 * A non-interactive muted text row: a disabled group's REASON, not a command.
 * a11y: deliberately role-less, so it is not a menu item and the roving-focus
 * `[role="menuitem"]` query skips it, the same reason a separator sits outside it.
 */
export function DropdownNote(props: { children: JSX.Element; class?: string }) {
  return (
    <div class={cn('text-muted-foreground px-2 py-1.5 text-xs break-words', props.class)}>{props.children}</div>
  );
}

/**
 * A row's label, with an optional muted second line.
 *
 * Shared so every item kind stacks label and description identically. With no
 * `description` the children render UNWRAPPED (the fallback branch), which is what
 * keeps the DOM of every existing menu exactly as it was.
 *
 * Wrapping is the row's, not this span's: `break-words` on the row covers the label,
 * the description and an unbreakable token alike (overflow-wrap inherits), so a label
 * too long for the surface's capped width WRAPS: it is never truncated, never
 * ellipsised and never scrolls out of reach. A word longer than the cap breaks inside
 * the word rather than overflowing the panel.
 */
function ItemLabel(props: { children: JSX.Element; description?: string }) {
  return (
    <Show when={props.description} fallback={<>{props.children}</>}>
      <span class="flex min-w-0 flex-col items-start">
        <span class="flex min-w-0 items-center">{props.children}</span>
        <span class="text-muted-foreground mt-0.5 text-xs">{props.description}</span>
      </span>
    </Show>
  );
}

/** The trailing column's geometry, per control.
 *
 *  ONE place, because two copies that agree today are two copies that drift: the
 *  radio item and the checkbox item must reserve the IDENTICAL column so their rows
 *  line up, and that is asserted.
 *
 *  The geometry is the CONTROL's, not one size for both: the checkmark needs a 16px
 *  box behind the same 16px of reserved separation the menu facade's shortcut slot
 *  uses (`w-8 pl-4`), while the themed Switch is 36x20 (`h-5 w-9`) and `shrink-0`, so
 *  a column sized for the checkmark has it overflow by ~20px across and 2px above
 *  and below. In the switch column `w-11 pl-2` is exactly the switch's 36px of
 *  content and `h-5` is its 20px.
 *
 *  The width is fixed in both variants, so a checked row and an unchecked one reserve
 *  the same space rather than leaving the gap to whatever slack the surface happens
 *  to have. `ml-auto` means only the span's LEFT edge moves with the width, so every
 *  trailing glyph in a menu that mixes checks and switches still ends flush against
 *  the row's trailing edge. */
const TRAILING_COLUMN = {
  check: 'ml-auto flex h-4 w-8 shrink-0 items-center justify-center pl-4 text-muted-foreground',
  switch: 'ml-auto flex h-5 w-11 shrink-0 items-center justify-center pl-2 text-muted-foreground',
} as const;

/**
 * A togglable menu item.
 * a11y: `role="menuitemcheckbox"` + `aria-checked`. Activating fires `onSelect`
 * but KEEPS THE MENU OPEN (the consumer flips `checked`). The Check sits at the
 * TRAILING edge (toggle-style) so the item's leading content, an icon when
 * present, aligns with the plain items above it instead of being pushed in by a
 * reserved leading check column.
 */
export function DropdownCheckboxItem(props: DropdownCheckboxItemProps) {
  const activate = () => {
    if (props.disabled) return;
    props.onSelect?.(); /* stay open — consumer owns `checked` */
  };
  return (
    <div
      role="menuitemcheckbox"
      aria-checked={props.checked ? 'true' : 'false'}
      tabindex={-1}
      aria-disabled={props.disabled ? 'true' : undefined}
      onClick={activate}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } }}
      onPointerMove={(e) => { if (!props.disabled) (e.currentTarget as HTMLElement).focus(); }}
      class={cn(
        'flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors break-words',
        'hover:bg-muted focus:bg-muted',
        props.disabled && 'opacity-50 pointer-events-none',
        props.class,
      )}
    >
      <ItemLabel description={props.description}>{props.children}</ItemLabel>
      {/* Trailing column; see TRAILING_COLUMN for why the switch variant differs. */}
      <span class={TRAILING_COLUMN[props.control === 'switch' ? 'switch' : 'check']}>
        <Show when={props.checked}>
          <Show when={props.control === 'switch'} fallback={<Check class="size-4" aria-hidden="true" />}>
            {/* DECORATION. The row owns role="menuitemcheckbox" and aria-checked; a
                real focusable switch in here would be nested interactive content and
                would give AT two controls for one state. So it is hidden from the
                accessibility tree and removed from the tab order, and the row is
                what activates. */}
            <Switch checked aria-hidden="true" tabindex="-1" class="pointer-events-none" />
          </Show>
        </Show>
      </span>
    </div>
  );
}

/**
 * A single-select (radio) menu item.
 * a11y: `role="menuitemradio"` + `aria-checked`. Behaves like the checkbox item:
 * activating fires `onSelect` but KEEPS THE MENU OPEN (the consumer moves the
 * selection within the group). The Check sits at the TRAILING edge so leading
 * content aligns with plain items. Group membership is the consumer's concern;
 * this primitive just renders the selected state and reports the click.
 */
export function DropdownRadioItem(props: DropdownRadioItemProps) {
  const activate = () => {
    if (props.disabled) return;
    props.onSelect?.(); /* stay open — consumer owns the group selection */
  };
  return (
    <div
      role="menuitemradio"
      aria-checked={props.checked ? 'true' : 'false'}
      tabindex={-1}
      aria-disabled={props.disabled ? 'true' : undefined}
      onClick={activate}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } }}
      onPointerMove={(e) => { if (!props.disabled) (e.currentTarget as HTMLElement).focus(); }}
      class={cn(
        'flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors break-words',
        'hover:bg-muted focus:bg-muted',
        props.disabled && 'opacity-50 pointer-events-none',
        props.class,
      )}
    >
      <ItemLabel description={props.description}>{props.children}</ItemLabel>
      {/* The check column: a radio item has no `control`, so it takes the checkmark's
          geometry — the SAME constant the checkbox item uses, so the two line up. */}
      <span class={TRAILING_COLUMN.check}>
        <Show when={props.checked}><Check class="size-4" aria-hidden="true" /></Show>
      </span>
    </div>
  );
}

// ── Submenus ────────────────────────────────────────────────────────────────

interface DropdownSubCtx {
  open: Accessor<boolean>;
  setOpen: (v: boolean, opts?: { viaKeyboard?: boolean; returnFocus?: boolean }) => void;
  triggerId: string;
  menuId: string;
  setTrigger: (el: HTMLElement) => void;
  setMenu: (el: HTMLElement) => void;
  trigger: Accessor<HTMLElement | undefined>;
  menu: Accessor<HTMLElement | undefined>;
  openedViaKeyboard: Accessor<boolean>;
  /** clear any pending close timer (used when the pointer re-enters trigger or content) */
  cancelClose: () => void;
  /** schedule a deferred close, tolerating a pointer crossing the gap to the submenu */
  scheduleClose: () => void;
}
const SubCtx = createContext<DropdownSubCtx>();
const useDropdownSub = () => {
  const c = useContext(SubCtx);
  if (!c) throw new Error('DropdownSub parts must be used within <DropdownSub>');
  return c;
};

/**
 * A nested menu group. Mirrors the `Dropdown` context shape with its own open
 * signal + trigger/content refs, plus a small close-delay so a pointer can cross
 * the gap from the trigger to the submenu without it snapping shut.
 *
 * The submenu is tied to its PARENT open state: when the parent menu closes
 * (Escape/outside-click/select), `useDismiss` on the parent unmounts the whole
 * content tree, which tears this provider down and drops the sub with it.
 */
export function DropdownSub(props: DropdownSubProps) {
  const [open, setOpenSig] = createSignal(false);
  const [viaKb, setViaKb] = createSignal(false);
  const [trigger, setTrigger] = createSignal<HTMLElement>();
  const [menu, setMenu] = createSignal<HTMLElement>();
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  const cancelClose = () => { if (closeTimer) { clearTimeout(closeTimer); closeTimer = undefined; } };
  const setOpen = (v: boolean, opts?: { viaKeyboard?: boolean; returnFocus?: boolean }) => {
    cancelClose();
    setViaKb(!!opts?.viaKeyboard);
    setOpenSig(v);
    if (v) {
      if (opts?.viaKeyboard) {
        queueMicrotask(() => firstMenuItem(menu())?.focus());
        firstMenuItem(menu())?.focus();
      }
    } else if (opts?.returnFocus !== false) {
      const el = trigger();
      el?.focus();
      queueMicrotask(() => el?.focus());
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer = setTimeout(() => setOpen(false), 120);
  };
  onCleanup(cancelClose);
  return (
    <SubCtx.Provider value={{
      open, setOpen, triggerId: createUniqueId(), menuId: createUniqueId(),
      setTrigger, setMenu, trigger, menu, openedViaKeyboard: viaKb,
      cancelClose, scheduleClose,
    }}>
      {props.children}
    </SubCtx.Provider>
  );
}

/**
 * The item that opens a submenu.
 * a11y: `role="menuitem"` + `aria-haspopup="menu"` + `aria-expanded`, trailing
 * ChevronRight. Opens on pointerenter, click, ArrowRight, and Enter/Space;
 * keyboard-open also moves focus into the sub's first item. ArrowRight/Enter are
 * swallowed so the parent menu doesn't also act on them.
 */
export function DropdownSubTrigger(props: DropdownSubTriggerProps) {
  const sub = useDropdownSub();
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      sub.setOpen(true, { viaKeyboard: true });
    }
  };
  return (
    <div
      ref={sub.setTrigger}
      id={sub.triggerId}
      role="menuitem"
      tabindex={-1}
      aria-haspopup="menu"
      aria-expanded={sub.open()}
      aria-controls={sub.open() ? sub.menuId : undefined}
      onClick={() => sub.setOpen(!sub.open())}
      onKeyDown={onKeyDown}
      onPointerEnter={() => { sub.cancelClose(); sub.setOpen(true); }}
      onPointerLeave={() => sub.scheduleClose()}
      onPointerMove={(e) => (e.currentTarget as HTMLElement).focus()}
      class={cn(
        'flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors break-words',
        'hover:bg-muted focus:bg-muted data-[expanded]:bg-muted',
        props.class,
      )}
      data-expanded={sub.open() ? '' : undefined}
    >
      <ItemLabel description={props.description}>{props.children}</ItemLabel>
      <ChevronRight class="ml-auto size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </div>
  );
}

/**
 * The submenu surface, same portal/positioning/roving-focus core as
 * DropdownContent, anchored `right-start` off its trigger.
 * a11y: ArrowLeft and Escape close the sub and RETURN FOCUS to the trigger;
 * ArrowUp/Down/Home/End rove within; typeahead included (matches DropdownContent).
 * Keyboard-open focuses the first item.
 */
export function DropdownSubContent(props: DropdownSubContentProps) {
  const sub = useDropdownSub();
  const parent = useDropdown();
  const config = useChatConfig();
  const presence = createPresence(sub.open);
  const position = usePosition(sub.trigger, sub.menu, {
    placement: 'right-start',
    gutter: SUB_GUTTER,
    // Sub trigger removed from the DOM -> close so the submenu portal doesn't orphan.
    onDisconnect: () => sub.setOpen(false, { returnFocus: false }),
  });
  // Escape/ArrowLeft are handled by onKeyDown below (stopPropagation keeps them
  // local to the sub). Outside-pointer dismiss is handled by the PARENT's
  // useDismiss (whose refs include the registered submenu surface). A separate
  // useDismiss here would double-fire Escape because document listeners run
  // after stopPropagation on the element, not on the document.

  const items = () => menuItems(sub.menu());
  // The same two-part ceiling with the submenu's own geometry. A submenu is a SIDE
  // placement: `right-start`/`left-start` pins its top to the row's top — which is the
  // positioner's own `y`, the gutter between them being horizontal — and an `end` fallback
  // pins its bottom to the row's bottom, where the offset is height-dependent and the room
  // has to come from the anchor. Either way it is the room on ONE side, not the larger of
  // two. See `viewportRoom`.
  const maxHeight = () => {
    const { y, placement } = position.pos();
    const rect = sub.trigger()?.getBoundingClientRect();
    if (!rect) return MENU_MAX_HEIGHT;
    const room = placement.endsWith('-end')
      ? viewportRoom('up', rect.bottom)
      : viewportRoom('down', y);
    return `min(${MENU_MAX_HEIGHT}, ${room}px)`;
  };
  const focusIndex = (i: number) => {
    const list = items();
    if (!list.length) return;
    const idx = ((i % list.length) + list.length) % list.length;
    list[idx].focus();
  };
  const currentIndex = () => items().findIndex((el) => el === activeMenuItem(sub.menu()));

  const onKeyDown = (e: KeyboardEvent) => {
    const list = items();
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); focusIndex(currentIndex() + 1); break;
      case 'ArrowUp': e.preventDefault(); focusIndex(currentIndex() - 1); break;
      case 'Home': e.preventDefault(); focusIndex(0); break;
      case 'End': e.preventDefault(); focusIndex(list.length - 1); break;
      case 'ArrowLeft': e.preventDefault(); e.stopPropagation(); sub.setOpen(false, { returnFocus: true }); break;
      case 'Escape': e.preventDefault(); e.stopPropagation(); sub.setOpen(false, { returnFocus: true }); break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const start = currentIndex() + 1;
          const lower = e.key.toLowerCase();
          const match = list.findIndex((el, i) => i >= start && (el.textContent ?? '').trim().toLowerCase().startsWith(lower));
          const found = match >= 0 ? match : list.findIndex((el) => (el.textContent ?? '').trim().toLowerCase().startsWith(lower));
          if (found >= 0) { e.preventDefault(); focusIndex(found); }
        }
    }
  };

  return (
    <Show when={presence.present()}>
      <Portal mount={config.portalMount()}>
        <div
          ref={(el) => {
            sub.setMenu(el); presence.setRef(el);
            // Tell the parent menu this surface is part of its tree (outside-click).
            const unregister = parent.registerSubMenu(el);
            onCleanup(unregister);
            if (sub.openedViaKeyboard()) {
              queueMicrotask(() => firstMenuItem(el)?.focus());
            }
          }}
          id={sub.menuId}
          role="menu"
          aria-labelledby={sub.triggerId}
          tabindex={-1}
          data-expanded={presence.state() === 'open' ? '' : undefined}
          data-closed={presence.state() === 'closed' ? '' : undefined}
          onKeyDown={onKeyDown}
          // Keep the sub open while the pointer is over it (cancel a pending close
          // scheduled by the trigger's pointerleave); re-arm the close on exit.
          onPointerEnter={() => sub.cancelClose()}
          onPointerLeave={() => sub.scheduleClose()}
          style={{
            position: 'fixed', left: `${position.pos().x}px`, top: `${position.pos().y}px`,
            visibility: position.hidden() ? 'hidden' : 'visible',
            'pointer-events': position.hidden() ? 'none' : undefined,
            // Two-part ceiling; see the call in `DropdownContent` for why it is inline.
            'max-height': maxHeight(),
          }}
          class={cn(
            // Same ceiling as the parent surface, and the same custom properties: a submenu
            // is the same kind of box (fixed, shrink-to-fit, portaled out of its host's
            // box) rendered from the same item ladder, so a long `note` row or an
            // unbreakable label widens it exactly the way it widened the parent before the
            // cap existed, and a long item list makes it taller than the window the same
            // way. 8rem stays the floor, and the ceiling is the same two-part one.
            'z-50 max-w-[var(--kai-dropdown-max-width,24rem)] min-w-[8rem] overflow-y-auto rounded-lg bg-card p-1 kai-elevation',
            'animate-in fade-in-0 zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95',
            props.class,
          )}
        >
          {props.children}
        </div>
      </Portal>
    </Show>
  );
}
