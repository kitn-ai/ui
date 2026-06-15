# Element capability gaps — audit (2026-06-15)

Found by a 12-analyst audit of the Example/Pattern demos vs. the `kc-*` elements
(see the [[components-prop-driven-not-css]] principle: behaviors must be
prop/payload-driven, not CSS/composition/shadow-piercing). **38 real gaps**
(behaviors a demo shows that the element cannot express). This is its own effort,
**separate from the #26 docs branch** (which ships as-is).

## Recurring cross-element themes (design these as coherent features)

These repeat across elements — design one shape, apply consistently:

1. **`actionsReveal: 'always' | 'hover'`** — `kc-message` (×3, high) + `kc-chat` (high).
   The element owns the show-on-hover affordance instead of consumers writing
   shadow-piercing CSS / wrapping in a `group` div. **= the original A1, and it recurs.**
2. **Avatar in the message payload** — `kc-message` (×3, high). Every message-row
   demo hand-adds an avatar because the payload has no field. Fix:
   `message.avatar?: { src?, fallback?, alt? }`.
3. **Custom action / icon descriptors** (replace fixed enums with data) —
   `kc-message` actions (Share/Bookmark beyond the 5-value enum), `kc-prompt-input`
   + `kc-chat` toolbar actions, `kc-checkpoint` icon, `kc-empty` icon,
   `kc-chain-of-thought` step icon. Fix: one shape `{ id, label, icon }` (named
   built-in icons), id echoed in the event detail.
4. **Streaming / markdown content** — `kc-response-stream` needs `markdown`
   (today it streams literal markdown characters — high); `kc-message` needs a
   `streaming` content mode.

## Per-element gaps (high → low)

### kc-message (15 — 7 high)
- **high** `actionsReveal` hover/always · custom/extra actions in payload ·
  `streaming` content mode · **avatar** in payload (×3 across examples).
- **med** per-action transient state (copy→check) · opt-in `feedbackBar` prop ·
  `pending`/`loading` message (loader+shimmer) · inline `sources` in the message
  payload · `measure`/maxWidth (borderline layout) · custom action entry.
- **low** `bubble` style (plain/rounded) — borderline layout.

### kc-prompt-input (6 — 2 high)
- **high** `stoppable` + `stop` event (cancel a stream from the input) · `actions`
  payload for custom toolbar buttons.
- **med** `loadingText`/`statusLabel` (+ loader variant) · (dup) custom actions.
- **low** `searchLabel`/`voiceLabel` pills · `density`/`size` compact.

### kc-response-stream (3 — 1 high)
- **high** `markdown` rendering. **med** `proseSize`. **low** expose
  `fadeDuration`/`segmentDelay`/`characterChunkSize`.

### kc-chat (3 — 1 high)
- **high** `actionsReveal` (same pattern, bubbles to the top-level).
- **med** input `toolbarActions` payload · `inputAttachments` (seed/control) + event.

### kc-chain-of-thought (2 — 1 high)
- **high** per-step `icon` in the `steps` shape. **low** `markdown` for step content.

### kc-sources (1 — high)
- **high** `numbered` citation labels ([1][2][3]) — the core visual.

### Lower-severity, element-specific
- **kc-context** (3, low): `warnThreshold`/`dangerThreshold` payload fields +
  `thresholdchange` event + `triggerLabel` display mode. (The green/yellow/red
  severity is currently not payload-driven.)
- **kc-suggestions** (2): grouped suggestions w/ section headers (med) · `align`/wrap (low).
- **kc-checkpoint** (1, med): `icon` control.
- **kc-empty** (1, med): named-icon `icon` prop for the media visual.
- **kc-scroll-button** (1, med): **there is no `kc-scroll-button` element** — it
  exists only as a SolidJS primitive. A missing element, not just a missing prop.

## Notes / judgment calls

- A few low-severity items border on the page-scaffolding we said to ignore
  (`measure`/maxWidth, `bubble`, suggestion `align`) — these are debatable as
  "the component's job"; flag for human judgment, don't auto-build.
- `kc-context` thresholds: arguably the green/yellow/red *should* be payload-driven
  (it's a meaningful state, not cosmetics) — worth a decision.

## Suggested sequencing (by theme, high-value first)

1. **Reveal** (`actionsReveal` on kc-message + kc-chat) — A1, approved, recurring, quick.
2. **Avatar payload** (kc-message) — high, clearly missing, recurring.
3. **Custom action/icon descriptors** — biggest theme; one `{id,label,icon}` shape
   across kc-message / kc-prompt-input / kc-chat / kc-checkpoint / kc-empty / kc-chain-of-thought.
4. **Streaming/markdown** (kc-response-stream markdown; kc-message streaming).
5. Element-specific high: kc-sources `numbered`; kc-prompt-input `stoppable`.
6. Decide on the low/borderline + the missing `kc-scroll-button` element.

Each theme is a `feat!`-ish additive change (pre-1.0 minor); needs its own spec +
TDD + meta regen. Recommend tackling per-theme, not per-element.
