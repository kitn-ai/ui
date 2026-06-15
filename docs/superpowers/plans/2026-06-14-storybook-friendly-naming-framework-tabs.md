# Storybook Friendly Naming + Framework Code-Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every web-component element a generated `displayName`, rename the React wrappers from `Kc*` to that bare name, and add per-framework copy-paste code-tabs (HTML/React/Vue/Angular/Solid) to each element's Storybook API tab.

**Architecture:** Extend the existing generated-from-source spec system. `gen-element-api.mjs` (the orchestrator) emits a `displayName` field into `element-meta.json`; the React generator and a new framework-usage generator both read it. A small React `FrameworkTabs` component in the manager-side `.storybook/api-tab.tsx` renders the generated snippets, one framework at a time.

**Tech Stack:** Node ESM generators (TS compiler API), Storybook 10.4 manager addon (React), Vitest, SolidJS element kit.

**Spec:** `docs/superpowers/specs/2026-06-14-storybook-docs-ia-framework-tabs-design.md`

---

### Task 1: Generate `displayName` for every element

**Files:**
- Modify: `scripts/_ts-helpers.mjs` (add export)
- Modify: `scripts/gen-element-api.mjs:149` (add field to pushed element)
- Test: `tests/scripts/display-name.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// tests/scripts/display-name.test.ts
import { describe, expect, it } from 'vitest';
import { displayNameFromClass } from '../../scripts/_ts-helpers.mjs';

describe('displayNameFromClass', () => {
  it('strips the Kc prefix and Element suffix', () => {
    expect(displayNameFromClass('KcArtifactElement')).toBe('Artifact');
  });
  it('preserves interior PascalCase', () => {
    expect(displayNameFromClass('KcChainOfThoughtElement')).toBe('ChainOfThought');
  });
  it('handles names that collide with globals (caller aliases)', () => {
    expect(displayNameFromClass('KcImageElement')).toBe('Image');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/scripts/display-name.test.ts`
Expected: FAIL — `displayNameFromClass` is not exported from `_ts-helpers.mjs`.

- [ ] **Step 3: Add the helper export**

In `scripts/_ts-helpers.mjs`, add at top level (outside `createTsHelpers`):

```js
// Friendly element name shared by the React/Solid wrappers, story titles, and the
// API tab. KcArtifactElement -> Artifact. All element tags start `kc-`, so the
// className always starts `Kc`.
export const displayNameFromClass = (className) =>
  className.replace(/^Kc/, '').replace(/Element$/, '');
```

- [ ] **Step 4: Emit it into element-meta**

In `scripts/gen-element-api.mjs`, import the helper (extend the existing line 14 import):

```js
import { createTsHelpers, displayNameFromClass } from './_ts-helpers.mjs';
```

Then change the `elements.push({...})` at line 149 to include `displayName`:

```js
const className = tagToClass(tag);
elements.push({ tag, className, displayName: displayNameFromClass(className), props, events, composedFrom: composed, tokens });
```

- [ ] **Step 5: Run test + regenerate metadata**

Run: `npx vitest run tests/scripts/display-name.test.ts`
Expected: PASS.
Run: `node scripts/gen-element-api.mjs`
Expected: `✓ frameworks/react/index.tsx — 41 wrappers` and a regenerated `src/elements/element-meta.json`.
Run: `node -e "const m=require('./src/elements/element-meta.json'); console.log(m.find(e=>e.tag==='kc-artifact').displayName)"`
Expected: `Artifact`.

- [ ] **Step 6: Commit**

```bash
git add scripts/_ts-helpers.mjs scripts/gen-element-api.mjs src/elements/element-meta.json frameworks/react/index.tsx tests/scripts/display-name.test.ts
git commit -m "feat(spec): generate displayName for every element"
```

---

### Task 2: Framework-usage snippet generator

