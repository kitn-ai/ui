# React Per-Element Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `@kitn.ai/ui/react` wrappers lazy-register their own element on first client mount instead of pulling the register-all bundle, so a React app ships only the elements it uses.

**Architecture:** Each generated wrapper passes a literal dynamic-import thunk (`() => import('@kitn.ai/ui/elements/<name>')`) to `createWebComponent`, which fires it client-only and deduped on mount; the existing `whenDefined` guard re-applies props after the async upgrade. The build drops its register-all banner and externalizes the element subpaths; a `registerAll()` opt-in stays for eager registration.

**Tech Stack:** TypeScript, Vite (lib build, Rollup), React forwardRef wrappers over Solid `customElement` web components, esbuild (verification).

## Global Constraints

- Elements bundle is SSR-unsafe to import statically (Solid runtime touches `window` at eval); registration MUST be client-only + browser-gated. Copied from spec.
- Per-element thunks MUST use a **literal** specifier (`'@kitn.ai/ui/elements/button'`) — bundlers can only code-split static specifiers.
- Do not break SSR: importing `dist/react.js` in a Node context must not throw.
- Backward compat: `@kitn.ai/ui/elements` (register-all) stays a public entry, unchanged.
- `frameworks/react/index.tsx` is GENERATED (`scripts/gen-element-react.mjs`) — never hand-edit; change the generator and regenerate.
- Gate after the change: `npm run typecheck` 4/4, unit project 1215, `npm run build` green.

---

### Task 1: tsc resolution stubs for the self-subpath imports

The generated `import('@kitn.ai/ui/elements/<name>')` and runtime's `import('@kitn.ai/ui/elements')` must typecheck under both React configs without walking the Solid source. Reuse the existing empty stub (`tests/react/elements-stub.d.ts`, `export {}`).

**Files:**
- Modify: `tsconfig.react.json` (add `baseUrl` + `paths`)
- Modify: `tsconfig.react.test.json:15-18` (add the `/*` subpath mapping)

**Interfaces:**
- Produces: both configs resolve `@kitn.ai/ui/elements` and `@kitn.ai/ui/elements/*` to the empty stub module (`Promise<{}>`).

- [ ] **Step 1: Add baseUrl + paths to `tsconfig.react.json`** — inside `compilerOptions`, after `"jsx": "react-jsx"`:

```json
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@kitn.ai/ui/elements": ["./tests/react/elements-stub.d.ts"],
      "@kitn.ai/ui/elements/*": ["./tests/react/elements-stub.d.ts"]
    }
```

- [ ] **Step 2: Add the subpath mapping to `tsconfig.react.test.json`** — add one line to the existing `paths`:

```json
    "paths": {
      "@kitn.ai/ui/react": ["./frameworks/react/index.tsx"],
      "@kitn.ai/ui/elements": ["./tests/react/elements-stub.d.ts"],
      "@kitn.ai/ui/elements/*": ["./tests/react/elements-stub.d.ts"]
    }
```

- [ ] **Step 3: Verify no typecheck regression** (nothing imports the subpaths yet, so this is harmless):

Run: `npm run typecheck`
Expected: exit 0, all 4 passes clean.

- [ ] **Step 4: Commit**

```bash
git add tsconfig.react.json tsconfig.react.test.json
git commit -m "build(react): stub @kitn.ai/ui/elements/* for the wrapper typecheck"
```

---

### Task 2: Runtime — register thunk param, client-only trigger, registerAll

**Files:**
- Modify: `frameworks/react/runtime.tsx` (add module-level helpers + a 4th param + a mount effect)

**Interfaces:**
- Produces: `createWebComponent(tagName, propNames, eventMap, register?)` — new optional 4th param `register?: () => Promise<unknown>`. Exported `registerAll(): Promise<unknown> | undefined`.
- Consumes (Task 3): the generator passes the thunk as the 4th arg and re-exports `registerAll`.

- [ ] **Step 1: Add the dedup helper + registerAll** — insert ABOVE `export function createWebComponent` (after the `WebComponentProps` interface):

```ts
// Per-element registration fires on the CLIENT, once per tag. The element modules
// touch `window` at module-eval (Solid's runtime), so the thunk must never run on
// the server — it is only ever called from a client effect, browser-gated here too.
const registered = new Set<string>();
function ensureRegistered(tagName: string, register?: () => Promise<unknown>): void {
  if (!register || registered.has(tagName)) return;
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return;
  registered.add(tagName);
  if (customElements.get(tagName)) return; // already defined (e.g. via registerAll)
  void register();
}

/** Eagerly register ALL kai-* elements (the register-all bundle). Opt-in escape
 *  hatch for consumers who prefer no first-mount upgrade delay. Browser-only;
 *  a no-op on the server. */
export function registerAll(): Promise<unknown> | undefined {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return undefined;
  return import('@kitn.ai/ui/elements');
}
```

- [ ] **Step 2: Add the 4th param to the signature** — change the `createWebComponent` signature:

```ts
export function createWebComponent<P extends WebComponentProps>(
  tagName: string,
  /** DOM-property names to assign from props (incl. `theme`). */
  propNames: readonly string[],
  /** Map of React handler prop → DOM event name. */
  eventMap: Record<string, string>,
  /** Client-only thunk that loads + registers this element (a literal dynamic
   *  import of its `@kitn.ai/ui/elements/<name>` chunk). */
  register?: () => Promise<unknown>,
): ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<HTMLElement>> {
```

- [ ] **Step 3: Trigger registration on mount** — add this effect inside the `forwardRef` component body, immediately AFTER the existing prop-assigning `useLayoutEffect` (the one ending with the `whenDefined(...).then(applyProps)` block):

```ts
    // Client-only, deduped: load + register THIS element on first mount. The
    // prop-assign effect's whenDefined guard re-applies props once it upgrades.
    useLayoutEffect(() => {
      ensureRegistered(tagName, register);
    }, []);
```

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: exit 0, all 4 passes clean (registerAll's `import('@kitn.ai/ui/elements')` resolves to the stub from Task 1).

- [ ] **Step 5: Commit**

```bash
git add frameworks/react/runtime.tsx
git commit -m "feat(react): client-only per-element register hook + registerAll"
```

---

### Task 3: Generator — emit the thunk, update header, re-export registerAll

**Files:**
- Modify: `scripts/gen-element-react.mjs:52-79`
- Regenerate: `frameworks/react/index.tsx` (output; via the gen step)

**Interfaces:**
- Consumes (Task 2): `createWebComponent(..., register?)` and `registerAll` from `./runtime`.
- Produces: every wrapper gets a 4th arg `() => import('@kitn.ai/ui/elements/<name>')`; `registerAll` re-exported from `@kitn.ai/ui/react`.

- [ ] **Step 1: Emit the thunk** — in the `blocks` map (around line 52), compute the module name and add the 4th arg to the emitted `createWebComponent` call:

```js
    const name = el.displayName;
    const propsName = `${name}Props`;
    const moduleName = el.tag.replace(/^kai-/, '');
    return `export interface ${propsName} extends WebComponentProps {
${[...propLines, ...eventLines].join('\n')}
}

export const ${name} = createWebComponent<${propsName}>(
  '${el.tag}',
  ${propNames},
  ${eventMap},
  () => import('@kitn.ai/ui/elements/${moduleName}'),
);`;
```

- [ ] **Step 2: Update the generated header + imports** — replace the `out` template head (lines 65-75) so it documents lazy registration and re-exports `registerAll`:

```js
  const out = `// AUTO-GENERATED by scripts/gen-element-api.mjs — do not edit by hand.
// Typed React wrappers for every kitn custom element. Usage:
//   import { Message } from '@kitn.ai/ui/react';
//   <Message message={msg} onMessageAction={(e) => …} />
// Each wrapper lazy-registers ITS element on first client mount (a dynamic import
// of '@kitn.ai/ui/elements/<name>'), so a consumer ships only the elements they use
// — not the register-all bundle. SSR-safe: registration fires only in a client effect.
// For eager all-registration call registerAll() or import '@kitn.ai/ui/elements'.
import { createWebComponent, registerAll, type WebComponentProps } from './runtime';
export { registerAll };
export { useKaiChat } from './use-kai-chat';
export type { UseKaiChatOptions, KaiChatController, ChatMessage } from './use-kai-chat';
${importLines}

${blocks}
`;
```

- [ ] **Step 3: Regenerate the wrappers**

Run: `npm run build:api`
Then drop the unrelated churn: `git checkout -- src/components/component-meta.json`
Expected: `✓ frameworks/react/index.tsx — 74 wrappers`.

- [ ] **Step 4: Verify the generated output** — confirm the thunks + registerAll landed and no banner reference remains in source:

Run: `grep -c "() => import('@kitn.ai/ui/elements/" frameworks/react/index.tsx`
Expected: 74 (one per wrapper).
Run: `grep -n "export { registerAll }" frameworks/react/index.tsx`
Expected: one match.

- [ ] **Step 5: Verify typecheck + unit**

Run: `npm run typecheck`
Expected: exit 0, 4/4.
Run: `npx vitest run --project unit`
Expected: 1215 passed.

- [ ] **Step 6: Commit**

```bash
git add scripts/gen-element-react.mjs frameworks/react/index.tsx
git commit -m "feat(react): wrappers lazy-register their own element"
```

---

### Task 4: Build config — drop the banner, externalize element subpaths

**Files:**
- Modify: `vite.config.react.ts` (`rollupOptions.external` + remove `output.banner`)

**Interfaces:**
- Consumes (Task 3): `index.tsx` now contains literal `import('@kitn.ai/ui/elements/<name>')` calls + a static `import('@kitn.ai/ui/elements')` in `registerAll`.
- Produces: `dist/react.js` with NO register-all banner; the per-element dynamic imports preserved as external references.

- [ ] **Step 1: Externalize all element subpaths + remove the banner** — replace the `rollupOptions` block:

```ts
    rollupOptions: {
      // React is a peer dep. Every @kitn.ai/ui/elements entry (register-all AND the
      // per-element chunks the wrappers lazy-import) is external — it resolves to the
      // consumer's installed dist at runtime, and stays a code-splittable dynamic import.
      external: ['react', 'react-dom', 'react/jsx-runtime', /^@kitn\.ai\/ui\/elements(\/.*)?$/],
      // No banner: registration is per-element + client-only now (see runtime.tsx).
    },
```

- [ ] **Step 2: Build**

Run: `npm run build`
Then: `git checkout -- src/components/component-meta.json`
Expected: build succeeds; `✓ ... react.js`.

- [ ] **Step 3: Verify the built bundle** — no banner, per-element dynamic imports present, register-all NOT statically pulled:

Run: `grep -c "import'@kitn.ai/ui/elements'" dist/react.js` (the old banner, minified)
Expected: 0 (the only `@kitn.ai/ui/elements` exact reference left is inside registerAll's body, a dynamic `import(...)`).
Run: `grep -o "@kitn.ai/ui/elements/[a-z-]*" dist/react.js | sort -u | head`
Expected: many per-element subpaths (button, card, …) as dynamic-import targets.

- [ ] **Step 4: Commit**

```bash
git add vite.config.react.ts
git commit -m "build(react): drop register-all banner, externalize element subpaths"
```

---

### Task 5: Verify — bundle proof, SSR safety, full gate

**Files:**
- Test (throwaway): `<scratchpad>/rpe-*.mjs` and `<scratchpad>/rpe-out*.js`

Scratchpad dir: `/private/tmp/claude-501/-Users-home-Projects-kitn-ai-kitn-chat/3883f931-3f42-46ea-ba16-75e722d94602/scratchpad`

**Interfaces:**
- Consumes: the rebuilt `dist/react.js` from Task 4.

- [ ] **Step 1: Bundle proof — one wrapper does NOT pull register-all.** Write `<scratchpad>/rpe-one.mjs`:

```js
import { Button } from '/Users/home/Projects/kitn-ai/kitn-chat/dist/react.js';
console.log(typeof Button);
```

Run:
```bash
cd <scratchpad>
npx esbuild rpe-one.mjs --bundle --format=esm \
  --external:react --external:react-dom --external:react/jsx-runtime \
  '--external:@kitn.ai/ui/elements' '--external:@kitn.ai/ui/elements/*' \
  --outfile=rpe-out.js --metafile=rpe-meta.json
node -e "const m=require('./rpe-meta.json'); const imp=Object.values(m.outputs)[0].imports.map(i=>i.path); console.log(imp)"
```

Expected: the output's external imports include the lazily-loaded `@kitn.ai/ui/elements/button` (a dynamic import kept external) and do **NOT** statically include `@kitn.ai/ui/elements` (register-all). `rpe-out.js` is small (wrapper + runtime only). Record its gzip: `gzip -c rpe-out.js | wc -c`.

- [ ] **Step 2: SSR safety — Node import must not throw.** Write `<scratchpad>/rpe-ssr.mjs`:

```js
// Node has no window/customElements. Importing the wrappers must not throw,
// and rendering must not trigger registration (effects don't run server-side).
const mod = await import('/Users/home/Projects/kitn-ai/kitn-chat/dist/react.js');
console.log('imported ok:', typeof mod.Button, typeof mod.registerAll);
console.log('registerAll() on server is a no-op:', mod.registerAll() === undefined);
```

Run: `node <scratchpad>/rpe-ssr.mjs`
Expected: prints `imported ok: function function` and `registerAll() on server is a no-op: true` — no throw.

- [ ] **Step 3: Full gate**

Run: `npm run typecheck` → 4/4.
Run: `npx vitest run --project unit` → 1215 passed.
Run: `npm run build` → green; then `git checkout -- src/components/component-meta.json`.

- [ ] **Step 4: Record the win** — compare: the old behavior pulled register-all (~162 KB gz). Note the new single-wrapper bundle gz from Step 1 in the final report. No commit (verification only; throwaway files stay in scratchpad).

---

## Self-Review

**Spec coverage:** generator thunk (Task 3) ✓; runtime client-only trigger + dedupe (Task 2) ✓; drop banner + externalize (Task 4) ✓; registerAll eager opt-in (Task 2 + re-export Task 3) ✓; SSR safety (Task 5 Step 2) ✓; bundle proof (Task 5 Step 1) ✓; backward-compat register-all entry untouched ✓; tsc self-import resolution (Task 1, an implementation detail the spec implied) ✓. Out-of-scope items (barrel, CSS split, other frameworks) correctly excluded.

**Placeholder scan:** none — every step has concrete code/commands + expected output.

**Type consistency:** `register?: () => Promise<unknown>` (Task 2) matches the emitted `() => import('@kitn.ai/ui/elements/<name>')` (Task 3); `registerAll` defined in runtime (Task 2) and re-exported (Task 3); `ensureRegistered` private to runtime; the external regex (Task 4) matches both the exact and subpath specifiers the source uses.
