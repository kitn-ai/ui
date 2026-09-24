import { createSignal, createEffect, Show, untrack } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { PaneGroup, type PaneTab } from '../../components/pane/pane-group';

interface Props extends Record<string, unknown> {
  /** The tabs to render. An array of `{ id, name, status?, needsAttention?, number? }`
   *  set as a JS PROPERTY (not an HTML attribute). */
  tabs?: PaneTab[];
  // Reflected to the `active` ATTRIBUTE so `::part`/`[active]` selectors and the per-tab
  // named slot follow it. Drive it from `kai-tab-change`.
  /** The active tab id (controlled). Omit for uncontrolled (the first tab). */
  active?: string;
  /** Highlight the frame as the ACTIVE group in a multi-group layout. Attribute:
   *  `focused`. */
  focused?: boolean;
}

/** Events fired by `<kai-pane-group>`. All non-bubbling; listen on the element. */
interface Events {
  /** A tab was selected (click, Enter/Space, or arrow-key move). `detail.id` is
   *  the tab's id. */
  'kai-tab-change': { id: string };
  /** A tab's close (×) was clicked. Drop the tab from `tabs` yourself. */
  'kai-tab-close': { id: string };
  /** A tab's "…" overflow was clicked. Open your own menu from `detail.id`. */
  'kai-tab-menu': { id: string };
}

/**
 * A tabbed group of panes: a tab strip over the active pane's content.
 */
defineWebComponent<Props, Events>('kai-pane-group', {
  tabs: undefined,
  active: undefined,
  focused: false,
}, (props, { element, dispatch, flag, expose }) => {
  const tabs = () => (props.tabs as PaneTab[] | undefined) ?? [];
  // Lift the selection into the facade and drive PaneGroup CONTROLLED so the host
  // can read it (`el.active` / `[active="…"]`) and set it after mount, falling back
  // to the first tab when nothing is selected (the kai-segmented `value` pattern).
  // Seed from the `active` property/attribute present on mount.
  //
  // NOT `props.active ?? internal()`: this facade reflects the resolved id to the
  // `active` ATTRIBUTE below, and that write echoes back through solid-element's
  // attributeChangedCallback into `props.active` — so consulting the prop after
  // boot left the element permanently controlled by its own reflection (the boot
  // echo materialized `props.active`, and every later select() lost to it). The
  // shadowing property accessor routes ALL writes — a consumer's and the echo's —
  // into one signal, where the equality guard absorbs the echo.
  const [selected, setSelected] = createSignal<string | undefined>(
    (props.active as string | undefined) ?? element.getAttribute('active') ?? undefined,
  );
  const active = () => selected() ?? tabs()[0]?.id;
  const coerce = (v: unknown): string | undefined => (v == null ? undefined : String(v));
  Object.defineProperty(element, 'active', {
    get: () => active(),
    set: (v: unknown) => {
      const next = coerce(v);
      if (untrack(selected) !== next) setSelected(next);
    },
    configurable: true,
  });
  const change = (id: string) => {
    setSelected(id);
    dispatch('kai-tab-change', { id });
  };

  // Reflect the resolved active id to the `active` attribute so `[active="…"]` /
  // `::part` selectors and the consumer's per-tab named slot follow selection.
  // The write-back it triggers lands in the property setter above, where the
  // equality guard absorbs it.
  createEffect(() => {
    const a = active();
    if (a != null && element.getAttribute('active') !== a) element.setAttribute('active', a);
  });

  expose({
    /** Select a tab by id (fires `kai-tab-change`). Ignores unknown ids. */
    select: (id: string) => {
      if (tabs().some((t) => t.id === id)) change(id);
    },
    /** Focus the active tab in the strip. */
    focus: () => {
      element.shadowRoot?.querySelector<HTMLElement>('[part="tab"][tabindex="0"]')?.focus();
    },
  });

  return (
    <PaneGroup
      tabs={tabs()}
      active={active()}
      focused={flag('focused')}
      onTabChange={change}
      onTabClose={(id) => dispatch('kai-tab-close', { id })}
      onTabMenu={(id) => dispatch('kai-tab-menu', { id })}
    >
      {/* Active tab's content: the per-tab named slot, plus the default slot for the
          swap-it-yourself pattern. A consumer uses one or the other. */}
      <Show when={active()}>{(a) => <slot name={a()} />}</Show>
      <slot />
    </PaneGroup>
  );
});
