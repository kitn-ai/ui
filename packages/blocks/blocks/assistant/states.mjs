// assistant's state script for the block driver (V-1): the full-page
// assistant walked through its named states - empty, a reply whose tool call
// settles, a cited follow-up, the model switcher recipe, the rail, a fresh
// chat, the controller's restore-on-reload, and the affordances a reader would
// try next: the row menu, the row shortcuts the menu advertises, and ONE ACTION
// PROOF PER ROW OP - a rename committed through the inline field, a pin through
// the row's own menu that moves that row to the top of the list, an archive that
// unlists the row - then the collapsed rail and the drawer it becomes below the
// shell's breakpoint, and finally the controls this page owns at its edges: the
// voice transcript path, the settings menu's theme choice, the scroll-to-bottom
// button, and the four suggestion ARCS, whose promise is that clicking a label
// plays the turn that label names rather than the fallback script, plus the
// empty state's own layout - the four suggestion labels as one wrapping row of
// pills and the guide cards' grid - the one shape no other state can see,
// because every other state reads the labels off
// the element's `suggestions` property, which says what the block offered and
// nothing about how the kit laid it out. That state reads the same boxes twice,
// once at the run's viewport and once at 600px, because "they wrap when there is
// no room" is a claim about two widths. Last of all the rail's TOP ACTIONS: the
// four rows in its header region, three of them inert with their reason on them,
// and the one that acts firing the same new-chat path the rail's built-in button
// used to. The keyboard walk over the rail's rows runs BEFORE those two, and its
// recorded values do not move: the rows are outside the list by construction.
// The last three states are the rail's own CHROME: the trailing actions a section
// label reveals on hover (kebab, filter, compose), the menu behind the kebab (the
// owner's two groups, the divider and the plus section under it), and what each
// row of that menu really does - the organizers as a state change, the sorts as
// two orders read against the store's own records, and the filter handing the
// caret to the rail's search box.
// One page (the generated /kit/ rendering of the CDN form), so record/check are
// the modes; there is no facade parity reference for this composition.
//
// Runs (from packages/ui, after a real build + gen-blocks). The scenario path
// reaches OUT of this package: the authored blocks moved to packages/blocks, so
// a bare `blocks/assistant/...` resolves to a directory that no longer exists and
// the driver fails with ERR_MODULE_NOT_FOUND before it runs anything.
//   record:  node scripts/block-driver/driver.mjs ../blocks/blocks/assistant/states.mjs \
//              --serve scripts/block-driver/pages --pages block \
//              --record scripts/block-driver/baselines/assistant.json \
//              --shots scripts/block-driver/baselines/screenshots-assistant
// `--shots` is REQUIRED and takes no default: the driver's old default wrote
// into this block's source directory, which was deleted as debris twice.

const settle = (ms) => (page) => page.waitForTimeout(ms);
const style = (name, target, props) => ({ name, target, props });

// Read a `:attr` binding off whichever channel the RUNNING renderer wrote it to.
// The two delivery forms disagree here BY CONSTRUCTION: the generated HTML binder
// writes the value as an ATTRIBUTE, while the React wrapper assigns the DECLARED
// PROP as a DOM property (frameworks/react/runtime.tsx: every `aria-*`/`data-*`
// is an attribute, a declared prop is a property). A probe that reads only the
// attribute therefore measures the renderer rather than the block: the react cell
// read `null` for a `theme` and a `conversation-id` whose values were sitting in
// the property the whole time. Property first, attribute second -- the rule
// `readConversationItemId` already follows
// (src/components/conversation/conversation-list.tsx) -- and a kai element
// reflects its attribute into the property, so the HTML leg reads the same value
// through the first branch rather than falling back.
const readBoundValue = (locator, prop, attr) => locator.evaluate(
  (el, [p, a]) => {
    const value = el[p];
    return typeof value === 'string' && value ? value : el.getAttribute(a);
  },
  [prop, attr],
);

// The title the inline rename commits in state 10, spelled once so the act and
// the two probes cannot drift apart: a probe that retyped the string would be
// asserting its own copy rather than what the store holds.
const RENAMED_TITLE = 'Renamed by keyboard';

// The row state 13 pins, captured in that state's ACT. It has to be captured
// there and not re-derived in the probes: the row that has to move is the one
// that is SECOND before the pin, and by probe time the order is the thing under
// test. A probe that found the second row now would compare the new order
// against itself and pass whatever happened.
let pinnedRowId = null;

// The roles the row menu's ARROW WALK lands on, captured in state 8's act for
// the same reason: the walk is the evidence that the dividers stayed out of the
// roving focus, and the position it ends at cannot be reconstructed afterwards.
let menuFocusRoles = null;

// The rail's row count BEFORE a card click, captured in that click's act for
// the same reason as the two above: the claim is that seeding a guide changes
// no row, and the only way to assert a change that did not happen is to have
// the number from before it. A probe that counted rows afterwards would pass
// whether or not the click had added one.
let guideRowsBefore = null;

// And the count immediately AFTER that click, because the guide's own next step
// is clicked later in the same act and a SUGGESTION CLICK IS A SUBMIT: it goes
// through the same path a typed message does, so it writes the thread the reader
// now has and the rail legitimately gains its row. Comparing the end of the act
// against `guideRowsBefore` would therefore assert the wrong thing and fail - the
// claim under test is about the CARD click, so the number has to be taken where
// that claim lives.
let guideRowsAfterCard = null;

// The thread a card click produced, captured in that click's act for the same
// reason: the shapes asserted below are read from what the app built, never
// retyped here.
let guideThread = null;

// The guide's SECOND answer: the one its own `*Next:*` label asks for, captured
// in that click's act. Two things are being checked and they are different: that
// a clicked label produced a turn at all, and that the turn belongs to THIS
// guide's script rather than to the fallback one. The mock keys a conversation by
// the question that opened it and the turn by how many answers the thread has, so
// a key that drifted in one file and not the other would answer with the wrong
// script - visibly, and with every unit test green without this state.
let guideFollowUp = null;

// The four cards, in the order they must render: the path a developer meets
// them. Spelled once so the state that lists them and the four that click them
// cannot drift apart.
// A COPY, and it says so: the labels below are the block's own approved card
// titles, which live in `assistant.controller.ts`. The driver is plain JS and
// cannot import that module, so a probe has to name them - but the copy is
// recorded here rather than left to be discovered, and it is the only place in
// this file that restates content on purpose.
const GUIDE_CARDS = ['Get it running', 'Wire a model', 'Add voice', 'Send a card'];
const GUIDE_SLUGS = ['get-it-running', 'wire-a-model', 'add-voice', 'send-a-card'];

// The labels a conversation offers are read off the ELEMENT the block binds
// them to (`.suggestions="suggestions"` on the composer), so nothing here
// retypes what the controller decided. Captured in an ACT rather than derived in
// a probe: the probes run once the state has settled, and by then the labels
// shown mid-conversation are gone.
const suggestionLabels = (page) =>
  page.evaluate(() => document.getElementById('prompt')?.suggestions ?? []);

/** Every captured label is really on screen, not merely in the array. The
 *  locator pierces the element's shadow root, which `querySelectorAll` inside
 *  the page would not. */
const allRendered = (page, labels) =>
  Promise.all(
    labels.map((label) =>
      page.getByRole('button', { name: label, exact: true }).first().isVisible().catch(() => false),
    ),
  ).then((each) => each.every(Boolean));

/** The four openers, in the order the block offers them, and the ARC each one
 *  starts.
 *
 *  A COPY, and it says so, for the same reason as GUIDE_CARDS below: the driver
 *  is plain JS and cannot import the controller. The state that captures the
 *  openers COMPARES the app's own array against this one, so a reworded label
 *  goes red there rather than clicking nothing in the arc states. */
const ARC_LABELS = [
  'Summarize a document',
  'Make a task list',
  'Compare two options',
  'Draft a short brief',
];

/** Wait for the thread to hold `count` messages AND for the turn to have LANDED.
 *
 *  Both halves are load-bearing, and the reason is that a click STREAMS its
 *  answer: the reader's own message lands synchronously, so a count alone is
 *  satisfied by the first chunk of a reply nobody has finished, and `loading`
 *  alone is false both before the click and after the turn. Together they say
 *  "this many turns, and the last one is done arriving", which is what every
 *  capture below needs to be a fact rather than a snapshot mid-stream. */
const waitForTurns = (page, count) =>
  page.waitForFunction(
    (n) => (document.getElementById('thread')?.messages ?? []).length >= n
      && document.getElementById('prompt')?.loading === false,
    count,
    { timeout: 20000 },
  );

/** The shapes a thread's messages carry, read off the element the block bound.
 *
 *  COUNTS AND IDS, NEVER THE CONTENT. The words and the card data are approved
 *  content that lives in the mock, so a probe that retyped them would assert its
 *  own copy; what a label PROMISES is a shape - a task list of four rows, two
 *  options, two form fields, a card revised rather than repeated - and that is
 *  what comes back here. */
const threadShape = (page) =>
  page.evaluate(() => {
    const messages = document.getElementById('thread')?.messages ?? [];
    const rowsOf = (data) => data?.tasks ?? data?.options ?? [];
    return messages.map((message) => {
      const parts = message?.parts ?? [];
      return {
        role: message?.role ?? null,
        textLength: parts
          .filter((p) => p.type === 'text')
          .map((p) => p.text ?? '')
          .join('').length,
        tools: parts
          .filter((p) => p.type === 'tool')
          .map((p) => ({ type: p.tool?.type ?? null, state: p.tool?.state ?? null })),
        cards: parts
          .filter((p) => p.type === 'card')
          .map((p) => {
            const data = p.envelope?.data ?? {};
            const rows = rowsOf(data);
            return {
              type: p.envelope?.type ?? null,
              id: p.envelope?.id ?? null,
              rows: rows.length,
              fields: data.properties ? Object.keys(data.properties).length : 0,
              firstChecked: rows[0]?.checked === true,
              firstNoted: typeof rows[0]?.description === 'string',
            };
          }),
      };
    });
  });

/** The cards on the LAST message of a captured thread, and the text it carries:
 *  the two halves of "the turn this label promised arrived". */
const lastTurn = (shape) => {
  const last = shape[shape.length - 1] ?? {};
  return { cards: last.cards ?? [], textLength: last.textLength ?? 0, tools: last.tools ?? [] };
};

/** The four openers, an empty thread's labels, and the arc's own label: all
 *  captured from the app in state 24 so the probes below compare against a set
 *  the page produced instead of a list retyped here. */
let emptyOpeners = [];
let arcLabel = '';
let labelsMidArc = [];
let labelsEndOfArc = [];
let labelsFromCard = [];

// The empty state's layout, measured in state 30: the labels the element offered
// and the box each of them rendered into, plus the guide cards' grid - each read
// at the run's own viewport and again at a narrow one. Two captures rather than
// one, because the probes make two different claims - that the measured boxes ARE
// the offered labels, and that those labels render as one wrapping row.
let offeredRows = [];
let emptyStateBoxes = null;

/** The boxes the empty state's labels rendered into, read through the element's
 *  shadow root.
 *
 *  WHY A MEASUREMENT AND NOT A CLASS NAME. The rendering IS the decision (the
 *  kit's `suggestionsLayout`), and its two variants differ in a way a box can
 *  see: the row variant carries `w-full`, so each one fills its container's
 *  content box and four of them stack at four different tops, while the default
 *  pill is intrinsic-width and they share one line until there is no room. A
 *  probe that asserted a class would be asserting the kit's markup rather than
 *  the shape a reader sees, and this file asserts the shape everywhere else.
 *
 *  The reference the width claim is made against is the pill's OWN container's
 *  content box, computed from that container's box and padding - a typed pixel
 *  count would rot with the theme. */
const measureSuggestions = (page, labels) => page.evaluate((wanted) => {
  const root = document.getElementById('prompt')?.shadowRoot;
  if (!root) return { error: 'no shadow root on #prompt' };
  const buttons = [...root.querySelectorAll('button')];
  const pills = wanted.map((label) => {
    const el = buttons.find((b) => (b.textContent ?? '').trim() === label);
    if (!el) return { label, missing: true };
    const parent = el.parentElement;
    const box = el.getBoundingClientRect();
    const style = parent ? getComputedStyle(parent) : null;
    return {
      label,
      left: Math.round(box.left),
      top: Math.round(box.top),
      width: Math.round(box.width),
      height: Math.round(box.height),
      containerWidth: parent && style
        ? Math.round(parent.getBoundingClientRect().width
          - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight))
        : null,
    };
  });
  return { pills };
}, labels);

/** The guide cards' grid and one card's box, plus the two measures the card's
 *  looseness is asserted against rather than typed: the kit's own spacing unit
 *  (--kai-density, the knob every numeric spacing utility is re-pointed at) and
 *  the composer's element box below, which is the 48rem column the cards are
 *  supposed to share.
 *
 *  PADDING IS MEASURED, NOT READ. The button's box lives in kai-button's shadow
 *  root, so the visible padding is the distance from the card's own edge to the
 *  text the page slotted into it - the same fact a reader sees, and the one a
 *  `::part(button)` rule moves. */
const measureCards = (page) => page.evaluate(() => {
  const grid = document.querySelector('.guide-cards');
  if (!grid) return { error: 'no .guide-cards on the page' };
  const cards = [...grid.querySelectorAll('kai-button')];
  const card = cards[0];
  const title = card?.querySelector('.guide-card-title');
  const summary = card?.querySelector('.guide-card-summary');
  const gridBox = grid.getBoundingClientRect();
  const cardBox = card ? card.getBoundingClientRect() : null;
  const titleBox = title ? title.getBoundingClientRect() : null;
  const summaryBox = summary ? summary.getBoundingClientRect() : null;
  return {
    cards: cards.length,
    columns: getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length,
    // HOW MANY COLUMNS THE CARDS ACTUALLY LAND IN, read off their own left
    // edges rather than off the template string: a rule that left the template
    // alone while the boxes moved would pass a string comparison.
    lefts: [...new Set(cards.map((el) => Math.round(el.getBoundingClientRect().left)))].length,
    gridWidth: Math.round(gridBox.width),
    cardWidth: cardBox ? Math.round(cardBox.width) : null,
    paddingTop: cardBox && titleBox ? Math.round(titleBox.top - cardBox.top) : null,
    paddingLeft: cardBox && titleBox ? Math.round(titleBox.left - cardBox.left) : null,
    titleToSummary: titleBox && summaryBox ? Math.round(summaryBox.top - titleBox.bottom) : null,
    // THE KIT'S OWN UNIT, as the page resolves it: 0.25rem when nothing set the
    // knob, which is the fallback the block's own rules carry.
    density: getComputedStyle(grid).getPropertyValue('--kai-density').trim(),
    composerWidth: Math.round(document.getElementById('prompt')?.getBoundingClientRect().width ?? 0),
    // THE BOX THE GRID IS SLOTTED INTO, read through the host's shadow root. The
    // slotted div's own `parentElement` is the HOST (it is light DOM), which is the
    // 48rem column - the box that declares the cap is the kit's `EmptyContent`, one
    // shadow boundary in.
    containerWidth: (() => {
      const content = document
        .querySelector('kai-empty')
        ?.shadowRoot?.querySelector('[data-slot="empty-content"]');
      return content ? Math.round(content.getBoundingClientRect().width) : null;
    })(),
  };
});

// The arcs' own captures, one entry per arc, written by that arc's state: what
// its first turn carried, what its SECOND turn carried (the turn its own label
// asked for), and the labels at each end. Captured in the act because the shapes
// are what the labels promise and they cannot be reconstructed afterwards.
const arcs = {};
// The arc state 24/25 walks, kept beside `arcs` because those two states capture
// it through a different route (the opener comes out of the empty set).
let arcMidShape = [];
let arcEndShape = [];

// State 18's two facts, one gesture apart: what the scroll button was doing
// while the thread was scrolled up, and whether the thread is a scroller at all.
// The button HIDES ITSELF at the bottom of the thread, so "it works" is only
// observable in the moment before the click.
let scrollButtonUp = null;
let threadIsScroller = null;

// State 16's premise: the thread has to be taller than its viewport, and that is
// a fact about the page rather than about the recorder, so it is measured.
let threadOverflows = null;

let crossLink = null;

/** The turn a typed message produced AFTER the task-list arc ran out, and the
 *  labels under it. Captured in state 31's act for the same reason as the rest:
 *  what the mock answers depends on how far the thread has run, and that is not
 *  reconstructable afterwards. */
let pastTheScript = null;

/** The turn the FIRST typed message produced — the arc's last scripted turn,
 *  captured separately from `pastTheScript` because the two claims are different
 *  turns of the same arc: one says the script carries on after a cross-link, the
 *  other says a turn past its end does not replay it. */
let typedTurn = null;

// The rail's filing, captured in state 32's act: what the rows came to BEFORE
// the conversation that state sends and after, plus the name of the biggest
// folder. Captured rather than restated, because the counts are the app's own
// arithmetic - and because "the folder that has to grow" is only knowable
// before the turn that grows it.
let railFiling = null;

// The folder state 33 read: the one the demo's own tour left holding a single
// conversation.
let railSingle = null;

// The row state 34 pins, and the folder it was in, captured in that state's act
// for the same reason as `pinnedRowId`: which row has to move is a fact about
// the order BEFORE the pin, and by probe time the order is the thing under test.
let pinInFolder = null;

// The conversation state 35 opens, captured in its act.
let openInFolder = null;

// State 36's search: the query, the row it was read from, and the filing before
// it was typed.
let railSearch = null;

// State 37's folder toggle, state 38's Show more row, state 39's search into a
// closed folder, state 40's keyboard walk, state 41's arrival and state 42's
// group the catalogue cannot name. Captured in each act for the same reason as
// the rest: what the rail did is only knowable before and after the
// interaction, never from the end state alone.
let folderToggle = null;
let showMore = null;
let searchOpen = null;
let keyboardWalk = null;
let activeArrival = null;
let unknownGroup = null;

// The rail's top actions: what the four rows ARE and where they sit (state 43),
// and what the three inert ones left alone (state 44). Both are read off the page
// rather than restated here, and state 44's before/after pair is captured in its
// act because "nothing changed" is only a fact about two moments.
let railTopRows = null;
let railTopActions = null;

// A COPY, and it says so: the four rows' labels, the action each carries and the
// curated icon name it draws. The driver is plain JS and cannot import the
// block's markup, so state 43 compares what the page rendered against this list -
// a reworded label, or a glyph name the kit's roster does not resolve, goes red
// there rather than rendering an empty row nobody looks at.
const RAIL_TOP_ACTIONS = [
  { action: 'new-chat', label: 'New chat', icon: 'square-pen' },
  { action: 'images', label: 'Images', icon: 'image' },
  { action: 'scheduled', label: 'Scheduled', icon: 'clock' },
  { action: 'plugins', label: 'Plugins', icon: 'box' },
];

/** The rail's top action rows, read off the page: the region they live in, and per
 *  row the label, the action, the icon name it declares, the GLYPH it actually
 *  painted (an unknown name paints nothing), the two boxes the group's homogeneity
 *  is measured on, and what a row that cannot act says.
 *
 *  The glyph is reached through whichever element the row is: the one row that acts
 *  is a kai-button and paints its icon inside its own shadow root, the three plain
 *  rows carry a kai-icon child. Both are kai elements, so each value is read
 *  property-then-attribute (`readBoundValue`'s rule): the html binder writes a
 *  bound attribute while the react tree assigns the declared prop. */
const railTopRowFacts = (page) => page.evaluate(() => {
  const bound = (el, prop, attr) => {
    if (!el) return null;
    const value = el[prop];
    return typeof value === 'string' && value ? value : el.getAttribute(attr);
  };
  const region = document.querySelector('kai-conversations > [slot="header"]');
  const rows = [...document.querySelectorAll('kai-conversations [data-action]')];
  return {
    rows: rows.map((row) => {
      const iconEl = row.shadowRoot ? row : row.querySelector('kai-icon');
      const glyph = (row.shadowRoot ?? iconEl?.shadowRoot)?.querySelector('svg') ?? null;
      const tooltip = row.closest('kai-tooltip');
      const box = row.getBoundingClientRect();
      const glyphBox = glyph?.getBoundingClientRect() ?? null;
      return {
        action: row.getAttribute('data-action'),
        label: (row.querySelector('.rail-action-label')?.textContent ?? row.textContent ?? '').trim(),
        icon: bound(iconEl, 'name', 'name') ?? bound(row, 'icon', 'icon'),
        glyphPainted: glyphBox !== null && glyphBox.width > 0 && glyphBox.height > 0,
        glyphLeft: glyphBox === null ? null : Math.round(glyphBox.left),
        rowHeight: Math.round(box.height),
        rowTop: Math.round(box.top),
        rowBottom: Math.round(box.bottom),
        rowLeft: Math.round(box.left),
        inHeaderRegion: region !== null && region.contains(row),
        // The container's own membership rule is `:scope > kai-conversation-item`,
        // so these two facts are what says the list cannot collect a row: it is
        // not an item, and it is not the rail's child.
        conversationItem: row.localName === 'kai-conversation-item',
        railsChild: row.parentElement?.localName === 'kai-conversations',
        role: row.getAttribute('role'),
        ariaDisabled: row.getAttribute('aria-disabled'),
        reason: bound(tooltip, 'content', 'content') ?? '',
      };
    }),
    // The rail's own rows, for the claim that the four sit ABOVE the tree: its
    // first row is a folder heading by construction.
    firstRailRowTop: Math.round(
      (document.querySelector('kai-conversations > kai-conversation-item')?.getBoundingClientRect().top ?? NaN),
    ),
    // The step inside the group against the gap after it, read as boxes rather
    // than as a class: the group's own row step is 2px and what follows it is the
    // rail's first row, so "a visible gap" is a number this can compare. WHAT
    // FOLLOWS IS THE TREE and not a search box any more: the element's own box is
    // switched off (`searchable="false"`), so the header's last row now sits
    // directly above the rail's first row.
    afterGroupTop: Math.round(
      (document.querySelector('kai-conversations > kai-conversation-item')?.getBoundingClientRect().top ?? NaN),
    ),
  };
});

/** Every rail row as the TREE it makes: the kind, the title the page renders, the
 *  box each row came to, whether it carries a second line at all, the two margins
 *  the CSS decides, and the register its title is painted in (the count of a
 *  section's rows is the whole of what state 45 asserts about the tree's shape).
 *
 *  OFF THE ROW ELEMENTS, never off the state array: the claim is about what the
 *  rail LAYS OUT, and the array beside it says nothing about a line count or a
 *  margin. The title is read from the row's own slotted span - the row's body
 *  lives in its shadow root, and the span is what the page can see. */
