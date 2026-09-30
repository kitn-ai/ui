# E — Agent Card, Artifact Toolbar, ViewStack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `kai-agent-card` with a pattern built from public parts, make `kai-artifact`'s toolbar slot-composable (removing its five `no*` props), and document ViewStack as navigation.

**Architecture:** Two small kit additions (`kai-status` agent tones, `kai-badge` `outline`), one deletion, slot regions plus read-only history state on `kai-artifact`, and patterns under `packages/blocks/patterns/`.

**Tech Stack:** SolidJS, `defineWebComponent`, `readSlots`, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-29-E-removals-design.md`

## Global Constraints

- Plan A's Global Constraints apply.
- E1 needs A0; E2 needs E1 + A6; E3 needs A0; E4 needs E3 + A6; E5 needs A0. E1/E3/E5 run in parallel.
- Break now: no aliases, no deprecation shims.

## Shared files (supervisor serializes)

`src/solid.ts`, `register-impl.ts`, autoloader map, `web-components/slots/slots.ts` (E2 removes agent-card parts; E3 adds artifact slots — sequential), generated artifacts.

## Task graph

```
E1 status tones + badge outline ── E2 agent-card pattern + delete element
E3 artifact slots + history state ── E4 artifact-toolbar pattern + migrations
E5 ViewStack docs
```

## Review Focus

1. A composed artifact toolbar's Back button right after load: `canGoBack` must be `false` and the button disabled, not a no-op click — pinned in E3 Step 1.
2. `slot="toolbar"` added AFTER first render (framework hydration order): the built-in toolbar must disappear then, not stay — pinned in E3 Step 1.
3. The agent-card pattern's `needs attention` state must be announced (visible badge text, not colour alone) — pinned in E2 Step 1.
4. The v0 and split-workspace showcase stories after migration must look the same as before — pinned in E4 Step 1 (screenshot compare).
5. `kai-status` existing presence kinds (`online`, `busy`, …) must render exactly as before after the new tones are added — pinned in E1 Step 1.

---

### Task E1: `kai-status` agent tones and `kai-badge` `outline`

**Files:**
- Modify: `packages/ui/src/components/status/status.tsx:4-20` (`StatusKind` += `working | idle | done | error | blocked`, hues copied from `components/agent-card/agent-card.tsx`'s tone map), `web-components/status/status.tsx`, `components/badge/*` + `web-components/badge/badge.tsx:6` (`variant` += `outline`: transparent fill, `border-border`, foreground text), stories for both
- Test: `components/status/status-tones.test.tsx`, `components/badge/badge-outline.test.tsx`

- [ ] **Step 1: Failing tests**: each new status renders its dot with the agent-card hue class and a default `aria-label` equal to the status word; the five presence kinds' classes are byte-identical to before (snapshot the class strings BEFORE editing and assert against them); `variant="outline"` renders a bordered transparent badge; axe passes on the new stories in light and dark (contrast of outline text).
- [ ] **Step 2: FAIL. Step 3: Implement. Step 4: Run** unit, storybook for status/badge, axe, `build:api`. **Step 5: Commit** — `feat(ui): agent status tones on kai-status, and an outline kai-badge`.

**Verification type:** unit + storybook/axe.

---

### Task E2: The `agent-card` pattern; delete `kai-agent-card`

**Files:**
- Create: `packages/blocks/patterns/agent-card/{registry-item.json,agent-card.html,agent-card.ts}`, story `packages/ui/src/stories/patterns/agent-card.stories.tsx`
- Delete: `packages/ui/src/web-components/agent-card/`, `packages/ui/src/components/agent-card/`
- Modify: `src/solid.ts`, `web-components/slots/slots.ts` (`AGENT_CARD_PARTS`, line ~1000 entry) + `slots.test.ts`, `wire/payload-boundary.test.ts:30,459` (probe another element with an object prop, e.g. `kai-plan` from B5 if merged, else `kai-command` with `items`), the three `web-components/web-component/*` registry/diagnostics tests, `stories/showcase/split-workspace.stories.tsx` (pattern markup), `components/pane/pane-group.tsx` + `components/icon/icon.tsx` (comments), `scripts/lint-story-conventions.mjs`, the docs page (delete + redirect to `/patterns/agent-card`)

- [ ] **Step 1: Failing tests**: the pattern story renders five rows (one per status) with visible status text and a visible "Needs you" badge on one; Enter/Space on a row fires `kai-click`; the menu trigger has an accessible name; axe clean; `customElements.get('kai-agent-card')` is undefined after importing register-all (write this assertion into `web-component-registry.test.ts`).
- [ ] **Step 2: FAIL. Step 3: Write the pattern; delete the element**; re-run `grep -rlE "kai-agent-card|AgentCard" packages/ui packages/blocks packages/create-kai apps/docs/src examples --exclude-dir=node_modules --exclude-dir=dist` until only history remains.
- [ ] **Step 4: Run** unit, emitted, storybook, `verify:generated` after `build:api`, `verify:consumer`, `verify:scaffold`, `kai add agent-card` into a scratch app. **Step 5: Commit** — `feat(ui)!: kai-agent-card becomes the agent-card pattern`.

**Verification type:** unit + storybook + consumer gates + `kai add`.

---

### Task E3: `kai-artifact` toolbar slots and history state

**Files:**
- Modify: `packages/ui/src/web-components/artifact/artifact.tsx:20-180`, `packages/ui/src/components/artifact/artifact.tsx:95-310` (remove `showNav/showReload/showHome/showPathField/showTabs`; add `toolbar`, `toolbarStart`, `toolbarEnd`; track `canGoBack`/`canGoForward`), `web-components/slots/slots.ts` (artifact slots with recipes), `tests/web-components/artifact.test.tsx`, `tests/web-components/chat-home.test.tsx`, `tests/stories/web-component-controls.test.ts`, `apps/docs/src/components/Playground.tsx`, `mcp/construct/cli.test.ts`
- Test: `packages/ui/tests/web-components/artifact-toolbar-slots.test.tsx`

**Interfaces:**
- Produces: slots `toolbar`, `toolbar-start`, `toolbar-end`; host getters `url: string`, `canGoBack: boolean`, `canGoForward: boolean`; event `kai-history-change {url, canGoBack, canGoForward}`.

- [ ] **Step 1: Failing tests**: a `slot="toolbar"` child replaces the built-in toolbar (no built-in nav button in the shadow root); added after first render it still replaces; an empty `<div slot="toolbar"></div>` removes the toolbar; `toolbar-start`/`toolbar-end` children render at the built-in toolbar's ends; after load `canGoBack === false`; `navigate('/a')` then `navigate('/b')` → `canGoBack === true`, one `kai-history-change` per navigation with matching detail; `back()` → `canGoForward === true`; setting `noNav` has no effect and the prop is absent from `web-component-meta.json` after `build:api`; `artifact-url-xss.test.tsx` unchanged-green.
- [ ] **Step 2: FAIL. Step 3: Implement** (slot detection with `readSlots` + `MutationObserver` as other facades do; history state derived from the component's existing navigation stack — read how `back`/`forward` are implemented first and expose that state, do not add a second stack).
- [ ] **Step 4: Run** unit, storybook for artifact, `build:api`, `verify:generated`. **Step 5: Commit** — `feat(ui)!: kai-artifact's toolbar is composed through slots; the no* props are gone`.

**Verification type:** unit + storybook.

---

### Task E4: The `artifact-toolbar` pattern and the migrations

**Files:**
- Create: `packages/blocks/patterns/artifact-toolbar/{registry-item.json,artifact-toolbar.html,artifact-toolbar.ts}`, story `stories/patterns/artifact-toolbar.stories.tsx`
- Modify: `stories/showcase/v0.stories.tsx:575,632`, `stories/showcase/split-workspace.stories.tsx:1886,2160`, `examples/apps/builder/src/components/PreviewPanel.tsx:122`, `apps/docs/src/content/docs/components/artifact.mdx`

- [ ] **Step 1: Failing check**: capture screenshots of the v0 and split-workspace stories on `feat/composition` BEFORE E3 merges (the supervisor provides them, or check out the pre-E3 commit in a scratch worktree); after migration a Playwright compare within the repo's screenshot tolerance must pass.
- [ ] **Step 2: Write the pattern** (a path field + open-in-tab toolbar; a code-only viewer with `<div slot="toolbar"></div>`), migrate the three call sites to slots, rewrite the docs page's toolbar section.
- [ ] **Step 3: Run** storybook, the screenshot compare, `examples/apps/builder` typecheck/build, docs build, `kai add artifact-toolbar`. **Step 4: Commit** — `feat(blocks): the artifact-toolbar pattern; showcase and builder compose the toolbar`.

**Verification type:** in-browser screenshot compare + docs build + `kai add`.

---

### Task E5: ViewStack as navigation

**Files:** `packages/ui/src/components/view/view-stack.stories.tsx` (title → `Components/Navigation/View Stack`), the ViewStack docs page (find: `grep -rl "view-stack\|ViewStack" apps/docs/src/content/docs`), the `kai-chat` docs page (a link).

- [ ] **Step 1**: retitle; the page opens with "The drill-in navigator `kai-chat` uses (home → thread, back). It is navigation, not a chat thread."
- [ ] **Step 2: Run** `lint:story-conventions`, storybook for view, docs build. **Step 3: Commit** — `docs: ViewStack is navigation`.

**Verification type:** storybook + docs build.
