# Design — `kc-choice` (single-select option card) (2026-06-14)

Implementation spec for a new generative-UI card: **`kc-choice`** — the "pick one of N
rich options" card (plans, products, flights, restaurants, quick replies). Fills the gap
between `kc-form` (free-form fields), `kc-confirm` (fixed action buttons), and
`kc-task-list` (multi-select checklist). Decided via brainstorming 2026-06-14. Builds on
the Card Contract + the card dispatcher (`docs/superpowers/specs/2026-06-14-generative-ui-overview-sdk-design.md`).
**Model the implementation closely on `src/components/confirm-card.tsx` + `src/elements/confirm-card.tsx`**
(same single-shot/error/host-emit shape) and reuse the kit's selectable-list styling
(see `task-list-card.tsx` / the form radio rows in `form-widgets.tsx`).

## Decisions (locked)

- **Single-select, immediate.** Activating an option emits the contract's **`action`** verb
  (`{ kind:'action', cardId, action: option.id, payload: option.payload }`) — no new verb.
- **Single-shot.** After a pick the card resolves (chosen option marked, others disabled,
  re-pick is a no-op) — exactly like `kc-confirm`'s `resolved` signal. Reset when a NEW
  `data` arrives.
- **Rich-but-bounded options** (agent-emitted data; lean by default — every field except
  id/label is optional, so a weaker model just omits them).
- **`layout: 'list' | 'grid'`** hint in the data (default `'list'`).
- **`allowOther`** — optional free-text escape ("none of these / specify"). Optional DATA
  field, so it's opt-in per card.
- **`recommended`** — optional per-option flag → a "Recommended" pill.
- **Guardrail deferred:** a host-side cap to forbid `allowOther` (à la `CardPolicy.maxSendPromptMode`)
  is NOT built now — note it as a future `CardPolicy` addition.

## Type & wiring

- `type: 'choice'` → `export type ChoiceCardEnvelope = CardEnvelope<'choice', ChoiceCardData>;`
- Solid `ChoiceCard` (`src/components/choice-card.tsx`) + `<kc-choice>` facade
  (`src/elements/choice.tsx`), registered in `src/elements/register.ts` (element 39 → **40**).
- **Add to the dispatcher registry** (`src/primitives/card-registry.tsx`) as the 6th built-in:
  `BUILTIN_CARD_TAGS.choice = 'kc-choice'` and a `BUILTIN_CARD_COMPONENTS.choice` wrapper
  (`(p) => <ChoiceCard data={p.envelope.data} cardId={p.envelope.id} heading={p.envelope.title} host={p.host} />`).
- Barrel exports in `src/index.ts` (mirror the confirm exports block): `ChoiceCard`,
  `ChoiceCardProps`, `ChoiceOption`, `ChoiceCardData`, `ChoiceCardEnvelope`, and any exported
  helpers (`normalizeOptions`).

## Data shape (the schema)

```ts
export interface ChoiceOption {
  id: string;                 // required, unique within the card
  label: string;              // required
  description?: string;
  media?: { image?: string; imageAlt?: string; icon?: string }; // image URL or named icon
  meta?: string;              // trailing freeform text (e.g. price/badge)
  recommended?: boolean;      // renders a "Recommended" pill
  disabled?: boolean;         // not selectable; skipped in keyboard nav
  payload?: unknown;          // echoed back in the emitted action
}
export interface ChoiceCardData {
  prompt?: string;            // optional question/body above the options
  options: ChoiceOption[];    // 1..N
  layout?: 'list' | 'grid';   // default 'list'
  allowOther?: boolean | { label?: string; placeholder?: string }; // free-text escape
}
```

`heading` = `envelope.title` (card chrome, folded into the `Card` header like confirm/task-list).
`prompt` = optional body text above the options.

JSON Schema: **`src/primitives/card-schemas/choice.schema.json`** (modeled on
`confirm.schema.json` — `options` is a non-empty array; each item requires `id` + `label`;
`layout` is an enum; `allowOther` is `boolean` or an object). It ships to `dist/schemas`
automatically via `scripts/copy-card-schemas.mjs` (no script change — it copies the dir).
No separate `.result` schema (choice emits `action`, like confirm — not `submit-data`).

## Interaction

- **Pick → emit + resolve.** Click / Enter / Space on an option → `emit({ kind:'action',
  cardId, action: option.id, payload: option.payload })`, then `setResolved(option.id)`.
  Single-shot: subsequent activations no-op. Emits `{ kind:'ready', cardId }` on mount
  (when valid).
