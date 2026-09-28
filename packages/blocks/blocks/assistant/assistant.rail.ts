/**
 * assistant, the rail's rows.
 *
 * The rail renders ONE flat repeat, and this module is what that repeat holds:
 * the row shape a conversation row and a control row are both built from, the
 * builders that turn a folder heading, a Show more row and a section label into
 * rows of that shape, the one projection that expands the ordered conversations
 * into the rows the rail draws, and the order and the narrowing that projection
 * reads. It was split out of assistant.controller.ts for size alone: the
 * controller was the block's one two-thousand-line file, and the rail's row
 * projection was its biggest single concern. Nothing here changed - the same
 * code, in a file named for what it holds.
 *
 * WHY IT IMPORTS NOTHING FROM ITS IMPORTER AT RUNTIME. This module is inlined
 * into the single-file paste form at the second level (the entry, then what the
 * entry imports), and the inliner REFUSES a relative import from there by name:
 * a module graph rebuilt by concatenation works until it does not. So the two
 * things this module would otherwise reach back for - the demo's catalogue and
 * the never-stored-anything fixture, which the controller builds from its guides
 * - travel IN: the fixture is handed to `railNodes` as a builder that receives
 * the projection's own open/closed predicate. The `import type` below is a type
 * import on purpose, and it is not a loophole being leaned on: esbuild erases it
 * before the inliner ever reads this file, so the emitted module imports nothing
 * from the controller at all.
 */
import { byPinnedThenRecency, byRecency } from '@kitn.ai/ui/stores';
import type { ConversationSummary } from '@kitn.ai/ui/stores';
import type { DemoProject, RailOrganizer, RailSort } from './assistant.controller';

/** The comparator each sort choice reads. The kit's own two, imported rather
 *  than restated, so a rail ordered by this menu and a list ordered by the kit
 *  cannot come to disagree about what "most recent" means. */
const RAIL_SORT_COMPARATORS: Record<RailSort, (a: ConversationSummary, b: ConversationSummary) => number> = {
  priority: byPinnedThenRecency,
  updated: byRecency,
};

/** The rail's ONE row order, for the organizer and the sort the menu chose: the
 *  projects in the catalogue's order, the ungrouped remainder last, and inside
 *  each of those the sort's own comparator. So a pinned conversation sorts first
 *  WITHIN its project under `priority`, pinning one never lifts it out of the
 *  project it belongs to, and no pin moves a project: the section order is the
 *  catalogue's, not the rows'.
 *
 *  ONE LIST IS THE SAME FUNCTION'S FLAT BRANCH, not a second order: with no
 *  folders there is nothing for the catalogue's rank to do, so the sort choice
 *  decides the whole list. Both branches read the comparators above, which is why
 *  a rail organizing one way and sorting another cannot disagree about what the
 *  sort means. */
export function orderRows(
  summaries: readonly ConversationSummary[],
  organizer: RailOrganizer,
  sort: RailSort,
  catalogue: readonly DemoProject[],
): ConversationSummary[] {
  const compare = RAIL_SORT_COMPARATORS[sort];
  if (organizer === 'list') return [...summaries].sort(compare);
  const rank = (groupId: string | undefined): number => {
    const at = catalogue.findIndex((project) => project.id === groupId);
    if (at !== -1) return at;
    // A group the catalogue does not know still gets a folder of its own, ahead
    // of the remainder: a consumer's own store can carry its own groups, and a
    // row the catalogue cannot name is reachable rather than filed in Recents.
    // The conversations with no group at all sort last.
    return groupId === undefined ? catalogue.length + 1 : catalogue.length;
  };
  return [...summaries].sort((a, b) => {
    const byProject = rank(a.groupId) - rank(b.groupId);
    if (byProject !== 0) return byProject;
    // The subgroup's id is the last tiebreak, and it is what makes every folder
    // ONE run: two groups the catalogue does not know would otherwise interleave
    // by recency, and a folder split around another folder's rows renders as two
    // folders with one label.
    const byGroup = (a.groupId ?? '').localeCompare(b.groupId ?? '');
    return byGroup !== 0 ? byGroup : compare(a, b);
  });
}

