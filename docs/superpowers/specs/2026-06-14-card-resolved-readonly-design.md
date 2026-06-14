# Card resolution — chromed read-only state for interactive cards

**Status:** Designed (not built) · 2026-06-14
**Package:** `@kitn.ai/chat` (pre-1.0 — additive feature, minor bump via release-please)
**Related:** `2026-06-14-kc-choice-design.md`, `2026-06-13-card-contract-design.md`, `2026-06-14-generative-ui-overview-sdk*`

## Problem

When a user acts on an interactive card (confirms, picks an option, submits a form),
the card today goes **disabled-in-place**: the entire interactive UI stays on screen,
greyed and frozen, with the selection highlighted (`confirm`/`choice` set an internal
`resolved` signal; `form`/`task-list` set `submitted`). It still reads as "a form
someone greyed out" rather than a clean record of what the user chose.

We want a card, once acted on, to present a **chromed read-only view** — it keeps its
card frame/title but shows only the resolved answer, cleanly. Critically, this resolved
state must **survive a page reload / history re-hydration**: when a past conversation is
reloaded there is no click to react to, so the chosen value must be expressible as data.

### Decisions taken during brainstorming
- **Chromed only.** The resolved card keeps its frame. (Chrome-less / "render as a text
  response or user-message bubble", `collapse`, and `remove` modes were explicitly
  considered and dropped as out of scope — they trade away authorship/provenance and
  consistency with `kc-detail`, and add surface we don't need yet.)
- **Optimistic + data-rehydratable.** The card flips to read-only immediately on the
  user's action (optimistic, like today's single-shot) **and** accepts a `resolution`
  prop so a card loaded from history renders resolved. The host persists the resolution.
- **No green, no timestamp in the visual.** Use existing theme tokens + the lucide
  `Check` icon; do not introduce a `--color-success` token. `at` (ISO timestamp) stays in
  the type as optional data-only provenance but is never rendered.
- **This changes existing post-action behavior (intentional, pre-1.0).** Today the four
  cards already flip on action but *disable in place* (controls greyed, still present).
  This feature *replaces* that markup with the read-only view (unchosen controls are
  removed, not greyed). API-wise it is additive (one optional field), but the optimistic
  post-action DOM changes — call this out in the PR. Acceptable under
  `bump-minor-pre-major`; not a `1.0`.

## Scope

**In scope** — the four interactive cards:
- `kc-confirm` (`ConfirmCard`)
- `kc-choice` (`ChoiceCard`)
- `kc-task-list` (`TaskListCard`)
- `kc-form` (`FormCard`)

Plus: the contract `resolution` field, dispatcher/element plumbing, re-hydration,
stories (data-in → render-out), and unit / React-parity / a11y tests.

**Out of scope:**
- Chrome-less, user-bubble, `collapse`, and `remove` presentations.
- `kc-detail` as its own card type (the resolved-form renderer is its precursor — see
  §"Future" — but we do not ship the card here).
- Display-only cards (`kc-link-card`, `kc-embed`, `kc-card`) — they have no terminal
  event and are untouched.

## Architecture

### 1. Contract addition — `src/primitives/card-contract.ts`

One optional field on `CardEnvelope`. Per the contract's own rule
("Additive/optional fields do not bump it"), `CARD_CONTRACT_VERSION` **stays `'1'`**.

```ts
/** How a card was resolved by the user — the re-hydration channel for the read-only
 *  state. Mirrors the two terminal CardEvents (minus cardId): the resolution is just
 *  the event that resolved the card. `at` is optional ISO-8601 provenance (data only;
 *  never rendered). */
export type CardResolution =
  | { kind: 'action'; action: string; payload?: unknown; at?: string }
  | { kind: 'submit-data'; data: unknown; at?: string };

export interface CardEnvelope<TType extends string = string, TData = unknown> {
  type: TType;
  id: string;
  data: TData;
  title?: string;
  resolution?: CardResolution; // ← new, optional
}
```

