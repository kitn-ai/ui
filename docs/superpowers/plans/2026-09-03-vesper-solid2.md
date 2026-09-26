# Vesper on Solid 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `examples/demos/vesper/` from a static page into a server-rendered SolidJS 2 site with six routes, one interaction per section, and a persistent cart.

**Architecture:** Solid 2 in the Vite plugin's **start mode** (`solid({ start: true, ssr: true })`) — the plugin generates the entries around `src/App.tsx` and `src/Document.tsx`; routes come from `src/routes/**` through `filesystem-routing`. No `index.html`, no entry files. A three-material design system (neumorphism for structure, glass for floating surfaces, clay for touch controls) is applied by role, not by section. The cart is the only cross-route state: a `createStore` persisted to `localStorage`, deliberately server-rendered empty.

**Tech Stack:** solid-js 2.0.0-rc.6 · @solidjs/web 2.0.0-rc.6 · @solidjs/router 2.0.0-next.21 · @solidjs/meta 1.0.0-next.2 · @solidjs/vite-plugin 3.0.0-next.38 · filesystem-routing 0.2.1 · vite 8.2.2 · vitest 4

**Spec:** [`docs/superpowers/specs/2026-09-03-vesper-solid2-design.md`](../specs/2026-09-03-vesper-solid2-design.md)

## Global Constraints

- **Never install `@solidjs/start`.** npm's `@solidjs/start@2.0.4` is the Solid *1* line (`solid-js: ^1.9.15`, `@solidjs/router: <2.0.0-0`). Start is a mode of `@solidjs/vite-plugin`.
- **Import the plugin as `@solidjs/vite-plugin`**, not the `vite-plugin-solid` alias.
- **Pin every dependency exactly** (no `^`, no `~`). Solid 2 is at rc.6, published 2026-09-02.
- `extensions: ['.jsx', '.tsx']` in the Solid plugin options is load-bearing — `fileRoutes` emits route module ids ending in `?pick=` and the plugin skips them without it.
- **Async reads are `createMemo(() => fn())` under a `<Loading fallback>` boundary**; `isPending(memo)` replaces a resource's `.loading`. There is no `createResource`.
- Store primitives are in `solid-js` core, **not** `solid-js/store`.
- **Not a pnpm workspace member.** Carry a local empty `pnpm-workspace.yaml` so pnpm does not walk up into the repo workspace.
- Every motion path gated on `prefers-reduced-motion`.
- Copy follows `apps/docs/STYLE.md`: sharp human engineer, no emoji, no em-dash-as-AI-tell in UI copy.
- `packages/ui/src/elements/v0.stories.tsx` is **not modified by any task**.

**Plan adaptation:** the executor here is the same agent that wrote the spec, working in one session. Steps give exact files, interfaces, behaviour and verification commands, and inline code where the code is the contract (the cart store, config files, tokens). For view components the step states the interface and the observable behaviour rather than inlining every line of JSX — inlining a full second copy of the app would double the cost for no reviewer benefit. Any task handed to a fresh implementer should have its component code expanded first.

---

### Task 1: Scaffold the Solid 2 app over the static site

**Files:**
- Create: `examples/demos/vesper/package.json`, `vite.config.ts`, `tsconfig.json`, `server.js`, `pnpm-workspace.yaml`, `.gitignore`
- Create: `src/Document.tsx`, `src/App.tsx`, `src/router.ts`, `src/routes/index.tsx`, `src/routes/[...404].tsx`
- Move: `index.html` content → route components; `css/`, `js/`, `img/`, `fonts/` → `public/` and `src/styles/`
- Keep: `tools/extract-from-story.mjs`, `README.md` (rewritten in Task 12)

**Interfaces:**
- Produces: `src/router.ts` exports `Router` (the router instance component) and `paths` (typed path proxy). Every later route file default-exports a component and may export `route` (`satisfies RouteDefinition`).

- [ ] **Step 1: Write `package.json` with exact pins**

