/**
 * "Does this subtree already offer the keyboard a way in?" Shared by the two
 * triggers that would otherwise add a SECOND tab stop on top of a focusable child
 * (`HoverCardTrigger`, `LightboxTrigger`).
 *
 * Anything the platform puts in the tab order by default, plus anything a consumer
 * opted in with `tabindex`. `tabindex="-1"` is deliberately excluded: it is
 * programmatically focusable but the Tab key skips it, so a trigger containing only
 * such an element still needs a stop of its own.
 */
export const FOCUSABLE_CHILD =
  'a[href],button,input,select,textarea,summary,[contenteditable=""],[contenteditable="true"],[tabindex]:not([tabindex^="-"])';

/**
 * The keyboard-reachable control an event is happening INSIDE, if any. The one
 * copy of the rule both conversation-row activation paths apply: the container's
 * `createConversationItemsController` (conversation-list.tsx) and a STANDALONE
 * row's own body handlers (conversation-item.tsx).
 *
 * `boundary` is the element whose handler would act. `undefined` means it may:
 * the event's innermost target IS the boundary (the boundary is a control in its
 * own right, which a click on a `tabindex`ed `role="button"` row body is), or
 * the boundary is not on the path at all. Otherwise the result is the innermost
 * node STRICTLY inside the boundary that matches `FOCUSABLE_CHILD`.
 *
 * The COMPOSED PATH, not `closest()`: `closest()` stops at the shadow boundary,
 * so a control nested in another shadow root is invisible to an ancestor walk and
 * the row eats the key the control owns. Cutting the scan AT the boundary is
 * load-bearing the other way too: a `tabindex` above it (ScrollArea's viewport
 * carries `tabindex="0"`) is not a control the user is in, and letting one
 * through silences the row entirely.
 */
export const interactiveInside = (path: EventTarget[], boundary: Element): Element | undefined => {
  const at = path.indexOf(boundary);
  if (at <= 0) return undefined;
  return path
    .slice(0, at)
    .find((n): n is Element => n instanceof Element && n.matches(FOCUSABLE_CHILD));
};

/**
 * Direct descendants and slot-assigned light DOM both count. Slotted content is
 * checked through `assignedElements()`, because a `<slot>` in the shadow tree
 * contains none of the light-DOM nodes it projects: the `kai-hover-card` and
 * `kai-lightbox` facades wrap a bare `<slot />`, so without this branch every use
 * of those elements would be told its children are inert.
 *
 * WHEN this runs is as load-bearing as what it asks. At ref time the facade's
 * trigger contains `<slot></slot>` with nothing assigned yet, so a single call
 * from the ref answers "inert" for a slot that is about to receive a focusable
 * `<a>`, and the trigger stamps a second tab stop on top of the child's. That is
 * the very regression the `assignedElements()` branch was added to prevent,
 * reintroduced by timing rather than by logic. Measured with a real Tab key: 4
 * stops across a 3-widget fixture. So the caller re-runs this on `slotchange`;
 * see the callers.
 */
export const hasFocusableChild = (root: HTMLElement): boolean => {
  if (root.querySelector(FOCUSABLE_CHILD)) return true;
  return Array.from(root.querySelectorAll('slot')).some((slot) =>
    (slot as HTMLSlotElement).assignedElements().some(
      (el) => el.matches(FOCUSABLE_CHILD) || el.querySelector(FOCUSABLE_CHILD),
    ),
  );
};
