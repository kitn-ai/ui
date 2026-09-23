import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { ImageArtifact, type ImageArtifactProps } from './image-artifact';

// jsdom has no layout engine, so these assert DOM and attributes only, never geometry.
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

let createObjectURL: ReturnType<typeof vi.fn>;
let revokeObjectURL: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // jsdom implements neither, so they are stubbed (the voice-output suite does the same).
  createObjectURL = vi.fn(() => 'blob:kai-image');
  revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const warnText = () =>
  vi
    .mocked(console.warn)
    .mock.calls.map((call) => String(call[0]))
    .join('\n');

describe('ImageArtifact (the payload renderer)', () => {
  it('bare base64 plus mediaType becomes a data URI, with the caller alt and class', () => {
    const { container } = render(() => (
      <ImageArtifact data="AAAA" mediaType="image/jpeg" alt="A JPEG payload" class="h-32 w-32" />
    ));

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'data:image/jpeg;base64,AAAA');
    expect(img).toHaveAttribute('alt', 'A JPEG payload');
    expect(img).toHaveClass('max-w-full', 'overflow-hidden', 'rounded-md', 'h-32', 'w-32');
    // The defect this split fixes: mediaType used to default silently to image/png,
    // so this JPEG's base64 was labelled as a PNG.
    expect(warnText()).toBe('');
  });

  it('bytes become an object URL carrying the mediaType, revoked on cleanup', () => {
    const { container } = render(() => (
      <ImageArtifact data={PNG_BYTES} mediaType="image/png" alt="A chart" />
    ));

    expect(container.querySelector('img')).toHaveAttribute('src', 'blob:kai-image');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');

    // Nothing outside owns the URL, so the component has to return it: an
    // unreleased object URL keeps its blob alive until the tab closes.
    expect(revokeObjectURL).not.toHaveBeenCalled();
    cleanup();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:kai-image');
  });

  it('no data renders the skeleton placeholder, named by alt', () => {
    const { container } = render(() => (
      <ImageArtifact mediaType="image/png" alt="Image pending" />
    ));

    expect(container.querySelector('img')).toBeNull();
    const placeholder = container.querySelector('[part="skeleton"]');
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toHaveAttribute('role', 'img');
    expect(placeholder).toHaveAttribute('aria-label', 'Image pending');
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(warnText()).toBe('');
  });

  it('a payload with no mediaType reports once and renders no img', () => {
    // A JS or web-component caller can omit `mediaType`; the type demands it. The
    // signal drives a second payload through the same instance, so the "once" in
    // "reported once" is asserted and not just the first call.
    const [data, setData] = createSignal('AAAA');
    const omittedMediaType = { alt: 'A chart' } as ImageArtifactProps;
    const { container } = render(() => <ImageArtifact {...omittedMediaType} data={data()} />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[part="skeleton"]')).toBeInTheDocument();
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(warnText()).toContain('mediaType');

    setData('BBBB');
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(container.querySelector('img')).toBeNull();
  });

  it('bytes with no mediaType create no object URL (no guessed blob type)', () => {
    const { container } = render(() => (
      <ImageArtifact data={PNG_BYTES} mediaType="" alt="A chart" />
    ));

    expect(container.querySelector('img')).toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(warnText()).toContain('mediaType');
  });

  it('a data: URI string reports once and still renders, pixels intact', () => {
    const uri = 'data:image/webp;base64,UklGRg==';

    const { container } = render(() => (
      <ImageArtifact data={uri} mediaType="image/webp" alt="A photo" />
    ));

    // The guidance is loud; the render is right either way.
    expect(container.querySelector('img')).toHaveAttribute('src', uri);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(warnText()).toContain('src');
  });

  it('an empty-string payload is no payload: the placeholder, and a quiet console', () => {
    const { container } = render(() => (
      <ImageArtifact data="" mediaType="image/png" alt="Image pending" />
    ));

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[part="skeleton"]')).toBeInTheDocument();
    expect(warnText()).toBe('');
  });

  it('zero bytes is also no payload: the placeholder, not an <img> that cannot load', () => {
    // The other half of the empty-string case, and the one the pre-split code got
    // wrong: an empty Uint8Array is truthy, so it built a zero-byte Blob and set an
    // object URL, and the reader got a BROKEN IMAGE instead of the placeholder. Both
    // shapes now agree that absent and empty are the same thing.
    const { container } = render(() => (
      <ImageArtifact data={new Uint8Array(0)} mediaType="image/png" alt="Image pending" />
    ));

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[part="skeleton"]')).toBeInTheDocument();
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
