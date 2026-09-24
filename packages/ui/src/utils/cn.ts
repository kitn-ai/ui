import { clsx, type ClassValue } from 'clsx';
import { mergeClassList } from './cn-merge';

/**
 * Join class values and resolve Tailwind conflicts, last-wins.
 *
 * `clsx` flattens the `ClassValue` API (strings, arrays, objects, `null`/
 * `undefined`/`false`); `mergeClassList` in `./cn-merge` then drops the classes
 * an earlier one in the same conflict group overrides.
 *
 * The kit used to run `tailwind-merge` here, extended with a `font-size` group
 * for the `@theme` tokens in theme.css (`text-micro`/`text-caption`/`text-meta`/
 * `text-compact`/`text-body`/`text-title`). Without that group `tailwind-merge`
 * bucketed `text-body` with text COLORS and dropped a real color
 * (`text-transparent`, `text-foreground`, …) whenever both appeared in one call,
 * which silently broke TextShimmer inside the web components: the element adds
 * `text-body`, dropping `text-transparent`, so the gradient stayed hidden behind
 * opaque text. `./cn-merge` carries that aliasing natively: its `font-size` key
 * holds the kit's six names AND Tailwind's ladder, because theme.css re-points
 * the ladder at the same tokens (`text-xs` ≡ `text-meta`, `text-sm` ≡
 * `text-body`, `text-base` ≡ `text-title`), so `cn('text-sm', 'text-body')` must
 * emit ONE class and the later semantic name must win.
 *
 * `tailwind-merge` is no longer imported at runtime; it stays a devDependency as
 * the ORACLE `src/utils/cn-merge.drift.test.ts` diffs this merger against on
 * every run, over the classes the kit emits, `tailwind-merge`'s own shipped
 * class corpus, and random tuples. A hand-rolled table with a silent failure
 * mode is worse than a maintained dependency at any size, so that test is the
 * condition for this file existing at all.
 */
export function cn(...inputs: ClassValue[]): string {
  return mergeClassList(clsx(inputs));
}
