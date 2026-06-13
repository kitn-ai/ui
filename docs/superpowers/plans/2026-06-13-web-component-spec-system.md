# Web-Component Spec System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deterministically generate a complete per-element spec (properties · values · defaults · events+detail · tokens · "composed from") for every `kitn-*` web component, and surface it in `docs/web-components.md` + each element's Storybook autodocs, with live Controls for scalar props.

**Architecture:** Extend the existing TS-compiler-based generator (`scripts/gen-element-api.mjs`) to emit a richer model (`element-meta.json`); drive a Solid `<ElementSpec>` Storybook doc-component + an `argTypesFor()` Controls helper + a marker-based `web-components.md` table rewriter from that single model. Declare typed `Events` maps on the dispatching facades so event `detail` shapes (and `dispatch()` type-checking) come for free.

**Tech Stack:** TypeScript compiler API, SolidJS, Storybook (`storybook-solidjs-vite`), Node ESM scripts.

**Branch:** `feat/web-component-spec-system`.

**Spec:** `docs/superpowers/specs/2026-06-13-web-component-spec-system-design.md`.

**Verification reality:** the kit verifies generators by running them + asserting on output, typecheck, and Storybook screenshots — not heavy unit tests. Baseline test failures = 3 pre-existing Shiki cases in `tests/primitives/highlighter.test.ts`. SolidJS: never destructure props.

---

### Task 1: Generator — extract prop defaults + always-write `element-meta.json`

**Files:**
- Modify: `scripts/gen-element-api.mjs`
- Modify: `src/elements/element-meta.json` (newly generated; commit it like `element-types.d.ts`)

The generator parses `defineKitnElement(tag, propDefaults, facade)`. It reads the `Props` type (`node.typeArguments[0]`) but ignores `propDefaults` (`node.arguments[1]`). Add default extraction, and write the model to a tracked `element-meta.json` on every run (not just under `DUMP`).

- [ ] **Step 1: Add a default-literal reader near the other helpers** (after `membersOf`, ~line 94):

```js
// Render a propDefaults object-literal property value to a short display string.
function defaultText(initializer) {
  if (!initializer) return undefined;
  if (ts.isStringLiteralLike(initializer)) return `'${initializer.text}'`;
  if (initializer.kind === ts.SyntaxKind.TrueKeyword) return 'true';
  if (initializer.kind === ts.SyntaxKind.FalseKeyword) return 'false';
  if (ts.isNumericLiteral(initializer)) return initializer.text;
  if (initializer.kind === ts.SyntaxKind.UndefinedKeyword || initializer.getText() === 'undefined') return undefined;
  if (ts.isArrayLiteralExpression(initializer)) return initializer.elements.length ? '[…]' : '[]';
  if (ts.isObjectLiteralExpression(initializer)) return '{…}';
  return initializer.getText();
}
// Map prop name -> default display string from the propDefaults object literal (arg 1).
function defaultsFrom(objLiteralNode) {
  const out = {};
  if (objLiteralNode && ts.isObjectLiteralExpression(objLiteralNode)) {
    for (const p of objLiteralNode.properties) {
      if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) {
        out[p.name.text] = defaultText(p.initializer);
      }
    }
  }
  return out;
}
```

- [ ] **Step 2: Attach defaults to props in the `defineKitnElement` visitor.** In the visitor (the block starting `const tag = tagArg.text;`), after `const props = membersOf(node.typeArguments?.[0]);` add:

```js
const defaults = defaultsFrom(node.arguments[1]);
for (const p of props) p.default = defaults[p.name];
```

- [ ] **Step 3: Always write `src/elements/element-meta.json`.** Replace the `if (process.env.DUMP) { … }` block (~line 188) with an unconditional write to a tracked path:

```js
writeFileSync(resolve(root, 'src/elements/element-meta.json'), JSON.stringify(elements, null, 2) + '\n');
console.log(`✓ src/elements/element-meta.json — ${elements.length} elements`);
```