/** The rows a query leaves, in the one order. The search is the only narrowing
 *  the rail has, and it runs in the same pass that derives the sections, so a
 *  folder whose rows all missed is not a folder the rail still offers.
 *
 *  THE QUERY IS MATCHED AGAINST THE TITLE ALONE, which is all a rail row shows:
 *  a match on text nobody can see is a row the reader cannot tell apart from one
 *  that should never have matched, and the row IS one line (see `projectSummaries`). */
export function narrow(rows: readonly ConversationRow[], query: string): readonly ConversationRow[] {
  return query === ''
    ? rows
    : rows.filter((row) => row.title.toLowerCase().includes(query));
}

/** What a folder heading reads: the project's own name, or - for a group the
 *  catalogue does not name - the id the row carries, so a consumer's own group
 *  is a folder with a label rather than a blank row. */
export function sectionLabel(group: string, groupName: string): string {
  return groupName !== '' ? groupName : group;
}

/** The shape every row that is NOT a conversation starts from: the conversation
 *  parts off, and the four a control row can have (the project glyph, a menu, a
 *  rename field, the items that act) off too, plus the trailing ACTIONS, which only the
 *  two section labels show. The three builders below turn on the ones their own
 *  kind needs, so a field added to the row cannot be forgotten in one of them. */
export function controlNode(id: string, kind: ConversationRow['kind'], title: string, group: string, groupName: string): ConversationRow {
  return {
    id,
    kind,
    title,
    unread: false,
    menuLabel: '',
    renaming: false,
    renameFieldHidden: true,
    renamePlaceholder: '',
    renameShortcutHidden: true,
    shareItemHidden: true,
    shareDividerHidden: true,
    pinLabel: 'Pin',
    renameItemHidden: true,
    pinItemHidden: true,
    archiveItemHidden: true,
    deleteItemHidden: true,
    pinned: false,
    group,
    groupName,
    folderIconHidden: true,
    folderIconName: 'folder-closed',
    menuHidden: true,
    trioHidden: true,
    trioMenuLabel: '',
  };
}

/** A rail row for a SAMPLE conversation: the conversation parts of a row with the
 *  row's own menu OFF, and the reason is the failure this block treats as its
 *  worst - a control that looks live and does nothing. Every op that menu offers
 *  writes through the STORE, and a sample row is in no store: Rename would open
 *  no field, Pin and Archive would move no row, Delete would remove nothing. The
 *  row's one affordance is its activation, which is the store's own honest answer
 *  for an id it does not hold (see `fixtureRail`). */
export function sampleNode(sample: FixtureConversation, group: string, groupName: string): ConversationRow {
  return controlNode(sample.id, 'conversation', sample.title, group, groupName);
}

/** What a folder heading's menu needs from where the store is, not from the row:
 *  whether the store keeps a group list AT ALL (no list, no menu - a row that
 *  cannot act is not offered), and which heading is the one being renamed in
 *  place. Injected because `folderNode` is a module-level function while the
 *  store is per-controller. */
export interface FolderMenu {
  canManage: boolean;
  renamingId: string | undefined;
}

/** A rail row that is not a conversation: a folder's heading, or the Show more
 *  row. Both are rendered by the SAME repeat the conversations are, because the
 *  page grammar clones one element per repeat and has no way to interleave a
 *  second kind of row between them - so the heading is a rail row, and its
 *  `conversation-id` names the folder rather than a conversation, which is how
 *  activation tells the two apart. */
