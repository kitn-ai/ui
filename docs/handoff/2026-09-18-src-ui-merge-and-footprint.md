# Handoff — `src/ui` merge, per-module build, and the `cn` merger

**Date:** 2026-09-18 · **Branch:** `update/primitives` · **Status:** landed and verified; queue below is not started.

Read this before touching `cn`, the build targets, or anything token-related. Most of it is measurement that
cost real time to get and would be expensive to re-derive. Every number here was produced by a named harness;
where a live number exists, the artifact that prints it is named instead so nothing rots.

---

## 1. What landed

Eight logical changes, squashed into **three** commits so each one is self-consistent, green, and has no file
split across two. Confirm with `git log --oneline -3`.

1. `cdd9201a` `refactor(ui): merge src/ui into src/components` — the directory merge, the Storybook tier
   retitle (`Components/{Elements,Primitives}/*` → `Components/*`), and a **per-story usage-snippet rule**
   with 26 snippets authored across 18 files. One commit because the snippets share story files with the
   retitle, and the lint rule cannot land without its 26 fixes.
2. `e66c004d` `refactor(markdown): render the token stream, not an HTML string` — the `innerHTML` sink in
   `markdown.tsx` is gone; entity references are decoded again by a local decoder.
3. `b22ec5a0` `perf(footprint): per-module output, consumer-cost guards, and a local cn merger` — the build
   change, the packaging guards, and the `cn` merger in **one** commit, deliberately. The packed ceiling and
   all four eager ceilings were set from the sizes the `cn` merger produces, so splitting them a commit
   apart made the earlier commit fail its own guard. This was tried both ways; this is the grouping that is
   green. Lesson for the next round of commits here: **a threshold belongs in the commit that produces the
   number it encodes**, not the commit that introduces the guard that reads it.

### The wins (consumer-facing, measured)

| | before | after |
|---|---|---|
| `import { cn }` eager, browser | 125,975 B | **13,858 B** |
| `import { Button }` eager, browser | 126,253 B | **33,028 B** |
| `cn` eager under the `node` condition | 103,285 B | **13,892 B** |
| `Button` eager under `node` | 105,040 B | **23,395 B** |
| packed tarball | 2,726,011 B | **~2,604,954 B** |

Live numbers: `pnpm --filter @kitn.ai/ui run verify:consumer` prints all four eager figures with their
ceilings; `verify:pack` prints the tarball. `tailwind-merge` no longer ships at all — absent from
`dist/node_modules/`, from every `dist` specifier, and from the tarball.

**Harness for any bundle claim:** pack with `npm pack --ignore-scripts`, install into a scratch app, bundle
with the Vite version pinned in `scripts/verify-consumer-sideeffects.mjs`. Eager = **statically reachable
only**. See §3 for the three ways this measurement lies.

---

## 2. The queue (not started)

### 2.1 Token surface — the biggest user-visible gap

Measured: the kit exposes **56 distinct public `--kai-*` names** (the theme builder exposes 58), covering
**colour and type**. Geometry is not tokenized at all.

**The mechanism worth understanding before changing anything:** `:root { --kai-color-x: … }` reaches a
shadow root because `:host` re-declares it as `var(--kai-x, default)`. `:root { --spacing: … }` and
`:root { --text-xl: … }` do **not** — literal `:host` declarations beat inheritance. Only
`kai-chat{--spacing:…}` or `*{…}` works, which is not a token override. **Any new geometry token needs the
same `:host` re-declaration to be overridable.**

Gaps, with occurrence counts from an AST walk over `src/**` (665 distinct class tokens / 6,803 occurrences;
123 token-reachable, 221 Tailwind-global-only, 281 literal):

| family | occurrences | state |
|---|---:|---|
| all spacing | 983 | no `--kai-*` token |
| `rounded-full` | 93 of 343 radius | `--kai-radius: 0` provably leaves it at `3.40282e38px` |
| border width | 131 | no theme variable |
| ring width + offset | 52 | no theme variable |
| opacity | 80 (7 values) | none |
| shadow geometry, transition durations, font-weight | — | none |

Consequence: a consumer wanting denser spacing or square corners has **only** a class override available —
the class-override surface exists partly *because* of this hole.

Two defects also found, independent of the design question:

- **19 shipped files bypass the palette**: `dark:text-red-400` for dark error text (so
  `--kai-color-destructive` governs light only), `text-emerald-400/500` for success, and `tool.tsx`'s four
  raw status hues beside `--color-tool-*`.
- **4 part recipes in `slots.ts` return `var(--brand)`** — a token the kit never declares.

### 2.2 `verify:fresh` cannot pass

It asserts every scanned source is older than the built artifacts, by mtime only. But `kai.es.js` comes from
the **first** build link (the only target with `emptyOutDir: true`) and `postbuild` runs `build:api` +
`build:blocks` **after** it, so 11 generator outputs are *always* newer. Reproduced identically twice; none
of the 11 is `cn`-related; `git diff` is empty for the guard and its three generators. It is **not wired into
CI or any aggregate gate** — which is what you would expect of a guard that cannot pass. Fix: exclude those
generator outputs from the source side.

### 2.3 Small defects

- **An unpinned second `innerHTML` sink.** `code-block.tsx` renders model-produced code through
  `innerHTML={highlighted()}`. It is **safe** — `highlight()` escapes on all three fallback paths, and
  shiki escapes `<` as `&#x3C;` (verified in a real bundle) — but **nothing tests it**. One test: a fenced
  block containing `<img src=x onerror=…>` renders as visible text with no `img` element, plus one forcing
  the `plain()` path with an unknown language. Note for the test author: asserting `&lt;` would fail; the
  escaping form is `&#x3C;`.
- **A stale comment.** `tests/components/markdown-xss.test.tsx` still opens by calling the markdown
  renderer *"the kit's one raw-`innerHTML` write."* It is not one any more, and it never was — see above.
- **`docs/coupling-map.md` row 89** describes `verify:consumer` as packing/bundling/counting defines; it now
  also weighs.
- **A chunk-path collision, pre-existing.** The aggregate SSR twins overwrite the elements build's shiki
  chunks at identical `[name]-[hash]` paths with different bytes (15 of them) — winner decided by build
  order. Payloads are data modules, so no functional risk, but two targets writing the same chunk filenames
  deserves a look.
- **A stale threshold record.** `scripts/verify-pack-weight.mjs`'s dated history still says the server twins
  stay aggregate and that per-module twins "change no measured number". Both are now false.

---

## 3. Traps that cost time (do not re-derive)

**Environment**

1. A global `tsc` **5.8.3** shadows the repo's **5.9.3** and produces a **false red**
   (`Property 'traceId' does not exist on type 'KaiDiagnosticEvent'`). The package-local
   `packages/ui/node_modules/.bin/tsc` is a **dangling symlink** in this layout — use the workspace root's
   `../../node_modules/.bin/tsc`.
2. `nx` is not on the bare PATH (exit 127, not a build failure). Use `pnpm exec nx`.
3. `npm pack` fires `prepublishOnly: npm run build`. Measuring without `--ignore-scripts` rebuilds the thing
   you are measuring.
4. `npm run typecheck` is a **7-command `&&` chain**; its exit 0 proves only the last command ran. Re-run the
   six tsc passes individually.
5. `verify:consumer` and `verify:pack` need **network** (npm install into a scratch app) and a built `dist/`.
6. Load matters: a test timed out at **5,263 ms against a 5,000 ms** budget at load average ~14. Before
   recording any timing, confirm the box is quiet.

**Measurement — three ways a bundle number lies**

7. **Never `esbuild --outfile`** for anything with dynamic imports. It inlines them, so the kit's 757 KB of
   lazy shiki grammars counted as eager and produced a false "882 KB for one Button". Use
   `--splitting --outdir` and take the **entry chunk**.
8. **Never sum all output chunks** — that is worst-case total, not first load. Label eager vs lazy.
9. **One probe per build invocation.** A combined build hoists shared deps into a chunk and made every small
   probe read 56 B.
10. Line-greps for import patterns are **quote-sensitive** — this missed a double-quoted import twice. Always
    use a quote class (`from ['\"][^'\"]*…`).

---

## 4. Verified facts worth not re-litigating

**Stay on Tailwind.** UnoCSS, Panda CSS and StyleX were each evaluated against this library's actual shape.
- UnoCSS: ~2.4 KB gzip smaller on the utility layer, and it does **not** remove the merge step — it sorts
  output alphabetically, ignoring class order, so "last class wins" becomes *unavailable*.
