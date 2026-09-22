# `@kitn.ai/ui` consumer integration issues — punch-list

**Source:** a field test building a real consumer app (fresh Vite + React + TS) against the published
`@kitn.ai/ui@0.15.1` and the `aiui` MCP server (2026-06-19). Full report: `aaaaa/report.md`.

**Scope of this doc:** the **package-level** ("Bucket B") findings — they live in the published library's
packaging/exports/peers, *not* in the agent-tooling MCP. The MCP-tool findings ("Bucket A": scaffold
side-panel/suggestions/elements-import + a `mock` integration, and new `debug` rules) were fixed on
`feat/ai-ui-agent-tooling`. The items below are **not fixed** — they need their own decisions because they
touch the whole library's build and are not pre-1.0-trivial.

The two P0s both produce the same first impression: *"I followed the docs and nothing renders / my build
breaks."* They're the highest-leverage fixes for first-time React consumers.

---

## P0 — Issue 1: `/react` wrappers don't register the web components

**Symptom.** Following the documented React setup renders an empty `<kai-chat>` — `customElements.get('kai-chat') === undefined`.

**Root cause.** `frameworks/react/index.tsx` only imports `./runtime`; nothing in the `/react` import graph
calls `customElements.define`. Registration lives only in the side-effect bundle `@kitn.ai/ui/web-components`
(`dist/kai.es.js`). A consumer importing only `/react` gets wrappers that render undefined elements.

**Why it bites everyone.** The package's own `llms.txt` React example omits `import '@kitn.ai/ui/web-components'`,
so the primary onboarding path produces non-rendering code.

**Recommended fix (pick one).**
- *Preferred:* make `@kitn.ai/ui/react` self-registering — add the web-components registration as a side effect at
  the top of `frameworks/react/index.tsx` (and set `"sideEffects"` so bundlers keep it), so importing any
  wrapper guarantees the element is defined.
- *At minimum:* fix `llms.txt`/`llms-full.txt` (and any quickstart) to always show `import '@kitn.ai/ui/web-components'` first.

**Affected:** `frameworks/react/index.tsx`, `frameworks/react/runtime.tsx`, `llms.txt`/`llms-full.txt` generator (`scripts/gen-llms.mjs`).

**Already mitigated in agent-tooling:** the MCP `scaffold` now always emits `import '@kitn.ai/ui/web-components'` first, and `debug` has a rule for "renders nothing / not registered." The package + generated docs still need the fix.

---

## P0 — Issue 2: package ships raw `.tsx` source → consumers' `tsc` compiles the SolidJS internals and breaks

**Status: the preferred fix shipped.** `exports` now points `.`, `./react` and `./web-components` at compiled `.js` +
`.d.ts`, so no component source reaches a consumer. What follows is the field-test record, unedited: the paths
in the **Symptom** and **Root cause** quotes are from that run and predate the `src/ui` → `src/components`
merge, which is why they name `src/ui/*.tsx` — `hover-card.tsx` and `overlay.tsx` now live in
`src/components/`.

**Symptom.** `npm run build` (`tsc -b && vite build`) fails with ~25 errors, **all inside
`node_modules/@kitn.ai/ui/src/ui/*.tsx`** (TS2786/TS2322 for `Show`/`Portal`/`Dynamic`, `onFocusIn`, etc.),
none in app code. `vite`/`vite build` alone succeed (esbuild strips types); only `tsc` breaks. This blocks
any strict-TS React consumer's typecheck/CI.

**Root cause.** The `exports` map points `.` → `src/index.ts` and `./react` → a `.tsx`, and the `./web-components`
**type** entry does a **value** re-export from source:
```
src/web-components/web-component-types.d.ts:8
  export { configureCodeHighlighting, isCodeHighlightingEnabled } from '../primitives/highlighter';  // VALUE re-export
```
A value re-export forces `tsc` to resolve and compile `../primitives/highlighter` and, transitively, the
SolidJS components (`src/ui/hover-card.tsx`, `src/ui/overlay.tsx`, …), which don't typecheck under the
consumer's `jsx: "react-jsx"`. `skipLibCheck` doesn't help (these are `.tsx` source, not `.d.ts`).

**Consumer workaround (what unblocked the field test).** A typecheck-only `paths` redirect (Vite ignores it,
so runtime is unaffected):
```jsonc
// tsconfig.app.json
"baseUrl": ".",
"paths": { "@kitn.ai/ui/web-components": ["./src/stubs/kitn-web-components.d.ts"] }   // stub: export {}
```

