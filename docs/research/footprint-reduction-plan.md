# Footprint-reduction — findings + proposed plan

**Date:** 2026-06-20 · **Worktree:** `worktree-unocss-research` · **Status:** research + prototypes complete, plan proposed (not yet executed)

Companion docs in this folder: `bundle-footprint-analysis.md` (measurements), `webawesome-autoloader.md`
(reference impl), `unocss-feasibility.md` (UnoCSS verdict). Working prototype: `vite.config.split.ts`,
`src/elements/autoloader.ts`, `docs/research/autoloader-proof.mjs` (passing).

---

## TL;DR

A developer asks "how much will `@kitn.ai/ui` add to my app?" Today the honest answer is **~136 KB gz**
(119 KB JS + 17 KB CSS) for *any* use, because we register all ~50 components in one bundle. We can make
the answer **"pay for what you use."** Two levers, both prototyped and measured:

| Lever | Mechanism | Measured result | Verdict |
|---|---|---|---|
| **1. Per-element JS split** | per-element entry points → tree-shaking (bundler) + optional autoloader (CDN) | bare `kai-chat` **73 KB gz vs 119 KB** (−37%); leaf elements far less | **DO IT** |
| **2. Per-component CSS** | shrink the shared 17 KB gz CSS floor per element | not prototyped; hard | defer |
| UnoCSS | replace Tailwind + tailwind-merge | ~2 KB gz saving, breaks "last-wins", redundant w/ Shadow DOM | **rejected (measured)** |
| Quick win: Shiki → devDeps | stop shipping 17 MB of unused install | −17 MB node_modules, 0 runtime change | **DO IT** |
| Quick win: tailwind-merge v2→v3 | match the kit's Tailwind **v4** | correctness (v2 = v3 class groups) | **DO IT** |

---

## The findings in detail

### Lever 1 — per-element split (the main event)

- The monolith (`register-impl`, 119 KB gz) statically imports all 50 elements. A `kai-chat`-only build
  is **73 KB gz** — the unused facades (forms, cards, artifact, file-tree, workspace, voice…) are cleanly
  separable because `kai-chat` renders via internal **Solid components**, not the standalone `kai-*` facades.
- A multi-entry build with code-splitting decomposes cleanly:
  - **Shared floor ≈ 35 KB gz** = the `cn` chunk (compiled CSS 17 KB + Solid runtime + `defineWebComponent`
    + tailwind-merge), loaded once and shared by every element.
  - **Per-element facades are tiny:** `kai-chat` 2 KB, `kai-loader` 0.2 KB, `kai-markdown` 0.5 KB; heavy
    uniques `kai-form` 30 KB, `kai-artifact` 16 KB.
- **Honest trade-off:** building all 50 split totals ~154 KB gz — slightly *more* than the 119 KB monolith
  (chunk overhead). Splitting **wins the common case** (apps use a handful of elements) and slightly loses
  the "use literally everything" case. That's the right trade.
- **Web Awesome (Shoelace's successor) is the proven blueprint:** per-component entry files that self-register
  on import (our `defineWebComponent` already runs at module scope — verified), `exports` glob
  `"./dist/components/*"`, **no `sideEffects` field** (so registrations aren't DCE'd), build with
  `splitting: true`. Two dist trees: npm (deps external, for bundler tree-shaking) + CDN (deps bundled).

### The optional autoloader (proven working)

`src/elements/autoloader.ts` (847 B built) replicates Web Awesome's algorithm for `kai-`: scan
`:not(:defined)`, `MutationObserver` for new nodes, dedup via `customElements.get`, dynamic-import
`./<tag>.js`. **`autoloader-proof.mjs` passes:** a page with only `<kai-chat>` loads chat + shared chunks,
renders, 0 errors, and loads **none** of the other 49 elements. It's **additive and opt-in** — the
"register everything" bundle stays the default; this is just a delivery for no-build / CDN / lazy consumers.

### Lever 2 — CSS floor (deferred)

The 17 KB gz `compiled.css` holds the utilities used across *all* components and is adopted whole into every
shadow root, so JS splitting doesn't shrink it. Per-component CSS (only a loaded component's utilities) would
require per-entry Tailwind extraction + a per-component sheet model — meaningful work for ~10–15 KB gz. Lower
priority than Lever 1. **UnoCSS does not help here** (see below).

