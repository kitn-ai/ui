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
3. "should we have a way to close it using an X button at the top right? Have the option to show or
   not show that?" Landed as `showClose` (default ON).
4. "I see that you did not include the light box as a component ... it's fine for now to also have it
   in foundations. but it should exist in components." Storybook already has this pairing: a Solid
   component story at `Components/<Name>` and the element story at `Labs/Foundations/<Name>`
   (`Components/Kbd` + `Labs/Foundations/Kbd`). The Lightbox only had the element one, so
   `Components/Lightbox` was added.
5. "i want a way to close on click (image) not sure if that is an event or a property or something
   else." A property: `closeOnContentClick`, default ON.
6. Confirmed the `Image` / `ImageArtifact` split (see §6), with the explicit instruction to update
   the MCP, the docs and everything downstream.

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
| `src/components/lightbox/lightbox.stories.tsx` (NEW) | `Components/Lightbox`, the Solid trio's story, which the Components group was missing. |
| `src/components/image/image.tsx` + `src/components/image/image-artifact.tsx` (NEW) + both facades | The `Image` / `ImageArtifact` split (§6): `src` for a resource, `data` + a REQUIRED `mediaType` for a payload. |
| `src/web-components/image/image-artifact.tsx` (NEW) + `register-impl.ts` | `<kai-image-artifact>`, registered; `kai-image` became the resource element. |
| `apps/docs/.../components/image.mdx` (rewritten) + `image-artifact.mdx` (NEW) + `src/data/samples/kai-image*.ts` + `src/topics.mjs` | Two docs pages, two sample sets, one sidebar entry each. |
| `tests/components/model-image-sinks.test.tsx`, `src/stories/showcase/perplexity-pro.stories.tsx`, `examples/demos/composable/*`, `guides/frameworks/react.mdx` | Every in-repo consumer of the old payload-shaped `Image` migrated: the pinned sink test, the showcase, the composable demo (which now shows both elements), and the React name-collision note. |

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
7. **The X is ON by default; the content click is ON by default.** Both are what every photo viewer
   does, and both are opt-out (`show-close="false"`, `close-on-content-click="false"`). The
   content-click handler walks `e.composedPath()` and STOPS at the content wrapper, because two real
   traps sit on that path: the dialog panel above the wrapper carries `tabindex="-1"`, so an unbounded
   `closest('[tabindex]')` matches the panel and no click ever closes anything; and with
   `<kai-lightbox>` the media is light-DOM slotted content, whose only link to the wrapper is the
   flattened tree, which `closest()` does not walk, so a link in a caption would read as
   non-interactive and dismiss the modal out from under itself.
8. **The image split is on INPUT SEMANTICS, not transport** (§6). A `<img>`-sink URL is not filtered,
   because the repo already decided that (`isSafeImageSrc`'s docblock, pinned by
   `tests/components/model-image-sinks.test.tsx`); `mediaType` is required and its absence is reported
   rather than guessed; and there is no `GeneratedImageLike` type, because `data` + `mediaType`
   describes the payload and the AI SDK's object shape is one documented mapping line, not a contract
   the kit should carry.

---

## 4. Verification state

- `nx build ui --skip-nx-cache` green. `verify:generated` (19 artifacts, each re-proven).
- unit **432 files / 6161 tests**; emitted **5 / 36**; docs **7 / 62**; create-kai **21 / 935**;
  cli **2 / 51**. The generated API is now **100 web components** (was 98 at the top of this branch).
- all 13 `packages/ui` lint gates; the UI typecheck (quarantine + the four tsc passes); the cli, mcp
  and create-kai typechecks.
- `verify:generated`, `verify:solid-coverage` (**100/100**), `verify:schemas`,
  `verify:tool-schemas`, `verify:web-components-bundle` (the new element is in the register chunk),
  `verify:scaffold`, `verify:construct` (113 cells, 5 consumer bundles), `verify:pack` (2.10 MiB
  against the 2.56 MiB ceiling), `verify:fresh`, `verify:consumer` (`solid-thread` 312,681 B eager
  against a 430,080 B ceiling: the Dialog and the lightbox are now in that graph), and `verify:docs`.
- **`llms-full.txt`'s ceiling was raised, 344 -> 355 KiB**, with the dated note
  `scripts/lint-llms-size.mjs` requires: 352,800 bytes measured at 100 elements, grown by two new
  elements and their prop tables, same ~3% headroom as the baseline and the previous raise.
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
6. **A `Uint8Array` is not a `BlobPart` any more.** `new Blob([data])` is a TS2322 under this
   tsconfig (`Uint8Array<ArrayBufferLike>` widens past `ArrayBufferView<ArrayBuffer>`), and the
   pre-split code carried the same `as BlobPart` cast for the same reason. A lane found it in a
   SIBLING lane's file and the parent routed the one-line fix, which is the system working: the
   owner of the file was still running and could not see it.
7. **An em dash in a prop JSDoc is only visible after a regeneration.** `rendered-description-style`
   reads the GENERATED `web-component-meta.json`, not the source, so fixing the comment and re-running
   the test still fails until `gen-web-component-api.mjs` (or `build:api`) rewrites the meta. Do the
   regeneration before believing the fix, and remember the same text reaches `docs/web-components.md`
   and `llms-full.txt`.
8. **A backtick OR a `${}` inside a subagent workflow's template literal breaks the script.** The
   first dispatch failed with `SyntaxError: Unexpected token` (an unescaped backtick) and the retry
   with `ReferenceError: mediaType is not defined` (a `${mediaType}` that interpolated at script time).
   Both are the same trap the repo already documents for `src(...)` snippets: build the task text with
   a placeholder and substitute after, and never write a code sample raw into a template literal.

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

**Status: SHIPPED, owner-confirmed.** The name they chose is `ImageArtifact` (not `GeneratedImage`),
because this repo already has an `Artifact` and the family road (Audio/Video/File artifact) is
coherent; `Artifact` itself means the code-preview surface, so the two pages each say which to reach
for. The API is one `data` prop (`string | Uint8Array`) plus a REQUIRED `mediaType`, `alt`, `class`.
What changed from the discussion above, and why:

- the axis is input semantics (reference vs payload), NOT transport: the sendability argument was a
  wire concern and the owner pushed back on it correctly, so it lives in `wire/` and in this file, not
  in the component taxonomy;
- `Uint8Array` and base64 are ONE prop discriminated by `typeof`, because they are two shapes of one
  payload and the AI SDK's own `DefaultGeneratedFile` takes `{ data, mediaType }`;
- `mediaType` is required at the type level, and its absence at runtime reports once and renders the
  placeholder instead of guessing `image/png`;
- no scheme filter at either sink, citing the repo's existing decision and its pinned test;
- `GeneratedImageLike` is gone.
Downstream, as instructed: the MCP catalog, the meta, the manifest, the d.ts pair, the React wrappers,
`docs/web-components.md` and `llms-full.txt` are all regenerated; the docs site has a page per
component; the showcase, the composable demo, the React guide note and the pinned sink test are all
migrated.

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
3. **`PromptDock`'s disposition** (demo scaffolding: no data, no events, no composed kit components,
   two showcase users, no docs page).
4. **Lightbox follow-ups, deliberately not done:** no arrow/`text-wrap: balance` parity work on the
   tooltip bubble; the lightbox's modal has no zoom or pan (a lightbox that shows an image bigger, not
   a viewer); and `label` is required in practice for an accessible name rather than defaulted.