export function folderNode(
  kind: 'folder' | 'more',
  group: string,
  groupName: string,
  menu: FolderMenu,
  open: boolean,
): ConversationRow {
  const heading = kind === 'folder';
  const node = `${heading ? FOLDER_HEADING_NODE : FOLDER_MORE_NODE}${group}`;
  const title = heading ? (group === '' ? RECENTS_LABEL : sectionLabel(group, groupName)) : SHOW_MORE_LABEL;
  const renaming = heading && menu.renamingId === node;
  return {
    ...controlNode(node, kind, title, group, groupName),
    // THE HEADING CARRIES THE RUN MENU THE CONVERSATION ROWS CARRY, through the
    // same authored markup and the same action: a project the reader cannot
    // rename or delete is the defect this round exists for. Its two items are
    // RENAME and DELETE, and neither is the conversation row's pair - a folder
    // is not shared, not pinned and not archived, so those items are off here and
    // the F2 chip is off too, because F2 acts on the ACTIVE conversation and a
    // heading is never active. What is left is exactly what the store's own
    // group API can do, which is the same rule the conversation menu follows.
    renaming,
    renameFieldHidden: !renaming,
    renamePlaceholder: 'Project name',
    renameItemHidden: !(heading && menu.canManage),
    deleteItemHidden: !(heading && menu.canManage),
    menuHidden: !heading,
    menuLabel: heading ? `Actions for ${title}` : '',
    // ...AND THE GLYPH AHEAD OF THE TITLE, on a PROJECT's heading and on nothing
    // else. The Recents heading is a section label over the unfiled remainder
    // rather than a project, and a heading for a group the catalogue cannot name
    // is still a project - it has a group id, which is what this reads.
    folderIconHidden: !(heading && group !== ''),
    // ...AND IT READS THE FOLDER'S OWN STATE: an open folder paints the open
    // glyph, a closed one the closed glyph. `open` is the same fact this node's
    // caller emitted rows from (see `railNodes`), so the glyph and the rows
    // cannot disagree about whether the folder is showing anything.
    folderIconName: open ? 'folder-open' : 'folder-closed',
    // THE RECENTS HEADING IS THE RAIL'S SECOND SECTION LABEL, so it carries the
    // same trailing actions the Projects label does; a folder INSIDE Projects
    // heads a folder rather than a section and carries none.
    trioHidden: !(heading && group === ''),
    trioMenuLabel: `Rail options for ${title}`,
  };
}

/** THE LABEL OVER THE FOLDERS: one row, the Projects heading, emitted ahead of
 *  the first folder. It is a rail row for the same reason a folder's heading is
 *  (the repeat renders one element kind), and it is a LABEL rather than a
 *  control: activation does nothing - what is under it is the folders,
 *  and they are already each their own control. It DOES carry the trailing
 *  actions, because the rail's own two settings belong to the rail rather than to
 *  any one folder. */
function sectionNode(label: string): ConversationRow {
  return {
    ...controlNode(`${SECTION_NODE}${label.toLowerCase()}`, 'section', label, '', ''),
    trioHidden: false,
    trioMenuLabel: `Rail options for ${label}`,
  };
}

/** The rail's ONE flat repeat, expanded from the ordered conversations into the
 *  rows the rail renders: for every folder, its heading and - while it is open -
 *  its conversations, then the Show more row when the folder holds more than the
 *  rail shows. Nothing wraps anything, so every row is a direct child of the
 *  list and the container's roving focus and activation cover the headings too.
 *
 *  Open/closed is therefore which rows this emits at all: a closed folder is its
 *  heading and nothing else. A search opens every folder it has a match in,
 *  because a match the reader cannot see is a match that does not exist.
 *
 *  ONE LIST EMITS THE ROWS AND NOTHING ELSE - no section label, no folder
 *  heading, no Show more, and the closed/expanded sets unread. There is no folder
 *  for a heading to head, and a row the reader cannot file has nothing to reveal
 *  from, so the flat branch is the whole of what "one list" means here.
 *
 *  A RAIL WITH NO ROWS AT ALL IS THE FIXTURE (`fixtureRail`), and the reader's
 *  own projects that hold nothing lead the folders either way. */
