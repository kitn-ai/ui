# kitn-chat docs — writing & style guide

The single reference for anyone (human or agent) writing pages for this site.
Read it fully before writing. **Do not copy-paste source material — rewrite it,
thinking about what *this* reader needs.**

## Who you're writing for

A developer evaluating or integrating `@kitn.ai/chat`. They want to **understand
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

## Accuracy (non-negotiable)

Every fact, import path, command, and API must be **verified against the real
source** — never invented or assumed:

- Package + entry points: `package.json` `exports` — `@kitn.ai/chat/elements`
  (web components, any framework), `@kitn.ai/chat/react` (React adapter), `.`
  (SolidJS layer), `@kitn.ai/chat/theme.css`, `@kitn.ai/chat/provider`.
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
- Register the elements with `import '@kitn.ai/chat/elements';` as the primary
  path; show the CDN `<script>` only as a secondary option.

## Component pages

These already follow a fixed, approved template — see
`src/content/docs/components/attachments.mdx` and `artifact.mdx` (the gold
standard). Don't reinvent them.

## House facts & terminology

- Product: **kitn-chat** (`@kitn.ai/chat`). Custom elements are **`kc-*` web
  components**, isolated in **Shadow DOM**.
- Two layers: the **`kc-*` web components** (framework-agnostic, the default DX)
  and the lower-level **SolidJS primitives** (the escape hatch). Be consistent.
- Use the term consistently throughout (don't alternate "web component" /
  "custom element" / "widget" — pick "web component").

## Mechanics

- Icons: **Iconify** (`~icons/lucide/<name>` via unplugin-icons in Solid
  islands; `astro-icon` in `.astro`). Never hand-author `<svg>` paths.
- Color/spacing: the design tokens (`bg-surface`, `text-ink`, `text-brand`,
  `border-line`, …) — never hard-coded hex.
- Links: descriptive text, never "click here" or a bare URL. Verify no 404s.
- Define any jargon on first use.

## Before you finish

- Read it top to bottom as a developer in a hurry. Cut what doesn't help them ship.
- Every code block tested mentally for correctness; every path/command verified.
- Scannable: headings, short paragraphs, bolded key terms.
