# Interaction-API audit — events, methods & helpers for every kai-* element

_Generated 2026-06-26 from a 7-agent parallel audit of all 59 elements. The input half (methods) and the remaining event gaps, triaged and prioritized into implementation waves._

## Summary

- **59 elements** audited — **43 interactive**, **16 presentational**.
- **15 event gaps** + **129 method gaps** to fill (methods are near-universally missing — only the two exemplars `kai-chat`/`kai-prompt-input` have them today).
- Conventions: events = non-bubbling `kai-*` CustomEvents (`dispatch`); methods = instance methods via `ctx.expose({...})`; a method name must never collide with a prop name; prefer surfacing **latent** capabilities the underlying component already has.

## Recurring patterns (the leverage — build once, apply to many)

1. **Dropdown open/close/toggle + `kai-open-change`** — sealed inside the headless `Dropdown`. Forwarding its `setOpen` once unlocks **kai-menu, kai-model-switcher, kai-scope-picker**.
2. **`focus()` the inner control** (shadow-query, exclude file inputs) — the prompt-input pattern; reused by **kai-button, kai-command, kai-conversations (search), kai-composer**, and most cards.
3. **Card-contract `send()`/`focus()`/`dismiss()`/`reopen()`** — the card components already have internal `submit/onDismiss/onReopen`; surface them on **kai-choice, kai-confirm, kai-form, kai-tasks** (use `send`, never `submit`).
4. **Collapsible `expand()`/`collapse()`/`toggle()` + `kai-toggle`** — backed by the internal `Collapsible`: **kai-tool, kai-chain-of-thought, kai-reasoning** (note `kai-tool` has an `open` prop → method must be `expand`, not `open`).
5. **`controllerRef` forwarding** (component owns state → exposes handle → facade forwards) — the kai-chat template; reused by **kai-workspace** (drops the ChatThread controller today) and **kai-composer**.
6. **Recorder `start()`/`stop()` + `kai-recording-change`** — `useVoiceRecorder` already exposes these; high-value for push-to-talk on **kai-voice-input**.

## Wave 1 — Finish exemplars + chat core (highest traffic)

### `kai-chat`  ·  interactive  ·  1 event gap, 0 method gaps
Full chat surface (header + message thread + prompt input). The interaction hub: emits the whole submit/edit/feedback event set and forwards a thread controller as instance methods.

