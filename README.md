# kitn-ai

Monorepo for **@kitn.ai/ui**: framework-agnostic, Shadow-DOM `kai-*` web components for building AI chat UIs, authored in SolidJS.

## Layout

- [`packages/ui`](packages/ui): the published kit (`@kitn.ai/ui`) + Storybook + the `kai` MCP.
- [`apps/docs`](apps/docs): the public docs site (ui.kitn.ai), consuming the kit via `workspace:*`.
- [`examples/`](examples): framework consumer examples.

## Develop

```bash
pnpm install
pnpm dev      # Storybook (6006) + docs (4321) together
pnpm build    # build every workspace (ui before docs)
pnpm test     # run all workspace tests
```

Package docs: [`packages/ui/README.md`](packages/ui/README.md).
