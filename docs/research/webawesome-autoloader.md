# Web Awesome — Tree-Shaking & Autoloader Deep Dive

Research date: 2026-06-20  
Source: `git clone --depth 1 https://github.com/shoelace-style/webawesome /tmp/webawesome` + `npm install @awesome.me/webawesome` → `/tmp/wa-inspect`  
Package version: `@awesome.me/webawesome@3.9.0`

---

## Part A — Per-Component Tree-Shaking Model

### `package.json` Exports Map

`packages/webawesome/package.json`:

```json
{
  "name": "@awesome.me/webawesome",
  "type": "module",
  "jsdelivr": "./dist/webawesome.loader.js",
  "exports": {
    ".": {
      "types": "./dist/webawesome.d.ts",
      "import": "./dist/webawesome.js"
    },
    "./dist/webawesome.js":          "./dist/webawesome.js",
    "./dist/webawesome.loader.js":   "./dist/webawesome.loader.js",
    "./dist/webawesome.ssr-loader.js": "./dist/webawesome.ssr-loader.js",
    "./dist/components":   "./dist/components",
    "./dist/components/*": "./dist/components/*",
    "./dist/react":        "./dist/react/index.js",
    "./dist/react/*":      "./dist/react/*",
    "./dist/utilities/*":  "./dist/utilities/*",
    "./dist/styles/*":     "./dist/styles/*",
    "./dist/translations/*": "./dist/translations/*",
    "./dist/events/*":     "./dist/events/*",
    "./dist/ssr/*":        "./dist/ssr/*",
    "./package.json":      "./package.json"
  }
}
```

**Key facts:**

- `"type": "module"` — pure ESM, no CJS.
- **No `sideEffects` field** — bundlers (webpack/rollup) will treat every file as potentially having side effects, so they won't tree-shake component registrations away. This is intentional: every `components/*/component.js` calls `customElements.define` as a side effect of import.
- The glob `"./dist/components/*": "./dist/components/*"` exposes every component individually. A consumer can import `@awesome.me/webawesome/dist/components/button/button.js` and get only the button (plus its shared chunk deps).
- Two separate entry shapes coexist: the CDN/autoloader shape (`webawesome.loader.js`) and the npm/bundler shape (`dist/components/*/component.js`).

### How Self-Registration Works

Each component file (`src/components/button/button.ts`) uses Lit's `@customElement` decorator:

```ts
// src/components/button/button.ts
@customElement('wa-button')
export default class WaButton extends WebAwesomeFormAssociatedElement { ... }
```

The `@customElement('wa-button')` decorator calls `customElements.define('wa-button', WaButton)` as a **side effect at module evaluation time**. In the compiled output the decorator expansion looks like:

```js
// dist/chunks/chunk.EBC7M6Z4.js (the WaButton implementation chunk)
WaButton = __decorateClass([
  customElement("wa-button")
], WaButton);
```

`customElement` from `lit/decorators.js` calls `customElements.define` internally. No explicit `customElements.define(...)` call is written by hand anywhere in component source — the decorator handles it. **Importing `dist/components/button/button.js` self-registers `<wa-button>` as a side effect of the import.**

The thin entry file is the facade:

```js
// dist/components/button/button.js
import { WaButton } from "../../chunks/chunk.EBC7M6Z4.js";
import "../../chunks/chunk.W7A2VLCT.js";  // spinner.styles (button depends on wa-spinner)
import "../../chunks/chunk.AX24US5R.js";  // WaSpinner (self-registers wa-spinner too)
// ... many more shared chunks
export { WaButton as default };
```

### The Build System

`packages/webawesome/scripts/build.js` uses **esbuild** with **code splitting** enabled. Two esbuild contexts are built:

**CDN build** (`dist-cdn/` — bundled, for `<script type="module" src="...">`):

