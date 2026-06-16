# Spec — Storybook design + DX redesign (proposal)

**Status:** proposal for Rob's review. **Mock:** open
`docs/proposals/storybook-redesign/index.html` in a browser (toggle the theme top-right).
**Coordination:** this touches `.storybook/`, `styles.css`, and the docs MDX — the
[[components-prop-driven-not-css]] / docs-IA territory the parallel agent owns.
Confirm that agent has fully landed before implementing.

## 1. The goal

Make the Storybook feel **designed** — like `examples/composable` (image #5), not
default Storybook (images #2/#3). Two tracks, equal weight:

- **Design** — brand the chrome (manager sidebar, docs pages, code blocks, loading
  states) in the kit's own visual language so a developer feels thought was put in.
- **DX** — restructure the *content* so component pages are scannable and inviting
  instead of a "sea of words," and add the wayfinding a docs site is expected to have.

## 2. Research — what makes the references good

- **VitePress** (Rob's example): a three-column layout (nav · content · *on-this-page*),
  one confident type system, generous whitespace, custom **containers/callouts**
  (`tip`/`warning`/`danger`), badges, a polished code block with copy, persistent
  **⌘K search**, prev/next pager, edit-on-GitHub, and a flash-free dark mode. The win
  isn't any one feature — it's that the CSS "knows how to style things," so every page
  inherits care for free.
- **monday Vibe Storybook** (Rob's example, *not* a style to copy): proof that a
  Storybook *can* be fully rebranded — custom manager theme, custom MDX doc blocks
  (usage do/don't, prop tables, guidelines), a sidebar that reads like a product.
- **Our own `examples/composable`** (the actual north star): Bricolage Grotesque +
  JetBrains Mono, warm-paper / warm-charcoal palette, purple accent, a faint **dot-grid**
  atmosphere, **numbered sections** (`01`, `02`…), specimen cards with mono name-tags.
  This is an *established* kitn language — the job is to **extend it into Storybook**,
  not invent a new one.

Important distinction the design rests on: **chrome ≠ canvas.** The composable
*showcase chrome* is warm-paper + purple; the shipped **product tokens** (`theme.css`)
are neutral grayscale / warm-charcoal. The redesign brands the **chrome** (sidebar,
docs pages) in the showcase language while component **previews keep rendering the real
neutral product tokens**. The two never fight.

## 3. Diagnosis — why it looks unfinished today

1. **The manager is 100% default Storybook.** `.storybook/manager.ts` sets behavior
   (panel/tab visibility) but **no `theme`** — so the sidebar/toolbar are stock
   "Nunito Sans" Storybook. This is the single biggest "we gave up" signal.
2. **Docs content is flat prose.** `specDescription(tag, paragraphs[])`
   (`element-controls.ts`) joins 4–5 dense markdown paragraphs — each stuffed with bold
   inline-code and parentheticals — into one blob rendered by `.sbdocs-content`. That's
   image #3: good information, zero hierarchy, nothing for the eye to grab.
3. **Dark-mode FOUC + un-themed skeleton (image #2).** `storybook-dark-mode` applies
   `.dark` to the docs iframe via JS *after* load → white flash. The built-in
   `@storybook/blocks` loading skeleton has hardcoded light fills our `.dark` overrides
   never reach. Both are fixable (§5.5).
4. **No wayfinding.** No on-this-page rail, no in-page section anchors, no prev/next —
   long docs pages are just a scroll.

## 4. Design language (the system the mock implements)

| Token group | Light | Dark |
|---|---|---|
| bg / surface / raised | `#f4f2ec` / `#fbfaf6` / `#fff` | `#121110` / `#1a1917` / `#201f1c` |
| ink / muted / faint | `#1b1a17` / `#5f5a4f` / `#8a8377` | `#f1efe9` / `#908b80` / `#6f6a60` |
| accent / accent-2 | `#6d28d9` / `#8b5cf6` | `#a78bfa` / `#c4b5fd` |
| good / warn (callouts) | `#15803d` / `#b45309` | `#4ade80` / `#fbbf24` |

- **Type:** Bricolage Grotesque (display + body) · JetBrains Mono (code, labels,
  numerals) — same as the showcase, loaded via `managerHead`/`previewHead`.
- **Motifs:** dot-grid atmosphere (masked), numbered section headers (`01`), mono
  component-name tag chips with a square accent bullet, pill controls, 12–16px radii.

**Reusable doc primitives** (built once, used on every page — all shown in the mock):
hero (eyebrow + title + lede + tag chip + "at a glance" facts), `callout` (`tip` /
`use` / `warn`), numbered `steps`, `proptable` ("you'll reach for these five"), `events`
list, dark terminal `code` block, on-this-page rail.

## 5. The Storybook levers (how it actually gets built)

### 5.1 Manager theme — `.storybook/manager.ts`
Add `addons.setConfig({ theme: create({...}) })` (`storybook/theming`): `base`,
`brandTitle`/`brandImage` (a small kitn mark), `colorPrimary/Secondary` = accent,
`appBg`/`appContentBg`/`appBorderColor` = our surfaces, `fonts.base`/`fonts.mono`,
sidebar text colors. Storybook persists the dark/light choice; we supply **both** a
light and dark `create()` and switch with `storybook-dark-mode`'s existing hook.

### 5.2 Fonts — `.storybook/main.ts`
`managerHead` + `previewHead` inject the Google Fonts `<link>` (Bricolage + JetBrains)
so chrome, docs, and the args table all share the type system.

### 5.3 Branded docs surface — `.storybook/styles.css`
Extend what's already there: apply the §4 tokens to `.sbdocs-*`, restyle headings/links/
inline-code, add the dot-grid to the docs wrapper. Most rules already exist for dark
mode — we're swapping neutral values for the warm palette and adding the light side.

### 5.4 Structured component docs — the content fix (biggest DX win)
Replace the flat `specDescription(tag, paragraphs[])` with **branded MDX/JSX doc
blocks** rendered above the autodocs canvas, via a **custom `DocsContainer`**
(`parameters.docs.container`) or a small `<ElementDoc>` block fed from `element-meta.json`:

- **Hero** — eyebrow (`Web Component`), friendly title (`Artifact`), one-line lede,
  `kc-artifact` tag chip, "at a glance" facts.
- **When to use** — a `use` callout (one scannable sentence, not paragraph 2).
- **How to use** — numbered `steps`, not a 90-word run-on.
- **Sandbox/gotcha** — a `warn` callout.
- **Props at a glance** — 4–6 hand-picked rows; the *full* generated table stays on the
  **API tab** (unchanged).
- **Events** — the `events` list from the typed `Events` map.

Authoring stays terse: a per-element record (`tagline`, `whenToUse`, `steps[]`,
`highlightProps[]`) instead of a prose array. The mock's Artifact page is the exact
before/after for image #3.

### 5.5 Kill the flash + theme the skeleton
- **FOUC:** a tiny inline `previewHead` script reads the persisted theme from
  `localStorage` and sets `.dark` on `<html>` **before first paint** (the mock already
  does this in its `<head>`), and we set the docs/canvas default background to the dark
  token so there's nothing white to flash to.
- **Skeleton:** add `.dark`-aware overrides for the `@storybook/blocks` loading skeleton
  selectors (the gray bars), reusing the warm palette.

### 5.6 DX wayfinding
On-this-page rail with scrollspy (mock has it working), section anchor links, "Copy"
on code blocks, prev/next pager between sibling docs, optional edit-on-GitHub, and the
already-present ⌘K search surfaced visually in the sidebar.

## 6. Scope & phasing

- **Phase 1 — Chrome (high impact, low risk):** manager theme + fonts + branded
  `styles.css` + FOUC/skeleton fix. Pure presentation; no story files change. This alone
  closes the "default Storybook" gap and fixes image #2.
- **Phase 2 — Structured component docs:** the `<ElementDoc>` block + restructured
  `specDescription` authoring, rolled out to the ~40 element pages. Closes image #3.
  *Prototype on `kc-artifact` first* (per [[design-decisions-delegation]]), get sign-off,
  then fan out.
- **Phase 3 — Wayfinding & MDX polish:** on-this-page, prev/next, copy buttons, and a
  pass over the hand-written MDX (Introduction/Installation/Frameworks) using the new
  primitives.

Each phase is independently shippable and reversible; bump per [[version-bump-each-change]].

## 7. Open decisions for Rob

1. **Body font.** The showcase uses Bricolage for everything. Keep it for long-form docs
   body too, or pair a more reading-optimized body face? (Mock keeps Bricolage.)
2. **Phase 2 authoring.** Custom `DocsContainer` (wraps every page, most control) vs. a
   `<ElementDoc>` block imported per story (more explicit, less magic)? Recommend the
   block — easier to reason about and test.
3. **How far to take the manager.** Theme tokens + fonts + brand mark is safe and high-ROI.
   Heavier sidebar custom-rendering is possible but fights Storybook upgrades — recommend
   *not* doing it.
4. **Coordination:** is the docs-IA agent done, so this is mine to own?

## 8. Non-goals

- Re-theming the component **previews** (they must keep rendering real product tokens).
- Touching the IA/sidebar **structure** (groups/titles) — that's the parallel agent's.
- A bespoke search backend — Storybook's built-in search stays.
