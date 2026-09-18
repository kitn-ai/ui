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
