# llms.txt Static Approach for @kitnai/chat

**Date:** 2026-06-12
**Status:** Design note — not yet implemented

---

## 1. What we are designing and why

A coding agent (Claude Code, Codex, GitHub Copilot) approaching `@kitnai/chat` cold has three problems:

1. **Discovery** — it does not know the library exists or what it does.
2. **Orientation** — it needs to understand the two-layer architecture (batteries-included vs. composable primitives) and the property/event/attribute contract before writing any code.
3. **Reference** — when implementing, it needs accurate, up-to-date prop/event types for all 28 `kitn-*` elements.

The [llmstxt.org](https://llmstxt.org) convention solves problem 1 + 2 with a small `llms.txt` (dense, curated orientation) and an optional `llms-full.txt` that solves problem 3 (full inlined reference). Both are static files generated from the `custom-elements.json` manifest so they never drift from the code.

---

## 2. Concrete `llms.txt` draft

File location: repo root `/llms.txt`; also served at `https://kitn.dev/llms.txt` and included in the npm package so consumers can find it at `node_modules/@kitnai/chat/llms.txt`.

```
# @kitnai/chat

> SolidJS + Shadow-DOM web component kit for building AI chat interfaces. 28 `kitn-*` custom elements: streaming responses, markdown + code rendering, reasoning/tool panels, attachments, conversation sidebar, voice input. Zero framework dependency for consumers; SolidJS is bundled in.

## Two layers

**Layer 1 — batteries-included web components** (`import '@kitnai/chat/elements'`):
Drop three elements into any framework (React, Vue, plain HTML). Data in via JS properties; interactions out via CustomEvents.

- `<kitn-chat>` — full chat UI (message list + prompt input). The primary starting point.
- `<kitn-conversation-list>` — sidebar conversation browser with group support.
- `<kitn-prompt-input>` — standalone input area with send button.

**Layer 2 — composable primitives** (`import { … } from '@kitnai/chat'`):
28 elements also exported individually. Use when you need custom layout, ChainOfThought, FeedbackBar, ThinkingBar, VoiceInput, or anything `<kitn-chat>` does not expose. Your bundler tree-shakes unused components.

## Install

```bash
npm install @kitnai/chat
# SolidJS consumers only:
npm install solid-js
```

## Key rules for web components

1. **Array/object data must be set as JS properties**, not HTML attributes.
   `chat.messages = [{ id: '1', role: 'assistant', content: 'Hi!' }]`
2. **Events are non-bubbling CustomEvents** — listen directly on the element.
   `chat.addEventListener('submit', (e) => console.log(e.detail.value))`
3. **The `theme` attribute** (`'light' | 'dark' | 'auto'`) works on every element. Default is `auto` (follows `prefers-color-scheme`).
4. **Theming via CSS custom properties**: override `--kitn-color-*` tokens on `:root`. They pierce Shadow DOM.

## ChatMessage schema (required for `<kitn-chat>`)

```ts
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: { text: string; label?: string };
  tools?: ToolPart[];
  attachments?: AttachmentData[];
  actions?: ('copy' | 'like' | 'dislike' | 'regenerate' | 'edit')[];
}
```

## Framework wiring

**Plain HTML / CDN**
```html
<script type="module" src="https://unpkg.com/@kitnai/chat/elements"></script>
<kitn-chat style="display:block;height:100vh"></kitn-chat>
```

**React** — typed wrappers auto-set properties and expose `on<Event>` props:
```tsx
import { KitnChat } from '@kitnai/chat/react';
<KitnChat messages={messages} onSubmit={(e) => send(e.detail.value)} />
```

**Vue** — use the element directly; pass arrays via `:messages.prop="messages"`:
```vue
<kitn-chat :messages.prop="messages" @submit="send" />
```

## Theming

```css
:root {
  --kitn-color-background: #0f0f0f;
  --kitn-color-primary: #7c3aed;
  --kitn-color-muted: #1e1e1e;
}
```

For plain HTML/CDN: `<link rel="stylesheet" href="…/@kitnai/chat/theme.tokens.css">`.
For Tailwind builds: `@import "@kitnai/chat/theme.css"` in your CSS.

## Links

- Full web-component API reference: https://kitn.dev/docs/web-components or ./docs/web-components.md
- Full element reference (all 28 elements, all props/events): https://kitn.dev/llms-full.txt
- Machine-readable Custom Elements Manifest: https://unpkg.com/@kitnai/chat/dist/custom-elements.json
- Working examples: https://github.com/kitn-ai/chat/tree/main/examples
- Storybook: https://storybook.kitn.dev
```

