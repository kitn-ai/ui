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

**2.4 B2 is parked, not lost.** `feat/blocks-b2-renderers` (worktree
`.claude/worktrees/blocks-b2`) holds the four remaining delivery forms — vue,
svelte, angular, solid — plus 6 tests, the contract changes and 3 kit fixes: 15
commits, pushed, **no PR**, last commit 2026-09-03. `main` is ~199 commits ahead
and the merge conflicts. Its blocks-side work is path-agnostic and intact; the 19
`packages/ui/src/elements/*` files it touches are all gone from main after the
`web-components` rename, so the rebase is real but bounded.

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

| mode | `kai add` spelling | what is written | when |
|---|---|---|---|
| **mock** (default) | `kai add assistant` | composition + scripted `mock.ts` | runs instantly, no key; what the gallery previews |
| **real** | `kai add assistant --gateway openrouter` | composition, **no** mock, plus the `route:<integration>` backend route and its `.env` | live against a provider |
| **none** | `kai add assistant --no-mock` | composition only | the consumer wires their own store/transport, or the MCP composes |

- The **manifest** declares the mock files and the `route:` dependency, so `add`
  resolves the requested mode. A mode that cannot be satisfied is a loud failure.
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
