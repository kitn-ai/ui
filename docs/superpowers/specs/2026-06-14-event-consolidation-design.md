# Design — event-API consolidation (feedback-bar + conversation-select) (2026-06-14)

Two **breaking** event consolidations from the event-surface survey, approved by Rob.
Both follow the kit's existing conventions: **element CustomEvent names = all-lowercase,
no separators** (like `messageaction`/`sidebartoggle`); **detail keys = camelCase**;
**discriminant value strings = kebab-case for multi-word** (like the `task-list` card type);
**Solid callback props = readable camelCase `onX`**. Pre-1.0 (`@kitn.ai/chat`), so breaking
is fine — lands as a future `0.X.0` minor. NEVER cut 1.0 (see version policy).

> **Dropped from the survey: the `kc-conversations` `togglesidebar → sidebartoggle{collapsed}`
> rename.** Grounding it in the code showed `kc-conversations` does NOT own the collapse
> state — `src/elements/conversation-list.tsx:38` just `dispatch('togglesidebar')` as a
> *toggle request*; the host/`kc-workspace` does the collapsing. It has no `collapsed` to
> report, so `{collapsed}` would be a misleading payload. `kc-workspace.sidebartoggle{collapsed}`
> is a genuine *state-change*; `kc-conversations.togglesidebar` is a *request* — they're
> legitimately different. Left as-is.

## ① feedback-bar — `helpful` + `nothelpful` → one `feedback` event

The flagged case. Two mutually-exclusive void events (the user rated this) become one event
with the value. Mirrors `kc-message`'s already-consolidated `messageaction { action }`.

**Current**
- `src/components/feedback-bar.tsx` — `FeedbackBarProps`: `onHelpful?: () => void`,
  `onNotHelpful?: () => void`, `onClose?: () => void`. The thumbs-up button
  `onClick={props.onHelpful}` (line ~32), thumbs-down `onClick={props.onNotHelpful}` (~40).
- `src/elements/feedback-bar.tsx` — facade `Events`: `helpful: void`, `nothelpful: void`,
  `close: void`; the facade maps the Solid callbacks to `dispatch('helpful')` / `dispatch('nothelpful')`.

**Target**
```ts
// Solid component (src/components/feedback-bar.tsx)
export type FeedbackValue = 'helpful' | 'not-helpful';
interface FeedbackBarProps {
  onFeedback?: (value: FeedbackValue) => void;   // replaces onHelpful + onNotHelpful
  onClose?: () => void;                           // unchanged
  // …existing layout/class props…
}
// thumbs-up button → onClick={() => props.onFeedback?.('helpful')}
// thumbs-down button → onClick={() => props.onFeedback?.('not-helpful')}

// Element facade (src/elements/feedback-bar.tsx)
interface Events {
  feedback: { value: FeedbackValue };   // replaces helpful + nothelpful
  close: void;                          // unchanged
}
// wire: onFeedback={(value) => dispatch('feedback', { value })}
```
- Keep `close`/`onClose` exactly as-is (dismiss ≠ rate).
- `FeedbackValue` (`'helpful' | 'not-helpful'`) is a string union (kebab for the two-word
  one) so a future neutral/star rating is additive, not breaking. Export the type from the
  barrel.

## ② conversation-select — element event `select` → `conversationselect`

`kc-conversations`' element event `select { id }` is renamed to `conversationselect { id }`
to (a) match `kc-workspace`'s existing `conversationselect { id }` event and (b) stop
overloading the bare `select` name (also used by `kc-checkpoint`/`kc-file-tree`/`kc-suggestions`).
Same payload — **a pure rename at the element/event layer.**

**Current** (`src/elements/conversation-list.tsx:36`): `onSelect={(id) => dispatch('select', { id })}`,
facade `Events`: `select: { id: string }`.
**Target:** facade `Events`: `conversationselect: { id: string }`; wire
`onSelect={(id) => dispatch('conversationselect', { id })}`.
- **Leave the Solid `ConversationList` component prop `onSelect` unchanged** — it's already
  unambiguous within the component, and the kit already maps Solid `onX` → a differently-named
  element event elsewhere (e.g. Solid `onToggleSidebar` → element `togglesidebar`). Only the
  element-facing event name changes.

## Files to change

- `src/components/feedback-bar.tsx` — props + button wiring (①).
- `src/elements/feedback-bar.tsx` — `Events` + facade wiring (①).
- `src/elements/conversation-list.tsx` — `Events` + dispatch name (②).
- `src/index.ts` — export `FeedbackValue` (and any renamed type) from the barrel.
- **Consumers** (update every reference — grep first): `src/components/feedback-bar.stories.tsx`,
  `src/elements/feedback-bar.stories.tsx`, `src/elements/catalog.stories.tsx` (uses
  `onHelpful`/`onNotHelpful`), `src/elements/conversation-list.stories.tsx`, the composed
  shell `src/elements/chat-workspace.tsx` (if it listens for `kc-conversations` `select`),
  and any `examples/*` that wire these (grep `onHelpful|onNotHelpful|'select'` on kc-conversations).
- Regenerate (`npm run build`): `element-meta.json`, `element-types.d.ts`, the React wrapper
  (`onHelpful`/`onNothelpful` → `onFeedback`; `onSelect` for kc-conversations → `onConversationselect`),
  `llms*.txt`, `component-meta.json`. (orchestrator runs/commits the regen, or the implementer
  in a `chore(build)` commit.)

## Tests

- Update/add to `tests/elements/` + `tests/components/`: feedback-bar — clicking thumbs-up
  emits `feedback` with `value:'helpful'` (and the bubbling/dispatch contract), thumbs-down
  → `value:'not-helpful'`, `close` unchanged; conversation-list — selecting a conversation
  emits `conversationselect` with the id. Mirror the existing feedback-bar / conversation-list
  tests (rename assertions). Update any test asserting the old `helpful`/`nothelpful`/`select`
  names.
- Stories must keep passing the gated a11y suite (`a11y.test:'error'`, 0 violations).

## Gate

`npm run build` (39 elements unchanged; regen idempotent) + typecheck + `npm test` +
`npm run test:react` + `npm run test:storybook` (0 a11y violations) + the composable a11y
audit. This is breaking for consumers → a CHANGELOG-worthy `feat!`/`refactor!` (still a
minor bump pre-1.0).

## Out of scope

- ② sidebartoggle (dropped, above). ④ voice-input merge (disjoint payloads — leave separate).
- The broader Solid-camelCase vs element-lowercase prop divergence (e.g. `onNotHelpful` vs
  `nothelpful`) — a much larger sweep; not now.
