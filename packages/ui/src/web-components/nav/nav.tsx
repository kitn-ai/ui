import { createSignal } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { Nav, type KaiNavItem } from '../../components/nav/nav';

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
  /** A row's trailing `action` button was activated (not a select). `value` is
   *  the item id; `action` echoes the item's `{ icon, label }`. */
  'kai-nav-item-action': { value: string; action?: { icon: string; label: string } };
  /** A `closable` row's trailing close button was activated (not a select).
   *  `value` is the item id. */
  'kai-nav-item-close': { value: string };
}

/**
 * A vertical navigation list built from an item tree, with nested groups, status
 * dots and trailing actions.
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
      onItemAction={(id, action) => dispatch('kai-nav-item-action', { value: id, action })}
      onItemClose={(id) => dispatch('kai-nav-item-close', { value: id })}
      part="nav"
    />
  );
});