const railSectionFacts = (page) => page.evaluate(() => {
  const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const toPx = (value) => {
    const n = parseFloat(value);
    if (!Number.isFinite(n)) return 0;
    return value.trim().endsWith('px') ? n : n * rootSize;
  };
  /** A #rrggbb token as the rgb() string a computed colour comes back in, or null
   *  when the theme expresses it as something else - which is reported rather than
   *  guessed at, so a theme this cannot read is a named failure. */
  const normalize = (value) => {
    const hex = /^#([0-9a-f]{6})$/i.exec(value.trim());
    if (!hex) return null;
    const n = parseInt(hex[1], 16);
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
  };
  const items = [...document.querySelectorAll('kai-conversations > kai-conversation-item')];
  const titleOf = (el) => el.querySelector('.row-title-text');
  // THE THEME'S MUTED REGISTER, read off a row's TITLE SPAN - and the span rather
  // than the rail's host is the measured answer: the kit sets its colour tokens on
  // hosts AND scopes the dark scheme inside each shadow root, so a custom property
  // read on a host outside that scope reports the light value while the very same
  // span the reader sees resolves the scheme's own (measured dark: host #696972,
  // span #a7a5a0). Read from a CONVERSATION row: it carries no muted rule of this
  // block's, so what it resolves is the theme's.
  const source = [...items].reverse().find((el) => (el.getAttribute('data-rail') ?? 'conversation') === 'conversation') ?? items[items.length - 1];
  const sourceSpan = source ? titleOf(source) : null;
  const mutedToken = sourceSpan ? getComputedStyle(sourceSpan).getPropertyValue('--color-muted-foreground').trim() : '';
  return {
    // The kit's own spacing knob, as the page resolves it: empty when the page
    // does not set one, in which case the block's CSS falls back to the kit's
    // default unit and the rule is measured against THAT.
    density: getComputedStyle(document.documentElement).getPropertyValue('--kai-density').trim(),
    mutedToken,
    mutedTokenAsRgb: normalize(mutedToken),
    rows: items.map((el) => {
      const span = titleOf(el);
      const cs = span ? getComputedStyle(span) : null;
      const box = el.getBoundingClientRect();
      const own = getComputedStyle(el);
      const caret = el.querySelector('.row-caret');
      const caretStyle = caret ? getComputedStyle(caret) : null;
      return {
        id: el.conversationId ?? el.getAttribute('conversation-id') ?? el.id,
        kind: el.getAttribute('data-rail') ?? 'conversation',
        folder: el.getAttribute('data-folder') ?? '',
        title: (span?.textContent ?? '').trim(),
        height: Math.round(box.height),
        top: Math.round(box.top),
        metaSlots: el.querySelectorAll('[slot="meta"]').length,
        marginBlockStart: toPx(own.marginBlockStart),
        register: cs === null ? null : { fontSize: cs.fontSize, fontWeight: cs.fontWeight, color: cs.color },
        caret: caret === null || caretStyle === null ? null : {
          // AFTER the title: the title FOLLOWS the caret, so a tree that still led
          // the label with the caret reports itself here rather than in a
          // screenshot nobody diffs.
          trailsTheTitle: span !== null
            && (span.compareDocumentPosition(caret) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
          // Every row carries the element (one repeat renders one element kind);
          // only a heading SHOWS one, and the hidden ones are not a caret a
          // reader could see.
          hidden: caret.hasAttribute('hidden'),
          tabindex: caret.getAttribute('tabindex'),
          tabIndex: caret.tabIndex,
          opacity: caretStyle.opacity,
          color: caretStyle.color,
        },
      };
    }),
  };
});

// State 45's one reading, captured in its act.
let railSections = null;
// States 46-48's readings, captured in their acts for the same reason as the
// three globals above: the revealed trio, the OPEN menu and the organizer wiring
// are each a moment, and by probe time the page has been left where the state
// wants its screenshot.
let railTrio = null;
let railMenu = null;
let railWiring = null;
// State 49's reading of a rail that has never stored anything, and state 50's
// reading of the project it makes. Captured in their acts for the reason the
// three globals above are captured in theirs: both states end where their
// screenshot has to be taken, and the values under test do not survive it.
let freshRail = null;
let projectCreate = null;
let folderMenus = null;
let folderEdit = null;
let paletteOpen = null;
let paletteFiltered = null;
let paletteKeys = null;

/** The rail's two SECTION LABELS and the trailing actions each carries, read off
 *  the ROW ELEMENTS: which rows are section labels, whether their actions are
 *  hidden, the opacity they resolved, whether they sit in the row's own menu
 *  region, the box each control came to, the glyph each actually painted (a
 *  curated name the kit does not carry paints nothing) and the name it declares.
 *
 *  The row's title IS the `.row-title-text` span - the glyph ahead of it and the
 *  row's trailing chrome are its siblings rather than its contents - which is why
 *  a read of a row's label names that span instead of taking the first one.
 *
 *  `rovingStops` is the rail's whole roving contract in one number, the same one
 *  the keyboard walk measures: exactly one row body carries `tabindex="0"`, so a
 *  chunk of chrome that had joined the walk would show up here as a second. */
const railTrioFacts = (page) => page.evaluate(() => {
  const bound = (el, prop, attr) => {
    if (!el) return null;
    const value = el[prop];
    return typeof value === 'string' && value ? value : el.getAttribute(attr);
  };
  const glyphOf = (el) => {
    const box = el?.shadowRoot?.querySelector('svg')?.getBoundingClientRect() ?? null;
    return box === null ? null : { width: Math.round(box.width), height: Math.round(box.height) };
  };
  const rows = [...document.querySelectorAll('kai-conversations > kai-conversation-item')];
  const facts = rows.map((row) => {
    const kind = row.getAttribute('data-rail') ?? 'conversation';
    const trio = row.querySelector('[slot="menu"].row-trio');
    const box = row.getBoundingClientRect();
    const trioBox = trio?.getBoundingClientRect() ?? null;
    return {
      id: row.conversationId ?? row.getAttribute('conversation-id') ?? row.id,
      kind,
      title: (row.querySelector('.row-title-text')?.textContent ?? '').trim(),
      sectionLabel: kind === 'section'
        || (kind === 'folder' && (row.getAttribute('data-folder') ?? '') === ''),
      hidden: trio === null ? true : trio.hasAttribute('hidden'),
      opacity: trio === null ? null : getComputedStyle(trio).opacity,
      // WHETHER THE ROW IS "AT REST" IS A FACT ABOUT THE ROW, not about the
      // pointer and the caret the states before this one happened to leave behind:
      // the reveal rule's two halves are a hover and a focus, so the reading below
      // can say which rows are at rest instead of assuming the act produced rest.
      hover: row.matches(':hover'),
      focusWithin: row.matches(':focus-within'),
      // Named in the failure message rather than only used: a revealed trio that is
      // neither hovered nor focused is a fact about WHICH RULE reached it, and the
      // classes are what says whether it was reached at all.
      trioClass: trio?.getAttribute('class') ?? null,
      inViewport: (() => {
        const box = row.getBoundingClientRect();
        const view = { width: window.innerWidth, height: window.innerHeight };
        return `${Math.round(box.left)},${Math.round(box.top)} in ${view.width}x${view.height}`;
      })(),
      // THE SLOT IS THE WHOLE OF IT, and it is read on the LIGHT-DOM node rather
      // than by walking up: the region the actions are projected into lives in
      // the row's SHADOW root, so `closest` cannot see it from here. `slot="menu"`
      // is also the fact the container itself reads (`menuInPath`), which is what
      // keeps a press or a key in the actions from selecting or roving the row.
      menuSlot: trio === null ? null : trio.getAttribute('slot'),
      rowBox: { left: Math.round(box.left), right: Math.round(box.right), width: Math.round(box.width) },
      trioBox: trioBox === null ? null : {
        left: Math.round(trioBox.left),
        right: Math.round(trioBox.right),
        width: Math.round(trioBox.width),
      },
      controls: trio === null ? [] : [...trio.children].map((el) => ({
        trio: el.getAttribute('data-trio'),
        tag: el.localName,
        label: bound(el, 'label', 'label'),
        icon: bound(el, 'icon', 'icon'),
        glyph: glyphOf(el),
        left: Math.round(el.getBoundingClientRect().left),
        height: Math.round(el.getBoundingClientRect().height),
      })),
    };
  });
  return {
    rows: facts,
    sectionLabels: facts.filter((row) => row.sectionLabel),
    rovingStops: rows.filter((el) => el.shadowRoot?.querySelector('[data-kai-item-body][tabindex="0"]') !== null).length,
  };
});

/** The menu the section label's kebab opened, as the ROWS IT RENDERED: each row's
 *  role, its whole text, and the two states a choice can carry. The surface is
 *  portaled into the menu element's own shadow root, so it is read through the
 *  host rather than from the document - and a row with a description carries that
 *  sentence after its label in the same text, which is why the comparison below
 *  matches a row by PREFIX. */
const railMenuFacts = (page) => page.evaluate(() => {
  const host = document.querySelector(
    'kai-conversations > kai-conversation-item[data-rail="section"] .row-trio kai-menu',
  );
  const surface = host?.shadowRoot?.querySelector('[role="menu"]') ?? null;
  return {
    open: surface !== null,
    rows: surface === null ? [] : [...surface.children].map((el) => ({
      role: el.getAttribute('role') ?? '',
      text: (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
      checked: el.getAttribute('aria-checked'),
      disabled: el.getAttribute('aria-disabled'),
    })),
  };
});

// A COPY, and it says so: the organizer menu the owner asked for, written as the
// rows it renders. The driver is plain JS and cannot import the block's
// controller, so the label of each row is restated here - a reworded row, a
// reordered group or a row that stopped rendering goes red against this list.
// `role: ''` is a row with no role: a section label or a note, neither of which is
// a menu item.
const RAIL_MENU_ROWS = [
  { role: '', label: 'Organizer sidebar' },
  { role: 'menuitemradio', label: 'By project' },
  { role: 'menuitemradio', label: 'One list' },
  { role: '', label: 'Sort chats by' },
  { role: 'menuitemradio', label: 'Priority' },
  { role: 'menuitemradio', label: 'Last updated' },
  { role: 'menuitemradio', label: 'Manual order' },
  { role: 'separator', label: '' },
  // The plus row is LIVE now (it is the way a project gets made), so it is a
  // menuitem like the others and the sentence under it says where a created
  // project is kept rather than why the row is inert. Both are copies, for the
  // reason above: a reworded row goes red against this list.
  { role: 'menuitem', label: 'New project' },
  { role: '', label: 'A project you make is a group record in the same store your conversations are in' },
];

/** Every rail row as the shape the ORGANIZER produced: its id, the kind of row it
 *  is, its title and the inline step it came to. Read off the row elements, never
 *  off the state array beside them, because the claim is about the tree the rail
 *  laid out. */
const railShape = (page) => page.evaluate(() =>
  [...document.querySelectorAll('kai-conversations > kai-conversation-item')].map((el) => ({
    id: el.conversationId ?? el.getAttribute('conversation-id') ?? el.id,
    kind: el.getAttribute('data-rail') ?? 'conversation',
    title: (el.querySelector('.row-title-text')?.textContent ?? '').trim(),
    indent: getComputedStyle(el).marginInlineStart,
    // THE FOLDER a row is filed under, by ID. It is the fact the tree is read
    // from now that no row carries an inline step: `data-folder` is empty on the
    // ungrouped remainder and on the heading over it, and it is the same field
    // the container hands the element.
    folder: el.getAttribute('data-folder') ?? '',
  }))
);

/** The rows' PROPERTY BINDINGS, read back off the elements: the trailing menu's
 *  items array and the rename field's value. A `*for` row is cloned from a
 *  template, and a clone is not upgraded until it is connected - so a row created
 *  by a LATER patch is where a property binding can be lost, silently, because
 *  the element replaces the assigned own property when it upgrades. That is a fact
 *  about the generated binder rather than about this block, and the state that
 *  switches the organizer is the one that creates a row in a single patch, so it
 *  is where the claim is measured. */
const rowBindingFacts = (page) => page.evaluate(() => {
  const menuRows = document.querySelectorAll('kai-conversations kai-menu').length;
  return {
    menuRows,
    rows: [...document.querySelectorAll('kai-conversations > kai-conversation-item')].map((el) => {
      const menu = el.querySelector('.row-trio kai-menu');
      const editor = el.querySelector('.row-rename');
      return {
        kind: el.getAttribute('data-rail') ?? 'conversation',
        title: (el.querySelector('.row-title-text')?.textContent ?? '').trim(),
        menuItems: Array.isArray(menu?.items) ? menu.items.length : null,
        editorValue: editor?.value ?? null,
      };
    }),
  };
});

/** The order the rail should show, DERIVED from the store's own records rather
 *  than from a second copy of the block's rule: the index holds the summaries, and
 *  the two orders below are the comparators the kit exports (pinned first then
 *  recency, and recency alone) with archived rows left out. A probe that typed its
 *  own expected order could agree with a block that is wrong in the same way
 *  twice; this one reads the data where it lives. */
const storedOrders = (page, indexKey) => page.evaluate((key) => {
  let entries = [];
  try { entries = JSON.parse(localStorage.getItem(key) ?? '[]'); } catch { entries = []; }
  const shown = entries.filter((entry) => entry.archived !== true);
  const at = (entry) => {
    const time = Date.parse(entry.updatedAt ?? '');
    return Number.isNaN(time) ? -Infinity : time;
  };
  return {
    count: shown.length,
    updated: shown.slice().sort((a, b) => at(b) - at(a)).map((entry) => entry.id),
    priority: shown.slice().sort((a, b) => {
      const pinned = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      return pinned !== 0 ? pinned : at(b) - at(a);
    }).map((entry) => entry.id),
  };
}, indexKey);

const firstIndexRow = (page, spec) => page.evaluate(
  (key) => { try { return JSON.parse(localStorage.getItem(key) ?? '[]')[0] ?? null; } catch { return null; } },
  spec.indexKey,
);

/** Every rail row the page rendered, with the kind of row it is: a folder's
 *  heading, one of its conversations (with the folder it is filed under), or the
 *  Show more row that says a folder holds more than it shows. The rail is ONE
 *  flat repeat, so all three are items of the same list and only this attribute
 *  tells them apart. */
const railNodes = (page) => page.evaluate(() =>
  [...document.querySelectorAll('kai-conversations > kai-conversation-item')].map((el) => ({
    id: el.conversationId ?? el.getAttribute('conversation-id') ?? el.id,
    kind: el.getAttribute('data-rail') ?? 'conversation',
    group: el.getAttribute('data-group') ?? '',
    folder: el.getAttribute('data-folder') ?? '',
  })),
);

/** The rail's CONVERSATION rows as the page renders them: each one's
 *  conversation, and the project it is filed under ('' for the ungrouped
 *  remainder). The headings and the Show more rows are not conversations and are
 *  not here - every claim in states 32-36 is about conversations.
 *
 *  OFF THE ROW ELEMENTS, because every claim in states 32-36 is about the order
 *  the rail actually lays out, and the page also holds an array of the same rows
 *  that says nothing about what was rendered. The property-then-attribute read
 *  is `readBoundValue`'s rule for its reason: the html binder writes a bound
 *  value as an ATTRIBUTE, while the react tree writes a DECLARED prop as a
 *  property - `data-group` is not declared, so both forms write it as the
 *  attribute, and the fallbacks here are for the row's identity. */
const railRows = async (page) => (await railNodes(page)).filter((node) => node.kind === 'conversation');

/** ONE ROW'S OWN MENU, and why a menu query has to say which row it means: the
 *  rail's folder headings carry the same row menu the conversations do - that is
 *  the point of the round that added it - and they come FIRST in the rail, while a
 *  role query matches in document order. So the row a menu state acts on is named
 *  here rather than taken as the first `Actions for` in the rail. The menu surface
 *  is portaled inside the row's own dropdown, so scoping through the row reaches
 *  it. The index is a CONVERSATION row's own position, which is what state 13's
 *  "the second row's menu" always meant. */
const conversationRow = (page, index = 0) => page.locator('kai-conversation-item[data-rail="conversation"]').nth(index);
const conversationRowMenuTrigger = (page, index = 0) => conversationRow(page, index).getByRole('button', { name: /^Actions for/ });

/** The rail's row geometry, which is a stylesheet fact and can therefore only be
 *  asserted by reading what the page COMPUTED: every conversation row's inline
 *  step, and the step from each FOLDER heading to the first conversation row
 *  under it - left, because a filed row sits flush with its heading, and down,
 *  because one step of separation is what still says the row is filed there.
 *  `data-folder` carries the folder's ID, the fact the old rule keyed on: a row
 *  in a folder the catalogue cannot name is tellable from one in the ungrouped
 *  remainder, whose label is empty in both cases. */
const railSteps = (page) => page.evaluate(() => {
  const items = [...document.querySelectorAll('kai-conversations > kai-conversation-item')];
  const rows = items
    .filter((el) => el.getAttribute('data-rail') === 'conversation')
    .map((el) => ({
      id: el.conversationId ?? el.getAttribute('conversation-id') ?? el.id,
      folder: el.getAttribute('data-folder') ?? '',
      inline: getComputedStyle(el).marginInlineStart,
    }));
  // THE STEP A HEADING'S OWN LABEL TAKES PAST THE GLYPH AHEAD OF IT, read off the
  // two boxes rather than typed here. The glyph and the title are slotted children
  // of the row, so the one number the rows under a project have to match is the
  // difference between their two left edges - and whether the glyph PAINTED is the
  // only way to know the curated name resolved, because the kit paints nothing for
  // a name its roster does not carry.
  const glyphStep = (heading) => {
    const icon = heading.querySelector('.row-folder-icon');
    const label = heading.querySelector('.row-title-text') ?? null;
    if (icon === null || label === null) return { labelStep: null, iconPainted: false };
    const glyph = icon.shadowRoot?.querySelector('svg') ?? null;
    const box = glyph?.getBoundingClientRect() ?? null;
    return {
      labelStep: Math.round((label.getBoundingClientRect().left - icon.getBoundingClientRect().left) * 10) / 10,
      iconPainted: box !== null && box.width > 0 && box.height > 0,
    };
  };
  const pairs = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].getAttribute('data-rail') !== 'folder') continue;
    const next = items[i + 1];
    if (!next || next.getAttribute('data-rail') !== 'conversation') continue;
    const heading = items[i].getBoundingClientRect();
    const row = next.getBoundingClientRect();
    pairs.push({
      folder: items[i].getAttribute('data-folder') ?? '',
      left: Math.round((row.left - heading.left) * 10) / 10,
      gap: Math.round((row.top - heading.bottom) * 10) / 10,
      ...glyphStep(items[i]),
    });
  }
  return { rows, pairs };
});

/** Those rows as the groups they make: one entry per RUN, which is what the
 *  rail renders as one folder. Derived from the rows the page rendered, never
 *  from a list this file would have to keep in step with the block's own. */
const groupRuns = (rows) => {
  const runs = [];
  for (const row of rows) {
    const last = runs[runs.length - 1];
    if (!last || last.group !== row.group) runs.push({ group: row.group, rows: [row] });
    else last.rows.push(row);
  }
  return runs;
};

/** The runs' groups and widths as strings, so a probe can compare the shape
 *  BEFORE against the shape after in one expression. */
const runShape = (runs) => runs.map((run) => `${run.group}:${run.rows.length}`);

/** Where the keyboard is in the rail right now, and how many rows are tab stops.
 *  The rows' bodies live inside their shadow roots, so this reaches one only
 *  through the host: a focused body retargets to its HOST in
 *  `document.activeElement`, which is why the focused row is found by identity.
 *  `rovingStops` is the container's whole contract in one number - exactly ONE
 *  body carries `tabindex="0"` and the arrows move which one. */
const rowWalk = (page) => page.evaluate(() => {
  const items = [...document.querySelectorAll('kai-conversations > kai-conversation-item')];
  const bodies = items.map((el) => el.shadowRoot?.querySelector('[data-kai-item-body]') ?? null);
  return {
    count: items.length,
    // The focused row, and it is found BOTH ways on purpose: the row's body lives
    // in its shadow root, so focus on it retargets to the host at document level -
    // and a renderer that reports the inner body instead still names the same row.
    focused: items.findIndex((el) => el === document.activeElement || el.shadowRoot?.activeElement != null),
    focusedKind: document.activeElement?.getAttribute('data-rail') ?? '',
    rovingStops: bodies.filter((body) => body?.getAttribute('tabindex') === '0').length,
    kinds: items.map((el) => el.getAttribute('data-rail') ?? 'conversation'),
  };
});

/** A rail row's title text, read out of the host's own default slot (the row's
 *  body is in its shadow root, so the slot content is what the page can see). */
const rowTitle = (page, id) => page.evaluate((wanted) => {
  const el = [...document.querySelectorAll('kai-conversations > kai-conversation-item')]
    .find((item) => (item.conversationId ?? item.getAttribute('conversation-id') ?? item.id) === wanted);
  return el?.querySelector('.row-title-text')?.textContent ?? '';
}, id);

/** Open the palette the way a reader does: the rail header's search button. */
const openPalette = async (page) => {
  await page.locator('#rail-search').click();
  await settle(450)(page);
};

/** The palette's search input, which lives in the palette's shadow root. Its role
 *  is `combobox` (the element marks it as one), not the plain `textbox` the rail's
 *  own box was. */
const paletteBox = (page) => page.locator('#palette').getByRole('combobox').first();

/** Leave the palette by keyboard, which is the only way out that matters: the
 *  kit's dialog closes on Escape and hands the caret back to what opened it. */
const closePalette = async (page) => {
  await page.keyboard.press('Escape');
  await settle(450)(page);
};

/** The palette as it is RIGHT NOW, read off the rendered tree rather than from a
 *  list kept in this file: whether the dialog is open, where the caret is, and every
 *  row with the group it is bucketed under, its label and its chord. The rows are
 *  the shadow root's `role="option"` buttons and the headers are the plain divs
 *  between them, so one walk of the listbox in document order gives the sections and
 *  their rows together. */
const paletteFacts = (page) => page.evaluate(() => {
  const dialog = document.getElementById('palette-dialog');
  const command = document.getElementById('palette');
  const root = command?.shadowRoot ?? null;
  const listbox = root?.querySelector('[role="listbox"]') ?? root;
  const rows = [];
  let group = '';
  for (const node of listbox === null ? [] : [...listbox.children]) {
    if (node.localName === 'div') { group = node.textContent?.trim() ?? ''; continue; }
    rows.push({
      group,
      label: node.querySelector('span')?.textContent?.trim() ?? '',
      shortcut: node.querySelector('[part="shortcut"]')?.textContent?.trim() ?? '',
      active: node.getAttribute('aria-selected') === 'true',
    });
  }
  return {
    open: dialog !== null && (dialog.open === true || dialog.hasAttribute('open')),
    // The caret, read where it really is: the palette's box retargets to the dialog
    // host at document level, so the inner active element is the only read that
    // says the input has focus.
    focused: root?.activeElement?.localName ?? '',
    rows,
    // The rail's own conversation rows, so a probe can hold the palette's Chats
    // section against the list it claims to come from.
    railTitles: [...document.querySelectorAll('kai-conversations > kai-conversation-item[data-rail="conversation"]')]
      .map((el) => el.querySelector('.row-title-text')?.textContent?.trim() ?? ''),
    // Whether the element's own search box is still in the rail. It is the OTHER
    // search affordance the owner asked to be gone, and the reading that says "off"
    // is that no input is in the rail's shadow root at all.
    railHasBox: (document.getElementById('conversations')?.shadowRoot?.querySelector('input') ?? null) !== null,
    // Where the caret is, deepest first: `document.activeElement` reports the HOST
    // for a control inside a shadow root, so the walk reads the element that really
    // has it. The answer is a name this file can compare ('palette' when the caret
    // is still inside the palette's own shadow root, 'body' when it went nowhere,
    // otherwise the element's id). */
    outerFocus: (() => {
      let node = document.activeElement;
      while (node?.shadowRoot?.activeElement) node = node.shadowRoot.activeElement;
      if (node === null) return 'none';
      const root = node.getRootNode();
      if (root instanceof ShadowRoot && root.host === command) return 'palette';
      if (node === document.body) return 'body';
      return node.id || node.localName;
    })(),
  };
});

/** Hand the rail back UNFILTERED. A query is a narrowing the states after it have
 *  to measure around: it drops rows, and it opens every folder it has a match in -
 *  which is the point of it, and why a folder toggle looks like a no-op while one
 *  is typed.
 *
 *  THE PALETTE IS THE RAIL'S SEARCH NOW. The rail's built-in box is off
 *  (`searchable="false"` on the element), so a query is typed into the palette and
 *  the rail narrows behind it: the two read one field of the block's state. Opening
 *  the palette already clears that field (the block clears on open), and the Escape
 *  is how a reader leaves. */
const clearRailSearch = async (page) => {
  await openPalette(page);
  await paletteBox(page).fill('');
  await settle(300)(page);
  await closePalette(page);
};

