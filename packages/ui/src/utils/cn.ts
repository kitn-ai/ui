import { clsx, type ClassValue } from 'clsx';
import { mergeClassList } from './cn-merge';

/**
 * Join class values and resolve Tailwind conflicts, last-wins: `clsx` flattens the
 * `ClassValue` API (strings, arrays, objects, `null`/`undefined`/`false`) and
 * `mergeClassList` in `./cn-merge` drops the classes an earlier one in the same conflict
 * group overrides.
 *
 * The kit used to run `tailwind-merge` here, extended with a `font-size` group for the
 * `@theme` tokens; without that group it bucketed `text-body` with text COLORS and dropped a
 * real colour whenever both appeared in one call, which silently broke TextShimmer inside the
 * web components (the element adds `text-body`, dropping `text-transparent`, so the gradient
 * stayed hidden behind opaque text). `./cn-merge` carries that aliasing natively: its
 * `font-size` key holds the kit's six names AND Tailwind's ladder, because theme.css
 * re-points the ladder at the same tokens.
 *
 * `tailwind-merge` is no longer imported at runtime; it stays a devDependency as the ORACLE
 * `src/utils/cn-merge.drift.test.ts` diffs this merger against on every run. A hand-rolled
 * table with a silent failure mode is worse than a maintained dependency, so that test is the
 * condition for this file existing at all.
 */
export function cn(...inputs: ClassValue[]): string {
  return mergeClassList(clsx(inputs));
}
