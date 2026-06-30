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