**Files:**
- Create: `scripts/gen-framework-usage.mjs`
- Modify: `scripts/gen-element-api.mjs` (call the generator after component-meta is written)
- Create (generated): `src/elements/framework-usage.json`
- Test: `tests/scripts/framework-usage.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// tests/scripts/framework-usage.test.ts
import { describe, expect, it } from 'vitest';
import { buildSnippets } from '../../scripts/gen-framework-usage.mjs';

const artifact = {
  tag: 'kc-artifact',
  displayName: 'Artifact',
  props: [
    { name: 'files', optional: false, scalar: false },
    { name: 'tab', optional: true, scalar: true },
  ],
  events: [{ name: 'navigate', detail: 'string' }],
};

describe('buildSnippets', () => {
  it('imports the bare React name and binds required props', () => {
    const s = buildSnippets(artifact, /* hasSolid */ true);
    expect(s.react).toContain("import { Artifact } from '@kitn.ai/chat/react'");
    expect(s.react).toContain('files={files}');
    expect(s.react).toContain('onNavigate={');
  });
  it('uses the literal tag for HTML, with non-scalar props as JS properties', () => {
    const s = buildSnippets(artifact, true);
    expect(s.html).toContain('<kc-artifact');
    expect(s.html).toContain('el.files =');
    expect(s.html).toContain("addEventListener('navigate'");
  });
  it('uses Vue .prop binding for non-scalar props and Angular bracket binding', () => {
    const s = buildSnippets(artifact, true);
    expect(s.vue).toContain(':files.prop="files"');
    expect(s.angular).toContain('[files]="files"');
  });
  it('omits the Solid snippet when there is no Solid twin', () => {
    const s = buildSnippets(artifact, /* hasSolid */ false);
    expect(s.solid).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/scripts/framework-usage.test.ts`
Expected: FAIL — cannot find module `gen-framework-usage.mjs`.

- [ ] **Step 3: Write the generator**

```js
// scripts/gen-framework-usage.mjs
// Emits src/elements/framework-usage.json — per-element copy-paste snippets for
// HTML/React/Vue/Angular/Solid, rendered one-at-a-time in the API tab's "Usage"
// block. Generated from element-meta (no drift). The Solid snippet is an
// approximation from the element's props/events (not the Solid component's exact
// signature) and only appears when a same-named Solid export exists.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const onName = (ev) => 'on' + ev[0].toUpperCase() + ev.slice(1);
const required = (el) => el.props.filter((p) => !p.optional);

function htmlSnippet(el) {
  const req = required(el);
  const attrs = req.filter((p) => p.scalar).map((p) => ` ${p.name}="…"`).join('');
  const body = [
    ...req.filter((p) => !p.scalar).map((p) => `  el.${p.name} = /* … */;`),
    ...el.events.map((e) => `  el.addEventListener('${e.name}', (e) => console.log(e.detail));`),
  ];
  return [
    `<${el.tag}${attrs}></${el.tag}>`,
    `<script type="module">`,
    `  import '@kitn.ai/chat/elements';`,
    `  const el = document.querySelector('${el.tag}');`,
    ...body,
    `</script>`,
  ].join('\n');
}
function vueSnippet(el) {
  const binds = required(el).map((p) => (p.scalar ? ` :${p.name}="${p.name}"` : ` :${p.name}.prop="${p.name}"`)).join('');
  const evs = el.events.map((e) => ` @${e.name}="${onName(e.name)}"`).join('');
  return `<${el.tag}${binds}${evs} />`;
}
function angularSnippet(el) {
  const binds = required(el).map((p) => ` [${p.name}]="${p.name}"`).join('');
  const evs = el.events.map((e) => ` (${e.name})="${onName(e.name)}($event)"`).join('');
  return `<${el.tag}${binds}${evs}></${el.tag}>`;
}
function jsxSnippet(el, pkg) {
  const binds = required(el).map((p) => ` ${p.name}={${p.name}}`).join('');
  const evs = el.events.map((e) => ` ${onName(e.name)}={(e) => console.log(e.detail)}`).join('');
  return `import { ${el.displayName} } from '${pkg}';\n\n<${el.displayName}${binds}${evs} />`;
}

export function buildSnippets(el, hasSolid) {
  const snippets = {
    html: htmlSnippet(el),
    react: jsxSnippet(el, '@kitn.ai/chat/react'),
    vue: vueSnippet(el),
    angular: angularSnippet(el),
  };
  if (hasSolid) snippets.solid = jsxSnippet(el, '@kitn.ai/chat');
  return snippets;
}

export function writeFrameworkUsage(root, elements) {
  let solidNames = new Set();
  try {
    const comps = JSON.parse(readFileSync(resolve(root, 'src/components/component-meta.json'), 'utf8'));
    solidNames = new Set(comps.map((c) => c.name));
  } catch { /* component-meta not generated yet — no Solid tabs */ }
  const out = elements.map((el) => {
    const hasSolid = solidNames.has(el.displayName);
    return { tag: el.tag, displayName: el.displayName, hasSolid, snippets: buildSnippets(el, hasSolid) };
  });
  writeFileSync(resolve(root, 'src/elements/framework-usage.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`✓ src/elements/framework-usage.json — ${out.length} elements`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/scripts/framework-usage.test.ts`
