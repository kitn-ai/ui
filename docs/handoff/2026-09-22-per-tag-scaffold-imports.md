# Handoff -- the scaffold and the starters import only the tags they use

**Date:** 2026-09-22 · **Branch:** `feat/per-tag-scaffold-imports` (based on `main` @ `41b9dd43`) ·
**Status:** RELEASED on 2026-09-22 through release PR #403 (merge `17168d5f`), over OIDC, in order:
`@kitn.ai/ui` 0.36.0, `create-kai` 0.9.0, `@kitn.ai/mcp` 0.2.2, `@kitn.ai/cli` 0.5.0. The docs
deploy was re-run once jsDelivr served 0.36.0 and is green. The second batch (the `doctor` finding,
the MCP tool schema, the two false positives in `debug-rules.ts`) is sections 10 and 11 and shipped
in the same release. Backlog:

Read
[`2026-09-22-release-shipped-and-the-skip-path.md`](2026-09-22-release-shipped-and-the-skip-path.md)
first; this is the work that followed it.

---

## 1. What changed, and the one number that matters

A scaffolded app and a starter used to import the register-all barrel
(`import '@kitn.ai/ui/web-components'`), which pulls `dist/register-impl-<hash>.js`: every custom
element the kit has, 742.2 kB raw / 213.0 kB gzip, into an app that places two of them. They now
register only the tags they place.

Measured with Vite 6, a scaffold built from THIS tree's `create-kai` against the published
`@kitn.ai/ui@0.35.0`, before and after:

| | before | after |
|---|---|---|
| React scaffold, largest chunk | `register-impl` 742.2 kB / 213.0 kB gzip | 257.6 kB (the entry) |
| React scaffold, total `dist` | 2.5 MB | 1.7 MB |
| Vue scaffold, entry chunk | small, plus a 742.2 kB lazy chunk | 100.8 kB |
| Vue scaffold, total `dist` | ~2.5 MB | 1.6 MB |
| Vite's >500 kB advisory | fires | **does not fire, either framework** |

## 2. Three registration mechanisms, not one

The recon that scoped this found three, and conflating them is how a scaffold ends up registering
nothing (a `kai-*` tag nothing defines is an inert unknown element that renders empty, with no error
anywhere):

1. **The React wrappers self-register.** `frameworks/react/index.tsx` generates one wrapper per tag
   with a per-tag lazy thunk (`() => import('@kitn.ai/ui/web-components/chat')`), run by
   `ensureRegistered` (`frameworks/react/runtime.tsx:65`) with a `customElements.whenDefined`
   re-apply for the upgrade race. `registerAll()` is an opt-in escape hatch, and
   `@kitn.ai/ui/react` does **not** statically pull the barrel. So the React starter needs no
   registration import at all, and its barrel import was pure redundancy: deleting one line removed
   the 742 kB chunk from a fresh `npm create kai --framework react`.
2. **Raw-tag apps take a per-tag entry.** `@kitn.ai/ui/web-components/<entry>` resolves to
   `dist/web-components/<entry>.js`, a module that calls `customElements.define` at module eval.
   The entry basename comes from `src/web-components/web-component-manifest.json`'s `tags` map and is
   **never** derived by stripping `kai-`: ten differ (`kai-conversations -> conversation-list`,
   `kai-sources -> source`, ...). `verify-scaffold`'s new check reads that map; nothing restates it.
3. **SSR-capable targets keep the barrel, or guard the entries.** Per-tag entries are CLIENT-ONLY:
   52 of the 95 emitted entries throw `window is not defined` at import in Node, because the Solid
   client runtime touches `window` at module eval. The barrel is the SSR-import-safe form
   (`register/register.ts` guards on `typeof window` and loads behind a dynamic import). So the MCP
   scaffolder's `svelte`, `tanstack-start` and `angular` targets load their entries inside
   `if (typeof window !== 'undefined')`.

## 3. The design correction a measurement forced, and it is the lesson worth keeping