- [ ] **Step 4: Run the generator and verify defaults land.**

Run: `npm run build`
Then: `node -e "const m=require('./src/elements/element-meta.json'); const c=m.find(e=>e.tag==='kitn-chat'); console.log(c.props.find(p=>p.name==='placeholder'))"`
Expected: prints an object with `default: "'Send a message...'"` and `scalar: true`.

- [ ] **Step 5: Commit.**

```bash
git add scripts/gen-element-api.mjs src/elements/element-meta.json
git commit -m "feat(gen): extract prop defaults + always emit element-meta.json"
```

---

### Task 2: Generator — `composedFrom` links + component tokens

**Files:**
- Modify: `scripts/gen-element-api.mjs`
- Modify: `src/elements/element-meta.json` (regenerated)

- [ ] **Step 1: Add a per-file import collector + storyId helper** (near `dispatchNames`, ~line 96):

```js
// Storybook toId: lowercase, non-alphanumerics → nothing (matches our story titles).
const kebabId = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
// Collect { name, group } for imports from ../components/ or ../ui/ in a facade file.
const composedImports = (sourceFile) => {
  const out = [];
  for (const st of sourceFile.statements) {
    if (!ts.isImportDeclaration(st) || !st.importClause?.namedBindings) continue;
    const spec = st.moduleSpecifier.text;
    const group = spec.startsWith('../components/') ? 'Components'
                : spec.startsWith('../ui/') ? 'UI' : null;
    if (!group) continue;
    const named = st.importClause.namedBindings;
    if (ts.isNamedImports(named)) {
      for (const el of named.elements) {
        const name = el.name.text;
        if (/^[A-Z]/.test(name)) out.push({ name, group }); // components, not types/utils starting lowercase
      }
    }
  }
  return out;
};
```

- [ ] **Step 2: Add the curated component-token map** (top-level, near `SKIP`):

```js
// The few elements with element-specific tokens; everything else is themed by
// the global token set (see the Theming → Token Reference story).
const COMPONENT_TOKENS = {
  'kitn-tool': ['--color-tool-blue', '--color-tool-amber', '--color-tool-green', '--color-tool-red'],
  'kitn-code-block': ['--color-code-foreground'],
  'kitn-conversation-list': ['--color-sidebar', '--color-scrollbar-thumb'],
};
```

- [ ] **Step 3: Attach `composedFrom` + `tokens` in the visitor.** After the `events` array is built (before `elements.push(...)`), compute:

```js
const validTags = null; // resolved after the loop; see Step 4
const composed = composedImports(sf);
const tokens = COMPONENT_TOKENS[tag] ?? [];
elements.push({ tag, className: tagToClass(tag), props, events, composedFrom: composed, tokens });
```

- [ ] **Step 4: Resolve story ids after the loop** (after `elements.sort(...)`, ~line 140). Component story ids only exist for components that have a story; we map by name and let the renderer drop unknowns. Map every composed import to a tentative storyId:

```js
for (const el of elements) {
  el.composedFrom = el.composedFrom.map(({ name, group }) => ({
    name, group,
    storyId: `${group.toLowerCase()}-${kebabId(name)}--docs`,
  }));
}
```

