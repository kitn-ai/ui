# Guide conversations — design (2026-09-26)

> **Spec 3 of 3.** Spec 1 is the composer's states and tools menu; spec 2 is voice and
> microphone selection. This one is content rather than components: what the assistant
> block's seed conversations are FOR.

## 1. Purpose, and the binding intent

The owner's words:

> What might be cool for some of the convos that may exist as part of the defaults (and
> this could be true even within our block) are conversations on: Getting started · How to
> hook up voice · How to hook up this block with a service like OpenRouter or something
> else. Maybe some conversations that work as guides could be pretty interesting and cool.
> Something that we could offer that maybe other libraries can't.

> Our audience is developers so I would assume that, for conversations and related content,
> we can focus on TypeScript examples. It's definitely dev-facing.

The idea in one line: **the demo content teaches.** A developer installing the block opens
it, and the seed conversations are not filler ("How do I center a div?") but guides to the
thing they just installed — each one written in the vocabulary of the kit, so reading it and
copying from it are the same act.

That is the differentiator: a component library's demo shows you what a component looks
like, and its docs tell you separately how to use it. Here the two are the same artifact,
and the artifact is the one the developer is already looking at.

## 2. Audience, placement, and what replaces them

**Audience: developers evaluating and adopting the block.** Not the end users of the app
they build — and that distinction is load-bearing, because "How to hook up voice" is
nonsense to a chat user. It decides everything below.

**They live in the mock transport's seed conversations.** The block already ships three
transports behind one seam (`modeTarget: assistant.transport.ts`, with
`mock` / `real` / `none`), and a fresh install gets `mock`. So the guides are exactly what
disappears when a developer wires a gateway — the mechanism the owner described, already
built, and this spec adds nothing to it.

**The set is SHARED BY EVERY BLOCK, not authored per block.** The owner: *"These might be
conversations that could be applied to all of the blocks, so the same conversations,
regardless of which block you choose, just so we don't have to worry about coming up with
different conversations for each one."*

That is one more artifact than it looks, and it is the better one:

- **One source, imported by every block's mock transport**: a dependency-free module in
  `packages/blocks/src/` exporting the seed conversations, following the rule that package
  already lives by (it depends on nothing — not the kit, not zod, not `node:*`). Duplicated
  text per block is the drift this repo bans everywhere else, and it would multiply the rot
  guard's surface by the number of blocks.
- **The guides are therefore written about the KIT, never about a block's files.** A guide
  saying "this block wires `assistant.transport.ts`" is wrong the moment it appears in the
  support widget. Naming the mechanism instead of a path makes the content correct in every
  block AND removes the fastest-rotting thing in it — a file path that moves.
- **The fence gate of §4 covers every block at once**, because it reads one file. That is the
  strongest reason to share: the guard's cost is paid once rather than per block.

**They appear in the rail as conversations**, because that is how a developer browses the
block: click a conversation, read a turn, copy the fence. The home screen is the entry
point to the same set.

**What the developer does with them**: replaces them with their own onboarding (their
audience, their features) or deletes them. The block is a starting point, not a finished
product, and these are the most obviously-replaced content in it.

## 3. The set

One conversation per thing a developer has to wire, ordered as they meet it. Each is a
short scripted turn — two or three exchanges — and each names the real API in a TypeScript
fence:

| conversation | teaches | kit surface it names |
|---|---|---|
| **Getting started** | what the block is, what the three modes are, where the seam is | `assistant.transport.ts`, the mode switch |
| **Wire a model** | pointing it at OpenRouter or Anthropic | `readOpenAIStream` / `readAnthropicStream`, `toOpenAIMessages` |
| **Voice input** | recording, transcription, and choosing a device | `<kai-voice-input>`, `deviceId`, the preview opt-in (spec 2) |
| **Compose a message** | what the composer can hold | `MessagePart`, staged attachments, the `tools` tree (spec 1) |
| **Cards and tools** | what a turn can contain beyond text | `cardTypes` / `cardSchemas`, tool parts, citations |

**The list is a proposal, not a fixture.** Two rules keep it from bloating: a conversation
exists only if there is something real to wire, and each one must be short enough to read in
the rail's preview.

## 4. The rot guard — the part that makes this safe to ship

Guide content is documentation, and this repo has spent a whole run on documentation that
lies: a story documenting a prop we had removed, a docs example rendering a composer with no
Globe button, a block comment describing a microphone position we had already changed, and a
plan instructing a generator that writes a different file. **A guide naming an API is a new
surface with the same failure mode**, and it is worse than the others because the reader is
a developer who will copy the fence into their app.

TypeScript examples make this solvable rather than merely manageable, and the repo already
has the pattern: `verify:scaffold` extracts emitted code from string literals and compiles
it with real tsc, across three tsconfig projects. So:

**The fences are extracted and type-checked by a gate.** A test reads the guide content,
pulls every ```ts fence, writes them to real modules, and compiles them against the kit's
published types — the same shape as the scaffold gate, for the same reason. A removed prop,
a renamed event, a changed signature: the guide stops compiling and CI says which
conversation and which line.

Consequences worth stating, because they constrain how the guides are written:

- **A fence must be real code, not pseudocode, and "compiles" has to mean something a guide can actually satisfy.** The first version of this rule said a fence must compile as written, and the guides disproved it: **every one of the fourteen names something from its host** (`messages`, `transport`, `voice`, `pendingCalls`, `stream`, or a relative import of the block's own controller). A rule no fence can meet is not a strict rule, it is an unmet one.
  What replaces it: **each guide compiles inside a declared context.** A short prelude per guide declares the host names that guide's fences reference — marked as the block's own variables, so the prelude is visibly not the kit's API — and the fences are then compiled **in order**, so a turn may use what an earlier turn in the same guide declared. Everything a fence claims about the KIT is checked by that; nothing is checked about names the prelude declares, which is the honest boundary: those are the host's, and the guide says so.
  A fragment still carries its excerpt marker, and its API still repeats in a compiled fence in the same guide. **One exception is accepted and named rather than forced:** `createAssistantStream` in *Get it running* has no second mention in that guide, so its claim is verified by the prelude-compiled fence it already sits in rather than by a repetition.
- **The guides may not promise behaviour the kit does not have.** The gate covers types; the
  prose is checked the way every other doc in this repo is (`verify:docs`, the copy style in
  `STYLE.md`), and a claim about a mode or a default that is wrong is a defect like any
  other.
- **The gate is what lets the guides be concrete.** Without it the safe choice is conceptual
  prose ("a transport reads a stream"), which teaches least; with it, the guides can show the
  actual call.

## 5. What the guides do in the message model

They are ordinary turns, which is the point: a guide that explains cards should CONTAIN a
card, and one that explains tools should contain a tool part. So the guide set is also the
block's demonstration of the `MessagePart` vocabulary — the six variants `text`,
`reasoning`, `tool`, `card`, `source`, `file` — which spec 1's plan already requires the
mock to cover (Task 9's Step 1b). The two requirements are the same requirement, and the
guides are the natural place for it: a fixture dump demonstrates nothing, a guide that says
"here is what a citation looks like" and shows one demonstrates both the shape and its use.

**Derive the coverage list from the union in `chat-types.ts`**, never from a list written
here, so a seventh variant makes the gap visible.

## 6. Non-goals

- **End-user onboarding.** Different audience, different content, and the developer's to
  write. An earlier draft carried a single worked example of it; the shared
  set rules that out, because a conversation written for end users cannot be correct in every
  block, which is the property the shared set exists for.
- **Replacing the docs site.** The guides are a doorway into the kit, not its reference; the
  docs remain the place to look things up, and a guide links to them rather than restating
  them at length.
- **Per-block conversations.** The block-specific material already exists — the assistant's
  scripted turn, the support widget's tickets — and stays where it is. The guides are an
  ADDITIONAL shared set, not a replacement for a block's own flavour.
- **Interactivity.** A guide is a conversation a developer reads and copies, not a wizard.
  Where a guide can act (a tool that opens the docs), it may, but nothing here requires it.

## 7. Testing

- **The fence gate** of §4, which is the reason this design is safe: extract and compile.
- **The vocabulary coverage** of §5, derived from the `MessagePart` union, asserted rather
  than described.
- **The copy bar**: the guides go through the same review the docs do; this repo has a
  reviewer for exactly that, and a guide is prose a developer reads closely.
- **Not covered, and said so:** whether the guides are any good at teaching. That is a
  judgement the owner makes by reading them in the rail, which is why they ship as
  conversations rather than as a docs page.

## 8. Sequencing (proposal)

1. The conversation content itself, in the block's mock transport, with the fences written
   as compiling TypeScript from the start.
2. The extraction gate, so the fences are checked from the first commit rather than
   retro-fitted.
3. The rail/home wiring, if the seeds are not already what the rail shows.
4. The `MessagePart` coverage folded in, since the guides are where it belongs.

## 9. Decisions of record

| # | Ruling |
|---|---|
| 9.1 | **Audience: developers** (owner). Dev-facing content, and it lives in the mock transport, which is what a wired gateway replaces. |
| 9.2 | **TypeScript-first** (owner). The fences are real code, and §4's gate is what makes that safe rather than reckless. |
| 9.3 | **The guides double as the `MessagePart` demonstration**, so a guide about cards contains a card. Two requirements, one artifact — and the fixtures-that-teach-nothing are avoided. |
| 9.4 | **The rot guard is extraction + compilation, not conceptual-only prose** (controller). Conceptual prose is always honest and teaches least; the repo already compiles emitted strings for exactly this class of problem, so the guides can be concrete. |
| 9.5 | **This is spec 3, planned separately from the composer work.** It is content with a copy bar and a maintenance story, and none of the composer work depends on it. |
| 9.7 | **The seed and the block's welcome state are in CONFLICT, and that is this spec's problem to solve, not a detail.** Task 9 tried to implement the owner's "mock conversations in place" and reverted it in full, with the evidence: seeding a conversation into the store on boot makes it the rail's first row (the store orders pinned-first then recency, and `save` takes no timestamp), so block-driver states 5, 9, 10, 12 and 13 address the wrong row, state 10 renames the seed instead of its own conversation, and states 1-2 lose the empty thread with its suggestions. Both shapes were tried — thread seeded (3 states broke) and rail seeded with the thread left empty (6 broke) — and nothing was left half-done. So the FIRST-RUN EXPERIENCE is an open decision this spec must make deliberately: the product's onboarding (an empty thread with suggestions) and the developer's guide set are two different first runs, and only one of them can be first. The six states are rewritten as part of whichever is chosen. |
| 9.6 | **One shared set, every block** (owner). A dependency-free module in the blocks package, imported by each block's mock transport. Two consequences are requirements rather than preferences: the guides name the KIT's mechanism and never a block's file paths, and the fence gate reads one file and therefore covers every block at once. |
