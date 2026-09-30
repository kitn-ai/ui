# The empty state, and the guide it opens — design (2026-09-26)

> **Spec 4 of 4.** Spec 1 is the composer's states and tools menu, spec 2 is voice and
> device selection, spec 3 is the guide conversations (their content, and the gate that
> keeps them true). This one is the SURFACE that hosts them: what a developer sees before
> there is a conversation.

## 1. Purpose, and the two audiences inside one state

The empty state is the first thing anyone sees, and it does two jobs in one screen:

- **Cards** open a DEVELOPER guide — what this block is and how to wire it. Audience: the
  developer installing the block.
- **Suggestions** start a PRODUCT demo — a plausible question the assistant answers.
  Audience: whoever the developer's app is for, and the developer evaluating the demo.

That split is the owner's own, and it is why the two render differently and read
differently. Everything below follows from keeping them visibly distinct.

The owner's words: *"I would really like to have a proper empty state with some cards that
the user can click on to initiate a guide … maybe the suggestions section where we have
things like 'Summarize a document' are more question based."*

## 2. The layout, and the one bit of it that is a real fix

Three regions, top to bottom: the cards, the suggestions, and the composer below them.

**Vertical centring that degrades honestly.** When the state's content is shorter than the
space, it is centred; when it is taller, it is top-aligned and scrollable. That is ONE
mechanism, not two rules, and getting it wrong is a known trap:

- `justify-center` on a flex container with `overflow: auto` **clips the top** of its content
  the moment the content is taller than the box — the first card becomes unreachable.
- A centred **auto margin** on the content does both jobs: it centres while there is room,
  and the overflow-side margin collapses to zero when there is not, leaving the block
  scrollable from its top.

**Measured today, before the fix:** the kit's `Empty` is already
`flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg p-6`, and the
block's empty region renders it at **180px — exactly its content height** — inside a much
taller area, so `flex-1` is not resolving and the content sits at the top. Two changes, both
in the kit: the wrapping region must give the empty surface a definite height, and the
centring must move from `justify-center` to the auto margin.

## 3. The cards

Four, approved by the owner. Each opens a conversation (spec 3) — the assistant explains the
topic and shows real TypeScript, so a card is a doorway into a conversation, never a docs
page in a card's clothing.

| card | summary | opens |
|---|---|---|
| **Get it running** | Replace the scripted mock with your backend by swapping one file. | the transport seam and its three modes |
| **Wire a model** | Point the thread at OpenRouter, Anthropic, or your own route. | the stream readers and message encoders |
| **Add voice** | Record and transcribe speech, and the events that drive your UI. | recording, transcription, the five voice events |
| **Send a card** | Let a tool return a card the thread renders and reads back. | the `kai_` tool prefix, the card envelope, citations |

