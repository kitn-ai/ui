# Handoff — the facts check, the five questions, and the sync chain that was run

**Written 2026-09-28, second session of the day**, after the owner cleared his session and
re-pasted the prompt from [`2026-09-28-block-tuning-and-open-questions.md`](2026-09-28-block-tuning-and-open-questions.md).

**Branch:** `feat/blocks-exemplar-and-wiring` · **Tip:** `04fc0841` · **Tree:** clean
**Session type:** verification only. **No code was changed. No commit was made.**

Read order for the next agent:

1. **this file** — the current state, the verified facts, the five questions;
2. [`2026-09-28-block-tuning-and-open-questions.md`](2026-09-28-block-tuning-and-open-questions.md) —
   the previous session's state and the questions as the owner first phrased them;
3. [`2026-09-27-composer-empty-state-and-rail.md`](2026-09-27-composer-empty-state-and-rail.md) —
   the long-form history: rulings, traps, the ladder;
4. `.superpowers/sdd/2026-09-27-sidebar-top-actions/progress.md` — **the active ledger.** The
   ledgers are the real state; the handoffs are summaries of it.

---

## 1. What this session actually did

**One thing: it checked the tree instead of trusting the handoff, and it corrected two claims
in it.** That was the instruction, and it turned out not to be a formality — the previous
handoff's cost estimate for question 2 is factually wrong, and question 2 is the only item that
touches content the owner reads.

Concretely:

1. Read the previous handoff and the long-form handoff.
2. Ran the tree check the owner asked for (`git status`, `git log`, `ps` for `async-cfg`).
3. Ran the **preview sync chain** and verified the *served* copy (not the source), because the
   rule is that a kit change is invisible until `nx build ui` runs and the owner's preview had
   been stale twice before for exactly this reason.
4. Verified **each of the five open questions against the file that decides it**, rather than
   restating the handoff's framing. Findings in §4, corrections in §5.
5. Recorded the four engineering follow-ups with their real file locations (§7).

**Nothing was dispatched, nothing was built, no gate was run.** What that means for trust is
spelled out in §6.

---

## 2. The tree check, verbatim

```bash
git status --porcelain          # empty — clean, before and after this session
git log --oneline -8
```

```
04fc0841 docs(handoff): the prompt to paste back after a cleared session
832917f9 chore(ui): regenerate the react wrappers after the kit tuning
51901cc2 docs(handoff): the block's five open questions, for a cleared session
72ddfca6 fix(assistant): give the composer region air above the suggestion row
9560311b docs(handoff): the preview sync rule, and that the lag was never a worktree
24a50aaf chore(ui): regenerate the derived artifacts after the kit tuning
9d6e1516 chore(blocks): re-record the assistant baseline and screenshots after the rail shade fix
99ef82fe fix(blocks): the rail's light shade keys off data-theme, not the theme attribute
```

```bash
ps -A -o command= | grep async-cfg    # no match — nothing of that name is running
```

**Live processes (all from the previous session, still up and healthy):**

| what | pid | port | notes |
|---|---|---|---|
| `astro dev` (the docs site) | 88246 | **4321** | serves `/blocks/`; the owner's preview |
| `scripts/dev-blocks.mjs` | 88074 | — | set `KAI_BLOCKS_KIT=local` when it started the server |
| `storybook dev -p 6006` | 33880 | 6006 | the kit's story surface — the owner verifies kit changes here |

(A second, older `storybook` process, pid 68231, is also alive. It is not the one on 6006.)

**`dist/` freshness — the thing that actually matters for the preview:**

| file | mtime |
|---|---|
| `packages/ui/dist/index.js` | Sep 28 **12:51:11** |
| `packages/ui/dist/kai.es.js` | Sep 28 **12:50:55** |

**No `.ts`/`.tsx` source commit landed after 12:51.** The only commit in that window, `24a50aaf`
(12:52), touched generated artifacts only — `docs/web-components.md`, `packages/ui/llms-full.txt`,
`src/web-components/web-component-meta.json`, `src/web-components/web-component-types.d.ts`.
So the built `dist/` does describe the current source, and the preview is not serving stale kit
code for that reason.

**`dist/` entry points are all present** — `index.js`, `state.js`, `wire.js`, `schemas.js`,
`stores.js`, `kai.es.js`. This is worth checking every session: an earlier round shipped an
incomplete `dist/` that left the block driver unable to boot for anyone, and the failure looks
like "the block is broken" rather than "the build is half-done".

