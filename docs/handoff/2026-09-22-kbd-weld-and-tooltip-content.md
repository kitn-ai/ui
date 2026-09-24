# Handoff -- the Kbd weld, rich tooltip content, and the control-inference class

**Date:** 2026-09-22 · **Branch:** `fix/kbd-weld-and-tooltip-content` · **Status:** the Kbd
iteration the owner asked for is landed (weld + tooltip placement), the tooltip bubble's padding is
matched to the reference by measurement, and the controls question is answered with a derived roster
of what is left. The section/tier question is still DEFERRED.

Read [`2026-09-22-storybook-and-component-sweep.md`](2026-09-22-storybook-and-component-sweep.md)
first: this session iterates on its Kbd section (§3) and its §8 items 1, 2 and 6.

---

## 1. What the owner reported, in order

1. A screenshot pair of the Kbd group: "with kbdgroup, you can see with this image there is no gap.
   right now there is a gap, so its no different than not using the group." The group added a 4px
   gap where the reference shows none, so it read exactly like a row of separate `Kbd` elements.
2. "yeah we should be able to place there anywhere, like in a tooltip too." `TooltipProps.content`
   was a `string`, so no `Kbd` could go in a tip.
3. A second screenshot pair, tooltips over buttons: theirs is "uniformly spaced around the edges",
   ours is "kind of fat on the left and right sides and skinnier at the top and bottom".
4. Earlier in the same stretch, about the props table: "we still have issues with controls ... in
   Agent Card we have subtitle (string undefined) and the control is Set Object ... is it possible
   that those Set object happen when there isnt a default value and the type even though is defined
   displays as undefined instead of in this case an empty string?" Answered in §4.

---

## 2. The weld: a group is ONE key, not a spaced-out row

The geometry, in one sentence: **no gap between the caps, a 1px overlap at every seam so the two
facing borders collapse into a single hairline, and rounded corners only at the strip's two ends.**

- **Solid** (`src/components/kbd/kbd-group.tsx`): the group frame carries the whole spec as child
  selectors, because its caps are in the same tree. Five facts: no gap of its own; `-ml-px` on each
  child after the first; `-ml-px` on each cap after the first inside a child; the four facing corners
  squared (the cap-level pair plus the child-boundary pair); and `[--kai-kbd-cap-gap:0px]` so the
  chord gap INSIDE a child is zeroed too.
- **Web components** (`src/web-components/kbd/`): the group cannot do this. Styles do not cross a
  shadow boundary onto slotted children and `::slotted()` cannot express a sibling relation, so
  `<kai-kbd-group>` marks each direct `<kai-kbd>` child with `data-kai-join` (the same per-child
  marker pattern `<kai-pane-grid>` uses for its `pane-<i>` slots) and the CHILD's own shadow
  stylesheet welds itself, reading the marker for its position. A child that stops being a
  `kai-kbd` loses the marker on the next mutation, so an element moved out of a group cannot stay
  half-welded.
- `Kbd` itself changed one class for this: its chord gap is now
  `gap-[var(--kai-kbd-cap-gap,0.125rem)]`, so the group zeroes it by inheritance and a lone `Kbd`
  keeps its 2px.

The SEMANTICS changed with the geometry, and the docs had to follow: a group is one shortcut spelled
with caps from more than one element, or a typed sequence. Two different shortcuts are two elements
(or two groups), because the weld is what says the caps are one key. The old story and docs page
taught the opposite ("two shortcuts in one group"), which is the example the owner was looking at.

---

## 3. Rich tooltip content, and the padding that was wrong

**Rich content.** `content` is now `string | JSX.Element` in the Solid layer, and `<kai-tooltip>`
takes a `content` NAMED SLOT whose light-DOM children replace the text (the string stays the slot's
fallback, the slot-with-fallback shape `<kai-file-upload>` already uses). The slot is registered in
`src/web-components/slots/slots.ts` and documented on the Tooltip page.

**The inverted surface.** The bubble is `bg-foreground text-background`, so a kit component inside it
would otherwise paint `bg-muted`/`border-border`/`text-muted-foreground` from the PAGE's tokens and
read as a light blob with faint text. Fix: the bubble re-expresses three tokens ON ITSELF
(`--color-muted` at 20% of `--color-background` over transparent, `--color-muted-foreground` =
`--color-background`, `--color-border` at 25%). This is the kit's own subtree-scoped theming
mechanism: Tailwind v4 emits `.bg-muted{background-color:var(--color-muted)}` (verified in
`src/web-components/compiled.css`), so no new `--kai-kbd-*` public tokens were needed, and any kit
component in the bubble adapts, not just a cap. shadcn reaches the same place from the other side,
with a `data-slot=tooltip-content` conditional inside their Kbd.

