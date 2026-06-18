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
  type ReactNode,
  type RefAttributes,
} from 'react';

export interface WebComponentProps {
  /** Color mode (`auto` follows prefers-color-scheme). */
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  style?: CSSProperties;
  id?: string;
  /** Light-DOM children passed through to the element (slots). */
  children?: ReactNode;
}

export function createWebComponent<P extends WebComponentProps>(
  tagName: string,
  /** DOM-property names to assign from props (incl. `theme`). */
  propNames: readonly string[],
  /** Map of React handler prop → DOM event name, e.g. `{ onMessageAction: 'kai-message-action' }`. */
  eventMap: Record<string, string>,
): ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<HTMLElement>> {
  const eventEntries = Object.entries(eventMap);

  const Component = forwardRef<HTMLElement, P>((props, ref) => {
    const elRef = useRef<HTMLElement | null>(null);
    useImperativeHandle(ref, () => elRef.current as HTMLElement, []);
    const p = props as Record<string, unknown>;

    // Hold the latest handlers in a ref so the registered listeners always call
    // the current handler (no stale closures) without re-binding on every render.
    const handlersRef = useRef<Record<string, unknown>>({});
    for (const reactName of Object.keys(eventMap)) handlersRef.current[reactName] = p[reactName];

    // Assign rich props as DOM properties every render (idempotent). Arrays and
    // objects pass through unstringified; booleans become real boolean
    // properties so the element's `flag()` reads them. Updated props re-assign
    // because this effect runs after every render.
    useLayoutEffect(() => {
      const el = elRef.current;
      if (!el) return;
      for (const name of propNames) {
        if (name in p && p[name] !== undefined) (el as unknown as Record<string, unknown>)[name] = p[name];
      }
    });

    // Wire CustomEvent listeners ONCE per element. Each stable listener reads the
    // latest handler from handlersRef, so changing a handler's identity across
    // renders takes effect without add/remove churn, and listeners are removed on
    // unmount (no leaks).
    useLayoutEffect(() => {
      const el = elRef.current;
      if (!el) return;
      const added: Array<[string, EventListener]> = [];
      for (const [reactName, domName] of eventEntries) {
        const fn: EventListener = (e) => {
          const handler = handlersRef.current[reactName];
          if (typeof handler === 'function') (handler as (e: Event) => void)(e);
        };
        el.addEventListener(domName, fn);
        added.push([domName, fn]);
      }
      return () => added.forEach(([n, fn]) => el.removeEventListener(n, fn));
    }, []);

    return createElement(
      tagName,
      {
        ref: elRef,
        className: p.className as string | undefined,
        style: p.style as CSSProperties | undefined,
        id: p.id as string | undefined,
      },
      // Light-DOM children pass straight through to the element (slots).
      (p.children ?? null) as never,
    );
  });

  Component.displayName = tagName;
  return Component as ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<HTMLElement>>;
}
