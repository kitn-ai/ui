# The composer: two states, a tools menu, and opt-in chips — design (2026-09-26)

> **Approved sections:** 1 (the two states), 2 (the `+` tools menu), 3 (capability
> state) and 4 (the public surface) were presented in session and approved. Three
> owner rulings landed after that presentation — see §12 — and one simplification
> is recorded there rather than silently applied.
>
> This document covers **spec 1 of 2**. The voice and microphone-device work is a
> separate subsystem with its own failure modes and gets its own spec; §6 records
> the one place the two touch.

## 1. Purpose, and the binding intent

The owner's words, which this round treats as the goal:

> the prompt is, by default, in this collapsed state, and you can type in it. As
> long as there's one line, it stays in that single-line state. As soon as there's
> more than one item or an attachment, it enters the state we're in now.

> the + should be a menu now — and I think the dev would be able to choose how it
> works and looks like.

> If we were to provide one as the default for this block template we're creating,
> I would go with the Claude Code version.

> It's really composition versus configuration, and I know we're going for
> composition.

The intent behind it: the assistant block is the template, and a developer's first
impression of the template is its composer. So the composer has to be the thing a
developer already knows how to use — one control on the left that opens
everything, submission on the right — rather than a kit-specific arrangement they
have to learn.

Two references were provided as screenshots and are treated as the target: a
collapsed single row (roughly 56px tall, the frame reading as a pill) that expands
to a text row plus a control row the moment the text wraps or an attachment is
staged, and a `+` menu whose items carry icons, muted descriptions, submenus,
dividers, section labels, checkmarks, switches and shortcut hints.

## 2. What we measured (today's shape, not assumed)

**2.1 The composer is always two rows.** The frame is
`bg-surface cursor-text rounded-xl p-2 shadow-xs`
(`components/prompt/prompt-input.tsx:84`); the editable is `min-h-[44px] pt-3 pl-3`
(`components/prompt/default-input.tsx:262`); the control row below it is
`mt-2 flex w-full items-center justify-between gap-2 px-3 pb-0` (`:263`). At one
line of text that is roughly 96px tall against the reference's ~56px, because the
controls never share the row the text is on.

**2.2 The mic is on the wrong side.** `voice?: boolean` renders a Mic button in the
**leading** cluster, beside the paperclip and the web-search chip (`:320`). The
trailing cluster holds only the `toolbar-end` slot and Send (`:357`). Both
references put submission and voice on the trailing edge and input affordances on
the leading edge.

**2.3 The attachments band is already right.** Staged attachments render as an
inline band **above** the editable (`:230`, `px-3 pt-3`), which is what the
reference does. Nothing to change; it is called out so it is not "fixed" later.

**2.4 The menu machinery already exists.** `<kai-menu>` renders a tree of
`KaiMenuItem` and already supports submenus, checkbox items, radio groups,
separators, section headings, named and image icons, shortcut hints and a reserved
trailing column (`web-components/menu/menu.tsx:99`, the priority ladder;
`components/dropdown/dropdown.tsx:415`, the `w-8` trailing column).
`Switch` already exists (`components/switch/switch.tsx:41`). The `+` menu is
therefore **composition over an existing component**, not a new one.

**2.5 `--radius-pill` is not the reference radius.** The token is `4rem` and CSS
clamps a radius to half the box (`theme.css:243-245`). So at 56px tall the pill token
and the reference's ~28px render identically, but on a ~104px two-line box the
pill token is still fully round while the reference reads as a card. The
reference is a **fixed** radius that happens to equal half the collapsed height.
The composer therefore needs its own token (§3.3); `rounded-pill` would produce
exactly the "and then it changes" behaviour the owner asked us not to build.

**2.6 Nothing consumes this yet** (owner, 2026-09-26). Breaking changes below are
free, and §12.3 records one simplification that ruling unlocked.

**2.7 The composer does not measure its own content.** Auto-grow is native to the
`contenteditable` and is only *capped* by `max-height`
(`components/composer/composer.tsx:1070`); nothing in the composer reads
`scrollHeight`, and there is no autosize pass to piggyback on. The kit does own the
primitive that reports a content height — `observeContentHeight`
(`primitives/use-resize-observer.ts`) — so §3.3 is built on that rather than on a
measurement this document had assumed existed.

