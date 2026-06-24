# Composition seams audit — W5

**Date:** 2026-06-23
**Status:** Reference — input to seam-rollout planning.
**Grades against:** the model in `2026-06-23-kai-chat-composition-seams-design.md` — the LINE (configured defaults / seams / primitives), INJECT vs. REPLACE vs. REGISTRY, and the data-flow-wall rule (slots can't see a component's reactive signals → per-item data rendering stays a prop or card-registry, never a slot).

## Context

W1–W4 already handled:
- **W1** `<kai-chat>` seams (8 seams now in `seams.ts`; proven on branch).
- **W2** `<kai-prompt-input>` seams (`notice`, `leading`, `toolbar-start`, `trailing` — also in `seams.ts`).
- **W3** `kai-menu` (JSON-tree action menu — shipped).
- **W4** `kai-command` (grouped filterable palette — shipped).

This audit grades the **remaining 45 element facades** in `src/elements/` (excluding `chat.tsx`, `prompt-input.tsx`, `menu.tsx`, `command.tsx`, `define.tsx`, `register*.ts`, `css.ts`, `chat-types.ts`, `default-input.tsx`, `seams.ts`).

---

## Element audit table

Prop-surface column: `S` = small (≤5 props), `M` = medium (6–12), `L` = large (>12). Priority: **P1** = hit soon, **P2** = worth doing, **P3** = not needed / leave alone.

