# Card resolution (chromed read-only) + card-API consistency pass

**Status:** Designed (in progress on `feat/card-resolved-readonly`) · 2026-06-14
**Package:** `@kitn.ai/chat` (pre-1.0 — minor bump via release-please; includes intentional breaking renames)
**Related:** `2026-06-14-kc-choice-design.md` (superseded in part — see Choice redesign), `2026-06-13-card-contract-design.md`

## Problem

When a user acts on an interactive card (confirm / choice / tasks / form), the card today
goes **disabled-in-place**: the whole interactive UI stays on screen, greyed and frozen.
It reads as "a form someone greyed out" rather than a clean record of what was chosen.

We want a card, once acted on, to present a **chromed read-only view** — it keeps its card
frame/title but shows only the resolved answer, cleanly. This must **survive a page reload /
history re-hydration**: on reload there is no click to react to, so the chosen value must be
expressible as data.

While in here, we also make three card-API consistency changes the maintainer called for
(pre-1.0 is the time to do them).

### Decisions
- **Chromed only.** The resolved card keeps its frame. (Chrome-less / user-bubble /
  `collapse` / `remove` were considered and dropped as out of scope.)
- **Optimistic + data-rehydratable.** The card flips to read-only immediately on the user's
  action (optimistic) **and** accepts a `resolution` prop so a card loaded from history
  renders resolved. The host persists the resolution.
- **No green, no timestamp in the visual.** Existing theme tokens + lucide `Check`; no
  `--color-success` token. `at` (ISO timestamp) stays in the type as data-only provenance,
  never rendered.
- **Verb rename `submit-data` → `submit`** (contract-wide). Keep `action` distinct. Result:
  confirm/choice emit `action` (a named choice, carries an id); form/tasks emit `submit`
  (a data payload). Two verbs, each used consistently — clearer to the agent than one
  blurred verb. `CardPolicy.onSubmitData` → `onSubmit`.
- **kc-choice redesign:** select → **Submit button** (no fire-on-click). The radiogroup
  stays interactive until Submit; Submit emits `action` with the chosen option id (or
  `__other__` + `{text}`). **Grid layout removed entirely** (buggy, low value) — list-only;
  drop `GridTile`, `ChoiceLayout`, the `layout` data field, grid CSS. **Images kept**
  (`media.image`/`media.icon` render in list rows). **`allowOther` unified** under the one
  Submit (selecting "Other" reveals the inline field; the same Submit sends it; Submit
  disabled until a concrete option is selected or "Other" has non-empty text).
- **`task-list` → `tasks`** (full rename): tag `kc-task-list` → `kc-tasks`, type
  `'task-list'` → `'tasks'`, component `TaskListCard` → `TasksCard`, files `git mv`, React
  wrapper `KcTaskList` → `KcTasks`, stories/tests/docs.
- **This changes existing post-action behavior + renames public API (intentional, pre-1.0).**
  Call both out in the PR. Acceptable under `bump-minor-pre-major`; not a `1.0`.

## Scope

**In scope** — the four interactive cards: `kc-confirm`, `kc-choice`, `kc-tasks`, `kc-form`.
Plus: contract `resolution` field, the verb + tasks renames, the choice redesign,
dispatcher/element plumbing, re-hydration, the `applyResolution` helper, stories
(data-in → render-out), and unit / React-parity / a11y tests.

**Out of scope:** chrome-less/user-bubble/collapse/remove presentations; `kc-detail` as its
own card (the resolved-form renderer is its precursor); display-only cards
(`kc-link-card`, `kc-embed`, `kc-card`) — untouched.

## Architecture

### 1. Contract — `src/primitives/card-contract.ts`

Optional field on `CardEnvelope` (additive → `CARD_CONTRACT_VERSION` stays `'1'`), plus the
`submit-data` → `submit` rename on `CardEvent`:

```ts
// CardEvent: the `submit-data` variant becomes `submit`:
//   | { kind: 'submit'; cardId: string; data: unknown }

export type CardResolution =
  | { kind: 'action'; action: string; payload?: unknown; at?: string }
  | { kind: 'submit'; data: unknown; at?: string };

export interface CardEnvelope<TType extends string = string, TData = unknown> {
  type: TType;
  id: string;
  data: TData;
  title?: string;
  resolution?: CardResolution; // ← optional re-hydration channel
}
```

`CardResolution` mirrors the two terminal verbs minus `cardId`/`kind` plumbing the host
owns: `action` (confirm, choice) and `submit` (tasks, form). `CardPolicy.onSubmitData`
renames to `onSubmit`.

### 2. Trigger & precedence (shared `useCardResolution` helper)

`src/components/use-card-resolution.ts` (already built) computes
`resolution() = props.resolution ?? localResolution()`:
- **Explicit prop wins** (host-driven / re-hydrated).
- **Optimistic local flip** — on the terminal interaction the card builds the same
  `CardResolution` into `localResolution` **and** emits its event (single-shot guard).
- **Reset** — a new `data` identity clears `localResolution`; an explicit prop keeps it.
- `isOptimistic` (prop absent + local present) gates the `role="status"` announcement.
- `data-kc-resolved` host attribute retained.

