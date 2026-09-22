# Handoff -- the Lightbox component, and the attachments `image-preview` option

**Date:** 2026-09-22 · **Branch:** `feat/attachment-lightbox` · **Status:** landed and verified: a
standalone `Lightbox` (Solid trio) plus `<kai-lightbox>` (its web component), the attachments family
composing it behind an opt-in, and the docs page. The Kbd weld iteration lives on its own branch
(PR #408, green, unmerged) and is NOT part of this one.

Read [`2026-09-22-kbd-weld-and-tooltip-content.md`](2026-09-22-kbd-weld-and-tooltip-content.md) for the
Kbd half of this stretch. This file also records the `Image` props analysis (§6), because the owner
said an earlier answer to it got lost.

---

## 1. What the owner asked for

1. Attachments currently preview an image with a hover card. They want a **lightroom effect**: click
   the thumbnail, the image opens in a modal. "providing that as an option", with a composition like
   `AttachmentHoverCard`.
2. A correction on the shape: "I am imagining the Lightbox or whatever you are calling it will be a
   **new component**, and used by the attachment in some fashion." So not an attachment-scoped
   compound: a first-class component, and the attachments compose it.

---

## 2. What landed

| layer | what |
|---|---|
| `src/components/lightbox/lightbox.tsx` (NEW) | `Lightbox` + `LightboxTrigger` + `LightboxContent`, plus `LightboxController`. The trio shape mirrors `AttachmentHoverCard`'s. |
| `src/web-components/lightbox/lightbox.tsx` (NEW) | `<kai-lightbox>`: default slot = the trigger, `slot="content"` = the media, `open`/`default-open`/`disabled`/`label`, `kai-open-change`, `show()`/`hide()`/`toggle()` from `wireDisclosure`, parts `backdrop`/`panel`/`body`. |
| `src/components/attachments/attachments.tsx` | `AttachmentImagePreview` (`'hover' \| 'lightbox'`), the container prop, and the context it publishes (read through the getter, like `variant`). |
| `src/components/message/message.tsx` | `MessageBodyProps.imagePreview`, and the tile extracted into `AttachmentTile` so the context read sits BELOW the `<Attachments>` provider. Tile picks the lightbox only for an image with a URL. |
| `src/components/thread/thread.tsx`, `src/components/chat/chat-thread.tsx` | Both render their own `MessageBody`, so both got the prop and forward it. `<kai-chat>` inherits `ChatThreadProps` and needed nothing; `<kai-thread>` forwards it explicitly. |
| `src/web-components/attachments/attachments.tsx` | `image-preview` attribute. Branch order: image + lightbox -> lightbox trio, else `hover-card` -> hover card, else plain. Non-images never lightbox. |
| `apps/docs/.../components/lightbox.mdx` (NEW) + `src/topics.mjs` | The element's own page and sidebar entry, next to Hover card. The Attachments page gained a Lightbox section. |

### The rename, and why it matters

The first cut was `AttachmentLightbox`/`Trigger`/`Content` under `attachments/`. Renamed to
`Lightbox` in its own directory once the owner named the shape. Two consequences worth knowing:

- The trio is now a general component; the attachments are ONE consumer. `src/index.ts` exports it
  beside the attachments family.
- The wire/thread plumbing is unchanged by the rename, but any note written before it says
  `AttachmentLightbox`. Nothing shipped under that name.

---

## 3. Decisions, so they are not re-litigated

1. **One modal implementation.** `LightboxContent` composes the kit's `Dialog`. Escape, the backdrop,
   focus move + restore, the Tab trap, `role="dialog" aria-modal` are Dialog's, not a second copy.
   The panel drops the card chrome (`w-auto max-w-[90vw] border-0 bg-transparent p-0 shadow-none`) and
   the body's padding goes too, so a tall image is not scrolled by the body's `overflow-auto`. The
   media is clamped by a descendant selector on the panel (`[&_img]:max-h-[85vh]` etc.), which is why
   consumers pass a plain `<img>`: the clamp is spelled ONCE, and a tile whose own classes say
   `max-h-64` cannot leave a thumbnail inside the modal.
2. **The trigger is a real control.** `role="button"`, `tabIndex 0`, `aria-haspopup="dialog"`,
   `aria-expanded` bound to the open state, Enter AND Space (with `preventDefault`: without it the
   thread scrolls behind the modal), `cursor-zoom-in`, and the measured shadow-safe focus ring recipe
   the hover card uses (`[outline-style:solid]` is load-bearing inside these shadow roots).
3. **`kai-lightbox`'s trigger is occupancy-gated, and the gate counts ELEMENTS.** An
   always-rendered `LightboxTrigger` is an empty `role="button"` tab stop for a consumer who drives
   the modal from their own button or from `show()`, i.e. a keyboard trap. The gate reads the host's
   light-DOM children rather than the slot's `assignedNodes()`, because the latter counts the
   whitespace between `<kai-lightbox>`'s children as a trigger.
4. **`disabled` gates the programmatic path only** (`show()` no-ops, `toggle()` closes), which is the
   semantics every other overlay in the kit shares through `wireDisclosure`. Stated in the prop's doc
   rather than left to be discovered.
5. **`label` names the dialog; there is no generic fallback.** A missing label is an unnamed
   `role="dialog"`, and a silent default ("Image") would hide the a11y hole instead of naming it. The
   attachments pass the attachment's own label.
6. **Non-image tiles never lightbox.** A modal that opens onto a PDF icon is worse than the hover
   card, which carries the filename and media type a grid tile cannot fit.

---

## 4. Verification state

- `nx build ui --skip-nx-cache` green. `verify:generated` (19 artifacts, each re-proven).
- unit **428 files / 6124 tests**; emitted **5 / 36**; docs **7 / 62**; create-kai **21 / 935**;
  cli **2 / 51**.
- all 13 `packages/ui` lint gates; the UI typecheck (quarantine + the four tsc passes); the cli, mcp
  and create-kai typechecks.
- `verify:generated`, `verify:solid-coverage` (**99/99**, 197 prop types), `verify:schemas`,
  `verify:tool-schemas`, `verify:web-components-bundle` (the new element is in the register chunk),
  `verify:scaffold`, `verify:construct` (113 cells, 5 consumer bundles), `verify:pack` (2.09 MiB
  against the 2.56 MiB ceiling), `verify:fresh`, `verify:consumer` (`solid-thread` 312,681 B eager
  against a 430,080 B ceiling: the Dialog and the lightbox are now in that graph), and `verify:docs`.
- CI-only and not run locally: the storybook browser legs (they matter here: the modal's geometry and
  the clamp are visual), `verify:starters`, create-kai's `verify:add`.

---

## 5. Traps this session added or sharpened

1. **A story's own name is a binding, and one that shadows an imported kit export breaks the snippet
   lint and the story index.** `export const Lightbox: Story` next to `import { Lightbox }` is a
   duplicate declaration (Storybook's indexer says `TypeError: Duplicate declaration "Lightbox"`), and
   even with an aliased import, rule (i) of `lint-story-conventions` reads the story as the component
   it demonstrates. The story is `LightboxTile`.
2. **`git mv` does not work on a file that was never committed.** The lanes' new files were untracked,
   so the rename was a plain `mv` plus a path fix.
3. **A mechanical rename by `sed` reaches generated artifacts too.** `AttachmentLightbox` appeared in
   `web-component-meta.json` (inside a copied doc comment) and was rewritten. Harmless because the
   generators own it, but it is a reminder to check `git status` after a rename.
4. **Two Solid components render `MessageBody`** (`components/thread/thread.tsx` and
   `components/chat/chat-thread.tsx`), and the two facades render different ones: `<kai-thread>` and
   `<kai-chat>`. A prop added to one is invisible to the other until it is added to both, and the
   failure is a `TS2322` on the facade rather than anything at runtime.
5. **A context read must sit BELOW its provider.** The tile reads `AttachmentsContext.imagePreview`,
   which the `<Attachments>` in the same JSX tree provides. Inline in `MessageBody` the read would
   find no context and take the default on every render: a prop that looks wired and never works.
   That is why the tile is its own component, and it is noted at the site.

---

## 6. The `Image` props question, recorded (an earlier answer got lost)

The owner asked why `kai-image` takes `base64` + `mediaType` and `uint8Array` instead of one `src`
that accepts a URL, base64 or bytes.

**What the three inputs do.** `base64` + `mediaType` build a `data:` URI. `uint8Array` goes through a
`Blob` to an object URL, revoked on cleanup. A URL is not an input at all.

**Why two payload props.** They are the two shapes ONE payload arrives in, and the source of truth is
the AI SDK: `GeneratedFile` carries `base64`, `uint8Array` AND `mediaType` at once, and
`DefaultGeneratedFile` holds a single payload and exposes both getters
(`node_modules/ai/dist/index.d.ts`, `interface GeneratedFile`). The kit's `GeneratedImageLike` mirrors
that with both optional, because a provider may hand back either. `kai-image` exists to render a
payload a MODEL produced, not a URL the caller typed.

**Why no `src`.** An image from a URL needs no component: the platform renders `<img src>`. What this
component buys is the media-type plumbing, the bytes-to-object-URL lifecycle, and a skeleton while it
resolves. A `src` would make it a thin wrapper with no job, and it would drag in a URL policy, which
this repo treats as a hard rule (`isSafeUrl`/`SAFE_SCHEMES`; a card schema's `format: "uri"`
constrains no scheme).

**Why not ONE polymorphic prop.** `base64` is not self-describing (it needs `mediaType`),
`uint8Array` needs the object-URL bridge, a URL needs the scheme policy. One prop would mean "the
meaning depends on a sibling prop", and it would erase the fact the wire actually cares about: a
`data:` or https URL CAN be sent to the model (`image_url` takes both), while a `blob:` URL cannot and
the encoders refuse it with a reason.

**Recommendation, if the owner wants URLs:** add `src` as a THIRD explicit input with a documented
precedence, and apply the URL policy to it. Not a union. Two defects to fix either way:

- the layers disagree on one name: Solid `uint8Array`, element `bytes`;
- `mediaType` silently defaults to `image/png`, so a JPEG's base64 with no `mediaType` is mislabelled.
  Browsers sniff it, so it renders; the wire would carry the wrong type. That is a quiet decision in a
  repo whose rule is to decide loudly: either require `mediaType` alongside `base64`, or default it
  in the open.

**Status:** answered, awaiting the owner's call (one name / `src` / loud `mediaType`). No code change
made.

---

## 7. Open work, ranked

1. **The section/tier question** (unchanged, still the biggest): getting the app-shaped entries out of
   the flat `Components/` list. The new element's story is `Labs/Foundations/Lightbox`, matching the
   existing group its siblings use.
2. **The controls sweep**: 289 of 1437 component props render an object control today; the derived
   roster and the proposed guard (an argTypes key must be a prop the component declares, and a color
   control must sit on a prop whose name matches the color matcher) are in
   [`2026-09-22-kbd-weld-and-tooltip-content.md`](2026-09-22-kbd-weld-and-tooltip-content.md) §4. The
   owner's `class`-row color-field report could not be reproduced in the tree; the guard would make
   that class of mistake impossible rather than re-diagnosable.
3. **`Image`'s three-name problem** (§6), if the owner says go.
4. **`PromptDock`'s disposition** (demo scaffolding: no data, no events, no composed kit components,
   two showcase users, no docs page).
5. **Lightbox follow-ups, deliberately not done:** no arrow/`text-wrap: balance` parity work on the
   tooltip bubble; the lightbox's modal has no zoom or pan (a lightbox that shows an image bigger, not
   a viewer); and `label` is required in practice for an accessible name rather than defaulted.
