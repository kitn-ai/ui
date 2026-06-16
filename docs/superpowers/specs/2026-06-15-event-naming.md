# Event-naming DX — findings & recommendation

**Date:** 2026-06-15 · **Branch:** `feat/component-docs-dx` · **Status:** READ-ONLY investigation
**Package:** `@kitn.ai/chat` (SolidJS + Shadow-DOM web components) · pre-1.0

## TL;DR

Our custom events are all-lowercase, single-token strings (`messageaction`, `feedbackdetail`).
The generators turn an event name into a React/Solid handler by capitalizing **only the first
letter** (`'on' + name[0].toUpperCase() + name.slice(1)`), so multi-word events come out as
`onMessageaction` / `onFeedbackdetail` instead of the JSX-native `onMessageAction` /
`onFeedbackDetail` (cf. native `onDoubleClick`). The generator can't know the word boundary because
the event name itself doesn't encode one.

The fix the whole web-components ecosystem uses (Shoelace `sl-change`, Web Awesome `wa-input`, Lit
docs, FAST) is **kebab-case event names, optionally prefixed**. Kebab makes word boundaries
explicit, so a generator can emit the natural handler/binding for *every* framework.

**Recommendation: Option B — kebab-case + a `kc-` prefix** (`kc-message-action`,
`kc-feedback-detail`). It's the only option that yields natural names across React/Solid (`onMessageAction`),
Vue (`@message-action` / `@kc-message-action`), Svelte (`on:kc-message-action`), Angular
(`(kc-message-action)`), and HTML (`addEventListener('kc-message-action')`) **and** matches WC
convention **and** prevents collisions (we dispatch non-bubbling/non-composed, but the prefix is
still cheap insurance and is the de-facto standard). Pre-1.0, the break is acceptable. Effort: ~half
a day, mostly mechanical, because almost everything downstream is generated.

---

## 1. How events are declared & dispatched

**Declaration** — each facade declares a typed `interface Events` whose **keys are the event names**,
all-lowercase today:

- `src/elements/message.tsx:35-38` — `interface Events { messageaction: { messageId: string; action: string } }`
- `src/elements/feedback-bar.tsx:24-31` — `feedback`, `feedbackdetail`, `close`

**Dispatch** — `defineWebComponent` hands the facade a typed `dispatch(type, detail)` that fires a
**non-bubbling, non-composed** `CustomEvent` off the host:

- `src/elements/define.tsx:50-56` — `WebComponentContext.dispatch<K extends keyof E & string>(type: K, detail?: E[K])`, typed by the event map `E`.
- `src/elements/define.tsx:131-134` — `new CustomEvent(type, { detail, bubbles: false, composed: false })`.

So the event name is literally the `interface Events` key, passed straight through to
`new CustomEvent(name)`. There is no transform — `dispatch('messageaction')` fires an event named
exactly `messageaction`.

**The full event surface — 29 distinct names** (`grep "dispatch('…')" src/elements`):

`audiocaptured, change, close, complete, conversationselect, feedback, feedbackdetail, filesadded,
fileselect, maximizechange, messageaction, modelchange, navigate, newchat, openchange, remove,
scopechange, search, select, sidebartoggle, slashselect, stop, submit, suggestionclick, tabchange,
togglesidebar, transcription, valuechange, voice`

**17 of the 29 are multi-word** (the ones that read wrong as `on<Name>`):
`audiocaptured, conversationselect, feedbackdetail, filesadded, fileselect, maximizechange,
messageaction, modelchange, newchat, openchange, scopechange, sidebartoggle, slashselect,
suggestionclick, tabchange, togglesidebar, valuechange`.

