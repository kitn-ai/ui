// tests/primitives/link-preview.test.ts
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  configureLinkPreview,
  resolveLinkMetadata,
  hasLinkPreviewFetcher,
  deriveDomain,
  isRenderableLink,
  __resetLinkPreviewForTests,
} from '../../src/primitives/link-preview';

afterEach(() => __resetLinkPreviewForTests());

describe('configureLinkPreview / resolveLinkMetadata', () => {
  test('no fetcher by default → hasLinkPreviewFetcher false + resolve throws', async () => {
    expect(hasLinkPreviewFetcher()).toBe(false);
    await expect(resolveLinkMetadata('https://example.com')).rejects.toThrow(/no link-preview fetcher/i);
  });

  test('a configured fetcher is invoked with the url', async () => {
    const fetchMetadata = vi.fn(async () => ({ title: 'Hello' }));
    configureLinkPreview({ fetchMetadata });
    expect(hasLinkPreviewFetcher()).toBe(true);
    const meta = await resolveLinkMetadata('https://example.com/x');
    expect(fetchMetadata).toHaveBeenCalledWith('https://example.com/x');
    expect(meta).toEqual({ title: 'Hello' });
  });
});

describe('deriveDomain', () => {
  test('strips leading www.', () => {
    expect(deriveDomain('https://www.example.com/blog')).toBe('example.com');
  });
  test('keeps subdomains', () => {
    expect(deriveDomain('https://docs.example.com')).toBe('docs.example.com');
  });
  test('undefined for garbage', () => {
    expect(deriveDomain('not a url')).toBeUndefined();
  });
});

describe('isRenderableLink', () => {
  test('http/https ok', () => {
    expect(isRenderableLink('http://example.com')).toBe(true);
    expect(isRenderableLink('https://example.com')).toBe(true);
  });
  test('rejects other schemes + garbage', () => {
    expect(isRenderableLink('javascript:alert(1)')).toBe(false);
    expect(isRenderableLink('mailto:a@b.com')).toBe(false);
    expect(isRenderableLink('ftp://example.com')).toBe(false);
    expect(isRenderableLink('not a url')).toBe(false);
  });
});