- Panda: class names are `.p_2`-style, **not** Tailwind syntax, so a consumer's `class="p-2 p-4"` is inert;
  extraction is call-site only.
- StyleX: its own docs prohibit `className` alongside `stylex.props()`; measured, it beats consumer Tailwind
  in `@layer utilities` in both stylesheet orders, and the React transform emits a duplicate `className` key.
- All three: re-authoring 735 selectors plus `tw-animate-css` (~50 utilities) and the typography plugin
  (45.8 KB), neither of which any of them has an equivalent for, and a compiler in every consumer's build.

**The conflict table is genuinely needed, and it cannot be a symmetric group map.** The conflict graph is
**asymmetric**: `h-2 size-4` → `size-4` but `size-4 h-2` → both; `p-2 pt-3` → both but `pt-3 p-2` → `p-2`.
213 last-wins keys over 178 interaction components, because 17 keys carry asymmetric remove edges.

**The case only a name-level table can do:** in the compiled sheet `.text-body` sits at byte offset 70899 and
`.text-sm` at 71502, so CSS alone *always* yields `text-sm`, while `cn('text-sm','text-body')` must yield
`text-body`, because the kit aliases its own tokens onto Tailwind's scale.

**`cn-merge`'s boundary:** identical to `tailwind-merge` on everything the kit emits (0 divergences over
284,089 pairs). Remaining divergence is 627 of 316,675 random full-Tailwind pairs, **all in families the
table does not model** (`mask`, `perspective-origin`, `float`, `break-*`, `hyphens`, `font-stretch`,
`min-inline`, `max-block`), and all **under-merges** — both classes land, the cascade decides, nothing the
caller wanted is dropped. That is the documented pass-through boundary.

**`isSafeUrl("")` returns `true`** — an empty string resolves against the base and inherits `http:`. Not
exploitable today (the markdown renderer hands it the raw href), but it is a coupling: **any parser that
pre-blanks a dangerous URL to `""` bypasses the guard entirely**, because the guard never sees the original.
This is also why the entity decoder must never touch `href`/`src` before the policy sees them
(`javascript&#58;` is harmless precisely because nothing decodes it).

---

## 5. Working with subagents in this repo

- **`.pi/settings.json` pins `subagents.defaultModel` to a retired model** (`openrouter/stealth/union-alpha`,
  which 404s). Only `deepseek/deepseek-v4-flash` is both allowed and alive — **pass `model` explicitly** on
  every dispatch.
- **Always pass `context: fresh`.** A forked child inherits the parent's transcript; twice a child read its
  tail and did the wrong job entirely (once adopting the orchestrator's voice, once summarising a sibling's
  report instead of doing its own task). One child per call for the same reason.
- **~30-minute lane budget.** Put the substance before the gate sweep and have the lane write findings
  incrementally — one lane timed out having done the work but writing no report.
- **A green guard is not evidence the thing is right.** The `cn` drift guard was green while the merger was
  wrong for 467 inputs, because its corpus was drawn from the wrong place. Independent verification and
  mutation proofs are what find that; ask for them explicitly.
- Lanes have repeatedly caught their own measurement errors (a dangling `else`, `$?` captured after a grep,
  BRE where ERE was needed, `--outfile` inlining). Their corrections are trustworthy; their first numbers
  are not.

---

## 6. Corrections and closures (2026-09-18, later the same day)

The queue above is worked. Three of its claims were WRONG, and the corrections matter more than the
fixes, because each would otherwise cost the next reader the same time.

### §2.3's first bullet is wrong: the `innerHTML` sink was already pinned

`tests/elements/code-block.test.tsx` has a `hostile code renders VISIBLE and INERT, in BOTH paints`
group, with a `HOSTILE` source and a live-census CONTROL — and it **predates this handoff**
(`e0bb1e08`, 2026-08-19). Nothing was missing there. Do not write that test again.

What WAS missing, and is now added:

- `tests/elements/code-block.test.tsx` — the **third** supplier of that `innerHTML`: the unknown
  language, where the escaping is the kit's own `escapeHtml` via `plain()`. The existing cases cover
  shiki (a known grammar) and `codeHighlight: false` (the JSX `<Show>` fallback), which are different
  code paths from `plain()`.
