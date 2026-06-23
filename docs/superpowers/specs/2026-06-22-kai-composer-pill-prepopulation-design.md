# Design — programmatic pill pre-population for `<kai-prompt-input>`

**Date:** 2026-06-22 · **Branch:** `worktree-kai-composer` · **Status:** approved, pre-implementation.
**Predecessor spec:** `docs/superpowers/specs/2026-06-21-kai-composer-rich-input-design.md`.
**Handoff context:** `docs/superpowers/HANDOFF-kai-composer.md` (this is the "Programmatic pill pre-population" deferred item).

## Problem

A consumer can already seed pills into the low-level `<kai-composer>` by setting its
`value` to a `ComposerDoc` — the composer view renders the pills on mount (verified by
`composer-ivp.spec.ts` → "Prefilled doc renders a pill inline with text"). But the
everyday `<kai-prompt-input>` only accepts a **string** value, so the structured-doc
path dead-ends at the wrapper. A consumer cannot open the prompt input pre-filled with,
e.g. *"Review «code-reviewer» and report"* where `«code-reviewer»` is a real atomic pill.

Use cases this unlocks: edit-a-previous-message (that had pills), templated draft prompts
with a skill/agent already attached, and suggestion clicks that drop in a pill.

## Goal

Let a consumer set `<kai-prompt-input>`'s `value` to a `ComposerDoc` (with pills), not
just a string, so pills **seed programmatically** and **round-trip** back out on
`kai-submit` / `kai-value-change`.

## Non-goals (explicitly out of scope)

- React wrapper (`@kitn.ai/ui/react`) — out of v1.
- Declarative `<kai-trigger>` / light-DOM seeding.
- Splitting the ~800-line `composer.tsx`.
- Re-rendering on a doc re-assignment whose flattened **text** is unchanged but whose
  **pills** differ (see "Known limitation").

## Interaction-model rationale (settled 2026-06-23)

