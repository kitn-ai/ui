# A — The composition contract (2026-09-29)

Part of the [composition round](2026-09-29-composition-round-design.md). Everything in B–E
builds on this. Owner decisions referenced by number are in the umbrella's §2.

## 1. Scope

1. **A0: rename `ChatThread` → `ChatApp`.** It is the whole widget behind `<kai-chat>`, not a
   thread. It lands first and alone.
2. **The tag registry**, one shape and one runtime used by every preset.
3. **The preset rule** and its guard, `lint:preset-parts`, plus the parity-test helper.
4. **Root theme inheritance** via `--kai-color-scheme` and `light-dark()` tokens.
5. **The prompt dock's bands animate presence** (§7a), because B's plan and C's question panel
   both slide in there.
6. **The pattern tier's plumbing**: the `/blocks` → `/patterns` docs section rename, the
   `kai add <pattern>` path for plain web-component patterns, and a pattern authoring note.

## 2. A0 — the rename

**Fact.** `ChatThread` is public: `src/solid.ts:160-161` exports `ChatThread`,
`ChatThreadProps`, `ChatThreadController`, `ChatThreadContextUsage`; `src/index.ts:463` exports
`ChatThreadContextUsage`. A scoped grep finds 60 files under `packages/`, `apps/`, `examples/`
naming it.

**Change.** `components/chat/chat-thread.tsx` → `components/chat/chat-app.tsx`; the symbols
become `ChatApp`, `ChatAppProps`, `ChatAppController`, `ChatAppContextUsage`. The co-located
`chat-thread.test.tsx`, `chat-thread-parts.test.tsx`, `chat-thread.stories.tsx` rename with
it. `thread-density.ts` keeps its name (it IS the thread's density). No alias is kept (decision
9). Docs, MCP reference text, `llms-full.txt` and the Solid starter follow via the normal
regeneration plus a scoped grep sweep.

**Acceptance.** A scoped grep for `ChatThread\b` over `packages apps examples` (excluding
`node_modules`, `dist`, and `docs/` history) returns only intentional history lines; typecheck,
unit, emitted, `verify:scaffold`, `verify:solid-coverage` green.

## 3. The tag registry

**Precedent.** `cardTypes` already maps a card envelope type to a tag, and
`web-components/message/message.tsx:29-39` (`cardComponentsFromTags` + `CardTagSlot`) creates
that element and sets its data. The registry generalises this so it is one mechanism.

**Shape.**

```ts
/** data key → custom-element tag. Keys are defined per preset (see B, C). */
export type RendererMap = Record<string, string>;

/** Resolve the tag for a key, most specific first: `resolveRenderer(map, ['tool:web_search', 'tool'])`. */
export function resolveRenderer(map: RendererMap | undefined, keys: string[]): string | undefined;
```

`src/primitives/renderer-registry.ts` (new; no Solid, no DOM — Node-importable, like
`card-tags.ts`). The Solid half, `components/renderer/tag-renderer.tsx`, exports `<TagRenderer
tag data prop="part">`: it creates the element once per (tag, identity), assigns `el[prop] =
data` as a JS **property**, and re-assigns on change. It validates the tag against
`/^[a-z][a-z0-9]*-[a-z0-9-]+$/` (a valid custom-element name) and, for an invalid tag or one
that is not defined after `customElements.whenDefined` times out (2s), renders nothing for that
item and **warns once per tag** (decide loudly), falling back to the preset's built-in rendering
for that item so content is never silently lost. `CardTagSlot` is re-implemented on top of
`TagRenderer`.

**Contract a registered element can rely on.** It receives the data as the property named by the
preset (`part` for message parts, `step` for activity steps, `question` for questions), is
created inside the preset's shadow root (so it inherits `--kai-color-scheme` and every `--kai-*`
token), and may dispatch its own events; the preset does not re-dispatch them.

**Public surface.** `RendererMap`, `resolveRenderer` from `@kitn.ai/ui` and
`@kitn.ai/ui/schemas` (server-safe); `TagRenderer` from `@kitn.ai/ui/solid`. Each preset exposes
the map as a JS property named `renderers` (B, C define the keys).

## 4. Composition mechanisms, written down once