```json
{
  "name": "vesper", "private": true, "type": "module",
  "scripts": {
    "dev": "vite", "build": "vite build",
    "start": "node server.js", "serve": "vite preview", "test": "vitest run"
  },
  "dependencies": {
    "@solidjs/meta": "1.0.0-next.2", "@solidjs/router": "2.0.0-next.21",
    "@solidjs/web": "2.0.0-rc.6", "solid-js": "2.0.0-rc.6"
  },
  "devDependencies": {
    "@solidjs/vite-plugin": "3.0.0-next.38", "filesystem-routing": "0.2.1",
    "typescript": "5.9.2", "vite": "8.2.2", "vitest": "4.0.0"
  }
}
```

- [ ] **Step 2: Write `vite.config.ts`**

```ts
import { fileRoutes } from 'filesystem-routing/vite';
import { defineConfig } from 'vitest/config';
import solid from '@solidjs/vite-plugin';

export default defineConfig({
  plugins: [
    solid({ start: true, ssr: true, extensions: ['.jsx', '.tsx'] }),
    fileRoutes({ types: true }),
  ],
  server: { port: 4330 },
  build: { target: 'esnext', assetsInlineLimit: 0 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
```

- [ ] **Step 3: Move assets.** `img/` and `fonts/` → `public/img/`, `public/fonts/`. The static `css/styles.css` is split in Task 2; `js/shop.js` is superseded by the configurator component and deleted. Delete `index.html`.

- [ ] **Step 4: Write `src/Document.tsx`** — full `<html>`, charset/viewport, `<link rel="preload">` for `playfair-display-400.woff2`, `<HydrationScript />` from `@solidjs/web`, `<body>{props.children}</body>`.

- [ ] **Step 5: Write `src/router.ts`**

```ts
import { pageRoutes } from 'virtual:file-routes';
import { createRouter } from '@solidjs/router';
import { fileRoutes } from '@solidjs/router/fs';

export const Router = createRouter({ routes: fileRoutes(pageRoutes) });
export const { paths } = Router;
```

- [ ] **Step 6: Write a placeholder `src/App.tsx`** rendering `<Router>{(p) => <Loading fallback={null}>{p.children}</Loading>}</Router>`, and `src/routes/index.tsx` returning a bare `<h1>Vesper</h1>`, plus `src/routes/[...404].tsx`.

- [ ] **Step 7: Install and verify SSR is live**

Run: `cd examples/demos/vesper && pnpm install && pnpm dev`
Then: `curl -s localhost:4330/ | grep -c 'Vesper'`
Expected: non-zero — the heading is in the *served HTML*, proving SSR, not a client shell.

- [ ] **Step 8: Commit** — `feat(vesper): scaffold the Solid 2 SSR app in start mode`

---

### Task 2: The morphism system

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/base.css`
- Delete: `css/styles.css` (its rules are redistributed)

**Interfaces:**
- Produces: CSS custom properties and utility classes every later component uses. Names below are the contract.

- [ ] **Step 1: `tokens.css` — carry the existing palette over verbatim** (`--bg: #e9ebf0`, `--ink: #1a1d23`, `--ink2`, `--muted`, `--line`, `--cta`, `--cta-ink`, `--sh-d: #c7cbd4`, `--sh-l: #ffffff`, `--raise`, `--raise-sm`, `--inset`, `--inset-sm`, `--display-font`) plus the two `@font-face` rules pointing at `/fonts/`.

- [ ] **Step 2: Add the glass tokens** — `--glass-bg: color-mix(in srgb, var(--bg) 72%, transparent)`, `--glass-blur: 20px`, `--glass-hair: color-mix(in srgb, #fff 60%, transparent)`, `--glass-shadow`.

- [ ] **Step 3: Add the clay tokens** — `--clay-radius: 18px`, `--clay-raise` (outer dual shadow plus an `inset 0 2px 6px` light glow), `--clay-press` (inset, for `:active` and `[aria-pressed=true]`).

- [ ] **Step 4: `base.css`** — reset, body background gradient and type (carried from the static stylesheet), `.wrap`, `.kicker`, `.serif`, `.photo` and its `figcaption`/`tag` frosted overlays, `.btn`, `.btn-primary`. Add `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important } }`.

- [ ] **Step 5: Verify** the home route still renders with the carried-over look: `pnpm dev`, screenshot, compare against the static site's hero.

- [ ] **Step 6: Commit** — `feat(vesper): three-material token system, neu + glass + clay`

---

### Task 3: Content data

