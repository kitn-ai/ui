# Voice input and microphone selection — implementation plan

> **For agentic workers:** one task at a time, each with its own gate. Steps use `- [ ]`.

**Goal:** the microphone stops being a button that fires an event. It becomes a control that owns a device list, an opt-in preview stream and the recording, composes a device menu with a live level, and writes what it hears into the composer's field as it hears it — with the selected device owned by the app, not by the kit.

**Architecture:** four pieces, smallest first: `listAudioInputs()` (a primitive, no UI), `useVoiceRecorder` gaining `deviceId` and a caller-supplied `stream`, `<kai-voice-device-menu>` (its own component and its own element, built on the dropdown primitives, never `<kai-menu>`), and `<kai-voice-input>` owning one capture stream whose consumer switches between the menu's meter and the recorder. The composer's part is to **place** the control, forward two props, and write the interim run into its own field.

**Tech Stack:** SolidJS, Tailwind (scanned sheet), Vitest (jsdom), the kit's `defineWebComponent` facade layer, the `probe-*` real-chromium script pattern.

**Spec:** `docs/superpowers/specs/2026-09-26-voice-input-and-device-selection-design.md` — read it first, then this. §3's "the composer only forwards" sentence is the constraint the whole plan is ordered around.

## The precondition §7 rests on, resolved

The spec's live-text ruling (§7, §12.3) is stated as designed, and §13 has **no step for its supply**. Traced:

- `kai-transcript-interim` exists and works **on the native path only**. `use-speech-recognition.ts:92,96-106` sets `interimResults` from `options.interim` and calls `onInterim` on each partial; `components/voice/voice-input.tsx` passes `onInterim` through only `when props.interim`; the element forwards it to `kai-transcript-interim` (`web-components/voice-input/voice-input.tsx:60,88`).
- On the host-`transcribe` path there is nothing to forward, and there can be none: `transcribe: (audio: Blob) => Promise<string>` resolves **after** recording stops. The control's prop doc ("No-op on the transcribe/fallback paths") is accurate and stays accurate.
- **Nothing consumes it today, and the reason is the seam, not the capability.** `<kai-prompt-input voice>` renders a bare `Button` that calls `props.onVoice` (`components/prompt/default-input.tsx:517-528`), `ChatThread` forwards that to `kai-voice` (`web-components/chat/chat.tsx:320,357`), and the **host** places the recorder: the assistant block puts its own `<kai-voice-input id="voice">` as an unnamed child of the prompt input (`packages/blocks/blocks/assistant/assistant.html:762-770`) — with **no `interim` attribute**, so `kai-transcript-interim` never fires in the block at all. The composer never sees an interim because the composer has no control.

**So the precondition is resolved in three parts, and they are rulings, not open questions:**