export function railNodes(
  rows: readonly ConversationRow[],
  closed: readonly string[],
  expanded: readonly string[],
  query: string,
  organizer: RailOrganizer,
  created: readonly DemoProject[],
  fixture: boolean,
  menu: FolderMenu,
  // THE FIRST-VISIT RAIL, handed in rather than imported. It is the demo's own
  // fixture - the sample conversations the controller derives from its guides,
  // filed into the demo's three projects - and it reads this projection's own
  // open/closed predicate, so it arrives as a builder that takes that predicate.
  // See the header for why a relative import would not survive the paste form.
  fixtureRows: (isOpen: (group: string) => boolean) => ConversationRow[],
): ConversationRow[] {
  // ONE LIST IS THE ROWS UNDER ONE LABEL AND NOTHING ELSE: no folder headings, no
  // Show more, and the closed/expanded sets unread, because there is no folder for
  // a heading to head and nothing for a row to be revealed from.
  //
  // THE LABEL STAYS, and it is the one thing the flat list cannot drop: the
  // rail's own settings live in the actions a section label carries, so a list
  // with no label at all would have no way back to the organizer that made it -
  // a state the reader can enter and not leave. Its heading is the flat list's
  // own name rather than a project's, which is what makes it honest.
  if (organizer === 'list') return [sectionNode(ONE_LIST_LABEL), ...rows];
  // THE SHAPE BEFORE THE HISTORY: with an empty STORE and no search, this is what
  // a profile that has never stored anything sees. Gated on the STORE rather than
  // on the rows, and that is the difference a reader meets by archiving: an
  // archived conversation leaves the rows (which is what archiving means) while
  // staying in the store - so a fixture gated on rows would put the demo's sample
  // projects back in front of someone who still has their chat, with the same
  // headings a brand-new reader sees. Read here rather than in the state script,
  // because the rail a reader gets on their first visit is the rail's own shape.
  const shut = new Set(closed);
  const grown = new Set(expanded);
  // WHETHER A FOLDER SHOWS ITS ROWS, and the one predicate the glyph and the rows
  // both read - so a heading cannot paint the open folder over a hidden run. A
  // search opens every folder: a match the reader cannot see is a match that does
  // not exist. A project the reader named and filed nothing into is a heading with
  // no rows to reveal, and its glyph reads the reader's own choice like any other.
  //
  // THE FIXTURE READS IT TOO, through this same closure rather than a second
  // notion of shut: the rail a first-visit reader meets is the rail they are
  // most likely to click a folder on, and a blank profile closing a demo folder
  // only for its rows to stay and its glyph to stay open is the design turned
  // over. The fixture branch therefore comes AFTER this predicate and is handed
  // it, so "is this folder shut" is spelled once for both paths.
  const isOpen = (group: string): boolean => query !== '' || !shut.has(group);
  if (fixture && rows.length === 0 && query === '') return fixtureRows(isOpen);
  const out: ConversationRow[] = [];
  // THE READER'S OWN PROJECTS LEAD, and they are on the rail whether or not they
  // hold a row: a project the reader named exists from the moment they named it,
  // which is the whole point of the dialog that makes one. An empty one is headed
  // and nothing else (see `folderNode`). The demo's three sample projects are NOT
  // here - they are data, and data with no conversation in it is not a folder this
  // rail claims holds something.
  const empty = created.filter((project) => !rows.some((row) => row.group === project.id));
  let labelled = empty.length > 0;
  if (labelled) out.push(sectionNode(PROJECTS_LABEL));
  for (const project of empty) {
    out.push(folderNode('folder', project.id, project.name, menu, isOpen(project.id)));
  }
  let at = 0;
  while (at < rows.length) {
    const group = rows[at].group;
    let end = at;
    while (end < rows.length && rows[end].group === group) end += 1;
    const run = rows.slice(at, end);
    const groupName = run[0].groupName;
    const open = isOpen(group);
    // THE PROJECTS LABEL, once, over the first folder - and the ungrouped
    // remainder is not one, so a rail holding only Recents has no label over
    // nothing. Emitted here rather than declared beside the rows, so a query that
    // leaves no folder also leaves no label.
    if (group !== '' && !labelled) {
      out.push(sectionNode(PROJECTS_LABEL));
      labelled = true;
    }
    out.push(folderNode('folder', group, groupName, menu, open));
    if (open) {
      const shown = grown.has(group) ? run : run.slice(0, FOLDER_LIMIT);
      out.push(...shown);
      if (shown.length < run.length) out.push(folderNode('more', group, groupName, menu, true));
    }
    at = end;
  }
  return out;
}

