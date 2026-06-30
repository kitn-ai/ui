import { createSignal } from 'solid-js';
import { defineWebComponent } from './define';
import { Tabs, type KaiTabItem, type TabsVariant } from '../ui/tabs';

interface Props extends Record<string, unknown> {
  /** Tabs to render. Set as a JS property, not an HTML attribute. */
  items?: KaiTabItem[];
  /** Controlled selected id. Set as a JS property (or the `value` attribute);
   *  drive it from your app in response to `kai-tab-change`. Omit for uncontrolled. */
  value?: string;
  /** Initial selected id when uncontrolled (use the `default-value` attribute in plain HTML). */
  defaultValue?: string;
  /** `segmented` (default, a pill group) or `underline` (an underlined row). */
  variant?: TabsVariant;
  /** Stretch the strip to full width, each tab sharing the space equally. */
  block?: boolean;
  /** Disable the whole strip. */
  disabled?: boolean;
}

interface Events {
  /** A tab was selected (click, Enter/Space, or arrow-key move). `value` is the item's id. */
  'kai-tab-change': { value: string };
}

/**
 * `<kai-tabs>`, an accessible tab strip. Selection only: it emits the chosen id;
 * you render what each tab shows (this is not a content router).
 *
 * Set the `items` property in JavaScript (array, not attribute):
 *
 * ```html
 * <kai-tabs default-value="chat"></kai-tabs>
 * <script type="module">
 *   import '@kitn.ai/ui/elements';
 *   const tabs = document.querySelector('kai-tabs');
 *   tabs.items = [
 *     { id: 'chat', label: 'Chat', icon: 'message-circle' },
 *     { id: 'cowork', label: 'Cowork' },
 *     { id: 'code', label: 'Code', icon: 'code' },
 *   ];
 *   tabs.addEventListener('kai-tab-change', (e) => console.log(e.detail.value));
 * </script>
 * ```
 *
 * Each tab carries a stable `id`, so you can wire `aria-controls` on the tab and
 * `aria-labelledby` on your own panel. Style the active tab via `::part(tab)[data-active]`.
 */
defineWebComponent<Props, Events>('kai-tabs', {
  items: undefined,
  value: undefined,
  defaultValue: undefined,
  variant: 'segmented',
  block: undefined,
  disabled: undefined,
}, (props, { dispatch, flag, expose }) => {
  // Controlled/uncontrolled selection: `value` (when set) wins; otherwise the
  // element manages its own, seeded from `defaultValue`. `setValueTo` always
  // writes the internal value (a no-op visually while controlled) and emits
  // `kai-tab-change` so a controlling app can update its own state.
  const [internal, setInternal] = createSignal(props.defaultValue as string | undefined);
  const value = () => (props.value as string | undefined) ?? internal();
  const setValueTo = (next: string) => {
    setInternal(next);
    dispatch('kai-tab-change', { value: next });
  };

  let listRef: HTMLDivElement | undefined;
  expose({
    /** Select a tab by id (fires `kai-tab-change`). Ignores unknown/disabled ids. */
    select: (id: string) => {
      const item = (props.items as KaiTabItem[] | undefined)?.find((it) => it.id === id);
      if (!item || item.disabled || flag('disabled')) return;
      setValueTo(id);
    },
    /** Focus the active tab (or the first focusable tab). */
    focus: () => {
      listRef
        ?.querySelector<HTMLButtonElement>('[role="tab"][tabindex="0"]:not([disabled])')
        ?.focus();
    },
  });

  return (
    <Tabs
      items={props.items as KaiTabItem[] | undefined}
      value={value()}
      variant={(props.variant as TabsVariant) ?? 'segmented'}
      block={flag('block')}
      disabled={flag('disabled')}
      onChange={setValueTo}
      ref={(el) => (listRef = el)}
    />
  );
});