---

## 3. Concrete `llms-full.txt` structure and sample

File location: repo root `/llms-full.txt`; also `dist/llms/llms-full.txt` (so it is published in the npm package). Served at `https://kitn.dev/llms-full.txt`.

The file contains everything in `llms.txt` plus an **inlined per-element reference table** generated directly from `dist/custom-elements.json`. The generation script reads the manifest at runtime so the file never drifts.

### Proposed structure

```
# @kitnai/chat — Full Reference

[Contents of llms.txt verbatim, section headers included]

---

## Element Reference (generated from dist/custom-elements.json)

All 28 `kitn-*` elements. For each:
- **Tag** — the HTML tag and the equivalent React component name.
- **Purpose** — one-sentence description.
- **Properties** — JS property name, attribute name (if settable via attribute), type, and description.
- **Events** — event name, `detail` type, and description.

Every element also accepts `theme="light|dark|auto"`.

---
```

### Sample rendered entries (3 of 28)

#### `kitn-chat` / `KitnChat`

The full batteries-included chat UI. Renders a scrolling message list and a prompt input in one element.

**Properties** (set as JS properties; starred ones also work as HTML attributes):

| Property | Attribute | Type | Description |
|---|---|---|---|
| `messages` | — | `ChatMessage[]` | Full message list. Replace the whole array on each update — mutation in-place does not trigger a re-render. |
| `value` | `value` | `string \| undefined` | Controlled input value. Omit for uncontrolled mode. |
| `placeholder` | `placeholder` | `string \| undefined` | Textarea placeholder. |
| `loading` | `loading` | `boolean \| undefined` | Locks the input. Does NOT show a thinking animation — show progress by streaming `messages`. |
| `suggestions` | — | `string[] \| undefined` | Chip suggestions above input. Clicking fills input and fires `suggestionclick`. |
| `suggestionMode` | `suggestion-mode` | `'submit' \| 'fill' \| undefined` | Whether clicking a suggestion submits immediately (`'submit'`, default) or just fills the input (`'fill'`). |
| `proseSize` | `prose-size` | `'xs' \| 'sm' \| 'base' \| 'lg' \| undefined` | Markdown/text sizing. |
| `codeTheme` | `code-theme` | `string \| undefined` | Shiki theme name. Default: `github-dark-dimmed`. |
| `codeHighlight` | `code-highlight` | `boolean \| undefined` | `false` disables syntax highlighting entirely — no Shiki loads. |
| `chatTitle` | `chat-title` | `string \| undefined` | Header title. Header appears when `chatTitle`, `models`, or `context` is set. |
| `models` | — | `{ id: string; name: string; provider?: string }[] \| undefined` | Shows a model switcher in the header. Fires `modelchange` on selection. |
| `currentModel` | `current-model` | `string \| undefined` | Currently selected model id (pairs with `models`). |
| `context` | — | `{ usedTokens: number; maxTokens: number; inputTokens?: number; outputTokens?: number; estimatedCost?: number } \| undefined` | Shows a token-usage meter in the header. |
| `scrollButton` | `scroll-button` | `boolean \| undefined` | Show scroll-to-bottom button. Default `true`. |
| `search` | `search` | `boolean \| undefined` | Show Search button in toolbar. Fires `search` event when clicked. |
| `voice` | `voice` | `boolean \| undefined` | Show Mic button in toolbar. Fires `voice` event when clicked. |
| `slashCommands` | — | `{ id: string; label: string; description?: string; category?: string }[] \| undefined` | When set, typing `/` opens a command palette. Fires `slashselect` on pick. |
| `slashActiveIds` | — | `string[] \| undefined` | Command ids to highlight as active in the palette. |
| `slashCompact` | `slash-compact` | `boolean \| undefined` | Single-line palette rows. |

