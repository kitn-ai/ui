import { createMemo, createSignal, createEffect, onCleanup, Show, type JSX } from 'solid-js';
import { isValidCustomElementName } from '../../primitives/renderer-registry';

export interface TagRendererProps<T> {
  /** The custom-element tag to create. */
  tag: string;
  /** Assigned to `element[prop]` as a JS property, re-assigned whenever it changes. */
  data: T;
  /** The property name `data` is assigned to. */
  prop: string;
  /** Rendered when the tag is invalid or never gets defined. */
  fallback: JSX.Element;
  /** Optional hook to set further properties/attributes on the same element, re-run reactively. */
  apply?: (el: HTMLElement) => void;
}

const DEFINE_TIMEOUT_MS = 2000;
const warned = new Set<string>();

function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(message);
}

/** Properties assigned before the tag was defined are OWN data properties, and they shadow
 *  the class accessors the definition adds. Once defined, take each one off the instance and
 *  assign it again so it goes through the accessor (the standard "upgrade property" pattern). */
function upgradeProperties(node: HTMLElement | undefined): void {
  if (!node) return;
  customElements.upgrade(node);
  for (const key of Object.keys(node)) {
    const own = (node as unknown as Record<string, unknown>)[key];
    delete (node as unknown as Record<string, unknown>)[key];
    (node as unknown as Record<string, unknown>)[key] = own;
  }
}

/** Renders `data` through a consumer's custom element: the element is created once per tag,
 *  `data` is assigned as a property, and the built-in `fallback` shows instead when the tag
 *  is invalid or is not defined within 2s (each warned once, never silent);
 *  a tag defined after that timeout still upgrades to the real element. */
export function TagRenderer<T>(props: TagRendererProps<T>): JSX.Element {
  const valid = createMemo(() => {
    if (isValidCustomElementName(props.tag)) return true;
    warnOnce(
      `invalid:${props.tag}`,
      `[kai] renderer tag "${props.tag}" is not a valid custom-element name; rendering the built-in view instead.`,
    );
    return false;
  });
  const [timedOut, setTimedOut] = createSignal(false);
  createEffect(() => {
    const tag = props.tag;
    setTimedOut(false);
    if (!valid() || customElements.get(tag)) return;
    const timer = setTimeout(() => {
      if (customElements.get(tag)) return;
      warnOnce(
        `undefined:${tag}`,
        `[kai] renderer tag "${tag}" is not defined after 2s; rendering the built-in view instead. Register it with customElements.define.`,
      );
      setTimedOut(true);
    }, DEFINE_TIMEOUT_MS);
    let stale = false;
    onCleanup(() => {
      stale = true;
      clearTimeout(timer);
    });
    // A tag defined after the timeout recovers: leave the fallback for the real element.
    void customElements.whenDefined(tag).then(() => {
      clearTimeout(timer);
      if (!stale) upgradeProperties(el());
      if (!stale) setTimedOut(false);
    });
  });
  const el = createMemo(() => (valid() ? document.createElement(props.tag) : undefined));
  createEffect(() => {
    const node = el();
    if (!node) return;
    (node as unknown as Record<string, unknown>)[props.prop] = props.data;
    props.apply?.(node);
  });
  return (
    <Show when={valid() && !timedOut()} fallback={props.fallback}>
      {el()}
    </Show>
  );
}