## 3. The two states

### 3.0 The geometry, measured from the references

The owner asked for the padding to match the screenshots "so it looks like them".
Rather than eyeball it, the screenshots were decoded and their element geometry
measured (`sharp`, greyscale, surface-band and bright-run detection, in
`.superpowers/sdd/<this plan>/geom.cjs`). The screenshots are 1x — the send button
measures 28px in every one of them — so the numbers below are CSS pixels.

| measured | ChatGPT | Claude Code | our target |
|---|---|---|---|
| collapsed row height | 44px | **48px** | 48px |
| leading inset, to the first control | 11px | **18px** | 18px |
| trailing inset, from the last control | ~4–8px | **14px** | 14px |
| control size | 28px | ~32px | 28px (the kit's `icon-sm`) |
| vertical padding around a 28px control | 8px | 10px | 10px |
| gap between trailing controls | 8px | — | 8px |
| gap, leading control to the text | 13px (ink) | 19px (ink) | 8px of box gap |
| expanded: top pad, box to the text line box | ~14px | — | 14px |
| expanded: line advance | 21px | — | the editable's own line-height |
| expanded: text block to the control row | ~6px | — | 6px |
| expanded: bottom pad | 8px | — | 10px, the same as the row's |
| attachment chip height | 19px | — | the chip's own |

The two references disagree, and **Claude Code is the one to match** — the owner's
words: "I could see us really replicating what Claude Code looks like in terms of the
padding around the text input". Where Claude's row is 48px with a ~32px control and
the kit has no 32px icon size, the row keeps Claude's 48px and our existing `icon-sm`
carries it with 10px of padding instead of 8 (§12.7). The two ink gaps reconfirm the
8px box gap the trailing cluster already uses: an ink gap of 25–27px between 28px
boxes holding 12–16px glyphs is 8px of gap plus the boxes' own padding.

These are the numbers the implementation uses. They are NOT free parameters — a
hand-typed padding is exactly what produced the previous near-miss.

#### 3.0.1 The insets are derived from the ARC, not from measured ink

The first pass matched the references' measured **ink** positions — 18px leading, 14px
trailing, taken from Claude Code's `+` glyph. That failed the owner's eye, and themeasurement
explains why: **ink position does not transfer when the glyph sizes differ.** The references'
icon ink measures ~12px wide; ours is `size-4`, 16px. Matching the ink put our larger boxes
further in, so the row read as three filled circles inset inside a pill rather than glyphs
belonging to it.

The rule that does transfer is geometric and needs no reference: **the leading and trailing
controls sit centred on the pill's arc.** A 48px row has a 24px arc centre and a 28px control
has a 14px half-height, so the inset is `24 − 14 = 10px` — one value for both ends, in both
layouts, so nothing shifts when the composer expands. It should land within a pixel or two of
ChatGPT's measured leading ink (11px) once the glyph's own inset is counted, which is the
cross-check that the rule is right.

**Two chrome decisions that come with it:**

- **The composer's icon controls are bare glyphs, not filled boxes.** `Button`'s `outline`
variant is `bg-muted/50`, a visible fill, and three of those inside a pill is the "too much
padding" the owner saw. They take `subtle` — muted ink with a hover fill — which is what both
references use. Only Send stays filled.
- **The microphone moves to the trailing cluster, immediately before Send** (§6.5). It shipped
in the leading cluster because no task carried the step; both references put voice beside
submit, and it is the same `voice` prop's rendering that moves.

### 3.1 Collapsed — one line, nothing staged

A single row: the `+` tools trigger at the leading edge, the editable beside it,
then the trailing cluster — the host's `toolbar-end` content, the mic, Send —
sharing that row. The text is **vertically centred on the row**, so the caret sits
on the same line as the buttons, and it adds no inset of its own: the row's padding
IS the text's inset (§3.0: 18px leading, 14px trailing, 10px vertical around a 28px
control, 48px tall).

The collapsed row is not a separate component and not a mode a host selects. It is
the same box with one row in it.

### 3.2 Expanded — the text wrapped, or something staged

When the editable exceeds one line, or at least one attachment is staged:

- The editable occupies the full width on its own line, at the top, 14px below the
  box's top edge and sharing the row's 18px leading inset, so the paragraph and the
  buttons under it start on one edge.
- The control row follows the text block after 6px, and the box closes with the same
  10px the collapsed row uses.
- The radius, the background, the border and the focus ring are unchanged. Only the
  layout, the height and the padding's distribution change.

### 3.3 The trigger is derived

The composer currently measures nothing (§2.7), so the one-line question is
answered by observing the editable rather than by assuming a measurement is
already there:

- `observeContentHeight(editable, …)` — the existing primitive — reports the
  editable's content-box height. Its built-in 1px hysteresis is what stops a
  sub-pixel reflow from flipping the layout.
- The line height is read from the editable's own computed style, so a theme that
  changes the prose size moves the threshold with it instead of leaving a
  hand-typed number behind.
- The decision itself is a **pure function** of `(pinned, contentHeight,
  lineHeight, attachmentCount)`, which is what makes it unit-testable; the observer
  only supplies inputs.

The rule:

```
pinned !== undefined  → that value
attachmentCount > 0   → expanded
contentHeight > lineHeight × 1.5  → expanded
otherwise             → collapsed
```

The factor is 1.5 rather than 1 so a trailing descender and rounding do not read as
a second line. An empty editable with a placeholder is one line tall, so the box
starts collapsed — which is the default the owner asked for.

### 3.4 The radius

One token, fixed, defaulting to **24px**, following the theme's existing knob
convention (`--kai-radius-composer`, resolved like `--kai-radius`). **The knob's name is not
free**: a rung must wire the knob *of its own name* — `--radius-pill` wires
`--kai-radius-pill`, and this one wires `--kai-radius-composer` — because that pairing is
what the Token Reference's derivation keys off to decide a rung exists. A rung whose knob is
named anything else drops silently out of the table.

- 24px is **half the measured collapsed row** (§3.0: 48px), which is the whole
  reason the collapsed box reads as a pill — and it is derived from that row height
  rather than chosen, so the two cannot drift apart.
- The token must **not** be derived from the pill rung, for the reason in §2.5.
- The expanded box reads as a card because the same 24px is not half of its height.
  That is the whole of the effect; there is no per-state radius and no variant.

### 3.5 The dev's choice: a pinned layout

The derived rule is the default, not the only option. `expanded?: boolean` pins it:

| `expanded` | Behaviour |
|---|---|
| omitted | The derived rule (§3.3) — collapsed whenever the content fits one line |
| `true` | Always two rows, whatever the content — the shape the composer has today |
| `false` | Always one row, whatever the content. The editable still grows with its content up to `maxHeight`, and scrolls past it — the pin chooses the ARRANGEMENT, not the height |

When the layout is pinned the derived rule does not run at all, which is what makes
it predictable: nothing a user types moves the box's ARRANGEMENT — one row stays one row.

**The height is a separate axis and stays content-driven.** The first version of this
section said a pinned `false` meant "the editable scrolls inside the box instead of the box
growing", and the browser probe measured that as false: three lines in a pinned-one-row
composer gave an 80px frame, not 48. What the pin fixes is which of the two arrangements is
in force; how tall the box is still follows the content, up to the editable's `maxHeight`,
and only past that does it scroll. That is true in both layouts, which is why the table
above states an arrangement and not a height.

This is the owner's ruling (§12.6), taken against the alternative of a
mount-time seed. The seed was rejected because it would have needed a second rule
saying when it stops applying — an empty composer told to *start* expanded would
otherwise collapse under the user on the first keystroke.

**The element cannot read this with `flag()`.** `resolveFlag` returns `false` for
both an absent attribute and an explicit `expanded="false"` (`define.tsx:339-341`),
so it collapses the third state. The facade reads attribute **presence** plus the
raw prop:

```
raw === true   → pinned two rows
raw === false  → pinned one row
attribute present → attribute !== 'false'
otherwise      → undefined, i.e. derive
```

`expanded` is a plain boolean and therefore a legal **attribute** as well, unlike
`tools` — no non-scalar entry. Pinning to one row from markup is the property form
(`el.expanded = false`), which is how every other tri-state flag in the kit is set.

