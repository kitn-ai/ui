# Voice input and microphone selection — design (2026-09-26)

> **Spec 2 of 2.** The composer's layouts, the `+` tools menu and the chip row are
> spec 1 (`2026-09-26-composer-states-and-tools-menu-design.md`); this document is
> the voice subsystem. Spec 1 moves the microphone to the trailing cluster and
> deliberately does not wire it. This spec wires it.

## 1. Purpose, and the binding intent

The owner's ask, and the reference behind it: Claude Code's composer has a microphone
whose menu lists the available inputs, checks the current one, and shows a live level
at the top so you can see you are hooked up correctly before you speak.

> I really like that feature, and they even have it at the top of their menu item so
> that when you're talking you can see a little indicator so you know you're hooking
> up to it correctly.

The pieces should also stand alone:

> it should be on the voice control, so it can be used independently from composer.
> they should be able to work without each other, composer is using this component,
> not the other way around

That sentence is the architectural constraint for this whole document. Where a
decision could be made in the composer or in the voice control, it is made in the
voice control, and the composer only forwards.

## 2. What already exists (inventoried, not assumed)

| piece | state |
|---|---|
| `primitives/use-voice-recorder.ts` | `getUserMedia({ audio: true })` → `MediaRecorder` → Blob. `{ isRecording, error, stream, start, stop }`. **No `deviceId` anywhere in the kit.** |
| `web-components/voice-input/voice-input.tsx` | `<kai-voice-input>`: a mic button that records and transcribes, via a host-supplied `transcribe` or the browser's `SpeechRecognition`. Events: `kai-audio-captured`, `kai-transcription`, `kai-transcript-interim`, `kai-recording-change`, `kai-voice-error`. Methods `start()`/`stop()` for push-to-talk. |
| `components/voice/voice-input.tsx` | the component that element wraps; `hasTranscribe`, `lang`, `interim`, `onInterim`, `onRecordingChange`, `controllerRef`. |
| `primitives/use-audio-analysis.ts` | `useAudioAnalysis(source: () => MediaStream \| HTMLMediaElement \| undefined, options)` → `{ bands, volume }`, with a documented noise gate and an opt-in wide window for raw input. **Takes any stream**, so it can analyse a preview as well as a recording. |
| `components/audio-visualizer/` | the themed visualizer, already driven by the above. |
| `composer` (spec 1) | the mic sits in the trailing cluster, fires `kai-voice`, and does nothing else. |

So the recording, the transcription, the interim results and the level analysis all
exist. What is missing is: **device enumeration, a `deviceId`, honest labels, and the
menu that ties them together.**

## 3. The pieces, and where each boundary falls

Four pieces, smallest first:

1. **`listAudioInputs()`** — a primitive. Enumerates audio *inputs*, reports the
   list, answers "are the labels real yet", and refreshes on `devicechange`.
   Knows nothing about UI.
2. **`useVoiceRecorder`** gains **`deviceId`**, so a recording can be pinned to a
   device. It stays the only thing that opens a capture stream for recording.
3. **The device menu** — its own component and its own element. Renders the level
   row and the device list; emits a selection. Usable beside any recorder, not only
   ours.
4. **The voice control** — `<kai-voice-input>`. Owns the device *list*, the preview
   stream, and the recording. Composes the menu by default. **Takes `deviceId` as a
   controlled prop** and reports changes; it does not remember anything.

The composer's part is to place the control and to write the transcript into its own
field. It owns no device state, no stream and no permission.

### 3.1 One stream, one owner

The control holds **at most one capture stream**, and its consumer switches:

```
menu open + preview opted in   → stream serves the level meter
recording                      → the SAME stream serves the recorder
neither                        → no stream, tracks stopped
```

Two `getUserMedia` calls on one device is the failure this exists to prevent: it is
wasteful, on some platforms it fails outright, and on others it gives the user two
microphone indicators for one intent.

**The hand-off, stated because it is where an implementer would otherwise invent a
contract.** `useVoiceRecorder` gains a `stream` input alongside `deviceId`: given a
`stream` it uses that and does not acquire its own, given only a `deviceId` it
acquires as it does today, and given both **the stream wins**. `start()` still
returns a Promise<Blob> either way. That keeps the standalone recorder working
exactly as it does now while letting the control hand it the stream the menu was
already metering. Ownership of the tracks stays with whoever acquired them, and the
control is the only thing that stops them.

## 4. The device list

- `enumerateDevices()` splits inputs from outputs and keeps `audioinput`.
- **Labels are empty until the page has microphone permission** — that is the
  platform's rule, not ours. The menu therefore shows positional names
  ("Microphone 1", "Microphone 2") until permission exists, and **never opens a
  stream just to learn a label**: activating a microphone to render a nicer string is
  the surprise this design exists to avoid.
- **The list is re-read after a successful `getUserMedia`**, because that is when
  labels become available and the platform does **not** always fire `devicechange`
  for it. One `devicechange` listener keeps it current for plugging and unplugging.
