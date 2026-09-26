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
