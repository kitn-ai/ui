// assistant's state script for the block driver (V-1): the full-page
// assistant walked through its named states - empty, a reply with reasoning
// plus a settled tool call, a cited follow-up, the model switcher recipe, the
// rail, a fresh chat, the controller's restore-on-reload, and the affordances a
// reader would try next: the row menu, the row shortcuts the menu advertises,
// and ONE ACTION PROOF PER ROW OP - a rename committed through the inline
// field, a pin through the row's own menu that moves that row to the top of
// the list, an archive that unlists the row - then the collapsed rail and the
// drawer it becomes below the shell's breakpoint.
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
        // The Rename row's key chip is a kai-kbd: its caps render inside its own
        // shadow root, and F2 is spelled the same on every platform.
        renameChip: (page) => page.locator('.menu-kbd').first()
          .evaluate((el) => (el.shadowRoot?.textContent ?? '').includes('F2')).catch(() => false),
        // AND ALL THREE CHIPS, against the keys the controller binds: F2, Mod+Shift+P,
        // Mod+Shift+A (state 9 presses two of them for real). The expectation is
        // DERIVED in the page rather than typed here, because the chip paints the
        // platform's own glyph set (\u2318 on a Mac, Ctrl elsewhere) and the handler
        // accepts either; the painted array comes back in a failure message so a
        // mismatch names what the reader actually sees.
        keyChips: (page) => page.locator('kai-conversation-item').first().locator('.menu-kbd')
          .evaluateAll((els) => {
            const nav = navigator;
            const mac = /mac/i.test(nav.userAgentData?.platform ?? nav.platform ?? '');
            const mod = mac ? '\u2318' : 'Ctrl';
            const want = ['F2', `${mod}\u21e7P`, `${mod}\u21e7A`];
            // The caps, not the host's textContent: the element injects its own
            // <style> into the shadow root, and that stylesheet's text would be
            // counted as keys by a plain textContent read.
            const got = els.map((el) => Array.from(el.shadowRoot?.querySelectorAll('[part="key"]') ?? [])
              .map((cap) => cap.textContent ?? '')
              .join(''));
            return JSON.stringify(got) === JSON.stringify(want) ? true : got;
          }),
        // The relative time is still on the row, in the same region as the
        // kebab: the item renders that region outside its activation surface,
        // so the time did not have to move to the title to make room.
        rowTime: (page) => page.locator('kai-conversations .row-time').first().isVisible().catch(() => false),
      },
      expect: { menuOpen: true, triggerHaspopup: 'menu', triggerExpanded: 'true', shareDisabled: true, actionsListed: true, renameChip: true, keyChips: true, rowTime: true },
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
  ],
};
