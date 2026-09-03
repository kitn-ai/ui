# Vesper

A server-rendered **SolidJS 2** website: the Autumn/Winter 2026 collection for
"Vesper", a fictional fashion label. Six routes, an interaction in every
section, and a cart that survives a reload.

It uses **none of `@kitn.ai/ui`**. It is here because it started as a page
inside a Storybook story (see [Where it came from](#where-it-came-from)) and
because it is a useful place to keep a real Solid 2 app.

```bash
pnpm install
pnpm dev        # http://localhost:4330, server-rendered
pnpm build      # dist/client + dist/server
pnpm start      # http://localhost:3000, the built server
pnpm check      # typecheck + unit tests + photograph check
```

## The platform, and one thing that will trip you up

**SolidStart is not a separate package any more.** `@solidjs/start` on npm is
the Solid *1* line (`solid-js: ^1.9.15`, `@solidjs/router: <2`). In Solid 2,
Start is a **mode of the Vite plugin**:

```ts
// vite.config.ts -- the entire SSR setup
solid({ start: true, ssr: true, extensions: ['.jsx', '.tsx'] }),
fileRoutes({ types: true }),
```

There is no `index.html` and no entry files. The plugin generates the entries
around four conventions:

| File | Role |
|---|---|
| `src/App.tsx` | the app: router, layout, providers |
| `src/Document.tsx` | the new `index.html` -- the full `<html>` plus `<HydrationScript />` |
| `src/router.ts` | `createRouter({ routes: fileRoutes(pageRoutes) })` and the typed `paths` proxy |
| `src/routes/**` | the pages; `[piece].tsx` is a param, `[...404].tsx` the catch-all |

A file named `X.tsx` **beside** a directory `X/` is a *layout* for everything
inside it, not the index of it. `routes/shop/index.tsx` is `/shop`.

**Testing a route with `curl` needs `Accept: text/html`.** The plugin's SSR
middleware only handles HTML-accepting GETs, and a bare `curl` (`Accept: */*`)
falls through to a 404 that looks exactly like a broken route. `tools/verify-ssr.mjs`
sends the header; a hand-rolled curl usually does not.

### Solid 1 habits that are wrong here

Every one of these cost real debugging time, and each is commented at its site:

- **`createEffect` takes two functions**: `createEffect(() => dep(), value => act(value))`.
  A one-argument call throws and halts the entire reactive system, so *nothing*
  on the page is interactive.
- **Effects run during the server render.** Guard browser APIs with `isServer`.
- **Create reactive nodes unconditionally.** Wrapping `createEffect` in
  `if (!isServer)` makes the server build fewer nodes than the client, which
  shifts every subsequent hydration id and fails the whole page with
  "Hydration key miss". Guard *inside* the effect, never around it.
- **Store setters are mutation producers**: `setItems(lines => { lines.push(x) })`.
  Solid 1's `setItems(i, 'qty', n)` path form is gone.
- **Writes are deferred until a flush.** Reading a signal on the line after
  writing it still sees the old value. Inside an event handler the framework
  flushes for you; after an `await` it does not, so call `flush()`.
- **`classList` is gone** -- `class` takes a clsx-style value:
  `class={['card', { open: open() }]}`.
- **`createContext` returns its own provider component**: `<Ctx value={api}>`,
  not `<Ctx.Provider>`. Default-less contexts make `useContext` throw.
- **There is no `onMount`, no `createResource`, and no `solid-js/store`**
  subpath. `@solidjs/meta` has no `MetaProvider`.
- **aria pseudo-booleans are the string literals** `"true"` / `"false"`, never
  a boolean: `aria-checked={on ? 'true' : 'false'}`. A bare `true` renders
  `aria-checked=""`, which reads as unset.
- **`jsxImportSource` is `@solidjs/web`**, not `solid-js`. Point it at
  `solid-js` and every built-in — `Show`, `For`, the router — fails
  typechecking as "not a valid JSX element".

## The design: three materials, assigned by role

The rule is that a material is chosen by what a thing *is*, never by which
section it sits in. That is what keeps the page reading as one label rather
than a sampler.

| | Role | Signature |
|---|---|---|
| **Neumorphism** | structure: panels, cards, wells, sliders, accordions | dual shadow, no borders, on the `--bg` surface |
| **Glassmorphism** | anything that floats: sticky nav, cart drawer, modals, photo captions, hotspot pins, chips | `backdrop-filter: blur(20px)`, 1px light hairline |
| **Claymorphism** | accents only: swatches, size pills, quantity steppers | larger radius, inner glow, squash on press |

Glass is never used for something with nothing behind it -- a glass panel on a
flat ground is just a grey box with an expensive filter. Tokens are in
`src/styles/tokens.css`; the three are also available as `.neu`, `.glass` and
`.clay`.

## The interactions

| Route | Interaction |
|---|---|
| `/` | **Tonal wipe** -- drag the hero between two frames of the opening look. The handle is a real `<input type="range">` thumb, so arrow keys work. |
| `/` | **Index marquee** -- hover or focus a category and a neumorphic well fills with three pieces from it. |
| `/` and `/shop/:piece` | **Configurator** -- clay swatches that swap the photograph, size pills, add to bag. |
| `/lookbook` | **Density control** -- retiles between editorial, grid and contact sheet, FLIP-animated so cards travel instead of jumping. Category chips filter. |
| `/lookbook/:look` | **Shop-the-look hotspots** -- glass pins over the photograph, each a real button, opening a card with an Add. |
| `/shop` | **Faceted filtering held in the URL** -- category and price band are search params, so the filtered set is *server-rendered* and the URL is shareable. |
| `/shop/:piece` | Accordions and a glass size-guide modal. |
| `/atelier` | **Material wells** that reveal their crop and copy, and a timeline that expands. |
| everywhere | **The cart** -- the photograph flies into the bag, the badge ticks, a glass drawer opens with steppers, a running subtotal and a free-shipping track. |
| everywhere | **Sticky nav** that gains blur on scroll while the wordmark's letter-spacing tightens. |

Every motion path is gated on `prefers-reduced-motion`.

### The cart, and the one SSR rule that matters

The server renders an **empty** cart, always. It cannot know what is in this
reader's bag, and guessing would either leak someone else's or fight
hydration. `src/cart/store.ts` is therefore free of I/O -- no `localStorage`,
no `window` -- which is what lets it unit-test in node. `CartProvider` owns the
storage read (in an effect, after mount) and the write.

The flight animation is fenced: `flyToCart` races `animation.finished` against
a hard cap, because Chrome never settles that promise in a tab that is not
visible. Awaiting it unfenced left the bag permanently closed. A decoration
must never be able to strand its caller.

## Verification

```bash
pnpm check                       # typecheck + unit tests + photograph check
pnpm verify:ssr                  # 13 routes server-render their own content (dev)

pnpm build && pnpm start
node tools/verify-ssr.mjs http://localhost:3000   # ...and in the built server
```

Run the SSR check against **both**: dev SSR and the built handler are different
pipelines, so a green dev run is not evidence for the build.

`verify-ssr.mjs` asserts counts by counting elements, never by matching a
rendered string like `"8 of 8"` -- Solid separates adjacent JSX expressions
with hydration comment markers, so that text is never contiguous in the HTML.

## Where it came from

`packages/ui/src/elements/v0.stories.tsx` -- the **Labs/Apps → v0** story, an
app-builder shell whose right pane is a real `<kai-artifact>`. That story
builds a Vesper landing page entirely inline (CSS in a template literal, fonts
and photography as base64 `data:` URIs) and frames it as the artifact's
preview. `tools/extract-from-story.mjs` still regenerates that original static
page by evaluating the story's own builders, so the pre-Solid version stays
reachable. The story itself is unchanged.

## Photography

26 photographs from [Unsplash](https://unsplash.com) under the Unsplash
License, desaturated to match the three that came inline in the story.
`public/img/CREDITS.md` records every photo id and photographer;
`tools/fetch-photos.mjs` is the manifest and re-fetches the set.

Monochrome is verified by **saturation**, not by JPEG component count:
ffmpeg's mjpeg encoder has no gray pixel format, so a correct file still
reports 3 components with its chroma planes pinned flat.

## Not a workspace member

There is no entry for this directory in the repo's `pnpm-workspace.yaml`, and
it carries its own empty one so pnpm does not walk up into the repo's
workspace. It installs on its own and stays out of repo CI, the typecheck
graph and the install graph. If it ever needs to be deployed as a real site,
lift the directory out whole.