Pre-population assumes the pill model; that was confirmed with Rob (final model — see the
`composer-pill-model-decision` memory). All inline references are **atomic pills**
(indivisible; can't edit text inside; select/delete/navigate as one unit) with **per-kind
decoration**: skills (`/my-skill`) and agents (`@my-agent`) render LIGHT — like decorated
inline text with the sigil shown, a distinct color each — while **plugins** render as a
distinct chip (composite entity). **Files/images are NOT triggers** — they're added via the
attach button and rendered as today's attachment chips, outside the pill system. A GUI can
afford this richer, atomic treatment where a CLI (Claude Code's terminal `/context`) cannot.

Implication for THIS spec: pre-population stays fully relevant because a pill — skill,
agent, or plugin — can only be seeded through the **doc** path, never a plain string. The
per-kind decoration + sigil + atomic arrow-nav are a separate **pill-decoration** pass
(built first, before this), and tooltips are deferred.

## Why a doc has a different lifecycle than the string

Pills live in the composer's contenteditable **DOM**, not in the `value` string. During
normal typing the controlled value is set to the flattened text (`c.text`), and pills
survive only because the composer's re-render guard sees the text is unchanged and skips
the re-render (`src/components/composer.tsx` ~L349-360 — `on(() => props.value)`, compares
`serializeToText` of incoming vs current DOM). So a `ComposerDoc` value is **not** a
controlled mirror of what is on screen — it is a *seed* that paints pills into the DOM,
after which the DOM owns them.

This is why the chosen contract treats a doc value as a **one-time seed**, while a string
value keeps its existing controlled-mirror behavior.

## Chosen approach (Option A — widen `value`, doc = initial seed)

Selected over (B) fully-controlled doc — which forces the consumer to echo every change
back into `value` or the field freezes/loses pills — and (C) a separate `defaultValue`
prop — cleaner separation but a new prop and a divergence from `<kai-composer>`'s
`value: string | ComposerDoc` shape. Option A matches `<kai-composer>`, matches the
"set value as a doc" framing, and fits how pills already live in the composer DOM.

### Contract

- `value?: string | ComposerDoc` on `<kai-prompt-input>` (set as a JS **property**, like
  all array/object props — never an HTML attribute).
- **String value:** unchanged. Controlled text mirror exactly as today.
- **Doc value:** seeds the composer's pills once on mount (and again whenever a *new* doc
  reference is assigned). After seeding, the user edits freely; the seed does not fight
  edits. The composer owns state from then on.
- **Output is back-compat + carries the seed.** `kai-submit` and `kai-value-change`
  continue to emit `{ value: string, doc: ComposerDoc, entities: EntityRef[] }` (submit
  also carries `attachments`). The `value` field is always the **flattened string** (a
  doc value is serialized via `serializeToText`), so existing string-only consumers are
  unaffected. `doc` + `entities` carry the structured content, including a seeded doc that
  was never edited.

## The value chain (what changes)

The composer already accepts a doc; everything above it is string-typed. Widen each hop:

| File | Symbol | Today | After |
| --- | --- | --- | --- |
| `src/elements/prompt-input.tsx` | `Props.value` | `string` | `string \| ComposerDoc` |
| `src/elements/prompt-input.tsx` | `internal` signal, `current()` | `string` | `string \| ComposerDoc` |
| `src/elements/default-input.tsx` | `DefaultPromptInputProps.value` | `string` | `string \| ComposerDoc` |
| `src/components/prompt-input.tsx` | `PromptInputProps.value`, `internalValue`, context `value: () => …` | `string` | `string \| ComposerDoc` |
| `src/components/composer.tsx` | — | already `string \| ComposerDoc` | unchanged |

`setValue` / `onValueChange` stay `(value: string) => void` — interactive edits always
emit a flattened string (the composer's `c.text`); only the *seed* is ever a doc.

### Element behavior (`src/elements/prompt-input.tsx`)

1. **Seed handling.** A `createEffect(on(() => props.value, …))` that, when the value is a
   non-string (doc), pushes it into `internal` and seeds `lastChange`:
   `lastChange = { doc, text: serializeToText(doc), entities: entitiesOf(doc) }`. This
   makes a submit-without-edit emit the seeded `doc` + `entities` (today `lastChange`
   starts empty, so it would emit nothing).
2. **`current()` resolves seed vs. controlled correctly.** A string `value` stays
   controlled (`props.value` wins). A doc `value` is a seed, so after the user edits, the
   live string in `internal` must win. Concretely: `current()` returns `props.value` when
   it is a string, otherwise `internal()` (which holds the seed doc until the first edit
   replaces it with the live string). This avoids the controlled-component footgun where a
   stale seed doc would stomp the user's edits.
3. **Output serialization.** Wherever the dispatched `value` field is derived from
   `current()` (submit), serialize: `serializeToText(normalizeValue(current()))` so a
   pre-edit seeded doc still emits a string `value`. `handleChange(v)` already receives a
   string and already preserves the pill `doc` via the existing `onComposerChange`-first
   ordering (`lastChange` is set before the string `value-change` fires; the
   `v !== lastChange.text` guard keeps the full doc) — keep that intact.

### Component behavior (`src/components/prompt-input.tsx`)

- Widen `PromptInputProps.value`, `internalValue`, and the context `value` getter to
  `string | ComposerDoc`. `PromptInputTextarea` passes `ctx.value()` straight to
  `<Composer value={…}>`, which already handles both.
- `DefaultPromptInput.sendDisabled()` uses `props.value.trim()` — must handle a doc:
  compute emptiness from the flattened text, e.g.
  `!serializeToText(normalizeValue(props.value)).trim()` (or reuse `docIsEmpty`). The
  send button must enable when a seeded doc is non-empty even before any edit.

## Pure model helpers

No new model functions are strictly required — `normalizeValue`, `serializeToText`,
`entitiesOf`, `docIsEmpty` (all in `src/primitives/composer-model.ts`) cover seed →
text/entities. The model-level TDD locks the **round-trip invariants** the wrapper relies
on, in case a future refactor changes them:

- `serializeToText(normalizeValue(doc))` flattens a seeded doc to the expected prompt text
  (entity → `promptText ?? label`).
- `entitiesOf(normalizeValue(doc))` returns the seeded pills in order.
- `docIsEmpty` is false for a doc that contains only an entity (so a pill-only seed enables
  send).

## Known limitation (documented, not fixed)

Re-assigning a doc whose flattened **text** equals the currently-rendered text but whose
**pills** differ will **not** re-render (the composer guard compares `serializeToText`).
This is a real-world edge case; complicating the guard to a structural compare risks
stomping the live caret during interactive editing (the guard is load-bearing for that).
Documented here and in the prop JSDoc. Revisit only if a consumer hits it.

## Testing

Follow TDD; verify everything contenteditable-related in a **real browser** (jsdom cannot
reproduce shadow-DOM/contenteditable behavior — the project's hard-won lesson).

1. **Unit (jsdom) — pure model round-trip.** Extend the composer-model tests with the
   seed-invariant assertions above. Fast, deterministic.
2. **Unit (jsdom) — element/component wiring (type + serialization).** Assert the widened
   `value` flows and the emitted `value` field is a string when a doc is set. (jsdom proves
   the data plumbing, NOT the rendered pills.)
3. **Playwright IVP — the real guarantee.** New spec (extend
   `tests/e2e/promptinput-pills.spec.ts` or a sibling) that, on a story seeding a
   `ComposerDoc` on `<kai-prompt-input>`:
   - the seeded **pills render inline** with the surrounding text;
   - **submit without editing** → `kai-submit.value` is the flattened string and
     `kai-submit.entities` contains the seeded pills;
   - **edit then submit** (type more text, optionally insert another pill) → `value`
     reflects the edit and `entities` includes both seeded and inserted pills;
   - the seed does **not** fight edits (typing after the seed is preserved).
4. **Story.** Add a "Prefilled (pills)" story in `src/elements/prompt-input.stories.tsx`
   seeding a doc, for the demo and as the IVP target.

## Verification gates (must all pass, in isolation)

- `npm run typecheck` (4 passes).
- `npx vitest run src/**/composer* src/components/default-input.test.tsx` + the model tests.
- `npm run test:composer-ivp` (≥10 pass).
- `npx playwright test --config playwright.promptinput.config.ts promptinput-pills` (was 5;
  +new seeded-pill assertions).
- `npm run build` then `git checkout -- src/components/component-meta.json`.
- Kill stray storybook (`pkill -f storybook`) before any full run to avoid browser
  contention flakes.

## Risks / watch-items

- **The element `current()` change** is the subtle bit — it must not regress controlled
  *string* behavior (clear-after-submit, controlled host owns text). Cover with the
  existing behavior IVP (`promptinput-behavior.spec.ts`) staying green.
- **Pixel parity** is unaffected (no DOM-structure change), but re-run a screenshot if the
  story layout changes.