---

## 3. The sync chain — run, and the served copy verified

**Why it was run before anything else:** the owner's standing rule, earned twice, is that
**a kit change is invisible until `nx build ui` runs**, and a block change needs the copies. A
round that was told not to build queues that step, and nobody comes back for it. This session's
job was to look, so the chain ran first.

**The commands, and what they printed:**

```bash
node packages/ui/scripts/gen-blocks.mjs
# -> "gen-blocks: 3 block(s), 64 file(s)."

node apps/docs/scripts/copy-kit-assets.mjs
# -> "[copy-kit-assets] copied 3 raw-served assets from @kitn.ai/ui"

KAI_BLOCKS_KIT=local node apps/docs/scripts/copy-blocks.mjs
# -> "[copy-blocks] local preview: previewing the local build of packages/ui/dist (3 local form(s) rewritten)"
```

**No `nx build ui` was run, and none was needed** — no source changed, and `dist/` already
describes the current source (see the mtimes above). No `dev:blocks` restart was needed either,
for the same reason; the rule reserves the restart for a kit change.

**Then the served copy was verified, not the source.** This is the half that keeps getting
skipped, so here is the evidence:

| check | result |
|---|---|
| `GET /blocks/local/assistant.html` | **200**, 163703 bytes, `Last-Modified` updated by the copy |
| kit imports in the served HTML | `/blocks/kit/web-components/autoloader.js`, `/blocks/kit/state.js`, `/blocks/kit/wire.js`, `/blocks/kit/schemas.js`, `/blocks/kit/stores.js` — **all 200** |
| CDN leak (`cdn.jsdelivr.net` occurrences in served HTML) | **0** — the page is genuinely in **local** mode |
| the newest block change present in the served file | yes — `calc(var(--kai-density, 0.25rem) * 4)` (1 match) and the `composerAir` probe name |

**What this rules out, specifically:** the trap that once served the owner the *published* kit
because `apps/docs`' `pretest`/`predev` flips the preview to CDN mode and the dev server was
never restarted. **The preview at `http://localhost:4321/blocks/` is in local mode right now.**
If a later round runs any `apps/docs` test, re-check this — `posttest` restores local, but only
if the test gets that far.

**`git status` is clean after the chain**: `packages/ui/dist/` is gitignored
(`.gitignore:2 dist/`) and `apps/docs/public/blocks/` is gitignored
(`apps/docs/.gitignore:14 public/blocks/`), so regenerating them cannot dirty the tree. The flip
side, which matters later: **a stale `dist/` is invisible to `git status`.**

---

## 4. The five questions — each verified against the file that decides it

Each entry: what the handoff claims, **what the tree says**, and the recommendation.

### 4.1 Should `kai-badge` grow an outlined variant? — VERIFIED, recommendation stands

**Tree:** `packages/ui/src/components/badge/badge.tsx` declares exactly three variants:

```
default:  'bg-muted text-muted-foreground px-2 py-0.5'
count:    'bg-muted text-muted-foreground h-5 px-1.5'
citation: 'bg-primary text-primary-foreground px-1.5 py-0.5 cursor-pointer'
```

`defaultVariants: { variant: 'default' }`. **No outlined or quiet member.** The component
directory holds `badge.tsx` and `badge.stories.tsx` only — there is no badge stylesheet.

**The workaround is real and is where the handoff says:** `packages/ui/src/stories/showcase/v0.stories.tsx`
lines 443–449 — a comment stating that the variant list has no outlined member, then a local
`<style>` block:

```css
.chip-earlier::part(badge){ background:transparent; color:var(--color-muted-foreground); box-shadow:inset 0 0 0 1px var(--color-border); }
```

A second occurrence is in the same story's pasted HTML form (around line 608–611), with the same
explanation. So the workaround is used on **two** delivery forms of one story, through the
**documented** `::part(badge)` hook — not a shadow pierce.

**Recommendation: add the variant.** The owner's own reference screenshots use outlined chips;
this is a treatment the kit lacks, not one story wanting something exotic.

**Honest cost:** the variant in `badge.tsx`, a story for it, then a full `nx build ui` →
`build:api` → **commit the regenerated artifacts in the same breath** (the React wrapper, the
meta entry, `web-component-types.d.ts`, `llms-full.txt`, `docs/web-components.md` all inline the
variant list). The owner verifies kit changes at `localhost:6006`, so the story is not optional.

