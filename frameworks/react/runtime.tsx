// Runtime for the generated React wrappers (react/index.tsx). Renders the custom
// element and bridges the React world to it: rich props are assigned as DOM
// *properties* (via a ref, so arrays/objects pass through unstringified), and
// `on<Event>` handlers are wired as `addEventListener` for the element's
// CustomEvents. Layout props (className/style/id) pass straight through.
import {
  createElement,
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ForwardRefExoticComponent,
  type PropsWithoutRef,
  type RefAttributes,
} from 'react';

export interface KitnBaseProps {
  /** Color mode (`auto` follows prefers-color-scheme). */
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  style?: CSSProperties;
  id?: string;
}

export function createKitnComponent<P extends KitnBaseProps>(
  tagName: string,
  /** DOM-property names to assign from props (incl. `theme`). */
  propNames: readonly string[],
  /** Map of React handler prop → DOM event name, e.g. `{ onMessageaction: 'messageaction' }`. */
  eventMap: Record<string, string>,
): ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<HTMLElement>> {
  const eventEntries = Object.entries(eventMap);

  const Component = forwardRef<HTMLElement, P>((props, ref) => {
    const elRef = useRef<HTMLElement | null>(null);
    useImperativeHandle(ref, () => elRef.current as HTMLElement, []);
    const p = props as Record<string, unknown>;

    // Assign rich props as DOM properties every render (idempotent).
    useLayoutEffect(() => {
      const el = elRef.current;
      if (!el) return;
      for (const name of propNames) {
        if (name in p && p[name] !== undefined) (el as unknown as Record<string, unknown>)[name] = p[name];
      }
    });

    // Wire CustomEvent listeners.
    useLayoutEffect(() => {
      const el = elRef.current;
      if (!el) return;
      const added: Array<[string, EventListener]> = [];
      for (const [reactName, domName] of eventEntries) {
        const handler = p[reactName];
        if (typeof handler === 'function') {
          const fn: EventListener = (e) => (handler as (e: Event) => void)(e);
          el.addEventListener(domName, fn);
          added.push([domName, fn]);
        }
      }
      return () => added.forEach(([n, fn]) => el.removeEventListener(n, fn));
    });

    return createElement(tagName, {
      ref: elRef,
      className: p.className as string | undefined,
      style: p.style as CSSProperties | undefined,
      id: p.id as string | undefined,
    });
  });

  Component.displayName = tagName;
  return Component as ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<HTMLElement>>;
}
