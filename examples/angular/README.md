# kai-chat — Angular example

A minimal, runnable Angular 19 standalone app demonstrating how to use the
`@kitn.ai/ui` web components natively — **no wrappers needed**.

Angular binds to custom-element DOM properties with `[prop]="value"` and
listens for CustomEvents with `(eventname)="handler($event)"`.  Adding
`CUSTOM_ELEMENTS_SCHEMA` to the component is all that's needed to allow the
`kai-*` tags.

## Prerequisites

Build the kit first so the local bundle (`dist/kitn-chat.es.js`) exists:

```bash
# From the repo root
npm run build
```

## Run (dev server)

```bash
cd examples/angular
npm install
npm run dev
```

Then open **http://localhost:5173** (or whatever port Vite picks).

## Build (production)

```bash
npm run build
```

## Typecheck

```bash
npm run typecheck
```

## How it works

| Concern | Angular pattern |
|---|---|
| Register elements | `import '@kitn.ai/ui/elements'` (side-effect, in `ngOnInit`) |
| Pass arrays/objects | `[groups]="groups"` — sets the DOM *property*, not an attribute string |
| Listen for events | `(kai-conversation-select)="onSelect($event)"` — `($event as CustomEvent).detail` has the payload |
| Allow unknown tags | `schemas: [CUSTOM_ELEMENTS_SCHEMA]` on the standalone component |
| Theme | `[theme]="theme()"` — passes `'light' \| 'dark' \| 'auto'` |

The Vite config aliases `@kitn.ai/ui/elements` to the local `../../dist/kitn-chat.es.js`
so the example exercises the in-repo build without needing a published package.

## Key files

- `src/app/app.component.ts` — standalone component with `CUSTOM_ELEMENTS_SCHEMA`,
  Angular Signals state, and all event handlers
- `src/app/app.component.html` — template with `[prop]` / `(event)` bindings on
  `<kai-workspace>` and `<kai-prompt-input>`
- `vite.config.ts` — local-build aliases
- `src/stubs/` — minimal `.d.ts` stubs that redirect `@kitn.ai/ui/elements`
  type resolution away from the kit's SolidJS source (runtime uses the real bundle)
