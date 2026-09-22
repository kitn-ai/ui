# `docs/` — what is in here, and how to read the old names in it

This directory is a MIX, and the difference matters when you grep it.

**Living documents** (kept current, safe to trust): `coupling-map.md`,
`package-consumer-issues.md`, `framework-compatibility-faq.md`,
`composable-web-components-roster.md`, `web-components.md`, `notes*.md`,
`labs-*-gap-backlog.md`.

**Dated records** (a snapshot of what the tree looked like on their date, never
rewritten): `handoff/`, `superpowers/`, `research/`, `proposals/`, `decisions/`,
`provenance/`. Plans, specs and handoffs are history: a path or a name in one of
them describes the tree AT THE TIME, so the repository does not sweep them when
something is renamed.

<!-- lint-layer-names: file-waived -- the table below names the retired spellings on purpose,
     which is the only way it can tell a reader what they used to be. -->

## The kai-* layer is called web components

Renamed on **2026-09-19**, clean and with no alias (the package is pre-1.0):

| a dated record may say | that means now |
|---|---|
| `@kitn.ai/ui/elements` | `@kitn.ai/ui/web-components` |
| `@kitn.ai/ui/elements/<name>` | `@kitn.ai/ui/web-components/<name>` |
| `src/elements/` | `src/web-components/` |
| `dist/elements/`, `dist/elements.d.ts` | `dist/web-components/`, `dist/web-components.d.ts` |
| `tests/elements/` | `tests/web-components/` |
| `element-meta.json` | `web-component-meta.json` |
| `element-manifest.json` | `web-component-manifest.json` |
| `element-nonscalar.json` | `web-component-nonscalar.json` |
| `element-types.d.ts` | `web-component-types.d.ts` |
| `elementsReady` | `webComponentsReady` |
| `ElementMeta` | `WebComponentMeta` |
| the `element.*` diagnostic event prefix | `web-component.*` |
| `registration: 'elements'` (create-kai) | `registration: 'web-components'` |
| `derived.json`'s `elements` key | `webComponents` |

Why: the things a consumer imports are web components, and Carbon — the
structural model for this package — names the equivalent layer
`@carbon/web-components`. Their `@carbon/elements` is a design-tokens package,
unrelated. "web" alone was rejected because that word already means the browser
runtime here (the `route-web` tsc project, the `browser` build condition).

The DOM's own vocabulary was deliberately NOT renamed, in the archive or in the
tree: `HTMLElement`, `customElements`, `createElement`, `JSX.IntrinsicElements`,
"a plain HTML element", and the generated DOM-interface family
`Kai<Name>Element` / `KaiElementJsxProps`. Those name the ELEMENT — which is what
a custom element is — not the layer.

**Most recent session:** [`handoff/2026-09-22-storybook-and-component-sweep.md`](handoff/2026-09-22-storybook-and-component-sweep.md) — the twelve Storybook and component items the owner reported, and the four root causes behind most of them: docgen's exact-string control inference (so every optional primitive rendered an object control), conventions nobody guarded (events, autodocs, self-contained snippets, hand-rolled glyphs, now four lint rules), `position: fixed` not escaping a containing block (so a floating layer portals or is clipped), and silent fallbacks. Plus `KbdGroup`, the deferred Storybook SECTION question with the corrected criterion, and the traps. Previous session: [`handoff/2026-09-22-per-tag-scaffold-imports.md`](handoff/2026-09-22-per-tag-scaffold-imports.md) — the scaffold and the starters now register only the `kai-*` tags they place: the React wrappers already self-registered per tag (so the react starter's barrel import was pure redundancy), the raw-tag apps take one per-tag entry each loaded dynamically (measured: a static block put 624.7 kB in the vue entry chunk against 100.8 kB dynamic), the SSR-capable targets keep the browser guard because a per-tag entry is client-only, and `verify:scaffold`'s new derived check asserts the block per surface. Previous session: [`handoff/2026-09-22-release-shipped-and-the-skip-path.md`](handoff/2026-09-22-release-shipped-and-the-skip-path.md) — the queued release shipped (`create-kai` 0.8.0, `@kitn.ai/cli` 0.4.0) and the failed publish it uncovered first: a skipped publish runs no `prepublishOnly`, so the kit's `dist/` never existed and the later packages' builds resolved `@kitn.ai/ui/<subpath>` into it. The pre-loop build step and the derived guard that now assert that, the artefacts driven from the registry rather than read, and the traps (npm 404s for minutes after a successful publish; a benign `bin` normalization warning worth checking against the tarball; a `ci:` commit inside a package's directory bumping nothing). Previous session: [`handoff/2026-09-22-release-automation-and-cli-verbs.md`](handoff/2026-09-22-release-automation-and-cli-verbs.md) — the two releases (0.34.0 and 0.35.0) and the lockfile automation that made the second one routine, the five new guards, the CLI's four doors (`create`/`add`/`init`/`upgrade` plus `doctor` and `mcp`), the `kai.json` baseline `upgrade` and `doctor` both read, the design corrections a test found, the traps (a `GITHUB_TOKEN` push triggers no workflows; a `: ` in a workflow scalar breaks the file) and the ranked open work. Previous session: [`handoff/2026-09-21-serverinfo-instructions-and-two-guards.md`](handoff/2026-09-21-serverinfo-instructions-and-two-guards.md) — the three follow-up items after #382 (the CLI's own version in the MCP `instructions`, the `lint:dangling-imports` guard, kai's pack guard), the two things CI caught that the local ladder could not (a colon in a workflow `name:`; a fresh checkout has no build products), and why §3.2's CLI consolidation needs its dependency edge pointed the other way.

**Start here after the #382 merge:** [`handoff/2026-09-21-after-382-and-next-work.md`](handoff/2026-09-21-after-382-and-next-work.md) — where the tree is, the release watch (nothing was published yet), the ranked next work (the CLI consolidation, `serverInfo`, the relative-specifier resolver guard, kai's pack guard), this session's traps and the verification ladder.

**Session close (start here after a reset):** [`handoff/2026-09-19-session-close.md`](handoff/2026-09-19-session-close.md) — the state of `update/primitives`, every decision the owner made with the reasoning, the verified ladder, the open work, and the traps. **Most recent sessions:** [`handoff/2026-09-20-invariant-floor-imports.md`](handoff/2026-09-20-invariant-floor-imports.md) — it supersedes that doc's whole §7: §7.1 the acceptance floor resolves a snippet's kit imports, so the invariant catalog imports the real URL predicates instead of copying the scheme lists; §7.2 the audit's remaining sink-coverage vectors are pinned; §7.3 the flake is pinned and now self-naming; §7.4 the leftover wording is swept and the nested-`d.ts` question measured and declined. And [`handoff/2026-09-20-packaging-and-cli-decisions.md`](handoff/2026-09-20-packaging-and-cli-decisions.md) — the packaging thread: why the kit stays ONE package with `@kitn.ai/ui/<name>` subpaths, the 21-specifier surface written down in one place, what the tarball actually weighs, the ranked work (entry-point docs + guard, `files` trims, the dev-tooling peel — now `@kitn.ai/cli` + `@kitn.ai/mcp`), and the deferred `npx kai` / CLI-consolidation question.

Full account, including the deliberate exceptions and the traps:
[`handoff/2026-09-19-web-components-rename.md`](handoff/2026-09-19-web-components-rename.md).

`lint-layer-names: archive-note` — this file is the receipt for the dated
archive's exemption from `pnpm --filter @kitn.ai/ui run lint:layer-names`. That
guard fails if the note above stops saying what happened to the old name, so the
exemption cannot outlive its explanation.
