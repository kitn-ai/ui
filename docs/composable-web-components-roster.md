# Composable Web Components — Component Roster & API Plan

Status: **planning** (spike on branch `spike/composable-web-components`). This document gives every component in the kit a home: which become standalone custom elements, which stay SolidJS-only, and the proposed property/attribute/event/slot API for each. It's the map we build against before going wide.

See also: `docs/web-components.md` (current shipped elements) and `docs/handoff/2026-06-11-web-components-and-publishing.md` (spike context + decisions).

---

## 1. The mapping rules (how a Solid primitive becomes an element)

Each element is its own complete Solid tree (Shadow DOM + Solid root). **Composition happens at the data layer, not by splitting compound components across the DOM.** Five rules cover ~everything:

| In the SolidJS layer… | …becomes, on the web component |
|---|---|
| a `variant` / `size` / `mode` prop | a **`variant`/`size` attribute** (string) |
| including/omitting a sub-part to change the look | a **boolean flag attribute** (`hover-card`, `removable`) — resolved by `flag()` so bare attrs work |
| object/array data to display | a **JS property** (`el.messages = …`) — never an attribute |
| a **fire-and-forget** callback (`onSelect`, `onRemove`) | a non-bubbling **CustomEvent** (`select`, `remove`) |
| a callback that **returns a value** (`onTranscribe: (b) => Promise<string>`) | a **function-valued property** (`el.transcribe = async b => …`) — events can't return values |
| genuinely custom inner markup | a named **`<slot>`** (opt-in, "Route 2") |

Everything else — Solid hooks, generic headless UI primitives, and compound sub-parts — **stays in the SolidJS layer** as the escape hatch (`import { … } from '@kitnai/chat'`).

Infra already in place (Phase 0, on the spike branch): `defineKitnElement<P, E>` bakes in a shared constructable stylesheet, a typed `dispatch<E>`, and `flag(name)`.

---

## 2. Cross-element coordination — do we need a store?

**No store in v1. The host coordinates.** Because Solid Context does not cross element boundaries, separate elements share state through the host: data in via properties, out via events, host wires A→B. Example: `<kc-conversations>` fires `select` → host sets `<kc-chat>.messages`. This is the correct controlled-component model and is idiomatic in every host framework.

- We would **not** use `@stencil/store` — it's a separate reactivity system; bridging it to Solid adds cost for nothing. If we ever want a store, it'd be a tiny **Solid `createStore`** singleton, already in the bundle.
- A store only earns its place if we later want elements to **auto-coordinate without host wiring** (e.g. a `<kc-provider>` ancestor that children read). That reintroduces implicit global coupling + multi-instance ambiguity, so it's **deferred** — add opt-in only on a concrete need. SSR is explicitly out of scope.

---

## 3. Roster at a glance

Legend: ✅ shipped · 🔬 spike (this branch) · 📋 proposed · 🧩 primitive-only (stays Solid) · ⤵️ folded into another element

### Feature elements (the public web-component surface, ~28)

| Element | Source component | Status | Notes |
|---|---|---|---|
| `<kc-chat>` | (composes many) | ✅ | batteries-included |
| `<kc-conversations>` | conversation-list | ✅ | |
| `<kc-prompt-input>` | prompt-input + default-input | ✅ | |
| `<kc-thinking-bar>` | thinking-bar | 🔬 | |
| `<kc-model-switcher>` | model-switcher | 🔬 | |
| `<kc-attachments>` | attachments | 🔬 | variant+flags exemplar |
| `<kc-message>` | message (+ reasoning/tool/attachments/actions) | 📋 | **data-driven single message** — the keystone |
| `<kc-markdown>` | markdown | 📋 | |
| `<kc-code-block>` | code-block | 📋 | |
| `<kc-reasoning>` | reasoning | 📋 | |
| `<kc-tool>` | tool | 📋 | |
| `<kc-context>` | context | 📋 | |
| `<kc-chain-of-thought>` | chain-of-thought | 📋 | needs a `steps` data shape |
| `<kc-source>` / `<kc-sources>` | source | 📋 | |
| `<kc-loader>` | loader | 📋 | 12 variants |
| `<kc-feedback-bar>` | feedback-bar | 📋 | |
| `<kc-suggestions>` | prompt-suggestion | 📋 | list form |
| `<kc-slash-command>` | slash-command | 📋 | overlay/portal |
| `<kc-file-upload>` | file-upload | 📋 | dropzone + slot |
| `<kc-voice-input>` | voice-input | 📋 | **special: function property** |
| `<kc-image>` | image | 📋 | |
| `<kc-text-shimmer>` | text-shimmer | 📋 | |
| `<kc-checkpoint>` | checkpoint | 📋 | |
| `<kc-scope-picker>` | chat-scope-picker | 📋 | |
| `<kc-skills>` | message-skills | 📋 | |
| `<kc-response-stream>` | response-stream | 📋 | property-only data |
| `<kc-empty>` | empty | 📋 | slot-based |
| `<kc-container>` | chat-container | 📋 | optional; slot + scroll |

### Stays SolidJS-only

