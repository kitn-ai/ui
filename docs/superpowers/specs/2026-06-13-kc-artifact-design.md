# `<kc-artifact>` — generated-artifact viewer (design)

> Brainstormed 2026-06-13. Built **after** `<kc-resizable>` (its layout spine);
> its own branch + plan cycle. Prefix scheme: `kc-*`.

## Goal

A framed, switchable **artifact viewer**: shows a consumer-served, AI-generated
artifact as a live **Preview** (sandboxed iframe + functional nav toolbar) or its
**Code** (file tree + syntax-highlighted source). This is the "canvas / artifacts"
pattern — Claude Artifacts, ChatGPT Canvas, V0, Lovable, bolt — and the natural
occupant of a `<kc-resizable>` panel beside chat.

## Sourcing model — (B) consumer-served URL (decided)

The component **frames** content; it does **not** serve it. The consumer's backend
(the one running the AI) hosts the generated files and hands the component a URL.
So back/forward/reload/relative-links/animations/multi-format all work **natively**
— exactly how the ChatGPT, Claude-code, and V0 previews work (a real server behind
the iframe). Client-side service-worker serving (zero-backend) is explicitly **out
of scope** (a separate, much larger subsystem).

## Anatomy (one element, `<kc-artifact>`)

- **Toolbar** (functional, *no* macOS window cosmetics): back · forward · reload ·
  home, an editable path/URL field (shows the iframe's current location), and the
  **Preview | Code** tab toggle.
- **Preview pane:** a **sandboxed `<iframe>`** framing `src`. Renders whatever the
  URL serves — HTML / PDF / image — natively.
- **Code pane:** a **file tree** + the active file's source via `<kc-code-block>`.
  Selecting a file navigates the preview to its URL *and* shows its source.

## API (controlled, kit-style)

- `src` (attr) — URL the preview frames; consumer sets it.
- `files` (prop) — a JSON array `[{ path, url?, code?, language?, type? }]`:
  `path` = tree label/key (folders built from `/`); `url` = where the preview
  loads it (an arbitrary hosted location — dev server, **CDN/S3 bucket**, or an
  API endpoint; falls back to `<src-origin> + path` if omitted); `code` = source
  for the Code tab; `type` ∈ `html | pdf | image | other` (icons + whether Code
  applies). Clicking a file navigates the preview to its `url`.
- `tab` (attr) — `preview` | `code` (default `preview`).
- `sandbox` (attr) — override the iframe `sandbox`; secure default
  (`allow-scripts allow-forms`, **not** `allow-same-origin` unless opted in).
- `activeFile` (attr) — selected path (syncs tree highlight + Code source).
- Events: `navigate` (`{ url }`), `tabchange` (`{ tab }`), `fileselect` (`{ path }`).
- The component owns its iframe navigation (a browser navigates itself) and emits
  `navigate` so the consumer can observe/sync.

## Component decomposition (sub-components this needs)

- **`Artifact` (Solid) + `<kc-artifact>` (facade)** — the orchestrator.
- **`FileTree` (Solid, NEW) + `<kc-file-tree>` (facade — PUBLIC in v1)** — renders a
  path-based file/folder tree from `files`, with **collapsible nested folders**
  built from `/`-delimited paths, active selection + a `select` event. Reusable
  beyond the artifact (any file explorer). **This is the main new sub-component**,
  and it ships as its own public element from the start.
- **Reuses:** `<kc-code-block>` (code view), `Button` (toolbar controls).
- **Tabs:** the 2-tab Preview|Code toggle is a small internal segmented control —
  a general `Tabs` primitive is **not** required for v1 (revisit if a 3rd tab,
  e.g. Console, lands).
- **Internal (not public):** `ArtifactToolbar`, `ArtifactPreview`, `ArtifactCode`
  — focused composition units inside `Artifact`.

## Security

The preview iframe is **sandboxed** (`allow-scripts allow-forms` default; widen via
`sandbox`). The framed artifact is AI-generated, so do **not** default to
`allow-same-origin` (that + `allow-scripts` defeats isolation). `src` is
consumer-controlled; we never inject raw HTML strings (that's the srcdoc/SW path,
out of scope). The iframe gets a `title`.

## Multi-format

The iframe renders whatever the served URL returns — HTML pages, the browser's
native PDF viewer for a `.pdf`, an image for an image URL — for free. The **Code**
tab applies only to text files; for pdf/image it's hidden or shows a "no source"
note.

## v1 scope

Toolbar (functional nav) + Preview/Code tabs + file tree (`FileTree`) + sandboxed
iframe + multi-format-by-iframe.

**Deferred (noted as future):** viewport-width toggles (mobile/tablet/desktop), a
Console tab, in-place editing (canvas-style), and the service-worker zero-backend
path.

## Layering & files (when built — separate cycle)

- `src/components/artifact.tsx` — `Artifact` + internal toolbar/preview/code units.
- `src/components/file-tree.tsx` — `FileTree`.
- `src/elements/artifact.tsx` — `<kc-artifact>` facade; register in `register.ts`.
- `src/elements/file-tree.tsx` — `<kc-file-tree>` facade (public, v1); register.
- Static **sample artifacts** under a fixtures dir (a couple of linked HTML pages +
  an image, maybe a PDF), served by Storybook (`staticDirs`) and the examples
  server — so stories/examples are real without a backend.
- Stories: `Web Components/kc-artifact` + `Web Components/kc-file-tree` (required) +
  Solid `Artifact`/`FileTree`.

## Accessibility

Icon toolbar buttons get `aria-label`; tabs use `tab`/`tabpanel` ARIA; the file
tree is a `tree`/`treeitem` (or labeled list) with keyboard nav; iframe has a
`title`. Target: 0 axe violations (light + dark).

## Testing

- Logic (jsdom): registers; tab toggle; file-select → `navigate`/`fileselect`;
  `sandbox`/`src` reflected; `FileTree` builds folders from paths + selection.
- Playwright: real iframe framing a served fixture; nav (back/forward/reload);
  Code tab renders via `<kc-code-block>`; multi-format (point at a pdf/image).
- a11y + screenshots (preview, code, light + dark).

## Decisions (resolved 2026-06-13)

1. **`<kc-file-tree>` is public in v1** — `FileTree` (Solid) + the `<kc-file-tree>`
   element ship together.
2. **Folders nest** — collapsible folders built from `/`-delimited paths.
3. **Nav model:** the component self-navigates the iframe and emits `navigate`;
   `files`/`activeFile` are inputs that sync the tree + Code tab. A file's `url` is
   an arbitrary hosted location — a dev server, a **CDN/S3 bucket**, or an API
   endpoint.
4. **Editable path field:** yes (type a path → navigate).

## Examples & fixtures

Stories and the runnable example need no backend: they point the preview at a few
**hosted sample pages** — static fixtures (a couple of cross-linked HTML pages + an
image, optionally a PDF) served by Storybook (`staticDirs`) and the examples server
— and feed a **JSON `files` object** into the tree, so clicking a file navigates the
iframe to that hosted page. In production the consumer points each file's `url` at
wherever their AI-generated artifact is served.

## Out of scope (separate efforts)

Service-worker client-side serving; in-browser build/run (WebContainers).