### 4.2 The task-list arc renders a second card instead of a revision — VERIFIED, **and the handoff's cost is wrong**

**The handoff says:** "Cost: small — the mock script reuses the card's id."

**The tree says the id is already reused.** `packages/blocks/blocks/assistant/assistant.transport.mock.ts`
line 229:

```ts
/** The task list's call id, spelled once because two turns name it: the second
 *  turn REVISES the first turn's call rather than announcing a new one, which is
 *  what makes a card that writes back to its own tool call (see the turn below). */
const TASKS_CALL_ID = 'call_kai-mock-tasklist';
```

Used at **line 281** (turn 1, four tasks, first row "In progress") and **line 303** (turn 2, the
same list with the first row `checked: true`). Both turns emit `kai_tasks` under `TASKS_CALL_ID`.
Landed in `332f9f75` (2026-09-27 09:33), whose message already advertises "a four-row `kai_tasks`
card the second turn revises in place".

**So why does it still read as two cards?** Because the two turns are **two messages**, and
`upsertCardPart` scans **one** `parts` array — one message's parts:

```ts
// packages/ui/src/state/parts.ts:152
export function upsertCardPart(parts: MessagePart[], envelope: CardEnvelope): MessagePart[] {
  const i = parts.findIndex((p) => p.type === 'card' && p.envelope.id === envelope.id);
```

The in-file comment on turn 2 admits the boundary itself: the shared id makes this *the same
card* "**to anything that keeps cards by id**" — the block's thread does not; it renders each
message's own parts. **The second card is a cross-message rendering fact, not a script fact.**

**And the owner has already ruled on it.** `.superpowers/sdd/2026-09-27-sidebar-top-actions/progress.md`
line 126, recording his review of the 17-item list:

> the task-list arc's second card **accepted** (#9)

**So this is a settled item, re-asked.** Two genuine options, neither of which is "make the mock
reuse the id":

1. **Stand by ruling #9.** Then the work is the *other* half: the approved storyboard sentence
   that promises a revision should change to match what the demo does, because the demo is
   accepted. This is a copy edit in the storyboard, not code.
2. **Re-open it and do it properly.** A real revision means a cross-message update path — the
   second turn patching the **first** message's card part (a controller/block-level change), or
   the thread reconciling cards by envelope id across messages. The second is riskier: deduping
   by id at the renderer would also collapse *legitimate* repeated cards (the same card type
   twice in a thread). Either way it is a feature with a real cost, and it wants a failing-first
   driver state before it wants code.

**Recommendation: ask, do not dispatch.** The previous handoff's recommendation ("make it a
revision, small cost") is not actionable as written, and it contradicts a ruling the owner
already made. Put the two options to him.

### 4.3 Should the 240px menu floor yield to a narrower clipping container? — VERIFIED, recommendation stands, cost shape corrected

**Tree:** `packages/ui/src/components/dropdown/dropdown.tsx` line 482 (the menu surface):

```
'z-50 max-w-[var(--kai-dropdown-max-width,24rem)] min-w-[15rem] overflow-y-auto rounded-lg bg-card p-1 kai-elevation',
```

`min-w-[15rem]` is **240px** — the floor the handoff names. Line 907 is a **different surface**
(a second dropdown variant) with its own `min-w-[8rem]`, so a fix must say which one it means.

The surrounding comments are unusually explicit and worth reading before touching it:

- **the floor** (≈409–427): a usable floor belongs on the surface, not at each call site, because
  a consumer rendering `<DropdownContent>` directly gets rows with no slack and the trailing
  check collapses onto its label; **"a caller can still OVERRIDE it with its own `min-w-*` class;
  `cn` resolves the conflict last-wins, so exactly one floor survives on any surface."**
- **the ceiling** (≈440–470): the panel is a shrink-to-fit, `position: fixed` box portaled **into
  the element's shadow root**, so a consumer stylesheet cannot reach it at all — which is why
  `--kai-dropdown-max-width` (and `--kai-dropdown-max-height`, driven by `MENU_MAX_HEIGHT` and
  `viewportRoom`) are the seams rather than classes. The measured case behind the ceiling is the
  rail's own section-label menu: a note row hit **1208.9px** of max-content inside a **280px**
  rail.

**Recommendation: yes, the floor should yield.** A clipped row is worse than a narrow one, and
the references put a ~240px menu in a ~280px rail, so the floor is right for the common case and
only needs to give way in the edge.