```js
const config = {
  format: 'esm',
  target: 'es2020',
  entryPoints: [
    'src/webawesome.ts',
    'src/webawesome.loader.ts',
    'src/webawesome.ssr-loader.ts',
    ...await globby('src/components/**/!(*.(style|test)).ts'),
    ...await globby('src/translations/**/*.ts'),
    ...await globby('src/utilities/**/*.ts'),
    ...await globby('src/events/**/*.ts'),
    ...await globby('src/ssr/**/*.ts'),
    ...await globby('src/react/**/*.ts'),
  ],
  outdir: getCdnDir(),      // → dist-cdn/
  chunkNames: 'chunks/[name].[hash]',
  bundle: true,
  splitting: true,          // code splitting — shared deps → chunks/
  minify: false,
  // No "packages: external" → Lit is bundled inline
};
```

**npm/dist build** (unbundled, for bundler consumers):

```js
const unbundledConfig = {
  ...config,
  splitting: true,
  treeShaking: true,
  packages: 'external',     // ← Lit and all deps kept as external imports
  outdir: getDistDir(),     // → dist/
};
```

**Critical difference:** `packages: 'external'` in the npm build keeps `lit`, `@lit/context`, `@floating-ui/dom`, etc. as bare `import ... from 'lit/...'` calls in the output — the consumer's bundler resolves them and deduplicates them. In the CDN build, Lit is bundled into the shared chunks (no external lit imports in `dist-cdn/` chunks).

### Per-Component Entry Points

esbuild's `splitting: true` with many per-component entry points is the entire mechanism:

1. Each `src/components/button/button.ts` is an entry point.
2. esbuild finds shared code across entry points (the Lit base class, `WebAwesomeElement`, utilities, etc.) and hoists them into named shared chunks under `dist/chunks/`.
3. The per-component output file (`dist/components/button/button.js`) is tiny (< 30 lines) — it just re-exports from the relevant chunk and pulls in side-effect-only chunks for sub-component dependencies.

Observed from inspecting the npm dist:

- `dist/chunks/` contains **272 shared chunks**.
- `dist/components/spinner/spinner.js` imports 5 chunks (small component, few deps).
- `dist/components/button/button.js` imports 23 chunks (larger: depends on spinner, icon, form internals, localize, etc.).
- Shared infrastructure (`chunk.HBKCENRD.js` = English translation, `chunk.7VGCIHDG.js` = `__decorateClass` helper, `chunk.TWDBLNQF.js` = `LocalizeController`) is deduplicated across all components.

**What a consumer's bundler includes for `import '.../components/button/button.js'`:**  
Just button + its transitive chunk deps (spinner, icon — because button renders `<wa-spinner>` and `<wa-icon>` inside itself). Nothing else. A bundler using Rollup/Vite would then further tree-shake unused exports from the chunks, but since `customElements.define` is a side effect, each component class's registration is always retained.

---

## Part B — The Autoloader

### Entry: `webawesome.loader.ts` / `webawesome.loader.js`

`src/webawesome.loader.ts`:

```ts
import { startLoader } from './webawesome.js';
export * from './webawesome.js';

startLoader();

// Remove `wa-cloak` when discovery is complete OR after 2 seconds.
Promise.race([
  new Promise(resolve => document.addEventListener('wa-discovery-complete', resolve)),
  new Promise(resolve => setTimeout(resolve, 2000)),
]).then(() => {
  document.querySelectorAll('.wa-cloak').forEach(el => el.classList.remove('wa-cloak'));
});
```

This file is the CDN entry point (`jsdelivr: "./dist/webawesome.loader.js"`). Consumers use:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@awesome.me/webawesome/dist/webawesome.loader.js"></script>
```

The file calls `startLoader()` immediately as a module-evaluation side effect, then races `wa-discovery-complete` vs. a 2-second timeout to un-cloak the page (FOUC prevention via `.wa-cloak` CSS class).

### The Autoloader Algorithm

Full implementation: `src/utilities/autoloader.ts`

```ts
// MutationObserver — declared at module scope, shared singleton
const observer = new MutationObserver(mutations => {
  for (const { addedNodes } of mutations) {
    for (const node of addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        discover(node as Element);  // called for each new DOM element
      }
    }
  }
});

export function startLoader() {
  discover(document);                          // 1. Initial scan
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true                            // 2. Watch for future additions
  });
}

export function stopLoader() {
  observer.disconnect();
}

