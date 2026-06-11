# Theme Editor — Design

**Date:** 2026-06-11
**Status:** Approved

## Goal

Replace the cramped inline theme editor in the Theming docs with a full-screen,
realistic theme editor where you edit color tokens for **both light and dark
modes** and watch a **real chat UI** reskin live, then copy a complete,
paste-ready theme.

This fixes two confirmed problems with the current editor
(`src/stories/docs/theme-tokens.tsx`):

1. **Confined to the docs column.** It's a fixed-height (480px) two-column grid
   embedded via `<Canvas>` inside the narrow MDX content column.
2. **No dark/light editing.** `setToken` writes an inline style on `<html>`,
   which overrides *both* `:root` and `.dark` simultaneously. Swatches are
   seeded only from light values, and Copy CSS emits only a `:root {}` block —
   never a `.dark {}` block. Dark themes are not authorable today.

It also replaces the synthetic "kitchen-sink" preview with the real product UI.

## Hosting & page structure

- New **full-screen Storybook story** `Theming / Editor` (`layout: 'fullscreen'`)
  so it gets the whole iframe instead of the docs column.
- `Theming.mdx` keeps the auto-generated **token reference table** inline, drops
  the embedded `<Canvas>` editor, and adds a prominent **"Open the theme
  editor →"** link to the story.
- The old `ThemeEditor` / `Preview` (synthetic kitchen-sink) is removed.
  `TokenTable` / `discover()` are retained (table still used in docs).

## Layout

- **Top bar:** `Light | Dark` mode toggle · `Presets ▾` · `Copy CSS` · `Reset`.
- **Left inspector (~300px, scrolls):** color swatches grouped by purpose, plus a
  single **radius slider** bound to `--radius` (the `sm`/`md`/`lg`/`xl` radius
  tokens derive from it via `calc()`, so one control covers all).
- **Right canvas (fills remaining space):** the live preview.

## The canvas — extension point

- **Hero:** the real `full-chat` UI (sidebar + thread + prompt input), reused so
  edits reskin the actual product.
- **Coverage rail** below the hero: a compact strip exercising the tokens the
  chat doesn't naturally hit (`destructive`, `popover`, focus `ring`,
  `badge`/`accent`).
- The canvas is **one self-contained module** that picks up token changes purely
  through CSS — no wiring back to the editor. Moving to a multi-surface gallery
  later (the deferred Option C) is purely additive: add surfaces to this module;
  the editor and controls do not change.

## Dark/light model

- The mode toggle drives a `.dark` class on the **preview wrapper**, independent
  of Storybook's global toolbar toggle, so the canvas renders the selected mode.
- Edits no longer write inline styles on `<html>`. The editor maintains an
  **injected `<style>` element** with separate `:root { … }` and `.dark { … }`
  blocks. Light-mode edits write into the `:root` block; dark-mode edits into the
  `.dark` block. Both sets coexist, and both still pierce the web components'
  shadow DOM via inherited custom properties (same mechanism the kit already
  relies on). The injected style is appended after the kit's stylesheet so its
  rules win.
- Each swatch displays the **active mode's** current value.

## Presets

- A `presets.ts` data module. Each preset is
  `{ name, light: Record<token, value>, dark: Record<token, value> }` — a full
  theme covering all tokens in both modes.
- Starter lineup: **Default** (the shipped palette) · **Violet** · **Emerald** ·
  **Mono**.
- Loading a preset replaces the current working theme. **Reset** returns to
  Default and clears edits.

## Copy CSS / export

- Emits the **complete current theme** (preset + edits) as a paste-ready block:

  ```css
  :root { /* all light tokens */ }
  .dark { /* all dark tokens */ }
  ```

- Full theme rather than minimal diff — this is the "generate a theme" use case,
  matching shadcn's editor. The `:root` + `.dark` override format is exactly what
  the Theming docs already instruct consumers to use.

## Module structure

Under `src/stories/docs/theme-editor/`:

- `presets.ts` — the preset palettes. The live `discover()` / `toHex()` helpers
  stay in `theme-tokens.tsx` (still used by the table) and are imported here and
  by the inspector, so token discovery can't drift from `theme.css`.
- `canvas.tsx` — the chat hero + coverage rail (the swappable preview surface).
- `inspector.tsx` — swatch list + radius slider.
- `theme-editor.tsx` — top bar, mode state, injected `<style>` management,
  copy/reset, composes the above.
- `theme-editor.stories.tsx` — new fullscreen story (`Theming / Editor`).
- `theming-playground.stories.tsx` — keeps only `TokenReference`; `LiveEditor`
  removed.
- `theme-tokens.tsx` — retains `TokenTable`, `discover()`, `toHex()`, `PURPOSE`;
  `ThemeEditor` and `Preview` removed.

## How the preview applies the theme (and a component guideline)

The live preview is **scoped to the canvas**: the editor writes the active mode's
palette (plus `color` and `color-scheme`) directly onto a `CANVAS_CLASS` wrapper.
This makes the canvas reflect the editor's Light/Dark **independently of any
ancestor `.dark`** (e.g. Storybook's own dark theme), and means only the canvas
reskins — not the editor chrome. Copy CSS still exports the full `:root` + `.dark`
theme separately.

**Constraint this implies:** a same-document subtree cannot escape an ancestor
`.dark`, so any component that expresses dark mode via Tailwind `dark:` utilities
(rather than design tokens) will follow Storybook's mode, not the editor's. The
kit therefore themes dark mode purely through tokens; `tool.tsx` (status badges)
and `reasoning.tsx` (`dark:prose-invert`) were migrated to token-based styling so
the editor preview follows the canvas mode everywhere.

**Guideline for new kit components:** drive dark mode through the `--color-*`
tokens (or `.chat-markdown`), not `dark:` utilities, so they theme correctly in
the editor preview, in shadow DOM, and anywhere a scoped theme is applied.

## YAGNI — explicitly out of scope

Randomize, import-existing-CSS, shareable-URL theme links, and font/typography
controls. All easy to add later; not in this pass.

## Verification

Build Storybook and confirm:

- The editor story opens full-screen.
- Editing a token in Light vs Dark changes only that mode.
- Presets reskin both modes in one click.
- Copy CSS produces a valid `:root` + `.dark` block reflecting preset + edits.
- The token reference table still renders on the Theming docs page.
- Web components (`<kitn-chat>`) reskin alongside the Solid components.
