# Labs/Proofs gap backlog

Five token-only proof screens (Storybook -> `Labs/Proofs/*`: Pricing, Dashboard,
Auth, Data Table, Empty States) stress-test one question: can our design tokens
build polished screens we ship no component for? This doc tracks the gaps they
surfaced. The findings were consistent across all five.

## Where we land

The token layer is strong where it covers surfaces, text, borders, and focus
rings. It is weak everywhere the screen needs decision-level color or depth:

- Semantic color (no success/warning/info), state color (no hover/selected).
- Light-mode depth: cards read flat against the page.
- Missing scales: type tops out small, no spacing tokens, no elevation tokens.
- Form controls have no token coverage because they have no components.

And there is no lightweight class-recipe layer. A consumer hand-building a
bespoke screen gets tokens and nothing else - no copy-paste utility classes for
the common primitives.

## Token gaps

Prioritized. "In progress" = being added this session.

| # | Gap | Detail | Status |
|---|-----|--------|--------|
| 1 | Semantic colors | Only `destructive` existed. Missing `success` / `warning` / `info` (+ foregrounds). | In progress |
| 2 | Soft tinted-surface tokens | No opaque, theme-tracking tint of a hue for icon badges / status fills. Agents eyeballed `/10`-`/15` opacities. | In progress |
| 3 | Interaction-state tokens | No `hover` / `selected` background tokens. | In progress |
| 4 | No vivid accent/brand color | `primary` is near-mono, `accent` is a muted neutral. Nothing to anchor a screen. | Needs a brand decision |
| 5 | Light-mode depth | `--color-card` == `--color-background` in light mode, so cards have no contrast vs the page. Everyone worked around it with `surface-sunken` as a faux canvas. | Open |
| 6 | Elevation is class-only | `.kai-elevation` / `-sm` exist but there are no `--shadow-*` tokens, and no mid "card" step. | Open |
| 7 | Type scale tops out small | `--text-title` (16px) is the ceiling. No display / heading sizes for hero numbers or page headings. | Open |
| 8 | Missing scales + recipes | No spacing-scale tokens. No chart/data-viz series palette (`--color-chart-1..n`). No input-background / focus-ring-offset tokens. Focus recipe is inconsistent (textarea ring-1 vs button ring-2). | Open |

## Component gaps

Prioritized.

- **Form controls (biggest).** Text input / field / label, and a checkbox. None
  exist. This blocked every screen with a form.
- **Segmented / toggle-group.** In progress - `kai-segmented`.
- **Stat / metric tile.** Revive the un-shipped `kai-stat`, plus trend/delta and
  a sparkline.
- **Data table / grid.** With pagination and a sortable header.
- **Empty state.** With an icon-badge.
- **Labelled-divider mode** for `kai-separator`.
- **Centered-layout helper** for the vertical-center pattern.
- **Generic badge / pill** plus a status pill usable directly in markup.
- **Pricing / tier card** plus a feature-row.

## Strategic takeaway

The kit's value is locked inside the shadow-DOM `kai-*` elements. A consumer
hand-building a bespoke screen gets only tokens - there is no lightweight
class-recipe layer (button / badge / avatar / input as copy-paste utility
classes, the way shadcn ships `buttonVariants`).

Recommendation: ship more tokens (above) and a documented class-recipe layer.

## Roadmap

Agreed order:

1. Semantic + tinted-surface + state tokens. In progress.
2. Class-recipe layer + form controls.
3. CSS / Tailwind consumer mitigations: namespace the global keyframes and
   `.scrollbar-thin`, add a `theme.css` import-collision warning, and log a CSS
   entry in `docs/package-consumer-issues.md`.

## Per-proof appendix

- **Pricing** - no tier card or feature-row, and no vivid accent to make the
  recommended plan pop.
- **Dashboard** - no stat tile, no chart palette, and cards read flat in light
  mode.
- **Auth** - no form controls at all (input / field / label / checkbox); the
  whole screen is the gap.
- **Data Table** - no table/grid primitive; built from scratch with no sortable
  header or pagination.
- **Empty States** - no empty-state component and no tinted icon-badge token to
  build one cleanly.
