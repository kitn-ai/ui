# Patterns

A pattern is a small composition of plain `kai-*` web components that a reader
copies into their own project. It is the middle tier: components are the
parts, patterns are the copyable arrangements, templates (the `create-kai`
starters) are whole apps.

A directory under `patterns/` IS a pattern when it holds a `registry-item.json`
with `"kind": "pattern"`:

```json
{
  "name": "hello-pattern",
  "kind": "pattern",
  "title": "Hello pattern",
  "description": "One sentence, plain punctuation.",
  "files": [
    { "path": "hello-pattern.html", "type": "html" },
    { "path": "hello-pattern.ts", "type": "ts" }
  ]
}
```

`name` equals the directory name. `type` is `html`, `ts` or `css`.

## Authoring rules

- **Shape.** Exactly one `.html` page, at most one `.ts` script, optional
  `.css`. No `.tsx`, no template binding syntax (`.prop=`, `:prop=`, `@event=`,
  `#ref=`, `*directive=`), no controller, no generated framework forms. The
  registry rejects each with a named error.
- **Length.** 50 to 200 lines in total. Shorter is a snippet that belongs in a
  component's docs page; longer is a template.
- **Comments explain the code.** Say why a line is there (an event that does
  not bubble, a property that must be set from script). Never project
  history, ticket numbers or "we used to".
- **Public parts only.** Every `kai-*` element the pattern uses is a public
  component, and it imports the kit only through a documented entry
  (`@kitn.ai/ui/web-components`, `/state`, `/wire`, `/stores`, `/autoloader`).
- **The `kai-` contract holds.** Arrays and objects are set as JS properties,
  events are listened for on the element, streams parse through the
  `@kitn.ai/ui/wire` readers. `checkPatternContracts` enforces it.
- **A story.** Every pattern has a Storybook story titled `Patterns/<Name>`.

## What consumes this directory

- `kai add <pattern>` writes the files verbatim into `src/patterns/<id>/`. With
  no project around it, the script's kit import is rewritten to the pinned CDN
  URL and nothing else changes.
- The docs site's `/patterns` page lists the derived index built from these
  manifests, so adding a directory adds a card.
