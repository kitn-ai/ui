/**
 * What counts as a hover background, and where. Pure (no DOM, no fs), so the jsdom unit project can
 * import it and pin every spelling in tests/primitives/hover-coverage.test.ts.
 *
 * A class token is a hover background when it carries a HOVER modifier and a `bg-` utility, in any
 * spelling Tailwind accepts: `hover:`, `group-hover:`, `group-hover/name:`, `peer-hover:`, an
 * arbitrary `[&:hover]:` / `[&_x:hover]:`, with further variants between the modifier and the utility
 * (`hover:not-disabled:`, `hover:data-[open]:`), the important forms (`!bg-`, `bg-x!`), and the v4
 * paren form `bg-(--x)`. The regex is deliberately UNANCHORED on the left, so a token opened by `(`,
 * `${`, a quote or a backtick still counts, and it cannot cross whitespace, so `hover:text-x bg-y` does not.
 */
const HOVER_MODIFIER = String.raw`(?:(?:group-|peer-)?hover(?:\/[\w.-]+)?:|\[&[^\]\s]*:hover[^\]\s]*\]:)`;
const HOVER_BG_CLASS = new RegExp(`${HOVER_MODIFIER}(?:[^\\s'"\`]*:)?!?bg-`);

export function hasHoverBackground(source: string): boolean {
  return HOVER_BG_CLASS.test(source);
}

/** Directories scanned, relative to packages/ui. */
export const SCAN_ROOTS = ['src/components'];
/** Source extensions scanned. Stories and tests are not shipped UI. */
export const SCAN_FILE = /\.tsx?$/;
export const SCAN_SKIP = /\.(stories|test)\.tsx?$|\.d\.ts$/;