**The four are a path, not a menu of four equal options**: Get it running → Wire a model →
Add voice → Send a card is the order a developer actually meets them, and each guide's last
turn offers the next one (spec 3's `*Next:*` lines).

**Scope honesty, enforced by spec 3's gate:** *Add voice* covers recording, transcription and
the five events. Device selection and the microphone preview are spec 2 and are **not built**,
so no fence or sentence may name `deviceId` or `enumerateDevices` until they are. Its summary
says "and the events that drive your UI" rather than promising device choice, because a guide
that promises what the kit cannot do is the defect spec 3 exists to prevent.

**Rejected, with the reason each lost:** *Stage a file* (one prop's worth of ground, so its
guide runs out of conversation), *Keep the history* (teaches the kit's `store` prop, which
this block never sets), *Shape a turn* (overlaps Send a card and teaches a union with no
workflow), *Style the thread* (the composer's `+` menu demonstrates it live).

## 4. The suggestions

Four labels, rendered as **full-width rows** — the `PromptSuggestion` `block` variant, the
kit's own story `Components/Empty > Suggestions: List (block)` — rather than pills. The owner
picked that rendering, and it suits the content: these are questions, not chips.

| label | what a developer sees answered |
|---|---|
| `Summarize a document` | a tool call that settles, then a card asking permission to post it |
| `Make a task list` | a request turned into a checklist, then one item marked off |
| `Compare two options` | two options weighed, then the assistant commits to one |
| `Draft a short brief` | the assistant asks for the missing fields before writing |

Each exercises a DIFFERENT shape a host has to handle: a tool call that settles, a card that
expects an answer, a card that offers a pick, a card that takes input. That is the reason
these four and not four variations of one.

**Clicking one is a real question.** The assistant answers it as it would answer a user's,
which is what makes the demo a demo rather than a fixture dump.

## 5. Follow-ups after every turn

**Every SCRIPTED assistant turn offers the next thing to click** — the owner's YouTube-style pattern,
and the rule the storyboard encodes as a `*Next:*` line per turn. Two silences are worth stating
because the sentence above is narrower than "every turn": a thread whose opening matches no script
(nothing the reader typed) has no row in the table and offers no labels at all, and a turn past the
end of a script offers none either. A cross-link click starts a NEW conversation, so its turn is
turn 1 of the conversation it names and the labels resume there. The properties that make it
work rather than annoy:

- **The first entry is the conversation's own next step** (an arc's natural follow-on; a
  guide's next action; at the end of a guide, the next guide in the path).
- **Cross-links come last and only at the END.** Offering a different topic mid-thread breaks
  the thread the user is in.
- **A card's own answers are legitimate labels** (`Post` / `Edit first`, a `kai_choice` pick,
  a form's fields). This is also how a scripted arc handles the fact that it cannot branch: a
  card can ask, and the demo cannot wait for the answer, so the answers are offered as labels
  and the next turn acknowledges what it assumed.

**No kit change.** The transport already receives the whole thread
(`assistant.controller.ts:188`), so the prompt→arc lookup and the turn index live in the
block's transport. Putting that in the kit would be the wrong shape: **a script cycled per
turn is exactly what a zero-config mock should be.** (For `ChatThread` consumers the prop is
`persistSuggestions` — not this block's path, and worth knowing rather than needing.)

## 6. The developer must be able to replace it

The owner: *"I would like the dev to see how they can slot in their own custom empty state."*
So the kit ships an `empty` slot (it does), and this work adds **a story that projects a
replacement** — a developer's own title, their own content, their own suggestions — beside
the default. A slot nobody can see replaced is a slot nobody uses.

## 7. Non-goals

- **A kit-level suggestion engine.** The kit renders an array it is given. Which labels, when
  they change, and what a click means are the host's.
- **Cards as a kit component.** A card here is a button with a title and a summary; the
  block composes it from kit parts. A `Card`-specific empty-state API would be a second
  design system for one screen.
- **End-user onboarding.** The cards are developer guides (spec 3's audience ruling). A
  developer who wants their own users onboarded writes their own empty state — §6 is how they
  see that is possible.

## 8. Testing

- **The centring and the scroll are both geometry**, so they belong in a browser: the probe
  pattern this repo now has. Two cases — content shorter than the area is centred; content
  taller is top-aligned with no clipped first card, and the area scrolls. **The second is the
  one that must be asserted, because `justify-center` passes the first and fails the second.**
- **The block driver's states** cover the empty state's rendering; the follow-up rule adds a
  state where a conversation shows its `*Next:*` labels.
- **Spec 3's gate** covers the guides' fences, unchanged by this spec.
- **A story** for the custom empty state (§6) and one for the list-variant suggestions.

## 9. Decisions of record

| # | Ruling |
|---|---|
| 9.1 | **Cards are developer guides; suggestions are product demos** (owner). Two audiences, one screen, rendered differently on purpose. |
| 9.2 | **The four cards are approved as listed, and they are a PATH** — each guide's last turn offers the next. |
| 9.3 | **`Add voice` is scoped to what is built** (owner approved the corrected summary). Device selection arrives with spec 2, and the guide grows then. |
| 9.4 | **Suggestions render as the `block` list variant** (owner picked it from `Components/Empty > Suggestions: List (block)`). |
| 9.5 | **Every scripted turn offers the next thing to click**, with cross-links only at the end (owner's YouTube pattern; the storyboard encodes it per turn). A thread no script covers, and a turn past the end of one, offer nothing — the table has no row for them. |
| 9.6 | **The follow-up lookup lives in the block's transport, not the kit** — a script cycled per turn is what a zero-config mock is for. |
| 9.7 | **The centring is an auto margin, not `justify-center`** — the second passes the short-content case and clips the tall one, and the owner asked for exactly the degrading behaviour in one sentence. |
| 9.8 | **A story must show the empty state replaced** (owner: *"the dev … how they can slot in their own custom empty state"*). |