🧩 **Hooks / config:** `useAutoResize`, `useStickToBottom`, `useTextStream`, `useVoiceRecorder`, `ChatConfig`/`useChatConfig`, `configureCodeHighlighting`, `proseClass`/`textClass`, `cn`.
🧩 **Generic UI primitives:** `Button`, `Avatar`, `Tooltip`, `HoverCard`, `Collapsible`, `ScrollArea`, `Dropdown`, `Textarea`, `Badge`, `Separator`, `Resizable*`, `Skeleton`, `Dialog`. (A host framework already has these; wrapping them is surface area for no value.)

### Folded / context-bound

⤵️ `MessageContent`/`MessageAvatar`/`MessageActions`/`MessageCopyButton` → inside `<kc-message>`. `CodeBlockCode`/`Group` → inside `<kc-markdown>`/`<kc-code-block>`. `ConversationItem` → inside `<kc-conversations>`. `ScrollButton`, `ChatContainerContent`/`ScrollAnchor` → context-bound, live inside `<kc-chat>`/`<kc-container>` (a standalone `<kc-scroll-button>` can't see another element's scroll context).

---

## 4. Proposed APIs

> Convention reminder: **bold = JS property** (objects/arrays must be set this way). Plain `name` in the attributes column = also settable as an HTML attribute. Events are non-bubbling `CustomEvent`s; listen with `el.addEventListener`.

### Phase 1 — message-rendering core (highest value: "compose your own message list")

#### `<kc-message>` — a single message row (keystone element)
Data-driven equivalent of one row inside `<kc-chat>`. Renders markdown/plain content, reasoning, tool calls, attachments, and action buttons from one object.

- **Properties:** **`message: ChatMessage`** (the whole object: `id, role, content, reasoning?, tools?, attachments?, actions?`). Or the flattened convenience props **`tools`**, **`attachments`**, **`actions`** + `content` attribute for simple cases.
- **Attributes:** `role` (`user`|`assistant`), `markdown` (flag, default on for assistant), `prose-size`.
- **Events:** `messageaction` → `{ action: ChatMessageAction }`.
- **Slots:** `actions` (Route 2) for custom action buttons.

#### `<kc-markdown>` — rendered markdown + code
- **Properties:** **`content: string`**.
- **Attributes:** `prose-size`, `code-theme`, `code-highlight` (flag).
- **Events:** none.

#### `<kc-code-block>` — one highlighted code block
- **Properties:** **`code: string`**.
- **Attributes:** `language`, `code-theme`.
- **Events:** none. (Includes a copy button; emits nothing — copy is local.)

#### `<kc-reasoning>` — collapsible reasoning block
- **Properties:** **`text: string`** (the reasoning content).
- **Attributes:** `label`, `open` (flag, controlled), `streaming` (flag, auto-open while streaming), `markdown` (flag).
- **Events:** `openchange` → `{ open: boolean }`.

#### `<kc-tool>` — tool-call panel
- **Properties:** **`tool: ToolPart`** (`type, state, input?, output?, errorText?`).
- **Attributes:** `open` (flag, default-open).
- **Events:** none.

### Phase 2 — header / meta

#### `<kc-context>` — token-usage meter
- **Properties:** **`context: { usedTokens, maxTokens, inputTokens?, outputTokens?, reasoningTokens?, cacheTokens?, estimatedCost? }`** (or individual numeric props).
- **Attributes:** none.
- **Events:** none.

#### `<kc-scope-picker>` — author/tag filter
- **Properties:** **`availableAuthors: string[]`**, **`availableTags: string[]`**, `current-label` (attr).
- **Events:** `scopechange` → `{ filters: SearchFilters | undefined }`.

#### `<kc-feedback-bar>` — thumbs up/down banner
- **Attributes:** `bar-title` (string).
- **Events:** `helpful`, `nothelpful`, `close` (no detail).

### Phase 3 — input ecosystem

#### `<kc-suggestions>` — suggestion chips/list
- **Properties:** **`suggestions: string[]`** (or `{ label, value }[]`).
- **Attributes:** `variant` (`outline`|`ghost`|`default`), `block` (flag → full-width rows), `highlight` (substring).
- **Events:** `select` → `{ value: string }`.

#### `<kc-slash-command>` — command palette overlay
- **Properties:** **`commands: SlashCommandItem[]`**, **`activeIds: string[]`**.
- **Attributes:** `compact` (flag).
- **Events:** `select` → `{ command: SlashCommandItem }`.

#### `<kc-file-upload>` — drag-drop dropzone
- **Attributes:** `multiple` (flag, default on), `disabled` (flag).
- **Events:** `filesadded` → `{ files: File[] }` (fire-and-forget — fine as event).
- **Slots:** default slot = the drop target content/trigger.

#### `<kc-voice-input>` — mic capture + transcription ⚠️ special case
Transcription is a callback that **returns** a value, so it can't be an event.

- **Properties:** **`transcribe: (audio: Blob) => Promise<string>`** (function-valued property — host supplies the transcriber).
- **Attributes:** `disabled` (flag).
- **Events:** `transcription` → `{ text: string }` (fired after `transcribe` resolves), plus optional `audiocaptured` → `{ blob: Blob }` for hosts that prefer to do everything themselves.