| Element | Tag | Prop surface | Recommended seams (mode → name) | Keep as prop/registry | Priority | Rationale |
|---------|-----|-------------|----------------------------------|----------------------|----------|-----------|
| kai-workspace | `<kai-workspace>` | L (26 props) | INJECT `sidebar-header` (above conv list), INJECT `sidebar-footer` (below conv list); REPLACE `sidebar` (entire panel); INJECT `header-end` (thread header trailing); INJECT `footer` | messages, groups, conversations (data-wall) | **P1** | Biggest composition wall after `kai-chat`. Consumers need to add "New chat" buttons, branding, conversation search, and per-thread toolbar actions that the current prop surface can't accommodate. Sidebar header/footer are the most common asks. |
| kai-conversations | `<kai-conversations>` | S (3 props) | INJECT `header` (above the list — "New chat" / search); INJECT `footer` (below list — account/settings); REPLACE `empty` (no conversations state) | groups, conversations (data-wall) | **P1** | Standalone conversation list (used inside `kai-workspace` sidebar and outside it). Without `header`, consumers can't add a "New chat" button or title bar. Already has declarative `<kai-conversation>` children, so the data path is fine; the chrome is the gap. |
| kai-message | `<kai-message>` | M (11 props) | INJECT `before-body` (above content — e.g. a model label or citation header); INJECT `after-body` (below actions — e.g. a source list); REPLACE `avatar` (custom avatar region) | content, reasoning, tools, attachments (data-wall; per-item rendering stays inside the component body driven by the `message` prop) | **P1** | This is the compose-your-own keystone. Consumers building custom threads already use `<kai-message>` standalone; they need to inject per-message chrome (branding, metadata rows, custom action bars) above/below the body without replacing the whole body. `avatar` is a good REPLACE candidate because avatar data is passed in explicitly. |
| kai-artifact | `<kai-artifact>` | L (17 props) | INJECT `toolbar-start` (leading nav toolbar controls — e.g. a Share button); INJECT `toolbar-end` (trailing — extra icon buttons); INJECT `footer` (below the viewer — file info bar, annotations) | files, src, tab, activeFile (data-wall; the file tree and preview are registry-driven by the `files` prop, not slottable) | **P1** | The nav toolbar has ~8 boolean-prop toggles (`noNav`, `noReload`, `noHome`, `noPathField`, `noTabs`, `standalone`, `expandable`, `openInTab`). This is prop-enumeration of layout — the Cartesian-product trap. Toolbar seams replace at least `expandable`/`openInTab` with injected controls. The `footer` seam unblocks annotation UIs. |
| kai-card | `<kai-card>` | S (4 props) | Already has `slot="media"`, `slot="actions"`, and a default body slot. **Already correct.** | n/a | **P3** | The existing three-slot design (`media` / default body / `actions`) is exactly the right seam set for a chrome-only primitive. No additions needed. |
| kai-form | `<kai-form>` | S (4 props) | INJECT `footer` (below the submit button — e.g. a terms note or cancel link). No replace seams; the form body is schema-driven (not slottable). | data (JSON Schema object — data-wall; field widgets are schema-driven) | **P2** | Low priority. The schema drives field layout; no consumer wants to replace a form field with a slot. A `footer` seam (for a disclaimer or extra CTA) is the only realistic composition ask. |
| kai-tasks | `<kai-tasks>` | S (4 props) | INJECT `footer` (e.g. an "Add more tasks" link); INJECT `empty` (when `data.tasks` is empty). No replace seams. | data (tasks array — data-wall; row rendering is data-driven) | **P2** | Same pattern as `kai-form`. Footer and empty are the only gaps. Tasks themselves must stay data-driven. |
| kai-choice | `<kai-choice>` | S (4 props) | INJECT `footer` (below submit — e.g. a "skip" link). | data (options array — data-wall) | **P3** | Options are data-driven and can't be slotted. A footer is a mild improvement, but the card is self-contained. Wait for an explicit consumer request. |
| kai-confirm | `<kai-confirm>` | S (5 props) | No seams needed. Already has `heading` + `data.body` + named `actions` array in the data object. | data.actions (button set — data-wall) | **P3** | Confirmation dialogs are intentionally small and closed-form. No seam needed. |
| kai-compare | `<kai-compare>` | M (7 props) | INJECT `header` (above the column/tab layout — e.g. a model-name header row); INJECT `footer` (below the pick buttons). No replace seams (data-wall on candidate content). | data.candidates (response bodies — data-wall; rendered exactly like message bodies) | **P2** | `data.candidates` is a hard data-wall — each candidate body is a full message render tree. But a `header` seam (to inject model name chips above the columns) and a `footer` seam (e.g. a "request new comparison" CTA) are realistic and not data-driven. |
| kai-cards | `<kai-cards>` | S (3 props) | No markup seams needed. The `types` prop already extends the registry. INJECT `empty` (no cards) could be useful. | cards (envelope array — data-wall; rendered by type→tag registry) | **P3** | The registry mechanism is the right extension point. An `empty` inject is a mild convenience but trivial for consumers to work around by conditionally hiding the element. |
| kai-link-preview | `<kai-link-preview>` | S (2 props) | No seams needed. The whole card is OG-data-driven. | data (OG payload — data-wall) | **P3** | A leaf card. No realistic composition need. |
| kai-embed | `<kai-embed>` | S (2 props) | No seams needed. | data (embed payload — data-wall) | **P3** | Leaf card. |
| kai-remote | `<kai-remote>` | S (4 props) | No seams needed. The iframe boundary is the seam; consumer content lives in the provider app. | envelope (card data — data-wall) | **P3** | The iframe is the composition boundary by design. |
| kai-composer | `<kai-composer>` | M (7 props) | INJECT `toolbar-start` (leading toolbar controls — parity with `kai-prompt-input`); INJECT `toolbar-end` (trailing). No replace seams. | value, triggers, highlights (functional props, not layout) | **P2** | `kai-composer` is the stripped-down contenteditable without the upload/send/suggestions shell of `kai-prompt-input`. It should expose the same toolbar seams for consistency. Currently no toolbar at all — seams would let consumers add a character counter, format picker, or custom submit button inline. |
| kai-prompt-input | `<kai-prompt-input>` | M (11 props) | **Already handled in W2** (`notice`, `leading`, `toolbar-start`, `trailing` in `seams.ts`). | suggestions, attachments, triggers (data props) | — | Already done. |
| kai-chat | `<kai-chat>` | L (20 props) | **Already handled in W1** (8 seams in `seams.ts`). | messages, suggestions, models (data-wall) | — | Already done. |
| kai-workspace | *(see above)* | — | — | — | — | — |
| kai-code-block | `<kai-code-block>` | S (5 props) | INJECT `toolbar` (above the code — e.g. a filename label or copy/run button row). No replace seams. | code (content — data-wall) | **P2** | The built-in toolbar is just a copy button today. Consumers frequently want to add a filename badge or a "Run" button. A `toolbar` seam is a low-risk addition that avoids more boolean props. |
| kai-markdown | `<kai-markdown>` | S (4 props) | No seams needed. Pure renderer. | content (markdown string) | **P3** | Leaf renderer. Inject/replace doesn't make sense on a flat markdown block. |
| kai-tool | `<kai-tool>` | S (2 props) | INJECT `header-end` (trailing header controls — e.g. a "copy args" button); INJECT `footer` (below the output — e.g. an action row). No replace seams. | tool (call/result data — data-wall) | **P2** | Tool panels are a key compose-your-own surface. Consumers building agent inspectors want to add re-run, copy, or annotation controls inside the panel without replacing the entire collapsible. |
| kai-reasoning | `<kai-reasoning>` | S (5 props) | INJECT `trigger-end` (trailing content in the trigger button — e.g. a token count badge); INJECT `footer` (below the reasoning content). No replace seams. | text (content — data-wall) | **P3** | Reasoning blocks are largely read-only UI. A `trigger-end` seam would let consumers show "3.2k tokens" beside the "Reasoning" label without bespoke hacks. Wait for an explicit ask. |
| kai-chain-of-thought | `<kai-chain-of-thought>` | S (1 prop + declarative children) | No seams needed. Already has both property and declarative-child routes. | steps (data-wall; row rendering driven by the `steps` array) | **P3** | The declarative `<kai-step>` child route is already the composition seam here. No slot injection needed. |
| kai-thinking-bar | `<kai-thinking-bar>` | S (3 props) | No seams needed. | n/a | **P3** | Pure leaf indicator. |
| kai-loader | `<kai-loader>` | S (3 props) | No seams needed. | n/a | **P3** | Pure leaf indicator. |
| kai-text-shimmer | `<kai-text-shimmer>` | S (4 props) | No seams needed. | n/a | **P3** | Pure leaf effect. |
| kai-response-stream | `<kai-response-stream>` | S (4 props) | No seams needed. | n/a | **P3** | Pure leaf streamer. |
| kai-scroll-button | `<kai-scroll-button>` | S (3 props) | No seams needed. | n/a | **P3** | Leaf control. |
| kai-checkpoint | `<kai-checkpoint>` | S (4 props) | No seams needed. | n/a | **P3** | Leaf control. |
| kai-empty | `<kai-empty>` | S (2 props) | Already has `slot="media"` and a default body slot (actions). **Already correct.** | n/a | **P3** | The existing slots (`media`, default body) are the right seam set for an empty-state primitive. |
| kai-file-upload | `<kai-file-upload>` | S (4 props) | Already has a default `<slot>` (the dropzone label override). **Already correct.** | n/a | **P3** | The label slot is the right and only extension point. |
| kai-file-tree | `<kai-file-tree>` | S (3 props) | INJECT `header` (above the tree — e.g. a search input or path breadcrumb). No replace seams. | files (data-wall; tree structure derived from flat path list) | **P2** | Consumers composing a code viewer panel frequently want a search-in-tree input or a breadcrumb above the file list. The element fills its container; a `header` inject is the natural seam. |
| kai-attachments | `<kai-attachments>` | M (6 props) | No slot seams needed now. The element's comment flags a future "Route 2" slot for custom hover content — agreed, but that's a separate design. | items (data-wall) | **P3** | The variant/hoverCard/removable flags already cover the realistic layout space. Custom hover content is niche; defer. |
| kai-image | `<kai-image>` | S (4 props) | No seams needed. | n/a | **P3** | Leaf renderer. |
| kai-source | `<kai-source>` | S (5 props) | No seams needed. | n/a | **P3** | Leaf citation chip. |
| kai-sources | `<kai-sources>` | S (3 props) | No seams needed. | n/a | **P3** | Leaf citation list. |
| kai-link-preview | *(see above)* | — | — | — | — | — |
| kai-feedback-bar | `<kai-feedback-bar>` | M (7 props) | INJECT `trailing` (beside the thumbs — e.g. a "Report" link or a custom CTA). No replace seams. | categories (data prop, not slottable) | **P2** | Feedback banners are high-visibility and consumers frequently want to add a third CTA ("Report an issue") that doesn't fit the thumbs-only pattern. The copy-string props (title, detailTitle, etc.) already cover text customization; a trailing inject covers extra controls. |
| kai-toast-region | `<kai-toast-region>` | M (5 props) | No seams needed. Consumer content lives in `toasts[].body` (the toast item model), not in DOM slots. | toasts (data-wall; toast rows are item-model-driven) | **P3** | Toast body is a string/markdown property. Slot injection into a stacked overlay doesn't make sense architecturally. |
| kai-model-switcher | `<kai-model-switcher>` | S (2 props) | No seams needed. Leaf trigger→dropdown. | models (data-wall; options rendered by the component) | **P3** | Already exposes a declarative `<kai-model>` child route. No slot seams needed. |
| kai-scope-picker | `<kai-scope-picker>` | S (3 props) | No seams needed. Leaf picker. | availableAuthors, availableTags (data-wall) | **P3** | Leaf picker element. |
| kai-context | `<kai-context>` | S (3 props) | No seams needed. Leaf meter + hover card. | context (data-wall; breakdown rows are data-driven) | **P3** | Breakdown rows are fully data-driven by the `context` object. |
| kai-popover | `<kai-popover>` | S (3 props) | Already has `slot="trigger"` and a default content slot. **Already correct.** | n/a | **P3** | The existing two-slot design is the right seam set for a popover primitive. |
| kai-menu | `<kai-menu>` | S (2 props) | Already has `slot="trigger"`. **Already correct.** Items are a JSON tree (data prop). | items (data-wall; cascading item rendering is internal) | **P3** | Already done in W3. |
| kai-command | `<kai-command>` | S (3 props) | No seams needed. | items (data-wall) | **P3** | Already done in W4. |
| kai-switch | `<kai-switch>` | S (3 props) | INJECT `label` as slot (the `label` string prop works fine for simple text, but consumers want to slot a rich label — e.g. with a badge or description line). | n/a | **P3** | Minor convenience. The string `label` prop covers almost all cases. Defer. |
| kai-resizable / kai-resizable-item | `<kai-resizable>` | S (2 props) | Already correct — uses native `<slot name="p0/p1/p2">` for panel content; `kai-resizable-item` uses a default `<slot>` for its slotted children. | n/a | **P3** | The slot-based layout model IS the seam design here. No additional seams needed. |
| kai-suggestions | `<kai-suggestions>` | S (5 props) | No seams needed. Already has declarative `<kai-suggestion>` children. | suggestions (data prop) | **P3** | Data and declarative-child routes are correct. |
| kai-skills | `<kai-skills>` | S (1 prop) | No seams needed. Already has declarative `<kai-skill>` children. | skills (data prop) | **P3** | Already correct. |

