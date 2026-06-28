# Labs/Apps gap backlog

The `Labs/Apps` dogfood stories (Claude Code, T3 Code, Codex, ChatGPT, Perplexity,
Perplexity Pro, v0) were built by composing real `kai-*` elements the way a consumer
would. Building real apps with the kit surfaced a handful of places where it cannot
yet express something faithfully. Those gap callouts used to render as labeled boxes
inside the examples; they have been removed so the apps read as finished showcases,
and the gaps are tracked here instead.

Each item is one line: what it is, and which app surfaced it.

## Core kit gaps

- **Workspace conversation-pane suppression** — a way to hide `kai-workspace`'s
  built-in `ConversationList` so a custom rail can own the whole sidebar flex region.
  Surfaced by T3 Code and Perplexity Pro. **DONE** — shipped as the `no-conversations`
  prop, now used by both apps.
- **Tone/status `kai-badge` variant** — `kai-badge` has no built-in tone/status
  variants, so run-state and PR-state chips (Working / Done / Queued / Failed,
  draft / open / merged / closed) are tinted via `::part(badge)` with the
  `--color-tool-*` tokens. A first-class tone prop would remove the per-app CSS.
  Surfaced by Codex.
- **Segmented / toggle-group control** — there is no dedicated segmented
  single-select (form toggle). Examples that need one (Codex's Ask/Code dual-button,
  Perplexity Pro's Assistant | Computer shell toggle) repurpose two `kai-button`s or
  `kai-tabs variant="segmented"` (a tablist, not a form toggle) as the closest fit.
  Surfaced by Codex and Perplexity Pro.

## App-specific / candidate

- **Inline citations in markdown** — `kai-message` renders a markdown string but
  can't interleave `kai-source` citation chips at `[n]` offsets, so cited prose is
  hand-woven JSX (text runs + `kai-source` chips). The chip + hover-snippet + link
  binding itself already ships (`kai-source` / `kai-sources`); only the in-markdown
  interleave is missing. Surfaced by Perplexity and Perplexity Pro.
- **`kai-artifact` named-version history + toolbar slot** — `kai-artifact` has a URL
  history stack (back/forward/navigate), not a v2/v3 version model, and exposes
  `no-*` visibility flags but no toolbar slot to host custom controls (version
  dropdown, Inspect, Deploy/Publish). Surfaced by v0.
- **ConversationList date-grouping / pinned** — the built-in conversation pane
  renders a flat list with relative-time labels; it has no Today / Yesterday /
  Previous-7-Days date-section headers, and `ConversationSummary` has no
  pinned/starred field. Surfaced by ChatGPT.
- **`kai-message` overflow menu + variant pager** — the assistant action row is a
  flat inline set (copy / like / dislike / regenerate), with no overflow "..." menu
  (Read aloud / Share / Branch / View sources) and no regenerate-variant carousel
  (`< 2 / 3 >`) to page between alternate responses. Surfaced by ChatGPT.
- **`kai-suggestions` trailing affordance** — `kai-suggestions` (layout=list) renders
  related rows and emits select, but each row is closed; there is no per-row trailing
  "+" control to add a question to the thread. Surfaced by Perplexity.
- **`kai-nav` gallery surface** — `kai-nav` is a flat (or nested) list; it has no
  expandable gallery/store surface for entries like a GPT gallery behind a "GPTs"
  row. Surfaced by ChatGPT.
- **Lightweight generated-artifact card** — a thin reusable shell with a title row
  and download/maximize actions for a static generated image. `kai-card` gives the
  frame, but there is no built-in action header; `kai-artifact` is a heavy sandboxed
  iframe browser, wrong for a static image. Surfaced by Perplexity Pro.
- **Running token-count pill** — a bare running-token-count bubble for a composer
  toolbar. `kai-context` is a context-window meter (used/max tokens + breakdown),
  not a single running count. Surfaced by T3 Code.
- **Media / image gallery** — a thumbnailed media grid/gallery for an images strip or
  tab. `kai-image` renders a single image; there is no gallery element, so image
  strips are hand-built grids (real `kai-image` tiles in Perplexity Pro, placeholder
  tiles in Perplexity web). Surfaced by Perplexity and Perplexity Pro.

## Not gaps (kept as-is in the examples)

These are correctly the consumer's own layout/content, not components the kit should
own; they are noted so they are not mistaken for gaps later:

- Consumer-owned slot views — e.g. Claude Code's Code/Design takeover slots, where the
  developer mounts their own screen into the `kai-workspace` / `kai-screen` slot.
- Per-screen page layout — headings, grid/masonry arrangements, plain search inputs,
  and the centered composer-led shells are developer CSS assembled from real `kai-*`
  pieces.
