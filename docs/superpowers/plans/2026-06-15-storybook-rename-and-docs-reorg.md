# Storybook Rename + Docs Reorg Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. Lands on the existing branch `feat/storybook-docs-ia` (PR #72).

**Goal:** Rename the sidebar groups, split the 512-line Frameworks doc into per-framework + recipe pages, consolidate Theming into one section, and fix outdated doc content.

**Architecture:** A coordinated rename (story titles ↔ generated composed-from story-ids ↔ api-tab matcher/lookup ↔ storySort) followed by a content reorg of the docs MDX. All generated artifacts stay in sync with their generators.

**Context — exact naming map (follow verbatim):**
| Old | New | storyId prefix |
|---|---|---|
| `Web Components/` (root) | `Components/` | `components-` |
| `SolidJS (advanced)/` (root) | `Solid (Advanced)/` | `solid-advanced-` |
| `SolidJS (advanced)/Components/` | `Solid (Advanced)/Elements/` | `solid-advanced-elements-` |
| `SolidJS (advanced)/Primitives/` | `Solid (Advanced)/Primitives/` | `solid-advanced-primitives-` |
| `SolidJS (advanced)/Overview` | `Solid (Advanced)/Overview` | `solid-advanced-overview--docs` |

Storybook sanitizes titles to ids by lowercasing + collapsing non-alphanumerics to `-`: `Solid (Advanced)` → `solid-advanced`; `Components` → `components`.

---

## PHASE A — Rename (coordinated; do A1→A5 in order)

### Task A1: composed-from story-ids → new Solid tier path

**Files:** `scripts/gen-element-api.mjs`, regenerated `src/elements/element-meta.json`, `tests/scripts/composed-from-storyid.test.ts`

- [ ] **Step 1: Update the test regex** in `tests/scripts/composed-from-storyid.test.ts`:
```ts
expect(l.storyId).toMatch(/^solid-advanced-(elements|primitives)-[a-z0-9-]+--docs$/);
```
- [ ] **Step 2: Run it — fails** (current ids are `solidjs-advanced-{components,primitives}-…`). `npx vitest run tests/scripts/composed-from-storyid.test.ts`
- [ ] **Step 3: Update the storyId builder** in `scripts/gen-element-api.mjs` (the composedFrom map):
```js
el.composedFrom = el.composedFrom.map(({ name, group }) => {
  const seg = group === 'UI' ? 'primitives' : 'elements';
  return { name, group, storyId: `solid-advanced-${seg}-${kebabId(name)}--docs` };
});
```
(Only the prefix + the Components→`elements` segment change; keep `kebabId` as-is.)
- [ ] **Step 4: Regenerate + pass.** `node scripts/gen-element-api.mjs`; `npx vitest run tests/scripts/composed-from-storyid.test.ts` → PASS. Spot-check `element-meta.json` ids start `solid-advanced-elements-` / `solid-advanced-primitives-`.
- [ ] **Step 5: Commit** `refactor(spec): composed-from ids -> Solid (Advanced)/Elements tier`

### Task A2: api-tab matcher + WC prefix rename

**Files:** `.storybook/api-tab.tsx`

- [ ] **Step 1:** Change `const WC_PREFIX = 'Web Components/';` → `const WC_PREFIX = 'Components/';`
- [ ] **Step 2:** Update the addon `match` to the new prefixes:
```tsx
match: ({ storyId }) =>
  !!storyId && (
    storyId.startsWith('components-') ||
    storyId.startsWith('solid-advanced-elements-') ||
    storyId.startsWith('solid-advanced-primitives-')
  ),
```
(This keeps the `Solid (Advanced)/Overview` page tab-free, as before. The element lookup `e.displayName === title.slice(WC_PREFIX.length)` and the component lookup-by-last-segment are unchanged and still correct.)
- [ ] **Step 3:** `npm run typecheck` → green.
- [ ] **Step 4: Commit** `refactor(storybook): api tab matches Components/ + Solid (Advanced) ids`

