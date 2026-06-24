# HANDOFF — Composition initiative + composer-showcase hardening

**Date:** 2026-06-24 · **Branch:** `spike/kai-chat-seams` (worktree `…/kitn-chat-spike-kai-chat-seams`) · **Tip:** `593389a` (24 commits over base `2b2592d`) · **Tree:** clean · **Status:** PROTOTYPE/spike, NOT merged, NOT pushed.

> Read this top-to-bottom before doing anything. We are mid-stream on a visual-design + API-philosophy pass and there is ONE explicit unstarted task (the slot rename) plus open design decisions. The full machine-tracked history is in `.superpowers/sdd/progress.md` (gitignored, in the worktree).

---

## 0. TL;DR — what to do next
1. **Do the slot rename** (the user's last explicit directive, NOT yet started): `notice`→`before`, `toolbar-start`→`start`, `trailing`→`end`. Vocabulary is **decided: `start`/`end` (inline) + `before`/`after` (block)** — CSS-logical. See §6.1 for the exact files.
2. Then resolve the open `submit` decision (§6.2) and continue hardening / the broader rename sweep.
3. **Behavioral musts (the user was burned by these — see §7):** SHOW screenshots vs. the reference and let them judge; never declare "done/polished" without looking; drive visual work DIRECTLY in a tight edit→screenshot→look loop, not via subagents.

---

## 1. The big picture
This is the **composition-over-configuration** initiative for `@kitn.ai/ui` (Shadow-DOM web components authored in SolidJS, consumed from any framework; elements prefixed `kai-`). It started as a design conversation (the user, Rob, owns the product) and became a real feature branch.

Core thesis (Rob's): **configuration forces US to author the Cartesian product of layouts×use-cases — unbounded and not ours to know.** So we expose **slots (positions) + primitives + tokens/`::part`**, and the consumer composes. Our job shrinks to "render parts well + add parts as new AI-UX patterns emerge."

The recent reference target is **Claude's composer** (a dark composer card: a "model unavailable" notice, input "How can I help you today?", a `+` cascading menu on the left, model (Opus 4.8) + effort (High) + mic + voice on the right, suggestion chips below). The user supplied screenshots of it as the quality bar.

---

## 2. What's DONE and committed (the W1–W5 arc + components)
All built subagent-driven, each per-workstream reviewed, plus a cumulative opus whole-branch review (no Critical/Important). Key commits:
- **W1** `<kai-chat>` slotted shell + typed slot registry `src/elements/slots.ts` (`CHAT_SLOTS`/`readSlots`/`SlotDef`), `loading` host-attr reflection, drop-in regression. (Originally "seams"; **renamed seam→slot** at `d98ae02` — public API always used native `<slot>`.)
- **W2** `<kai-prompt-input>` `notice` + `toolbar-start` slots (`b0c7976`) + `PROMPT_INPUT_SLOTS`.
- **W3** cascading-menu primitives in `src/ui/dropdown.tsx` (submenu/separator/checkbox/label, `0624570`/`937f443`) + **`kai-menu`** element (`src/elements/menu.tsx`, items-tree + `kai-select`, `bbc33bb`).
- **W4** `CommandList` primitive (`src/ui/command.tsx`) + **`kai-command`** element (grouped filterable palette, `1e6be2c`; lazy-memo bug fixed `dafb82f`).
- **W5** audit (`docs/superpowers/specs/2026-06-23-composition-seams-audit.md`): **47 elements**, P1 = `kai-workspace`/`kai-conversations`/`kai-message`, P2 = 8, rest P3 (leave alone). **First production target = `kai-conversations`** — this is where the REAL graduation work starts once the prototypes are settled.
- Shared `src/ui/icon.tsx` `renderIcon` (URL→img, else lucide name via `action-icons`, else text). **No emoji anywhere** (kit convention — Rob enforced this).
- Diagram story `Spikes/How Composition Works` (`src/elements/composition.stories.tsx`, inline SVG).
- Design spec: `docs/superpowers/specs/2026-06-23-kai-chat-composition-seams-design.md`. Plan: `…/plans/2026-06-23-w1-kai-chat-seams-formalize.md`.

**Unblocks issue #106** (state-helpers Phase 2 "element methods, blocked on composition").

IVP suites (real-browser Playwright, since jsdom can't do shadow DOM): `npm run test:slots-ivp` (7/7), `test:menu-ivp` (7/7), `test:command-ivp` (7/7), plus `playwright.promptinput.config.ts` (18/18) and the composer IVP. tsc clean (4 passes).

---

## 3. The CURRENT focus: composer-showcase hardening
After W1–W5, Rob pushed to **harden the two new components + build a production composer showcase** matching the Claude reference, and (crucially) to get the **API/naming/theming philosophy** right. This is where we are.

**`src/elements/composer-showcase.stories.tsx`** = the production composer (story `Spikes/Composer (production)` → `Composer`). It assembles a real composer from `<kai-prompt-input>` slots: a `notice` banner, a `kai-menu` in `toolbar-start` (the `+`), `kai-model-switcher` + an effort `kai-menu` + mic + voice in `trailing`, and suggestion chips below. It is **theme-driven** (defaults dark to match the reference, toggleable to light) and **fully theme-aware** (kit `var(--color-*)` tokens, ZERO hardcoded colors).

### Component-level changes already committed (these are GOOD, keep them):
- **`default-input.tsx`** (`src/elements/`): toolbar right-aligned (clustered `trailing` + send into a right group so `justify-between` pins them right — fixed a real "controls float center" bug, `5c4bd77`); added **`submit?: 'always'|'auto'|'never'`** (gates the send button; `auto` = show only with content; `::part(send)` to restyle) and **`attach?: boolean`** (hide the built-in paperclip when a `+` menu covers it). `notice` slot renders `display:contents` (no imposed spacing).
- **`prompt-input.tsx`** facade: wires `submit` + `attach` through.

### State of the showcase visual (verified in BOTH light + dark this session):
- Banner sits **BEHIND** the card (absolute, `z-index:0`; card `z-index:1` + `margin-top:30px`), peeking out underneath — Rob's explicit ask ("banner should show up underneath the prompt input"). Theme-aware (`var(--color-muted)` etc.).
- Toolbar controls right-aligned; send hidden on empty (`submit="auto"`); chips theme-aware.
- The earlier washed-out problem was **me fighting the theming** (I'd hardcoded `theme="dark"` which `preview.ts`'s MutationObserver reset to the toggle's default light, then masked it with a forced `--kai-color-*` palette). `593389a` removed all that — the kit's real theming is crisp; let the toggle drive it.

---

## 4. KEY DESIGN DECISIONS / PHILOSOPHY (the heart of the recent discussion — DO NOT LOSE)
These are the rules Rob and I converged on. They govern everything going forward.

1. **Slots are named by POSITION, never by presumed content.** `notice` was wrong (it presumes a notice — that's configuration thinking). A slot is a *place* the dev fills with anything. → rename to position names.
2. **Vocabulary (DECIDED): `start`/`end` for the inline axis (CSS-logical; Rob explicitly likes this), `before`/`after` for the block axis.** So `notice`→`before`, `toolbar-start`→`start`, `trailing`→`end`.
3. **NO gap/layout knobs. NO layout components. NO helper classes.** Spacing is the dev's CSS + the element they place in the slot. A `gap` prop is over-involvement that fights their margins; layout primitives/utilities duplicate what every dev has AND can't cross the shadow boundary to reach slotted light-DOM anyway. We provide the *hole*; they decide spacing (flush by default — `display:contents` — they add margin for a gap, negative margin for overlap/underlay).
4. **THE RULE:** `slot = position` · `::part`/token = styling · **a prop ONLY for behavior CSS can't express** (e.g. `submit="auto"` needs to *know there's content*; "hide the button" is just `::part(send){display:none}`). This says **trim, not add.**
5. **Theming: rely on the kit's light/dark + the Storybook toggle.** No dark-specific stories, no forced palettes, no hardcoded colors — everything uses `var(--color-*)` so it follows the theme. (`preview.ts` syncs the toggle → `theme` attr on every `kai-*` element → the element's `.dark` shadow CSS.)
6. **Head-start = templates, not primitives.** The showcase IS the template (a dev copies + owns it). The shadcn move, at the *template* layer (future `add` CLI) — distinct from runtime layout components.
7. **These are PROTOTYPES.** Rob's framing: proven, not production-polished. Production graduation (audit P1, starting `kai-conversations`) is a later, separate effort.

---

## 5. The reference (Claude composer) the showcase targets
Dark rounded composer. Top: a notice ("Claude Fable 5 is currently unavailable." + "Learn more" + ✕). Input: "How can I help you today?". Bottom toolbar: `+` hard-left; **Opus 4.8 ⌄ · High ⌄ · mic · voice** hard-right (no send button when empty). Below the card (outside): suggestion chips (Write/Learn/Code/Life stuff/Claude's choice) each with a small icon. Rob chose the notice as a **banner above/behind** the card (NOT the reference's inside-strip) — settled via an AskUserQuestion. Rob does NOT care about 4 vs 5 chips; he DOES care about **design parity + how a dev achieves/controls it**.

---

## 6. PENDING work (NOT done)
### 6.1 SLOT RENAME — the explicit next task (vocabulary decided: see §4.2)
Rename across the board (mirror the earlier `d98ae02` seam→slot rename method — `git mv` where useful, then content, then IVPs):
- **`src/elements/slots.ts`**: `PROMPT_INPUT_SLOTS` entries `notice`→`before`, `toolbar-start`→`start`, `trailing`→`end` (+ their `doc` strings). `leading` → reconsider (`input-start`? or leave). The slot ATTRIBUTE values are what change.
- **`src/elements/default-input.tsx`**: the `<slot name="notice">`→`<slot name="before">`, `<slot name="toolbar-start">`→`<slot name="start">`, `<slot name="trailing">`→`<slot name="end">`. Update comments.
- **`src/elements/composer-showcase.stories.tsx`**: `slot="toolbar-start"`→`slot="start"`, the `trailing` wrapper `slot="trailing"`→`slot="end"`, and the notice is in the `before` region (it's currently NOT slotted — it's rendered as the consumer's own markup above; confirm whether it should project via `slot="before"` or stay as the demo's own element. NOTE: in the showcase the notice is just a `<div>` the "dev" positions; the actual `notice`/`before` SLOT lives in `default-input.tsx`).
- **`src/elements/prompt-input-slots.stories.tsx`** + **`tests/e2e/promptinput-slots-ivp.spec.ts`**: the `slot="…"` projections + the `STORY('spikes-prompt-input-slots--…')` ids if story export names change (the slots IVP asserts projection by slot name). Re-run `npm run test:slots-ivp` (must stay green).
- **BROADER SWEEP (also on the table, lower priority):** `kai-chat`'s `composer-actions` → a position name; `empty` is a STATE slot (shown when no messages) → keep state-y name; structural `header`/`sidebar`/`footer`/`composer` are defensible *regions* but Rob put them on the table.

### 6.2 Open decision — `submit` prop
Under §4.4 (props only for behavior CSS can't express), reconsider: keep `submit="always|auto|never"`, OR **trim to `auto` (default) + `::part(send){display:none}` for the hide case** (since "hide" is pure CSS, only `auto` needs JS). I recommended trimming; **Rob has NOT decided.** Ask.

### 6.3 Bigger picture (after the rename + decisions)
- Finish hardening kai-menu/kai-command if anything's still off (they looked good in dark + light this session).
- The audit-driven production rollout (P1 `kai-conversations` first) — the real graduation; not started.
- Deferred minors (tracked in `.superpowers/sdd/progress.md`): W4b composer→CommandList DRY migration; `gen-element-api.mjs` slot-table emission; misc a11y/cosmetic.

---

## 7. LESSONS / how to work (Rob got frustrated — heed these)
- **Do NOT overclaim "done/polished."** At one point Rob rated the work "zero/ten" because I kept showing washed-out composers and declaring them finished. **SHOW screenshots against the reference; let Rob judge.** Only say it's good when it visibly is.
- **Drive visual work DIRECTLY** in a tight edit→screenshot→look loop (this is what finally worked), not by delegating to subagents that produce washed-out attempts you can't see.
- **No emoji, ever** (kit convention). Use lucide icons / `renderIcon`.
- Be self-critical and honest about gaps. When you fix something, verify it in BOTH light and dark before claiming.

---

## 8. Environment / how to continue
- **Worktree:** `/Users/home/Projects/kitn-ai/kitn-chat-spike-kai-chat-seams`, branch `spike/kai-chat-seams`. (It's a sibling worktree off the main repo; `node_modules` is symlinked.)
- **Storybook:** start with `npm run storybook` (port 6006). It may already be running from a prior session.
- **The screenshot loop (how to verify visuals):** create `_shot.mjs` in the worktree root (it's untracked; I removed it before committing). Contents:
  ```js
  import { chromium } from 'playwright';
  const [url, out, mode] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 920, height: 700 }, deviceScaleFactor: 2 });
  await p.goto(url, { waitUntil: 'networkidle' }).catch(() => {});
  await p.waitForSelector('kai-prompt-input', { timeout: 25000 }).catch(() => {});
  if (mode !== 'light') await p.evaluate(() => document.documentElement.classList.add('dark'));
  await p.waitForTimeout(2000);
  await p.screenshot({ path: out });
  await b.close();
  ```
  Run from the worktree: `node _shot.mjs "http://localhost:6006/iframe.html?id=spikes-composer-production--composer&viewMode=story" spike-screens/x.png dark` (or `light`), then **Read** the PNG. `spike-screens/` is gitignored. Adding `.dark` to `<html>` simulates the dark toggle (preview.ts then syncs `theme="dark"` onto the elements). `waitForSelector('kai-prompt-input')` matters — the playwright CLI screenshots before the shadow render, so use this script, not the raw CLI.
- **Story id changed:** the showcase export is now `Composer` → id `spikes-composer-production--composer` (was `…--dark`).
- **Ledger:** `.superpowers/sdd/progress.md` (gitignored, in the worktree) — full blow-by-blow of W1–W5 + hardening, the cumulative review, the deferred-minors list.
- **Tests before any commit:** `npx tsc --noEmit`, the relevant `npm run test:*-ivp`. Don't commit the promptinput `__screenshots__` baselines if a test run dirties them (non-deterministic write-churn — `git checkout -- tests/e2e/__screenshots__/promptinput/`).
- **Review-before-commit / merge:** Rob reviews before commits/merges; this branch is NOT to be merged/pushed without his say-so.

---

## 9. Open questions to put to Rob (next session)
1. Slot rename: proceeding with `before`/`start`/`end` (start/end he confirmed; before/after is my pick for block) — OK? And how far to sweep (just prompt-input, or also `composer-actions` etc. on `kai-chat`)?
2. `submit`: keep `always|auto|never`, or trim to `auto` + `::part(send)` CSS-hide?
3. Once the prototypes settle: start the production rollout at `kai-conversations` (audit P1)?
