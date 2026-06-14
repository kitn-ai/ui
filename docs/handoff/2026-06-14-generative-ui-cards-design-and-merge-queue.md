# Handoff — generative-UI cards, design pass, merge queue + the prefix decision (2026-06-14)

Resume doc for `@kitnai/chat`. **Huge** session: built the entire generative-UI / Card
Contract feature + a premium design pass, plus several kit-wide cleanups. Read this,
then `[[kitn-chat-state]]` memory. Prior arc: `docs/handoff/2026-06-13-kc-rename-resizable-artifact-agui.md`.

## ⚡ THE ONE DECISION BLOCKING THE MERGE QUEUE: the tag prefix

Rob is deciding whether the card elements stay **flat `kc-form`/`kc-confirm`/…** (my
strong rec) or get a distinguishing prefix **`kc-card-*`** (`kc-card-form`, …). He
disliked `kc-agui-*`/`kc-gui-*`. My rec: **flat** — the kit is single-tier
(Shoelace-style), the distinction belongs in the **Storybook "Generative UI" section
+ an Overview doc**, not the tag; `kc-card-*` is the only defensible alternative.
**Nothing in the merge queue lands until this is called** (renaming tags after 0.8.0
ships = breaking). If `kc-card-*` is chosen, rename the 6 card tags (4 on main + 2 on
`feat/cards-batch-2`) before merging/releasing.

## Branch / PR state