### 3.6 Out of scope, deliberately

The expand-to-full-viewport glyph and the full-screen canvas it opens (reference
shot 4) are an application surface, not a composer state. The existing top slot is
where a host places such a control.

## 4. The `+` tools menu

### 4.1 The trigger and the surface

The trigger is a `+` icon button at the leading edge of the control row. It opens a
`<kai-menu>` — the composer renders one, so focus handling, Escape, outside-click,
submenu hover and arrow-key navigation come from the component that already
implements them.

### 4.2 The default tree

Rendered in this order:

1. **"Add files or photos"**, present only when attachments are enabled (`attach`),
   wired to the existing picker, `accept` filter and rejected-file reporting. A
   separator follows it when the tree continues.
2. **`tools`**, verbatim.

The built-in item is prepended rather than declared so that `attach` keeps behaving
today as it does — one flag, one working picker — and so a host cannot end up with
a file picker that is not wired to the composer's own filtering.

### 4.3 Groups and separators are flat, and already supported

A group is a section label followed by its siblings — `{ heading: true, label }` —
and a divider is `{ separator: true }`. There is no group container, which is what
keeps `items` unambiguous: `items` can only ever mean "submenu". The renderer
recurses, so submenus carry their own headings and dividers.

One consequence to write items against: the ladder keys off `checked !== undefined`,
so a toggle that is currently **off** must pass `checked: false` to keep its column
reserved. Omitting the field renders a plain item and the label shifts.

### 4.4 Three additions to `KaiMenuItem`

| Field | What it renders | Why |
|---|---|---|
| `description?: string` | A muted second line under the label | The reference's "Create image — Visualize anything" |
| `control?: 'check' \| 'switch'` | The trailing glyph, default `check` | The reference's connector switch |
| `note?: true` | A non-interactive muted text row (`label`) | A disabled group's reason, e.g. "not available on your plan" |

`control` is a field on one item rather than a new item kind because the row is
identical either way: same trailing column, same `checked`, same emitted event,
same rule that the menu stays open. Only the glyph differs.

**The switch is decoration.** The row keeps `role="menuitemcheckbox"` and
`aria-checked`; the switch renders `aria-hidden`, is not focusable and ignores
pointer events. A real focusable `<Switch>` inside a menu item is nested
interactive content — the same thing this component's own docs forbid when they
refuse a slotted `<button>` in a trigger.

### 4.5 What selecting an item does

It emits the same selection event the menu already emits, and the composer
re-emits it upward. The kit's involvement stops there. Toggling a capability,
opening a modal, inserting text, opening a plugins pane: all host decisions. The
reference's plugins modal therefore needs nothing from the kit.

### 4.6 Replacing the menu

The leading slot that exists today still takes an arbitrary node, so a host that
wants a different control, or no menu at all, is one slot away. `toolbarActions`
(`CustomAction[]`) continues to render visible buttons for hosts that prefer them;
the same action declared as a `tools` item instead appears in the menu. Both paths
stay supported and nothing migrates by force.

## 5. Toggled items, and their chips

### 5.1 One field is the state

`checked` **is** the capability state — the same field the menu renders. The
composer holds no state: it renders the array it was given and reports what was
clicked, so the checkmark inside the menu and the chip in the composer cannot
disagree, because they read the same field.

### 5.2 The chip is opt-in

An item renders a chip in the control row when it is `chip: true` **and**
`checked: true`. `chip` defaults to **false** (owner ruling, §12.1), so the kit's
default is quiet and the block template opts in explicitly for the capabilities it
wants to remind about.

Chips render in declaration order, beside the `+`. Clicking one turns that item off
— the same event, not a separate removal path.

### 5.3 A chip does not force the composer open

It competes for width like any other control. If the text still fits one line the
box stays collapsed with the chip beside the `+`; if the chip pushes the text to
wrap, §3.3 expands it. The same trigger, not a special case.

### 5.4 Accessibility

The chip's visible text is its name and its action is removal, so the accessible
name must **contain** the visible text — "Web search, turn off", not a bare
"Remove". The same rule the menu's own docs already cite for its trigger.

## 6. The public surface

