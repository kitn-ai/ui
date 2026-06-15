# Spec — per-story "Usage" tabs for Examples/Patterns (#26)

Authoring spec for the framework code snippets shown on each Example/Pattern's
**Usage** tab. The reference implementation is
`src/stories/examples/usage/message-actions.ts` — **match it exactly.**

## Goal

Each Example/Pattern is a granular SolidJS demo. The Usage tab teaches **how you
do the same thing — the props you set, the events you handle — in each
framework.** Snippets are **representative, not a literal copy** of the rendered
demo. Content is **per story** (per variant): the tab shows the entry for the
story you clicked.

## Data shape (`src/stories/examples/usage/<example>.ts`)

Default-export an `ExampleUsage` (see `./types.ts`):

```ts
const example: ExampleUsage = {
  title: 'Examples/<Name>',     // exact Storybook group title
  ...fallback,                   // example-level intro+snippets (use the primary story)
  stories: {
    '<Story Display Name>': storyUsage,   // key = the story's `name:` (display name!)
    ...
  },
};
```

- Each `StoryUsage` = `{ intro, snippets }`.
- **`stories` keys are the story DISPLAY names** (the `name:` field in the
  `.stories.tsx`, e.g. `'Actions on Hover'`), NOT export names. Read the story
  file to get them. One entry per story.
- `snippets` keys: **`html`, `react`, `vue`, `svelte`, `angular`, `solid`** —
  all six. (Solid is the native demo language; include it.)
- `intro`: one line, "how you do this" voice, may use `` `inline code` ``. End
  with a short note like `(The live demo composes the SolidJS … primitives.)`.

## Per-framework binding conventions (copy message-actions.ts)

- **html** — register once: `<script type="module">\n  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/chat/dist/kitn-chat.es.js';\n</script>`. Scalar props → attributes (kebab-case); **object/array props → set as a PROPERTY** (`el.foo = {...}`); events → `el.addEventListener('name', (e) => …e.detail…)`.
- **react** — `import { <DisplayName> } from '@kitn.ai/chat/react'`. Props as JSX props (objects inline `prop={{…}}`); event prop = `on<Event>` (capitalized: `onMessageaction`, `onSubmit`, `onSelect`, `onComplete`, …).
- **vue** — `import '@kitn.ai/chat/elements'` in `<script setup>`. Scalars `:prop="x"` (or plain attr); **objects/arrays `:prop.prop="x"`**; events `@event="handler"`.
- **svelte** — `import '@kitn.ai/chat/elements'`. Scalars as attributes; **objects via `bind:this={el}` + `$: if (el) el.prop = value`**; events `on:event={handler}`.
- **angular** — comment that you `import '@kitn.ai/chat/elements'` before bootstrap + add `CUSTOM_ELEMENTS_SCHEMA`. `[prop]="x"`, `(event)="handler($event)"`.
- **solid** — the **granular primitive composition** that the story actually
  uses (import primitives from `@kitn.ai/chat`, icons from `lucide-solid`).
  Derive it from the story's render function; trim to the essentials. This is
  the one framework that mirrors the demo rather than driving a `kc-*` element.

## Honesty rules

- Ground every prop/event in `src/elements/element-meta.json` for the element(s).
  Never invent props/events. If the demo does something the element can't
  express (e.g. extra buttons not in a fixed action enum), say so in the `intro`
  and show what the element *can* do — don't fake it.
- Sibling stories may share near-identical web-component snippets (same element,
  different props) while their **Solid** snippets differ — that's expected and honest.

## Verify

- `npx tsc --noEmit` clean.
- Story-name keys in `stories` match the `name:` values in the `.stories.tsx`.
- All six framework keys present per story; props/events match element-meta.
- File default-exports one `ExampleUsage`; does not edit `index.ts` (already wired).
