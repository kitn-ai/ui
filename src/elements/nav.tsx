import { createSignal } from 'solid-js';
import { defineWebComponent } from './define';
import { Nav, type KaiNavItem } from '../ui/nav';

interface Props extends Record<string, unknown> {
  /** The nav items. Set as a JS property (array, not an attribute). */
  items?: KaiNavItem[];
  /** Active item id (controlled). */
  value?: string;
  /** Initial active id when uncontrolled. */
  defaultValue?: string;
}

interface Events {
  /** A nav item was activated. */
  'kai-nav-select': { id: string };
}

/**
 * `<kai-nav>` — a vertical navigation list driven by a JSON `items` tree
 * (id + label + optional leading `icon`, a trailing text `badge`, a trailing
 * icon). The active item is `value`; selecting one fires `kai-nav-select`.
 *
 * ```html
 * <kai-nav default-value="home"></kai-nav>
 * <script type="module">
 *   const nav = document.querySelector('kai-nav');
 *   nav.items = [
 *     { id: 'home', label: 'New task', icon: 'plus', trailing: 'pencil' },
 *     { id: 'projects', label: 'Projects', icon: 'folder' },
 *     { id: 'dispatch', label: 'Dispatch', icon: 'share', badge: 'Beta' },
 *   ];
 *   nav.addEventListener('kai-nav-select', (e) => console.log(e.detail.id));
 * </script>
 * ```
 * Restyle via `::part(nav)` / `::part(item)` (active items carry `aria-current`).
 */
defineWebComponent<Props, Events>('kai-nav', {
  items: undefined,
  value: undefined,
  defaultValue: undefined,
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
      onItemSelect={select}
      part="nav"
    />
  );
});
