import { For, Show } from 'solid-js';
import { defineKitnElement } from './define';
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
} from '../components/attachments';

interface Props extends Record<string, unknown> {
  /** The attachments to render. Set as a JS property (array). */
  items: AttachmentData[];
  /** Layout: `grid` = visual tiles, `inline` = icon + label chips, `list` = rows. */
  variant?: AttachmentVariant;
  /** Wrap each item in a hover card that previews its details. */
  hoverCard?: boolean;
  /** Show a remove button per item; clicking it fires a `remove` event. */
  removable?: boolean;
  /** Also show the media type beneath the filename (non-grid variants). */
  showMediaType?: boolean;
  /** Text shown when `items` is empty. */
  emptyText?: string;
}

/** Events fired by `<kc-attachments>`. */
interface Events {
  /** A remove button was clicked. */
  remove: { id: string };
}

/**
 * `<kc-attachments>` — the exemplar for the "collapse a compound primitive to
 * ONE configurable element" pattern (Route 1). The presentation knobs that the
 * SolidJS layer expresses by composing sub-parts (`<AttachmentPreview>`,
 * `<AttachmentInfo>`, `<AttachmentHoverCard>`, `<AttachmentRemove>`) become
 * attributes/flags here:
 *
 *   - icon + label .......... `variant="inline"`
 *   - visual + hover card .... `variant="grid" hover-card`
 *   - removable chips ........ add `removable` (emits `remove` → { id })
 *
 * Data in via the `items` property; the only interaction (`remove`) comes back
 * as an event. For fully-custom hover content, the SolidJS primitives remain the
 * escape hatch (a templated slot — "Route 2" — is a deliberate future add).
 */
defineKitnElement<Props, Events>('kc-attachments', {
  items: [],
  variant: 'grid',
  hoverCard: false,
  removable: false,
  showMediaType: false,
  emptyText: undefined,
}, (props, { dispatch, flag }) => {
  const variant = () => props.variant ?? 'grid';
  const hoverCard = () => flag('hoverCard');
  const removable = () => flag('removable');
  const showMediaType = () => flag('showMediaType');

  return (
    <Show
      when={props.items.length}
      fallback={<Show when={props.emptyText}><AttachmentEmpty>{props.emptyText}</AttachmentEmpty></Show>}
    >
      <Attachments variant={variant()}>
        <For each={props.items}>
          {(item) => (
            <Attachment
              data={item}
              onRemove={removable() ? () => dispatch('remove', { id: item.id }) : undefined}
            >
              <Show
                when={hoverCard() && variant() !== 'grid'}
                fallback={
                  <>
                    <AttachmentPreview />
                    {/* Info only for non-grid; grid is a self-contained visual tile. */}
                    <Show when={variant() !== 'grid'}>
                      <AttachmentInfo showMediaType={showMediaType()} />
                    </Show>
                  </>
                }
              >
                {/* Hover preview is for compact inline/list chips; grid tiles are
                    already the visual, so they skip it (wrapping them would also
                    collapse non-image tiles to the icon's height). */}
                <AttachmentHoverCard>
                  <AttachmentHoverCardTrigger>
                    <div class="flex items-center gap-1.5">
                      <AttachmentPreview />
                      <AttachmentInfo showMediaType={showMediaType()} />
                    </div>
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
                        src={item.url}
                        alt={getAttachmentLabel(item)}
                        class="block max-h-64 max-w-xs rounded object-contain"
                      />
                    </Show>
                  </AttachmentHoverCardContent>
                </AttachmentHoverCard>
              </Show>
              <AttachmentRemove />
            </Attachment>
          )}
        </For>
      </Attachments>
    </Show>
  );
});