/** One project the rail shows, with what the rows in it come to right now.
 *  Derived from the rows on every change, so a project holding no row is not a
 *  section at all, and it moves with the search. Recents is not here: it is the
 *  remainder the rows with no group make, and the rail renders it last. */
export interface ConversationSection {
  id: string;
  name: string;
  /** How many rows it holds, after the search filter. */
  count: number;
}

/** One rendered row of the rail. Every field is already a string or a
 *  boolean, because `*for` bodies get bindings, not expressions.
 *
 *  A row is not always a conversation: a folder's heading, its Show more row and
 *  the Projects label over the folders are rail rows too, so `kind` says which of
 *  the four it is and the fields decide what it shows. That is why the control
 *  rows carry the whole shape with the conversation parts hidden rather than a
 *  shape of their own - the repeat renders one element. */
export interface ConversationRow {
  id: string;
  /** Which of the four rows this is. A conversation is activated by loading it; a
   *  heading and a Show more row are activated as the folder control they are;
   *  the section label heads the folders and is activated as nothing. */
  kind: 'conversation' | 'folder' | 'more' | 'section';
  title: string;
  unread: boolean;
  /** The row's own menu trigger, named for the row it belongs to: every
   *  conversation row has one, so one shared label would make five identical
   *  accessible names. Empty on a control row, whose menu is hidden. */
  menuLabel: string;
  /** This row is the one being renamed, so its title is a field and not text. */
  renaming: boolean;
  /** The rename field's own `hidden`. Both flags read the same fact, spelled the
   *  way each binding needs it (the title hides while the field shows). */
  renameFieldHidden: boolean;
  /** What that field's placeholder says: a conversation is not a project, and the
   *  placeholder is the one piece of text the field carries that the row cannot
   *  otherwise tell apart. */
  renamePlaceholder: string;
  /** Whether the Rename item hides the F2 chip. F2 acts on the ACTIVE
   *  conversation, and a folder heading is never active (its activation opens the
   *  folder), so a chip on a heading's item would advertise a key that does
   *  nothing there. */
  renameShortcutHidden: boolean;
  /** Whether the Share item is hidden, and whether the divider under it is -
   *  one fact about a row (a folder is not shareable) spelled the way each of
   *  the two bindings needs it, exactly as `renaming`/`renameFieldHidden` are. */
  shareItemHidden: boolean;
  shareDividerHidden: boolean;
  /** The pin item's label: the same item offers Pin or Unpin, and which one is
   *  the row's own state. */
  pinLabel: string;
  /** The four items that act, per row: an operation the store does not implement
   *  gets no row at all, rather than a button that does nothing. */
  renameItemHidden: boolean;
  pinItemHidden: boolean;
  archiveItemHidden: boolean;
  deleteItemHidden: boolean;
  /** Whether the conversation is pinned: read by the pin shortcut, and by the pin
   *  item's label. */
  pinned: boolean;
  /** The project this row is filed under, or '' for the ungrouped remainder.
   *  The id the section carries, so the two are the same fact spelled once. */
  group: string;
  /** That project's label, or ''. Empty for a group the catalogue cannot name,
   *  which a heading then labels with the id instead (`sectionLabel`). */
  groupName: string;
  /** Whether the project glyph ahead of the title is hidden. Only a folder heading
   *  for a project the store keeps shows one: it is what says the row heads a
   *  project rather than being another conversation, and the Recents heading heads
   *  the unfiled remainder rather than a project. */
  folderIconHidden: boolean;
  /** WHICH OF THE TWO FOLDER GLYPHS A HEADING PAINTS, and it is the heading's own
   *  OPEN STATE rather than a decoration: the caret that used to say open/closed
   *  beside the glyph is gone, so the folder itself has to carry it - `folder-open`
   *  while the folder shows its rows, `folder-closed` while it does not. The two
   *  are the kit roster's own names, one glyph per state.
   *
   *  Read on every row and only painted on a heading (see `folderIconHidden`): the
   *  repeat renders ONE element, so a field the heading needs is a field every row
   *  carries. */
    folderIconName: FolderIconName;
  /** Whether the row menu is hidden: a control row carries no kebab, and the
   *  heading's own activation is the folder control. */
  menuHidden: boolean;
  /** Whether the row's TRAILING ACTIONS are hidden. The rail's two section labels
   *  - the Projects label and the Recents heading - carry them, and nothing else
   *  does: a folder heads a folder, and a conversation row's own kebab is its
   *  menu. */
  trioHidden: boolean;
  /** The trailing menu's accessible name, named for the row it belongs to: two
   *  rows carry the same menu, so one shared name would leave a screen reader with
   *  two identical controls and no way to tell which row each belongs to. Empty
   *  where the actions are hidden. */
  trioMenuLabel: string;
}

