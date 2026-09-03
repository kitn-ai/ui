/**
 * The add-to-bag flight: a clone of the product photograph travels from where
 * it sits to the bag button, shrinking as it goes.
 *
 * It is decoration, so it never blocks the add itself and it resolves even
 * when it does nothing -- under reduced motion, with no bag on screen, or in
 * a browser without the Web Animations API.
 */
const DURATION = 620;

export function flyToCart(from: HTMLElement, to: HTMLElement): Promise<void> {
  if (
    typeof window === 'undefined' ||
    typeof from.animate !== 'function' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return Promise.resolve();
  }

  const start = from.getBoundingClientRect();
  const end = to.getBoundingClientRect();
  if (!start.width || !end.width) return Promise.resolve();

  const clone = from.cloneNode(true) as HTMLElement;
  Object.assign(clone.style, {
    position: 'fixed',
    left: `${start.left}px`,
    top: `${start.top}px`,
    width: `${start.width}px`,
    height: `${start.height}px`,
    margin: '0',
    borderRadius: '14px',
    objectFit: 'cover',
    zIndex: '90',
    pointerEvents: 'none',
    filter: 'grayscale(1)',
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(clone);

  // Scale to the bag rather than to zero: the photograph should look like it
  // is being put somewhere, not like it is being deleted.
  const scale = Math.max(end.width / start.width, 0.06);
  const dx = end.left + end.width / 2 - (start.left + start.width / 2);
  const dy = end.top + end.height / 2 - (start.top + start.height / 2);

  const animation = clone.animate(
    [
      { transform: 'translate(0,0) scale(1)', opacity: 1, offset: 0 },
      // A slight lift through the middle, so it arcs instead of sliding.
      {
        transform: `translate(${dx * 0.55}px, ${dy * 0.42 - 44}px) scale(${
          (1 + scale) / 2
        })`,
        opacity: 0.95,
        offset: 0.55,
      },
      {
        transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
        opacity: 0.15,
        offset: 1,
      },
    ],
    { duration: DURATION, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)', fill: 'forwards' },
  );

  // Race the animation against a hard cap. `animation.finished` is NOT
  // guaranteed to settle: Chrome pauses animations in a tab that is not
  // visible, so a background tab leaves the promise pending forever. Anything
  // awaiting the flight -- opening the bag, for one -- would hang with it.
  // A decoration must never be able to strand its caller.
  const settled = Promise.race([
    animation.finished.catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, DURATION + 120)),
  ]);

  return settled.then(() => {
    animation.cancel();
    clone.remove();
  });
}