- A device that has disappeared is dropped from the list. What happens next depends on
  whether anything was live, because conflating the two is how a recording stops
  without anyone being told:
  - **idle:** the list event carries the new list and nothing else. The app owns
    `deviceId`, so reacting is its call (§12.2), and the control simply records from
    the system default on the next acquire rather than failing with no explanation.
  - **recording:** the track ends, so `kai-voice-error` fires. A recording that stops
    by itself is exactly the silent drop this kit forbids, so it is never merely
    reflected in a list.

## 5. The preview, and the opt-in

**The owner's ruling: the opt-in lives on the voice control, not the composer.**
Whether opening a menu activates a microphone is the kind of decision that lands in a
privacy policy rather than in a component's contract, so the kit ships the mechanism
and defaults to **not capturing**:

- `preview: false` (the default) — the menu renders the device list and no level row.
- `preview: true` — while the menu is **open**, the control holds a stream for the
  selected device and the menu shows a live level at the top. The stream is released
  the moment the menu closes, and is re-used rather than re-opened if recording starts
  while it is live.

A host that wants Claude's behaviour sets one prop; a host that does not gets no
microphone activation from a menu it did not ask for. Both are visible in the
element's prop table, so the default is discoverable rather than hidden.

**When permission is refused**, `getUserMedia` rejects and the control reports
`kai-voice-error` with the platform's own error — loudly, never by silently rendering
an empty level row. The control stays usable: permission can be granted later, and
the next explicit attempt re-asks through the browser in the normal way. The kit never
prompts on its own initiative, which is the whole point of §5's opt-in.

## 6. What recording looks like

