# Design spec — new components epic (kai-screen, voice, tabs, status, card/conversations/workspace seams)

**Date:** 2026-06-26 · **Repo:** `/Users/home/Projects/kitn-ai/kitn-chat` · **Status:** design approved, ready for an implementation plan.

## 0. Context

Rob brought ~9 high-level component ideas, mapped against the Claude desktop UI (chat shell, a full-screen "Design" takeover, voice mic/waveform, an "upgrade" pill, a promo card, a user menu, Chat/Cowork/Code tabs, a collapsible conversation rail, a pulsing status dot). Triage collapsed them to **4 new elements, 3 extensions, 1 recipe, and 1 bounded host-slot section**, because several "components" are usages of, or extensions to, elements that already ship.

This continues the composition initiative already merged to `main` (#111 docs + #112 interaction API). It obeys the settled philosophy:

- **slot = position · `::part`/token = styling · a prop ONLY for behavior CSS can't express.**
- A slot earns its place only where the **shadow boundary** blocks the consumer.
- **Layout and routing stay the developer's.** We own parts, not routers.
- Expose polished primitives as elements (the `kai-button` pattern) when hand-rolling them is error-prone (a11y, theming, shadow).
- No hardcoded colors; everything is `var(--color-*)`.
- Avoid the Cartesian trap: one flexible element with slots/parts, not a bespoke variant per use-case.

## 1. Decomposition summary

| # | Item (Rob's words) | Outcome | Kind |
|---|---|---|---|
| 1 | Canvas/Frame ("Design" takeover) | `kai-screen` | NEW |
| 2 | Voice Output | `kai-voice-output` | NEW |
| 3 | Tabs (Chat/Cowork/Code) | `kai-tabs` | NEW |
| 4 | Dot/Status (pulsing blue) | `kai-status` | NEW |
| 5 | Voice Input | extend `kai-voice-input` (native default) | EXTEND |
| 6 | Upgrade + Promo Banner | extend `kai-card` (dismiss + clickable) | EXTEND |
| 7 | Expand/collapse conversations | extend `kai-conversations` (rail collapse) | EXTEND |
| 8 | User Menu | documented `kai-avatar` + `kai-menu` recipe | RECIPE |
| 9 | (carrier dependency) | bounded `kai-workspace` injection slots | EXTEND |

Items 6/7 (the promo/upgrade cards and the rail collapse) and 9 (the workspace slots) are entangled through the shared `ConversationList` component and the "drop a card into a host slot" pattern, so they are specced and built together.

---

## 2. `kai-screen` — full-bleed overlay destination (NEW)

**Purpose.** The "push / drill-in" surface: an action (e.g. "Design") takes over the whole workspace area, replaces it with a consumer-owned surface under a back-header, and back returns. The lateral sibling is `kai-tabs` (peer switch in place); this is the stack push.

**Architecture (decided).** The **developer owns the swap** (their own routing/state flips one boolean in response to two events: their trigger button and the screen's `kai-back`). `kai-screen` owns the hard parts of *being* a full-bleed takeover. There is **no kit-owned router**, and the workspace neither contains nor is contained by the screen — they are **peers** the consumer renders side by side. The screen fills whatever it is mounted in: mount at the app root for a full takeover (sidebar included, matching the Claude "Design" screen); mount in a positioned region for a scoped one. The mount point decides coverage, not the kit.

**Files.** `src/components/screen.tsx` (Screen component) + `src/elements/screen.tsx` (facade). Reuses `wireDisclosure` for the open surface.

- **Slots:** default (the screen body) · `title` (rich header title, overrides the `title` prop) · `actions` (header trailing cluster, e.g. an avatar).
- **Props (attrs; behavior + shadow-internal visibility only):** `open` · `default-open` · `title` (string) · `back` (boolean, default `true`, shows the back button) · `no-inert` (opt out of inert-ing siblings, for unusual layouts) · `theme`.
- **Events:** `kai-back` (back button or `Escape` — navigation intent) · `kai-open-change` `{ open }`.
- **Methods:** `show()` · `hide()` · `toggle()` (from `wireDisclosure`) · `focus(options?)`.
- **Parts:** `header` · `back` · `title` · `body`.
- **Owned behavior:** when `open`, fill the mount point (`absolute inset-0`, z-layered) and mark sibling elements `inert` + `aria-hidden` (the one light-DOM touch, standard modal pattern; `no-inert` opts out); move focus in on open and return it to the invoker on close; `Escape` fires `kai-back`; enter/exit transition honoring `prefers-reduced-motion`; when closed, it is removed from layout (no space, not focusable).
- **a11y:** because the background is inert, the surface takes `role="dialog"` + `aria-modal="true"`, labelled by `title`. (Revisit if "dialog" feels wrong for a destination; the inert-background reality is what makes dialog semantics correct.)
- **Integration:** the trigger is the consumer's own button, e.g. dropped into `kai-workspace`'s `sidebar-footer` slot (§9). The screen knows nothing about it.

---

## 3. `kai-voice-output` — speak assistant text aloud (NEW)

**Purpose.** Read text aloud. Mirrors `kai-voice-input`'s seam: **native by default, model by option.**

**Files.** `src/components/voice-output.tsx` + `src/elements/voice-output.tsx`. The control is a speaker/play button (the `kai-voice-input` mic button's sibling).

- **Props:** `text` (string, the utterance) · `autoplay` (boolean) · `synthesize?: (text: string) => Promise<Blob>` (function-valued property — the TTS model seam; set in JS, not an attribute) · `disabled`. (`lang` / `rate` optional, later.)
- **Events:** `kai-speaking-change` `{ speaking: boolean }`. Optional: `kai-synthesized` `{ blob }` (model path produced audio).
- **Methods:** `speak()` · `pause()` · `resume()` · `stop()`.
- **Parts:** `button`.
- **Behavior (branch on `synthesize` presence, like input branches on `transcribe`):**
  - no `synthesize` → native `speechSynthesis.speak(new SpeechSynthesisUtterance(text))`; `kai-speaking-change` on start/end.
  - `synthesize` set → `await synthesize(text)` → play the returned `Blob` via an `Audio` element; `kai-speaking-change` around playback.
- **a11y / capability:** the button carries an `aria-label` and pressed state; if `speechSynthesis` is unavailable and no `synthesize` is set, the control renders disabled. `speechSynthesis` is broadly supported and on-device, so this default carries no privacy caveat.

---

## 4. `kai-tabs` — accessible tab strip (NEW)

**Purpose.** The Chat/Cowork/Code switch. This is a **selection strip only**: it emits the selected value; the consumer renders what each tab shows. Same developer-owned swap as `kai-screen`, NOT a content-owning router. (A slotted-panel mode for simple inline cases can be added later — YAGNI now.)

**Files.** `src/ui/tabs.tsx` (primitive) + `src/elements/tabs.tsx` (facade).

- **Data:** `items?: KaiTabItem[]` (`{ id: string; label?: string; icon?: string; disabled?: boolean }`), set as a JS property. Throughout, `value` is the selected item's `id`.
- **Props:** `items` · `value` (controlled, = the selected item's `id`) · `default-value` (uncontrolled seed) · `variant` (`'segmented' | 'underline'`, default `segmented`) · `disabled` · `theme`.
- **Events:** `kai-tab-change` `{ value }` (the newly-selected item's `id`).
- **Methods:** `select(id)` · `focus()`.
- **Parts:** `tablist` · `tab` (active styled via a `[data-active]` attribute on the part).
- **a11y:** `role="tablist"`, each tab `role="tab"` with `aria-selected`; roving `tabindex`; `ArrowLeft`/`ArrowRight`/`Home`/`End` move focus; activation on `Enter`/`Space`/click. Because panels are consumer-owned, the tabs expose stable `id`s so the consumer can wire `aria-controls` on the tab and `aria-labelledby` on their panel; document that recipe.
- **Controllable value:** reuse the `createControllableSignal` pattern (as `kai-workspace` does for `sidebarCollapsed`).

---

## 5. `kai-status` — presence / new dot (NEW)

**Purpose.** The small pulsing dot (e.g. the blue "new" indicator by the avatar).

**Files.** `src/ui/status.tsx` + `src/elements/status.tsx` (tiny).

- **Props:** `status` (`'new' | 'online' | 'busy' | 'away' | 'offline'`, default `new`) · `pulse` (boolean) · `label` (string, a11y) · `size` (`'sm' | 'md'`, default `sm`) · `theme`.
- **`status` → token mapping:** `new` → `--color-tool-blue` (the kit's blue, `hsl(217 91%)`, same hue family as the focus ring) · `online` → `--color-tool-green` · `busy` → `--color-tool-red` · `away` → `--color-tool-amber` · `offline` → `--color-muted-foreground`.
- **Parts:** `dot` (recolor freely from outside — "choose a theme color" is a token override via `kai-status::part(dot)`).
- **Behavior:** `pulse` adds an animated ping ring, disabled under `prefers-reduced-motion`.
- **a11y:** with `label`, exposes an accessible status name; without, it is decorative (`aria-hidden`).
- **Composition:** standalone; positioned on an avatar corner via the consumer's own layout. (A future `kai-avatar` `status` slot is out of scope here.)

---

## 6. `kai-voice-input` — add the native default (EXTEND)

**Current (keep):** records a `Blob` via `useVoiceRecorder` (MediaRecorder); the model seam already exists as `transcribe?: (blob) => Promise<string>`; emits `kai-audio-captured` (raw blob), `kai-transcription` (text), `kai-recording-change`; methods `start()`/`stop()`; `disabled`.

**Add — the "works natively by default" half.** Today, no `transcribe` means no text. Add a Web Speech `SpeechRecognition` path, selected by capability + the absence of a model callback:

- New primitive `src/primitives/use-speech-recognition.ts` wrapping `SpeechRecognition` / `webkitSpeechRecognition`.
- Capture path selection:
  - `transcribe` set → existing MediaRecorder → `transcribe(blob)` → `kai-transcription`.
  - else `SpeechRecognition` supported → native recognition → `kai-transcription` (final text).
  - else (unsupported, no callback) → graceful fallback to the current behavior: record the blob, fire `kai-audio-captured`, no text. A host that later sets `transcribe` always works; a host relying on native gets a clean "unsupported" signal rather than silence.
- **Props added:** `lang` (for native recognition). Optional `interim` (boolean) to emit live partials.
- **Events added (optional):** `kai-transcript-interim` `{ text }` for live partials.
- `start()`/`stop()` continue to drive whichever path is active.
- **Documented caveat:** `SpeechRecognition` is Chrome/Safari only (no Firefox), and in Chrome it is cloud-based (audio goes to Google), so it is "native to the browser," not on-device/private.

---

## 7. `kai-card` — add dismiss + clickable (EXTEND)

**Current (keep):** presentational chrome, "emits no events," the base every contract card composes from. Slots `media` / default / `actions`; props `heading` / `description` / `error-message` / `dense`. The promo card already maps to this: `media` (GIF) + `heading` + `description` + `actions` (the button).

**Add (opt-in, OFF by default — the contract cards use the `Card` component directly and are unaffected):**

- **Dismiss** (the promo's `×`): `dismissible` (boolean) renders a close button; clicking it hides the card and fires `kai-dismiss`. Mirrors `kai-notice`'s self-dismiss.
- **Clickable** (the upgrade's "whole thing feels like a button"): either `href` (+ `target`, `rel`) renders the card as an `<a>`, or `clickable` (boolean) gives it `role="button"`, keyboard activation (`Enter`/`Space`), and a hover affordance; fires `kai-card-click`.
- **New slot `trailing`** for the chevron/arrow on a clickable card (composable; no auto-chevron magic).
- **Events added:** `kai-dismiss` · `kai-card-click`.
- **Parts added:** `card` (root) · `dismiss` · `trailing`.
- **a11y constraint (documented):** a clickable/`href` card must NOT also contain footer action buttons (nested interactive). The promo (with a "Start task" button) is therefore NOT whole-card-clickable; the upgrade (clickable) has no inner buttons. The two cases do not collide.

**Maps to:** Promo = `kai-card` + `media` + `heading` + `description` + `actions` + `dismissible`. Upgrade = `kai-card clickable dense` + media icon + `heading` + `description` + `trailing` chevron.

---

## 8. `kai-conversations` — rail collapse on the standalone element (EXTEND)

**Confirmed scope:** surface whole-rail collapse on the standalone `kai-conversations`, which today only happens inside `kai-workspace`. (NOT collapsible date-group sections — that was the alternative reading, rejected.)

- **Props added:** `collapsed` (controlled) · `default-collapsed` (uncontrolled seed).
- **Events added:** `kai-collapse-toggle` `{ collapsed }`.
- **Methods added:** `collapse()` · `expand()` · `toggle()`.
- **Behavior:** collapsed → the rail shrinks to a floating reopen button (the same fallback `kai-workspace` renders today).
- **Shared mechanism:** the collapsed-rail UI currently lives at the workspace level. Factor it so both standalone `kai-conversations` and `kai-workspace` use one implementation. This is the entanglement that makes §7 + §9 one piece of work.

---

## 9. `kai-workspace` — bounded injection slots (EXTEND, scope-limited)

**This is the carrier** that lets the upgrade card, the Design trigger, the user-menu trigger, and a top-placed banner be dropped where the consumer wants. `kai-workspace` has no composition slots today (confirmed: nothing registered in `slots.ts`).

**In scope — only the slots this epic needs, plus the shared collapse from §8:**

- **Slots to add:** `sidebar-header` (top of the rail: brand / `kai-tabs`) · `sidebar-footer` (the upgrade card + Design trigger + user menu cluster) · `main-header` (top of the main region, for a ChatGPT-style top-placed banner or a corner action).
- Register them in `slots.ts` `ELEMENT_COMPOSITION` (+ the drift guard in `slots.test.ts`), so they flow into `element-meta.json`, `custom-elements.json`, the docs tables, `llms-full.txt`, and the `kai` MCP `component_reference`.
- Surface the §8 shared rail-collapse here (one implementation across both elements).

**Explicitly OUT of scope (a future, separate effort):** replacing the conversation-list's own header, sidebar resize-behavior changes, a managed view-registry, or any deeper "graduate everything about the workspace" work. This section adds injection points and shares the collapse, nothing more.

---

## 10. User menu — recipe, not an element (RECIPE)

No new element. It is `kai-menu` (which already supports per-item `icon`, `shortcut`, nested `items` submenus, `separator`, `heading`, and a slotted `trigger`) composed with `kai-avatar` + name + plan + chevron + a `kai-status` dot in the trigger.

- **Deliverable:** a documented copy-paste recipe + a composed Storybook example.
- **Optional `kai-menu` enhancement:** a `slot="header"` on `kai-menu` so the account email reads as a real account header rather than a muted `heading` label. Small, composition-aligned (a slot where the shadow boundary blocks the consumer). Marked optional; build only if the plain `heading` styling looks wrong.

---

## 11. Cross-cutting

**Theming.** Everything via `var(--color-*)`; `kai-status` uses the `tool-*` hues; no hardcoded colors; light + dark verified via `_shot.mjs`.

**Generators / metadata.** New elements flow through `gen-element-api.mjs` into `element-meta.json`, `custom-elements.json`, the React wrappers, `element-types.d.ts`, `llms*.txt`, and `docs/web-components.md`. New slots/parts must be registered in `slots.ts` `ELEMENT_COMPOSITION` (+ part registries) so the drift guard passes and the tables inject. New methods are exposed via `expose()` / `wireDisclosure`.

**Cross-epic note (not a blocker).** The separate *method doc-rendering* epic is still deferred, so these new elements' methods will land in `element-meta` + CEM + React wrappers but will NOT render in the markdown / `llms` / MCP text surfaces until that epic ships. Their slots/parts/props/events render today.

**Docs / Storybook.** Each new element gets a Storybook story (remember: RESTART Storybook for new elements / shadow CSS) and a docs-site page. The user-menu recipe and the composed Claude-like workspace become composed examples. (The broader docs-site content overhaul Rob raised is a later, separate epic; this epic adds pages in the current structure.)

**Testing.** Per-element unit + browser tests; the `*.declarative.test.tsx` pattern for the facades; `slots.test.ts` drift guard for new slots/parts; IVP screenshots (light + dark) per element; voice needs `--use-fake-device-for-media-stream` + granted mic permission.

## 12. Implementation order (dependencies)

1. **Quick standalone wins:** `kai-status` (§5), `kai-card` extension (§7) — no deps.
2. **`kai-tabs`** (§4) — standalone.
3. **Voice:** `kai-voice-output` (§3) + `kai-voice-input` native path (§6).
4. **`kai-screen`** (§2) — standalone overlay.
5. **Entangled pair:** shared `ConversationList` collapse → `kai-conversations` (§8) + `kai-workspace` slots (§9), done together.
6. **User-menu recipe** (§10) + optional `kai-menu` `slot="header"` — after `kai-status` + the workspace footer slot land.
7. **Per element:** Storybook story, docs-site page, `slots.ts` registration, IVP light/dark.

Everything except the §8/§9 pair is largely independent and parallelizable.

## 13. Open questions (settle during implementation; none blocking)

- `kai-screen` a11y role: `dialog` proposed; revisit if it reads wrong for a destination.
- `kai-tabs`: items-array (chosen for v1) vs slotted `<kai-tab>` (later).
- `kai-voice-input`: ship the optional `kai-transcript-interim` event now or later.
- `kai-menu` `slot="header"`: build only if the plain `heading` styling is insufficient for the account email.
