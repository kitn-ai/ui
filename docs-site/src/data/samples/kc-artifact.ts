// Sample data for <kc-artifact> non-scalar props. One file per element;
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob, so
// adding an element never touches a shared file.
//
// `sample`  = default non-scalar prop data (the playground + bare examples use it)
// `named`   = alternate sets a focused <Example data="…"> can opt into
//
// Note: `files` entries carry inline `code` for the Code tab. The `url` field is
// intentionally omitted here — the docs site does not host artifact fixtures, so
// the preview iframe stays blank; the Code tab (file tree + source) remains fully
// functional. In production, pair each file entry with a `url` pointing to your
// hosted artifact.

const FILES = [
  {
    path: 'index.html',
    type: 'html',
    language: 'html',
    code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <link rel="stylesheet" href="css/site.css" />
    <title>Starboard — Home</title>
  </head>
  <body>
    <h1>Starboard</h1>
    <p>An AI-generated landing page.</p>
    <a href="about.html">About</a>
  </body>
</html>`,
  },
  {
    path: 'about.html',
    type: 'html',
    language: 'html',
    code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <link rel="stylesheet" href="css/site.css" />
    <title>Starboard — About</title>
  </head>
  <body data-page="about">
    <h1>About Starboard</h1>
    <p>Built with kitn-chat artifacts.</p>
    <a href="index.html">← Home</a>
  </body>
</html>`,
  },
  {
    path: 'css/site.css',
    type: 'other',
    language: 'css',
    code: `:root { --accent: #6ea8fe; }
body {
  font-family: system-ui, sans-serif;
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem;
}
h1 { color: var(--accent); }
a { color: var(--accent); }
.card { border: 1px solid var(--accent); border-radius: 14px; padding: 1rem; }`,
  },
  {
    path: 'assets/logo.svg',
    type: 'image',
  },
];

export default {
  sample: { files: FILES },
  named: {
    // Code-tab view: opens on the CSS file so the Code panel has visible source.
    codeTab: {
      files: FILES,
    },
    // Minimal chrome: same files — toolbar flags are scalar props on <Example config>.
    minimal: {
      files: FILES,
    },
  },
};
