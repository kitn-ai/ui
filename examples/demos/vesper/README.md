# Vesper

A standalone static website: the AW26 editorial landing page for "Vesper", a
fictional fashion label, in a white soft-UI (neumorphic) aesthetic with a Playfair
Display editorial display face.

It uses **none of `@kitn.ai/ui`**. It is plain HTML, one stylesheet, one small
script, self-hosted fonts and six photographs — no build step, no dependencies,
nothing to install.

```
index.html
css/styles.css                      the whole design system + layout
js/shop.js                          the featured-piece configurator (color + size)
fonts/playfair-display-{400,700}.woff2
img/*.jpg                           six grayscale editorial photographs
tools/extract-from-story.mjs        re-derives everything above from the story
```

## Run it

Serve the directory over HTTP:

```bash
python3 -m http.server 8899        # then http://localhost:8899
# or: npx serve .
```

Opening `index.html` as a `file://` page works too — nothing here needs an origin —
but a server is closer to how it would be deployed. To deploy, upload the directory
as-is; there is no build output to produce.

## Where it came from

`packages/ui/src/elements/v0.stories.tsx` — the **Labs/Apps → v0** Storybook story,
an app-builder shell whose right pane is a real `<kai-artifact>`. That story builds
this page entirely inline (CSS in a template literal, fonts and photography as
base64 `data:` URIs, sections as string builders) and frames it as the artifact's
preview. This directory is the same page with those inlined pieces written out as
real files.

The story is unchanged and remains the source. `tools/extract-from-story.mjs`
re-derives this directory from it by *evaluating* the story's own builders rather
than re-typing their output, so the two cannot drift silently:

```bash
node tools/extract-from-story.mjs
```

The story frames three progressive versions (v1 hero only, v2 adds the lookbook,
v3 adds the configurator). Only **v3**, the complete build, is extracted here.

Two deliberate differences from the story's output, both because this is a real
page rather than an iframe preview: every photograph carries real `alt` text
instead of the generated `alt=""`, and the hero image is `fetchpriority="high"`
rather than `loading="lazy"`, since it is the LCP element.

## Not a workspace member

There is no `package.json`. `pnpm-workspace.yaml` does not list `examples/demos/*`,
so this directory is outside the install graph, the typecheck graph and CI. It is
a website that happens to live in the repo, not an example of consuming the kit —
if it ever needs to be deployed as a product site, it can be lifted out whole.