Expected: PASS (all four cases).

- [ ] **Step 5: Wire the generator into the pipeline**

In `scripts/gen-element-api.mjs`, after the `gen-component-api.mjs` block (around line 237, where `generateComponents` is awaited), add:

```js
const { writeFrameworkUsage } = await import('./gen-framework-usage.mjs');
writeFrameworkUsage(root, elements);
```

(Placing it after component-meta generation means `component-meta.json` exists on disk, so the Solid-twin detection is accurate.)

- [ ] **Step 6: Regenerate + sanity-check output**

Run: `node scripts/gen-element-api.mjs`
Expected: `✓ src/elements/framework-usage.json — 41 elements`.
Run: `node -e "const u=require('./src/elements/framework-usage.json').find(x=>x.tag==='kc-artifact'); console.log('hasSolid:', u.hasSolid); console.log(u.snippets.react)"`
Expected: `hasSolid: true` and a React snippet whose first line is `import { Artifact } from '@kitn.ai/chat/react';`

- [ ] **Step 7: Commit**

```bash
git add scripts/gen-framework-usage.mjs scripts/gen-element-api.mjs src/elements/framework-usage.json tests/scripts/framework-usage.test.ts
git commit -m "feat(spec): generate per-framework usage snippets"
```

---

### Task 3: Rename React wrappers `Kc*` → bare friendly name

**Files:**
- Modify: `scripts/gen-element-react.mjs` (use `el.displayName`)
- Regenerated: `frameworks/react/index.tsx`
- Modify: `scripts/gen-llms.mjs` (Framework-wiring example), `examples/react/**`, any `docs/**` that imports `Kc*` from `/react`
- Test: `tests/scripts/react-wrappers.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// tests/scripts/react-wrappers.test.ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../../frameworks/react/index.tsx', import.meta.url), 'utf8');

describe('generated React wrappers', () => {
  it('exports bare friendly names, not Kc-prefixed', () => {
    expect(src).toContain('export const Artifact = createWebComponent<ArtifactProps>(');
    expect(src).not.toContain('export const KcArtifact ');
  });
  it('still binds to the kc- custom element tag', () => {
    expect(src).toMatch(/export const Artifact[\s\S]*?'kc-artifact'/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/scripts/react-wrappers.test.ts`
Expected: FAIL — current output has `export const KcArtifact`.

- [ ] **Step 3: Update the generator to use `displayName`**

In `scripts/gen-element-react.mjs`, replace the three `el.className.replace(...)` expressions in the returned block:

```js
const name = el.displayName;
const propsName = `${name}Props`;
return `export interface ${propsName} extends WebComponentProps {
${[...propLines, ...eventLines].join('\n')}
}

export const ${name} = createWebComponent<${propsName}>(
  '${el.tag}',
  ${propNames},
  ${eventMap},
);`;
```

Also update the example comment in the generated header to the new name:

```js
//   import { Message } from '@kitn.ai/chat/react';
//   <Message message={msg} onMessageaction={(e) => …} />
```

- [ ] **Step 4: Regenerate + run test**

Run: `node scripts/gen-element-api.mjs`
Run: `npx vitest run tests/scripts/react-wrappers.test.ts`
Expected: PASS.

- [ ] **Step 5: Sweep consumers of the old names**

Find every remaining `Kc*` import from the React entry:

Run: `grep -rnE "from ['\"]@kitn\.ai/chat/react['\"]" examples docs README.md 2>/dev/null; grep -rnE "\bKc[A-Z][A-Za-z]+\b" examples/react scripts/gen-llms.mjs docs 2>/dev/null`

