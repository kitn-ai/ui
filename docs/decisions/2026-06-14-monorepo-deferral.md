# Decision: defer the monorepo; build the card dispatcher inside `@kitnai/chat` (2026-06-14)

**Status:** Accepted · **Context:** raised while scoping the generative-UI "SDK" (the
`renderCard(envelope)` / `<kc-cards>` card dispatcher).

## Decision

Keep `@kitnai/chat` a single published package for now. Build the card dispatcher as
an **export of `@kitnai/chat`**, not a new package. Do **not** convert to a
pnpm/nx monorepo yet.

## Why

- **The dispatcher is not a separate package.** `renderCard` / `<kc-cards>` is
  client-side host glue: it instantiates the already-registered `kc-*` elements, sets
  their `data`/`cardId`/`heading`, and routes events through the existing
  `CardProvider` / `routeCardEvent`. It depends on the Solid runtime, the DOM, and every
  card element — so it belongs next to `CardProvider`/`useCardHost` in this package.
  "SDK" in the Storybook IA `Generative UI/{Overview, Cards, SDK}` is a **docs-section
  name** for that host-glue API, not an npm artifact.
- **No concrete second package exists today.** A monorepo's payoff comes from a second
  independently-versioned artifact; we have one.
- **Conversion is a multi-day infra project with real regression risk:** it touches the
  build pipeline, both spec generators (`gen-element-api`/`gen-component-api`), the
  Storybook + manager-addon config, **release-please** (single → multi-package
  manifest), the **npm OIDC trusted-publishing** setup (per package), tsconfig project
  references, and the example apps. Not worth it for one package + working examples,
  immediately after cutting 0.8.0/0.8.1 cleanly.

## The trigger (when we revisit)

Go monorepo when a **concrete second publishable artifact** appears. Most likely:

- **`@kitnai/card-sdk` (agent/server-side)** — a framework-agnostic, **zero-DOM** helper
  for constructing and validating `CardEnvelope`s against the shipped JSON Schemas. This
  genuinely cannot live in the Solid/DOM package, so it's the strongest candidate.
- A decision to split the **React/Vue wrappers** into their own packages (they're
  currently sub-path exports — `@kitnai/chat/react` — which is fine).
- A shared **`@kitnai/card-contract`** types package consumed by both client and the
  agent SDK.

## Eventual layout (sketch, not a commitment)

```
packages/
  chat/            # @kitnai/chat — components, elements, dispatcher (today's package)
  card-contract/   # @kitnai/card-contract — pure types + JSON Schemas (zero deps)
  card-sdk/        # @kitnai/card-sdk — agent-side envelope build/validate (zero DOM)
examples/          # moved under the workspace (shared install/link)
```

**Tooling note:** prefer **pnpm workspaces** (or npm workspaces) first. Add **nx** only
if the package count and task-graph genuinely warrant it — for 2–4 packages, workspaces
alone give the shared-install / cross-link benefit without nx's orchestration overhead.

## Consequence

The generative-UI Overview + SDK work proceeds inside `@kitnai/chat`. This note records
the trigger so the monorepo step is a deliberate future choice, not a forgotten one.
