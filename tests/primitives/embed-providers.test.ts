// tests/primitives/embed-providers.test.ts
import { afterEach, describe, expect, test } from 'vitest';
import {
  resolveEmbed,
  parseYouTubeId,
  parseVimeoId,
  watchUrl,
  aspectRatioValue,
  providerLabel,
  configureEmbedAllowlist,
  isGenericOriginAllowed,
  __resetEmbedAllowlistForTests,
  type EmbedCardData,
} from '../../src/primitives/embed-providers';

afterEach(() => __resetEmbedAllowlistForTests());

describe('parseYouTubeId', () => {
  test('watch URL', () => {
    expect(parseYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  test('youtu.be short URL', () => {
    expect(parseYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  test('shorts URL', () => {
    expect(parseYouTubeId('https://www.youtube.com/shorts/abc123_DEF-')).toBe('abc123_DEF-');
  });
  test('embed URL', () => {
    expect(parseYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  test('rejects garbage', () => {
    expect(parseYouTubeId('not a url')).toBeUndefined();
    expect(parseYouTubeId('https://example.com/watch?v=x')).toBeUndefined();
  });
});

describe('parseVimeoId', () => {
  test('vimeo.com/<id>', () => {
    expect(parseVimeoId('https://vimeo.com/123456789')).toBe('123456789');
  });
  test('player.vimeo.com/video/<id>', () => {
    expect(parseVimeoId('https://player.vimeo.com/video/987654321')).toBe('987654321');
  });
  test('rejects garbage', () => {
    expect(parseVimeoId('https://vimeo.com/foo')).toBeUndefined();
    expect(parseVimeoId('https://example.com/123')).toBeUndefined();
  });
});

describe('resolveEmbed — youtube', () => {
  test('uses youtube-nocookie + autoplay + rel=0 and derives hqdefault poster', () => {
    const r = resolveEmbed({ provider: 'youtube', id: 'dQw4w9WgXcQ' });
    expect(r.embedUrl).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0',
    );
    expect(r.posterUrl).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
    expect(r.sandbox).toContain('allow-scripts');
    expect(r.sandbox).toContain('allow-same-origin');
    expect(r.allow).toContain('autoplay');
    expect(r.allow).toContain('fullscreen');
  });
  test('honors start offset', () => {
    const r = resolveEmbed({ provider: 'youtube', id: 'dQw4w9WgXcQ', start: 42 });
    expect(r.embedUrl).toContain('&start=42');
  });
  test('parses id from url when id absent', () => {
    const r = resolveEmbed({ provider: 'youtube', url: 'https://youtu.be/dQw4w9WgXcQ' });
    expect(r.embedUrl).toContain('/embed/dQw4w9WgXcQ?');
  });
  test('supplied poster wins over derived', () => {
    const r = resolveEmbed({ provider: 'youtube', id: 'x_-1', poster: 'https://cdn/p.jpg' });
    expect(r.posterUrl).toBe('https://cdn/p.jpg');
  });
  test('throws when no id/url', () => {
    expect(() => resolveEmbed({ provider: 'youtube' })).toThrow(/missing/);
  });
});

describe('resolveEmbed — vimeo', () => {
  test('uses dnt=1 + autoplay, start as #t hash', () => {
    const r = resolveEmbed({ provider: 'vimeo', id: '123', start: 30 });
    expect(r.embedUrl).toBe('https://player.vimeo.com/video/123?autoplay=1&dnt=1#t=30s');
  });
  test('poster only from supplied (no static thumbnail)', () => {
    expect(resolveEmbed({ provider: 'vimeo', id: '123' }).posterUrl).toBeUndefined();
    expect(resolveEmbed({ provider: 'vimeo', id: '123', poster: 'https://cdn/p.jpg' }).posterUrl).toBe(
      'https://cdn/p.jpg',
    );
  });
  test('throws when no id/url', () => {
    expect(() => resolveEmbed({ provider: 'vimeo' })).toThrow(/missing/);
  });
});

describe('resolveEmbed — generic (origin allowlist)', () => {
  const data: EmbedCardData = { provider: 'generic', url: 'https://player.example.com/v/1' };

  test('rejected by default (empty allowlist)', () => {
    expect(isGenericOriginAllowed(data.url!)).toBe(false);
    expect(() => resolveEmbed(data)).toThrow(/not allowlisted/);
  });

  test('allowed once the origin is allowlisted', () => {
    configureEmbedAllowlist(['https://player.example.com']);
    expect(isGenericOriginAllowed(data.url!)).toBe(true);
    const r = resolveEmbed(data);
    expect(r.embedUrl).toBe('https://player.example.com/v/1');
  });

  test('allowlist matches by origin (different path on same origin ok)', () => {
    configureEmbedAllowlist(['https://player.example.com']);
    expect(() => resolveEmbed({ provider: 'generic', url: 'https://player.example.com/other' })).not.toThrow();
  });

  test('allowlist does not match a different origin', () => {
    configureEmbedAllowlist(['https://player.example.com']);
    expect(() => resolveEmbed({ provider: 'generic', url: 'https://evil.example.com/v/1' })).toThrow(
      /not allowlisted/,
    );
  });

  test('accepts a bare-host allowlist entry (normalized to https origin)', () => {
    configureEmbedAllowlist(['player.example.com']);
    expect(isGenericOriginAllowed('https://player.example.com/x')).toBe(true);
  });

  test('rejects non-https url even if allowlisted host', () => {
    configureEmbedAllowlist(['https://player.example.com']);
    expect(() => resolveEmbed({ provider: 'generic', url: 'http://player.example.com/v/1' })).toThrow(
      /https/,
    );
  });

  test('rejects javascript: scheme', () => {
    expect(() => resolveEmbed({ provider: 'generic', url: 'javascript:alert(1)' })).toThrow();
  });

  test('throws when generic url missing', () => {
    expect(() => resolveEmbed({ provider: 'generic' })).toThrow(/missing url/);
  });
});

describe('watchUrl', () => {
  test('youtube → watch url', () => {
    expect(watchUrl({ provider: 'youtube', id: 'abc' })).toBe('https://www.youtube.com/watch?v=abc');
  });
  test('vimeo → vimeo.com url', () => {
    expect(watchUrl({ provider: 'vimeo', id: '123' })).toBe('https://vimeo.com/123');
  });
  test('generic → its url', () => {
    expect(watchUrl({ provider: 'generic', url: 'https://x/y' })).toBe('https://x/y');
  });
});

describe('helpers', () => {
  test('aspectRatioValue', () => {
    expect(aspectRatioValue('16:9')).toBe('16 / 9');
    expect(aspectRatioValue('9:16')).toBe('9 / 16');
    expect(aspectRatioValue(undefined)).toBe('16 / 9');
  });
  test('providerLabel', () => {
    expect(providerLabel('youtube')).toBe('YouTube');
    expect(providerLabel('vimeo')).toBe('Vimeo');
  });
});