For each hit, rename `KcFoo` → `Foo` (drop the `Kc`). In `examples/react`, alias the global collision: `import { Image as KcImage } from '@kitn.ai/chat/react'`. In `scripts/gen-llms.mjs`, update the `## Framework wiring` React example to the bare name.

- [ ] **Step 6: Verify build + types are green**

Run: `npm run build && npm run typecheck`
Expected: build succeeds; no TS errors. (If `examples/react` is in a separate tsconfig, run its typecheck too.)

- [ ] **Step 7: Commit**

```bash
git add scripts/gen-element-react.mjs frameworks/react/index.tsx scripts/gen-llms.mjs examples docs tests/scripts/react-wrappers.test.ts
git commit -m "feat!(react): rename wrappers Kc<Name> -> <Name> to match Solid"
```

---

### Task 4: Framework code-tabs in the API tab

**Files:**
- Modify: `.storybook/api-tab.tsx` (WC lookup by `displayName`; add `FrameworkTabs`)

- [ ] **Step 1: Import the generated snippets**

Near the top of `.storybook/api-tab.tsx` (after the `componentMeta` import):

```tsx
import frameworkUsage from '../src/elements/framework-usage.json';

type Usage = { tag: string; displayName: string; hasSolid: boolean; snippets: Record<string, string> };
const usageByTag = new Map((frameworkUsage as Usage[]).map((u) => [u.tag, u]));

const FRAMEWORKS: { key: string; label: string }[] = [
  { key: 'html', label: 'HTML' },
  { key: 'react', label: 'React' },
  { key: 'vue', label: 'Vue' },
  { key: 'angular', label: 'Angular' },
  { key: 'solid', label: 'Solid' },
];
// Remembered across elements within a session, so a React dev picks "React" once.
let lastFramework = 'html';
```

- [ ] **Step 2: Add the `FrameworkTabs` component**

Add above `ElementPanel`:

```tsx
function FrameworkTabs({ tag }: { tag: string }) {
  const { h3, mblock } = useStyles();
  const theme = useTheme();
  const u = usageByTag.get(tag);
  const [fw, setFw] = React.useState(lastFramework);
  if (!u) return null;
  const tabs = FRAMEWORKS.filter((f) => f.key !== 'solid' || u.hasSolid);
  const active = u.snippets[fw] ? fw : 'html';
  const select = (k: string) => { lastFramework = k; setFw(k); };
  return (
    <>
      <h3 style={h3}>Usage</h3>
      <div role="tablist" aria-label="Framework" style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {tabs.map((f) => (
          <button key={f.key} role="tab" type="button" aria-selected={active === f.key}
            onClick={() => select(f.key)}
            style={{
              font: 'inherit', fontSize: 12, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
              border: `1px solid ${theme.appBorderColor}`,
              background: active === f.key ? theme.barSelectedColor : 'transparent',
              color: active === f.key ? theme.barBg ?? '#fff' : theme.barTextColor,
            }}>
            {f.label}
          </button>
        ))}
      </div>
      <pre style={{ ...mblock, whiteSpace: 'pre', overflowX: 'auto' }}>{u.snippets[active]}</pre>
    </>
  );
}
```

- [ ] **Step 3: Render it at the top of `ElementPanel`**

In `ElementPanel`, immediately after the element heading/description (before the `Props` `<h3>`), add:

```tsx
<FrameworkTabs tag={el.tag} />
```

- [ ] **Step 4: Switch the WC lookup to `displayName`**

In `ApiPanel`, change:

```tsx
const el = elements.find((e) => e.tag === title.slice(WC_PREFIX.length));
```

to:

```tsx
const el = elements.find((e) => e.displayName === title.slice(WC_PREFIX.length));
```

(Element-meta now carries `displayName`; story titles become `Web Components/<displayName>` in Task 5. The `ElementSpec` type already needs the field — add `displayName: string;` to that type.)

- [ ] **Step 5: Add `displayName` to the `ElementSpec` type**

In the `type ElementSpec = {...}` near the top, add `displayName: string;`.

- [ ] **Step 6: Manual verification**