`main` tip `8ca5a55` (= 0.7.0 + everything below MERGED via PRs #39–#47).

**Merged to main this session:** PDF preview (kc-artifact inline pdf.js, #39) ·
Shiki TS/TSX-by-default (#40 — **suite is now FULLY GREEN, the old "3 Shiki baseline
failures" are GONE**) · Web-naming rename `defineKitnElement→defineWebComponent` etc.
(#41) · all 6 generative-UI **specs** (#42) · **Card Contract foundation** (#43:
`src/primitives/card-contract.ts` types, `card-validate.ts` lean validator,
`card-routing.ts` `emitCardEvent`/`routeCardEvent`/`listenForCardEvents`,
`card-host.tsx` `CardProvider`/`useCardHost`, envelope/event schemas → `dist/schemas/`)
· **Storybook composition examples** (#44: `Examples/` catalog + composed-shell-vs-
drop-in + Choosing-components MDX — the original goal) · **SB10 + Vitest** stories-as-
tests + a11y-in-test (#45: `npm run test:storybook`, `a11y.test:'todo'`) · **4 cards**
kc-card/kc-form/kc-link-card/kc-embed (#46) · `x-kitn-*`→`x-kc-*` schema hints (#47) ·
the kc-artifact expand/maximize **spec** (decisions locked).

**OPEN PRs / unmerged branches (the merge queue, all pushed to origin):**
1. **PR #48 `feat/cards-batch-2`** — kc-confirm + kc-task-list cards (+ `destructive`
   Button variant) AND the **whole design pass** (see below). 664 tests green, verified
   light+dark. **HELD on the prefix decision.**
2. **`feat/a11y-audit`** — the a11y-audit agent's kit-wide fixes (button-name, contrast,
   scrollable-region, select-name; `dark:text-red-400` for tool error, etc.). Branched
   off an OLD main → **needs rebase/reconcile onto current main** before merge. 0 axe
   violations in the component library after; 10 documented exceptions (Shiki theme
   comment color + a brand swatch demo).
3. **`feat/token-rename-kc`** — CSS design tokens `--kitn-*`→`--kc-*` (theme.css + the
   token generator + docs/examples). Branched off OLD main → reconcile. **MERGE LAST**
   (it's the most cross-cutting + a breaking change for consumers' CSS overrides).
4. **PR #36** — release-please `chore(main): release chat 0.8.0` (auto-updating; merge
   to CUT + publish 0.8.0). **Hold until the whole batch lands**, then cut ONE 0.8.0.

## The design pass on PR #48 (what + why — Rob iterated heavily here)

All on `feat/cards-batch-2`. Verified visually in Storybook with Playwright + axe.
- **Card chrome (`src/components/card.tsx`):** prominent title (17px semibold) + distinct
  muted description + a **border-b separator** under the header + roomier padding. kc-form
  & kc-task-list now fold their heading INTO the card chrome (no weak inline title).
- **Storybook light/dark FIX (`.storybook/preview.ts`):** the cards render in **shadow
  DOM**, which the page's `.dark` class can't cross — so they ignored the toggle and
  followed `theme="auto"`→OS. Added a side-effect that mirrors the resolved theme onto
  each `kc-*` element's `theme` attribute (which DOES drive shadow content). This is the
  fix for "always looks dark." (Real-consumer angle worth revisiting: should `theme="auto"`
  also honor a host-page `.dark` ancestor, not just `prefers-color-scheme`? Currently no.)
- **Form controls (`src/components/form.tsx`, `form-widgets.tsx`, `src/elements/styles.css`):**
  - Each field in a **muted rounded panel** (`bg-muted/40 p-3.5`) for clear separation.
  - Radio + checkbox groups → **selectable-list rows** (bordered group, `divide-y`,
    selected/checked row = `bg-accent` + filled control + `font-medium`).
  - Designed `.kc-radio` / `.kc-checkbox` (appearance-none, depth shadow, hover focus-halo
    via `color-mix`, spring-pop check `cubic-bezier(.34,1.56,.64,1)`, `:active` scale).
  - Custom `.kc-range` slider: filled track via `--kc-range-fill` (set by `SliderWidget`),
    refined thumb (hover/active scale + focus halo), value badge; native track decoration
    nulled (`border:none;box-shadow:none`).
- **kc-task-list (`task-list-card.tsx`):** reworked to the selectable-list style; **Select-
  all is now an aligned first row** in the group (was misaligned native checkbox).
- **WCAG contrast:** darkened light-mode `--color-destructive` (theme.css) hsl(0 84.2% 60.2%)
  → **hsl(0 72% 45%)** (~5.3:1 with white). And `dark:text-red-400`/`dark:border-red-400`
  added to kc-link-card invalid chip, kc-confirm danger banner, form required `*`, field
  errors, invalid-input borders — because the dark `--color-destructive` (dark red) is fine
  as a button bg but too dim as text/border. **Pattern: destructive-as-text/border in dark →
  `dark:text-red-400`.**

## Decisions locked this session (don't re-litigate)

- **Cards stay in `src/components/` + `src/elements/`** (NOT a `src/cards/` folder — that
  forced fragile element-discovery changes for no gain). Separation is at the **Storybook**
  layer: `Generative UI/Cards/*` titles. (Reverted my earlier `src/cards/` convention.)
- **`kc-confirm` IS the data-driven "card with action buttons"** (data → styled buttons +
  `action` verb, structured like kc-form). **No `<kc-button>`** — raw `<button>` in a
  kc-card slot is unstyled (light DOM can't reach shadow CSS); the kc-card story's raw
  buttons MISLED (kc-card is the bare shell). Make kc-confirm the headline; reframe the
  kc-card story (part of the reshape work below).
- **`a11y.reducedMotion` added to `CardContext`** (additive, version stays '1').
- **One shared `emitCardEvent`/`routeCardEvent`/`card-validate`** (in card-routing/validate);
  cards never re-implement them. `defineWebComponent`'s built-in `dispatch` is non-bubbling
  → cards use `emitCardEvent` for the bubbling+composed `kc-card` event.

## NOT-YET-STARTED work (Rob approved, I got pulled into design before launching)

1. **Reshape agent (approved, never spun up).** Three deliverables: (a) reshape EVERY card
   story from "how to hand-construct markup" → **"data-in → render-out"** (the form story is
   the template; lead with the CardEnvelope JSON as input, show the emitted event; the AGENT
   produces the data, the dev wires it); (b) a **"Generative UI/Overview" MDX** explaining the
   data flow (agent→envelope→card→event→agent) + where data comes from; (c) build the **card
   dispatcher** (`renderCard(envelope)` / `<kc-cards>`) — the host glue that renders the right
   `kc-*` by `type` + surfaces one `onCardEvent`/`CardPolicy`. This is the missing 20% that
   makes cards turnkey + the seam the future AG-UI wire layer feeds. Also: reframe the kc-card
   story + make kc-confirm the headline. Storybook IA: `Generative UI/{Overview, Cards, SDK}`.
2. **kc-artifact expand/maximize IMPLEMENTATION.** Spec on main
   (`docs/superpowers/specs/2026-06-13-kc-artifact-expand-maximize-design.md`), all 6 open
   questions resolved (both buttons opt-in; standalone=no-op; kc-resizable owns Escape;
   `maximizedIndex`+`maximize()`/`restore()`; instant; manual protocol-event docs). NOTE: it
   targets `src/elements/resizable.tsx` + `src/ui/resizable.tsx` (there is NO
   `src/components/resizable.tsx`). Queue AFTER the a11y audit lands (both touch artifact.tsx).
3. **iframe transport + AG-UI wire** specs are on main, unimplemented (later phases). The
   AG-UI-wire spec flagged AG-UI protocol specifics to verify against real docs at build time.

## RECOMMENDED MERGE ORDER (after the prefix call)

`feat/cards-batch-2` (PR #48) → reconcile + merge `feat/a11y-audit` (rebase onto new main;
low overlap — it touched conversation-item/tool/scroll-area/etc., the design touched
card/form/task-list/styles) → reconcile + merge `feat/token-rename-kc` LAST → on main run
`npm run build` to regenerate, run the full gate → **cut 0.8.0** (merge PR #36) → then
flip `.storybook/preview.ts` `a11y.test:'todo'`→`'error'` to gate CI on a11y (the SB-Vitest
agent found 43 story-level violations the a11y-audit fixes resolve).

## Norms (unchanged + reinforced)

- Gate = `npm run build` (32→**38** elements now) + `npm run typecheck` (3 tsconfigs) +
  `npm test` (**fully green, NO baseline failures**) + `npm run test:react` (5/5) + a11y
  (0 violations light+dark, scoped to `#storybook-root`). Plus `npm run test:storybook`
  (stories-as-tests). **VERIFY VISUALLY/EMPIRICALLY** — Playwright screenshots + axe caught
  many real bugs static checks missed (the a11y `tabindex` miss, the destructive contrast,
  the Storybook-theme shadow-DOM bug, the slider track).
- New Storybook stories / element/CSS changes need a **full Storybook restart** (custom
  elements don't re-register on HMR; compiled.css is bundled). To test the kit's dark in
  Playwright: emulate `colorScheme:'dark'` OR add `.dark` to `<html>` (the preview decorator
  then sets the element `theme`). SolidJS: **never destructure props**.
- **Parallel agents:** they leave work UNCOMMITTED (review-before-commit) → orchestrator
  commits + integrates. Hygiene: agents create only NEW source, DON'T touch `register.ts`
  (orchestrator wires it post-merge) or commit BUILD-GENERATED files (element-meta.json,
  element-types.d.ts, jsx-types.d.ts, frameworks/react/index.tsx, llms*.txt,
  docs/web-components.md, component-meta.json — `git restore` then orchestrator regenerates;
  `component-meta.json` has unstable type-string churn — always revert it). Worktrees live
  under `.claude/worktrees/` (gitignored + excluded from vitest). Merge via REST.
- Version bump per change via release-please; review before commit/push/merge.
