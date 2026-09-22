import { defineWebComponent } from '../define/define';
import { Image } from '../../components/image/image';

interface Props extends Record<string, unknown> {
  /** The image's URL: an `https:`/`http:` location, a `data:` URI, or a `blob:`
   *  object URL you created. Attribute `src`. This is an image RESOURCE; for an
   *  image the model PRODUCED (base64 or raw bytes) use `<kai-image-artifact>`. */
  src?: string;
  /** Alt text. Attribute `alt`. Always give meaningful text: an empty alt marks
   *  the image as decorative. */
  alt?: string;
  /** Extra classes for the `<img>`. */
  class?: string;
}

/**
 * `<kai-image>` — renders an image at a URL: `https:`, `data:` or an object URL.
 * `src`/`alt` are attributes. No skeleton: the browser paints its own placeholder
 * for a resource it can already fetch, and the payload element owns that state.
 */
defineWebComponent<Props>('kai-image', {
  src: undefined,
  alt: '',
  class: undefined,
}, (props) => (
  <Image
    src={props.src as string}
    alt={props.alt ?? ''}
    class={props.class as string | undefined}
  />
));
