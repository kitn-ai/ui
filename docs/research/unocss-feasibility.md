# UnoCSS feasibility for `@kitn.ai/ui` — research & verdict

**Date:** 2026-06-20
**Question:** Would migrating from Tailwind CSS (v4) + tailwind-merge to UnoCSS reduce footprint and/or improve robustness for this Shadow-DOM web-component library, and at what cost?
**Method:** Current UnoCSS docs (Context7), web search, and **real measurements** — every byte figure below was produced by building actual tooling against the kit's real class set in `/tmp` (not estimated).

---

## TL;DR verdict: **No — not worth it. Conditional at best.**

UnoCSS is a fine engine, but for *this* library the migration is mostly downside:

- **CSS size win is small and partly illusory** (~2–3 KB gzip on the utility layer in a fair test, and it shrinks further once you account for the parts UnoCSS doesn't port for free, like the typography plugin).
- **It does NOT remove `tailwind-merge`.** Conflict resolution is an *authoring* concern that neither engine solves at the CSS level. Empirically, UnoCSS makes it **worse**: it sorts rules alphabetically, ignoring class-attribute order, so a runtime merge step is *more* necessary, not less. There is no first-party `uno-merge`.
- **Namespacing is real but redundant.** The prefix option works, but Shadow DOM already gives the kit total class isolation. The one light-DOM surface (`theme.css` tokens) is already hand-namespaced (`--kai-*` / `--color-*`) and a utility prefix wouldn't touch it.
- **Integration has a genuine architectural mismatch.** UnoCSS's `shadow-dom` mode is *per-component placeholder injection*, the opposite of the kit's single-shared-Constructable-Stylesheet model. You'd have to bypass shadow-dom mode and run UnoCSS in plain extract-to-file mode — workable, but you lose the headline shadow-dom feature and inherit UnoCSS's preflight/reset quirks.
- **Migration cost is high**: 159 `cn()` sites + 3 cva files + the `@theme` tokens + the typography plugin + the whole CSS build, for a payoff measured in single-digit KB gzip and zero robustness gain. The custom `extendTailwindMerge` bug that motivated this stays exactly as relevant under UnoCSS.

**One thing that IS worth doing regardless:** the kit pins `tailwind-merge@^2.5.0` while running **Tailwind v4**. tailwind-merge v2.x targets Tailwind **v3** class groups; v4 support is in **v3.x**. That's a latent correctness risk (mis-bucketed v4 utilities) and is the actual robustness issue here — fixable in an afternoon without touching UnoCSS.

---

## The current setup (ground truth)

- **Tailwind v4** (`tailwindcss ^4.2.2`, `@tailwindcss/cli ^4.3.0`) — CSS-first config via `@theme` in `theme.css`, no `tailwind.config.js`.
- Build: `tailwindcss -i src/elements/styles.css -o src/elements/compiled.css --minify` → imported as `compiled.css?inline` (`src/elements/css.ts`) → `ELEMENT_CSS` string.
- `src/elements/define.tsx` builds **one** `CSSStyleSheet` via `replaceSync(ELEMENT_CSS)` and adopts it into every shadow root (`adoptedStyleSheets`), with a `<style>` fallback. One sheet, shared across all ~50 elements / all instances.
- **Real compiled size today:** `compiled.css` = **108 KB raw / 17.3 KB gzip** (the "~77 KB" in code comments is stale). That includes preflight, the full `@theme` token block, `@tailwindcss/typography` prose, the `kai-*` component CSS, keyframes, color vars — not just utilities.
- `cn()` = `extendTailwindMerge(...)(clsx(...))`, **159 call sites across 55 files** (`src/utils/cn.ts`). The `extend` exists because tailwind-merge mis-bucketed the kit's custom `text-caption/meta/body/title` font-size utilities as colors and dropped real color classes.
- **cva** in 3 files: `src/ui/button.tsx`, `src/ui/badge.tsx`, `src/components/empty.tsx`.
- `@tailwindcss/typography` is used (`@plugin "@tailwindcss/typography"` in `styles.css`).

---

## Q1 — CSS size: real or marginal? **Marginal.**

Fair, like-for-like measurement. Same **real kit class set** (1,391 class strings scraped from `src/**/*.tsx`) fed through both engines:

| variant | raw | gzip |
|---|---:|---:|
| **UnoCSS** `preset-wind3` (utilities only) | 23.1 KB | **4.9 KB** |
| **Tailwind v4** utilities-only (no preflight) | 41.2 KB | **7.3 KB** |
| Tailwind v4 full (preflight + theme vars + utilities) | 44.9 KB | 8.2 KB |

So on the utility layer alone, UnoCSS is ~**2.4 KB gzip smaller**. Why the gap, and why it's smaller than it looks:

1. **Tailwind v4 inlines more theme/`--tw-*` scaffolding.** Both engines emit a per-element custom-property reset (`--tw-*` vs `--un-*`) of similar size; the rest of TW v4's bulk is theme variable plumbing and a slightly more verbose utility expansion. This is a v4 characteristic, not a fundamental Tailwind-vs-UnoCSS law.
2. **The utility layer is a *fraction* of the shipped 17.3 KB-gzip stylesheet.** Most of `compiled.css` is stuff UnoCSS does **not** generate for free: the hand-written `kai-*` component CSS in `styles.css`, the keyframes/animation utilities in `theme.css`, the `.chat-markdown` styles, and the **typography/prose** rules (`@tailwindcss/typography`). UnoCSS's `preset-typography` is a *different* implementation, not a port — you either keep hand-written prose (no change in size) or re-tune it.
3. Net realistic shipped saving: **low single-digit KB gzip** (call it ~2–3 KB), against a 17.3 KB-gzip total and a much larger JS bundle. It's real but immaterial — well under the size of the `tailwind-merge` dependency it does *not* remove (~6.7 KB gzip, see Q2).

**Verdict Q1: the size win is real but marginal and partly a Tailwind-v4 artifact.** Not a reason to migrate on its own.

---

## Q2 — Does UnoCSS remove the need for `tailwind-merge`? **No. It makes the case for a merge step stronger.**

The need being solved is **authoring-time conflict resolution**: a component has a base class string, a consumer/variant adds an overriding one in the *same* `class` attribute, and you want "last wins" (`p-2 p-4` → `p-4`). This is decided by the **CSS cascade**, and the cascade goes by *source order in the stylesheet*, not order in the `class` attribute. **Neither Tailwind nor UnoCSS resolves this at build time** — both emit *both* rules.

Empirically confirmed (`class="p-2 p-4 text-red-500 text-blue-500"`):

- **UnoCSS** emits **both** `.p-2{padding:.5rem}` *and* `.p-4{padding:1rem}`, **both** `.text-red-500` *and* `.text-blue-500`.
- **Tailwind v4** likewise emits both (collapsing only exact duplicates).

So you still need to *not put two conflicting utilities in one resolved class string* — which is exactly what `twMerge(clsx(...))` does at runtime: pick the last of each conflicting group *before* the string hits the DOM.

It gets worse under UnoCSS. UnoCSS **sorts generated rules alphabetically / by rule-definition order**, deliberately ignoring class-attribute order (confirmed in docs *and* by test: `text-blue-500 text-red-500` and the reverse both produce `.text-blue-500` then `.text-red-500` in the file — blue, alphabetical, always). That means even if you *tried* to rely on "later class wins via cascade," you can't: UnoCSS's output order is alphabetical, so `text-red-500` (later in the attr) loses to `text-blue-500` because `b < r`. **A runtime merge step is therefore *more* essential under UnoCSS, not less.**

And there is **no first-party `uno-merge`.** Options are: keep `tailwind-merge` configured for UnoCSS's class shapes (community-confirmed it works but you must hand-declare every conflict group — *more* config than today), or the unmaintained community `unocss-merge`, or `cva`/UnoCSS `shortcuts` to *avoid* conflicts by construction (a refactor of authoring style, not a free swap).

The original bug that motivated `extendTailwindMerge` — custom `text-body`/`text-caption` font-size utilities mis-bucketed as colors — is a **merge-config** problem. It exists identically under any merge tool you point at UnoCSS classes. UnoCSS does not make it go away.

**Verdict Q2: UnoCSS does NOT remove `tailwind-merge`. The runtime merge concern is unchanged or harder, and you keep ~6.7 KB gzip of merge logic either way.**

---

## Q3 — Scoping / namespacing: works, but **redundant** here.

- UnoCSS's `prefix` option is real and clean. Confirmed by test: `presetWind3({ prefix: 'kai-' })` generates `.kai-flex`, `.kai-p-4`, etc., and **ignores** bare `flex`/`p-4` entirely. So you *could* make every kit utility `kai-`-prefixed and globally unique.
- **But the premise is already satisfied by Shadow DOM.** Every kit component renders into a shadow root; its classes cannot collide with the consumer's Tailwind and vice-versa — that's the whole point of the adopted-stylesheet model. A utility prefix adds nothing inside the shadow boundary. (Tailwind v4 *also* supports a `prefix:` if you ever wanted one — this isn't a UnoCSS-only capability.)
- **The only light-DOM surface is the token layer** (`theme.css` / `theme.tokens.css`) that consumers import into *their* global scope so `--kai-*` overrides pierce the shadow roots. Those are **CSS custom properties, not utility classes** — a utility prefix doesn't touch them, and they're **already hand-namespaced** (`--kai-*` public, bare `--color-*`/`--text-*` internal, per the comments in `theme.css`). There is no collision problem here for a utility prefix to solve.

**Verdict Q3: the namespacing the user imagines is real in UnoCSS but redundant given Shadow DOM, and the one place namespacing matters (the token layer) is already handled and isn't class-based.**

---

## Q4 — Integration with Solid + Vite + the Constructable-Stylesheet model: **friction.**

- **`@theme` / custom font-size tokens:** portable. UnoCSS supports a `theme` config (`fontSize: { caption: [...], body: [...] }`) — verified, it generates `text-body` etc. correctly. But note: UnoCSS `presetWind3` uses a v3-style theme shape; `presetWind4` renames things (`fontSize` moves under `text`, `borderRadius`→`radius`, etc.). The kit is on Tailwind **v4** CSS-first `@theme` syntax — that `@theme {}` block in `theme.css` is **Tailwind syntax and would be rewritten** into a JS/TS `uno.config.ts` theme object. Not hard, but it's a real conversion of ~30 tokens + the v4 `@custom-variant`, `@plugin`, `@source` directives.

- **The shadow-DOM integration is the real snag.** UnoCSS's headline `shadow-dom` mode is **per-component placeholder injection**: you put `@unocss-placeholder` in *each* component's style block and the plugin inlines that component's CSS there. That is the **opposite** of the kit's architecture — one shared `CSSStyleSheet` adopted by all roots. To keep the single-shared-sheet model you'd run UnoCSS in **plain extract-to-file mode** (scan `src`, emit one `uno.css`), then keep the existing `?inline` → `replaceSync` plumbing. That works — but then you're *not* using shadow-dom mode, you're using UnoCSS as a generic JIT generator, and you inherit its preflight/reset (`--un-*` custom properties, ring/shadow vars) which must be vetted to render identically inside a shadow root. Doable; not free.

- **`vite-plugin-solid` + `@unocss/vite`:** generally coexist (both are well-behaved Vite plugins; UnoCSS is framework-agnostic and scans source text). No *known* hard blocker, but it's an untested combination for *this* lib's lib-mode build, and UnoCSS's extraction relies on classes appearing as scannable string literals — Solid's `cn(...)`/cva dynamic composition is fine (it scans the literals you pass), but any computed class names would need `safelist` entries, same caveat as Tailwind.

- **`@tailwindcss/typography`:** not portable as-is. `@unocss/preset-typography` is a separate implementation with different output. The kit already partly hand-rolls prose (`.chat-markdown`), but the `@plugin "@tailwindcss/typography"` in `styles.css` would need replacing/re-tuning and **re-verifying markdown rendering** across every component that shows prose.

**Verdict Q4: technically achievable by running UnoCSS in extract-to-file mode (not shadow-dom mode), but you give up the one shadow-DOM feature, must re-port the theme block + typography, and must visually re-verify preflight parity. Meaningful integration work for no architectural upgrade.**

---

## Q5 — Migration cost & risk: **high cost, low/negative payoff.**

What the migration actually entails:

1. **159 `cn()` call sites / 55 files** — the call *sites* mostly survive (they're `cn("flex", cond && "...")`), but `cn` itself changes (new merge config, or a different merge lib), and **every conflicting-class assumption must be re-audited** because UnoCSS reorders output alphabetically. This is the riskiest part: silent visual regressions where "the later class used to win." No type system catches these; only visual diffing does.
2. **3 cva files** — cva is engine-agnostic (it just builds class strings), so it *works* with UnoCSS, but its `twMerge` integration (if used) needs the same re-config. Low effort, must verify.
3. **`@theme` tokens** — rewrite ~30 tokens + `@custom-variant dark`, the radius `calc()` chain, and the 4 semantic font sizes from Tailwind-v4 CSS syntax into `uno.config.ts`. Moderate, mechanical.
4. **Keyframes / animation utilities** — currently in `@theme`/`@layer`; re-home into UnoCSS `rules`/`shortcuts` or a raw CSS preflight. Moderate.
5. **Typography / prose** — replace `@tailwindcss/typography`, re-verify all markdown surfaces. Moderate–high, easy to get subtly wrong.
6. **Build pipeline** — swap `tailwindcss` CLI for `@unocss/cli` (or `@unocss/vite`), keep `?inline` → Constructable Stylesheet. Then **re-vet preflight/reset parity inside Shadow DOM**. Moderate.
7. **Full visual regression pass** across ~50 components in light + dark (the kit's own guidance: IVP Playwright verification). This is where the real time goes.

**What breaks / risk register:**
- **Silent cascade regressions** from alphabetical output ordering (highest risk).
- **Preflight/reset differences** (`--un-*` vs `--tw-*`, ring/shadow defaults) rendering subtly differently in shadow roots.
- **Typography divergence** in markdown/code surfaces.
- **The motivating bug is NOT fixed** — custom font-size-as-color mis-bucketing is a merge-config issue that persists.
- You still ship **`tailwind-merge` (~6.7 KB gzip)** or an equivalent, so the dependency you hoped to drop stays.

**Effort estimate:** ~3–6 focused days including the full visual-regression pass, with non-trivial risk of shipping subtle visual breakage. Payoff: ~2–3 KB gzip CSS, no robustness gain, no dependency removed.

---

## What to actually do instead

1. **Fix the version mismatch (real robustness win, ~1 hr):** the kit runs Tailwind **v4** but pins `tailwind-merge@^2.5.0`, which is built for Tailwind **v3** class groups. tailwind-merge **v3.x** is the v4-compatible line. Upgrade to `tailwind-merge@^3`, re-validate the `extendTailwindMerge` font-size groups against v4's grouping, and you remove a genuine latent correctness risk — the one robustness issue in this whole investigation. (v3's config API differs slightly, so this is a small, careful change, not a blind bump.)
2. **Optionally trim the utility layer** within Tailwind v4 if size genuinely matters — but 2–3 KB gzip is not worth a rewrite.
3. **Drop UnoCSS** unless a *different* driver appears (e.g. wanting attributify mode, pure-CSS icons, or a 100x-faster dev rebuild loop — none of which are pain points the prompt describes).

---

## Appendix — measurements & sources

**Measured locally (in `/tmp`, against the kit's real classes):**
- `tailwind-merge` + `clsx` bundled/min/gzip: 20,561 B min / 7,034 B gzip; `clsx` alone 623 B / 375 B → **tailwind-merge marginal cost ≈ 19.9 KB min / ~6.7 KB gzip.**
- Kit `compiled.css` (real build, Tailwind v4): **108,430 B raw / 17,325 B gzip.**
- Same kit class set → UnoCSS `preset-wind3` utilities: 23,099 B / **4,908 B gzip**; Tailwind v4 utilities-only: 41,240 B / **7,285 B gzip**; Tailwind v4 full: 44,860 B / 8,221 B.
- Conflict test: both engines emit `.p-2` **and** `.p-4`, `.text-red-500` **and** `.text-blue-500`.
- Order test: UnoCSS outputs `.text-blue-500` before `.text-red-500` regardless of class-attribute order (alphabetical).
- Prefix test: `presetWind3({ prefix: 'kai-' })` generates only `kai-*` classes, ignores bare ones.

**Docs / web sources:**
- UnoCSS Vite integration & shadow-dom mode — <https://unocss.dev/integrations/vite>
- UnoCSS rule ordering (alphabetical / definition order) — <https://unocss.dev/config/rules>
- UnoCSS Wind3 / Wind4 presets & theme shape — <https://unocss.dev/presets/wind3>, <https://unocss.dev/presets/wind4>
- UnoCSS prefix / attributify prefix — <https://unocss.dev/presets/mini>, <https://unocss.dev/presets/attributify>
- "Why UnoCSS?" (speed/size positioning) — <https://unocss.dev/guide/why>
- tailwind-merge ⇄ UnoCSS compatibility discussion — <https://github.com/dcastil/tailwind-merge/discussions/233>
- Community uno-merge request / lib — <https://github.com/unocss/unocss/issues/2748>, <https://github.com/magicdawn/unocss-merge>
- tailwind-merge v4 support is in v3.x — <https://github.com/dcastil/tailwind-merge/discussions/468>
- UnoCSS vs Tailwind size/positioning — <https://www.pkgpulse.com/guides/tailwind-vs-unocss-2026>, <https://npm-compare.com/@unocss/core,tailwindcss,windicss>
