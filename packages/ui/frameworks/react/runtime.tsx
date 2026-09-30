// Runtime for the generated React wrappers (react/index.tsx). Renders the custom
// element and bridges the React world to it: rich props are assigned as DOM
// *properties* (via a ref, so arrays/objects pass through unstringified), and
// `on<Event>` handlers are wired as `addEventListener` for the element's
// CustomEvents. Layout props (className/style/id) pass straight through.
//
// PROP RULE, in one sentence: a prop passed as `undefined` restores the element's
// declared default, and a prop absent from props leaves the element alone.
//
// ATTRIBUTES ARE A SEPARATE CHANNEL from that. `role`, `tabIndex`, every `aria-*`
// and every `data-*` are written to the host as ATTRIBUTES (`setAttribute`), never
// as declared properties, so they cannot disturb the declared-prop rule above or
// the element's own accessors. `data-`/`aria-` are also the one part of the React
// surface a slotted child legitimately carries (`<Dropdown role="menuitem"
// data-op="pin">`); without this channel React drops every one of them, because
// they are not in the element's declared prop list.
import {
  createElement,
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type AriaAttributes,
  type AriaRole,
  type CSSProperties,
  type ForwardRefExoticComponent,
  type PropsWithoutRef,
  type ReactNode,
  type RefAttributes,
} from 'react';

/** Base props every generated wrapper accepts.
 *
 *  Prop semantics: passing a prop as `undefined` restores the element's DECLARED
 *  default (the value the element itself declares, captured off the instance on
 *  the first post-upgrade apply); omitting the key entirely leaves whatever is on
 *  the element alone. The attribute half below is the same rule with the DOM's
 *  default as the target: `undefined` omits the attribute, absent leaves it alone. */
export interface WebComponentProps extends AriaAttributes {
  /** Any `data-*` attribute, written to the host verbatim. A template-keyed member
   *  rather than an index signature, so a typo'd prop is still a tsc error. */
  [key: `data-${string}`]: string | number | boolean | undefined;
  /** Color mode (`auto` follows prefers-color-scheme). */
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  style?: CSSProperties;
  id?: string;
  /** ARIA role for the host element, written as the `role` ATTRIBUTE. An element
   *  that declares a `role` prop of its own (`kai-message`, where `role` names the
   *  SPEAKER) keeps that name: a declared prop is applied first and this channel
   *  skips declared props. */
  role?: AriaRole;
  /** Tab order for the host element, written as the `tabindex` attribute. */
  tabIndex?: number;
  /** Slot assignment when this element is a child of another kai element
   *  (`<Panel slot="panel">`). Forwarded to the DOM, never assigned as a
   *  property: slotting is an attribute contract and the parent's
   *  `<slot name="...">` matches on the attribute. */
  slot?: string;
  /** Hide the element. Forwarded to the DOM so a parent that scans its
   *  children for it sees it, which the coarse layout elements do. */
  hidden?: boolean;
  /** Light-DOM children passed through to the element (slots). */
  children?: ReactNode;
}

/** The DOM attribute name for a prop on the ATTRIBUTE channel, or undefined when
 *  the key is not one. `tabIndex` is the only prop whose attribute spelling
 *  differs (the DOM attribute is `tabindex`). */
function attributeNameFor(key: string): string | undefined {
  if (key === 'tabIndex') return 'tabindex';
  if (key === 'role' || key.startsWith('aria-') || key.startsWith('data-')) return key;
  return undefined;
}

/** A prop value as an ATTRIBUTE value, or undefined to OMIT the attribute.
 *
 *  · `undefined`/`null` omit.
 *  · a function is never an attribute (a handler stays a prop).
 *  · an `aria-*` boolean becomes `"true"`/`"false"`: ARIA is a string contract
 *    and a present-but-false `aria-*` is meaningful.
 *  · a `false` `data-*` flag OMITS rather than writing `data-x="false"`, the
 *    same reasoning the `hidden` prop below uses: on a flag attribute a present
 *    value is the signal, so `"false"` would still read as set.
 *  · anything else stringifies; arrays/objects have no attribute form and omit. */
function attributeValueFor(name: string, value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'function') return undefined;
  if (typeof value === 'boolean') {
    if (name.startsWith('data-')) return value ? 'true' : undefined;
    return value ? 'true' : 'false';
  }
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return undefined;
}

/** Per-INSTANCE snapshot of each managed prop's value as the element declared it,
 *  taken on the first post-upgrade apply for that element (before this runtime has
 *  written anything to it). A prop later passed as `undefined` writes the captured
 *  value back, so `undefined` means "restore the element's declared default" rather
 *  than "assign literal undefined" -- which used to destroy defaults like
 *  `kai-prompt-input`'s `placeholder` ('Send a message...') and `attach` (true).
 *  A WeakMap, so it is per element instance and never global, and so an unmounted
 *  element's snapshot is collectable with it. */
