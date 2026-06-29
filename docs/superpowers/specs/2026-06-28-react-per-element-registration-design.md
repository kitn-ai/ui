# React per-element registration — design

**Date:** 2026-06-28
**Status:** Approved (design), pending implementation
**Branch:** feat/new-components-epic

## Problem

`@kitn.ai/ui/react` wrappers force the **register-all** bundle. The built `react.js`
carries a Rollup banner — `import '@kitn.ai/ui/elements';` (see `vite.config.react.ts`
`output.banner`) — so a React app that imports a single `<Button>` pulls
`dist/kai.es.js` → `register-impl`, registering **all 74 elements (~162 KB gzip)** plus
the full shared CSS sheet. A consumer who isn't building a chat harness should not ship
the harness.

The per-element dist entries already exist (`dist/elements/<name>.js`, each self-registers
on import) and the `./elements/*` export is public. The gap is purely that the React layer
opts everyone into register-all.

## Constraint that shapes the design

The elements bundle is **SSR-unsafe to import statically**. Not because of
`customElements` — `defineWebComponent` already no-ops on the server
(`define.tsx`: `if (typeof customElements === 'undefined') return;`) — but because Solid's
client runtime touches `window` at **module-eval** (`delegateEvents`). That is exactly why
`src/elements/register.ts` gates registration behind a browser check + **dynamic** `import()`
(static ESM imports hoist and evaluate unconditionally; a dynamic import can be gated).

Therefore per-element registration **must be client-only and dynamic**. A static
`import '@kitn.ai/ui/elements/button'` in a wrapper would crash SSR.

**Enabler:** `createWebComponent` (`frameworks/react/runtime.tsx`) already has a
`customElements.whenDefined(tag).then(applyProps)` upgrade-race guard, so asynchronous
registration is already handled — props set before upgrade are re-applied after it. Today's
model is *already* async (the banner's `kai.es.js` kicks off `import('./register-impl')` in a
microtask), so per-element is not a regression in the async model — only in *which* chunk loads.

## Design

Per-wrapper **dynamic-import thunk**, triggered client-only by the runtime.

### 1. Generator — `scripts/gen-element-api.mjs`

Emit a 4th argument per wrapper: a thunk with a **literal** module specifier (bundlers can
only code-split static specifiers — never `import(\`…/${tag}\`)`):

```ts
export const Button = createWebComponent<ButtonProps>(
  'kai-button',
  ["theme", ...propNames],
  { ...eventMap },
  () => import('@kitn.ai/ui/elements/button'),   // ← new: per-element register thunk
);
```

The module name is the tag minus the `kai-` prefix (the same mapping the generator already
uses for `element-manifest.json`).

### 2. Runtime — `frameworks/react/runtime.tsx`

`createWebComponent` gains an optional 4th param `register?: () => Promise<unknown>`. On the
client, fire it **once per tag**, browser-gated and deduped:

```ts
const triggered = new Set<string>();           // module-level
function ensureRegistered(tag: string, register?: () => Promise<unknown>) {
  if (!register || triggered.has(tag)) return;
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return;
  if (customElements.get(tag)) { triggered.add(tag); return; }
  triggered.add(tag);
  void register();                              // fire-and-forget; whenDefined re-applies props
}
```

Call `ensureRegistered(tagName, register)` from a `useLayoutEffect` in the component (runs
client-only, never on the server). The existing `whenDefined` guard handles the post-load
prop application — no other runtime change needed.

### 3. Build — `vite.config.react.ts`

- **Remove** the `output.banner: "import '@kitn.ai/ui/elements';"` (the decoupling).
- **Add** `@kitn.ai/ui/elements/*` to `rollupOptions.external` so the per-element dynamic
  imports resolve to the consumer's installed per-element dist chunks (not bundled into
  `react.js`). `@kitn.ai/ui/elements` stays external too (still used by `registerAll`).

### 4. Backward compat + eager opt-in

- `@kitn.ai/ui/elements` (register-all) stays a public entry — unchanged.
- Export `registerAll()` from `@kitn.ai/ui/react` (a browser-gated `() => import('@kitn.ai/ui/elements')`)
  for consumers who want eager all-registration, e.g. to avoid any first-mount upgrade flash.
- The `useKaiChat` hook and other named exports are unchanged.

## SSR behavior

- Server render emits the custom-element tag as an unknown element (no upgrade) — same as
  any client-registered web component. No `window`/`customElements` access on the server
  (the thunk only fires inside `useLayoutEffect`).
- On hydration/mount, the thunk loads the element chunk → registers → `whenDefined` applies
  props. Identical async-upgrade flow to today, just per-element.

## Tradeoff (accepted)

A brief first-mount upgrade delay per element (its chunk loads async). Marginal — today's
registration is already async. Mitigated by the `registerAll()` / `@kitn.ai/ui/elements`
eager opt-in.

## Verification

- **Typecheck** 4/4 (root Solid, react, react tests, MCP).
- **Unit** suite unchanged (1215 in the non-browser project).
- **Build** green; `react.js` no longer contains the `import '@kitn.ai/ui/elements'` banner.
- **Bundle proof (esbuild, the win):** a consumer entry `import { Button } from '<dist>/react.js'`
  bundled with `react`/`@kitn.ai/ui/elements/*` resolvable must pull **only** button's element
  chunk, **not** register-all. Compare gzip before/after — expect a large drop vs the current
  162 KB register-all pull.
- **SSR safety:** importing `react.js` in a Node context (no `window`) must not throw.
- **Registration survives:** the dynamic-import thunk must remain in the bundle (sideEffects
  on `dist/elements/*.js` already guarantees the registration side-effect isn't dropped).
- **Functional:** a wrapper still upgrades + receives props in a browser (whenDefined path).

## Out of scope

- The `.` Solid components barrel (`dist/index.js`) — a single concatenated module, not
  intra-file tree-shakeable; a separate `vite.config.barrel.ts` concern (per-component entries
  / `preserveModules`), not this change.
- Splitting the shared compiled CSS (prose/markdown ~2.8 KB gz) out of the shared sheet —
  marginal, separate.
- Vue/Svelte/Angular wrappers — none exist in `frameworks/` today.
