# The original static page

This is the page as it came out of the **Labs/Apps → v0** Storybook story,
before it became a Solid app: one HTML file, one stylesheet, one script.

It is kept here rather than at the project root because a start-mode Solid app
must have no `index.html` at its root -- the Vite plugin generates the entries
-- and one sitting there reads like the app's entry point when it is not.

Regenerate it from the story:

```bash
node ../tools/extract-from-story.mjs
```

It needs `fonts/` and `img/` beside it to render; the fetch script and the
Solid app own the current photography under `../public/img/`.