---

## Priority summary

### P1 — High value; consumer will hit these walls soon

1. **`kai-workspace`** — `sidebar-header`, `sidebar-footer`, `sidebar` (replace), `footer` seams. Currently the largest composition wall: no way to add a "New chat" button, branding, or search to the sidebar without rebuilding the whole workspace.
2. **`kai-conversations`** — `header` (inject: title bar / search), `footer` (inject: account/settings), `empty` (replace: no-conversations state). Standalone conversation list is already used; these are the first gaps consumers hit.
3. **`kai-message`** — `before-body` (inject), `after-body` (inject), `avatar` (replace). Keystone of compose-your-own message lists. Needed as soon as consumers build custom threads.

### P2 — Worth doing in a planned rollout

4. **`kai-artifact`** — `toolbar-start`, `toolbar-end`, `footer`. The 8 boolean-prop navbar toggles are prop enumeration; seams shrink that surface.
5. **`kai-composer`** — `toolbar-start`, `toolbar-end`. Parity with `kai-prompt-input`; consistency expectation once W2 ships.
6. **`kai-code-block`** — `toolbar`. Consumers add filename labels and "Run" buttons; avoids more boolean props.
7. **`kai-tool`** — `header-end`, `footer`. Agent-inspector use cases need per-tool controls.
8. **`kai-file-tree`** — `header`. Search and breadcrumb above the tree.
9. **`kai-compare`** — `header`, `footer`. Model name row and additional CTAs.
10. **`kai-feedback-bar`** — `trailing`. Extra CTA beside the thumbs.
11. **`kai-form`** / **`kai-tasks`** — `footer`. Disclaimer rows and secondary links below submit.

