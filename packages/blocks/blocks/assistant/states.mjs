// assistant's state script for the block driver (V-1): the full-page
// assistant walked through its named states - empty, a reply with reasoning
// plus a settled tool call, a cited follow-up, the model switcher recipe, the
// rail, a fresh chat, the controller's restore-on-reload, and the affordances a
// reader would try next: the row menu, the row shortcuts the menu advertises,
// and ONE ACTION PROOF PER ROW OP - a rename committed through the inline
// field, a pin through the row's own menu that moves that row to the top of
// the list, an archive that unlists the row - then the collapsed rail and the
// drawer it becomes below the shell's breakpoint, and finally the three
// controls this page owns at its edges: the voice transcript path, the settings
// menu's theme choice, and the scroll-to-bottom button.
// One page (the generated /kit/ rendering of the CDN form), so record/check are
// the modes; there is no facade parity reference for this composition.
//
// Runs (from packages/ui, after a real build + gen-blocks):
//   record:  node scripts/block-driver/driver.mjs blocks/assistant/states.mjs \
//              --serve scripts/block-driver/pages --pages block \
//              --record scripts/block-driver/baselines/assistant.json --shots <dir>

const settle = (ms) => (page) => page.waitForTimeout(ms);
const style = (name, target, props) => ({ name, target, props });

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

// The thread a card click produced, captured in that click's act for the same
// reason: the shapes asserted below are read from what the app built, never
// retyped here.
let guideThread = null;

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

// State 18's two facts, one gesture apart: what the scroll button was doing
// while the thread was scrolled up, and whether the thread is a scroller at all.
// The button HIDES ITSELF at the bottom of the thread, so "it works" is only
// observable in the moment before the click.
let scrollButtonUp = null;
let threadIsScroller = null;

// State 16's premise: the thread has to be taller than its viewport, and that is
// a fact about the page rather than about the recorder, so it is measured.
let threadOverflows = null;