The first cut emitted **static** per-tag imports on the client-only targets, on the reasoning that
a static import registers synchronously and that per-tag meant per-tag either way. Measuring the vue
scaffold killed it: a static per-entry block is pulled INTO the entry chunk, so the five tags the
vue starter places produced a **624.7 kB** entry chunk and the advisory still fired. The same five
tags imported dynamically left the entry at **100.8 kB** and the largest chunk at 229.4 kB, no
advisory.

So the emitted form is one shape with an optional guard: `void import('.../<entry>')`, wrapped in the
browser guard only where the module is evaluated on a server. Registration timing is identical (the
entry defines its element at module eval whenever it loads, one microtask later), and every emitted
front end already waits on `customElements.whenDefined` before it sets a property or mounts, so the
dynamic form costs nothing and buys the entry chunk back. **Anything that decides "static because it
is tidier" here should re-run the two builds first**; the numbers are in
`docs/package-consumer-issues.md` Issue 8 and in `scaffold.ts`'s `TAG_IMPORT_NOTE`.

## 4. Where it landed

| surface | what |
|---|---|
| `packages/ui/mcp/mcp/tools/scaffold.ts` | `emittedTags()` (exported, derives the placed tags: `kai-chat` always, never the message-embedded tags, plus `kai-resizable-item` for the artifact split), `entryBasenames()` (manifest lookup, throws naming a tag with no entry), `tagImports()` (the one block builder, `guard` for SSR). Six call sites: `htmlModule`, `renderJsx` (react only; next returns earlier), `renderVue`, `renderSvelte` (2-space indent, guarded), `renderTanstackStart` (guarded), `renderAngular` (guarded) |
| `examples/starters/{react,vue,svelte,angular,vanilla}/src/main.*` | react deletes the import (wrappers self-register). The other four emit one dynamic import per entry, derived from the starter's own `TAGS` array UNION its real placement sites, and their boot prose now says the entries load a microtask later and the gate is load-bearing |
| `examples/starters/*/src/chat-data.ts` | the demo assistant message that told the reader to import the barrel now names the per-tag entries, so the app's own copy matches the file it ships |
| `packages/ui/scripts/verify-scaffold-compiles.mjs` | the new derived structural check, and the guard that matters here: `tsc` cannot see a missing registration, so an app that registers 96 elements to render one compiles perfectly |
| `packages/ui/mcp/mcp/scaffold.test.ts`, `packages/ui/mcp/tests/emitted-*.live.test.ts` + `emitted-source-specifiers.ts` | the wording/shape assertions, and one shared rewriter that resolves each `web-components/<entry>` specifier to the source module **by basename** (walking `src/web-components/**`, throwing on zero or more than one candidate) |
| `packages/create-kai/test/kit-contract.test.ts` | the templates-versus-exports guard, taught the `./web-components/*` wildcard |
| `docs/package-consumer-issues.md` | Issue 8 gets a `**Status: fixed**` paragraph and keeps the pre-fix measurement as the record |

## 5. The guards, and the one that failed first

`verify:scaffold`'s new check runs SURFACES x INTEGRATIONS x FRAMEWORKS and asserts, per cell, that
every entry `emittedTags(surface.components)` needs is imported and that no VALUE import of the
barrel survives (an `import type` from it is expected and allowed). It derives its three inputs
(the tag set from the emitter, the tag-to-entry map from the manifest, the framework set from
`FRAMEWORKS`) and it fails loudly when `next`/`solid` -- the two targets that register nothing --
start emitting, so the skip cannot quietly go stale. Both anti-vacuity directions are asserted.

Two things it caught, worth knowing because they are the shape of this class of change:

- **`create-kai`'s `kit-contract.test.ts` failed on all twenty new specifiers.** Its resolver looked
  up `exports['./web-components/resizable']`, but the kit declares those through the
  `./web-components/*` pattern. Twenty false findings on a correct template. The wildcard branch was
  added WITH a requirement that the substituted declaration exists, so the pattern cannot wave a typo
  through; mutation-proved by misspelling one entry and watching the test name it.
- **The review's `D1`: my design's claim that the existing `COMPONENT_ENTRY` assertions "stay true
  via the import type line" was false for vue**, which emits no barrel specifier at all now. The
  membership check became entry-or-subpath, and the new derived test compensates.

