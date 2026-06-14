# kc-artifact PDF preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render PDFs inline in `<kc-artifact>`'s Preview pane via pdf.js loaded on-demand from a CDN, with a graceful "Open in new tab / Download" fallback when inline rendering isn't possible.

**Architecture:** A new framework-agnostic primitive `src/primitives/pdf-preview.ts` (mirroring `highlighter.ts`) owns pdf.js loading + page→canvas rendering and exposes `configurePdfPreview`. `src/components/artifact.tsx` gains an `isPdfUrl` detector and two internal Solid components (`ArtifactPdfPreview`, `ArtifactPdfFallback`); the Preview pane branches between the existing sandboxed iframe (HTML/image) and the PDF viewer.

**Tech Stack:** SolidJS, TypeScript, Vite, Vitest, `@solidjs/testing-library`, pdf.js (`pdfjs-dist@6.0.227`, loaded from jsDelivr at runtime — NOT a bundled dependency), lucide-solid icons, Storybook.

**Spec:** `docs/superpowers/specs/2026-06-13-kc-artifact-pdf-preview-design.md`

**Project norms (apply to EVERY task):**
- SolidJS: **never destructure props** — always `props.x`.
- Gate before declaring done: `npm run build` && `npm run typecheck` && `npm test` && `npm run test:react`. Baseline = **3 pre-existing Shiki failures** in `tests/primitives/highlighter.test.ts` (do not try to fix them; anything beyond those 3 is a regression you caused).
- pdf.js must NEVER be added to `package.json` — it is fetched from the CDN at runtime only. The only `import` of it is the runtime CDN URL string inside `pdf-preview.ts`.
- Real pdf.js canvas rendering is verified empirically (Playwright/Storybook) by the human, NOT in jsdom. jsdom tests use an **injected fake pdf.js** via `configurePdfPreview({ load })`.

---

### Task 1: pdf-preview primitive — config state + enable/reset

**Files:**
- Create: `src/primitives/pdf-preview.ts`
- Test: `tests/primitives/pdf-preview.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/primitives/pdf-preview.test.ts
import { afterEach, expect, test } from 'vitest';
import {
  configurePdfPreview,
  isPdfPreviewEnabled,
  __resetPdfPreviewForTests,
} from '../../src/primitives/pdf-preview';

afterEach(() => __resetPdfPreviewForTests());

test('inline PDF preview is enabled by default', () => {
  expect(isPdfPreviewEnabled()).toBe(true);
});

test('configurePdfPreview can disable inline rendering', () => {
  configurePdfPreview({ enabled: false });
  expect(isPdfPreviewEnabled()).toBe(false);
});

test('__resetPdfPreviewForTests restores defaults', () => {
  configurePdfPreview({ enabled: false });
  __resetPdfPreviewForTests();
  expect(isPdfPreviewEnabled()).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/primitives/pdf-preview.test.ts`
Expected: FAIL — cannot resolve `../../src/primitives/pdf-preview`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/primitives/pdf-preview.ts
// On-demand PDF renderer built on pdf.js, loaded from a CDN only when a PDF is
// actually shown — so a component set that never renders a PDF ships and runs with
// ZERO pdf.js bytes (the ~482 KB gzip library is never fetched). When a PDF does
// appear, pdf.js is dynamically imported from the pinned CDN build and every page
// is rendered to a <canvas>. Hosts override the loader (self-host / CSP / pin) or
// disable inline rendering via configurePdfPreview(). Mirrors highlighter.ts.

