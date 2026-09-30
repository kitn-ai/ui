# D — Conversation Rail and Command Trigger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `kai-conversations` treat rows inside `<details>` folders as full rows, and ship the `conversation-rail` and `command-trigger` patterns that reproduce the owner's screenshot from public parts.

**Architecture:** One discovery change in the `kai-conversations` facade (descendant rows, skipping closed folders, re-sync on `toggle`); the rest is patterns under `packages/blocks/patterns/` with stories and docs.

**Tech Stack:** SolidJS facade, native `<details>`, `kai-command` + `kai-dialog`, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-29-D-conversation-rail-design.md`

## Global Constraints

- Plan A's Global Constraints apply.
- D1 needs A0 only; D2 needs A6 (pattern plumbing); D3 needs D1 + D2.
- No new rail element, no new props on `kai-conversations`.

## Shared files (supervisor serializes)

Generated artifacts (only if a public doc comment changes), `packages/blocks/src/registry.ts` (not edited here; patterns are discovered), `apps/docs` nav (`topics.mjs`).

## Task graph

```
D1 nested rows ──┐
D2 patterns (after A6) ──┴── D3 docs + old spec status
```

## Review Focus

1. The ACTIVE conversation is inside a folder the user then closes: the tab stop must move to a visible row, never to a hidden one — pinned in D1 Step 1.
2. A folder `<summary>` must keep its native Enter/Space toggle and must not become a row or swallow arrow keys — pinned in D1 Step 1.
3. A `kai-conversation-item` placed inside another row's `menu` slot (a preview) must not become a row — pinned in D1 Step 1 (rows inside a row's menu region are excluded).
4. Closing the command dialog with Esc must return focus to the trigger that opened it — pinned in D2 Step 1.
5. The rail pattern inside a 280px `kai-workspace` start aside at narrow width must not scroll horizontally — pinned in D2 Step 1.

---

### Task D1: Nested rows in item mode

**Files:**
- Modify: `packages/ui/src/web-components/conversation/conversation-list.tsx:110-160` (row discovery; `toggle` listener with `capture: true` on the host), `packages/ui/src/components/conversation/conversation-list.tsx:85-110` (doc comment: rows may be nested; closed `<details>` excluded)
- Test: `packages/ui/src/web-components/conversation/conversation-list-nested.declarative.test.tsx`, a storybook browser test `conversation-list-nested.browser.test.tsx`

**Interfaces:**
- Produces: `itemHosts()` = `[...element.querySelectorAll('kai-conversation-item')].filter(isVisibleRow)` where `isVisibleRow(el)` is false if any ancestor between `el` and the host is a closed `<details>` or is inside another `kai-conversation-item`'s `menu` slot.

- [ ] **Step 1: Failing tests**

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import './conversation-list';
import './conversation-item';
if (!Element.prototype.scrollTo) (Element.prototype as unknown as { scrollTo: () => void }).scrollTo = () => {};
afterEach(() => document.body.replaceChildren());
const mount = async (html: string) => {
  document.body.innerHTML = html; // test-authored markup, not model output
  await customElements.whenDefined('kai-conversations');
  await new Promise((r) => setTimeout(r, 0));
  return document.querySelector('kai-conversations') as HTMLElement & { activeId?: string };
};
const tabIndexOf = (id: string) => {
  const item = document.querySelector(`kai-conversation-item[conversation-id="${id}"]`)!;
  return (item.shadowRoot?.querySelector('[part~="body"], [role]') as HTMLElement | null)?.getAttribute('tabindex');
};
describe('nested rows', () => {
  it('a row inside an open <details> is a row', async () => {
    await mount(`<kai-conversations active-id="b"><details open><summary>F</summary>
      <kai-conversation-item conversation-id="a">A</kai-conversation-item>
      <kai-conversation-item conversation-id="b">B</kai-conversation-item></details></kai-conversations>`);
    expect(tabIndexOf('b')).toBe('0');
    expect(tabIndexOf('a')).toBe('-1');
  });
  it('rows inside a closed folder are skipped, and closing the active folder moves the tab stop', async () => {
    const el = await mount(`<kai-conversations active-id="b">
      <kai-conversation-item conversation-id="x">X</kai-conversation-item>
      <details open><summary>F</summary><kai-conversation-item conversation-id="b">B</kai-conversation-item></details></kai-conversations>`);
    const det = el.querySelector('details')!;
    det.open = false; det.dispatchEvent(new Event('toggle'));
    await new Promise((r) => setTimeout(r, 0));
    expect(tabIndexOf('x')).toBe('0');
    expect(tabIndexOf('b')).not.toBe('0');
  });
  it('the summary is never stamped as a row', async () => {
    const el = await mount(`<kai-conversations><details open><summary>F</summary>
      <kai-conversation-item conversation-id="a">A</kai-conversation-item></details></kai-conversations>`);
    const s = el.querySelector('summary')!;
    expect(s.hasAttribute('tabindex')).toBe(false);
    expect(s.getAttribute('role')).toBeNull();
  });
  it('an item inside another row’s menu slot is not a row', async () => {
    await mount(`<kai-conversations><kai-conversation-item conversation-id="a">A
      <div slot="menu"><kai-conversation-item conversation-id="p">P</kai-conversation-item></div></kai-conversation-item></kai-conversations>`);
    expect(tabIndexOf('p')).toBeNull();
  });
});
```
(Read `conversation-item.tsx` for the actual activation node selector before running; adjust `tabIndexOf` to that node, not the guess above.) The browser test drives ArrowDown from X into the folder, then Home/End, and Enter selecting `b` (`kai-conversation-select` detail `{ id: 'b' }`).
- [ ] **Step 2: FAIL. Step 3: Implement. Step 4: Run** unit (`conversation/`), existing `conversation-list.declarative.test.tsx` unchanged-green, storybook project for conversation, axe, `lint:preset-parts`. **Step 5: Commit** — `feat(ui): conversation rows may live inside folders`.