**Recommended fix (upstream).**
- *Preferred:* ship **compiled `.js` + generated `.d.ts`** for the public entry points (`.`, `./react`,
  `./web-components`) instead of raw source; point `exports[...].types` at real `.d.ts` and `.default` at compiled
  `.js`. Then `skipLibCheck` covers consumers and no source is compiled. (This is a build-pipeline change.)
- *Cheaper interim:* make `src/web-components/web-component-types.d.ts` **type-only** — move the value re-export of
  `configureCodeHighlighting`/`isCodeHighlightingEnabled` to the runtime `./web-components` JS, so the `.d.ts`
  pulls no implementation.

**Affected:** `package.json` `exports`, `src/web-components/web-component-types.d.ts`, the build pipeline (emit `.d.ts`+`.js`), and (only if you keep shipping source) `src/components/hover-card.tsx` / `src/components/overlay.tsx`.

**Already partly surfaced in agent-tooling:** `debug` has a rule that recognizes "tsc errors inside node_modules/@kitn.ai/ui/src" and hands back the `paths`-stub workaround, noting it's a tracked packaging gap.

---

## P2 — Issue 7: `peerDependencies` are inverted for React consumers

```
peerDependencies:     { "react": ">=18", "solid-js": "^1.9.0" }
peerDependenciesMeta: { "react": { "optional": true } }   // solid-js NOT optional
```
`solid-js` (the authoring runtime, bundled into `dist`) is a **required** peer while `react` (what `/react`
consumers actually use) is **optional** — backwards. npm v7+ auto-installs `solid-js` so no hard error
surfaced, but it's misleading and will warn under stricter installers / pnpm.

