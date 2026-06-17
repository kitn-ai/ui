# Handoff — card resolution, card-API renames, iframe transport (2026-06-14→15)

Companion to the parallel session's handoffs (`2026-06-15-storybook-docs-ia-and-merge.md`,
`2026-06-15-example-code-tabs.md`). This one covers the **cards / generative-UI / remote
transport** work. **Everything below is MERGED to `main` and PUBLISHED in
`@kitn.ai/chat@0.12.0`** (confirmed in the 0.12.0 changelog; PRs #66/#68/#69/#70/#71 all
landed before release PR #67).

## Shipped (all in 0.12.0)
1. **Card resolution (chromed read-only)** — confirm/choice/tasks/form flip to a read-only
   view on action (optimistic) and re-hydrate from `CardEnvelope.resolution` (additive;
   contract version stays `'1'`). Shared `src/components/use-card-resolution.ts`; pure
   helper `applyResolution`/`resolutionFromEvent` in `src/primitives/card-resolution.ts`.
   Resolved-form `<dl>` is the `kc-detail` precursor. Spec/plan:
   `docs/superpowers/{specs,plans}/2026-06-14-card-resolved-readonly*`.
2. **Card-API consistency renames (breaking, pre-1.0 minor):** `submit-data`→`submit`
   (+`CardPolicy.onSubmit`; `action` kept distinct); `kc-task-list`→`kc-tasks` (type
   `'tasks'`, `TasksCard`); `kc-link-card`→`kc-link-preview` (type stays `'link'`).
3. **kc-choice redesign:** select→**Submit** button (no fire-on-click), grid removed
   (list-only), images kept + HoverCard preview (`HoverCard` gained a `placement` prop),
   `allowOther` unified under one Submit, optional `submitLabel`.
4. **AG-UI iframe transport (full v1, two phases).** `src/remote/`
   (wire/origin/version/validate + `host-embed` `mountRemoteCard` + `provider-runtime`
   `createCardBridge`/`RemoteCardRenderer`), the `<kc-remote>` element, the
   `@kitn.ai/chat/provider` subpath bundle (`vite.config.provider.ts`, vite-plugin-dts@^4,
   no SolidJS), `examples/remote-provider/` (reference provider; renderers extracted to
   `examples/remote-provider/renderers.ts` and theme-aware), cross-origin Playwright matrix
   + CI `test.yml`, Storybook stories. Spec
   `docs/superpowers/specs/2026-06-13-agui-iframe-transport-design.md` (the **addendum
   H-A…H-P is authoritative**); plan `docs/superpowers/plans/2026-06-14-iframe-transport.md`.
   Security: bidirectional origin + `event.source` pin + per-bridge crypto nonce on every
   frame + direction-aware guard + fail-closed cross-origin precondition + sandbox without
   `allow-popups` + recursive proto-pollution guard + redacting logs. Went through a
   4-round adversarial review panel (96/100 READY).
5. **Deployed-docs fixes (#70/#71):** kc-remote stories degrade gracefully on the static
   single-origin Pages build and render the real (theme-aware) card directly; live local
   dev still frames cross-origin. The `Failure` story's inline `role="alert"` invalid-origin
   error is intentional (that IS the demo).

## Open threads — to DISCUSS / DO (none blocking; Rob's current focus is Examples/Patterns/Components, with Solid-Advanced + Generative-UI SIDELINED, so these are lower-priority)
- **Genui element NAMING** (parked in Rob's `docs/notes.md`): distinguish envelope-driven
  card elements from plain UI — e.g. `kc-genui-*` / `kc-confirm-msg`. Rob wants to discuss.
  **Overlaps the parallel agent's IA/naming work** (the "Components" rename, friendly story
  titles) — coordinate before acting. (My take: "card" is the right rendered noun; the
  data wrapper is already correctly `CardEnvelope`. Envelope-vs-card is now explained in the
  Generative UI Overview MDX.)
- **AG-UI protocol adapter** (deferred): a SEPARATE layer that consumes the AG-UI event
  stream and emits `CardEnvelope`s into the dispatcher — reserve the `kc-ag-ui` name for it.
  NOT the iframe transport. The contract's `state` verb is reserved for its live layer.
  Offered a feasibility sketch; Rob said "not now."
- **New card types** (additive via the dispatcher `types` seam): `kc-table` (data grid),
  `kc-status` (uses the `state` verb), `kc-detail` (read-only fields — the resolved-form
  `<dl>` renderer is its precursor; extract it).
- **Remote theme-push refinement:** v1 *remounts* the remote card on a theme change (so
  in-progress remote-card state resets); token/locale refresh is silent. A future renderer
  context-subscription / `:root` token-cascade would re-theme live without remount. Noted
  in the spec ("Theme push" v1-decision addendum) + the Overview docs.
- **Card/Gen-UI elements don't get framework Usage tabs yet** — the parallel docs-IA work
  notes the snippets exist in `framework-usage.json`; broaden the api-tab matcher when
  ready. Rob deferred (Gen-UI sidelined).

## Awareness of the parallel session (do not clobber)
A separate agent shipped the **Storybook docs-IA** pass (PR #72 → 0.12.0) and **per-story
"Usage" tabs** (PR #73), and renamed sidebar groups (`Web Components`→**Components**,
`SolidJS (advanced)`→**Solid (Advanced)**) + React wrappers (`Kc<Name>`→bare `<Name>`). My
`kc-remote`/Gen-UI stories live under `Generative UI/...` (sidelined, untouched by their
reorg). Watch for interactions if future work touches story titles, `.storybook/`, or React
wrapper names. Their handoffs + memory blocks are authoritative for that area.

## Gotcha (cost me a recovery)
Running `vitest`/`build` from inside a `.claude/worktrees/*` worktree pollutes
`component-meta.json` with worktree-absolute import paths, AND that file has nondeterministic
TS type-stringification churn. Phase work that touches no `src/components/*` props should
`git checkout src/components/component-meta.json` to drop spurious diffs; regenerate meta
only from the MAIN checkout. (A background agent's worktree also broke my shell cwd when I
`git worktree remove`d the dir I was standing in — verify `pwd`/branch after worktree ops.)
