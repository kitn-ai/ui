# Design — auto-generated per-component spec system (web components)

Date: 2026-06-13
Status: approved (brainstorm), pending implementation

## Goal

Make every `kitn-*` web component **self-documenting and discoverable** in the
places developers actually look — without hand-maintenance and without an AI in
the loop. For each element, surface a complete, always-in-sync spec:

- **Properties** (name, kebab attribute, type / allowed values, default)
- **Events** (name + `detail` shape + description)
- **Tokens** (the global theming model + any component-specific tokens)
- **Composed from** (links to the SolidJS components the element wraps)

…rendered into both `docs/web-components.md` (the curated reference) and each
element's **Storybook autodocs**, plus **live Controls** for scalar props.

Everything is generated deterministically from the TypeScript source on
`npm run build` — no AI, no drift.

## Why this is feasible (grounding)

`scripts/gen-element-api.mjs` already parses every `defineKitnElement(...)` facade
with the TypeScript compiler (`createProgram` + type checker) and emits
`dist/custom-elements.json`, `src/elements/element-types.d.ts`, the React
wrappers, and `llms.txt`/`llms-full.txt` from one parse. It already reads the
**second generic type param** of `defineKitnElement<Props, Events>` as a typed
event map (`membersOf(node.typeArguments?.[1])`, line ~125) and unions it with
`dispatch('…')` string literals. Two things are missing today:

1. The ~16 facades that dispatch events don't **declare** that `Events` map → so
   event details show `CustomEvent<unknown>`.
2. The generator reads the `Props` *type* but not the runtime **`propDefaults`**
   object (`arguments[1]`) → so defaults are `null`.

Close those two and the full spec generates from source.

## Scope

- **In scope (this build):** the web-component layer (29 `kitn-*` facades) — the
  4 fields above + live Controls + the "Composed from" cross-links.
- **Phase 2 (designed, deferred):** generate the same specs for the public
  **SolidJS components** (`src/components/*`, exported from `src/index.ts`) and
  **UI primitives** (`src/ui/*`). Same `ElementSpec` renderer + a second
  extractor; spec shape differs (callback props + `children`/slots instead of
  CustomEvents/attributes). The Q1 cross-links make this a natural follow-up
  (a link lands on a component that also has a generated spec). Not built now.

## Architecture

### 1. Typed event maps on the facades (the one source change)

Each facade that dispatches events declares an `Events` interface and passes it
as the 2nd generic:

```ts
interface Events {
  /** User submitted a message. */
  submit: { value: string; attachments: AttachmentData[] };
  /** Fired on every input change. */
  valuechange: { value: string };
  /** A model was chosen in the header switcher. */
  modelchange: { modelId: string };
  // …one entry per dispatched event, JSDoc = the description
}
defineKitnElement<Props, Events>('kitn-chat', { /* defaults */ }, (props, { dispatch }) => …)
```

- The JSDoc on each event field becomes the spec's "Description"; the type
  becomes the `detail` shape.