- **`allowOther`.** When set, render a final **"Other"** option (label from
  `allowOther.label` or default "Other…"). Selecting it does NOT emit immediately — it
  reveals an inline `<input type="text">` (placeholder from `allowOther.placeholder`) + a
  small **Submit** button (disabled while empty). Submitting emits `{ kind:'action',
  cardId, action: '__other__', payload: { text } }` and resolves. (This mirrors the
  question-UI "Type something" escape — the only option that's two-step, which is expected.)
- **Disabled options** are inert and skipped in keyboard nav.
- **Invalid/empty `options`** → inline error state (`role="alert"`) + `emit({ kind:'error',
  cardId, message })`, no selectable rows — exactly `kc-confirm`'s empty-actions path. Use a
  `normalizeOptions(options)` helper (dedupe by id first-wins, drop entries missing id/label,
  empty → `{ options: [], error }`) modeled on `normalizeActions`.

## Presentation

- Inside `Card` chrome (title from `heading`, optional `prompt` body, `border-b` header
  separator — consistent with the other cards).
- **`layout: 'list'`** — stacked selectable rows (the kit's selectable-list style: bordered
  group, `divide-y`, selected row = `bg-accent` + filled radio + `font-medium`); `media.image`
  renders as a leading thumbnail, `media.icon` as a leading icon; `meta` right-aligned;
  `recommended` → a small "Recommended" pill near the label.
- **`layout: 'grid'`** — responsive tiles (e.g. `grid grid-cols-2 sm:grid-cols-3 gap-2`),
  each a selectable card with media on top, label/description/meta below, selected = ring +
  check. Same radio semantics; the grid is purely visual.
- Reuse existing tokens/utilities; **0 axe violations** (light + dark) is required — the new
  stories run under the gated a11y suite (`a11y.test:'error'`).

## Accessibility

- Container `role="radiogroup"` with an accessible name (the `heading`/`prompt` via
  `aria-label`/`aria-labelledby`). Each option `role="radio"` + `aria-checked`.
- **Roving tabindex**: one tab stop into the group; Arrow keys move focus (skipping disabled);
  Enter/Space select. Grid layout keeps linear roving order (grid is visual only).
- Disabled options: `aria-disabled="true"`, not focusable.
- `media.image` requires `imageAlt` (decorative if absent → `alt=""`).
- The `allowOther` text input has an associated `<label>` (visually-hidden ok).
- "Recommended" pill is decorative text, not a separate control.

## Files

- Create `src/components/choice-card.tsx` — `ChoiceCard` + types + `normalizeOptions` (+ any
  pure helpers; unit-test them in isolation like confirm's helpers).
- Create `src/elements/choice.tsx` — `<kc-choice>` facade (props `data`, `cardId`, `heading`;
  wraps `ChoiceCard` with `hostElement={element}` for the bubbling-event fallback — copy the
  confirm facade shape). Add `autofocus` only if trivially matching confirm; otherwise omit.
- Modify `src/elements/register.ts` — `import './choice';`.
- Modify `src/primitives/card-registry.tsx` — add the `choice` tag + component entries.
- Modify `src/index.ts` — barrel exports.
- Create `src/primitives/card-schemas/choice.schema.json`.
- Create stories `src/elements/choice.stories.tsx` — `Generative UI/Cards/kc-choice`:
  list (plans, one `recommended`), grid (products with images), and an `allowOther` example;
  data-in led (envelope JSON as the source), like the other card stories.
- Create tests: `tests/components/choice-logic.test.ts` (normalizeOptions + helpers),
  `tests/components/choice-card.test.tsx` (host-emit path — model on `cards-host-path.test.tsx`:
  pick emits `action` with id+payload; single-shot; empty → error; `allowOther` submit emits
  `__other__` + text), `tests/elements/choice-element.test.tsx` (the bubbling `kc-card`
  contract — model on `confirm-card-element.test.tsx`), `tests/primitives/choice-schema.test.ts`
  (valid/invalid `data` against the schema, like `confirm-task-list-schemas.test.ts`).

## Dispatcher integration (free win)

Because the dispatcher resolves cards via the registry, adding the `choice` entry means
`<kc-cards>` and `renderCard` render kc-choice automatically — no dispatcher change. Add a
`choice` envelope to the existing `Generative UI/SDK` `<kc-cards>` story's stream so it's
exercised there too (optional but nice).

## Out of scope / future

- The `CardPolicy` cap to forbid `allowOther` (host guardrail) — future.
- Multi-select (that's `kc-task-list`'s job). Carousel layout. Async/remote option loading.

## Gate

`npm run build` (40 elements, regen idempotent) + typecheck + `npm test` + `npm run test:react`
+ `npm run test:storybook` (a11y `'error'`, 0 violations) + the composable a11y audit.