**Cost shape, corrected:** the handoff says "one `min()` in the existing cap". **The floor is a
Tailwind class on the surface, not the inline cap** — the inline style in that region holds
`max-height` (see the comment "the ceiling itself is the inline `max-height` … not a class"). So
the change lands on the **min-width** side, e.g. `min-w-[min(15rem,var(--…))]` or a moved inline
style, and it must keep the last-wins override story above true. Small, but not the stated shape,
and it is a **kit** change: it needs `nx build ui` plus the block chain before the owner can see
it.

### 4.4 Should the four action rows be shorter than 32px? — VERIFIED, recommendation stands

**Tree:** `packages/blocks/blocks/assistant/assistant.css` line 159:

```css
.menu-row, .rail-action {
  display: flex; align-items: center; gap: 0.5rem;
  box-sizing: border-box; height: 2rem;
  border-radius: 6px;
}
```

2rem = 32px, and the live row's box is the kit's own through the documented part —
`#rail-new-chat::part(button)` (≈line 213) keeps the kit's `h-8` and only takes the rail's inline
padding.

**The "they match exactly" premise holds on measurement, in the recorded baseline, in both
schemes** (`packages/ui/scripts/block-driver/baselines/assistant.json`, `runs[0]` and `runs[1]`):

| probe | value |
|---|---|
| `states[42].styles.railActionInertRow.height` | `32px` |
| `states[42].styles.railActionLiveRow.height` | `32px` |
| `states[42].styles.railActionLiveRowPart.height` | `32px` |
| `states[44].styles.railConversationRow.height` | `32px` |
| `states[44].styles.railFolderHeadingRow.height` | `32px` |
| `states[45].styles.railTrioControl.height` | `24px` (the trio, already shrunk per ruling #6) |
| `states[42].probes.theActionRowsCarryTheRailRowBox` | `true` |

Note the kit's own `compact` row box is **padding**, not a height —
`DENSITY_ROW_BOX.compact = 'px-2 py-0.5'` in
`packages/ui/src/components/conversation/conversation-item.tsx:40` — so the block's CSS comment
calling its rule "a deliberate COPY" of that pair is about **the padding pair**, and the 32px
height is the measured outcome on both sides. That distinction is the kind that gets misquoted;
the probe is the authority.

**Recommendation: leave them.** They match the conversation rows, which is the consistency the
owner asked for; shrinking them breaks the match again. If they read heavy, it is weight or
colour rather than height.

### 4.5 The markup size ceiling has been passed — VERIFIED, recommendation stands

**Tree:** `packages/ui/scripts/lint-block-file-size.mjs` line 88:

```js
/** Ceiling for MARKUP/STYLE, in lines. 893 = the largest file of the kind that
 *  exists. */
export const MARKUP_MAX_LINES = Number(argOf('--markup-max') ?? 893);
```

with `MODULE_MAX_LINES = 557` (line 85), and `DRIVER_STATES` deliberately unbudgeted
(line 99). The design note at the top of the file (line ~24–33) states the rule plainly: **the
ceiling is the largest file of the kind that exists**, so it has zero headroom by construction and
is meant to fire on exactly this.

**`packages/blocks/blocks/assistant/assistant.html` = 907 lines against the 893 ceiling.** For
scale, the other two blocks' markup is 125 and 142 lines — this is a 6× outlier, not a cluster
that drifted.

CI runs it: `.github/workflows/test.yml:361`.

**Recommendation: raise it once, with the reason in the commit** — the growth is features (the
palette, the chrome, the theme binding), not creep, and that distinction is what a ratchet exists
to make. **Then treat the next growth as the signal to split the page**, the way splitting the
controller was deliberately stopped. Cost: one line in the lint, plus its self-test.

---

## 5. Corrections to the previous handoff (the durable value of this session)

Both are recorded because this branch has a documented pattern — "a claim in a report is not a
fact until the file is read" — and because a wrong cost estimate is what causes a round to be
dispatched at the wrong size.

1. **Question 2's cost is false.** "Small — the mock script reuses the card's id" describes work
   that landed on 2026-09-27 (`332f9f75`). The id is already shared; the second card is a
   cross-message rendering fact (`upsertCardPart` is per-message). And **the owner already
   accepted the second card as ruling #9**. See §4.2.
2. **Question 3's cost shape is loose.** The 15rem floor is a **Tailwind class on the surface**,
   not the inline cap; the inline style in that region carries `max-height`. The fix lands on the
   min-width side, and it is a kit change needing a build. See §4.3.
3. **Question 2 is also a re-ask of a settled ruling.** That is not necessarily wrong — the owner
   may want to revisit — but the question as written presents it as open, and the previous
   handoff's recommendation contradicts `progress.md:126`. Flag it rather than act on it.

Everything else in the previous handoff checked out against the tree: the badge variants, the
workaround's location and its use of the documented part hook, the `h-8` rows and their match
with conversation rows, the 907/893 size overrun, and the four engineering follow-ups (§7).

---

## 6. What is NOT verified — read this before claiming anything is green

**No gate was run this session.** The previous session's ladder was green at tip, and
`verify:blocks` was re-recorded at 13:07 (`72ddfca6`) **after** the 12:50 rebuild, so the baseline
and the served pages are consistent as of that commit. But that is the previous session's
evidence, not this one's.

Un-run this session, and therefore unproven on this tree by this session:

- `vitest --project=unit` · `vitest --project=emitted`
- `verify:blocks` (html + react legs) · `verify:generated` · `verify:guide-fences`
- `verify:consumer` · `verify:scaffold` · `verify:preview`
- `npm run typecheck` (the seven tsc passes) · `lint:silent-drops` · `lint:cdn-pins` ·
  `lint:comment-references` · `lint:prop-docs` · `lint:block-file-size`
- the storybook browser project (**known-flaky, not the merge gate**, skipped on purpose)

**What the committed baseline itself asserts** (read, not assumed —
`packages/ui/scripts/block-driver/baselines/assistant.json`): top-level keys are `scenario`,
`base`, `runs`, `failures`, `pass`; **`pass: true`, `failures: []`**; **two runs** —
`colorScheme: light` and `colorScheme: dark` — each with **58 states, 0 failures, 0 skipped
probes**; `base: "http://localhost:8952"` (§7.2). So the recording at `72ddfca6` (13:07) is a
clean pass in both schemes, on 58 states, **after** the 12:50 rebuild.

**Two specific hazards for whoever runs them:**

- **`verify:blocks` compares against a recorded baseline, and a kit build invalidates it.** The
  rule is written at `packages/blocks/README.md:100–116` ("A recorded baseline is only as fresh as
  its last recording"). After any `nx build ui`, **re-record before trusting the check**, or the
  gate will be red on values nobody's change explains — which is exactly what happened at 12:50
  (four values: the pill box 40/24 → 32/12 and three dark muted colours, all from `d221dd6a`,
  caught only because a round noticed unexplained values in its own diff).
- **`lint:block-file-size` is red by design right now** — 907 > 893. That one is question 4.5, not
  a regression.

---

## 7. Engineering follow-ups — no decision needed, they belong to the orchestrator

Each was verified to its real location this session, so the next agent does not have to re-find it.

1. **A kit build invalidates the recorded baseline, and nothing enforces the re-record.**
   The rule is documented at `packages/blocks/README.md:100–116`; the guard wants to live where
   the build runs, so a rebuild cannot leave a stale expectation behind. Evidence of the class:
   the 12:50 rebuild made `verify:blocks` red on four values no block change explained.
2. **The baseline records a machine-specific port.** `baselines/assistant.json:3` —
   `"base": "http://localhost:8952"`. Harmless here, but it makes the baseline machine-dependent,
   and on another machine a port mismatch would read as a regression. Derive it or exclude it.
3. **The screenshot tolerance was derived from one source and applied to another.**
   `packages/ui/tests/e2e/screenshot-baselines.ts:117–120` — `NOISE_CHANNEL_DELTA = 5`, and its
   docblock (≈42–52) states it is the worst per-channel delta measured between two renders of
   identical code **in the block driver's recorded re-records**, applied by analogy to the e2e
   shot captures. Worth re-measuring per source rather than inheriting. (It behaved well on its
   first real use: 43 re-encoded images, all 0–1 px past delta 5.)
4. **The lint step is hand-typed in CI while the browser leg beside it is derived.**
   `.github/workflows/test.yml:361` (`lint:block-file-size`) and `:431`
   (`lint:comment-references`) are typed by hand; the browser leg at `:1610–1611` runs
   `test:browser-suites`, whose comment at `:1562` says explicitly that it is **derived from the
   `scripts` block, not typed**. Same improvement, one line.

---

## 8. Rules that must survive the handoff

These were each paid for on this branch. They are not style preferences.

**The preview sync rule** (the owner has been burned twice):

- **Block change** → `gen-blocks` → `copy-blocks` (local) → `copy-kit-assets`.
- **Kit change** → `nx build ui --skip-nx-cache` **first**, then `build:api` if derived artifacts
  move, then the block chain, **then restart `dev:blocks`**.
- **Then verify the served copy**, not the source: a 200 on `/blocks/local/<id>.html` **and** a
  grep for the thing that changed.
- **Commit regenerated artifacts in the same breath** — they derive from `dist/` and will
  otherwise describe the previous values.
- `copy-kit-assets` copies **three raw assets and no kit chunks**: a kit change alone leaves the
  page on the old bundle.

**Dispatching and editing:**

- **One writer per file.** Two writers on `assistant.html` once produced two sparkle icons in one
  slot, invisible to every gate. A timeout verdict is a symptom, not a death — **check the tree
  before re-dispatching.**
- **Every implementing brief names `lint:comment-references` and `lint:prop-docs` alongside
  typecheck.** The comment cap is 20 lines; three times "pre-existing" has meant "before my round"
  when the file had been edited an hour earlier. **51 blocks now sit at exactly 20 lines, one edit
  from red.**
- **Commit with explicit paths** (`git commit -m … -- <paths>`). Every round shares one git index,
  so a plain `git commit` sweeps in whatever a peer staged between a check and the commit.
- **Never a commit message from a shared scratch path** (`/tmp/commit-msg.txt` once landed a
  commit under another round's message).
- **Search with a path** (`grep -rn pat packages apps`), never from the repo root.
- **The heredoc rule is about duration, not syntax:** the hazard is a heredoc around a
  **long-running** command, or a long-running command piped into `tail` — that hid a stuck process
  for thirty minutes. Short stdin for a fast command is fine.
- **Keep several disjoint rounds in flight; dispatch the successor in the same turn a round
  lands.** A serial pipeline reads as a full queue in a report and is an idle machine in practice.
- **A comment that names a kai element in angle brackets trips the react-tree check.** Describe
  the element in words.
- **Scratch files in `packages/ui/tmp/` trip `lint:cdn-pins`** — that guard reads the filesystem,
  not git.

**Kit rules that bear on questions 1 and 3:**

- Behaviours are **prop/JSON-driven**, never CSS-manipulated or shadow-pierced. `::part(...)` is
  the documented reach and is what the badge workaround uses correctly.
- **The kit decides HOW; the app decides WHETHER.** A limit, a count or a quota is the
  application's call. Questions 1 and 3 are HOW questions and belong in the kit; question 4.5 is
  the block's own budget.
- **Decide loudly.** No silent drop, truncation, fallback, or swallowed error.
- The `kai-` prefix is the contract. Never `kitn-`. Array/object props are **JS properties**;
  events are **non-bubbling `kai-*`** CustomEvents read through `event.detail`.

---

## 9. Where the state actually lives

| artefact | what it holds |
|---|---|
| `.superpowers/sdd/2026-09-27-sidebar-top-actions/progress.md` | **the active ledger** — every round, ruling, deferred item. Its tail is the freshest account of the rail/composer work. |
| `.superpowers/sdd/2026-09-26-empty-state-and-guides/progress.md` | the guides plan, complete |
| `.superpowers/sdd/2026-09-26-composer-states-and-tools-menu/progress.md` | the composer plan, complete, with deferred minors |
| `docs/superpowers/specs/2026-09-26-*` | the approved specs and the guide storyboard (the copy question 4.2 turns on) |
| `docs/superpowers/specs/2026-09-27-rail-tree-design.md` | corrections 1–3 at the end **supersede** the earlier sections |
| `docs/superpowers/specs/2026-09-27-rail-primitive-design.md` | approved, queued after the palette |
| `packages/blocks/README.md` | the baseline-freshness rule (§7.1) |
| `docs/coupling-map.md` | every pair that depends on the other, and which guard catches it (or `NOTHING`) |

**Do not trust a spec's status line in this repo.** Two were stale, both in the direction that
matters, and that is adopted as a rule.

---

## 10. Next actions, in order

1. **The owner answers the five questions.** Only 4.2 genuinely blocks: 4.1, 4.3, 4.4 and 4.5 all
   have a recommendation the owner can accept as-is, and 4.4's recommendation is "do nothing".
2. **On 4.2, put the two options to him explicitly** — stand by ruling #9 and fix the storyboard
   sentence, or re-open and build a real cross-message revision. Do not dispatch "make the mock
   reuse the id"; that is already done.
3. **Then, for whichever of 4.1/4.3 lands:** it is a **kit** change → `nx build ui --skip-nx-cache`
   → `build:api` → commit the regenerated artifacts → block chain → restart `dev:blocks` →
   verify the served copy. 4.5 is a **lint** change plus its self-test. Story first for the kit
   items, because that is where the owner verifies them.
4. **After any `nx build ui`: re-record the block baseline before trusting `verify:blocks`.**
5. **Then the ladder**, with nothing else live: unit · emitted · blocks (both legs) ·
   `verify:generated` · guide fences · typechecks · the lints · consumer · scaffold.
6. **Queued behind that, unchanged from the previous handoff:** the block source split (the
   controller is very large) before the palette; the react-layout gap (flip `skipLayout` off and
   re-record); the stale `promptinput` baselines; the README note that a stale recorded baseline
   is indistinguishable from a fresh one without a regeneration diff (partly landed —
   `packages/blocks/README.md:100`).

---

## 11. The prompt for the next agent

```
Repo /Users/home/Projects/kitn-ai/kitn-chat, branch feat/blocks-exemplar-and-wiring.
Tip was 04fc0841 when this handoff was written; run `git log --oneline -3` and confirm before
trusting the rest of this prompt.

Read first, in this order:
1. docs/handoff/2026-09-28-truth-check-five-questions-and-sync-chain.md  <- THE CURRENT HANDOFF.
   It is the shortest path to the state: what the last session verified, the five open
   questions with the file that decides each one, the two corrections to the previous
   handoff, what is NOT verified, and the rules that must survive.
2. docs/handoff/2026-09-28-block-tuning-and-open-questions.md  <- the questions as the owner
   first phrased them. NOTE: its cost estimate for question 2 is WRONG (the mock already
   reuses the card id; the second card is a cross-message rendering fact) and its cost shape
   for question 3 is loose (the 15rem floor is a Tailwind class, not the inline cap).
3. Only if you need the history: docs/handoff/2026-09-27-composer-empty-state-and-rail.md
   and the ledgers under .superpowers/sdd/ (the active one is
   2026-09-27-sidebar-top-actions/progress.md).

Then check the tree before trusting anything written down:
  git status --porcelain
  git log --oneline -8
  ps -A -o command= | grep async-cfg
  ls -la packages/ui/dist/index.js   # and confirm state/wire/schemas/stores/kai.es.js exist

The preview is http://localhost:4321/blocks/ in local mode. RUN THE SYNC CHAIN BEFORE TELLING
THE OWNER TO LOOK — a kit change is invisible until `nx build ui` runs, and a block change
needs the copies. Then verify the SERVED copy, not the source: a 200 on
/blocks/local/assistant.html AND a grep for the thing that changed.

Two things to know before you touch anything:
- lint:block-file-size is RED BY DESIGN right now — assistant.html is 907 lines against an
  893 ceiling. That is open question 4.5, not a regression.
- No gate was run by the last session. Its ladder was green at tip, and verify:blocks was
  re-recorded after the 12:50 rebuild, but that is the previous session's evidence.

The owner's five questions, with the last session's recommendation on each:
1. Add an outlined kai-badge variant?            -> yes (kit + story + regenerated artifacts)
2. Task-list arc's second card: revision?        -> ASK. Already ruled #9 (accepted), and the
                                                    mock ALREADY shares the id. Two real options:
                                                    stand by #9 and fix the storyboard sentence,
                                                    or build a cross-message revision path.
3. Does the 240px menu floor yield to a 200px clip? -> yes (min-width side, not the inline cap)
4. Shrink the four action rows below 32px?        -> no (they measure 32px, same as the rows)
5. Raise the 893-line markup ceiling?             -> once, reason in the commit; next growth = split

Do not start work until the owner answers. If he accepts the recommendations, start with the
kit items (1 and/or 3): nx build ui --skip-nx-cache -> build:api -> commit the regenerated
artifacts -> gen-blocks -> copy-blocks local -> copy-kit-assets -> restart dev:blocks ->
verify the served copy. Re-record the block baseline after any build. Keep several disjoint
rounds in flight rather than dispatching one at a time.
```