const firstIndexRow = (page, spec) => page.evaluate(
  (key) => { try { return JSON.parse(localStorage.getItem(key) ?? '[]')[0] ?? null; } catch { return null; } },
  spec.indexKey,
);

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
      // localStorageStore titles from the latest message text at first save:
      // the assistant's first reply (a recorded spike observation about the
      // store, not this block).
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
      // Computed style is a measurement of the document it was taken in, and
      // the react host is a Vite index.html with a mounted subtree rather
      // than this block's own page. This page asserts state, navigation and
      // console-cleanliness; the style probes stay where they were measured.
      skipLayout: true,
    },
  },

  states: [
    {
      name: '1-empty',
      probes: {
        emptyTitle: (page) => page.getByText('What can I help with?').count().then((n) => n > 0),
        suggestion: (page) => page.getByRole('button', { name: 'Summarize a document' }).isVisible().catch(() => false),
        railNewChat: (page) => page.getByRole('button', { name: 'New chat' }).isVisible().catch(() => false),
        // The switcher renders only with more than one model - its presence IS
        // the recipe working.
        modelTrigger: (page) => page.getByText('Mock Standard').count().then((n) => n > 0),
      },
      expect: { emptyTitle: true, suggestion: true, railNewChat: true, modelTrigger: true },
      styleProbes: [
        style('topbarTitle', (page) => page.getByRole('heading', { name: 'Assistant' }),
          ['fontSize', 'fontWeight', 'color']),
      ],
    },
    {
      name: '2-reply-tool',
      act: async (page) => {
        await page.getByRole('button', { name: 'Summarize a document' }).click();
        await settle(3500)(page);
      },
      probes: {
        reading: (page) => page.getByText('Reading q3-metrics.pdf').count().then((n) => n > 0),
        tool: (page) => page.getByText(/read[_-]?document/i).count().then((n) => n > 0),
        suggestionsGone: (page) => page.getByRole('button', { name: 'Draft the Q3 board update' }).isVisible().catch(() => false),
      },
      expect: { reading: true, tool: true, suggestionsGone: false },
      styleProbes: [
        style('assistantReplyText', (page) => page.getByText('Reading q3-metrics.pdf').first(),
          ['color', 'fontSize']),
      ],
    },
    {
      name: '3-cited-followup',
      act: async (page) => {
        // Scoped to the composer: the rail's search box is a textbox too.
        const box = page.locator('kai-prompt-input').getByRole('textbox').first();
        await box.click();
        await box.fill('Summarize the key numbers');
        await box.press('Enter');
        await settle(3500)(page);
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
        await page.getByRole('button', { name: /^Actions for/ }).first().click();
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
        triggerHaspopup: (page) => page.getByRole('button', { name: /^Actions for/ }).first()
          .getAttribute('aria-haspopup'),
        triggerExpanded: (page) => page.getByRole('button', { name: /^Actions for/ }).first()
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
        renameChip: (page) => page.locator('.menu-kbd').first()
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
        keyChips: (page) => page.locator('kai-conversation-item').first().locator('.menu-kbd')
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
        kbdWelded: (page) => page.locator('kai-conversation-item').first().locator('.menu-kbd kai-kbd')
          .evaluateAll((els) => {
            const bad = [];
            for (const el of els) {
              const keys = el.getAttribute('keys');
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
        dividers: (page) => page.locator('kai-conversation-item').first().locator('.row-menu [role="separator"]')
          .evaluateAll((els) => {
            const boxed = (el) => { const b = el.getBoundingClientRect(); return b.height >= 1 && b.width > 100; };
            const rendered = els.filter(boxed);
            if (rendered.length !== 2) return `${rendered.length} boxed of ${els.length} present: ${JSON.stringify(els.map((el) => Math.round(el.getBoundingClientRect().width)))}`;
            return true;
          }),
        // ...and the walk above never landed on one: a divider that took a key would
        // be in this list. It is also not a tab stop and does not match the kit's own
        // roving selector, so both halves of "not in the keyboard's way" are here.
        dividerSkipsKeyboard: (page) => page.locator('kai-conversation-item').first().locator('.row-menu [role="separator"]')
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
        rowsWide: (page) => page.locator('kai-conversation-item').first().locator('.row-menu kai-button[role="menuitem"]')
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
        await page.getByRole('button', { name: /^Actions for/ }).first().click();
        await settle(300)(page);
        await page.getByRole('menuitem', { name: /^Unpin/ }).first().click();
        await settle(500)(page);
        await page.getByRole('button', { name: /^Actions for/ }).first().click();
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
        // bound conversation-id, read off the second row.
        pinnedRowId = await page.locator('kai-conversation-item').nth(1).getAttribute('conversation-id');
        // The row's OWN menu, not the first row's: the menu acts on the row it was
        // opened from, which is the whole reason each row carries one.
        await page.getByRole('button', { name: /^Actions for/ }).nth(1).click();
        await settle(300)(page);
        await page.getByRole('menuitem', { name: /^Pin/ }).first().click();
        await settle(600)(page);
      },
      probes: {
        // The premise, asserted rather than assumed: without two rows the order
        // probe below could not tell a reorder from a single row sitting still.
        twoRows: (page) => page.locator('kai-conversation-item').count().then((n) => n === 2),
        // The row that was second is now first.
        pinnedRowFirst: (page) => page.locator('kai-conversation-item').first()
          .getAttribute('conversation-id').then((id) => id !== null && id === pinnedRowId),
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
        // The kit's own attribute, on the shell: this IS the mechanism (the scheme is
        // per element, so the block binds it on every element it renders), not a
        // marker the block made up.
        workspaceTheme: (page) => page.locator('#workspace').getAttribute('theme'),
        // A SECOND element, bound the same way - the element that would keep
        // following the OS if the choice were not per element.
        promptTheme: (page) => page.locator('#prompt').getAttribute('theme'),
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
      },
      expect: {
        card0: true, card1: true, card2: true, card3: true,
        cardOrder: GUIDE_CARDS.join(' > '), summariesPresent: true,
      },
    },
    ...GUIDE_CARDS.map((cardLabel, i) => ({
      name: `${19 + i + 1}-guide-${GUIDE_SLUGS[i]}`,
      act: async (page) => {
        await page.getByRole('button', { name: 'New chat' }).click();
        await settle(400)(page);
        guideRowsBefore = await page.locator('kai-conversation-item').count();
        await page.getByRole('button', { name: cardLabel }).click();
        await settle(400)(page);
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
        // AND THE RAIL DID NOT CHANGE - the regression the boot-time seeding hit,
        // where a seed became the rail's first row and took the subject away from
        // the state running. A click is the reader's own act: it seeds the thread
        // and writes nothing, and the row appears when they send their next
        // message, which `submit` already does.
        railUnchanged: (page) => page.locator('kai-conversation-item').count().then((n) => n === guideRowsBefore),
      },
      expect: {
        twoTurns: true, userThenAssistant: true, askedIsAQuestion: true,
        answerIsSubstantial: true, cardsGone: true, railUnchanged: true,
      },
    })),
  ],
};