- `tests/components/markdown-xss.test.tsx` — a fenced block, through the **message** path, in both
  fence shapes: a top-level fence (split out and rendered by the Solid `CodeBlock`, so it reaches the
  `innerHTML` sink) and a nested one (stays in the token renderer as a text node). Neither suite had a
  fenced vector at all.
- Both new groups are mutation-proved: making `plain()` stop escaping fails exactly the two
  unknown-language cases and nothing else.

**§2.3's note about the escaping form is also wrong.** It says to assert `&#x3C;` and that `&lt;`
would fail. Measured: shiki in this pipeline emits `&lt;`/`&gt;`, exactly like `plain()`. The form
does not identify which supplier ran — `pre.shiki` and the `<span>` census do. The committed test says
so at the assertion.

### §2.3's chunk-path collision is REFUTED

Measured by rebuilding both targets for real (`register` and `split`) and comparing byte-for-byte:

- At all **11** shared `[name]-[hash]` paths the two builds' bytes are **identical** (`cmp -s` →
  SAME), and so are the shipped bytes. Rollup's hash is content-derived, so identical names mean
  identical content; the minifier is the same plugin in both builds.
- The **actor was wrong too**: the SSR twins are `perModule` and emit **zero** `chunkFileNames` chunks.
  The build sharing those paths with the elements `split` build is the **register** build, and it runs
  **first**; `build:elements` is the last writer. So there is no overwrite and nothing to win.
- "15 files" counted the 11 shared chunks plus `core-*` ×2 and `engine-javascript-*` ×2, which are
  *different* hashes from each build — the family `dedupe:shiki` shims on purpose.
- The real, smaller defect found instead: several near-duplicate families this hash-dedupe **cannot**
  reach now ship as two files each (`variant-*`, `create-tween-*`, `link-preview-*`, `message-*`),
  and `dedupe:shiki`'s two `FAMILIES` do not cover them. That is a pack-size issue, not a correctness
  one, and `verify-pack-weight.mjs`'s ceiling is the backstop that would see it.
- No fix applied. Giving the split build its own chunk namespace would BREAK the dedupe the design was
  built on (~600 KB of shiki payloads shipping twice), and a single multi-entry build was already
  rejected for reintroducing prop-before-upgrade races.

### §2.2 is fixed, and the two trees it was blind to are why it could not pass

`GENERATED_SOURCES` in `verify-artifact-fresh.mjs` listed only `src/` outputs, while `SOURCE_DIRS` has
scanned `mcp/` since the 2026-09-02 move. The 11 files were: 7 construct template fixtures + the
construct schema (`build:api`) and 3 block-driver pages (`build:blocks`). Two of those outputs are SETS
with derived membership, so the list now supports a `/`-terminated **subtree** entry rather than a
hand-listed copy — one fixture per template, one page per block. Removing either prefix entry
reproduces exactly those 11 files, which is the mutation proof.

No coverage is dropped by excluding them: `verify:generated` owns the `src/` and `mcp/` artifacts, and
`verify:blocks`' `[fresh]` step spawns `gen-blocks --check`, which diffs every entry of the same
`outputs` map the driver pages are written from. Both run in CI.

### §4's headline table and §2.3(e) are updated

- `verify-pack-weight.mjs`'s dated history now says plainly that the **A-vs-B record is superseded**:
  the twins are per-module, so A is what ships and the "2.1 MB that changes no measured number" is in
  the tree. The asserted quantity is PACKED and it went DOWN, so the 2.56 MiB ceiling is deliberately
  not re-tuned. Measured warning: the handoff's "~2,604,954 B" is a different moment's reading; the
  guard prints its own number.
- `docs/coupling-map.md` rows 89 and 38/139 updated for the sizing the consumer guard now does and for
  the three trees `GENERATED_SOURCES` spans.

### The tree-shaking question, answered

`verify:consumer` is the ONLY guard with eager ceilings, and it covers exactly two imports off the `.`
entry (`cn`, `Button`) in both conditions. There is **no** size proof for `@kitn.ai/ui/react`,
`@kitn.ai/ui/solid`, `@kitn.ai/ui/state`, `@kitn.ai/ui/wire`, or any per-module subpath; the
`elements` register-all/per-element bytes are computed and printed but never bounded;
`verify:shader-lazy` and `verify:react-wrappers` run only inside the cache-skippable `build`. The
React and Solid probes are the cheapest next win — the mechanism (`EAGER_PROBES`) already exists.

