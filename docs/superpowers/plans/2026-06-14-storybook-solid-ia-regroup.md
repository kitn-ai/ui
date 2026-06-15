# Storybook SolidJS Tier Regroup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Demote the SolidJS components + UI primitives into a single, clearly subordinate `SolidJS (advanced)/` tier (Components + Primitives), hidden from the default sidebar, so Web Components is the obvious primary surface — without breaking the generated "Composed from" links or the API tab.

**Architecture:** Retitle the `Components/*` and `UI/*` stories under `SolidJS (advanced)/…`; move the generated composed-from story-ids in lockstep; broaden the API tab matcher and switch its component lookup to match by name; hide the tier by default with a manager-side sidebar filter plus a toolbar toggle.

**Tech Stack:** Storybook 10.4 manager addon (React), Node ESM generators, SolidJS stories.

**Spec:** `docs/superpowers/specs/2026-06-14-storybook-docs-ia-framework-tabs-design.md`

**Depends on:** Plan `2026-06-14-storybook-friendly-naming-framework-tabs.md` (run that first).

---

### Task 1: Move composed-from story-ids to the new tier path

**Files:**
- Modify: `scripts/gen-element-api.mjs` (the `composedFrom` storyId builder, ~line 161)
- Regenerated: `src/elements/element-meta.json`
- Test: `tests/scripts/composed-from-storyid.test.ts` (create)

Story-ids derive from titles. After the regroup, `Components/Message` becomes `SolidJS (advanced)/Components/Message` → story-id `solidjs-advanced-components-message`, and `UI/Button` becomes `SolidJS (advanced)/Primitives/Button` → `solidjs-advanced-primitives-button` (note: the `UI` meta group maps to the `Primitives` path segment). The generated composed-from links must point at the new ids.

- [ ] **Step 1: Write the failing test**

```ts
// tests/scripts/composed-from-storyid.test.ts
import { describe, expect, it } from 'vitest';
import meta from '../../src/elements/element-meta.json';

describe('composedFrom story ids', () => {
  it('points at the SolidJS (advanced) tier path', () => {
    const links = (meta as any[]).flatMap((e) => e.composedFrom);
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) {
      expect(l.storyId).toMatch(/^solidjs-advanced-(components|primitives)-[a-z0-9]+--docs$/);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/scripts/composed-from-storyid.test.ts`
Expected: FAIL — current ids look like `components-message--docs`.

- [ ] **Step 3: Update the storyId builder**

In `scripts/gen-element-api.mjs`, change the `composedFrom` mapping (~line 159–164):

```js
for (const el of elements) {
  el.composedFrom = el.composedFrom.map(({ name, group }) => {
    const seg = group === 'UI' ? 'primitives' : 'components';
    return { name, group, storyId: `solidjs-advanced-${seg}-${kebabId(name)}--docs` };
  });
}
```

- [ ] **Step 4: Regenerate + run test**

Run: `node scripts/gen-element-api.mjs`
Run: `npx vitest run tests/scripts/composed-from-storyid.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/gen-element-api.mjs src/elements/element-meta.json tests/scripts/composed-from-storyid.test.ts
git commit -m "refactor(spec): composed-from links target the SolidJS (advanced) tier"
```

---

### Task 2: API-tab matcher + lookup for the new tier

**Files:**
- Modify: `.storybook/api-tab.tsx`

The component lookup currently reads `const [group, name] = title.split('/')` and matches `c.group === group && c.name === name`. Under the new titles the first segment is `SolidJS (advanced)`, the group label may be `Primitives` (meta group `UI`), and the component name is the **last** segment. Match by name instead, and broaden the tab's `match`.

- [ ] **Step 1: Match by last path segment**

In `ApiPanel`, replace the `else if (title)` component branch:

```tsx
} else if (title) {
  const segs = title.split('/');
  const name = segs[segs.length - 1];
  const comp = components.find((c) => c.name === name);
  if (comp) return <Wrap><ComponentPanel comp={comp} /></Wrap>;
  // Compound family (e.g. ".../Resizable") — render every member.
  const family = components.filter((c) => c.name.startsWith(name));
  if (family.length > 0) return <Wrap>{family.map((c) => <ComponentPanel key={c.name} comp={c} />)}</Wrap>;
}
```

- [ ] **Step 2: Broaden the tab `match`**

Change the addon `match` to fire on the new tier prefix:

```tsx
match: ({ storyId }) =>
  !!storyId && (storyId.startsWith('web-components-') || storyId.startsWith('solidjs-advanced-')),
```

- [ ] **Step 3: Remove now-dead matcher helpers**

Delete the now-unused `storyKey`, `componentPrefixes`, and `matchesComponentStory` definitions (the broadened `match` replaces them). Run a typecheck to confirm nothing else references them.

Run: `npm run typecheck`
Expected: no errors / no unused-symbol complaints.

- [ ] **Step 4: Commit**

```bash
git add .storybook/api-tab.tsx
git commit -m "refactor(storybook): API tab matches the SolidJS (advanced) tier by name"
```

---

### Task 3: Retitle the SolidJS Components stories

**Files:**
- Modify: every `src/components/*.stories.tsx`
- Create (throwaway): `scripts/_retitle-solid.mjs`

- [ ] **Step 1: Write the one-off retitle script**

```js
// scripts/_retitle-solid.mjs — run once; moves Solid component/UI stories under the
// SolidJS (advanced) tier. Components/* -> SolidJS (advanced)/Components/*,
// UI/* -> SolidJS (advanced)/Primitives/*.
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
edit('src/components', /title:\s*(['"])Components\//g, "title: $1SolidJS (advanced)/Components/");
edit('src/ui', /title:\s*(['"])UI\//g, "title: $1SolidJS (advanced)/Primitives/");
```

- [ ] **Step 2: Run it for Components**

Run: `node scripts/_retitle-solid.mjs`
Expected: `retitled ...` lines for every `Components/`- and `UI/`-prefixed story.
Run: `grep -rlE "title:\s*['\"]Components/" src/components; grep -rlE "title:\s*['\"]UI/" src/ui`
Expected: no matches.

- [ ] **Step 3: Handle the one non-standard title manually**

`src/components/conversation-item.stories.tsx` uses `title: 'How to use SolidJS signals'` (a teaching story, not under `Components/`). Retitle it by hand to `SolidJS (advanced)/Components/ConversationItem` so it joins the tier and its API tab resolves.

- [ ] **Step 4: Delete the throwaway script**

Run: `rm scripts/_retitle-solid.mjs`

- [ ] **Step 5: Verify**

Run: `npm run storybook`
Expected: `Components/*` and `UI/*` no longer appear at top level; they live under `SolidJS (advanced)/Components` and `SolidJS (advanced)/Primitives`. Open `Web Components/Artifact` → API tab → click a "Composed from" link → it resolves to the moved Solid component story (no 404), and that story's API tab renders.

- [ ] **Step 6: Commit**

```bash
git add src/components src/ui
git commit -m "refactor(storybook): regroup SolidJS components + primitives under an advanced tier"
```

---

### Task 4: Hide the SolidJS tier by default (+ toolbar toggle)

**Files:**
- Modify: `.storybook/manager.ts`

> **Verify the exact Storybook 10.4 filter API against context7 docs before coding this task** (search `storybook experimental_setFilter sidebar tags`). The shape below is the expected `experimental_setFilter` form; adjust to the confirmed signature.

- [ ] **Step 1: Register a default-on filter that hides the tier**

In `.storybook/manager.ts`:

```ts
import { addons } from 'storybook/manager-api';

const TIER = 'SolidJS (advanced)';
let showSolid = false;

addons.register('kitn/solid-tier', (api) => {
  const apply = () =>
    api.experimental_setFilter('kitn/solid-tier', (item) =>
      showSolid || !item.title?.startsWith(TIER),
    );
  apply();

  // Toolbar toggle so a SolidJS author can reveal the tier.
  addons.add('kitn/solid-tier/toggle', {
    title: 'SolidJS layer',
    type: 'tool' as any,
    render: () => null, // replace with a small toggle button that flips showSolid + calls apply()
  });
});
```

(If a toolbar button is more than you want now, ship the default-hide filter alone and add the toggle later — the core requirement is that the tier is hidden by default.)

- [ ] **Step 2: Restart Storybook (manager addons need a full restart, not HMR)**

Run: stop and re-run `npm run storybook`.
Expected: the `SolidJS (advanced)` tier is absent from the default sidebar; `Docs/`, `Web Components/`, `Examples/`, `Patterns/` remain. Toggling reveals/hides the tier.

- [ ] **Step 3: Commit**

```bash
git add .storybook/manager.ts
git commit -m "feat(storybook): hide the SolidJS (advanced) tier from the default sidebar"
```

---

### Task 5: SolidJS tier landing page