const declaredDefaults = new WeakMap<HTMLElement, Record<string, unknown>>();

// Per-element registration fires on the CLIENT, once per tag. The element modules
// touch `window` at module-eval (Solid's runtime), so the thunk must never run on
// the server — it is only ever called from a client effect, browser-gated here too.
const registered = new Set<string>();

/** The in-flight (or settled) register-all import, once a consumer has opted in.
 *  Memoized so repeated registerAll() calls share one bundle load. */
let registerAllLoad: Promise<unknown> | undefined;

function ensureRegistered(tagName: string, register?: () => Promise<unknown>): void {
  if (!register || registered.has(tagName)) return;
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return;
  registered.add(tagName);
  if (customElements.get(tagName)) return; // already defined (e.g. via registerAll)
  // registerAll() is loading the coarse bundle, which defines EVERY kai-* tag —
  // including this one. Checking only customElements.get() is not enough: a dynamic
  // import settles no earlier than a microtask, while this runs synchronously in
  // useLayoutEffect during render(), so the tag is reliably still undefined here and
  // we would fetch a SECOND copy of an implementation already on the wire. Measured
  // at +553 kB for a single <Chat/> in a real Vite consumer build.
  //
  // Nothing is lost by waiting: the prop-assign effect above already re-applies props
  // via customElements.whenDefined() once the definition lands. If the coarse bundle
  // fails to load, fall back to this element's own chunk rather than never upgrading.
  if (registerAllLoad) {
    void registerAllLoad.catch(() => register());
    return;
  }
  void register();
}

/** Eagerly register ALL kai-* elements (the register-all bundle). Opt-in escape
 *  hatch for consumers who prefer no first-mount upgrade delay. Browser-only;
 *  a no-op on the server. */
export function registerAll(): Promise<unknown> | undefined {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return undefined;
  registerAllLoad ??= import('@kitn.ai/ui/web-components');
  return registerAllLoad;
}

export function createWebComponent<
  P extends WebComponentProps,
  /** The generated interface for THIS tag (`KaiViewStackElement`, ...), so a
   *  forwarded ref hands back the element's real methods instead of a bare
   *  HTMLElement that needs casting at every call site. Defaults to
   *  HTMLElement, which keeps a one-argument call compiling unchanged. */
  E extends HTMLElement = HTMLElement,
