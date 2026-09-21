# Vesper on Solid 2 — design

**Date:** 2026-09-03
**Status:** approved, implementing
**Scope:** turn `examples/demos/vesper/` from a static page into a server-rendered
SolidJS 2 site with six routes, an interaction per section, and a persistent cart.

---

## 1. What exists now

`examples/demos/vesper/` is a plain static site — `index.html`, one stylesheet,
one script, self-hosted Playfair Display, six grayscale editorial photographs. It
was extracted from the **Labs/Apps → v0** Storybook story
(`packages/ui/src/elements/v0.stories.tsx`), which builds the same page inline as
the document it frames in `<kai-artifact>`. It uses none of `@kitn.ai/ui`.

The Solid app **replaces it in place**. The story stays the source of the original
page and is not touched; `tools/extract-from-story.mjs` keeps regenerating the
static version, so the pre-Solid site remains reachable from git and from the
story itself.

## 2. The platform — findings that constrain everything below

These were established by reading published packages and the official
`solidjs/templates` repo, not from prior knowledge. Solid 2 is at `rc.6`, days old.

**SolidStart is no longer a separate package.** Start is a **mode of the Vite
plugin**. `@solidjs/start@2.0.4` on npm is the Solid *1* meta-framework
(`solid-js: ^1.9.15`, `@solidjs/router: <2.0.0-0`) and must not be used here.

```ts
// vite.config.ts — the whole SSR setup
import { fileRoutes } from 'filesystem-routing/vite';
import solid from '@solidjs/vite-plugin';

plugins: [
  solid({ start: true, ssr: true, extensions: ['.jsx', '.tsx'], diagnostics: true }),
  fileRoutes({ types: true }),
]
```

`extensions` is load-bearing: the `fileRoutes` plugin emits route modules whose
ids end in a `?pick=` query string, and without it the Solid plugin declines to
compile them.

**Conventions the plugin owns** (no `index.html`, no entry files, no server file
in source):

| File | Role |
|---|---|
| `src/App.tsx` | default-exports the app: renders the router, holds the site-wide layout |
| `src/Document.tsx` | the new `index.html` — must render the full `<html>` and `<HydrationScript />` |
| `src/router.ts` | `createRouter({ routes: fileRoutes(pageRoutes) })`, re-exports `paths` |
| `src/routes/**` | scanned into `virtual:file-routes`; `[id].tsx` params, `[...404].tsx` catch-all |

`vite` serves SSR in dev with no server of our own. `vite build` emits
`dist/client` plus `dist/server`, whose `handleRequest(request)` is an
adapter-agnostic `Request -> Response`. `server.js` at the project root (lifted
from the official `fullstack` template, which is the reference implementation of
this glue) serves both for `npm start`.

**Packages, pinned exactly** — an rc that moves under us is the main platform risk:

```
solid-js 2.0.0-rc.6 · @solidjs/web 2.0.0-rc.6 · @solidjs/router 2.0.0-next.21
@solidjs/meta 1.0.0-next.2 · @solidjs/vite-plugin 3.0.0-next.38
filesystem-routing 0.2.1 · vite 8.2.2
```

**Two Solid 2 idioms that differ from Solid 1** — follow the template, not habit:

- Async reads are `createMemo(() => fn())` under a `<Loading fallback>` boundary.
  There is no `createResource` in the core export list.
- `isPending(memo)` replaces a resource's `.loading`.

Store primitives (`createStore`, `reconcile`) are in `solid-js` core now, not a
`solid-js/store` subpath.

**Not a workspace member.** `pnpm-workspace.yaml` at the repo root does not glob
`examples/demos/*`, and this stays that way: the app installs on its own and never
enters repo CI, the typecheck graph, or the install graph. It carries its own
empty `pnpm-workspace.yaml` to stop pnpm walking up into the repo's workspace —
the same guard the official templates ship for the same reason.

## 3. The morphism system

Three materials, assigned **by role, never by section**. Role assignment is what
keeps the page reading as one label instead of a materials sampler.

| Material | Role | Signature |
|---|---|---|
| **Neumorphism** | Structure — panels, cards, section wells, sliders, accordions | dual shadow (`--raise` / `--inset`), no borders, on the `--bg` surface |
| **Glassmorphism** | Anything that floats — sticky nav, cart drawer, size-guide modal, photo captions, hotspot pins, filter chips | `backdrop-filter: blur(20px)`, 1px light hairline, ~72% surface |
| **Claymorphism** | Accents only — swatches, size pills, quantity steppers | larger radius, puffy inner glow, slight squash on press |

Neu and glass already exist in the static page (panels and buttons; the frosted
on-photo captions). Clay is the only new material and is confined to controls the
user touches directly.

Tokens live in `src/styles/tokens.css` and extend the existing palette rather than
replacing it: the `--bg` / `--ink` / `--raise` / `--inset` / `--display-font`
variables carry over unchanged from the static site's stylesheet.

## 4. Routes and interactions

Six routes. The cart is an overlay on all of them, not a route. Every section
carries one interaction.

### `/` — home

1. **Hero tonal wipe.** A neumorphic handle drags across the hero photograph to
   reveal the same look in a second colorway (`clip-path` wipe, not a fade). Built
   on a real `<input type="range">` so arrow keys and screen readers work; the
   visible handle is the styled thumb.
2. **The Index marquee.** The existing `Coats · Tailoring · Knitwear ·
   Eveningwear · Leather` bar becomes interactive: hover or focus a category and a
   neumorphic well beneath it fills with a three-up strip from that category.
   Clicking navigates to `/shop?category=…`.