export async function discover(root: Document | Element | ShadowRoot) {
  const rootTagName = root instanceof Element ? root.tagName.toLowerCase() : '';
  const rootIsWebAwesomeComponent = rootTagName?.startsWith('wa-');

  // 3. Find all :not(:defined) wa-* elements inside root
  const tags = [...root.querySelectorAll(':not(:defined)')]
    .map(el => el.tagName.toLowerCase())
    .filter(tag => tag.startsWith('wa-'));

  // 4. If root itself is an undefined wa-* element, add it
  if (rootIsWebAwesomeComponent && !customElements.get(rootTagName)) {
    tags.push(rootTagName);
  }

  // 5. Preload via data-wa-preload attribute (explicit tag lists)
  const preloadSelectors = root.querySelectorAll('[data-wa-preload]');
  const preloadRoots = root instanceof Element && root.hasAttribute('data-wa-preload')
    ? [root, ...preloadSelectors]
    : preloadSelectors;
  for (const el of preloadRoots) {
    tags.push(
      ...el.getAttribute('data-wa-preload')!
        .split(/\s+/)
        .filter(tag => tag.startsWith('wa-'))
    );
  }

  // 6. Deduplicate
  const tagsToRegister = [...new Set(tags)];

  // 7. Register all discovered tags in parallel
  const imports = await Promise.allSettled(tagsToRegister.map(tagName => register(tagName)));

  for (const imp of imports) {
    if (imp.status === 'rejected') {
      console.warn(imp.reason);
    }
  }

  // 8. Yield one animation frame for Lit's first update
  await new Promise(requestAnimationFrame);

  // 9. Signal completion
  root.dispatchEvent(new CustomEvent('wa-discovery-complete', {
    bubbles: false, cancelable: false, composed: true
  }));
}

function register(tagName: string): Promise<void> {
  // 10. Dedup: skip if already defined
  if (customElements.get(tagName)) {
    return Promise.resolve();
  }

  // 11. Derive module path: "wa-button" → "components/button/button.js"
  const tagWithoutPrefix = tagName.replace(/^wa-/i, '');
  const path = getBasePath(`components/${tagWithoutPrefix}/${tagWithoutPrefix}.js`);

  // 12. Dynamic import — self-registers as side effect
  return new Promise((resolve, reject) => {
    import(path)
      .then(() => resolve())
      .catch(() => reject(new Error(`Unable to autoload <${tagName}> from ${path}`)));
  });
}
```

**As pseudo-code:**

```
startLoader():
  discover(document)
  MutationObserver(document.documentElement, subtree+childList) → discover(addedNode)

discover(root):
  tags = root.querySelectorAll(':not(:defined)').filter(wa-*)
  if root is itself an undefined wa-* element → push it
  for each [data-wa-preload] element → push listed tags
  tags = unique(tags)
  await Promise.allSettled(tags.map(register))
  await animationFrame
  root.dispatch('wa-discovery-complete')

register(tagName):
  if customElements.get(tagName) → return (already defined, no double-import)
  path = getBasePath('components/' + tag + '/' + tag + '.js')
  await import(path)   // dynamic import → runs module → @customElement decorator fires → define() called
