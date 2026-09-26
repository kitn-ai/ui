/**
 * ViewStack + View — the mobile-stack view navigator.
 *
 * The navigation model the chat widget uses, in its own part so a block cannot
 * rebuild it differently without noticing. The rule that must hold everywhere:
 *
 *   a DRILLED view hides the tab bar and shows a back affordance;
 *   a TAB ROOT shows the tab bar and no back affordance.
 *
 * The stack OWNS that state and exposes it (`view`, `root`, `drilled`) so a tab
 * bar or header consumes it through the controller / `data-*` hooks rather than
 * reimplementing the policy.
 *
 * Presentation-light: this part decides WHICH view renders and nothing else.
 * Non-current views stay MOUNTED and hidden, so per-view state (scroll offsets,
 * half-typed inputs, component state) survives switches and drills by
 * construction. It never moves focus or scroll: the kit's idiom is an
 * imperative `focus()` on the element that owns the control.
 */
import {
  createContext,
  useContext,
  createSignal,
  createEffect,
  onCleanup,
  on,
  type JSX,
  type ParentProps,
} from 'solid-js';

/** One registered view: its name plus whether it is a tab root. */
export interface ViewEntry {
  name: string;
  tabRoot: boolean;
}

/** A snapshot of the navigator's state, as handed to `onViewChange`. */
export interface ViewStackState {
  /** The currently visible view's name. */
  view: string | undefined;
  /** The current tab root (what the tab bar should mark active, and where
   *  `back()` ultimately lands). Defined even while drilled. */
  root: string | undefined;
  /** True while a pushed (non-root) view is showing. THE tab-bar/back rule:
   *  drilled hides the tab bar and shows a back affordance. */
  drilled: boolean;
  /** The names of the pushed views, bottom to top. Empty at a tab root. */
  stack: readonly string[];
}

/** The imperative surface, handed out via the `controller` ref callback and
 *  `useViewStack()`. All getters are reactive Solid accessors. */
export interface ViewStackController {
  view: () => string | undefined;
  root: () => string | undefined;
  drilled: () => boolean;
  stack: () => readonly string[];
  // A TAB ROOT can never drill (a root is definitionally un-drilled), so a
  // root name routes to `selectTab` instead, the same shape as `select()` on
  // `kai-pane-group` ignoring an unknown name.
  /** Drills `name` on top of the current view; a tab-root name switches tabs instead. */
  push: (name: string) => void;
  /** Pop one drilled view. No-op at a tab root (nothing to go back to). */
  back: () => void;
  // While drilled the top of the stack is replaced, so `back()` skips the
  // view that was replaced; at a root the root itself is swapped, so `drilled`
  // stays false and no back affordance appears. Unknown names are ignored,
  // and a tab-root name routes to `selectTab`.
  /** Swaps the shown view in place, so the stack does not grow; a tab-root name switches tabs instead. */
  replace: (name: string) => void;
  // The views themselves stay mounted, so switching tabs resets nothing.
  /** Shows `name` as the tab root and clears any drill; non-root names are ignored. */
  selectTab: (name: string) => void;
  // The `<kai-view-stack>` element's `view` attribute is the deep-link entry
  // point into this method.
  /** Resolves `name` by the current position: a tab root switches tabs, a drilled stack replaces its top, a root pushes. */
  navigate: (name: string) => void;
}

export interface CreateViewStackOptions {
  // Reactive: the web-component facades feed this from observed light-DOM
  // children, so it is read on every access rather than captured once.
  /** The registered views in declaration order; the first tab root (else the first entry) is the default root. */
  entries: () => readonly ViewEntry[];
  // Any other registered name boots DRILLED over the default root, so the back
  // affordance is present from the first frame. Resolved lazily against
  // `entries` rather than captured, so it works when set before views register
  // (an attribute parsed before child elements upgrade).
  /** Starting view: a tab-root name becomes the root, any other registered name boots drilled over it. */
  initialView?: string;
  /** Fired after every navigation that changed the current view or the
   *  drilled flag. Not fired for the initial state. */
  onViewChange?: (state: ViewStackState) => void;
}

/** Headless core: the state machine alone, no DOM. Both the Solid
 *  `<ViewStack>` component and the `<kai-view-stack>` element run on this. */
