# Design: `kai-composer` — a structured rich input (contenteditable, not an RTE)

**Date:** 2026-06-21
**Status:** Built (prototype) — branch `worktree-kai-composer`. See "Prototype status" at the end.
**Working name:** `<kai-composer>` (provisional; element prefix `kai-` per the repo contract)

## Summary

A new, standalone input web component that types like a textarea but supports **atomic inline entities** ("pills") — e.g. a skill shown as `[icon] Record & Replay` that deletes as a single unit on backspace — alongside plain text. It supports `/` and `@` triggers that open a caret-anchored menu, decoration-only keyword highlighting, and is extensible to new entity kinds without structural change.

It does **not** do final prompt expansion. Like Claude Code and OpenCode, the editor emits a **structured document of references**; the consumer's agent layer resolves each entity into the real skill/command/file/agent body before the model call. The component's contract is the *structured handoff*, plus a convenience flattened string.

This is built as a **new element**, leaving the shipping `<kai-prompt-input>` (simple textarea) untouched. It can be promoted/swapped later.

### Goals

- Type, edit, auto-grow, submit (`Enter` / `Shift+Enter` newline) — parity with the current textarea input.
- Atomic inline entity pills (skill, mention, command, …) with single-unit deletion.
- Multiple entities in one document.
- `/` and `@` triggers that open a menu anchored at the caret; report query + caret rect.
- Decoration-only keyword highlighting (styling, not entities — never affects serialization).
- A structured, extensible document model that serializes to (a) a structured `doc` for the consumer and (b) a default flattened prompt string.
- Solid component → `kai-*` web component, following `defineWebComponent`.

### Non-goals (YAGNI — explicit)

- **Not a rich-text editor.** No bold/italic/underline, no markdown keyboard shortcuts, no headings/lists, no block formatting. Typing produces plain text; the only non-text nodes are entity pills.
- No content resolution inside the component (no reading files, no expanding skill bodies). References only.
- No collaborative editing, no undo-stack beyond the browser's native contenteditable behavior (revisit later if needed).
- No nested/structured entities (an entity is a leaf pill). Future, not now.

## Prior art (why this shape)

- **Claude Code** converts `/command`, `@file`, skills, and `@agent` references **client-side** before the model call — the model never sees the raw token; it gets expanded text + attached contents. Built-in actions (`/clear`) never reach the model.
- **OpenCode** (`sst/opencode`) splits this into two models with one conversion boundary:
  - Editor model: a structured array of content parts (`{type, content, start, end}`); `file`/`agent` pills are atomic `contenteditable=false` inline DOM nodes tracked by offset, treated as length-1 with a `​` zero-width-space cursor convention (`packages/app/src/components/prompt-input/editor-dom.ts`, `context/prompt.tsx`).
  - Wire model: `text` / `file{mime,url,filename,source}` / `agent{name}` parts — **references**, not contents (`build-request-parts.ts`).
  - Resolution (read file bytes, expand command templates, resolve `@agent`) happens **server-side** in the session prompt pipeline.

We mirror this two-model split. It is the load-bearing, future-proof idea.

## Architecture — three units + one conversion boundary

```
src/primitives/composer-model.ts     (1) headless: types, serialize, caret/offset math — PURE, framework-agnostic
src/components/composer.tsx          (2) Solid view: contenteditable, DOM<->model sync, auto-grow, trigger menu, highlight layer
src/elements/composer.tsx            (3) kai-composer element via defineWebComponent (props/events bridge)
```

Each unit is independently understandable and testable:

1. **`composer-model`** — no DOM, no Solid. Defines `Segment`/`EntityRef`, `serializeToText(doc, options)`, `normalizeValue(string | Segment[]) -> Segment[]`, and the pure offset helpers (`docLength`, `segmentAtOffset`, etc.). This is the TDD core — exhaustively unit-tested in jsdom with no rendering.
2. **`composer.tsx`** — owns the contenteditable element. Parses DOM → model on input, renders entity pills, manages caret math around atomic pills, runs auto-grow, drives the trigger menu, and applies the highlight decorations. Tested via Storybook browser tests (Playwright) for real interaction.
3. **`composer.tsx` (element)** — thin facade: maps reactive props to the Solid component and `dispatch`es `kai-*` events. Wrapped by `defineWebComponent('kai-composer', …)`.