(The Storybook renderer in Task 4 links these; a wrong id simply 404s in-app, which is acceptable for v1. Internal-only components like `ChatThread` still get a row, just a possibly-dead link — the renderer renders the name as plain text when there's no matching story; see Task 4 Step 1.)

- [ ] **Step 5: Add the new fields to the CEM emit** so the manifest carries them too. In the `declarations:` map (~line 153), add to each declaration object:

```js
cssProperties: el.tokens.map((name) => ({ name })),
```

(Leave `composedFrom` out of the CEM — it's not a standard CEM field; it lives in `element-meta.json` only.)

- [ ] **Step 6: Rebuild + verify.**

Run: `npm run build`
Then: `node -e "const m=require('./src/elements/element-meta.json'); const w=m.find(e=>e.tag==='kitn-chat-workspace'); console.log('composedFrom:', w.composedFrom.map(c=>c.name)); const t=m.find(e=>e.tag==='kitn-tool'); console.log('tool tokens:', t.tokens)"`
Expected: `composedFrom` includes `ChatThread`, `ConversationList`, `ResizablePanel…`; tool tokens = the 4 `--color-tool-*`.

- [ ] **Step 7: Commit.**

```bash
git add scripts/gen-element-api.mjs src/elements/element-meta.json dist/custom-elements.json
git commit -m "feat(gen): add composedFrom links + component tokens to element spec"
```

---

### Task 3: Declare typed `Events` maps on the 4 flagship facades

**Files:**
- Modify: `src/elements/chat.tsx`, `src/elements/chat-workspace.tsx`, `src/elements/conversation-list.tsx`, `src/elements/prompt-input.tsx`
- Modify: `src/elements/element-meta.json` (regenerated)

Use the **already-curated detail shapes** in `docs/web-components.md` (grep the element's `### ` section) as the source of truth for each event's `detail` type and description. Pattern for each facade: declare an `Events` interface (one field per dispatched event, JSDoc = description) and pass it as the 2nd generic.

- [ ] **Step 1: Add the `Events` interface to `src/elements/chat-workspace.tsx`** (after the `Props` interface), matching the events it dispatches:

```ts
interface Events {
  /** A conversation was selected in the sidebar. */
  conversationselect: { id: string };
  /** The "New chat" button was clicked. */
  newchat: Record<string, never>;
  /** The sidebar was collapsed or expanded. */
  sidebartoggle: { collapsed: boolean };
  /** User submitted a message. */
  submit: { value: string; attachments: AttachmentData[] };
  /** Fired on every input change. */
  valuechange: { value: string };
  /** The header model switcher changed. */
  modelchange: { modelId: string };
  /** An action button on a message was clicked. */
  messageaction: { messageId: string; action: ChatMessageAction };
  /** The Search button was clicked. */
  search: Record<string, never>;
  /** The Mic / voice button was clicked. */
  voice: Record<string, never>;
  /** A slash command was chosen from the palette. */
  slashselect: { command: SlashCommandItem };
  /** A suggestion chip was clicked (only in `suggestion-mode="fill"`). */
  suggestionclick: { value: string };
}
```

Import the referenced types at the top if not already present:
`import type { AttachmentData } from '../components/attachments';` and `ChatMessageAction` from `./chat-types`, `SlashCommandItem` from `../components/slash-command`. Then change the call to `defineKitnElement<Props, Events>('kitn-chat-workspace', …)`.

- [ ] **Step 2: Run typecheck — fix any real `dispatch` mismatches.**

Run: `npm run typecheck`
Expected: PASS. `dispatch` is now `(type: keyof Events, detail?: Events[type])`, so any `dispatch('submit', {…wrong…})` becomes an error. If errors appear, they are real payload bugs — fix the dispatch call or the interface to match the actual runtime payload. (For `Record<string, never>` events, `dispatch('search', {})` is valid.)

- [ ] **Step 3: Repeat for `chat.tsx`** — same events minus the list-specific ones (`conversationselect`, `newchat`, `sidebartoggle`): declare `Events` with `submit`/`valuechange`/`suggestionclick`/`messageaction`/`modelchange`/`slashselect`/`search`/`voice` (copy the matching fields from Step 1) and pass `<Props, Events>`. Grep `docs/web-components.md` §`<kitn-chat>` to confirm the exact set.

- [ ] **Step 4: `conversation-list.tsx`** — declare:

```ts
interface Events {
  /** A conversation was selected. */
  select: { id: string };
  /** The "New chat" button was clicked. */
  newchat: Record<string, never>;
  /** The sidebar toggle was clicked. */
  togglesidebar: Record<string, never>;
}
```
and pass `<Props, Events>`.

- [ ] **Step 5: `prompt-input.tsx`** — declare its `Events` from its `docs/web-components.md` §`<kitn-prompt-input>` event table (`submit`, `valuechange`, `suggestionclick`, `search`, `voice`, `slashselect` as applicable), pass `<Props, Events>`.

- [ ] **Step 6: Rebuild + verify detail shapes generated.**

Run: `npm run build`
Then: `node -e "const m=require('./src/elements/element-meta.json'); const c=m.find(e=>e.tag==='kitn-chat'); console.log(c.events.find(e=>e.name==='submit'))"`
Expected: `detail` is `{ value: string; attachments: AttachmentData[] }` (not `unknown`).

- [ ] **Step 7: Commit.**

```bash
git add src/elements/chat.tsx src/elements/chat-workspace.tsx src/elements/conversation-list.tsx src/elements/prompt-input.tsx src/elements/element-meta.json dist/custom-elements.json
git commit -m "feat(elements): declare typed Events maps on flagship facades (typed dispatch + generated detail shapes)"
```

---

### Task 4: `<ElementSpec>` Solid doc-component + `argTypesFor()` Controls helper

**Files:**
- Create: `src/stories/docs/element-spec.tsx`
- Create: `src/stories/docs/element-controls.ts`

- [ ] **Step 1: Create `src/stories/docs/element-spec.tsx`** — renders the spec tables for one tag from the generated model:

```tsx
import { For, Show } from 'solid-js';
import meta from '../../elements/element-meta.json';

type Prop = { name: string; type: string; default?: string; scalar: boolean; description: string };
type Event = { name: string; detail: string | null; description: string };
type Composed = { name: string; group: string; storyId?: string };
type ElementMeta = { tag: string; className: string; props: Prop[]; events: Event[]; composedFrom: Composed[]; tokens: string[] };

const all = meta as unknown as ElementMeta[];

const th = 'text-left font-semibold px-2 py-1.5 border-b border-border text-foreground';
const td = 'px-2 py-1.5 border-b border-border align-top text-muted-foreground';
const code = 'font-mono text-[0.85em] text-code-foreground';

export function ElementSpec(props: { tag: string }) {
  const el = () => all.find((e) => e.tag === props.tag);
  return (
    <Show when={el()} fallback={<p>Unknown element: {props.tag}</p>}>
      {(e) => (
        <div class="text-sm space-y-6">
          <section>
            <h3 class="text-title font-semibold text-foreground mb-2">Properties</h3>
            <table class="w-full border-collapse">
              <thead><tr><th class={th}>Property</th><th class={th}>Attribute</th><th class={th}>Type / values</th><th class={th}>Default</th></tr></thead>
              <tbody>
                <For each={e().props}>{(p) => (
                  <tr>
                    <td class={td}><span class={code}>{p.name}</span></td>
                    <td class={td}>{p.scalar ? <span class={code}>{kebab(p.name)}</span> : <span class="opacity-50">— (property only)</span>}</td>
                    <td class={td}><span class={code}>{p.type}</span></td>
                    <td class={td}>{p.default ? <span class={code}>{p.default}</span> : '—'}</td>
                  </tr>
                )}</For>
              </tbody>
            </table>
          </section>

          <Show when={e().events.length}>
            <section>
              <h3 class="text-title font-semibold text-foreground mb-2">Events</h3>
              <p class="text-muted-foreground mb-2 text-xs">Non-bubbling <span class={code}>CustomEvent</span>s on the element; the payload is on <span class={code}>event.detail</span>.</p>
              <table class="w-full border-collapse">
                <thead><tr><th class={th}>Event</th><th class={th}>detail</th><th class={th}>Description</th></tr></thead>
                <tbody>
                  <For each={e().events}>{(ev) => (
                    <tr>
                      <td class={td}><span class={code}>{ev.name}</span></td>
                      <td class={td}><span class={code}>{ev.detail ?? '—'}</span></td>
                      <td class={td}>{ev.description}</td>
                    </tr>
                  )}</For>
                </tbody>
              </table>
            </section>
          </Show>

          <Show when={e().composedFrom.length}>
            <section>
              <h3 class="text-title font-semibold text-foreground mb-2">Composed from</h3>
              <p class="text-muted-foreground mb-2 text-xs">This element wraps these SolidJS components:</p>
              <div class="flex flex-wrap gap-2">
                <For each={e().composedFrom}>{(c) => (
                  <a class="rounded-md bg-muted px-2 py-1 text-xs text-foreground hover:bg-accent no-underline" href={`?path=/docs/${c.storyId}`}>
                    {c.group}/{c.name}
                  </a>
                )}</For>
              </div>
            </section>
          </Show>

          <section>
            <h3 class="text-title font-semibold text-foreground mb-2">Theming</h3>
            <p class="text-muted-foreground text-xs">
              Themed by the global design tokens — override any <span class={code}>--color-*</span> token to rebrand (see the <a href="?path=/docs/theming-token-reference--docs" class="text-primary">Token Reference</a>).
              <Show when={e().tokens.length}>{' '}This element also reads:{' '}<For each={e().tokens}>{(t, i) => <><span class={code}>{t}</span>{i() < e().tokens.length - 1 ? ', ' : ''}</>}</For>.</Show>
            </p>
          </section>
        </div>
      )}
    </Show>
  );
}

function kebab(name: string) { return name.replace(/([A-Z])/g, '-$1').toLowerCase(); }
```

(Note: `import meta from '…element-meta.json'` requires `resolveJsonModule` — it's already on in this repo's tsconfig since other JSON is imported; if typecheck complains, add `"resolveJsonModule": true` to the relevant tsconfig.)

- [ ] **Step 2: Create `src/stories/docs/element-controls.ts`** — builds Storybook argTypes for an element's scalar props:

```ts
import meta from '../../elements/element-meta.json';

type Prop = { name: string; type: string; default?: string; scalar: boolean };
type ElementMeta = { tag: string; props: Prop[] };
const all = meta as unknown as ElementMeta[];

const enumValues = (type: string): string[] | null => {
  // string-literal unions like "'light' | 'dark' | 'auto'"
  const parts = type.split('|').map((s) => s.trim());
  if (parts.length > 1 && parts.every((p) => /^'[^']*'$/.test(p))) return parts.map((p) => p.slice(1, -1));
  return null;
};

/** Storybook argTypes for an element's scalar props (theme select, booleans, text, number). */
export function argTypesFor(tag: string): Record<string, unknown> {
  const el = all.find((e) => e.tag === tag);
  if (!el) return {};
  const out: Record<string, unknown> = {};
  for (const p of el.props) {
    if (!p.scalar) continue;
    const values = enumValues(p.type);
    if (values) out[p.name] = { control: 'select', options: values };
    else if (/boolean/.test(p.type)) out[p.name] = { control: 'boolean' };
    else if (/number/.test(p.type)) out[p.name] = { control: 'number' };
    else out[p.name] = { control: 'text' };
  }
  return out;
}
```

- [ ] **Step 3: Typecheck.**

Run: `npm run typecheck`
Expected: PASS (3 tsconfigs). If `element-meta.json` import errors, ensure `resolveJsonModule` is set in `tsconfig.json` / `.storybook` tsconfig.

- [ ] **Step 4: Commit.**

```bash
git add src/stories/docs/element-spec.tsx src/stories/docs/element-controls.ts
git commit -m "feat(storybook): ElementSpec doc-component + argTypesFor controls helper"
```

---

### Task 5: Wire the 4 flagship element stories (spec page + live Controls)

**Files:**
- Modify: `src/elements/kitn-chat.stories.tsx`, `src/elements/kitn-chat-workspace.stories.tsx`, `src/elements/kitn-conversation-list.stories.tsx`, `src/elements/kitn-prompt-input.stories.tsx`

For each flagship story, (a) add an **`API` story** that renders `<ElementSpec tag="…"/>`, and (b) spread `argTypesFor('kitn-…')` into the meta `argTypes` and have the primary `Default` story's render apply the scalar args to the element (via the existing `ref`-set-properties pattern), so the Controls panel drives the element live.

- [ ] **Step 1: Add the spec page to `kitn-chat-workspace.stories.tsx`.** Add the import and a story:

```tsx
import { ElementSpec } from '../stories/docs/element-spec';
import { argTypesFor } from '../stories/docs/element-controls';
// …
/** Full generated API reference — properties, events, tokens, and the SolidJS components this element is composed from. */
export const API: Story = {
  render: () => <ElementSpec tag="kitn-chat-workspace" />,
  parameters: { layout: 'padded' },
};
```

- [ ] **Step 2: Wire live Controls on the `Default` story.** In the meta, add `argTypes: argTypesFor('kitn-chat-workspace')` and give the story `args` for the scalar props (e.g. `theme: 'auto'`, `loading: false`); in the `WorkspaceElement` render, read the story's `args` and apply each scalar to the element in `onMount`/an effect (set `el[name] = args[name]`). Keep the array props (groups/conversations/messages) as the fixed sample data. (Mirror the existing ref-set-properties pattern already in that story.)

- [ ] **Step 3: Repeat Steps 1–2 for `kitn-chat`, `kitn-conversation-list`, `kitn-prompt-input`** (same pattern; change the tag).

- [ ] **Step 4: Screenshot-verify (light + dark).** Start Storybook (`npm run storybook`), and with an ephemeral repo-root `.mjs` (playwright/chromium) screenshot:
  - `iframe.html?id=web-components-kitn-chat-workspace--api&viewMode=story` — confirm Properties, Events (with detail shapes), Composed-from links, and Theming sections render.
  - the `Default` story's Docs page — confirm the **Controls** panel now lists the scalar props (theme/placeholder/loading/…) and toggling `theme` flips the element light↔dark.
  Capture in dark mode too. Delete the `.mjs`/PNGs.

- [ ] **Step 5: Typecheck + commit.**

Run: `npm run typecheck` → PASS.
```bash
git add src/elements/kitn-chat.stories.tsx src/elements/kitn-chat-workspace.stories.tsx src/elements/kitn-conversation-list.stories.tsx src/elements/kitn-prompt-input.stories.tsx
git commit -m "feat(storybook): API spec page + live Controls on flagship element stories"
```

---

### Task 6: Regenerate `docs/web-components.md` tables between markers

**Files:**
- Create: `scripts/gen-web-components-md.mjs`
- Modify: `scripts/gen-element-api.mjs` (call the new generator)
- Modify: `docs/web-components.md` (markers inserted + tables regenerated)

- [ ] **Step 1: Create `scripts/gen-web-components-md.mjs`** that, given the elements model, rewrites the table block for each element between `<!-- spec:TAG -->` and `<!-- /spec:TAG -->` markers inside its `### \`<TAG>\`` section, inserting the markers + tables on first run:

```js
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const kebab = (n) => n.replace(/([A-Z])/g, '-$1').toLowerCase();

function tablesFor(el) {
  const propRows = el.props.map((p) =>
    `| \`${p.name}\` | ${p.scalar ? `\`${kebab(p.name)}\`` : '—'} | \`${p.type}\` | ${p.default ? `\`${p.default}\`` : '—'} | ${p.description || ''} |`).join('\n');
  let out = `\n#### Properties\n\n| Property | Attribute | Type | Default | Notes |\n|---|---|---|---|---|\n${propRows}\n`;
  if (el.events.length) {
    const evRows = el.events.map((e) => `| \`${e.name}\` | \`${e.detail ?? '—'}\` | ${e.description || ''} |`).join('\n');
    out += `\n#### Events\n\n| Event | \`detail\` | Description |\n|---|---|---|\n${evRows}\n`;
  }
  if (el.composedFrom.length) {
    out += `\n#### Composed from\n\n${el.composedFrom.map((c) => `\`${c.group}/${c.name}\``).join(', ')}\n`;
  }
  out += `\n#### Theming\n\nThemed by the global design tokens (override any \`--color-*\`). ${el.tokens.length ? `Element-specific tokens: ${el.tokens.map((t) => `\`${t}\``).join(', ')}.` : ''}\n`;
  return out;
}

