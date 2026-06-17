# Known kit issues (found while building the docs site)

Deferred until the docs design/layout is done. These are real component bugs,
not docs-platform problems — surfaced by dogfooding the real `kc-*` elements.

## 1. Hover-card collapses item height in `inline`/`list` variants (kc-attachments) — FIXED (uncommitted)

**Status (2026-06-16):** fixed in the working tree (not yet committed/tested on a
clean branch). The trigger now carries the flex layout (`HoverCardTrigger` gained
a `class`; `kc-attachments` passes a per-variant class) and hover-card is allowed
on `grid` (tile wraps just the image; details show in the card). This resolved
the collapse, the list gap-on-hover, AND enabled grid hover-preview. Still needs
proper TDD + gate + version-bump before merge.

**Severity:** medium · **Found:** 2026-06-16 (Starlight docs prototype)

**Symptom:** with `hover-card` enabled, `kc-attachments` in `inline` or `list`
variant renders items at collapsed height — non-image rows shrink to ~line-height
(≈16px) instead of the preview height (≈48px). `grid` is unaffected (it
intentionally has no hover card). Image items keep their height (the `<img>` has
intrinsic size); icon/file items collapse.

**Root cause:** the hover-card **trigger renders as a bare inline `<span>`** (via
`HoverCardTrigger` → `<As as="span">`). When that span sits as a child of the
Attachment flex row, an inline box doesn't carry the preview's block height, so
the row collapses. Confirmed via computed styles: trigger `display: inline`,
non-image trigger height 16px vs image 60px.

**Attempted fix (reverted — needs proper TDD):** make the trigger carry the flex
layout instead of being a bare inline wrapper —
- `src/ui/hover-card.tsx`: `HoverCardTrigger` accepts an optional `class` (additive).
- `src/components/attachments.tsx`: `AttachmentHoverCardTrigger` forwards `class`.
- `src/elements/attachments.tsx`: give the trigger
  `class="flex items-center gap-1.5"` (+ `w-full` for list) and drop the inner
  wrapper div.
This fixed the image item but **list rows still rendered narrow/short** — needs
another pass across all three variants (and a check that the shared
`HoverCardTrigger` change doesn't affect other consumers: kc-source, tooltips).

**To do properly:** branch off `main`, TDD across grid/inline/list × image/file,
verify other `HoverCardTrigger` consumers, run the gate, version-bump.

**Related symptom (same root):** on hover of a `list` item with `hover-card` on,
the gap between the preview and the label collapses — the trigger span re-wraps
the flex row. Same fix as above (trigger carries the flex layout).

## 3. `kc-attachments` variant not reactive after first render

**Severity:** medium · **Found:** 2026-06-16 (docs Example component)

**Symptom:** changing `kc-attachments`' `variant` after the element has rendered
(via property or attribute) updates the container's own class but **does not
re-layout the items** — they keep their first-render variant (e.g. stay grid
`size-24` tiles even when variant becomes `inline`/`list`).

**Root cause:** in `src/components/attachments.tsx`, `Attachment` does
`const { variant } = useAttachmentsContext();` — **destructuring reads the
reactive getter once**, capturing a stale value. The per-item class
(`variant === 'grid' && …`) then never updates. (The container in `Attachments`
reads `variant()` reactively, so only the items are stale.)

**Fix (kit):** don't destructure — keep it reactive:
`const ctx = useAttachmentsContext()` and use `ctx.variant` in the class +
`get variant() { return ctx.variant; }`. ~3 lines, benefits any consumer that
switches variant dynamically.

**Docs workaround (in place, no kit change):** set `variant` as a markup
**attribute** so it's correct at first upgrade (focused examples), and **remount**
the element (keyed on variant) in the interactive playground. See
`AttachmentsExample.tsx` / `AttachmentsDemo.tsx`.

## 2. Demo reactivity note (not a kit bug — prototype guidance)

Driving `kc-attachments` from the docs demo required setting JS **properties**
(`el.hoverCard = …`, `el.removable = …`), not toggling boolean **attributes** after
mount — attribute toggles didn't reactively update the element. Worth confirming
whether boolean attribute changes *should* be observed reactively (they currently
aren't for these props); if so, that's a second small kit issue.