/** How many of a folder's conversations the rail shows before it offers the
 *  `Show more` row. A folder's screenful is small on purpose - the reference
 *  sidebar shows three or four - and the demo's biggest folder holds one more
 *  than this, so the row has something to reveal. */
export const FOLDER_LIMIT = 4;

/** The id a folder heading's and a Show more row's rail row carries. A
 *  conversation id is a uuid, so neither prefix can collide with one. */
export const FOLDER_HEADING_NODE = 'folder:';
export const FOLDER_MORE_NODE = 'folder-more:';

/** The two glyphs a folder heading paints, one per state, and they are the kit
 *  roster's own names (`folder-open` / `folder-closed`): the heading's caret is
 *  gone, so the folder is what says whether it is showing its rows. */
type FolderIconName = 'folder-open' | 'folder-closed';

/** The folder a row node names, or undefined for a row that is not a heading.
 *  The heading's node id is how the two row kinds travel through ONE activation
 *  and ONE menu action: a conversation id is a uuid, so the prefix is
 *  unambiguous. */
export function folderOf(nodeId: string): string | undefined {
  return nodeId.startsWith(FOLDER_HEADING_NODE) ? nodeId.slice(FOLDER_HEADING_NODE.length) : undefined;
}

/** The ungrouped remainder's heading, and a folder's reveal control. Both are
 *  the block's own words, which is the point of the heading being a row: the
 *  element has no label of its own for either. */
export const RECENTS_LABEL = 'Recents';
export const SHOW_MORE_LABEL = 'Show more';

/** The heading one flat list carries. It is the rail's own name for the rows
 *  under it rather than a project's, because there is no project being grouped:
 *  the list IS every chat, which is what the organizer chose. */
export const ONE_LIST_LABEL = 'All chats';

/** The label over the folders, in the register the Recents heading already uses:
 *  the muted heading over a group of rows. The folders below it are the projects
 *  the conversations are filed into, and this says so. */
export const PROJECTS_LABEL = 'Projects';

/** The id the Projects label's rail row carries. A conversation id is a uuid and
 *  the two folder node prefixes are `folder:`/`folder-more:`, so none can
 *  collide with it. */
export const SECTION_NODE = 'section:';
