# Chat interaction components — implementation plan

- **Date:** 2026-06-20
- **Branch:** `feat/chat-interactions` (off `main` @ 499a8d1)
- **Source:** four design agents (toast / action-row / card-dismiss / split). This plan synthesizes their proposals + the cross-cutting resolutions. Implement against it.

## Scope (before the state-helpers plan)
1. `kai-toast-region` + `toast()` — transient-notification primitive.
2. Message action-row: copy→check+toast, like/dislike mark-and-hide-other+toggle+toast.
3. Generative-UI card **dismiss + recovery**.
4. **`kai-compare`** — dual-response comparison.
5. Tooltip dismiss-on-trigger-click (small fix).
Each: SolidJS source → `kai-*` facade → tests → docs → MCP patterns → IVP.

## Cross-cutting resolutions (decided)
- **Toast portal:** the `kai-toast-region` mounts on `document.body` (global viewport overlay) but is a `defineWebComponent` element with its OWN shadow root + the shared Constructable Stylesheet — so it is viewport-positioned AND keeps kit CSS. (Resolves the action-row agent's "escapes shadow → loses styles" concern: it's a styled custom element, not a raw div.)
- **`MessageBody` extraction:** the reasoning+tools+attachments+content block is duplicated in `chat-thread.tsx:170-200` and `message.tsx:92-131`. Extract `MessageBody` in `message.tsx`; route ChatThread, kai-message, AND ResponseCompare through it. Done in Phase 2 (so action-row + compare both build on it).
- **`useCardResolution` generalization:** add `isTerminal`/`isDeferred` accessors (card-dismiss) and parameterize it so `kai-compare` reuses the same `props.selection > local optimistic > none` precedence.
- **Generated files run ONCE at the end** (not per agent): `npm run build:api` / wrapper+dts+manifest generators, then `git checkout -- src/components/component-meta.json` (CLAUDE.md gotcha). Impl agents only edit SOURCE + add the `register-impl.ts` import + run `typecheck` + targeted `vitest` (NOT full build).
- **Conventions:** two-layer (src/components Solid → src/elements `defineWebComponent` facade); array/object props = JS properties only; non-bubbling `kai-*` events via `dispatch`; tests co-located/`tests/`; voice per docs-site/STYLE.md (no emoji).

## Build order (conflict-aware)
- **Phase 1 (parallel — disjoint files):** Toast · Tooltip-fix · Card-dismiss.
- **Phase 2 (one agent — shared message.tsx/chat-thread.tsx):** MessageBody extraction + action-row feedback. Depends on toast.
- **Phase 3:** kai-compare. Depends on MessageBody + useCardResolution.
- **Phase 4:** generators + docs + MCP + IVP across all.

---

## 1. Toast — `kai-toast-region` + `toast()`
- **API:** imperative `toast(msg, opts?)` / `toast.success` / `toast.dismiss(id)` returning `{id,dismiss,update}` (PRIMARY); declarative `<kai-toast-region toasts=[] position max>` substrate. Both feed one `ToastRegion`. Store in `src/primitives/toast-store.ts` (module-level reactive store + `ensureMounted()` → creates ONE `kai-toast-region` on `document.body` on first call).
- **Types:** `ToastVariant='neutral'|'success'`; `ToastAction={label,onAction:()=>void|false}`; `ToastItem={id,message,variant?,action?,duration?,dismissible?}`; `ToastRegionProps={toasts,position?='top-center',max?=3,onDismiss?}`.
- **Behavior:** slide-in from top-center, auto-dismiss 2000ms (floor 4000ms when `action` present; 0=sticky), pause-on-hover, manual ×, stack (max 3, queue overflow, newest on top), `aria-live=polite`/`role=region`. Reuse `createPresence` (src/ui/overlay.tsx) + tw-animate-css `animate-in/out fade slide-in-from-top`.
- **Facade events:** `kai-dismiss {id,reason}`, `kai-action {id,label}` (for declarative consumers).
- **Global reduced-motion:** add ONE block to `src/elements/styles.css` `@layer base`: `@media (prefers-reduced-motion: reduce){ .animate-in,.animate-out,[class*="animate-["]{animation:none!important} }`.
- **Files:** new `src/components/toast.tsx`(+test+stories), `src/primitives/toast-store.ts`(+test), `src/elements/toast.tsx`(+stories+declarative.test); edit `src/elements/register-impl.ts` (`import './toast'`), `src/elements/styles.css`. Export `toast` from the `.` barrel AND re-export from `./elements`.
- **Do NOT** touch `message.tsx` (copy wiring happens in Phase 2).

