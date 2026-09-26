/**
 * Text metrics that more than one primitive needs to agree on.
 *
 * One question, and both of its callers need the same answer to it: how tall is
 * one line of this element's text? `use-auto-resize` floors an empty field at that
 * height, and `composer-expansion` compares content against it to decide whether
 * the composer's text has wrapped. A second answer here is a second thing to keep
 * in step, and the two drifted within a day of each other: one recovered CSS's
 * `normal` keyword and the other read it as zero.
 *
 * What stays with each caller is what it does with the number, because those are
 * different BOXES: `use-auto-resize` adds the element's own vertical padding and
 * border to reach the border-box height it writes, while `composer-expansion`
 * compares against an observed CONTENT height. Adding the wrong one is silent, so
 * the arithmetic does not live here.
 */

/** The font size assumed when an element's computed `font-size` is unreadable.
 *  The kit's own prose default, so an unstyled editable and a themed one derive
 *  the same line height. */
const FALLBACK_FONT_SIZE_PX = 14;

/** CSS's own ratio for `line-height: normal`: the used value is `font-size × 1.2`. */
const NORMAL_LINE_HEIGHT_FACTOR = 1.2;

/**
 * An element's line height in px.
 *
 * `getComputedStyle` resolves `line-height: normal` to the literal string
 * `"normal"`, which `parseFloat` reads as `NaN` rather than as a length, and some
 * environments (jsdom among them) report an empty string for the same fact. Both
 * mean the keyword, whose used value is the font size times
 * `NORMAL_LINE_HEIGHT_FACTOR`.
 *
 * THE FALLBACK IS WHY THIS FUNCTION EXISTS. A caller that stores an unreadable line
 * height as zero stops responding to content and says nothing about it: zero is not
 * a small threshold, it is the ABSENCE of one, because every comparison against it
 * has the same answer. That is exactly how the composer came to be stuck in one
 * layout with no way to expand.
 *
 * It does NOT override an explicit zero. An element that computes one asked for it,
 * and answering with a font-size guess would invent a length its author rejected; a
 * non-positive answer is the caller's to notice.
 */
export function resolveLineHeight(el: Element): number {
  const cs = getComputedStyle(el);
  const measured = Number.parseFloat(cs.lineHeight);
  // `Number.isNaN`, NOT `> 0`: an element that explicitly computes a zero line
  // height is asking for one, and answering with a font-size guess would invent a
  // length its author rejected. A non-positive result is the caller's to notice,
  // and the composer's expansion rule already fails closed on it.
  if (!Number.isNaN(measured)) return measured;
  return (Number.parseFloat(cs.fontSize) || FALLBACK_FONT_SIZE_PX) * NORMAL_LINE_HEIGHT_FACTOR;
}