### Task A3: retitle element stories `Web Components/` → `Components/`

**Files:** every `src/elements/*.stories.tsx` with a `Web Components/` title (31 files)

- [ ] **Step 1:** One-off script `scripts/_retitle-wc.mjs`:
```js
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root = process.cwd();
for (const f of readdirSync(resolve(root, 'src/elements')).filter((f) => f.endsWith('.stories.tsx'))) {
  const p = resolve(root, 'src/elements', f);
  const s = readFileSync(p, 'utf8');
  const next = s.replace(/(['"])Web Components\//g, '$1Components/');
  if (next !== s) { writeFileSync(p, next); console.log('retitled', f); }
}
```
- [ ] **Step 2:** `node scripts/_retitle-wc.mjs`; then `grep -rl "Web Components/" src/elements` → no matches. `rm scripts/_retitle-wc.mjs`.
- [ ] **Step 3:** `npm run typecheck` → green.
- [ ] **Step 4: Commit** `refactor(storybook): element stories Web Components/ -> Components/`

### Task A4: retitle Solid stories → Solid (Advanced)/Elements|Primitives + the Overview MDX

**Files:** `src/components/*.stories.tsx` (32), `src/ui/*.stories.tsx` (13), `src/stories/docs/SolidJsAdvanced.mdx`

- [ ] **Step 1:** One-off script `scripts/_retitle-solid2.mjs`:
```js
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root = process.cwd();
const edit = (dir, find, repl) => {
  for (const f of readdirSync(resolve(root, dir)).filter((f) => f.endsWith('.stories.tsx'))) {
    const p = resolve(root, dir, f);
    const s = readFileSync(p, 'utf8');
    const next = s.replace(find, repl);
    if (next !== s) { writeFileSync(p, next); console.log('retitled', f); }
  }
};
edit('src/components', /(['"])SolidJS \(advanced\)\/Components\//g, '$1Solid (Advanced)/Elements/');
edit('src/ui',         /(['"])SolidJS \(advanced\)\/Primitives\//g, '$1Solid (Advanced)/Primitives/');
```
- [ ] **Step 2:** `node scripts/_retitle-solid2.mjs`; verify `grep -rlE "SolidJS \(advanced\)" src/components src/ui` → no matches. `rm scripts/_retitle-solid2.mjs`.
- [ ] **Step 3:** In `src/stories/docs/SolidJsAdvanced.mdx`: change `<Meta title="SolidJS (advanced)/Overview" />` → `<Meta title="Solid (Advanced)/Overview" />`; update body heading `# SolidJS (advanced)` → `# Solid (Advanced)`; the link `?path=/docs/web-components-chat--docs` → `?path=/docs/components-chat--docs`; the bullet "**Components**" → "**Elements**" (keep the description). Keep the framework list (HTML, React, Svelte, Vue, Angular, Solid).
- [ ] **Step 4:** `npm run typecheck` → green.
- [ ] **Step 5: Commit** `refactor(storybook): Solid (Advanced)/Elements + Primitives retitle`

### Task A5: storySort + config comments

**Files:** `.storybook/preview.ts`, `.storybook/manager.ts`

- [ ] **Step 1:** In `preview.ts` `storySort.order`, change the top-level entries:
  - `'Web Components',` → `'Components',`
  - `'SolidJS (advanced)',` → `'Solid (Advanced)',`
  - its sub-order `['Overview', 'Components', 'Primitives']` → `['Overview', 'Elements', 'Primitives']`
- [ ] **Step 2:** Update the storySort prose comment ("Web Components … above the SolidJS (advanced) tier") to the new names.
- [ ] **Step 3:** In `manager.ts`, update the comment referencing "Web Components" / "SolidJS (advanced)" to "Components" / "Solid (Advanced)".
- [ ] **Step 4:** `npm run typecheck` → green; `npm run build-storybook` → completes.
- [ ] **Step 5: Commit** `refactor(storybook): storySort + comments for Components / Solid (Advanced)`

