import { createSignal } from 'solid-js';
import { defineWebComponent } from './define';
import { Nav, type KaiNavItem } from '../ui/nav';

interface Props extends Record<string, unknown> {
  /** The nav items. Set as a JS property (array, not an attribute). Each item may
   *  carry `children` (a collapsible group), a `status` dot, and trailing `meta`
   *  text. */
  items?: KaiNavItem[];
  /** Active item id (controlled). */
  value?: string;
  /** Initial active id when uncontrolled. */
  defaultValue?: string;
  /** Ids of group items collapsed on first render (groups default to expanded).
   *  Set as a JS property (array). */
  defaultCollapsed?: string[];
}

interface Events {
  /** A nav item was activated. */
  'kai-nav-select': { id: string };
}

/**
 * `<kai-nav>` — a vertical navigation list driven by a JSON `items` tree
 * (id + label + optional leading `icon`, a trailing text `badge`, a trailing
 * icon). Items may nest via `children` (a collapsible group with a disclosure
 * chevron), carry a `status` dot (`{ tone, label?, pulse? }`), and a trailing
 * `meta` string (e.g. a relative time). The active item is `value`; selecting a
 * leaf fires `kai-nav-select` (group rows toggle expand/collapse instead).
 *
 * ```html
 * <kai-nav default-value="home"></kai-nav>
 * <script type="module">
 *   const nav = document.querySelector('kai-nav');
 *   nav.items = [
 *     { id: 'home', label: 'New task', icon: 'plus', trailing: 'pencil' },
 *     { id: 'acme', label: 'Acme', icon: 'folder', children: [
 *       { id: 't1', label: 'Refactor auth', status: { tone: 'info', label: 'Working', pulse: true }, meta: '2m' },
 *       { id: 't2', label: 'Landing page', status: { tone: 'success', label: 'Done' }, meta: '1d' },
 *     ] },
 *     { id: 'dispatch', label: 'Dispatch', icon: 'share', badge: 'Beta' },
 *   ];
 *   nav.addEventListener('kai-nav-select', (e) => console.log(e.detail.id));
 * </script>
 * ```
 * Restyle via `::part(nav)` / `::part(item)` (active items carry `aria-current`),
 * plus `::part(group)` / `::part(chevron)` / `::part(status)` / `::part(meta)`.
 */
defineWebComponent<Props, Events>('kai-nav', {
  items: undefined,
  value: undefined,
  defaultValue: undefined,
  defaultCollapsed: undefined,
}, (props, { dispatch, expose }) => {
  const [internal, setInternal] = createSignal(props.defaultValue as string | undefined);
  const value = () => (props.value as string | undefined) ?? internal();
  const select = (id: string) => { setInternal(id); dispatch('kai-nav-select', { id }); };

  expose({
    /** Activate an item by id (fires kai-nav-select). */
    select: (id: string) => select(id),
  });

  return (
    <Nav
      items={props.items as KaiNavItem[] | undefined}
      value={value()}
      defaultCollapsed={props.defaultCollapsed as string[] | undefined}
      onItemSelect={select}
      part="nav"
    />
  );
});