---

## 7. §2.1 phase 1 landed: `--kai-density`, and the mechanism it proves

**What shipped.** `theme.css` declares `--spacing: var(--kai-density, 0.25rem)`; the editor catalog
and the theme studio carry the knob; the docs tables were updated in the same change. The token was
briefly called `--kai-spacing` and renamed to `--kai-density` before anything shipped — see the last
paragraph of this section for why that name was wrong.

**The mechanism, now proven rather than asserted.** Tailwind emits its `@theme` block as
`:root,:host{...}`, so the compiled sheet declares `--spacing` ON THE HOST ELEMENT. A declaration on
the element beats an inherited value, which is why `:root { --spacing: 1rem }` — the variable a
consumer naturally reaches for — moved nothing and said nothing. What makes a token overridable is
the sheet READING it (`--spacing: var(--kai-density, …)`), which is the shape `--radius` has always
had. Both halves are pinned in a real Chromium now, including the negative one
(`tests/e2e/geometry-token.spec.ts`, project `geometry-token`, `npm run test:geometry-token`).

**`--kai-density` moves more than whitespace, which is why it is not called `--kai-spacing`.** Every
numeric spacing utility is `calc(var(--spacing) * N)`, so the single token drives padding and margins
and gaps (the design sense of "spacing") AND control heights (`h-9`), icon sizes (`size-4`) and the
offset/motion utilities (`top-2`, `-mt-1`, `translate-x-0.5`). In shipping source the split is
roughly 733 whitespace / 203 size / 59 offset occurrences. Mature density scales move these together
on purpose, so the knob is right; `--kai-spacing` was the wrong NAME, because in design vocabulary
spacing is empty area around and between elements and nothing else — a consumer setting it for
breathing room would have been surprised by smaller icons. Renamed 2026-09-19, while the only
consumers were this branch's own tests. Do not silently split space-only tokens from size ones
either: that is ~203 re-authored call sites.

**Guards added** (each mutation-proved, i.e. shown to fail when the thing it guards is removed):
`tests/styles/geometry-tokens.test.ts` (source declaration, the `:host` selector in the COMPILED
sheet, and the light-DOM import) · `tests/e2e/geometry-token.spec.ts` (real cascade, positive +
negative) · `apps/theme-studio/ThemeStudio.embed.test.tsx` (the studio wiring, derived from
`EXTRA_TOKENS` so the next catalogued-but-unwired knob is red).

**The lesson worth carrying into the remaining phases.** The coverage test
(`tests/styles/theme-studio-coverage.test.ts`) asserts that every token `theme.css` declares has a
knob in `studioTokens()` — but `studioTokens()` is a LIST, and the studio UI keeps its own separate
list of extras. So it was green about `--kai-spacing` while `buildCss` emitted no line for it. A
guard that reads a registry is not a guard that the registry is wired; the new studio test reads the
same registry and then asserts the OUTPUT, which is the difference.

**What §2.1 still has open** (unchanged from the table above, in the order I would take them):
`rounded-full` (Tailwind hardcodes `3.40282e38px`; `--kai-radius` provably cannot reach it — needs a
decision on re-authoring those sites, then border width, ring width/offset, opacity, shadow geometry,
durations and font-weight, each following the `--radius` shape); the two palette defects (14
component files bypassing `--kai-*`, with `dark:text-red-400` and a success green, and the TESTS pin
those class names, so tokenizing ripples into them); and the 3 `var(--brand)` recipes in
`src/elements/slots.ts`, a token the kit never declares.

**Also found while doing this, not acted on:** `docs/coupling-map.md` row 132 says the `kai` MCP
`theme` tool "hardcodes token names in `cssBlock()` and never reads `theme.css`". It does read it —
`packages/ui/mcp/mcp/tools/theme.ts` derives `DECLARED_TOKENS` via `declaredKaiTokens(themeCss)` and
resolves its curated `BRAND_TOKENS` against that, erroring loudly on a name the file no longer
declares. The row's verdict is stale, not the code.

---

## 8. §2.1 phase 2 landed: the shape system, and why the radius slider looked half-wired