1. **Interim stays native-only.** The kit will not invent a streaming transcriber property; a host that supplies `transcribe` gets one commit at the end, exactly the degradation §7 already names as expected. Where live text is promised, the promise is scoped to native recognition.
2. **The composer places the control** (§3's own sentence: "the composer's part is to place the control and to write the transcript into its own field"), and **enables `interim` on it** — the composer needs live text, so the opt-in belongs to the composer's own placement, not to a prop the host may forget. That is Task 6, and it is why Task 6 cannot be only "forward two pass-through props".
3. **The range arithmetic is its own piece and ships first** (Task 1), because it is a pure function with no dependencies and because it is the part of §7 that "would otherwise be discovered in production" (spec §10).

**A trap this creates, named here because it is invisible in the spec's sequence:** the composer placing the control makes the block's unnamed recorder a **second** microphone. §3.1 exists to prevent two `getUserMedia` calls for one intent. The block's placement therefore has to move in the **same task** as the composer's (Task 6) — not in the last task, which is where the spec's §13.5 puts "the block template's two props".

## Global Constraints

- Web components are prefixed **`kai-`**. Events are **non-bubbling `kai-*` CustomEvents**; consumers listen on the element itself. Array/object props are **JS properties, never attributes**.
- **`web-component-nonscalar.json` is GENERATED, never hand-edited.** `scripts/gen-web-component-nonscalar.mjs` derives it from the `scalar` bit in `web-component-meta.json`, which is read from the TS checker over the element's `Props` interface. **The spec (§8.3) calls this list one of "the two hand-written additions" — that is wrong.** The two hand-written additions are the **registration line** in `src/web-components/register/register-impl.ts` (beside `import '../voice-input/voice-input'`) and the **story**; the non-scalar entry, `web-component-meta.json`, `web-component-types.d.ts`, the React wrapper and `llms-full.txt` all come from `npm run build:api`, and `web-component-manifest.json` from `gen-web-components-manifest.mjs` (a directory scan). Hand-editing the JSON is caught by `src/web-components/web-component/web-component-artifact-divergence.test.ts` and `verify:generated-sync` — which is a gate, not a licence to edit.
- **Decide loudly.** A refused permission, a vanished device, a track that ends under a live recording: each is reported (`kai-voice-error`), never reflected only in a list.
- **The empty case is a first-class case, not a fallback.** A machine with no microphone, `navigator.mediaDevices` undefined (an insecure context), `enumerateDevices()` returning one entry with `label: ''`, and a device that disappears between listing and `getUserMedia` are four distinct states every surface here has to render without throwing. `getUserMedia({ audio: { deviceId: { exact } } })` rejects with `OverconstrainedError` for the last one; that rejection is a `kai-voice-error`, and the menu still renders.
- **Never open a stream to learn a label** (§4). Placeholder names until permission exists.
- **One capture stream, one owner** (§3.1). Given `stream`, the recorder uses it; given only `deviceId` it acquires its own; given both, **the stream wins**. Whoever acquired the tracks is who stops them, and that is the control.
- Never wrap a command in a heredoc, and never pipe a long-running command into `tail`; capture output to a file and read it. **If a command hangs, run `ps` first.**
- **A comment in `src/**` must not cite a spec section, a task or a dated ruling** — `node scripts/lint-comment-references.mjs` enforces it. New props need doc comments within the 160-character cap and free of em dashes — `node scripts/lint-prop-docs.mjs` enforces both. Run both after touching props or comments, from `packages/ui`.
- **A new element needs its story**, co-located as `src/web-components/<dir>/<name>.stories.tsx` (the shape `voice-output.stories.tsx` has), and `node scripts/lint-story-conventions.mjs` requires a usage snippet **per story**. `src/web-components/voice-input/` has no story today, which is part of why the level row has nowhere to be reviewed; Task 3 adds the menu's.
- **Before a task's rounds begin the tree must be clean of other change sets.** `git add <file>` stages the WHOLE file: a file another change set has already dirtied commits that work under your message, undisclosed and unreviewable by `git log -S`. Check `git diff --cached --name-only` per commit.
- Stage only the files you touch. Commits are approved on this branch; nothing is pushed.
- Run everything from the repo root. Unit tests: `pnpm --filter @kitn.ai/ui exec vitest run --project=unit <path>`. Typecheck: `npm run typecheck` inside `packages/ui` (its `verify:quarantine` step runs first, deliberately).

---

### Task 1: The interim run — supply, and the arithmetic it feeds

§7's mechanism, as a pure function, plus the honest statement of where an interim can come from. **This is the precondition task and it opens the plan** because every later task that consumes live text depends on this contract existing.

**Files:**
- Create: `packages/ui/src/primitives/interim-run.ts`
- Create: `packages/ui/src/primitives/interim-run.test.ts`
- Modify: `packages/ui/src/components/voice/voice-input.tsx` (the `interim` prop doc: name the degradation, not just "native only")
- Modify: `packages/ui/src/web-components/voice-input/voice-input.tsx` (the same fact on the element's `interim`)

**Interfaces:**
- Produces:
  - `interface InterimRange { start: number; end: number }`
  - `applyInterim(value: string, range: InterimRange | undefined, text: string): { value: string; range: InterimRange | undefined }` — a revision replaces the tracked range; no range (or a range that no longer fits the value) starts a fresh run ending at `text.length`.
  - `commitInterim(value: string, range: InterimRange | undefined, finalText: string): { value: string; range: undefined }` — the final result writes the same range and clears the tracker.

- [ ] **Step 1: Write the failing test.** Cover the four cases §7 names, in this order, because the third is the one that ships broken:
  - a revision: `('hello', {5,5}, ' world')` → `'hello world'`, range `{5,11}`; revise again → the run is replaced, not appended.
  - a commit: the final text replaces the same range and the tracker clears.
  - **an external edit**: a range tracked at `{5,11}` against a value the user has since typed into (`'hello there world'`) must not splice at 5-11 and must not throw — the partial text already in the field stays as ordinary text and the next interim starts a fresh run at the caret. Assert the value after the external edit is what it was before the interim call.
  - **a range that runs past the end of the value** (a host setting `value` shorter) — treated as an external edit, never `slice` past the end.
  - the empty and whitespace-only interim: no write at all, the tracker survives.
- [ ] **Step 2: Run it to verify it fails.** `pnpm --filter @kitn.ai/ui exec vitest run --project=unit src/primitives/interim-run.test.ts` → FAIL, module absent.
- [ ] **Step 3: Write the pure function.** No Solid import, no DOM. Two clauses carry the weight and each needs a comment saying why: the range is validated against the CURRENT value before it is used, and a rejected range yields a fresh run rather than an error.
- [ ] **Step 4: Correct the `interim` docs on both layers.** Today both say "native path only" / "No-op on the transcribe/fallback paths", which is true but does not tell a host what it means for their UI. State the fact plainly: partials flow only where native `SpeechRecognition` runs; a host that supplies `transcribe` returns final text after the recording stops, so it gets one commit at the end, and nothing in the composer should render as though live text were promised. **No spec citation** in either comment (the lint).
- [ ] **Step 5: Run + lint.** The test passes; `node scripts/lint-prop-docs.mjs` and `node scripts/lint-comment-references.mjs` clean.
- [ ] **Step 6: Commit.** `git add packages/ui/src/primitives/interim-run.ts packages/ui/src/primitives/interim-run.test.ts packages/ui/src/components/voice/voice-input.tsx packages/ui/src/web-components/voice-input/voice-input.tsx`, message about the interim run arithmetic and where partials can come from.

**Acceptance:** the pure function's tests include the external-edit and out-of-range cases and pass; the two doc comments name the degradation.

---

### Task 2: `listAudioInputs`, and the recorder's two new inputs

The spec's §13.1, and its order is right: no UI, shippable alone, and everything downstream reads the shapes it fixes.

**Files:**
- Create: `packages/ui/src/primitives/audio-inputs.ts`
- Create: `packages/ui/src/primitives/audio-inputs.test.ts`
- Modify: `packages/ui/src/primitives/use-voice-recorder.ts:3-8,20` (`{ mimeType?: string }` → `deviceId`, `stream`)
- Modify: `packages/ui/tests/primitives/use-voice-recorder.test.ts` (extend)

**Interfaces:**
- Produces:
  - `interface AudioInput { deviceId: string; label: string }`
  - `listAudioInputs(): Promise<{ devices: AudioInput[]; labelled: boolean }>` — `enumerateDevices()`, `kind === 'audioinput'` only, `labelled` true when at least one label is non-empty. On a platform without `navigator.mediaDevices` it resolves `{ devices: [], labelled: false }`; it never throws.
  - `onAudioInputsChange(cb: (next: { devices: AudioInput[]; labelled: boolean }) => void): () => void` — one `devicechange` listener, returning its own disposer.
  - `useVoiceRecorder({ mimeType?, deviceId?, stream? })`. **When `stream` is given the recorder does not call `getUserMedia` and does not stop the tracks it was handed**; when only `deviceId` is given it acquires `{ audio: { deviceId: { exact } } }`; with both, the stream wins.

- [ ] **Step 1: Write the failing tests.** Stub `navigator.mediaDevices`:
  - labels empty before permission → `labelled: false`, positional labels are the CALLER's business (this primitive returns the empty label as it is);
  - labels after permission;
  - an output device filtered out;
  - a device disappearing (the second call returns one fewer) — the primitive reports the new list and nothing else;
  - `navigator.mediaDevices` undefined → `{ devices: [], labelled: false }`, no throw;
  - the disposer removes the `devicechange` listener (assert via a stub `removeEventListener`).
  For the recorder: a supplied `stream` means `getUserMedia` is **not** called (assert the spy), and `stop()` resolves the blob **without stopping the handed-in tracks** (assert `track.stop` was not called); a `deviceId` alone reaches `getUserMedia` as `{ audio: { deviceId: { exact: id } } }`.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.** Keep the existing catch-block behaviour that stops a stream left live by a later failure (`use-voice-recorder.ts:44-54`) — it is still right for the acquire path, and it must NOT fire for the handed-in stream.
- [ ] **Step 4: Run + typecheck.** `pnpm --filter @kitn.ai/ui exec vitest run --project=unit src/primitives/audio-inputs.test.ts tests/primitives/use-voice-recorder.test.ts tests/components/voice/`.
- [ ] **Step 5: Commit.**

**Acceptance:** the stubbed-enumeration tests above pass; the recorder test proves the handed-in stream is neither acquired nor stopped by it.

---

### Task 3: Proof-first — the element facade and the generated registry

**The risky part of this whole spec is not the audio, it is the generated registry**: a new tag has to survive `build:api`, the non-scalar derivation, the React wrapper generator, the directory-scan manifest and the registration list, and every later task's gate is meaningless if it does not. So prove **one end-to-end path** with the smallest possible element before any behaviour is built on it.

**Files:**
- Create: `packages/ui/src/web-components/voice-device-menu/voice-device-menu.tsx` (facade skeleton)
- Create: `packages/ui/src/components/voice/voice-device-menu.tsx` (the component it wraps — this task renders rows and nothing more)
- Create: `packages/ui/src/web-components/voice-device-menu/voice-device-menu.stories.tsx`
- Modify: `packages/ui/src/web-components/register/register-impl.ts` (one import, beside line 32)
- Regenerated (by running the command, not by editing): `web-component-nonscalar.json`, `web-component-meta.json`, `web-component-types.d.ts`, `frameworks/react/index.tsx`, `llms-full.txt`, `web-component-manifest.json`

**Interfaces:**
- Produces on `<kai-voice-device-menu>` / `VoiceDeviceMenu`: `devices?: { deviceId: string; label: string }[]` (JS property, non-scalar), `value?: string`, `level?: number`; event `kai-device-change` with `{ deviceId }`. No behaviour beyond rendering the list and emitting on a row click — the level row, the disabled-while-recording state and the note row are Task 4.

- [ ] **Step 1: Write the element skeleton** with the three props typed exactly as above (`level?: number` must be scalar; `devices` must be an array so the derived `scalar` bit is false and the entry appears on its own), a `defineWebComponent<Props, Events>('kai-voice-device-menu', …)` call, and a component that renders the device rows as buttons with an `aria-checked`/`role` treatment you will keep in Task 4.
- [ ] **Step 2: Register it.** Add the import to `register-impl.ts`. This line is hand-written; nothing scans for it.
- [ ] **Step 3: Regenerate and read what the generators say.** From `packages/ui`: `npm run build:api` and `node scripts/gen-web-components-manifest.mjs`, then **check the artifacts rather than assuming**: `web-component-nonscalar.json` has a `kai-voice-device-menu` key listing `devices` and only `devices`; `web-component-meta.json` has the tag; `frameworks/react/index.tsx` has the wrapper; the manifest's `tags` has the tag→directory mapping. If the non-scalar key is missing, the prop's declared type is the thing to fix — **do not add the key by hand**.
- [ ] **Step 4: Write the story** with a snippet and three args stories: three devices; one device with an empty label; an empty list. Each story needs its own `parameters.docs.source.code` (per-story, not per-file — `lint-story-conventions.mjs` says so).
- [ ] **Step 5: Gate.** `pnpm --filter @kitn.ai/ui exec vitest run --project=unit tests/web-components/ src/web-components/web-component/` and `npm run verify:react-wrappers`; `node scripts/lint-story-conventions.mjs`.
- [ ] **Step 6: Commit** — code, the story, the registration line, and every regenerated artifact, together. Splitting the registration from the regenerated meta is how a tree ends up with a tag that has no wrapper.

**Acceptance:** the artifact-divergence/registry tests pass, the non-scalar key was produced by the generator rather than typed, and the React wrapper exists.

---

### Task 4: The menu's behaviour, on the dropdown primitives

**Files:**
- Modify: `packages/ui/src/components/voice/voice-device-menu.tsx`
- Test: `packages/ui/tests/web-components/voice-device-menu.test.tsx` (element-level events) and/or `packages/ui/src/components/voice/voice-device-menu.test.tsx`

**Interfaces:**
- Consumes: the dropdown primitives directly — **not** `<kai-menu>` and **not** `KaiMenuItem`. A live meter row is an audio concept; putting it in the general menu's item vocabulary would make every menu carry a field only one caller reads.
- Produces: the level row (rendered only when `level` is defined, as a bar whose fill is `level` clamped to 0–1, `aria-hidden` because the numeric state is not a fact anyone needs announced); rows that check `value`; a `note` row used for "Stop recording to change microphone"; a `disabled` state for every row while `disabled` is set; `kai-device-change` on row selection.

- [ ] **Step 1: Write the failing tests.** The four states §10 names are the acceptance: no devices; permission not yet granted (empty labels → positional names, and **no stream opened**: assert no `getUserMedia` spy call during any render); a `value` that is not in `devices` (nothing checked, and the list still renders — this is the state a reload lands in when the app persisted a choice); and every row disabled while `disabled`. Plus: the level row absent when `level` is undefined, present when it is 0 (a meter at rest is a real reading and must not be mistaken for "no meter").
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement the rows.** Follow the existing dropdown row shapes (`components/dropdown/dropdown.tsx`), including the chevron/roving-focus contract, and reuse the shared `ItemLabel` rather than a second label block.
- [ ] **Step 4: Gate.** Unit tests above, plus the element's registry tests still green.
- [ ] **Step 5: Commit.**

**Acceptance:** the four states pass and the "no devices" render opens no stream.

---

### Task 5: The control — `deviceId`, `preview`, and one stream

The spec's §13.3. It is the largest task and it is where §3.1's lifecycle lives.

**Files:**
- Modify: `packages/ui/src/components/voice/voice-input.tsx`
- Modify: `packages/ui/src/web-components/voice-input/voice-input.tsx`
- Create: `packages/ui/src/primitives/voice-device-preview.ts` (the stream lifecycle, if it does not fit cleanly in the component)
- Test: `packages/ui/tests/web-components/voice-input.test.tsx` (extend), plus a test for the lifecycle

**Interfaces:**
- Adds to `<kai-voice-input>` / `VoiceInput`: `deviceId?: string` (controlled; attribute `device-id`; absent or empty = system default), `preview?: boolean` (attribute `preview`); events `kai-devices-change` `{ devices, labelled }` and `kai-device-change` `{ deviceId }` re-emitted from the menu it composed. `kai-audio-captured`, `kai-transcription`, `kai-transcript-interim`, `kai-recording-change`, `kai-voice-error` unchanged.
- The control holds **at most one** capture stream: menu open + `preview` → the stream serves the meter; recording → the same stream serves the recorder; neither → no stream, tracks stopped. Ownership of the tracks stays with the control, which is the only thing that stops them.

- [ ] **Step 1: Write the failing tests.**
  - `preview: false` (the default) opening the menu calls `getUserMedia` **zero** times; `preview: true` opening it calls once, and closing it releases the tracks (`track.stop` called) — assert both.
  - **Starting a recording while the preview stream is live does not acquire a second stream** (the `getUserMedia` count stays 1) and the recorder's blob still resolves.
  - `deviceId` reaches the acquisition as `{ audio: { deviceId: { exact } } }`; empty string means `{ audio: true }`.
  - a refused permission (`getUserMedia` rejects) dispatches `kai-voice-error` with the platform's message **and** the control is still clickable afterwards (permission can be granted later); no level row is painted.
  - a `devicechange` while **idle** produces `kai-devices-change` with the new list and does not throw; while **recording**, the ended track produces `kai-voice-error`, never a silent stop.
  - `kai-device-change` from the composed menu is re-emitted on the control so an app listens in one place.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.** The rule that needs a comment at the site: **the stream wins over `deviceId`**, and the control is the only stopper.
- [ ] **Step 4: Gate.** Unit suite for `tests/web-components/voice-input.test.tsx`, `tests/components/voice/`, `tests/primitives/use-voice-recorder.test.ts`; `npm run build:api` (the two new props change the generated meta/wrappers/non-scalar file — `deviceId`/`preview` are scalars, so the non-scalar key for `kai-voice-input` stays `["transcribe"]`; if it changed, something is typed wrong).
- [ ] **Step 5: Commit.**

**Acceptance:** the `getUserMedia` call COUNT is asserted in the preview and start-while-live cases — that number is §3.1's whole content.

---

### Task 6: The composer owns the control, and the block stops placing its own

The spec's §13.4 **plus the part of §13.5 that cannot wait**. Today `<kai-prompt-input voice>` paints a bare `Button` firing `kai-voice` (`default-input.tsx:517-528`; `chat.tsx:320,357`) and the host places the recorder (`assistant.html:762-770`). The composer placing the control makes that host-side element a second microphone, so the block's migration lands here, in the same task, not later.

**Files:**
- Modify: `packages/ui/src/components/prompt/default-input.tsx` (place the control; forward `voiceDeviceId`, `voicePreview`)
- Modify: `packages/ui/src/components/chat/chat-thread.tsx` and `packages/ui/src/web-components/chat/chat.tsx` (the two pass-through props, and the element's prop table)
- Modify: `packages/ui/src/web-components/composer/*` or whichever facade owns the prompt input's props (the same two pass-throughs)
- Modify: `packages/blocks/blocks/assistant/assistant.html` (retire the separate `<kai-voice-input id="voice">` and the four handlers that read it; keep the strip)
- Modify: `packages/blocks/blocks/assistant/assistant.controller.ts` (`voiceToggle`, `voiceRecording`, `voiceTranscript`, `voiceError`, `voiceCaptured`, `voiceStatus` — what survives depends on which signals the control now paints)
- Test: `packages/ui/src/components/prompt/default-input.test.tsx`, `packages/ui/tests/web-components/voice-input.test.tsx`

**Interfaces:**
- `DefaultPromptInputProps` gains `voiceDeviceId?: string` and `voicePreview?: boolean`, **documented as pass-throughs** — the behaviour lives on the control, because whether opening a menu activates a microphone is a policy decision (owner's ruling) and because the pieces must work independently.
- The composer enables `interim` on the control it places and routes `onInterim` through `applyInterim` (Task 1), writing via its existing `value`/`onValueChange` contract so a controlled host sees every revision. The external-edit rule (§7) is the composer's: if the value changed by anything other than its own interim write, the run is committed and the next interim starts fresh.
- The composer also carries the mic's live level while recording (the level from the SAME stream, per §6) — the button becomes the stop control.

- [ ] **Step 1: Write the failing tests.** The composer with `voicePreview` set and the menu opened calls `getUserMedia` once; typing then a synthetic interim leaves the typed text alone (the external-edit rule, now through the real component); a final transcript replaces the run and clears it; setting `value` from the host mid-run commits it.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Place the control** in the trailing cluster where the mic button was, forwarding the two props, and delete the bare-button path (`voice` keeps meaning "there is a voice affordance here"). Update the element-level prop tables so the pass-throughs are discoverable; run `npm run build:api` and confirm the generated docs carry them.
- [ ] **Step 4: Migrate the block in the same commit.** Retire its `<kai-voice-input>`, wire `voice-device-id`/`voice-preview`, and delete the handlers that no longer have an event. **This is the step that must not be deferred:** with the composer placing the control, leaving the block's element in place is two microphones for one intent.
- [ ] **Step 5: Gate.** Unit suite for the composer + voice; `verify:blocks` and the block driver; re-record the driver's screenshots and **revert any that differ only by run noise** (a caret, a timestamp, ~100 bytes) — commit the ones whose size actually moved.
- [ ] **Step 6: Commit.**

**Acceptance:** one `getUserMedia` in the composer-preview case; the block driver renders a working single microphone; the external-edit test passes through the real composer, not the pure function.

---

### Task 7: The block template's props, and what lifts the guide restriction

**Files:**
- Modify: `packages/blocks/blocks/assistant/states.mjs` (a device state, and a state that exercises the picker)
- Modify: `packages/blocks/blocks/assistant/assistant.html` (the controlled `voice-device-id`, `voice-preview`, `@kai-device-change`)
- Modify: `packages/blocks/blocks/assistant/assistant.transport.mock.ts` (`GUIDE_SCRIPTS` — the Add voice guide's fences)
- Modify: `docs/superpowers/specs/2026-09-26-empty-state-and-guides-design.md` **only if** the sentence needs retiring, and then by pointing at the fence that now proves the capability, never by rewriting the ruling

**The restriction and what lifts it, stated so it is not guessed at.** The Add voice guide's fences were forbidden from naming `deviceId` or `enumerateDevices` while those were unbuilt, and the guide's summary was deliberately worded ("and the events that drive your UI") to avoid promising device choice. **The restriction lifts when `<kai-voice-input>`'s `device-id` and `preview` actually ship and the guide's fence compiles against the shipped declarations** — that is after Task 5 for the element, after Task 6 for the composer's pass-through, and the proof is `pnpm --filter @kitn.ai/ui run verify:guide-fences` passing over a fence that names them. The fence is the authority: it type-checks the guide against the published types through the consumer harness, so a fence can be written the moment the prop exists and not one commit earlier. Until then, no sentence and no fence may name them — a guide that promises what the kit cannot do is the defect that rule exists to prevent.

- [ ] **Step 1: Wire the template.** The app owns the `deviceId`: the block keeps the value in its state, sets `voice-device-id` from it, and updates it from `@kai-device-change`; `voice-preview` is on. For this block the value is in memory, and the plan says so rather than implying persistence the kit does not have (§9, §12.2).
- [ ] **Step 2: Add the guide's turn.** Recording, transcription, the five events, the preview opt-in, and choosing a device — with a fence that names the props.
- [ ] **Step 3: Gate.** `pnpm --filter @kitn.ai/ui run verify:guide-fences` (this is the gate that de-restricts), `verify:blocks`, driver states + baselines, screenshots re-recorded and noise-only diffs reverted.
- [ ] **Step 4: Commit.**

**Acceptance:** the fence compiles, and the guide's prose no longer promises less than the kit does.

---

### Task 8: The fake-device probe — the only thing that can open a microphone

**Files:**
- Create: `packages/ui/scripts/probe-voice-device-preview.mjs` (the `probe-*` pattern: a real chromium via `probe-browser-launch-args.mjs`'s launcher)
- Modify: `packages/ui/scripts/block-driver/states.mjs`-adjacent baselines as the block states move

**Asserts, per §10:** chromium accepts `--use-fake-ui-for-media-stream` (auto-grant) and `--use-fake-device-for-media-stream` (a synthetic tone), so — opening the menu with `preview` produces a **non-zero level**; with `preview: false` produces none and calls no `getUserMedia`; recording captures audio; and **no stream survives the menu closing** (assert on `navigator.mediaDevices` call count plus the track count).

- [ ] **Step 1: Write the probe**, capturing output to a file. **If it hangs, `ps` first** — a headless chromium that never exits is usually the one already running.
- [ ] **Step 2: Run it and record the probe's own output as the evidence** in the task's commit message or the block driver's baselines, never as a copied number in a doc.
- [ ] **Step 3: Commit.**

**Acceptance:** the probe prints the four assertions and fails if the preview is enabled by default or if a stream outlives the menu.

---

## Self-review

**Spec coverage.** §3's four pieces → Tasks 2, 3, 4, 5. §3.1's single stream → Task 5 (call count) and Task 6 (composer hands nothing else over). §4's list/labels/`devicechange`/disappearance → Task 2 for the primitive, Tasks 4 and 5 for the two states and the two reactions. §5's opt-in → Tasks 5 and 6. §6's mic-as-stop-with-level → Task 6. §7's live text → Task 1 (arithmetic + supply contract), Task 6 (wiring), Task 7 (what the guide may say). §8's surface → Tasks 3–6, with the generated artifacts proved end-to-end in Task 3. §10's testing → Tasks 1–5 (unit) and Task 8 (the browser probe). §11's template → Task 7. §12's rulings → all preserved: preview on the control (Task 5's prop, Task 6's pass-through), app owns the device (Task 7), live text at the caret (Task 6), mic carries the level (Task 6), placeholder labels (Task 4), dropdown primitives not `<kai-menu>` (Task 4), one stream (Task 5).

**Where the spec's sequence was wrong, and why the plan orders differently:**
1. **§7's supply had no step at all**, and §13 assumed it. Task 1 is new.
2. **§13.2 is one step for a two-part job**, and the generated registry is the risky end. Task 3 proves the registry before Task 4 builds behaviour on it.
3. **§13.5 defers the block's wiring, which cannot be deferred past §13.4.** The composer placing the control turns the block's unnamed `<kai-voice-input>` into a second capture stream — the exact failure §3.1 exists to prevent. The block's migration therefore rides in Task 6; §13.5 keeps only the template props, the guide turn and the story/probe.
4. §13.1 and §13.3 are correct in order and are kept as Tasks 2 and 5.

**Three things traced that read differently from the spec:**
- **§8.3's "two hand-written additions" is half wrong.** The non-scalar list is generated from `web-component-meta.json`'s derived `scalar` bit (`scripts/gen-web-component-nonscalar.mjs`); the hand-written additions are the registration import and the story.
- **§7's dependency on interim is a wiring gap, not a capability gap.** Native-path partials exist and fire today (`use-speech-recognition.ts:92,96-106`; the element's `kai-transcript-interim`). What is missing is a consumer: the composer has no control, and the block never sets `interim`.
- **§11's snippet shows `<kai-chat voice voice-preview voice-device-id>`, but the block composes `<kai-prompt-input voice>`** with its own recorder beside it (`assistant.html:744-770`). §8.1 already lists both elements, so the plan names `kai-prompt-input`/`DefaultPromptInput` as the block's actual seam.

**Left for the owner, and stated rather than decided here:** the guide's Add voice turn will want a sentence about which browsers give live text (native recognition) and which get one commit at the end. The kit can state the fact; which way the template's copy leans is the owner's.
