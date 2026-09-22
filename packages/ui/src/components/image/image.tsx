import { type JSX, splitProps } from 'solid-js';
import { cn } from '../../utils/cn';

export interface ImageProps extends JSX.ImgHTMLAttributes<HTMLImageElement> {
  /** The image RESOURCE: an https URL, a `data:` URI, or an object URL the
   *  caller made. A model-produced payload has no address until something
   *  builds one, so it belongs on `<ImageArtifact data={...} mediaType={...}>`. */
  src: string;
  /** Alternative text. Required: an unnamed image is invisible to a screen
   *  reader, and `alt=""` cannot be told apart from "forgot to write one". */
  alt: string;
  class?: string;
}

function Image(props: ImageProps) {
  const [local, rest] = splitProps(props, ['class', 'src', 'alt']);

  // NO SKELETON HERE, deliberately. This is the shared surface for a resource
  // the browser can already fetch, so it paints its own placeholder; a skeleton
  // of ours would only add a flash on an already-cached image. The skeleton
  // belongs to the PAYLOAD path (`ImageArtifact` with no `data`), where there is
  // nothing to hand the browser until the model produces it.
  //
  // NO SCHEME FILTER HERE, deliberately. `<img src>` cannot execute a scheme:
  // `javascript:` is inert, and a `data:` image is legitimate and used. Filtering
  // model-supplied image urls is a decision the APP owns (SECURITY.md, "Decisions
  // your app owns"): the residual is one outbound GET and an attacker-chosen
  // size, handled with CSP `img-src` or a proxy. The reasoning is at
  // `isSafeImageSrc` in `primitives/url-scheme-policy.ts` and
  // `tests/components/model-image-sinks.test.tsx` pins the behaviour. A filter
  // added here fails that test, and it should.
  return (
    <img
      {...rest}
      src={local.src}
      alt={local.alt}
      role="img"
      class={cn('h-auto max-w-full overflow-hidden rounded-md', local.class)}
    />
  );
}

export { Image };
