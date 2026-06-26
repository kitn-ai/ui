# HANDOFF — Composition initiative (composer showcase + new composition primitives)

**Date:** 2026-06-26 · **Branch:** `docs/composition-promotion` (= **PR #111**) in the MAIN repo root `/Users/home/Projects/kitn-ai/kitn-chat` · **Status:** the whole composition→docs→storybook initiative is DONE on this branch (~14 commits), awaiting Rob review/merge. Earlier PRs #107/#108/#109/#110 merged to main.

> ★ Read §0.0 below + memory `composition-seams-direction.md` cont. 1–21 (authoritative). The rest of this doc (§0.5 onward) is older history kept for context — do not trust its "current state" lines.

---

## 0.0 LATEST (2026-06-26) — full initiative on PR #111; ★IMMEDIATE NEXT = Storybook Labs/section cleanup
**★READ memory `composition-seams-direction.md` cont. 1–21 FIRST — it's the authoritative running log.** This §0.0 below (and §0.5 onward) is older history; trust the memory for current state.

**Where we are:** the whole arc is done and on ONE branch — **`docs/composition-promotion` = PR #111** (~14 commits, awaiting Rob review/merge). Working in the **main repo root** `/Users/home/Projects/kitn-ai/kitn-chat` on that branch (the old spike worktree was removed). Earlier PRs all merged to main: **#107** (composition primitives + ::part discoverability), **#108** (kai-message/resizable graduations), **#109** (menu/tooltip/dark bugfixes), **#110** (Spikes→Labs). PR #111 then layered: the `fix(elements)` slots-registry + manifest refresh; **docs promotion** — 12 building-block (Foundations) component pages + the usage-first journey (Use the chat app · Use a workspace · How composition works · Build a composer · Compose a message thread · Menus & command pickers) + nav reorder; the **bundle rename `kitn-chat.es.js`→`kai.es.js`** (breaking, all refs swept repo-wide); an **icon gallery**; and the **Storybook overhaul** — split so docs=web-components / Storybook=SolidJS-contributor. Storybook now: **Contributing 6 · Components 47** (renamed from "Solid (Advanced)") **· Labs 9 · Test Fixtures 3** (Composer/Prompt Input/Prompt Input Variants) **· Theming 1** (Token Reference). A new `Contributing/*` MDX section + a drift-guard (`tests/stories/e2e-story-fixtures.test.ts`, hardened to match all story-ref forms) protect the WC test fixtures.

**★IMMEDIATE NEXT TASK (Rob, queued for after a session clear):** Storybook Getting-Started + Labs cleanup —
1. **Rename the `Contributing` Storybook section → `Getting Started`** (the 6 MDX in `src/stories/contributing/` — their `<Meta title="Contributing/…">` + the `storySort` order in `.storybook/preview.ts` + any cross-links).
2. **Fold the `Token Reference` under `Getting Started`** and DROP the standalone `Theming` section (one token doc doesn't warrant its own section). `src/stories/token-reference.stories.tsx` title `Theming/Token Reference` → `Getting Started/Token Reference` (or similar); update storySort.
3. **Clean up the Labs titles** (`src/elements/*.stories.tsx` with `title: 'Labs/…'`): drop the "Kai" branding (`Labs/Kai Menu`, `Labs/Kai Command` — why "Kai"?), rename the unclear **`Labs/Composer (production)`**, and reconcile **`Labs/How Composition Works`** (that concept now lives in the docs at `/guides/how-composition-works/` — remove from Labs or repurpose). Verify each Lab still renders + is current. ★If you rename Lab titles, the IVP specs target `labs-*` story ids (`labs-kai-menu--plus-menu`, `labs-kai-command--mention-picker`, `labs-chat-slots--*`, `labs-prompt-input-slots--*`) — update those specs AND run the hardened drift guard (`npx vitest run tests/stories/e2e-story-fixtures.test.ts`) + the matching `npm run test:*-ivp`.

**Open flags (cont. 21):** tiny prompt-input `.shot` baseline PNGs got swept into commit `5204cda` via `git add -u` (specs pass, render verified — offer to split/revert if Rob wants); Typography was dropped from Theming (offer to fold its type-scale into the Token Reference doc); PR #111 awaits Rob's review/merge (the `fix(elements)` + `feat(build)!` commits cut a release via release-please).

**★STORYBOOK + DOCS DEV:** Storybook `npm run storybook` :6006 (RESTART for new elements/shadow-CSS/storySort/.storybook config — won't HMR); docs `cd docs-site && npm run dev` :4321 (RESTART for astro.config nav changes). `build-storybook` is the compile gate; `cd docs-site && npm run build` the docs gate. Helpers (untracked): `_shot.mjs`, `docs-site/_shotdoc.mjs`/`_vpage.mjs` etc. (screenshot/IVP). After any kit build: `git checkout -- src/components/component-meta.json` (churn). ★When stripping stories, grep the WHOLE repo (esp `.storybook/`, `tests/`), not just `src/` — `examples/usage` powers the `.storybook` api-tab; over-stripping broke the build twice.

--- (historical, pre-merge) ---
Done after the `c1981e9` snapshot below. Commits `04257ca`→`674ab7b` are **pushed to `origin/spike/kai-chat-seams`**. Element count is now **59**.

**Also added — 4 more composition primitives (thin facades over existing `src/ui` primitives):**
- `kai-separator` (divider, H/V, `::part(separator)`), `kai-scroll-area` (themed thin-scrollbar container, `::part(viewport)`), `kai-hover-card` (rich hover content via `slot="card"` — the markup-carrying sibling of `kai-tooltip`; slot-into-portal verified), and `kai-skeleton` (responsive loading placeholder; `variant` text/rect/circle + `width`/`height`/`lines`, prop-driven because classes can't cross the shadow boundary).
- The `Skeleton` PRIMITIVE gained the variant/responsive API (backward-compatible) and is now **dogfooded** in `link-preview` + `components/image`. (`kai-image`'s fallback stays unsized/`h-auto` ON PURPOSE — Rob's call: base64/bytes decode in-memory near-instantly so the skeleton barely shows, and we can't know the image's dimensions, so reserving guessed space would only risk a layout jump. Don't "fix" it.) All four verified rendering in light + dark via `_shot.mjs`. Doc headings authored in `web-components.md` for the 11 newer composition/interactive elements so their Slots/Parts tables inject. Decision (Rob): skeletons belong as a LOW-LEVEL responsive primitive, NOT content-shaped presets (message-skeleton etc. = the Cartesian-product trap).

> ★ GOTCHA REMINDER for screenshots: adding a NEW element needs a Storybook RESTART (`lsof -ti:6006|xargs kill; npm run storybook`) before `_shot.mjs` can see it.

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
1. ~~**Extend the `slot="icon"` escape hatch**~~ — **`kai-notice` DONE** (slotted SVG overrides the severity glyph; via `noticeIconNode` + the primitive's `iconSlot`). `kai-suggestions` deliberately NOT done — its chips are data-driven (an `items` array / `<kai-suggestion icon>` data carriers rendered in shadow), so there's no single icon to slot; its `icon` field already accepts a data-URI/URL SVG as the consistent escape hatch.
2. ~~**`::part` discoverability**~~ — **DONE** (see §0.0). Remaining sub-item: author `docs/web-components.md` headings for the 8 new elements so their Slots/Parts tables get injected.
3. ~~**Surface-token migration**~~ — **DONE**. Migrated 11 static surfaces across tool/attachments/composer/conversation-list/artifact/form/file-upload to `bg-surface`/`-strong` (nested boxes)/`-sunken` (artifact sidebar+canvas). Left hover states, the outline-button control bg, conversation-item active, the artifact readonly-input state, and demo/story code. Verified tool light+dark (depth hierarchy reads correctly).
4. **The real graduation** (in progress): audit-driven production rollout. **`kai-conversations` DONE** (header replace / footer inject / empty replace, registered + discoverable, verified light+dark). Next P1: `kai-workspace`, then `kai-message` (the compose-your-own keystone: `before-body`/`after-body` inject + `avatar` replace). Unblocks issue #106. Spec: `docs/superpowers/specs/2026-06-23-composition-seams-audit.md`.

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
- ~~Extend `slot="icon"` to `kai-suggestions` and `kai-notice`~~ — **`kai-notice` DONE; `kai-suggestions` N/A** (data-driven chips; data-URI icon string is its escape hatch).
- ~~**`::part` discoverability**~~ — **DONE** (see §0.0): `ELEMENT_COMPOSITION` registry in `slots.ts` → `gen-element-api.mjs` AST-extracts it → CEM `slots`/`cssParts` + `element-meta` slots/parts → docs tables + `llms-full.txt` + the `kai` MCP `component_reference`. Drift guard in `slots.test.ts`. Remaining: author `docs/web-components.md` headings for the 8 newly-regenerated elements (avatar/badge/button/command/icon/menu/notice/tooltip) so their Slots/Parts tables inject.
- ~~**Surface-token migration**~~ — **DONE** (11 static surfaces → `bg-surface`/`-strong`/`-sunken`; hover/state/control/demo left as-is). Remaining `bg-muted/NN` are all intentional (hover tints, outline-button bg, conversation-item active, artifact readonly input, story snippets).
- **Production rollout** (the real graduation): **`kai-conversations` DONE** (header/empty replace + footer inject via the `readSlots` flag-gate pattern; `CONVERSATIONS_SLOTS` in slots.ts mirrors `kai-chat`'s names). Next: `kai-workspace` (sidebar-header/footer/sidebar-replace/footer), then `kai-message` (`before-body`/`after-body` inject + `avatar` replace). Unblocks issue #106. NOTE: also fixed a gen-llms bug — `fromElements`/`fromManifest` dropped slots/parts, so `llms-full.txt` never rendered them; now it does.
- Deferred minors in `.superpowers/sdd/progress.md` (gitignored, in the worktree): W4b composer→CommandList DRY; `gen-element-api` slot/part-table emission; misc a11y/cosmetic.

---

## 7. Lessons / how to work (Rob's, heed these)
- **Do NOT overclaim "done/polished."** SHOW screenshots vs. the reference; let Rob judge. Only call it good when it visibly is.
- **Drive visual work DIRECTLY** in a tight edit→`_shot.mjs`→Read loop. Verify in BOTH light and dark.
- When you fix something, **verify it in the real running app**, targeting the exact element (see the faulty-test lesson, §5).
- **No emoji, ever** (kit convention). Use lucide / `renderIcon`.
- Lead design forks with a decisive recommendation; reserve modal questions for genuinely strategic choices. Rob is the product owner and decides surface-area additions.
