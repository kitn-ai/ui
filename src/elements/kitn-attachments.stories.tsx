import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import type { AttachmentData } from '../components/attachments';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kitn-attachments': JSX.HTMLAttributes<HTMLElement> & {
        variant?: string;
        'hover-card'?: boolean | string;
        removable?: boolean | string;
        'show-media-type'?: boolean | string;
      };
    }
  }
}

// Mixed file/source items (icons + labels) — mirrors Components/Attachments.
const sampleItems: AttachmentData[] = [
  {
    id: '1',
    type: 'file',
    filename: 'mountain-landscape.jpg',
    mediaType: 'image/jpeg',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
  },
  {
    id: '2',
    type: 'file',
    filename: 'sunset-beach.png',
    mediaType: 'image/png',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=400&fit=crop',
  },
  { id: '3', type: 'file', filename: 'architecture-report.pdf', mediaType: 'application/pdf' },
  { id: '4', type: 'file', filename: 'demo-recording.mp4', mediaType: 'video/mp4' },
  { id: '5', type: 'file', filename: 'podcast-episode.mp3', mediaType: 'audio/mpeg' },
  { id: '6', type: 'source-document', filename: 'SolidJS Documentation', title: 'SolidJS Reactivity Guide', url: 'https://solidjs.com/docs' },
];

// Image-only items — used for the grid thumbnails + hover-card preview stories.
const imageItems: AttachmentData[] = [
  {
    id: 'img-1',
    type: 'file',
    filename: 'mountain-landscape.jpg',
    mediaType: 'image/jpeg',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
  },
  {
    id: 'img-2',
    type: 'file',
    filename: 'sunset-beach.png',
    mediaType: 'image/png',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=400&fit=crop',
  },
];

/** Render `<kitn-attachments>` with an `items` property and the given flags. */
function AttachmentsElement(props: {
  items: AttachmentData[];
  variant?: string;
  removable?: boolean;
  hoverCard?: boolean;
  showMediaType?: boolean;
}) {
  let el: (HTMLElement & { items?: AttachmentData[] }) | undefined;
  onMount(() => {
    if (!el) return;
    el.items = props.items;
    if (props.variant) el.setAttribute('variant', props.variant);
    if (props.hoverCard) el.setAttribute('hover-card', '');
    if (props.showMediaType) el.setAttribute('show-media-type', '');
    if (props.removable) {
      el.setAttribute('removable', '');
      el.addEventListener('remove', ((e: CustomEvent<{ id: string }>) => {
        el!.items = (el!.items ?? []).filter((x) => x.id !== e.detail.id);
      }) as EventListener);
    }
  });
  return (
    <kitn-attachments
      ref={(e) => (el = e as HTMLElement)}
      style={{ display: 'block', padding: '24px', 'max-width': '720px' }}
    />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kitn-attachments id="att" variant="grid" removable></kitn-attachments>

<script type="module">
  import '@kitnai/chat/elements';   // registers the custom elements

  const att = document.getElementById('att');
  att.items = [
    { id: '1', type: 'file', filename: 'mountain-landscape.jpg',
      mediaType: 'image/jpeg', url: 'https://.../mountain.jpg' },
    { id: '2', type: 'file', filename: 'spec.pdf', mediaType: 'application/pdf' },
  ];

  // events are CustomEvents on the element (they do not bubble)
  att.addEventListener('remove', (e) => {
    att.items = att.items.filter((x) => x.id !== e.detail.id);
  });
</script>`;

const HOVER_SNIPPET = `<!-- inline/list chips with a hover-card image preview -->
<kitn-attachments id="att" variant="inline" hover-card></kitn-attachments>

<script type="module">
  import '@kitnai/chat/elements';

  const att = document.getElementById('att');
  // image attachments show their thumbnail in the hover card on hover;
  // non-image attachments show their label + media type instead.
  att.items = [
    { id: '1', type: 'file', filename: 'mountain-landscape.jpg',
      mediaType: 'image/jpeg', url: 'https://.../mountain.jpg' },
  ];
</script>`;

const meta = {
  title: 'Web Components/kitn-attachments',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '`<kitn-attachments>` is the framework-agnostic **web component** for a set of file/source attachments, and the exemplar for the "collapse a compound primitive to ONE configurable element" pattern: the sub-parts the SolidJS layer composes become attributes here. Isolated in **Shadow DOM**.',
          '**When to use:** rendering attachment chips/tiles in a non-Solid app. In SolidJS, compose the `Attachment*` primitives for fully custom layouts.',
          "**How to use:** register once with `import '@kitnai/chat/elements'`, set the data via the `items` **property**, pick a layout with `variant` (`grid` | `inline` | `list`), add `removable` to get per-item remove buttons (emits a `remove` **CustomEvent** with `{ id }`), and `hover-card` for inline/list previews (image attachments preview their thumbnail).",
          'See the **Code** tab for HTML usage.',
        ].join('\n\n'),
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Visual tiles (the default `grid` variant) — image attachments render as real
 *  `<img>` thumbnails; non-image files fall back to a media-type icon. */
export const Grid: Story = {
  render: () => <AttachmentsElement items={sampleItems} variant="grid" />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** Icon + label chips (`inline`) — files shown as a small preview + filename. */
export const Inline: Story = {
  render: () => <AttachmentsElement items={sampleItems} variant="inline" />,
};

/** Detailed rows (`list`) with the media type beneath each filename. */
export const List: Story = {
  render: () => <AttachmentsElement items={sampleItems} variant="list" showMediaType />,
};

/** Removable rows — clicking the remove button fires a `remove` event. */
export const RemovableList: Story = {
  name: 'Removable List',
  render: () => <AttachmentsElement items={sampleItems} variant="list" removable />,
};

/** Image thumbnails in a grid (real `<img>` previews). */
export const ImageGrid: Story = {
  name: 'Image Grid',
  render: () => <AttachmentsElement items={imageItems} variant="grid" />,
};

/** Inline chips with a hover-card preview — hover an image chip to see its
 *  thumbnail enlarge in the hover card. */
export const WithHoverCard: Story = {
  name: 'With Hover Card',
  render: () => <AttachmentsElement items={imageItems} variant="inline" hoverCard />,
  parameters: { docs: { source: { code: HOVER_SNIPPET, language: 'html' } } },
};