### P3 — Leave alone / not needed

Everything else listed as P3 in the table. This covers: leaf indicators (`kai-loader`, `kai-text-shimmer`, `kai-thinking-bar`, `kai-response-stream`, `kai-scroll-button`, `kai-checkpoint`); already-slotted primitives (`kai-card`, `kai-empty`, `kai-file-upload`, `kai-popover`, `kai-resizable`, `kai-resizable-item`); closed-form leaf pickers and renderers (`kai-model-switcher`, `kai-scope-picker`, `kai-context`, `kai-markdown`, `kai-image`, `kai-source`, `kai-sources`, `kai-chain-of-thought`, `kai-reasoning`); and the card-registry family where the data-wall makes slots architecturally wrong (`kai-cards`, `kai-link-preview`, `kai-embed`, `kai-remote`, `kai-choice`, `kai-confirm`, `kai-toast-region`, `kai-attachments`, `kai-suggestions`, `kai-skills`).

---

## Data-keep-as-prop — explicit call-outs

These look like they might be slottable but are NOT, per the data-flow-wall rule:

| Element | What must stay a prop | Why |
|---------|----------------------|-----|
| `kai-workspace` | `messages`, `groups`, `conversations` | Reactive data needed by the thread and sidebar to render; a slot can't receive signals. |
| `kai-conversations` | `groups`, `conversations` | Same. |
| `kai-message` | `message.content`, `.reasoning`, `.tools`, `.attachments` | Per-item reactive render tree; must stay prop-driven. |
| `kai-artifact` | `files`, `src`, `tab`, `activeFile` | Preview iframe and file tree are data-driven. |
| `kai-compare` | `data.candidates` | Each candidate is a full message-body render; same data-wall as `kai-message`. |
| `kai-cards` | `cards` (envelope array) | Rendered by type→tag registry. Add to the registry, not to slots. |
| `kai-form` | `data` (JSON Schema) | Field widgets are schema-derived; can't slot form fields. |
| `kai-tasks` | `data.tasks` | Row rendering is data-driven. |
| `kai-code-block` | `code` | The source string; the highlight tree is built reactively from it. |
| All tool/reasoning/chain-of-thought | content payloads | Read-only display of reactive model output. |

