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
    pdfjsPromise = null;
  }
}

export function isPdfPreviewEnabled(): boolean {
  return enabled;
}

export function __resetPdfPreviewForTests(): void {
  enabled = true;
  loader = DEFAULT_LOAD;
  workerSrc = DEFAULT_WORKER_SRC;
  pdfjsPromise = null;
}

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
