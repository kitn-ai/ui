import { For, Show } from 'solid-js';
import { defineWebComponent } from '../define/define';
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
  AttachmentRemove,
  AttachmentHoverCard,
  AttachmentHoverCardTrigger,
  AttachmentHoverCardContent,
  AttachmentEmpty,
  getAttachmentLabel,
  getMediaCategory,
  type AttachmentData,
  type AttachmentVariant,
} from '../../components/attachments/attachments';
// Its own module on purpose: it pulls in `Dialog`, and a consumer who renders only
// tiles must not pay for the modal.
import {
  Lightbox,
  LightboxTrigger,
  LightboxContent,
} from '../../components/lightbox/lightbox';

interface Props extends Record<string, unknown> {
  // The empty state shows `emptyText` if set and nothing otherwise. Each item's `url`
  // must be a `data:` URI or an https URL, never `URL.createObjectURL`: a `blob:` URL
  // previews here but the wire encoders (`toOpenAIMessages`/`toAnthropicMessages`)
  // refuse it.
  /** The attachments to render (omit or pass `[]` for the empty state). Each `url` must be a `data:` URI or https URL, never `blob:`. */
  items?: AttachmentData[];
  /** Layout: `grid` = visual tiles, `inline` = icon + label chips, `list` = rows. */
  variant?: AttachmentVariant;
  /** Wrap each item in a hover card that previews its details. */
  hoverCard?: boolean;
  // Inert for non-image items, which have no image for a dialog to show.
  /** How an image tile reveals its full size: a pointer-only card by default, or a modal on click. */
  imagePreview?: 'hover' | 'lightbox';
  /** Show a remove button per item; clicking it fires a `kai-remove` event. */
  removable?: boolean;
  /** Also show the media type beneath the filename (non-grid variants). */
  showMediaType?: boolean;
  /** Text shown when `items` is empty. */
  emptyText?: string;
}

/** Events fired by `<kai-attachments>`. */
interface Events {
  /** A remove button was clicked. */
  'kai-remove': { id: string };
}
// The web-component layer's "collapse a compound primitive to ONE configurable element" pattern:
// the presentation knobs the Solid layer expresses by composing sub-parts (AttachmentPreview,
// AttachmentInfo, AttachmentHoverCard, AttachmentRemove) become `variant` / `hover-card` /
// `removable` here. A templated slot, so a consumer could keep the sub-parts, is a deliberate
// future add rather than an omission.
/**
 * The files attached to a message.
 */
defineWebComponent<Props, Events>('kai-attachments', {
  items: [],
  variant: 'grid',
  hoverCard: false,
  imagePreview: 'hover',
  removable: false,
  showMediaType: false,
  emptyText: undefined,
}, (props, { dispatch, flag }) => {
  const variant = () => props.variant ?? 'grid';
  const hoverCard = () => flag('hoverCard');
  const imagePreview = () => props.imagePreview ?? 'hover';
  const removable = () => flag('removable');
  // ONE spelling: both triggers (hover card and lightbox) open the same tile, so
  // they must carry the same layout. The trigger owns the layout — a bare inline
  // <span> collapses inline/list rows, and a grid tile whose trigger is inline
  // loses the `size-full` chain its preview fills.
  const triggerClass = () => variant() === 'grid'
    ? 'block size-full'
    : `flex items-center gap-1.5${variant() === 'list' ? ' w-full' : ''}`;
  const showMediaType = () => flag('showMediaType');

  return (
    <Show
      when={props.items?.length}
      fallback={<Show when={props.emptyText}><AttachmentEmpty>{props.emptyText}</AttachmentEmpty></Show>}
    >
      <Attachments variant={variant()} imagePreview={imagePreview()}>
        <For each={props.items ?? []}>
          {(item) => {
            // ★ THE LIGHTBOX CONDITION IS THE ONE THE HOVER CARD ALREADY USES to
            // decide it has an image to show (`image` category + a file URL), and
            // an image is the only shape a dialog can fill itself with. So a
            // non-image item keeps the hover card under `image-preview="lightbox"`.
            const wantsLightbox = () =>
              imagePreview() === 'lightbox'
              && getMediaCategory(item) === 'image'
              && item.type === 'file'
              && !!item.url;

            return (
              <Attachment
                data={item}
                onRemove={removable() ? () => dispatch('kai-remove', { id: item.id }) : undefined}
              >
                <Show
                  when={hoverCard() || wantsLightbox()}
                  fallback={
                    <>
                      <AttachmentPreview />
                      {/* Rendered for EVERY variant now. `AttachmentInfo` decides
                          what a grid tile gets — a visible caption for a non-image
                          tile, nothing for an image, which is the only tile that
                          really is a self-contained visual. */}
                      <AttachmentInfo showMediaType={showMediaType()} />
                    </>
                  }
                >
                  <Show
                    when={wantsLightbox()}
                    fallback={
                      <AttachmentHoverCard>
                        {/* The trigger carries the layout itself — a bare inline <span>
                            collapses inline/list rows. Grid wraps just the tile (the
                            label/details surface in the hover card instead). */}
                        <AttachmentHoverCardTrigger class={triggerClass()}>
                          <AttachmentPreview />
                          <AttachmentInfo showMediaType={showMediaType()} />
                        </AttachmentHoverCardTrigger>
                        <AttachmentHoverCardContent>
                          {/* For image attachments, preview the actual thumbnail;
                              otherwise fall back to the label + media-type details. */}
                          <Show
                            when={getMediaCategory(item) === 'image' && item.type === 'file' && item.url}
                            fallback={
                              <>
                                <div class="text-body font-medium">{getAttachmentLabel(item)}</div>
                                <Show when={item.mediaType}>
                                  <div class="text-muted-foreground text-caption">{item.mediaType}</div>
                                </Show>
                              </>
                            }
                          >
                            <img
                              part="preview"
                              src={item.url}
                              alt={getAttachmentLabel(item)}
                              class="block max-h-64 max-w-xs rounded object-contain"
                            />
                          </Show>
                        </AttachmentHoverCardContent>
                      </AttachmentHoverCard>
                    }
                  >
                    <Lightbox>
                      <LightboxTrigger class={triggerClass()}>
                        <AttachmentPreview />
                        <AttachmentInfo showMediaType={showMediaType()} />
                      </LightboxTrigger>
                      <LightboxContent label={getAttachmentLabel(item)}>
                        {/* The same image the hover card previews, at the size a
                            dialog can afford. */}
                        <img
                          part="preview"
                          src={item.url}
                          alt={getAttachmentLabel(item)}
                          class="block"
                        />
                      </LightboxContent>
                    </Lightbox>
                  </Show>
                </Show>
                <AttachmentRemove />
              </Attachment>
            );
          }}
        </For>
      </Attachments>
    </Show>
  );
});