**The padding.** The two screenshots were measured directly (see §5.4 for the method): their bubble
is `px-3 py-1.5` (12/6 CSS px) and ours was `px-2.5 py-1` (10/4). The tip in both images is text plus
a Kbd cap, and the cap is the tallest thing in the bubble, so the same 4px sits under a taller box,
which is exactly the "fat on the sides, skinny top and bottom" the owner described. Corrections:
`py-1` -> `py-1.5`, which is also the kit's own row step (`dropdown/dropdown.tsx` rows,
`conversation-item` compact). Do not shave `px` back to "even it out": the text's own half-leading
sits above and below the glyphs, and that is what makes an equal-looking ring.

---

## 4. The controls question, answered with measurements

**The mechanism.** Storybook's `inferControl` switches on the type NAME as an exact string
(`case "string"` -> text, `boolean`, `number`, `enum`, `array` -> object, `function`/`symbol` -> no
control) and its `default` branch returns an object control. So anything that is not exactly one of
those names renders "Set object". Two ways to reach it:

- docgen reporting an optional prop as `T | undefined`, unless
  `shouldRemoveUndefinedFromOptional: true` is on; and
- `inferArgTypes`, which maps an arg VALUE of `undefined` to `{ name: 'object' }` for any argument
  docgen does not already type.

**Measured, not argued.** Running the installed Storybook's own `inferControls` (it is exported from
`storybook/dist/_browser-chunks/chunk-SZQXB3JV.js`):

| docgen type | control |
|---|---|
| `string` | text |
| `string \| undefined` | object ("Set object") |
| `boolean` | boolean |
| `boolean \| undefined` | object |
| `AgentStatus` (any named/opaque type) | object |
| `object` (what an `undefined` arg value infers) | object |

**The state of the tree.** Parsing all 127 component files with the exact option set the
solid framework plugin passes (`savePropValueAsString`, `shouldExtractLiteralValuesFromEnum`,
`shouldRemoveUndefinedFromOptional`, the docgen propFilter) gives 1437 props and **zero** type names
carrying `undefined`. In the last built `storybook-static`, AgentCard's `subtitle`, `lastLine` and
`class` are docgen type `string`. So the shape the owner named is already fixed by
`shouldRemoveUndefinedFromOptional` in `.storybook/main.ts` (the previous session's root cause 1), and
`shouldRemoveUndefinedFromOptional` is the answer to their own hypothesis: the driver is
OPTIONALITY, not "no default value" (a required `string` with no default was never affected).

If it is still visible on screen, the running Storybook predates that edit: a `.storybook/main.ts`
change needs a dev-server RESTART, and a warm server keeps the old docgen options (the plugin's
file-system cache is off in this repo, so nothing else holds them). Worth confirming with the owner:
the displayed type should read `string`, not `string | undefined`.

**What is genuinely left, DERIVED** (289 of the 1437 props render an object control today):

- `Element` 79 (e.g. `AgentCard.leading`, `BuilderLayout.panel`). A JSON editor for a JSX prop is
  nonsense; `control: false` is the right answer.
- arrays 20 (`string[]` 13, `number[]` 7), named opaque types (`FormField` 13, `unknown` 12,
  `FieldMaskHint` 12, `HTMLElement` 9, `CardHost` 5, `ShaderSpec` 4, `CardComponentMap`/
  `CardSchemaMap` 4 each, `Record<...>` 6): object is honest for these.
- the ones where a text or select control is genuinely better: `string | number` 6
  (`Composer.maxHeight`, `PromptInput.maxHeight`, `Skeleton.width`, `Skeleton.height`,
  `SourceTrigger.label`, `TabBarItemContent.badge`), `string | ComposerDoc` 4, `string | string[]` 2,
  `number | "any"` 1 (`Slider.step`).

**Recommended next guard:** for every component prop whose inferred control would be `object`,
require an explicit control (or a waiver with a reason) in that story's argTypes. It is derivable from
docgen plus the story AST, it is mutation-provable, and the failure message names the prop and the
inferred control. That is what stops this being re-reported a fourth time.

---

## 5. Traps this session added

1. **A new class family is a `cn-merge.ts` change, and the drift test says so.** The merger behind
   `cn()` is hand-written and diffed against `tailwind-merge` over the classes the kit emits
   (extracted by AST). The weld's `[--kai-kbd-cap-gap:0px]` failed it with the exact input, because
   tailwind-merge keys an arbitrary PROPERTY on the property name while the table passed it through.
   Fixed by one table entry; measured against the oracle first (`[--a:1] [--a:2]` -> `[--a:2]`,
   `[--a:1] [--b:2]` -> both, and `[--a]` with no colon is NOT a property).
2. **A web component cannot style its slotted children's shadow content.** No descendant selector
   crosses the boundary, and `::slotted()` takes a compound selector, so no sibling relation either.
   The kit's answer is a marker attribute on the direct children plus rules in the CHILD (same shape
   as `<kai-pane-grid>`'s `pane-<i>` slots and `<kai-resizable>`'s `p0`/`p1`).