**After Phase A — verify (no commit):** `node scripts/gen-element-api.mjs` leaves the tree clean (generated ids in sync). A Playwright check happens in Phase C.

---

## PHASE B — Docs reorg

### Task B1: split Frameworks doc into per-framework pages (+ fix stale content)

**Files:** create `src/stories/docs/frameworks/{Overview,Html,React,Vue,Svelte,Angular}.mdx`; later delete `src/stories/docs/Integrations.mdx`.

Read `src/stories/docs/Integrations.mdx` (512 lines). Its H2 sections map to new pages. Each new MDX starts with `import { Meta } from '@storybook/addon-docs/blocks';` (match the import other docs use) + `<Meta title="Docs/Frameworks/<Name>" />` + the section content.

- [ ] **Step 1:** `Docs/Frameworks/Overview` ← the intro + "## The #1 rule: properties vs. attributes" section (lines ~5-28). Add a one-line "pick your framework below" pointer. Fix any element count to **41**.
- [ ] **Step 2:** `Docs/Frameworks/HTML` ← "## Plain HTML" + "### Scalar attributes" (lines ~29-99).
- [ ] **Step 3:** `Docs/Frameworks/React` ← "## React" block (lines ~100-231). **UPDATE STALE CONTENT:** `KcChat`→`Chat`, `KcConversations`→`Conversations`, `KcMessage`→`Message` (and any other `Kc*` wrapper import → bare); "All **27** elements have typed wrappers" → "All **41** elements…". Verify imports use `@kitn.ai/chat/react`.
- [ ] **Step 4:** `Docs/Frameworks/Vue` ← "## Vue" (+ TS JSX augment + sidebar+chat) (lines ~232-315). Check for any stale names.
- [ ] **Step 5:** `Docs/Frameworks/Svelte` ← "## Svelte" (lines ~316-353).
- [ ] **Step 6:** `Docs/Frameworks/Angular` ← "## Angular" (lines ~354-410).
- [ ] **Step 7:** `npm run build-storybook` → the 6 new pages compile (no MDX errors). Do NOT delete Integrations.mdx yet (recipes come from it in B2).
- [ ] **Step 8: Commit** `docs(frameworks): split per-framework pages + refresh React names/counts`

### Task B2: extract recipe pages

**Files:** create `src/stories/docs/recipes/{Streaming,TextToSpeech,SpeechToText}.mdx`; delete `src/stories/docs/Integrations.mdx`.

- [ ] **Step 1:** `Docs/Recipes/Streaming (OpenRouter)` ← "## Streaming from OpenRouter" (lines ~411-477).
- [ ] **Step 2:** `Docs/Recipes/Text-to-Speech` ← "## Text-to-speech (TTS)" + sub-sections (lines ~478-509).
- [ ] **Step 3:** `Docs/Recipes/Speech-to-Text` ← "## Speech-to-text" (lines ~510-512).
- [ ] **Step 4:** Delete `src/stories/docs/Integrations.mdx` (`git rm`). Confirm no other file imports/links it.
- [ ] **Step 5:** `npm run build-storybook` → completes; the old "Frameworks & Integrations" page is gone, the new pages present.
- [ ] **Step 6: Commit** `docs(recipes): extract streaming/TTS/STT into a Recipes section`

### Task B3: consolidate Theming

**Files:** `src/stories/docs/Theming.mdx`

- [ ] **Step 1:** Change its `<Meta title="Docs/Theming" />` → `<Meta title="Theming/Overview" />`. (The interactive `Theming/Editor`, `Theming/Token Reference`, `Theming/Typography` stories already live under the top-level `Theming/` group — this moves the prose page in beside them as the landing.)
- [ ] **Step 2:** `npm run build-storybook` → completes.
- [ ] **Step 3: Commit** `docs(theming): move the Theming overview into the Theming section`