```

### Base URL / CDN Origin Resolution

`src/utilities/base-path.ts` — two strategies in priority order:

1. **`data-webawesome` attribute** on any element:

   ```html
   <script src="bundle.js" data-webawesome="/custom/base/path"></script>
   ```

2. **Script tag URL inference** — scans `document.getElementsByTagName('script')` for a script whose `.src` ends in `webawesome.js`, `webawesome.loader.js`, or `webawesome.ssr-loader.js`, then takes the directory portion:

   ```ts
   const path = String(waScript.getAttribute('src'));
   setBasePath(path.split('/').slice(0, -1).join('/'));
   ```

This means the loader is **self-locating**: put `webawesome.loader.js` at any CDN URL and it finds its sibling `components/` directory automatically. No `import.meta.url` is used (would work in native ESM, but the script-scanning approach also handles the bundled CDN case where `import.meta.url` may point elsewhere).

### Shadow Root Limitation (Intentional)

The `discover()` function uses `root.querySelectorAll(':not(:defined)')`. **`querySelectorAll` does NOT descend into shadow roots.** This is a deliberate design decision:

- When a parent Lit component renders child `<wa-*>` tags inside its own template, those child tags are already statically imported by the parent's module (`import '../spinner/spinner.js'`), so they self-register synchronously when the parent module loads.
- The autoloader therefore only needs to scan light DOM — components declared directly in HTML.
- The `data-wa-preload="wa-dialog wa-drawer"` escape hatch lets you explicitly request tags that live behind dynamic conditions or deferred rendering.

There is no recursive `discover(element.shadowRoot)` call anywhere. Nested components inside already-defined elements' shadow roots are handled by static imports in the component source, not by the loader.

### The `wa-discovery-complete` Event

Fired on the `root` element (or document) after all tags in that scan are imported and one animation frame has elapsed. The `.wa-cloak` class can be used on the `<body>` or individual components to hide unupgraded content; the loader race removes it. The SSR loader (`webawesome.ssr-loader.ts`) re-exports the same loader but first imports `@lit-labs/ssr-client/lit-element-hydrate-support.js` to patch LitElement's prototype for hydration.

### Turbo / SPA Integration

```ts
export function preventTurboFouce(timeout = 2000) {
  document.addEventListener('turbo:before-render', async (event) => {
    event.preventDefault();
    await Promise.race([discover(event.detail.newBody), new Promise(r => setTimeout(r, timeout))]);
    event.detail.resume();
  });
}
```

On each Turbo page transition, `discover()` is called on the incoming `newBody` element before Turbo swaps it in. This ensures new components in the next page are registered before they appear.

---

## How the Two Modes Coexist

| Mode | Entry Point | How It Works |
|---|---|---|
| CDN / plain HTML | `dist-cdn/webawesome.loader.js` | Bundled (Lit inlined), calls `startLoader()` on import, dynamic-imports component chunks on demand |
| npm + bundler | `dist/components/button/button.js` | Unbundled (Lit external), static import self-registers element immediately |
| npm + all components | `dist/webawesome.js` | Exports utilities + `startLoader`; does NOT auto-call `startLoader()` (consumer does it manually if needed) |

These are completely separate dist trees (`dist/` vs `dist-cdn/`). The npm consumer never uses the autoloader at runtime — static imports + bundler splitting handle everything. The CDN consumer never does per-component imports — the loader handles it.

---

## Part C — Solid/Shadow DOM Implications for `@kitn.ai/ui`

### What is the same
- Shadow DOM: each Lit component creates its own shadow root. Our `kai-*` elements do the same via `defineWebComponent`. The autoloader pattern is agnostic to the internal renderer.
- The `customElements.define` call must be a side effect of import. In Lit this is the `@customElement` decorator; in our Solid setup it's whatever `defineWebComponent` does at the bottom of each element file.

### What is different / harder

**1. Shared CSS stylesheet**

Lit components embed their CSS as `static css = css\`...\`` — each component carries its own styles inside its shadow root via Lit's `adoptedStyleSheets`. Styles are component-scoped and deduplicated by Lit.

Our library currently ships **one global compiled CSS file** (`theme.css` / `theme.tokens.css`) that gets adopted into every shadow root. If we split into per-element entries, this CSS must become a **shared chunk** that every element entry imports as a side effect:

```ts
// src/elements/button/kai-button.ts
import '../../styles/shared.css?inline'; // → adopted into shadow root
// ... defineWebComponent(...)
```

Vite/esbuild can bundle the CSS into a JS chunk (`?inline` → base64 or string), or we adopt it once into the document and let shadow roots inherit via `@layer` / `:host { all: initial }` resets. This is the biggest architectural gap to bridge.

**2. Solid runtime as a shared chunk**

Solid's reactive primitives (`createSignal`, `createEffect`, the reconciler) must be in a single shared chunk shared by all element modules. esbuild's `splitting: true` will handle this automatically — it's the same as Lit being a shared dep. No special treatment needed beyond ensuring `packages: 'external'` is NOT set for `solid-js` in the per-element build (or that solid-js is bundled as a single shared chunk).

**3. Per-element entry points**

Currently we have one monolithic `register.ts` that calls `defineWebComponent` for all elements. We need:

