import { defineWebComponent } from '../define/define';
import { ImageArtifact } from '../../components/image/image-artifact';

interface Props extends Record<string, unknown> {
  // A `data:image/...;base64,...` string here is a RESOURCE: it is reported and rendered
  // as-is, and it belongs on `<kai-image>`'s `src`, which carries its own media type.
  /** The image PAYLOAD: BARE base64 (never a URI) or raw bytes. Attribute `data` for base64; JS property for `Uint8Array`. */
  data?: string | Uint8Array;
  // Omit it and the element renders the skeleton and warns, because guessing
  // `image/png` labelled a JPEG's bytes as a PNG.
  /** The payload's MIME type, e.g. `image/png`. Attribute `media-type`. REQUIRED. */
  mediaType?: string;
  /** Alt text. Attribute `alt`. Always give meaningful text: an empty alt marks
   *  the image as decorative. */
  alt?: string;
  /** Extra classes for the `<img>` (and for the skeleton while nothing resolves). */
  class?: string;
}
// `media-type` is required because guessing `image/png` labelled a JPEG's bytes as a PNG. A
// `data:image/...;base64,...` string here is treated as a RESOURCE and reported and rendered as
// is; it belongs on `<kai-image>`'s `src`, which carries its own media type.
/**
 * An image the model produced, from bare base64 or raw bytes rather than a URL.
 */
defineWebComponent<Props>('kai-image-artifact', {
  data: undefined,
  mediaType: undefined,
  alt: '',
  class: undefined,
}, (props) => (
  <ImageArtifact
    data={props.data}
    // `as string` and not `?? ''`: the Solid component owns the missing-media-type
    // report, and an empty string would be a second, quieter way of saying "set".
    mediaType={props.mediaType as string}
    alt={props.alt ?? ''}
    class={props.class as string | undefined}
  />
));
