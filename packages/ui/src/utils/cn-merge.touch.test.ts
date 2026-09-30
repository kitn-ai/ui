import { describe, it, expect } from 'vitest';
import { extendTailwindMerge } from 'tailwind-merge';
import { mergeClassList } from './cn-merge';

// touch-action semantics. `touch-pan-x`, `touch-pan-y` and `touch-pinch-zoom` compose;
// `touch-none`, `touch-auto` and `touch-manipulation` conflict with them. The subtle half:
// a class that is itself dropped by a LATER class removes nothing, so pan-x survives in
// `pan-x none pinch-zoom` (pinch-zoom drops `none`, and `none` never got to drop pan-x).
const oracle = extendTailwindMerge({});

const CASES: [input: string, expected: string][] = [
  ['touch-pan-x touch-pan-y touch-pinch-zoom', 'touch-pan-x touch-pan-y touch-pinch-zoom'],
  ['touch-pan-x touch-none', 'touch-none'],
  ['touch-none touch-pan-x', 'touch-pan-x'],
  ['touch-pan-x touch-none touch-pinch-zoom', 'touch-pan-x touch-pinch-zoom'],
  ['grid-cols-1 touch-pan-x text-nowrap touch-none touch-pinch-zoom', 'grid-cols-1 touch-pan-x text-nowrap touch-pinch-zoom'],
  ['touch-pan-y touch-auto touch-pan-x', 'touch-pan-y touch-pan-x'],
  ['touch-pan-x touch-manipulation touch-pan-y', 'touch-pan-x touch-pan-y'],
  ['touch-pan-x touch-pan-left', 'touch-pan-left'],
];

describe('cn-merge touch-action', () => {
  it.each(CASES)('%s', (input, expected) => {
    expect(mergeClassList(input)).toBe(expected);
    // the expectations are tailwind-merge's own, not ours
    expect(oracle(input)).toBe(expected);
  });
});
