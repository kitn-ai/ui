# The rail primitive — publishing the mechanism so the arrangement is the app's

**Status:** approved, not started. Queued after the command-palette work.

**2026-09-29:** the mechanism had shipped (`createRovingTabList` in `@kitn.ai/ui`, `createConversationItemsController` in `@kitn.ai/ui/solid`), so the claims below that it is not exported are stale. Nested rows moved to [2026-09-29-D](2026-09-29-D-conversation-rail-design.md).

## The question that produced this

Is the conversation list going to keep causing problems because it is a *configuration* of a fixed arrangement rather than a set of parts a developer can *compose*? Will it be stale in a month, and will we end up maintaining versions 1, 2 and 3 of it for the different things applications apply to it?

## What is actually true today, measured

- **The rows are already composable.** `ConversationList`, `ConversationItem` and `SlottedConversationItem` are public exports, and the element's item mode lets a consumer render its own rows. This block does exactly that.
- **The roving keyboard contract is locked inside the component.** `createConversationItemsController` — the thing that gives a list one tab stop and arrow traversal across its rows — **is not exported**. It lives in `components/conversation/conversation-list.tsx`, reachable only through the element.
- So a developer who wants a different arrangement has two options: keep our sidebar, or rebuild the keyboard behaviour. **The expensive, hard-to-get-right part is the part that is not available**, which is why the component is sticky and why a list of complaints keeps arriving at it.
- The element also bundles an **arrangement**: a title bar, an empty state, a search box, a new-chat action. Arrangements are what go stale. (Those are already slot-overridable, which is why this is a small problem rather than a large one.)

## The decision

**Publish the mechanism. Keep the element as the convenience arrangement built on it. Do not rewrite, do not fork, do not version.**

1. **Export the rail's mechanism as a primitive** — the items controller that owns focus, traversal and activation. The row components already are public; this closes the gap.
2. **The element keeps using it internally**, so every existing consumer is unaffected and the two cannot drift.
3. **The arrangement stays in the application.** A new sidebar idea becomes an application change, not a component release, which is what removes the versioning fear rather than merely postponing it.

## The rule this establishes

**The kit owns how a row and its keyboard work. The application owns where things sit and what happens on hover.**

The test for each future request:

- a new **look** → the application (this block is the reference arrangement);
- new **behaviour** → the kit;
- the **same behaviour in a new arrangement** → that is the primitive, and it should exist exactly once.

## Acceptance

- The primitive is typed, documented, storied, and carries the same keyboard assertions the element's own states already measure — one tab stop, full arrow traversal, Home/End, and activation.
- **This block is the proof it is usable**: either its rail composes on the primitive, or its report states precisely why the arrangement element still fits better. "It works for us" is not acceptance if the primitive was never exercised.
- The element's behaviour and its keyboard states are unchanged, byte for byte, where they are already pinned.
- No removal or renaming of existing public API.

## Non-goals

- No rewrite of the conversation list.
- No new arrangement shipped into the kit.
- No change to the data-mode/item-mode split, which is a genuine constraint rather than an accident: the element cannot both render its own rows and receive a consumer's rows, so a consumer that wants headings between rows uses item mode — as this block does.

## Retrospective, recorded so it is not re-learned

**The mechanism should have been the primitive from the start, with the arrangement bundled on top of it.** The friction is not the number of props; it is that the durable part (behaviour) and the perishable part (arrangement) shipped in one promise.
