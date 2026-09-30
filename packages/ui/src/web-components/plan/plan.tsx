import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { wireDisclosure } from '../disclosure/disclosure';
import { Plan, type PlanController } from '../../components/plan/plan';
import type { PlanItem, PlanItemStatus } from '../../primitives/plan';

interface Props extends Record<string, unknown> {
  // The preset. Set as a JS property, in the shape `planFromMessages(messages)` returns.
  // `<kai-plan-item>` children switch the element into item mode instead: your own rows win and
  // this array is not rendered (setting both warns once).
  /** Data mode: the plan, as `planFromMessages(messages)` returns it. JS property; omit to pass `<kai-plan-item>` children. */
  items?: PlanItem[];
  // Settable and reflected to the `open` attribute, like `kai-activity`.
  /** Drive/observe the disclosure: `el.open = true` or the bare `open` attribute. Listen for `kai-open-change`. */
  open?: boolean;
  /** Initial open state on mount (uncontrolled seed). */
  defaultOpen?: boolean;
  /** The header shown while open. Default `Plan`. */
  label?: string;
}

interface Events {
  /** The plan expanded or collapsed (via the line, an attribute, or `show()`/`hide()`/`toggle()`). */
  'kai-open-change': { open: boolean };
}

const ITEM_TAG = 'kai-plan-item';
const STATUSES: readonly string[] = ['pending', 'in_progress', 'completed'];

/** The items of item mode, read off the `<kai-plan-item>` hosts (their mirrored status, then their text). */
function itemsFromHosts(hosts: HTMLElement[]): PlanItem[] {
  return hosts.map((h, i) => {
    const raw = h.getAttribute('data-kai-status') ?? h.getAttribute('status') ?? '';
    return {
      id: h.id || `item-${i}`,
      label: (h.textContent ?? '').trim(),
      status: (STATUSES.includes(raw) ? raw : 'pending') as PlanItemStatus,
    };
  });
}

let warnedBoth = false;

/**
 * The agent's plan: one line ("2 of 4 done · the running item") that opens to a checklist, over a
 * thin progress bar. It has no surface of its own, so put it in `<kai-prompt-input>`'s `above`
 * slot (`<kai-chat>` does that for you). Pass `items` for the preset, or put `<kai-plan-item>`
 * children inside to write the rows yourself.
 */
defineWebComponent<Props, Events>('kai-plan', {
  items: [],
  open: undefined,
  defaultOpen: undefined,
  label: undefined,
}, (props, ctx) => {
  const { element } = ctx;
  let api: PlanController | undefined;
  wireDisclosure(ctx, () => api, () => props.open);

  const [hostItems, setHostItems] = createSignal<PlanItem[]>([]);
  const [count, setCount] = createSignal(0);
  onMount(() => {
    const read = () => {
      const found = [...element.children].filter((c): c is HTMLElement => c.localName === ITEM_TAG);
      for (const host of found) if (host.getAttribute('role') !== 'listitem') host.setAttribute('role', 'listitem');
      setCount(found.length);
      const next = itemsFromHosts(found);
      setHostItems((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true, attributes: true, characterData: true, subtree: true });
    onCleanup(() => observer.disconnect());
  });

  const itemMode = () => count() > 0;
  const dataItems = () => (Array.isArray(props.items) ? (props.items as PlanItem[]) : []);
  createEffect(() => {
    if (itemMode() && dataItems().length > 0 && !warnedBoth) {
      warnedBoth = true;
      console.warn('[kai] <kai-plan> has both `items` and <kai-plan-item> children; rendering the children and ignoring `items`.');
    }
  });

  return (
    <Plan
      items={itemMode() ? hostItems() : dataItems()}
      itemMode={itemMode()}
      label={props.label as string | undefined}
      defaultOpen={ctx.flag('defaultOpen')}
      controllerRef={(a) => (api = a)}
    >
      {itemMode() ? <slot /> : undefined}
    </Plan>
  );
});
