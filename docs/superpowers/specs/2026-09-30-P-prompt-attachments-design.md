# P — Prompt attachments: content grows into the input (2026-09-30)

Part of the [composition round](2026-09-29-composition-round-design.md). Added after the owner's
visual checkpoint. Umbrella decision 20.

> Decision 20 (owner, choosing variant B "grows into the input"): "the first one adds a border when
> there isn't one, so I think that may look weird." And: "always having a wrapper around the prompt
> input feels wrong."

Reference: `packages/ui/src/stories/checkpoint/prompt-attachments.stories.tsx`, story
`B. Grows into the input` (`GrowsIntoVariant`), on branch `feat/comp-b0` / `feat/comp-c0`.

## 1. What is true today

- `PromptDock` (`components/prompt/prompt-dock.tsx`) and `kai-prompt-dock`
  (`web-components/prompt/prompt-dock.tsx`) wrap the prompt input in a tray with `top`/`bottom`
  bands. A5 made the bands slide in and out by measured height (`Band`, `prompt-dock.tsx:59-170`:
  a `ResizeObserver` re-reads the height while open, the first paint does not animate, reduced
  motion snaps, content unmounts once closed).
- The prompt input's card (`DefaultPromptInput`, `components/prompt/default-input.tsx`; facade
  `kai-prompt-input`) owns the rounded surface, the shadow and the `focus-within` ring.
- The checkpoint mockup of variant B reached inside `DefaultPromptInput` with descendant selectors
  (`[&_[data-prompt-input]]`) to strip the inner surface. The real version needs a proper part.

## 2. The change

**The input card grows to hold attached content.** `DefaultPromptInput` and `kai-prompt-input`
gain two attachment regions, `above` and `below`, **inside** the card:

```
┌───────────────────────────────────────────────────────────┐  ← the card: surface, shadow, focus ring
│  Plan · 3 of 7 done · Writing tests                    ›  │  ← `above` content
│ ───────────────────────────────────────────────────────── │  ← hairline divider (part `divider-above`)
│  Ask anything…                                        [↑] │  ← the input row, unchanged
└───────────────────────────────────────────────────────────┘
```

- **Nothing attached is pixel-identical to today.** No region, no divider, no extra padding, no
  extra DOM box that takes space. A screenshot test pins it against the pre-change capture.
- **Grow-in.** A region whose content appears grows from 0 to its measured height and fades in;
  going away reverses; content that changes height while open animates to the new height; the
  first paint does not animate; `prefers-reduced-motion: reduce` snaps. This is A5's `Band`
  behaviour, **moved** into a shared primitive, `components/presence/measured-presence.tsx`
  (`MeasuredPresence`), and reused here. It is not re-implemented.
- **The card owns the surface.** The regions carry no surface, border or shadow of their own. The
  divider is a hairline in `border-border` inset to the card's horizontal padding. The focus ring is
  on the card, so focusing into attached content (a plan's disclosure) rings the whole card, the same
  as focusing the input does.
- **Solid:** `DefaultPromptInput` props `above?: JSX.Element`, `below?: JSX.Element`.
  **Web component:** `kai-prompt-input` slots `above` and `below` (detected by `readSlots` +
  `MutationObserver`, like every other slotted region). **Parts:** `attachment-above`,
  `attachment-below`, `divider-above`, `divider-below`, documented in `web-components/slots/slots.ts`
  with recipes.
- **`below`** exists because the plan's and the labs' bottom-lip uses (a mode row, repo/branch
  pills in the Codex lab) need it. It uses the same presence and a divider above it.

## 3. `PromptDock` / `kai-prompt-dock` retired (break now)

Deleted: `components/prompt/prompt-dock.{tsx,test.tsx,stories.tsx}`,
`web-components/prompt/prompt-dock.{tsx,test.ts}`. Migrated to the attachment regions:

- `stories/showcase/claude-code.stories.tsx` (top notice lip → `above`; bottom mode row → `below`)
  and `stories/showcase/codex.stories.tsx` (bottom project/control lip → `below`);
- `web-components/slots/slots.ts` + `slots.test.ts`, `solid.ts`, `register/register-impl.ts`,
  `tests/web-components/attribute-removal.test.tsx`;
- `components/dock/dock.tsx` and `web-components/dock/dock.tsx` (comments that name it);
- docs: `guides/composition.mdx` (its slots example becomes `kai-prompt-input` `above`),
  `guides/app-shell.mdx`, and the component page if present, with a redirect to the prompt-input page;
- regenerated: meta, types, manifest, React wrappers, `mcp/catalog/derived.json`, `llms-full.txt`,
  `docs/web-components.md`.

`kai-chat` does not use `PromptDock` today (measured); it gets the attachment regions through
`DefaultPromptInput`.

## 4. Testing

- Red first: a screenshot of `DefaultPromptInput` with nothing attached, captured before the change,
  must equal the after-change render (Playwright compare in the storybook project, light and dark).
- Unit: `above` content renders inside the card's surface element, above a divider part; no divider
  and no region element without content; slot content added after first render appears; removing it
  collapses and unmounts after the transition.
- In-browser: grow-in height from 0 to measured; growth while open; reduced motion snaps; the focus
  ring surrounds both the attached content and the input when focus is in the attached content; axe.
- The Claude Code and Codex showcase stories render their lips inside the card (screenshots read back).
- A scoped grep for `PromptDock|kai-prompt-dock|prompt-dock` returns only history.

## 5. Acceptance

1. `kai-prompt-input` with nothing in `above`/`below` is pixel-identical to before.
2. Content in `above`/`below` grows into the card over a hairline divider, with the card's own
   surface, shadow and ring.
3. `PromptDock` and `kai-prompt-dock` no longer exist; the labs, stories and docs use the regions.