**Files:**
- Create: `src/stories/docs/SolidJsAdvanced.mdx`

- [ ] **Step 1: Write the landing MDX**

```mdx
import { Meta } from '@storybook/addon-docs/blocks';

<Meta title="SolidJS (advanced)/Overview" />

# SolidJS (advanced)

**Most people want the [Web Components](?path=/docs/web-components-chat--docs).** This tier is
only for building a **custom chat UI in SolidJS** — the kit is authored in SolidJS, and these
are the same building blocks the web components compose from.

- **Components** — the composed SolidJS pieces (message, tool, reasoning, …). Each maps to a
  `kc-*` element; reach for these only if you're assembling your own layout in Solid.
- **Primitives** — the low-level base components (button, tooltip, dropdown, …) the components
  are built on. You rarely use these directly.

Using a web component instead? Every element's **API** tab has copy-paste examples for
HTML, React, Vue, Angular, and Solid.
```

- [ ] **Step 2: Verify it lands at the top of the tier**

Run: `npm run storybook` (with the SolidJS tier revealed)
Expected: `SolidJS (advanced)/Overview` renders the signpost; the cross-link to Web Components resolves.

- [ ] **Step 3: Commit**

```bash
git add src/stories/docs/SolidJsAdvanced.mdx
git commit -m "docs(storybook): SolidJS (advanced) tier landing + signpost"
```

---

### Task 6 (optional): Collapse duplicate Solid stories

**Files:**
- Modify: the ~25 `src/components/*.stories.tsx` that duplicate a `kc-*` element

The default-hide already removes the SolidJS tier from view, so this is tidiness inside the
hidden tier, not load-bearing. Do it only if the reviewer wants a leaner tier.

The duplicates (have a `kc-*` twin): `code-block, artifact, model-switcher, thinking-bar, markdown, source, attachments, confirm-card, conversation-list, empty, checkpoint, text-shimmer, tasks-card, loader, file-upload, message-skills, file-tree, prompt-input, tool, chain-of-thought, voice-input, image, message, reasoning, feedback-bar`.

Keep (Solid-only, no twin — leave their fuller stories): `conversation-item, chat-container, scroll-button, slash-command, message-narrow` (+ `context`, `prompt-suggestion` if they genuinely differ from their near-twin element).

- [ ] **Step 1: For each duplicate file, reduce to a single representative story**

Keep the primary `Default`/first named export; remove the extra variant exports. Do NOT delete the file (the API tab + composed-from links attach to its story id).

- [ ] **Step 2: Verify nothing broke**

Run: `npm run storybook` (tier revealed)
Expected: each collapsed component still has exactly one story + a working API tab; composed-from links still resolve.

- [ ] **Step 3: Commit**

```bash
git add src/components
git commit -m "refactor(storybook): collapse duplicate SolidJS stories to one each"
```

---

### Task 7: Full gate + review

**Files:** none (verification)

- [ ] **Step 1: Run the full gate**

Run: `npm run build && npm run typecheck && npm run test && npm run test:react`
Expected: all green. Investigate any failure before claiming done.

- [ ] **Step 2: Storybook a11y gate**

Run: `npm run test-storybook` (or the configured a11y command)
Expected: 0 new violations.

- [ ] **Step 3: Eyeball the final IA**

Run: `npm run storybook`
Expected sidebar (default): `Docs/`, `Web Components/` (friendly names), `Examples/`, `Patterns/` — no SolidJS tier until toggled. With the toggle on: `SolidJS (advanced)/Overview`, `/Components`, `/Primitives`.

- [ ] **Step 4: Surface the diff for review before any push/merge**

Per [[review-before-commit]]: show the full diff and wait for approval before pushing or opening a PR. Version bump is patch/minor (additive reorg) via release-please — do not hand-edit `package.json`.

---

## Notes for the implementer

- Tasks 1–3 are interdependent: the composed-from ids (Task 1), the matcher (Task 2), and the titles (Task 3) must all agree on `solidjs-advanced-{components,primitives}-…`. If reviewing per-task, expect composed-from links to 404 between Task 1 and Task 3 — that's the documented intermediate state.
- Title-prefix filtering (Task 4) is used instead of per-story `tags: ['solid']` to avoid editing every story file. Adding `tags` later (for the sidebar funnel UI) is a clean follow-up, not required here.
- Storybook version is 10.4.2; manager addon changes require a full Storybook restart (HMR won't pick them up).