- _Events (gap):_ `kai-stop` — Stop button clicked while loading (mirror prompt-input's stop affordance so a consumer can cancel a stream from the full chat)

> Method set is the done exemplar; only gap is a kai-stop event to surface the existing stop affordance at the chat boundary (the inner DefaultPromptInput already supports stoppable+onStop, but kai-chat never wires it). No prop collisions: focus/blur/clear/send/scrollToBottom none match a prop name. Priority: kai-stop is low-effort, high-value for streaming cancel.

### `kai-prompt-input`  ·  interactive  ·  0 event gaps, 1 method gap
Standalone prompt composer (text + attachments + toolbar). Input half of the chat interaction surface; the second done exemplar after kai-chat.

Methods to add:
- `clearAttachments()` _(latent)_ — Remove all staged attachments without touching the text (the element owns attachment state internally; today only the full clear() resets them)

> CRITICAL collision already handled: there is a `submit` prop ('always'|'auto'), so the method is `send` not submit — preserve this. `attach`, `attachments`, `stoppable` are props: a `stop()` method would NOT collide with the `stoppable` prop but would be redundant since stop is consumer-orchestrated via the kai-stop event + loading prop; recommend leaving stop as event-only (the consumer controls loading), so NOT proposing a stop() method. clearAttachments is the one worthwhile latent add.

### `kai-composer`  ·  interactive  ·  0 event gaps, 5 method gaps
Rich contenteditable input with atomic skill/agent pills and /+@ triggers. Strong latent imperative surface that is currently 100% unexposed (zero methods).

Methods to add:
- `focus(options?: FocusOptions)` _(latent)_ — Focus the editable element (available via the component's editableRef; focus/blur don't cross the shadow boundary so this is the only way to focus it programmatically)
- `blur()` _(latent)_ — Blur the editable element
- `clear()` _(latent)_ — Empty the composer to a blank doc (reset internal value + the history baseline; fires kai-value-change)
- `send()` _(latent)_ — Submit the current content programmatically (fires kai-submit); send NOT submit — submitOnEnter is a prop but `submit` is not, so send is the safe verb and matches the shared vocabulary
- `insertEntity(entity: EntityRef)` _(latent)_ — Programmatically insert an atomic pill at the caret (the component already has an internal insertEntity used by triggers; surfacing it lets a consumer add a skill/agent without typing the trigger)

> Highest-leverage element in this group: rich latent API, zero exposed methods. Needs the facade to capture a controller — wire Composer's editableRef (focus/blur), lift setInternal/handleChange for clear, call onSubmit/snapshot for send, and expose its internal insertEntity. No prop collisions: focus/blur/clear/send/insertEntity none match props (value/placeholder/disabled/loading/maxHeight/submitOnEnter/triggers/highlights/kindIcons). insertEntity is the differentiator vs prompt-input.

### `kai-workspace`  ·  interactive  ·  0 event gaps, 7 method gaps
Full app shell: resizable conversation sidebar + chat thread. Emits sidebar/conversation + the full chat event set, but exposes ZERO methods despite an internal sidebar toggle and an embeddable thread controller.

Methods to add:
- `toggleSidebar()` _(latent)_ — Collapse/expand the sidebar (the internal `toggle` already exists and fires kai-sidebar-toggle); MUST NOT be named `toggle`-by-prop — name it toggleSidebar because the boolean prop is `sidebarCollapsed`
- `collapseSidebar()` _(latent)_ — Force the sidebar collapsed (convenience over toggleSidebar)
- `expandSidebar()` _(latent)_ — Force the sidebar expanded
- `focus(options?: FocusOptions)` _(latent)_ — Focus the thread's composer (the embedded ChatThread exposes a controllerRef with focus/clear/send/scrollToBottom that the workspace facade currently drops on the floor)
- `clear()` _(latent)_ — Clear the thread draft + attachments (via the dropped ChatThread controller)
- `send()` _(latent)_ — Submit the current thread draft programmatically
- `scrollToBottom(behavior?: ScrollBehavior)` _(latent)_ — Scroll the thread to the newest message

> COLLISION: the host has a `sidebarCollapsed` prop — do NOT add a `collapse`/`expand`/`toggle` method that reads like the collapsed state accessor; use toggleSidebar/collapseSidebar/expandSidebar. The ChatThread already builds a controllerRef but chat-workspace.tsx never passes one — wiring it gives focus/clear/send/scrollToBottom for free (mark latent). Note the thread node is shared across both Show branches, so a single controllerRef captured once is safe. Highest-value adds: toggleSidebar + the 4 thread-controller methods.

### `kai-conversations`  ·  interactive  ·  1 event gap, 3 method gaps
Sidebar conversation list (groups + search box + new-chat). Mostly navigation; emits select/new/toggle. Has a latent internal search input worth surfacing.

- _Events (gap):_ `kai-search` — The built-in search box query changes (today the search filter is purely internal — emitting it lets a consumer mirror or server-side it)

Methods to add:
- `select(id: string)` — Programmatically select a conversation by id (mirror of the kai-conversation-select event; matches the shared `select` verb). No prop collision (activeId is the prop, not select)
- `focus(options?: FocusOptions)` _(latent)_ — Focus the built-in search input (the ConversationList renders a search box that's currently unreachable from outside the shadow root)
- `clear()` _(latent)_ — Clear the internal search query (resets the list filter; the searchQuery signal lives inside ConversationList with no external reset)

> Borderline interactive: it's a nav list, but the internal searchQuery signal is a real latent capability (focus + clear the search). No prop collisions (props are only groups/conversations/activeId). select(id) is a convenience over driving activeId. NOTE from MEMORY: kai-conversations is queued for a P1 composition audit (unblocks #106) — coordinate the search-event/method work with that pass. If kept minimal, focus()+clear() (search) are the two latent wins.

### `kai-message`  ·  interactive  ·  0 event gaps, 1 method gap
Single message row (content + reasoning + tools + attachments + action bar). Emits kai-message-action; has a latent copy action that should be a method.

Methods to add:
- `copy()` _(latent)_ — Copy the message content to the clipboard and show the copied check (the feedback primitive already does navigator.clipboard.writeText + toast + emits kai-message-action via handleAction('copy') — surface it as a method). No prop collision (props are message/role/content/markdown/...)

> Mostly presentational per-row, but it owns real copy/feedback state via createMessageFeedback (clipboard write + toast). copy() is the single high-value latent method. Did NOT propose expand/collapse: the reasoning Collapsible and Tool blocks manage their own open state internally with no controller seam at the MessageBody boundary, so an expand()/collapse() method would require new plumbing for marginal value — flag as a future gap only if the composition audit adds per-part controllers. like()/dislike() methods were considered but rejected: voting is a user-intent affordance, not something a consumer fires programmatically; drive it via the message.feedback prop instead.

## Wave 2 — Input controls (Dropdown open/close · focus · toggle · record)

### `kai-menu`  ·  interactive  ·  1 event gap, 3 method gaps
Cascading action menu driven by a JSON items-tree; wraps the headless Dropdown (latent open/close state). Selection out via kai-select; trigger has no programmatic open/close yet.

- _Events (gap):_ `kai-open-change` — The menu opens or closes (by click, keyboard, Escape, outside-click, or a method call) — lets consumers sync open state / lazy-load items

Methods to add:
- `open(())` _(latent)_ — Open the dropdown programmatically (e.g. open the menu from an external keyboard shortcut). Calls Dropdown setOpen(true).
- `close(())` _(latent)_ — Close the dropdown programmatically.
- `toggle(())` _(latent)_ — Flip open/closed.

> No prop named open/close/toggle (props: items, placement, triggerIcon, triggerLabel, triggerIconTrailing, label) — no collisions. The Dropdown already owns open()/setOpen() internally (high-value latent capability); the facade just needs to lift its setOpen into expose() and dispatch kai-open-change from a createEffect on the open signal. Wiring requires exposing the Dropdown context out of <Dropdown> (currently encapsulated) — small refactor. Priority: medium (open/close is the most-requested menu control).

### `kai-command`  ·  interactive  ·  1 event gap, 3 method gaps
Grouped, filterable command/mention palette with a search input + keyboard roving nav. Emits kai-select and kai-query-change. The search input and internal query/active-id state are latent at the element boundary.

- _Events (gap):_ `kai-active-change` — The highlighted/active item changes via Arrow keys or filtering — lets a host preview the active item

Methods to add:
- `focus((options?: FocusOptions))` _(latent)_ — Focus the search combobox input inside the shadow root so the palette is type-ready immediately on mount (the canonical command-palette behavior).
- `blur(())` _(latent)_ — Blur the focused search input.
- `clear(())` _(latent)_ — Reset the search query to empty (and fire kai-query-change), re-showing all items. Mirrors the Escape handler's setQuery('').

> Props: items, placeholder, emptyLabel — none collide with focus/blur/clear. focus() is highest-value (palettes expect autofocus, but Shadow-DOM autofocus is unreliable, so an imperative focus() the host can call after open is the right seam). clear() reuses the existing internal setQuery/dispatch path. activeId already exists internally; surfacing kai-active-change is a small dispatch in the clamp effect.

### `kai-model-switcher`  ·  interactive  ·  0 event gaps, 2 method gaps
Standalone model picker; wraps ModelSwitcher → Dropdown. Data in via models, selection out via kai-model-change. Renders nothing with <2 models. Dropdown open/close is latent.

Methods to add:
- `open(())` _(latent)_ — Open the model dropdown programmatically.
- `close(())` _(latent)_ — Close the model dropdown.

> Props: models, currentModel — no collision with open/close. Lower priority than kai-menu: selection is the whole point and that already works via kai-model-change; open/close is a minor convenience. Same wiring cost as kai-menu (Dropdown context is currently sealed inside ModelSwitcher, which would need to forward setOpen). Note the component self-hides with <=1 model, so methods must no-op gracefully when not rendered. No need for a setter method — currentModel is a controlled prop.

### `kai-scope-picker`  ·  interactive  ·  0 event gaps, 2 method gaps
Dropdown to scope a chat by author/tag; wraps ChatScopePicker → Dropdown. Options in via availableAuthors/availableTags, choice out via kai-scope-change. Dropdown open/close is latent.

Methods to add:
- `open(())` _(latent)_ — Open the scope dropdown programmatically.
- `close(())` _(latent)_ — Close the scope dropdown.

> Props: availableAuthors, availableTags, currentLabel — no collision with open/close. Same latent Dropdown open/close as kai-menu/kai-model-switcher; same small wiring cost (ChatScopePicker would need to forward Dropdown setOpen). Lower priority than kai-menu. currentLabel is a controlled prop, so no setter method needed.

### `kai-button`  ·  interactive  ·  0 event gaps, 3 method gaps
The kit's themeable button as a drop-in element. Emits kai-click; native click also bubbles (composed). The real <button> lives in the shadow root, so native focus()/blur()/click() on the host don't reach it.

Methods to add:
- `focus((options?: FocusOptions))` _(latent)_ — Focus the inner <button> inside the shadow root (host.focus() otherwise focuses the wrapper, not the control). Lets forms/toolbars move focus to the button.
- `blur(())` _(latent)_ — Blur the inner button.
- `click(())` _(latent)_ — Programmatically activate the button — runs the same path as a user click and fires kai-click. Forwarding to the inner button so disabled is respected.

> Props: variant, size, icon, iconTrailing, label, disabled, type — none collide with focus/blur/click. focus()/blur() override the inherited HTMLElement accessors (the documented WebAwesome/Shoelace pattern that expose() already supports via defineProperty). click() shadows native HTMLElement.click(); that's fine and actually an improvement (native click on the host fires a click that doesn't reach the shadow button's handler). Priority: medium — focus() matters for form/toolbar composition; click() is a nice-to-have for tests and command wiring.

### `kai-switch`  ·  interactive  ·  0 event gaps, 2 method gaps
A self-managing toggle. Initial state via the checked attribute, changes out via kai-change. The underlying Switch supports controlled mode, but the facade wires it UNCONTROLLED (defaultChecked) — so its on/off state is currently unreadable/unsettable from the host after mount.

Methods to add:
- `toggle(())` _(latent)_ — Flip the switch programmatically and fire kai-change. The host's most-wanted control for a toggle.
- `focus((options?: FocusOptions))` _(latent)_ — Focus the inner role=switch button.

> Prop `checked` would COLLIDE with a setChecked-style method only if named `checked` — so use toggle() (no collision). But there's a structural gap first: the facade passes defaultChecked, so internal isOn() isn't reachable. To support toggle()/imperative set, either (a) lift a signal in the facade and drive Switch controlled (checked + onChange), then expose toggle()/setChecked-equivalent, or (b) hold a ref to the inner button and .click() it for toggle(). Option (a) is cleaner and also makes the `checked` prop reflect live state. Recommend reset() too (back to the initial checked) once state is lifted. Priority: medium — programmatic toggle/read is a common ask for a settings switch.

### `kai-voice-input`  ·  interactive  ·  1 event gap, 2 method gaps
A mic button that records via useVoiceRecorder and transcribes via the transcribe function-property. Emits kai-audio-captured (raw blob) and kai-transcription (text). The recorder's start/stop and isRecording are strong latent capabilities not yet at the element boundary.

- _Events (gap):_ `kai-recording-change` — Recording starts or stops — lets the host drive its own UI (waveform, push-to-talk indicator) in sync with the mic

Methods to add:
- `start(())` _(latent)_ — Begin recording programmatically (e.g. push-to-talk bound to a global key). Runs the same getUserMedia path as clicking the mic.
- `stop(())` _(latent)_ — Stop the in-progress recording, producing the blob (→ kai-audio-captured) and running transcription. Pairs with start() for push-to-talk.

> Props: transcribe, disabled — no collision with start/stop/recording. start()/stop() are HIGH-value latent capabilities: useVoiceRecorder already exposes start()/stop()/isRecording(), but they live in the VoiceInput component, not the facade. To expose them the facade should host useVoiceRecorder itself (or have VoiceInput forward a controller ref) and route start/stop + kai-recording-change through expose()/dispatch. Push-to-talk and external mic buttons are the concrete use cases. Do NOT name a method `record` or `transcribe` (transcribe is a prop). Priority: high among this group — the existing event-only API can't initiate recording, only react to it.

### `kai-suggestions`  ·  interactive  ·  0 event gaps, 1 method gap
A row/list of suggestion chips; click a chip → kai-select. Stateless presentational chips with a single interaction (pick). Little to expose imperatively.

Methods to add:
- `focus((options?: FocusOptions))` _(latent)_ — Focus the first chip so the row is keyboard-navigable on demand (e.g. after the suggestions appear). Optional/low-value.

> Borderline presentational — its only interaction is clicking a chip, fully covered by kai-select. Props: suggestions, variant, size, block, highlight. focus() (first chip) is the only plausible method and is marginal; recommend leaving methods empty unless a consumer asks. No reset/clear semantics (the host owns the suggestions array). No collisions.

## Wave 3 — Generative-UI cards (card-contract: send/focus/dismiss/reopen)

### `kai-choice`  ·  interactive  ·  0 event gaps, 5 method gaps
Single-select 'pick one of N rich options' card: a radiogroup + Submit that emits the contract `action` verb. Already emits ready/action/dismiss/reopen/error via the bubbling kai-card event; has rich latent UI state (selection, roving focus, Other input) not yet imperatively reachable.

Methods to add:
- `focus((options?: FocusOptions))` _(latent)_ — Focus the radiogroup (the current roving tab stop, or the Other input when it is selected). The component already manages a focusIndex + groupRef + focusRadio(); expose that so consumers can move focus to the card on render.
- `select((optionId: string))` _(latent)_ — Programmatically SELECT an option by id without submitting (local-only, no emit) — exactly what the internal `select(opt)` does on row click. Lets a consumer pre-highlight or drive selection from outside. No collision with a prop.
- `send(())` _(latent)_ — Programmatically submit the current selection — the internal `submit()`: emits the `action` CardEvent and resolves the card (single-shot). Named `send` (not submit) to match the kai-prompt-input exemplar and avoid any future `submit` prop. Surfaces the Submit-button capability.
- `dismiss(())` _(latent)_ — Trigger the dismiss path imperatively — internal `onDismiss()`: emit `dismiss` and optimistically collapse to the re-openable stub. Latent (only wired to the X button today, and only when data.dismissible).
- `reopen(())` _(latent)_ — Re-open a dismissed card from its stub — internal `onReopen()` (emits `reopen`). Latent; currently only the stub's affordance calls it.

> Prop check: data/cardId/heading/resolution — NONE collide with focus/select/send/dismiss/reopen. `send` deliberately avoids a `submit` name per the shared vocabulary note. Highest value: focus + send (latent, drive the keyboard/submit path). Resolution today is fully controllable via the `resolution` prop, so these methods are convenience over that channel. Events: keep the single `kai-card` contract event — do NOT add bespoke kai-choice-* events; that would fork the card contract.

### `kai-confirm`  ·  interactive  ·  0 event gaps, 4 method gaps
Named-intent approval card: title + body + up to 4 action buttons emitting the contract `action` verb. Emits ready/action/dismiss/reopen/error via the bubbling kai-card event; has a built-in default-action + autofocus capability that is only prop-driven today.

Methods to add:
- `focus((options?: FocusOptions))` _(latent)_ — Focus the default action button (or the first action if none is marked default) — the same target the `autofocus` prop focuses on mount, but on demand. Surfaces the existing default-action ref/queueMicrotask(focus) logic without the focus-stealing-on-mount cost.
- `confirm((actionId?: string))` _(latent)_ — Activate an action by id imperatively — internal `onAction(action)`: emits the `action` CardEvent and resolves single-shot. With no id, invokes the default action (mirrors Enter-on-body). e.g. el.confirm('approve'). Distinct, intent-revealing verb for an approval card.
- `dismiss(())` _(latent)_ — Trigger the dismiss path — internal `onDismiss()`: emit `dismiss` + optimistically collapse to the stub. Latent (only the X button, only when data.dismissible).
- `reopen(())` _(latent)_ — Re-open from the dismissed stub — internal `onReopen()` (emits `reopen`). Latent.

> Prop check: data/cardId/heading/autofocus/resolution. `focus` does NOT collide with the `autofocus` prop (different names). confirm/dismiss/reopen are distinct. Did NOT propose a generic `send`/`submit` since the verb here is per-named-action; `confirm(actionId?)` reads better and avoids ambiguity. focus + confirm are the high-value latent surfaces. Keep the single contract `kai-card` event.

### `kai-form`  ·  interactive  ·  0 event gaps, 6 method gaps
Renders a JSON-Schema form definition into validated widgets and emits the collected/coerced/validated object as the contract `submit` verb. Emits ready/submit/action/dismiss/reopen/error via bubbling kai-card; has client-side validate + first-invalid-field focus internally.

Methods to add:
- `focus((options?: FocusOptions))` _(latent)_ — Focus the first form control (or the first INVALID control after a failed validation). The component already finds the first-invalid `[data-control]` and focuses it on submit failure — expose that as an on-demand entry point.
- `send(())` _(latent)_ — Programmatically submit the form — same path as the Submit button / onSubmit: run full validation, focus the first invalid field on failure, else emit the `submit` CardEvent and resolve. Named `send` per the shared vocabulary to dodge any `submit` collision. Highest-value latent capability.
- `validate(())` _(latent)_ — Run client-side validation now and surface per-field errors WITHOUT submitting — returns { valid, fieldErrors } from the existing validateForm(). Lets a consumer gate a multi-step flow on this form's validity. Pure latent logic, not currently reachable.
- `reset(())` _(latent)_ — Re-seed the form from each field's `default` and clear errors — internal `seed(def())`. Lets a consumer clear user input back to defaults. Distinct from `clear` since defaults are restored.
- `dismiss(())` _(latent)_ — Trigger the dismiss path — internal `onDismiss()`: emit `dismiss` + collapse to stub. Latent (only the Dismiss button, only when x-kai-dismissible).
- `reopen(())` _(latent)_ — Re-open from the dismissed stub — internal `onReopen()` (emits `reopen`). Latent.

> Prop check: data/cardId/heading/resolution — no collisions with focus/send/validate/reset/dismiss/reopen. `send` avoids the `submit` name (matches kai-prompt-input). Top picks: send + validate + focus (all latent — the component already does the work internally on Enter/submit). `validate` returning a value is the only method here that needs a return contract. Single `kai-card` contract event only.

### `kai-tasks`  ·  interactive  ·  0 event gaps, 6 method gaps
Selectable task/plan list (checkbox rows + optional select-all + confirm) that emits the contract `submit` verb with the checked ids in input order. Emits ready/submit/dismiss/reopen/error via bubbling kai-card; has rich latent selection state (toggle, toggleAll, min/max gating).

Methods to add:
- `select((taskIds?: string[]))` _(latent)_ — Programmatically set the checked task ids (local-only, no emit), respecting disabled/max — drives the internal selection Set. With no args, could select all toggleable rows (mirrors toggleAll(true)). Lets a consumer pre-check or sync selection. No prop collision.
- `toggle((taskId: string, checked?: boolean))` _(latent)_ — Toggle a single task by id — internal `toggle(id, on)`, honoring the max gate. Convenience for driving one row imperatively.
- `send(())` _(latent)_ — Programmatically confirm the current selection — internal `onConfirm()` (only when canConfirm passes): emits `submit` with the selected ids and resolves single-shot. Named `send` to match the exemplar / avoid a future `submit` collision.
- `focus((options?: FocusOptions))` — Focus the task group (select-all checkbox if shown, else the first row). The card has a role=group container; expose a focus entry point for it.
- `dismiss(())` _(latent)_ — Trigger the dismiss path — internal `onDismiss()`. Latent (only the X button, only when data.dismissible).
- `reopen(())` _(latent)_ — Re-open from the dismissed stub — internal `onReopen()`. Latent.

> Prop check: data/cardId/heading/resolution — no collisions. `send` avoids `submit`. select/toggle expose the internal selection model; send confirms it. Highest value: select + send (drive selection + commit). `focus` is the one non-latent add (group has no current focus() entry point). Single `kai-card` contract event only.

### `kai-tool`  ·  interactive  ·  1 event gap, 3 method gaps
Collapsible tool-call inspection panel (input/output + state badge). Read-only display of a single tool call; the only interaction is expand/collapse of the disclosure, which has NO event or method surface today.

- _Events (gap):_ `kai-toggle` — GAP. The user (or a method) expands/collapses the panel. Lets a consumer track which tool panels are open (e.g. to persist UI state). Non-bubbling kai-* CustomEvent off the host.

Methods to add:
- `expand(())` _(latent)_ — Open the collapsible to reveal input/output. The component already owns isOpen/setIsOpen via the internal Collapsible — currently only settable through the `open` PROP at mount (defaultOpen) and the trigger click. expand() surfaces it on demand.
- `collapse(())` _(latent)_ — Close the collapsible — the inverse of expand(). Same internal isOpen signal.
- `toggle(())` _(latent)_ — Flip the open state — the imperative twin of the trigger button. Most ergonomic single entry point.

> PROP COLLISION: `open` is a boolean prop (start expanded). Therefore do NOT add an `open()` method — it would shadow the prop accessor and break it. Use expand()/collapse()/toggle() instead (the prescribed pattern). All three are latent (the Collapsible already manages isOpen internally; the facade just doesn't expose a setter). Note the prop is wired as `defaultOpen` (uncontrolled) — exposing expand/collapse makes the open-state controllable imperatively, which it currently is not after mount.

### `kai-cards`  ·  interactive  ·  1 event gap, 3 method gaps
The web-component list dispatcher: renders one child kai-* card per envelope, propagates theme, and routes each child's bubbling kai-card event through an optional `policy`. The host-level orchestrator for a stream of cards.

- _Events (gap):_ `kai-card-resolved` — GAP. A child card transitioned to a resolved/deferred state (action chosen, form/tasks submitted, dismissed, reopened). A non-bubbling convenience event off the kai-cards host so a consumer can observe resolution centrally without diffing the cards array. Lower priority than wiring resolution back through `policy`.

Methods to add:
- `resolve((cardId: string, resolution: CardResolution))` — GAP. Programmatically resolve a specific child card by id (set its envelope.resolution), flipping it to the chromed read-only view — the imperative twin of mutating the cards array. e.g. resolve(cardId, { kind:'action', action:'approve' }). Saves consumers from cloning+reassigning the whole cards array for one resolution.
- `dismiss((cardId: string))` — GAP. Convenience: resolve(cardId, { kind:'dismissed' }) — collapse a card to its re-openable stub from the host side (e.g. on a timeout). Mirrors the per-card dismiss affordance.
- `getCard((cardId: string))` _(latent)_ — GAP. Return the live child element node for a card id so consumers can call that card's own methods (focus/expand/etc.) without a shadow-DOM query. Low priority.

> No prop collisions: props are cards/types/policy; proposed methods resolve/dismiss/getCard are all distinct. The core interaction model is already strong via the bubbling `kai-card` event + `policy` prop; the methods are about IMPERATIVE resolution ergonomics. `resolve`/`dismiss` are the highest-value gaps. Note `dismiss` here operates per-card-by-id, distinct from the per-card element's own no-arg dismiss().

### `kai-artifact`  ·  interactive  ·  0 event gaps, 9 method gaps
Framed generated-artifact viewer: sandboxed preview iframe + functional nav toolbar (back/forward/reload/home/path) + Preview|Code toggle + file tree. Already emits navigate/tab-change/file-select/maximize-change; the toolbar actions are rich latent capabilities with zero imperative surface.

Methods to add:
- `back(())` _(latent)_ — Go back in the artifact's own history stack — internal `goBack()` (no-op when canBack is false). Surfaces a toolbar action that is otherwise click-only.
- `forward(())` _(latent)_ — Go forward in the history stack — internal `goForward()` (no-op when canForward is false).
- `reload(())` _(latent)_ — Force-reload the current preview url (also re-renders the inline PDF) — internal `reload()`. Matches the shared `refresh`/reload vocabulary; `reload` is the more accurate verb for the iframe.
- `home(())` _(latent)_ — Navigate back to the `src` home url — internal `goHome()` (no-op when no src). Distinct verb (not in the shared list but the right name for the home button).
- `navigate((url: string))` _(latent)_ — Push + load a url in the preview programmatically — internal `navigate(url)` (the path-field submit path). Drives the address bar from code.
- `selectFile((path: string))` _(latent)_ — Select a file in the Code tree by path (highlights tree + shows source + navigates the preview) — internal `selectFile(path, file)`. Named selectFile (NOT select/openFile) to avoid ambiguity; drives file selection imperatively.
- `openInTab(())` _(latent)_ — COLLISION RISK — see notes. Opens the current url in a new browser tab — internal `openInNewTab()`. Must be named differently from the `openInTab` PROP (which only toggles the button's visibility).
- `maximize(())` _(latent)_ — Enter the maximized view-state — drives the internal toggleMaximize()/onMaximizeChange to true (fires kai-maximize-change + the raw maximize-intent). Cannot reuse `expand`/`collapse` cleanly (see notes); maximize/restore is the artifact's own vocabulary.
- `restore(())` _(latent)_ — Exit the maximized view-state (the inverse of maximize()).

> PROP COLLISIONS — critical: (1) `tab` is a prop → do NOT add a tab()/setTab() method; expose tab switching via a distinct verb e.g. `showCode()`/`showPreview()` or a `setTab` is risky — RECOMMEND `showPreview()`/`showCode()` (selectTab is latent internally). I omitted it from methods to flag the decision rather than ship a colliding name. (2) `openInTab` is a prop (button visibility) AND a natural method name → the method MUST be renamed, e.g. `openExternal()` — do not ship `openInTab()` as a method. (3) `maximized` is a prop → use maximize()/restore(), NOT a `maximized()` method. (4) `src`/`activeFile` are props → `navigate(url)` and `selectFile(path)` avoid them. All proposed methods are latent (the component already implements every toolbar action; the facade just never exposed them). This element has the richest latent-method payoff of the group. Events are already complete.

### `kai-compare`  ·  interactive  ·  0 event gaps, 2 method gaps
Dual-response comparison: two assistant candidates rendered as columns/tabs; the user picks the better one (a COMMIT). Already emits compare-select/ready/error via the facade dispatch; has latent roving-focus + per-candidate pick that could be driven imperatively.

Methods to add:
- `select((candidateId: string))` _(latent)_ — Programmatically commit a pick by candidate id — internal `pick(candidate)`: emits kai-compare-select + optimistically collapses (single-shot; inert while streaming or already resolved). The selection PROP is the controlled/re-hydrate channel; select() is the imperative commit. Named `select` per the shared vocabulary — does NOT collide with the `selection` prop (different identifier).
- `focus((options?: FocusOptions))` _(latent)_ — Focus the current roving tab stop (the focused candidate's 'Pick this' radio) — the component already manages focusIndex + groupRef + focusColumn(). Lets a consumer move keyboard focus into the radiogroup.

> Prop check: data/compareId/selection/layout/proseSize/codeTheme/codeHighlight. `select` does NOT collide with `selection` (distinct names) — safe and matches the shared verb list; preferred over a `pick` name for vocabulary consistency, though `pick` is the internal term. `focus` is latent (focusColumn exists internally). Events are already complete and well-named. Lowest-gap element of the group on events; the two methods are convenience over the existing selection prop + keyboard flow.

## Wave 4 — Content · overlays · layout · interactive foundations

### `kai-chain-of-thought`  ·  interactive  ·  1 event gap, 3 method gaps
Step-by-step reasoning list where each step is an independently collapsible Collapsible. Mostly presentational, but the per-step open/close is a latent interaction worth surfacing as methods + an event.

- _Events (gap):_ `kai-step-toggle` — A step's per-step collapsible detail is expanded or collapsed (by user click, or via expand()/collapse()).

Methods to add:
- `expand(index?: number)` _(latent)_ — Open one step's detail (by index) or, with no arg, all steps. Each step is a Collapsible; the facade currently leaves them uncontrolled, so this requires lifting per-step open state in the facade.
- `collapse(index?: number)` _(latent)_ — Close one step's detail (by index) or, with no arg, all steps.
- `toggle(index?: number)` _(latent)_ — Flip one step's open state (by index).

> No prop collisions (only prop is `steps`). LOW priority: the component is largely a data-render. The Collapsible already manages each step's open state internally but it is uncontrolled — surfacing expand/collapse means the facade must hold controlled open state per step (real work, not a thin pass-through). Only the expand/collapse-all variant is broadly useful (e.g. 'expand all reasoning'). If kept minimal, treat as presentational and ship only `expand`/`collapse` (all-steps) + `kai-step-toggle`.

### `kai-reasoning`  ·  interactive  ·  0 event gaps, 3 method gaps
Collapsible reasoning block that auto-expands while streaming; already emits kai-open-change and accepts a controlled `open` prop. Latent open/close/toggle should be exposed as methods.

Methods to add:
- `expand()` _(latent)_ — Open the reasoning block programmatically (same as clicking the trigger open). Wraps the Reasoning root's internal open handler.
- `collapse()` _(latent)_ — Close the reasoning block programmatically.
- `toggle()` _(latent)_ — Flip the open state.

> COLLISION: do NOT name a method `open()` / `close()` — `open` is already a (controlled) prop, and the prop accessor would clobber the method. Use `expand`/`collapse`/`toggle` per the shared verb vocabulary. Implementation note: the Reasoning root only exposes its open setter when uncontrolled (internalOpen); when the consumer drives the `open` prop the facade should treat these methods as a no-op or simply update through onOpenChange. Cleanest: have the facade own an internal open signal (drop pure pass-through of `open`) so the methods work in both modes. HIGH value — auto-collapse-on-done-streaming plus a manual expand() is a common consumer need.

### `kai-response-stream`  ·  interactive  ·  1 event gap, 3 method gaps
Typewriter/fade text reveal; emits kai-complete. The underlying useTextStream primitive already has pause/resume/reset — high-value latent controls currently trapped below the element boundary.

- _Events (gap):_ `kai-start` — A new reveal begins (text/textStream is (re)assigned and streaming starts).

Methods to add:
- `pause()` _(latent)_ — Pause the typewriter reveal in place. useTextStream already implements pause() — it just isn't surfaced by ResponseStream/the facade.
- `play()` _(latent)_ — Resume a paused reveal (maps to useTextStream.resume()). Named `play` per the shared verb vocabulary; `resume` acceptable if preferred.
- `reset()` _(latent)_ — Clear displayed text and restart from empty. useTextStream.reset() already exists internally.

> No prop collisions (props: text, mode, speed, as). HIGH value, but needs plumbing: ResponseStream does not currently forward the stream controller (pause/resume/reset) up to ResponseStreamProps, so the component must expose a controller ref (e.g. an `onReady`/`ref` returning { pause, resume, reset }) before the facade can expose() them. `play()` collides with nothing here (unlike kai-embed). Consider `pause`/`play`/`reset` as a trio so a consumer can offer a 'pause stream' control. kai-start is a small add (fire on the startStreaming effect).

### `kai-context`  ·  interactive  ·  0 event gaps, 3 method gaps
Token/context-window usage meter with a hover-card breakdown; already emits kai-threshold-change. The breakdown hover-card's open/close is a clean latent show/hide.

Methods to add:
- `show()` _(latent)_ — Open the usage-breakdown hover-card programmatically (input/output/reasoning/cache + cost). The Context root wraps HoverCardRoot; exposing requires the facade to control its open state.
- `hide()` _(latent)_ — Close the breakdown hover-card.
- `toggle()` _(latent)_ — Flip the breakdown open/closed.

> No prop collisions (props: context, warnThreshold, dangerThreshold) — show/hide/toggle/open/close all safe; prefer show/hide/toggle for a hover-card-style surface. MEDIUM value: the meter is a hover affordance, so click/keyboard users benefit from a programmatic show()/toggle() (also useful for a 'context full' nudge that pops the breakdown when severity hits danger — pairs naturally with kai-threshold-change). HoverCardRoot is uncontrolled (openDelay:0) today, so the facade must lift open state to implement these.

### `kai-remote`  ·  interactive  ·  0 event gaps, 1 method gap
Sandboxed cross-origin iframe card host. Re-emits every routed CardEvent as a bubbling+composed kai-card event. Latent refresh (destroy+remount) and context push are worth exposing as methods.

Methods to add:
- `refresh()` _(latent)_ — Tear down and remount the iframe card (destroy() the current handle, re-run mountRemoteCard with the same envelope/origin/src). Recovers a hung/errored frame without the consumer reassigning props.

> No prop collisions (props: src, providerOrigin, envelope, policy). RemoteCardHandle already exposes destroy() and updateContext() internally — refresh() is destroy+remount and is the highest-value action (error recovery; the facade renders an inline alert on mount failure but has no retry path today). Do NOT add a generic `reload()` AND `refresh()` — pick one verb; `refresh` per the shared vocabulary. updateContext is already driven reactively by the theme effect, so it does not need a public method. Consider gap event `kai-ready` (the card contract has a `ready` verb that already flows through kai-card with kind:'ready' — so no separate event needed).

### `kai-embed`  ·  interactive  ·  0 event gaps, 2 method gaps
Privacy-first lazy media embed (poster + play button; no provider iframe/JS/cookies until the user opts in). Emits kai-card. The internal play() and open-on-provider are prime latent methods.

Methods to add:
- `play()` _(latent)_ — Swap the poster for the provider iframe (opt-in playback) programmatically — exactly what the play button does. Embed already has an internal play() (sets playing + focuses the player region); it just isn't reachable from the host.
- `open()` _(latent)_ — Trigger 'Open on {provider}' — emits the contract `open` verb (new tab). Embed already has openOnProvider() internally.

> No prop collisions (props: cardId, data) — `play`/`open` are both safe method names here. play() is HIGH value (privacy-first means the iframe is gated; a consumer 'play all' / programmatic autoplay-on-consent needs it). Surfacing requires Embed to forward its internal play()/openOnProvider() up via a ref/controller (currently they're closure-local). A `pause` method is NOT warranted — once the provider iframe is mounted, playback is owned by the provider, not the facade.

### `kai-notice`  ·  interactive  ·  1 event gap, 2 method gaps
Self-dismissing inline notice/alert; owns its own open state and a × that hides it.

- _Events (gap):_ `kai-show` — the notice is shown again programmatically via show() after a prior dismiss — lets a consumer track visibility symmetrically with kai-dismiss

Methods to add:
- `dismiss()` _(latent)_ — hide the notice and fire kai-dismiss — same effect as clicking the ×, but available even when dismissible is false (e.g. auto-hide a notice after a timeout). Reuses the shared `dismiss` verb.
- `show()` _(latent)_ — re-show a previously dismissed notice (restore the internal open state) without re-rendering the element. Reuses the shared `show` verb; pairs with dismiss().

> Notice already owns open()/setOpen and a dismiss() closure internally — both methods are LATENT, just not surfaced at the element boundary; the facade only wires onDismiss → dispatch. No prop collisions: `dismiss`/`show` differ from the `dismissible` prop. Priority: dismiss() is the high-value one (programmatic + timed auto-hide); show() + kai-show complete the pair. Implementation needs the facade to lift Notice's open signal (or pass setters down) so expose() closures can drive it.

### `kai-tooltip`  ·  interactive  ·  0 event gaps, 2 method gaps
Wraps a trigger, shows a text hint on hover/focus; owns internal open/show/hide state.

Methods to add:
- `show()` _(latent)_ — open the tooltip programmatically (e.g. an onboarding/coach-mark sequence) without a real hover. Reuses the shared `show` verb; mirrors the component's internal show().
- `hide()` _(latent)_ — force-close the tooltip programmatically. Reuses the shared `hide` verb; mirrors the component's internal hide().

> Tooltip already has internal show(delay)/hide()/setOpen — show()/hide() are LATENT, just not lifted to the element. No prop collision (props are only `content`/`openDelay`). Lower priority than scroll-area/notice but warranted for guided-tour use cases. No events: a tooltip's visibility is consumer-driven hover/focus; firing kai-show/kai-hide on every hover would be noise. Implementation: lift the open signal out of Tooltip or add open/onOpenChange props the facade can drive.

### `kai-hover-card`  ·  interactive  ·  0 event gaps, 2 method gaps
Reveals rich card content on hover/focus of a trigger; owns enter/leave/close + open state.

Methods to add:
- `open()` _(latent)_ — open the hover card programmatically (e.g. preview-on-demand) without a real hover. Reuses the shared `open` verb; maps to the component's internal enter()/setOpen(true).
- `close()` _(latent)_ — force-close the card programmatically. Reuses the shared `close` verb; maps to the component's internal close().

> HoverCardRoot already exposes enter()/leave()/close() + an open signal via context — open()/close() are LATENT, just not surfaced at the element boundary. Used `open`/`close` (rich card) vs `show`/`hide` (tooltip) to match each component's own internal vocabulary. No prop collision (props are openDelay/closeDelay/placement). No events for the same reason as tooltip — hover visibility is ambient, not a consumer signal. Implementation: the facade renders the convenience <HoverCard>; to expose methods it must instead use HoverCardRoot and grab the ctx (or HoverCard must forward an imperative ref).

### `kai-popover`  ·  interactive  ·  0 event gaps, 3 method gaps
A trigger + floating role=dialog panel of arbitrary content (ChatGPT-style header menus). Interaction role: emits open/close intent and should accept imperative show/hide/toggle.

Methods to add:
- `show()` _(latent)_ — Open the popover programmatically. The underlying Popover owns internal open state (createSignal/setOpen) — latent; the facade must thread a controller ref out to call it. Named show (NOT open) because an `open` PROP exists.
- `hide()` _(latent)_ — Close the popover programmatically.
- `toggle()` _(latent)_ — Flip the open state.

> PROP COLLISION: there is an `open` prop, so a method named open() WOULD be shadowed by the prop accessor and break — use show()/hide()/toggle() per the shared vocabulary instead (do NOT propose open/close here). In CONTROLLED mode (open prop set) these methods cannot mutate state directly; they should fire kai-open-change so the controlling consumer flips the prop (or no-op + warn). In UNCONTROLLED mode they call the internal setOpen. The internal capability fully exists in src/ui/popover.tsx (isControlled/setOpen); the only work is exposing a controller ref from the facade (today it passes nothing out). Highest-value gap: show/hide for app-driven menus.

### `kai-resizable`  ·  interactive  ·  1 event gap, 3 method gaps
A composable multi-panel resizable layout (≤3 panels) with draggable dividers; the parent that lays out kai-resizable-item children and owns drag/maximize/restore. Interaction role: emits layout-change/maximize events and accepts imperative maximize/restore.

- _Events (gap):_ `kai-resize-start` — On pointer-down / keydown that begins a divider drag, so consumers can pause expensive renders in panels during the drag.

Methods to add:
- `reset(index?: number — one panel, or all if omitted)` _(latent)_ — Snap every panel back to its original configured size (the captured data-kai-default-size baseline) — the imperative form of the divider double-click reset that already exists internally.
- `collapse(index: number)` _(latent)_ — Collapse the item at index (set its collapsed attribute) — drops its divider and reflows. Item-level collapse already drives layout internally; this is the group-addressed convenience.
- `expand(index: number)` _(latent)_ — Un-collapse the item at index (clear its collapsed attribute).

> PRE-EXISTING IMPERATIVE API: maximize()/restore() are set directly on the host (host.maximize = …) inside onMount, NOT via expose() — and typed in the hand-authored resizable.d.ts (NOT element-meta, whose methods:[] is wrong here). When formalizing, prefer migrating both to expose() so they land in element-meta + generated types. No prop collisions: props are orientation, maximizedIndex (maximize/restore/reset/collapse/expand are all distinct). kai-change name is SHARED with several other elements (fine, scoped per-element). kai-resize-start is the one genuinely new event; collapse/expand/reset are highest-value latent gaps. Escape-to-restore is already wired internally.

### `kai-resizable-item`  ·  presentational  ·  0 event gaps, 5 method gaps
A passive config-carrier inside kai-resizable: it renders its own slotted content and exposes size/min/max/locked/hidden/collapsed config the parent reads to lay it out. It fires NOTHING itself; the maximize protocol is consumer/parent-driven.

Methods to add:
- `maximize()` _(latent)_ — Ask the nearest enclosing kai-resizable to maximize THIS item — emits the bubbling/composed kai-maximize-intent({requested:true}) the parent already listens for. Sugar over the zero-config intent protocol so a consumer holding only the item ref can drive it.
- `restore()` _(latent)_ — Ask the parent to restore — emits kai-maximize-intent({requested:false}).
- `collapse()` _(latent)_ — Collapse this panel (set collapsed=true). The collapsed prop already drives layout via the parent's MutationObserver; this is the imperative toggle.
- `expand()` _(latent)_ — Un-collapse this panel (set collapsed=false).
- `toggle()` _(latent)_ — Flip the collapsed state.

> DATA BUG TO FIX: element-meta lists kai-change and kai-maximize-change events with detail 'unknown' for this tag — these are SPURIOUS (leaked from the Record<string,unknown> Events constraint / shared codegen). The item facade is defineWebComponent<ItemProps> with NO Events generic and dispatches nothing; it should list NO fired events (only document the RECEIVED kai-maximize-state). Method names collapse/expand/toggle/maximize/restore do NOT collide with props (size/min/max/locked/hidden/collapsed) — collapse() vs the collapsed prop are distinct identifiers. Mostly presentational: real value is the few latent imperative shims. If collapse/expand land on the item, mirror the same names on the group (index-addressed) for symmetry.

### `kai-scroll-area`  ·  interactive  ·  1 event gap, 4 method gaps
Bounded scroll container with a themed scrollbar and keyboard-reachable region; the viewport is a real scrollable element.

- _Events (gap):_ `kai-scroll-end` — the viewport reaches (or returns from) the bottom edge — lets consumers do infinite-scroll/load-more or toggle a jump-to-bottom affordance

Methods to add:
- `scrollToBottom(behavior?: ScrollBehavior)` _(latent)_ — scroll the viewport to the end (matches kai-chat's verb). Pass behavior ('auto'|'smooth'). The viewport div is already scrollable — only a ref needs exposing.
- `scrollToTop(behavior?: ScrollBehavior)` _(latent)_ — scroll the viewport back to the start. Same latent ref.
- `scrollTo(options: number | ScrollToOptions)` _(latent)_ — scroll to an arbitrary offset/options, delegating to the viewport element's native scrollTo.
- `focus(options?: FocusOptions)` _(latent)_ — focus the scroll region (it carries tabindex=0 for keyboard reach) so a consumer can move keyboard focus into the scroll viewport. Reuses the shared `focus` verb.

> HIGHEST-VALUE element in this group. ScrollArea is a real overflow:auto div that already spreads {...rest} and carries tabindex=0 — scrollToBottom/scrollToTop/scrollTo/focus are all LATENT (just need a ref forwarded so the facade can expose() closures over it). No prop collision (only `orientation`). scrollToBottom should mirror kai-chat exactly. kai-scroll-end is a genuine consumer signal (load-more / jump-to-bottom button) — gap, fire from a scroll listener with a small threshold. Note focus() shadows the native HTMLElement.focus to retarget the inner viewport, per the WebAwesome convention the facade already documents.

### `kai-scroll-button`  ·  interactive  ·  1 event gap, 2 method gaps
A floating scroll-to-bottom button for any scrollable container; auto-shows when scrolled up, scrolls to bottom on click. Interaction role: emits kai-scroll; its core internal scrollToBottom() is the prime latent method to expose.

- _Events (gap):_ `kai-visibility-change` — When the button transitions shown↔hidden as the container crosses the at-bottom threshold — lets a consumer mirror an unread/jump affordance elsewhere.

Methods to add:
- `scrollToBottom(behavior?: ScrollBehavior)` _(latent)_ — Smooth-scroll the resolved target container to the bottom — the element's own internal function (currently only fired on click). Exposing it lets a consumer programmatically jump to bottom after appending a message (matches kai-chat/kai-prompt-input which already expose scrollToBottom).
- `refresh()` _(latent)_ — Re-resolve the scroll target and re-check at-bottom state — useful when the `for` target is swapped or the container is replaced after mount (today the target is bound once in onMount).

> scrollToBottom() is the standout latent gap — it already exists verbatim inside the facade, just unexposed; expose() it (and consider accepting a ScrollBehavior arg to match kai-chat). No prop collisions: props are for/variant/size. Internal scrollToBottom currently hardcodes behavior:'smooth' — parameterize when exposing. kai-visibility-change leverages the existing isAtBottom signal. refresh() addresses the one-time onMount target binding.

### `kai-toast-region`  ·  interactive  ·  0 event gaps, 2 method gaps
The viewport/target overlay that renders the toast stack — substrate behind the imperative toast() store API, also usable declaratively. Interaction role: emits dismiss/action; should expose imperative dismiss/clear that mirror the store.

Methods to add:
- `dismiss(id: string)` _(latent)_ — Remove a toast by id. The store already exposes dismiss(id) and the facade already calls toastStore.dismiss internally — surfacing it on the host lets declarative consumers drive removal without round-tripping the global store.
- `clear()` _(latent)_ — Dismiss every active toast (store already has toast.clear()/setToasts([])).

> No prop collisions: props are toasts/position/max/stack/target; dismiss/clear are distinct (note kai-dismiss is an EVENT, dismiss() the method — fine, different namespaces). For DECLARATIVE consumers (who own their own toasts array) dismiss()/clear() should fire kai-dismiss so they can update their array, not just mutate the shared store. Most consumers use the toast() store helper and never touch element methods — methods are a thin convenience for the declarative-region case. Region itself is otherwise an overlay container with no focus/scroll surface to expose.

### `kai-feedback-bar`  ·  interactive  ·  0 event gaps, 2 method gaps
An inline thumbs up/down banner that owns its own ask→(detail)→thanks flow in place. Interaction role: emits vote/detail/close; should expose reset + dismiss to drive the flow imperatively (e.g. reuse the bar across messages).

Methods to add:
- `reset()` _(latent)_ — Return the bar to the initial 'ask' phase (clear vote/category/comment). The component owns phase via setPhase('ask') internally but never resets — needed to reuse one bar instance after a vote, or revoke. No `reset` prop, no collision.
- `dismiss()` _(latent)_ — Programmatically close the bar (same path as the X) — fires kai-close. Lets a parent retract the prompt after N seconds or once feedback is captured.

> No prop collisions: props are barTitle/collectDetail/categories/detailTitle/detailPlaceholder/submitLabel/thanksMessage; reset/dismiss are distinct. reset() requires exposing the component's setPhase/clear-signals via a controller ref (today the facade threads none out) — small wiring. dismiss() just needs to invoke the same onClose path. These two are the only warranted methods; the bar is self-contained otherwise. Lower priority than scroll/popover/toast since most consumers let the bar run its own flow and listen to events.

### `kai-checkpoint`  ·  interactive  ·  0 event gaps, 2 method gaps
A small bookmark/checkpoint button (optional icon + label + tooltip). Interaction role: emits select on click; a button, so it should expose the latent focus/click affordances.

Methods to add:
- `focus(options?: FocusOptions)` _(latent)_ — Focus the inner checkpoint button (it IS a button — latent, just needs forwarding from the host into the shadow root, matching the kai-chat/kai-prompt-input focus pattern).
- `blur()` _(latent)_ — Blur the focused button.

> Borderline presentational — a single button. Only genuinely-warranted methods are the latent focus/blur (for keyboard/roving-focus orchestration by a parent toolbar). A click()/select() method is NOT proposed: it would duplicate native dispatch and there is no select PROP but the value is marginal (consumers can fire the click). No prop collisions (props: label/tooltip/variant/size). Keep events as-is.

### `kai-file-tree`  ·  interactive  ·  1 event gap, 4 method gaps
Collapsible, keyboard-navigable file explorer built from flat `/`-delimited paths. Fires `kai-select` on file pick; internally owns rich open/closed/focus state that is almost entirely latent at the element boundary — the highest-value imperative surface of this group.

- _Events (gap):_ `kai-toggle` — A folder is expanded or collapsed by the user. Lets a consumer persist the open/closed tree state. Not emitted today — `toggle()` is purely internal.

Methods to add:
- `expand((path?: string) => void)` _(latent)_ — Open a folder by path (or, with no arg, expand all folders). Wraps the component's internal `toggle`/open-set so consumers can drive the tree programmatically (e.g. reveal the path of an incoming file).
- `collapse((path?: string) => void)` _(latent)_ — Close a folder by path (or, with no arg, collapse all folders). Counterpart to expand; both surface the internal open/closed-set logic.
- `select((path: string) => void)` _(latent)_ — Programmatically select a file by path — set it active, move roving focus to its row, and fire `kai-select`. Surfaces the internal `selectFile`/`setFocusedPath` so a consumer can drive selection from outside (e.g. deep-link to a file).
- `focus(() => void)` _(latent)_ — Move keyboard focus into the tree, landing on the active/first focusable row (the existing roving-tabindex entry). Native focus() shadowed to target the right treeitem inside the shadow root.

> Richest latent surface in the group: the FileTree component already implements toggle (open/closed sets), selectFile, focusedPath roving-tabindex, and flattenVisible keyboard nav — none exposed at the element boundary. Mapping verbs: expand/collapse/select/focus. NO COLLISIONS — props are `files`, `activeFile`, `defaultExpanded`; `select`/`expand`/`collapse`/`focus` are all free (note `activeFile` is the prop, so do not name a method `activeFile`). `kai-toggle` is the matching new event so open-state is persistable. Exposing these requires lifting the component's currently-local toggle/select handles up to the facade (e.g. via a ref/imperative handle). Priority: high — this is the marquee example for the audit.

### `kai-file-upload`  ·  interactive  ·  0 event gaps, 2 method gaps
Click/drag-drop dropzone that emits files. Fires `kai-files-added`; the native file picker open and the input reset are latent capabilities worth exposing as methods.

Methods to add:
- `open(() => void)` _(latent)_ — Programmatically open the native file picker — calls the hidden input's .click() (the same thing FileUploadTrigger does on click). Lets a consumer trigger upload from their own button/menu without rendering the default dropzone trigger.
- `clear(() => void)` _(latent)_ — Reset the hidden file input's value (and the dragging state). The component already sets `target.value = ''` after a selection so the same file can be re-picked; exposing clear() lets a consumer reset between uploads explicitly.

> `kai-files-added` exists (facade docstring still says 'filesadded' in prose — a stale comment to fix; the actual event name is correct). Latent capabilities: FileUploadTrigger.handleClick → inputRef.click() (→ `open()`), and the input-value reset (→ `clear()`); both live in the FileUpload component and need a small ref/handle lift to the facade. NO COLLISIONS: props are `multiple`, `accept`, `disabled`, `label` — `open`/`clear` are free (in particular there is NO `open` prop here, unlike popover/menu elements, so `open()` is safe). No `kai-*` events to add: drag-state is purely visual/internal. Priority: medium-high (`open` is the high-value one).

### `kai-link-preview`  ·  interactive  ·  0 event gaps, 1 method gap
Themed OG/rich-link preview card; activating it routes an `open` verb through CardPolicy. Its event surface is the bubbling/composed `kai-card` contract event (NOT the facade's non-bubbling dispatch), and it has a latent programmatic-activate capability.

Methods to add:
- `open(() => void)` _(latent)_ — Programmatically activate the card — fire the same `{kind:'open', url, target:'tab'}` CardEvent the click handler does, after the valid()-URL guard. Lets a consumer trigger the host's CardPolicy navigation without a synthetic click (e.g. from a keyboard shortcut or row-level action).

> IMPORTANT: kai-link-preview does NOT use the facade `dispatch()` — it calls `emitCardEvent(element, ...)` which fires a bubbling+composed `kai-card`. element-meta shows no events for it (the meta extractor only sees facade dispatch calls); that is a meta GAP — `kai-card` should be documented as its event. The component's `activate()` is internal/latent; exposing it as `open()` is the high-value add (latent:true). `open` does not collide with a prop (props are `cardId`, `data`). Do not add separate non-bubbling kai-open/kai-error events — that would fork the card contract; keep everything on `kai-card`. Priority: medium (meta/doc fix is the real action item).

### `kai-source`  ·  presentational  ·  0 event gaps, 2 method gaps
A single citation link (anchor) with a hover-card preview (headline/description/favicon). Presentational; the hover preview's open/close is a latent capability if programmatic control is ever needed.

Methods to add:
- `show()` _(latent)_ — Open the hover-card preview programmatically (without hover). The underlying HoverCardRoot manages open state internally; exposing it requires the facade to lift/control that state.
- `hide()` _(latent)_ — Close the hover-card preview programmatically.

> PRIMARILY PRESENTATIONAL — the trigger is a real <a> (native focus/click already work; do NOT add a redundant focus() or open()). show/hide are LOW priority and only worth it if a consumer needs to surface the preview from a keyboard shortcut or programmatic walkthrough; HoverCardRoot is uncontrolled today so this is real work for marginal value. No prop collisions (props: href, label, headline, description, showFavicon) — `show`/`hide` are safe. Default recommendation: ship as presentational (empty methods) unless a concrete consumer ask arrives.

### `kai-card`  ·  presentational  ·  0 event gaps, 1 method gap
The shared presentational card chrome (media/heading/description/body/actions/inline-error) every native card composes from. Reads no context, emits no events — chrome only.

Methods to add:
- `focus()` — Focus the card container so consumers can move keyboard focus to it programmatically. Marginal value since the chrome itself has no interactive controls (those live in the composing card or slotted actions).

> Genuinely presentational. The composing cards (kai-form/kai-choice/...) own all interaction; kai-card just frames it. No prop collisions. focus() is the only even-arguably-warranted method and is low priority; recommend leaving it with ZERO methods/events unless a concrete use case appears. The inline error state is driven by the `errorMessage` prop, not an event.

### `kai-markdown`  ·  presentational  ·  0 event gaps, 1 method gap
Renders a markdown string (with fenced-code highlighting) to a static div; output-only, no interactive surface. The one real consumer affordance is copying the raw markdown source.

Methods to add:
- `copy(() => Promise<boolean>)` — Copy the rendered markdown's source (props.content) to the clipboard via navigator.clipboard.writeText. Convenience so consumers don't have to re-read the content prop and roll their own copy button. Resolves to a boolean (or rejects) so callers can toast on success/failure.

> Pure presentational. `copy` is the only method worth adding and it's borderline (the consumer already holds `content`); ship it only if a low-cost ergonomics win is wanted. No prop collisions (`copy` is not a prop). Do NOT propose render/parse events — there is no async/error surface (marked.parse is sync with a try/catch fallback). Priority: low.

### `kai-code-block`  ·  presentational  ·  0 event gaps, 1 method gap
One syntax-highlighted code block; the facade docstring advertises a copy button, so copy-to-clipboard is the single genuine interaction. Otherwise output-only.

Methods to add:
- `copy(() => Promise<boolean>)` _(latent)_ — Copy the block's source (props.code) to the clipboard. Surfaces the copy capability the block is described as having, callable from a custom toolbar/keyboard shortcut. Returns Promise<boolean> for success-toast wiring.

> Marked latent:true because the copy affordance is part of the code-block's stated UX, though the current `CodeBlock`/`CodeBlockCode` source in src/components/code-block.tsx does not actually render a copy button yet — exposing `copy()` plus (separately) wiring the visible button would close that gap. `copy` does not collide with any prop (`code`, `language`, `codeTheme`, `codeHighlight`, `proseSize`). No events needed: highlighting is internal createResource state with a plain-text fallback, no consumer-facing error surface. Priority: low-medium.

## Presentational — no interaction API needed

`kai-thinking-bar`, `kai-skills`, `kai-sources`, `kai-avatar`, `kai-badge`, `kai-icon`, `kai-separator`, `kai-skeleton`, `kai-empty`, `kai-loader`, `kai-text-shimmer`, `kai-image`.

## Scope note

This audit covers the **59 kai-* custom elements** (events via `dispatch`, methods via `expose`). The ~123 SolidJS **primitives** use callback-props (a different interaction model) — a separate phase-2 audit if wanted.

---

# Part 2 — Ecosystem-expected API (Radix / Shoelace benchmark)

_A second 7→4-agent pass benchmarked our 16 most-convention-bound interactive elements against Radix Primitives + Shoelace. This layer is about the API consumers **expect by convention** (controlled/uncontrolled, `disabled`, timing) — distinct from Part 1's latent-capability methods. Fold these into the same waves._

**94 missing items — 57 standard (genuinely expected) · 37 nice-to-have.**

## ★ Cross-cutting decisions (resolve these before the waves — they touch many elements)

1. **`disabled` is missing almost everywhere** (10 of the 16 benchmarked, and likely most of the 43 interactive). Consumers expect every interactive element to take `disabled`. **Decision: adopt `disabled` as a near-universal scalar prop** across interactive elements (cheap, high-expectation).
2. **The controlled/uncontrolled trio.** Radix's headline pattern is `open` + `defaultOpen` + `onOpenChange` (overlays/collapsibles) and `value` + `defaultValue` + `onValueChange` (selections/toggles). Today our elements are **uncontrolled-only** (self-managed, no change event, no seed). The web-component-idiomatic subset is: a **`kai-*-change` event** (so app state can observe) + a **`defaultOpen`/`defaultValue` seed** + **imperative methods** (`show`/`hide`/`toggle`, already in Part 1). Full *controlled* `open`/`value` props (the element reflects consumer state and stops self-managing) are a bigger lift. **Decision needed: how far do we adopt React-style controlled props vs. the lighter event+seed+methods path?** Recommended default: ship the **change event + `defaultOpen`/`defaultValue` seed + imperative methods everywhere** (covers ~90% of real use), and add fully-`open`/`value`-controlled props only where there's clear demand (hover-card, tooltip, switch, menu).
3. **Selection elements** (choice/tasks/form/switch/model-switcher/scope-picker/command) want a `value`/`defaultValue` + `kai-value-change` channel — they emit only the card-contract `submit` today, so a host can't observe/seed selection without a round-trip.

Recurring standard gaps by frequency: `disabled` ×10 · `defaultOpen` ×6 · `value` ×5 · `kai-open-change` ×4 · `open` ×3 · `kai-value-change` ×3.

## Per-element expected-API gaps (standard tier)

### `kai-hover-card` — aligns with Radix HoverCard.Root (open/defaultOpen/onOpenChange/openDelay/closeDelay) + HoverCard.Content (side/align/sideOffset/collisionPadding); Shoelace sl-popup positioning props

**Standard (expected):**
- **prop** `open` — open?: boolean (attribute: open). The element today is fully self-managed — there is NO way to control whether the card is shown from the consumer. Radix's headline hover-card API is the controlled/uncontrolled trio. Consumers programmatically open a hover card (e.g. to preview on a different trigger, or pin it open). Without `open` the component can't be driven by app state at all.
- **prop** `defaultOpen` — defaultOpen?: boolean (attribute: default-open). Uncontrolled initial-open state. Half of the Radix controlled/uncontrolled contract; lets a consumer render the card open on mount without wiring an event handler. Currently the internal signal hardcodes `createSignal(false)` with no way to seed it.
- **event** `kai-open-change` — kai-open-change → CustomEvent<{ open: boolean }> (non-bubbling). Maps Radix `onOpenChange(open)`. The element has ZERO events today (events: []), so a consumer can't observe open/close at all — no way to sync `open`, lazy-load card content on first open, or fire analytics. This is the single most-expected event for any open/close overlay.
- **prop** `disabled` — disabled?: boolean (attribute: disabled). No way to suppress the card without unmounting. Consumers need to conditionally disable the hover behavior (e.g. on touch devices, while loading, or when the trigger is itself disabled). Radix achieves this via controlled `open`, but a dedicated `disabled` is the idiomatic web-component scalar and matches Shoelace/WebAwesome overlay conventions.

_Nice-to-have:_ `show` (method), `hide` (method), `sideOffset` (prop), `align` (prop).

### `kai-tooltip` — aligns with Radix Tooltip.Root (open/defaultOpen/onOpenChange/delayDuration/disableHoverableContent) + Tooltip.Content (side/align/sideOffset); Shoelace sl-tooltip (placement/disabled/trigger/show()/hide())

**Standard (expected):**
- **prop** `open` — open?: boolean (attribute: open). No controlled visibility. The internal `createSignal(false)` is unreachable from the consumer. Radix Tooltip.Root supports controlled `open`; consumers force-show a tooltip (onboarding hint, validation error pointer) or keep it open during a guided flow. Today that's impossible.
- **prop** `defaultOpen` — defaultOpen?: boolean (attribute: default-open). Uncontrolled initial-open state, completing the Radix trio. Lets a tooltip render open on mount (e.g. a one-time coach mark) without a controlled handler.
- **event** `kai-open-change` — kai-open-change → CustomEvent<{ open: boolean }> (non-bubbling). Maps Radix `onOpenChange(open)`. The element emits no events (events: []) — a consumer can't react to show/hide, sync controlled `open`, or instrument it. Essential companion to `open`/`defaultOpen`.
- **prop** `placement` — placement?: string (attribute: placement) — 'top'|'bottom'|'left'|'right' (+ '-start'/'-end'). The tooltip's position is HARDCODED to 'top' in the primitive (usePosition(..., { placement: 'top' })) with no prop to override it. kai-hover-card already exposes `placement`; the tooltip should match. Radix `side` and Shoelace `placement` are standard — consumers routinely place tooltips below/beside a trigger near a viewport edge. This is the most glaring gap for the tooltip.
- **prop** `closeDelay` — closeDelay?: number (attribute: close-delay). Only `openDelay` is exposed; there is no way to tune the hide delay. The primitive hides immediately on leave (no grace period), so a consumer can't add hover-bridge tolerance the way kai-hover-card's `closeDelay` allows. Radix's Tooltip.Provider has close/skip timing; Shoelace and WebAwesome expose close timing. Pairs naturally with the existing `openDelay`.
- **prop** `disabled` — disabled?: boolean (attribute: disabled). No way to turn the tooltip off while keeping the trigger mounted (e.g. hide hint once the user is onboarded, or on touch). Shoelace sl-tooltip ships `disabled` as a first-class scalar; this is a very common consumer need and trivial to wire (short-circuit show()).

_Nice-to-have:_ `dismissOnClick` (prop), `show` (method), `hide` (method), `sideOffset` (prop).

### `kai-popover` — aligns with Radix Popover.Root (open/defaultOpen/onOpenChange/modal) + PopoverContent (side/align/sideOffset/collisionPadding/onEscapeKeyDown/onPointerDownOutside) + PopoverAnchor; Shoelace/WebAwesome <wa-popup>/<sl-dropdown> (distance/skidding/show()/hide()).

**Standard (expected):**
- **prop** `defaultOpen` — defaultOpen?: boolean. The underlying `Popover` primitive already accepts `defaultOpen` (uncontrolled initial state) but the facade never forwards it. Radix's controlled/uncontrolled trio is open + defaultOpen + onOpenChange; consumers expect to render a popover open-on-mount without wiring controlled state. Pure plumbing — the primitive supports it today.
- **prop** `modal` — modal?: boolean (default false). Radix Popover exposes `modal` to trap focus and make outside content inert/scroll-locked while open. For ChatGPT-style header menus and confirm-popovers consumers reach for this; today the panel is a role=dialog with no focus trap or scroll lock option.
- **prop** `disabled` — disabled?: boolean. Every open/close overlay in the ecosystem can be disabled so the trigger no longer toggles. There is no way to inertly disable kai-popover today short of removing the trigger.
- **method** `show / hide / toggle` — show(): void; hide(): void; toggle(): void. Web-component consumers (plain HTML, Vue, Angular) expect imperative open/close methods on the element instance rather than only a controlled `open` property + re-render. The facade already has `expose()` (used by kai-chat/kai-prompt-input for focus/blur/clear), so this is a natural addition. Note: name them show/hide/toggle to avoid colliding with the existing `open` property.

_Nice-to-have:_ `sideOffset / collisionPadding` (prop), `kai-escape-key-down / kai-pointer-down-outside` (event).

### `kai-menu` — aligns with Radix DropdownMenu.Root (open/defaultOpen/onOpenChange/modal/dir) + DropdownMenuContent (side/align/sideOffset/loop) + onSelect per item. Shoelace <sl-dropdown> (open, show()/hide(), placement). Item shape ≈ Radix DropdownMenuRadioGroup/CheckboxItem.

**Standard (expected):**
- **prop** `open` — open?: boolean. kai-menu is fully uncontrolled — the open state lives inside the internal Dropdown signal with no way to drive or read it. Radix DropdownMenu.Root has the controlled/uncontrolled trio; consumers expect to open a menu programmatically (e.g. via a keyboard shortcut) or coordinate it with other UI. kai-popover already has `open`; kai-menu lacks it entirely.
- **prop** `defaultOpen` — defaultOpen?: boolean. Uncontrolled initial-open, the second leg of the Radix trio. Pairs with `open`/`kai-open-change`. The internal Dropdown signal would need to accept an initial value.
- **event** `kai-open-change` — kai-open-change { open: boolean }. There is no way to observe the menu opening/closing today — only `kai-select` on a leaf. Radix fires onOpenChange on every toggle (Escape, outside-click, select). Consumers need this to sync chevron state, analytics, or lazy-load menu contents. This is the most conspicuous gap vs the ecosystem for this archetype.
- **method** `show / hide / toggle` — show(): void; hide(): void; toggle(): void. Imperative open/close for plain-HTML and non-React consumers, mirroring the proposed kai-popover methods and the existing expose() pattern (kai-chat/kai-prompt-input). Required because there is currently no programmatic way to open the menu at all (no `open` prop either).

_Nice-to-have:_ `modal` (prop), `placement (actually wired)` (prop).

### `kai-model-switcher` — aligns with Radix Select.Root (value/defaultValue/onValueChange/open/defaultOpen/onOpenChange/disabled/name/required) + SelectTrigger; this is a Select archetype. WebAwesome <wa-select>/Shoelace <sl-select> (value, placeholder, disabled, hoist).

**Standard (expected):**
- **prop** `defaultValue (defaultModel)` — defaultModel?: string. kai-model-switcher has `currentModel` (≈ controlled value) and `kai-model-change` (≈ onValueChange) but no uncontrolled initial value. Without it, consumers must own selection state to set an initial model that isn't the first in the list. Completes the Select trio.
- **prop** `disabled` — disabled?: boolean. A Select can be disabled (e.g. while a response streams and the model can't change). No way to do that today; the trigger is always interactive.

_Nice-to-have:_ `kai-open-change` (event), `placeholder` (prop), `name` (prop).

### `kai-scope-picker` — aligns with Radix Select.Root / DropdownMenuRadioGroup (value/defaultValue/onValueChange/open/onOpenChange/disabled). It is a single-select scope filter rendered as a dropdown.

**Standard (expected):**
- **prop** `value` — value?: SearchFilters | undefined. The element only takes `currentLabel` (a display string) and emits `kai-scope-change` — there is no controlled selected-value input. A consumer cannot drive the active scope from state, only label it; the selected row also isn't marked active/checked. Radix selection components expect a controlled `value` paired with the change event.
- **prop** `disabled` — disabled?: boolean. No way to disable the picker (e.g. when there are no authors/tags or scoping is unavailable). Standard for every selection control in the ecosystem.

_Nice-to-have:_ `defaultValue` (prop), `kai-open-change` (event).

### `kai-command` — aligns with Radix Combobox is community (cmdk): Command (value/onValueChange for highlighted item, filter, loop, shouldFilter, loading) + CommandInput (value/onValueChange). Also Radix-pattern combobox: open/onOpenChange, disabled. Our element is a command/combobox palette.

**Standard (expected):**
- **prop** `value (controlled query)` — value?: string. The search query is purely internal state — `placeholder` is the only input prop. kai-query-change reports keystrokes, but there is no controlled `value` to set/reset the query programmatically (e.g. clear it after select, or seed it from a trigger character). Standard for a controlled combobox input.
- **prop** `highlightedId (controlled active item)` — highlightedId?: string. The active/highlighted row (activeId) is internal-only; consumers can't read or set which item is highlighted, nor get notified when arrow-key navigation changes it. cmdk treats the highlighted value as a first-class controlled value with onValueChange. Needed to coordinate the palette with an external input (the @/slash-trigger case in a composer).
- **event** `kai-highlight-change` — kai-highlight-change { id: string }. Pairs with the controlled highlightedId. Consumers driving the palette from an external textarea (slash/mention triggers) need to know which item ArrowUp/Down landed on without it being selected. Today only kai-select (commit) and kai-query-change (input) fire.
- **prop** `shouldFilter / filter` — shouldFilter?: boolean (default true). kai-command always client-filters items by label/description. For async/server-side search (the documented kai-query-change → fetch use case) the consumer must disable built-in filtering or the server results get re-filtered locally. cmdk's shouldFilter=false is the standard escape hatch; without it server-driven palettes double-filter.
- **prop** `loading` — loading?: boolean. With async filtering (the explicit use case in the docs) there's no way to show a pending/loading state — only items or the empty label. A loading flag (with a spinner/skeleton) is expected for server-backed command palettes.

_Nice-to-have:_ `focusInput` (method).

### `kai-tool` — aligns with Radix Collapsible (Root open/defaultOpen/onOpenChange/disabled). Shoelace <sl-details> (open prop + sl-show/sl-hide/sl-after-show events).

**Standard (expected):**
- **event** `kai-open-change` — kai-open-change CustomEvent<{ open: boolean }>. Every Radix open/close primitive emits onOpenChange. kai-reasoning (the sibling collapsible) already emits kai-open-change; kai-tool is the only collapsible in this archetype that fires NOTHING, so a consumer cannot react to the user expanding/collapsing a tool-call panel (e.g. lazy-load output, log inspection, sync layout).
- **prop** `defaultOpen` — defaultOpen?: boolean. Radix splits initial-uncontrolled (defaultOpen) from the controlled value (open). kai-tool conflates them: `open` is consumed as defaultOpen internally and never updates. Consumers expect `defaultOpen` to seed uncontrolled state while `open` controls it live. Adding defaultOpen (and freeing `open` to be the controlled live prop) restores the standard trio.
- **prop** `disabled` — disabled?: boolean (scalar attr). Radix Collapsible.Root exposes `disabled` to prevent the trigger from toggling. A tool-call panel that is still streaming (state 'input-streaming') or that the app wants to pin open/closed has no way to lock the trigger. The Tool trigger is a plain Button with no disabled wiring.

_Nice-to-have:_ `toggle` (method).

> kai-tool is a single collapsible panel. Today the facade maps its `open` prop to the underlying Tool's `defaultOpen` (uncontrolled, read once on mount via flag('open')) — so `open` is really 'start expanded', NOT a controlled/reactive prop, and there is NO way to observe or drive expansion after mount. Against the Radix Collapsible trio it is missing the live controlled value, the change event, disabled, and imperative methods. NOTE: the existing `open` name already exists, so a true controlled prop is the blocker — recommend making the existing `open` reactive+controlled (plumb it through Tool, which currently ignores live `open`) and adding `defaultOpen` for the uncontrolled initial; this requires a small change in src/components/tool.tsx (it hardcodes createSignal(defaultOpen) and never tracks a controlled `open`).

### `kai-chain-of-thought` — aligns with Radix Accordion (Root type single|multiple, value/defaultValue/onValueChange, collapsible) — a list of independently-collapsible steps. Each step is a Radix Collapsible.

**Standard (expected):**
- **prop** `type` — type?: 'single' | 'multiple'  (default 'multiple'). Radix Accordion's defining prop: single (one open at a time) vs multiple (any number open). A reasoning trace often wants single-expand (auto-collapse the previous step as you read down) but kai-chain-of-thought hardcodes multiple, independent collapsibles with no way to request single-open behavior.
- **prop** `value` — value?: string | string[]  (controlled open step id(s)). Radix Accordion is controlled via value/onValueChange. kai-chain-of-thought offers NO way to control which step(s) are expanded — a streaming agent UI that wants to auto-expand the active step (and collapse finished ones) has no hook. Standard for the accordion archetype.
- **prop** `defaultValue` — defaultValue?: string | string[]  (uncontrolled initial open step id(s)). The uncontrolled counterpart to `value`. Currently EVERY step renders closed with no opt-out — a consumer cannot even say 'start with step 1 expanded'. Radix's defaultValue covers exactly this initial-open need.
- **event** `kai-value-change` — kai-value-change CustomEvent<{ value: string | string[] }>. Maps Radix Accordion onValueChange. The element fires no events whatsoever, so a consumer cannot observe which reasoning step the user expanded/collapsed (analytics, sync, lazy-load detail). The most glaring gap: a multi-collapsible with zero change signal.

_Nice-to-have:_ `collapsible` (prop), `disabled` (prop), `orientation` (prop).

> kai-chain-of-thought renders N independently-collapsible steps, each its own <Collapsible> with internal uncontrolled state and NO defaultOpen wired (every step starts closed, no way to change that). This is exactly the Accordion archetype, yet the facade exposes ONLY `steps` data — no `type`, no value model, no change event, no per-step open control, no methods. It is the least Radix-aligned element of the four. Because per-step ids are needed for a value model, recommend the Step descriptor gain an optional `id` (or use index/label as the key) so value/defaultValue can reference steps. The underlying ChainOfThoughtStep does not accept open/defaultOpen today, so this needs plumbing in src/components/chain-of-thought.tsx.

### `kai-reasoning` — aligns with Radix Collapsible (Root open/defaultOpen/onOpenChange/disabled). Best-aligned of the four — already has controlled open + kai-open-change.

**Standard (expected):**
- **prop** `defaultOpen` — defaultOpen?: boolean. kai-reasoning has controlled `open` but NO uncontrolled-initial prop — the internal Reasoning signal always starts false, so a consumer who wants the block to render expanded but remain user-toggleable (without going fully controlled) cannot. Radix Collapsible's defaultOpen covers exactly this; the underlying Reasoning's internalOpen signal just needs to seed from a defaultOpen prop.
- **prop** `disabled` — disabled?: boolean (scalar attr). Radix Collapsible.Root exposes `disabled` to lock the trigger. While reasoning is mid-stream a consumer may want to pin it open and prevent the user collapsing it; today ReasoningTrigger is an always-clickable button with no disabled support.

_Nice-to-have:_ `toggle` (method).

> Strong baseline: `open` is genuinely controlled (the underlying Reasoning treats open!==undefined as controlled) and kai-open-change fires. Missing pieces vs the full Collapsible trio are the uncontrolled-initial prop, disabled, and imperative methods. Note the existing `streaming` auto-open is a nice domain extra, not a substitute for defaultOpen (it FORCES open while true and FORCES closed when it flips false, so it can't express 'start open, stay user-controlled').

### `kai-artifact` — aligns with Radix Tabs (Root value/defaultValue/onValueChange, activationMode, orientation, Tab disabled) for the Preview|Code toggle; the maximize affordance follows the Collapsible open/defaultOpen/onOpenChange trio.

**Standard (expected):**
- **prop** `defaultTab` — defaultTab?: 'preview' | 'code'. Radix Tabs splits defaultValue (uncontrolled initial) from value (controlled). kai-artifact only has `tab`, which the component treats as controlled-following (createEffect(setTab(local.tab))) — so a consumer can't set an initial tab and then let the user freely switch without re-asserting the prop. defaultTab gives the uncontrolled-initial that the Tabs archetype expects.
- **method** `reload` — reload(): void  (plus back(): void / forward(): void / home(): void). kai-artifact ALREADY implements goBack/goForward/reload/goHome internally but only as toolbar button handlers — a consumer who hid the toolbar (noNav/noReload/noHome) has NO way to drive navigation. Exposing these via expose() is the web-component standard for imperative control (cf. Shoelace components exposing action methods); reload() in particular is a common 'refresh the artifact' need with no current API.

_Nice-to-have:_ `defaultActiveFile` (prop), `defaultMaximized` (prop), `activationMode` (prop), `orientation` (prop), `navigate` (method).

> kai-artifact's Preview|Code segmented control IS a Radix Tabs surface (role=tablist/tab already present). `tab` is controlled + kai-tab-change fires (good), and maximize has controlled `maximized` + kai-maximize-change (good). Gaps are the uncontrolled-initial counterparts (defaultTab, defaultActiveFile, defaultMaximized) and the Tabs ergonomics (activationMode, orientation, per-tab disabled), plus imperative navigation methods that the component already implements internally (back/forward/reload/home) but doesn't expose. Naming: use `defaultTab` (not defaultValue) to mirror the existing `tab` prop, and `kai-tab-change` already fills the onValueChange slot.

### `kai-switch` — aligns with Radix Switch (Root checked/defaultChecked/onCheckedChange/disabled/required/name/value) · Shoelace sl-switch (checked/disabled/required/name/value + focus()/blur(); sl-change/sl-input/sl-focus/sl-blur)

**Standard (expected):**
- **prop** `defaultChecked` — defaultChecked?: boolean (attr `default-checked`). Radix splits controlled `checked` from uncontrolled `defaultChecked`. Today `checked` is silently treated as the uncontrolled initial value (facade passes it to the primitive's defaultChecked), so there is no way to express a true controlled switch. Add `defaultChecked` as the uncontrolled seed and make `checked` controlled (below) to match the trio convention.
- **prop** `checked (controlled)` — checked?: boolean — when set, the element reflects the consumer's value and does not self-advance; drive it from kai-change. The primitive already supports a controlled `checked` distinct from `defaultChecked`, but the facade discards it (maps the prop to defaultChecked). React/Vue/Svelte consumers expect a controlled Switch where they own state. This is a behavior CSS can't supply.
- **prop** `name` — name?: string (attr `name`). Switch is a form control; Radix and Shoelace both expose `name` so the toggle submits with a surrounding <form>. Without it the switch can't participate in native form submission / FormData.
- **prop** `value` — value?: string (default 'on'). Paired with `name`, the submitted value when checked (Radix/Shoelace default 'on'). Required for form participation.
- **method** `focus` — focus(options?: FocusOptions): void. The control lives in shadow DOM, so the host element's native focus() does not reach the inner role=switch button. Shoelace exposes focus()/blur() on every form control for exactly this reason; the kit's own `expose()` is documented for shadowing native focus.

_Nice-to-have:_ `required` (prop), `blur` (method), `kai-input` (event).

> The facade wires the `checked` prop to the primitive's `defaultChecked` (uncontrolled-only). There is no controlled mode, no form-participation, and no imperative focus, all of which the Switch archetype standardly carries. `kai-change { checked }` already covers onCheckedChange.

### `kai-choice` — aligns with Radix RadioGroup (Root value/defaultValue/onValueChange/disabled/required/name) — single-select-of-N. Submit-gated, but the selection layer should still expose the RadioGroup trio.

**Standard (expected):**
- **prop** `value` — value?: string (the selected option id) — controlled selection. RadioGroup's defining prop. kai-choice tracks selection in a private signal with no controlled override, so a consumer can neither set nor own the current pick before submit. Maps to RadioGroup.Root value.
- **prop** `defaultValue` — defaultValue?: string (option id to pre-select on mount). Lets the card open with a recommended option already selected (it renders a `recommended` pill today but can't pre-select it). Uncontrolled seed half of the RadioGroup trio.
- **event** `kai-value-change` — kai-value-change { value: string }. RadioGroup's onValueChange fires when the selection changes, BEFORE any commit. kai-choice only emits at Submit (the kai-card `action` verb), so a consumer can't react to the in-progress pick (e.g. enable/preview). This is the missing selection-change signal distinct from the terminal submit.
- **prop** `disabled` — disabled?: boolean (attr `disabled`) — disables the whole radiogroup + Submit. Per-option `disabled` exists in the data, but there is no group-level disabled to freeze the entire card (e.g. while the agent is busy). RadioGroup.Root and every Radix selection root expose a top-level `disabled`.

_Nice-to-have:_ `name` (prop), `focus` (method).

> kai-choice is a single-select radiogroup that defers emission until a Submit click (emits the Card `action` verb via the bubbling kai-card event). It currently has NO controlled selection surface and no per-selection change signal — only the terminal submit. Consumers wanting to pre-seed, control, or observe the in-progress selection have no API. The `resolution` prop only rehydrates the terminal read-only view, not live selection.

### `kai-tasks` — aligns with A multi-select checkbox group — Radix Checkbox group semantics + a select-all (no single Radix root for this, so model on Checkbox's checked/defaultChecked/onCheckedChange applied to the set, plus RadioGroup-style value array). Shoelace checkbox group conventions.

**Standard (expected):**
- **prop** `value` — value?: string[] (selected task ids) — controlled multi-selection. The selection set is private signal state seeded only from per-task `checked`. A consumer can neither control nor read the live selection. A top-level controlled `value` array is the standard handle for a multi-select group.
- **event** `kai-value-change` — kai-value-change { value: string[] }. onCheckedChange/onValueChange fire on every toggle. kai-tasks emits nothing until Confirm (the kai-card `submit` verb), so a consumer can't observe selection changes mid-flight (e.g. to live-update a count outside the card or enable a sibling control). This is the missing change signal distinct from the terminal submit.
- **prop** `disabled` — disabled?: boolean (attr `disabled`) — freeze the whole list + Confirm. Per-task `disabled` exists, but there is no group-level disabled to freeze the entire card (e.g. while the plan is executing). Every Radix selection/toggle root exposes a top-level `disabled`.

_Nice-to-have:_ `defaultValue` (prop).

> kai-tasks is a multi-select checkbox list with select-all + min/max gating, committing only on Confirm (emits the Card `submit` verb with `{ selected }` via the bubbling kai-card event). Like kai-choice, it has no controlled selection surface and no per-toggle change signal — only the terminal submit. Initial checked state comes only from per-task `data.checked`; there's no top-level controlled/observed selection.

### `kai-confirm` — aligns with Radix AlertDialog / a controlled action-set surface — the open/close trio (open/defaultOpen/onOpenChange) + dismissal. It already has `autofocus` (≈ AlertDialog default-action focus) and emits dismiss via the kai-card contract.

_Nice-to-have:_ `open` (prop), `kai-open-change` (event), `focusDefaultAction` (method).

> kai-confirm is an approval card with a dismissible affordance and an optimistic dismissed state. It behaves like a presence-controlled surface (AlertDialog) but exposes no open/close API — the host can't programmatically open/close it or be notified of dismissal except via the bubbling kai-card `dismiss`/`reopen` verbs. The `resolution` prop is the only presence handle and it's a rehydration channel, not a controlled open/close.

### `kai-form` — aligns with Radix Form (Root + Field/Control/Submit, client validation) · Shoelace form controls (reportValidity()/checkValidity()/reset(), per-field name/value, disabled). kai-form renders JSON-Schema fields, validates client-side, and emits the Card `submit` verb via the bubbling kai-card event.

**Standard (expected):**
- **prop** `values` — values?: Record<string, unknown> — controlled field values. The form's value store is entirely private (createStore seeded from schema defaults). A controlled `values` lets a consumer own/observe the form state — the Form-archetype expectation for two-way binding. Behavior CSS can't supply.
- **prop** `defaultValues` — defaultValues?: Record<string, unknown> — initial values overlaying schema defaults. Today initial values can only come from per-field JSON-Schema `default`. Consumers routinely need to pre-fill a form from existing data (edit flows) without rewriting the schema. Uncontrolled seed half of the convention.
- **event** `kai-values-change` — kai-values-change { values: Record<string, unknown>; valid: boolean }. kai-form validates on input internally but emits nothing until the terminal kai-card `submit`. A change event with the current (coerced) values + validity is the standard live-binding/observation signal every form library provides, and is distinct from the submit verb.
- **method** `validate` — validate(): { valid: boolean; errors?: Record<string,string> }. Shoelace exposes checkValidity()/reportValidity() on every form control; Radix Form runs client validation. kai-form has a full validateAgainstSchema pass internally but no way to trigger/read it imperatively (e.g. before a host-driven submit). Surface it.
- **method** `submit` — submit(): void — programmatically validate + emit the submit verb. Lets a host trigger submission from an external button (a common pattern when the submit control lives outside the card chrome). Mirrors HTMLFormElement.requestSubmit()/Shoelace form submit.
- **method** `reset` — reset(): void — restore values to defaultValues/schema defaults and clear errors. Standard on every form control (HTMLFormElement.reset, Shoelace reset()). kai-form has no way to clear/restore its private value store. Needed for retry/cancel flows.
- **prop** `disabled` — disabled?: boolean (attr `disabled`) — disable all fields + submit. Per-field `readOnly` exists in the schema, but there is no group-level disabled to freeze the whole form (e.g. while submitting / while the agent is busy). A top-level `disabled` is standard on form roots/fieldsets.

> kai-form owns a private store of field values and validates against the schema, but exposes none of it: no controlled/observed values, no imperative validate/submit/reset, and no group-level disabled. The `resolution` prop only rehydrates the read-only post-submit view. Consumers wanting two-way binding, pre-fill beyond schema `default`, live-validation feedback, or programmatic submit have no surface.

