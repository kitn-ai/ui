import { type JSX, splitProps, createSignal, createEffect, onCleanup, Show } from 'solid-js';
import { cn } from '../utils/cn';

export interface GeneratedImageLike {
  base64?: string;
  uint8Array?: Uint8Array;
  mediaType?: string;
}

export interface ImageProps extends GeneratedImageLike {
  alt: string;
  class?: string;
}

function getImageSrc(base64?: string, mediaType?: string): string | undefined {
  if (base64 && mediaType) {
    return `data:${mediaType};base64,${base64}`;
  }
  return undefined;
}

function Image(props: ImageProps) {
  const [local, rest] = splitProps(props, ['base64', 'uint8Array', 'mediaType', 'class', 'alt']);
  const [objectUrl, setObjectUrl] = createSignal<string | undefined>(undefined);

  const mediaType = () => local.mediaType ?? 'image/png';

  createEffect(() => {
    const arr = local.uint8Array;
    const mt = mediaType();
    if (arr && mt) {
      const blob = new Blob([arr as BlobPart], { type: mt });
      const url = URL.createObjectURL(blob);
      setObjectUrl(url);
      onCleanup(() => URL.revokeObjectURL(url));
    } else {
      setObjectUrl(undefined);
    }
  });

  const src = () => getImageSrc(local.base64, mediaType()) ?? objectUrl();

  return (
    <Show
      when={src()}
      fallback={
        <div
          aria-label={local.alt}
          role="img"
          class={cn(
            'h-auto max-w-full animate-pulse overflow-hidden rounded-md bg-muted',
            local.class
          )}
        />
      }
    >
      <img
        src={src()}
        alt={local.alt}
        class={cn('h-auto max-w-full overflow-hidden rounded-md', local.class)}
        role="img"
      />
    </Show>
  );
}

export { Image };
