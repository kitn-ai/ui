import { Show, createEffect, createSignal, onCleanup } from 'solid-js';
import { cn } from '../../utils/cn';
import { Skeleton } from '../skeleton/skeleton';
import { Image } from './image';

export interface ImageArtifactProps {
  /** The image PAYLOAD the model produced: BARE base64 (no `data:` prefix) or raw
   *  bytes. A string that ALREADY starts with `data:` is a resource, not a
   *  payload: it renders, and the console says where it belongs. */
  data?: string | Uint8Array;
  /** The payload's MIME type, e.g. `image/png`. REQUIRED, at the type level and at
   *  runtime: bare base64 is not self-describing, and the old silent `image/png`
   *  default mislabelled every JPEG, WebP and SVG that reached it. Absent, this
   *  reports once and renders the placeholder instead of an image with a guess. */
  mediaType: string;
  /** Alternative text, also the placeholder's accessible name. */
  alt: string;
  class?: string;
}

function ImageArtifact(props: ImageArtifactProps) {
  const [objectUrl, setObjectUrl] = createSignal<string | undefined>(undefined);

  // Report a decision ONCE per instance, then stay quiet. The pattern is
  // `primitives/highlighter.ts`'s `reportOnce`, and the Set lives in the component
  // body because the unit here is the INSTANCE (a thread of many artifacts warns
  // about each broken one), not the module. No `NODE_ENV` gate, for the reason
  // recorded there: `src/` has no dev/prod build convention, so a gate that gets
  // it wrong makes the developer's laptop look fine and production the silent one.
  const reported = new Set<string>();
  function reportOnce(key: string, message: string): void {
    if (reported.has(key)) return;
    reported.add(key);
    // A missing console is a real environment (a stripped SSR runtime, a worker).
    // Losing the report there beats throwing on a path the caller never asked about.
    if (typeof console === 'undefined' || typeof console.warn !== 'function') return;
    console.warn(message);
  }

  // A ZERO-LENGTH payload is treated as ABSENT, in both shapes. The string path already
  // did (`data.length === 0` renders the placeholder); the byte path did not, so an
  // empty Uint8Array produced a zero-byte Blob and an <img> that cannot load, which
  // reads as a broken image rather than as "nothing arrived yet".
  const hasData = (): boolean =>
    typeof props.data === 'string'
      ? props.data.length > 0
      : props.data instanceof Uint8Array && props.data.length > 0;

  // Both reports ride an effect, not the render: a warning is a side effect, and
  // the accessor that builds `src` can be read on every update.
  createEffect(() => {
    const data = props.data;
    // No payload: the placeholder is the honest render and there is nothing to report.
    if (!hasData()) return;
    if (typeof data === 'string' && data.startsWith('data:')) {
      reportOnce(
        'uri',
        '[kai-image-artifact] `data` is a `data:` URI, which is a resource, not a base64 payload. ' +
          'Pass it to `Image` as `src`; a URI already carries its own media type. Rendering it as-is.',
      );
      return;
    }
    if (!props.mediaType) {
      reportOnce(
        'mediaType',
        '[kai-image-artifact] `data` has no `mediaType`. Bare base64 is not self-describing, so the type cannot be ' +
          'guessed. Pass `mediaType="image/png"` (or the real type); rendering the placeholder instead.',
      );
    }
  });

  // The byte path OWNS an object URL, and that ownership is what this component
  // exists for: nothing outside would revoke it, so every re-render would leak one
  // blob for the life of the tab. Created in an effect and revoked in `onCleanup`,
  // so it is returned on re-run and on unmount alike.
  createEffect(() => {
    const data = props.data;
    const mediaType = props.mediaType;
    if (data instanceof Uint8Array && data.length > 0 && mediaType) {
      // The cast is the lib boundary, not a workaround: `Uint8Array<ArrayBufferLike>` widens past
      // `BlobPart`'s `ArrayBufferView<ArrayBuffer>`. Same cast the pre-split code carried.
      const url = URL.createObjectURL(new Blob([data as BlobPart], { type: mediaType }));
      setObjectUrl(url);
      onCleanup(() => URL.revokeObjectURL(url));
    } else {
      setObjectUrl(undefined);
    }
  });

  const resolvedSrc = (): string | undefined => {
    const data = props.data;
    if (typeof data === 'string') {
      if (data.length === 0) return undefined;
      if (data.startsWith('data:')) return data; // a URI carries its own type; nothing to build
      return props.mediaType ? `data:${props.mediaType};base64,${data}` : undefined;
    }
    return objectUrl();
  };

  return (
    <Show
      when={resolvedSrc()}
      fallback={
        <Skeleton
          aria-label={props.alt}
          role="img"
          class={cn('h-auto max-w-full overflow-hidden', props.class)}
        />
      }
    >
      {(src) => <Image src={src()} alt={props.alt} class={props.class} />}
    </Show>
  );
}

export { ImageArtifact };