**Files:**
- Create: `src/data/catalog.ts`, `src/data/looks.ts`, `src/data/atelier.ts`, `src/data/types.ts`

**Interfaces:**
- Produces:
  - `type Piece = { id: string; slug: string; name: string; price: number; category: Category; colorways: Colorway[]; sizes: string[]; blurb: string; fabric: string; measurements: string; image: string }`
  - `type Colorway = { name: string; hex: string; image: string }`
  - `type Category = 'Outerwear' | 'Tailoring' | 'Knitwear' | 'Eveningwear' | 'Leather' | 'Accessories'`
  - `type Look = { id: string; slug: string; title: string; caption: string; image: string; hotspots: Hotspot[] }`
  - `type Hotspot = { x: number; y: number; pieceId: string }` — `x`/`y` are percentages
  - `catalog: Piece[]` (8), `looks: Look[]` (12), `pieceBySlug(slug)`, `lookBySlug(slug)`, `categories: Category[]`
  - `materials: Material[]` (3) and `timeline: TimelineEntry[]` from `atelier.ts`

- [ ] **Step 1: Write `types.ts`** with the types above.
- [ ] **Step 2: Write `catalog.ts`** — 8 pieces. The Wool Coat ($680, Outerwear, 4 colorways) carries over from the static page verbatim; the other 7 are new and consistent with the AW26 copy.
- [ ] **Step 3: Write `looks.ts`** — 12 looks, each with 1–3 hotspots whose `pieceId` exists in `catalog`.
- [ ] **Step 4: Write `atelier.ts`** — three materials (wool, silk, leather) with macro crops, and a five-entry timeline.
- [ ] **Step 5: Write the referential-integrity test** `src/data/data.test.ts`: every hotspot `pieceId` resolves, every slug is unique, every `image` path is non-empty.
- [ ] **Step 6: Run it** — `pnpm test`. Expected: PASS.
- [ ] **Step 7: Commit** — `feat(vesper): catalog, lookbook and atelier content`

---

### Task 4: Photography

**Files:**
- Create: `public/img/*.jpg` (~20 new), `public/img/CREDITS.md`
- Create: `tools/fetch-photos.mjs` (records the ids and does the conversion, so the set is reproducible)

- [ ] **Step 1: Collect photo ids.** Drive Chrome to Unsplash's black-and-white fashion-editorial searches and read ids off the rendered page — the search API needs a key and the page does not scrape. Choose shots matching the existing six: high-key or low-key monochrome, single figure, editorial styling.
- [ ] **Step 2: Fetch and convert.** `https://images.unsplash.com/photo-<id>?w=<w>&q=80&fm=jpg` then ffmpeg to true grayscale progressive JPEG at 440×550 (grid), 560×700 (portrait), 1000×562 (landscape) — matching the existing set's profile.
- [ ] **Step 3: Verify** every file is `JPEG ... components 1` (single-channel grayscale) via `file`, and that `src/data/*` references resolve to files that exist.
- [ ] **Step 4: Write `CREDITS.md`** — photo id, photographer, source URL per image; note that the original six arrived inline in the story with no provenance recorded.
- [ ] **Step 5: Commit** — `feat(vesper): editorial photography set with credits`

---

### Task 5: The cart store (TDD — this is the one piece with real logic)

**Files:**
- Create: `src/cart/store.ts`, `src/cart/store.test.ts`

**Interfaces:**
- Produces: `createCart()` returning `{ items, add, setQty, remove, clear, count, subtotal, shippingRemainder, hydrateFromStorage }`
  - `add(piece: Piece, colorway: string, size: string, qty?: number): void`
  - line key is `` `${pieceId}:${colorway}:${size}` `` — adding an identical configuration increments
  - `count()`, `subtotal()`, `shippingRemainder()` are memos; free shipping threshold `FREE_SHIPPING = 500`
- Also produces `CartContext` + `useCart()` for the components in Tasks 6–11.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { createRoot } from 'solid-js';
import { createCart, FREE_SHIPPING } from './store';
import { catalog } from '../data/catalog';

const coat = catalog.find((p) => p.slug === 'wool-coat')!;
const knit = catalog.find((p) => p.slug === 'draped-knit')!;

