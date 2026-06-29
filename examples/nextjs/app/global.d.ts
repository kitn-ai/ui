// Type the intrinsic `<kai-*>` JSX tags this example renders directly.
//
// `@kitn.ai/ui/elements` augments `HTMLElementTagNameMap` (so `querySelector`
// is typed) but NOT React's `JSX.IntrinsicElements`, so we add the handful of
// tags we use here. React 19 nests the JSX namespace under the `react` module.
import type { DetailedHTMLProps, HTMLAttributes, Ref } from 'react';
import type { KaiButtonElement, KaiConversationsElement } from '@kitn.ai/ui/elements';

type KaiTag<El> = DetailedHTMLProps<HTMLAttributes<El>, El> & { ref?: Ref<El> };

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'kai-button': KaiTag<KaiButtonElement> & {
        variant?: string;
        size?: string;
        icon?: string;
        label?: string;
      };
      'kai-conversations': KaiTag<KaiConversationsElement> & {
        'active-id'?: string;
      };
    }
  }
}