## The document model (`composer-model.ts`)

```ts
export type Segment =
  | { type: 'text'; text: string }
  | { type: 'entity'; entity: EntityRef }

export interface EntityRef {
  kind: string                       // 'skill' | 'mention' | 'command' | <custom>
  id: string                         // stable id, e.g. 'record-replay'
  label: string                      // shown in the pill + default flattened string
  icon?: string                      // url | emoji | named slot (renderer decides)
  promptText?: string                // optional override for default serialization
  data?: Record<string, unknown>     // arbitrary consumer payload, carried verbatim
}

export type ComposerDoc = Segment[]   // linear, ordered. No nesting.
```

**Invariants (normalized form):** adjacent `text` segments are merged; empty `text` segments are dropped (except a single empty doc `[]`). `normalizeValue` enforces this so the model is canonical regardless of edit order.

### Serialization

```ts
serializeToText(doc: ComposerDoc, opts?: {
  entity?: (e: EntityRef) => string   // per-render override; default below
}): string
```

Default per-segment rendering:
- `text` → its `text` verbatim.
- `entity` → `entity.promptText ?? entity.label`, rendered **inline** (matches how the pill reads visually, e.g. `"Record & Replay I'm going to show y…"`).

The default string is a convenience/preview. The **structured `doc` is the source of truth** the consumer parses for real expansion (it carries `kind`/`id`/`data`). The consumer may pass `opts.entity` or ignore the string entirely and walk the `doc`.

### Value API (symmetric, pre-populatable)

- `value` accepts `string | ComposerDoc`. A string normalizes to a single `text` segment. A `ComposerDoc` can pre-populate pills programmatically.
- Change/submit events emit the `ComposerDoc`. Round-trips: `doc → set value → doc` is lossless (entities preserve `data`).

## The contenteditable view (`composer.tsx`)