>(
  tagName: string,
  /** DOM-property names to assign from props (incl. `theme`). */
  propNames: readonly string[],
  /** Map of React handler prop → DOM event name. */
  eventMap: Record<string, string>,
  /** Client-only thunk that loads + registers this element (a literal dynamic
   *  import of its `@kitn.ai/ui/web-components/<name>` chunk). */
  register?: () => Promise<unknown>,
): ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<E>> {
  const eventEntries = Object.entries(eventMap);
  // Membership set for the attribute channel's guard: a DECLARED prop is applied
  // through the property path above, never also written as an attribute.
  const declared = new Set(propNames);

  const Component = forwardRef<E, P>((props, ref) => {
    const elRef = useRef<E | null>(null);
    useImperativeHandle(ref, () => elRef.current as E, []);
    const p = props as Record<string, unknown>;

    // Hold the latest handlers in a ref so the registered listeners always call
    // the current handler (no stale closures) without re-binding on every render.
    const handlersRef = useRef<Record<string, unknown>>({});
    for (const reactName of Object.keys(eventMap)) handlersRef.current[reactName] = p[reactName];

    // Assign rich props as DOM properties every render (idempotent). Arrays and
    // objects pass through unstringified; booleans become real boolean
    // properties so the element's `flag()` reads them. Updated props re-assign
    // because this effect runs after every render.
    //
    // Upgrade-race guard: if the element isn't upgraded yet (customElements.get
    // returns undefined), writes land on a plain HTMLElement and are lost when
    // Solid's solid-element upgrades the tag later. We call whenDefined() so
    // props set before upgrade are re-applied once the definition arrives.
    // With self-registration (web-components/register imported at the top of
    // react/index.tsx) this is belt-and-braces — the element is already defined
    // before React renders — but keeps the runtime safe regardless of import order.
    useLayoutEffect(() => {
      const el = elRef.current;
      if (!el) return;
      const applyProps = () => {
        // Capture the element's DECLARED defaults once, on the first apply that
        // runs against an upgraded element and before this runtime writes any
        // prop. Pre-upgrade the properties are meaningless (a plain HTMLElement
        // has none of them), so the capture waits for the definition; the
        // whenDefined re-apply below is what performs it in that case.
        const upgraded = typeof customElements === 'undefined' || !!customElements.get(tagName);
        let defaults = declaredDefaults.get(el);
        if (!defaults && upgraded) {
          defaults = {};
          for (const name of propNames) {
            defaults[name] = (el as unknown as Record<string, unknown>)[name];
          }
          declaredDefaults.set(el, defaults);
        }
        // NO declared-prop writes until the element is upgraded. The kit now keeps a value
        // written to a not-yet-defined element through the upgrade, so a pre-upgrade write
        // would be harvested as the element's own initial value and then captured above as
        // its "declared default": a later `undefined` would restore the caller's old value
        // instead of the real default. The whenDefined re-apply below writes them all.
        for (const name of upgraded ? propNames : []) {
          // PRESENT-with-undefined RESTORES THE DECLARED DEFAULT. ABSENT is untouched.
          //
          // React hands a component a COMPLETE props object every render, so a
          // key the caller stopped passing is the caller saying "no value" --
          // and skipping it left the last value stuck on the element forever
          // (blocks contract spike, F-8: a widget that drops its conversation
          // starters after the first turn went on showing them). "No value" is
          // the element's own default, though, not literal `undefined`: writing
          // `undefined` destroyed defaults the element declares and passes on
          // with no `??` guard, so `<PromptInput placeholder={undefined} />`
          // wiped 'Send a message...' and `attach={undefined}` turned the
          // paperclip off. Restoring the captured value gives the caller back
          // exactly the element they would have rendered with no prop at all.
          //
          // A key that was never in props at all is not the caller saying
          // anything, and touching it would stomp a value set imperatively on
          // the element. A React caller who means "leave it alone" omits the key.
          if (!(name in p)) continue;
          const value = p[name];
          (el as unknown as Record<string, unknown>)[name] =
            value === undefined ? defaults?.[name] : value;
        }

        // THE ATTRIBUTE CHANNEL. `role`, `tabIndex`, `aria-*` and `data-*` are
        // written to the HOST as attributes, a different channel from the
        // declared-prop assignment above: they never touch a property, so they
        // cannot disturb an element's own accessors or the declared-default
        // capture, and a name the element DECLARES (kai-message's speaker
        // `role`) stays on the property path and is skipped here. Same shape of
        // rule as the props above -- present-with-undefined OMITS (removes),
        // absent leaves the attribute alone -- so a caller who stops passing
        // `aria-label` clears it and one who never passed it is untouched.
        for (const name of Object.keys(p)) {
          const attr = attributeNameFor(name);
          if (attr === undefined || declared.has(name)) continue;
          const text = attributeValueFor(name, p[name]);
          if (text === undefined) el.removeAttribute(attr);
          else el.setAttribute(attr, text);
        }
      };
      applyProps();
      if (typeof customElements !== 'undefined' && !customElements.get(tagName)) {
        customElements.whenDefined(tagName).then(applyProps);
      }
    });

    // Client-only, deduped: load + register THIS element on first mount. The
    // prop-assign effect's whenDefined guard re-applies props once it upgrades.
    useLayoutEffect(() => {
      ensureRegistered(tagName, register);
    }, []);

    // Wire CustomEvent listeners ONCE per element. Each stable listener reads the
    // latest handler from handlersRef, so changing a handler's identity across
    // renders takes effect without add/remove churn, and listeners are removed on
    // unmount (no leaks).
    useLayoutEffect(() => {
      const el = elRef.current;
      if (!el) return;
      const added: Array<[string, EventListener]> = [];
      for (const [reactName, domName] of eventEntries) {
        const fn: EventListener = (e) => {
          const handler = handlersRef.current[reactName];
          if (typeof handler === 'function') (handler as (e: Event) => void)(e);
        };
        el.addEventListener(domName, fn);
        added.push([domName, fn]);
      }
      return () => added.forEach(([n, fn]) => el.removeEventListener(n, fn));
    }, []);

    return createElement(
      tagName,
      {
        ref: elRef,
        className: p.className as string | undefined,
        style: p.style as CSSProperties | undefined,
        id: p.id as string | undefined,
        slot: p.slot as string | undefined,
        // Normalised to `true` or undefined, never `false`: React 18 routes a
        // boolean on a custom element through the ATTRIBUTE path, where `false`
        // stringifies to hidden="false" -- which is still a present `hidden`
        // attribute and still hides the element. `undefined` removes it on every
        // React version, so `false` and absent both mean "not hidden".
        hidden: p.hidden === true ? true : undefined,
      },
      // Light-DOM children pass straight through to the element (slots).
      (p.children ?? null) as never,
    );
  });

  Component.displayName = tagName;
  return Component as ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<E>>;
}