## 6. Verification

All serial, on the final tree: `nx build ui --skip-nx-cache`, `nx build mcp`, `nx build cli`,
`nx build create-kai --skip-nx-cache` (15 patches verified against the changed starters), unit
**424 files / 6053 tests**, emitted **5 files / 36 tests** (these EXECUTE the emitted module against a
mounted `<kai-chat>`, so they are the functional proof that the per-tag entries register),
`verify:scaffold` (**528 scaffolds checked, 176 skipped, 705/705 compile clean**), create-kai
**21 files / 935 tests**, cli **39 tests**, `verify:generated` (19 artifacts), create-kai `verify:pack`
(202 files), and the whole `packages/ui` lint battery (13 gates). The consumer builds above were
measured from freshly scaffolded apps.

## 7. Traps this session added

1. **A per-tag entry is client-only; the barrel is the SSR-safe form.** Static-importing an entry in
   an SSR module is a `window is not defined` throw at import, not a hydration warning.
2. **A static per-tag import is not the small option.** It is pulled into the entry chunk: 624.7 kB
   against 100.8 kB for the same five tags. Measure both before choosing.
3. **Never derive an entry basename by stripping `kai-`.** Ten of 96 differ, and the failure lands in
   the consumer's bundler, not in this repo.
4. **`@kitn.ai/ui/react` does not pull the barrel**, and its wrappers self-register per tag with an
   upgrade-race guard. A barrel import beside them is redundant, and a comment claiming they "do NOT
   auto-register" is stale (that one has been there since before the wrappers gained the thunk).
5. **`kai-toast-region` is created at runtime** by `toast()` (`src/primitives/toast-store.ts:236`),
   entry `toast`. Neither the scaffolds nor the starters call `toast()`, so neither imports it; the
   toast PATTERN snippet imports `toast` from the barrel, which also registers the region. A consumer
   who copies that snippet gets both.
6. **The starters hold the tag set twice** (the import block and the `TAGS` array the boot gate
   awaits). Nothing ties them, and a drift used to be a silent hang. They now throw by name before
   the await. `create-kai` copies these files verbatim and has no patch or test anchored on the
   registration line, so the drift guard is the starters' own.

## 8. Open work, ranked

1. **`kai init` still advises the barrel** (`packages/create-kai/src/init.ts:161`), deliberately: it
   wires an EXISTING project and cannot know which tags that project places. The per-tag default
   belongs to the scaffolder.
2. **The MCP server routes a handler throw to a protocol error, not to `isError: true` content**
   (`packages/ui/mcp/mcp/server.ts:135` is a bare `return tool.handler(args)`; the schema path at
   `:122`/`:133` maps failures). My new `entryBasenames` throw is only reachable by asking for a tag
   with no entry (`kai-remote`), but when it fires the caller gets an unstructured protocol error
   rather than the message. Deciding the server's error-routing contract is its own change.
3. **`packages/blocks/src/forms/html.ts:37` still emits register-all** for a block's HTML form. It is
   a separate emitter with its own tests; the same per-tag derivation applies if someone wants it.
4. **Not verified locally, so CI is the only check:** `verify:starters` (network; it builds each
   starter, and the four raw-tag starters changed), and the storybook/browser legs.

## 9. Deliberate non-changes, so they are not re-litigated

- The register-all barrel itself is unchanged, and still bundles every element on purpose: the coarse
  target is what makes registration one microtask instead of N.
- `reference.ts`'s three load modes and `apps/docs` snippets are library documentation, not scaffold
  output, so they keep showing all three modes.
- The toast pattern snippet keeps its barrel import: `toast` is exported from there.
- `packages/blocks/src/forms/html.ts` keeps the register-all barrel for a block's add form. A block
  is a FRAGMENT pasted into an app whose registration strategy the block cannot know, and its
  authored pattern is the autoloader (CDN-only through a bundler, which is what the swap exists
  for). Recorded as a deliberate non-goal, not an oversight; safe to revisit, because
  `defineWebComponent`'s `customElements.get()` guard means a per-tag entry beside the barrel is a
  no-op rather than a redefinition.

