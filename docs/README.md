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

**Session close (start here after a reset):** [`handoff/2026-09-19-session-close.md`](handoff/2026-09-19-session-close.md) — the state of `update/primitives`, every decision the owner made with the reasoning, the verified ladder, the open work, and the traps. **Most recent session:** [`handoff/2026-09-20-invariant-floor-imports.md`](handoff/2026-09-20-invariant-floor-imports.md) — it supersedes the close doc's §7.1 (the acceptance floor resolves a snippet's kit imports now, so the invariant catalog imports the real URL predicates instead of copying the scheme lists) and §7.2 (the security audit's remaining sink-coverage vectors are pinned).

Full account, including the deliberate exceptions and the traps:
[`handoff/2026-09-19-web-components-rename.md`](handoff/2026-09-19-web-components-rename.md).

`lint-layer-names: archive-note` — this file is the receipt for the dated
archive's exemption from `pnpm --filter @kitn.ai/ui run lint:layer-names`. That
guard fails if the note above stops saying what happened to the old name, so the
exemption cannot outlive its explanation.
