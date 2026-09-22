# Handoff -- the Storybook and component sweep (12 reported items), and the section question

**Date:** 2026-09-22 · **Branch:** `fix/storybook-and-component-sweep` · **Status:** all 12 items
reported by the owner in this stretch are fixed and verified in the tree; the section/tier question is
DEFERRED (see §5) because it is a bigger change than the fixes around it.

Read
[`2026-09-22-per-tag-scaffold-imports.md`](2026-09-22-per-tag-scaffold-imports.md) first; this is what
followed it, and it picks up where that session's §11 left off.

---

## 1. What was reported, and what each one actually was

Every item is listed in the order the owner hit it, with the root cause. **Four of the twelve were one
root cause for the whole class, not a per-component mistake**, which is the pattern worth remembering.

| # | report | root cause | fix |
|---|---|---|---|
| 1 | events mixed in with properties (AgentCard) | events were absent from `argTypes`, so docgen listed them as props | declared them (`action` + `table: { category: 'Events' }` + `fn()`), then a lint rule for the class |
| 2 | boolean props render as "Set object" | Storybook picks a control by matching an EXACT string against the docgen type name, and docgen types every OPTIONAL boolean as `boolean \| undefined` | `shouldRemoveUndefinedFromOptional: true` in `.storybook/main.ts` (one option, every component) |
| 2b | `bool:inert` shows up everywhere | a global `declare module 'solid-js'` augmentation in `collapsible.tsx:13` leaks that key into every component's props type | a docgen `propFilter` dropping directive-namespace keys (66 occurrences -> 0) |
| 3 | ChatThread description renders an internal path and a dangling `).` | Storybook's docgen harvests the doc comment above `const meta` as the story description, and that comment cited a research path | rewrote the copy in six files; a lint/test rule against internal paths in rendered doc comments |
| 4 | file-tree "Changed files" columns jagged | the stat slots were variable-width inside a right-aligned flex, so the left edge drifted with each row's digit count | a grid of fixed tracks (`2rem 2rem 0.75rem`), values right-aligned, no phantom nodes (the parts contract forbids always-rendering them); demo `w-64` -> `w-80` |
| 5 | Dock has no Docs tab and its example is `<PanelBody />` | it was one of the files declaring a meta `component:` without `tags: ['autodocs']`, and its snippets named a helper the story file declares | added the tag; made 12 files' snippets self-contained (inline what the helper renders, or show the data) |
| 6 | a Python code block is uncolored | `python` was not in `DEFAULT_LANGUAGES`, and the unknown-language path fell back to plain text SILENTLY | added `python` + the `py` alias, and made both the unregistered-language and the theme fallbacks report once per value (they were the repo's own "silent fallback" defect) |
| 7 | dropdown's arrow is a text glyph, no gap | `Actions ▾` hand-rolled in the story, while the facade already renders `renderIcon('chevron-down')` with `gap-1.5` | used the kit's icon + gap in dropdown/popover/showcases; the popover's state caret now rotates instead of swapping glyphs |
| 8 | `EditableLabel` needs a single-vs-double-click option | it only had `onDblClick`, the controlled `editing` prop and `edit()` | new `editTrigger?: 'dblclick' \| 'click'` (default unchanged) in BOTH layers, a select control, a story, tests with mutation proofs |
| 9 | `ariaLabel` is a string but the control is an object | same root cause as #2 | fixed by the same option; the audit then found 3 genuine leftovers (`skeleton.width`/`height` -> text, `button.align` -> select) |
| 10 | HoverCard's main Docs preview is blank | the story passed JSX ELEMENTS through `args`; Solid JSX cannot cross Storybook's manager/preview boundary, so the preview re-rendered from empty args | built the JSX in `render`, kept serializable scalars in `args` (the same fix for tooltip) |
| 11 | popover opens INSIDE the story frame, dropdown on top | popover was the only floating layer rendering in place with `position: fixed`, which does NOT escape a containing block (`transform`/`filter`/`contain`/`will-change`, then `overflow` clips) | portal the panel through `config.portalMount()` like the other five; a guard now DERIVES the roster from source |
| 12 | Kbd vs shadcn (their KbdGroup, a button holding a Kbd) | ours is a token-spec design (`keys="Mod+Shift+K"`, platform glyphs) with no way to compose several separate shortcuts | new `KbdGroup` (Solid + `kai-kbd-group`) plus in-button / group / token-spec / inline examples and a docs page |

## 2. The four root causes that explained the bulk of it

1. **Docgen's exact-string control inference.** Storybook's `switch (type.name)` matches `"boolean"`,
   `"string"`, `"number"` and `"enum"` exactly, and `default` yields an object control. So every
   OPTIONAL primitive (`boolean | undefined`) was an object control, and every union
   (`string | number`, `"sm" | "md" | null`) still is. `shouldRemoveUndefinedFromOptional: true` fixed
   the first half globally; the second half needs an explicit control per prop, which is what
   `button.stories.tsx` already did for `variant`.
2. **A convention nobody guarded.** Events, autodocs, self-contained snippets and hand-rolled glyphs
   were all conventions with no rule, so each had drifted in some files. Four lint rules now cover
   them (`lint-story-conventions`, 105 self-test probes).
3. **`position: fixed` is not escape from clipping.** A fixed element is still clipped if any ancestor
   creates a containing block. The kit's answer is one mount point: `define.tsx` renders a `portalNode`
   div inside the facade's own tree (inside the `.dark` token scope) and provides it as
   `ChatConfig.portalMount`. Six floating layers portal through it; the guard derives that roster from
   `position: 'fixed'` in the source rather than listing components.
4. **Silent fallbacks.** The highlighter degraded to uncolored plain text for an unregistered language
   AND for an unresolvable theme, saying nothing. Both now report once per value, naming the exact
   `configureCodeHighlighting(...)` call that fixes it.

## 3. Kbd: what shipped, and the one thing that could not

`KbdGroup` exists in both layers (`KbdGroup`, `<kai-kbd-group>`, `part="group"` registered in the parts
registry) and is documented (`apps/docs/src/content/docs/components/kbd.mdx`, sidebar entry added by
the parent because a new page is unreachable without one). The cap radius moved from `rounded` =
`var(--radius)` = 9.6px (40% of the md cap's 24px) to `rounded-sm` = 5.6px (23%), against shadcn's
`rounded-sm` at about 6px on a 20px cap: ours WAS proportionally rounder, so the owner's eye was right.

**The owner has since said "keyboard isn't what I was expecting", and has not finished reviewing the
rest.** So this is OPEN, not done: treat the Kbd work as an iteration mid-flight, and ask for the
specifics rather than guessing.

**A real limitation found while writing the examples:** shadcn's tooltip example is not expressible
here. `TooltipProps.content` is a `string` in both layers (the slot is the trigger), so a Kbd cannot go
inside the tooltip bubble, and there is no `data-slot`-style hook for the cap to adapt to an inverted
surface. That needs a component decision (a rich-content slot on Tooltip), not a story.

## 4. Guards added, each self-tested

- `lint-story-conventions` (a story declaring `component:` carries `tags: ['autodocs']`; a snippet may
  not name a name the story file declares for itself; a snippet must import every KIT EXPORT it uses,
  with the export list PARSED from `src/index.ts` + `src/solid.ts`; no hand-rolled arrow glyph in
  rendered text, with a line waiver): 105 probes.
- `tests/scripts/floating-layers-portal.test.ts`: derives from `position: 'fixed'` in component sources
  and requires each to render through `Portal`. It found a SIXTH instance the parent's hand-written list
  had missed (`composer`'s suggestion listbox) — which is the argument for deriving.
- `tests/scripts/rendered-description-style.test.ts` gained rule 3 (no internal path in a doc comment a
  documentation pipeline renders), with vacuity floors.

## 5. DEFERRED: the Storybook section question (the owner's call to revisit)

**The owner's framing, verbatim:** some entries are "more than just a component... a full on opinionated
mini app"; `FileTree` is "a common component in ui components, so i don't think its a candidate. just
because something accepts data doesnt qualify it for this section"; and "this is a bigger item than just
small fixes in the components".

So the criterion is NOT "takes data" and NOT "large". What survived scrutiny:

- **`PromptDock` is demo scaffolding, not a component**: no data props, no events, no composed kit
  components; only `top`/`bottom` slots, `frame` and `appearance`; used by exactly two showcase
  recreations (`claude-code`, `codex`) and documented nowhere. Disposition OPEN: demote it to a
  showcase helper (removing `PromptDock` + `kai-prompt-dock` from the public surface), or keep it
  public and document it.
- **The candidate set** (each mounts as ONE region of an app and consumes the host's own data/events,
  the kit never placing it for you): `chat`, `thread`, `conversation`, `prompt`, `composer`, `home`,
  `artifact`, `work-surface`, `builder`; plus two judgment calls the owner has not answered —
  chrome/shell (`app-header`, `nav`, `dock`, `pane`, `screen`) and the card family
  (`card`/`card-surface`/`choice-card`/`confirm-card`/`form`/`tasks`, which render INSIDE a message
  rather than as a region).
- **The word is already spent.** `packages/ui/mcp/catalog/surfaces.ts` DEFINES "surface" as
  "product-shaped, something a user could be handed, proven end-to-end by a Labs/App or deployable
  alone; an ingredient exists only inside something else", and its 12 `sort: 'surface'` rows are all
  `Labs/` recreations (claude-code, chatgpt, codex, t3code, perplexity, v0, wisp, lovable,
  split-workspace, Workspace Home...), enforced against Labs story titles by `lint:catalog-drift`.
  So `Surfaces/` for "a component that occupies a region of an app" would give one word two meanings.
  Recommendations given: use `Surfaces/` and define it in a sentence, or take a free word (`Shells/`
  or `Regions/`). Do NOT use `Patterns/` — that word belongs to assemblies you write.

## 6. Traps this stretch added

1. **A JSX element in `args` blanks the Docs primary preview.** It cannot be serialized across
   Storybook's manager/preview boundary, so the preview renders with empty args while the story itself
   looks right. Keep `args` serializable (scalars, arrays, `fn()`), build JSX in `render`.
2. **A `kai-*` tag declared in MORE THAN ONE story file must match exactly.** Solid JSX declarations are
   not generated (only `react` and `vue` are, in `web-component-types.d.ts`), so each Solid story
   hand-declares the tags it renders; two copies of one tag must be identical or TS2717 fires in every
   file that declares it. Adding one prop to `kai-editable-label` broke `split-workspace.stories.tsx`.
   The real fix is to generate a `solid-js` block too and delete the hand-written copies; NOT done.
3. **A backtick inside a `src(...)` snippet terminates the template literal** and silently kills the
   docs source chain; the convention lint then reports the story as having no snippet.
4. **`position: fixed` does not escape a containing block.** If an ancestor has `transform`, `filter`,
   `perspective`, `contain` or `will-change`, the fixed panel is positioned against THAT box and
   `overflow` clips it. Portal through `ChatConfig.portalMount()` or expect clipping. The guard cannot
   see a `fixed` panel set from a stylesheet class rather than inline — stated in its docblock.
5. **Post-release staleness now bites THREE bundles, all build-time defines.** `create-kai`'s pin
   (`pin-guards.test.ts`), the CLI's `doctor.es.js` kit version and the MCP's `mcp.es.js` own version
   all failed after the 0.36.0 release because their local `dist/` predated the version bumps. Rebuild;
   never "fix" the guard or the test.
6. **Three of the parent's own measurements were wrong, each caught by a lane or by reading the diff:**
   a hand-written component list omitted `composer` (the floating-layer roster); `grep '^\s*component:'`
   matched the docs DESCRIPTION field rather than Storybook's meta `component:` (so "4 files lack
   autodocs" was really 1); and a regex over `args:` matched a later block, inventing a JSX-in-args
   finding. DERIVE the list, then verify the derivation's own output.

## 7. Verification state

Full ladder green on the final tree: `nx build ui --skip-nx-cache`, unit **425 files / 6094 tests**,
emitted 5/36, all 13 `lint:*` gates, `verify:generated` (19 artifacts), `verify:solid-coverage`
(98/98 + 194 props types), `verify:schemas`, `verify:tool-schemas`, `verify:web-components-bundle`,
`verify:scaffold` (528 checked / 705 scaffolds / 110 routes), `verify:construct` (113 cells + 5 consumer
bundles), `verify:pack` (2.08 MiB against the 2.56 MiB ceiling), `verify:fresh`, the UI typecheck
(quarantine + the four tsc passes), cli and mcp and create-kai typechecks, create-kai 935, cli 39,
docs tests 62, `verify:docs` (0 high findings), and the root lints. Rebuilt `cli` and `mcp` so their
bundle-shape guards carry the released versions.

## 8. Open work, ranked

1. **The owner's Kbd review** ("isn't what I was expecting"). Ask for the specifics: tokens vs caps,
   the glyph set, the group's gap, the size scale, or the radius change. The Kbd work is an iteration,
   not a finished feature.
2. **The section/tier decision** (§5). Bigger than the fixes: it changes ~86 story titles, the
   convention lint's title rules, and needs a decision on the word (`Surfaces/` vs a free one), the
   chrome question, and the card family.
3. **`PromptDock`'s disposition** (§5): demote to a showcase helper or document it.
4. **Rich tooltip content** (§3): `TooltipProps.content` is a string, so a Kbd (or anything) cannot go
   in the bubble. A component decision, recorded here so it is not rediscovered as a story bug.
5. **Generate a `solid-js` JSX block** and delete the hand-written declarations in story files (trap 2).
6. The remaining union-typed props still render object controls where a text/select would be better
   (the backlog after #9's audit is not empty; the audit script exists in this session's history).