- One `src/elements/kai-button/kai-button.ts` per element, each calling `defineWebComponent('kai-button', KaiButtonComponent)` as a module-level side effect.
- These files become esbuild entry points (`splitting: true`).
- A barrel `src/elements/index.ts` that re-exports all of them (for the "import everything" use case).

**4. Autoloader tag → path mapping**

Our prefix is `kai-`, not `wa-`. The path convention can mirror Web Awesome exactly:

```
kai-button → components/button/button.js
kai-chat → components/chat/chat.js
```

The `register()` function in our loader becomes:

```ts
function register(tagName: string): Promise<void> {
  if (customElements.get(tagName)) return Promise.resolve();
  const slug = tagName.replace(/^kai-/i, '');
  const path = getBasePath(`components/${slug}/${slug}.js`);
  return import(path).then(() => {}).catch(() => { ... });
}
```

**5. Shadow root traversal**

Our Solid components render child `kai-*` elements inside shadow roots (e.g., `kai-chat` renders `kai-message` inside its shadow). The Web Awesome approach relies on **static imports** from parent to child — `import '../message/message.js'` inside `kai-chat.ts` — so the child is registered synchronously when the parent module loads. The autoloader itself never needs to descend into shadow roots.

If we follow this pattern, each parent element must statically import every child element it renders. This is already implicitly true in our Solid components (they compose by importing the component function), but in the per-element build we need to ensure the import of the child's `defineWebComponent` registration file is included.

---

## Replication Checklist for `@kitn.ai/ui`

**Build**
- [ ] Switch from monolithic `register.ts` to per-element entry points: `src/elements/kai-{name}/kai-{name}.ts`, each calling `defineWebComponent('kai-{name}', ...)` as a side effect.
- [ ] Configure esbuild (or Vite lib mode) with `splitting: true`, one entry per element, plus the barrel index and the loader entry.
- [ ] Two output configs: `dist/` (unbundled, `packages: 'external'` for solid-js/solid-js/web), `dist-cdn/` (bundled, Solid runtime inlined in chunks).
- [ ] Set `chunkNames: 'chunks/[name].[hash]'` so shared chunks land in `chunks/`.
- [ ] Do NOT set `sideEffects: false` in `package.json` — registration calls must not be tree-shaken.

**CSS/Styles**
- [ ] Extract shared design-token CSS into a JS module that is imported by every element and adopted once per shadow root.
- [ ] Alternatively: output theme as a side-effect-only chunk that elements import, which at runtime calls `document.adoptedStyleSheets.push(sheet)` for the global layer.

**Package.json exports**
- [ ] Add `"./dist/components/*": "./dist/components/*"` glob.
- [ ] Add `"./dist/kitn.loader.js": "./dist/kitn.loader.js"` (the CDN loader entry).
- [ ] Keep `"."` pointing at the barrel (all components registered).
- [ ] `"type": "module"`.

**Loader**
- [ ] Implement `src/utilities/autoloader.ts` with the same scan-then-MutationObserver pattern, prefix filter `kai-`, path formula `components/${slug}/${slug}.js`.
- [ ] Implement `src/utilities/base-path.ts` with script-tag URL inference (`kitn.loader.js` as the sentinel name) + `data-kitn` override attribute.
- [ ] Implement `src/kitn.loader.ts` that imports and calls `startLoader()` at module scope — this is the CDN entry point.
- [ ] Add FOUC prevention: `.kai-cloak` class + `ka-discovery-complete` event race.

**Self-registration per element**
- [ ] Each `kai-{name}.ts` must call `defineWebComponent('kai-{name}', ...)` at module evaluation time (not inside a factory or async callback).
- [ ] Parent elements (e.g., `kai-chat`) must statically import child element registration files (e.g., `import '../kai-message/kai-message.js'`) so children are registered when parents load.

**Consumer experience**
- CDN path: `<script type="module" src="https://cdn.../dist-cdn/kitn.loader.js"></script>` — zero config, all elements lazy-loaded.
- Bundler path: `import '@kitn.ai/ui/dist/components/chat/chat.js'` — self-registers only `<kai-chat>` and its deps.
- React: `import '@kitn.ai/ui/react'` — unchanged, the React wrappers can import the element registration internally.
