import { defineWebComponent } from '../define/define';
import { ImageArtifact } from '../../components/image/image-artifact';

interface Props extends Record<string, unknown> {
  /** The image PAYLOAD, as BARE base64 (never a URI) or as raw bytes.
   *  Attribute `data` for a base64 string; JS PROPERTY (`el.data = new
   *  Uint8Array([...])`) for bytes, like every other non-scalar input in this kit.
   *  A `data:image/...;base64,…` string here is a RESOURCE: it is reported and
   *  rendered as-is, and it belongs on `<kai-image>`'s `src`, which carries its own
   *  media type. */
  data?: string | Uint8Array;
  /** The payload's MIME type, e.g. `image/png` or `image/jpeg`. Attribute
   *  `media-type`. REQUIRED. Omit it and the element renders the skeleton and
   *  warns, because guessing `image/png` labelled a JPEG's bytes as a PNG. */
  mediaType?: string;
  /** Alt text. Attribute `alt`. Always give meaningful text: an empty alt marks
   *  the image as decorative. */
  alt?: string;
  /** Extra classes for the `<img>` (and for the skeleton while nothing resolves). */
  class?: string;
}

/**
 * `<kai-image-artifact>` — renders an image the model produced: bare base64
 * (`data` attribute) or raw bytes (`data` property) plus the required
 * `media-type`. Shows a pulsing skeleton while no source resolves. For an image
 * at a URL use `<kai-image>` instead.
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