3. **Featured teaser.** The wool-coat configurator from the static page, upgraded
   so the photograph swaps with the colorway. Add to bag fires the cart flight.

### `/lookbook`

4. **Density control and filters.** A neumorphic segmented control retiles the
   grid between *Editorial* (two-up, staggered), *Grid* (three-up) and *Index*
   (six-up contact sheet), FLIP-animated between states. Glass category chips
   filter the set with a stagger.

### `/lookbook/:look`

5. **Shop-the-look hotspots.** Glass pins sit over the full-bleed photograph and
   expand into a card naming the piece, its price and an Add control. Pins are
   real `<button>`s in tab order. Prev/next look navigation slides.

### `/shop`

6. **Faceted filtering held in the URL.** Category, colorway and price band are
   typed search params, so the filtered result is *server-rendered* and the URL is
   shareable. Dual-thumb neumorphic price slider.

### `/shop/:piece`

7. **The full configurator.** Clay swatches that swap the photograph, clay size
   pills, a glass size-guide modal, a clay quantity stepper, and neumorphic
   accordions for fabric and measurements.

### `/atelier`

8. **The material story.** Three neumorphic wells reveal a macro texture crop on
   hover or focus; a scroll-linked rule draws down the page; a timeline expands
   entries on click.

### Everywhere

9. **The cart.** Adding a piece flies its photograph from the product panel into
   the bag button (FLIP), ticks the count badge, and slides in a glass drawer:
   line items, quantity steppers, remove-with-collapse, a subtotal that counts up,
   and a neumorphic inset free-shipping progress track.
10. **Sticky nav.** Gains blur and shadow on scroll; the wordmark's letter-spacing
    tightens slightly as the page moves.

**Transitions.** Route changes cross-dissolve with an 8px rise, upgraded to the
**View Transitions API** where supported so a lookbook photograph morphs into the
detail page. Every motion path is gated on `prefers-reduced-motion`.

## 5. Cart — the one piece of real state

The only state that outlives a route change, and the only thing SSR can get
visibly wrong.

- A `createStore` of `{ pieceId, colorway, size, qty }` line items keyed by
  `pieceId:colorway:size`, so adding the same configuration increments rather than
  duplicating.
- Persisted to `localStorage` under one key. **Hydration rule:** the server always
  renders an empty cart, because the server cannot know it; the client reads
  storage in an effect after mount and reconciles. The badge and drawer therefore
  render their empty state on the server and fill in on the client — never a
  mismatch, and never a flash of someone else's cart.
- Derived: line count, subtotal, free-shipping remainder. All `createMemo`.
- The store is I/O-free and framework-only, so it unit-tests without a DOM.

## 6. Content

Invented, consistent with the existing AW26 "Studies in Monochrome" copy.

- **8 pieces** across Outerwear / Tailoring / Knitwear / Eveningwear / Leather /
  Accessories, each with colorways, sizes, price, fabric and measurement copy.
- **12 looks**, each with 1–3 shop-the-look hotspots pointing at pieces.
- **Atelier**: three materials with macro crops, plus a short timeline.

## 7. Images

Direct Unsplash CDN fetches by photo id work; their search API needs a key and the
search page does not scrape. So photo ids are collected by **driving Chrome to the
Unsplash black-and-white fashion searches and reading them off the rendered page**
— which also means shots are chosen to match the existing six rather than taken
blind.

Post-processing with ffmpeg to true grayscale progressive JPEG at the sizes the
current set uses (440×550 grid, 560×700 portrait, 1000×562 landscape). Roughly 20
new images, about 1MB total.

`public/img/CREDITS.md` records photo id, photographer and source URL for each.
The Unsplash License permits this use. The six existing photographs arrived inline
in the story with no provenance recorded; the credits file notes that.

## 8. Layout

```
examples/demos/vesper/
  package.json  vite.config.ts  server.js  tsconfig.json
  pnpm-workspace.yaml          empty — stops pnpm walking up into the repo workspace
  README.md
  src/
    Document.tsx  App.tsx  router.ts
    routes/     index · lookbook · lookbook/[look] · shop · shop/[piece] · atelier · [...404]
    data/       catalog.ts · looks.ts · atelier.ts
    cart/       store.ts · CartDrawer.tsx · CartButton.tsx · flight.ts
    components/ one module per interaction in §4
    styles/     tokens.css · base.css
  public/img/  public/fonts/
  tools/extract-from-story.mjs      kept; documents where the original page came from
```

## 9. Verification

- **Unit** (vitest): the cart store — add, increment on identical configuration,
  quantity change, remove, subtotal, free-shipping remainder, storage round-trip.
- **SSR** (curl per route): assert real content is in the served HTML, not a
  shell — a piece name on `/shop/:piece`, the filtered set on `/shop?category=…`.
  This is the check that catches an interaction accidentally made client-only.
- **Browser** (Chrome, at the end): every route rendered and screenshotted, every
  interaction in §4 driven at least once, console clean, no horizontal overflow at
  1280 and 390 wide.
- **Build**: `vite build` then `node server.js`, and the SSR assertions re-run
  against the production server — dev SSR and built SSR are different pipelines.

## 10. Risks

- **Solid 2 rc.6 shipped 2026-09-02** and the router is a `next` build. Versions
  are pinned exactly; an upgrade is a deliberate act.
- **View Transitions** are progressive enhancement only. The cross-dissolve
  fallback is the baseline and is what gets tested.
- **`filesystem-routing@0.2.1`** is a small third-party package, but it is what the
  official Solid 2 templates use for file routing; the alternative is a
  hand-declared route array, which stays available if it disappoints.