## 2. Message action-row feedback (Phase 2)
- **State model:** facade (`ChatThread` + `kai-message`) owns `feedbackMap: Record<msgId,'like'|'dislike'>` + `copiedIds: Set<msgId>` signals (live ABOVE the per-message `<For>`, so streaming re-renders don't wipe them). Add optional `ChatMessage.feedback?: 'like'|'dislike'` (controlled-wins: `m.feedback ?? feedbackMap()[m.id]`). `MessageActionBar` stays pure/prop-driven: new props `activeFeedback?`, `copied?`.
- **Behavior:** copy → clipboard (facade has `m.content`) + check icon (reuse emerald `Check`) + `toast('Copied to clipboard')`. like/dislike → mark chosen active (`aria-pressed`, filled color), HIDE the other via `createPresence` exit, re-tap toggles both back; `toast('Thanks for your feedback')` on SET only (not un-vote). 
- **Events:** keep `kai-message-action`, extend detail additively: `{messageId, action, state?:'on'|'off'}`. Update typed Events in `chat.tsx` + `elements/message.tsx`.
- **Files:** `chat-types.ts` (FeedbackVote + `feedback?`), `message.tsx` (MessageActionBar props + MessageBody extraction), `chat-thread.tsx` (state + copy/toast handler + emit state), `elements/message.tsx` (same for standalone), `chat.tsx` (event type).
- **Tests:** the streaming-re-render-preserves-selection regression; copy check + revert (fake timers); toggle on/off events; controlled `feedback`; toast spy (called on set/copy, NOT on un-vote).

## 3. Card dismiss + recovery (Phase 1)
- **Contract (additive, no `CARD_CONTRACT_VERSION` bump):** `CardResolution += {kind:'dismissed',at?} | {kind:'expired',reason?,at?}`; `CardEvent += {kind:'reopen',cardId}`; `CardPolicy += onReopen?`. Add `reopen` arm to `routeCardEvent` + bridge in `remote.tsx` (mirror onDismiss).
- **Controller:** `use-card-resolution.ts` += `isTerminal` (action|submit|expired) + `isDeferred` (dismissed). `isResolved` stays `!== undefined`.
- **UX:** × (only when `dismissible`; ADD `dismissible?` to choice+tasks data for parity) → emit `dismiss` + optimistic `setLocal({kind:'dismissed'})`. Render a collapsed re-openable **stub** (`src/components/dismissed-stub.tsx`, `Card` dense) "Proposed: <title> — dismissed · Reopen" when `isDeferred()`. Reopen → emit `{kind:'reopen'}`.
- **Recovery helper:** new `src/primitives/card-recovery.ts` → `dismissRecovery({get,set,toast?,isReopenable?,staleAfterMs?})` returns `{onDismiss,onReopen}` for a `CardPolicy`. onDismiss writes `dismissed` + shows injected toast "Dismissed · Undo" (Undo restores). onReopen: `isReopenable` → clear resolution (live) else `expired`. Default `isReopenable`: true unless a terminal resolution exists or `staleAfterMs` elapsed since `dismissed.at`. **Re-appear rule: host decides** ("proceeded" is a host fact).
- **Files:** `card-contract.ts`, `card-routing.ts`, `card-recovery.ts`(new), `use-card-resolution.ts`, `dismissed-stub.tsx`(new), `confirm-card.tsx`, `choice-card.tsx`, `form.tsx`, `tasks-card.tsx`, `remote.tsx`, card schemas; export `dismissRecovery`+types. Toast is INJECTED (adapter `{show(opts):{dismiss()}}`), never imported by cards.
- **Tests:** routing reopen; card-recovery (dismiss writes dismissed immutably, Undo restores, reopen→live/expired, isReopenable truth table); use-card-resolution isDeferred/isTerminal; per-card × → stub → reopen; `<kai-cards>` renders stub.

## 4. `kai-compare` — dual-response (Phase 3)
- **Standalone element** (not a ChatMessage variant for v1; optional `compare?` field on ChatMessage is a phase-2 follow-up). Reuses `useCardResolution`.
- **Types** (`src/components/response-compare.ts`): `CompareCandidate={id,content,reasoning?,tools?,attachments?,label?,model?,streaming?}`; `ResponseCompareData={prompt?,candidates:[A,B],collapse?}`; `CompareSelection={chosenId,rejectedIds,at?}`.
- **API:** `ResponseCompare` (Solid) + `<kai-compare>` facade. Props: `data` (JS prop), `compareId`, `selection` (re-hydrate), `layout?='auto'|'columns'|'stacked'`, prose/code. Events: `kai-compare-select` (CompareSelection), `kai-ready`, `kai-error`.
- **Behavior:** both candidates stream (fresh `data` ref per chunk); pick disabled until both settle (per-column TextShimmer while streaming); select=commit (no Submit) → optimistic `setLocal` → collapse to chosen via `<Show when={!isResolved()} fallback={CollapsedWinner}>`; emit `{chosenId,rejectedIds}` for the consumer to send a `(prompt,chosen,rejected)` preference pair. Reuse `MessageBody` per candidate.
- **Layout/a11y:** container-query auto (stacked <~640px, columns above); `role=radiogroup` + roving tabindex (reuse choice-card's `nextEnabledIndex` helpers); `role=status` announce on optimistic collapse.
- **Files:** new `response-compare.ts`/`.tsx`(+test+stories), `src/elements/compare.tsx`(+stories+declarative.test); `register-impl.ts` import; consume MessageBody.

## Tooltip fix (Phase 1)
- `src/ui/tooltip.tsx`: the trigger child should `hide()` on `click`/`pointerdown` (it lingers now). Add the handler next to the existing `onPointerLeave`; universally correct for action-style tooltips. Optional `dismissOnClick?=true`. + a test (clicking trigger removes the `role=tooltip` node).

## Verification (Phase 4)
- Per phase: `npm run typecheck` (4 passes) + targeted `vitest` green.
- End: full `npm test`, `npm run build` + generators + `git checkout -- src/components/component-meta.json`, docs build.
- **IVP:** agents build real consumer usage (raw-DOM + a framework) for toast/compare/card-dismiss/action-row and Playwright-verify the interactions (toast slide+autodismiss; copy-check; like/dislike mark-hide-toggle; dismiss→stub→undo→reopen; compare pick→collapse). High confidence required.
- Docs pages per component (Attachments template) + MCP `component_reference` (auto from CEM) + scaffold archetypes (toast pattern, dismissRecovery wiring, preference-capture) + debug gotchas.
