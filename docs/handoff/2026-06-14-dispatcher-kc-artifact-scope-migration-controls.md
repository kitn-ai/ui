# Handoff — card dispatcher, kc-artifact expand/maximize, @kitn.ai scope migration, kc-choice, event consolidation, Storybook controls (2026-06-14, session 2)

Continuation of `docs/handoff/2026-06-14-generative-ui-cards-design-and-merge-queue.md`.
Big session. **Everything below is MERGED to `main` and published as `@kitn.ai/chat@0.11.0`.**
Read this, then the `[[kitn-chat-state]]` + `[[npm-scope-migration]]` memories.

## ⚠️ The package was RENAMED: `@kitnai/chat` → `@kitn.ai/chat`
Rob registered the npm org `kitn.ai` (dotted scope is valid — @socket.io/* uses one) and
**deleted `@kitnai/chat` from npm**. Now published as **`@kitn.ai/chat`** (latest 0.11.0).
GitHub repo stays `kitn-ai/chat`; `kc-` tags, `--kc-` tokens, `dist/kitn-chat.es.js` bundle +
`KitnChat` UMD global all KEPT. Details + the OIDC bootstrap gotcha in `[[npm-scope-migration]]`.
**Older docs/specs/handoffs say `@kitnai/chat` — that's historical, now stale.**

## Shipped this session (all on main, in 0.10.0 / 0.11.0)
1. **Card dispatcher ("SDK")** — `src/primitives/card-registry.tsx` (type→component/tag maps +
   per-instance `types` override), Solid `CardRenderer`/`renderCard` (`src/components/card-renderer.tsx`),
   `CardFallback`, `<kc-cards>` list element (`src/elements/cards.tsx`), `Generative UI/Overview` MDX,
   SDK story. Reuses the existing contract (`action`/`error`, `CardProvider`/`routeCardEvent`).
   Spec/plan: `docs/superpowers/{specs,plans}/2026-06-14-generative-ui-overview-sdk*`. (Review caught a
   blocking bug: `<kc-cards>` captured `props.policy` at mount → now reads it at event time.)
2. **kc-artifact expand/maximize** — `<kc-resizable>` `kc-maximize-intent`/`kc-maximize-state` protocol
   (element-keyed stash, `applyingMaximize` storm-guard, Escape/auto-restore/re-target, `maximizedIndex`
   + `maximize()`/`restore()` host methods), `<kc-artifact>` opt-in expand/open-in-tab + configurable
   toolbar + **`standalone`** (corners+border keyed to container; default in-panel = square/borderless) +
   **`readonly-path`**, Solid `Resizable` parity. Spec: `docs/superpowers/specs/2026-06-13-kc-artifact-expand-maximize-design.md`
   (+ its 2026-06-14 addendum). Review fixed an element-keyed-stash index-drift bug.
3. **kc-choice** — single-select option card (`type:'choice'`, rich options id/label/description/media/
   meta/disabled/recommended/payload, `layout:list|grid`, single-shot, `allowOther` free-text escape).
   Auto-integrates with the dispatcher (6th registry entry). Spec: `docs/superpowers/specs/2026-06-14-kc-choice-design.md`.
4. **Event-API consolidation** — `kc-feedback-bar` `helpful`+`nothelpful` → one `feedback:{value:'helpful'|'not-helpful'}`
   event + `onFeedback` (keep `close`); `kc-conversations` element event `select` → `conversationselect`.
   Spec: `docs/superpowers/specs/2026-06-14-event-consolidation-design.md`. (Dropped the proposed
   `kc-conversations` sidebartoggle change — it doesn't own collapse state, so `{collapsed}` would lie.)
   Survey found the kit already consolidates well (`messageaction`, artifact `navigate`, the `open` verb).
5. **Storybook controls fixed** — `argTypesFor` in `src/stories/docs/element-controls.ts` mis-mapped every
   web-component story control. Root cause: the meta generator (`_ts-helpers.mjs renderType`) writes booleans
   as `undefined | false | true` and enums as `undefined | "a" | "b"` (double-quoted + leading undefined);
   the helper's matcher expected single quotes / a `boolean` substring → everything fell to text/object, and
   non-scalar props were skipped entirely. Fixed in two PRs: enums→select, booleans→boolean, numbers→number,
   then arrays/objects→`control:'object'` (JSON), functions→`control:false`. **Audit: 0 mis-typed props across
   all 40 elements** (test: `tests/stories/element-controls.test.ts`).
6. **Artifact Pages bug** — card-story fixture URLs were root-absolute (`/artifact-fixtures`), 404'd under the
   GitHub Pages `/chat/` subpath. Fixed to `new URL('artifact-fixtures', document.baseURI).href` (base-path-safe).
7. **Card-story reshape** completed — link-card/embed stories gained the emitted-event log; `kc-card` story
   reframed as chrome-only (its raw-button demo misled — light DOM can't reach shadow CSS); `kc-confirm` is the
   Cards-section headline (storySort). confirm/task-list/choice/form were already data-in→event-out.

## Norms / gotchas reinforced this session
- **`bump-minor-pre-major: true`** → even BREAKING changes bump the MINOR (0.X.0), NEVER 1.0. Rob is
  staying pre-1.0 until he explicitly says otherwise — DO NOT propose/cut 1.0. See `[[version-bump-each-change]]`.
- **Releases are semi-automatic:** merging feature work to main auto-updates the release-please PR; the actual
  publish only fires when that release PR is merged (tokenless OIDC, provenance attested). Merge PRs via REST.
- **Worktree test friction:** running `vitest` from a `.claude/worktrees/*` worktree breaks (the storybook addon
  injects jest-dom via an unresolvable `/@fs/` path). Run feature execution in the MAIN checkout, one branch at a
  time (subagent creates its own branch there). Parallelism via background subagents that each branch off main.
- **OIDC for a NEW package:** the first publish can't be OIDC (npm/cli#8544) — do a one-time `npm login` +
  `npm publish --access public` (no token), then attach the trusted publisher (org `kitn-ai`, repo `chat`,
  workflow `release-please.yml`, allow `npm publish`). npm 11.11.0's `npm trust github` has no `--allow-publish`.
- Gate = build (40 elements) + typecheck + test + test:react + test:storybook (a11y `'error'`, 0 violations) +
  composable a11y audit. SolidJS: never destructure props. `docs/notes.md` is Rob's untracked scratch file — leave it.

## Backlog (NOT started)
- **Future card types:** `kc-choice` shipped; remaining ideas `kc-table` (data grid), `kc-status` (live progress,
  uses the `state` verb), `kc-detail` (read-only fields). Each is additive via the dispatcher's `types` seam.
- **Rob's `docs/notes.md` items:** move the Theming section up under Docs; cross-platform (non-Mac) scrollbar
  styling (light/dark); examples polish (CSS-from-code split, better data organization, docs).
- The earlier deferred specs still unbuilt: iframe transport + AG-UI wire (`docs/superpowers/specs/2026-06-13-agui-iframe-transport-design.md`).