Why these two variants: the four cards emit exactly two terminal verbs —
`action` (`confirm`, `choice`) and `submit-data` (`task-list`, `form`). `CardResolution`
is those payloads minus the `cardId`/`kind` plumbing the host already owns.

### 2. Trigger & precedence (shared pattern in every card)

Each card computes one `resolution()` accessor and renders a read-only branch when it
is set:

```
resolution() = props.resolution ?? localResolution()
```

- **Explicit prop wins** — host-driven / re-hydrated state.
- **Optimistic local flip** — on the terminal interaction the card builds the *same*
  `CardResolution` shape into `localResolution` **and** emits its event (the existing
  single-shot guard stays: a resolved card ignores further interaction).
- **Reset** — a new `data` identity clears `localResolution` (existing
  `createEffect(on(() => props.data, …))` behavior). If `props.resolution` is still set
  the card stays resolved; clearing both returns it to interactive.
- `data-kc-resolved` host attribute is retained (and set on re-hydration too) for host
  styling.

This replaces the current per-card `resolved`/`submitted` signals with a single
resolution model seeded from either source. The migration is mechanical:
`confirm`/`choice` already store the chosen id → wrap as `{ kind:'action', action }`;
`form`/`task-list` already store `submitted` + the emitted `data` → wrap as
`{ kind:'submit-data', data }`.

### 3. Read-only rendering per card

All keep the `Card` chrome (heading/frame). The resolved body uses existing tokens
(`muted`, `accent`, `foreground`, `border`) + the lucide `Check` — no green.

- **confirm** — keep heading + body; replace the action-button row with a static line
  `✓ <chosen action label>`. Resolve the label by looking up `resolution.action` in the
  current `actions`; unknown id (data changed since) → render the raw id.
- **choice** — render **only** the chosen option, as a static highlighted row reusing
  the `ListRow`/`GridTile` visual but **without** `role="radio"`/roving tabindex and
  without click handlers. Prompt kept (muted). `__other__` → render the free text as
  `Other: <text>` (read from `resolution.payload.text`).
- **task-list** — heading kept; show `✓ Selected N of M` then the chosen task labels as
  a bulleted list (resolve ids → labels from current `tasks`; unknown id → raw id).
  Empty selection → `None selected`.
- **form** — heading + a `✓ Submitted` status (text, not a colored pill); body becomes a
  `<dl>` label→value summary built from `resolution.data` against the form `properties`:
  - boolean → `Yes` / `No`
  - array → comma-joined
  - `x-kc-widget:'password'` → masked (`••••`)
  - empty / missing → `—`
  - label = field `title` ?? property key; order follows `x-kc-order` then declaration.
  This `<dl>` renderer is the `kc-detail` precursor (see Future). It lives in a small
  function we can later lift into `kc-detail` without changing this card.

### 4. Dispatcher / element plumbing

`resolution` rides the envelope through the existing seam:
- `CardRenderer` / `renderCard` (`src/components/card-renderer.tsx`) pass
  `envelope.resolution` → the resolved component's `resolution` prop.
- `<kc-cards>` (`src/elements/cards.tsx`) and the per-type element facades
  (`confirm-card`, `choice`, `form`, `task-list-card`) accept a `resolution` property and
  forward it. (`<kc-card>` is generic display-only chrome with no terminal event — not
  touched.)
- `<kc-cards>` stays **controlled / stateless** (consistent with the kit's controlled
  components): live sessions resolve via the internal optimistic signal; reload resolves
  via the `resolution` prop the consumer supplies.

**Consumer round-trip (documented, not enforced):** to make a resolution survive reload,
the consumer listens for the card's terminal event and persists the resolution back onto
that envelope in its `cards` array (e.g. stamps `envelope.resolution = { kind, … }`).
On next render the prop re-hydrates the read-only view. Documented in the Overview MDX
with an example.

**`applyResolution` helper (the round-trip, one-liner).** Re-hydration is the headline
benefit, and it only works if consumers do the round-trip — so we ship a tiny pure
reducer instead of leaving them to hand-roll it:

```ts
// src/primitives/card-resolution.ts — exported from the package root.
resolutionFromEvent(event: CardEvent): CardResolution | undefined  // terminal verbs only
applyResolution(cards: CardEnvelope[], event: CardEvent): CardEnvelope[]
```

`applyResolution` returns a new array with the envelope matching `event.cardId` stamped
with its resolution; non-terminal events (`ready`/`error`/`resize`/…) and unknown
`cardId`s return the **same array reference** unchanged. Pure and deterministic (no
`Date` — `at` is left to the consumer), so it tests trivially and drops straight into a
listener: `el.cards = applyResolution(el.cards, e.detail)`.

### 5. Accessibility

- The read-only view is **static content** — no disabled-but-focusable controls are left
  behind (today's disabled buttons/inputs are removed, not just greyed).
- **Optimistic flip** wraps the resolved summary in `role="status"` (polite live region)
  so screen-reader users hear the resolution. **Re-hydrated** render (resolution present
  at first paint) is silent — nothing changed, so nothing is announced.
- The resolved summary has an accessible name tying it to the card heading.
- Must clear the existing axe gate (`a11y.test:'error'`, 0 violations) in **light + dark**,
  including the composable a11y audit.

### 6. Theming

Restrained "resolved" treatment using existing tokens only + lucide `Check`. No new
token. (If we later want a stronger positive signal we can add `--color-success`, but
that is explicitly deferred.)

## Testing

- **Unit (vitest):**
  - resolution precedence: prop > optimistic > none; reset on new `data`; prop keeps it
    resolved across a `data` change.
  - per-card read-only rendering from a supplied `resolution` (re-hydration path, no
    interaction): confirm label lookup + unknown-id fallback; choice chosen-only +
    `__other__` text; task-list N-of-M + empty; form `<dl>` value formatting
    (boolean/array/password/empty) + order.
  - optimistic path: interaction sets `localResolution`, emits the unchanged event once,
    flips to read-only.
- **React parity (`vitest.react.config.ts`):** wrappers forward `resolution`; a resolved
  card renders read-only through the wrapper.
- **Storybook + a11y:** each card gains a "Resolved" story (data-in → render-out: pass an
  envelope with `resolution` set). Stories pass axe in light + dark; no focusable
  remnants. Story sort keeps the existing card-section order.
- **Gate:** build (40 elements) + typecheck + test + test:react + test:storybook +
  composable a11y audit, all green.

## Future (out of scope, recorded)

- **`kc-detail`** — the resolved-form `<dl>` renderer is its precursor; extract the
  label→value formatter into a standalone read-only card with its own `type:'detail'`
  schema + dispatcher entry.
- **Chrome-less / user-bubble resolved presentation** — revisit if real usage shows the
  chromed record is too heavy for lightweight confirm/choice turns. Would become a
  `resolved` mode on top of this foundation, not a rewrite.
- **`--color-success` token** — if a stronger positive signal is wanted later.

## Files touched (estimate)

- `src/primitives/card-contract.ts` — `CardResolution` + `CardEnvelope.resolution`.
- `src/primitives/card-resolution.ts` (new) — `resolutionFromEvent` + `applyResolution`
  pure helpers; re-exported from `src/index.ts`.
- `src/components/confirm-card.tsx`, `choice-card.tsx`, `task-list-card.tsx`, `form.tsx`
  — resolution model + read-only branch.
- `src/components/card-renderer.tsx` — forward `resolution`.
- `src/elements/cards.tsx`, `confirm-card.tsx`, `choice.tsx`, `form.tsx`,
  `task-list-card.tsx` — accept + forward `resolution` property.
- Stories: a "Resolved" story per card (`*.stories.tsx`).
- Tests: `tests/components/*` (+ React + storybook a11y).
- Docs: `Generative UI/Overview` MDX (round-trip example); regenerated element/component
  meta + `docs/web-components.md` (the build does this).
```