### 6.1 Types

```ts
// menu side, in web-component-data-types.ts where KaiMenuItem already lives
interface KaiMenuItem {
  // …existing fields unchanged…
  description?: string;
  control?: 'check' | 'switch';
  note?: true;
}

// composer side — the one composer-only field, so the menu's own type stays honest
type ComposerToolItem = KaiMenuItem & { chip?: boolean };
```

`chip` lives on the composer's type rather than on `KaiMenuItem` because
`<kai-menu>` ignores it; a menu-side field that only one caller reads is the kind
of thing that later gets "implemented" by someone who assumes it works.

### 6.2 Props

| Where | Prop | Notes |
|---|---|---|
| `DefaultPromptInput` / `ChatThread` (Solid) | `tools?: ComposerToolItem[]` | Appended after the built-in file item |
| `<kai-chat>` **and** `<kai-prompt-input>` | `tools` | **JS property, never an attribute** — it is an array, so it must be listed in `web-component-nonscalar.json`. Both elements carry it: `kai-prompt-input` is the standalone composer and takes the same surface |
| `DefaultPromptInput` / `ChatThread` / both elements | `expanded?: boolean` | Pins the layout (§3.5); omitted ⇒ derived. A scalar, so an attribute is legal — but see §3.5 for why the element cannot read it with `flag()` |

Unchanged and deliberately so: `attach`, `accept`, `onAttachmentsChange`,
`onAttachmentsRejected`, `submit`, `stoppable`, `toolbarActions`, `onAction`,
`voice` (§6.5).

### 6.3 Events

**One event, and deliberately the menu's own name**, so a consumer wires the same
handler shape whether the item was chosen in a menu or in the composer. Both
elements fire it, because both carry the surface (§6.2):

```
kai-select   { id: string, checked?: boolean }   // checked present ⇒ the item is a toggle
```

**Removed, with no alias** (owner ruling, §12.2): `webSearch`, `onWebSearch`, and
the `kai-web-search` event. With this change a capability is an item like any
other, so a second way to declare one would mean a merge rule to decide which wins
— exactly the drift §5.1 removes by having one field.

The visible consequence for anything using those props today: the paperclip and
the "Search" pill stop rendering as buttons and become menu items, and the mic
moves (§6.5).

### 6.4 Generated artifacts

`web-component-meta.json`, the shipped `.d.ts`, the React wrappers,
`llms-full.txt` and the docs tables are all regenerated by `build:api`. The two
additions that cannot be derived — `tools` on `kai-chat` in
`web-component-nonscalar.json`, and the new radius token in the theme — are
hand-written and are named here so they are not forgotten.

**A new theme token is not one edit.** It has four dependents, and missing any of them is a
red suite that a narrow test run will not show:

1. the theme editor's catalog (`src/themes/theme-tokens.ts`), **and** the studio's own
   wiring — a catalogued knob with nothing behind it fails its own test, and a default that
   is not a plain rem literal needs the studio to be able to parse it at all;
2. the Token Reference's table (`src/stories/docs/theme-tokens.tsx`), which admits a rung
   only when it wires a knob of its own name (§3.4);
3. the generated catalog (`node scripts/gen-catalog.mjs`) — regenerated, never hand-edited;
4. the class-merger oracle (`src/utils/cn-merge.drift.test.ts`): a new `rounded-*` utility is
   in that conflict group, and the oracle is a different implementation that has to be told.

Prove a token change against the **full** unit suite. The narrower sweep is how these stayed
invisible: they were found only when the file count went from 212 to 443.

### 6.5 The mic, for now

This spec moves the mic from the leading cluster to the trailing cluster beside
Send and **does not wire it**. It keeps firing its existing event. Wiring it to
real recording, transcription and device selection is spec 2, which is also where
`voice` gets its final shape. The two specs touch here and nowhere else.

## 7. In-tree changes this forces

Everything below asserts on the old shape and must move with it:

- Stories: the prompt input, composer and chat stories that show the paperclip,
  the "Search" chip or the two-row box.
- Docs: the input and composer pages, plus `llms-full.txt` and the React wrapper
  tables (generated).
- The block driver's assistant baseline, re-recorded, because the composer changes
  shape.