**The mic becomes a stop control carrying the live level** (owner's choice). The field
carries the words — live, per §7 — and the button carries the proof that the
microphone is live, which is the one thing text cannot tell you: a recognizer that is
silent for two seconds is otherwise indistinguishable from a broken one.

The level comes from `useAudioAnalysis` on the **same** stream the recorder is using
(§3.1), so the meter and the recording cannot disagree. Click to start, click to stop;
`start()`/`stop()` stay on the element for push-to-talk hosts. Not a waveform strip
taking over the control row: that is a bigger commitment, it hides the `+` menu and
Send for the duration, and it is not what the kit should default to.

**Device selection is closed while recording.** Switching input mid-recording would
mean tearing down and re-acquiring the stream under a live `MediaRecorder`, so the
menu's rows are disabled for the duration and a note row says why — which is what the
`note` item kind from spec 1 exists for. The alternative (stop, switch, re-record)
loses the user's audio without asking, and a menu row that looks available and does
nothing is the silent failure this kit forbids.

## 7. Where the spoken text lands

**Live in the field, revised as it speaks** (owner's choice): partial words appear at
the caret and are replaced as the recognizer firms them up; on stop the final
transcript stays. The transcript event fires either way, so an app that routes the
text somewhere else still can.

The mechanism, stated because it is the part that goes wrong quietly:

- The composer records the **range** it wrote, not just the text. Each interim result
  replaces that range; the final result commits it.
- **An external edit commits the run.** If the value changes by anything other than
  the interim write — the user types, or the host sets `value` — the range no longer
  describes anything, so the control stops replacing and the next interim starts a
  fresh run at the caret. The partial text already in the field stays as ordinary
  text. This is the honest behaviour: guessing which half of a draft to overwrite is
  worse than leaving the user's words alone.
- Interim writes go through the composer's existing `value`/`onValueChange` contract,
  so a controlled host sees each revision. That is the price of live text and it is
  worth naming: an app that persists on every `onValueChange` will persist partials.
- **This depends on interim results being available.** The composer asks the control
  for them; where the platform or the host's `transcribe` supplies only a final
  transcript, §7 degrades to one commit at the end and everything else holds. That
  degradation is expected, not a fault, and nothing should render as though live text
  were promised.

## 8. The public surface

### 8.1 Props

| Where | Prop | Notes |
|---|---|---|
| `<kai-voice-input>` / `VoiceInput` | `deviceId?: string` | **Controlled.** Absent or empty = the system default. Attribute `device-id`. |
| `<kai-voice-input>` / `VoiceInput` | `preview?: boolean` | The §5 opt-in. Attribute `preview`. |
| `<kai-voice-device-menu>` / `VoiceDeviceMenu` | `devices?: { deviceId, label }[]` | **JS property, never an attribute** — non-scalar, so it must be listed in `web-component-nonscalar.json`. |
| `<kai-voice-device-menu>` | `value?: string` | The selected `deviceId`, controlled, so the menu can be used beside someone else's recorder. |
| `<kai-voice-device-menu>` | `level?: number` | 0–1, rendered as the top row. Absent = no row. |
| `DefaultPromptInput` / `ChatThread` / both elements | `voiceDeviceId?: string`, `voicePreview?: boolean` | **Pass-throughs**, so the composer can place a control it does not own. Documented as pass-throughs, because the behaviour lives in §5. |

### 8.2 Events

| Event | Detail | Fired by |
|---|---|---|
| `kai-device-change` | `{ deviceId }` | the menu when the user picks one; the control listens to the menu it composed and **re-emits** it, so an app listens in one place whether it used our menu or its own |
| `kai-devices-change` | `{ devices, labelled: boolean }` | the control, whenever the list is re-read — so an app that replaces our menu, or persists the choice, has the same information |
| existing | `kai-audio-captured`, `kai-transcription`, `kai-transcript-interim`, `kai-recording-change`, `kai-voice-error` | unchanged |

`labelled` is on the list event because "these names are placeholders until you grant
permission" is a fact the app needs to render honestly and cannot infer.

### 8.3 Generated artifacts

`tools`-style arrays are JS properties; the same is true of `devices`. The new
non-scalar entries, the regenerated `web-component-meta.json`, `.d.ts`, React wrappers
and `llms-full.txt` all come from `build:api`, and the two hand-written additions —
the non-scalar list entries and any new element registration — are named in the plan.

## 9. Non-goals

- **Voice output / TTS.** `<kai-voice-output>` exists and is untouched.
- **A waveform that takes over the composer.** §6 chose the smaller answer.
- **Persisting the device choice.** The kit has no storage and will not grow one; the
  app owns `deviceId` precisely so it can remember it (§12.2).
- **Server-side transcription.** The control emits a Blob and a transcript; what
  happens between them is the host's `transcribe`, as it already is.
- **Wake words, continuous listening, or background capture.** Every stream in this
  design exists because a user asked for something in the moment.

## 10. Testing

- **Unit:** `listAudioInputs` against a stubbed `enumerateDevices` (empty labels,
  labels after permission, a device disappearing, output devices filtered out); the
  menu's states (no devices, permission not yet granted, a selected device that is not
  in the list); and the interim-run arithmetic as a **pure function** —
  `applyInterim(value, range, text) → { value, range }` — covering the revision, the
  commit, and the external-edit case from §7. That last one is the part that would
  otherwise be discovered in production.
- **A real-browser probe**, because none of the above can open a microphone:
  chromium accepts `--use-fake-ui-for-media-stream` (auto-grant) and
  `--use-fake-device-for-media-stream` (a synthetic tone), so a probe can assert that
  opening the menu with `preview` produces a **non-zero level** while `preview: false`
  produces none, that recording captures audio, and that no stream survives the menu
  closing. This is the same pattern as the existing `probe-*` scripts.
- **Not covered, and said so:** transcription quality, and any real device
  enumeration beyond one fake input. Those are the platform's, not ours.

## 11. What the template uses

The assistant block turns the microphone on and opts into the preview, so the
template ships the feature the owner reacted to:

```
<kai-chat voice voice-preview voice-device-id="…">
```

with the app owning the `deviceId` value (its own storage) and updating it from
`kai-device-change`. That is the whole wiring: a prop, an event, and whatever the app
does with the choice.

## 12. Decisions of record

| # | Ruling |
|---|---|
| 12.1 | **The preview opt-in is a property of the voice control, not the composer** (owner), because whether a menu activates a microphone is a policy decision, and because the pieces must work independently. |
| 12.2 | **The app owns the selected device** (owner, on the recommendation): `deviceId` is controlled, the control reports `kai-device-change`, and the menu is its own piece. The cost is that the zero-config case becomes one prop; the alternative silently resets the choice on every reload, which is worse than not offering it. |
| 12.3 | **Spoken text lands live in the field** (owner, option 1), with the interim range tracked explicitly and an external edit committing the run (§7). |
| 12.4 | **Recording state is the mic button carrying the live level** (owner, option 1), not a waveform taking over the control row. |
| 12.5 | **Placeholder labels until permission exists** (controller, uncontested), because the alternative activates a microphone to learn a cosmetic string. |
| 12.6 | **The device menu is built on the dropdown primitives, not `<kai-menu>`.** A live meter row is an audio concept; putting it in the general menu's item vocabulary would make every menu carry a field only one caller reads. It reuses the positioning, focus and keyboard machinery, which is the part worth sharing. |
| 12.7 | **One capture stream, consumer-switched** (§3.1). Two `getUserMedia` calls for one intent is wasteful at best and fails outright on some platforms. |

## 13. Sequencing (proposal)

1. `listAudioInputs`, plus `stream` and `deviceId` on the recorder, with their tests —
   no UI, shippable alone.
2. `VoiceDeviceMenu` against the dropdown primitives, with the level row and its
   states.
3. `preview` and the single-stream lifecycle on the voice control, plus
   `kai-devices-change`.
4. The composer: place the control, forward the two pass-through props, and write the
   interim run into the field.
5. The fake-device probe, the stories, and the block template's two props.
