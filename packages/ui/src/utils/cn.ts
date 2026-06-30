import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The kit defines custom font-size utilities via @theme tokens in theme.css:
// text-caption / text-meta / text-body / text-title. tailwind-merge has no way
// to know these are font sizes, so by default it buckets e.g. `text-body` with
// text COLORS and drops a real color (`text-transparent`, `text-foreground`, …)
// whenever both appear in the same cn() call — which silently broke TextShimmer
// inside the web components (the element adds `text-body`, dropping
// `text-transparent`, so the gradient stayed hidden behind opaque text).
//
// Register them in the `font-size` group so they conflict only with other font
// sizes (text-xs/sm/base/lg/…) and never with text colors.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['caption', 'meta', 'body', 'title'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
