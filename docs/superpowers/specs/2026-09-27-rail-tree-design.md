# The rail as a tree — design (2026-09-27)

> **Spec 5.** Spec 4 is the empty state and its guides. This one is the sidebar the
> conversations live in. Small, because the owner's ruling is that it is **composition**:
> the components exist, and the work is arranging them.

## 1. Purpose

The owner's ask, with a reference screenshot of the shape:

> we should add this as part of our chat convo sidebar … you will see there is Project, recent
> (convos), under the folders that are expanded those each recent convos … we have a tree
> component so we have everything needed to do this … I would like it to be part of this
> default block

And the ruling that settles the architecture:

> We have components to be able to do all this so its really just a matter of composing and
> implementing

**So: no new kit component.** The rail is the block's own composition, built from parts the
kit already ships.

## 2. What the reference shows, region by region

1. **A flat top group** — `New chat`, then the developer's own items.
2. **A `Projects` section label**, then **collapsible folders**, each holding its
   conversations as indented rows, with a muted **`Show more`** row when a folder runs long.
3. **A `Recents` section label**, then flat conversation rows, **with the active one
   highlighted**.

## 3. What we already have, so the spec is composition and not invention

| part | where it is |
|---|---|
| the conversation row, with its `leading` / `meta` / `menu` regions and its own tabbable body | `components/conversation/conversation-item.tsx` |
| the row's menu (rename, delete, pin) and the search box | the block's rail state and markup |
| disclosure — an expand/collapse control with the keyboard contract | `components/collapsible/` |
| navigation regions | `components/nav/` |
| the active-row highlight | the row's own `active` prop |

**Not the file tree.** The kit's tree is `kai-file-tree`: a **path-based file explorer** with
per-row change counts and a `{ path }` selection event. No Lab app's rail groups conversations
today — checked, not assumed — so this is new composition rather than a port, and the file
tree's vocabulary is the wrong one for a conversation.

## 4. The shape to build

- **The top group** keeps `New chat` where it is and lets a developer add their own items.
- **Folders** are disclosure controls whose children are the same conversation rows the rail
  renders today, indented one step. **A folder's open state is the block's state**, not the
  DOM's, so `Show more` and a search that expands a folder are the same mechanism.
- **`Show more`** appears when a folder holds more rows than the rail shows, and reveals the
  rest. It is a muted row, not a conversation row, and it must not be reachable by the row
  keyboard contract.
- **`Recents`** is the ungrouped remainder, ordered by recency, with the active conversation
  highlighted by the row's own `active` prop — which the rail already sets.

## 5. The decisions that make it work with what is already there

1. **A conversation gains a group.** The grouping is the rail's to derive from what the
   conversation already carries — a `group` (or `project`) field on the summary — rather than a
   second parallel list. **Derive the sections from the rows; never keep two orderings.**
2. **Pinning keeps working, and stays per-folder.** A pinned conversation sorts first **within
   its own folder**, which is the ordering rule the rail already applies, and `Recents` stays
   purely recency-ordered. Pinning does not lift a conversation out of its folder.
3. **Search spans every folder and reveals its matches.** A query that matches a collapsed
   folder's child opens that folder for the duration of the search, because a match the reader
   cannot see is a match that does not exist. **The filters and the folder state are one
   mechanism, not two.**
4. **The row keyboard contract is unchanged.** Folders are the disclosure controls; rows keep
   the roving focus and activation they already have. `Show more` sits outside that contract.
5. **A folder with one conversation still renders as a folder**, because the shape is the
   developer's information architecture and not a count.

## 6. Non-goals

- **A new kit tree component.** Ruled out by the owner; revisit only if a second surface wants
  a real tree, and then by generalizing from a caller rather than in the abstract.
- **Drag and drop between folders.** Not asked for.
- **Nested folders beyond one level.** The reference shows one; a second level is a different
  conversation about information architecture.

## 7. Testing

- **Driver states**: a folder collapsed and expanded; the active row; `Show more` revealing the
  rest; a search that matches inside a collapsed folder and opens it.
- **A browser measurement for the indentation**, since the whole point is a visual hierarchy and
  jsdom measures nothing — the probe pattern this branch now has.
- **The empty and one-conversation cases**, because a rail that looks right with twenty
  conversations and broken with one is the usual outcome of getting the sections' spacing only
  approximately right.

## 8. Decisions of record

| # | Ruling |
|---|---|
| 8.1 | **Composition, not a new component** (owner). The rail is the block's, built from the kit's `collapsible`, `nav` and the row that already carries the menu, search and pinning. |
| 8.2 | **Not the file tree.** `kai-file-tree` is path-based with file-shaped rows and events; using it for conversations would put a second vocabulary on a component built for another one. |
| 8.3 | **Grouping is derived from the rows**, one ordering, never two. |
| 8.4 | **Pinning stays per-folder**; `Recents` is recency. |
| 8.5 | **Search reveals its matches** by opening the folder it found them in. |

## CORRECTION — how the folders are composed (task 2's shape)

An earlier draft of this spec, and the plan's task 2, said the folders would be "the kit's collapsible around the conversation rows". **That shape is not expressible, and the implementing round was right to stop rather than build it.** Two measured reasons:

1. **There is no page-level disclosure.** The collapsible is a Solid component with no element facade, so a folder in the block's page grammar could only be a native `details`/`summary` — not the kit's control.
2. **Wrapping a row re-homes it.** The conversations element takes its rows as direct children, and an item wrapped in anything becomes *standalone* by its own documented rule: it renders its own `tabindex`, fires its own select event, and gets no active state from the container. Every row would become its own tab stop and arrow traversal would be gone. That contradicts this spec's own §8.5 decision of record.

**The correct shape, and it needs no kit change:** the element **already renders collapsible groups itself.** It takes a `groups` array, buckets the conversations it is given by their `groupId`, and uses the collapsible inside its own shadow root. So the folder never wraps a page-level row — the element loops its own rows, the direct-child rule holds, and every row keeps the roving focus and activation it has today.

**What the block therefore does:** pass the projects as `groups`, stamp `groupId` onto each row at the page boundary (a mapping, not a kit change), and drive the selection the way the element already expects.

**Open residue, to be reported before any further shape is chosen:** whether a per-group display limit exists for `Show more`; what the bucket of conversations with no group is labelled and where it sorts; and whether a group's open state can be driven and observed from the page — the two cases that need it being the active conversation's folder open on arrival, and a search opening the folder it matched in.
