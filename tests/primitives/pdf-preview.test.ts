// tests/primitives/pdf-preview.test.ts
import { afterEach, expect, test } from 'vitest';
import {
  configurePdfPreview,
  isPdfPreviewEnabled,
  __resetPdfPreviewForTests,
} from '../../src/primitives/pdf-preview';
import { renderPdfInto, type PdfjsLike } from '../../src/primitives/pdf-preview';

afterEach(() => __resetPdfPreviewForTests());

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