**Recommended fix.** Move `solid-js` to a regular `dependency` (it's bundled), or mark it optional in
`peerDependenciesMeta`. Keep `react` optional; document that `/react` needs React.

**Affected:** `package.json` `peerDependencies` / `peerDependenciesMeta`.

---

## P3 — Issue 8: register-all import, not Shiki, is the chunk over Vite's 500 kB warning

**Status: fixed in the scaffolder and the starters (in the tree 2026-09-22).** A scaffolded app now
registers only the tags it places. The React path imports nothing at all, because the generated wrappers
lazy-register their own element; the raw-tag path (`vue`, `svelte`, `angular`, `vanilla`, and the MCP
scaffold's `html` and `vue` targets) loads one entry per placed tag with a dynamic
`void import('@kitn.ai/ui/web-components/<entry>')`. Dynamic and not static, because a static per-entry
block is pulled INTO the entry chunk: the five tags the `vue` starter places measured 624.7 kB raw /
186.8 kB gzip of entry chunk statically against 100.8 kB dynamically, with registration landing one
microtask later either way and every emitted front end already waiting on
`customElements.whenDefined`. Measured after the change, Vite 6: React 257.6 kB largest chunk / 1.7 MB
total, Vue 224.0 kB largest / 1.6 MB total, and **the >500 kB warning no longer fires for either**.

**Symptom, before that fix.** The default `import '@kitn.ai/ui/web-components'` put one chunk over Vite's
500 kB warning. Measured on the React scaffold the published `create-kai@0.8.0` emitted (it pins
`@kitn.ai/ui@0.35.0`), `npm run build` under Vite 6: 31 JS chunks + 1 CSS, 2.5 MB raw / 606 kB gzip with
every chunk fetched. The only chunk over the default was `register-impl-<hash>.js` at 742.2 kB raw /
213.0 kB gzip (Vite reports it as 759.97 kB).

**Root cause.** That chunk is the whole-registry registration module: 354 distinct `kai-*` names in one
file, reached from `dist/kai.es.js`, which is what `@kitn.ai/ui/web-components` resolves to. The entry
chunk is 285.3 kB raw / 91.2 kB gzip, eager, with zero static imports; everything else sits behind
`import()`. The coarse bundling is deliberate: a unified build forced per-web-component granularity and
made registration slow enough to expose prop-before-upgrade races in consumers (`config/vite/web-components.ts`,
the register-all target). So the escape hatch is a narrower import, not a change to this bundle.

**Already shipped: Shiki was never the cause.** The next largest chunks in that same build are `thread`
224.1 / 68.6 kB, the typescript grammar 181.1 / 16.0 kB, tsx 175.5 / 16.5 kB, javascript 174.8 / 16.5 kB,
one shared chunk Vite names `cn-<hash>.js` 158.6 / 36.5 kB (143 `kai-*` names, and not tailwind-merge: 0
clsx/tailwind-merge hits, the kit's own `src/utils/cn-merge.ts` replaced it), shiki core 117.0 / 36.8 kB,
shiki's javascript engine 61.0 / 21.3 kB. The 9 default grammars in `DEFAULT_LANGUAGES` total ~732 kB raw /
88 kB gzip, each one behind its own per-language `import()` in `packages/ui/src/primitives/highlighter.ts`
(language loaders at lines 21-29, themes at 33-34, shiki core and the javascript engine at 71-72), so a
grammar downloads only when a code block in it renders. The lazy-loading fix the earlier version of this
entry recommended is what the file already does.

**Escape hatches that exist today.**
- Import the web components the app uses instead of the register-all barrel:
  `void import('@kitn.ai/ui/web-components/chat')` (the entry is 23.1 kB and statically pulls its own
dependencies) in place of `import '@kitn.ai/ui/web-components'`. The `./web-components/*` subpath is in the
exports map, and this is what the scaffold emits now. The barrel is still what you get if you import it,
and it is still the only home of the imperative `toast()` helper and of `webComponentsReady`.
- Skip Shiki: `codeHighlight={false}` on `<kai-chat>` (also on `kai-message`, `kai-markdown` and
  `kai-code-block`), or globally with `configureCodeHighlighting({ enabled: false })`. Rebind grammars,
  themes and aliases with `configureCodeHighlighting({ languages, themes, aliases })`.

Re-measure from the scaffolder's own output plus `npm run build`; the chunk names, the sizes and the
500 kB warning all come straight out of Vite's build report. For the pre-fix numbers above, pin
`create-kai@0.8.0`; the fix is in the tree's `create-kai`, and reaches the registry with its next release.

**Affected:** `src/web-components/register-impl.ts` (and its `src/web-components/register/` entry),
`dist/kai.es.js`, `src/primitives/highlighter.ts`, and the registration-versus-tree-shaking guidance
(Documentation gaps, item 7 below). The scaffolder's side was
`packages/ui/mcp/mcp/tools/scaffold.ts` plus `examples/starters/{react,vue,svelte,angular,vanilla}`; the
barrel itself is unchanged and still bundles every element on purpose.

---

## P3 — Issue 9: `theme.css` rewrites a Tailwind v4 consumer's theme (tokens, dark variant, scales, globals)

**Symptom.** A consumer who imports the optional `@kitn.ai/ui/theme.css` into a Tailwind v4 build finds their
own `bg-primary` / `bg-card` / etc. utilities change color — our generic `--color-*` token names merged into
their `@theme` and the last `@import` wins. The field test found three more effects the docs never named:
their `dark:` utilities stop matching (the file's `@custom-variant dark (&:is(.dark *))` silently switches the
consumer from `prefers-color-scheme` to class-based dark), their `rounded-lg` moves from `0.5rem` to `0.6rem`
(`--radius-sm/md/lg/xl` re-point Tailwind's stock radius scale at the kit's `--radius`), and `text-sm` in their
own markup follows any `--kai-text-*` override (`--text-xs/sm/base/lg` are aliased onto the kit's type scale;
the theming guide called that a feature without saying it edits the consumer's scale).

**Root cause.** `theme.css` defines shadcn-style **unprefixed** `--color-*` tokens, Tailwind's own
`--radius-*` / `--text-*` names, a `@custom-variant dark`, and, before this fix, fourteen generic global
`@keyframes` — `blink` / `wave` / `shimmer` / `pulse-dot` / … — and a `.scrollbar-thin` utility. Tailwind v4
treats in-scope `--color-*` custom properties as `@theme` entries, so importing our sheet overrides any
same-named consumer token. `dist/theme.tokens.css` hoisted all fourteen keyframes and `.scrollbar-thin` into
the `<link>` consumer's global scope too.

**Why component usage is safe.** Consumers who only *use* the `kai-*` web components are unaffected — everything
is shadow-isolated, inherited props are pinned at `:host`, and a consumer's global CSS / Tailwind preflight /
`* {}` / same-named `--color-*` cannot reach inside a component's Shadow DOM. The collision is **opt-in**: it
only happens when you import `theme.css` into your own build. The default path (no import; theme via the
namespaced `--kai-color-*`) avoids all of it.

**Fix (shipped).**
- *Globals prefixed:* every `@keyframes` in `theme.css` is now `kai-<name>` (`kai-blink`, `kai-shimmer`,
  `kai-spinner-fade`, …) and `.scrollbar-thin` is `.kai-scrollbar-thin`. The `collapsible-down` / `-up` pair
  was deleted rather than prefixed: it shadowed tw-animate-css's keyframes of the same name, and both were dead
  (`CollapsibleContent` in `src/components/collapsible.tsx` puts the caller's class on an inner div that carries no
  `data-state`, so the `data-[state=*]:animate-*` classes on `tool.tsx` / `chain-of-thought.tsx` never matched;
  the visible collapse is the grid-template-rows transition). Those classes are gone too. No alias for the old
  names: no consumer-facing doc ever named one.
  `.chat-markdown` stays, unprefixed, as the one public class (renaming it is a breaking change) and is now
  documented as a global the kit owns. `tests/web-components/theme-globals.test.ts` pins the prefix rule and that
  every `animate-[…]` / `animate-*` reference in `src/` resolves to a declared keyframe — the one thing the
  Tailwind compiler does not check.
- *Documented* (`guides/theming.mdx` "What theme.css changes in a Tailwind build", pointer from
  `installation.mdx`): the dark-variant switch, the `--color-*` merge, the radius and text re-points, the
  `@utility` additions, the global names, and which of those `theme.tokens.css` also carries (it skips the
  variant and the utilities but still sets the same `--radius-*` / `--text-*` variables on `:root`, which
  Tailwind utilities read at runtime). `theme.tokens.css` is the recommended default for Tailwind consumers
  who do not want the kit's scale; `theme.css` is framed as opting into it. Also documented: `rem` resolves
  against the host `<html>` font-size inside shadow roots, inherited text properties the web components do not pin
  (`text-align`, `text-transform`, `font-weight`, `white-space`) leak in, and class-based-dark apps must set
  `theme="dark"` on the web components.
- The `--color-*` token names stay generic by design (the shadcn-compat surface) and alias through
  `--kai-color-*` for the no-collision path. The dark variant, radius and text re-points stay too; they are the
  opt-in the file now says it is.

**Affected:** `theme.css`, `dist/theme.tokens.css` (derived), `src/components/loader.tsx` / `text-shimmer.tsx` / `tool.tsx` / `chain-of-thought.tsx` / `artifact.tsx`, `src/components/scroll-area.tsx`, `src/web-components/file-tree/file-tree.tsx`, `apps/docs/src/content/docs/guides/theming.mdx`, `apps/docs/src/content/docs/guides/installation.mdx`, `docs/coupling-map.md` (§4 keyframes ↔ references, §9 theme.css ↔ the consumer's `@theme`).

---

## Documentation gaps (from the same field test)

1. **React quickstart is wrong** — `llms.txt` "React" omits `import '@kitn.ai/ui/web-components'`, the single most
   important line for React (Issue 1).
2. **No "consuming from a strict TS project" note** — nothing warns the package ships source and `tsc` will
   compile it, nor documents the `paths` workaround (Issue 2).
3. **No Vite-SPA backend guidance** — a Vite/React user handed a Next.js route with no note that Vite has no
   API routes / how to wire a dev middleware or proxy. (The MCP scaffold now says this + offers `mock`.)
4. **`<kai-chat>` sizing/layout** — it needs a sized container; `flex: 1; min-height: 0` in a `height: 100dvh`
   flex column makes it fill. Worth a "put it in a sized container; here's a full-height panel" snippet.
5. **`theme` defaults to `auto`** — in a light host panel on a dark-mode OS the chat renders dark inside a
   white panel. Note: align `theme` with surrounding chrome (`theme="light"`).
6. **`suggestions` is only in `component_reference`** — not in any quickstart, so consumers don't learn it
   exists. (The MCP scaffold now emits it.)
7. **Registration vs tree-shaking** — no guidance on `sideEffects` / importing one web component vs all 44.

---

## What worked well (from the report — keep)

- MCP `component_reference` rated "excellent / what unblocked me" — accurate props/events + the
  property-vs-attribute and `kai-submit → e.detail.value` contract.
- The React wrapper design (typed props, `on<Event>` handlers, arrays/objects via DOM properties) is good
  **once the web components are registered**.
- `suggestions` + `suggestionMode="submit"` + auto-hide-once-thread-starts is exactly right for starters.
- Streaming markdown rendering looked great out of the box. `npm install` was clean (0 vulnerabilities).