### 3. Read-only rendering per card (chromed; tokens + `Check`, no green)

- **confirm** — keep heading + body; replace the button row with `✓ <chosen action label>`
  (unknown id → raw id). *(Done.)*
- **choice** — after Submit, render **only** the chosen option as a static highlighted list
  row (no radiogroup/roving tabindex/click). Prompt kept muted. `__other__` → `Other:
  <text>`. (List-only after the redesign; no grid path to read-only-render.)
- **tasks** — `✓ Selected N of M` + the chosen item labels as a list; empty → `None
  selected`.
- **form** — heading + `✓ Submitted`; body becomes a `<dl>` label→value summary from
  `resolution.data` against `properties` (boolean→Yes/No, array→comma, password→••••,
  empty→—; order via `x-kc-order`). The `<dl>` renderer is the `kc-detail` precursor.

### 3b. kc-choice redesign (interaction model)

- Selecting a list row sets a **local selection** (radiogroup, roving tabindex) — it does
  **not** emit. A **Submit button** (disabled until a selection exists) emits
  `{ kind:'action', action: <optionId>, payload }` and triggers the optimistic resolve.
- **Grid removed:** delete `GridTile`, `ChoiceLayout`, the `layout` field + its
  normalization, grid container CSS. Only the list presentation remains. Images
  (`media.image` thumb / `media.icon` badge) stay in list rows.
- **`allowOther` unified:** selecting the synthetic "Other" row reveals the inline text
  input; the single Submit sends `{ kind:'action', action:'__other__', payload:{text} }`.
  Submit is enabled when a concrete option is selected, or "Other" is selected with
  non-empty trimmed text.
- Optional `submitLabel` data field (default `"Submit"`).
- a11y: the radiogroup keeps its WAI-ARIA semantics; the Submit button has an accessible
  name; nothing focusable left behind in the resolved view.

### 4. Dispatcher / element plumbing + round-trip helper

- `resolution` rides the envelope: `card-registry` wrappers (`form`, `confirm`, `tasks`,
  `choice`) pass `resolution={p.envelope.resolution}`; `<kc-cards>` `CardSlot` forwards it
  as a DOM property; the element facades accept a `resolution` property. `<kc-cards>` stays
  controlled/stateless.
- **`applyResolution` helper** (`src/primitives/card-resolution.ts`, exported from
  `src/index.ts`) — pure, makes re-hydration a one-liner:
  ```ts
  resolutionFromEvent(event: CardEvent): CardResolution | undefined  // action | submit only
  applyResolution(cards: CardEnvelope[], event: CardEvent): CardEnvelope[]
  ```
  Returns a new array with the matching envelope stamped; non-terminal events / unknown
  ids return the same reference. Deterministic (no `Date`). Usage:
  `el.cards = applyResolution(el.cards, e.detail)`.

### 5. Accessibility & theming
- Read-only views are static content (no disabled-but-focusable remnants). `role="status"`
  on the optimistic flip; silent on re-hydrate. Axe gate light+dark, 0 violations.
- Restrained treatment: existing tokens + lucide `Check`. No new token.

## Testing
- Unit: resolution precedence (done); per-card read-only from a supplied `resolution`;
  choice submit-button flow (select→submit emits once; Submit disabled until selection;
  unified Other); form `summarizeForm`/`formatFieldValue`; tasks N-of-M/empty.
- Rename safety: full gate green after each rename (build 40 elements, typecheck, test,
  test:react, test:storybook).
- Stories: a "Resolved" story per card; choice stories updated (no grid; submit flow).
- Gate: `build && typecheck && test && test:react && test:storybook` + composable a11y.

## Future (recorded)
- `kc-detail` (extract the resolved-form `<dl>` renderer).
- Chrome-less / user-bubble resolved presentation (revisit on real usage).
- `--color-success` token (if a stronger positive signal is wanted).

## Files touched
- `src/primitives/card-contract.ts` — `CardResolution`, `CardEnvelope.resolution`,
  `submit-data`→`submit`, `CardPolicy.onSubmit`.
- `src/primitives/card-resolution.ts` (new) — `resolutionFromEvent`/`applyResolution`.
- `src/primitives/card-routing.ts` — route the renamed `submit` verb / `onSubmit`.
- `src/components/use-card-resolution.ts` (done).
- `src/components/confirm-card.tsx` (done), `choice-card.tsx` (redesign + read-only),
  `task-list-card.tsx`→`tasks-card.tsx` (rename + read-only), `form.tsx` (read-only +
  `summarizeForm`).
- `src/primitives/card-registry.tsx` — forward `resolution`; `task-list`→`tasks` tag/type.
- `src/elements/cards.tsx` — forward `resolution`; register `./tasks`.
- `src/elements/confirm-card.tsx`, `choice.tsx`, `form.tsx`,
  `task-list-card.tsx`→`tasks.tsx` — accept `resolution`; tag rename.
- `frameworks/react/*` (generated) — `KcTasks` wrapper via rebuild.
- `src/index.ts` — export `applyResolution`/`resolutionFromEvent`; renamed `tasks` exports.
- Stories + tests for all of the above; Overview MDX round-trip note; regenerated
  `element-meta.json`/`component-meta.json`/`docs/web-components.md` (build).