export function createViewStack(options: CreateViewStackOptions): ViewStackController {
  const entries = options.entries;
  const initial = options.initialView;

  const find = (name: string) => entries().find((e) => e.name === name);
  const isTabRoot = (name: string) => find(name)?.tabRoot === true;
  const defaultRoot = () => entries().find((e) => e.tabRoot)?.name ?? entries()[0]?.name;

  // Explicit state exists only once the user navigates; until then everything
  // derives from `initialView` + the (possibly still-registering) entries.
  const [explicitRoot, setExplicitRoot] = createSignal<string>();
  const [rawStack, setRawStack] = createSignal<readonly string[]>();

  const root = () => {
    const r = explicitRoot();
    if (r !== undefined) return r;
    if (initial !== undefined && isTabRoot(initial)) return initial;
    return defaultRoot();
  };
  const stack = (): readonly string[] => {
    const s = rawStack();
    if (s !== undefined) return s;
    // Deep link to a non-root view: boot drilled over the default root.
    if (initial !== undefined && find(initial) !== undefined && !isTabRoot(initial)) return [initial];
    return [];
  };
  const view = () => stack().at(-1) ?? root();
  const drilled = () => stack().length > 0;

  const snapshot = (): ViewStackState => ({ view: view(), root: root(), drilled: drilled(), stack: stack() });

  /** Run a mutation; notify only when the visible outcome actually moved. */
  const commit = (mutate: () => void) => {
    const before = view();
    const beforeDrilled = drilled();
    mutate();
    if (view() !== before || drilled() !== beforeDrilled) options.onViewChange?.(snapshot());
  };

  const selectTab = (name: string) => {
    if (!isTabRoot(name)) return;
    commit(() => {
      setExplicitRoot(name);
      setRawStack([]);
    });
  };

  const push = (name: string) => {
    if (find(name) === undefined) return;
    if (isTabRoot(name)) return selectTab(name);
    commit(() => setRawStack([...stack(), name]));
  };

  const back = () => {
    if (!drilled()) return;
    commit(() => setRawStack(stack().slice(0, -1)));
  };

  const replace = (name: string) => {
    if (find(name) === undefined) return;
    if (isTabRoot(name)) return selectTab(name);
    commit(() => {
      if (drilled()) setRawStack([...stack().slice(0, -1), name]);
      else {
        // Replacing at a root swaps the root view itself: no history grows,
        // `drilled` stays false, no back affordance appears.
        setExplicitRoot(name);
        setRawStack([]);
      }
    });
  };

  const navigate = (name: string) => {
    if (find(name) === undefined) return;
    if (isTabRoot(name)) return selectTab(name);
    if (drilled()) return replace(name);
    push(name);
  };

  return { view, root, drilled, stack, push, back, replace, selectTab, navigate };
}

interface ViewStackContextValue {
  register: (entry: ViewEntry) => () => void;
  controller: ViewStackController;
}

const ViewStackContext = createContext<ViewStackContextValue>();

/** Reach the enclosing `<ViewStack>`'s controller from inside a view: a back
 *  button in a drilled header, or a tab bar reading `drilled()` to hide
 *  itself. Throws outside a `<ViewStack>`. */
export function useViewStack(): ViewStackController {
  const ctx = useContext(ViewStackContext);
  if (!ctx) throw new Error('useViewStack must be used inside <ViewStack>');
  return ctx.controller;
}

export interface ViewStackProps extends ParentProps {
  /** Deep link / initial view name; later changes navigate (see
   *  `ViewStackController.navigate`). */
  view?: string;
  /** Fired after every navigation that changed the current view or the
   *  drilled flag. */
  onViewChange?: (state: ViewStackState) => void;
  /** Ref callback receiving the imperative controller. */
  controller?: (controller: ViewStackController) => void;
  class?: string;
}

/**
 * The view container. Declare views as `<View>` children; exactly one shows
 * at a time, the rest stay mounted and hidden. The wrapper carries
 * `data-view` (current name) and `data-drilled` ("true"/"false") so sibling
 * chrome can follow the state from CSS or a test without the controller.
 */
export function ViewStack(props: ViewStackProps): JSX.Element {
  const [entries, setEntries] = createSignal<readonly ViewEntry[]>([]);

  const controller = createViewStack({
    entries,
    initialView: props.view,
    onViewChange: (state) => props.onViewChange?.(state),
  });

  // Later `view` prop changes navigate; the initial value was consumed above.
  createEffect(on(() => props.view, (v) => {
    if (v !== undefined && v !== controller.view()) controller.navigate(v);
  }, { defer: true }));

  props.controller?.(controller);

  const register = (entry: ViewEntry) => {
    setEntries((prev) => [...prev, entry]);
    return () => setEntries((prev) => prev.filter((e) => e !== entry));
  };

  return (
    <ViewStackContext.Provider value={{ register, controller }}>
      <div
        class={props.class}
        data-view={controller.view()}
        data-drilled={controller.drilled() ? 'true' : 'false'}
      >
        {props.children}
      </div>
    </ViewStackContext.Provider>
  );
}

export interface ViewProps extends ParentProps {
  /** The view's name, which `push`/`selectTab`/`navigate` address. */
  name: string;
  /** Marks this view as a tab root: it shows the tab bar and never a back affordance, unlike a drilled view. */
  tabRoot?: boolean;
  class?: string;
}

/**
 * One view inside a `<ViewStack>`. Stays mounted while hidden (that is what
 * makes tab switching reset nothing), toggling the native `hidden` attribute
 * plus a `data-active` hook.
 */
export function View(props: ViewProps): JSX.Element {
  const ctx = useContext(ViewStackContext);
  if (!ctx) throw new Error('<View> must be a child of <ViewStack>');
  // Registration is render-time (not onMount) so declaration order is the
  // entry order and the first frame already knows its default root.
  const entry: ViewEntry = { name: props.name, tabRoot: props.tabRoot === true };
  // Capture the disposer, then hand onCleanup a body the teardown scan can
  // WALK (an inline arrow), rather than the opaque call expression — the
  // capture-the-function rule tests/components/teardown-without-dom-globals
  // .test.tsx enforces. `unregister` touches only Solid state, no DOM globals.
  const unregister = ctx.register(entry);
  onCleanup(() => unregister());

  const active = () => ctx.controller.view() === props.name;
  return (
    <div
      class={props.class}
      data-view-name={props.name}
      data-active={active() ? 'true' : 'false'}
      hidden={!active()}
    >
      {props.children}
    </div>
  );
}
