/** Observe an element's content height; invoke `onHeight` when it changes by more than
 *  THRESHOLD px (hysteresis kills sub-pixel oscillation — H-J). Returns a disposer. */
const THRESHOLD = 1;
export function observeContentHeight(el: Element, onHeight: (height: number) => void): () => void {
  let last = -1;
  const ro = new ResizeObserver((entries) => {
    const h = entries[entries.length - 1]?.contentRect.height ?? el.getBoundingClientRect().height;
    if (last < 0 || Math.abs(h - last) > THRESHOLD) { last = h; onHeight(h); }
  });
  ro.observe(el);
  return () => ro.disconnect();
}