(`artifact.tsx:81-86` also dispatches a *separate*, raw bubbling+composed protocol event NOT via
`dispatch()` — out of scope here; that's the AG-UI protocol intent channel.)

---

## 2. How the wrappers derive handler names

There is **one transform**, duplicated across the generators:

```js
const onName = (ev) => 'on' + ev[0].toUpperCase() + ev.slice(1);
```

- `scripts/gen-element-react.mjs:23` — used for the React handler prop type **and** the runtime event
  map (`scripts/gen-element-react.mjs:43`, `:53`): `{ onMessageaction: 'messageaction' }`.
- `scripts/gen-framework-usage.mjs:14` — used for the **Vue/Svelte/Angular/Solid handler-variable
  names** in the copy-paste snippets (the binding key stays the raw event name; only the JS handler
  identifier is derived).

This is exactly why `messageaction → onMessageaction`. The generator capitalizes one letter because
the lowercase name carries no word boundary to capitalize on.

The runtime that consumes the map: `frameworks/react/runtime.tsx:33` documents the contract
(`{ onMessageaction: 'messageaction' }`) and `:64-77` wires `addEventListener(domName, …)` keyed off
the **DOM name** (the map's value), reading the handler by its **React-prop name** (the map's key).
The key (handler name) and value (DOM event name) are independent — which is what makes Option C
mechanically possible.

**Other generated outputs that bake in the names:**

- `scripts/gen-element-types.mjs` — `src/elements/element-types.d.ts` (the `HTMLElementTagNameMap`
  prop interfaces; these have **no** event members today, so events don't ripple here).
- `scripts/gen-element-api.mjs:196-200` — `dist/custom-elements.json` events (`name` = raw event name).
- `scripts/gen-element-api.mjs:142-146` — `element-meta.json` events; feeds the Storybook API tab,
  `llms.txt`, `docs/web-components.md`, and `framework-usage.json`.

---

## 3. WHY lowercase is the current convention (the real constraint)

DOM event names are **case-sensitive at `addEventListener`** — `addEventListener('messageAction')`
and `addEventListener('messageaction')` are different events. But **declarative bindings in HTML and
several template compilers lowercase the name**, so a camelCase event name silently fails to bind:

- **HTML attributes / inline handlers** are ASCII-lowercased by the parser. `<el onmessageAction=…>`
  becomes `onmessageaction`. So a camelCase event can't be bound via an inline attribute at all.
- **Vue 2:** `v-on` listeners in **DOM templates** are auto-lowercased (HTML case-insensitivity), so
  `@myEvent` → `@myevent`, making a camelCase custom event unlistenable. Vue's own ESLint rule
  (`vue/custom-event-name-casing`) recommends kebab-case for this reason.
- **Vue 3:** more forgiving in *SFC* templates (camelCase and kebab both resolve), but the official
  guidance is **still kebab-case for events** for DOM-template safety and consistency. With native
  custom elements (our case), `@message-action` is the reliable form.
- **Angular:** `(event)` event binding matches the **literal** event name; `(messageAction)` works in
  the compiler, but the safe, idiomatic form for custom-element events is the literal dispatched
  name — kebab (`(message-action)`) reads cleanly and avoids any casing ambiguity.
- **Svelte (v4):** `on:eventname` binds the **literal** event name — `on:message-action` listens for
  exactly `message-action`. Case is preserved, but a multi-word lowercase blob (`on:messageaction`)
  is the ugly status quo; kebab is the natural fix.
- **Solid:** `on:name` (namespaced) binds a **literal, case-preserving** custom-event name (this is
  what our stories use today, e.g. `feedback-bar.stories.tsx:16` `'on:feedback'`). Solid's `on<Name>`
  delegated form is for a **fixed allow-list of native events**, not arbitrary custom events — so the
  `onMessageAction` ergonomic only exists for us **through the generated React/Solid wrapper
  components**, which call `addEventListener` under the hood. (This is a key nuance for Option C below.)

This is precisely why **Lit / Shoelace / Web Awesome / FAST standardized on lowercase kebab-case,
usually with a library prefix**:

- **Shoelace** prefixes every event `sl-` (`sl-change`, `sl-input`) "to prevent collisions with
  standard events and other libraries"; its React wrapper maps `sl-change → onSlChange`.
- **Web Awesome** (Shoelace's successor) uses the `wa-` prefix on the same kebab pattern (`wa-input`).
- General WC guidance (Lit docs, deepsource JS-0605, Vue ESLint): **lower-kebab-case event names for
  maximum framework compatibility.**

The takeaway: kebab-case is not a stylistic preference — it's the encoding that survives every
template compiler's lowercasing **and** carries the word boundary the generators need to produce
`onMessageAction`.

---

## 4. Options

We dispatch **non-bubbling, non-composed** events (`define.tsx:133`), and consumers listen directly
on the host (or via the wrapper). So **collision risk is already low** — but a prefix is still the
ecosystem norm and costs nothing.

### Option A — keep single-word-lowercase, accept `onMessageaction`

| Framework | Form |
|---|---|
| React/Solid (wrapper) | `onMessageaction` ❌ |
| Vue | `@messageaction` |
| Svelte | `on:messageaction` |
| Angular | `(messageaction)` |
| HTML | `addEventListener('messageaction')` |

- **Generator change:** none.
- **Breakage:** none.
- **Verdict:** the status quo Rob is unhappy with. The handler reads unnaturally in the two JSX
  ecosystems (React, Solid) that are our primary audience. Rejected.

### Option B — kebab-case event names + `kc-` prefix  ⭐ RECOMMENDED

Event names become `kc-message-action`, `kc-feedback-detail`, … (single-word stays simple:
`kc-submit`, `kc-close`, `kc-feedback`).

| Framework | Form |
|---|---|
| React/Solid (wrapper) | `onMessageAction` ✅ (strip `kc-`, PascalCase each word) |
| Vue | `@kc-message-action` (or unprefixed `@message-action` if we drop the prefix) |
| Svelte | `on:kc-message-action` |
| Angular | `(kc-message-action)` |
| HTML | `addEventListener('kc-message-action')` |

- **Generator change:** replace the single `onName` transform with a kebab→PascalCase deriver that
  strips the `kc-` prefix and camelCases on hyphens:
  ```js
  const handlerName = (ev) =>
    'on' + ev.replace(/^kc-/, '').split('-')
      .map((w) => w[0].toUpperCase() + w.slice(1)).join('');
  // kc-message-action -> onMessageAction
  ```
  The runtime event map becomes `{ onMessageAction: 'kc-message-action' }` (runtime
  `frameworks/react/runtime.tsx` is unchanged — it's already name-agnostic). Vue/Svelte/Angular
  snippet **binding keys** become the kebab name; their JS handler identifiers come from the same
  deriver.
- **Source change:** rename the `interface Events` keys and the `dispatch('…')` literals in **29
  events across ~22 facade files** (only facades that dispatch). Each is a 1-line rename, and the
  extractor reads both the typed key and the `dispatch()` literal, so they must match.
- **Breakage:** **breaking** for anyone calling `addEventListener('messageaction')` or binding
  `@messageaction` / `onMessageaction`. Pre-1.0, release-please bumps the minor. ~17 multi-word
  events change visibly; the 12 single-word events change only by gaining the `kc-` prefix.
- **Bubbling/collisions:** unchanged (still non-bubbling); the `kc-` prefix removes even the
  theoretical clash with a native `change`/`submit`/`select` listener on an ancestor.
- **Verdict:** natural everywhere, matches WC convention, self-documenting word boundaries,
  future-proof. This is what Shoelace/Web Awesome do.

> **Prefix sub-decision.** Recommend keeping the `kc-` prefix on events for consistency with the
> `kc-*` tag namespace and to match the ecosystem (`sl-`, `wa-`). The only cost is slightly longer
> Vue/Angular/HTML bindings (`@kc-message-action`). If we'd rather keep template bindings terse, drop
> the prefix (`message-action`) — the React/Solid `onMessageAction` is identical either way because
> the deriver strips the prefix. **Lead recommendation: keep `kc-`.**

### Option C — keep lowercase DOM name, add a camelCase canonical identity + name-map

Give each `Events` entry a canonical camelCase name that the generators use for handler names, while
`dispatch` still fires the lowercase DOM name (mirrors React mapping `onDoubleClick → dblclick`).

| Framework | Form |
|---|---|
| React/Solid (wrapper) | `onMessageAction` ✅ |
| Vue | `@messageaction` ❌ (still the lowercase blob) |
| Svelte | `on:messageaction` ❌ |
| Angular | `(messageaction)` ❌ |
| HTML | `addEventListener('messageaction')` ❌ |

- **Generator change:** introduce a name-map (either a parallel `EVENT_NAMES` table or a naming
  convention the extractor can read), so `element-meta` carries both `domName` and `handlerName`.
  More machinery than B.
- **Breakage:** **non-breaking** for `addEventListener` users (DOM name unchanged); React/Solid
  wrapper handler names change (`onMessageaction → onMessageAction`).
- **Fatal flaw:** it **only** fixes the two wrapper frameworks. Vue/Svelte/Angular and plain HTML
  bind the **raw DOM name**, which is still the unreadable lowercase blob. It papers over the symptom
  in React/Solid while leaving the actual DOM event name ugly — and now there are *two* names to keep
  in sync. Rejected: solves less than B for more complexity.

### Option D — single-word event names only (`messageaction → action`, `feedbackdetail → detail`)

- **Forms:** `onAction`, `@action`, `(action)`, `addEventListener('action')` — all clean.
- **Generator change:** none (the existing transform already produces good single-word names).
- **Breakage:** breaking renames of the 17 multi-word events.
- **Fatal flaw:** **collisions and lost specificity.** `kc-message` would emit `action`; `kc-choice`
  an `action`; a generic `select`/`change`/`detail` proliferates. With non-bubbling events the
  collision is per-element rather than per-tree, but the **names stop being self-describing** in
  logs, docs, and `addEventListener` strings, and any future consolidation (e.g. a shared event bus)
  breaks. Rejected.

---

## 5. Recommendation — Option B (kebab + `kc-` prefix)

**Why.** It's the single option that is natural in *all five* binding styles, matches the
established web-components convention (Shoelace `sl-`, Web Awesome `wa-`, Lit guidance), encodes word
boundaries so the generator emits `onMessageAction` deterministically, and adds collision insurance
that costs nothing. The competing options each fail a leg: A keeps the bad name, C fixes only
React/Solid while doubling the bookkeeping, D collides and loses meaning. Pre-1.0 makes the break
free (minor bump via release-please).

### Concrete change

**1. The transform** — replace `onName` in `scripts/gen-element-react.mjs:23` and
`scripts/gen-framework-usage.mjs:14` with a shared deriver (put it in `scripts/_ts-helpers.mjs` so
both import one copy):

```js
// kc-message-action -> onMessageAction ; kc-submit -> onSubmit
export const eventHandlerName = (ev) =>
  'on' + ev.replace(/^kc-/, '').split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1)).join('');
```

The React runtime map keys change automatically (`{ onMessageAction: 'kc-message-action' }`);
`frameworks/react/runtime.tsx` needs **no change** — it's name-agnostic (key = handler prop,
value = DOM event).

**2. The `Events` maps** — rename keys + matching `dispatch()` literals. Example
(`src/elements/message.tsx`):

```ts
interface Events {
  /** An action button was clicked. */
  'kc-message-action': { messageId: string; action: string };
}
// …
onAction={(action) => dispatch('kc-message-action', { messageId: msg().id, action })}
```

`src/elements/feedback-bar.tsx`:

```ts
interface Events {
  'kc-feedback': { value: FeedbackValue };
  'kc-feedback-detail': FeedbackDetail;
  'kc-close': void;
}
```

(Note: `interface` keys with hyphens must be quoted string-literal keys — TS allows this and the
extractor at `gen-element-api.mjs:113` already reads string-literal `dispatch()` args; verify
`membersOf` handles quoted property names — it reads `sym.name`, which preserves the literal, so it
should be fine.)

**3. The React handler form** (regenerated `frameworks/react/index.tsx`):

```tsx
onMessageAction?: (event: CustomEvent<{ messageId: string; action: string }>) => void;
// …
{ onMessageAction: 'kc-message-action' }
```

### Ripple (almost all regenerated — run `node scripts/gen-element-api.mjs`)

| Artifact | How it updates |
|---|---|
| `frameworks/react/index.tsx` | regenerated |
| `src/elements/element-meta.json` | regenerated |
| `src/elements/framework-usage.json` (all 5 frameworks' snippets) | regenerated |
| `dist/custom-elements.json` | regenerated |
| `llms.txt` / `llms-full.txt` | regenerated (`gen-llms.mjs`) |
| `docs/web-components.md` | regenerated tables; **hand-fix** the prose example at `docs/web-components.md:117,121` |
| `src/elements/element-types.d.ts` | regenerated (no event members today — no change) |

**Hand-edits (not generated):**

- **Solid story JSX intrinsic typedefs** that hardcode `'on:eventname'` keys — e.g.
  `src/elements/feedback-bar.stories.tsx:16-18` (`'on:feedback'` → `'on:kc-feedback'`), and any other
  story with `'on:'` event keys in its `IntrinsicElements` block.
- **Story `addEventListener` / `on:` literals** in the demo snippets, e.g.
  `src/elements/message.stories.tsx:69,94,146,168,197` (`'messageaction'` → `'kc-message-action'`),
  `feedback-bar.stories.tsx:31-32,60-61,91-93`.
- **Hand-written usage examples** under `src/stories/examples/usage/` — `message-actions.ts`,
  `prompt-input-variants.ts`, `conversation-with-reasoning.ts`, `conversation-with-sources.ts`,
  `full-chat-app.ts`, `context-usage.ts` (handler names `onMessageaction → onMessageAction`, binding
  keys `@valuechange → @kc-value-change`, etc.).
- **`src/stories/docs/frameworks/React.mdx:173-182`** — the `DOM event → React prop` mapping table.
- **`src/stories/docs/frameworks/Vue.mdx` / `Html.mdx`** if they show literal event names.
- Optionally **internal kit components** still using camelCase callback props (`onMessageAction`,
  `onSubmitDetail` in `feedback-bar.tsx`) are *unaffected* — those are Solid component props, not
  custom-element events. Only the `dispatch('…')` strings + `Events` keys change.

### Effort

**~half a day.** The transform is a few lines; the 29 event renames across ~22 facades are
mechanical 1-liners; everything in the ripple table regenerates from one `gen-element-api.mjs` run.
The real manual work is the ~10 hand-written story/usage/doc files (a scripted find-replace per old
name covers most of it) plus a Playwright/Storybook spot-check of the API "Usage" tabs to confirm the
generated snippets render the natural names. Add the `kc-` rename to MEMORY's version-bump flow
(single minor via release-please).

### Open decisions for Rob

1. **Prefix or not** — `kc-message-action` (recommended, matches `sl-`/`wa-`) vs bare
   `message-action`. React/Solid handler is `onMessageAction` either way.
2. Whether to also align the **internal Solid component callback props** for symmetry (cosmetic,
   non-breaking, out of scope for the DX fix).

---

## Sources

- Shoelace — Usage / event naming (`sl-` prefix, kebab-case): https://shoelace.style/getting-started/usage
- Shoelace React wrapper (kebab → `onSlChange`): https://github.com/shoelace-style/react-wrapper
- Vue `custom-event-name-casing` ESLint rule (kebab recommended; Vue 2 DOM-template lowercasing): https://eslint.vuejs.org/rules/custom-event-name-casing.html
- "Prefer kebab-case for custom event names" (JS-0605): https://deepsource.com/directory/javascript/issues/JS-0605
- Vue custom events guidance (camelCase vs kebab): https://github.com/vuejs/docs/issues/2503
