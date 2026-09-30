# D — The conversation rail and the command trigger (2026-09-29)

Part of the [composition round](2026-09-29-composition-round-design.md); builds on
[A](2026-09-29-A-composition-contract-design.md). Owner decisions 4, 5 and 18:

> the converstion list is a bit outdated. if you look at what we were doing in blocks assistant…
> that is the the better approach and this even needs work… cool things we have such as command
> windows appearing for the search, and filters as well as the collapse button. but those can
> dispatch events and then it is up to the applciation to provide the different states… a
> command with a "trigger" component such as a button like this. common pattern in other react
> components like radix ui/shadcn ui.

The reference is the owner's screenshot of the parked assistant block's rail: a title with search
and collapse icons, top actions (New chat, Images, Scheduled, Plugins), a Projects section of
folders each holding conversations, and the active row highlighted.

## 1. What is true today (measured, and correcting an earlier spec)

- **The keyboard mechanism is already public.** `createRovingTabList` is exported from
  `@kitn.ai/ui` (`src/index.ts:49`), and `createConversationItemsController` from
  `@kitn.ai/ui/solid` (`src/solid.ts:192`). The 2026-09-27 `rail-primitive-design.md` says the
  controller "is not exported" and its status says "not started"; both are stale. D records that in
  the old spec rather than redoing the work.
- **Item mode is flat.** `kai-conversations` finds rows with
  `element.querySelectorAll(':scope > kai-conversation-item')`
  (`web-components/conversation/conversation-list.tsx:125`), so a row inside a folder is not a row:
  it gets no roving tab stop, no `aria-current`, no activation. That is why the block rebuilt the
  rail around the element instead of inside it.
- `kai-conversations` already has `header`, `empty` and `footer` slots and fires
  `kai-collapse-toggle`, `kai-search`, `kai-new-chat`, `kai-toggle-sidebar`,
  `kai-conversation-select`.
- `kai-command` (`items`, `placeholder`, `emptyLabel`; `kai-select`, `kai-query-change`;
  `focus()`/`clear()`) and `kai-dialog` (`open`, slots `header`/`footer`; `show()`/`hide()`/`toggle()`)
  exist. There is no web-component disclosure element; the Solid `components/collapsible/` is
  Solid-only.

## 2. Changes to the kit

1. **Nested rows in item mode.** Rows become every descendant `kai-conversation-item` of the
   element in document order, **excluding** any inside a closed `<details>` (checked with
   `closest('details')` up to the host). The container re-syncs on `toggle` events from `<details>`
   descendants as well as on child mutations. Arrow traversal therefore walks into an open folder
   and skips a closed one; Home/End and activation are unchanged. The folder's own `<summary>` is
   not a row: it keeps native keyboard behaviour (Enter/Space toggles). A `kai-conversation-item`
   inside another row's `menu` slot (a preview in a popover) is not a row either. Section labels and other
   non-row children stay inert, as `createRovingTabList` already guarantees.
2. **No new rail element and no `groups` growth.** The arrangement is the app's (the 2026-09-27
   rule: new look → the application, new behaviour → the kit). Folders are native `<details>`,
   which is accessible, animatable in CSS, and needs no kit code.
3. **The preset.** `conversations` / `groups` data mode keeps working, and `lint:preset-parts`
   (A §5) plus a parity test over one grouped fixture confirm it renders through public parts.

## 3. The patterns (the first members of the tier)

Each is a directory under `packages/blocks/patterns/<id>/` (A §7), a Storybook story under
`Patterns/…`, and a docs page under `/patterns/`, installable with `kai add <id>`. Plain HTML plus
at most one TypeScript file, 50–200 lines.

### 3.1 `conversation-rail`

The owner's screenshot, composed:

```html
<kai-conversations id="rail" active-id="c2">
  <div slot="header">
    <span class="title">Assistant</span>
    <kai-button id="search" icon="search" aria-label="Search chats" variant="ghost"></kai-button>
    <kai-button id="collapse" icon="panel-left" aria-label="Collapse sidebar" variant="ghost"></kai-button>
    <kai-row interactive id="new-chat"><kai-icon slot="leading" name="square-pen"></kai-icon>New chat</kai-row>
    <!-- Images, Scheduled, Plugins: the same row, the app's own actions -->
  </div>
  <p class="section">Projects</p>
  <details open>
    <summary><kai-icon name="folder-open"></kai-icon> Assistant UI</summary>
    <kai-conversation-item conversation-id="c1">Yours fetches your route…</kai-conversation-item>
  </details>
  <details open>
    <summary><kai-icon name="folder-open"></kai-icon> Kanban board</summary>
    <kai-conversation-item conversation-id="c2">Broke it into four.</kai-conversation-item>
  </details>
  <p class="section">Recents</p>
  <!-- flat kai-conversation-item rows -->
</kai-conversations>
```

The script (≈40 lines) listens for `kai-conversation-select`, the header buttons' clicks, and hands
each to the app: search opens the command trigger below, collapse fires the app's own layout
change (or `kai-workspace`'s aside toggle when the rail sits in one). Row menus use each
`kai-conversation-item`'s existing `menu` slot. Icons are from the kit's icon set; any name the
set lacks is added to `icon-names.json` with the icon, not faked.

### 3.2 `command-trigger`

Any button opens a command palette in a dialog; the app owns the list and what selection does.

```html
<kai-button id="open-search" icon="search" aria-label="Search chats">Search</kai-button>
<kai-dialog id="palette" label="Search chats">
  <kai-command id="cmd" placeholder="Search chats…"></kai-command>
</kai-dialog>
```

Script (≈30 lines): button click and `Mod+K` (a keydown listener using the kit's `kai-kbd` key
syntax in the hint) call `palette.show()` then `cmd.focus()`; `kai-query-change` lets the app
filter its own items and assign a NEW `cmd.items` array; `kai-select` hands the id to the app and
calls `palette.hide()`. The same shape serves "filter" (a `kai-menu` with a trigger button, whose
selection the app applies to its own list).

### 3.3 `agent-card` lives in E.

## 4. What moves

- **Kit:** `web-components/conversation/conversation-list.tsx` (row discovery + `toggle` re-sync),
  `components/conversation/conversation-list.tsx` (`createConversationItemsController` docs for
  nested rows), tests.
- **Docs:** `components/conversation-list.mdx` (or the page for `kai-conversations`) rewritten
  composition-first (children shown first, `conversations` as the preset); `/patterns/conversation-rail`,
  `/patterns/command-trigger`; a "Build your own rail" section naming `createRovingTabList` for an
  arrangement that is not `kai-conversations` at all.
- **Old spec:** `2026-09-27-rail-primitive-design.md` gets a dated status line: the mechanism
  shipped; nested rows moved to this spec.
- **Generated artifacts** only if a doc comment on a public prop changes (`build:api`).

## 5. Testing

- Red first: a jsdom contract test with a `kai-conversation-item` inside an open `<details>` inside
  `kai-conversations` asserting it is a row (tabindex, arrow reachability, activation) fails
  before the discovery change.
- Unit: open folder walked, closed folder skipped, toggling re-syncs, `aria-current` on the nested
  active row, the summary is not stamped.
- In-browser: the `conversation-rail` pattern story driven by keyboard (Tab into the rail, arrows
  through two folders, close one and re-walk, Enter selects, the header search opens the palette,
  Esc closes it and returns focus to the trigger); axe; light/dark; the pattern at 280px and in a
  `kai-workspace` start aside.
- `kai add conversation-rail` into a scratch Vite app renders and works (the consumer check for the
  pattern path, A §7).

## 6. Acceptance

1. A `kai-conversation-item` inside a `<details>` folder in `kai-conversations` is a full row.
2. The rail pattern reproduces the owner's screenshot from public parts with no config props
   beyond `active-id`, and every header control dispatches to app code.
3. The command-trigger pattern opens from a button and `Mod+K`, filters through app code, and
   returns focus to the trigger on close.
4. Both patterns install with `kai add`.

## 7. Risks

- `<details>` content animation needs CSS the pattern owns (`::details-content` where supported,
  instant elsewhere); the kit takes no position.
- A consumer relying on only direct children being rows (e.g. a nested `kai-conversation-item`
  used as a preview inside another row) would now see it become a row; the release note says so.
