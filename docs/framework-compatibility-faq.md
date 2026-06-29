# Framework Compatibility & Bundling — FAQ

> Status: every answer below was **verified against a real consumer app** (examples + a consumer-regression SMOKE), not reasoned from architecture. Source: the ui.kitn.ai hydration debug + framework verification, 2026-06-29 (branch `fix/elements-register-treeshake`).

These are the real adoption-blocker questions for a Shadow-DOM web-component library (the "web components are awkward with React/SSR/bundles" objection). All confirmed working.

## Verification matrix

| Framework | Status | How verified |
|---|---|---|
| React (Vite) | ✅ works | wrappers, per-element lazy registration |
| Next.js App Router (RSC) | ✅ works | `examples/nextjs` — SSR + `'use client'` |
| TanStack Start (SSR) | ✅ works | `examples/tanstack-start` — standard config |
| Vanilla HTML (+ autoloader) | ✅ works | SMOKE probe — coarse register-all + autoloader |
| Vue 3 | ✅ works | SMOKE probe — `isCustomElement` + `.prop` |
| Svelte 5 | ✅ works | SMOKE probe — verbatim, no config |
| Angular | ⚠️ not re-verified | hand-written `examples/angular` (stale; no scaffold support) — refresh in the examples task |

## The questions

### 1. Can I register only the components I use?
**Yes.** `import '@kitn.ai/ui/elements/chat'` self-registers just `kai-chat`. The React wrappers do this per-component (lazy import of `@kitn.ai/ui/elements/<name>` on first client mount), so a `<Chat>` consumer ships Chat + its chunk, not all 78. Verified in every example.

### 2. Is it SSR-safe?
**Yes.** Registration is gated to the browser and fires only in a client effect; on the server `<kai-*>` render as inert tags that upgrade after client registration. `import '@kitn.ai/ui/elements'` imports cleanly in pure Node (no `window` touched). Next.js + TanStack Start both SSR + hydrate with **zero hydration mismatches**.

### 3. Will my bundler tree-shake unused components?
**At runtime, yes** — only the elements you actually render get fetched (a `Button`+`Conversations` page loads ~109 kB, not all 78). Two caveats: the coarse `@kitn.ai/ui/elements` is intentionally "register everything" (side-effectful, not tree-shakeable — by design); and the React wrapper *barrel* still **emits** a chunk per element in the build output even when unused (no `/*#__PURE__*/` on the factory calls) — runtime is unaffected, but for minimal build output import elements directly (`@kitn.ai/ui/elements/button`). *(Known follow-up: PURE-annotate the wrapper factories.)*

### 4. Can I use a CDN + autoloader to auto-load only used components?
**Yes** — `@kitn.ai/ui/autoloader` as a **static module script** (CDN/static hosting) lazily registers only the `kai-*` elements present in the DOM (scans on load + a MutationObserver for runtime injections). Verified: it registers `kai-status`/`kai-badge` when present and correctly skips elements that aren't. **Caveat:** the autoloader is NOT importable through a bundler (it resolves siblings off `import.meta.url`) — doing so 404s, but it emits a clear warning naming the fix. In a bundled app use per-element or register-all imports (or `setAutoloaderBasePath('<cdn>/')`).

### 5. Does `import '@kitn.ai/ui/elements'` register everything?
**Yes.** (This was BROKEN — tree-shaken — and is now fixed + guarded by `scripts/verify-elements-bundle.mjs`.) Verified in vanilla/Vue/Svelte and the docs site. Tip: `await elementsReady` (exported from the entry) or `customElements.whenDefined(tag)` before setting array/object props.

### 6. Does `registerAll()` work?
**Yes** (it imports the now-fixed coarse bundle).

### 7. Does it work with React / Next.js / TanStack Start?
- **React/Next.js App Router:** yes. A Server Component can render the wrappers directly — they ship a `'use client'` banner, so they're client components a Server Component can render. A consumer only needs *their own* `'use client'` when *their* component uses hooks/state/handlers (standard RSC, not a kit rule).
- **TanStack Start:** yes, on standard config (`tanstackStart()` + `viteReact()`); keep `@kitn.ai/ui` external to the SSR build; no `'use client'`-equivalent needed.

### 8. What do I import for "just the toast helper" vs "everything"?
- Toast only, lean: `import { toast } from '@kitn.ai/ui'` (main entry). *(Known gap: the convenience `toast` re-export on `@kitn.ai/ui/elements` isn't typed — works at runtime, type-errors; use the main entry.)*
- Everything: `import '@kitn.ai/ui/elements'` (side-effectful, registers all).

### 9. Framework-specific setup
- **Vue:** set `compilerOptions.isCustomElement: (t) => t.startsWith('kai-')`; bind array/object props with `:prop.prop` (or assign the JS property after `whenDefined`); listen with `@kai-event`.
- **Angular:** `CUSTOM_ELEMENTS_SCHEMA`; `[prop]` / `(kai-event)`.
- **Svelte:** works as-is; `bind:this` + assign props, `on:kai-event`.
- **Vanilla:** `import '@kitn.ai/ui/elements'` (or the autoloader for CDN); set props in JS after `elementsReady`.

## Known minor issues (none block adoption)
- **`@utility` CSS warnings** (P2): shipped `dist/elements/compiled.css` + `dist/theme.tokens.css` carry Tailwind v4 `@utility` at-rules → non-fatal `lightningcss` warnings in consumer builds (styling still works; they're redundant leftovers). Fix: strip `@utility` from the distributed CSS.
- **Autoloader-through-a-bundler** (P3): 404s by design; well-warned. Document the static-only contract.
- **`register-impl` chunk-size warning** (P3): expected for register-all; recommend per-element/autoloader for lean builds.
- **`elementsReady`/`toast` types on `/elements`**: `elementsReady` now typed; `toast`/`configureToasts` re-exports on `/elements` still untyped (use the main entry).
