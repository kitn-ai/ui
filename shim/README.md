# @kitn.ai/chat → moved to **@kitn.ai/ui**

This package has been **renamed**. Install [`@kitn.ai/ui`](https://www.npmjs.com/package/@kitn.ai/ui) instead:

```bash
npm i @kitn.ai/ui
```

This final `@kitn.ai/chat` release only **re-exports `@kitn.ai/ui`**, so existing
imports keep resolving while you migrate. Docs: **https://ui.kitn.ai**

## When you migrate

The rename also changed the public API surface:

- Custom-element **tags** and **events**: `kc-*` → `kai-*`
  (`<kc-chat>` → `<kai-chat>`, the `kc-submit` event → `kai-submit`, …)
- CSS **theming tokens**: `--kc-*` → `--kai-*`
  (`--kc-color-primary` → `--kai-color-primary`, …)

Update your markup, event listeners, and token overrides accordingly. The JS/TS
imports (`@kitn.ai/ui`, `@kitn.ai/ui/react`, `@kitn.ai/ui/elements`) map 1:1.
