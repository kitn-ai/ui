# Context7 Registration + Agents Hub — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get AI/UI indexed in Context7 and turn the "For AI Agents" page into a pick-your-channel hub, so coding assistants retrieve the *real* `kai-` API instead of hallucinating.

**Architecture:** A `context7.json` at the repo root declares the project title, category-signaling description, indexed folders, and anti-hallucination rules; the repo is then submitted to context7.com. In parallel, the existing `for-ai-agents.mdx` is retitled and restructured into a hub that leads with the channels that exist today (Context7 + `llms.txt`/`.md` twins + the Custom Elements Manifest) and is structured to absorb the MCP and native-skills sections later.

**Tech Stack:** Astro Starlight (docs), `context7.json` (Context7 indexing config), Playwright (IVP), the Context7 MCP (`resolve-library-id`) for post-registration verification.

## Global Constraints

- All custom elements are prefixed `kai-` (e.g. `<kai-chat>`); never `kitn-`. "kitn-chat" is the product name only in the `.es.js` bundle filename — nowhere as a tag.
- Docs voice follows `docs-site/STYLE.md` (earn every sentence; no slop words; DX-first).
- Internal links must resolve (no 404s); verify with the build + an IVP link crawl.
- The Context7 `projectTitle` is the discovery/category label, distinct from the "AI/UI" brand wordmark used in marketing copy.
- Docs site: `cd docs-site && npm run build` (build-time sitemap/llms sync); IVP via `npm run preview` + Playwright (build-only artifacts don't exist under `npm run dev`).

---

### Task 1: Add `context7.json`

**Files:**
- Create: `context7.json` (repo root)

**Interfaces:**
- Consumes: nothing.
- Produces: the Context7 indexing config consumed by context7.com at registration; no code depends on it.

- [ ] **Step 1: Verify the current `context7.json` schema**

The schema can change. Fetch the canonical reference first and confirm field names before writing.
Run (WebFetch or browser): `https://context7.com/` docs / `https://github.com/upstash/context7` README for the `context7.json` spec.
Expected: confirm the supported keys (at minimum `projectTitle`, `description`, `folders`/`includeFolders`, `excludeFolders`/`excludeFiles`, `rules`). Adjust the file below to the confirmed key names.

- [ ] **Step 2: Write `context7.json`**

```json
{
  "$schema": "https://context7.com/schema/context7.json",
  "projectTitle": "Kitn AI/UI — Web UI SDK for AI Agents",
  "description": "Framework-agnostic web components for AI chat and agents — streaming, tool calls, reasoning, generative-UI cards, and artifacts. Drop into React, Vue, Svelte, Angular, or plain HTML.",
  "folders": ["docs-site/src/content/docs", "."],
  "excludeFolders": ["docs-site/dist", "docs-site/node_modules", "node_modules", "dist"],
  "rules": [
    "All custom elements are prefixed `kai-` (for example `<kai-chat>`, `<kai-artifact>`). Never use a `kitn-` element prefix; `kitn-chat` is only a bundle filename.",
    "Array and object props (messages, models, context, suggestions, slashCommands) must be set in JavaScript, not as HTML attributes — an attribute is always a string.",
    "Events are non-bubbling `kai-*` CustomEvents; listen directly on the element. The submit event is `kai-submit` with `event.detail.value`.",
    "Streaming requires assigning a NEW array/object on every chunk; mutating in place does not re-render.",
    "The full machine-readable reference is `llms-full.txt`; each docs page also has a `.md` twin at `<page-url>.md`."
  ]
}
```

(`"."` in `folders` includes the root `llms.txt`/`llms-full.txt`; trim if Context7 rejects mixing root + subfolder — fall back to listing `docs-site/src/content/docs` plus explicit `llms.txt`, `llms-full.txt` if the schema supports a files list.)

- [ ] **Step 3: Validate it parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('context7.json','utf8')); console.log('valid json')"`
Expected: `valid json`

- [ ] **Step 4: Commit**

```bash
git add context7.json
git commit -m "feat: add context7.json for Context7 indexing (kai- rules)"
```

---

### Task 2: Elevate "For AI Agents" into a hub page

**Files:**
- Modify: `docs-site/src/content/docs/guides/for-ai-agents.mdx`

**Interfaces:**
- Consumes: nothing.
- Produces: the hub page at `/guides/for-ai-agents/` (slug unchanged so existing links hold).

- [ ] **Step 1: Rewrite the page**

Retitle and restructure. Keep the existing, accurate sections (the three "what agents get wrong" gotchas, the 15-line runbook, the Custom Elements Manifest, Related) — they're good. Add a lead framing the channels and a Context7 section. Do NOT add MCP/skills sections yet (built in later plans). New frontmatter + top:

```mdx
---
title: For AI Agents
description: Make your AI coding assistant fluent in AI/UI — index it in Context7, point it at the machine-readable reference, and it wires components correctly the first time.
---

import { Aside } from '@astrojs/starlight/components';

<p class="kai-lede">Make your coding assistant fluent in AI/UI before you build. There are two ways today — pick whichever your tools already use — and the MCP scaffolder is on the way.</p>

## Index it in Context7

If you use [Context7](https://context7.com) (the docs MCP most assistants support), search for **Kitn AI/UI** — the full docs, the `kai-` element reference, and the integration guides are indexed there, so your assistant retrieves the real API on demand. No install, no paste.

<Aside type="tip">Context7 serves the *reference*. For one-off prompts without Context7, paste `llms.txt` (below) instead.</Aside>

## Machine-readable files
```

