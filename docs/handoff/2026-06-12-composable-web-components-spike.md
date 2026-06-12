# Handoff — Composable web components spike (2026-06-12)

Comprehensive resume doc for the `spike/composable-web-components` branch. Supersedes the composable-spike section of `2026-06-11-web-components-and-publishing.md` (that file's *publishing pipeline* + *examples* background is still accurate; read it for the original two-layer architecture context). This file is the source of truth for **where we are and what's left**.

---

## TL;DR

We turned the kit's SolidJS primitives into a full set of **composable, framework-agnostic web components** (compose in plain HTML / React / Vue, not just the batteries-included `<kitn-chat>`). 28 element tags total, all on the branch, **nothing merged** — the publish firewall holds (npm publishes only when this branch merges to `main` → a release-please PR is merged). 27 commits. Bundle ~**100 KB gzip** (main chunk).

The build-out is done. Remaining work is: **Vue wrappers** (optional), a **508/WCAG accessibility pass** (real violations found — see below), a **Kobalte keep-vs-DIY decision** (data gathered), **Storybook stories + full docs** for the new elements, and polishing. The last few sessions also did a deep **theming overhaul** (namespaced `--kitn-*` override surface, typography tokens, dark-palette harmonization) and a **showcase redesign**.

---

## The branch — status & how to work it

- Branch: `spike/composable-web-components`, 27 commits ahead of `main`, **clean working tree**, **not merged**.
- **Publish firewall:** nothing reaches npm/CDN until (1) merge branch → `main` (release-please opens a `chore: release` PR) and (2) merge that PR (OIDC publishes). So commit freely on the branch; validate exhaustively before merging.
- **Norms:** show diffs / wait for approval before commit-merge (memory `review-before-commit`); but the user has been authorizing per-phase commits on this branch. Use REST for PR merge/edit (`gh pr merge/edit` trip the Projects-classic GraphQL bug): `gh api --method PUT repos/kitn-ai/chat/pulls/N/merge -f merge_method=merge`.

**Run the showcase** (the visual test bed for everything):
```bash
npm run build       # once — produces dist/ (+ postbuild regenerates manifest/types/react/theme.tokens.css)
npm run examples    # serves the REPO ROOT on http://localhost:8000
# open http://localhost:8000/examples/composable/index.html
```
Must be served over HTTP from the **repo root** (it loads the local build at `../../dist/`). Opening as `file://` or serving from the wrong dir → empty boxes (boot guard shows instructions). Examples are NOT published (not in package `files`).

**Validation gate** (run after changes): `npm run build` + `npm run typecheck` (does both solid + react tsconfigs) + `npm test`. Test baseline: **3 pre-existing env-flaky failures only** (Shiki highlighter + a jsdom `window.scrollTo` — all in `tests/primitives/highlighter.test.ts`, unrelated to our work). Any NEW failure = regression. The suite is slow/flaky around Shiki imports; re-run if counts look off.

**Headless smoke/visual testing:** Playwright is a devDep. Pattern used all session: serve repo root, write an ephemeral `.mjs` in the repo (so `node` resolves `playwright` from node_modules), load the showcase, `page.evaluate` into elements' open shadow roots, screenshot, delete the `.mjs`. (We removed `_harness.html`/`MOCKUP.html` — recreate a temp blank harness if you need element-in-isolation testing.)

---

## What's built (the full roster)

### Two layers, unchanged philosophy
1. **SolidJS primitives** (`src/components`, `src/ui`, `src/primitives`) — fully composable, exported from `src/index.ts`. Unchanged in spirit; a few got token migrations (see Theming).
2. **Web components** (`src/elements/*.tsx`) — drop-in custom elements, Shadow DOM, SolidJS bundled. Each facade wraps primitives. Composition happens at the **data layer** (properties in, CustomEvents out), NOT by splitting compound components across shadow roots (Solid Context doesn't cross the boundary — that ruled out a "nested sub-element" design).

### The infra: `defineKitnElement<P, E>` (`src/elements/define.tsx`)
The shared registration wrapper. Key features added this spike:
- **Shared constructable `CSSStyleSheet`** adopted into every shadow root (was: full ~77 KB compiled CSS inline-`<style>` per instance). One sheet shared across all elements; inline `<style>` only as a fallback where unsupported.
- **`flag(name)`** helper — `component-register` parses a bare boolean attribute (`<el removable>`) to `undefined`, not `true`. `flag()` makes bare booleans behave like HTML (`<el x>`, `<el x="true">`, `el.x = true` all → on; `="false"`/absent → off). Applied to ALL element booleans incl. the original `<kitn-chat>` (`loading`/`search`/`voice`/`code-highlight`) which were silently broken before.
- **Typed `dispatch<E>`** — per-element event map types the CustomEvents.
- **Reserved-name guard** — throws a clear error if a prop name collides with a global reflected attribute (`title`/`id`/`slot`/`lang`). The CE constructor does `this[prop] = undefined`, and for those the native setter reflects to an attribute → illegal in a CE constructor → cryptic "result must not have attributes". (`<kitn-source>.title` hit this; renamed to `headline`.)

### Element roster (28 tags)
- **Shipped before** (3): `<kitn-chat>`, `<kitn-conversation-list>`, `<kitn-prompt-input>`.
- **Phase 1 — message core:** `kitn-message` (keystone — a single message row from one `message` object; reasoning/tools/attachments/actions), `kitn-markdown`, `kitn-code-block`, `kitn-reasoning`, `kitn-tool`.
- **Phase 2 — header/meta:** `kitn-model-switcher`, `kitn-context-meter`, `kitn-chat-scope-picker`, `kitn-feedback-bar`.
- **Phase 3 — input:** `kitn-prompt-suggestions`, `kitn-file-upload` (Route 2 `<slot>`), `kitn-voice-input` (the **function-property** exemplar: `el.transcribe = async blob => text`, since a value-returning callback can't be a fire-and-forget event).
- **Phase 4 — leaves:** `kitn-loader`, `kitn-text-shimmer`, `kitn-image`, `kitn-checkpoint`, `kitn-message-skills`, `kitn-source` / `kitn-source-list`, `kitn-response-stream`, `kitn-empty` (slots), `kitn-chain-of-thought`, `kitn-thinking-bar`, `kitn-attachments`.
- **Slash commands:** NOT a standalone element (`SlashCommand` reads the input value via `usePromptInput()` — context-bound). Folded into `<kitn-prompt-input>` AND `<kitn-chat>` via a `slashCommands` property (+ `slashActiveIds`/`slash-compact`); typing `/` opens the palette, emits `slashselect`.

The **API mapping rules** (documented in `docs/composable-web-components-roster.md`): variant/size → attribute; include/omit a sub-part → boolean flag; data → JS property; fire-and-forget callback → CustomEvent; value-returning callback → **function-valued property**; custom inner markup → named `<slot>`. Generic UI primitives (`Button`, `Dropdown`, …) and hooks stay SolidJS-only.

### Codegen — `scripts/gen-element-api.mjs` (runs in `postbuild`)
Uses the TypeScript compiler API to extract every element's props/events/attributes from the facades, then emits 3 artifacts on every build:
1. **`dist/custom-elements.json`** — Custom Elements Manifest (`customElements` field in package.json). Editor autocomplete for the tags in HTML.
2. **`src/elements/element-types.d.ts`** — typed `HTMLElementTagNameMap` augmentation → `document.querySelector('kitn-message')` is typed `KitnMessageElement` with prop autocomplete. Wired as the `./elements` types entry. Types are **fully self-contained** (every kit type expanded inline) so they don't drag Solid `.tsx` into a React/consumer compile.
3. **`frameworks/react/index.tsx`** — typed React wrappers (`@kitnai/chat/react`). `frameworks/react/runtime.tsx` renders the element and sets rich props as DOM **properties** (via ref, so objects pass through unstringified) + wires `on<Event>` handlers. React is an **optional peer dep**. **NB:** wrappers live in `frameworks/react/` not `react/` — a top-level `react/` dir + `baseUrl:"."` shadows the `react` npm package. `npm run typecheck` covers both JSX contexts (`tsconfig.json` excludes `frameworks/`; `tsconfig.react.json` handles it with `jsx: react-jsx`).

### Showcase (`examples/composable/`)
Rebuilt into a polished **specimen catalogue** (split into `index.html` + `styles.css` + `main.js`): sticky indexed sidebar with scroll-spy, numbered sections, "specimen" cards (tag chip + spec + framed live stage), a **docked collapsible event console** (bottom; clear/hide; shares vertical space via `--console-h`), light/dark toggle (OS-aware on first paint), boot guard. All ~26 element kinds shown. Bricolage Grotesque (display) + JetBrains Mono (mono) via Google Fonts; warm-paper light / true-ink dark host chrome; neutral white/`#171716` specimen "stage" so elements render on a consistent ground.

---

## Architecture decisions (the important "why"s)

- **Solid, not Stencil.** The web-component layer is a thin facade; the value is the ~50 SolidJS primitives + Kobalte. A Stencil rewrite would rebuild all of that + replace Kobalte for mostly-DX gains. The two rough edges (per-instance CSS, bare booleans) were ~10-line fixes. Revisit only if the product becomes web-component-first (SSR/hydration + auto wrappers as core).
- **Composition at the data layer, not nested sub-elements.** Solid Context doesn't cross shadow roots, so compound components (ChainOfThought, Context, Attachments) ship as ONE element taking structured data, not as nestable sub-parts. Presentation knobs become `variant` + boolean flags.
- **No store.** Cross-element coordination = the host wires A's event → B's property (idiomatic). We'd use a Solid `createStore` singleton (not `@stencil/store`) only if we ever want elements to auto-coordinate without host wiring (deferred).

---

## Theming system — the deep work (READ THIS)

The kit ships **self-themed** elements (compiled tokens inside each Shadow DOM; no host stylesheet needed) that are ALSO **overridable** and **isolated** from host collisions. The mechanism took several iterations to get right:

- **The override problem:** Tailwind v4 emits `@theme` tokens to `:root,:host`. The `:host` pin means a value specified on the element beats one inherited from the document — so a consumer's `:root` override could never reach the components (affected `--color-*` too, contradicting the documented rebrand). NOT Tailwind's fault per se — it's the inherent Shadow-DOM tension between self-theming (defaults on `:host`) and external override (inherited). You'd hit it with hand-CSS.
- **The solution (namespaced alias):** in `theme.css`, every kit token is now `--color-x: var(--kitn-color-x, <default>)` (colors + `--radius` + `--text-*`, both light `@theme` and `.dark` blocks). The `:host` pin **stays** (isolation — a shadcn host's generic `--color-primary`/`--radius` can't bleed in), but the fallback resolves the **namespaced** `--kitn-color-x` which inherits from `:root` → consumers override `--kitn-color-*` / `--kitn-text-*` / `--kitn-radius`. **No utility renames** (utilities still read `--color-x`). One `--kitn-*` value applies to both modes; scope to `:root.dark` for per-mode.
  - Verified: host `--color-primary` ignored (isolated); `--kitn-color-primary`/`--kitn-text-meta` apply *inside* the shadow; self-theming intact light+dark.
  - **Public theming API is now `--kitn-color-*`, `--kitn-text-*`, `--kitn-radius`.** Docs (`docs/web-components.md`) + the Storybook `Theming/Typography` story reflect this.
- **`dist/theme.tokens.css`** — `scripts/build-theme-tokens.mjs` generates a browser-ready token stylesheet from the Tailwind-source `theme.css` (the source uses `@theme` which the browser ignores via `<link>`). New export `./theme.tokens.css` for `<link>`/CDN consumers (the Tailwind-source `./theme.css` export is unchanged for `@import` build consumers like examples/solid). The elements don't NEED it (self-themed); it's for host-page chrome / rebrand.
- **Tokenized typography:** `theme.css` `@theme` defines `--text-caption (11) / --text-meta (12) / --text-body (14) / --text-title (16)` → Tailwind utilities `text-caption/meta/body/title`. Control-tier components migrated off ad-hoc `text-xs/sm` (reasoning trigger, chain-of-thought trigger, model-switcher). **Default chat reading size changed `base`→`sm` (14px)** so message/input/suggestions/markdown agree. The reasoning component had NO explicit size (inherited the ambient 16px) — that was the original "reasoning toggle too big" bug.
- **Dark palette harmonized (latest fix):** `--color-card`/`--color-popover`/`--color-muted`/`secondary`/`accent`/`border`/`input`/`ring` (dark) were the shadcn-default **cool** (hue 240) while `--color-background`/`sidebar` were **warm** (hue 50) — and card was DARKER than background. So Kobalte overlays (dropdown/hover-card/tooltip use `bg-card`/`bg-popover`) rendered as a cool near-black "black hole" against the warm chat surface. Re-tinted those to warm-neutral (hue ~45) and **elevated** card/popover above the background (12% vs 9% lightness). Light palette untouched.

---

## Open issues / NOT done

1. **Accessibility / 508 — biggest gap.** axe-core scan of the showcase (light) found, *even with Kobalte*: **critical `button-name` (6 nodes)** (icon-only buttons w/o accessible name), **serious `color-contrast` (74 nodes)** (lots of muted text — *some* is the showcase's own muted chrome, but plenty are kit components), **serious `scrollable-region-focusable` (1)**. The kit is **NOT 508/WCAG-AA compliant today**. No per-component a11y audit has been done. Kobalte gives correct *widget* a11y (menus/tooltips/focus), but contrast/labels/scroll/keyboard across the whole kit are unaudited.
2. **Vue wrappers** — optional; same generator pattern as React (`scripts/gen-element-vue.mjs` + `frameworks/vue/` + `./vue` export). Not built.
3. **Storybook stories for the new elements** — only the original components + the new `Theming/Typography` story exist. ~23 new elements have no stories.
4. **`docs/web-components.md` full element reference** — still documents only the original 3 elements (plus the React/TS/theming sections we added). Could auto-generate the per-element reference from `custom-elements.json`.
5. **Kobalte keep-vs-DIY** — decision pending (data below).
6. **Misc element polish:** `<kitn-attachments>` hover-card is scoped to inline/list only (grid tiles can't host the hover trigger without collapsing — see commit `7efd3e1`); a grid+hover combo would need real work. `<kitn-chat>` `loading` only locks the input (no thinking animation by design — convey progress by streaming messages).

---

## Findings & recommendations

### Kobalte (the dependency question)
- **Used:** `dropdown-menu` (model-switcher, chat-scope-picker), `hover-card` (attachments, context, source), `tooltip` (checkpoint, voice-input), `collapsible` (tool, conversation-list, chain-of-thought). **Dialog removed** (was dead). floating-ui is a transitive dep (Kobalte's positioning).
- **Bundle spike (measured, gzip):** Kobalte runtime = **25.9 KB** (~26% of the main bundle, the max you could save); floating-ui = 6.6 KB (you'd KEEP this in a DIY approach); together 32.5 KB. Realistic DIY net saving ≈ **14–20 KB** after re-adding floating-ui + writing your own implementations.
- **The catch:** floating-ui only solves *positioning* (easy ~20%); a11y/keyboard/focus is the hard 80% Kobalte does well — especially `dropdown-menu` (roving focus, typeahead) and any future dialog.
- **Recommendation:** **Keep Kobalte for now.** Don't take on reimplementing accessible primitives while the kit still has a11y debt (you'd be *owning* widget a11y exactly when you most need Kobalte's correctness). Sequence: (1) ✅ Dialog removed; (2) **do the 508/WCAG pass first** (needed regardless); (3) optionally hand-roll `collapsible` now (no positioning, trivial a11y — low-risk trim of part of the 26 KB); (4) revisit Kobalte replacement AFTER the a11y baseline is solid — at which point keeping the 26 KB for *guaranteed* widget a11y may well be right.

### Framework wrappers
- React wrappers done. Vue is the same generator pattern. The custom-elements-manifest also enables generating Vue/Angular wrappers + `vscode.html-custom-data.json` if wanted.

---

## Recommended next steps (prioritized)

1. **Accessibility / 508 remediation** — highest value. Fix the concrete violations (button labels, color contrast, scrollable-region keyboard access), then a per-component audit (axe + manual keyboard + screen-reader, light AND dark). This unblocks any serious adoption and informs the Kobalte decision.
2. **Hand-roll `collapsible`** (optional, low-risk) — trims part of the 26 KB Kobalte cost with near-zero a11y risk (no positioning; just height anim + `aria-expanded`). We partially do this in `Reasoning` already.
3. **Storybook stories + `docs/web-components.md` full reference** for the ~23 new elements (the reference can auto-generate from `custom-elements.json`).
4. **Vue wrappers** (if multi-framework parity matters) — clone `gen-element-react.mjs` → Vue.
5. **Decide on merging the branch.** Everything is validated locally (tarball consumer test passed earlier). Before merge: a final `npm test` + a fresh `npm pack` consumer smoke. Merging triggers a release-please PR (a `feat` minor bump — this is a big feature set; consider the version story). The dark-palette + default-prose-size changes are user-visible default changes for existing consumers — call them out in the release notes.

---

## Gotchas / how things work (so the next session doesn't relearn)

- **Bare boolean attrs** need `flag()` (component-register parses them to `undefined`). Already applied everywhere; use `flag('x')` in any new facade.
- **Don't name a prop** `title`/`id`/`slot`/`lang` (global reflected attrs → CE-constructor crash). `defineKitnElement` throws a clear error if you do.
- **Overlays must portal into the shadow** via `ChatConfig`'s `portalMount` (define.tsx provides a node inside the `.dark` wrapper) — Kobalte components already use `config.portalMount()`. This is why dropdowns get the kit CSS + theme scope.
- **Theme override is `--kitn-*`**, not `--color-*` (the latter is internal + isolated by the `:host` pin). For Solid primitives (no shadow) BOTH work; for web components only `--kitn-*`.
- **Generated files** (committed): `src/elements/element-types.d.ts`, `frameworks/react/index.tsx`. Regenerated by `postbuild` — if a facade's props/events change, rebuild and commit the regen. `dist/` + `compiled.css` are gitignored (rebuilt on build/publish).
- **`proseSize` default is now `'sm'`** (14px) across chat-config + the 4 element facades that set it. `<kitn-message>` etc. read it; standalone text-shimmer/response-stream default to `text-body` so they don't inherit the ambient 16px.
- Test suite is slow & flaky around Shiki — 3 known failures in `highlighter.test.ts` are the baseline.

---

## Reference docs
- `docs/composable-web-components-roster.md` — every component's web-component home + proposed API + the mapping rules + the store discussion.
- `docs/web-components.md` — public usage (the original 3 elements + the React/TS/theming sections we added; needs the full roster).
- `docs/handoff/2026-06-11-web-components-and-publishing.md` — original two-layer architecture + publishing pipeline background.