**The owner's observation, explained.** The radius slider visibly moved the cards tab and
"not as much" on chat and components. Three separate causes, each measured:

1. `--radius-2xl` / `-3xl` were NEVER re-pointed, so `rounded-2xl` — the class the message
   bubble uses — kept Tailwind's stock `1rem` and ignored `--kai-radius` entirely.
2. Every tab's outer wrapper is `rounded-xl`, which DOES follow. So the knob appeared to
   work while the contents ignored it; the defect read as "not as much" rather than broken,
   which is exactly the shape of defect that survives review.
3. `rounded-full` compiles to the literal `3.40282e38px` — unreachable by any custom
   property — so the pill family (badges, chips, tags, switch tracks, count bubbles) could
   not follow a shape choice at all.

**What shipped.** The ladder is complete (`2xl: +8px`, `3xl: +12px`), the pill family reads
a kit rung `--radius-pill` (declared in the `--radius-*` namespace, so Tailwind generates
`rounded-pill` itself) with **22 sites** re-authored and **44 circles deliberately left
alone**, and code blocks read `--code-radius` — a token that existed but which theme.css
never named, so no consumer-facing surface could set it. The theme studio's Shape panel now
has Radius / Density / Pill / Code, and the Components tab has a geometry example: a shape
ladder, a density ladder, and the circle drawn beside them as the boundary.

**Two traps worth carrying forward.**

- **A new class name enters `cn`'s conflict graph, and then its ORACLE.** `rounded-pill` made
  four drift tests fail. The merger was RIGHT (both `rounded-lg` and `rounded-pill` key into
  `radius`); `tailwind-merge` was behind, because it does not know the kit's rung and reported
  no conflict. The fix is to teach the oracle — the same move the font-size aliases already
  needed — and the failure reads as a merger bug until you check which side is stale.
- **Pill defaults are a clamp, not a value.** Border-radius clamps to half the box, so a rem
  default means "fully round up to N tall" and NOT "always round". 2rem would have left a
  caller-heighted skeleton bar and the amplitude-driven audio bars with round-but-not-full
  caps; the default is 4rem (fully round to 8rem / 128px tall) for that reason.

**The remaining geometry families, measured, split by what Tailwind actually routes.**

| family | call sites | routed through a theme variable? | cost to tokenize |
|---|---:|---|---|
| spacing | ~986 | yes (`--spacing`) | DONE |
| radius ladder | — | yes (`--radius-*`) | DONE (ladder + pill) |
| font weight | 132 | **yes** (`--font-weight-*`) | cheap: 4 rungs, one line each |
| shadow geometry | 100 | **yes** — proven by experiment: declaring `--shadow-md: var(--kai-shadow-md, …)` in `@theme` rewrites `.shadow-md` to read it | cheap: rungs, one line each |
| ease | few | yes (`--ease-*`) | cheap |
| border width | 102 | **no** — `.border{border-width:1px}` is a literal | expensive: per-site |
| ring width/offset | 45 | **no** — `calc(1px + …)` literal | expensive: per-site |
| opacity | 25 | **no** — `.opacity-50{opacity:.5}` | expensive: per-site |
| transition duration | 7 | partly (`--default-transition-duration` only covers implicit transitions) | cheap-ish: 7 sites |

**Recommendation for phase 3, in order:** shadow rungs and font-weight rungs (both cheap,
232 call sites between them, and both visible in the studio's existing Shadow and Typography
panels); then decide explicitly about the expensive three and RECORD the decision either way
— border width, ring width and opacity are Tailwind *literals*, so "tokenizing" them is a
per-call-site edit (172 sites) and not a one-line rung, and a knob most consumers never turn
may not be worth it. Do not start them without saying that out loud.

**Noted, not done:** `mcp/mcp/tools/scaffold.ts` emits `class="rounded-full"` on a pill
button in generated consumer code. Now inconsistent with the kit's own pills; changing
emitted code needs the scaffold's CSS story (does the consumer's Tailwind see `rounded-pill`?
only if they import theme.css, which the scaffolds do) checked first.

**How to see any of this:** `pnpm dev` from the repo root → the docs site at
`http://localhost:4321/theme/editor` (that page renders the kit's studio through
`apps/docs/src/components/ThemeStudio.tsx`), or serve the built standalone page
`packages/ui/dist/theme-studio/index.html` from `kai dev`.
