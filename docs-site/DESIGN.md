# kitn docs — design system

One source of truth. **Never hardcode a color, font, or radius in a component** —
use a token (or the Tailwind utility derived from it).

## Tokens — `src/styles/tokens.css`

Semantic tokens, defined once per theme (`[data-theme='dark'|'light']`).

| Token | Role |
|---|---|
| `--kc-brand` | kitn magenta `hsl(326 84% 53%)` — fills: buttons, scrollbar, active bar, tab underline |
| `--kc-accent-soft` | translucent magenta — active nav bg, inline-code chip |
| `--kc-link` | magenta link **text** (darkened in light for AA, brightened in dark) |
| `--kc-bg` | page background — neutral near-black (dark) / white (light) |
| `--kc-surface` / `--kc-surface-2` | cards, preview, console |
| `--kc-line` | hairlines / borders |
| `--kc-ink` / `--kc-ink-2` / `--kc-ink-3` | text: strong / body / labels-dim |

Type: **Lato** (`--sl-font`), **JetBrains Mono** for code only (`--sl-font-mono`).

These tokens drive two consumers:
1. **Tailwind utilities** via `@theme inline` in `app.css` → `bg-surface`, `text-ink`,
   `text-ink-2/3`, `text-brand`, `text-link`, `border-line`, `bg-brand`, `accent-brand`.
2. **Starlight chrome** via the `--sl-*` mapping in `tokens.css`.

Change a token → sidebar, content, and components all move together.

## Components — `src/components/`

All layout is Tailwind flex/grid + the token utilities above. No bespoke CSS in components.

| Component | Purpose |
|---|---|
| `overrides/SiteTitle.astro` | header left: logo + top nav (Docs · Components · Examples) |
| `overrides/SocialIcons.astro` | header right: GitHub + **Ask AI** pill |
| `overrides/ThemeToggle.astro` | sun/moon toggle (replaces Starlight's dropdown) |
| `Facts.astro` | "at a glance" pill row |
| `PropTable.astro` | props + events table, from `element-meta.json` (no drift) |
| `AttachmentsDemo.tsx` | live `<kai-attachments>` Solid island: tabs · preview · console |

## Rules

- Magenta is the **only** brand color. Surfaces are neutral near-black / white. No purple.
- No drop shadows.
- Mono font **only** for code (snippets, prop names/types, console output).
- New component? Compose from the token utilities. If you need a value that isn't a
  token, add the token to `tokens.css` first — don't inline it.