/** Minimal shape of the pdf.js module + objects we rely on. */
export interface PdfViewportLike {
  width: number;
  height: number;
}
export interface PdfPageLike {
  getViewport(opts: { scale: number }): PdfViewportLike;
  render(opts: {
    canvasContext: CanvasRenderingContext2D | null;
    viewport: PdfViewportLike;
  }): { promise: Promise<void> };
}
export interface PdfDocumentLike {
  numPages: number;
  getPage(n: number): Promise<PdfPageLike>;
}
export interface PdfjsLike {
  getDocument(src: { url: string }): { promise: Promise<PdfDocumentLike> };
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
const DEFAULT_LOAD = (): Promise<PdfjsLike> =>
  // Template literal + @vite-ignore keeps this a runtime fetch (never bundled).
  import(/* @vite-ignore */ `${CDN}/pdf.min.mjs`) as Promise<PdfjsLike>;
const DEFAULT_WORKER_SRC = `${CDN}/pdf.worker.min.mjs`;

let enabled = true;
let loader: () => Promise<PdfjsLike> = DEFAULT_LOAD;
let workerSrc = DEFAULT_WORKER_SRC;

export function configurePdfPreview(options: PdfPreviewOptions): void {
  if (options.enabled !== undefined) enabled = options.enabled;
  if (options.workerSrc !== undefined) workerSrc = options.workerSrc;
  if (options.load !== undefined) {
    loader = options.load;
  }
}

export function isPdfPreviewEnabled(): boolean {
  return enabled;
}

export function __resetPdfPreviewForTests(): void {
  enabled = true;
  loader = DEFAULT_LOAD;
  workerSrc = DEFAULT_WORKER_SRC;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/primitives/pdf-preview.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/primitives/pdf-preview.ts tests/primitives/pdf-preview.test.ts
git commit -m "feat(pdf-preview): config + enable/reset primitive scaffold"
```

---

### Task 2: pdf-preview primitive — loadPdfjs singleton + renderPdfInto

**Files:**
- Modify: `src/primitives/pdf-preview.ts`
- Test: `tests/primitives/pdf-preview.test.ts`

- [ ] **Step 1: Write the failing test** (append to the existing test file)

```ts
import { renderPdfInto, type PdfjsLike } from '../../src/primitives/pdf-preview';

/** A fake pdf.js that "renders" `pages` blank pages without touching a real canvas. */
function fakePdfjs(pages: number): PdfjsLike {
  return {
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: () => ({
      promise: Promise.resolve({
        numPages: pages,
        getPage: () =>
          Promise.resolve({
            getViewport: ({ scale }: { scale: number }) => ({ width: 100 * scale, height: 140 * scale }),
            render: () => ({ promise: Promise.resolve() }),
          }),
      }),
    }),
  };
}

test('renderPdfInto appends one canvas per page and returns the page count', async () => {
  configurePdfPreview({ load: () => Promise.resolve(fakePdfjs(3)) });
  const container = document.createElement('div');
  const result = await renderPdfInto('doc.pdf', container, 600);
  expect(result.pages).toBe(3);
  expect(container.querySelectorAll('canvas')).toHaveLength(3);
  expect(container.querySelector('canvas')?.getAttribute('role')).toBe('img');
});

test('renderPdfInto rejects when the loader throws (caller falls back)', async () => {
  configurePdfPreview({ load: () => Promise.reject(new Error('blocked')) });
  const container = document.createElement('div');
  await expect(renderPdfInto('doc.pdf', container, 600)).rejects.toThrow('blocked');
});

test('renderPdfInto clears prior content before rendering', async () => {
  configurePdfPreview({ load: () => Promise.resolve(fakePdfjs(1)) });
  const container = document.createElement('div');
  container.innerHTML = '<span>stale</span>';
  await renderPdfInto('doc.pdf', container, 600);
  expect(container.querySelector('span')).toBeNull();
  expect(container.querySelectorAll('canvas')).toHaveLength(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/primitives/pdf-preview.test.ts`
Expected: FAIL — `renderPdfInto` is not exported.

- [ ] **Step 3: Write minimal implementation** (append to `src/primitives/pdf-preview.ts`)

```ts
let pdfjsPromise: Promise<PdfjsLike> | null = null;

/** Load pdf.js once (singleton); set the worker src. Re-loads if the loader changed. */
function loadPdfjs(): Promise<PdfjsLike> {
  if (!pdfjsPromise) {
    const active = loader;
    pdfjsPromise = (async () => {
      const mod = await active();
      const pdfjs = ((mod as unknown as { default?: PdfjsLike }).default ?? mod) as PdfjsLike;
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

/**
 * Render EVERY page of the PDF at `url` into `container` as stacked <canvas>
 * elements fit to `pxWidth` CSS pixels (rendered at devicePixelRatio for
 * crispness). Clears `container` first. Resolves `{ pages }`. THROWS on
 * load / CORS / parse failure — the caller catches and shows the fallback card.
 */
export async function renderPdfInto(
  url: string,
  container: HTMLElement,
  pxWidth: number,
): Promise<{ pages: number }> {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ url }).promise;
  container.replaceChildren();
  const dpr =
    typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const scale = base.width > 0 ? pxWidth / base.width : 1;
    const viewport = page.getViewport({ scale: scale * dpr });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `Page ${n}`);
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    container.appendChild(canvas);
    await page.render({ canvasContext: ctx, viewport }).promise;
  }
  return { pages: doc.numPages };
}
```

Also update `configurePdfPreview` so changing the loader resets the singleton, and `__resetPdfPreviewForTests` clears it. Replace the body of `configurePdfPreview`'s `load` branch and the reset function:

```ts
// inside configurePdfPreview:
  if (options.load !== undefined) {
    loader = options.load;
    pdfjsPromise = null;
  }
```

```ts
export function __resetPdfPreviewForTests(): void {
  enabled = true;
  loader = DEFAULT_LOAD;
  workerSrc = DEFAULT_WORKER_SRC;
  pdfjsPromise = null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/primitives/pdf-preview.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/primitives/pdf-preview.ts tests/primitives/pdf-preview.test.ts
git commit -m "feat(pdf-preview): on-demand pdf.js loader + renderPdfInto"
```

---

### Task 3: Export the config API from the package barrel

**Files:**
- Modify: `src/index.ts:16-17` (add after the `configureCodeHighlighting` exports)

- [ ] **Step 1: Add the exports**

After line 17 (`export type { CodeHighlightingOptions } from './primitives/highlighter';`) insert:

```ts
export { configurePdfPreview, isPdfPreviewEnabled } from './primitives/pdf-preview';
export type { PdfPreviewOptions } from './primitives/pdf-preview';
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS (no output / exit 0).

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat(pdf-preview): export configurePdfPreview from the barrel"
```

---

### Task 4: isPdfUrl detector

**Files:**
- Modify: `src/components/artifact.tsx` (add an exported helper next to `resolveFileUrl`, ~line 52-61)
- Test: Create `tests/components/artifact.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/artifact.test.tsx
import { expect, test } from 'vitest';
import { isPdfUrl } from '../../src/components/artifact';
import type { ArtifactFile } from '../../src/components/artifact';

const files: ArtifactFile[] = [
  { path: 'a.html', url: 'https://x/a.html', type: 'html' },
  { path: 'doc', url: 'https://x/doc', type: 'pdf' }, // pdf with no .pdf extension
  { path: 'r.pdf', url: 'https://x/r.pdf', type: 'pdf' },
];

test('detects a .pdf extension', () => {
  expect(isPdfUrl('https://x/r.pdf', files)).toBe(true);
});

test('ignores query/hash when checking the extension', () => {
  expect(isPdfUrl('https://x/r.pdf?v=2#page=3', files)).toBe(true);
});

test('uses the matching file type even without a .pdf extension', () => {
  expect(isPdfUrl('https://x/doc', files)).toBe(true);
});

test('returns false for non-pdf urls', () => {
  expect(isPdfUrl('https://x/a.html', files)).toBe(false);
  expect(isPdfUrl('', files)).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/artifact.test.tsx`
Expected: FAIL — `isPdfUrl` is not exported.

- [ ] **Step 3: Write minimal implementation** — add to `src/components/artifact.tsx` right after the `resolveFileUrl` function (around line 61):

```ts
/** True when `url` should render as a PDF: a matching `files` entry is typed
 *  `'pdf'`, or the URL path (query/hash stripped) ends in `.pdf`. */
export function isPdfUrl(url: string, files: ArtifactFile[]): boolean {
  if (!url) return false;
  const match = files.find((f) => f.url === url || f.path === url);
  if (match?.type === 'pdf') return true;
  const path = url.split(/[?#]/)[0];
  return /\.pdf$/i.test(path);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/artifact.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/artifact.tsx tests/components/artifact.test.tsx
git commit -m "feat(artifact): isPdfUrl preview detector"
```

---

### Task 5: ArtifactPdfFallback card

**Files:**
- Modify: `src/components/artifact.tsx` (imports + new internal component near the other internal components at the bottom)

- [ ] **Step 1: Add lucide imports** — extend the existing `lucide-solid` import (currently `ArrowLeft, ArrowRight, RotateCw, House, Eye, Code as CodeIcon`) to also include `FileText, ExternalLink, Download`:

```ts
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  House,
  Eye,
  Code as CodeIcon,
  FileText,
  ExternalLink,
  Download,
} from 'lucide-solid';
```

- [ ] **Step 2: Add the fallback component** at the bottom of `artifact.tsx` (after `ArtifactCode`):

```tsx
// --- ArtifactPdfFallback (internal) ---------------------------------------

/** Shown when inline PDF rendering is disabled or fails (CORS / load / parse). */
function ArtifactPdfFallback(props: { url: string }): JSX.Element {
  const name = () => {
    const path = props.url.split(/[?#]/)[0];
    return path.slice(path.lastIndexOf('/') + 1) || 'document.pdf';
  };
  const linkClass =
    'inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  return (
    <div
      role="region"
      aria-label="PDF preview unavailable"
      class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card p-6 text-center"
    >
      <FileText size={40} class="text-muted-foreground" aria-hidden="true" />
      <div class="text-sm font-medium text-foreground">{name()}</div>
      <div class="text-xs text-muted-foreground">Can't preview this PDF inline.</div>
      <div class="flex flex-wrap items-center justify-center gap-2">
        <a class={linkClass} href={props.url} target="_blank" rel="noopener noreferrer">
          Open in new tab
          <ExternalLink size={13} aria-hidden="true" />
        </a>
        <a class={linkClass} href={props.url} download>
          <Download size={13} aria-hidden="true" />
          Download
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/artifact.tsx
git commit -m "feat(artifact): PDF fallback card (open / download)"
```

---

### Task 6: ArtifactPdfPreview component (states + render lifecycle)

**Files:**
- Modify: `src/components/artifact.tsx` (imports + new internal component)

- [ ] **Step 1: Extend the solid-js + add primitive imports** — add `onMount`, `onCleanup` to the existing `solid-js` import, and add a new import line for the primitive:

```ts
import {
  type JSX,
  splitProps,
  mergeProps,
  createSignal,
  createEffect,
  createMemo,
  on,
  onMount,
  onCleanup,
  Show,
} from 'solid-js';
```

Add near the other component imports (after the `FileTree` import line):

```ts
import { Loader } from './loader';
import { isPdfPreviewEnabled, renderPdfInto } from '../primitives/pdf-preview';
```

- [ ] **Step 2: Add the component** at the bottom of `artifact.tsx` (after `ArtifactPdfFallback`):

```tsx
// --- ArtifactPdfPreview (internal) ----------------------------------------

/**
 * Renders a PDF inline via pdf.js (loaded on demand). Four states:
 * disabled → fallback (no network); loading → spinner; success → stacked
 * fit-width canvases; error (load/CORS/parse) → fallback card. Re-renders when
 * the url or `reloadKey` changes, and (debounced) when the panel resizes.
 */
function ArtifactPdfPreview(props: { url: string; reloadKey: number }): JSX.Element {
  const [state, setState] = createSignal<'loading' | 'success' | 'error'>('loading');
  let container: HTMLDivElement | undefined;
  let token = 0;
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;

  const renderNow = async () => {
    if (!isPdfPreviewEnabled() || !container) {
      setState('error');
      return;
    }
    const mine = ++token;
    setState('loading');
    try {
      const width = container.clientWidth || 600;
      await renderPdfInto(props.url, container, width);
      if (mine === token) setState('success');
    } catch {
      if (mine === token) setState('error');
    }
  };

  createEffect(
    on(
      () => [props.url, props.reloadKey] as const,
      () => {
        void renderNow();
      },
    ),
  );

  onMount(() => {
    if (!container || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (state() !== 'success') return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => void renderNow(), 200);
    });
    ro.observe(container);
    onCleanup(() => {
      ro.disconnect();
      clearTimeout(resizeTimer);
      token++; // cancel any in-flight render
    });
  });

  return (
    <div class="absolute inset-0">
      {/* Always present so clientWidth is the real panel width. */}
      <div
        ref={(el) => (container = el)}
        role="region"
        aria-label="PDF preview"
        aria-busy={state() === 'loading'}
        class="absolute inset-0 flex flex-col items-center gap-3 overflow-auto bg-muted/20 p-3 scrollbar-thin"
      />
      <Show when={isPdfPreviewEnabled() && state() === 'loading'}>
        <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader variant="circular" size="md" />
        </div>
      </Show>
      <Show when={!isPdfPreviewEnabled() || state() === 'error'}>
        <ArtifactPdfFallback url={props.url} />
      </Show>
    </div>
  );
}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/artifact.tsx
git commit -m "feat(artifact): ArtifactPdfPreview inline pdf.js viewer"
```

---

### Task 7: Wire the PDF branch into the Preview pane + reload re-render

**Files:**
- Modify: `src/components/artifact.tsx` — the `Artifact` component body (reload signal, `reload()`, the preview `<Show>`)
- Test: `tests/elements/artifact-element.test.tsx` (fallback path via the element)

- [ ] **Step 1: Add a reload signal** — inside `Artifact`, next to the other signals (after the `tab`/`activeFile` signals, ~line 103):

```ts
  const [reloadKey, setReloadKey] = createSignal(0);
```

- [ ] **Step 2: Bump it in `reload()`** — modify the existing `reload` function (~line 175-183) to also re-render the PDF viewer:

```ts
  function reload() {
    const url = currentUrl();
    if (iframeEl) {
      // Force a real reload even when the src is unchanged.
      iframeEl.src = 'about:blank';
      iframeEl.src = url || 'about:blank';
    }
    setReloadKey((k) => k + 1); // re-render the inline PDF viewer too
    local.onNavigate?.(url);
  }
```

- [ ] **Step 3: Branch the preview body** — replace the inner `<ArtifactPreview … />` of the preview `<Show>` (~line 245-252) with a nested branch:

```tsx
        <Show
          when={isPdfUrl(currentUrl(), local.files)}
          fallback={
            <ArtifactPreview
              ref={(el) => (iframeEl = el)}
              src={currentUrl}
              sandbox={local.sandbox}
              title={local.iframeTitle ?? 'Artifact preview'}
              onLoad={onIframeLoad}
            />
          }
        >
          <ArtifactPdfPreview url={currentUrl()} reloadKey={reloadKey()} />
        </Show>
```

(The outer `<Show when={tab() === 'preview'} fallback={<ArtifactCode … />}>` stays exactly as-is; only its child changes.)

- [ ] **Step 4: Write the failing test** — append to `tests/elements/artifact-element.test.tsx`:

```tsx
import {
  configurePdfPreview,
  __resetPdfPreviewForTests,
} from '../../src/primitives/pdf-preview';

afterEach(() => __resetPdfPreviewForTests());

test('kc-artifact shows the fallback card for a PDF when inline preview is disabled', async () => {
  configurePdfPreview({ enabled: false });
  const el = document.createElement('kc-artifact') as HTMLElement & { src: string };
  el.src = 'https://example.com/report.pdf';
  document.body.appendChild(el);
  await flush();
  const root = el.shadowRoot!;
  const links = Array.from(root.querySelectorAll('a')).map((a) => a.textContent ?? '');
  expect(links.some((t) => /Open in new tab/i.test(t))).toBe(true);
  expect(links.some((t) => /Download/i.test(t))).toBe(true);
});

test('kc-artifact frames non-PDF src in the iframe (no fallback card)', async () => {
  const el = document.createElement('kc-artifact') as HTMLElement & { src: string };
  el.src = 'https://example.com/index.html';
  document.body.appendChild(el);
  await flush();
  const root = el.shadowRoot!;
  expect(root.querySelector('iframe')).toBeTruthy();
});
```

- [ ] **Step 5: Run the element tests**

Run: `npx vitest run tests/elements/artifact-element.test.tsx`
Expected: PASS — including the two new tests. (The existing `afterEach` removing elements and this file's new `afterEach` both run; that's fine.)

- [ ] **Step 6: Commit**

```bash
git add src/components/artifact.tsx tests/elements/artifact-element.test.tsx
git commit -m "feat(artifact): branch Preview to inline PDF viewer + reload"
```

---

### Task 8: Stories — inline PDF + fallback (source-visible)

**Files:**
- Modify: `src/elements/artifact.stories.tsx` (update `PdfPreview` doc, add `PdfFallback`)
- Modify: `src/components/artifact.stories.tsx` (add `PdfPreview` + `PdfFallback`)

- [ ] **Step 1: Update the element PdfPreview story description** — in `src/elements/artifact.stories.tsx`, change the comment above `export const PdfPreview` (line ~212) from the native-viewer wording to:

```tsx
/** Multi-format: PDFs render inline via pdf.js (loaded on demand from a CDN). */
```

- [ ] **Step 2: Add a fallback story** to `src/elements/artifact.stories.tsx` immediately after the `PdfPreview` story (after its closing `};`):

```tsx
/** When inline rendering can't work (CORS / 404 / blocked CDN) the viewer shows
 *  an "Open in new tab / Download" card. Here the src 404s to force that path. */
export const PdfFallback: Story = {
  name: 'PDF (fallback card)',
  render: () => (
    <Frame>
      <kc-artifact
        src={`${BASE}/assets/does-not-exist.pdf`}
        iframe-title="Missing PDF"
      />
    </Frame>
  ),
};
```

- [ ] **Step 3: Add both stories to the components story file** — append to `src/components/artifact.stories.tsx`:

```tsx
/** PDFs render inline via pdf.js (loaded on demand from a CDN). */
export const PdfPreview: Story = {
  name: 'PDF (inline)',
  render: () => <Artifact src={`${BASE}/assets/report.pdf`} files={FILES} />,
};

/** Fallback card when inline rendering can't work (here the src 404s). */
export const PdfFallback: Story = {
  name: 'PDF (fallback card)',
  render: () => <Artifact src={`${BASE}/assets/does-not-exist.pdf`} />,
};
```

(If `Story` is not already the story type alias in the components file, use the same `StoryObj<typeof meta>` alias that the other stories in that file use — check the top of the file and match it.)

- [ ] **Step 4: Verify build + typecheck**

Run: `npm run build && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/elements/artifact.stories.tsx src/components/artifact.stories.tsx
git commit -m "docs(artifact): inline-PDF + fallback stories"
```

---

### Task 9: Full gate + handoff for empirical verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full gate**

Run: `npm run build && npm run typecheck && npm test && npm run test:react`
Expected:
- build: PASS (32 elements).
- typecheck: PASS.
- `npm test`: only the **3 baseline Shiki failures** in `tests/primitives/highlighter.test.ts`; all new pdf-preview/artifact tests PASS. Anything else failing = a regression to fix before proceeding.
- `npm run test:react`: 5/5 PASS.

- [ ] **Step 2: Report for empirical verification**

Do NOT claim the feature is visually working. Report to the human that the gate is green and list exactly what remains for them to verify empirically in Storybook (a full Storybook restart is required — custom elements don't re-register on HMR):
- `Web Components/kc-artifact` → "PDF (multi-format)" renders `report.pdf` inline as stacked canvases that fill the panel width.
- "PDF (fallback card)" shows the Open/Download card.
- Tab to Code and back; reload button re-renders the PDF.
- a11y: 0 violations light + dark.

- [ ] **Step 3: Commit any final cleanup** (only if needed)

```bash
git add -A
git commit -m "chore(artifact): pdf preview cleanup"
```

---

## Self-Review

**Spec coverage:**
- pdf.js on-demand CDN load + zero-bundle → Task 1-2 (`DEFAULT_LOAD` template-literal import, no package dep). ✓
- `configurePdfPreview` / `isPdfPreviewEnabled` / reset + barrel export → Task 1, 2, 3. ✓
- `renderPdfInto` stacked fit-width canvases + a11y labels → Task 2, 6. ✓
- `isPdfUrl` detection (extension + file-type, query/hash) → Task 4. ✓
- Preview branch (iframe vs PDF) + reload re-render → Task 7. ✓
- Four states (disabled/loading/success/error) → Task 6. ✓
- Fallback card (open/download, native anchors) → Task 5. ✓
- a11y (region/img labels, native anchors) → Task 5, 6; empirical sweep Task 9. ✓
- Tests: unit (isPdfUrl, config), fake-pdf.js branch tests, fallback via element; empirical Playwright by human → Task 1,2,4,7,9. ✓
- Stories: inline + fallback, source-visible → Task 8. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. ✓

**Type consistency:** `PdfjsLike`/`PdfDocumentLike`/`PdfPageLike`/`PdfViewportLike` defined in Task 1, used by the fake in Task 2 and `renderPdfInto`. `configurePdfPreview`/`isPdfPreviewEnabled`/`renderPdfInto`/`__resetPdfPreviewForTests`/`isPdfUrl` names consistent across tasks. `ArtifactPdfPreview` props `{ url, reloadKey }` match the call site in Task 7. `Loader` variant `'circular'` is a valid `LoaderVariant`. ✓
