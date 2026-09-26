# Blocks to the product bar — design (2026-09-25)

> **Approved sections:** 1 (exemplar + acceptance line, manual review), 2 (wiring
> DX), and 3 (the local loop) were presented and approved in session. Sections
> 4-6 are the sequencing proposal and are open for the owner to cut down.

## 1. Purpose, and the binding intent

The owner's words, which this round treats as the goal:

> Blocks are **composed patterns of the kit's components** — legos. A reader
> browses a gallery, sees real examples at product fidelity, picks one or more,
> and `npx` installs them. They then compose, modify, extend, rename, or wrap
> them in their own framework (web components, React wrappers, or Solid) as
> their own component. Some adopters want the whole kit's look and feel across an
> app; some just want chat. Both are first-class.

The composed test, therefore: **a block is a composition, not a component and not
a sealed app.** If it contains private chrome, it is not a block (the 2026-08-31
spec's definitional property 1).

Owner rulings from this session:

| # | Ruling |
|---|---|
| Q5 | **Labs stay as they are** — POCs and tests, a quick way to see how something exists. Retirement is a later decision. |
| Q6 | **Mock + optional route + none.** WYSIWYG, with wiring provided; the DX spelling is ours to choose. |
| Q7 | **When the block work exposes a bug: fix the kit if the kit is wrong, keep the block correct, leave the labs alone.** A kit defect becomes a kit fix with a test. |
| — | `Labs/Apps` get built out too; **all** of `Labs/Proofs` is in scope. |
| — | The `/blocks` page redesign is **parked** — wanted, but later. |
| — | The production composer "can be improved" is a **separate kit item**, not this round. |

## 2. What is actually wrong (measured, not assumed)

Three findings, each verifiable today:

**2.1 The blocks are stale snapshots of labs that kept moving.** Two independent
instances, both found by the owner looking at the page:

- `assistant` lays itself out as a hand-rolled grid (`grid-template-columns: 280px 1fr` in
  `blocks/assistant/assistant.css:16`), with `display: none` at the narrow
  breakpoint and no resize handle. It was authored **2026-09-03**; the kit's
  `kai-workspace` — which ships `start`/`main`/`end` slots, resize handles between
  the columns, `startCollapsed` and `collapseBelow` — matured **after** that. The
  rail's own collapse control therefore collapses the element while the page grid
  keeps the 280px column: the owner's "it hides the conversation, the button looks
  weird, and the main chat area doesn't respond at all".
- `in-app-assistant` still prints `<h1>Acme Deploys</h1>` on the simulated host.
  The lab made that correction already, and recorded it
  (`stories/showcase/builder-in-app-assistant.stories.tsx:208-223`): the host side
  must be "the **presence** of an application, not an imitation of one", so its
  labels became skeletons (`SkeletonBar`, `StubStatTile`, `StubNavRow`,
  `StubTableRow`).

So this is not two sloppy blocks; it is a **missing pull-forward step**. Labs move,
blocks do not, and no gate relates them.

**2.2 The local loop exists and is set to the wrong thing by default.**
`apps/docs`'s `predev`/`prebuild` run `copy-blocks.mjs`, which copies `dist/blocks/`
written by `gen-blocks.mjs` (a `nx build ui` postbuild phase). The preview switch
is `KAI_BLOCKS_KIT`: unset = production = the **published jsDelivr pin**;
`local` = the working tree. **Nothing sets it for `dev`** — only a CI comment
mentions it. A developer running `pnpm dev` sees the released 0.37.0 block, not
their edits. That is why "I'm not even sure how to run them" is exactly right.

**2.3 Wiring has no CLI surface.** `create-kai add` exposes `--form` only, and the
three blocks declare no `route:<integration>` dependency. The model supports it
(`create-kai/src/blocks.ts`: `registryDependencies` recurse; `route:<integration>`
resolves against the scaffolder catalog and emits the backend route); nothing
exposes it.

**2.4 B2 is parked, rebased, and still unverified.** `feat/blocks-b2-renderers`
(worktree `.claude/worktrees/blocks-b2`) holds the four remaining delivery forms —
vue, svelte, angular, solid — plus 6 tests, the contract changes and 3 kit fixes:
15 commits from 2026-09-03. It was **merged with main on 2026-09-25** (`f5584069`,
`5901bc5f` as the main side; a merge rather than a rebase, because a rebase would
replay 15 commits across 199 main-side commits and re-conflict the same 19 renamed
files each time) and **pushed** so the work is not trapped in a worktree.

What that merge did and did not establish:

- Resolved 18 conflicts. The `src/elements/*` hunks were re-homed to
  `src/web-components/*` (the layer rename); the solid block of
  `web-component-types.d.ts` was regenerated from its own `HTMLElementTagNameMap`
  (96 → 100 tags, main having added four); two hunks were dropped as genuinely
  gone (`verify-pack-weight.mjs`'s unpacked-bytes ceiling, replaced on main by a
  packed-tarball ceiling; three `perplexity-pro` casts main had re-added).
- **Green:** `@kitn.ai/blocks` 218 tests, its typecheck, the re-homed solid
  augmentation and react JSX guards, `lint-layer-names` and six other lints.
- **NOT established, and this is the whole remaining cost:** 7 `create-kai` tests
  fail against **stale dist artifacts** (built 2026-09-03, still emitting
  `@kitn.ai/ui/elements` and `^0.32.0`), so they need `nx build ui` +
  `pnpm --filter create-kai run build` to confirm; `pnpm-lock.yaml` was resolved by
  hand and **no `pnpm install` was run**, so the four new toolchains
  (`vue`, `vue-tsc`, `svelte`, `svelte-check`, `@angular/*`) may not be resolvable;
  and **`verify:scaffold`'s four compile cells were never executed** — the
  highest-value unrun gate, since that is what proves the renderers compile in
  their own toolchains.

So B2 is a **verified-nothing-but-blocks-tests** branch with a paid-off rebase, not
an unreviewed one. It lands in wave 3, after wave 1 has settled the composition it
renders; its verification job is `pnpm install` → `nx build ui` →
`pnpm --filter create-kai run build` → `pnpm --filter @kitn.ai/ui run verify:scaffold`.

## 3. The bar: what "complete" means for a block

The owner's framing: "these examples should feel like full-on examples that a user
could start with… but not all of them have to look like ChatGPT." So the bar is
**nothing broken, nothing misleading, and every state we show is one we would
stand behind** — not feature parity with a commercial product.

**The exemplar is `assistant` (full page)**, and its acceptance line is:

1. Layout is the shell, not a hand-rolled grid: rail and main with a working
   resize between them, and collapse that **reflows main** rather than leaving a
   dead 280px column. The control that exists operates the shell.
2. Below the breakpoint the rail becomes a drawer, not `display: none`.
3. Sending from the composer streams a reply from the mock; the scripted tool call
   settles; the model switcher changes the selection.
4. No copy that reads as a shipped product ("Acme Deploys" class). A simulated app
   area is skeletons: presence, not imitation.
5. States present and not broken: empty, loading, collapsed, dark, narrow.
6. **Re-derived against the lab's CURRENT intent**, not the lab as it stood when
   the block was authored (2.1 is the evidence this step is mandatory).
7. Machine-checkable is **deferred**: the owner ruled manual review sufficient for
   now. A browser cell + screenshot baseline is a later addition, not a
   precondition.

The second and third blocks inherit the same line; `in-app-assistant` additionally
requires the skeleton host from 2.1.

## 4. Wiring: three modes, one axis

**CORRECTED after the wiring lane hit the wall this section caused.** The first
wording said "the manifest declares the mock files and the `route:` dependency",
which implies `registryDependencies: ["route:openrouter", "route:anthropic"]`.
That is wrong: `registryDependencies` are resolved **unconditionally**, so a plain
`kai add` would emit a route despite mock being the default, and a manifest listing
two gateways claims both routes at once. The route is an install-time choice, so it
is a **capability the CLI reads when a mode is asked for**, never an unconditional dep.

| mode | `kai add` spelling | what is written | when |
|---|---|---|---|
| **mock** (default) | `kai add assistant` | composition + the manifest's `wiring.mockFiles` | runs instantly, no key; what the gallery previews |
| **real** | `kai add assistant --gateway openrouter` | composition, **no** mock files, plus the `route:openrouter` dependency **the CLI builds itself** and resolves against the scaffolder catalog | live against a provider |
| **none** | `kai add assistant --no-mock` | composition only | the consumer wires their own store/transport, or the MCP composes |

The manifest capability, validated by `packages/blocks/src/registry.ts`:

```json
"wiring": {
  "gateways": ["openrouter", "anthropic"],
  "mockFiles": ["mock.ts"]
}
```

- An id in `gateways` that is not in the injected `routeIntegrations` is a loud
  manifest error. An absent or empty `gateways` means `--gateway` on that block
  **fails loudly** rather than quietly doing nothing.
- `mockFiles` must name entries in `files[]`; an unknown name is an error.
- The route itself is never in `registryDependencies`, so a third-party item JSON
  with a `route:` dep still resolves the old way and nothing silently drops.
- **The fixture.** `packages/blocks/tests/registry.test.ts`'s `ROUTES` list gains
  `'openrouter'` and `'anthropic'`. The id check stays in `registry.ts` (it already
  validates `route:` deps that way), and the fixture gains the two real ids because
  real manifests declare them; deriving `ROUTES` from the blocks would make the
  walk-equality assertion vacuous for the one class it now has to cover. The
  unknown-id failure is watched by a synthetic-source test instead.
- **Multi-select**: `kai add assistant settings` — one command, registry
  dependencies deduped across the selection. This is the "select one or more and
  `npx` install them" requirement.
- **Gallery, minimal**: a per-card data-mode control plus multi-select checkboxes
  that assemble the copyable command. Explicitly **not** the page redesign.

## 5. The local loop

One command from the repo root:

    pnpm dev:blocks

It regenerates the derived block forms, copies them into the site's public tree,
and starts the docs dev server with `KAI_BLOCKS_KIT=local`, so the iframes
preview the working tree at http://localhost:4321/blocks/. Per-edit iteration after
the first `nx build ui` is only the regenerate + dev pair.

The owner asked to review locally before anything is deployed, so this ships
**first**, and the agent launches it and hands over the URL rather than describing
it. The installed result is reviewed too: `kai add` into a scratch app, with that
dev server handed over as well.

## 6. Sequencing (proposal — open for the owner to cut)

| wave | what | why this order |
|---|---|---|
| 0 | **Local loop + this spec.** | unblocks all review; smallest, and it answers "how do I even run it" |
| 1 | **`assistant` to the bar** (section 3), wiring modes (section 4) proved on it | one artefact to judge; settles the pattern on real code |
| 2 | **Port the pattern**: `in-app-assistant`, `support-widget`, re-derived per 3.6 | the other two are already known-wrong |
| 3 | **Rebase and land B2** (vue, svelte, angular, solid) | mechanical once the composition is right; stops the staleness tax growing |
| 4 | **Archetype parity**: research, workspace (artifact / app), voice, multi-mode, daily-assistant | the rest of `Labs/Builder` |
| 5 | **`Labs/Apps`**: chatgpt, claude-code, codex, perplexity, v0, t3code | the product-parity half of A |
| 6 | **Proofs and surfaces**: settings, composer, audio visualizer, onboarding checklist, dashboard, auth, pricing, wisp | the B half |
| later | `/blocks` page redesign | owner's call, parked |

## 7. Non-goals

- The `/blocks` page redesign.
- Retiring labs (Q5).
- The hosted builder/service for platform users (Wix/Shopify) — explicitly not
  built; `2026-08-30-live-construct-runtime.md` Non-goals 1.
- MCP tools over blocks, and the builder/theme-studio hookup (Parts 6 and 4 of the
  2026-08-31 spec).
- The production composer improvement (separate kit item).
- Automating block acceptance (browser cell + screenshot) — deferred by ruling.

## 8. Open items for the owner

1. **Cut the wave list** (section 6) — what is in for the first month, what waits.
2. **The exemplar's block-level composition**: does `assistant` keep the
   `kai-model-switcher` top bar, or is that chrome the shell should own?
3. **Multi-select arguments**: `kai add a b c` (positional) vs `kai add a --with b`.
   A DX choice; positional is assumed above.