`apps/docs/src/content/docs/guides/composition.mdx` (new) states the three mechanisms of the
umbrella §4 with one runnable plain-HTML example each, and the rule: slots for regions, the app's
own children for repetition, the registry when a preset renders the data. The existing
composition docs pages link to it. The MCP `component_reference` tool's per-element output gains
a one-line "compose it:" hint derived from the element's slots and whether it accepts children
(from `web-component-meta.json`; no hand-typed list).

## 5. The preset rule and its guard

**Rule.** A preset facade may render only public parts: Solid components re-exported from
`src/solid.ts`, primitives re-exported from `src/index.ts`, or registered `kai-*` tags.

**Guard: `lint:preset-parts`** (`packages/ui/scripts/lint-preset-parts.mjs`, required CI, no
build needed, in the same shape as `lint:silent-drops`):

- The preset list is `packages/ui/scripts/preset-facades.json`, a checked-in array of
  `{ tag, facade }` (e.g. `{ "tag": "kai-thread", "facade": "src/web-components/thread/thread.tsx" }`).
  It is a copy of a fact, so `docs/coupling-map.md` §4 registers it; a test asserts every listed
  facade exists and is registered (`web-component-manifest.json`).
- For each facade, it collects the import specifiers resolving under `src/components/**` and
  `src/primitives/**` and the imported names, and fails if a name is not exported from
  `src/solid.ts` (components) or `src/index.ts` (primitives). The export lists come from the
  TypeScript checker (`getExportsOfModule`), never a regex, because `solid.ts` re-exports
  `index.ts` with `export *` (`src/solid.ts:21`). The error names the facade, the symbol and
  the file to re-export it from.
- `--self-test` runs it over a fixture facade importing a private symbol and asserts it fires,
  and over a clean one and asserts it passes (watch it fail first).

**Parity helper.** `packages/ui/tests/helpers/preset-parity.ts` (new): mounts a preset and the
composed equivalent for one fixture and compares normalised DOM (attributes sorted, generated ids
stripped). B, C, D each add a parity test per preset.

## 6. Root theme inheritance

**Today** (`web-components/define/define.tsx:29-43, 387-399, 458`): each element resolves
`theme` (`light` | `dark` | `auto`, default `auto` = `prefers-color-scheme`) in JS and puts a
`.dark` class on its inner wrapper; tokens flip in the shadow CSS's `.dark` block (the same block
as `theme.css:321`). Nothing inherits, so a page sets `theme` on every element.

**New mechanism.**

1. **One inherited knob.** The wrapper inside every shadow root gets
   `color-scheme: var(--kai-color-scheme, light dark)`. Custom properties inherit across shadow
   boundaries, so `:root { --kai-color-scheme: dark }` (or `light`) set once on the page reaches
   every element. Unset, the fallback `light dark` follows the OS, which is today's `auto`.
2. **Tokens become `light-dark()` pairs.** Each colour token in the `:root/:host` token block
   becomes `var(--kai-color-X, light-dark(<light>, <dark>))`, and the `.dark { … }` override block
   is deleted. `light-dark()` resolves against the element's used `color-scheme`, so no class is
   needed. Baseline since 2024 (Chrome 123, Safari 17.5, Firefox 120). Token VALUES do not change;
   a test asserts the resolved light and dark values of every token equal the pre-migration values
   (captured into a fixture before the change).
3. **`theme` stays as a local override.** `theme="dark"` / `"light"` sets `--kai-color-scheme` on
   that element's wrapper (inline style), so it and everything inside it follow; `"auto"` (the
   default) sets nothing and inherits. The `theme` prop's doc changes to say so.
4. **`.dark` stays meaningful for the Tailwind/light-DOM path.** `theme.css` gains
   `.dark { --kai-color-scheme: dark } .light { --kai-color-scheme: light }`, so the existing
   `<html class="dark">` convention drives every element. Its `@custom-variant dark` for the
   consumer's own utilities is unchanged.
5. **The kit's own `dark:` utilities go.** A scoped grep finds 8 `dark:` utilities in 6
   non-story, non-test files under `src/`; each becomes a token (a `light-dark()` value), because a
   `.dark`-keyed variant cannot see an inherited `color-scheme`.