Run: `npm run storybook`
Open a Web Components element's **API** tab. Expected: a "Usage" block with HTML/React/Vue/Angular tabs (Solid present where a twin exists); clicking a tab swaps the snippet; the choice persists when you navigate to another element. (Note: Task 5 retitles the stories — until then the lookup-by-`displayName` returns "No API spec"; that's expected mid-task and fixed in Task 5. To eyeball Task 4 alone, temporarily render `FrameworkTabs` against `kc-artifact`.)

- [ ] **Step 7: Commit**

```bash
git add .storybook/api-tab.tsx
git commit -m "feat(storybook): per-framework usage code-tabs on the API tab"
```

---

### Task 5: Retitle element stories to friendly names

**Files:**
- Modify: every `src/elements/*.stories.tsx` (`Web Components/kc-foo` → `Web Components/Foo`)
- Create (throwaway): `scripts/_retitle-elements.mjs` (run once, then delete)

- [ ] **Step 1: Write the one-off retitle script**

```js
// scripts/_retitle-elements.mjs — run once; rewrites element story titles to friendly names.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root = process.cwd();
const meta = JSON.parse(readFileSync(resolve(root, 'src/elements/element-meta.json'), 'utf8'));
const byTag = new Map(meta.map((e) => [e.tag, e.displayName]));
for (const f of readdirSync(resolve(root, 'src/elements')).filter((f) => f.endsWith('.stories.tsx'))) {
  const p = resolve(root, 'src/elements', f);
  let s = readFileSync(p, 'utf8');
  const next = s.replace(/Web Components\/(kc-[a-z0-9-]+)/g, (m, tag) => byTag.has(tag) ? `Web Components/${byTag.get(tag)}` : m);
  if (next !== s) { writeFileSync(p, next); console.log('retitled', f); }
}
```

- [ ] **Step 2: Run it**

Run: `node scripts/_retitle-elements.mjs`
Expected: ~41 `retitled ...` lines.
Run: `grep -rl "Web Components/kc-" src/elements`
Expected: no matches (all converted).

- [ ] **Step 3: Delete the throwaway script**

Run: `rm scripts/_retitle-elements.mjs`

- [ ] **Step 4: Verify the API tab resolves under the new titles**

Run: `npm run storybook`
Open `Web Components/Artifact` → **API** tab. Expected: the spec + the Usage code-tabs render (the `displayName` lookup from Task 4 now matches). Confirm the sidebar reads friendly names (`Artifact`, `Message`, …), and the `match` for the API tab still fires (story ids stay `web-components-*`).

- [ ] **Step 5: Commit**

```bash
git add src/elements
git commit -m "refactor(storybook): element story titles use friendly names"
```

---

### Task 6: Full gate + version bump

**Files:** none (verification)

- [ ] **Step 1: Run the full gate**

Run: `npm run build && npm run typecheck && npm run test && npm run test:react`
Expected: all green (unit + react). Investigate any failure before proceeding — do not claim done on a red gate.

- [ ] **Step 2: Run the Storybook a11y gate**

Run: `npm run test-storybook` (or the project's configured a11y test command)
Expected: 0 new violations (the new tab buttons have `role="tab"`/`aria-selected`; the `tablist` has `aria-label`).

- [ ] **Step 3: Confirm the version bump path**

The React rename is breaking → release-please will cut a **minor** (pre-1.0). Confirm the `feat!` commit from Task 3 is present in the branch history so release-please picks it up. Do NOT hand-edit `package.json` ([[version-bump-each-change]]).

- [ ] **Step 4: Surface the diff for review before any push/merge**

Per [[review-before-commit]]: show the full diff summary and wait for approval before pushing or opening a PR.

---

## Notes for the implementer

- The Solid snippet is intentionally an approximation (element props/events, not the Solid component signature). Do not try to thread the Solid component's exact prop types in — that's out of scope per the spec.
- `theme.barBg`/`barSelectedColor`/`appBorderColor` are standard Storybook theme fields; if a value reads wrong in dark mode, match the colors already used by `useStyles()` rather than inventing new ones.
- Task 4 and Task 5 are interdependent (lookup-by-`displayName` ↔ friendly titles). If reviewing per-task, expect the API tab to show "No API spec" for elements between Task 4 and Task 5 — that is the documented intermediate state, not a bug.
