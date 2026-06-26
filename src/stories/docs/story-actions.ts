// Story-only helper: route a kai-* element's CustomEvents to the Storybook
// Actions panel. The kai-* facade events are NON-bubbling (they don't reach a
// canvas-root delegate), so each must be listened for ON THE ELEMENT. This
// attaches one listener per event the element declares in element-meta and logs
// the `detail` payload via `action(name)`. Auto-discovered, so a story never has
// to enumerate (or drift from) the element's event list.
//
// Usage (in a kai-* element story, inside the component that holds the ref):
//   import { onMount, onCleanup } from 'solid-js';
//   import { attachKaiActions } from '../stories/docs/story-actions';
//   onMount(() => onCleanup(attachKaiActions(el)));
//
// For SolidJS *component* stories (Components/Elements, Components/Primitives)
// there are no CustomEvents; wire their callback props with `fn()` in `args`
// per the Button exemplar instead.
import { action } from 'storybook/actions';
import elementMeta from '../../elements/element-meta.json';

type ElementMetaEntry = { tag: string; events?: { name: string }[] };

const eventsByTag = new Map<string, string[]>(
  (elementMeta as ElementMetaEntry[]).map((e) => [e.tag, (e.events ?? []).map((ev) => ev.name)]),
);

/**
 * Attach Storybook Actions logging for every CustomEvent the given kai-* element
 * declares. Returns a cleanup that detaches the listeners (pass it to onCleanup).
 *
 * @param el  the kai-* element (from a `ref`).
 * @param tag the element tag; defaults to the element's own tagName.
 * @param only optional allow-list of event names to wire (defaults to ALL declared).
 */
export function attachKaiActions(
  el: HTMLElement,
  tag: string = el.tagName.toLowerCase(),
  only?: string[],
): () => void {
  const declared = eventsByTag.get(tag) ?? [];
  const names = only ? declared.filter((n) => only.includes(n)) : declared;
  const off: Array<() => void> = [];
  for (const name of names) {
    const handler = (e: Event): void => action(name)((e as CustomEvent).detail);
    el.addEventListener(name, handler);
    off.push(() => el.removeEventListener(name, handler));
  }
  return () => off.forEach((fn) => fn());
}