**Verification type:** unit + in-browser keyboard.

---

### Task D2: The `conversation-rail` and `command-trigger` patterns

**Files:**
- Create: `packages/blocks/patterns/conversation-rail/{registry-item.json,conversation-rail.html,conversation-rail.ts}`, `packages/blocks/patterns/command-trigger/{registry-item.json,command-trigger.html,command-trigger.ts}`, stories `packages/ui/src/stories/patterns/conversation-rail.stories.tsx`, `command-trigger.stories.tsx` (render the pattern HTML verbatim via a raw import so the story IS the installed file), `packages/ui/tests/e2e/rail-pattern.ivp.spec.ts`

**Interfaces:**
- Consumes: D1; A6 pattern kind; kit icons `search`, `panel-left`, `square-pen`, `folder-open`, `folder-closed` (all present in `icon-names.json`).

- [ ] **Step 1: Failing IVP** (`rail-pattern.ivp.spec.ts`, Playwright against the storybook project): Tab into the rail; ArrowDown walks X → A → B across two folders; closing folder 1 and re-walking skips A; Enter on B fires `kai-conversation-select`; clicking the header search opens `kai-dialog` with `kai-command` focused; typing filters (the story's script assigns a new `items` array); Esc closes and focus is back on the search button; `Mod+K` opens it; at 280px width inside a `kai-workspace` start aside, `document.scrollingElement.scrollWidth <= clientWidth`; axe clean in light and dark.
- [ ] **Step 2: FAIL. Step 3: Write the patterns** per spec D §3.1 and §3.2 (≤200 lines each including the script; comments explain the code only). The rail's top actions are `kai-row interactive` rows with leading icons; folders are `<details>`; section labels are plain `<p class="section">`; the pattern's small CSS is in the HTML `<style>`.
- [ ] **Step 4: Run** the IVP, `pnpm --filter @kitn.ai/blocks test`, `kai add conversation-rail` and `kai add command-trigger` into a scratch Vite app and load them. **Step 5: Commit** — `feat(blocks): the conversation-rail and command-trigger patterns`.

**Verification type:** Playwright IVP + `kai add` into a scratch app.

---

### Task D3: Docs, and the stale spec

**Files:** the `kai-conversations` docs page (find: `grep -rl "kai-conversations" apps/docs/src/content/docs/components`), `apps/docs/src/content/docs/patterns/{conversation-rail,command-trigger}.mdx`, a "Build your own rail" section naming `createRovingTabList`, `docs/superpowers/specs/2026-09-27-rail-primitive-design.md` (a dated status line: "2026-09-29: the mechanism had shipped (`createRovingTabList` in `@kitn.ai/ui`, `createConversationItemsController` in `@kitn.ai/ui/solid`); nested rows moved to 2026-09-29-D").

- [ ] **Step 1**: write; the page leads with the composed form, `conversations` as the preset.
- [ ] **Step 2: Run** docs build, `verify:docs`. **Step 3: Commit** — `docs: compose the conversation rail; the command trigger`.

**Verification type:** docs build.