**Strategy: DOM-as-source-of-truth, derive the model** (OpenCode's approach; far less code than a controlled editor, and it lets the browser own text editing, IME, and native caret).

- The editable surface is a single `contenteditable="plaintext-only"` element (with a graceful fallback to `contenteditable="true"` + paste sanitization for Firefox, which lacks `plaintext-only`). `plaintext-only` blocks rich formatting for free — directly serves the "not an RTE" goal.
- **Text** lives in native text nodes. **Entities** are atomic inline elements: `<span data-kai-entity data-kind data-id contenteditable="false">…icon + label…</span>`. The full `EntityRef` (including `data`) is stored in a `WeakMap<HTMLElement, EntityRef>` keyed by the pill element (dataset alone can't hold objects).
- **DOM → model:** on `input` (and after programmatic mutations), walk the editable's child nodes in order: text node → `text` segment; entity span → `entity` segment. `normalizeValue` canonicalizes. Emit `kai-value-change`.
- **model → DOM:** only on external `value` set (or initial mount) — render segments to nodes once, then let the browser drive subsequent edits. We do **not** re-render on every keystroke (avoids caret-restoration pain).

### Caret / atomic deletion

- Entity pills are `contenteditable=false`, so the browser treats them as atomic objects: a single `Backspace`/`Delete` against a pill removes the whole node. We add a `keydown` guard to make this deterministic across browsers (select-then-delete the pill if the caret is adjacent), then re-derive the model.
- A `​` zero-width space is maintained immediately after each pill so the caret has a valid text position to land in (OpenCode's convention). These ZWSPs are stripped during DOM → model parsing so they never enter `text` segments or serialization.
- Caret/offset helpers live in the headless model where the logic is pure; the view supplies the DOM mapping.

### Auto-grow

Simpler than the textarea: a contenteditable block grows with its content natively. We set `min-height` (one line) and `max-height` (prop, default 240px) with `overflow-y: auto`. No `scrollHeight` measurement loop required. A `ResizeObserver` (or the existing `createEffect` on value) notifies the host if it needs to react.

## Triggers & menus

A prop-driven registry, consistent with the existing `slashCommands` pattern:

```ts
interface TriggerDef {
  char: string                 // '/' or '@' (or custom)
  kind: string                 // entity kind produced on select, e.g. 'skill'
  items?: TriggerItem[]        // catalog for the built-in menu (optional)
}
interface TriggerItem { id: string; label: string; icon?: string; promptText?: string; data?: Record<string, unknown> }
```

Behavior:
- Typing a trigger char at a word boundary opens a caret-anchored menu (built with the existing `Popover` + `usePosition`/`useDismiss` floating primitives). Subsequent typing becomes the query; the menu filters `items`.
- Selecting an item replaces the trigger+query text with an entity pill (`kind` from the trigger, fields from the item), inserts a trailing space + ZWSP, closes the menu, and refocuses.
- `Escape` / outside-click / breaking the token (space before selecting) closes the menu, leaving the typed text as plain text.
- **Async / custom menus:** the component also emits `kai-trigger` `{char, query, rect}` (caret rect for positioning) and `kai-trigger-close`, so a consumer can render its own list and call a method/set a prop to insert an entity. Built-in menu is used when `items` is provided; events fire regardless.

## Keyword highlighting (decoration-only)

- Matched ranges are **styled, never converted to entities** — so highlighting has zero effect on the model or serialization. The text remains ordinary editable text.
- Mechanism: the **CSS Custom Highlight API** (`CSS.highlights.set(name, new Highlight(...ranges))` + `::highlight(name)` styles) — it decorates ranges without mutating the DOM, so it never disturbs the caret or contenteditable text. Fallback for unsupported browsers: skip highlighting (it is purely cosmetic) — no mirror overlay in v1 (YAGNI).
- API: a `highlights` prop — either `string[]` keywords or `{ pattern: string | RegExp; class?: string }[]`. Recomputed on input (debounced).

## Events (the `kai-composer` contract)

```ts
'kai-submit':        { doc: ComposerDoc; text: string; entities: EntityRef[] }
'kai-value-change':  { doc: ComposerDoc; text: string; entities: EntityRef[] }
'kai-entity-add':    { entity: EntityRef }        // a pill was inserted
'kai-entity-remove': { entity: EntityRef }        // a pill was deleted
'kai-trigger':       { char: string; query: string; rect: DOMRect }   // menu open / query change
'kai-trigger-close': {}
// Textarea-parity event surface (added 2026-06-22):
'kai-focus':         { originalEvent: FocusEvent }
'kai-blur':          { originalEvent: FocusEvent }
'kai-focusin':       { originalEvent: FocusEvent }
'kai-focusout':      { originalEvent: FocusEvent }
'kai-keydown':       { key: string; originalEvent: KeyboardEvent }     // fires for every key
'kai-paste':         { text: string; originalEvent: ClipboardEvent }
```

`kai-submit` and `kai-value-change` are the parity surface with `<kai-prompt-input>` (which today emits `kai-submit {value}` / `kai-value-change {value}`) — here `value` is replaced by the richer `{doc, text, entities}`. `text` is the drop-in equivalent of the old `value` for simple consumers. `kai-value-change` is the change/input equivalent (named for sibling-element consistency, not the DOM `input`).

**Shadow-DOM event note:** `focus`/`blur` are NOT composed, so they don't escape the shadow root — `kai-focus`/`kai-blur` re-expose them on the host. `keydown`/`paste`/`focusin`/`focusout` ARE composed and already reach the host as native events; the `kai-*` versions give a uniform listen-on-the-host surface, and `originalEvent` retains full `preventDefault`/clipboard access. There is no `kai-change` — contenteditable has no native `change` event; use `kai-value-change`.

## Props (the `kai-composer` element)

| Prop | Type | Notes |
|---|---|---|
| `value` | `string \| ComposerDoc` | controlled; object prop set via JS property (per `kai-` contract) |
| `placeholder` | `string` | scalar attribute |
| `disabled` | `boolean` | scalar |
| `loading` | `boolean` | scalar |
| `maxHeight` | `number \| string` | default `240` |
| `triggers` | `TriggerDef[]` | JS property (array) |
| `highlights` | `string[] \| HighlightRule[]` | JS property |
| `submitOnEnter` | `boolean` | default `true` (Shift+Enter = newline) |

## Extensibility model

Adding a new entity kind is **non-structural**:
1. Add a `TriggerDef` (`char` + `kind` + `items` or async via `kai-trigger`).
2. (Optional) provide `promptText` per item, or a `serializeToText` `entity` override, for custom flattening.
3. (Optional) a per-`kind` pill renderer hook for custom pill appearance (default renderer: icon + label).

No new segment type, no parser change. `EntityRef.data` carries any consumer payload through verbatim, so the receiver can do arbitrary resolution.

## Web-component wrapping

Standard `defineWebComponent('kai-composer', propDefaults, Facade)`:
- Scalars (`placeholder`, `disabled`, `loading`, `maxHeight`, `submitOnEnter`) as attributes; arrays/objects (`value`, `triggers`, `highlights`) as JS properties.
- Facade maps props to `<Composer>` and `dispatch`es the `kai-*` events above (non-bubbling CustomEvents on the host).
- Generated React wrapper (`@kitn.ai/ui/react`) follows the existing pipeline; out of scope to hand-write.

## Testing strategy (TDD + IVP)

- **Unit (jsdom, TDD core):** `composer-model.ts` — `normalizeValue` (string + doc, merge/drop rules), `serializeToText` (text, single entity, multiple entities, `promptText` override, custom `entity` fn), offset/caret helpers, round-trip `doc → value → doc`. These are written test-first; the model is pure so coverage is cheap and decisive.
- **Browser (Storybook + Playwright):** real contenteditable interactions — type text; trigger `/` opens menu at caret; select inserts a pill; backspace deletes the whole pill atomically; multiple pills; auto-grow caps at `maxHeight`; Enter submits / Shift+Enter newlines; emitted `kai-submit` detail shape; keyword highlight applies without breaking the caret.
- **IVP (independent visual proof):** a Playwright script drives the element in a real page and asserts the screenshot matches the target (pill with icon+label inline, like the reference image), plus logs the emitted `kai-submit` payload to prove the structured `doc`.
- **Element logic:** pure helpers (DOM parse → model, trigger detection) unit-tested with synthetic DOM, as the existing `prompt-input-slash-command.test.tsx` does.

## Build / verification

Built in an **isolated git worktree**. Implementation follows TDD per unit; work is split across agents (model, view, element, tests) where independent. Before "done": `npm test`, `npm run typecheck`, and the IVP Playwright pass must be green.

## Out of scope / future

- Rich text formatting of any kind (permanent non-goal).
- Nested entities, entity editing-in-place, entity drag-reorder.
- File-content resolution / attachment reading (consumer/server concern).
- Promoting `kai-composer` to replace `kai-prompt-input` (separate, later decision).
- Mirror-overlay highlight fallback for browsers without the CSS Highlight API.
- **React wrapper (`@kitn.ai/ui/react`) — deferred. v1 ships element + Solid only.** Generate it once the model is proven.

## Resolved decisions

- **Element name:** `kai-composer` (confirmed).
- **React wrapper:** out of scope for v1 (prototype is element/Solid only); add later.

## Prototype status (built 2026-06-21)

Implemented on branch `worktree-kai-composer` via TDD. Files: `src/primitives/composer-model.ts`, `composer-triggers.ts`; `src/components/composer.tsx`, `composer-dom.ts`, `composer-highlight.ts`; `src/elements/composer.tsx` (registers `kai-composer`). Plan: `docs/superpowers/plans/2026-06-21-kai-composer-rich-input.md`.

**Verified:** 36 unit tests (jsdom) + 10 Storybook browser tests (Playwright + axe) + a 3-case Playwright IVP (`tests/e2e/composer-ivp.spec.ts`) that drives the real element with native keyboard. Full suite, typecheck (4 passes), and `npm run build` (47 elements) all green.

**Notable find:** `document.getSelection()` retargets out of an open Shadow Root in Chromium, so the first real-browser run had pills landing in the light DOM and submit never firing — fixed by `ShadowRoot.getSelection()` (`getActiveSelection` in `composer.tsx`). Every jsdom/synthetic test passed despite this; only the IVP caught it.

**Demo:** `npm run dev` → Storybook → **Elements/Composer** (`Skills`, `Mentions`, `Prefilled`, `Highlighted`) or **Solid (Advanced)/Elements/Composer**. IVP: `npm run test:composer-ivp`.

**Known v1 limitations (deferred):** highlight `highlights` prop isn't reactive after mount (recomputed on input/mount only); per-rule highlight `class` not yet wired (single default highlight); declarative `<kai-trigger>` light-DOM children not read (prop-driven `triggers` only); a trigger char typed immediately adjacent to a pill (no space) isn't detected; `Composer` is one large file (~600 lines) — extract the trigger-menu + caret helpers when promoting past prototype.