**Events** (non-bubbling `CustomEvent`s — listen directly on the element):

| Event | `detail` type | Description |
|---|---|---|
| `submit` | `{ value: string; attachments: AttachmentData[] }` | User submitted a message (with any staged file attachments). |
| `valuechange` | `{ value: string }` | Fired on every input keystroke. |
| `suggestionclick` | `{ value: string }` | A suggestion chip was clicked. |
| `messageaction` | `{ messageId: string; action: 'copy' \| 'like' \| 'dislike' \| 'regenerate' \| 'edit' }` | An action button on a message was clicked. |
| `modelchange` | `{ modelId: string }` | The model switcher changed selection. |
| `search` | — | Search button clicked. |
| `voice` | — | Mic button clicked. |
| `slashselect` | `{ command: { id: string; label: string; description?: string; category?: string } }` | A slash command was chosen. |

---

#### `kitn-prompt-input` / `KitnPromptInput`

Standalone prompt input area with a send button, file attachment staging, and optional slash-command palette. Use when you want just the composer without the message list.

**Properties:**

| Property | Attribute | Type | Description |
|---|---|---|---|
| `value` | `value` | `string \| undefined` | Controlled input value. |
| `placeholder` | `placeholder` | `string \| undefined` | Textarea placeholder. |
| `disabled` | `disabled` | `boolean \| undefined` | Disables textarea and send button. |
| `loading` | `loading` | `boolean \| undefined` | Shows loading state; disables send button. |
| `suggestions` | — | `string[] \| undefined` | Chip suggestions above input. |
| `suggestionMode` | `suggestion-mode` | `'submit' \| 'fill' \| undefined` | Suggestion click behavior (see `kitn-chat`). |
| `slashCommands` | — | `{ id: string; label: string; description?: string; category?: string }[] \| undefined` | Slash command palette data. |
| `slashActiveIds` | — | `string[] \| undefined` | Active command ids. |
| `slashCompact` | `slash-compact` | `boolean \| undefined` | Compact palette rows. |

**Events:**

| Event | `detail` type | Description |
|---|---|---|
| `submit` | `{ value: string; attachments: AttachmentData[] }` | User submitted. |
| `valuechange` | `{ value: string }` | Fired on every input keystroke. |
| `suggestionclick` | `{ value: string }` | Suggestion chip clicked. |
| `slashselect` | `{ command: { id: string; label: string; description?: string; category?: string } }` | Slash command chosen. |

---

#### `kitn-reasoning` / `KitnReasoning`

Collapsible reasoning block. Auto-expands while the model is thinking (set `streaming`), then collapses when streaming ends.

**Properties:**

| Property | Attribute | Type | Description |
|---|---|---|---|
| `text` | `text` | `string` | The reasoning text. Required. |
| `label` | `label` | `string \| undefined` | Trigger button label. Default: "Reasoning". |
| `open` | `open` | `boolean \| undefined` | Controlled open state. Omit for uncontrolled (toggle via trigger). |
| `streaming` | `streaming` | `boolean \| undefined` | While `true`, auto-expands; collapses when it flips to `false`. |
| `markdown` | `markdown` | `boolean \| undefined` | Render `text` as markdown. |

**Events:**

| Event | `detail` type | Description |
|---|---|---|
| `openchange` | `{ open: boolean }` | Open state changed via the trigger or streaming auto-open. |

---

[... remaining 25 elements follow the same pattern, generated from custom-elements.json ...]
```

---

## 4. Generation strategy

### Source of truth

`dist/custom-elements.json` (the Custom Elements Manifest) is the authoritative machine-readable source. It is already generated in `postbuild` by `scripts/gen-element-api.mjs` from the TypeScript facade files in `src/elements/`. It captures every public prop, attribute, event, type, and description.

### New script: `scripts/gen-llms.mjs`

Add a new script that:

1. Reads `dist/custom-elements.json`.
2. Renders `llms.txt` (static header + curated content defined inline in the script).
3. Renders `llms-full.txt` (same header + programmatically built per-element tables from the manifest).
4. Writes both files to the repo root AND copies them to `dist/llms/`.

```mjs
// scripts/gen-llms.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cem = JSON.parse(readFileSync(resolve(root, 'dist/custom-elements.json'), 'utf8'));
const declarations = cem.modules[0].declarations;