### Task B4: storySort for the new doc structure

**Files:** `.storybook/preview.ts`

- [ ] **Step 1:** In the `Docs` sub-order array, replace `'Theming'` and `'Frameworks & Integrations'` entries with:
```js
'Frameworks',
['Overview', 'HTML', 'React', 'Vue', 'Svelte', 'Angular'],
'Recipes',
['Streaming (OpenRouter)', 'Text-to-Speech', 'Speech-to-Text'],
```
keeping `'Introduction', 'Installation', 'Getting Started'` before and `'Accessibility', 'For AI Agents'` after. (Remove the now-moved `'Theming'` from the Docs sub-order.)
- [ ] **Step 2:** In the top-level order, ensure the `'Theming'` group's sub-order leads with Overview: `'Theming', ['Overview', 'Editor', 'Token Reference', 'Typography'],`.
- [ ] **Step 3:** `npm run build-storybook` → completes.
- [ ] **Step 4: Commit** `docs(storybook): storySort for Frameworks/Recipes/Theming`

### Task B5: audit remaining docs for stale content

**Files:** `src/stories/docs/{Introduction,Installation,GettingStarted}.mdx`, `docs/web-components.md`, and any other doc prose.

- [ ] **Step 1:** Grep for stale element counts and names across docs: `grep -rnE "\b27 elements|\b28 |@kitnai|KcChat|KcArtifact|kc-task-list|kc-link-card" src/stories/docs docs README.md`. Fix any real staleness (counts → current 41 elements; old names → current). Do NOT change historical handoff docs under `docs/handoff/`.
- [ ] **Step 2:** Sanity: `grep -rn "Web Components" src/stories/docs` — update prose that referred to the sidebar group name where it now reads oddly (use judgment; "web components" the concept is fine, "the Web Components section" should become "the Components section").
- [ ] **Step 3:** `npm run build-storybook` → completes.
- [ ] **Step 4: Commit** `docs: refresh stale element counts/names across docs`

---

## PHASE C — gate + IVP

### Task C1: full gate

- [ ] `npm run typecheck && npm test && npm run test:react` → green (868+ unit, 5 react; note known pdf-preview stderr noise is not a failure).
- [ ] `npm run build && npm run build-storybook` → succeed.
- [ ] `npm run test:storybook` → a11y green (now in `'error'` mode).
- [ ] `node scripts/gen-element-api.mjs` → tree stays clean (generated ids in sync).

### Task C2: Playwright IVP

- [ ] Build + serve `storybook-static`; drive Playwright. Verify:
  - Sidebar shows **`Components`** (not "Web Components") with friendly element names.
  - **`Solid (Advanced)`** present + collapsed below Components, with sub-groups **`Elements`** and **`Primitives`** (not "Components").
  - An element's API tab still resolves (lookup by displayName under `Components/`) and the framework code-tabs render.
  - A "Composed from" link navigates to a `Solid (Advanced)/Elements/<Name>` story (no 404).
  - `Docs/Frameworks/{React,…}` pages exist and the React page shows bare names (`Chat`, not `KcChat`); `Docs/Recipes/*` present; `Theming/Overview` present beside Editor/Tokens/Typography.
- [ ] Screenshot the sidebar + the React frameworks page.

### Task C3: push

- [ ] Push to `feat/storybook-docs-ia` (updates PR #72). Update the PR body's IA description to the new names/structure. Surface the diff for review.

---

## Self-Review notes
- The rename's risk is story-id consistency: A1 (composed-from), A2 (matcher), A3/A4 (titles) must all agree on `components-` / `solid-advanced-elements-` / `solid-advanced-primitives-`. Phase C2 click-through is the proof.
- `Solid (Advanced)/Elements` is the user's explicit choice for the Solid composed components (inverts the usual "elements = custom elements" sense, but deliberate — removes the "Components" overlap).
- Don't rename the `docs/web-components.md` reference file (out of scope); just fix stale prose inside it.
