# @kitn.ai/ui — TanStack Start example

A real **[TanStack Start](https://tanstack.com/start)** app (full-stack React:
SSR + streaming + hydration) consuming `@kitn.ai/ui` through the typed React
wrappers. It doubles as the compatibility test: *does the kit server-render,
hydrate, and register cleanly on TanStack Start?*

**Yes — verified end to end** (Playwright/Chromium, dev and production build):
the `<kai-*>` tags server-render as bare tags, then on the client they register,
hydrate, populate their shadow DOM, and dispatch events — with **no console
errors or hydration-mismatch warnings**. One consumer-side workaround was needed
for a packaging bug in `@kitn.ai/ui@0.17.0` (documented below).

## What it demonstrates

- **SSR-safe custom elements.** The React wrappers register elements
  *client-only* (in a layout effect) and assign array/object props as live DOM
  *properties* after hydration. So the server emits bare `<kai-button>` /
  `<kai-chat>` tags, the client registers + populates them, and there's nothing
  to mismatch between the two renders.
- **A data-driven element.** `<Chat messages={…} />` — the `messages` **array**
  is set as a JS property through the wrapper; the thread appears after
  hydration, proving array round-tripping survives SSR.
- **Events.** `<Button onClick={…}>` increments a counter (the element's
  `kai-click` CustomEvent wired to a React handler).
- **Per-element registration / tree-shaking.** Importing `{ Button, Chat }` is
  enough to register just those two — no `import '@kitn.ai/ui/elements'`
  side-effect, and the elements you don't render aren't downloaded.

## Run it

```bash
npm install        # installs the vendored tarball in ./vendor + TanStack Start
npm run dev        # SSR dev server on http://localhost:3000
npm run build      # production client + server build → dist/
npm start          # serve the production build (node serve.mjs) on :3000
npm run typecheck
```

The library is installed from a local tarball pinned in
[`./vendor`](./vendor) via a relative `file:` dependency, so the example is
self-contained and reproduces the exact build it was tested against. To point it
at npm instead, swap the `@kitn.ai/ui` dependency for a version range and
`npm install`.

## Consumer setup notes (the parts specific to SSR)

1. **Standard TanStack Start.** `vite.config.ts` is the documented setup —
   `tanstackStart()` before `viteReact()`. Routes live in `src/routes/`,
   `theme.css` is imported once in `__root.tsx`. No `'use client'`-style
   directives exist or are needed — the wrappers self-guard with `typeof
   window`.
2. **Keep `@kitn.ai/ui` external to the SSR bundle** (the Vite default — do
   *not* add it to `ssr.noExternal`). Its per-element registration uses
   `import('@kitn.ai/ui/elements/<name>')`, which only runs in the browser; the
   server just renders the bare tags.
3. **Exclude it from the dev dependency pre-bundler** (`optimizeDeps.exclude`).
   esbuild's optimizer doesn't run Vite plugins, so it can't see the workaround
   in note 4; excluding it routes the package through the normal plugin pipeline.

## ⚠️ Packaging bug worked around here (`@kitn.ai/ui@0.17.0`)

The published `@kitn.ai/ui/react` registers each element with
`import('@kitn.ai/ui/elements/<element-short-name>')`. For ~11 elements that
short name **doesn't match the file shipped in `dist/elements/`**:

| wrapper imports `…/elements/` | actual file in `dist/elements/` |
| --- | --- |
| `confirm` | `confirm-card.js` |
| `context` | `context-meter.js` |
| `conversations` | `conversation-list.js` |
| `resizable-item` | `resizable.js` |
| `scope-picker` | `chat-scope-picker.js` |
| `skills` | `message-skills.js` |
| `sources` | `source.js` |
| `suggestions` | `prompt-suggestions.js` |
| `toast-region` | `toast.js` |
| `workspace` | `chat-workspace.js` |
| `remote` | *(no standalone file)* |

The package's `"./elements/*"` export maps each specifier to a path that doesn't
exist, so **any bundler that statically resolves dynamic-import specifiers**
(Vite dev import-analysis, esbuild, Rollup) hard-fails the moment *any* wrapper
is imported — `Failed to resolve import "@kitn.ai/ui/elements/conversations"`.
This affects every Vite-based consumer (including `Conversations`, the obvious
choice for this demo), not just TanStack Start.

`vite.config.ts` includes a small `kitnElementsSubpathFix` plugin that rewrites
the broken specifiers to the real files. **Delete it once the library ships
matching `./elements/*` files (or corrects the wrapper subpath names).**

## Tree-shaking note

At **runtime** the win holds: loading this page fetches only the chunks for the
elements actually rendered (button, chat, and chat's transitive deps) — the
other ~70 elements are never downloaded. But the **build** still *emits* a lazy
chunk for every element, because the wrapper factory calls in the published
`dist/react.js` aren't annotated `/*@__PURE__*/`, so Rollup can't prove the
unused wrappers are side-effect-free and keeps all their `import()` split points.
Net: good for end users, but the build output carries dead chunks.
