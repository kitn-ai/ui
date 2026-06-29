# @kitn.ai/ui — Next.js App Router example

A minimal **Next.js 15 (App Router) + React 19** app that consumes the kai-\*
web components. It doubles as the compatibility test for "does this work with
Next.js / RSC / SSR, and is `'use client'` needed?"

## TL;DR

- **Yes, it works end-to-end on the App Router**: `next build` + SSR + hydrate +
  register + populate + interact, with zero console errors. (Verified with
  Playwright/Chromium against `next start`.)
- **`'use client'` is required** for any module that touches the kit — see below.
- A standalone app needs **no `transpilePackages`** and no special webpack config.
  (The `postcss.config.mjs` + `outputFileTracingRoot` here exist only because this
  example is nested inside the library's monorepo.)

## Run it

```bash
npm install
npm run build && npm run start   # production (what the verification used)
# or
npm run dev                      # Turbopack dev
```

Open <http://localhost:3000>. You should see two `kai-button`s and a populated
`kai-conversations` rail; clicking a conversation updates the React state below.

## The `'use client'` answer

App Router files are **Server Components** by default. The kit needs a client
boundary for **two independent reasons** (see `app/KaiDemo.tsx`):

1. **Registration is a browser-only side effect.** `import '@kitn.ai/ui/elements'`
   calls `customElements.define(...)`. A Server Component's module code never
   ships to the browser, so if the import lived in a Server Component the elements
   would never upgrade — the `<kai-*>` tags would render as inert markup.
2. **Wiring needs client hooks.** Array/object props are assigned as live DOM
   *properties* and `kai-*` events are non-bubbling `CustomEvent`s — both need
   `useRef` + `useEffect`, which only run in Client Components.

If you forget `'use client'`, the Next build fails with the canonical error:

```
You're importing a component that needs `useState`. This React Hook only works
in a Client Component. To fix, mark the file (or its parent) with the
"use client" directive.
```

**Pattern:** keep pages/layouts as Server Components (this `app/page.tsx` is one,
and `app/layout.tsx` imports `@kitn.ai/ui/theme.css` from the server fine) and
drop the kit into a small `'use client'` island.

## Two gotchas worth knowing

- **Set array/object props after `customElements.whenDefined(tag)`.** Registration
  via the register-all bundle is async (it lazy-loads each element's chunk), so on
  first mount the element may not be upgraded yet — a property set on a
  not-yet-upgraded element is lost on upgrade. `KaiDemo.tsx` waits for
  `whenDefined` before assigning `groups`/`conversations`.
- **Array/object props are DOM *properties*, not attributes.** Pass scalars
  (`variant`, `icon`) as attributes; assign arrays via a ref.

## Tree-shaking

- `import '@kitn.ai/ui/elements'` (used here) registers **all** elements — simple,
  but pulls every element's chunk (loaded lazily). Measured client JS ≈ 2.3 MB of
  async chunks.
- For a smaller bundle, import only the elements you use:
  `import '@kitn.ai/ui/elements/button'` etc. (per-element entries resolve to
  `dist/elements/<name>.js`). Measured ≈ 1.0 MB for the two used here — so yes,
  importing 1–2 components does avoid bundling all 78.

## Why this example uses the elements directly, not `@kitn.ai/ui/react`

The idiomatic React DX is the typed wrappers (`import { Button } from
'@kitn.ai/ui/react'`). **They currently do not build under Next.js** (webpack or
Turbopack): `dist/react.js` lazy-registers each element with specifiers that don't
match the built filenames (e.g. it imports `@kitn.ai/ui/elements/conversations`,
but the file is `dist/elements/conversation-list.js`). Bundlers that resolve
dynamic-import specifiers eagerly (Next) fail the build for **any** consumer of the
wrapper barrel:

```
Module not found: Can't resolve '@kitn.ai/ui/elements/confirm'
```

(This is a work-in-progress on the `fix/elements-register-treeshake` branch; once
the wrapper registration map is fixed, switch this example to the wrappers.)

## Pinned to a local build

This example installs `@kitn.ai/ui` from a vendored tarball
(`vendor/kitn-stable.tgz`, a `0.17.0` build off the `fix/elements-register-treeshake`
branch) rather than npm, because the published `0.17.0` register-all does not
register every element yet (e.g. `kai-button` stays inert). Once the fix is
published, replace the dependency with the published semver (`"@kitn.ai/ui":
"^0.17.x"`) and delete `vendor/`.
