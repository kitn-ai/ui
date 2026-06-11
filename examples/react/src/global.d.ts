/**
 * JSX intrinsic-element declarations for kitn-chat web components.
 *
 * React resolves JSX tag types from React.JSX.IntrinsicElements. Custom
 * elements are not in that map by default, so TypeScript would complain:
 *   "Property 'kitn-chat' does not exist on type JSX.IntrinsicElements"
 *
 * We extend the interface here to accept any attribute (string) or a ref
 * (React.Ref<HTMLElement>). All component *properties* (messages, groups, …)
 * are set imperatively via ref + useEffect, not as JSX attributes, so we
 * only need to allow the standard HTML attributes plus style/ref/className.
 */

import type React from 'react';

type CustomElementProps = React.HTMLAttributes<HTMLElement> & {
  ref?: React.Ref<HTMLElement>;
  style?: React.CSSProperties;
  // Allow any extra string attributes that web components may expose.
  [key: string]: unknown;
};

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kitn-chat': CustomElementProps;
      'kitn-conversation-list': CustomElementProps;
      'kitn-prompt-input': CustomElementProps;
    }
  }
}