// 1. Read the static llms.txt header from a template or inline string
// 2. Build per-element markdown tables from declarations
// 3. Write llms.txt and llms-full.txt

function renderElement(decl) {
  const fields = decl.members.filter(m => m.kind === 'field');
  const attrs = decl.attributes.filter(a => a.name !== 'theme');
  const events = decl.events;

  // Build attribute lookup for join
  const attrByField = new Map(attrs.map(a => [a.fieldName, a.name]));

  const propRows = fields.map(f => {
    const attr = attrByField.get(f.name) ?? '—';
    return `| \`${f.name}\` | \`${attr}\` | \`${f.type.text}\` | ${f.description || ''} |`;
  }).join('\n');

  const eventRows = events.map(e =>
    `| \`${e.name}\` | \`${e.type.text}\` | ${e.description || ''} |`
  ).join('\n');

  const reactName = decl.tagName.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join('');

  return [
    `### \`${decl.tagName}\` / \`${reactName}\``,
    '',
    propRows ? [
      '**Properties** (every element also accepts `theme="light|dark|auto"`):\n',
      '| Property | Attribute | Type | Description |',
      '|---|---|---|---|',
      propRows,
    ].join('\n') : '',
    '',
    eventRows ? [
      '**Events** (non-bubbling `CustomEvent`s):\n',
      '| Event | `detail` type | Description |',
      '|---|---|---|',
      eventRows,
    ].join('\n') : '_No events._',
    '',
    '---',
  ].filter(Boolean).join('\n');
}

const elementSection = declarations.map(renderElement).join('\n\n');

// Write files
mkdirSync(resolve(root, 'dist/llms'), { recursive: true });
writeFileSync(resolve(root, 'llms.txt'), LLMS_TXT_CONTENT);
writeFileSync(resolve(root, 'llms-full.txt'), LLMS_FULL_HEADER + '\n\n' + elementSection);
writeFileSync(resolve(root, 'dist/llms/llms.txt'), LLMS_TXT_CONTENT);
writeFileSync(resolve(root, 'dist/llms/llms-full.txt'), LLMS_FULL_HEADER + '\n\n' + elementSection);

console.log(`✓ llms.txt and llms-full.txt written (${declarations.length} elements)`);
```

### Wire into `postbuild`

Extend `package.json` `scripts.build:api`:

```json
"build:api": "node scripts/gen-element-api.mjs && node scripts/gen-llms.mjs"
```

Or add a dedicated script and chain it:

```json
"build:llms": "node scripts/gen-llms.mjs",
"postbuild": "npm run build:theme && npm run build:api && npm run build:llms"
```

Because `gen-element-api.mjs` already exports `{ elements, toAttr, tagToClass }`, `gen-llms.mjs` can import from it directly to avoid parsing the manifest twice:

```mjs
import { elements } from './gen-element-api.mjs';
```

This is the cleanest approach: `gen-element-api.mjs` writes `custom-elements.json`, then `gen-llms.mjs` imports the same in-memory `elements` array and writes `llms.txt` + `llms-full.txt`. One parse, three outputs.

---

## 5. Location and distribution

### Repo root (primary)

| File | Audience | How consumed |
|---|---|---|
| `llms.txt` | Coding agents, humans | Served at `https://kitn.dev/llms.txt`; read by tools that follow the llmstxt.org convention; discoverable via `.well-known/llms.txt` redirect |
| `llms-full.txt` | Coding agents | Served at `https://kitn.dev/llms-full.txt`; an agent reads this one file to get the full API reference |

### npm package (`files` field)

Add `dist/llms/` to the `files` array in `package.json`:

```json
"files": [
  "dist",
  "src",
  "frameworks",
  "theme.css",
  "llms.txt",
  "llms-full.txt"
]
```

This makes both files available at `node_modules/@kitnai/chat/llms.txt` and `node_modules/@kitnai/chat/llms-full.txt` after `npm install`, which is useful for:

- Claude Code / Copilot workspace-level instructions that glob `node_modules/@kitnai/chat/llms.txt`.
- A project's `CLAUDE.md` or `AGENTS.md` referencing the installed file.
- The `exports` map (optional — probably not worth a named export for text files, but possible).