### UnoCSS — rejected, with data

Measured against the kit's real classes: UnoCSS utility layer 4.9 KB gz vs Tailwind v4 7.3 KB gz → net low
single-digit KB. It does **not** remove tailwind-merge (UnoCSS sorts output alphabetically, *breaking*
"last class wins" → a merge step becomes *more* necessary). Its namespacing is redundant — Shadow DOM already
isolates the kit's classes, and the one light-DOM surface (`theme.css`) is already `--kai-*` custom properties.
Its shadow-DOM mode is per-component injection, the opposite of our shared Constructable Stylesheet. Migration
~3–6 days for negative payoff. **The real CSS finding is unrelated to UnoCSS:** the kit pins
`tailwind-merge@^2.5.0` (Tailwind **v3** class groups) while running Tailwind **v4** — upgrade to
tailwind-merge **v3.x** for correct v4 bucketing.

---

## Proposed plan of action (phased, each shippable on its own)

**Phase 0 — quick wins (hours, low risk).** Independent of everything else.
- Move `shiki` / `@shikijs/langs` / `@shikijs/themes` → `devDependencies` (−17 MB consumer install; dist is
  self-contained — verified). Add a consumer-regression cell to prove highlighting still works.
- Upgrade `tailwind-merge` ^2 → ^3 (Tailwind v4 class groups); re-vet the `extendTailwindMerge` config + run
  visual/declarative tests.

**Phase 1 — per-element entry points → tree-shaking (the main lift).** No behavior change for existing
consumers; adds a new capability.
- Build pipeline: emit one self-registering module per element + shared chunks (the `vite.config.split.ts`
  prototype is the starting point). Two outputs: npm (solid external) + CDN (bundled).
- `package.json`: add `"./elements/*"` (or `"./components/*"`) to `exports`; **remove the `sideEffects`
  field** (or list the element entries) so registrations survive tree-shaking. Keep `@kitn.ai/ui/elements`
  (register-all) as the default.
- A generated **tag→module manifest** (filenames don't always equal the tag) so the autoloader + docs resolve
  correctly.
- Tune chunk granularity: the prototype loads ~30 shared chunks for a bare chat — coarsen to 1–3 shared
  chunks (CSS+runtime+`cn`, and a markdown chunk) to cut request count for the CDN/autoloader path.

**Phase 2 — ship the optional autoloader.** `@kitn.ai/ui/autoloader` (or a `kitn.loader.js` CDN entry). The
prototype works; productionize: the tag→module manifest, base-path resolution from the loader script tag (Web
Awesome style) as a fallback to `import.meta.url`, a `data-kai-preload` hook, docs. **Gotcha recorded:** never
use `new URL(\`./${dynamic}\`, import.meta.url)` — Vite rewrites it to an (empty) asset glob; build the URL
from `import.meta.url` as a plain string.

**Phase 3 — per-component CSS (optional, later).** Shrink the 17 KB gz floor with per-entry CSS extraction.
Only if the floor becomes the bottleneck after Phase 1.

---

## Open decisions for the human
1. **Appetite/sequencing:** Phase 0 + 1 now (the high-value, lower-risk 80%), or commit to 0–3?
2. **Per-element refactor shape:** keep element files where they are and drive entries from a build manifest
   (less churn), vs. restructure into `src/elements/kai-<tag>/` folders (Web Awesome style, more churn,
   cleaner). Recommendation: build-manifest first, restructure only if needed.
3. **Autoloader surface:** ship it in this package, or as a separate tiny `@kitn.ai/ui-loader`?
4. **Is the slightly-larger "use everything" total (154 vs 119 KB gz) acceptable** given the common-case win?
   (Recommendation: yes.)
