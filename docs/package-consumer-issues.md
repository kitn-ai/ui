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

## P0 — Issue 1: `/react` wrappers don't register the custom elements

**Symptom.** Following the documented React setup renders an empty `<kai-chat>` — `customElements.get('kai-chat') === undefined`.

**Root cause.** `frameworks/react/index.tsx` only imports `./runtime`; nothing in the `/react` import graph
calls `customElements.define`. Registration lives only in the side-effect bundle `@kitn.ai/ui/elements`
(`dist/kai.es.js`). A consumer importing only `/react` gets wrappers that render undefined elements.

**Why it bites everyone.** The package's own `llms.txt` React example omits `import '@kitn.ai/ui/elements'`,
so the primary onboarding path produces non-rendering code.

**Recommended fix (pick one).**
- *Preferred:* make `@kitn.ai/ui/react` self-registering — add the elements registration as a side effect at
  the top of `frameworks/react/index.tsx` (and set `"sideEffects"` so bundlers keep it), so importing any
  wrapper guarantees the element is defined.
- *At minimum:* fix `llms.txt`/`llms-full.txt` (and any quickstart) to always show `import '@kitn.ai/ui/elements'` first.

**Affected:** `frameworks/react/index.tsx`, `frameworks/react/runtime.tsx`, `llms.txt`/`llms-full.txt` generator (`scripts/gen-llms.mjs`).

**Already mitigated in agent-tooling:** the MCP `scaffold` now always emits `import '@kitn.ai/ui/elements'` first, and `debug` has a rule for "renders nothing / not registered." The package + generated docs still need the fix.

---

## P0 — Issue 2: package ships raw `.tsx` source → consumers' `tsc` compiles the SolidJS internals and breaks

**Symptom.** `npm run build` (`tsc -b && vite build`) fails with ~25 errors, **all inside
`node_modules/@kitn.ai/ui/src/ui/*.tsx`** (TS2786/TS2322 for `Show`/`Portal`/`Dynamic`, `onFocusIn`, etc.),
none in app code. `vite`/`vite build` alone succeed (esbuild strips types); only `tsc` breaks. This blocks
any strict-TS React consumer's typecheck/CI.

**Root cause.** The `exports` map points `.` → `src/index.ts` and `./react` → a `.tsx`, and the `./elements`
**type** entry does a **value** re-export from source:
```
src/elements/element-types.d.ts:8
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
"paths": { "@kitn.ai/ui/elements": ["./src/stubs/kitn-elements.d.ts"] }   // stub: export {}
```

**Recommended fix (upstream).**
- *Preferred:* ship **compiled `.js` + generated `.d.ts`** for the public entry points (`.`, `./react`,
  `./elements`) instead of raw source; point `exports[...].types` at real `.d.ts` and `.default` at compiled
  `.js`. Then `skipLibCheck` covers consumers and no source is compiled. (This is a build-pipeline change.)
- *Cheaper interim:* make `src/elements/element-types.d.ts` **type-only** — move the value re-export of
  `configureCodeHighlighting`/`isCodeHighlightingEnabled` to the runtime `./elements` JS, so the `.d.ts`
  pulls no implementation.

**Affected:** `package.json` `exports`, `src/elements/element-types.d.ts`, the build pipeline (emit `.d.ts`+`.js`), and (only if you keep shipping source) `src/ui/hover-card.tsx` / `src/ui/overlay.tsx`.

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

## P3 — Issue 8: default bundle pulls large Shiki language chunks

A basic `<Chat>` `vite build` emits ~600 kB of Shiki language chunks (bash/css/html/js/ts/tsx/vue/svelte;
main chunk 615 kB / 174 kB gzip → "chunks > 500 kB" warning). Syntax highlighting registers many languages
by default, even for a chat that may never render code.

**Recommended fix.** Lazy-load language grammars on first code block, and document the existing escape
hatches prominently: `codeHighlight={false}` on `<kai-chat>` and `configureCodeHighlighting(...)`.

**Affected:** `src/primitives/highlighter.ts`, docs.

---

## P3 — Issue 9: `theme.css` token names + global keyframes can collide in a Tailwind v4 consumer

**Symptom.** A consumer who imports the optional `@kitn.ai/ui/theme.css` into a Tailwind v4 build finds their
own `bg-primary` / `bg-card` / etc. utilities change color — our generic `--color-*` token names merged into
their `@theme` and the last `@import` wins.

**Root cause.** `theme.css` defines shadcn-style **unprefixed** `--color-*` tokens (plus a few generic global
`@keyframes` — `blink` / `wave` / `shimmer` / `pulse-dot` — and a `.scrollbar-thin` utility). Tailwind v4
treats in-scope `--color-*` custom properties as `@theme` entries, so importing our sheet overrides any
same-named consumer token. The global keyframes / `.scrollbar-thin` could likewise clash by name.

**Why component usage is safe.** Consumers who only *use* the `kai-*` web components are unaffected — everything
is shadow-isolated, inherited props are pinned at `:host`, and a consumer's global CSS / Tailwind preflight /
`* {}` / same-named `--color-*` cannot reach inside a component's Shadow DOM. The collision is **opt-in**: it
only happens when you import `theme.css` into your own build. The default path (no import; theme via the
namespaced `--kai-color-*`) avoids all of it.

**Recommended fix.**
- *Consumer guidance (shipped in docs):* prefer theming via the namespaced `--kai-color-*` tokens (no import);
  if you do import `theme.css`, import it **before** your own token overrides so yours win. No CSS import is
  needed for the components themselves.
- *Upstream (planned):* namespace the global `@keyframes` (`blink` / `wave` / `shimmer` / `pulse-dot`) and the
  `.scrollbar-thin` utility to a `kai-*` prefix so they can't clash by name. The `--color-*` token names stay
  generic by design (the shadcn-compat surface) but already alias through `--kai-color-*` for the no-collision path.

**Affected:** `theme.css` (keyframe + `.scrollbar-thin` rename), `docs-site/src/content/docs/guides/theming.mdx`, `docs-site/src/content/docs/guides/installation.mdx`.

---

## Documentation gaps (from the same field test)

1. **React quickstart is wrong** — `llms.txt` "React" omits `import '@kitn.ai/ui/elements'`, the single most
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
7. **Registration vs tree-shaking** — no guidance on `sideEffects` / importing one element vs all 44.

---

## What worked well (from the report — keep)

- MCP `component_reference` rated "excellent / what unblocked me" — accurate props/events + the
  property-vs-attribute and `kai-submit → e.detail.value` contract.
- The React wrapper design (typed props, `on<Event>` handlers, arrays/objects via DOM properties) is good
  **once elements are registered**.
- `suggestions` + `suggestionMode="submit"` + auto-hide-once-thread-starts is exactly right for starters.
- Streaming markdown rendering looked great out of the box. `npm install` was clean (0 vulnerabilities).
