import { defineWebComponent } from './define';
import { Image } from '../components/image';

interface Props extends Record<string, unknown> {
  /** Base64-encoded image data (pair with `media-type`). */
  base64?: string;
  /** Raw image bytes (set as a JS property). */
  bytes?: Uint8Array;
  /** Alt text. */
  alt?: string;
  /** MIME type (default `image/png`). */
  mediaType?: string;
}

/**
 * `<kc-image>` — renders a base64 or byte-array image with a skeleton
 * fallback while it resolves. `base64`/`alt`/`media-type` via attributes;
 * `bytes` via property.
 */
defineWebComponent<Props>('kc-image', {
  base64: undefined,
  bytes: undefined,
  alt: '',
  mediaType: undefined,
}, (props) => (
  <Image
    alt={props.alt ?? ''}
    base64={props.base64}
    uint8Array={props.bytes}
    mediaType={props.mediaType}
  />
));