describe('cart', () => {
  it('adds a line', () => createRoot((d) => {
    const c = createCart();
    c.add(coat, 'Charcoal', 'M');
    expect(c.count()).toBe(1);
    expect(c.subtotal()).toBe(coat.price);
    d();
  }));

  it('increments rather than duplicating an identical configuration', () => createRoot((d) => {
    const c = createCart();
    c.add(coat, 'Charcoal', 'M');
    c.add(coat, 'Charcoal', 'M');
    expect(c.items.length).toBe(1);
    expect(c.count()).toBe(2);
    d();
  }));

  it('keeps different colorways and sizes apart', () => createRoot((d) => {
    const c = createCart();
    c.add(coat, 'Charcoal', 'M');
    c.add(coat, 'Camel', 'M');
    c.add(coat, 'Charcoal', 'L');
    expect(c.items.length).toBe(3);
    d();
  }));

  it('removes at qty 0 and reports the shipping remainder', () => createRoot((d) => {
    const c = createCart();
    c.add(knit, 'Ivory', 'S');
    expect(c.shippingRemainder()).toBe(Math.max(0, FREE_SHIPPING - knit.price));
    c.setQty(c.items[0].key, 0);
    expect(c.items.length).toBe(0);
    expect(c.count()).toBe(0);
    d();
  }));

  it('round-trips through storage', () => createRoot((d) => {
    const a = createCart();
    a.add(coat, 'Camel', 'L', 2);
    const b = createCart();
    b.hydrateFromStorage(a.serialize());
    expect(b.count()).toBe(2);
    expect(b.items[0].colorway).toBe('Camel');
    d();
  }));
});
```

- [ ] **Step 2: Run to verify failure** — `pnpm test`. Expected: FAIL, `createCart` not exported.
- [ ] **Step 3: Implement `store.ts`** — `createStore` over `CartLine[]`, memos for the derived values, `serialize()`/`hydrateFromStorage()` as pure functions over a JSON shape. **No `localStorage` access inside the store** — that keeps it testable in node and is what makes the SSR rule below enforceable.
- [ ] **Step 4: Run** — `pnpm test`. Expected: PASS.
- [ ] **Step 5: Add the provider** `CartContext`/`useCart()`, and in the provider *only*, an effect that reads `localStorage` after mount and writes on change. The server therefore always renders an empty cart.
- [ ] **Step 6: Commit** — `feat(vesper): cart store with storage round-trip`

---

### Task 6: Shell — sticky nav, cart button, cart drawer, route transitions

**Files:**
- Create: `src/components/SiteHeader.tsx`, `src/components/SiteFooter.tsx`, `src/cart/CartButton.tsx`, `src/cart/CartDrawer.tsx`, `src/cart/flight.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useCart()` (Task 5), `paths` (Task 1)
- Produces: `flyToCart(fromEl: HTMLElement, toEl: HTMLElement): Promise<void>` — FLIP, resolves when done, a no-op under reduced motion

- [ ] **Step 1: `SiteHeader`** — glass, `position: sticky`. An `IntersectionObserver` sentinel toggles a `.scrolled` class that adds blur and shadow and tightens the wordmark's `letter-spacing` from `.3em` to `.24em` over 240ms.
- [ ] **Step 2: `CartButton`** — count badge, `aria-label` reporting the count, ticks with a scale pulse when the count changes.
- [ ] **Step 3: `CartDrawer`** — glass panel sliding from the right. Line items with photo, name, colorway/size, clay quantity stepper, remove; subtotal counting up; neumorphic inset free-shipping track. Focus trapped, `Escape` closes, focus returns to the button, `aria-modal`, body scroll locked.
- [ ] **Step 4: `flight.ts`** — clone the photo, `getBoundingClientRect()` both ends, animate along a slight arc with the Web Animations API, remove the clone on finish.
- [ ] **Step 5: `App.tsx`** — `CartProvider` > `MetaProvider` > `Router` with header, `<Loading>`-wrapped children, footer, and the drawer. Route change cross-dissolves with an 8px rise; wrap navigation in `document.startViewTransition` when available.
- [ ] **Step 6: Verify** in Chrome: add from the home configurator, watch the flight, drawer opens, `Escape` closes, focus returns, count persists across a reload.
- [ ] **Step 7: Commit** — `feat(vesper): site shell, cart drawer and flight animation`

---

### Task 7: `/` home — tonal wipe, index marquee, featured configurator

**Files:**
- Create: `src/components/TonalWipe.tsx`, `src/components/IndexMarquee.tsx`, `src/components/Configurator.tsx`
- Modify: `src/routes/index.tsx`

**Interfaces:**
- Produces: `<Configurator piece={Piece} />` — reused verbatim by `/shop/:piece` (Task 10). Owns colorway, size, quantity, the photo swap, and Add to bag.

- [ ] **Step 1: `TonalWipe`** — two stacked images, the top one `clip-path: inset(0 X% 0 0)` driven by a real `<input type="range">` whose thumb is styled as the neumorphic handle. Arrow keys move it; the input carries an `aria-label`.
- [ ] **Step 2: `IndexMarquee`** — the category bar; hover/focus fills a neumorphic well below with a three-up strip from that category; click navigates to `/shop?category=…`. Pointer *and* keyboard both drive it.
- [ ] **Step 3: `Configurator`** — clay swatches (photo swaps with `colorway.image`), clay size pills, clay quantity stepper, Add to bag calling `cart.add` then `flyToCart`. `aria-pressed` on every toggle.
- [ ] **Step 4: `routes/index.tsx`** — hero with `TonalWipe`, `IndexMarquee`, a lookbook teaser linking to `/lookbook`, the featured `Configurator`, `<Title>`.
- [ ] **Step 5: Verify** — `curl` the route and assert the hero copy and the piece name are in the served HTML; then drive all three interactions in Chrome.
- [ ] **Step 6: Commit** — `feat(vesper): home route with tonal wipe, index marquee and configurator`

---

### Task 8: `/lookbook` — density control and filters

**Files:**
- Create: `src/components/DensityControl.tsx`, `src/components/FilterChips.tsx`, `src/components/LookGrid.tsx`
- Create: `src/routes/lookbook.tsx`

- [ ] **Step 1: `DensityControl`** — neumorphic segmented control, three states (`editorial` / `grid` / `index`), `role="radiogroup"` with arrow-key roving focus.
- [ ] **Step 2: `LookGrid`** — CSS grid retiling per density; FLIP between densities (measure, reflow, invert, play) so cards travel rather than jump.
- [ ] **Step 3: `FilterChips`** — glass chips per category; filtering staggers items out and in (60ms apart, capped).
- [ ] **Step 4: `routes/lookbook.tsx`** — head, controls, grid; density held in a signal, filter in a search param so it survives a reload and renders server-side.
- [ ] **Step 5: Verify** — SSR assertion that the filtered set is in the served HTML for `?category=Knitwear`; then drive density changes and filters in Chrome.
- [ ] **Step 6: Commit** — `feat(vesper): lookbook with density control and filters`

---

### Task 9: `/lookbook/:look` — shop-the-look hotspots

**Files:**
- Create: `src/components/Hotspots.tsx`, `src/routes/lookbook/[look].tsx`

- [ ] **Step 1: `Hotspots`** — glass pins absolutely positioned from each hotspot's `x`/`y` percentages; each is a `<button>` that expands a glass card with the piece name, price and an Add control wired to the cart. Card flips to the other side near a viewport edge.
- [ ] **Step 2: `[look].tsx`** — full-bleed photograph, `RouteProps<'/lookbook/:look'>` for typed params, prev/next navigation with a slide, `<Title>`, and a 404 through the catch-all for an unknown slug.
- [ ] **Step 3: Verify** — SSR assertion that the look title is in the served HTML; drive a pin open, add from it, check the drawer.
- [ ] **Step 4: Commit** — `feat(vesper): look detail with shop-the-look hotspots`

---

### Task 10: `/shop` and `/shop/:piece`

**Files:**
- Create: `src/components/PriceSlider.tsx`, `src/components/FilterBar.tsx`, `src/components/Accordion.tsx`, `src/components/SizeGuide.tsx`
- Create: `src/routes/shop.tsx`, `src/routes/shop/[piece].tsx`

- [ ] **Step 1: `PriceSlider`** — dual-thumb, two stacked `<input type="range">`s over one neumorphic inset track, each labelled.
- [ ] **Step 2: `FilterBar`** — glass; category, colorway and price band written to typed search params so the filtered set server-renders and the URL is shareable.
- [ ] **Step 3: `routes/shop.tsx`** — the filtered catalog with a stagger on change; reads `?category=` set by the home marquee.
- [ ] **Step 4: `Accordion`** (neumorphic inset panels, one open at a time, `aria-expanded`) and `SizeGuide` (glass modal, focus-trapped, `Escape` closes).
- [ ] **Step 5: `routes/shop/[piece].tsx`** — the full `Configurator` from Task 7 plus fabric and measurement accordions and the size guide.
- [ ] **Step 6: Verify** — SSR assertions for `?category=Knitwear` on `/shop` and for the piece name on `/shop/wool-coat`; then drive filters, the slider, the accordions, the size guide and Add in Chrome.
- [ ] **Step 7: Commit** — `feat(vesper): shop catalog and product routes`

---

### Task 11: `/atelier` — the material story

**Files:**
- Create: `src/components/MaterialWell.tsx`, `src/components/Timeline.tsx`, `src/routes/atelier.tsx`

- [ ] **Step 1: `MaterialWell`** — neumorphic well; hover or focus reveals a macro texture crop behind an inset mask, scaling from 1.06 to 1. Focusable, so keyboard reaches it.
- [ ] **Step 2: `Timeline`** — entries expanding on click, `aria-expanded`, height animated.
- [ ] **Step 3: `routes/atelier.tsx`** — the story copy, three `MaterialWell`s, the timeline, and a scroll-linked vertical rule drawing down the page (`animation-timeline: scroll()` where supported, an IntersectionObserver fallback otherwise).
- [ ] **Step 4: Verify** — SSR assertion for the atelier copy, then drive the wells and the timeline.
- [ ] **Step 5: Commit** — `feat(vesper): atelier route with the material story`

---

### Task 12: Verification pass, production build, docs

**Files:**
- Modify: `examples/demos/vesper/README.md`, `examples/README.md`

- [ ] **Step 1: Run the unit suite** — `pnpm test`. Expected: PASS.
- [ ] **Step 2: SSR assertions against dev** — curl all six routes plus `?category=` and assert real content, not a shell.
- [ ] **Step 3: Production build** — `pnpm build`, then `node server.js`, and **re-run every SSR assertion against the built server**. Dev SSR and built SSR are different pipelines; a green dev run is not evidence for the build.
- [ ] **Step 4: Browser pass** — every route screenshotted at 1280 and 390 wide, every interaction in §4 of the spec driven at least once, console clean, no horizontal overflow.
- [ ] **Step 5: Rewrite `README.md`** — what it is, how to run it, the three-material system, where the photography came from, and the Solid 2 platform notes (Start is a plugin mode; `@solidjs/start` on npm is the Solid 1 line).
- [ ] **Step 6: Update `examples/README.md`** — the `demos/vesper/` bullet now describes a Solid 2 SSR app rather than a plain static page.
- [ ] **Step 7: Commit** — `feat(vesper): verification pass, production build and docs`

---

## Self-review

**Spec coverage.** §2 platform → Task 1. §3 morphisms → Task 2. §4 interactions 1–3 → Task 7; 4 → Task 8; 5 → Task 9; 6–7 → Task 10; 8 → Task 11; 9–10 → Task 6. §5 cart → Task 5. §6 content → Task 3. §7 images → Task 4. §8 layout → Tasks 1–11. §9 verification → Task 12 (unit in 3 and 5, SSR assertions per route task). §10 risks → the Global Constraints. No gaps.

**Placeholders.** None: no "TBD", no "add error handling", no "similar to Task N". The one deliberate deviation — component JSX described by interface and behaviour rather than inlined — is declared under Plan adaptation with the condition under which it must be expanded.

**Type consistency.** `Piece`/`Colorway`/`Category`/`Look`/`Hotspot` are defined once in Task 3 and used unchanged in 4, 5, 7, 9, 10. `createCart()`'s surface is fixed in Task 5 and consumed as `useCart()` in 6, 7, 9, 10. `flyToCart(from, to)` is defined in Task 6 and called in 7 and 9. `<Configurator piece>` is defined in Task 7 and reused in Task 10. Route param types use `RouteProps<'/path/:param'>` throughout.
