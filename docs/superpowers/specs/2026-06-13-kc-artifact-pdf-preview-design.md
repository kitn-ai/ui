# `<kc-artifact>` PDF preview — design (2026-06-13)

Follow-on to `2026-06-13-kc-artifact-design.md`. Closes the one remaining gap from
that spec: **PDF preview**.

## Problem

`<kc-artifact>`'s Preview pane frames a **consumer-served `src`** in a
**cross-origin sandboxed `<iframe>`** (sandbox = `allow-scripts allow-forms`, no
`allow-same-origin`). HTML and images render fine. **PDFs render blank**: the
browser's native PDF viewer is a plugin-class context that the `sandbox` attribute
deliberately blocks, and relaxing the sandbox would defeat the isolation that is
the whole point of framing provider-served content.

## Goal

Show PDFs **inline** when we can, and degrade **honestly** when we can't — without
adding a bundled dependency.

- **Inline render** via **pdf.js**, loaded **on demand from a CDN** (never bundled,
  never loaded until a PDF actually appears — mirroring how Shiki code-splits).
- pdf.js runs in **`<kc-artifact>`'s own shadow DOM** (rendering pages to
  `<canvas>`), *not* inside the sandboxed iframe (we can't inject into a
  cross-origin sandboxed frame — that's the isolation property).
- pdf.js fetches the PDF bytes itself, so **cross-origin PDFs need CORS**. When the
  fetch is CORS-blocked, or pdf.js fails to load/parse, **fall back gracefully** to
  an "Open in new tab ↗ / Download" card. This CORS tax is unavoidable from the
  host side, not a shortcut.

### Non-goals
- Bundling pdf.js (deliberately excluded — see "Why CDN, not bundled" below).
- Paginated viewer / zoom controls (continuous-scroll fit-width only for v1).
- Editing/annotating PDFs.
- Any change to Shiki loading: its language/theme files are **bundled lazy chunks
  served from the host's own origin** (not remote), and `configureCodeHighlighting`
  already exposes loader overrides — so there is no analogous CORS/CSP problem and
  nothing to add there.

### Why CDN, not bundled (decision)

Measured gzip transfer sizes (v6.0.227):

| | gzip |
|---|---|
| Entire kit (`kitn-chat.es.js`) | ~87 KB |
| pdf.js core (`pdf.min.mjs`) | ~124 KB |
| pdf.js worker (`pdf.worker.min.mjs`) | ~358 KB |
| **pdf.js total** | **~482 KB — ~5.5× the whole kit** |

Both a CDN dynamic import and a Shiki-style bundled lazy `import('pdfjs-dist')`
keep pdf.js out of the **initial** runtime bundle (code-split / fetched only on
first PDF render — never touched if the artifact viewer or a PDF is never used).
The deciding difference is the **published-package footprint**: bundling drags
those ~482 KB into our npm tarball and every consumer's `node_modules`, making the
kit *look* ~5.5× heavier to anyone inspecting it — the exact "why is this kit so
big?" head-scratch we want to avoid. CDN keeps our package at ~87 KB and makes
pdf.js a transparent, pay-for-what-you-use external resource. The only cost —
strict-CSP/air-gapped hosts must allowlist jsDelivr — is covered by the
`configurePdfPreview({ load, workerSrc })` self-host override, with the fallback
card degrading gracefully on any block or outage. **Decision: CDN.**

## Architecture

Two layers, mirroring the existing `highlighter.ts` / `code-block.tsx` split.

### 1. `src/primitives/pdf-preview.ts` (framework-agnostic primitive)

Owns **only** pdf.js loading + low-level page→canvas rendering. Parallels
`highlighter.ts` (singleton load promise, configurable loaders, test reset).
Nothing here loads until `renderPdfInto` is first called — a component set that
never shows a PDF ships and runs with **zero pdf.js bytes**.

```ts
export interface PdfjsLike {
  getDocument(src: string | { url: string }): { promise: Promise<PdfDocLike> };
  GlobalWorkerOptions: { workerSrc: string };
}

export interface PdfPreviewOptions {
  /** Turn inline PDF rendering on/off globally. When false, always show the card. */
  enabled?: boolean;
  /** Override the pdf.js module loader (self-host / CSP / version pin). */
  load?: () => Promise<PdfjsLike>;
  /** Worker URL. Default = the matching jsDelivr worker for the pinned version. */
  workerSrc?: string;
}

/** Pinned, exact (reproducible) — NOT a range. */
const PDFJS_VERSION = '6.0.227';
const CDN = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build`;
// default load:  () => import(/* @vite-ignore */ `${CDN}/pdf.min.mjs`)
// default worker: `${CDN}/pdf.worker.min.mjs`

export function configurePdfPreview(opts: PdfPreviewOptions): void;
export function isPdfPreviewEnabled(): boolean;
export function __resetPdfPreviewForTests(): void;

/** Load pdf.js once (singleton promise); set GlobalWorkerOptions.workerSrc. */
function loadPdfjs(): Promise<PdfjsLike>;

/**
 * Render EVERY page of the PDF at `url` into `container` as stacked <canvas>
 * elements sized to `pxWidth` (CSS device px; render at pxWidth * dpr for crispness,
 * canvas style width 100%). Clears `container` first. Resolves `{ pages }`.
 * THROWS on load / CORS / parse failure — the caller catches and falls back.
 */
export async function renderPdfInto(
  url: string,
  container: HTMLElement,
  pxWidth: number,
): Promise<{ pages: number }>;
```

Notes:
- `import(/* @vite-ignore */ urlString)` keeps Vite from trying to resolve/bundle
  the CDN URL at build time (it must stay a runtime fetch).
- jsDelivr serves both build + worker with permissive CORS (verified HTTP 200 for
  `pdf.min.mjs` and `pdf.worker.min.mjs` at the pinned version).
- The worker is the same-version jsDelivr URL; a host overriding `load` for an
  air-gapped setup also sets `workerSrc`.

### 2. `ArtifactPdfPreview` (internal Solid component in `artifact.tsx`)

Owns the **scroll container, render lifecycle, resize re-render, and the three
visible states**. Given a reactive `url`:

- **disabled** (`isPdfPreviewEnabled() === false`) → render the fallback card
  immediately, **no network**.
- **loading** → a `<Loader>` while the lib + document parse; container `aria-busy`.
- **success** → continuous-scroll stacked canvases, each fit to panel width.
- **error** (any throw from `renderPdfInto`) → fallback card.

Behavior:
- `createEffect` on `url` (and a reload signal) re-renders.
- A **debounced ResizeObserver** re-renders at the new width for crispness when the
  panel resizes (fit-width is preserved by CSS `width:100%` in between).
- On cleanup, cancel any in-flight render and clear the container.

### 3. Fallback card — `ArtifactPdfFallback` (internal)

Icon + filename (derived from the URL's last path segment) + two **native anchors**
(keyboard-accessible, no JS nav):
- **Open in new tab ↗** — `<a href={url} target="_blank" rel="noopener noreferrer">`
- **Download** — `<a href={url} download>`

Used for both the **disabled** and **error** states (same component). Copy:
"Can't preview this PDF inline."

## Detection — when is the current preview a PDF?

The Preview pane frames `currentUrl()`, which may come from a file click, the `src`
prop, or the editable path field. A pure helper decides:

```ts
/** PDF if a files[] entry matches the url with type:'pdf', else the url path
 *  (query/hash stripped) ends in `.pdf` (case-insensitive). */
export function isPdfUrl(url: string, files: ArtifactFile[]): boolean;
```

This lives next to `resolveFileUrl` in `artifact.tsx` (both are URL helpers tied to
`ArtifactFile`).

## Preview branching (toolbar unchanged)

The toolbar (back · forward · reload · home · path field · Preview|Code) and the
component's own history stack are **untouched**. Only the body of the Preview tab
gains a branch:

```tsx
<Show when={tab() === 'preview'} fallback={<ArtifactCode … />}>
  <Show
    when={isPdfUrl(currentUrl(), local.files)}
    fallback={<ArtifactPreview ref=… src={currentUrl} sandbox=… onLoad=… />}
  >
    <ArtifactPdfPreview url={currentUrl} />
  </Show>
</Show>
```

- `reload()` must also re-render the PDF (not only the iframe). Implement by bumping
  a reload signal that `ArtifactPdfPreview` tracks, in addition to the existing
  iframe reset. Back/forward/home/path-edit change `currentUrl()` → natural
  re-render.
- The iframe path is completely unchanged for HTML/image artifacts.

## Public API surface (additions)

- `configurePdfPreview`, `isPdfPreviewEnabled`, `PdfPreviewOptions` — exported from
  the primitives barrel alongside the existing `configureCodeHighlighting` family,
  so the two configuration entry points sit together.
- No new props on `Artifact` / `<kc-artifact>` for v1 (config is global, matching
  Shiki). `ArtifactFile.type` already includes `'pdf'`.

## Accessibility

- Success container: `role="region"`, `aria-label="PDF preview: <name>, <n> pages"`,
  `aria-busy` while rendering.
- Each page `<canvas>`: `role="img"`, `aria-label="Page <n>"`.
- Fallback anchors are native and focusable; the card region is labelled.
- 0 axe violations in light **and** dark (per the project gate).

## Error handling

| Condition | Result |
|---|---|
| `enabled: false` | Fallback card, no network |
| pdf.js CDN load fails (offline / CSP block) | Fallback card |
| `getDocument` rejects (CORS / 404 / corrupt) | Fallback card |
| Render succeeds | Stacked canvases |
| `url` changes mid-render | Cancel in-flight, render new |

All failure paths funnel through one `catch` → fallback card. No thrown errors
escape the component.

## Testing

**Unit (vitest, jsdom):**
- `isPdfUrl`: `.pdf` extension; query/hash stripped (`a.pdf?x=1#y` → true); non-pdf
  (`a.html`) → false; `files[]` `type:'pdf'` match wins regardless of extension.
- `configurePdfPreview`: toggles `enabled`; injected custom `load` is used; reset
  helper restores defaults.
- **Branch tests via injected fake pdf.js** (jsdom has no real canvas/worker):
  - `configurePdfPreview({ load: fake returning N pages })` → `ArtifactPdfPreview`
    reaches the success state; assert N page elements.
  - `load` that throws → fallback card rendered (Open/Download anchors present,
    href = url).
  - `enabled: false` → fallback card with **no** `load` call.

  This is the same split `highlighter.ts` uses: real engine rendering is verified
  empirically, not in jsdom.

**Empirical (Playwright + Storybook — REQUIRED by project norms):**
- Inline story points at the **same-origin** `examples/artifact-fixtures/report.pdf`
  (served via `staticDirs`, so CORS-safe): assert ≥1 `<canvas>` renders and the
  pages **fill the panel width** (measured, not eyeballed).
- Fallback story (a bad/cross-origin URL, or `enabled:false`): assert the card +
  working Open/Download anchors.
- a11y sweep: 0 violations light + dark.

**Gate:** build + typecheck + test (baseline = 3 pre-existing Shiki failures in
`tests/primitives/highlighter.test.ts`) + test:react (5/5) + a11y.

## Stories

- **Update** the existing (currently blank) PDF story to render
  `artifact-fixtures/report.pdf` inline, source-visible.
- **Add** a fallback story (disabled or bad URL) so both paths are documented and
  visible.

## Rollout

Single `feat` branch off `main` (now at 0.8.0-pending via release-please). Cuts a
minor on merge. Verify visually/empirically before merge per norms.
