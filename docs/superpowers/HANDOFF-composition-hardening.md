# HANDOFF — Composition initiative (composer showcase + new composition primitives)

**Date:** 2026-06-25 · **Branch:** `spike/kai-chat-seams` (worktree `…/kitn-chat-spike-kai-chat-seams`) · **Tip:** `9670eef` · **Tree:** clean (only `_shot.mjs` untracked, intentional) · **Status:** PROTOTYPE/spike, NOT merged, NOT pushed. Rob reviews before any merge/push.

> Read top-to-bottom. This supersedes the earlier slot-rename handoff — that work (and a lot more) is DONE. The composer showcase is now fully component-driven + Tailwind, and we exposed/built 7 elements. What's left is a queue of follow-ups (§6), none urgent.

---

## 0.0 LATEST — `::part` discoverability + a build:api P0 fix (UNCOMMITTED, on top of `c1981e9`)
Done after the `c1981e9` snapshot below. Tree dirty; Rob reviews before commit.

**Shipped — `::part`/slot discoverability (queue item #2, now DONE):**
- `slots.ts` is now the single registry the build extracts: added `ELEMENT_COMPOSITION` (tag → `{slots, parts}`) + `BUTTON_PARTS`/`BADGE_PARTS`/`ICON_PARTS` (the parts that existed only in facade code). A `slots.test.ts` **drift guard** scans every `part="…"` in `src/` and fails if one isn't registered.
- `gen-element-api.mjs` reads `ELEMENT_COMPOSITION` from the AST (can't `import` TS under plain node) and emits **CEM-standard `slots` + `cssParts`** (with a `recipe` extension) into `custom-elements.json`, plus `slots`/`parts` into `element-meta.json`. Slots flagged `part:true` also become parts.
- Surfaced in: `docs/web-components.md` (Slots + Styleable-parts tables), `llms-full.txt`, and the **`kai` MCP `component_reference`** (new "Composition slots" + "Styleable parts (`::part`)" sections with the copy-paste recipe). 22 node tests green (15 slots + 7 reference).

**Fixed — pre-existing P0: `build:api` was crashing (stack overflow).** `renderType` in `scripts/_ts-helpers.mjs` inlined every named type with no cycle guard, so the self-referential `KaiMenuItem.items` / `FileTreeNode.children` recursed forever. Broken since `kai-menu` landed → `element-meta.json` was **8 elements stale** (missing avatar/badge/button/command/icon/menu/notice/tooltip). Added a `seen`-set cycle guard (a self-reference truncates to `Record<string, unknown>` — self-contained, tsc-valid). `build:api` now emits **55 elements**; **typecheck 4/4 green**. The regen brought the 8 missing elements into the React wrappers / `element-types.d.ts` / docs / llms — a large but correct diff.

**Test status (verified):** the only real failure my regen caused was `tests/stories/element-controls.test.ts` (proseSize) — TS union member order tracks the checker's global type-id ordering and shifted when 8 elements were added; fixed by asserting the option SET (order is cosmetic). **Pre-existing, NOT mine (don't chase):** the Storybook *vitest browser* project is flaky under full parallel load (failure count varied 46↔80 across identical runs; story files pass in isolation on clean HEAD too), and `chat-slots › Inject` has an axe a11y violation that reproduces on clean HEAD. Neither is the commit gate (§5 = `tsc` + the IVPs).

**New follow-up:** `docs/web-components.md` has no authored headings for the 8 new elements, so the generator can't inject their Slots/Parts tables there (the CEM + MCP + `llms-full.txt` DO cover them). Author headings to complete the human docs.

---

## 0. TL;DR — what to do next
Nothing is half-finished. Pick from the queue in §6. The likely next pieces, in order of leverage:
1. **Extend the `slot="icon"` escape hatch** to the other icon-bearing props (`kai-suggestions`, `kai-notice`) — kai-button already has it; same pattern.
2. ~~**`::part` discoverability**~~ — **DONE** (see §0.0). Remaining sub-item: author `docs/web-components.md` headings for the 8 new elements so their Slots/Parts tables get injected.
3. **Surface-token migration**: the ~10 remaining `bg-muted/NN` *surfaces* → `bg-surface` (only `prompt-input` is migrated).
4. **The real graduation** (separate, not started): the audit-driven production rollout starting at `kai-conversations` (audit P1, see `docs/superpowers/specs/2026-06-23-composition-seams-audit.md`). Unblocks issue #106.

**Behavioral musts (Rob was burned by these — §7):** SHOW screenshots and let Rob judge; never overclaim "done"; drive visual work in a tight edit→`_shot.mjs`→Read loop; no emoji.

---

## 1. The big picture
Composition-over-configuration for `@kitn.ai/ui` (Shadow-DOM web components authored in SolidJS, consumed from any framework; elements prefixed `kai-`). Rob's thesis: **configuration forces US to author the Cartesian product of layouts×use-cases — unbounded and not ours to know.** So we expose **slots (positions) + well-made parts + tokens/`::part`**, and the consumer composes. Our job shrinks to "render parts well + add parts as new AI-UX patterns emerge." Reference target is Claude's composer (dark card: a "model unavailable" notice, input, a `+` menu, model+effort+mic+voice, suggestion chips).

---

## 2. What shipped THIS session (7 commits over `4af1ff7`)
- **`a236ed4`** `feat(prompt-input)!`: **slot rename** — `notice` *removed* (outer content = the dev's own layout, or `kai-chat`'s `composer-actions` when nested), `leading`→`input-top`, `toolbar-start` kept, `trailing`→`toolbar-end`. **`submit` trimmed** to `'always'|'auto'` (`never` → CSS `::part(send){display:none}`). Added **`PartDef`/`PROMPT_INPUT_PARTS` registry** in `src/elements/slots.ts` (declares the `send` part + a copy-paste recipe) and a `<kai-prompt-input>` composition diagram story.
- **`5a258e6`** `feat(theme)`: **calculated opaque surface tokens.** `--color-surface` / `--color-surface-strong` / `--color-surface-sunken` in `theme.css`, derived via `color-mix(... var(--color-muted) N%, var(--color-background))` — opaque (no bleed-through like `bg-muted/40`), theme-aware. **Declared in BOTH `@theme` (light) AND `.dark`** (a derived custom property resolves where it's *declared*, not used — light-only = wrong color in dark). `@utility bg-surface / bg-surface-strong / bg-surface-sunken`. Migrated `prompt-input.tsx` card `bg-muted/40` → `bg-surface`.
- **`9513dd1`** `feat(elements)`: **`kai-button`** (`src/elements/button.tsx` over the `Button` primitive; `variant` incl. new `subtle`, `size`, `icon`/`icon-trailing`, `label`, `kai-click`, `::part(button)`); **`kai-menu` trigger props** (`trigger-icon`/`trigger-label`/`trigger-icon-trailing`/`label` — slotted `trigger` still wins); **`kai-suggestions` per-item icons** (`{label,icon}` + `<kai-suggestion icon>`; `PromptSuggestion` renders a leading icon); **dropdown** checkbox items → TRAILING check (so an icon'd item aligns) + submenu chevron full `size-4` (a `pl-2` was shrinking it). Icons added to `src/ui/icon.tsx`.
- **`56ce22c`** `refactor(composer-showcase)`: banner became a **flow container** (dropped absolute/z-index/margin peek + the focus-ring overlap); all controls became kit elements; **all inline styles → Tailwind classes** (0 inline styles, 0 hand-rolled buttons); dropped hard-coded `theme="dark"`; `default-input` toolbar `pb-3`→`pb-0`.
- **`8ab6b6d`** `feat(elements)`: **`kai-avatar`** (image + initials fallback, sm/md/lg), **`kai-badge`** (default/count/citation, `::part(badge)`), **`kai-tooltip`** (hover/focus hint wrapping a slotted trigger, portaled in shadow). Thin facades over existing `src/ui/` primitives.
- **`65ee396`** `feat(elements)`: **`kai-notice`** (new `src/ui/notice.tsx` + facade; `severity` neutral/info/warning/error/success → colored icon via the `tool-*` hues + a11y `role` alert/status; `icon` default/`none`/custom; self-dismissing `×` → `kai-dismiss`; message + `slot="action"`); **`kai-icon`** (curated icons standalone; theme foreground; recolor via `::part(icon)`); **`kai-button` `slot="icon"`** escape hatch (any inline SVG; wins over the `icon` prop). + Notices/Icons stories.
- **`9670eef`** `refactor(composer-showcase)`: dogfood `kai-notice` for the banner (removed the hand-rolled div + dismiss wiring; now a stacked `<kai-notice severity="warning">` above the composer — dropped the behind-the-card peek; the component owns its box, the dev owns placement).

**Element count: 55.** tsc clean (run `npx tsc --noEmit`). IVPs green (`npm run test:slots-ivp`, `test:menu-ivp` — 7/7 each), `tests/ui/dropdown.test.tsx` 7/7, `slots.test.ts` 12/12.

---

## 3. Settled philosophy (the rules — DO NOT relitigate)
1. **`slot` = position · `::part`/token = styling · a prop ONLY for behavior CSS can't express.** (`submit="auto"` needs JS to know there's content; "hide send" is pure CSS.) This says *trim, not add*.
2. **A slot earns its place only where the shadow boundary blocks the consumer.** Outer content (above/below the card) is the dev's own light-DOM layout — that's why the prompt-input has no outer `notice` slot.
3. **Layout stays the dev's (Tailwind/CSS).** REJECTED `kai-flex`/`kai-layout`: flexbox is universal, not kit-specific; a layout component just re-types flexbox with worse ergonomics + shadow friction. We own *parts*, not layout.
4. **Expose polished primitives as elements** (the `kai-button` pattern): if a hard-to-get-right primitive (theming/a11y/hover/shadow) exists but isn't exposed, consumers hand-roll it → gap. That's why we shipped button/avatar/badge/tooltip/notice/icon.
5. **A notice/alert IS a component** (behavior + semantic severity + a11y role) — unlike layout. Provide one; devs can still hand-roll bespoke ones (both coexist).
6. **Icons — three tiers, not locked to any library:** `icon="mic"` prop (curated, on elements) · `<kai-icon name="mic">` (curated, standalone) · `slot="icon"` inline SVG (ANY library, inherits `currentColor`). Curated set lives in `src/ui/icon.tsx` `NAMED_ICONS` (~23); it's deliberately small (AI-UX vocabulary), not a general library — hold that line; the slot is the escape hatch.
7. **No hardcoded colors / no `theme="dark"` in stories** — everything is `var(--color-*)` and follows the toggle.
8. **These are PROTOTYPES** (proven, not production-polished). Production graduation (audit P1 `kai-conversations`) is a later, separate effort.

---

## 4. The composer showcase (current state)
`src/elements/composer-showcase.stories.tsx`, story `Spikes/Composer (production)` → `Composer` (id `spikes-composer-production--composer`). Fully component-driven, Tailwind classes only:
- `<kai-notice severity="warning">` above the composer (self-dismiss + Learn-more action slot).
- `<kai-prompt-input>` with `<kai-menu slot="toolbar-start" trigger-icon="plus">` (the `+`) and a `slot="toolbar-end"` cluster: `<kai-model-switcher>` · `<kai-menu trigger-label="High" trigger-icon-trailing="chevron-down">` · two `<kai-button variant="subtle" size="icon-sm">` (mic/voice).
- `<kai-suggestions>` below (per-item icons: pencil/book-open/code/smile).
- Data (menu items, suggestions, model list) set as JS props via refs in `onMount`; events wired via `addEventListener` there.
Primitives demo: `src/elements/primitives.stories.tsx` → `Spikes/New Primitives` → `Avatars`/`Badges`/`Tooltips`/`Notices`/`Icons`.

---

## 5. Environment / how to continue
- **Worktree:** `/Users/home/Projects/kitn-ai/kitn-chat-spike-kai-chat-seams`, branch `spike/kai-chat-seams` (sibling worktree; `node_modules` symlinked).
- **Storybook:** `npm run storybook` (port 6006; runs `build:css` then `storybook dev`).
- **Screenshot loop:** `_shot.mjs` in the worktree root (untracked; recreate if missing — see below). `node _shot.mjs "<iframe url>" spike-screens/x.png dark 920 740 kai-prompt-input` then **Read** the PNG. `spike-screens/` is gitignored. Add `.dark` to `<html>` for dark mode (preview.ts syncs `theme="dark"` onto kai-* elements). For other elements pass a different `selector` arg; for interactions (open a menu, hover a tooltip, click dismiss) write a one-off inline `node -e "import('playwright')…"`.
  ```js
  // _shot.mjs — args: url out [mode=dark] [w=920] [h=700] [selector=kai-prompt-input]
  import { chromium } from 'playwright';
  const [url, out, mode='dark', w='920', h='700', sel='kai-prompt-input'] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:+w,height:+h}, deviceScaleFactor:2 });
  await p.goto(url,{waitUntil:'networkidle'}).catch(()=>{}); await p.waitForSelector(sel,{timeout:25000}).catch(()=>{});
  if (mode==='dark') await p.evaluate(()=>document.documentElement.classList.add('dark'));
  await p.waitForTimeout(2000); await p.screenshot({path:out}); await b.close();
  ```
- **⚠️ THE BIG GOTCHA — shadow CSS needs a Storybook RESTART.** `kai-*` elements inject `src/elements/compiled.css?inline` into their shadow root; `compiled.css` is built by `build:css` at Storybook startup and **Vite does NOT re-inline it on change**. So when you change a shared component's classes, add a new element, or add an `@theme` token / `@utility`, you must **kill + relaunch Storybook** (`lsof -ti:6006 | xargs kill; npm run storybook` in the background) to see it in the shadow DOM — HMR alone won't. (The Storybook *preview* CSS, `.storybook/styles.css`, DOES hot-reload, which is why page-level/light-DOM classes appear without a restart, misleadingly.) Build the new element's classes from existing utilities where possible to minimize surprises.
- **⚠️ Events from a SolidJS parent:** consuming a `kai-*` element's events in a story uses **`addEventListener` in `onMount`** (not Solid `onClick`/`on:` — delegation doesn't cross the shadow boundary; native click bubbles composed but the delegated handler still misfired). React/Vue consumers get `onKai*` props from the generated wrappers.
- **⚠️ Per-story JSX decls:** each story file `declare module 'solid-js'`-augments `IntrinsicElements` for the `kai-*` tags it uses. The SAME tag declared in two story files must be **structurally identical** or tsc errors (`TS2717`). Keep them in sync.
- **Tests before commit:** `npx tsc --noEmit`; the relevant `npm run test:*-ivp`. After `build:api`, `git checkout -- src/components/component-meta.json` (churns; not used at runtime). `build:api` was NOT run this session.
- **A faulty-test lesson:** verifying a dismiss, I checked the wrong `<div>` (the container, whose `textContent` started with the banner's) and wrongly concluded it was broken — it worked. When verifying DOM state, target the exact element (the control's `parentElement`, the shadow node), not a `find()` by text.

---

## 6. Queued work (none urgent; pick by leverage)
- Extend `slot="icon"` to `kai-suggestions` and `kai-notice` (kai-button has it).
- ~~**`::part` discoverability**~~ — **DONE** (see §0.0): `ELEMENT_COMPOSITION` registry in `slots.ts` → `gen-element-api.mjs` AST-extracts it → CEM `slots`/`cssParts` + `element-meta` slots/parts → docs tables + `llms-full.txt` + the `kai` MCP `component_reference`. Drift guard in `slots.test.ts`. Remaining: author `docs/web-components.md` headings for the 8 newly-regenerated elements (avatar/badge/button/command/icon/menu/notice/tooltip) so their Slots/Parts tables inject.
- **Surface-token migration** — `grep -rn "bg-muted/[0-9]" src` (~96 alpha usages; the SURFACE ones — composer/artifact/form/message-bubble/conversation-list/scroll-button) → `bg-surface`/`bg-surface-strong`. LEAVE genuine scrims/tints (`bg-background/80`, `bg-black/60`, primary/destructive state washes).
- **Production rollout** (the real graduation, not started): audit P1 = `kai-conversations`, then `kai-workspace`/`kai-message`. Unblocks issue #106 (state-helpers Phase 2 element methods).
- Deferred minors in `.superpowers/sdd/progress.md` (gitignored, in the worktree): W4b composer→CommandList DRY; `gen-element-api` slot/part-table emission; misc a11y/cosmetic.

---

## 7. Lessons / how to work (Rob's, heed these)
- **Do NOT overclaim "done/polished."** SHOW screenshots vs. the reference; let Rob judge. Only call it good when it visibly is.
- **Drive visual work DIRECTLY** in a tight edit→`_shot.mjs`→Read loop. Verify in BOTH light and dark.
- When you fix something, **verify it in the real running app**, targeting the exact element (see the faulty-test lesson, §5).
- **No emoji, ever** (kit convention). Use lucide / `renderIcon`.
- Lead design forks with a decisive recommendation; reserve modal questions for genuinely strategic choices. Rob is the product owner and decides surface-area additions.
