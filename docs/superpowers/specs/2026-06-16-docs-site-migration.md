# Spec — kitn docs site migration (Storybook → Astro Starlight)

**Status:** validated prototype + template complete; this spec is the plan to take
it to production. Branch: `feat/docs-site-astro-starlight`. Prototype lives at
`docs/proposals/starlight-prototype/` (run `npm install && npm run dev` → serves
under base `/chat`). Companion docs: `docs/proposals/known-kit-issues.md`,
`docs/proposals/starlight-prototype/DESIGN.md`, and the superseded Storybook-rebrand
mock at `docs/proposals/storybook-redesign/`.

## 1. Goal

Make a **dedicated documentation site the primary DX surface** for `@kitn.ai/chat` —
where developers learn setup, usage, customization, play with components, and copy
code. Storybook is **demoted to an internal tool** (the axe-gated story test suite +
a playground for the low-level SolidJS/Advanced layer), not the public face.

Driving priority (Rob): **DX** — "how do I set it up / use it / customize it." The
references that set the bar: Vercel **AI Elements** (elements.ai-sdk.dev) and **Web
Awesome**. Brand comes from **kitn.ai** (Lato + magenta `hsl(326 84% 53%)`, neutral
near-black dark à la VitePress).

## 2. Decisions already made (locked)