- Any in-repo template or example that sets `web-search` or listens for
  `kai-web-search`.

## 8. What the block template uses

- The built-in "Add files or photos", from `attach`.
- Web search as its own `tools` item with `chip: true`, so the template ships the
  reminder behaviour while the kit's default stays quiet.
- The model picker stays in the `toolbar-end` slot.
- The mic moves beside Send and is wired in spec 2.
- The block declares its remaining tools in `tools` — that is the part that makes
  it a template rather than a demo.

## 9. Testing

- **Unit:** the expansion resolver as a pure function (each pinned value, the
  attachment case, one line, two lines, and the boundary either side of the 1.5
  factor); the assembled tree (built-in item first, `tools` verbatim, the separator
  rule);
  `control: 'switch'` vs the default check; a toggle's column being reserved by
  `checked: false`; the menu staying open on a toggle; a chip's accessible name
  containing its visible text; and that a checked-and-chip item renders a chip
  while a checked item without `chip` does not.
- **Unit, the pinned layout:** all three states, including that a pinned `false`
  keeps one row while the text wraps, and that the element reads *absent*
  differently from an explicit `false` — the case `flag()` cannot express, so it
  gets its own test rather than a comment.
- **A real-browser probe, not jsdom**, for the one claim jsdom cannot check: that
  the collapsed box is a single row and the expanded box is two. The repo already
  has this pattern for the resizable and workspace shells; without it the geometry
  assertion would pass on a component that renders nothing.
- **The block driver baseline**, re-recorded.

## 10. Non-goals

- The expand-to-full-viewport control and its canvas (§3.5).
- The plugins pane and any other modal a menu item opens (§4.5) — the host's.
- Voice recording, transcription and device selection (spec 2).
- Any change to the bare `<kai-composer>` element, which is the editable and is
  not where any of this lands.

## 11. Sequencing (proposal)

1. `KaiMenuItem`'s three fields plus the menu facade's mapping, with their unit
   tests — independent of the composer and shippable alone.
2. The composer's two states and the radius token.
3. The `+` trigger, the assembled tree and the `tools` prop.
4. Chips, and the removals in §6.3.
5. Stories, docs, baselines, and the block template's own `tools`.

## 12. Decisions of record

| # | Ruling |
|---|---|
| 12.1 | **`chip` defaults to `false`** (owner). The kit's default is quiet; a host opts in per capability. |
| 12.2 | **Breaking changes are free** — nothing consumes the kit yet (owner). Hence one event, no aliases, and the removals in §6.3. |
| 12.3 | **Simplification: one array, not an array plus sugar.** The chat design carried a `capabilities` array *and* a `webSearch` boolean as sugar, with a merge-by-id rule for when both named the same capability. With no consumers (12.2) that rule buys nothing, so `tools` is the single array, `checked` is the single state field (§5.1), and `webSearch` is removed rather than aliased. |
| 12.4 | **Claude Code's menu is the template's default look** (owner), with ChatGPT's removable chip as the capability reminder (owner, "both"). |
| 12.5 | The two references are targets, not specifications: where they differ, the kit's own conventions decide. |
| 12.6 | **The dev chooses the layout and it stays chosen** (owner, after seed-versus-pin was put to them as §3.5). `expanded` pins two rows or one row; omitted derives. The mount-time seed was rejected because it needed a second rule for when it stops applying. Default — omitted — is collapsed whenever the content fits one line, which the owner called the cleaner look. |
| 12.7 | **The geometry comes from the references, measured, and Claude Code's wins where they disagree** (owner: "replicate what Claude Code looks like … the padding around the text input"). The kit has no 32px icon size, so the 48px row is carried by the existing `icon-sm` with 10px of padding rather than Claude's 8px around a 32px control. Cost if wrong: our controls read slightly smaller inside a correctly-sized row; one class fixes it. |
| 12.8 | **The `expanded` pin fixes the ARRANGEMENT, not the height** (probe-measured, 2026-09-26). A pinned-one-row composer with three lines measured 80px, not the 48 that a "scrolls instead of growing" reading predicts. Cost if wrong: a host expecting a fixed-height one-row composer must cap `maxHeight` themselves — the same lever they already have. |