---

## 10. The harness-facing half: how a project's agent learns the rule

The per-tag default has one failure mode, and it is silent: a `kai-*` tag nothing defines is an
inert unknown element, so it renders empty with no error, no failed import and nothing in a
console. Three additions close it, and each works WITHOUT the agent having any of our tooling:

- **`kai doctor` gains the structural finding.** `packages/cli/src/placed-tags.ts` (new leaf) scans
  a project's own sources for placements (`<kai-*` in markup, `el('kai-*')` /
  `createElement('kai-*')` in code), compares them against what the project registers (the barrel, a
  per-tag entry, or its own `customElements.define`), and reports each tag with the exact line to
  add. Measured end to end on a freshly scaffolded project: adding a bare `<kai-sources>` produced
  `<kai-sources> in src/App.vue -> add: import '@kitn.ai/ui/web-components/source'`, plus the two
  caveats the line needs (client-only on SSR, the barrel as the SSR-safe alternative).
  The tag-to-entry map is a static import of the manifest, inlined at build time like
  `mcp/mcp/manifest.ts` and `tools/scaffold.ts` already do; deriving it from the INSTALLED kit is
  not merely heavier but unusable, because a built `dist/web-components/<entry>.js` names the tags it
  merely dispatches (`chat.js` carries `kai-submit`, `kai-attachments-change`, ...) alongside the one
  it defines.
- **The MCP `scaffold` tool rejects an unknown tag at validation.** `components` is now an enum over
  the manifest's tags (derived, exported as `WEB_COMPONENT_TAGS`), so the tool schema every agent
  reads LISTS the valid tags, and a typo gets a message naming it. A handler guard backs the enum
  because `validate-args.ts` deliberately polices unknown and missing KEYS only, not value types,
  so the schema alone would not have stopped the throw reaching `tool.handler(args)`.
- **`component_reference` leads with the per-tag entry** and keeps the barrel as the alternative,
  recording its three remaining roles (every tag, SSR-import-safe, and `toast()`'s home).

## 11. The trap this batch found, and it is the general one

**`kai doctor` matches the `debug` rule set against SOURCE FILES, and those rules were written for a
PASTED SYMPTOM. Symptom VOCABULARY therefore fires on correct code and on the comments that explain
the failure.** Two instances, both found by running the built CLI on a fresh scaffold rather than by
reading code:

| rule | what it matched | in |
|---|---|---|
| `web-components-not-registered` | the bare token `unregistered`, the call `customElements.get(tag)`, and `blank` + `render` | the starters' own upgrade gate (`const unregistered = TAGS.filter((tag) => !customElements.get(tag))`) and its comment ("renders a blank page") |
| `array-as-attribute` | the tail of `:messages="messages"` and of `[messages]="messages"` | Vue's and Angular's PROPERTY-BINDING syntax, which is the correct way to pass an array |

Both were reported as warnings on a freshly scaffolded, entirely correct app. The fixes, in the
order they generalize:

1. **Comments are blanked before the rules run** (`sourceCode` in `placed-tags.ts`), because a
   comment explains the symptom and code is the signal. String bodies stay visible: a specifier or a
   pattern inside a string is still evidence. Measured safe in both directions: the vue starter's
   "In-place mutation" warning came from a COMMENT in `useChat.ts` and is gone, while real markup
   still fires the attribute rule.
2. **Rule 6's signals need the report's shape**: a bare `unregistered` now needs a noun after it, and
   `customElements.get` needs its `undefined` comparison, which is what a pasted diagnostic carries
   and what a guard does not. Both directions are pinned by tests.
3. **Rule 1 needs a lookbehind**: a leading `:`, `[`, `.` or `-` is a binding, a member access or a
   compound attribute name, not an attribute.

The lesson to keep: **when a rule set written for one input shape is pointed at another, the false
positives are the rules' vocabulary matching the new input's own words.** No amount of reading the
regexes finds that; running the built artifact on a correct project does. A future rule added to
`debug-rules.ts` should be tested against `doctor` on the starters before it ships.