3. **A facade's `onMount` marker pass needs a third microtask in tests.** Two `await
   Promise.resolve()` is enough for a render assertion, not for an attribute written in `onMount`.
   The failure reads as "the feature is not implemented" and is a tick short.
4. **You can measure a screenshot without vision.** Decode the PNG, connected-component the bubble's
   colour to get its box, then take the ink bbox strictly inside it (erode the corners). Both
   screenshots agreed with the class list to within the anti-aliased pixel, which is what turned the
   padding complaint into a one-line change rather than a guess. Vision was not reachable from this
   session's tools; the numbers were.
5. **`.storybook/main.ts` docgen options need a Storybook restart**, and the file-system cache is
   off here, so a stale on-screen result means a stale SERVER, not a stale cache.
6. **`cmd | tail` reports the PIPE's status.** Bit me once in the lint-loop before `PIPESTATUS[0]`.

---

## 6. Verification state (all serial, on the final tree)

- `nx build ui --skip-nx-cache` green; `verify:generated` (19 artifacts, each re-proven).
- unit **426 files / 6104 tests**; emitted **5 files / 36 tests**; docs **7 / 62**; create-kai
  **21 / 935**; cli **2 / 51**.
- every `packages/ui` lint gate (13), the root guards (`lint-lockfile-specifiers`,
  `lint-package-metadata`, `lint-workflow-scalars`, `verify-workspace-ranges`), the UI typecheck
  (quarantine + the four tsc passes), and the cli / mcp / create-kai typechecks.
- `verify:generated`, `verify:solid-coverage` (98/98, 194 prop types), `verify:schemas`,
  `verify:tool-schemas`, `verify:web-components-bundle`, `verify:scaffold`, `verify:construct`
  (113 cells, 5 consumer bundles), `verify:pack` (2.08 MiB against the 2.56 MiB ceiling),
  `verify:fresh`, `verify:consumer`, cli + mcp `verify:bundle-shape`, cli `verify:pack`,
  create-kai `verify:pack`, `lint:cli-invocations`, `verify:docs`.
- **CI-only, not run locally:** the storybook browser legs (this change needs them: the weld's
  geometry and the inverted-surface colours are visual), `verify:starters`, create-kai's
  `verify:add`.

---

## 7. Open work, ranked

1. **The section/tier question** (still the biggest item, unchanged from the previous handoff):
   getting the app-shaped entries out of the flat `Components/` list, with the word decision
   (`surface` is already spent by `mcp/catalog/surfaces.ts`), the chrome question
   (app-header/nav/dock/pane/screen) and the card family, and roughly 86 story titles moving.
2. **The controls sweep** (§4): 289 props render an object control today; the roster and the guard
   shape are written down there.
3. **`PromptDock`'s disposition**: demo scaffolding (no data, no events, no composed kit components,
   two showcase users, no docs page). Demote it to a showcase helper, or keep it public and document
   it.
4. **`Kbd`'s per-layer `platform` default:** `<kai-kbd>` defaults to `auto` (sniffs the OS); the
   Solid `<Kbd>` defaults to `'other'`. The Solid docstring says so, and it is plausibly deliberate
   (a deterministic first render, so no hydration mismatch), but the two layers disagree and the
   Solid default surprises a macOS consumer. A one-line change if the owner wants them equal.
5. **Tooltip parity, deliberately not decided here:** shadcn's bubble carries an ARROW and
   `text-wrap: balance`; ours has neither and carries a `shadow-md`. Padding is now matched; the
   arrow and the shadow are a separate decision (the arrow needs a `part` and a placement-aware
   transform; the shadow is a pair of tokens).

---

## 8. Deliberate non-changes, so they are not re-litigated

- `part="group"` on `<kai-kbd-group>` stays. It is public API; its doc now says it lays the caps out
  only (each cap keeps its own border and radius).
- No `--kai-kbd-*` cap tokens. The inverted-surface adaptation goes through the existing `--color-*`
  tokens, scoped to the bubble, which also means any kit component in a tip adapts, not just a cap.
- `Kbd`'s `size` scale, the glyph set and the `rounded-sm` cap radius are untouched by this session:
  the owner's report was the GROUP's gap, and the cap radius was already corrected in the previous
  one.
- The register-all barrel and the per-tag entries are untouched; nothing here adds an export or a
  `kai-*` tag, so the scaffold surfaces and the construct catalog are unchanged.
