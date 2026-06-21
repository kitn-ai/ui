# `@kitn.ai/ui` bundle-footprint analysis

**Date:** 2026-06-20 · **Branch:** `worktree-unocss-research` (off `main` @ 0.16.0)
**Goal:** reduce the footprint a developer perceives when adding `@kitn.ai/ui` to their app
("how much will this add?"). All numbers below are **measured** against a real build, not estimated.

---

## 1. What the consumer actually loads today

The package's headline "~110 KB gzip / ~413 KB raw, one file" is the **entire `@kitn.ai/ui/elements`
registration bundle — all ~50 components in one chunk** (`register-impl`). It is not the cost of
`<kai-chat>` alone; it is the cost of registering *everything*, because `register-impl.ts` statically
imports all 50 elements and `@kitn.ai/ui/elements` loads it.

| Payload | raw | gzip | When |
|---|---|---|---|
| `register-impl` (all ~50 elements, JS) | 442 KB | **119 KB** | on first use of any `kai-*` |
| `compiled.css` (shared, ALL components' utilities) | 108 KB | **17 KB** | adopted into every shadow root |
| Shiki (syntax highlighting) | — | 0 | lazy; only if a code block renders (~89 KB gz first block) |

So a markdown-only chat pays roughly **119 KB gz JS + 17 KB gz CSS ≈ 136 KB gz** — and it pays for
*all 50 components*, even the ones it never renders.

## 2. JS composition (source-map attribution of `register-impl`)

| Share | Bucket | Notes |
|---|---|---|
| 35.9% | `src/components` | our SolidJS feature components — **dominant** |
| 12.4% | `src/elements` | the `kai-*` facades |
| 11.0% | tailwind-merge | the `cn()` helper (see §4) |
| 10.0% | marked | markdown parser (load-bearing) |
| 7.1% | solid-js | runtime (load-bearing) |
| 6.3% | runtime glue | bundler/Solid plumbing |
| 5.7% | `src/ui` | in-house UI primitives |
| 2.7% | lucide-solid | icons |
| ~4.8% | @floating-ui | popover/tooltip positioning |

**~56% is our own component code; ~38% deps.** The heaviest individual files are features a basic
chat never renders: `form.tsx` (19 KB), `choice-card`/`artifact` (15 KB ea.), `form-widgets`,
`tasks-card`, `confirm-card`, `file-tree`, `resizable` — the generative-UI / forms / workspace
machinery, all forced into the monolith.

## 3. The two independent levers

1. **JS per-element split** (tree-shaking + optional autoloader) — lets a basic `<kai-chat>` avoid the
   dead-weight component JS (forms, cards, artifact, workspace, voice, file-tree…). Biggest JS win.
2. **Per-component CSS** — `compiled.css` (17 KB gz) currently contains the utilities used across *all*
   components and is adopted whole into every shadow root. JS tree-shaking does **not** shrink it. To
   reduce the CSS floor you need per-component CSS extraction (only the utilities a loaded component
   uses). This is the harder lever and is where the **UnoCSS** question matters.

These are orthogonal: you can do (1) without (2). A bare chat after (1) still pays the full 17 KB gz CSS
floor + shared Solid runtime + `defineWebComponent` until (2) is also done.

### Measured: Lever 1 upside (real tree-shake)

Built a `kai-chat`-only entry (`import './chat'`) with the real minifier and compared the main sync chunk:

| Build | raw | gzip |
|---|---|---|
| `register-impl` (all ~50 elements) | 432 KB | 119 KB |
| **`kai-chat` only** (+ its transitive Solid components) | **278 KB** | **73 KB** |
| **saving** | **154 KB** | **44 KB (~37%)** |

So a basic chat that avoids the unused elements (forms, cards, artifact, file-tree, workspace, voice…)
drops ~37% of the JS. Total for a basic chat: **~73 KB gz JS + 17 KB gz CSS ≈ 90 KB gz**, down from
~136 KB gz today. A single small leaf element (e.g. `kai-badge`) would save far more — the per-element
floor is the shared chunk (Solid runtime + `defineWebComponent` + the CSS). Note: `kai-chat` renders its
content via internal **Solid components** (`Message`, `Reasoning`, `Tool`, `Markdown` from `src/components`),
NOT via the standalone `kai-*` facades — so the standalone facades (artifact/forms/cards/file-tree/…) are
cleanly separable. **To realize this, the package must expose per-element entry points** (today it only
exposes the monolithic `@kitn.ai/ui/elements`).

## 4. tailwind-merge spike — measured, and the verdict is KEEP

The "58 KB" alarm was an **unminified** artifact. Real shipped cost:

| | minified | gzipped |
|---|---|---|
| tailwind-merge | 20.9 KB | **7.1 KB** |
| clsx (already a dep) | 0.5 KB | 0.3 KB |

It's almost entirely a static config table, so it minifies ~3× and gzips ~8×. And it does **real work**:
`src/utils/cn.ts` carries a custom `extendTailwindMerge` config that exists because default tailwind-merge
mis-bucketed the kit's `text-body`/`text-caption` font-size utilities as colors and dropped real color
classes (broke the TextShimmer gradient). 161 `cn()` sites across 56 files rely on "last class wins";
without it, conflicts resolve by stylesheet order (unpredictable). The kit emits 40+ Tailwind utility
groups, so a trimmed config wouldn't save much. **Conclusion: not worth removing for ~7 KB + real
regression risk.** (UnoCSS is evaluated separately — it may change the class-authoring model entirely.)

## 5. Shiki (separate axis — install footprint, not bundle)

Already fully lazy → 0 bytes in the initial bundle; the `dist` chunks are self-contained (no bare
`shiki`/`@shikijs` specifiers). But `shiki` + `@shikijs/langs` + `@shikijs/themes` are declared as runtime
`dependencies` and pull **~17 MB into a consumer's `node_modules`** for nothing (dist inlines what it
needs). **Recommendation (free, zero behavior change): move them to `devDependencies`.** Verified safe:
no bare specifiers in dist, public `.d.ts` is shiki-type-free.

## 6. Where this is heading

- **Lever 1 (JS):** break the monolithic `register-impl` into self-registering per-element modules +
  a shared chunk → tree-shaking for bundler users + an **optional** DOM autoloader (Web Awesome model)
  for CDN/no-build users. The autoloader is additive: "register everything" stays the default.
- **Lever 2 (CSS):** evaluate UnoCSS (or per-entry Tailwind compilation) for per-component CSS so the
  17 KB gz floor shrinks with the JS.
- **Free win now:** Shiki → devDependencies (−17 MB install).

See `webawesome-autoloader.md` and `unocss-feasibility.md` (research threads) and the forthcoming
`footprint-reduction-plan.md` for the synthesis + prototype results.