6. **JS that needs the resolved mode** (the Shiki theme choice in code blocks, `CardContext.theme`
   pushed to remote cards, the audio visualizer if it reads colours) uses
   `createResolvedColorScheme(el)` (`src/primitives/color-scheme.ts`, new): reads
   `getComputedStyle(el).getPropertyValue('--kai-color-scheme')`, falls back to `matchMedia`, and
   re-reads on `matchMedia` change and on a `MutationObserver` over `document.documentElement`'s
   `class`, `style` and `data-*` attributes. It replaces `createDarkMode`.

**Risks.** (a) A consumer overriding `--color-*` (the internal names) instead of `--kai-color-*`
loses dark mode; that was never the documented seam. (b) Old browsers without `light-dark()`
render light only; acceptable at Baseline 2024, and stated in the theming docs. (c) The
remote-card iframe receives the resolved mode via `CardContext`, unchanged in shape.

**Plan shape.** A spike task first: migrate the tokens, prove on three elements (button, thread,
prompt-input) that light/dark/inherit/override all resolve, and that the axe contrast stories stay
green; only then the sweep.

## 7a. The prompt dock's bands

`kai-prompt-dock` (`web-components/prompt/prompt-dock.tsx`; Solid `components/prompt/prompt-dock.tsx`)
already has `top` and `bottom` slots ("lips"). Today a band appears or disappears instantly. Change:
a band whose slot gains content slides in (height from 0 plus opacity, 180ms ease-out), and slides
out when its content goes, with `prefers-reduced-motion: reduce` making both instant. The band's
height animation uses the measured content height (a `ResizeObserver`), so content that grows
while open (a question panel moving between tabs) animates too. No new prop; the behaviour is the
band's. B's `kai-plan` and C's `kai-question-panel` are the first users; an app can put its own
notices or mode rows there.

## 7. The pattern tier's plumbing

- **Docs.** `apps/docs` section `/blocks` → `/patterns` (the page list, `topics.mjs` nav, and
  redirects `/blocks/*` → `/patterns/*`). The patterns page lists patterns from a derived index,
  not a hand-typed list.
- **`kai add <pattern>`.** A pattern is a directory under `packages/blocks/patterns/<id>/` with a
  `registry-item.json` of `"kind": "pattern"`, one `.html` and at most one `.ts` (plain web
  components, no template DSL, no generated framework forms). `packages/blocks/src/registry.ts`
  learns `kind: "pattern"`; the renderer emits the files verbatim (the CDN form only rewrites the
  kit import to the pinned CDN URL, as today). `create-kai add` installs it.
- **Authoring note.** `packages/blocks/patterns/README.md`: 50–200 lines, comments explain the
  code rather than project history, every `kai-*` element used is public, and the pattern has a
  Storybook story under `Patterns/<Name>`.

## 8. Testing

- Registry: unit tests for `resolveRenderer` precedence, `TagRenderer` property assignment,
  identity reuse (no re-create on unrelated re-render), the invalid-tag and undefined-tag loud
  fallbacks.
- Theme: token value parity fixture (light + dark, every token); in-browser: one page with
  `--kai-color-scheme: dark` on `:root` and three elements with no `theme` attribute, asserting
  computed background/foreground equal the dark values; an element with `theme="light"` inside a
  dark root renders light; toggling `<html class="dark">` flips every element without a reload;
  the OS preference applies when nothing is set (Playwright `colorScheme` emulation).
- `lint:preset-parts --self-test` goes red on the private-import fixture before it goes green.
- The full ladder: typecheck, unit, emitted, storybook project, `verify:generated`,
  `verify:consumer`, `verify:scaffold`, all lints.

## 9. Acceptance

1. `ChatThread` is gone from public exports; `ChatApp` replaces it.
2. `RendererMap`/`resolveRenderer`/`TagRenderer` exported and used by `CardTagSlot`.
3. `lint:preset-parts` is required in CI, self-tests, and passes.
4. Setting `--kai-color-scheme` once on `:root`, or `class="dark"` on `<html>` with `theme.css`,
   themes every element; no element needs a `theme` attribute to follow the page.
5. `/patterns` exists; `kai add <pattern>` installs a plain web-component pattern.
6. A dock band slides in and out when its slot content appears and goes, instantly under reduced
   motion.