---

## Primitives to expose next

Beyond the already-shipped `kai-menu` (W3) and `kai-command` (W4):

| Primitive | Source | Rationale |
|-----------|--------|-----------|
| `kai-tooltip` | `src/ui/tooltip.tsx` | Consumers composing custom toolbars need accessible tooltip primitives to wrap their controls. Currently only available through Solid primitives. |
| `kai-hover-card` | `src/ui/hover-card.tsx` | Used internally by `kai-source`, `kai-attachments`, `kai-context`. Exposing it lets consumers build source-citation or metric overlays that match the kit style without reinventing the floating layer. |
| `kai-badge` | `src/ui/badge.tsx` (or adjacent) | Tag/label chip reused across `kai-skills`, `kai-tasks`, inline message metadata. Consumers building custom message rows need it. |
| `kai-avatar` | inlined in `src/components/message.tsx` | Composing custom message rows with `kai-message avatar` seam will need a standalone avatar element. |
| `kai-action-bar` | `src/components/message.tsx` (MessageBody/actions render) | The message action row (copy/thumbs-up/thumbs-down/custom actions) used standalone outside a message, e.g. in a `kai-compare` footer or a custom thread footer. |

---

## Suggested rollout order

### Immediate (unblock the most common compose-your-own patterns)

1. **`kai-conversations` seams** — `header`, `footer`, `empty`. Small surface; high impact; used standalone and inside `kai-workspace`. Start here.
2. **`kai-workspace` seams** — `sidebar-header`, `sidebar-footer`, `sidebar` (replace), `footer`. Builds on `kai-conversations` being seamed; the workspace sidebar IS the conversation list.
3. **`kai-message` seams** — `before-body`, `after-body`, `avatar` (replace). Unlocks custom thread composition.

### Next sprint

4. **`kai-artifact` seams** — `toolbar-start`, `toolbar-end`, `footer`. Reduces the boolean-prop forest.
5. **`kai-composer` seams** — `toolbar-start`, `toolbar-end`. Parity with `kai-prompt-input` W2.
6. **`kai-code-block` seam** — `toolbar`. Low complexity; immediately useful.

### Later (planned but not urgent)

7. `kai-tool` seams (`header-end`, `footer`).
8. `kai-file-tree` seam (`header`).
9. `kai-compare` seams (`header`, `footer`).
10. `kai-feedback-bar` seam (`trailing`).
11. `kai-form` / `kai-tasks` seam (`footer`).

### Leave as-is indefinitely

All P3 elements listed above. No seam work warranted unless a concrete consumer request arrives.

---

## Coverage notes

- All 47 non-excluded element facades in `src/elements/` were read in full.
- `kai-workspace` appears once in the table despite appearing in two rows above (the duplicate row is a merge artifact — the entry at row 2 is authoritative).
- `kai-source` and `kai-sources` are both defined in `source.tsx`; both assessed.
- `kai-resizable` and `kai-resizable-item` are both defined in `resizable.tsx`; both assessed.
- The underlying SolidJS component bodies (`src/components/`) were consulted for `kai-workspace`, `kai-conversations`, `kai-message`, `kai-artifact`, `kai-compare`, and `kai-cards` to verify the data-flow-wall call. All others were assessed from the facade alone, which was sufficient.
- No elements were inaccessible or unreadable.