- **Bonus:** `dispatch` is `(type: keyof Events, detail?: Events[type])`, so every
  `dispatch()` call is now type-checked — typos and wrong payloads become
  compile errors. (Expect to fix a few real mismatches; that's the point.)
- ~16 facades need this (those that dispatch). Display-only elements
  (markdown, loader, image, …) declare nothing and generate an empty events list.

### 2. Generator extensions (`gen-element-api.mjs`)

- **Defaults:** read the `propDefaults` object literal (`node.arguments[1]`),
  map each property to its literal default (string/number/boolean/`undefined`/
  array/object → a short printed form). Attach `default` to each prop in the model.
- **Composed-from:** collect this facade source file's `import` declarations whose
  module specifier starts with `../components/` or `../ui/`; record the imported
  identifiers. Map each to a Storybook story id using the title convention
  (`Components/<Name>` / `UI/<Name>` → `components-<kebab>--docs` /
  `ui-<kebab>--docs`). Filter out non-component utilities via the import path
  (only `components/`+`ui/`). Resolve `storyId` against the actual story index so
  internal-only components without a story (e.g. `ChatThread`) are listed by name
  without a broken link. Store as `composedFrom: { name, storyId?, group }[]`.
- **Component tokens:** a small curated `COMPONENT_TOKENS` map in the generator
  for the handful of elements with element-specific tokens
  (`kitn-tool` → `--color-tool-blue/amber/green/red`, `kitn-code-block` →
  `--color-code-foreground`, `kitn-conversation-list` → `--color-sidebar` +
  `--color-scrollbar-thumb`). Everything else → empty (themed by the global set).
  Each entry: token name + the light/dark defaults pulled from `theme.css`.

The enriched per-element model is written to **`.element-meta.json`** (already
emitted) — this is the single structured source the outputs read.

### 3. `docs/web-components.md` — regenerate tables, keep prose

Each element section gets marker comments around its generated tables:

```md
### `<kitn-chat>` / `KitnChat`
<!-- spec:kitn-chat -->
| Property | Attribute | Type | Default | Notes |
…(generated)…
<!-- /spec:kitn-chat -->
```

A generator step rewrites only the content between matching markers from
`.element-meta.json`; all hand-written prose (intro, build, register, TS, React
sections, per-element descriptions outside the markers) is untouched. First run
inserts markers + tables; subsequent runs refresh in place. Idempotent.

### 4. Storybook rendering — `<ElementSpec>`

A Solid component `src/stories/docs/element-spec.tsx` (mirroring the existing
`TokenTable` in `src/stories/docs/theme-tokens.ts`) takes a `tag` prop, reads the
generated `.element-meta.json` (imported as JSON), and renders:

- **Properties** table (name · attribute · type/values · default)
- **Events** table (name · `detail` · description)
- **Composed from** — chips/links to the SolidJS component stories
  (`<a href="?path=/docs/components-…--docs">`)
- **Tokens** — a one-line "themed by the global design tokens
  (<a …Token Reference>)" + a small table of any component-specific tokens

Each `kitn-*` element story embeds it once in its autodocs via a shared
`parameters.docs.page`/description block (or a tiny `<ElementSpec tag="…"/>` in
the story's MDX/Docs). One component, all elements.

### 5. Live Controls

The generator already flags `scalar` props. A shared helper
`argTypesFor(tag)` (reads `.element-meta.json`) builds Storybook `argTypes` for
each element's scalar props: `select` controls for string-union types
(`theme`, `prose-size`), `boolean` for booleans (`loading`, `code-highlight`),
`text`/`number` otherwise. Each element story spreads `argTypesFor('kitn-…')`
and its render() applies the args to the element's properties (via a `ref`).
Array/object props (`messages`, `conversations`) stay as fixed demo data.

## Data model (`.element-meta.json`, per element)

```jsonc
{
  "tag": "kitn-chat",
  "className": "KitnChatElement",
  "props": [
    { "name": "placeholder", "attribute": "placeholder", "type": "string",
      "default": "'Send a message...'", "scalar": true, "description": "…" }
  ],
  "events": [
    { "name": "submit", "detail": "{ value: string; attachments: AttachmentData[] }",
      "description": "User submitted a message" }
  ],
  "composedFrom": [
    { "name": "ConversationList", "group": "Components", "storyId": "components-conversationlist--docs" }
  ],
  "tokens": [
    { "name": "--color-sidebar", "light": "hsl(0 0% 100%)", "dark": "hsl(50 2% 7%)" }
  ]
}
```

## Out of scope (this build)

- SolidJS / UI component specs (phase 2, designed above).
- Per-folder `spec.md` files (the generator *could* emit them later; centralized
  outputs are canonical for now).
- Methods/slots tables for web components (the elements expose neither beyond
  `children` projection).
- Inferring component-specific tokens by static analysis of Tailwind classes —
  the curated `COMPONENT_TOKENS` map is simpler and the set is tiny (~4 elements).

## Deliverables & validation

- Typed `Events` interfaces on the ~16 dispatching facades; `gen-element-api.mjs`
  extended (defaults + composedFrom + tokens); `.element-meta.json` enriched;
  CEM events carry real `detail` types.
- `docs/web-components.md` tables generated between markers (prose preserved).
- `src/stories/docs/element-spec.tsx` + embedded in each `kitn-*` element story;
  `argTypesFor()` helper + Controls wired on the stories.
- **Gate:** `npm run build` (regenerates everything) + `npm run typecheck` (the
  new typed `dispatch` MUST pass — fix any real payload mismatches surfaced) +
  `npm test` (baseline 3 Shiki) + `npm run test:react`. Screenshot a couple of
  element autodocs pages showing the Properties/Events/Tokens/Composed-from
  tables + working Controls (light + dark). Confirm `docs/web-components.md`
  regenerates with equal-or-better tables and untouched prose.