- **Stack: Astro + Starlight.** Chosen over Fumadocs (React/Next; Rob won't use Next)
  and VitePress (Vue). Astro is framework-agnostic → doc widgets authored in **Solid**
  (the kit's own language); web components embed natively in MDX for live demos.
- **Deploy: GitHub Pages.** Static build (`astro build`), `base: '/chat'`, Pagefind
  search. No new host. (Prototype build is already Pages-shaped.)
- **Design system** (`docs/proposals/starlight-prototype/DESIGN.md` + `tokens.css`):
  ONE token source drives BOTH Tailwind utilities (`@theme inline`) AND Starlight
  `--sl-*` chrome. Tailwind v4, Starlight-layered (`@astrojs/starlight-tailwind`),
  **with preflight** in the base layer. Magenta is the only brand color; neutral
  charcoal surfaces; **no shadows**; **mono only for code**; **Lato** everywhere.
- **Component page template** (proven on Attachments — use verbatim for all):
  1. **Hero** — friendly title · `kc-tag` subtitle · lede · "facts" pills
  2. **Preview** — interactive **playground**: controls drive the live preview AND
     the copyable code; resizable preview (grip); event console
  3. **When to use** (blue callout) · **Usage** (prose → points at the playground)
  4. **Examples** — a series of named, live, copyable cards (each `### heading` +
     description so it's a TOC subitem). **Maps the Storybook stories.**
  5. **Props** + **Events** — 14px tables generated from `element-meta.json`
  6. **Composed from** — the SolidJS parts the element wraps (escape hatch)
  7. **Need a hand?** — Report a bug / Ask for help
- **Code = single source of truth.** The control state (or a fixed example config) →
  the snippet for each framework (HTML/React/Vue/Svelte). Highlighted by dogfooding
  the kit's own **`kc-code-block`** (Shiki).
- **Custom Header** (`overrides/Header.astro`) — logo `kitn | Chat` + nav (Docs ·
  Components · Examples) left; Search + GitHub + Ask AI + sun/moon toggle right.
  (CSS couldn't right-align search against Starlight's grid; full override was needed.)
- **Heading anchors**: appended INSIDE the heading via `rehype-autolink-headings`
  (`behavior:'append'`, empty content) + CSS `::after` "#"; heading is `display:flex`
  so it's a clean flex row, revealed on hover. (Empty content keeps the TOC text clean.)

## 3. Reusable building blocks (already extracted in the prototype)

- `components/example/kit.ts` — idempotent `loadKit()` (loads the kit bundle once)
- `components/example/Resizer.tsx` — resizable pane + visible grip (magenta on
  hover/drag, clamped 300px↔card width)
- `components/example/CodePanel.tsx` — expand/collapse + framework tabs + `kc-code-block`
- `components/attachments-code.ts` — demo data + per-framework code generators
- `components/AttachmentsDemo.tsx` — the playground (controls → preview + code)
- `components/AttachmentsExample.tsx` — a focused, fixed-config example
- `components/PropTable.astro`, `EventTable.astro`, `ComposedFrom.astro`, `Facts.astro`,
  `NeedAHand.astro` — all fed by `element-meta.json`
- `overrides/{Header,SiteTitle,SocialIcons,ThemeToggle}.astro`

## 4. Kit bugs surfaced (must land properly — see known-kit-issues.md)

Dogfooding the real components found real kit bugs. Two were fixed **in the working
tree** (uncommitted, no tests) to unblock the prototype; the third is only worked
around in the docs:

1. **Hover-card collapsed inline/list rows** + **grid skipped hover entirely.**
   FIXED in working tree (`ui/hover-card.tsx`, `components/attachments.tsx`,
   `elements/attachments.tsx`): the hover trigger now carries the flex layout and
   hover-card is allowed on grid (tile wraps the image; details show in the card).
2. **`kc-attachments` variant not reactive after first render** (`Attachment`
   destructures `variant` from context → stale). **NOT fixed in the kit** — worked
   around in docs (variant as markup attribute + remount-on-change). 3-line kit fix
   noted in known-kit-issues.

**Action:** land #1 and #2 as a proper kit change off `main` — TDD, full gate
(`tsc`, unit, react, storybook+axe, build), version bump. Don't ship docs that
depend on uncommitted kit edits.

## 5. Migration phases

### Phase 0 — Productionize the site shell
- Promote the prototype to a real package (e.g. `docs-site/` at repo root, or keep the
  name). Stop using a **copied `dist` snapshot** in `public/kitn` and a copied
  `element-meta.json` — wire the site to the **live generator outputs** (`element-meta.json`,
  `component-meta.json`, `framework-usage.json`) and the real built bundle (local dist or
  CDN), refreshed on build.
- CI: build the docs site + deploy to GH Pages (`withastro/action`), `base:'/chat'`.
- Keep the kit build (`npm run build`) producing the metas the site consumes.

### Phase 1 — Land the kit fixes (blocking correctness)
- Hover-card layout (#1) + variant reactivity (#2) as a tested kit commit off `main`.
- Re-point the docs bundle at the fixed build.

### Phase 2 — Scale the content (the bulk of the work)
- **Generate per-component code snippets from `framework-usage.json`** — do NOT
  hand-author a `*-code.ts` per element (won't scale to ~40). The generator already
  emits per-framework usage; adapt it to feed the playground + examples.
- Roll the **component-page template** to all ~40 `kc-*` elements. Decide the
  **Examples ↔ Storybook stories** relationship (curate, or generate example configs
  from the story args).
- Port the **narrative docs**: Introduction, Installation, Getting Started, Frameworks
  (HTML/React/Vue/Svelte/Angular/Solid), Theming, Recipes (Streaming/TTS/STT), plus
  **Patterns** and **Examples** (full-app) sections.
- Decide where the **SolidJS / Advanced** layer lives (its own docs section vs.
  Storybook) and wire the **Composed-from** chips to it.

### Phase 3 — Quality gates (don't regress what Storybook had)
- **Accessibility**: add an axe pass to the docs site (Storybook gated at `error`; the
  site currently has none). Make the **resize grip keyboard-operable** (arrow keys +
  ARIA value; currently pointer-only). Audit switches/tabs/Code buttons + magenta
  contrast on surfaces.
- **Mobile QA**: the custom Header (+ mobile menu toggle), resizable preview, tables,
  sidebar.
- **Light-mode QA** of all the new playground/Example chrome (we verified mostly dark).

### Phase 4 — Differentiators (upside)
- **Dogfood `kc-chat` as the "Ask AI" widget** (currently a placeholder) — the product
  documenting itself.
- Keep emitting **`llms.txt` / `llms-full.txt`** for AI agents (we had this in Storybook).
- **"Open in StackBlitz/playground"** action on examples (Web Awesome's "Edit").
- Empty-state and any missing example coverage per component.

## 6. Storybook's fate (open decision)
Keep Storybook as: (a) the **axe-gated story test suite** (`vitest --project=storybook`
— real coverage, don't lose it), and (b) a **playground for the Solid/Advanced layer**
the docs site won't deep-dive. Drop it as the public face. Confirm with Rob before
deleting any Storybook presentation.

## 7. Risks / watch-items
- **Coordinate** with any parallel Storybook/IA agent before touching shared kit/docs.
- The docs bundle must track the kit version (stale snapshot = wrong behavior).
- Per-component authoring volume — lean on generators; avoid hand-written drift.
- `kc-code-block` at runtime loads Shiki per language — fine, but watch bundle/island count.

## 8. Immediate next steps (resume)
1. Review + commit the current working tree on this branch (prototype + specs) — the
   kit fixes (`src/**`) are uncommitted and should be split into their own tested kit
   change off `main`.
2. Phase 0: stand up the real `docs-site` package wired to live generators + CI/GH Pages.
3. Phase 1: land the kit fixes properly.
Then Phase 2 scale-out.