export function writeWebComponentsMd(root, elements) {
  const path = resolve(root, 'docs/web-components.md');
  let md = readFileSync(path, 'utf8');
  for (const el of elements) {
    const block = tablesFor(el);
    const start = `<!-- spec:${el.tag} -->`;
    const end = `<!-- /spec:${el.tag} -->`;
    const re = new RegExp(`${start}[\\s\\S]*?${end}`);
    const replacement = `${start}${block}${end}`;
    if (re.test(md)) {
      md = md.replace(re, replacement);
    } else {
      // first run: insert markers right after the element's "### `<tag>`" heading line
      const headingRe = new RegExp(`(### \\\`<${el.tag}>\\\`[^\\n]*\\n)`);
      if (headingRe.test(md)) md = md.replace(headingRe, `$1\n${start}${block}${end}\n`);
    }
  }
  writeFileSync(path, md);
  console.log('✓ docs/web-components.md tables regenerated');
}
```

- [ ] **Step 2: Call it from `gen-element-api.mjs`** in the `import.meta.url === …` block (after the llms generation, ~line 203):

```js
const { writeWebComponentsMd } = await import('./gen-web-components-md.mjs');
writeWebComponentsMd(root, elements);
```

- [ ] **Step 3: Remove the now-duplicated hand-curated tables.** For each `### \`<tag>\`` section that the generator now owns, delete the old hand-written Properties/Events tables (the generator inserts fresh ones inside the markers on first run). Leave the section prose (intro sentence per element) intact. Do this element-by-element; verify the section still reads well.

