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
