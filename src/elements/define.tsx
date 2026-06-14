import { customElement } from 'solid-element';
import { ChatConfig } from '../primitives/chat-config';
import { ELEMENT_CSS } from './css';
import { createSignal, onCleanup, onMount, Show, type JSX } from 'solid-js';

/**
 * Shared constructable stylesheet, built once and adopted by every element's
 * shadow root. This avoids duplicating the full compiled kit CSS (~77 KB) as an
 * inline `<style>` in each instance — important now that composing many small
 * elements on a page is a supported pattern. Falls back to `null` where
 * Constructable Stylesheets aren't available, in which case the facade renders
 * an inline `<style>` instead (see below).
 */
let sharedSheet: CSSStyleSheet | null | undefined;
function getSharedSheet(): CSSStyleSheet | null {
  if (sharedSheet !== undefined) return sharedSheet;
  try {
    if (typeof CSSStyleSheet === 'undefined') throw new Error('no CSSStyleSheet');
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(ELEMENT_CSS);
    sharedSheet = sheet;
  } catch {
    sharedSheet = null;
  }
  return sharedSheet;
}

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

/**
 * Context handed to every element facade. `E` is the element's event map —
 * `{ eventName: detailType }` — which types `dispatch` so a facade can only fire
 * its declared events with the right `detail` shape.
 */
export interface WebComponentContext<E = Record<string, unknown>> {
  /** The custom-element host node. */
  element: HTMLElement;
  /** Fire a non-bubbling, non-composed CustomEvent off the host. Consumers
   *  listen directly on the element (`el.addEventListener(...)`). Typed by the
   *  element's event map `E`. */
  dispatch: <K extends keyof E & string>(type: K, detail?: E[K]) => void;
  /**
   * Resolve a boolean flag from a prop the way HTML authors expect.
   *
   * `component-register` parses a *bare* boolean attribute (`<el removable>`) to
   * `undefined`, not `true` — so a facade can't rely on the prop value alone.
   * `flag('removable')` returns ON when the property is `true`, OR when the
   * matching attribute is present and not explicitly `="false"`. So all of
   * `<el removable>`, `<el removable="true">`, and `el.removable = true` turn it
   * on; `<el removable="false">`, absent, and `el.removable = false` turn it off.
   *
   * `name` is the camelCase prop name; the matching kebab attribute is derived.
   */
  flag: (name: string) => boolean;
}

/** camelCase prop name → kebab-case attribute (`hoverCard` → `hover-card`). */
function toAttr(name: string): string {
  return name.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/** Underlying flag resolution; see `WebComponentContext.flag`. */
function resolveFlag(element: HTMLElement, value: unknown, attribute: string): boolean {
  if (value === true) return true;
  return element.hasAttribute(attribute) && element.getAttribute(attribute) !== 'false';
}

type FacadeComponent<P, E> = (props: P, ctx: WebComponentContext<E>) => JSX.Element;

/**
 * Register a Solid facade as a Shadow-DOM custom element.
 *
 * - Renders into the element's shadow root (solid-element's default), with the
 *   compiled kit CSS injected via a `<style>` so Tailwind classes apply inside.
 * - Creates a portal mount node inside the shadow root and provides it through
 *   `ChatConfig` so the kit's overlays stay inside the shadow root.
 * - Gives the facade a `dispatch(type, detail)` helper that fires non-bubbling,
 *   non-composed CustomEvents off the host element (consumers listen directly on
 *   the element, so bubbling/composed would only cause consumer collisions).
 * - Idempotent: redefining an already-registered tag is a no-op.
 */
export function defineWebComponent<P extends Record<string, unknown>, E = Record<string, unknown>>(
  tag: string,
  propDefaults: P,
  Facade: FacadeComponent<P, E>,
): void {
  if (typeof customElements !== 'undefined' && customElements.get(tag)) return;

  // Guard against prop names that collide with global reflected HTMLElement IDL
  // attributes. component-register sets `this[prop] = undefined` in the element
  // constructor; for these, the native setter coerces undefined → "undefined"
  // and reflects it to an attribute — which is illegal in a CE constructor and
  // throws a cryptic "result must not have attributes". Fail loud and early with
  // a name + fix instead. (Use a prefixed attribute, e.g. `bar-title`/`headline`.)
  const RESERVED = ['title', 'id', 'slot', 'lang'];
  for (const key of Object.keys(propDefaults)) {
    if (RESERVED.includes(key)) {
      throw new Error(
        `defineWebComponent(${tag}): prop "${key}" collides with a global HTMLElement ` +
        `attribute and will break the element constructor. Rename it (e.g. ` +
        `"bar-title" → barTitle, a source title → headline).`,
      );
    }
  }

  // Every element gets a `theme` property/attribute: 'light' | 'dark' | 'auto'
  // (default 'auto' = follow the OS `prefers-color-scheme`). It drives a `.dark`
  // class on an inner wrapper, which the injected kit CSS already styles — so dark
  // mode works in standalone Shadow-DOM usage with no token duplication.
  const defaults = { theme: 'auto', ...propDefaults };

  customElement(tag, defaults, (props: typeof defaults, options: { element: object }) => {
    const element = options.element as HTMLElement;
    let portalNode!: HTMLDivElement;

    const dispatch = ((type: string, detail?: unknown) =>
      element.dispatchEvent(
        new CustomEvent(type, { detail, bubbles: false, composed: false }),
      )) as WebComponentContext<E>['dispatch'];

    // Reads `props[name]` (reactive) and falls back to attribute presence so
    // bare boolean attributes behave like normal HTML. See WebComponentContext.
    const flag = (name: string) =>
      resolveFlag(element, (props as Record<string, unknown>)[name], toAttr(name));

    const isDark = createDarkMode(() => props.theme as string | undefined);

    // Prefer a single shared stylesheet adopted into this shadow root; only emit
    // an inline <style> when Constructable Stylesheets aren't supported.
    const sheet = getSharedSheet();
    onMount(() => {
      const root = element.shadowRoot;
      if (sheet && root && 'adoptedStyleSheets' in root) {
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
      }
    });

    return (
      <>
        <Show when={!sheet}>
          <style>{ELEMENT_CSS}</style>
        </Show>
        {/* display:contents — no layout box; carries the .dark token scope and
            re-roots the inherited `color` to the active mode's foreground, so text
            without an explicit color class (e.g. attachment filename labels) follows
            light/dark instead of inheriting the host page's color. */}
        <div classList={{ dark: isDark() }} style={{ display: 'contents', color: 'var(--color-foreground)' }}>
          <div ref={portalNode} />
          <ChatConfig portalMount={portalNode}>
            {Facade(props as unknown as P, { element, dispatch, flag })}
          </ChatConfig>
        </div>
      </>
    );
  });
}