- [ ] **Step 4: Rebuild + diff.**

Run: `npm run build`
Then: `git --no-pager diff docs/web-components.md | head -80` — confirm tables now sit between markers, contain real defaults + event detail shapes, and the surrounding prose is intact.

- [ ] **Step 5: Commit.**

```bash
git add scripts/gen-web-components-md.mjs scripts/gen-element-api.mjs docs/web-components.md
git commit -m "feat(docs): generate web-components.md tables from element-meta (between markers)"
```

---

### Task 7: Declare `Events` maps on the remaining dispatching facades

**Files (one `Events` interface + `<Props, Events>` each):**
`src/elements/model-switcher.tsx`, `feedback-bar.tsx`, `attachments.tsx`, `reasoning.tsx`, `checkpoint.tsx`, `file-upload.tsx`, `voice-input.tsx`, `chat-scope-picker.tsx`, `prompt-suggestions.tsx`, `message.tsx`, `thinking-bar.tsx`, `response-stream.tsx`

This is the same mechanical pattern as Task 3, parallelizable. For EACH facade:

- [ ] **Step 1:** `grep -n "dispatch(" src/elements/<file>` to list the events it fires, and read its `### ` section in `docs/web-components.md` for the curated `detail` shapes + descriptions.
- [ ] **Step 2:** Add an `interface Events { … }` (one JSDoc'd field per event; `Record<string, never>` for payloadless events), importing any referenced detail types, and change to `defineKitnElement<Props, Events>(…)`.
- [ ] **Step 3:** `npm run typecheck` → fix any real `dispatch` payload mismatches surfaced.
- [ ] **Step 4:** After all are done: `npm run build`, then verify none still show `unknown`: `node -e "const m=require('./src/elements/element-meta.json'); for (const e of m) for (const ev of e.events) if (ev.detail==='unknown') console.log('STILL UNKNOWN:', e.tag, ev.name)"` → prints nothing.
- [ ] **Step 5:** Commit: `git add src/elements/*.tsx src/elements/element-meta.json dist/custom-elements.json docs/web-components.md && git commit -m "feat(elements): typed Events maps on remaining dispatching facades"`

---

### Task 8: Roll out the API page + Controls to the remaining element stories

**Files:** the remaining `src/elements/kitn-*.stories.tsx` (all except the 4 flagships from Task 5)

For each element story, add the `API` story (`render: () => <ElementSpec tag="kitn-…" />`) and `argTypes: argTypesFor('kitn-…')` on the meta (+ wire scalar args into the render where the story already sets element properties). Same pattern as Task 5. Parallelizable across subagents (group ~6 stories per agent).

- [ ] **Step 1:** Add the two imports + the `API` story to each element story.
- [ ] **Step 2:** Spread `argTypesFor('kitn-…')` into the meta and apply scalar args in the primary story's render.
- [ ] **Step 3:** `npm run typecheck` → PASS.
- [ ] **Step 4:** Spot-screenshot 3–4 of the rolled-out elements' `--api` stories to confirm they render.
- [ ] **Step 5:** Commit per group: `git add src/elements/kitn-*.stories.tsx && git commit -m "feat(storybook): API spec page + Controls on remaining element stories"`

---

### Task 9: Full validation gate

- [ ] **Step 1: Build** — `npm run build` → BUILD OK; `element-meta.json`, `custom-elements.json`, `element-types.d.ts`, `web-components.md`, `llms*.txt` all regenerate.
- [ ] **Step 2: Typecheck** — `npm run typecheck` → no errors (typed `dispatch` across all facades passes).
- [ ] **Step 3: Unit tests** — `npm test` → only the 3 baseline Shiki failures.
- [ ] **Step 4: React wrappers** — `npm run test:react` → 5/5.
- [ ] **Step 5: Visual** — screenshot 2–3 element `--api` pages + a `Default` story's Controls panel, light + dark; confirm Properties/Events/Tokens/Composed-from render and a `theme` control flips the element.
- [ ] **Step 6: Confirm no drift** — `git status` clean after a fresh `npm run build` (generated files committed).

---

## Self-review notes (author)

- **Spec coverage:** properties+values+defaults (Task 1 + ElementSpec/md render), events+detail (Task 3/7 typed maps → Task 1/2 model → renderers), tokens (Task 2 curated map + ElementSpec/md Theming section), composed-from links (Task 2 + ElementSpec), Storybook surfacing (Task 4/5/8), web-components.md augmentation between markers (Task 6), live Controls (Task 4 helper + Task 5/8 wiring). Phase 2 (Solid/UI) intentionally absent.
- **Type/name consistency:** `element-meta.json` model fields — `props[{name,type,optional,scalar,description,default}]`, `events[{name,detail,description}]`, `composedFrom[{name,group,storyId}]`, `tokens[string]` — are used identically in `ElementSpec`, `argTypesFor`, and `gen-web-components-md`. `argTypesFor`/`ElementSpec` both import `../../elements/element-meta.json`.
- **Simplification vs spec:** tokens carry names only in the model (not light/dark values); the ElementSpec/md Theming section links the Token Reference for values rather than duplicating `theme.css`. Deliberate, noted in the spec's data-model section.
- **Risk:** Task 3/7 typed `dispatch` may surface real payload mismatches — that's intended (each is a latent bug); fix to match the documented `detail`.
