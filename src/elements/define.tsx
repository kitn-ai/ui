import { customElement } from 'solid-element';
import { ChatConfig } from '../primitives/chat-config';
import { KITN_CSS } from './css';
import { createSignal, onCleanup, type JSX } from 'solid-js';

/** Resolve whether the element should render dark, given its `theme` and the
 *  system preference. `auto` (the default) follows `prefers-color-scheme`. */
function createDarkMode(getTheme: () => string | undefined) {
  const [systemDark, setSystemDark] = createSignal(false);
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    onCleanup(() => mq.removeEventListener('change', onChange));
  }
  return () => {
    const theme = getTheme() ?? 'auto';
    return theme === 'dark' || (theme === 'auto' && systemDark());
  };
}

export interface KitnElementContext {
  /** The custom-element host node. */
  element: HTMLElement;
  /** Fire a non-bubbling, non-composed CustomEvent off the host. Consumers
   *  listen directly on the element (`el.addEventListener(...)`). */
  dispatch: (type: string, detail?: unknown) => void;
}

type FacadeComponent<P> = (props: P, ctx: KitnElementContext) => JSX.Element;

/**
 * Register a Solid facade as a Shadow-DOM custom element.
 *
 * - Renders into the element's shadow root (solid-element's default), with the
 *   compiled kit CSS injected via a `<style>` so Tailwind classes apply inside.
 * - Creates a portal mount node inside the shadow root and provides it through
 *   `ChatConfig` so Kobalte overlays stay inside the shadow root.
 * - Gives the facade a `dispatch(type, detail)` helper that fires non-bubbling,
 *   non-composed CustomEvents off the host element (consumers listen directly on
 *   the element, so bubbling/composed would only cause consumer collisions).
 * - Idempotent: redefining an already-registered tag is a no-op.
 */
export function defineKitnElement<P extends Record<string, unknown>>(
  tag: string,
  propDefaults: P,
  Facade: FacadeComponent<P>,
): void {
  if (typeof customElements !== 'undefined' && customElements.get(tag)) return;

  // Every element gets a `theme` property/attribute: 'light' | 'dark' | 'auto'
  // (default 'auto' = follow the OS `prefers-color-scheme`). It drives a `.dark`
  // class on an inner wrapper, which the injected kit CSS already styles — so dark
  // mode works in standalone Shadow-DOM usage with no token duplication.
  const defaults = { theme: 'auto', ...propDefaults };

  customElement(tag, defaults, (props: typeof defaults, options: { element: object }) => {
    const element = options.element as HTMLElement;
    let portalNode!: HTMLDivElement;

    const dispatch = (type: string, detail?: unknown) =>
      element.dispatchEvent(
        new CustomEvent(type, { detail, bubbles: false, composed: false }),
      );

    const isDark = createDarkMode(() => props.theme as string | undefined);

    return (
      <>
        <style>{KITN_CSS}</style>
        {/* display:contents — no layout box; just carries the .dark token scope. */}
        <div classList={{ dark: isDark() }} style={{ display: 'contents' }}>
          <div ref={portalNode} />
          <ChatConfig portalMount={portalNode}>
            {Facade(props as unknown as P, { element, dispatch })}
          </ChatConfig>
        </div>
      </>
    );
  });
}