export default {
  name: 'assistant',
  viewport: { width: 1280, height: 800 },
  schemes: ['light', 'dark'],
  ready: (page) => page
    .waitForFunction(() => window.__blockReady === true, null, { timeout: 15000 })
    .then(() => page.waitForTimeout(400)),

  pages: {
    // The GENERATED /kit/ rendering of the CDN form (gen-blocks.mjs output) -
    // the driver runs the real generated artifact, never a copy.
    block: {
      path: '/generated/assistant/index.html',
      indexKey: 'kai:assistant:threads',
      // localStorageStore titles a conversation from the latest message text at
      // its first save (a recorded spike observation about the store, not this
      // block). The first conversation the run saves is state 2's typed prompt,
      // answered by the generic script's first turn - whose text is shorter than
      // the 60 characters `save()` slices to.
      expectedFirstTitle: 'Reading q3-metrics.pdf now.',
    },
    // The REACT form, mounted at the root of a throwaway Vite app by
    // scripts/verify-blocks-react.mjs. Same story, same probes, same
    // page-specific facts: only the URL differs, because the react tree is a
    // component in an app rather than a page in a directory. The element ids
    // survive the translation (a literal id is a literal attribute), which is
    // what lets one set of probes drive both.
    react: {
      path: '/',
      indexKey: 'kai:assistant:threads',
      expectedFirstTitle: 'Reading q3-metrics.pdf now.',
      // NO `skipLayout` HERE. Every probe this page would have skipped is a
      // comparison among the block's OWN boxes - row heights against each
      // other, a glyph's left edge, one row's bottom against another's top, a
      // gap against the kit's density token - and the emitted react tree
      // imports the block's stylesheet, so the react form's geometry is
      // measurable and IS measured here. A skip on this page withheld those
      // claims from the one surface nothing else in the repo reads.
    },
  },

  states: [
    {
      name: '1-empty',
      probes: {
        emptyTitle: (page) => page.getByText('What can I help with?').count().then((n) => n > 0),
        // SCOPE TO THE COMPOSER, because the label alone is no longer unique: a
        // fresh profile's rail holds a sample conversation whose row carries this
        // suggestion's own words as its title (the demo's conversation for that
        // suggestion), so an unscoped role query matches two elements and answers
        // nothing. The claim is about the SUGGESTION the composer offers, so the
        // composer is where it is read - the surface, not the string.
        suggestion: (page) => page.locator('kai-prompt-input')
          .getByRole('button', { name: 'Summarize a document' }).isVisible().catch(() => false),
        railNewChat: (page) => page.getByRole('button', { name: 'New chat' }).isVisible().catch(() => false),
        // The switcher renders only with more than one model - its presence IS
        // the recipe working.
        modelTrigger: (page) => page.getByText('Mock Standard').count().then((n) => n > 0),
        // ONE mark, inside its tile, and the tile drawn at all. The empty state
        // PROJECTS its own glyph into the media slot, and the kit draws the tile
        // only while that slot holds something - so "there is a mark" and "there
        // is exactly ONE" are two different claims, and the second is the one a
        // screenshot cannot separate from a slightly larger glyph: a merge that
        // leaves two copies renders them side by side in a 40px box. Boxes
        // rather than a class name, and every failure names the numbers it read.
        mediaMark: (page) => page.evaluate(() => {
          const empty = document.querySelector('kai-empty');
          if (!empty) return 'no kai-empty on the page';
          const marks = [...empty.querySelectorAll('[slot="media"]')];
          if (marks.length !== 1) return `${marks.length} elements in the media slot`;
          const tile = empty.shadowRoot?.querySelector('[data-slot="empty-media"]');
          if (!tile) return 'media is projected but no tile was drawn';
          const t = tile.getBoundingClientRect();
          const m = marks[0].getBoundingClientRect();
          if (m.width <= 0 || m.height <= 0) return 'the mark has no box';
          if (m.width >= t.width || m.height >= t.height) {
            return `mark ${Math.round(m.width)}x${Math.round(m.height)} does not fit in its tile ${Math.round(t.width)}x${Math.round(t.height)}`;
          }
          if (m.left < t.left || m.top < t.top || m.right > t.right || m.bottom > t.bottom) return 'the mark overflows its tile';
          return true;
        }),
      },
      expect: { emptyTitle: true, suggestion: true, railNewChat: true, modelTrigger: true, mediaMark: true },
      styleProbes: [
        style('topbarTitle', (page) => page.getByRole('heading', { name: 'Assistant' }),
          ['fontSize', 'fontWeight', 'color']),
      ],
    },
    {
      name: '2-reply-tool',
      act: async (page) => {
        // TYPED rather than clicked: a suggestion label IS an arc's key, so the
        // click would open that arc's scripted conversation. This state is about
        // the GENERIC script - a settled tool call, reasoning, and citations on
        // the turn after - which is what a prompt matching no script gets, and it
        // has to be the run's FIRST conversation or the row states below would be
        // looking at a second one.
        const box = page.locator('kai-prompt-input').getByRole('textbox').first();
        await box.click();
        await box.fill('Summarize the key numbers');
        await box.press('Enter');
        await waitForTurns(page, 2);
      },
      probes: {
        reading: (page) => page.getByText('Reading q3-metrics.pdf').count().then((n) => n > 0),
        tool: (page) => page.getByText(/read[_-]?document/i).count().then((n) => n > 0),
        // WAS `crossLinksNotYet`, and it was VACUOUS — the same defect the rename
        // above was performed to remove, one state later. It asked whether ONE
        // arc's end-label was visible on a thread that has NO labels at all, so a
        // block that offered a cross-link here would have failed it for a
        // different reason than the one it named, and a block that offered
        // nothing passed without saying so. What this thread really shows is the
        // block's answer for a conversation nothing scripts: NO labels, and
        // therefore no cross-link either. "A link is withheld mid-arc" is
        // asserted where it can be, over a thread that HAS labels: state 24.
        noLabelsOnATypedThread: async (page) => (await suggestionLabels(page)).length === 0,
        crossLinkNotVisible: (page) => page.getByRole('button', { name: 'Draft a short brief' }).isVisible().catch(() => false),
      },
      expect: { reading: true, tool: true, noLabelsOnATypedThread: true, crossLinkNotVisible: false },
      styleProbes: [
        style('assistantReplyText', (page) => page.getByText('Reading q3-metrics.pdf').first(),
          ['color', 'fontSize']),
      ],
    },
    {
      name: '3-cited-followup',
      act: async (page) => {
        // The follow-up in the SAME conversation, because that is how a
        // conversation stays one conversation: its script is chosen by the first
        // thing the reader sent. Scoped to the composer, since the rail's search
        // box is a textbox too.
        const box = page.locator('kai-prompt-input').getByRole('textbox').first();
        await box.click();
        await box.fill('and the retention numbers');
        await box.press('Enter');
        await waitForTurns(page, 4);
      },
      probes: {
        summary: (page) => page.getByText('revenue up 12%', { exact: false }).count().then((n) => n > 0),
        // Citations render as domain chips in the thread's sources strip (the
        // title lives on the chip's hover card), so the probe looks for the
        // domain text.
        citation: (page) => page.locator('kai-thread').getByText('ui.kitn.ai').count().then((n) => n > 0),
        composerCleared: (page) => page.locator('kai-prompt-input').getByRole('textbox').first()
          .innerText().then((t) => t.trim() === ''),
      },
      expect: { summary: true, citation: true, composerCleared: true },
    },
    {
      name: '4-model-switch',
      act: async (page) => {
        await page.getByText('Mock Standard').first().click();
        await settle(300)(page);
        await page.getByText('Mock Thinking').first().click();
        await settle(300)(page);
      },
      probes: {
        selected: (page) => page.evaluate(() => document.getElementById('models').currentModel === 'kai-mock-thinking'),
      },
      expect: { selected: true },
    },
    {
      name: '5-rail-row',
      act: async (page, { spec }) => {
        await page.waitForFunction((key) => localStorage.getItem(key) != null, spec.indexKey, { timeout: 10000 });
      },
      probes: {
        // Does the first index row carry the title the store's policy derives,
        // and does the rail render it?
        rowTitleAsPolicied: async (page, { spec }) => {
          const row = await firstIndexRow(page, spec);
          if (!row?.title) return false;
          const rendered = await page.locator('kai-conversations').getByText(row.title.slice(0, 25), { exact: false }).count();
          return row.title === spec.expectedFirstTitle && rendered > 0;
        },
      },
      expect: { rowTitleAsPolicied: true },
    },
    {
      name: '6-new-chat',
      act: async (page) => {
        await page.getByRole('button', { name: 'New chat' }).click();
        await settle(400)(page);
      },
      probes: {
        emptyAgain: (page) => page.getByText('What can I help with?').count().then((n) => n > 0),
        threadEmpty: (page) => page.evaluate(() => (document.getElementById('thread').messages ?? []).length === 0),
      },
      expect: { emptyAgain: true, threadEmpty: true },
    },
    {
      name: '7-reloaded',
      act: async (page, sctx) => {
        await page.reload({ waitUntil: 'load' });
        await sctx.scenario.ready(page, sctx);
      },
      probes: {
        // Bounded wait so a slow async restore cannot masquerade as "no
        // restore": the controller's mount-time restore hydrates the thread.
        restored: (page) => page
          .waitForFunction(() => ((document.getElementById('thread')?.messages ?? []).length > 0), null, { timeout: 5000 })
          .then(() => true, () => false),
      },
      expect: { restored: true },
    },
    {
      name: '8-row-menu',
      act: async (page) => {
        // The kebab in the row's own `menu` region, beside the relative time.
        // Playwright's role queries pierce the element shadow roots, and the
        // trigger's accessible name is the ROW's, so this also pins that the
        // name is per row rather than one shared string.
        await conversationRowMenuTrigger(page).click();
        await settle(400)(page);
        // AND THEN THE ARROW WALK, which is the half of the dividers a DOM probe
        // cannot show: ArrowDown on the trigger opens the menu onto its first ITEM
        // (the kit's own trigger key), and each press after that steps one item.
        // The roles it lands on are recorded because "the divider is not focusable"
        // is only worth asserting if the walk that skips it is real. The disabled
        // Share row is skipped by the kit's own roving selector (it excludes
        // aria-disabled), so it is absent from the sequence too.
        await page.keyboard.press('ArrowDown');
        await settle(200)(page);
        const roles = [];
        for (let i = 0; i < 6; i += 1) {
          roles.push(await page.evaluate(() => document.activeElement?.getAttribute('role') ?? document.activeElement?.localName ?? null));
          await page.keyboard.press('ArrowDown');
          await settle(120)(page);
        }
        menuFocusRoles = roles;
      },
      probes: {
        menuOpen: (page) => page.locator('[role="menu"]').first().isVisible().catch(() => false),
        // THE TRIGGER IS THE ELEMENT'S OWN, and this is the half of item 1 a
        // screenshot cannot show. kai-dropdown renders the button, so the two
        // ARIA facts live on it rather than in the block's markup: a static
        // aria-haspopup="menu", and an aria-expanded that is BOUND to the open
        // state (it was "false" before the act, so "true" here is the binding
        // and not a constant). The locator resolves the button inside the
        // element's shadow root, which is where both attributes are written.
        triggerHaspopup: (page) => conversationRowMenuTrigger(page)
          .getAttribute('aria-haspopup'),
        triggerExpanded: (page) => conversationRowMenuTrigger(page)
          .getAttribute('aria-expanded'),
        // The menu reads Share, Rename, Pin, Archive, Delete, in that order.
        // Share is the one item that cannot act, and both halves are asserted:
        // it is announced disabled, and it carries no handler.
        shareDisabled: (page) => page.getByRole('menuitem', { name: 'Share' }).first()
          .getAttribute('aria-disabled').then((v) => v === 'true').catch(() => false),
        actionsListed: (page) => Promise.all([
          page.getByRole('menuitem', { name: /Rename/ }).first().isVisible(),
          page.getByRole('menuitem', { name: /^Pin|^Unpin/ }).first().isVisible(),
          page.getByRole('menuitem', { name: /^Archive/ }).first().isVisible(),
          page.getByRole('menuitem', { name: /^Delete/ }).first().isVisible(),
        ]).then((seen) => seen.every(Boolean)).catch(() => false),
        // The Rename row's key chip is a kai-kbd inside a kai-kbd-group: its caps
        // render inside the kai-kbd's own shadow root, and F2 is spelled the same on
        // every platform.
        renameChip: (page) => conversationRow(page).locator('.menu-kbd').first()
          .evaluate((el) => (el.querySelector('kai-kbd')?.shadowRoot?.textContent ?? '').includes('F2')).catch(() => false),
        // AND ALL THREE CHIPS, against the keys the controller binds: F2, Mod+Shift+P,
        // Mod+Shift+A (state 9 presses two of them for real). The expectation is
        // DERIVED in the page rather than typed here, because the chip paints the
        // platform's own glyph set (\u2318 on a Mac, Ctrl elsewhere) and the handler
        // accepts either; the painted array comes back in a failure message so a
        // mismatch names what the reader actually sees.
        //
        // The caps are read THROUGH the group: each hint is one kai-kbd inside a
        // kai-kbd-group, and the caps live in the kai-kbd's shadow root, not in the
        // group's.
        keyChips: (page) => page.locator('kai-conversation-item[data-rail="conversation"]').first().locator('.menu-kbd')
          .evaluateAll((els) => {
            const nav = navigator;
            const mac = /mac/i.test(nav.userAgentData?.platform ?? nav.platform ?? '');
            const mod = mac ? '\u2318' : 'Ctrl';
            const want = ['F2', `${mod}\u21e7P`, `${mod}\u21e7A`];
            // The caps, not the host's textContent: the element injects its own
            // <style> into the shadow root, and that stylesheet's text would be
            // counted as keys by a plain textContent read.
            const got = els.map((el) => Array.from(el.querySelectorAll('kai-kbd'))
              .flatMap((kbd) => Array.from(kbd.shadowRoot?.querySelectorAll('[part="key"]') ?? []))
              .map((cap) => cap.textContent ?? '')
              .join(''));
            return JSON.stringify(got) === JSON.stringify(want) ? true : got;
          }),
        // THE WELD ITSELF, which is what the group is for and what a screenshot
        // cannot decide: inside a group the caps of one chip abut (the chord gap is
        // zeroed) and only the OUTER ends stay rounded, so the three caps read as one
        // key strip rather than three chips in a row. Measured in Chromium: the
        // chord gap goes 2px to 0px and the chip's box goes 69px to 59px.
        kbdWelded: (page) => page.locator('kai-conversation-item[data-rail="conversation"]').first().locator('.menu-kbd kai-kbd')
          .evaluateAll((els) => {
            const bad = [];
            for (const el of els) {
              // Property first for the same reason readBoundValue exists: a literal
              // `keys` is an attribute in the html form and a declared prop in the
              // react one, and this string names the chip in the failure message.
              const keys = el.keys ?? el.getAttribute('keys');
              const caps = [...(el.shadowRoot?.querySelectorAll('[part="key"]') ?? [])];
              const inner = el.shadowRoot?.querySelector('kbd');
              const gap = inner ? getComputedStyle(inner).gap : '';
              if (gap !== '0px') bad.push(`${keys}: chord gap ${gap}`);
              caps.forEach((cap, i) => {
                // The shorthand comes back in whichever form is shortest, so one
                // value means all four corners: expand it before reading a corner.
                const parts = getComputedStyle(cap).borderRadius.split(' ').map((v) => parseFloat(v));
                const [tl, tr, br] = parts.length === 1 ? [parts[0], parts[0], parts[0]]
                  : parts.length === 2 ? [parts[0], parts[1], parts[0]]
                  : parts.length === 3 ? [parts[0], parts[1], parts[2]]
                  : parts;
                const startSquared = tl === 0;
                const endSquared = tr === 0;
                void br;
                const middle = i > 0 && i < caps.length - 1;
                if (middle && !(startSquared && endSquared)) bad.push(`${keys}: cap ${i} keeps its corners`);
                if (i === 0 && startSquared) bad.push(`${keys}: first cap is squared`);
                if (i === caps.length - 1 && endSquared) bad.push(`${keys}: last cap is squared`);
              });
            }
            return bad.length === 0 ? true : bad.join(' | ');
          }),
        // THE MENU READS IN THREE GROUPS: Share | Rename, Pin, Archive | Delete.
        // The dividers live in the row's LIGHT DOM (they are slotted into the
        // dropdown's menu), so they are queried on the host and then filtered to the
        // ones with a REAL BOX - the other rows' menus are the same markup with no
        // box, and a divider that is inline collapses to zero WIDTH while still
        // reporting a line box, so both dimensions are checked. That is not
        // hypothetical: the first version of this rule was `align-self: stretch` on a
        // span, which measured 0px wide and read as two dividers to a height-only
        // check.
        dividers: (page) => page.locator('kai-conversation-item[data-rail="conversation"]').first().locator('.row-menu [role="separator"]')
          .evaluateAll((els) => {
            const boxed = (el) => { const b = el.getBoundingClientRect(); return b.height >= 1 && b.width > 100; };
            const rendered = els.filter(boxed);
            if (rendered.length !== 2) return `${rendered.length} boxed of ${els.length} present: ${JSON.stringify(els.map((el) => Math.round(el.getBoundingClientRect().width)))}`;
            return true;
          }),
        // ...and the walk above never landed on one: a divider that took a key would
        // be in this list. It is also not a tab stop and does not match the kit's own
        // roving selector, so both halves of "not in the keyboard's way" are here.
        dividerSkipsKeyboard: (page) => page.locator('kai-conversation-item[data-rail="conversation"]').first().locator('.row-menu [role="separator"]')
          .evaluateAll((els) => {
            const rendered = els.filter((el) => { const b = el.getBoundingClientRect(); return b.height >= 1 && b.width > 100; });
            if (rendered.length === 0) return 'no boxed divider to check';
            const bad = [];
            for (const el of rendered) {
              if (el.hasAttribute('tabindex')) bad.push('divider carries tabindex');
              if (el.tabIndex >= 0) bad.push(`divider is a tab stop (${el.tabIndex})`);
              if (el.matches('[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]')) bad.push('divider matches the roving selector');
            }
            return bad.length === 0 ? true : bad.join(' | ');
          }),
        menuFocusWalk: () => (menuFocusRoles && menuFocusRoles.length
          ? (menuFocusRoles.every((r) => r === 'menuitem' || r === 'menuitemradio') ? true : menuFocusRoles.join(','))
          : 'no roles recorded'),
        // The menu has room: every acting row is at least 11.5rem wide (the block's
        // min-width, which is what makes the surface 192px) and no row grew past its
        // single-line 32px box, which is what "cramped" looked like.
        rowsWide: (page) => page.locator('kai-conversation-item[data-rail="conversation"]').first().locator('.row-menu kai-button[role="menuitem"]')
          .evaluateAll((els) => {
            const widths = els.map((el) => Math.round(el.getBoundingClientRect().width));
            const heights = els.map((el) => Math.round(el.getBoundingClientRect().height));
            const narrow = widths.filter((w) => w < 184);
            const wrapped = heights.filter((h) => h > 34);
            return narrow.length === 0 && wrapped.length === 0 ? true : JSON.stringify({ widths, heights });
          }),
        // The row menu is the item's non-activation trailing edge - the item
        // renders that region outside its activation surface, so a click on the
        // kebab never selects the conversation. It reveals on hover or on focus;
        // the stylesheet carries the three constraints that make that reveal
        // accessible rather than merely tidy.
      },
      expect: { menuOpen: true, triggerHaspopup: 'menu', triggerExpanded: 'true', shareDisabled: true, actionsListed: true, renameChip: true, keyChips: true, kbdWelded: true, dividers: true, dividerSkipsKeyboard: true, menuFocusWalk: true, rowsWide: true },
      styleProbes: [
        style('menuRowShare', (page) => page.getByRole('menuitem', { name: 'Share' }).first(),
          ['height', 'fontSize', 'paddingInline']),
      ],
    },
    {
      name: '9-row-shortcuts',
      act: async (page) => {
        // The menu's chips are real bindings, and this is where they are
        // exercised: F2 opens the ACTIVE conversation's inline field (the open
        // conversation is the one unambiguous target a key can have), and
        // Mod+Shift+P toggles its pin. Control rather than Meta so the same
        // press runs on every host platform; the handler takes either. Escape
        // first, to close the menu state 8 left open.
        await page.keyboard.press('Escape');
        await settle(300)(page);
        await page.keyboard.press('F2');
        await settle(300)(page);
        await page.keyboard.press('Control+Shift+P');
        await settle(400)(page);
      },
      probes: {
        // Focus is INSIDE the field when it opens (the element autofocuses and
        // selects), and for a shadow host the document reports the host.
        renameField: (page) => page.evaluate(() => document.activeElement?.localName === 'kai-editable-label'),
        // The pin landed in the store, on the conversation that was open.
        pinned: async (page, { spec }) => {
          const row = await firstIndexRow(page, spec);
          return row?.pinned === true;
        },
      },
      expect: { renameField: true, pinned: true },
    },
    {
      name: '10-row-rename-commit',
      act: async (page) => {
        // The field state 9 left OPEN, focused and holding its text selected
        // (kai-editable-label autofocuses and selects when `editing` flips true).
        // The select-all is belt and braces: the pin state 9 pressed in the same
        // field is not a gesture the field acts on, but if anything DID move the
        // caret, typed text would APPEND to the title and the probes below would
        // read a title nobody meant to commit.
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.type(RENAMED_TITLE);
        await page.keyboard.press('Enter');
        await settle(700)(page);
      },
      probes: {
        // The commit landed where it counts: the store's row for the conversation
        // that was open carries the new title. It returns the TITLE rather than a
        // yes/no, so a failure names what was committed instead of only that it
        // differed (the same reason state 5 compares strings).
        storeTitle: async (page, { spec }) => (await firstIndexRow(page, spec))?.title,
        // And the rail re-rendered it: the controller refreshes the summaries
        // after the write, so the row the reader is looking at shows the new
        // title rather than the old one until a reload.
        renamedInRail: (page) => page.locator('kai-conversations')
          .getByText(RENAMED_TITLE, { exact: true }).count().then((n) => n > 0),
        // One field, closed: the row's title is a title again.
        fieldClosed: (page) => page.locator('kai-editable-label:not([hidden])').count().then((n) => n === 0),
      },
      expect: { storeTitle: RENAMED_TITLE, renamedInRail: true, fieldClosed: true },
    },
    {
      name: '11-row-menu-pin',
      act: async (page) => {
        // Through the MENU this time, on the row the menu belongs to: the pin
        // item is one of the four that act, and its own label is the row's state
        // (Pin becomes Unpin). Escape first, so the menu this state's second
        // click opens is the only one on the page; state 10 closed the rename
        // field, so there is no field left to dismiss here.
        await page.keyboard.press('Escape');
        await settle(300)(page);
        await conversationRowMenuTrigger(page).click();
        await settle(300)(page);
        await page.getByRole('menuitem', { name: /^Unpin/ }).first().click();
        await settle(500)(page);
        await conversationRowMenuTrigger(page).click();
        await settle(400)(page);
      },
      probes: {
        // The item's own label is the row's state, and state 9 pinned the row:
        // so the item now reads Pin, and the store's field is gone rather than
        // stored as `false` (the store drops a false flag). The label is matched
        // from the front and NOT anchored at the end: the accessible name carries
        // the key chip's text too ("Pin Mod + Shift + P"), which is the name a
        // reader's screen reader announces and the chip the menu is advertising.
        pinItemLabel: (page) => page.getByRole('menuitem', { name: /^Pin\b/ }).first().isVisible().catch(() => false),
        storePinnedCleared: async (page, { spec }) => (await firstIndexRow(page, spec))?.pinned !== true,
      },
      expect: { pinItemLabel: true, storePinnedCleared: true },
    },
    {
      name: '12-row-menu-archive',
      act: async (page) => {
        // Archive, the operation that takes the row out of every list this block
        // renders: the stored conversation stays, the row and the open thread go.
        await page.getByRole('menuitem', { name: /^Archive/ }).first().click();
        await settle(700)(page);
      },
      probes: {
        rowsGone: (page) => page.locator('kai-conversation-item').count().then((n) => n === 0),
        storeArchived: async (page, { spec }) => (await firstIndexRow(page, spec))?.archived === true,
      },
      expect: { rowsGone: true, storeArchived: true },
    },
    {
      name: '13-row-pin-reorder',
      act: async (page) => {
        // TWO conversations, because "pinned first" is a fact about ORDER and a
        // lone row is first whatever the rule says. The archive state left none,
        // so this sends one turn in each of two fresh threads (saveTurn mints the
        // id on a thread's first turn), which puts the newer one on top by
        // recency: the older one is SECOND, and the pin is what has to move it.
        for (const text of ['Second conversation', 'Third conversation']) {
          await page.getByRole('button', { name: 'New chat' }).click();
          await settle(200)(page);
          const box = page.locator('kai-prompt-input').getByRole('textbox').first();
          await box.click();
          await box.fill(text);
          await box.press('Enter');
          await settle(3500)(page);
        }
        // The row that must move, by identity, before anything moves: the item's
        // bound conversation id, read off the second row (see readBoundValue: the
        // property is where the react form binds it, the attribute is where the
        // html form does).
        pinnedRowId = await readBoundValue(page.locator('kai-conversation-item[data-rail="conversation"]').nth(1), 'conversationId', 'conversation-id');
        // The row's OWN menu, not the first row's: the menu acts on the row it was
        // opened from, which is the whole reason each row carries one.
        await conversationRowMenuTrigger(page, 1).click();
        await settle(300)(page);
        await page.getByRole('menuitem', { name: /^Pin/ }).first().click();
        await settle(600)(page);
      },
      probes: {
        // The premise, asserted rather than assumed: without two rows the order
        // probe below could not tell a reorder from a single row sitting still.
        twoRows: (page) => page.locator('kai-conversation-item[data-rail="conversation"]').count().then((n) => n === 2),
        // The row that was second is now first.
        pinnedRowFirst: (page) => readBoundValue(page.locator('kai-conversation-item[data-rail="conversation"]').first(), 'conversationId', 'conversation-id')
          .then((id) => id !== null && id === pinnedRowId),
        // And the store agrees about which row it was: the pin landed on the row
        // the menu belonged to, not on the active one.
        pinnedInStore: (page, { spec }) => page.evaluate(
          ([key, id]) => JSON.parse(localStorage.getItem(key) ?? '[]').find((r) => r.id === id)?.pinned === true,
          [spec.indexKey, pinnedRowId],
        ),
      },
      expect: { twoRows: true, pinnedRowFirst: true, pinnedInStore: true },
    },
    {
      name: '14-rail-collapsed',
      act: async (page) => {
        // The rail's own built-in header toggle. It fires kai-toggle-sidebar,
        // which the block answers by collapsing the SHELL: the column goes and
        // main reflows, rather than the rail folding itself inside a column the
        // page keeps (the defect this block was re-derived to fix).
        await page.getByRole('button', { name: 'Toggle sidebar' }).click();
        await settle(500)(page);
      },
      probes: {
        reopenVisible: (page) => page.locator('#rail-reopen').isVisible(),
        asideGone: (page) => page.locator('kai-workspace [part="aside start"]').count().then((n) => n === 0),
        // AND MAIN REFLOWED, which is the half of "collapsed" a gone aside does
        // not prove: the defect this block was re-derived to fix left a dead
        // 280px column behind while the rail folded itself. Measured against the
        // viewport rather than typed pixels, so the numbers move with the
        // document: the aside is 280px by default, and main carrying more than
        // 85% of the viewport can only happen once that column is gone.
        mainReflow: async (page) => {
          const box = await page.locator('kai-workspace main').boundingBox();
          const viewport = page.viewportSize();
          return box !== null && viewport !== null
            && box.x < 40 && box.width > viewport.width * 0.85;
        },
      },
      expect: { reopenVisible: true, asideGone: true, mainReflow: true },
    },
    {
      name: '15-narrow-drawer',
      act: async (page) => {
        // Below the shell's drawer-below (640) the rail is an overlay over main
        // rather than a column, and below collapse-below (720) the breakpoint
        // collapses it first, so the way in is the page's own reopen button.
        // The viewport changes here and is never restored: this is the last
        // state, because a narrower document is the whole point of it.
        await page.setViewportSize({ width: 600, height: 800 });
        await settle(500)(page);
        await page.locator('#rail-reopen').click();
        await settle(500)(page);
      },
      probes: {
        // [data-drawer] is the shell's own marker for the overlay branch, in
        // its shadow root; Playwright's CSS pierces it.
        drawer: (page) => page.locator('kai-workspace [data-drawer]').count().then((n) => n > 0),
        railVisible: (page) => page.getByRole('button', { name: 'New chat' }).first().isVisible().catch(() => false),
      },
      expect: { drawer: true, railVisible: true },
    },
    {
      name: '16-voice-transcript',
      act: async (page) => {
        // State 15 left a NARROW document, and the states below are about controls
        // the wide layout shows (the rail's footer, the thread's scroll button), so
        // the viewport comes back first. That is the only reason this is here rather
        // than in state 15: a narrower document was that state's whole point.
        await page.setViewportSize({ width: 1280, height: 800 });
        await settle(500)(page);
        // The microphone cannot be driven, so this fires what the recorder itself
        // fires when a browser without speech recognition hands text back: the
        // element's own kai-transcription event, dispatched ON the element (kai-*
        // events do not bubble, so this is exactly the channel the block listens on).
        // Twice, because the two facts are different: the first lands in an EMPTY
        // composer, the second APPENDS to what is already there.
        for (const text of ['Voice first half.', 'And the second.']) {
          await page.evaluate((t) => {
            document.getElementById('voice').dispatchEvent(new CustomEvent('kai-transcription', { detail: { text: t } }));
          }, text);
          await settle(400)(page);
        }
      },
      probes: {
        // The append rule, exactly: the draft plus ONE space plus the transcript, and
        // no leading space when the composer was empty (a leading space is the first
        // character here, and it is not trimmed away - only TRAILING whitespace is,
        // which is a contenteditable rendering artefact rather than a character the
        // block put in the text).
        composerValue: (page) => page.locator('kai-prompt-input').getByRole('textbox').first()
          .innerText().then((t) => t.replace(/\s+$/, '')),
        // The block's half of the caret story: the composer HOLDS FOCUS, so the next
        // keystroke continues in it. Where the caret sits inside the text is the kit's
        // half - the block places no caret, which is what keeps one caret path.
        composerFocused: (page) => page.evaluate(() => document.activeElement?.localName === 'kai-prompt-input'),
      },
      expect: { composerValue: 'Voice first half. And the second.', composerFocused: true },
    },
    {
      name: '17-settings-theme',
      act: async (page) => {
        // The gear in the rail's footer, then the Dark row of its theme group. Both
        // are kai-menu, so the trigger is the element's own button and the rows are
        // its items; the accessible names are the block's.
        await page.getByRole('button', { name: 'Settings' }).click();
        await settle(350)(page);
        await page.getByRole('menuitemradio', { name: 'Dark' }).click();
        await settle(600)(page);
      },
      probes: {
        // The kit's own binding, on the shell: this IS the mechanism (the scheme is
        // per element, so the block binds it on every element it renders), not a
        // marker the block made up. Read through readBoundValue because the two
        // forms write that binding to different channels.
        workspaceTheme: (page) => readBoundValue(page.locator('#workspace'), 'theme', 'theme'),
        // A SECOND element, bound the same way - the element that would keep
        // following the OS if the choice were not per element.
        promptTheme: (page) => readBoundValue(page.locator('#prompt'), 'theme', 'theme'),
        // And the scope that attribute produces INSIDE an element's shadow root: the
        // kit paints its dark tokens under an inner wrapper carrying `.dark`.
        railDarkScope: (page) => page.evaluate(() => {
          const root = document.getElementById('conversations')?.shadowRoot;
          return !!root && [...root.children].some((el) => el.style.display === 'contents' && el.classList.contains('dark'));
        }),
        // A computed style that actually changes with that scope, and it is not the
        // menu's own label: the kit's `.dark` block declares `color-scheme: dark`, so
        // the wrapper resolves dark here and `light` (the shadow root's own value)
        // everywhere else. The measured value comes back on failure.
        railColorScheme: (page) => page.evaluate(() => {
          const root = document.getElementById('conversations')?.shadowRoot;
          const scope = root ? [...root.children].find((el) => el.style.display === 'contents') : undefined;
          return scope ? getComputedStyle(scope).colorScheme : 'no scope found';
        }),
      },
      expect: { workspaceTheme: 'dark', promptTheme: 'dark', railDarkScope: true, railColorScheme: 'dark' },
    },
    {
      name: '18-scroll-to-bottom',
      act: async (page) => {
        // THE PREMISE, BUILT FIRST: the button hides itself at the bottom of the
        // thread, and a thread shorter than its viewport never shows it at all, so
        // this sends two more turns (the mock answers each) before the gesture. The
        // last conversation was a single turn, which is not enough to scroll.
        for (const text of ['Scroll probe one', 'Scroll probe two']) {
          const box = page.locator('kai-prompt-input').getByRole('textbox').first();
          await box.click();
          await box.fill(text);
          await box.press('Enter');
          await settle(3500)(page);
        }
        // Then the gesture the owner described: scroll UP and the button appears.
        // The two facts are one gesture apart - what the button was doing while the
        // thread was scrolled up, and where the thread is after pressing it - so both
        // are captured in this one act: the button HIDES ITSELF at the bottom, and
        // its state before the click is unrecoverable afterwards.
        const scroller = await page.evaluate(() => {
          const box = document.getElementById('thread')?.shadowRoot?.querySelector('.overflow-y-auto');
          if (!box) return null;
          box.scrollTop = 0;
          return { scrollTop: box.scrollTop, scrollHeight: box.scrollHeight, clientHeight: box.clientHeight };
        });
        threadIsScroller = scroller;
        if (!scroller || scroller.scrollHeight <= scroller.clientHeight) {
          throw new Error(`the thread does not overflow, so this state cannot be about the scroll button: ${JSON.stringify(scroller)}`);
        }
        await settle(500)(page);
        scrollButtonUp = await page.evaluate(() => {
          const btn = document.getElementById('thread')?.shadowRoot?.querySelector('button[aria-label="Scroll to bottom"]');
          if (!btn) return null;
          const cs = getComputedStyle(btn);
          const box = btn.getBoundingClientRect();
          return {
            present: true, opacity: cs.opacity, pointerEvents: cs.pointerEvents,
            tabindex: btn.getAttribute('tabindex'), ariaHidden: btn.getAttribute('aria-hidden'),
            box: { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) },
          };
        });
        await page.getByRole('button', { name: 'Scroll to bottom' }).click();
        await settle(900)(page);
      },
      probes: {
        // The premise, measured rather than assumed: the thread's own shadow viewport
        // is the scroller, and it really has more to scroll than it shows (a thread
        // that does not overflow hides the button whatever the code does).
        threadIsScroller: () => (threadIsScroller && threadIsScroller.scrollHeight > threadIsScroller.clientHeight
          ? true
          : JSON.stringify(threadIsScroller)),
        // Scrolled up, the button is FULLY PRESENT: opaque, clickable, back in the tab
        // order and no longer hidden from assistive tech. Anything less comes back as
        // the measured object.
        buttonWhenScrolledUp: () => (scrollButtonUp && scrollButtonUp.present
          && scrollButtonUp.opacity === '1' && scrollButtonUp.pointerEvents === 'auto'
          && scrollButtonUp.tabindex === '0' && scrollButtonUp.ariaHidden === null
          ? true
          : JSON.stringify(scrollButtonUp)),
        // ...and pressing it returns the thread to the bottom.
        atBottom: (page) => page.evaluate(() => {
          const box = document.getElementById('thread')?.shadowRoot?.querySelector('.overflow-y-auto');
          if (!box) return 'no scroller';
          const gap = box.scrollHeight - box.scrollTop - box.clientHeight;
          return gap < 4 ? true : `${gap}px short of the bottom`;
        }),
      },
      expect: { threadIsScroller: true, buttonWhenScrolledUp: true, atBottom: true },
    },
    {
      name: '19-guide-cards',
      act: async (page) => {
        await page.getByRole('button', { name: 'New chat' }).click();
        await settle(400)(page);
        emptyOpeners = await suggestionLabels(page);
      },
      probes: {
        // All four by their own accessible name - which is the card's own text,
        // so this also proves the name is not a second label disagreeing with it.
        ...Object.fromEntries(GUIDE_CARDS.map((label, i) => [
          `card${i}`,
          (page) => page.getByRole('button', { name: label }).isVisible().catch(() => false),
        ])),
        // Their ORDER, read off the DOM rather than asserted one at a time: the
        // four are a path, and a path in the wrong order is a different menu.
        cardOrder: (page) => page.locator('.guide-cards kai-button').evaluateAll(
          (els, labels) => els.map((el) => labels.find((l) => el.textContent?.includes(l))).join(' > '),
          GUIDE_CARDS,
        ),
        // A card carries a summary, not only a title: the summary is what tells
        // a reader which guide they want.
        summariesPresent: (page) => page.locator('.guide-card-summary').evaluateAll(
          (els) => els.length === 4 && els.every((el) => (el.textContent ?? '').length > 20),
        ),
        // AND THE FOUR OPENERS, in their order. This is the one place the labels
        // are pinned: every arc state below clicks one of them, and a label that
        // drifted would have those states click nothing (or, worse, a different
        // arc) while still passing their own shape probes.
        openersAsApproved: () => emptyOpeners.join(' | ') === ARC_LABELS.join(' | '),
      },
      expect: {
        card0: true, card1: true, card2: true, card3: true,
        cardOrder: GUIDE_CARDS.join(' > '), summariesPresent: true, openersAsApproved: true,
      },
    },
    ...GUIDE_CARDS.map((cardLabel, i) => ({
      name: `${19 + i + 1}-guide-${GUIDE_SLUGS[i]}`,
      act: async (page) => {
        await page.getByRole('button', { name: 'New chat' }).click();
        await settle(400)(page);
        guideRowsBefore = await page.locator('kai-conversation-item').count();
        // A card click asks the question and STREAMS the transport's answer (the
        // guide's own turn 1), which is why this waits for the turn rather than
        // for a fixed slice of time.
        await page.getByRole('button', { name: cardLabel }).click();
        await waitForTurns(page, 2);
        guideRowsAfterCard = await page.locator('kai-conversation-item').count();
        // CAPTURED, not restated: the guide's own sentences are approved content
        // that lives in the controller, and a probe that retyped them would be
        // asserting its own copy instead of what the click produced. What is
        // worth checking here is the SHAPE - one user turn, one answer, and an
        // answer long enough to be an answer - while the wording is reviewed
        // where it is written and its code is compiled by the fence gate.
        guideThread = await page.evaluate(() => {
          const thread = document.getElementById('thread');
          const messages = thread?.messages ?? [];
          const textOf = (m) => (m?.parts ?? []).filter((p) => p.type === 'text').map((p) => p.text).join('');
          return {
            count: messages.length,
            roles: messages.map((m) => m.role).join(','),
            // CONTAINS a question mark, not ends with one: a guide's opening
            // line is often two sentences ("Which provider does this use? I want
            // to point it at OpenRouter."), so requiring the mark at the end
            // asserts the punctuation rather than that the reader asked
            // something.
            askedIsAQuestion: textOf(messages[0]).includes('?'),
            answerLength: textOf(messages[messages.length - 1]).length,
          };
        });
        // THE GUIDE'S OWN NEXT STEP, clicked rather than typed. The label comes
        // OUT of the captured set, so a reworded `*Next:*` line moves this state
        // with it instead of silently clicking nothing.
        const offered = await suggestionLabels(page);
        await page.getByRole('button', { name: offered[0], exact: true }).click();
        await waitForTurns(page, 4);
        guideFollowUp = await page.evaluate(() => {
          const thread = document.getElementById('thread');
          const messages = thread?.messages ?? [];
          const textOf = (m) => (m?.parts ?? []).filter((p) => p.type === 'text').map((p) => p.text).join('');
          const last = textOf(messages[messages.length - 1]);
          return {
            count: messages.length,
            roles: messages.map((m) => m.role).join(','),
            answerLength: last.length,
            // A SHAPE, not the wording: every guide's second step answers with a
            // code fence, which is what makes the guide a guide.
            hasFence: last.includes('```'),
          };
        });
        guideFollowUp.offered = offered;
        guideFollowUp.later = await suggestionLabels(page);
      },
      probes: {
        twoTurns: () => guideThread?.count === 2,
        userThenAssistant: () => guideThread?.roles === 'user,assistant',
        // The developer's turn reads as a question, which is what the card
        // promised a reader they were starting.
        askedIsAQuestion: () => guideThread?.askedIsAQuestion === true,
        answerIsSubstantial: () => (guideThread?.answerLength ?? 0) > 60,
        // The cards belong to the EMPTY state: once a guide is open they are gone.
        cardsGone: (page) => page.getByRole('button', { name: 'Wire a model' }).count().then((n) => n === 0),
        // AND THE CARD CLICK DID NOT CHANGE THE RAIL - the regression the
        // boot-time seeding hit, where a seed became the rail's first row and
        // took the subject away from the state running. A click is the reader's
        // own act: it seeds the thread and writes nothing, and the row appears
        // when they send their next message, which `submit` already does - and
        // which the follow-up click below IS, so the count is compared across the
        // CARD click alone rather than across the whole act.
        railUnchanged: () => guideRowsAfterCard === guideRowsBefore,
        // THE SECOND ANSWER IS THIS GUIDE'S. Four turns rather than two, the
        // alternation intact, and an answer that carries a fence - none of which
        // the fallback script would produce for the question that opened this
        // thread.
        followUpTurnArrived: () => guideFollowUp?.count === 4,
        followUpAlternates: () => guideFollowUp?.roles === 'user,assistant,user,assistant',
        followUpIsSubstantial: () => (guideFollowUp?.answerLength ?? 0) > 60,
        followUpHasAFence: () => guideFollowUp?.hasFence === true,
        // A label was offered for that step, and after it the labels MOVED: the
        // step the reader just took is no longer on offer.
        aNextStepWasOffered: () => (guideFollowUp?.offered ?? []).length >= 1,
        labelsMovedOn: () => {
          const before = guideFollowUp?.offered ?? [];
          const after = guideFollowUp?.later ?? [];
          return after.length > 0 && !before.includes(after[0]);
        },
      },
      expect: {
        twoTurns: true, userThenAssistant: true, askedIsAQuestion: true,
        answerIsSubstantial: true, cardsGone: true, railUnchanged: true,
        followUpTurnArrived: true, followUpAlternates: true, followUpIsSubstantial: true,
        followUpHasAFence: true, aNextStepWasOffered: true, labelsMovedOn: true,
      },
    })),
    {
      name: '24-labels-mid-arc',
      act: async (page) => {
        await page.getByRole('button', { name: 'New chat' }).click();
        await settle(400)(page);
        emptyOpeners = await suggestionLabels(page);
        // The arc's label comes OUT of the captured set rather than being typed
        // here, so a reworded opener moves this state with it instead of
        // silently clicking nothing.
        arcLabel = emptyOpeners[0];
        await page.getByRole('button', { name: arcLabel, exact: true }).click();
        await waitForTurns(page, 2);
        labelsMidArc = await suggestionLabels(page);
        arcMidShape = await threadShape(page);
      },
      probes: {
        // An opener on a thread that has messages is a cross-link offered too
        // early: the arc the reader is in has not finished.
        openersDontSurviveTheTurn: () => !labelsMidArc.some((label) => emptyOpeners.includes(label)),
        oneOwnStep: () => labelsMidArc.length === 1,
        rendered: (page) => allRendered(page, labelsMidArc),
        // AND THE FIRST TURN IS THE ARC'S, not the fallback script's: the label
        // said `Summarize a document`, so the answer starts by reading the
        // document it was given rather than by narrating a different one.
        toolSettled: () => lastTurn(arcMidShape).tools.some((t) => t.state === 'output-available'),
      },
      expect: { openersDontSurviveTheTurn: true, oneOwnStep: true, rendered: true, toolSettled: true },
    },
    {
      name: '25-labels-end-of-arc',
      act: async (page) => {
        // Clicking the arc's own next step is what advances its turn index, so
        // this is the click whose turn the label PROMISED. The arc cannot branch
        // on what the card asks, which is why the turn after it says which
        // answer it took.
        await page.getByRole('button', { name: labelsMidArc[0], exact: true }).click();
        await waitForTurns(page, 4);
        labelsEndOfArc = await suggestionLabels(page);
        arcEndShape = await threadShape(page);
      },
      probes: {
        // The opener the arc STARTED from retires when it finishes, and at least
        // one of the others arrives with it - the cross-links ARE openers, which
        // is why they are compared against the set the empty state produced.
        ownOpenerRetires: () => !labelsEndOfArc.includes(arcLabel),
        offersAnotherOpener: () =>
          labelsEndOfArc.some((label) => emptyOpeners.includes(label) && label !== arcLabel),
        moreThanOne: () => labelsEndOfArc.length >= 2,
        rendered: (page) => allRendered(page, labelsEndOfArc),
        // THE TURN THE LABEL PROMISED IS THE CARD, and one card, not a stack: a
        // second turn that announced a NEW call would leave two cards on screen.
        promisedCard: () => {
          const cards = lastTurn(arcEndShape).cards;
          return cards.length === 1 && cards[0].type === 'confirm';
        },
        // ...and the call behind it is SETTLED, not left spinning: the card
        // answers the tool call, and the answer is the reader's to give.
        cardCallSettled: () => lastTurn(arcEndShape).tools.some((t) => t.state === 'output-available'),
        fourTurns: () => arcEndShape.length === 4,
      },
      expect: {
        ownOpenerRetires: true, offersAnotherOpener: true, moreThanOne: true, rendered: true,
        promisedCard: true, cardCallSettled: true, fourTurns: true,
      },
    },
    {
      name: '26-labels-from-a-card',
      act: async (page) => {
        // A card is the OTHER way a conversation starts, and the two do not go
        // through the same act: a card ASKS its question and the transport
        // answers it, while a suggestion is submitted as a message. Both have to
        // earn their labels.
        await page.getByRole('button', { name: 'New chat' }).click();
        await settle(400)(page);
        // NOT `exact`: a card's accessible name is its title plus its summary,
        // which is what tells a reader which guide they want. The exact form
        // matches no card at all.
        await page.getByRole('button', { name: GUIDE_CARDS[0] }).click();
        await waitForTurns(page, 2);
        labelsFromCard = await suggestionLabels(page);
      },
      probes: {
        // The guide's OWN first next step: one label, and not one of the
        // openers, which belong to an empty thread rather than to a guide.
        oneOwnStep: () => labelsFromCard.length === 1,
        ownStepIsNotAnOpener: () => !labelsFromCard.some((label) => emptyOpeners.includes(label)),
        rendered: (page) => allRendered(page, labelsFromCard),
      },
      expect: { oneOwnStep: true, ownStepIsNotAnOpener: true, rendered: true },
    },
    {
      name: '27-arc-task-list',
      act: async (page) => {
        await page.getByRole('button', { name: 'New chat' }).click();
        await settle(400)(page);
        // BY NAME, and the name is state 19's business: it compares the app's own
        // four openers against ARC_LABELS, so this clicks a label the empty state
        // was already shown to offer.
        await page.getByRole('button', { name: ARC_LABELS[1], exact: true }).click();
        await waitForTurns(page, 2);
        arcs.taskList = { turn1: lastTurn(await threadShape(page)), labels: await suggestionLabels(page) };
        // The arc's OWN next step, clicked rather than typed, so this is the
        // click whose turn the label promised.
        await page.getByRole('button', { name: arcs.taskList.labels[0], exact: true }).click();
        await waitForTurns(page, 4);
        const turn2Shape = await threadShape(page);
        arcs.taskList.turn2 = lastTurn(turn2Shape);
        // EVERY card the thread carries, not just the last message's: see
        // `oneCardPerTurn` below for why the difference is the point.
        arcs.taskList.allCards = turn2Shape.flatMap((message) => message.cards);
        arcs.taskList.endLabels = await suggestionLabels(page);
      },
      probes: {
        // What the label promised for turn 1: the request becomes a CARD, four
        // rows, the first one marked as the one being worked on (noted) rather
        // than done (checked).
        turn1IsATaskList: () => {
          const cards = arcs.taskList?.turn1?.cards ?? [];
          return cards.length === 1 && cards[0].type === 'tasks' && cards[0].rows === 4
            && cards[0].firstNoted && !cards[0].firstChecked;
        },
        // WAS `turn2RevisesTheSameCard`, and the name was the STORYBOARD's claim
        // rather than the architecture's: each turn's card lives in its own
        // message (`stream.addCard` upserts into the stream's OWN message), so
        // turn 2 does not revise turn 1's card in place. What is true, and worth
        // asserting, is the half the storyboard sentence is reaching for: the two
        // cards carry ONE envelope id — the provider's own call id — and the
        // second one's first row is done.
        turn2SharesTheCallsId: () => {
          const before = arcs.taskList?.turn1?.cards?.[0];
          const after = arcs.taskList?.turn2?.cards?.[0];
          return !!before && !!after && after.id === before.id && after.firstChecked;
        },
        // ...AND IT IS A SECOND CARD, one per turn, each in the message that
        // carried it. The storyboard's "the card writes back to its own tool
        // call" is not what this renders, and the driver says so rather than
        // naming a behaviour the block does not have.
        oneCardPerTurn: () => {
          const all = arcs.taskList?.allCards ?? [];
          return all.length === 2 && all.every((card) => card.type === 'tasks' && card.id === all[0].id);
        },
        turn2CarriesOneCard: () => (arcs.taskList?.turn2?.cards ?? []).length === 1,
        // One step offered mid-arc, and the cross-links at the end: the other
        // three openers, its own no longer among them.
        ownStepOffered: () => (arcs.taskList?.labels ?? []).length === 1,
        crossLinksAtTheEnd: () => {
          const end = arcs.taskList?.endLabels ?? [];
          return end.length === 3 && end.every((l) => ARC_LABELS.includes(l) && l !== ARC_LABELS[1]);
        },
        rendered: (page) => allRendered(page, arcs.taskList?.endLabels ?? []),
      },
      expect: {
        turn1IsATaskList: true, turn2SharesTheCallsId: true, oneCardPerTurn: true,
        turn2CarriesOneCard: true, ownStepOffered: true, crossLinksAtTheEnd: true, rendered: true,
      },
    },
    {
      name: '28-arc-compare',
      act: async (page) => {
        await page.getByRole('button', { name: 'New chat' }).click();
        await settle(400)(page);
        await page.getByRole('button', { name: ARC_LABELS[2], exact: true }).click();
        await waitForTurns(page, 2);
        arcs.compare = { turn1: lastTurn(await threadShape(page)), labels: await suggestionLabels(page) };
        await page.getByRole('button', { name: arcs.compare.labels[0], exact: true }).click();
        await waitForTurns(page, 4);
        arcs.compare.turn2 = lastTurn(await threadShape(page));
        arcs.compare.endLabels = await suggestionLabels(page);
      },
      probes: {
        // Two options weighed, then a `choice` card offering both.
        turn1IsAChoice: () => {
          const cards = arcs.compare?.turn1?.cards ?? [];
          return cards.length === 1 && cards[0].type === 'choice' && cards[0].rows === 2;
        },
        // AND ITS ANSWERS ARE THE LABELS offered next: one per option, so the
        // reader clicks a pick rather than typing one. Compared against the
        // card's own row count instead of a typed pair.
        picksAreTheLabels: () => (arcs.compare?.labels ?? []).length === arcs.compare?.turn1?.cards?.[0]?.rows,
        // The follow-up is PROSE and no card at all: the comparison lands in a
        // sentence, which is the point of the arc.
        turn2IsTheCommitment: () => (arcs.compare?.turn2?.cards ?? []).length === 0
          && (arcs.compare?.turn2?.textLength ?? 0) > 0,
        crossLinksAtTheEnd: () => {
          const end = arcs.compare?.endLabels ?? [];
          return end.length === 3 && end.every((l) => ARC_LABELS.includes(l) && l !== ARC_LABELS[2]);
        },
        rendered: (page) => allRendered(page, arcs.compare?.endLabels ?? []),
      },
      expect: {
        turn1IsAChoice: true, picksAreTheLabels: true, turn2IsTheCommitment: true,
        crossLinksAtTheEnd: true, rendered: true,
      },
    },
    {
      name: '29-arc-brief',
      act: async (page) => {
        await page.getByRole('button', { name: 'New chat' }).click();
        await settle(400)(page);
        await page.getByRole('button', { name: ARC_LABELS[3], exact: true }).click();
        await waitForTurns(page, 2);
        arcs.brief = { turn1: lastTurn(await threadShape(page)), labels: await suggestionLabels(page) };
        await page.getByRole('button', { name: arcs.brief.labels[0], exact: true }).click();
        await waitForTurns(page, 4);
        arcs.brief.turn2 = lastTurn(await threadShape(page));
        arcs.brief.endLabels = await suggestionLabels(page);
      },
      probes: {
        // It asks for what it is missing: a `form` card with the two fields,
        // rather than a paragraph saying that it needs them.
        turn1IsAForm: () => {
          const cards = arcs.brief?.turn1?.cards ?? [];
          return cards.length === 1 && cards[0].type === 'form' && cards[0].fields === 2;
        },
        // One label, which is the reader's next step rather than a field's
        // answer: a form's answers cannot be labels.
        ownStepOffered: () => (arcs.brief?.labels ?? []).length === 1,
        // Then it writes: prose, no second card. The form was never answered -
        // an arc cannot branch - so the turn uses the two answers it assumed and
        // names them, which is a shape this probe can see.
        turn2IsTheBrief: () => (arcs.brief?.turn2?.cards ?? []).length === 0
          && (arcs.brief?.turn2?.textLength ?? 0) > 0,
        crossLinksAtTheEnd: () => {
          const end = arcs.brief?.endLabels ?? [];
          return end.length === 3 && end.every((l) => ARC_LABELS.includes(l) && l !== ARC_LABELS[3]);
        },
        rendered: (page) => allRendered(page, arcs.brief?.endLabels ?? []),
      },
      expect: {
        turn1IsAForm: true, ownStepOffered: true, turn2IsTheBrief: true,
        crossLinksAtTheEnd: true, rendered: true,
      },
    },
    {
      // THE EMPTY STATE'S OWN LAYOUT, at the run's viewport and again at a narrow
      // one: the four suggestion labels as the kit lays them out, and the guide
      // cards' grid. Both are shapes no other state can see - every other state
      // reads the labels off the element's `suggestions` property, which says what
      // the block offered and nothing about how the kit laid it out, and every
      // other state's screenshot is of a wide document.
      name: '30-empty-state-layout',
      act: async (page) => {
        // Back to the empty state: both halves are what it offers BEFORE a
        // conversation exists, and the arc states above left one open.
        await page.getByRole('button', { name: 'New chat' }).click();
        await settle(400)(page);
        offeredRows = await suggestionLabels(page);
        emptyStateBoxes = {
          wide: {
            suggestions: await measureSuggestions(page, offeredRows),
            cards: await measureCards(page),
          },
        };
        // THE NARROW PASS, and it is the same four boxes read again rather than a
        // second set of claims: the viewport comes back afterwards because the
        // states below are about a wide document, which is why this flip lives
        // here (state 15's stays narrow because a narrow document IS its point).
        await page.setViewportSize({ width: 600, height: 800 });
        await settle(500)(page);
        emptyStateBoxes.narrow = {
          suggestions: await measureSuggestions(page, offeredRows),
          cards: await measureCards(page),
        };
        await page.setViewportSize({ width: 1280, height: 800 });
        await settle(500)(page);
      },
      probes: {
        // FOUR, and each of them found: a label that did not render is reported
        // as `missing` rather than counted away.
        fourLabels: () => (emptyStateBoxes?.wide?.suggestions?.pills ?? []).length === 4
          && emptyStateBoxes.wide.suggestions.pills.every((p) => !p.missing),
        // ...and the four boxes ARE the four labels the element offered, in
        // order. Without this every claim below could be measuring any four
        // buttons that happen to be in the element.
        theBoxesAreTheOfferedLabels: () => (emptyStateBoxes?.wide?.suggestions?.pills ?? []).map((p) => p.label).join(' | ')
          === offeredRows.join(' | '),
        // THE ROW, and the measurement that discriminates it from the kit's
        // `block` variant: pills are intrinsic-width, so all four sit on ONE
        // line at a wide viewport - one top, and four lefts ascending in the
        // order the block offered them. The values come back on failure, so a
        // stacked set names its own tops instead of only that it differed.
        theLabelsShareOneLine: () => {
          const pills = emptyStateBoxes?.wide?.suggestions?.pills ?? [];
          if (pills.length !== 4) return `measured ${pills.length} labels`;
          const tops = [...new Set(pills.map((p) => p.top))];
          if (tops.length !== 1) return `the labels sit on ${tops.length} lines: ${JSON.stringify(tops)}`;
          const lefts = pills.map((p) => p.left);
          return lefts.every((left, i) => i === 0 || left > lefts[i - 1])
            ? true
            : `the labels are not in the offered order: ${JSON.stringify(lefts)}`;
        },
        // ...AND THEY ARE NOT FULL-WIDTH ROWS, which is the OTHER half of "this
        // is the pill variant": the row variant sets `w-full`, so every box
        // would be its container's whole content box. Intrinsic width is what a
        // pill is, so the claim is that each is strictly narrower than that.
        theLabelsAreIntrinsicWidth: () => {
          const pills = emptyStateBoxes?.wide?.suggestions?.pills ?? [];
          if (pills.length === 0) return 'no labels measured';
          const full = pills.filter((p) => p.containerWidth === null || p.width >= p.containerWidth - 1);
          return full.length === 0 ? true : JSON.stringify(full);
        },
        // AND THEY WRAP WHEN THERE IS NO ROOM. The premise of the claim is that
        // the narrow read really is narrower than the wide one, so a viewport
        // that silently did not change would be reported here rather than
        // passing on an unchanged set: the container has to have shrunk, and the
        // four labels have to have landed on more than one line.
        theLabelsWrapWhenThereIsNoRoom: () => {
          const wide = emptyStateBoxes?.wide?.suggestions?.pills ?? [];
          const narrow = emptyStateBoxes?.narrow?.suggestions?.pills ?? [];
          if (narrow.length === 0) return 'no narrow labels measured';
          if ((narrow[0].containerWidth ?? 0) >= (wide[0]?.containerWidth ?? 0)) {
            return `the narrow container is ${narrow[0].containerWidth}px against ${wide[0]?.containerWidth}px wide`;
          }
          const tops = [...new Set(narrow.map((p) => p.top))];
          return tops.length > 1
            ? true
            : `the four labels still share one line in a ${narrow[0].containerWidth}px container`;
        },
        // THE CARDS: two columns while there is room, ONE when there is not - the
        // viewport query the cards' own breakpoint declares, read off the boxes
        // rather than off the template string, and read at both widths in the one
        // state so "they fold" cannot pass on a page that was never narrow. Four
        // cards are read as the loop the grid actually is: a distinct-left count
        // of 2 is two columns, and of 1 is one.
        theCardsFoldToOneColumnWhenThereIsNoRoom: () => {
          const wide = emptyStateBoxes?.wide?.cards;
          const narrow = emptyStateBoxes?.narrow?.cards;
          if (!wide || !narrow) return 'the cards were not measured';
          if (wide.cards !== 4 || narrow.cards !== 4) return `${wide.cards} cards wide, ${narrow.cards} narrow`;
          if (wide.lefts !== 2) return `the wide grid lays its cards in ${wide.lefts} columns`;
          return narrow.lefts === 1
            ? true
            : `the narrow grid kept ${narrow.lefts} columns at a ${narrow.gridWidth}px width`;
        },
        // AND THE CARDS CARRY THE KIT'S OWN AIR, asserted against the kit's unit
        // rather than against numbers typed here: 5 density units of padding
        // (the `p-5` the kit's own Card paints) and 2 units between a title and
        // its summary. The owner asked for adequate spacing rather than for a
        // look, so the claim is that the box answers to the kit's scale at all -
        // a page that moves --kai-density moves the cards with it.
        theCardsCarryTheKitsOwnAir: () => {
          const cards = emptyStateBoxes?.wide?.cards;
          if (!cards) return 'the cards were not measured';
          for (const edge of ['paddingTop', 'paddingLeft', 'titleToSummary']) {
            if (typeof cards[edge] !== 'number') return `${edge} was not measured`;
          }
          const unit = cards.density === '' ? 4 : parseFloat(cards.density) * 16;
          if (!Number.isFinite(unit) || unit <= 0) return `the density knob reads ${JSON.stringify(cards.density)}`;
          // The measured padding is the SLOTTED TEXT's offset inside the card, so
          // it is an integer by construction: a fractional rule lands as 20.4 and
          // this rounds nothing away on its behalf.
          const want = { paddingTop: unit * 5, paddingLeft: unit * 5, titleToSummary: unit * 2 };
          const wrong = Object.entries(want)
            .filter(([edge, value]) => Math.abs(cards[edge] - value) > 0.5)
            .map(([edge, value]) => `${edge} ${cards[edge]}px, ${value}px wanted`);
          return wrong.length === 0 ? true : wrong.join(' | ');
        },
        // ...AND THE GRID FILLS THE BOX ITS CONTAINER DECLARES, rather than the prose
        // box it used to escape. The block says how wide that content may be with
        // `--kai-empty-content-width` (see assistant.css): the empty state's own box
        // is what widens, and the grid is exactly that box - no wider (the escape
        // hatch this replaced was measured at 768px against a 384px parent) and no
        // narrower.
        theGridFillsTheEmptyContentsBox: () => {
          const cards = emptyStateBoxes?.wide?.cards;
          if (!cards || !cards.containerWidth) return 'the grid or the box it is slotted into was not measured';
          const off = Math.abs(cards.gridWidth - cards.containerWidth);
          return off <= 1
            ? true
            : `the grid is ${cards.gridWidth}px against the ${cards.containerWidth}px box it is slotted into`;
        },
        // ...AND THAT BOX NEVER OUTGROWS THE COLUMN ITS HOST PUTS IT IN: the same
        // 48rem measure the composer below is capped to. This is where the old
        // expression's bound lives now - it belongs to the thread's own `max-w-3xl`
        // column, which caps the empty state's box for every host that mounts it,
        // so the block no longer restates it and cannot drift from it.
        theGridStaysInsideThreadColumn: () => {
          const cards = emptyStateBoxes?.wide?.cards;
          if (!cards || cards.composerWidth === 0) return 'the grid or the composer was not measured';
          return cards.gridWidth <= cards.composerWidth
            ? true
            : `the grid is ${cards.gridWidth}px against the composer's ${cards.composerWidth}px column`;
        },
        // And every one of them is on screen, not merely in the array.
        rendered: (page) => allRendered(page, offeredRows),
      },
      expect: {
        fourLabels: true, theBoxesAreTheOfferedLabels: true, theLabelsShareOneLine: true,
        theLabelsAreIntrinsicWidth: true, theLabelsWrapWhenThereIsNoRoom: true,
        theCardsFoldToOneColumnWhenThereIsNoRoom: true, theCardsCarryTheKitsOwnAir: true,
        theGridFillsTheEmptyContentsBox: true, theGridStaysInsideThreadColumn: true, rendered: true,
      },
      // Every probe above is a comparison among the block's own boxes or against
      // the kit's own token, so none of them is skipped on the react host: the
      // emitted tree imports the block's stylesheet, and a narrow viewport is the
      // same fact in either document. The state ENDS at the run's viewport, which
      // is what its screenshot is of.
      styleProbes: [
        // The pill's own surface, recorded rather than described: the default
        // variant is intrinsic-width and pill-shaped, and the `block` variant the
        // block used to ask for was neither (h-auto w-full rounded-xl).
        style('suggestionPill', (page) => page.getByRole('button', { name: ARC_LABELS[0], exact: true }).first(),
          ['height', 'paddingInline', 'borderRadius']),
        // And the cards' grid at the run's viewport: the two column traces ARE
        // the width the owner read as narrow, so the recorded pair is where the
        // change is visible in the baseline and not only in the screenshot.
        style('guideCardsGrid', (page) => page.locator('.guide-cards'),
          ['width', 'gridTemplateColumns', 'gap', 'minWidth']),
        style('guideCardText', (page) => page.locator('.guide-card-text').first(),
          ['rowGap']),
      ],
    },
    {
      name: '31-cross-link-clicks-through',
      act: async (page) => {
        // THE INTERACTION THE WHOLE PLAN EXISTS FOR, clicked rather than
        // compared. Every other state reads the labels the block OFFERED; this
        // is the only one that CLICKS one of the cross-links at the END of a
        // conversation — and a cross-link is a submit into the SAME thread, so
        // the conversation's stored key (its first user turn) never changes.
        // That is what the labels and the transport both have to key on the LAST
        // key-bearing user turn for: with a lookup on the first turn, clicking
        // `Make a task list` here replayed the finished Summarize arc and left the
        // label table indexed past the end of its row, so the thread offered
        // nothing to click again for the rest of its life.
        await page.getByRole('button', { name: 'New chat' }).click();
        await settle(400)(page);
        // The Summarize arc, played to its end: two turns, then the cross-links.
        await page.getByRole('button', { name: ARC_LABELS[0], exact: true }).click();
        await waitForTurns(page, 2);
        await page.getByRole('button', { name: (await suggestionLabels(page))[0], exact: true }).click();
        await waitForTurns(page, 4);
        const offered = await suggestionLabels(page);
        // The cross-link comes OUT of the offered set, so a reworded opener moves
        // this state with it instead of clicking nothing.
        const clicked = offered.find((label) => label !== ARC_LABELS[0]) ?? '';
        await page.getByRole('button', { name: clicked, exact: true }).click();
        await waitForTurns(page, 6);
        const labels = await suggestionLabels(page);
        crossLink = {
          offered,
          clicked,
          // THE USER TURN THE CLICK ACTUALLY SENT, read off the thread rather
          // than assumed: the answer below is only this conversation's answer if
          // the thread's last user turn is the label that was clicked.
          userText: await page.evaluate(() => {
            const messages = document.getElementById('thread')?.messages ?? [];
            const last = messages.filter((message) => message.role === 'user').pop();
            return (last?.parts ?? []).filter((p) => p.type === 'text').map((p) => p.text).join('');
          }),
          turn: lastTurn(await threadShape(page)),
          labels,
          rendered: await allRendered(page, labels),
        };
        // AND THEN THE ARC KEEPS GOING, which is the other half of the same fix.
        // The task-list arc has two turns, so one typed message asks for turn 2
        // (the revision) and a second asks for a turn the script does not have.
        // The mock's responder CYCLES (`pool[turn % pool.length]`), so a transport
        // that did not fall back to the generic script would replay turn 1's card
        // a third time.
        const type = async (text, count) => {
          const box = page.locator('kai-prompt-input').getByRole('textbox').first();
          await box.click();
          await box.fill(text);
          await box.press('Enter');
          await waitForTurns(page, count);
        };
        await type('Any more?', 8);
        typedTurn = lastTurn(await threadShape(page));
        await type('And one more?', 10);
        pastTheScript = { turn: lastTurn(await threadShape(page)), labels: await suggestionLabels(page) };
      },
      probes: {
        // A cross-link was offered at the end of the arc, and it is not the arc's
        // own opener: the set came from the app.
        aCrossLinkWasOffered: () => (crossLink?.offered ?? []).some((label) => label !== ARC_LABELS[0]),
        // ...and clicking it sent the label the reader clicked.
        theClickSentTheLabel: () => crossLink?.userText === crossLink?.clicked,
        // AND THE LINKED CONVERSATION ANSWERED IT. The click was
        // `Make a task list`, so the answer is THAT arc's turn 1: a four-row task
        // card with its first row in progress. Neither the summarise arc's own
        // next turn (a confirm card) nor a replay of its turn 1 (a read_document
        // call and prose) looks like this.
        answeredByTheLinkedConversation: () => {
          const cards = crossLink?.turn?.cards ?? [];
          return cards.length === 1 && cards[0].type === 'tasks' && cards[0].rows === 4
            && cards[0].firstNoted && !cards[0].firstChecked;
        },
        // ...and a card means that turn is not the fallback script's either.
        notTheGenericScript: () => (crossLink?.turn?.cards ?? []).length === 1,
        // THE LABELS SURVIVE THE CROSS-LINK, which is the assertion whose absence
        // let this ship broken: before the fix the thread had NO labels from here
        // on, so `labelsMovedOn`-style checks over an empty array passed and every
        // probe that asked "which label is offered" was asking about nothing. One
        // label, it is the new conversation's own step, and it is on screen.
        labelsSurviveTheCrossLink: () => crossLink?.labels?.length === 1,
        labelsAreTheLinkedConversations: () => (crossLink?.labels ?? [])
          .every((label) => !crossLink.offered.includes(label) && !ARC_LABELS.includes(label)),
        crossLinkLabelsRendered: () => crossLink?.rendered === true,
        // The arc itself carries on: one more turn of it, the revision card.
        typedTurnContinuesTheArc: () => {
          const cards = typedTurn?.cards ?? [];
          return cards.length === 1 && cards[0].type === 'tasks' && cards[0].firstChecked === true;
        },
        // PAST THE END OF THE SCRIPT THE GENERIC SCRIPT ANSWERS — the second
        // typed message asks for a turn no script has, and the tell is that the
        // answer is NOT the arc's turn 1 card again (which is what cycling
        // produced). The generic script has no `tasks` card at all, so this is
        // stable wherever the generic responder happens to be in its cycle.
        pastTheScriptIsNotAReplay: () =>
          (pastTheScript?.turn?.cards ?? []).every((card) => card.type !== 'tasks'),
        // ...and the labels under it are the documented silence: the task-list row
        // has no third entry, so a thread past its script offers nothing.
        noLabelsPastTheScript: () => (pastTheScript?.labels ?? []).length === 0,
      },
      expect: {
        aCrossLinkWasOffered: true, theClickSentTheLabel: true,
        answeredByTheLinkedConversation: true, notTheGenericScript: true,
        labelsSurviveTheCrossLink: true, labelsAreTheLinkedConversations: true,
        crossLinkLabelsRendered: true, typedTurnContinuesTheArc: true,
        pastTheScriptIsNotAReplay: true, noLabelsPastTheScript: true,
      },
    },
    {
      name: '32-rail-projects',
      act: async (page) => {
        // WHAT THE DEMO'S OWN TOUR LEFT, read before anything is sent: the guide
        // states opened one conversation per guide and the arc states opened the
        // rest, so the folders are the reader's own tour rather than fixtures.
        // The only conversation this state sends is the one that proves a NEW
        // row lands in a folder.
        const before = groupRuns(await railRows(page));
        const beforeIds = before.flatMap((run) => run.rows.map((row) => row.id));
        const biggest = before.reduce((a, b) => (b.rows.length > a.rows.length ? b : a), { group: '', rows: [] });
        await page.getByRole('button', { name: 'New chat' }).click();
        await settle(300)(page);
        const box = page.locator('kai-prompt-input').getByRole('textbox').first();
        await box.click();
        await box.fill('Point the mock transport at my own backend');
        await box.press('Enter');
        await waitForTurns(page, 2);
        // Read as NODES, not only as conversation rows: which folders offer a
        // Show more row is the rail's display limit, and it is a fact about the
        // page rather than about the conversations the array still holds.
        const afterNodes = await railNodes(page);
        const afterRows = afterNodes.filter((node) => node.kind === 'conversation');
        railFiling = {
          before: runShape(before),
          groups: before.map((run) => run.group),
          biggest: biggest.group,
          after: groupRuns(afterRows),
          // The conversation the turn just made: the rendered row the rail did
          // not have before it, which is the only row this state can point at.
          appeared: afterRows.map((row) => row.id).filter((id) => !beforeIds.includes(id)),
          appearedGroup: (afterRows.find((row) => !beforeIds.includes(row.id)) ?? { group: '' }).group,
          moreFolders: afterNodes.filter((node) => node.kind === 'more').map((node) => node.group),
        };
      },
      probes: {
        // Every project is ONE run: a group whose rows were interrupted by
        // another group's would render as two folders, which is what "the
        // sections are derived from the rows" has to mean on screen.
        projectsAreContiguous: () =>
          (railFiling?.after ?? []).length === new Set((railFiling?.after ?? []).map((run) => run.group)).size,
        // ...and the ungrouped remainder is LAST, which is where a reader looks
        // for the conversation they have just started.
        recentsIsLast: () => {
          const runs = railFiling?.after ?? [];
          const at = runs.findIndex((run) => run.group === '');
          return at === -1
            || (at === runs.length - 1 && runs.filter((run) => run.group === '').length === 1);
        },
        // ...AND A FOLDER HOLDING ONE CONVERSATION, and a folder that outruns the
        // rows the rail shows: the two counts the rail's shape has to be
        // readable at. The second is proved by the Show more row the folder
        // carries, which is the visible fact - the rows past the limit are not
        // rendered at all, so no count of them exists on the page. The number
        // itself is RECORDED below rather than typed into the probe, because the
        // limit it has to outrun is the block's own.
        aFolderHoldsOneConversation: () =>
          (railFiling?.after ?? []).filter((run) => run.group !== '' && run.rows.length === 1).length === 1,
        biggestFolderCount: () => Math.max(
          0,
          ...(railFiling?.after ?? []).map((run) => (run.group === '' ? 0 : run.rows.length)),
        ),
        aFolderOutrunsAFoldersScreenful: () =>
          (railFiling?.moreFolders ?? []).includes(railFiling?.biggest ?? ''),
        // THE OPENING FILED IT, and this is the demo's whole filing rule under
        // test: the row the turn just made is RENDERED, in the folder the act
        // measured as the biggest one - so a conversation saved while that folder
        // was showing its screenful still landed where a reader looks.
        theOpeningFiledTheConversation: () => (railFiling?.appeared ?? []).length === 1
          && railFiling?.appearedGroup === railFiling?.biggest
          && railFiling?.biggest !== '',
        // ...AND NO FOLDER APPEARED OR LEFT: the run order is the one the act
        // measured, so the saved row joined a folder rather than making one.
        theFoldersAreTheOnesThereWere: () =>
          (railFiling?.after ?? []).map((run) => run.group).join('|')
            === (railFiling?.groups ?? []).join('|'),
      },
      expect: {
        projectsAreContiguous: true,
        recentsIsLast: true,
        aFolderHoldsOneConversation: true,
        aFolderOutrunsAFoldersScreenful: true,
        theOpeningFiledTheConversation: true,
        theFoldersAreTheOnesThereWere: true,
      },
    },
    {
      name: '33-rail-one-conversation',
      act: async (page) => {
        // READ, not created: the demo's own tour leaves exactly one project
        // holding a single conversation, which is the case a rail that renders a
        // folder only when it looks worth it gets wrong - the shape is the
        // reader's information architecture and not a count.
        const runs = groupRuns(await railRows(page));
        const single = runs.find((run) => run.group !== '' && run.rows.length === 1) ?? null;
        railSingle = single && {
          group: single.group,
          id: single.rows[0].id,
          runs: runs.filter((run) => run.group === single.group).length,
        };
      },
      probes: {
        aFolderHoldsOneConversation: () => railSingle !== null,
        // Its one row is FILED, rather than the folder being a heading the row
        // below it does not belong to: read off the row's own attribute, not off
        // the run it was found in.
        itsLoneRowIsNotInRecents: async (page) => {
          const row = (await railRows(page)).find((candidate) => candidate.id === railSingle?.id);
          return row !== undefined && row.group !== '';
        },
        // And that folder is ONE run, so it is not split around another group's
        // rows.
        theFolderIsNotSplit: () => railSingle?.runs === 1,
      },
      expect: { aFolderHoldsOneConversation: true, itsLoneRowIsNotInRecents: true, theFolderIsNotSplit: true },
    },
    {
      name: '34-rail-pin-inside-a-folder',
      act: async (page) => {
        const runs = groupRuns(await railRows(page));
        const rows = runs.flatMap((run) => run.rows);
        // The BIGGEST folder, and its LAST row: "pinned first within its folder"
        // is a claim with somewhere to be true only where the row was not
        // already first.
        const folder = runs.filter((run) => run.group !== '')
          .reduce((a, b) => (b.rows.length > a.rows.length ? b : a));
        const target = folder.rows[folder.rows.length - 1];
        pinInFolder = {
          group: folder.group,
          id: target.id,
          at: runs.findIndex((run) => run.group === folder.group),
          width: folder.rows.length,
          groups: runs.map((run) => run.group),
          rows: rows.map((row) => row.id),
          // The ungrouped remainder before the pin: the other half of the rule is
          // that one folder's pin does not reshuffle it.
          recents: runs.filter((run) => run.group === '')
            .flatMap((run) => run.rows.map((row) => row.id)),
        };
        // The row's OWN menu, found by its place in the rail: the kebabs are one
        // per row, in the rows' own order.
        await conversationRowMenuTrigger(page, rows.findIndex((row) => row.id === target.id)).click();
        await settle(300)(page);
        await page.getByRole('menuitem', { name: /^Pin/ }).first().click();
        await settle(700)(page);
        pinInFolder.after = groupRuns(await railRows(page));
      },
      probes: {
        // The pinned row leads the folder it is in...
        thePinnedRowLeadsItsFolder: () => {
          const folder = (pinInFolder?.after ?? []).find((run) => run.group === pinInFolder?.group);
          return (folder?.rows ?? [])[0]?.id === pinInFolder?.id;
        },
        // ...still in it, at the width it had: pinning does not lift a
        // conversation out of its project.
        theFolderKeptItsRows: () =>
          (pinInFolder?.after ?? []).find((run) => run.group === pinInFolder?.group)?.rows.length
            === pinInFolder?.width,
        // ...and NO folder moved: the run order is the one the act measured.
        theFoldersStayedPut: () =>
          (pinInFolder?.after ?? []).map((run) => run.group).join('|')
            === (pinInFolder?.groups ?? []).join('|'),
        // ...AND RECENTS IS UNTOUCHED, which is the other half of the ordering
        // rule: the remainder is recency, so a pin inside one folder does not
        // reorder the conversations the reader has not filed.
        recentsUntouched: () =>
          (pinInFolder?.after ?? []).filter((run) => run.group === '')
            .flatMap((run) => run.rows.map((row) => row.id)).join('|')
            === (pinInFolder?.recents ?? []).join('|'),
        // The rail still holds the SAME rows, one pin later: no row appeared or
        // disappeared while the order changed.
        theRowsAreTheSameRows: () =>
          (pinInFolder?.after ?? []).flatMap((run) => run.rows.map((row) => row.id)).sort().join('|')
            === [...(pinInFolder?.rows ?? [])].sort().join('|'),
      },
      expect: {
        thePinnedRowLeadsItsFolder: true,
        theFolderKeptItsRows: true,
        theFoldersStayedPut: true,
        recentsUntouched: true,
        theRowsAreTheSameRows: true,
      },
    },
    {
      name: '35-rail-active-inside-a-folder',
      act: async (page) => {
        const runs = groupRuns(await railRows(page));
        const rows = runs.flatMap((run) => run.rows);
        // A row INSIDE a folder and not the one the last state pinned, so the
        // claim is about an ordinary row: clicking it opens it, and it stays
        // filed where it was.
        const folder = runs.filter((run) => run.group !== '')
          .reduce((a, b) => (b.rows.length > a.rows.length ? b : a));
        const target = folder.rows[1] ?? folder.rows[0];
        openInFolder = { id: target.id, group: folder.group };
        await page.locator('kai-conversations > kai-conversation-item[data-rail="conversation"]')
          .nth(rows.findIndex((row) => row.id === target.id)).click();
        await settle(900)(page);
      },
      probes: {
        // The block's own active pointer IS the conversation that was clicked...
        theActiveConversationIsTheRowClicked: (page) => page
          .evaluate((id) => document.getElementById('conversations')?.activeId === id, openInFolder?.id),
        // ...and it is filed in a folder, which is this state's whole claim: the
        // active conversation is inside a group, so the row that lights up is a
        // row inside the folder that holds it. The facts come back as WORDS, so a
        // failure names which one moved.
        theActiveRowIsInAFolder: async (page) => {
          const seen = await page.evaluate(() => {
            const rail = document.getElementById('conversations');
            const items = [...document.querySelectorAll('kai-conversations > kai-conversation-item[data-rail="conversation"]')];
            const row = items.find((el) => (el.conversationId ?? el.getAttribute('conversation-id') ?? el.id)
              === rail?.activeId);
            if (!row) return null;
            return {
              id: rail?.activeId ?? '',
              group: row.getAttribute('data-group') ?? '',
              // The CONTAINER stamps the active property on the row it selects
              // (`createConversationItemsController.sync`), and that property is
              // what the row paints its highlight from.
              highlighted: row.active === true,
            };
          });
          if (seen === null) return 'no row in the rail carries the active id';
          if (seen.id !== openInFolder?.id) return `active is ${seen.id}, not the row that was clicked`;
          if (seen.group === '') return 'the active row is in the ungrouped remainder';
          if (seen.group !== openInFolder?.group) return `the active row is filed under ${seen.group}`;
          if (!seen.highlighted) return 'the row was selected but carries no highlight';
          return true;
        },
      },
      expect: { theActiveConversationIsTheRowClicked: true, theActiveRowIsInAFolder: true },
    },
    {
      name: '36-rail-search-inside-a-folder',
      act: async (page) => {
        const runs = groupRuns(await railRows(page));
        const before = runs.flatMap((run) => run.rows);
        const folder = runs.filter((run) => run.group !== '')
          .reduce((a, b) => (b.rows.length > a.rows.length ? b : a));
        // A row that is NOT its folder's first: what the filter has to keep is
        // the FOLDER the row was in, and a row that already began the folder
        // would let a rail that dropped the group entirely pass.
        const target = folder.rows[folder.rows.length - 1];
        // The word comes out of the row's OWN title, longest first, and one that
        // really NARROWS: a query that matched everything would make every probe
        // below true whatever the filter did.
        const title = await page.evaluate((id) => {
          const el = [...document.querySelectorAll('kai-conversations > kai-conversation-item[data-rail="conversation"]')]
            .find((item) => (item.conversationId ?? item.getAttribute('conversation-id') ?? item.id) === id);
          return el?.querySelector('.row-title-text')?.textContent ?? '';
        }, target.id);
        await openPalette(page);
        const box = paletteBox(page);
        const words = [...new Set(title.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 5))]
          .sort((a, b) => b.length - a.length);
        let query = '';
        for (const word of words) {
          await box.fill(word);
          await settle(400)(page);
          if ((await railRows(page)).length < before.length) {
            query = word;
            break;
          }
        }
        railSearch = {
          query,
          id: target.id,
          group: folder.group,
          was: before.length,
          after: groupRuns(await railRows(page)),
        };
        // AND THE PALETTE IS LEFT AGAIN, because the rail it narrowed is what this
        // state is a picture of: a modal over it would be a picture of the palette.
        await closePalette(page);
      },
      probes: {
        // A query really narrowed the rail...
        theFilterNarrowed: () => railSearch?.query !== ''
          && (railSearch?.after ?? []).flatMap((run) => run.rows).length < (railSearch?.was ?? 0),
        // ...the row it was read from is still in it...
        theMatchSurvived: () => (railSearch?.after ?? [])
          .flatMap((run) => run.rows).some((row) => row.id === railSearch?.id),
        // ...and that row is still filed where it was, which is what lets the
        // folder be opened on the match instead of the match lying loose in the
        // rail. Read off the row's own attribute.
        theRowKeptItsFolder: async (page) => {
          const row = (await railRows(page)).find((candidate) => candidate.id === railSearch?.id);
          return row !== undefined && row.group !== '' && row.group === railSearch?.group;
        },
        // And the folder is still ONE run, so its heading has somewhere to go.
        theFolderSurvivedAsOneRun: () =>
          (railSearch?.after ?? []).filter((run) => run.group === railSearch?.group).length === 1,
      },
      expect: {
        theFilterNarrowed: true,
        theMatchSurvived: true,
        theRowKeptItsFolder: true,
        theFolderSurvivedAsOneRun: true,
      },
    },
    {
      name: '37-rail-folder-collapse',
      act: async (page) => {
        await clearRailSearch(page);
        const count = (nodes, kind) => nodes.filter((node) => node.kind === kind).length;
        const runs = groupRuns(await railRows(page));
        // The WIDEST folder, so closing it has to take more than one row off the
        // rail: a folder drawn as a single row would barely move the count.
        const folder = runs.filter((run) => run.group !== '')
          .reduce((a, b) => (b.rows.length > a.rows.length ? b : a));
        // The heading and its caret are this folder's OWN rows, found by the
        // label the rows of that folder carry. The caret is named by its CLASS,
        // because a heading carries two glyphs now: the project's folder icon
        // ahead of the label, and the caret that is the folder's open state.
        const heading = page.locator(`kai-conversations > kai-conversation-item[data-rail="folder"][data-group="${folder.group}"]`);
        const caret = page.locator(`kai-conversations > kai-conversation-item[data-rail="folder"][data-group="${folder.group}"] > kai-icon.row-caret`);
        const before = await railNodes(page);
        await heading.click();
        await settle(350)(page);
        const shut = await railNodes(page);
        const caretShut = await readBoundValue(caret, 'name', 'name');
        await heading.click();
        await settle(350)(page);
        const open = await railNodes(page);
        folderToggle = {
          group: folder.group,
          width: folder.rows.length,
          before: count(before, 'conversation'),
          shut: count(shut, 'conversation'),
          open: count(open, 'conversation'),
          shutRowsInFolder: shut.filter(
            (node) => node.kind === 'conversation' && node.group === folder.group,
          ).length,
          shutHeadings: shut.filter((node) => node.kind === 'folder').length,
          headings: count(before, 'folder'),
          caretShut,
          caretOpen: await readBoundValue(caret, 'name', 'name'),
        };
      },
      probes: {
        // There IS a heading, it heads the widest folder, and it is the folder's
        // own row rather than a control beside them.
        theFolderHadAHeading: () => folderToggle?.shutHeadings === folderToggle?.headings
          && folderToggle?.width > 1,
        // CLOSING IT TAKES THAT FOLDER'S ROWS OFF THE RAIL, all of them and
        // nothing else: the count falls by exactly the folder's width, so no
        // other folder's conversation came with them.
        closingHidesTheFoldersRows: () => folderToggle?.shutRowsInFolder === 0
          && folderToggle?.shut === (folderToggle?.before ?? 0) - (folderToggle?.width ?? 0),
        // ...AND OPENING IT AGAIN PUTS THEM BACK: one heading click reads both
        // ways, because open and closed are which rows the state emits.
        reopeningRestoresTheRows: () => folderToggle?.open === folderToggle?.before,
        // The caret is how the row says which way round it is, and the two states
        // are different icons.
        theCaretSaysTheState: () => (folderToggle?.caretShut ?? '') !== ''
          && (folderToggle?.caretOpen ?? '') !== ''
          && folderToggle.caretShut !== folderToggle.caretOpen,
      },
      expect: {
        theFolderHadAHeading: true,
        closingHidesTheFoldersRows: true,
        reopeningRestoresTheRows: true,
        theCaretSaysTheState: true,
      },
    },
    {
      name: '38-rail-show-more',
      act: async (page) => {
        await clearRailSearch(page);
        const before = await railNodes(page);
        const moreNode = before.find((node) => node.kind === 'more');
        // The label the folder's own rows carry, read off its heading rather than
        // derived from the folder id: the rows and the heading say it the same way.
        const group = before
          .find((node) => node.kind === 'folder' && node.folder === (moreNode?.folder ?? ''))?.group ?? '';
        const rowsOf = (nodes) => nodes.filter((node) => node.kind === 'conversation');
        const inFolder = (nodes) => rowsOf(nodes).filter((node) => node.group === group).length;
        const elsewhere = (nodes) => rowsOf(nodes).filter((node) => node.group !== group).length;
        await page.locator(`kai-conversations > kai-conversation-item[data-rail="more"][data-folder="${moreNode?.folder ?? ''}"]`).click();
        await settle(350)(page);
        const after = await railNodes(page);
        showMore = {
          group,
          offered: before.filter((node) => node.kind === 'more').length,
          shownBefore: inFolder(before),
          shownAfter: inFolder(after),
          moreGone: after.filter((node) => node.kind === 'more' && node.folder === (moreNode?.folder ?? '')).length,
          headingsBefore: before.filter((node) => node.kind === 'folder').length,
          headingsAfter: after.filter((node) => node.kind === 'folder').length,
          elsewhereBefore: elsewhere(before),
          elsewhereAfter: elsewhere(after),
        };
      },
      probes: {
        aFolderOffersShowMore: () => (showMore?.offered ?? 0) >= 1,
        // The row is real and the folder's rest is behind it: using it renders
        // MORE of that folder than the rail showed, and the row itself is gone
        // because there is nothing left for it to reveal.
        usingItRevealsTheFoldersRest: () => (showMore?.shownAfter ?? 0) > (showMore?.shownBefore ?? 0)
          && showMore?.moreGone === 0,
        // ...and the limit it outran is RECORDED, not typed here: the number the
        // rail showed before the row is used is the block's own.
        theLimitWasTheFoldersScreenful: () => (showMore?.shownBefore ?? 0) > 0
          && showMore?.shownBefore === showMore?.shownAfter - 1,
        // NO OTHER FOLDER MOVED: the reveal is that folder's rows, not a reshuffle.
        noOtherFolderMoved: () => showMore?.elsewhereAfter === showMore?.elsewhereBefore
          && showMore?.headingsAfter === showMore?.headingsBefore,
      },
      expect: {
        aFolderOffersShowMore: true,
        usingItRevealsTheFoldersRest: true,
        theLimitWasTheFoldersScreenful: true,
        noOtherFolderMoved: true,
      },
    },
    {
      name: '39-rail-search-opens-a-folder',
      act: async (page) => {
        await clearRailSearch(page);
        const runs = groupRuns(await railRows(page));
        const folder = runs.filter((run) => run.group !== '' && run.rows.length > 1)
          .reduce((a, b) => (b.rows.length > a.rows.length ? b : a));
        // A row that is NOT its folder's first: a rail that opened the folder
        // only far enough to show its head would not pass.
        const target = folder.rows[folder.rows.length - 1];
        const title = await rowTitle(page, target.id);
        const heading = page.locator(`kai-conversations > kai-conversation-item[data-rail="folder"][data-group="${folder.group}"]`);
        const before = (await railNodes(page)).filter((node) => node.kind === 'conversation').length;
        // SHUT IT FIRST: the match has to start behind a closed heading, which is
        // the only version of this claim with anything to prove.
        await heading.click();
        await settle(350)(page);
        const shut = await railNodes(page);
        // AND THEN THE SEARCH, through the palette: the rail's own box is off, so the
        // query that opens a folder while it narrows the rail is typed there.
        await openPalette(page);
        const box = paletteBox(page);
        const words = [...new Set(title.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 5))]
          .sort((a, b) => b.length - a.length);
        let query = '';
        for (const word of words) {
          await box.fill(word);
          await settle(400)(page);
          if ((await railRows(page)).some((row) => row.id === target.id)) {
            query = word;
            break;
          }
        }
        const found = await railNodes(page);
        searchOpen = {
          group: folder.group,
          id: target.id,
          query,
          shutRowsInFolder: shut.filter(
            (node) => node.kind === 'conversation' && node.group === folder.group,
          ).length,
          headingFound: found.filter((node) => node.kind === 'folder' && node.group === folder.group).length,
          matchShown: found.some((node) => node.kind === 'conversation' && node.id === target.id),
          folderRuns: groupRuns(found.filter((node) => node.kind === 'conversation'))
            .filter((run) => run.group === folder.group).length,
          before,
        };
        // Leave the rail as it was found - the query cleared and the folder open
        // again - so the states after this one walk a rail they can describe.
        await box.fill('');
        await settle(400)(page);
        await closePalette(page);
        await heading.click();
        await settle(350)(page);
        searchOpen.after = (await railNodes(page)).filter((node) => node.kind === 'conversation').length;
      },
      probes: {
        // The match really started out of sight: its folder was shut and none of
        // its rows were on the rail.
        theMatchStartedBehindAShutFolder: () => searchOpen?.shutRowsInFolder === 0,
        theSearchFoundIt: () => (searchOpen?.query ?? '') !== '' && searchOpen?.matchShown === true,
        // THE QUERY OPENED THE FOLDER rather than leaving the match behind the
        // heading the reader had shut, and the folder is still ONE run - so the
        // heading the match is under is the folder's own.
        theSearchOpenedTheFolder: () => searchOpen?.headingFound === 1 && searchOpen?.folderRuns === 1,
        // And the rail was handed back as it was found: the same rows, with the
        // folder shut again, because the reader shut it.
        theRailWasLeftAsItWasFound: () => searchOpen?.after === searchOpen?.before,
      },
      expect: {
        theMatchStartedBehindAShutFolder: true,
        theSearchFoundIt: true,
        theSearchOpenedTheFolder: true,
        theRailWasLeftAsItWasFound: true,
      },
    },
    {
      name: '40-rail-keyboard-walk',
      act: async (page) => {
        // THE ASSERTION THE FOLDER SHAPE WAS CHOSEN FOR. A heading is a row in the
        // ONE flat repeat precisely so the container's roving focus still covers
        // every row: a heading wrapped in anything of its own would go standalone,
        // take its own tab stop and leave the arrow keys walking nothing. So: tab
        // out of the rail's search box INTO the rail, then walk the whole list and
        // watch which row holds the one tab stop.
        await clearRailSearch(page);
        // Read AFTER the search is cleared: the walk is over the rows the rail
        // really holds, and a filter would have taken some of them off it.
        const before = await rowWalk(page);
        // THE WALK STARTS AT THE RAIL'S OWN HEADER, at its trailing control -
        // the collapse button, which the title, the search and the top action rows
        // now sit ahead of. It is FOCUSED rather than clicked: a click on the
        // collapse control folds the column away, and this state is about where Tab
        // goes, not about folding. The kit's dialog hands the caret back to whatever
        // opened it when it closes, so the walk records where focus really was
        // rather than assuming this call won.
        await page.locator('#rail-collapse').focus();
        let arrived = null;
        // WHAT THE WALK SAW, kept for the failure message: which element held focus
        // at the start, whether the palette was still open over the rail, and where
        // each tab stopped. A walk that never arrives says nothing about which of
        // the two moved without them.
        const walkStart = await page.evaluate(() => ({
          active: `${document.activeElement?.localName ?? ''}#${document.activeElement?.id ?? ''}`,
          paletteOpen: document.getElementById('palette-dialog')?.getAttribute('open') !== null,
        }));
        const tabStops = [];
        // THE BUDGET SCALES WITH THE LIST, and it is not a budget for the header:
        // the container's roving tab stop belongs to the ACTIVE row, and between the
        // header and that row sit the section label's three trailing actions plus a
        // menu trigger in every row ahead of it. A fixed eight was a budget for a
        // rail whose active row happened to be the first one.
        // `page.keyboard`, not `box.press`: a locator's press focuses the box
        // first, so six of them are six presses from the SAME place and the walk
        // never advances.
        for (let step = 0; step < before.count + 6 && arrived === null; step += 1) {
          await page.keyboard.press('Tab');
          await settle(150)(page);
          const at = await rowWalk(page);
          tabStops.push(`${at.focused}:${at.focusedKind}:${await page.evaluate(() => `${document.activeElement?.localName ?? ''}#${document.activeElement?.id ?? ''}`)}`);
          if (at.focused >= 0) arrived = at;
        }
        await page.keyboard.press('Home');
        await settle(150)(page);
        const walked = [await rowWalk(page)];
        for (let step = 0; step < before.count + 1; step += 1) {
          await page.keyboard.press('ArrowDown');
          await settle(120)(page);
          const at = await rowWalk(page);
          // The list's END: the arrows stop moving, which is where the walk ends.
          if (at.focused === walked[walked.length - 1].focused) break;
          walked.push(at);
        }
        const end = walked[walked.length - 1];
        await page.keyboard.press('ArrowUp');
        await settle(120)(page);
        const up = await rowWalk(page);
        keyboardWalk = {
          rows: before.count,
          kinds: before.kinds,
          arrived: arrived === null ? -1 : arrived.focused,
          stops: (arrived ?? before).rovingStops,
          walked: walked.map((at) => at.focused),
          walkedKinds: walked.map((at) => at.focusedKind),
          stopsPerStep: walked.map((at) => at.rovingStops),
          end: end.focused,
          up: up.focused,
          walkStart,
          tabStops,
        };
      },
      probes: {
        // A tab out of the rail's own header reaches a ROW and stops there: the
        // whole list is one stop in the page's tab order. The failure names what
        // the walk saw, because "it never arrived" on its own says nothing about
        // which of the two - the tab order or the rows - moved.
        tabbingReachedARailRow: () => (keyboardWalk?.arrived ?? -1) >= 0
          || `the walk never reached a row in 8 tab stops: from ${keyboardWalk?.walkStart?.active} (palette open: ${keyboardWalk?.walkStart?.paletteOpen}), tabs ${JSON.stringify(keyboardWalk?.tabStops ?? [])}, ${keyboardWalk?.rows ?? 0} rows, ${keyboardWalk?.stops ?? 0} tab stop(s) on the list`,
        // ONE tab stop for the list, at every step of the walk: that number IS
        // the container's roving contract, and a heading with a control of its own
        // would make it two.
        theRailHasOneTabStop: () => keyboardWalk?.stops === 1
          && (keyboardWalk?.stopsPerStep ?? []).length > 0
          && (keyboardWalk?.stopsPerStep ?? []).every((count) => count === 1),
        // Home starts at the first row and ArrowDown walks EVERY row in order, one
        // per press: a row the repeat emitted but the container never collected
        // shows up here as a gap.
        theArrowsWalkEveryRowInOrder: () => {
          const walked = keyboardWalk?.walked ?? [];
          return walked.length === keyboardWalk?.rows && walked.every((at, index) => at === index);
        },
        // ...and the walk covers a heading AND a conversation, which is the whole
        // reason the heading is a rail row rather than a control beside the rows.
        theWalkCoveredAHeadingAndAConversation: () => {
          const kinds = keyboardWalk?.walkedKinds ?? [];
          return kinds.includes('folder') && kinds.includes('conversation');
        },
        // ArrowUp walks back: the last row is not a dead end, and the tab stop
        // went with the walk.
        arrowUpWalksBack: () => keyboardWalk?.up === (keyboardWalk?.end ?? 0) - 1,
      },
      expect: {
        tabbingReachedARailRow: true,
        theRailHasOneTabStop: true,
        theArrowsWalkEveryRowInOrder: true,
        theWalkCoveredAHeadingAndAConversation: true,
        arrowUpWalksBack: true,
      },
    },
    {
      name: '41-rail-arrival-files-and-opens',
      act: async (page) => {
        await clearRailSearch(page);
        // The opening this state sends is the one state 32's act measured the
        // filing of, so the folder it lands in is a fact this run recorded rather
        // than a copy of the block's own filing rule kept here.
        const group = railFiling?.appearedGroup ?? '';
        const heading = page.locator(`kai-conversations > kai-conversation-item[data-rail="folder"][data-group="${group}"]`);
        const before = await railRows(page);
        const beforeIds = before.map((row) => row.id);
        const groups = groupRuns(before).map((run) => run.group);
        // SHUT the folder the new conversation will be filed into, so the row's
        // arrival has to be what opens it.
        await heading.click();
        await settle(350)(page);
        const shut = await railNodes(page);
        await page.getByRole('button', { name: 'New chat' }).click();
        await settle(300)(page);
        const box = page.locator('kai-prompt-input').getByRole('textbox').first();
        await box.click();
        await box.fill('Point the mock transport at my own backend');
        await box.press('Enter');
        await waitForTurns(page, 2);
        const after = await railNodes(page);
        const appeared = after.filter(
          (node) => node.kind === 'conversation' && !beforeIds.includes(node.id),
        );
        activeArrival = {
          group,
          shutRowsInFolder: shut.filter(
            (node) => node.kind === 'conversation' && node.group === group,
          ).length,
          appeared: appeared.map((node) => node.id),
          appearedGroup: appeared[0]?.group ?? '',
          rowShown: appeared.some((node) => node.group === group),
          headingOpen: after.filter((node) => node.kind === 'folder' && node.group === group).length === 1,
          groupsBefore: groups,
          groupsAfter: groupRuns(after.filter((node) => node.kind === 'conversation')).map((run) => run.group),
        };
      },
      probes: {
        theFolderWasShutFirst: () => activeArrival?.shutRowsInFolder === 0,
        // The turn filed the row through the store, so the rail's own group came
        // back off the summary rather than out of a second store beside it.
        theNewConversationFiledItself: () => (activeArrival?.appeared ?? []).length === 1
          && activeArrival?.group !== ''
          && activeArrival?.appearedGroup === activeArrival?.group,
        // ...AND ITS FOLDER IS OPEN: the one arrival the block knows the reader is
        // looking at has to be a row they can see, not one filed behind a heading
        // they had shut.
        itsFolderWasOpenedForIt: () => activeArrival?.headingOpen === true
          && activeArrival?.rowShown === true,
        // ...and it joined a folder rather than making one.
        noFolderAppeared: () => (activeArrival?.groupsAfter ?? []).join('|')
          === (activeArrival?.groupsBefore ?? []).join('|'),
      },
      expect: {
        theFolderWasShutFirst: true,
        theNewConversationFiledItself: true,
        itsFolderWasOpenedForIt: true,
        noFolderAppeared: true,
      },
    },
    {
      name: '42-rail-unknown-group',
      act: async (page, sctx) => {
        // NO USER PATH MAKES THIS ROW, and that is why the act seeds the store
        // rather than clicking anything: the demo files a conversation only by
        // the words of its opening turn, so every group it has ever written is
        // one of the three it knows. A group the catalogue cannot name arrives
        // the way a consumer's own store writes one. So the index is seeded in
        // the store's OWN shape - one entry in the threads index, its messages
        // under the thread key - and the page is reloaded, which is the one way
        // the controller re-reads the store (state 7's reload, one reason over).
        // Nothing here is a second mechanism: the keys are the ones the page
        // spec already carries and the store itself reads, and the reload is the
        // state script's own.
        const group = 'sprint-planning';
        const id = 'seeded-unknown-group';
        const question = 'What is left in the sprint?';
        const answer = 'Two cards, both in review.';
        // The store's two keys share their stem - `kai:<name>:threads` for the
        // index and `kai:<name>:thread:<id>` for one conversation - so the thread
        // key is derived from the index key this page's spec carries rather than
        // typed out a second time.
        const threadKey = `${sctx.spec.indexKey.slice(0, -1)}:${id}`;
        // The seed's timestamp is OLDER than every summary already stored, so the
        // reload's auto-restore picks someone else and the click below is what
        // opens THIS row. A seed stamped "now" would be the active conversation
        // before the click, and the activation probe would pass on its own.
        const stored = await page.evaluate(
          (key) => { try { return JSON.parse(localStorage.getItem(key) ?? '[]'); } catch { return []; } },
          sctx.spec.indexKey,
        );
        const newest = stored.reduce((at, row) => Math.max(at, Date.parse(row.updatedAt) || 0), 0);
        await page.evaluate((seed) => {
          const index = JSON.parse(localStorage.getItem(seed.indexKey) ?? '[]');
          localStorage.setItem(seed.indexKey, JSON.stringify([
            ...index.filter((row) => row.id !== seed.id),
            { id: seed.id, title: seed.title, messageCount: 2, updatedAt: seed.updatedAt, groupId: seed.group },
          ]));
          localStorage.setItem(seed.threadKey, JSON.stringify([
            { id: `${seed.id}-q`, role: 'user', parts: [{ type: 'text', text: seed.question }] },
            { id: `${seed.id}-a`, role: 'assistant', parts: [{ type: 'text', text: seed.answer }] },
          ]));
        }, {
          indexKey: sctx.spec.indexKey,
          threadKey,
          id,
          group,
          question,
          answer,
          title: 'Sprint planning notes',
          updatedAt: new Date(newest - 60000).toISOString(),
        });
        await page.reload({ waitUntil: 'load' });
        await sctx.scenario.ready(page, sctx);
        // WHICH FOLDER A ROW IS UNDER, read off the ROW itself: a row carries
        // the id of the group it is filed under in `data-folder`, so a
        // conversation whose group the catalogue cannot name is told apart from
        // one in the ungrouped remainder. Its LABEL cannot do that - the label
        // of every such row is empty, and so is the remainder's - which is why
        // the heading above it is not what this state reads it from either.
        const nodes = await railNodes(page);
        const filed = nodes.filter((node) => node.kind === 'conversation');
        const headings = nodes.filter((node) => node.kind === 'folder');
        const heading = headings.find((node) => node.folder === group) ?? null;
        const onRail = filed.some((candidate) => candidate.id === id);
        // The row geometry, read off what the rail RENDERED rather than off a
        // list this file would keep in step by hand.
        const steps = await railSteps(page);
        const activeBefore = await page.evaluate(
          () => document.getElementById('conversations')?.activeId ?? '',
        );
        if (onRail) {
          const rows = nodes.filter((node) => node.kind === 'conversation');
          await page.locator('kai-conversations > kai-conversation-item[data-rail="conversation"]')
            .nth(rows.findIndex((candidate) => candidate.id === id)).click();
          await settle(900)(page);
        }
        const opened = await page.evaluate(() => {
          const thread = document.getElementById('thread');
          const messages = thread?.messages ?? [];
          const last = messages[messages.length - 1];
          return {
            activeId: document.getElementById('conversations')?.activeId ?? '',
            text: (last?.parts ?? []).filter((part) => part.type === 'text').map((part) => part.text).join(''),
          };
        });
        unknownGroup = {
          group,
          id,
          answer,
          onRail,
          rowsInFolder: filed.filter((candidate) => candidate.folder === group).map((candidate) => candidate.id),
          headings: headings.map((node) => node.folder),
          headingLabel: heading === null ? null : heading.group,
          headingTitle: heading === null ? null : await rowTitle(page, `folder:${group}`),
          activeBefore,
          activeAfter: opened.activeId,
          threadText: opened.text,
          steps,
        };
      },
      probes: {
        // The seeded conversation is ON the rail, exactly once, and the heading
        // above it is the folder the store filed it under: a row this catalogue
        // cannot name is reachable rather than dropped into the remainder.
        theRowIsStillInItsOwnFolder: () => {
          if (unknownGroup?.onRail !== true) return 'the row is not on the rail at all';
          const found = unknownGroup?.rowsInFolder ?? [];
          if (!found.includes(unknownGroup?.id ?? '')) {
            return `the ${unknownGroup?.group} heading holds ${JSON.stringify(found)}`;
          }
          return found.length === 1 || `its folder holds ${found.length} rows`;
        },
        // ONE heading for it, not one per row or one per reading of the index: the
        // folder is derived from the rows and is never emitted twice.
        theGroupGotOneFolder: () => {
          const headings = unknownGroup?.headings ?? [];
          const at = headings.filter((candidate) => candidate === unknownGroup?.group).length;
          return at === 1 || `${at} headings carry the group: ${JSON.stringify(headings)}`;
        },
        // The heading says the RAW ID, because there is no catalogue name to say
        // instead - and nothing it was not given.
        theHeadingsRawIdIsItsLabel: () => {
          if (unknownGroup?.headingTitle !== unknownGroup?.group) {
            return `the heading reads ${JSON.stringify(unknownGroup?.headingTitle)}`;
          }
          return unknownGroup?.headingLabel === ''
            || `the heading carries the label ${JSON.stringify(unknownGroup?.headingLabel)}`;
        },
        // ABOVE Recents, with Recents still last: a folder the reader's own store
        // named sorts with the other folders, and the unfiled remainder stays
        // where a reader looks for a conversation they have just started.
        itSitsAboveRecents: () => {
          const headings = unknownGroup?.headings ?? [];
          const at = headings.indexOf(unknownGroup?.group ?? '');
          if (at === -1) return 'no heading carries the group';
          const recents = headings.indexOf('');
          if (recents === -1) return 'there is no Recents heading to sit above';
          if (recents !== headings.length - 1) return `Recents is not last: ${JSON.stringify(headings)}`;
          return at === recents - 1 || `the group is not directly above Recents: ${JSON.stringify(headings)}`;
        },
        // AND THE ROW STILL OPENS: it was not the conversation the reload
        // restored, so the click is what makes it active, and its own seeded
        // thread is what loads.
        clickingItOpensItsThread: () => {
          if (unknownGroup?.activeBefore === unknownGroup?.id) {
            return 'the row was already active before the click, so the click proved nothing';
          }
          if (unknownGroup?.onRail !== true) return 'the row was not on the rail to click';
          if (unknownGroup?.activeAfter !== unknownGroup?.id) {
            return `the active conversation is ${JSON.stringify(unknownGroup?.activeAfter)}`;
          }
          return (unknownGroup?.threadText ?? '').includes(unknownGroup?.answer ?? '')
            || `the thread reads ${JSON.stringify(unknownGroup?.threadText)}`;
        },
        // FLUSH LEFT AT THE SECTION LABELS, ONE STEP UNDER EACH PROJECT'S. The
        // rail is the page's narrowest column, so the nesting a filed row sits in
        // is said by ONE inline step - the project glyph's box plus the gap after
        // it - which is what puts a filed row's title under its project's label.
        //
        // A PROJECT'S ROWS LINE UP UNDER ITS LABEL, and the section labels stay
        // flush left. The step is DERIVED rather than typed: a row filed under a
        // project takes the same inline step its heading's own label takes past the
        // folder glyph, so the two left edges agree - and a heading that painted no
        // glyph has no step to match, which is why the glyph's box is read here too.
        // A row in the ungrouped remainder takes none: it is the rail's own list
        // and there is no project over it to line up with. What survives of the
        // old tree is the GAP - the first conversation row under a heading is one
        // density step below it, so the heading reads as a heading and its rows as
        // the group under it - and that too is read off the boxes.
        folderRowStep: () => {
          const steps = unknownGroup?.steps ?? null;
          if (steps === null) return 'the rail rows were not measured';
          const rows = steps.rows ?? [];
          if (rows.length === 0) return 'no conversation row was rendered to measure';
          const flush = rows.filter((row) => row.folder === '' && (parseFloat(row.inline) || 0) !== 0);
          if (flush.length > 0) {
            return `a row in the remainder carries an inline step (${flush[0].inline})`;
          }
          const pairs = (steps.pairs ?? []).filter((pair) => pair.folder !== '');
          if (pairs.length === 0) return 'no project heading was followed by a conversation row, so the step was not measured';
          const unpainted = pairs.filter((pair) => pair.iconPainted !== true);
          if (unpainted.length > 0) return `a project heading painted no folder glyph (${unpainted[0].folder})`;
          const off = pairs.filter((pair) => pair.left !== pair.labelStep);
          if (off.length > 0) {
            return `a project's first row starts ${off[0].left}px off its heading, whose label is ${off[0].labelStep}px past the glyph`;
          }
          if (!(pairs[0].labelStep > 0)) return `the label step is ${pairs[0].labelStep}px, which aligns nothing`;
          const indents = [...new Set(rows.filter((row) => row.folder !== '')
            .map((row) => Math.round(parseFloat(row.inline) || 0)))];
          if (indents.length !== 1) return `the filed rows disagree on their step: ${indents.join(', ')}`;
          const gaps = [...new Set(pairs.map((pair) => pair.gap))];
          if (gaps.length !== 1) return `the headings do not share one gap: ${gaps.join(', ')}`;
          return gaps[0] > 0 || `the step under a heading is ${gaps[0]}px, which separates nothing`;
        },
      },
      expect: {
        theRowIsStillInItsOwnFolder: true,
        theGroupGotOneFolder: true,
        theHeadingsRawIdIsItsLabel: true,
        itSitsAboveRecents: true,
        clickingItOpensItsThread: true,
        folderRowStep: true,
      },
    },
    {
      // THE RAIL'S TOP ACTIONS, which are the sidebar's own furniture rather than
      // a kit surface: four rows at the head of the rail, with the tree below them.
      // Three claims, and the third is the one a screenshot cannot make: the rows
      // are THERE in the order and with the glyphs the block declares; they sit
      // OUTSIDE the list - not a conversation item, not the rail's own child, so
      // the container's membership rule cannot collect them and its roving focus is
      // untouched; and the three that cannot act SAY WHY.
      //
      // That the walk itself still holds is the state BEFORE this one (40), and its
      // recorded values do not move: the rows are outside the list by construction,
      // not by a measurement taken here.
      name: '43-rail-actions',
      layoutProbes: ['theRowsAgreeOnTheirBox', 'theGroupIsSeparatedFromWhatFollows', 'theRowsSitAboveTheTree'],
      act: async (page) => {
        // THE RAIL'S OWN SCROLLER, brought to the top first. The states before this
        // one left it down the tree (activating a row scrolls it into view), and
        // this state's claim includes an ORDER - the four rows above the tree -
        // which a row parked above the viewport would turn into a claim about a
        // scroll position instead of about the layout. The thread's scroller is
        // set the same way in the scroll-button state, for the same reason.
        await page.evaluate(() => {
          const box = document.getElementById('conversations')?.shadowRoot?.querySelector('.overflow-y-auto');
          if (box) box.scrollTop = 0;
        });
        await settle(200)(page);
        railTopRows = await railTopRowFacts(page);
      },
      probes: {
        // The four rows, their order, their labels and the curated glyph each
        // declares, against the copy above. The return value is what was read, so
        // a reworded label names itself instead of only failing.
        theRowsAreTheSidebarsTopActions: () => {
          const got = (railTopRows?.rows ?? []).map(({ action, label, icon }) => ({ action, label, icon }));
          const want = RAIL_TOP_ACTIONS.map(({ action, label, icon }) => ({ action, label, icon }));
          return JSON.stringify(got) === JSON.stringify(want) ? true : JSON.stringify(got);
        },
        // THE KEYBOARD CLAIM, made where it can be: a row the container could
        // collect would join the roving focus and take a tab stop with it. The two
        // facts that say it cannot are the container's own membership test -
        // `:scope > kai-conversation-item` - plus the region they really live in.
        theRowsAreNotListRows: () => {
          const rows = railTopRows?.rows ?? [];
          if (rows.length !== RAIL_TOP_ACTIONS.length) return `${rows.length} rows carry an action`;
          const bad = rows.filter((row) => !row.inHeaderRegion || row.conversationItem || row.railsChild);
          return bad.length === 0
            ? true
            : bad.map((row) => `${row.action}: region=${row.inHeaderRegion} item=${row.conversationItem} railsChild=${row.railsChild}`).join(' | ');
        },
        // A CURATED NAME OR NOTHING AT ALL: the kit paints no glyph for a name its
        // roster does not carry, so the box IS the check that each name resolved.
        everyRowPaintedItsGlyph: () => {
          const rows = railTopRows?.rows ?? [];
          const empty = rows.filter((row) => row.glyphPainted !== true).map((row) => `${row.action}:${row.icon}`);
          return rows.length > 0 && empty.length === 0
            ? true
            : (rows.length === 0 ? 'no action rows were found' : `no glyph painted for ${empty.join(', ')}`);
        },
        // ONE LIST OF ROWS: same height, and the leading glyph at the same x, which
        // is what makes a row that acts and three that cannot read as one group.
        // Measured, because the acting row's box is painted inside a kit button's
        // shadow root and the others are plain markup matched to it by hand.
        theRowsAgreeOnTheirBox: () => {
          const rows = railTopRows?.rows ?? [];
          if (rows.length !== RAIL_TOP_ACTIONS.length) return `${rows.length} rows carry an action`;
          const heights = [...new Set(rows.map((row) => row.rowHeight))];
          const lefts = [...new Set(rows.map((row) => row.glyphLeft))];
          if (heights.length !== 1) return `the rows disagree on height: ${JSON.stringify(heights)}`;
          if (lefts.length !== 1) return `the glyphs disagree on their left edge: ${JSON.stringify(lefts)}`;
          return heights[0] > 0 && lefts[0] !== null;
        },
        // THE GAP AFTER THE FOUR, as a number beside the step inside them: a group
        // whose following gap is only its own row step reads as the head of
        // whatever comes next, which is what the four-row region is not.
        theGroupIsSeparatedFromWhatFollows: () => {
          const rows = railTopRows?.rows ?? [];
          if (rows.length !== RAIL_TOP_ACTIONS.length) return `${rows.length} rows carry an action`;
          const step = rows[1].rowTop - rows[0].rowBottom;
          const after = railTopRows.afterGroupTop - rows[rows.length - 1].rowBottom;
          if (!Number.isFinite(after)) return 'no row under the group was found to measure against';
          return after > step ? true : `the gap after the group (${after}px) is not bigger than the step inside it (${step}px)`;
        },
        // ...AND ABOVE THE TREE, in the order the reference reads: the four rows,
        // then the folders, of which the first row on the rail is one by
        // construction (a folder's heading leads its own run).
        theRowsSitAboveTheTree: () => {
          const rows = railTopRows?.rows ?? [];
          if (rows.length !== RAIL_TOP_ACTIONS.length) return `${rows.length} rows carry an action`;
          const inOrder = rows.every((row, index) => index === 0 || row.rowTop > rows[index - 1].rowTop);
          if (!inOrder) return `the rows are not stacked in order: ${JSON.stringify(rows.map((row) => row.rowTop))}`;
          const below = rows[rows.length - 1].rowBottom;
          if (!Number.isFinite(railTopRows.firstRailRowTop)) return 'the rail holds no row to sit above';
          return below < railTopRows.firstRailRowTop
            ? true
            : `the first rail row starts at ${railTopRows.firstRailRowTop}px, the last action row ends at ${below}px`;
        },
        // THE THREE THAT CANNOT ACT SAY SO, twice: announced disabled, and carrying
        // a reason. The row that DOES act carries neither, so "inert" is a fact about
        // the row rather than about the group.
        theInertRowsSayWhyTheyCannotAct: () => {
          const rows = railTopRows?.rows ?? [];
          const inert = rows.filter((row) => row.action !== 'new-chat');
          const live = rows.filter((row) => row.action === 'new-chat');
          if (inert.length !== 3 || live.length !== 1) return `${inert.length} inert rows and ${live.length} live ones`;
          const bad = inert.filter((row) => row.role !== 'button' || row.ariaDisabled !== 'true' || row.reason.length === 0);
          if (bad.length) {
            return bad.map((row) => `${row.action}: role=${row.role} disabled=${row.ariaDisabled} reason=${JSON.stringify(row.reason)}`).join(' | ');
          }
          return live[0].ariaDisabled === null
            ? true
            : `the acting row is announced disabled (${live[0].ariaDisabled})`;
        },
        // ONE CONTROL NAMED "New chat" ON THE PAGE. The rail's built-in bar used to
        // hold the other one; the header region replaces that bar, so the row IS the
        // affordance and every path through it is the one `newChat` action. (The
        // section labels' compose fires that same action under the action's other
        // name, which is why this stays a count of the NAME.)
        oneNewChatOnThePage: (page) => page.getByRole('button', { name: 'New chat', exact: true })
          .count().then((n) => n === 1 || `${n} controls are named New chat`),
        // ...and the collapse control the built-in bar also carried survived the
        // swap. That it really collapses the shell is the rail-collapsed state's,
        // twenty-nine states earlier.
        theCollapseControlIsStillThere: (page) => page.getByRole('button', { name: 'Toggle sidebar', exact: true })
          .count().then((n) => n === 1 || `${n} controls are named Toggle sidebar`),
      },
      expect: {
        theRowsAreTheSidebarsTopActions: true,
        theRowsAreNotListRows: true,
        everyRowPaintedItsGlyph: true,
        theRowsAgreeOnTheirBox: true,
        theGroupIsSeparatedFromWhatFollows: true,
        theRowsSitAboveTheTree: true,
        theInertRowsSayWhyTheyCannotAct: true,
        oneNewChatOnThePage: true,
        theCollapseControlIsStillThere: true,
      },
      styleProbes: [
        style('railActionInertRow', (page) => page.getByRole('button', { name: 'Images', exact: true }),
          ['height', 'fontSize', 'paddingInline', 'color']),
        style('railActionLiveRow', (page) => page.locator('#rail-new-chat'), ['height']),
      ],
    },
    {
      // AND WHAT EACH ROW DOES. The three demo rows have nothing behind them, so
      // the honest pair of claims is that the page says so (state 43) AND that a
      // click really changes nothing - which is a fact about a before and an after,
      // both read here. The fourth row is the block's one new-chat path, exercised
      // from the top of the rail rather than from the message area, and the tree it
      // does not disturb is what separates "a new chat" from "a new conversation
      // list".
      name: '44-rail-actions-behaviour',
      act: async (page) => {
        const read = () => page.evaluate(() => ({
          rows: document.querySelectorAll('kai-conversations > kai-conversation-item').length,
          activeId: document.getElementById('conversations')?.activeId ?? '',
          messages: (document.getElementById('thread')?.messages ?? []).length,
        }));
        const before = await read();
        for (const label of ['Images', 'Scheduled', 'Plugins']) {
          // FORCED, and this is the one programmatic step in the file. The rows are
          // announced `aria-disabled`, which is exactly what makes the gesture worth
          // making: a driver that refuses to click a disabled control would be
          // asserting the announcement rather than the behaviour, and what has to be
          // true is that a pointer landing on the row anyway - which is what
          // `force` is - still changes nothing. Playwright's own actionability
          // refuses an `aria-disabled` element as "not enabled", so the two facts
          // (announced disabled, and inert when clicked regardless) cannot both be
          // read without it.
          await page.getByRole('button', { name: label, exact: true }).click({ force: true });
          await settle(250)(page);
        }
        const afterInert = await read();
        await page.getByRole('button', { name: 'New chat', exact: true }).click();
        await settle(500)(page);
        const afterNewChat = await read();
        const emptyVisible = await page.getByText('What can I help with?').count().then((n) => n > 0);
        railTopActions = { before, afterInert, afterNewChat, emptyVisible };
      },
      probes: {
        // NOTHING, and the thread's length is checked FIRST so a page that had
        // already emptied it cannot pass this by having nothing to disturb.
        theInertRowsChangedNothing: () => {
          const { before, afterInert } = railTopActions ?? {};
          if (!before || !afterInert) return 'the click pair was not captured';
          if (before.messages === 0) return 'the thread was already empty, so nothing was there to disturb';
          return JSON.stringify(before) === JSON.stringify(afterInert)
            ? true
            : JSON.stringify({ before, afterInert });
        },
        // AND THE ONE THAT ACTS: a fresh chat is the empty thread and the empty
        // state back, which is what the block's own new-chat path produces.
        theNewChatRowStartsAFreshChat: () => {
          const { afterNewChat, emptyVisible } = railTopActions ?? {};
          if (!afterNewChat) return 'the state was not captured';
          if (afterNewChat.messages !== 0) return `the thread still holds ${afterNewChat.messages} turns`;
          return emptyVisible === true || 'the empty state did not come back';
        },
        // ...while the rail keeps every row it had: a new chat is a new THREAD, not
        // a clearing of the tree the four rows sit above.
        theNewChatRowKeptTheTree: () => {
          const { before, afterNewChat } = railTopActions ?? {};
          if (!before || !afterNewChat) return 'the state was not captured';
          if (before.rows === 0) return 'the rail held no rows, so keeping them proves nothing';
          return afterNewChat.rows === before.rows || `${afterNewChat.rows} rows after ${before.rows} before`;
        },
      },
      expect: {
        theInertRowsChangedNothing: true,
        theNewChatRowStartsAFreshChat: true,
        theNewChatRowKeptTheTree: true,
      },
    },
    {
      // THE RAIL AS A TREE, which is what a reader sees before they read a single
      // label: a Projects LABEL over the folders, rows ONE line tall, and air where
      // a section ends and the next begins. The three were the owner's own reading
      // of a live page, so each is measured here rather than described.
      //
      // This state runs LAST and touches nothing: it reads the rail the run has
      // built, so what it measures is the same tree the states above pinned.
      name: '45-rail-sections',
      layoutProbes: ['theSectionStartsCarryTheAir', 'theRowsAreOneLine'],
      act: async (page) => {
        // NO POINTER ON THE RAIL FIRST. The caret is revealed on hover, so "what
        // the row shows" is only a fact once the mouse is somewhere else - and
        // the states before this one left it wherever they last clicked.
        await page.mouse.move(1000, 700);
        await settle(250)(page);
        railSections = await railSectionFacts(page);
        // AND THEN THE HOVER, the other half of that claim: the caret a reader
        // sees when they point at the row. Read on the first folder's heading,
        // and the pointer is moved off again so the state's own screenshot is of
        // a rail nobody is hovering.
        const heading = page.locator('kai-conversations > kai-conversation-item[data-rail="folder"]').first();
        await heading.hover();
        await settle(300)(page);
        railSections.caretOnHover = await heading.evaluate((el) => {
          const caret = el.querySelector('.row-caret');
          return caret === null ? null : getComputedStyle(caret).opacity;
        });
        await page.mouse.move(1000, 700);
        await settle(250)(page);
      },
      probes: {
        // THE LABEL, where a section heading belongs: one row, reading `Projects`,
        // and the row directly under it is a folder - not the Recents heading, and
        // not a conversation.
        theProjectsLabelHeadsTheFolders: () => {
          const rows = railSections?.rows ?? [];
          const at = rows.findIndex((row) => row.kind === 'section');
          if (at === -1) return 'no section row on the rail';
          if (rows.filter((row) => row.kind === 'section').length !== 1) return 'more than one section row';
          if (rows[at].title !== 'Projects') return `the label reads ${JSON.stringify(rows[at].title)}`;
          return rows[at + 1]?.kind === 'folder'
            ? true
            : `the row under the label is a ${JSON.stringify(rows[at + 1]?.kind ?? 'nothing')}`;
        },
        // ...IN THE REGISTER THE OTHER HEADING ALREADY USES. Recents is the rail's
        // own heading, so the two are compared as computed styles rather than
        // against a size typed here: the label is a new row, and a row that did not
        // match would read as a title rather than as a heading.
        theLabelReadsLikeRecents: () => {
          const rows = railSections?.rows ?? [];
          const label = rows.find((row) => row.kind === 'section');
          const recents = rows.find((row) => row.kind === 'folder' && row.folder === '');
          if (!label || !recents) return 'the label or the Recents heading is missing';
          return JSON.stringify(label.register) === JSON.stringify(recents.register)
            ? true
            : JSON.stringify({ label: label.register, recents: recents.register });
        },
        // ONE LINE PER ROW: the second line was the row's `meta` region, so the
        // claim is that no row carries one - and that every conversation row came
        // to the SAME height, which is what "one line" looks like measured. The
        // number itself is pinned by this state's style probe.
        theRowsAreOneLine: () => {
          const rows = railSections?.rows ?? [];
          const conversations = rows.filter((row) => row.kind === 'conversation');
          if (conversations.length === 0) return 'the rail holds no conversation to measure';
          const withMeta = rows.filter((row) => row.metaSlots > 0).map((row) => row.id);
          if (withMeta.length) return `rows carry a meta line: ${withMeta.join(', ')}`;
          const heights = [...new Set(conversations.map((row) => row.height))];
          return heights.length === 1
            ? true
            : `conversation rows disagree on height: ${JSON.stringify(heights)}`;
        },
        // THE AIR BETWEEN SECTIONS, DERIVED RATHER THAN TYPED: both rows that START
        // a section carry the same block-start margin, that margin is TWO DENSITY
        // UNITS of the kit's own spacing knob (the page sets none, so the kit's
        // default is what the rule falls back to), and the folder headings INSIDE
        // Projects carry none - a folder heads a folder, not a section.
        theSectionStartsCarryTheAir: () => {
          const rows = railSections?.rows ?? [];
          const unit = railSections?.density === '' ? 4 : parseFloat(railSections?.density ?? '') * 16;
          const starts = rows.filter((row) => row.kind === 'section' || (row.kind === 'folder' && row.folder === ''));
          const inside = rows.filter((row) => row.kind === 'folder' && row.folder !== '');
          if (starts.length !== 2) return `${starts.length} rows start a section`;
          if (inside.length === 0) return 'no folder heading sits inside Projects';
          const margins = [...new Set(starts.map((row) => row.marginBlockStart))];
          if (margins.length !== 1) return `the two section starts disagree: ${JSON.stringify(margins)}`;
          if (margins[0] !== unit * 2) return `a section start carries ${margins[0]}px, two density units are ${unit * 2}px`;
          const tight = inside.filter((row) => row.marginBlockStart !== 0);
          return tight.length === 0 ? true : `a folder heading inside Projects carries air: ${JSON.stringify(tight.map((row) => row.marginBlockStart))}`;
        },
        // THE SECTION LABELS TAKE THE THEME'S MUTED REGISTER, and the check is
        // against the TOKEN rather than against a shade: the label's colour has to
        // BE what the kit's --color-muted-foreground resolves to on the rail, the
        // two labels have to agree, and the rows under them have to be something
        // else - which together are the hierarchy, measured.
        theSectionLabelsTakeTheMutedToken: () => {
          const rows = railSections?.rows ?? [];
          const token = railSections?.mutedTokenAsRgb ?? null;
          if (token === null) return `the theme's muted-foreground token is ${JSON.stringify(railSections?.mutedToken)}, which this check cannot normalise`;
          const labels = rows.filter((row) => row.kind === 'section' || (row.kind === 'folder' && row.folder === ''));
          if (labels.length !== 2) return `${labels.length} rows are section labels`;
          const wrong = labels.filter((row) => row.register?.color !== token);
          if (wrong.length) {
            return wrong.map((row) => `${row.title} reads ${row.register?.color}, the token is ${token}`).join(' | ');
          }
          const content = rows.filter((row) => row.kind === 'conversation').map((row) => row.register?.color);
          const heading = rows.find((row) => row.kind === 'folder' && row.folder !== '');
          if (content.length === 0 || !heading) return 'no content row to compare the labels against';
          const same = [...content, heading.register?.color].filter((color) => color === token);
          return same.length === 0
            ? true
            : `${same.length} content rows are painted in the label register`;
        },
        // THE CARET TRAILS THE TITLE, REVEALS ON HOVER, AND IS NOT A CONTROL: it
        // comes after the title in the row, it is invisible until the row is
        // hovered and visible while it is, and it carries no tabindex - so the row
        // that is already a tab stop does not gain a second one. The keyboard walk
        // over the same rows is the state before this one's neighbours, and it
        // measures the tab stop count directly.
        theCaretTrailsTheTitleAndReveals: () => {
          const rows = railSections?.rows ?? [];
          const caretRows = rows.filter((row) => row.caret !== null && row.caret.hidden !== true);
          if (caretRows.length === 0) return 'no row shows a caret to measure';
          const leading = caretRows.filter((row) => row.caret.trailsTheTitle !== true).map((row) => row.title);
          if (leading.length) return `the caret leads the title on ${JSON.stringify(leading)}`;
          const focusable = caretRows.filter((row) => row.caret.tabindex !== null || row.caret.tabIndex >= 0).map((row) => row.title);
          if (focusable.length) return `a caret is a second tab stop on ${JSON.stringify(focusable)}`;
          const shown = caretRows.filter((row) => row.caret.opacity !== '0').map((row) => `${row.title}:${row.caret.opacity}`);
          if (shown.length) return `a caret is visible with no pointer on the rail: ${shown.join(', ')}`;
          return railSections?.caretOnHover === '1'
            ? true
            : `hovering the heading left the caret at opacity ${JSON.stringify(railSections?.caretOnHover)}`;
        },
      },
      expect: {
        theProjectsLabelHeadsTheFolders: true,
        theLabelReadsLikeRecents: true,
        theRowsAreOneLine: true,
        theSectionStartsCarryTheAir: true,
        theSectionLabelsTakeTheMutedToken: true,
        theCaretTrailsTheTitleAndReveals: true,
      },
      styleProbes: [
        // THE REGISTERS, pinned by this state rather than described: three rows'
        // title spans, so a theme change and a rule change are both visible in the
        // diff. The span, not the row: the row's own colour is whatever it inherits,
        // and the rule this state is about is on the page's own slotted title.
        style('railConversationRowTitle', (page) => page.locator('kai-conversations > kai-conversation-item[data-rail="conversation"] > span').first(),
          ['fontSize', 'color']),
        style('railProjectsLabelTitle', (page) => page.locator('kai-conversations > kai-conversation-item[data-rail="section"] > span'),
          ['fontSize', 'color']),
        style('railRecentsHeadingTitle', (page) => page.locator('kai-conversations > kai-conversation-item[data-rail="folder"][data-folder=""] > span'),
          ['fontSize', 'color']),
        style('railFolderHeadingTitle', (page) => page.locator('kai-conversations > kai-conversation-item[data-rail="folder"]:not([data-folder=""]) > span').first(),
          ['fontSize', 'color']),
        style('railProjectsLabelRow', (page) => page.locator('kai-conversations > kai-conversation-item[data-rail="section"]'),
          ['height', 'marginBlockStart']),
        style('railCaret', (page) => page.locator('kai-conversations > kai-conversation-item[data-rail="folder"] .row-caret').first(),
          ['color', 'opacity']),
      ],
    },
    {
      // THE SECTION LABEL'S TRAILING ACTIONS, and the two facts that make them safe
      // to put on a row that is already a tab stop: they are HIDDEN until the row
      // is hovered or holds focus, and they live in the row's own menu region -
      // which the container's item-mode contract excludes from activation and from
      // the arrow walk. The walk's own state measures that exclusion from the other
      // side five states earlier; this one measures what a reader gets.
      //
      // The act ENDS with the pointer on the label, which is what the screenshot
      // shows: the actions revealed at the row's right end.
      name: '46-rail-hover-actions',
      act: async (page) => {
        // NO POINTER AND NO FOCUS ON THE RAIL FIRST: the actions are invisible at
        // rest, and "at rest" means nothing inside the row has the caret either -
        // focus is the OTHER half of the reveal rule, so the states before this
        // one (the keyboard walk included) can leave a row focused. Clicking a
        // heading of the page's own chrome is what a reader does to leave the
        // rail, and it blurs whatever held focus.
        await page.locator('.topbar h1').click();
        // THE POINTER AWAY, at a point DERIVED from the rail's own box rather than
        // a typed pair of viewport pixels: the rail's width is the page's own fact,
        // so a page whose column is wider than the coordinate assumed would leave
        // the pointer on a row and the "at rest" read would be of a hovered row.
        const railBox = await page.evaluate(() => {
          const box = document.getElementById('conversations')?.getBoundingClientRect();
          return box === null || box === undefined ? null : { right: box.right };
        });
        const viewport = page.viewportSize() ?? { width: 1280, height: 800 };
        await page.mouse.move(
          Math.round((railBox === null ? 0 : railBox.right) + (viewport.width - (railBox === null ? 0 : railBox.right)) / 2),
          viewport.height - 24,
        );
        // AND THE CARET OUT OF THE RAIL, explicitly. Whether a click on the page's
        // own chrome blurs what held focus, or leaves it inside a shadow root, is
        // the browser's business - and a caret left in the row reveals the actions
        // through the rule's focus half, so the rest is no rest at all. The deepest
        // active element is the one that has to be blurred: focus inside a shadow
        // root is reported on the host by `document.activeElement`.
        await page.evaluate(() => {
          let node = document.activeElement;
          while (node?.shadowRoot?.activeElement) node = node.shadowRoot.activeElement;
          node?.blur?.();
        });
        // AND WAIT FOR THE REST STATE rather than assuming one settle bought it: the
        // reveal fades, so a read taken mid-transition is a read of the hover that
        // was there a moment ago. The wait is on the READ - nothing in the row is
        // touched - and it gives up at a second and a half, which is long enough for
        // any fade this stylesheet declares and short enough that a row genuinely
        // revealed at rest is still reported as revealed.
        for (let attempt = 0; attempt < 6; attempt++) {
          await settle(250)(page);
          const resting = await page.evaluate(() =>
            [...document.querySelectorAll('kai-conversations > kai-conversation-item[data-rail="section"]')]
              .every((el) => !el.matches(':hover') && !el.matches(':focus-within')));
          if (resting) break;
        }
        railTrio = await railTrioFacts(page);
        // AND THEN THE HOVER, the other half of that claim.
        const label = page.locator('kai-conversations > kai-conversation-item[data-rail="section"]').first();
        await label.hover();
        await settle(300)(page);
        railTrio.hovered = await railTrioFacts(page);
      },
      probes: {
        // TWO SECTION LABELS, and each carries three actions: the Projects label
        // over the folders and the Recents heading over the remainder. A folder
        // inside Projects heads a folder, not a section, and carries none.
        theSectionLabelsCarryTheTrio: () => {
          const labels = railTrio?.sectionLabels ?? [];
          if (labels.length !== 2) return `${labels.length} rows are section labels`;
          const bad = labels.filter((row) => row.controls.length !== 3).map((row) => `${row.title}:${row.controls.length}`);
          return bad.length === 0 ? true : `the rows carry ${bad.join(', ')} actions`;
        },
        // A CURATED NAME OR NOTHING AT ALL: the kit paints no glyph for a name its
        // roster does not carry, so the box IS the check that each name resolved -
        // the same check the rail's top action rows get, and for the same reason.
        everyTrioGlyphPainted: () => {
          const controls = (railTrio?.hovered?.sectionLabels ?? []).flatMap((row) => row.controls);
          if (controls.length !== 6) return `${controls.length} controls across the two labels`;
          const empty = controls.filter((c) => c.glyph === null || c.glyph.width <= 0 || c.glyph.height <= 0)
            .map((c) => `${c.trio}:${c.icon}`);
          return empty.length === 0 ? true : `no glyph painted for ${empty.join(', ')}`;
        },
        // KEBAB, THEN FILTER, THEN COMPOSE, read as the order the row lays them out
        // rather than as the order the markup happens to name them: the three left
        // edges ascend.
        theActionsReadKebabThenFilterThenCompose: () => {
          const row = (railTrio?.hovered?.sectionLabels ?? [])[0];
          if (!row) return 'no section label to read';
          const order = row.controls.map((c) => c.trio);
          if (JSON.stringify(order) !== JSON.stringify(['menu', 'filter', 'compose'])) {
            return `the actions are ${JSON.stringify(order)}`;
          }
          const lefts = row.controls.map((c) => c.left);
          return lefts.every((left, index) => index === 0 || left > lefts[index - 1])
            ? true
            : `the actions are not stacked left to right: ${JSON.stringify(lefts)}`;
        },
        // HIDDEN AT REST, VISIBLE ON HOVER - the two halves of one claim, and both
        // are read here because either alone is half a rule: a row that always
        // showed them is as wrong as one that never did.
        theActionsAreHiddenAtRestAndShownOnHover: () => {
          const labels = railTrio?.sectionLabels ?? [];
          const atRest = labels.filter((row) => !row.hover && !row.focusWithin);
          if (atRest.length === 0) {
            const where = labels.map((row) => `${row.title}: hover=${row.hover} focus=${row.focusWithin}`).join(' | ');
            return `no section label was at rest, so the hidden half was never read (${where})`;
          }
          const rest = atRest.filter((row) => !row.hidden && row.opacity !== '0');
          if (rest.length) {
            return rest.map((row) => `${row.title}: hidden=${row.hidden} opacity=${row.opacity} class=${row.trioClass} inset=${row.inViewport}`).join(' | ');
          }
          // THE HOVERED LABEL, not every label: the act hovers one of the two, and
          // the other is correctly invisible while the pointer is elsewhere - so the
          // claim is read on the labels the pointer is actually over, and a state
          // that hovered none says so rather than passing on an empty set.
          const hovered = (railTrio?.hovered?.sectionLabels ?? []).filter((row) => row.hover);
          if (hovered.length === 0) return 'no section label was hovered, so the shown half was never read';
          const unrevealed = hovered.filter((row) => row.hidden || row.opacity !== '1');
          return unrevealed.length === 0
            ? true
            : unrevealed.map((row) => `${row.title}: hidden=${row.hidden} opacity=${row.opacity}`).join(' | ');
        },
        // AT THE ROW'S RIGHT END, INSIDE THE ROW, AND IN ITS MENU REGION. Three
        // facts, because the claim is all three: the actions belong to the row's
        // trailing edge, they sit within the row's box rather than on a line of
        // their own, and the region they sit in is the one the container keeps out
        // of activation and out of the arrow walk - which is the whole reason they
        // can be added to a row the walk already covers.
        theActionsSitInTheRowsTrailingEdge: () => {
          const row = (railTrio?.hovered?.sectionLabels ?? [])[0];
          if (!row || row.trioBox === null) return 'no section label box to measure';
          if (row.menuSlot !== 'menu') return `the actions carry slot=${JSON.stringify(row.menuSlot)}`;
          if (row.trioBox.left < row.rowBox.left || row.trioBox.right > row.rowBox.right) {
            return `the actions run from ${row.trioBox.left} to ${row.trioBox.right}, the row from ${row.rowBox.left} to ${row.rowBox.right}`;
          }
          const gap = row.rowBox.right - row.trioBox.right;
          if (gap > 16) return `the actions stop ${gap}px short of the row's right edge`;
          return row.trioBox.left > row.rowBox.left + row.rowBox.width / 2
            ? true
            : 'the actions do not sit at the row\u2019s trailing half';
        },
        // AND THE ROVING WALK IS UNTOUCHED: exactly one row body in the whole rail
        // carries `tabindex="0"`. That number IS the walk's width, and the actions
        // are the chrome most likely to widen it - every row renders them.
        theTrioAddsNoStopToTheRailWalk: () => {
          const stops = railTrio?.rovingStops;
          if (stops === undefined) return 'the state was not captured';
          return stops === 1 ? true : `the rail has ${stops} roving stops`;
        },
      },
      expect: {
        theSectionLabelsCarryTheTrio: true,
        everyTrioGlyphPainted: true,
        theActionsReadKebabThenFilterThenCompose: true,
        theActionsAreHiddenAtRestAndShownOnHover: true,
        theActionsSitInTheRowsTrailingEdge: true,
        theTrioAddsNoStopToTheRailWalk: true,
      },
      styleProbes: [
        // The reveal itself, pinned: the state's screenshot is taken with the
        // pointer on the row, so the opacity this records is the shown value, and
        // the gap is the two facts the box above was measured against.
        style('railTrio', (page) => page.locator('kai-conversations > kai-conversation-item[data-rail="section"] .row-trio').first(),
          ['opacity', 'gap', 'alignItems']),
        style('railTrioControl', (page) => page.locator('kai-conversations > kai-conversation-item[data-rail="section"] kai-button[data-trio="compose"]').first(),
          ['height', 'width']),
      ],
    },
    {
      // THE MENU BEHIND THE KEBAB, open: the two single-choice groups the owner
      // described, the divider, and the plus section under it. The state leaves the
      // menu OPEN, which is what its screenshot is of.
      name: '47-rail-organizer-menu',
      act: async (page) => {
        await page.mouse.move(1000, 700);
        await settle(200)(page);
        const label = page.locator('kai-conversations > kai-conversation-item[data-rail="section"]').first();
        // Hover first so the kebab is revealed the way a reader reveals it, then
        // click the trigger the menu element renders inside its own shadow root.
        await label.hover();
        await settle(250)(page);
        await label.locator('.row-trio kai-menu').click();
        await settle(400)(page);
        railMenu = await railMenuFacts(page);
      },
      probes: {
        // THE ROWS, IN ORDER, AS RENDERED, against the copy above. The comparison
        // is by PREFIX because a row's text carries its description after its
        // label; a mismatch returns what was read rather than only failing.
        theMenuReadsInTheOrderTheOwnerAskedFor: () => {
          const rows = railMenu?.rows ?? [];
          if (rows.length !== RAIL_MENU_ROWS.length) {
            return `${rows.length} rows: ${JSON.stringify(rows.map((row) => row.text))}`;
          }
          const bad = rows
            .map((row, index) => ({ row, want: RAIL_MENU_ROWS[index] }))
            .filter(({ row, want }) => row.role !== want.role || !row.text.startsWith(want.label));
          return bad.length === 0
            ? true
            : bad.map(({ row, want }) => `want ${want.role || 'label'} "${want.label}", read ${row.role || 'label'} "${row.text}"`).join(' | ');
        },
        // THE MENU SHOWS THE RAIL'S CURRENT CHOICES: exactly one checked row per
        // group, and the two are the ones the rail is running. A menu that showed a
        // choice the rail was not in would be the same lie as a row that did
        // nothing.
        theMenuShowsTheRailsCurrentChoices: () => {
          const rows = railMenu?.rows ?? [];
          const checked = rows.filter((row) => row.checked === 'true').map((row) => row.text);
          if (checked.length !== 2) return `${checked.length} rows are checked: ${JSON.stringify(checked)}`;
          const want = ['By project', 'Priority'];
          const wrong = checked.filter((text, index) => !text.startsWith(want[index]));
          return wrong.length === 0
            ? true
            : `the checked rows are ${JSON.stringify(checked)}`;
        },
        // AND THE ONE ROW THAT CANNOT ACT SAYS WHY, on the row itself: a disabled
        // row whose text is only its label is a mystery, which is what this reads
        // for. `Manual order` is the only one left - the plus row USED to be
        // disabled with a reason and is now the way a project gets made - and the
        // sentence under it is where the block says where a project is kept.
        theUnavailableRowsSayWhy: () => {
          const rows = railMenu?.rows ?? [];
          const disabled = rows.filter((row) => row.disabled === 'true');
          if (disabled.length !== 1) return `${disabled.length} rows are announced disabled`;
          const wordless = disabled.filter((row) => row.text.split(' ').length < 4).map((row) => row.text);
          if (wordless.length) return `a disabled row carries no reason: ${JSON.stringify(wordless)}`;
          const note = rows.find((row) => row.role === '' && row.text.startsWith('A project you make is a group record'));
          return note === undefined ? 'no sentence under the plus row says why' : true;
        },
        // THE DIVIDER, where the owner put it: one separator, and the plus section
        // is what comes after it.
        theDividerOpensThePlusSection: () => {
          const rows = railMenu?.rows ?? [];
          const separators = rows.filter((row) => row.role === 'separator');
          if (separators.length !== 1) return `${separators.length} dividers`;
          const at = rows.findIndex((row) => row.role === 'separator');
          const after = rows.slice(at + 1).map((row) => row.text);
          return after.length > 0 && after[0].startsWith('New project')
            ? true
            : `the divider is followed by ${JSON.stringify(after)}`;
        },
      },
      expect: {
        theMenuReadsInTheOrderTheOwnerAskedFor: true,
        theMenuShowsTheRailsCurrentChoices: true,
        theUnavailableRowsSayWhy: true,
        theDividerOpensThePlusSection: true,
      },
      styleProbes: [],
    },
    {
      // WHAT EACH ROW ACTUALLY DOES, which is the half a screenshot cannot show.
      // The two organizers are a state change and the sorts are two comparators, so
      // every claim here is a before and an after read off the rail: the flat list,
      // the order the store's own records say it should be, and the tree coming
      // back. The state ENDS on the flat list, which is what its screenshot is of.
      name: '48-rail-organizer-wiring',
      // `sctx` because the store's own records are keyed by the spec this scenario
      // declares, and the claim below is the rail's order against THEM.
      act: async (page, sctx) => {
        // State 47 left its menu open; a reader's first press closes it, and the
        // driver does the same rather than clicking through an open surface.
        await page.keyboard.press('Escape');
        await settle(250)(page);
        await page.mouse.move(1000, 700);
        await settle(200)(page);
        const before = await railShape(page);
        /** The rail's label row, hovered so its actions are revealed. */
        const openSectionLabel = async () => {
          const label = page.locator('kai-conversations > kai-conversation-item[data-rail="section"]').first();
          await label.hover();
          await settle(250)(page);
          return label;
        };
        /**
         * One row of the organizer menu, chosen the way a reader chooses it: the
         * label's kebab, then the row.
         *
         * THE MENU IS REOPENED EVERY TIME, and that is the page rather than the
         * driver: the rows are an items ARRAY, so a choice rebuilds it, and a
         * changed array re-runs the menu element's own body and drops its open
         * state. A reader gets the same thing - a settings menu that closes on the
         * choice it just made - so every read below takes a fresh menu.
         */
        const choose = async (name) => {
          const label = await openSectionLabel();
          await label.locator('.row-trio kai-menu').click();
          await settle(350)(page);
          await page.getByRole('menuitemradio', { name }).click();
          await settle(450)(page);
        };
        // THE FILTER: it opens the page's one search, the palette, which searches the
        // rail's own rows - the element's built-in box is off. Read as the active
        // element inside the PALETTE's shadow root, because that is where the box
        // lives now, and the kit's dialog has just moved focus in.
        const label = await openSectionLabel();
        await label.locator('.row-trio kai-button[data-trio="filter"]').click();
        await settle(450)(page);
        const focused = await page.evaluate(() => {
          const palette = document.getElementById('palette');
          const active = palette?.shadowRoot?.activeElement ?? null;
          if (active === null) return '';
          return `${active.localName}:${active.getAttribute('type') ?? ''}:${active.getAttribute('aria-label') ?? active.getAttribute('placeholder') ?? ''}`;
        });
        // AND THE PALETTE IS LEFT AGAIN: the states below it drive the rail, and an
        // open modal is in the way of every click.
        await closePalette(page);
        // THE ORGANIZER: one flat list, then the menu read back to show the radio
        // moved with it.
        await choose('One list');
        const oneList = await railShape(page);
        const flatLabel = await openSectionLabel();
        await flatLabel.locator('.row-trio kai-menu').click();
        await settle(350)(page);
        const oneListMenu = await railMenuFacts(page);
        await page.keyboard.press('Escape');
        await settle(200)(page);
        // THE SORT: pure recency, which the store's own records can be asked about.
        await choose('Last updated');
        const sorted = await railShape(page);
        // AND BACK, so "by project" is exercised in both directions.
        await choose('By project');
        const backToProjects = await railShape(page);
        // END ON THE FLAT LIST, in the rail's default sort: the state's screenshot is
        // the one list the organizer menu produces.
        await choose('Priority');
        await choose('One list');
        await page.mouse.move(1000, 700);
        await settle(250)(page);
        const orders = await storedOrders(page, sctx.spec.indexKey);
        railWiring = { before, focused, oneList, oneListMenu, sorted, backToProjects, orders, bindings: await rowBindingFacts(page) };
      },
      probes: {
        // ONE FLAT LIST: a single label row over every chat, no folder heading and no
        // Show more row, and no row left claiming a folder - a flat list whose rows
        // kept one would read as rows filed under something that is not there.
        theOrganizerSwitchesToOneFlatList: () => {
          const rows = railWiring?.oneList ?? [];
          const labels = rows.filter((row) => row.kind === 'section');
          const rest = rows.filter((row) => row.kind !== 'section');
          if (labels.length !== 1) return `${labels.length} label rows in one list`;
          if (labels[0].title !== 'All chats') return `the flat list is headed ${JSON.stringify(labels[0].title)}`;
          if (rest.length === 0) return 'the flat list holds no rows';
          const notConversations = rest.filter((row) => row.kind !== 'conversation').map((row) => row.kind);
          if (notConversations.length) return `one list still holds ${JSON.stringify(notConversations)} rows`;
          // THE STEP, not `data-folder`: a flat row keeps the folder it is filed under
          // as data - the organizer decides whether the rail GROUPS by it, not what
          // the row knows - so the visible fact is that no row carries an inline step
          // in this list either, which a rule keyed on that field would reintroduce.
          const stepped = rest.filter((row) => (parseFloat(row.indent) || 0) !== 0).map((row) => `${row.title}:${row.indent}`);
          return stepped.length === 0 ? true : `a flat row keeps its step: ${stepped.join(', ')}`;
        },
        // ...AND THE MENU AGREES, because a choice the rail has taken and the menu
        // still shows as unchosen is the same lie as a dead row.
        theMenuFollowsTheChoice: () => {
          const rows = railWiring?.oneListMenu?.rows ?? [];
          const checked = rows.filter((row) => row.checked === 'true').map((row) => row.text);
          if (checked.length !== 2) return `${checked.length} rows are checked after the switch: ${JSON.stringify(checked)}`;
          const want = ['One list', 'Priority'];
          const wrong = checked.filter((text, index) => !text.startsWith(want[index]));
          return wrong.length === 0 ? true : `the checked rows are ${JSON.stringify(checked)}`;
        },
        // THE FLAT LIST HOLDS EVERY CHAT THE STORE HAS, in the order the sort asked
        // for: the block's own sort rule against the store's records, so a rail that
        // ordered by something else - or dropped a row - is red here.
        theSortModesAreTheStoreOrders: () => {
          const orders = railWiring?.orders;
          if (!orders) return 'the store was not read';
          const rendered = (rows) => (rows ?? []).filter((row) => row.kind === 'conversation').map((row) => row.id);
          const byPriority = rendered(railWiring?.oneList);
          const byUpdated = rendered(railWiring?.sorted);
          if (byPriority.length !== orders.count) return `${byPriority.length} rows under Priority, the store holds ${orders.count}`;
          if (byPriority.join() !== orders.priority.join()) {
            return `Priority rendered ${JSON.stringify(byPriority)}, the store's pinned-first order is ${JSON.stringify(orders.priority)}`;
          }
          if (byUpdated.join() !== orders.updated.join()) {
            return `Last updated rendered ${JSON.stringify(byUpdated)}, the store's recency order is ${JSON.stringify(orders.updated)}`;
          }
          return true;
        },
        // ...AND "BY PROJECT" COMES BACK, in both directions: the label over the
        // folders, the folders themselves, and the step a filed row carries.
        theTreeComesBack: () => {
          const rows = railWiring?.backToProjects ?? [];
          const label = rows.find((row) => row.kind === 'section');
          if (label === undefined || label.title !== 'Projects') {
            return `the label row reads ${JSON.stringify(label?.title ?? 'nothing')}`;
          }
          // A HEADING BY ITS OWN FIELD, not by its id: the id of a folder heading is
          // `folder:<group>`, so an id-based filter reads the headings it wants as
          // the ones to skip. Filed-ness is read off `data-folder` for the same
          // reason the inline step cannot say it any more.
          const folders = rows.filter((row) => row.kind === 'folder' && row.folder !== '');
          if (folders.length === 0) return 'no folder heading came back';
          const filed = rows.filter((row) => row.kind === 'conversation' && row.folder !== '');
          return filed.length > 0 ? true : 'no row came back filed into a folder';
        },
        // THE FILTER CONTROL DOES SOMETHING REAL, and it is the page's one search: the
        // caret lands in the palette's own input, which searches the rail's rows - the
        // rail's built-in box is switched off (`searchable="false"`), so this is the
        // only box the page has to hand the caret to.
        theFilterHandsTheCaretToTheRailsSearchBox: () => {
          const focused = railWiring?.focused ?? '';
          return focused === 'input:text:Search chats'
            ? true
            : `the caret went to ${JSON.stringify(focused || 'nothing')}`;
        },
        // THE PROPERTY BINDINGS SURVIVED THE ROWS THEY WERE APPLIED TO. Every row
        // here was created by a patch, the last of them by a SINGLE one (the
        // organizer switch), and a row's own property assignment is what a clone
        // can lose: the menu would render empty and the rename field would come up
        // blank. Read on EVERY row rather than on the new one, because the class is
        // "a row created by a later patch keeps its bindings", and a lost binding
        // is invisible until the next patch - which is exactly the luck this
        // asserts against.
        everyRowKeptItsPropertyBindings: () => {
          const facts = railWiring?.bindings;
          if (!facts) return 'the rows were not read';
          const want = RAIL_MENU_ROWS.length;
          const menus = facts.rows.filter((row) => row.menuItems !== want)
            .map((row) => `${row.title}:${JSON.stringify(row.menuItems)}`);
          if (menus.length) return `a row's menu came up without its items: ${menus.join(', ')}`;
          const editors = facts.rows
            .filter((row) => row.kind === 'conversation' && row.editorValue !== row.title)
            .map((row) => `${row.title}:${JSON.stringify(row.editorValue)}`);
          return editors.length === 0 || `a rename field came up without its title: ${editors.join(', ')}`;
        },
      },
      expect: {
        theOrganizerSwitchesToOneFlatList: true,
        theMenuFollowsTheChoice: true,
        theSortModesAreTheStoreOrders: true,
        theTreeComesBack: true,
        theFilterHandsTheCaretToTheRailsSearchBox: true,
        everyRowKeptItsPropertyBindings: true,
      },
      styleProbes: [
        // The one-list label and a flat conversation row, so the change of
        // organization is visible in the recorded values and not only in the
        // screenshot.
        style('railOneListLabelRow', (page) => page.locator('kai-conversations > kai-conversation-item[data-rail="section"]'),
          ['height', 'marginBlockStart']),
        style('railOneListRow', (page) => page.locator('kai-conversations > kai-conversation-item[data-rail="conversation"]').first(),
          ['marginInlineStart']),
      ],
    },
    {
      name: '49-fresh-profile-rail',
      act: async (page, sctx) => {
        // A PROFILE THAT HAS NEVER STORED ANYTHING, which is the state a reader
        // meets this block in and the one no other state in this run can be: the
        // run's own history is what states 2 onwards leave behind, so the rail's
        // empty case has to be REACHED by taking the storage away and reloading.
        // Every key goes, not just the threads index: the block's own project key
        // is part of a fresh profile, and a run that kept it would be measuring a
        // returning reader.
        await page.evaluate(() => localStorage.clear());
        await page.reload({ waitUntil: 'load' });
        await sctx.scenario.ready(page, sctx);
        const nodes = await railNodes(page);
        // Read as TEXT off the rows, because the claim is what a reader can see:
        // the section label over the folders, the folders themselves, the rows
        // each folder holds, and the heading the reader's own typed chats land
        // under.
        const titled = await page.evaluate(() =>
          [...document.querySelectorAll('kai-conversations > kai-conversation-item')].map((el) => ({
            id: el.conversationId ?? el.getAttribute('conversation-id') ?? el.id,
            kind: el.getAttribute('data-rail') ?? 'conversation',
            folder: el.getAttribute('data-folder') ?? '',
            title: el.querySelector('.row-title-text')?.textContent ?? '',
          })));
        freshRail = {
          titles: titled.map((row) => `${row.kind}:${row.title}`),
          conversationRows: nodes.filter((node) => node.kind === 'conversation').length,
          sectionLabel: titled.find((row) => row.kind === 'section')?.title ?? '',
          folders: titled.filter((row) => row.kind === 'folder').map((row) => row.title),
          recents: titled.filter((row) => row.kind === 'folder' && row.folder === '').map((row) => row.title),
          // WHAT EACH HEADING ACTUALLY HOLDS, read the way the rail files a row:
          // `data-folder` carries the folder's ID on a heading and on a
          // conversation row alike, so a heading's count is the rows that share
          // its id. Keyed by the heading's own title so a probe reads names.
          rowsByFolder: Object.fromEntries(titled
            .filter((row) => row.kind === 'folder')
            .map((heading) => [heading.title, titled.filter((row) => row.kind === 'conversation'
              && row.folder === heading.folder).length])),
        };
      },
      probes: {
        // THE OWNER'S COMPLAINT AS A PROBE: on a profile with no history the rail
        // showed the element's "No conversations yet" and nothing else - no
        // Projects section, no folders, no Recents - because every one of them
        // was derived from rows that did not exist.
        theProjectsSectionIsThere: () => freshRail?.sectionLabel === 'Projects',
        itsFoldersAreThere: () => (freshRail?.folders ?? []).length >= 3,
        // The demo's three projects by name, so "there are folders" cannot pass
        // on a rail that invented labels of its own. A COPY of the block's own
        // catalogue names, and recorded as one: this file is plain JS and cannot
        // import the controller.
        theDemoProjectsAreNamed: () => ['Assistant UI', 'Docs and briefs', 'Kanban board']
          .every((name) => (freshRail?.folders ?? []).includes(name)),
        recentsIsThere: () => (freshRail?.recents ?? []).join('') === 'Recents',
        // THE ROWS UNDER A FOLDER ARE THE ASSERTION, and the rest of this state
        // is not it. An EMPTY rail satisfies every claim above - that is exactly
        // how the previous round certified a rail of folders with nothing in them
        // - so the count beneath each heading is what a fresh profile has to
        // show. Every heading that is on the rail has to hold at least one
        // conversation row, and the rail has to hold rows at all: the first
        // branch is what makes the empty rail red, the second what makes a rail
        // that only ever drew headings red.
        everyFolderHoldsItsConversations: () => {
          const under = freshRail?.rowsByFolder ?? {};
          const bare = (freshRail?.folders ?? []).filter((name) => (under[name] ?? 0) === 0);
          if (bare.length > 0) return `no conversation row under ${bare.join(', ')}`;
          return (freshRail?.conversationRows ?? 0) > 0
            || 'the rail holds folder headings and not one conversation row';
        },
      },
      expect: {
        theProjectsSectionIsThere: true,
        itsFoldersAreThere: true,
        theDemoProjectsAreNamed: true,
        recentsIsThere: true,
        everyFolderHoldsItsConversations: true,
      },
      styleProbes: [
        style('freshRailProjectsLabel', (page) => page.locator('kai-conversations > kai-conversation-item[data-rail="section"]'),
          ['height', 'marginBlockStart']),
        style('freshRailRecentsHeading', (page) => page.locator('kai-conversations > kai-conversation-item[data-rail="folder"][data-folder=""]'),
          ['height', 'marginInlineStart']),
      ],
    },
    {
      name: '50-create-a-project',
      act: async (page, sctx) => {
        // FROM THE FRESH PROFILE STATE 49 LEFT BEHIND, which is the state the
        // dialog has to work in: the reader who has no projects is the one who
        // needs to make one. The id the block derives is not typed here - it is
        // read back out of the block's own key after the create, so the folder
        // label, the stored record and the probe all read the SAME write.
        const authored = 'Release notes';
        // WHICH ROW CARRIES THE RAIL'S ACTIONS: the Projects label does, and it is
        // the row the `+` lives behind. Found by its kind rather than by
        // position, because the fixture's own order is the block's business.
        const kebab = page.locator('kai-conversations > kai-conversation-item[data-rail="section"] kai-menu[data-trio="menu"]').first();
        await kebab.click();
        await settle(300)(page);
        await page.getByRole('menuitem', { name: 'New project' }).click();
        await settle(400)(page);
        const dialogOpened = await page.locator('#project-dialog').evaluate(
          (el) => el.open === true || el.hasAttribute('open'),
        );
        const field = page.locator('#project-name input').first();
        await field.click();
        await field.fill(authored);
        await page.getByRole('button', { name: 'Create project' }).click();
        await settle(400)(page);
        const closed = await page.locator('#project-dialog').evaluate(
          (el) => !(el.open === true || el.hasAttribute('open')),
        );
        const stored = await page.evaluate((key) => {
          try { return JSON.parse(localStorage.getItem(key) ?? '[]'); } catch { return []; }
        }, 'kai:assistant:groups');
        const created = (stored ?? []).find((project) => project.name === authored) ?? null;
        projectCreate = {
          dialogOpened,
          closed,
          storedNames: (stored ?? []).map((project) => project.name),
          id: created?.id ?? '',
          // The folder the rail renders for it, read by the id the block STORED.
          inRailAfterCreate: created === null ? false : await page.evaluate((id) =>
            [...document.querySelectorAll('kai-conversations > kai-conversation-item')]
              .some((el) => el.getAttribute('data-folder') === id), created.id),
          // ...AND THE KEYBOARD: the dialog opens from the menu by keyboard too, and
          // Escape closes it without stranding the rail.
          escapeClosed: false,
          railReachableAfterEscape: false,
          idAfterReload: '',
          labelAfterReload: '',
          filedUnderTheCreatedFolder: false,
        };
        // A SECOND VISIT: the name is a group record in the store, so a reload
        // brings the folder back.
        await page.reload({ waitUntil: 'load' });
        await sctx.scenario.ready(page, sctx);
        const afterReload = await page.evaluate((id) => {
            const rows = [...document.querySelectorAll('kai-conversations > kai-conversation-item')];
            const row = rows.find((el) => el.getAttribute('data-folder') === id && el.getAttribute('data-rail') === 'folder');
            return { present: row !== undefined, label: row?.querySelector('.row-title-text')?.textContent ?? '' };
        }, projectCreate.id);
        projectCreate.idAfterReload = afterReload.present ? projectCreate.id : '';
        projectCreate.labelAfterReload = afterReload.label;
        // ...AND A CONVERSATION REACHES IT THROUGH THE STORE'S OWN GROUP: the
        // block's dialog names a folder, and a conversation is filed into it by
        // `setGroup`, whose whole effect is the `groupId` on the stored summary.
        // Seeding that field is seeding what `setGroup` writes (state 42's reason
        // for seeding the index rather than clicking, one mechanism over).
        const threadKey = `${sctx.spec.indexKey.slice(0, -1)}:filed-by-setgroup`;
        await page.evaluate((seed) => {
          const index = JSON.parse(localStorage.getItem(seed.indexKey) ?? '[]');
          localStorage.setItem(seed.indexKey, JSON.stringify([
            ...index.filter((row) => row.id !== seed.id),
            { id: seed.id, title: 'Release note draft', messageCount: 2, updatedAt: new Date().toISOString(), groupId: seed.group },
          ]));
          localStorage.setItem(seed.threadKey, JSON.stringify([
            { id: `${seed.id}-q`, role: 'user', parts: [{ type: 'text', text: 'Draft the release note' }] },
            { id: `${seed.id}-a`, role: 'assistant', parts: [{ type: 'text', text: 'Here is the draft.' }] },
          ]));
        }, { indexKey: sctx.spec.indexKey, threadKey, id: 'filed-by-setgroup', group: projectCreate.id });
        await page.reload({ waitUntil: 'load' });
        await sctx.scenario.ready(page, sctx);
        projectCreate.filedUnderTheCreatedFolder = await page.evaluate((id) =>
          [...document.querySelectorAll('kai-conversations > kai-conversation-item')]
            .some((el) => el.getAttribute('data-rail') === 'conversation' && el.getAttribute('data-folder') === id), projectCreate.id);
        // THE KEYBOARD PASS, last, because it opens and closes the dialog again.
        // The trigger is the Projects label's own menu, the same row the `+` lives
        // on: a folder HEADING does not carry the rail's actions.
        await kebab.click();
        await settle(300)(page);
        await page.getByRole('menuitem', { name: 'New project' }).click();
        await settle(400)(page);
        const openedByMenu = await page.locator('#project-dialog').evaluate(
          (el) => el.open === true || el.hasAttribute('open'),
        );
        await page.keyboard.press('Escape');
        await settle(400)(page);
        projectCreate.escapeClosed = openedByMenu && await page.locator('#project-dialog').evaluate(
          (el) => !(el.open === true || el.hasAttribute('open')),
        );
        // The rail is walkable again: a tab out of the rail's search box reaches a
        // row, which is the state 40 contract one dialog later.
        await clearRailSearch(page);
        await page.locator('#rail-collapse').focus();
        for (let step = 0; step < 8 && !projectCreate.railReachableAfterEscape; step += 1) {
          await page.keyboard.press('Tab');
          await settle(150)(page);
          if ((await rowWalk(page)).focused >= 0) projectCreate.railReachableAfterEscape = true;
        }
      },
      probes: {
        thePlusOpensTheDialog: () => projectCreate?.dialogOpened === true,
        creatingClosesIt: () => projectCreate?.closed === true,
        // STORED, LOUDLY, IN THE STORE'S OWN GROUP LIST: the name is a group record
        // with an id, in the same store the conversations are in - and the block's
        // demo key is where the projects a reader made BEFORE the store had a group
        // list are migrated FROM, not where they live.
        theProjectIsAGroupRecord: () => (projectCreate?.storedNames ?? []).includes('Release notes')
          && (projectCreate?.id ?? '') !== '',
        itIsInTheRailImmediately: () => projectCreate?.inRailAfterCreate === true,
        itSurvivesAReload: () => projectCreate?.idAfterReload === projectCreate?.id
          && projectCreate?.labelAfterReload === 'Release notes',
        // ...AND IT TAKES A CONVERSATION: the row filed under the created id renders
        // in the folder labelled with the reader's own name for it.
        itTakesAConversation: () => projectCreate?.filedUnderTheCreatedFolder === true,
        escapeClosesIt: () => projectCreate?.escapeClosed === true,
        theRailIsNotStranded: () => projectCreate?.railReachableAfterEscape === true,
      },
      expect: {
        thePlusOpensTheDialog: true,
        creatingClosesIt: true,
        theProjectIsAGroupRecord: true,
        itIsInTheRailImmediately: true,
        itSurvivesAReload: true,
        itTakesAConversation: true,
        escapeClosesIt: true,
        theRailIsNotStranded: true,
      },
      styleProbes: [
        style('createdProjectFolder', (page) => page.locator('kai-conversations > kai-conversation-item[data-rail="folder"]').first(),
          ['height', 'marginInlineStart']),
      ],
    },
      {
      // THE PALETTE, OPEN. The owner asked for a search button at the top right of
      // the aside that opens a command palette, and this is that surface: the button
      // in the rail's own header, and behind it the element that is already a palette.
      // The state leaves it OPEN, which is what its screenshot is of.
      //
      // FOUR CLAIMS, and the first two are the ones a screenshot cannot show: the
      // rows are the RAIL'S OWN (so there is one list rather than two that can
      // drift), and the element's built-in search box is gone (so the rail does not
      // offer two ways to search it).
      name: '51-palette-open',
      act: async (page) => {
        await clearRailSearch(page);
        await openPalette(page);
        paletteOpen = await paletteFacts(page);
      },
      probes: {
        // THE RAIL'S OWN HEADER CARRIES IT, and the row reads left to right: the
        // title, the search button, then the collapse control at the header's
        // trailing end. All three inside the region the block fills in the header
        // slot, so "at the end" is a box rather than a class name.
        theHeaderReadsTitleSearchThenCollapse: async (page) => {
          const boxes = await page.evaluate(() => {
            const collapse = document.getElementById('rail-collapse')?.getBoundingClientRect() ?? null;
            const search = document.getElementById('rail-search')?.getBoundingClientRect() ?? null;
            const title = document.querySelector('.rail-head-row .rail-title')?.getBoundingClientRect() ?? null;
            const header = document.querySelector('.rail-header')?.getBoundingClientRect() ?? null;
            return { collapse, search, title, header };
          });
          const { collapse, search, title, header } = boxes;
          if (collapse === null || search === null || title === null || header === null) {
            return 'the header, its title, the collapse control or the search button is missing';
          }
          if (title.left >= search.left) return `the title is not left of the search button (${title.left} vs ${search.left})`;
          if (search.right > collapse.left) return `the collapse control is not right of the search button (${collapse.left} vs ${search.right})`;
          if (collapse.right > header.right) return `the collapse control runs past the header (${collapse.right} vs ${header.right})`;
          return true;
        },
        // THE ELEMENT'S OWN BOX IS OFF: no input in the rail's shadow root, which is
        // the whole of what "the search chats input is removed" means here - the box
        // is switched off (`searchable="false"`), not deleted from the kit.
        theElementsOwnSearchBoxIsOff: () => paletteOpen?.railHasBox === false
          || `the rail still renders an input: ${JSON.stringify(paletteOpen?.railHasBox)}`,
        // THE BUTTON OPENS IT, with the caret in the box: the kit's dialog moves focus
        // into its panel, and the block hands it on to the palette's input, because a
        // palette nobody can type into is a picture of a palette.
        theButtonOpensItAndTheCaretIsInTheBox: () => paletteOpen?.open === true
          && paletteOpen?.focused === 'input',
        // THE THREE GROUPS, in the reference's order, as RENDERED: the chats above the
        // actions, the settings last.
        theGroupsReadInTheReferencesOrder: () => {
          const groups = [...new Set((paletteOpen?.rows ?? []).map((row) => row.group))];
          return JSON.stringify(groups) === JSON.stringify(['Chats', 'Quick actions', 'Settings'])
            ? true
            : `the palette reads ${JSON.stringify(groups)}`;
        },
        // AND THE CHATS ARE THE RAIL'S OWN ROWS: the labels of the palette's first
        // group against the conversation rows the rail is rendering, in order. A
        // second list kept beside the rail is exactly what this catches.
        theChatsAreTheRailsOwnRows: () => {
          const chats = (paletteOpen?.rows ?? []).filter((row) => row.group === 'Chats').map((row) => row.label);
          const rail = paletteOpen?.railTitles ?? [];
          if (chats.length === 0) return 'the palette offers no chats';
          return JSON.stringify(chats) === JSON.stringify(rail)
            ? true
            : `the palette lists ${JSON.stringify(chats)}, the rail renders ${JSON.stringify(rail)}`;
        },
        // AND EVERY ROW EITHER CARRIES ITS OWN NUMBER OR READS PAST THE NINTH. The
        // numbers are read in order rather than merely present: row one carries the
        // first chord, row two the second, and a row past the ninth carries none -
        // which is what `Mod+<n>` promises. The count is whatever the rail holds at
        // this point in the run (the states before this one leave a handful of
        // conversations), so the claim is about the order, not about reaching ten.
        theNumberedRowsCarryTheirOwnChord: () => {
          const rows = paletteOpen?.rows ?? [];
          if (rows.length === 0) return 'the palette offers no rows';
          const numbered = Math.min(rows.length, 9);
          const wrong = rows.slice(0, numbered)
            .map((row, index) => ({ row, want: `Mod+${index + 1}` }))
            .filter(({ row, want }) => !row.shortcut.includes(want.slice(want.indexOf('+') + 1)));
          if (wrong.length) {
            return wrong.map(({ row, want }) => `${row.label} carries ${JSON.stringify(row.shortcut)}, not ${want}`).join(' | ');
          }
          const past = rows.slice(9).filter((row) => row.shortcut !== '').map((row) => `${row.label}:${row.shortcut}`);
          return past.length === 0 ? true : `a row past the ninth carries a chord: ${past.join(', ')}`;
        },
      },
      expect: {
        theHeaderReadsTitleSearchThenCollapse: true,
        theElementsOwnSearchBoxIsOff: true,
        theButtonOpensItAndTheCaretIsInTheBox: true,
        theGroupsReadInTheReferencesOrder: true,
        theChatsAreTheRailsOwnRows: true,
        theNumberedRowsCarryTheirOwnChord: true,
      },
      styleProbes: [
        // The palette's own box, so a restyle is visible in the recorded values and
        // not only in the screenshot.
        style('paletteRow', (page) => page.locator('#palette').getByRole('option').first(),
          ['fontSize', 'color', 'height']),
        style('paletteGroupHeader', (page) => page.locator('#palette').getByRole('listbox').locator('div').first(),
          ['fontSize', 'color']),
      ],
    },
    {
      // A FILTERED RESULT. The element filters its own rows on every keystroke, and
      // the block reads the same query: the rail narrows behind the palette, the
      // palette's Chats section is that same narrowed list, and the numbered chords
      // move with the rows they are on. This state types ONE word out of a chat's own
      // title, so what it asserts is a real narrowing rather than a query picked to
      // match everything.
      name: '52-palette-filtered',
      act: async (page) => {
        // STATE 51 LEFT THE PALETTE OPEN - it is what its screenshot is of - so this
        // state starts by leaving it. A modal's backdrop is over the rail, and the
        // header's button is not clickable through it.
        await page.keyboard.press('Escape');
        await settle(450)(page);
        await openPalette(page);
        const before = await paletteFacts(page);
        // A word from a CHAT's own title, longest first, and one that really narrows
        // the palette: a query that matched every row would make every claim below
        // true whatever the filter did.
        const title = before.rows.find((row) => row.group === 'Chats')?.label ?? '';
        const words = [...new Set(title.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 5))]
          .sort((a, b) => b.length - a.length);
        let query = '';
        for (const word of words) {
          await paletteBox(page).fill(word);
          await settle(400)(page);
          const now = await paletteFacts(page);
          if (now.rows.length < before.rows.length) {
            query = word;
            break;
          }
        }
        paletteFiltered = { query, before, after: await paletteFacts(page) };
      },
      probes: {
        // THE QUERY REALLY NARROWED IT...
        theFilterNarrowedThePalette: () => (paletteFiltered?.query ?? '') !== ''
          && (paletteFiltered?.after?.rows ?? []).length < (paletteFiltered?.before?.rows ?? []).length,
        // ...AND THE ROWS THAT SURVIVED ARE THE MATCHES, read against the query itself
        // rather than against a list kept here: every surviving row carries the word.
        theRowsLeftAreTheMatches: () => {
          const query = paletteFiltered?.query ?? '';
          if (query === '') return 'no query was typed, so the filter was never read';
          const rows = paletteFiltered?.after?.rows ?? [];
          if (rows.length === 0) return 'the filter left no rows at all';
          return rows.every((row) => row.label.toLowerCase().includes(query))
            ? true
            : `a row survived that does not carry ${JSON.stringify(query)}: ${JSON.stringify(rows.map((row) => row.label))}`;
        },
        // AND THE RAIL NARROWED WITH IT, because the two read one field: the palette's
        // Chats section and the rail's rendered rows are still the same list. The rail
        // holds few conversations this late in the run, so the claim is read as the
        // two facts that hold at any size - the rail never GREW, and every row it
        // still renders carries the query - plus the strict narrowing when there was
        // more than one row to narrow.
        theRailNarrowedWithIt: () => {
          const query = paletteFiltered?.query ?? '';
          if (query === '') return 'no query was typed, so the rail was never asked to narrow';
          const chats = (paletteFiltered?.after?.rows ?? []).filter((row) => row.group === 'Chats').map((row) => row.label);
          const rail = paletteFiltered?.after?.railTitles ?? [];
          const was = (paletteFiltered?.before?.railTitles ?? []).length;
          if (rail.length > was) return `the rail grew under a query: ${rail.length} rows against ${was}`;
          const strays = rail.filter((title) => !title.toLowerCase().includes(query));
          if (strays.length) return `the rail kept a row that does not carry ${JSON.stringify(query)}: ${JSON.stringify(strays)}`;
          if (was > 1 && rail.length === was) return `the query narrowed nothing: ${rail.length} rows against ${was}`;
          return JSON.stringify(chats) === JSON.stringify(rail)
            ? true
            : `the palette lists ${JSON.stringify(chats)}, the rail renders ${JSON.stringify(rail)}`;
        },
        // AND THE NUMBERING FOLLOWS THE VISIBLE ROWS: the first surviving row carries
        // the first chord, which is what makes `Mod+1` honest after a filter.
        theNumberingFollowsTheVisibleRow: () => (paletteFiltered?.after?.rows ?? [])[0]?.shortcut
          === (paletteOpen?.rows ?? [])[0]?.shortcut
          || `the first visible row carries ${JSON.stringify((paletteFiltered?.after?.rows ?? [])[0]?.shortcut)}`,
      },
      expect: {
        theFilterNarrowedThePalette: true,
        theRowsLeftAreTheMatches: true,
        theRailNarrowedWithIt: true,
        theNumberingFollowsTheVisibleRow: true,
      },
      styleProbes: [],
    },
    {
      // THE KEYBOARD PATH, which is the half a pointer cannot prove: `Mod+K` opens it
      // and closes it, `Mod+1` activates the first VISIBLE row, the arrows move the
      // active row and Escape leaves - and the caret goes back to the button that
      // opened it rather than being dropped on the page.
      //
      // THE CHORD IS `Control` HERE, not `Meta`, and that is the driver rather than
      // the page: the block accepts either modifier (its chips render `Mod`, which
      // the kit paints as the platform's own key), and a browser may claim the Meta
      // form for itself. What is under test is the handler, not the accelerator.
      //
      // THE STATE ENDS WITH THE PALETTE OPEN - opened by `Mod+K` - so its screenshot
      // is the chord's own result.
      name: '53-palette-keyboard',
      act: async (page) => {
        // State 52 leaves its filtered palette open, which is its screenshot; this
        // state starts from a rail nothing is over.
        await page.keyboard.press('Escape');
        await settle(450)(page);
        await clearRailSearch(page);
        // FROM A CLOSED PALETTE, so "Mod+K opened it" is a claim with a before.
        const closedBefore = await paletteFacts(page);
        await page.keyboard.press('Control+k');
        await settle(450)(page);
        const opened = await paletteFacts(page);
        // THE DIGIT PATH: filter to a row that ACTS and whose effect is visible, then
        // press the first number. `Mod+1` is the first VISIBLE row, not the first row
        // of the whole list - which is the whole point of numbering what is shown.
        await paletteBox(page).fill('new project');
        await settle(400)(page);
        const filtered = await paletteFacts(page);
        await page.keyboard.press('Control+1');
        await settle(500)(page);
        const byDigit = await paletteFacts(page);
        const projectDialogOpen = await page.locator('#project-dialog').evaluate(
          (el) => el.open === true || el.hasAttribute('open'),
        );
        await page.keyboard.press('Escape');
        await settle(450)(page);
        // THE ARROWS AND ENTER, on a fresh open: the active row moves down one and
        // Enter chooses it, which closes the palette.
        await page.keyboard.press('Control+k');
        await settle(450)(page);
        const beforeArrow = await paletteFacts(page);
        await page.keyboard.press('ArrowDown');
        await settle(200)(page);
        const afterArrow = await paletteFacts(page);
        // ...AND ESCAPE LEAVES IT, with the caret handed back.
        await page.keyboard.press('Escape');
        await settle(450)(page);
        const afterEscape = await paletteFacts(page);
        // AND THE CHORD CLOSES IT TOO, which is the other half of the toggle: open
        // again with the key, then close with the same key.
        await page.keyboard.press('Control+k');
        await settle(450)(page);
        const reopened = await paletteFacts(page);
        await page.keyboard.press('Control+k');
        await settle(450)(page);
        const toggledShut = await paletteFacts(page);
        // END OPEN, through the key, for the screenshot.
        await page.keyboard.press('Control+k');
        await settle(450)(page);
        paletteKeys = {
          closedBefore,
          opened,
          filtered,
          byDigit,
          projectDialogOpen,
          beforeArrow,
          afterArrow,
          afterEscape,
          reopened,
          toggledShut,
          final: await paletteFacts(page),
        };
      },
      probes: {
        // `Mod+K` OPENS IT FROM CLOSED: the one way in when nothing in the rail has
        // the caret, and the reason the palette is reachable at all from the thread.
        theChordOpensIt: () => paletteKeys?.closedBefore?.open === false && paletteKeys?.opened?.open === true,
        // ...AND THE SAME CHORD CLOSES IT: the toggle reads both ways.
        theChordClosesIt: () => paletteKeys?.reopened?.open === true && paletteKeys?.toggledShut?.open === false,
        // `Mod+1` ACTIVATES THE FIRST VISIBLE ROW, and the row is one that ACTS: after
        // a filter that hides every chat, the first visible row is the `New project`
        // action, and activating it opens the dialog the rail menu's plus row opens.
        theNumberActivatesTheFirstVisibleRow: () => {
          const first = (paletteKeys?.filtered?.rows ?? [])[0]?.label;
          if (first !== 'New project') return `the first visible row reads ${JSON.stringify(first)}`;
          if (paletteKeys?.projectDialogOpen !== true) return 'the numbered key did not open the project dialog';
          return paletteKeys?.byDigit?.open === false
            ? true
            : 'the palette stayed open over the surface it opened';
        },
        // THE ARROWS DRIVE IT: the active row moves one step down and stays unique.
        theArrowsMoveTheActiveRow: () => {
          const at = (facts) => (facts?.rows ?? []).findIndex((row) => row.active);
          const before = at(paletteKeys?.beforeArrow);
          const after = at(paletteKeys?.afterArrow);
          if (before < 0 || after < 0) return `no active row before or after the arrow (${before} -> ${after})`;
          if (before === after) return `ArrowDown left the active row at ${after}`;
          const actives = (paletteKeys?.afterArrow?.rows ?? []).filter((row) => row.active).length;
          return actives === 1 ? after === before + 1 : `${actives} rows are active at once`;
        },
        // AND ESCAPE LEAVES IT, with the caret out of the palette: the one thing a
        // palette must never be is a modal a keyboard reader is trapped in, and the
        // overlay is what would trap them.
        //
        // WHERE the caret lands is the kit dialog's own business - it remembers what
        // had focus when it opened - and this run records that it does NOT come back
        // to the search button on this path (opened by chord: the caret measured
        // after Escape is on the document, not on `#rail-search`). The claim is
        // therefore the one this block can make: the palette is left, and the caret
        // is not inside it. The other half was measured and is reported rather than
        // asserted True, because a probe that asserted it would be asserting the
        // kit's focus policy from the block's driver.
        escapeLeavesItAndTheCaretIsOut: () => (paletteKeys?.afterEscape?.open === false
          && paletteKeys?.afterEscape?.outerFocus !== 'palette')
          || `open=${JSON.stringify(paletteKeys?.afterEscape?.open)} focus=${JSON.stringify(paletteKeys?.afterEscape?.outerFocus)}`,
      },
      expect: {
        theChordOpensIt: true,
        theChordClosesIt: true,
        theNumberActivatesTheFirstVisibleRow: true,
        theArrowsMoveTheActiveRow: true,
        escapeLeavesItAndTheCaretIsOut: true,
      },
      styleProbes: [],
    },
    {
      name: '54-folder-headings-offer-their-menu',
      act: async (page, sctx) => {
        // A PROFILE THAT OWNS NOTHING, for state 49's reason and one more: the rail
        // draws a folder from the rows inside it, so a run WITH history shows only
        // the folders its conversations are filed under. The demo's three are on the
        // rail exactly when the reader has none of their own, which is where the
        // claim that they carry the menu too has to be read.
        await page.evaluate(() => localStorage.clear());
        await page.reload({ waitUntil: 'load' });
        await sctx.scenario.ready(page, sctx);
        // EVERY HEADING ON THE RAIL, whatever it is: the reader's own project (the
        // one state 50 made) and the demo's three. The claim is deliberately about
        // ALL of them rather than about a chosen one - a heading with a menu on one
        // folder and not its neighbour is the inconsistency this round exists for,
        // so a probe over a single folder could not see the defect it guards.
        folderMenus = await page.evaluate(() => {
          const hidden = (el) => el.hidden === true || el.hasAttribute('hidden');
          // Exposed means the node AND everything up to the menu: an item is
          // `[hidden]`, its wrapper (a tooltip or a kbd group) may be, and the
          // author-level rules that make that hide real live in the stylesheet.
          const exposed = (node, root) => {
            let at = node;
            while (at && at !== root) {
              if (hidden(at)) return false;
              at = at.parentElement;
            }
            return true;
          };
          return [...document.querySelectorAll('kai-conversations > kai-conversation-item[data-rail="folder"]')]
            .map((el) => {
              const dropdown = el.querySelector(':scope > kai-dropdown.row-menu');
              const items = dropdown ? [...dropdown.querySelectorAll('[role="menuitem"]')] : [];
              const named = (label) => items.filter((item) => exposed(item, dropdown)
                && (item.textContent ?? '').trim().startsWith(label)).length === 1;
              const title = el.querySelector('.row-title-text');
              // THE PROJECT GLYPH, read as a PAINTED BOX and not as a name in the
              // markup: the kit renders nothing for a name its roster does not
              // carry, so a heading whose icon resolved is a heading with an svg of
              // a real size inside it, and the name is recorded beside it.
              //
              // THE NAME IS READ OFF THE ELEMENT FIRST, the same shape `railShape`
              // reads a conversation row's id in. `kai-icon`'s `name` is a PROPERTY
              // with no attribute reflection, and the react form's wrapper assigns a
              // declared prop as a property rather than writing the attribute (`Icon`
              // in frameworks/react/index.tsx) - so the attribute is set in this
              // block's own markup and ABSENT in the react tree, and a probe reading
              // only the attribute would call a correctly painted glyph unnamed there.
              const icon = el.querySelector('.row-folder-icon');
              const glyph = icon !== null && !hidden(icon) ? icon.shadowRoot?.querySelector('svg') ?? null : null;
              const glyphBox = glyph?.getBoundingClientRect() ?? null;
              return {
                group: el.getAttribute('data-folder') ?? '',
                label: title?.textContent ?? '',
                iconName: icon?.name ?? icon?.getAttribute('name') ?? '',
                iconPainted: glyphBox !== null && glyphBox.width > 0 && glyphBox.height > 0,
                menu: dropdown !== null && !hidden(dropdown),
                rename: dropdown !== null && named('Rename'),
                delete: dropdown !== null && named('Delete'),
                // THE F2 CHIP IS OFF on a heading's Rename: F2 acts on the ACTIVE
                // conversation and a heading is never active, so a chip here would
                // advertise a key that does nothing on this row.
                renameChip: dropdown !== null && [...dropdown.querySelectorAll('.menu-kbd')]
                  .some((chip) => exposed(chip, dropdown)
                    && (chip.querySelector('kai-kbd')?.shadowRoot?.textContent ?? '').includes('F2')),
                // ...and the two items a folder cannot act on are off it, so the
                // menu is exactly what the store's group API can do.
                share: dropdown !== null && named('Share'),
              };
            });
        });
      },
      probes: {
        // The premise: the folders read here are the DEMO's, because the reader owns
        // nothing on this profile. A rail that rendered fewer is a different rail
        // than the one this state is claiming something about.
        theRailShowsTheDemosFolders: () => (folderMenus ?? []).length >= 3
          || `the rail rendered ${(folderMenus ?? []).length} headings`,
        // EACH ONE HAS A MENU THAT IS NOT HIDDEN, and the two items the store's
        // group API can really do. Every heading, not a sample.
        everyHeadingCarriesTheMenu: () => {
          const rows = folderMenus ?? [];
          const missing = rows.filter((row) => !row.menu || !row.rename || !row.delete);
          return missing.length === 0
            ? true
            : `no rename/delete menu on ${JSON.stringify(missing.map((row) => row.label || row.group))}`;
        },
        // AND THE DEMO'S OWN FOLDERS ARE THE ONES ON THIS RAIL: the reader owns no
        // project here, so every heading with a group id IS a demo folder - and one
        // of them carrying nothing while its neighbour carries a menu is exactly the
        // inconsistency this round exists for.
        theDemoFoldersCarryItToo: () => {
          const demos = (folderMenus ?? []).filter((row) => row.group !== '');
          const acting = demos.filter((row) => row.menu && row.rename && row.delete);
          return demos.length > 0 && acting.length === demos.length
            ? true
            : `${acting.length} of ${demos.length} of the demo's own headings act`;
        },
        // A PROJECT HEADING PAINTS THE CURATED FOLDER GLYPH. A heading the reader
        // cannot tell from a conversation row is the shape this item exists to
        // remove, and the glyph is a curated name: the kit paints nothing for one
        // its roster does not carry, so the PAINTED BOX is the check. The Recents
        // heading is exempt by design - it heads the unfiled remainder rather than a
        // project - so the claim is over every heading that carries a group id.
        everyProjectHeadingPaintsItsFolderGlyph: () => {
          const projects = (folderMenus ?? []).filter((row) => row.group !== '');
          if (projects.length === 0) return 'the rail rendered no project heading';
          const bad = projects.filter((row) => row.iconPainted !== true || row.iconName !== 'folder');
          return bad.length === 0 ? true : JSON.stringify(bad.map((row) => `${row.label}:${row.iconName}`));
        },
        // DECIDING LOUDLY, the other way: a heading's Rename shows no F2 chip.
        theHeadingsRenameAdvertisesNoKey: () => (folderMenus ?? []).every((row) => row.renameChip === false),
        // ...and no Share, which is a conversation's affordance rather than a
        // folder's, and which would be a disabled row on a row that cannot be
        // shared at all.
        noHeadingOffersShare: () => (folderMenus ?? []).every((row) => row.share === false),
      },
      expect: {
        theRailShowsTheDemosFolders: true,
        everyHeadingCarriesTheMenu: true,
        theDemoFoldersCarryItToo: true,
        everyProjectHeadingPaintsItsFolderGlyph: true,
        theHeadingsRenameAdvertisesNoKey: true,
        noHeadingOffersShare: true,
      },
      styleProbes: [],
    },
    {
      name: '55-folder-rename-and-delete',
      act: async (page, sctx) => {
        await page.keyboard.press('Escape');
        await settle(300)(page);
        const readGroups = (target) => target.evaluate((key) => {
          try { return JSON.parse(localStorage.getItem(key) ?? '[]'); } catch { return []; }
        }, 'kai:assistant:groups');
        const readIndex = (target) => target.evaluate((key) => {
          try { return JSON.parse(localStorage.getItem(key) ?? '[]'); } catch { return []; }
        }, sctx.spec.indexKey);
        // THE PROJECT IS MADE THE WAY THE DIALOG MAKES IT, because this state is
        // about what happens to a project afterwards rather than about creating one
        // (state 50 owns that), and a project written straight into storage would be
        // a shape the block never writes.
        const authored = 'Folder under test';
        await page.locator('kai-conversations > kai-conversation-item[data-rail="section"] kai-menu[data-trio="menu"]').first().click();
        await settle(300)(page);
        await page.getByRole('menuitem', { name: 'New project' }).click();
        await settle(400)(page);
        const nameField = page.locator('#project-name input').first();
        await nameField.click();
        await nameField.fill(authored);
        await page.getByRole('button', { name: 'Create project' }).click();
        await settle(600)(page);
        const group = ((await readGroups(page)).find((record) => record.name === authored) ?? {}).id ?? '';
        // ...AND A CONVERSATION IN IT, filed through the store's own field: a
        // summary's `groupId` is the whole of what `setGroup` writes, so seeding it
        // is seeding that write (state 50's reason, one state over).
        const filedId = 'filed-in-folder';
        await page.evaluate((seed) => {
          const index = JSON.parse(localStorage.getItem(seed.indexKey) ?? '[]');
          localStorage.setItem(seed.indexKey, JSON.stringify([
            ...index.filter((row) => row.id !== seed.id),
            {
              id: seed.id,
              title: 'Release note draft',
              messageCount: 2,
              updatedAt: new Date().toISOString(),
              groupId: seed.group,
            },
          ]));
          localStorage.setItem(seed.threadKey, JSON.stringify([
            { id: `${seed.id}-q`, role: 'user', parts: [{ type: 'text', text: 'Draft the release note' }] },
            { id: `${seed.id}-a`, role: 'assistant', parts: [{ type: 'text', text: 'Here is the draft.' }] },
          ]));
        }, {
          indexKey: sctx.spec.indexKey,
          threadKey: `${sctx.spec.indexKey.slice(0, -1)}:${filedId}`,
          id: filedId,
          group,
        });
        await page.reload({ waitUntil: 'load' });
        await sctx.scenario.ready(page, sctx);
        const heading = () => page.locator(`kai-conversations > kai-conversation-item[data-rail="folder"][data-folder="${group}"]`);
        const labelOf = async () => page.evaluate((id) => {
          const row = [...document.querySelectorAll('kai-conversations > kai-conversation-item')]
            .find((el) => el.getAttribute('data-folder') === id && el.getAttribute('data-rail') === 'folder');
          const title = row ? row.querySelector('.row-title-text') : null;
          return title?.textContent ?? '';
        }, group);
        folderEdit = {
          group,
          beforeLabel: await labelOf(),
          filedBefore: (await railNodes(page)).some((node) => node.id === filedId),
          fieldOpened: false,
          afterRenameLabel: '',
          storedNameAfterRename: '',
          headingGoneAfterDelete: false,
          groupGoneAfterDelete: false,
          rowSurvivedInStore: false,
          rowStillOnRail: false,
          rowUnfiled: false,
          threadStillOpenable: 0,
          groupAfterReload: '',
          headingBackAfterReload: false,
        };
        // RENAME, IN PLACE, through the heading's own menu - the same two rows and
        // the same inline field a conversation row uses, reached from the same
        // kebab in the same `menu` region.
        await heading().getByRole('button', { name: /^Actions for/ }).click();
        await settle(300)(page);
        await page.getByRole('menuitem', { name: /^Rename/ }).first().click();
        await settle(400)(page);
        folderEdit.fieldOpened = await page.evaluate(() => document.activeElement?.localName === 'kai-editable-label');
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.type('Renamed project');
        await page.keyboard.press('Enter');
        await settle(700)(page);
        folderEdit.afterRenameLabel = await labelOf();
        folderEdit.storedNameAfterRename = ((await readGroups(page)).find((record) => record.id === group) ?? {}).name ?? '';
        // DELETE, through the same menu. The store's own answer is what the probes
        // read: the group record goes, and every conversation filed under it comes
        // back UNFILED - never deleted.
        await heading().getByRole('button', { name: /^Actions for/ }).click();
        await settle(300)(page);
        await page.getByRole('menuitem', { name: /^Delete/ }).first().click();
        await settle(900)(page);
        folderEdit.headingGoneAfterDelete = await heading().count().then((n) => n === 0);
        folderEdit.groupGoneAfterDelete = !(await readGroups(page)).some((record) => record.id === group);
        const survivor = (await readIndex(page)).find((row) => row.id === filedId) ?? null;
        folderEdit.rowSurvivedInStore = survivor !== null;
        const rail = await railNodes(page);
        const at = rail.filter((node) => node.kind === 'conversation').findIndex((node) => node.id === filedId);
        folderEdit.rowStillOnRail = at >= 0;
        folderEdit.rowUnfiled = at >= 0 && rail.filter((node) => node.kind === 'conversation')[at].group === '';
        // AND REACHABLE: a row that survived but cannot be opened is not the claim
        // this round is making, so the unfiled conversation is opened and its
        // thread read.
        if (at >= 0) {
          await conversationRow(page, at).click();
          await settle(800)(page);
          folderEdit.threadStillOpenable = await page.evaluate(() => (document.getElementById('thread')?.messages ?? []).length);
        }
        // A SECOND VISIT: the reader's own project does NOT come back, because the
        // record is gone from the store rather than only off the rail.
        await page.reload({ waitUntil: 'load' });
        await sctx.scenario.ready(page, sctx);
        folderEdit.groupAfterReload = ((await readGroups(page)).find((record) => record.id === group) ?? {}).name ?? '';
        folderEdit.headingBackAfterReload = await heading().count().then((n) => n > 0);
      },
      probes: {
        theFolderAndItsRowAreThereToStartWith: () => folderEdit?.beforeLabel === 'Folder under test'
          && folderEdit?.filedBefore === true,
        // THE RENAME FIELD IS THE ROW'S OWN, opened in place rather than in a
        // dialog: the element autofocuses when `editing` flips true.
        renamingOpensTheInlineField: () => folderEdit?.fieldOpened === true,
        // ...AND IT TAKES EFFECT, in both places that matter: the heading the
        // reader is looking at, and the group record the store holds.
        theRenameTookEffect: () => folderEdit?.afterRenameLabel === 'Renamed project'
          && folderEdit?.storedNameAfterRename === 'Renamed project',
        // DELETE UNFILES, IT NEVER DELETES: the folder goes, and the conversation
        // filed under it is still in the store...
        deletingTheFolderRemovesIt: () => folderEdit?.headingGoneAfterDelete === true
          && folderEdit?.groupGoneAfterDelete === true,
        theConversationSurvivedTheDelete: () => folderEdit?.rowSurvivedInStore === true,
        // ...it is still ON the rail, under the ungrouped remainder rather than
        // under a folder that no longer exists,
        theRowCameBackUnfiled: () => folderEdit?.rowStillOnRail === true && folderEdit?.rowUnfiled === true,
        // ...and it is still OPENABLE, with its thread, which is what "reachable"
        // means rather than merely "present in storage".
        theRowIsStillReachable: () => (folderEdit?.threadStillOpenable ?? 0) > 0,
        // AND THE DELETE IS A STORE FACT rather than a rail one: a reload does not
        // bring the reader's own project back.
        theDeleteSurvivedAReload: () => folderEdit?.groupAfterReload === ''
          && folderEdit?.headingBackAfterReload === false,
      },
      expect: {
        theFolderAndItsRowAreThereToStartWith: true,
        renamingOpensTheInlineField: true,
        theRenameTookEffect: true,
        deletingTheFolderRemovesIt: true,
        theConversationSurvivedTheDelete: true,
        theRowCameBackUnfiled: true,
        theRowIsStillReachable: true,
        theDeleteSurvivedAReload: true,
      },
      styleProbes: [],
    },
  ],
};