Then keep the existing "The files" table, "Where they live", "Point an agent at them", the three gotchas, the runbook, and the Custom Elements Manifest sections **unchanged** (they already use `kai-` and are correct). Add a one-line pointer to the per-page `.md` twins under "Machine-readable files": `Every docs page also has a Markdown twin at \`<page-url>.md\` (e.g. \`/components/chat.md\`) — clean source for any model.`

- [ ] **Step 2: Build**

Run: `cd docs-site && npm run build`
Expected: `Complete!`, page count unchanged, no errors.

- [ ] **Step 3: IVP the page**

Run: `npm run preview`, then a Playwright check on `/guides/for-ai-agents/`:

```js
import { chromium } from '@playwright/test';
const b = await chromium.launch(); const p = await b.newPage();
const errs = []; p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
const r = await p.goto('http://localhost:PORT/guides/for-ai-agents/', { waitUntil: 'networkidle' });
console.log('status', r.status(), '| has Context7 section:', await p.getByText('Index it in Context7').count());
const links = await p.locator('.sl-markdown-content a[href^="/"]').evaluateAll(a => [...new Set(a.map(x=>x.getAttribute('href').split('#')[0]))]);
let broken=[]; for (const h of links) { const rr=await p.goto('http://localhost:PORT'+h,{waitUntil:'commit'}).catch(()=>null); if(!rr||rr.status()>=400) broken.push(h); }
console.log('console errors:', errs.length?errs:'none', '| broken links:', broken.length?broken:'NONE');
await b.close();
```

Expected: status 200, Context7 section present (count 1), `console errors: none`, `broken links: NONE`.

- [ ] **Step 4: Commit**

```bash
git add docs-site/src/content/docs/guides/for-ai-agents.mdx
git commit -m "docs: elevate For AI Agents into a channels hub; add Context7 section"
```

---

### Task 3: Elevate the page in the Docs sidebar

**Files:**
- Modify: `docs-site/astro.config.mjs` (the `Docs` topic `items` array)

**Interfaces:**
- Consumes: the page from Task 2.
- Produces: the reordered sidebar.

- [ ] **Step 1: Move the item up**

In the `Docs` topic items, move `{ label: 'For AI Agents', slug: 'guides/for-ai-agents' }` to directly after `{ label: 'Getting Started', slug: 'guides/getting-started' }` (it's an early-adoption concern, not a deep-dive). Leave the slug unchanged.

- [ ] **Step 2: Build**

Run: `cd docs-site && npm run build`
Expected: `Complete!`, no errors.

- [ ] **Step 3: Verify placement**

Run: `npm run preview` + Playwright on `/guides/for-ai-agents/`:

```js
const order = await p.locator('nav a[href^="/guides/"]').evaluateAll(a => a.map(x => x.textContent.trim()));
console.log(order.slice(0, 6));
```

Expected: `For AI Agents` appears near the top of the Docs sidebar (just after Getting Started), not buried.

- [ ] **Step 4: Commit**

```bash
git add docs-site/astro.config.mjs
git commit -m "docs: move For AI Agents near the top of the Docs sidebar"
```

---

### Task 4: Register the repo with Context7 (manual) + verify

**Files:** none (external action).

**Interfaces:**
- Consumes: `context7.json` (Task 1), the docs (Task 2).
- Produces: AI/UI indexed in Context7, retrievable via `resolve-library-id`.

- [ ] **Step 1: Submit the repo (human action)**

The repo owner submits `https://github.com/kitn-ai/ui` at `https://context7.com/add-library` (or the current submission flow). Requires the branch with `context7.json` to be on the indexed branch (merge this plan's branch, or point Context7 at it). Indexing is asynchronous — may take minutes to hours.

- [ ] **Step 2: Verify it's indexed**

After indexing completes, call the Context7 MCP `resolve-library-id` with `libraryName: "Kitn AI/UI"` (and `"@kitn.ai/ui"`).
Expected: a result for Kitn AI/UI (`/kitn-ai/ui` or similar), not just competitors.

- [ ] **Step 3: Spot-check an answer**

Call `query-docs` on the resolved id with `"How do I set messages on kai-chat and wire streaming?"`.
Expected: the answer uses `kai-chat`, sets `messages` in JS, and references `kai-submit`/`e.detail.value` — confirming the `kai-` rules took.

---

## Self-Review

- **Spec coverage:** This plan implements the spec's "Context7 registration" and the Context7 slice of "Docs changes / hub page." The MCP/skills sections of the hub are deferred to Plans 3 and the Phase-2 skills work (by design — no placeholders). Catalogs and the MCP are Plans 2 and 3. ✓
- **Placeholder scan:** No TBDs. Task 1 Step 1 explicitly verifies the live `context7.json` schema before finalizing (the one genuinely external unknown), rather than asserting it. ✓
- **Consistency:** Page slug stays `guides/for-ai-agents` across Tasks 2 and 3; the `kai-` rules in `context7.json` match the gotchas already in the page. ✓
- **Note:** docs verification is build + Playwright IVP rather than unit tests (docs have no unit layer); each task ends with a concrete verification + commit.
