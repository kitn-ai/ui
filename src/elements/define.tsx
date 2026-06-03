import { customElement } from 'solid-element';
import { ChatConfig } from '../primitives/chat-config';
import { KITN_CSS } from './css';
import type { JSX } from 'solid-js';

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

  customElement(tag, propDefaults, (props: P, options: { element: object }) => {
    const element = options.element as HTMLElement;
    let portalNode!: HTMLDivElement;

    const dispatch = (type: string, detail?: unknown) =>
      element.dispatchEvent(
        new CustomEvent(type, { detail, bubbles: false, composed: false }),
      );

    return (
      <>
        <style>{KITN_CSS}</style>
        <div ref={portalNode} />
        <ChatConfig portalMount={portalNode}>
          {Facade(props, { element, dispatch })}
        </ChatConfig>
      </>
    );
  });
}