> This is the canonical example of the **"value-returning callback ⇒ function property"** rule. Document it prominently; it's the one shape that surprises people coming from events-only thinking.

### Phase 4 — indicators & leaves

#### `<kc-loader>` — animated loader
- **Attributes:** `variant` (`circular`|`classic`|`pulse`|`pulse-dot`|`dots`|`typing`|`wave`|`bars`|`terminal`|`text-blink`|`text-shimmer`|`loading-dots`), `size` (`sm`|`md`|`lg`), `text`.

#### `<kc-text-shimmer>` — animated shimmering text
- **Attributes:** `text` (or default slot), `duration` (number), `spread` (number).

#### `<kc-image>` — base64 / bytes image with skeleton fallback
- **Properties:** **`base64: string`** or **`bytes: Uint8Array`**, `alt` (attr), `media-type` (attr).

#### `<kc-checkpoint>` — bookmark/checkpoint button
- **Attributes:** `variant`, `size`, `tooltip`.
- **Events:** `select` (no detail).

#### `<kc-skills>` — active-skill badges
- **Properties:** **`skills: { id, name }[]`**.

#### `<kc-source>` / `<kc-sources>` — citation link(s) + hover preview
- `<kc-source>` **Attributes:** `href`, `label`, `title`, `description`, `show-favicon` (flag).
- `<kc-sources>` **Properties:** **`sources: { href, title, description }[]`**.

#### `<kc-response-stream>` — animated streaming text
- **Properties:** **`text: string | AsyncIterable<string>`** (property-only — async iterables can't be attributes).
- **Attributes:** `mode` (`typewriter`|`fade`), `speed` (number).
- **Events:** `complete` (no detail).

#### `<kc-empty>` — empty-state layout
- **Attributes:** `empty-title`, `description`.
- **Slots:** `media` (icon/illustration), default slot (actions).

#### `<kc-chain-of-thought>` — step-by-step reasoning ⚠️ needs a data shape
Today the steps are composed children. As one element it needs a **`steps` data model**:
- **Properties:** **`steps: { label: string; content?: string; status?: 'pending' | 'active' | 'complete' }[]`**.
- **Attributes:** `open` (flag).
- **Events:** `stepclick` → `{ index: number }` (optional).

### Optional

#### `<kc-container>` — scroll-aware message viewport
For hosts building a fully custom stream who still want the scroll-to-bottom behavior. Internally owns its scroll context (so it can include its own scroll button — a standalone `<kc-scroll-button>` can't reach across elements).
- **Attributes:** `scroll-button` (flag, default on).
- **Slots:** default slot = messages.

---

## 5. Open API questions to settle during build

1. **`<kc-message>` shape:** single `message` object property (recommended — matches `<kc-chat>`) vs. flattened props + slots. Pick one as canonical.
2. **`<kc-chain-of-thought>` step model:** lock the `steps[]` schema (above) — it's the one element with no natural data prop today.
3. **Function-valued properties** (`<kc-voice-input>.transcribe`): confirm the convention and document it as a first-class pattern, not an exception.
4. **Pluralization:** list-style elements (`<kc-suggestions>`, `<kc-sources>`) vs. singular item elements. Recommend list-form for anything you'd `For`-loop.
5. **Event-name casing:** all lowercase, no prefix, non-bubbling (matches shipped elements). Lock it.

---

## 6. Rollout phases

- **Phase 0 — infra** ✅ (spike): `defineKitnElement<P,E>` + shared stylesheet + `flag()` + typed `dispatch`.
- **Phase 1 — message core:** `<kc-message>`, `<kc-markdown>`, `<kc-code-block>`, `<kc-reasoning>`, `<kc-tool>`. Unlocks "compose your own message list in plain HTML." Highest value.
- **Phase 2 — header/meta:** `<kc-context>`, `<kc-scope-picker>`, `<kc-feedback-bar>` (+ `<kc-model-switcher>` 🔬).
- **Phase 3 — input:** `<kc-suggestions>`, `<kc-slash-command>`, `<kc-file-upload>`, `<kc-voice-input>`.
- **Phase 4 — indicators/leaves:** `<kc-loader>`, `<kc-text-shimmer>`, `<kc-image>`, `<kc-checkpoint>`, `<kc-skills>`, `<kc-source(-list)>`, `<kc-response-stream>`, `<kc-empty>`, `<kc-chain-of-thought>` (+ `<kc-thinking-bar>` 🔬, `<kc-attachments>` 🔬).
- **Cross-cutting (do alongside):** apply `flag()` to existing `<kc-chat>` booleans; fix `theme.css` `@import` 404; emit a custom-elements-manifest → React/Vue wrappers + `HTMLElementTagNameMap` types.

Each phase ships independently; the bundle grows ~1–3 KB gzip per element. Full roster projected ~100–120 KB gzip (projection from planning). **Actual shipped main chunk: ~80 KB gzip** after the Kobalte→DIY replacement removed ~23 KB (102.61 KB → 79.61 KB; see the 2026-06-12 handoff UPDATE for details).
