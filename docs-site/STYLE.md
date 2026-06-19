# AI/UI docs — writing & style guide

The single reference for anyone (human or agent) writing pages for this site.
Read it fully before writing. **Do not copy-paste source material — rewrite it,
thinking about what *this* reader needs.**

## Who you're writing for

A developer evaluating or integrating `@kitn.ai/ui`. They want to **understand
fast, then do**: see what a thing is, why they'd use it, and the exact code to
make it work. They are not reading for pleasure — they are scanning to ship.

## The prime directive: earn every sentence

For each sentence ask *"does the developer actually need this?"* If not, cut it.
Verbosity is a defect, not thoroughness. We optimize for **time-to-working-code**.

- Lead with the outcome (inverted pyramid), then the essentials, then — only if
  it pays its way — the edge case.
- Prefer a short runnable code block over a paragraph describing code.
- One idea per paragraph; 1–3 sentences. Lists only for 3+ parallel items.
- Don't restate what a code sample, a table, or a heading already says.

## Voice

Friendly, direct, confident, concrete. Active voice. Strong verbs.

Avoid: "simply", "just", "note that", "obviously", "clearly", "basically",
"please note", and empty qualifiers ("very", "quite", "really"). Don't hedge
("you might want to maybe…") — say what to do.

### Sound human, not generated

Write like a sharp engineer explaining something to a colleague — not like a
model producing documentation. Tells to kill on sight:

- **Marketing/AI filler**: "seamless(ly)", "effortless", "powerful", "robust",
  "leverage", "utilize" (→ use), "elevate", "unlock", "empower", "delve", "dive
  in", "in the world of", "when it comes to", "it's worth noting", "rest assured",
  "the beauty of", "best-in-class", "out of the box" (overused). Cut them.
- **Stock transitions**: "Furthermore,", "Moreover,", "Additionally,", "In
  conclusion,", "That said,". Start the sentence with the point instead.
- **Over-symmetry**: not every list needs three items; not every sentence needs a
  parallel clause or an em-dash flourish. Vary sentence length. A short blunt
  sentence is good.
- **Hollow setups**: "There are several things to consider…", "It is important to
  understand that…". Just say the thing.
- **Hype adverbs**: "incredibly", "extremely", "highly", "perfectly". Usually
  deletable.
- **Robotic hedging and over-explaining the obvious.** Trust the reader.

Read a draft aloud. If it sounds like a brochure or a chatbot, rewrite it plainer.
A little personality and a clear opinion ("reach for X when…", "skip Y unless…")
beats neutral mush.

## Accuracy (non-negotiable)

Every fact, import path, command, and API must be **verified against the real
source** — never invented or assumed:

- Package + entry points: `package.json` `exports` — `@kitn.ai/ui/elements`
  (web components, any framework), `@kitn.ai/ui/react` (React adapter), `.`
  (SolidJS layer), `@kitn.ai/ui/theme.css`, `@kitn.ai/ui/provider`.
- Real usage per framework: `src/elements/framework-usage.json` and the existing
  `src/stories/docs/**` MDX (the current source of truth — improve, don't copy).
- Element APIs: `src/elements/element-meta.json`. Theme tokens: `theme.css` /
  `dist/theme.tokens.css` and `src/stories/docs/Theming.mdx`.
- The README (`README.md`) for install, quick start, integrations, theming.

If you can't verify a claim, don't make it.

## Page structure (narrative / guide pages)

```
---
title: <Short Title Case>
description: <one tight sentence — shows in search + meta>
---

<lead: 1–2 sentences — what this page gets you>

## <Task or concept>
<short prose> + a runnable code block.
```

- `## ` for sections, `### ` for sub-steps. Avoid `####`.
- Use Starlight `<Aside type="tip|caution|note">` for a genuinely useful aside —
  not as a dumping ground.
- Use `<Tabs>`/`<TabItem>` (Starlight) for the same step across frameworks.
- Code fences must have the correct language and be **runnable + realistic** (no
  `foo`/`bar`; use real element names, real props).
- Register the elements with `import '@kitn.ai/ui/elements';` as the primary
  path; show the CDN `<script>` only as a secondary option.

## Component pages

These already follow a fixed, approved template — see
`src/content/docs/components/attachments.mdx` and `artifact.mdx` (the gold
standard). Don't reinvent them.

## House facts & terminology

- Product: **AI/UI** (`@kitn.ai/ui`). It's a set of **web components** —
  framework-agnostic custom elements, isolated in **Shadow DOM** — that drop into
  React, Vue, Svelte, Angular, or plain HTML.
- **Lead with the web components; don't lead with how they're built.** They're
  authored in SolidJS, but that's an implementation detail, not the pitch — a
  reader shouldn't need to care that it's Solid to use `<kai-chat>`. Mention the
  SolidJS primitives only where they're genuinely relevant (deep customization;
  the "Working with Primitives & UI Components" section), not as a co-headline.
- The elements are named `kai-*` (e.g. `<kai-chat>`). State that once, plainly;
  don't keep qualifying it as "the `kai-*` web components (the default)".
- Pick one term — **"web component"** — and stick to it (not "custom element" /
  "widget").
- **Setting array/object data**: the natural framing is JavaScript vs. HTML
  attributes — e.g. "set `messages` in JavaScript (arrays can't be HTML
  attributes)" or "assign it as a property". Avoid the stilted, repeated phrase
  "set as a JS property"; say it like a person would, and don't repeat the
  explanation on every prop once the page has made the point.

## Mechanics

- Icons: **Iconify** (`~icons/lucide/<name>` via unplugin-icons in Solid
  islands; `astro-icon` in `.astro`). Never hand-author `<svg>` paths.
- **No emoji in UI or prose.** Use an Iconify icon instead of `💬`, `☀`/`☾`,
  `🔊`, `✅`, etc. (in islands, a `~icons/lucide/<name>` component). Emoji read as
  unpolished and render inconsistently across platforms.
- Color/spacing: the design tokens (`bg-surface`, `text-ink`, `text-brand`,
  `border-line`, …) — never hard-coded hex.
- Links: descriptive text, never "click here" or a bare URL. Verify no 404s.
- Define any jargon on first use.

## Before you finish

- Read it top to bottom as a developer in a hurry. Cut what doesn't help them ship.
- Every code block tested mentally for correctness; every path/command verified.
- Scannable: headings, short paragraphs, bolded key terms.
