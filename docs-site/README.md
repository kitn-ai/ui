# kitn-chat docs site

The public documentation + DX surface for [`@kitn.ai/ui`](https://www.npmjs.com/package/@kitn.ai/ui),
built with [Astro](https://astro.build) + [Starlight](https://starlight.astro.build).
Doc widgets are authored in **Solid** (the kit's own language); the real `kai-*` web
components are embedded live in MDX so every example is the actual component.

Deploys to GitHub Pages at `ui.kitn.ai` (static build, `base: '/chat'`,
Pagefind search). Storybook is demoted to an internal tool (the axe-gated story test
suite + a Solid/Advanced playground), not the public face.

## Wired to the live kit build — no committed snapshot

`scripts/sync-kit.mjs` (run automatically on `predev`/`prebuild`) syncs this site to
the **live kit build** at the repo root — it never commits a stale snapshot:

| Source (repo root)                  | → Target (gitignored)        | Used by                              |
| :---------------------------------- | :--------------------------- | :----------------------------------- |
| `dist/*.js`                         | `public/kitn/`               | runtime: the element bundle + Shiki chunks (`src/components/example/kit.ts`) |
| `src/elements/element-meta.json`    | `src/data/element-meta.json` | Props/Events/Composed-from tables    |
| `src/elements/framework-usage.json` | `src/data/framework-usage.json` | per-framework code snippets       |

If the kit hasn't been built yet, the sync builds it first (`npm run build` at the
repo root), so a fresh clone's `npm run dev` just works.

## Commands

Run from this directory (`docs-site/`):

| Command           | Action                                                          |
| :---------------- | :------------------------------------------------------------- |
| `npm install`     | Install dependencies                                            |
| `npm run sync:kit`| Sync `public/kitn/` + `src/data/` from the live kit build       |
| `npm run dev`     | Sync, then start the dev server (serves under `/chat`)          |
| `npm run build`   | Sync, then build the static site to `./dist/`                   |
| `npm run preview` | Preview the production build locally                            |

## Structure

```
docs-site/
├── public/                 # static assets (kitn-logo, favicon); public/kitn/ is synced
├── scripts/sync-kit.mjs    # syncs the site to the live kit build
├── src/
│   ├── components/         # doc widgets (Solid islands + Astro)
│   │   ├── example/        # reusable: kit loader, Resizer, CodePanel
│   │   └── overrides/      # Starlight component overrides (Header, ThemeToggle, …)
│   ├── content/docs/       # the pages (.md/.mdx) — one route per file
│   ├── data/               # synced generator metas (gitignored)
│   └── styles/             # tokens.css (one source) + app.css
└── astro.config.mjs
```

See `DESIGN.md` for the design system, and the component-page template in
`src/content/docs/components/attachments.mdx` (the approved pattern for every element).
