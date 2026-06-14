# Examples

These are **ES-module** web-component demos. They must be **served over HTTP** —
opening them as `file://` pages fails (browsers block ES-module loading from
`file://` with a CORS error, so no components register and you get empty boxes).

## Run

The `composable` and `vanilla`/`widget` examples load the **local build**
(`../../dist/kitn-chat.es.js`), so serve from the **repository root**:

```bash
npm run build      # once — produces dist/
npm run examples   # serves the repo root on http://localhost:8000
```

Then open:

- **Composable showcase** — http://localhost:8000/examples/composable/index.html
  (the full roster of individual elements + the batteries-included `<kc-chat>`)
- Vanilla CDN showcase — http://localhost:8000/examples/vanilla/index.html
- Floating widget — http://localhost:8000/examples/widget/index.html

> Any static server works (`npx serve`, `python3 -m http.server`, …) — the only
> requirements are **HTTP (not `file://`)** and serving from the **repo root** so
> `../../dist/` resolves.

## Framework examples (their own dev servers)

- **`react/`**, **`solid/`**, **`angular/`**, and **`vue/`** are Vite apps. `cd` in, `npm install`, `npm run dev`.
  They alias `@kitn.ai/chat/elements` to the local `dist/kitn-chat.es.js`, so run
  `npm run build` at the repo root first, then start any example's dev server.

  | Directory | Framework | Kit API used |
  |---|---|---|
  | `react/` | React 19 | Generated wrappers from `@kitn.ai/chat/react` |
  | `solid/` | SolidJS | Raw SolidJS component API |
  | `angular/` | Angular 19 | Web components via `[prop]`/`(event)` + `CUSTOM_ELEMENTS_SCHEMA` |
  | `vue/` | Vue 3 | Web components via `:prop.prop` modifier + `@event` bindings; `isCustomElement` in vite.config |

## Why a server?

`<script type="module">` is fetched with CORS semantics; a `file://` origin is
`null`, which browsers refuse. This is a browser rule, not a kit limitation — the
same applies to any ES-module page.
