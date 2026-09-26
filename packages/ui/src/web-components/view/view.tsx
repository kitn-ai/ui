import { defineWebComponent } from '../define/define';

interface Props extends Record<string, unknown> {
  /** The view's name: what `push()` / `selectTab()` / the stack's `view`
   *  attribute address. Attribute: `name`. */
  name?: string;
  // Views without it are DRILL views, reached by `push()` and left by `back()`.
  /** Marks this view as a TAB ROOT: it shows the tab bar and never a back affordance. Attribute: `tab-root`. */
  tabRoot?: boolean;
}

/**
 * One named view inside a view stack, shown or hidden by the enclosing stack.
 */
// solid-coverage: equivalent View -- same contract (a named view inside a stack: hidden/data-active toggled by the enclosing stack, content kept mounted while inactive), different mechanism: the Solid `View`/`ViewStack` pair coordinates through context, while this facade is a declarative light-DOM marker `<kai-view-stack>` drives via its MutationObserver — deliberately parallel, so no shared render path exists for the coverage guard to derive.
defineWebComponent<Props, Record<string, never>>('kai-view', {
  name: undefined,
  tabRoot: undefined,
}, () => {
  return (
    <>
      {/* The shared base sheet sets `:host{display:block}`, which outranks the
          UA's `[hidden]{display:none}` — so the stack's `hidden` toggle needs
          this host rule to actually hide the view. */}
      <style>{':host([hidden]){display:none}'}</style>
      <slot />
    </>
  );
});