### Storybook / docs site

Copy or symlink the files into `public/` so they are served as static assets from the Storybook/docs domain:

```
public/llms.txt       → served at https://storybook.kitn.dev/llms.txt
public/llms-full.txt  → served at https://storybook.kitn.dev/llms-full.txt
```

### How each agent type consumes it

| Agent / tool | How it finds the files |
|---|---|
| **Claude Code** | Explicit `@llms.txt` in a CLAUDE.md, or user pastes the URL; agent reads `llms-full.txt` for element reference |
| **GitHub Copilot** | Workspace `.github/copilot-instructions.md` references the file; Copilot workspace indexing picks up `node_modules/@kitnai/chat/llms.txt` |
| **Codex / ChatGPT** | User references the URL directly; `llms.txt` at the project URL is the entry point |
| **Cursor** | `.cursorrules` or `cursor.context` references the installed `llms.txt` |
| **Any agent** | `npm install @kitnai/chat` → file is at `node_modules/@kitnai/chat/llms.txt` with no extra step |

---

## 6. Integration recipe ("how an agent builds a chat app")

This section should appear verbatim near the top of `llms-full.txt` and optionally in a Storybook MDX page.

```
## How to build a chat app with @kitnai/chat in 5 steps

### Step 1 — Install

```bash
npm install @kitnai/chat
```

### Step 2 — Pick your layer

**Drop-in (simplest):** Use `<kitn-chat>` for a full chat UI in one tag.
```html
<kitn-chat style="display:block;height:100vh"></kitn-chat>
<script type="module">
  import '@kitnai/chat/elements';
  const chat = document.querySelector('kitn-chat');
  chat.messages = [];
</script>
```

**Composable (custom layout):** Combine `<kitn-message>`, `<kitn-prompt-input>`, `<kitn-reasoning>`, etc. in your own markup. Import individually from `@kitnai/chat` (SolidJS) or from `@kitnai/chat/elements` (web components).

### Step 3 — Handle `submit` and stream

```js
chat.addEventListener('submit', async (e) => {
  const userText = e.detail.value;

  // Append the user message immediately
  const history = [...chat.messages, { id: crypto.randomUUID(), role: 'user', content: userText }];
  chat.messages = history;
  chat.loading = true;

  // Add an empty assistant placeholder
  const aid = crypto.randomUUID();
  chat.messages = [...history, { id: aid, role: 'assistant', content: '' }];

  // Stream tokens in — reassign a NEW object to trigger re-render
  let answer = '';
  for await (const token of streamFromYourAPI(history)) {
    answer += token;
    chat.messages = chat.messages.map(m => m.id === aid ? { ...m, content: answer } : m);
  }
  chat.loading = false;
});
```

**Critical:** always replace the full array with a new array containing a new message object on each chunk. Mutating the existing object in-place will not trigger a re-render.

### Step 4 — Wire optional features

- **Reasoning blocks:** include `reasoning: { text: '…' }` on an assistant message object.
- **Tool calls:** include `tools: [{ type: 'search', state: 'output-available', input: {…}, output: {…} }]`.
- **Model switcher:** `chat.models = [{ id: 'gpt-4o', name: 'GPT-4o' }]; chat.currentModel = 'gpt-4o';` — listen for `modelchange`.
- **Token meter:** `chat.context = { usedTokens: 1200, maxTokens: 128000 };`.
- **Conversation history sidebar:** add `<kitn-conversation-list>` beside `<kitn-chat>`; listen for `select` and `newchat`.

### Step 5 — Theme

Override `--kitn-color-*` tokens on `:root`. They pierce Shadow DOM:

```css
:root {
  --kitn-color-background: #0f0f0f;
  --kitn-color-primary: #6d28d9;
}
```

For plain HTML: `<link rel="stylesheet" href="node_modules/@kitnai/chat/dist/theme.tokens.css">`.
For Tailwind: `@import "@kitnai/chat/theme.css"` in your CSS entry.
```

---

## 7. Storybook surfacing

Add an MDX page at `src/stories/docs/ForAIAgents.mdx` with:

1. A `<Meta title="Docs/For AI Agents" />` header so it appears in the Storybook sidebar under Docs.
2. A brief explanation of what `llms.txt` / `llms-full.txt` are and which agent tools use them.
3. Inline code blocks showing the `llms.txt` content (or a link to it on the live site).
4. The integration recipe from section 6.
5. A direct link to `https://kitn.dev/llms-full.txt` for agents to fetch programmatically.

The file should **not** be auto-generated — it is a human-authored wrapper around the generated content. It references the generated files by URL rather than inlining their content (so it stays short and Storybook doesn't need to be rebuilt when element APIs change).

---

## 8. Recommended implementation plan

### Files to create

| File | Owner | When |
|---|---|---|
| `scripts/gen-llms.mjs` | New script | Implement first; wire into build |
| `llms.txt` | Generated output | Written by `gen-llms.mjs` at build time |
| `llms-full.txt` | Generated output | Written by `gen-llms.mjs` at build time |
| `dist/llms/llms.txt` | Generated output | Same — copied to dist so it's in the npm package |
| `dist/llms/llms-full.txt` | Generated output | Same |
| `src/stories/docs/ForAIAgents.mdx` | Hand-authored | Write once; reference the generated URLs |

### Files to modify

| File | Change |
|---|---|
| `package.json` | Add `"build:llms": "node scripts/gen-llms.mjs"` and chain into `postbuild`; add `"llms.txt"`, `"llms-full.txt"` to `files` |
| `package.json` | Add `.well-known/llms.txt` redirect in the hosting layer (Storybook/docs config) if the docs site is separately configured |
| `.gitignore` | `llms.txt` and `llms-full.txt` at root should NOT be gitignored — they are checked-in artefacts like `custom-elements.json` (already at repo root) |

### Files NOT to modify

- `src/elements/*.tsx` — source of truth remains unchanged.
- `scripts/gen-element-api.mjs` — no modification needed; `gen-llms.mjs` imports `elements` from it.
- `dist/custom-elements.json` — generated, not modified.

### Implementation order

1. Write `scripts/gen-llms.mjs` — imports `{ elements }` from `gen-element-api.mjs`, renders both files.
2. Run `npm run build:api` and verify `llms.txt` + `llms-full.txt` appear at root.
3. Update `package.json` `postbuild` and `files`.
4. Add `src/stories/docs/ForAIAgents.mdx`.
5. Push; confirm files are published on next npm release.
6. Wire `llms.txt` to be served at the canonical docs URL (`https://kitn.dev/llms.txt`) via a `public/` symlink or CI copy step.

---

## 9. Design decisions and tradeoffs

**Why not `AGENTS.md`?** An `AGENTS.md` at the repo root is consumed by Codex but is not a URL-addressable resource. `llms.txt` is both: repo file AND served URL. Include a brief `AGENTS.md` pointing to `llms-full.txt` if Codex support is needed, but don't duplicate the content.

**Why keep `llms.txt` and `llms-full.txt` separate?** `llms.txt` is fast to read for orientation (~2–3KB). `llms-full.txt` with all 28 elements is ~25–40KB — appropriate for reference use but too noisy for discovery. Agents that need the full API fetch the full file explicitly.

**Why import `elements` from `gen-element-api.mjs` rather than parse `custom-elements.json`?** It avoids a second disk read and keeps the rendering logic coupled to the same data model the manifest uses. If the manifest schema changes, both generators stay in sync automatically.

**Why not use `@custom-elements-manifest/analyzer`?** The repo already has a hand-crafted TypeScript-AST-based generator that extracts props, events, and JSDoc descriptions more accurately than the standard analyzer (which does not understand the `defineKitnElement` call pattern). Extending the existing generator is lower risk.

**Why include `llms.txt` and `llms-full.txt` in the npm `files`?** It lets downstream consumers (and their agents) find the files locally without network access, and enables patterns like `"read node_modules/@kitnai/chat/llms.txt"` in `.cursorrules` or `CLAUDE.md`.

**Property vs attribute distinction is the #1 agent error.** Both `llms.txt` and `llms-full.txt` must prominently call out that array/object data must be set as JS properties. This is the single most common mistake when an agent tries to wire up `messages` or `models` via HTML attributes.
